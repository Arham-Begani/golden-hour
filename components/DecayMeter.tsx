"use client";

import { useEffect, useMemo, useState } from "react";
import { ANCHORS, elapsedLabel, meterState, recoveryProbability } from "@/lib/decay";
import { t, type Lang } from "@/lib/i18n";

/**
 * The one element on the page that moves.
 *
 * Form: a stat tile — hero figure plus a sparkline of the published curve with
 * the user's own position marked. Not a chart of many series, so no legend;
 * the label says what is plotted.
 *
 * Two honesty mechanics are built into the drawing itself:
 *   - The sub-one-hour segment is dashed, because the published curve does not
 *     anchor inside the first hour and that stretch is interpolation.
 *   - The three cited points are ticked on the axis, so the evidence and the
 *     fit are visible at the same time.
 *
 * The number is computed from the user's fraud timestamp. Six days ago reads
 * 2% and stays there. It never manufactures urgency that isn't there.
 */

const W = 320;
const H = 76;
const PAD_X = 10;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;

const MIN_T = ANCHORS[0].minutes;
const MAX_T = ANCHORS[ANCHORS.length - 1].minutes;
const Y_MAX = 0.62;

const LOG_MIN = Math.log10(MIN_T);
const LOG_SPAN = Math.log10(MAX_T) - LOG_MIN;

const x = (minutes: number) => {
  const clamped = Math.min(Math.max(minutes, MIN_T), MAX_T);
  return PAD_X + ((Math.log10(clamped) - LOG_MIN) / LOG_SPAN) * (W - PAD_X * 2);
};

const y = (probability: number) =>
  H - PAD_BOTTOM - (probability / Y_MAX) * (H - PAD_TOP - PAD_BOTTOM);

/** Sample the curve in log-time so the drawn line matches the maths exactly. */
function pathBetween(fromMinutes: number, toMinutes: number, steps = 48): string {
  const fromLog = Math.log10(fromMinutes);
  const toLog = Math.log10(toMinutes);
  const points: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const minutes = 10 ** (fromLog + ((toLog - fromLog) * i) / steps);
    points.push(`${x(minutes).toFixed(2)},${y(recoveryProbability(minutes)).toFixed(2)}`);
  }

  return `M${points.join("L")}`;
}

const TICKS = [
  { minutes: 60, label: "1h" },
  { minutes: 60 * 24, label: "24h" },
  { minutes: 60 * 24 * 7, label: "7d" },
];

export function DecayMeter({
  occurredAt,
  lang,
  sourceHref = "/evidence#curve",
}: {
  occurredAt: string | null;
  lang: Lang;
  sourceHref?: string;
}) {
  const copy = t(lang).meter;

  // Rendered only after mount: the value depends on the clock, and server and
  // client clocks disagree.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Same reason as the null initial state: the clock is a browser-only value
    // and reading it during render would desync server and client markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const curve = useMemo(
    () => ({
      interpolated: pathBetween(MIN_T, ANCHORS[1].minutes),
      cited: pathBetween(ANCHORS[1].minutes, MAX_T),
    }),
    [],
  );

  const state = now ? meterState(occurredAt, now) : null;

  return (
    <section
      aria-label={copy.label}
      className="rounded-xl border border-line bg-surface p-4 sm:p-5"
    >
      <h2 className="text-sm font-medium tracking-wide text-muted">{copy.label}</h2>

      {/* Hero figure. Text token, not the mark colour — a light amber is
          illegible as text, and the bar beside it already carries identity. */}
      <p className="mt-1 flex items-baseline gap-3">
        <span
          className="text-5xl font-semibold leading-none text-text sm:text-6xl"
          aria-live="off"
        >
          {state === null ? "—" : state.known ? `${(state.probability * 100).toFixed(1)}%` : copy.unknown}
        </span>
        {state?.known && (
          <span className="text-sm text-muted">{elapsedLabel(state.minutes)}</span>
        )}
      </p>

      {/* The meter track: one fill, the unfilled part a dimmer step of the
          same ramp so the state reads across the whole bar. */}
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-mark-track"
        role="img"
        aria-label={
          state?.known
            ? `${(state.probability * 100).toFixed(1)} percent`
            : copy.unknown
        }
      >
        <div
          className="h-full rounded-full bg-mark transition-[width] duration-700 ease-linear"
          style={{ width: state?.known ? `${(state.probability / Y_MAX) * 100}%` : "0%" }}
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label="The published recovery curve, with the current report marked on it."
      >
        {/* Axis: hairline, solid, recessive. */}
        <line
          x1={PAD_X}
          y1={H - PAD_BOTTOM}
          x2={W - PAD_X}
          y2={H - PAD_BOTTOM}
          stroke="var(--color-line)"
          strokeWidth="1"
        />

        {TICKS.map((tick) => (
          <g key={tick.label}>
            <line
              x1={x(tick.minutes)}
              y1={H - PAD_BOTTOM}
              x2={x(tick.minutes)}
              y2={H - PAD_BOTTOM + 4}
              stroke="var(--color-line-strong)"
              strokeWidth="1"
            />
            <text
              x={x(tick.minutes)}
              y={H - 4}
              textAnchor={tick.minutes === MAX_T ? "end" : "middle"}
              className="fill-faint"
              fontSize="10"
            >
              {tick.label}
            </text>
          </g>
        ))}

        {/* Dashed = interpolated. The published figures do not anchor here, and
            the drawing should say so without a footnote. */}
        <path
          d={curve.interpolated}
          fill="none"
          stroke="var(--color-mark)"
          strokeWidth="2"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <path
          d={curve.cited}
          fill="none"
          stroke="var(--color-mark)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* The cited points, marked on the curve they were fitted to. */}
        {ANCHORS.filter((anchor) => anchor.cited).map((anchor) => (
          <circle
            key={anchor.minutes}
            cx={x(anchor.minutes)}
            cy={y(anchor.probability)}
            r="2.5"
            fill="var(--color-mark)"
            stroke="var(--color-surface)"
            strokeWidth="1.5"
          />
        ))}

        {/* Where this report sits. 2px surface ring so it stays legible
            wherever it lands on the line. */}
        {state?.known && (
          <circle
            cx={x(Math.max(state.minutes, MIN_T))}
            cy={y(state.probability)}
            r="4.5"
            fill="var(--color-mark)"
            stroke="var(--color-surface)"
            strokeWidth="2"
          />
        )}
      </svg>

      <p className="mt-2 text-xs leading-relaxed text-faint">
        {state?.known ? copy.explainer : copy.unknownWhy}{" "}
        <a href={sourceHref} className="text-muted underline underline-offset-2">
          {copy.source}
        </a>
      </p>
    </section>
  );
}
