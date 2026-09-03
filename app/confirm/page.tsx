"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DecayMeter } from "@/components/DecayMeter";
import { FieldRow } from "@/components/FieldRow";
import { useJourney } from "@/components/JourneyProvider";
import { FREEZE_FIELDS, UNREADABLE, type Extraction, type ReadField } from "@/lib/schema";
import { emptyExtraction, isMissing, isMissingFreezeField } from "@/lib/validate";
import { minutesSince } from "@/lib/decay";
import { elapsedText } from "@/lib/i18n";

/**
 * Check and send.
 *
 * The send button is never disabled. A partial packet at sixty seconds beats a
 * complete one at fourteen minutes, so nothing on this screen is allowed to
 * stand between the person and dispatch — every field is optional, every hole
 * is expected, and the copy says so rather than nagging.
 *
 * This screen is also where the interrupt gets its second chance. Someone who
 * uploaded only a screenshot gave the model no evidence about whether the
 * attack is still live — a debit SMS says nothing about whether the caller is
 * still on the line. The optional description below the fields is the only
 * place that sentence can arrive, and it is what /api/triage was built for.
 */

/** Long enough to carry a signal. Below this, a triage call is wasted latency. */
const TRIAGE_MIN_CHARS = 20;
/** Typing pause before triage runs. Long enough not to fire mid-sentence. */
const TRIAGE_DEBOUNCE_MS = 900;

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
  /**
   * The description is an overlay on the journey state, the same shape as
   * `edits` above and for the same reason: the provider reads sessionStorage
   * after mount, so the stored value arrives asynchronously and an effect that
   * copied it into local state would race the user's first keystroke.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const description = draft ?? state.description ?? "";

  const triageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Text already triaged, so a pause that changed nothing does not re-call. */
  const triaged = useRef<string>("");

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

  /**
   * Ask whether the attack is still happening, using the sentence they just
   * typed. Fire-and-forget, by design.
   *
   * Three rules this obeys, all of them from the same place — the interrupt is
   * an extra nudge on top of a flow that has to work without it:
   *
   *  - It never blocks the send button. If someone types and dispatches before
   *    this returns, they dispatch. A missed interrupt costs one person a nudge;
   *    a blocked dispatch costs the sixty-second claim the product is built on.
   *  - It never surfaces an error. A failed triage is silence, not a message.
   *  - It runs at most once per distinct sentence, and only when the extraction
   *    did not already reach an ACTIVE verdict — if the intake already caught
   *    it, the user is on /interrupt and never reached this screen.
   */
  const runTriage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < TRIAGE_MIN_CHARS || triaged.current === trimmed) return;
      triaged.current = trimmed;

      try {
        const response = await fetch("/api/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        const result = await response.json();

        // The same gate the intake runs, on the same quoted-signal rule.
        //
        // Shown at most once per report. Someone who has already read the stop
        // screen and chosen to continue must not be thrown back into it by
        // their next keystroke — an interrupt that traps the user is worse than
        // no interrupt, and re-showing a warning is how it stops being read.
        if (result?.interrupt?.fires && !state.interruptShown) {
          setState({ interrupt: result.interrupt });
          router.push("/interrupt");
        }
      } catch {
        // Silence. The report continues; that is the whole point of the rule.
      }
    },
    [router, setState, state.interruptShown],
  );

  const describe = useCallback(
    (value: string) => {
      setDraft(value);
      setState({ description: value });
      if (triageTimer.current) clearTimeout(triageTimer.current);
      triageTimer.current = setTimeout(() => void runTriage(value), TRIAGE_DEBOUNCE_MS);
    },
    [runTriage, setState],
  );

  useEffect(() => () => void (triageTimer.current && clearTimeout(triageTimer.current)), []);

  const holes = useMemo(
    () => FREEZE_FIELDS.filter((key) => isMissingFreezeField(key, extraction[key] as ReadField)).length,
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
          // Carried so the statement half opens with it already filled in.
          // Nothing the person typed under time pressure should have to be
          // typed again on the unhurried screen.
          description,
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
    description,
    elapsedMs,
    extraction,
    lang,
    router,
    setState,
    state.interruptShown,
    state.source,
  ]);

  const whenUnknown = isMissing(extraction.occurred_at);

  /**
   * The stored timestamp in words, so the person can check it at a glance.
   *
   * Rendered as elapsed rather than as a wall-clock time, matching the meter
   * directly above it — two different renderings of the same instant, one of
   * them a date string, is how a person fails to notice that it is wrong.
   */
  const whenLabel = useMemo(() => {
    if (whenUnknown) return null;
    const minutes = minutesSince(extraction.occurred_at.value);
    return Number.isNaN(minutes) ? null : elapsedText(lang, minutes);
  }, [extraction.occurred_at.value, lang, whenUnknown]);

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
          meter, and the meter is the honest measure of what is at stake.

          Always shown, including when the model read a time. It used to render
          only on a miss, which left a misread timestamp uncorrectable — on the
          field that drives the meter and that a bank reads first. */}
      <fieldset className="card">
        <legend className="px-1 text-base font-medium">{copy.confirm.when}</legend>

        {whenUnknown ? (
          <p className="text-sm text-muted">{copy.confirm.whenSub}</p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-base font-medium tabular-nums">{whenLabel}</p>
            <p className="text-sm text-muted">
              {corrected.includes("occurred_at")
                ? copy.confirm.whenEdited
                : copy.confirm.whenRead}
            </p>
          </div>
        )}

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

      {/* Optional, and deliberately quiet. No spinner and no status line: the
          only thing that ever comes of this is the interrupt screen, and a
          "checking…" next to the send button would read as a reason to wait. */}
      <div>
        <label htmlFor="description" className="text-base font-medium">
          {copy.confirm.describe}
        </label>
        <p className="mt-0.5 text-sm text-muted">{copy.confirm.describeHint}</p>
        <textarea
          id="description"
          value={description}
          onChange={(event) => describe(event.target.value)}
          rows={3}
          placeholder={copy.confirm.describePlaceholder}
          className="field-input mt-1.5 resize-y"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-line-strong bg-raised px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void send()}
        disabled={sending}
        // The label swap is the only signal that anything is happening, and a
        // swapped label on a disabled button is not announced. This is the one
        // moment on the site worth interrupting a screen reader for.
        aria-live="polite"
        className="btn-primary"
      >
        {sending ? copy.confirm.sending : copy.confirm.send}
      </button>
    </div>
  );
}
