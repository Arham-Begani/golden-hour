"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useJourney } from "@/components/JourneyProvider";
import type { Statement } from "@/lib/schema";

/**
 * The second half.
 *
 * The same information the current portal wants — the statement, the identity
 * details, the suspect, the delay reason — in a different position in the
 * sequence, asked of a person whose emergency has already been handled.
 *
 * Deliberately unhurried: no meter, no clock, no progress bar, no required
 * fields, and it saves as they type so closing the tab costs nothing. If the
 * first screen is the argument, this screen is the proof that the argument was
 * about sequencing rather than about cutting the police case short.
 */

type FieldSpec = {
  key: keyof Omit<Statement, "updated_at">;
  multiline?: boolean;
  type?: string;
  hint?: "statementHint" | "relationshipHint" | "suspectHint" | "delayHint";
};

const FIELDS: FieldSpec[] = [
  { key: "statement", multiline: true, hint: "statementHint" },
  { key: "reporter_name" },
  { key: "reporter_phone", type: "tel" },
  { key: "reporter_email", type: "email" },
  { key: "reporter_address", multiline: true },
  { key: "relationship_to_victim", hint: "relationshipHint" },
  { key: "suspect_details", multiline: true, hint: "suspectHint" },
  { key: "reported_elsewhere" },
  { key: "delay_reason", hint: "delayHint" },
];

export default function ReportPage({ params }: { params: Promise<{ ack: string }> }) {
  const { ack } = use(params);
  const { copy } = useJourney();

  const [statement, setStatement] = useState<Statement | null>(null);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/report/${ack}`)
      .then((response) => response.json())
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setStatement(result.statement);
        else setMissing(true);
      })
      .catch(() => !cancelled && setMissing(true));

    return () => {
      cancelled = true;
    };
  }, [ack]);

  const save = useCallback(
    async (next: Statement) => {
      setSaving(true);
      try {
        await fetch(`/api/report/${ack}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        setSavedAt(Date.now());
      } catch {
        // Nothing here has a deadline. The next keystroke retries.
      } finally {
        setSaving(false);
      }
    },
    [ack],
  );

  const update = useCallback(
    (key: FieldSpec["key"], value: string) => {
      setStatement((current) => {
        if (!current) return current;
        const next = { ...current, [key]: value };

        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => void save(next), 800);

        return next;
      });
    },
    [save],
  );

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (missing) {
    return (
      <p role="alert" className="rounded-lg border border-line-strong bg-raised px-4 py-3">
        {copy.errors.noAck}
      </p>
    );
  }

  if (!statement) return null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="font-mono text-sm text-muted">{ack}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy.report.heading}
        </h1>
        <p className="mt-1 text-muted">{copy.report.sub}</p>
      </div>

      <div className="flex flex-col gap-6">
        {FIELDS.map((spec) => {
          const id = `statement-${spec.key}`;
          const value = statement[spec.key] ?? "";

          return (
            <div key={spec.key}>
              <label htmlFor={id} className="text-base font-medium">
                {copy.report[spec.key]}
              </label>
              {spec.hint && (
                <p className="mt-0.5 text-sm text-muted">{copy.report[spec.hint]}</p>
              )}

              {spec.multiline ? (
                <textarea
                  id={id}
                  value={value}
                  rows={spec.key === "statement" ? 7 : 3}
                  onChange={(event) => update(spec.key, event.target.value)}
                  className="field-input mt-2 resize-y"
                />
              ) : (
                <input
                  id={id}
                  type={spec.type ?? "text"}
                  value={value}
                  onChange={(event) => update(spec.key, event.target.value)}
                  className="field-input mt-2"
                />
              )}
            </div>
          );
        })}
      </div>

      <p aria-live="polite" className="text-sm text-faint">
        {saving ? copy.report.saving : savedAt ? copy.report.saved : ""}
      </p>
    </div>
  );
}
