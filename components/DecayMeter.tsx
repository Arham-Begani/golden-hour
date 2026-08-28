"use client";

import { useEffect, useState } from "react";
import {
  BANDS,
  MAX_MINUTES,
  MIN_MINUTES,
  elapsedParts,
  meterState,
  timelinePosition,
} from "@/lib/decay";
import { t, type Lang } from "@/lib/i18n";

/**
 * The one element on the page that moves.
 *
 * It used to show a recovery percentage. It does not any more, because no
 * published source gives a recovery rate by elapsed time — see CITATIONS.md and
 * the header of lib/decay.ts. What is shown instead is the thing that is
 * actually known: how long ago the fraud happened, which band that falls in,
 * and what to do about it.
 *
 * That is a smaller claim, and it is the whole point. A decaying percentage
 * nobody can source is urgency theatre. An elapsed clock is a fact, and it is
 * still computed from the user's OWN timestamp rather than from page load — a
 * fraud from six days ago reads "6 days" and does not pretend to be urgent.
 *
 * Form: a stat tile — hero figure plus a log-scaled timeline with the report
 * marked on it. The marker's position is a position, not a probability; there
 * is no magnitude claim buried in the drawing.
 */

const W = 320;
const H = 52;
const PAD_X = 10;
const TRACK_Y = 18;

const px = (position: number) => PAD_X + position * (W - PAD_X * 2);

/** The band boundaries, drawn as ticks so the scale is legible. */
const TICKS = [
  { minutes: 60, label: "1h" },
  { minutes: 60 * 24, label: "24h" },
  { minutes: MAX_MINUTES, label: "7d" },
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

  const state = now ? meterState(occurredAt, now) : null;
  const parts = state?.known ? elapsedParts(state.minutes) : null;
  const position = state?.known ? timelinePosition(state.minutes) : 0;
  const bandKey = state?.known ? state.band.key : null;

  return (
    <section aria-label={copy.label} className="card">
      <h2 className="eyebrow">{copy.label}</h2>

      {/* Hero figure: the elapsed clock. Text token, not the mark colour — a
          light amber is illegible as text, and the track below carries identity. */}
      <p className="mt-1 flex items-baseline gap-2">
        {/* The placeholder is dimmed rather than white: at this size a full
            contrast em dash reads as a value, and this state is the absence of
            one. */}
        <span
          className={`text-5xl font-semibold leading-none sm:text-6xl ${
            parts === null ? "text-line-strong" : "text-text"
          }`}
        >
          {parts === null ? "—" : parts.value}
        </span>
        <span className="text-lg text-muted">
          {parts === null ? (state === null ? "" : copy.unknown) : parts.unit}
        </span>
      </p>

      {bandKey && (
        <p className="mt-2 text-sm font-medium">{copy.bands[bandKey]}</p>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label={
          state?.known
            ? `${copy.bands[state.band.key]}. ${copy.bandWhy[state.band.key]}`
            : copy.unknown
        }
      >
        {/* The track. One rail, log-scaled from a minute to a week. */}
        <line
          x1={PAD_X}
          y1={TRACK_Y}
          x2={W - PAD_X}
          y2={TRACK_Y}
          stroke="var(--color-mark-track)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Elapsed so far. A position along the clock, not a quantity. */}
        {state?.known && (
          <line
            x1={PAD_X}
            y1={TRACK_Y}
            x2={px(position)}
            y2={TRACK_Y}
            stroke="var(--color-mark)"
            strokeWidth="6"
            strokeLinecap="round"
            className="transition-[x2] duration-700 ease-linear"
          />
        )}

        {BANDS.slice(0, -1).map((band, i) => (
          <g key={band.key}>
            <line
              x1={px(timelinePosition(band.untilMinutes))}
              y1={TRACK_Y + 6}
              x2={px(timelinePosition(band.untilMinutes))}
              y2={TRACK_Y + 11}
              stroke="var(--color-line-strong)"
              strokeWidth="1"
            />
            <text
              x={px(timelinePosition(band.untilMinutes))}
              y={H - 6}
              textAnchor={i === BANDS.length - 2 ? "end" : "middle"}
              className="fill-faint"
              fontSize="10"
            >
              {TICKS[i]?.label}
            </text>
          </g>
        ))}

        {/* Where this report sits. 2px surface ring so it stays legible
            wherever it lands on the rail. */}
        {state?.known && (
          <circle
            cx={px(Math.max(position, timelinePosition(MIN_MINUTES)))}
            cy={TRACK_Y}
            r="5"
            fill="var(--color-mark)"
            stroke="var(--color-surface)"
            strokeWidth="2"
          />
        )}
      </svg>

      <p className="mt-1 text-xs leading-relaxed text-faint">
        {bandKey ? `${copy.bandWhy[bandKey]} ${copy.explainer}` : copy.unknownWhy}{" "}
        <a
          href={sourceHref}
          className="text-muted underline underline-offset-2 transition-colors hover:text-text"
        >
          {copy.source}
        </a>
      </p>
    </section>
  );
}
