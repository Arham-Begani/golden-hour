"use client";

import { useEffect, useState } from "react";
import { SOURCES, claimsFullySourced } from "@/lib/decay";
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
  /** Demo replays, counted but never mixed into the claim above. */
  demo: { count: number; median_ms: number | null; runs: number[] };
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

  const sourced = claimsFullySourced();

  return (
    <div className="flex flex-col gap-8 pb-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">The claim</h1>
        <p className="mt-3 text-lg leading-relaxed">
          A complete, dispatchable freeze packet in under sixty seconds, measured against
          the same task on the live portal.
        </p>

        <div className="card-strong mt-4">
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
          Every recorded <strong>human</strong> run from first interaction to dispatch,
          unfiltered. The median includes the slow ones; a best-case number would not mean
          anything. Demo replays are counted separately and excluded — they serve a cached
          extraction and start their clock at the fixture click, so they measure review
          time, not the task.
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
          <p className="mt-4 rounded-lg border border-line-strong bg-raised px-4 py-3 text-sm leading-relaxed">
            <strong>Not yet measured.</strong> No human run has been recorded, so the
            sixty-second claim above is unproven. It stays unproven here rather than being
            filled in with demo replays — the same rule this page applies to the portal
            column below, applied to our own headline number.
          </p>
        )}

        {timings && timings.demo.count > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-faint">
            {timings.demo.count} demo and scripted{" "}
            {timings.demo.count === 1 ? "run" : "runs"} recorded separately
            {timings.demo.median_ms === null
              ? ""
              : ` (median ${(timings.demo.median_ms / 1000).toFixed(1)}s)`}
            . Not evidence for the claim, and not counted toward it.
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
          <div className="mt-3 rounded-lg border border-line-strong bg-raised px-4 py-3 text-sm leading-relaxed">
            <p>
              <strong>Not counted, and not guessed.</strong> The portal column is empty
              because nobody has opened the live portal and counted it. We tried the
              documentary route first: the portal&rsquo;s own{" "}
              <a
                href="https://cybercrime.gov.in/Webform/Citizen_Manual.aspx"
                className="underline underline-offset-2"
              >
                citizen manuals
              </a>{" "}
              do not enumerate this form — the financial-fraud one covers the 1930 helpline
              route and is marked &ldquo;For Delhi Only&rdquo;, and the general reporting
              manual is a deck of screenshots with no text layer.
            </p>
            <p className="mt-2">
              Counting fields off screenshots of a different form would be inference. So
              this stays empty. <em>We could not measure this</em> is a fine thing to show
              you; <em>we guessed</em> is not.
            </p>
          </div>
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

      <section>
        <h2 className="text-xl font-semibold">The sequence already exists</h2>
        <p className="mt-1 text-sm text-muted">
          The strongest evidence for this product&rsquo;s argument is that the government
          already runs it — on the phone, just not on the web.
        </p>

        <div className="mt-3 rounded-lg border border-line-strong bg-raised px-4 py-3 text-sm leading-relaxed">
          <p>
            The portal&rsquo;s own instructions for reporting a financial cyber fraud
            through 1930 describe a two-part sequence. A short list of facts first —
            mobile number, bank or wallet, the account or UPI ID debited, transaction ID,
            transaction date, card number where relevant, a screenshot if there is one.
            Then:
          </p>
          <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-muted">
            &ldquo;the complainant will get a system generated Log-in
            Id/acknowledgement number through SMS/Mail. Using the above Log-in
            Id/acknowledgement number, the complainant must complete registration of
            complaint on National Cybercrime Reporting Portal
            (www.cybercrime.gov.in) within 24 hours.&rdquo;
          </blockquote>
          <p className="mt-2">
            Minimal packet, acknowledgement number, full statement afterwards against that
            number. That is exactly the re-sequencing this prototype argues for, and it is
            already official procedure for the helpline. Golden Hour&rsquo;s claim is only
            that the web route should work the same way.
          </p>
          <p className="mt-2 text-xs text-faint">
            <a
              href="https://cybercrime.gov.in/UploadMedia/instructions_citizenreportingcyberfrauds.pdf"
              className="underline underline-offset-2"
            >
              Citizen Financial Cyber Frauds Reporting and Management System
            </a>{" "}
            — MHA / I4C. Marked &ldquo;For Delhi Only&rdquo;, which is a limit of the
            document, not of the argument.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}

      <section id="curve" className="scroll-mt-4">
        <h2 className="text-xl font-semibold">The clock</h2>
        <p className="mt-1 text-sm text-muted">
          The meter shows how long ago the fraud happened, counted from the timestamp the
          user gave us and never from when the page loaded. It does not show a recovery
          percentage, and the reason is worth stating in full.
        </p>

        <div className="mt-3 rounded-lg border border-line-strong bg-raised px-4 py-3 text-sm leading-relaxed">
          <p>
            <strong>There is no published recovery curve, so we do not draw one.</strong>{" "}
            An earlier version of this meter showed a falling percentage — 50% within an
            hour, 10% within a day, 2% after a week — taken from the project brief. Those
            figures could not be traced to any primary source.
          </p>
          <p className="mt-2">
            In{" "}
            <a
              href="https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS11022026/1349.pdf"
              className="underline underline-offset-2"
            >
              Rajya Sabha Unstarred Question 1349
            </a>{" "}
            of 11 February 2026, the Ministry of Home Affairs was asked for
            &ldquo;details of total amount recovered vis-&agrave;-vis losses incurred,
            year-wise&rdquo;. The answer does not contain the word{" "}
            <em>recovered</em>. The percentages that circulate in the press are police
            statements, not published statistics.
          </p>
          <p className="mt-2">
            A decaying counter whose number nobody can source is urgency theatre — the
            exact thing this product claims not to be. So the number is gone and the clock
            stayed. The direction is real and sourced; the magnitude is not claimed.
          </p>
        </div>

        {!sourced && (
          <p className="mt-3 rounded-lg border border-danger bg-danger-dim/40 px-4 py-3 text-sm leading-relaxed">
            <strong>Unverified.</strong> A claim on this page has lost its source. Until it
            is restored the meter should not be presented as cited — see{" "}
            <code>CITATIONS.md</code>.
          </p>
        )}

        <h3 className="mt-5 text-base font-semibold">What is cited, and for what</h3>
        <ul className="mt-2 flex flex-col gap-3">
          {SOURCES.map((source) => (
            <li key={source.id} className="border-b border-line pb-3 last:border-b-0">
              <a
                href={source.url}
                className="text-sm underline underline-offset-2 transition-colors hover:text-mark"
              >
                {source.title}
              </a>
              <p className="mt-1 text-xs leading-relaxed text-muted">{source.supports}</p>
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
      <p className="eyebrow">{label}</p>
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
