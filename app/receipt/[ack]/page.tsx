"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useJourney } from "@/components/JourneyProvider";
import { FREEZE_FIELDS, type FreezePacket, type ReadField } from "@/lib/schema";
import { isMissingFreezeField } from "@/lib/validate";
import { toBankPayload } from "@/lib/packet";
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
  const [copied, setCopied] = useState(false);

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

  const blanks = fields.filter((entry) => isMissingFreezeField(entry.key, entry.field));
  const sent = fields.length - blanks.length;
  const seconds = packet.elapsed_ms ? (packet.elapsed_ms / 1000).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy.receipt.heading}
        </h1>
      </div>

      <section className="card">
        <h2 className="eyebrow">{copy.receipt.ack}</h2>

        {/* "Write this down" is the instruction, and a copy button is the
            fastest way to obey it on the device it is already on. It is beside
            the number rather than under it so the number stays the largest
            thing on the screen. */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="font-mono text-3xl font-semibold tracking-wider sm:text-4xl">
            {packet.ack}
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(packet.ack)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
            className="min-h-11 rounded-lg border border-line bg-raised px-3 text-sm text-muted transition-colors hover:border-line-strong hover:bg-raised-hover hover:text-text"
          >
            {copied ? copy.receipt.ackCopied : copy.receipt.ackCopy}
          </button>
        </div>

        <p className="mt-1.5 text-sm text-muted">{copy.receipt.ackHint}</p>

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
        <section className="card">
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

      {/* The artefact behind the word "dispatchable".
          Collapsed by default: this screen is the moment the person's stress is
          supposed to drop, and a wall of JSON is not that. Native <details> so
          it needs no JavaScript and is keyboard-operable for free. */}
      <details className="card">
        <summary className="cursor-pointer text-base font-medium marker:text-faint">
          {copy.receipt.payload}
        </summary>
        <p className="mt-2 text-sm leading-relaxed text-muted">{copy.receipt.payloadIntro}</p>
        {/* The pre scrolls inside its own box; the page never scrolls sideways. */}
        <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-ink p-3 font-mono text-xs leading-relaxed text-muted">
          {JSON.stringify(toBankPayload(packet), null, 2)}
        </pre>
        <p className="mt-2 text-xs leading-relaxed text-faint">{copy.receipt.payloadNowhere}</p>
      </details>

      <section className="card-strong">
        <h2 className="text-base font-semibold">{copy.receipt.realHeading}</h2>
        <p className="mt-1 text-sm leading-relaxed">{copy.receipt.realBody}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="tel:1930"
            className="flex min-h-12 items-center rounded-lg border border-line bg-surface px-4 text-sm no-underline transition-colors hover:bg-raised-hover"
          >
            {copy.receipt.call}
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center rounded-lg border border-line bg-surface px-4 text-sm no-underline transition-colors hover:bg-raised-hover"
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
