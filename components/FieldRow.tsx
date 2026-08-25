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

        <span className="flex shrink-0 items-center gap-1.5 text-xs">
          {edited && <Chip>{copy.confirm.edited}</Chip>}
          {downgrade && <Chip>{copy.confirm.dropped}</Chip>}
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
        <p id={`${id}-note`} className="mt-1.5 text-xs leading-relaxed text-faint">
          {downgrade ? (
            <>
              {copy.confirm.droppedWhy}{" "}
              <span className="font-mono text-muted">“{downgrade.original}”</span>
            </>
          ) : (
            copy.confirm.unreadableHint
          )}
        </p>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-line bg-raised px-1.5 py-0.5 text-muted">
      {children}
    </span>
  );
}
