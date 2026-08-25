"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useJourney } from "@/components/JourneyProvider";
import { FREEZE_FIELDS, type FreezePacket, type ReadField } from "@/lib/schema";
import { isMissing } from "@/lib/validate";
import { t } from "@/lib/i18n";

/**
 * The acknowledgement.
 *
 * This is the moment the product is built around and the moment the person's
 * stress should drop. Everything before it was compressed to the minimum;
 * everything after it is allowed to breathe.
 *
 * It also carries the two things that must never be buried: what was sent
 * blank and why, and the fact that this is a prototype which reached no bank.
 */
export default function ReceiptPage({ params }: { params: Promise<{ ack: string }> }) {
  const { ack } = use(params);
  const { copy, lang, reset } = useJourney();

  const [packet, setPacket] = useState<FreezePacket | null>(null);
  const [missing, setMissing] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/report/${ack}`)
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setPacket(result.packet);
        else setMissing(true);
      })
      .catch(() => !cancelled && setMissing(true));

    return () => {
      cancelled = true;
    };
  }, [ack]);

  // The packet lives on the server now. Clear the in-flight journey so a
  // second report starts from a clean clock.
  useEffect(() => {
    if (packet) reset();
  }, [packet, reset]);

  if (missing) {
    return (
      <p role="alert" className="rounded-lg border border-line-strong bg-raised px-4 py-3">
        {copy.errors.noAck}
      </p>
    );
  }

  if (!packet) return null;

  const fields = FREEZE_FIELDS.map((key) => ({
    key,
    label: t(lang).fields[key],
    field: packet.extraction[key] as ReadField,
  }));

  const blanks = fields.filter((entry) => isMissing(entry.field));
  const sent = fields.length - blanks.length;
  const seconds = packet.elapsed_ms ? (packet.elapsed_ms / 1000).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy.receipt.heading}
        </h1>
      </div>

      <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
        <h2 className="text-sm font-medium text-muted">{copy.receipt.ack}</h2>
        <p className="mt-1 font-mono text-3xl font-semibold tracking-wider sm:text-4xl">
          {packet.ack}
        </p>
        <p className="mt-1 text-sm text-muted">{copy.receipt.ackHint}</p>

        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4 text-sm">
          {seconds && (
            <div>
              <dt className="text-muted">{copy.receipt.elapsed}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                {seconds}
                {copy.common.seconds}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted">{copy.receipt.sentWith}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums">
              {copy.receipt.ofFields(sent, fields.length)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Sent with holes in it, and says so. This is the product's argument in
          one block: a stated gap is safer than a confident guess. */}
      {blanks.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4 sm:p-5">
          <h2 className="text-base font-medium">{copy.receipt.missing}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {blanks.map((entry) => (
              <li
                key={entry.key}
                className="rounded border border-dashed border-line-strong px-2 py-1 text-sm text-muted"
              >
                {entry.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm leading-relaxed text-faint">{copy.receipt.missingWhy}</p>
        </section>
      )}

      <section className="rounded-xl border border-line-strong bg-raised p-4 sm:p-5">
        <h2 className="text-base font-semibold">{copy.receipt.realHeading}</h2>
        <p className="mt-1 text-sm leading-relaxed">{copy.receipt.realBody}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="tel:1930"
            className="flex min-h-12 items-center rounded-lg border border-line bg-surface px-4 text-sm no-underline"
          >
            {copy.receipt.call}
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center rounded-lg border border-line bg-surface px-4 text-sm no-underline"
          >
            {copy.receipt.portal}
          </a>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">{copy.receipt.next}</h2>
        <p className="mt-1 text-muted">{copy.receipt.nextBody}</p>
        <Link
          href={`/report/${packet.ack}`}
          className="btn-primary mt-3"
        >
          {copy.receipt.continue}
        </Link>
      </section>

      <p className="text-xs text-faint">{copy.receipt.retention}</p>
    </div>
  );
}
