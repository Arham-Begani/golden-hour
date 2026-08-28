"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { DecayMeter } from "@/components/DecayMeter";
import { FieldRow } from "@/components/FieldRow";
import { useJourney } from "@/components/JourneyProvider";
import { FREEZE_FIELDS, UNREADABLE, type Extraction, type ReadField } from "@/lib/schema";
import { emptyExtraction, isMissing } from "@/lib/validate";

/**
 * Check and send.
 *
 * The send button is never disabled. A partial packet at sixty seconds beats a
 * complete one at fourteen minutes, so nothing on this screen is allowed to
 * stand between the person and dispatch — every field is optional, every hole
 * is expected, and the copy says so rather than nagging.
 */

/** Free-text fields the person can edit. Rail and category are inferred. */
const EDITABLE = [
  { key: "amount", inputMode: "decimal" as const },
  { key: "utr_or_upi_ref", inputMode: "text" as const },
  { key: "beneficiary_handle", inputMode: "text" as const },
  { key: "transaction_ref", inputMode: "text" as const },
  { key: "beneficiary_name", inputMode: "text" as const },
  { key: "victim_bank", inputMode: "text" as const },
  { key: "source_account_last4", inputMode: "numeric" as const },
] as const;

/** One tap each. Someone who has just lost money should not fight a date picker. */
const WHEN_OPTIONS = [
  { key: "justNow", minutesAgo: 0 },
  { key: "withinHour", minutesAgo: 30 },
  { key: "today", minutesAgo: 60 * 6 },
  { key: "yesterday", minutesAgo: 60 * 30 },
] as const;

export default function ConfirmPage() {
  const router = useRouter();
  const { copy, lang, state, setState, elapsedMs } = useJourney();

  /**
   * The model's read is the base; the person's corrections are an overlay on
   * top of it. Keeping them separate means there is no effect syncing context
   * into local state — the journey state arrives asynchronously after the
   * provider's post-mount read, and an effect-based copy would race it.
   */
  const [edits, setEdits] = useState<Partial<Extraction>>({});
  const [corrected, setCorrected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blank = useMemo(() => emptyExtraction(), []);
  const extraction = useMemo<Extraction>(
    () => ({ ...(state.extraction ?? blank), ...edits }),
    [state.extraction, blank, edits],
  );

  const edit = useCallback((key: string, value: string) => {
    const next: ReadField = { value: value.trim() === "" ? UNREADABLE : value, confidence: 1 };
    setEdits((current) => ({ ...current, [key]: next }));
    setCorrected((current) => (current.includes(key) ? current : [...current, key]));
  }, []);

  const setWhen = useCallback((minutesAgo: number) => {
    const when = new Date(Date.now() - minutesAgo * 60_000).toISOString();
    setEdits((current) => ({ ...current, occurred_at: { value: when, confidence: 1 } }));
    setCorrected((current) =>
      current.includes("occurred_at") ? current : [...current, "occurred_at"],
    );
  }, []);

  const downgradeFor = useCallback(
    (key: string) => state.downgrades?.find((entry) => entry.field === key),
    [state.downgrades],
  );

  const holes = useMemo(
    () => FREEZE_FIELDS.filter((key) => isMissing(extraction[key] as ReadField)).length,
    [extraction],
  );

  const send = useCallback(async () => {
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraction,
          corrected,
          elapsed_ms: elapsedMs(),
          lang,
          interrupt_shown: state.interruptShown,
          // A hint only. The server fingerprints demo replays itself.
          source: state.source,
        }),
      });

      const result = await response.json();
      if (!result.ok) {
        setSending(false);
        setError(copy.errors.unreadable);
        return;
      }

      setState({ extraction, corrected });
      router.push(`/receipt/${result.ack}`);
    } catch {
      setSending(false);
      setError(copy.errors.network);
    }
  }, [
    copy.errors,
    corrected,
    elapsedMs,
    extraction,
    lang,
    router,
    setState,
    state.interruptShown,
    state.source,
  ]);

  const whenUnknown = isMissing(extraction.occurred_at);

  return (
    <div className="flex flex-col gap-5">
      <DecayMeter occurredAt={whenUnknown ? null : extraction.occurred_at.value} lang={lang} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy.confirm.heading}
        </h1>
        <p className="mt-1 text-muted">{copy.confirm.sub}</p>
      </div>

      {/* The one thing worth asking for outright: without a time there is no
          meter, and the meter is the honest measure of what is at stake. */}
      {whenUnknown && (
        <fieldset className="card">
          <legend className="px-1 text-base font-medium">{copy.confirm.when}</legend>
          <p className="text-sm text-muted">{copy.confirm.whenSub}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {WHEN_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setWhen(option.minutesAgo)}
                className="min-h-11 rounded-lg border border-line bg-raised px-4 text-sm transition-colors hover:border-line-strong hover:bg-raised-hover"
              >
                {copy.confirm[option.key]}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm text-muted">
            {copy.confirm.older}
            <input
              type="datetime-local"
              className="field-input mt-1.5"
              onChange={(event) => {
                const parsed = new Date(event.target.value);
                if (!Number.isNaN(parsed.getTime())) {
                  setWhen((Date.now() - parsed.getTime()) / 60_000);
                }
              }}
            />
          </label>
        </fieldset>
      )}

      <div className="rounded-xl border border-line bg-surface px-4">
        {EDITABLE.map(({ key, inputMode }, index) => (
          <FieldRow
            key={key}
            name={key}
            field={extraction[key] as ReadField}
            lang={lang}
            downgrade={downgradeFor(key)}
            edited={corrected.includes(key)}
            inputMode={inputMode}
            // Explain the first hole only; the rest read as holes on sight.
            showHint={
              index ===
              EDITABLE.findIndex((entry) => isMissing(extraction[entry.key] as ReadField))
            }
            onChange={(value) => edit(key, value)}
          />
        ))}
      </div>

      <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
        {holes > 0 ? copy.confirm.holes(holes) : copy.confirm.complete}
      </p>

      {error && (
        <p role="alert" className="rounded-lg border border-line-strong bg-raised px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void send()}
        disabled={sending}
        className="btn-primary"
      >
        {sending ? copy.confirm.sending : copy.confirm.send}
      </button>
    </div>
  );
}
