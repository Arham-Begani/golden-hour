"use client";

import { useEffect, useState } from "react";
import { ANCHORS, anchorsFullySourced } from "@/lib/decay";
import benchmark from "@/data/portal-benchmark.json";

/**
 * The claim, and its limits, stated on the product rather than in a README.
 *
 * Three sections, in order of how much they can be attacked:
 *   1. What is and is not being claimed.
 *   2. Measured — real dispatch timings, the whole distribution.
 *   3. Compared — the portal benchmark, which stays visibly empty until a
 *      human has actually counted it.
 *   4. The curve, and whether its anchors are sourced yet.
 */

type Timings = {
  count: number;
  median_ms: number | null;
  fastest_ms: number | null;
  slowest_ms: number | null;
  under_60s: number;
  runs: number[];
};

const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)}s`);

export default function EvidencePage() {
  const [timings, setTimings] = useState<Timings | null>(null);

  useEffect(() => {
    void fetch("/api/timings")
      .then((response) => response.json())
      .then((result) => result.ok && setTimings(result))
      .catch(() => setTimings(null));
  }, []);

  const sourced = anchorsFullySourced();

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">The claim</h1>
        <p className="mt-3 text-lg leading-relaxed">
          A complete, dispatchable freeze packet in under sixty seconds, measured against
          the same task on the live portal.
        </p>

        <div className="mt-4 rounded-xl border border-line-strong bg-raised p-4 sm:p-5">
          <h2 className="text-base font-semibold">What this does not claim</h2>
          <p className="mt-2 text-sm leading-relaxed">
            It does not freeze anyone&rsquo;s money. There is no bank integration and no
            CFCFRMS connection. Nothing sent here reaches a bank, a police force, or any
            government system. It is a prototype of a <em>sequence</em>, not a replacement
            for one — and the sequence is the argument.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}

      <section>
        <h2 className="text-xl font-semibold">Measured</h2>
        <p className="mt-1 text-sm text-muted">
          Every recorded run from first interaction to dispatch, unfiltered. The median
          includes the slow ones; a best-case number would not mean anything.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Median" value={seconds(timings?.median_ms ?? null)} />
          <Stat label="Fastest" value={seconds(timings?.fastest_ms ?? null)} />
          <Stat label="Slowest" value={seconds(timings?.slowest_ms ?? null)} />
          <Stat
            label="Under 60s"
            value={
              timings && timings.count > 0 ? `${timings.under_60s}/${timings.count}` : "—"
            }
          />
        </div>

        {timings && timings.count > 0 ? (
          <RunStrip runs={timings.runs} />
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm text-muted">
            No runs recorded yet. Complete a report and this fills in.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}

      <section>
        <h2 className="text-xl font-semibold">Compared</h2>
        <p className="mt-1 text-sm text-muted">
          The same task on cybercrime.gov.in. These numbers are counted by hand — nothing
          here is estimated or generated.
        </p>

        {!benchmark.verified && (
          <p className="mt-3 rounded-lg border border-line-strong bg-raised px-4 py-3 text-sm">
            <strong>Not yet counted.</strong> The portal column is empty until someone has
            actually opened the live portal and counted it. See{" "}
            <code className="text-muted">data/portal-benchmark.json</code>.
          </p>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2 pr-3 font-medium">Metric</th>
                <th scope="col" className="py-2 pr-3 font-medium">cybercrime.gov.in</th>
                <th scope="col" className="py-2 font-medium">Golden Hour</th>
              </tr>
            </thead>
            <tbody>
              {benchmark.rows.map((row) => (
                <tr key={row.metric} className="border-b border-line align-top last:border-b-0">
                  <th scope="row" className="py-3 pr-3 text-left font-normal">
                    {row.metric}
                  </th>
                  <td className="py-3 pr-3 tabular-nums">
                    {row.portal === null ? (
                      <span className="text-faint">not yet counted</span>
                    ) : (
                      String(row.portal)
                    )}
                  </td>
                  <td className="py-3 tabular-nums">
                    {row.goldenHour === null ? (
                      <span className="text-faint">see measured</span>
                    ) : (
                      String(row.goldenHour)
                    )}
                    {row.goldenHourNote && (
                      <span className="mt-0.5 block text-xs font-normal text-faint">
                        {row.goldenHourNote}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}

      <section id="curve" className="scroll-mt-4">
        <h2 className="text-xl font-semibold">The curve</h2>
        <p className="mt-1 text-sm text-muted">
          The meter interpolates in log-time between these anchors. It is computed from the
          fraud&rsquo;s timestamp, never from when the page loaded.
        </p>

        {!sourced && (
          <p className="mt-3 rounded-lg border border-danger bg-danger-dim/40 px-4 py-3 text-sm leading-relaxed">
            <strong>Unverified.</strong> These figures came from the project brief and have
            not been traced to a primary source. A first search pass also found a published
            claim that appears to contradict the 24-hour anchor. Until this is resolved the
            meter should not be presented as cited — see <code>CITATIONS.md</code>, which
            records what was found and the three ways out.
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2">
          {ANCHORS.map((anchor) => (
            <li
              key={anchor.minutes}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2 last:border-b-0"
            >
              <span className="text-sm">{anchor.label}</span>
              <span className="flex items-baseline gap-3">
                <span className="tabular-nums">{(anchor.probability * 100).toFixed(0)}%</span>
                {anchor.source ? (
                  <a href={anchor.source} className="text-xs text-muted underline">
                    source
                  </a>
                ) : (
                  <span className="text-xs text-faint">
                    {anchor.cited ? "unsourced" : "interpolation"}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold">{value}</p>
    </div>
  );
}

/**
 * Every run as one dot on a shared axis, with the sixty-second claim drawn on
 * it. A strip plot rather than twelve labelled bars: the distribution is the
 * point, and a value on every mark would go unread.
 */
function RunStrip({ runs }: { runs: number[] }) {
  const W = 320;
  const H = 56;
  const PAD = 10;
  const TARGET_MS = 60_000;

  const max = Math.max(TARGET_MS * 1.2, ...runs);
  const x = (ms: number) => PAD + (ms / max) * (W - PAD * 2);
  const baseline = H - 20;

  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label={`${runs.length} recorded runs plotted against the sixty-second target.`}>
        <line x1={PAD} y1={baseline} x2={W - PAD} y2={baseline}
          stroke="var(--color-line)" strokeWidth="1" />

        {/* The claim, drawn on the same axis as the evidence for it. */}
        <line x1={x(TARGET_MS)} y1={12} x2={x(TARGET_MS)} y2={baseline}
          stroke="var(--color-line-strong)" strokeWidth="1" />
        <text x={x(TARGET_MS)} y={8} textAnchor="middle" className="fill-muted" fontSize="9">
          60s
        </text>

        {runs.map((ms, index) => (
          <circle
            key={`${ms}-${index}`}
            cx={x(ms)}
            cy={baseline - 8}
            r="4"
            fill="var(--color-mark)"
            stroke="var(--color-surface)"
            strokeWidth="2"
          />
        ))}

        <text x={PAD} y={H - 4} className="fill-faint" fontSize="9">0s</text>
        <text x={W - PAD} y={H - 4} textAnchor="end" className="fill-faint" fontSize="9">
          {(max / 1000).toFixed(0)}s
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-faint">
        One dot per recorded run. Overlapping dots mean repeated times.
      </figcaption>
    </figure>
  );
}
