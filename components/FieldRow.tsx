"use client";

import { t, type Lang } from "@/lib/i18n";
import { UNREADABLE, type ReadField } from "@/lib/schema";
import type { Downgrade } from "@/lib/validate";

/**
 * One extracted field, shown back to the person who can correct it.
 *
 * UNREADABLE is rendered as a labelled, dashed-outline hole — not a validation
 * error, not a red field, and never a blocker on sending. A hole says "we did
 * not read this", which is exactly the state a bank should receive rather than
 * a confident guess.
 *
 * When a value was dropped by the shape checks, the row shows what the model
 * actually said and why it was thrown away. Showing the working is what makes
 * the refusal to guess credible instead of merely claimed.
 */

const CONFIDENCE_SHOWN_BELOW = 0.85;

export function FieldRow({
  name,
  field,
  lang,
  downgrade,
  edited,
  onChange,
  inputMode = "text",
  showHint = true,
}: {
  name: keyof ReturnType<typeof t>["fields"];
  field: ReadField;
  lang: Lang;
  downgrade?: Downgrade;
  edited: boolean;
  onChange: (value: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
  /**
   * Explain the hole on the first one only. Repeating the same sentence under
   * every blank field is how it stops being read.
   */
  showHint?: boolean;
}) {
  const copy = t(lang);
  const missing = field.value === UNREADABLE || field.value.trim() === "";
  const id = `field-${name}`;

  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-muted">
          {copy.fields[name]}
        </label>

        {/* Three chips that used to look identical and do not mean remotely
            the same thing. "Edited" is bookkeeping and "Low confidence" is a
            caveat; "Dropped" is the server having refused a confident wrong
            answer, which is the single strongest claim this product makes
            about itself. It gets the weight, in the only currency this palette
            allows — border and text tone, never colour. */}
        <span className="flex shrink-0 items-center gap-1.5 text-xs">
          {edited && <Chip>{copy.confirm.edited}</Chip>}
          {downgrade && <Chip strong>{copy.confirm.dropped}</Chip>}
          {!missing && !edited && field.confidence < CONFIDENCE_SHOWN_BELOW && (
            <Chip>{copy.confirm.lowConfidence}</Chip>
          )}
        </span>
      </div>

      <input
        id={id}
        value={missing ? "" : field.value}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={missing ? copy.confirm.unreadable : undefined}
        aria-describedby={downgrade || (missing && showHint) ? `${id}-note` : undefined}
        className={`field-input mt-1.5 ${missing ? "field-input-missing" : ""}`}
      />

      {(downgrade || (missing && showHint)) && (
        <div id={`${id}-note`} className="mt-1.5">
          {downgrade ? (
            <>
              <p className="text-xs leading-relaxed text-muted">{copy.confirm.droppedWhy}</p>
              {/* The rejected value on its own line rather than inside the
                  sentence. It is the evidence — the thing the model actually
                  said, kept and shown instead of quietly discarded — and at
                  text-xs inline it was the smallest element in the row. */}
              <p className="mt-1.5 rounded border border-line bg-raised px-2 py-1.5 font-mono text-sm break-all text-text">
                {downgrade.original}
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-faint">{copy.confirm.unreadableHint}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 ${
        strong
          ? "border-line-strong bg-raised font-medium text-text"
          : "border-line bg-raised text-muted"
      }`}
    >
      {children}
    </span>
  );
}
