"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JUDGE_SCENARIOS, type JudgeScenario } from "@/lib/judge-scenarios";

/**
 * The judging harness.
 *
 * One screen, no login, no setup: a scenario to work from, a stopwatch, the
 * real product running inside it, and the honesty strip pinned where it cannot
 * scroll away. Someone who has never seen this before should be able to open
 * the URL and be timing a real run inside ten seconds.
 *
 * Three decisions worth defending:
 *
 * **The scenario is not auto-filled.** It would be trivial to seed the intake
 * with a fixture and start the clock, and the number that came out would be
 * meaningless — it would measure how long someone takes to *review* a
 * pre-filled form. That is exactly why demo replays are already excluded from
 * the real timing distribution (`run_kind: "demo"` in lib/schema.ts). The judge
 * reads the scenario off the screen the way a user reads it off their phone,
 * and types or pastes it themselves. The run is therefore a real run and counts
 * toward the measured median that /evidence currently reports as unmeasured.
 *
 * **The product runs in a frame rather than by navigation.** The brief asks for
 * the stopwatch and the honesty strip to stay on screen, and they cannot do
 * that if the judge navigates away. It also means this page adds nothing to the
 * intake, the confirm screen or the receipt — the flow being timed is the
 * shipped flow, untouched and unaware it is being watched.
 *
 * **The stopwatch measures more than the app does, and says so.** It runs from
 * the moment the judge presses start, including the seconds spent reading the
 * scenario. The app's own clock starts at first interaction with the intake.
 * The judge's number is therefore always the larger of the two and is the more
 * honest one to quote.
 *
 * Non-negotiable 6 says exactly one element animates. On the product's own
 * screens that is the decay meter and nothing else. This page is an instrument
 * rather than a product screen, and the brief asks for a stopwatch on it by
 * name; the running digits are the only moving thing here.
 */

const TICK_MS = 100;
/** How often to look at where the framed app has got to. */
const POLL_MS = 250;

type Phase = "idle" | "running" | "done";

function formatElapsed(ms: number): string {
  const total = Math.max(0, ms);
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const tenths = Math.floor((total % 1000) / 100);
  return minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`
    : `${seconds}.${tenths}`;
}

export default function JudgePage() {
  const [scenario, setScenario] = useState<JudgeScenario>(JUDGE_SCENARIOS[0]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [ack, setAck] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  /** Bumped on every start, so a rerun reloads a frame already on /start. */
  const [run, setRun] = useState(0);

  const startedAt = useRef<number | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);

  /** Wall-clock, not a frame counter: a backgrounded tab must not slow it. */
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      if (startedAt.current !== null) setElapsed(Date.now() - startedAt.current);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase]);

  /**
   * Watch where the framed app has got to.
   *
   * Same origin, so reading the frame's pathname is allowed. This is how the
   * clock stops without the receipt page having to know this harness exists —
   * the alternative was a postMessage from /receipt, which would mean editing a
   * product screen so that it could participate in being measured.
   *
   * The try/catch is for the moments the frame is mid-navigation and the
   * document is not readable yet, which is normal rather than exceptional.
   */
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      let path: string | undefined;
      try {
        path = frame.current?.contentWindow?.location?.pathname;
      } catch {
        return;
      }
      if (!path) return;

      const match = /^\/receipt\/([^/]+)/.exec(path);
      if (match) {
        if (startedAt.current !== null) setElapsed(Date.now() - startedAt.current);
        setAck(decodeURIComponent(match[1]));
        setPhase("done");
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [phase]);

  const start = useCallback(() => {
    startedAt.current = Date.now();
    setElapsed(0);
    setAck(null);
    // Reload rather than trust whatever the frame was showing, so a second run
    // never starts halfway through the first one's state.
    //
    // Assigning `frame.current.src` here does not work and shipped broken for
    // several days: the iframe used to be rendered only while phase !== "idle",
    // so at this point in a click handler it had not mounted, the ref was null,
    // the assignment was skipped, and the frame stayed on the `about:blank` in
    // its JSX — a stopwatch counting up over an empty box, on the one page
    // built for judges. The frame is now always mounted (hidden while idle) and
    // its src is driven by the effect below, keyed on the run counter, so a
    // rerun reloads even though the URL string has not changed.
    setRun((n) => n + 1);
    setPhase("running");
  }, []);

  const reset = useCallback(() => {
    startedAt.current = null;
    setPhase("idle");
    setElapsed(0);
    setAck(null);
  }, []);

  /**
   * Point the frame at the intake, after React has committed the phase change.
   *
   * Keyed on `run` as well as `phase` so pressing "Run it again" reloads the
   * intake rather than leaving the previous run's receipt on screen.
   */
  useEffect(() => {
    if (!frame.current) return;
    frame.current.src = phase === "idle" ? "about:blank" : "/start";
  }, [phase, run]);

  const copyScenario = useCallback(() => {
    void navigator.clipboard?.writeText(scenario.text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => undefined,
    );
  }, [scenario.text]);

  return (
    // Bottom padding clears the fixed honesty strip. Without it the last
    // control on the page sits under the strip and cannot be tapped.
    <div className="flex flex-col gap-6 pb-28">
      <header>
        <p className="eyebrow">Timed run</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          Do this yourself and time it
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Pick a scenario, press start, and file the report as if it were yours. Read the
          scenario off the screen the way you would read it off your own phone — nothing is
          pre-filled, because a pre-filled form measures how fast you can read, not how fast
          the product is.
        </p>
      </header>

      {/* ------------------------------------------------------------------ */}

      <section>
        <h2 className="eyebrow">1. The scenario</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {JUDGE_SCENARIOS.map((option) => {
            const selected = option.id === scenario.id;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => setScenario(option)}
                  aria-pressed={selected}
                  disabled={phase === "running"}
                  className={`w-full rounded-lg border p-3 text-left transition-colors disabled:opacity-50 ${
                    selected
                      ? "border-line-strong bg-raised"
                      : "border-line bg-surface hover:bg-raised-hover"
                  }`}
                >
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {option.purpose}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="card mt-3">
          <p className="eyebrow">What is on your phone</p>
          {/* pre wraps rather than scrolls: a sideways-scrolling block inside a
              360px page is the exact thing npm run shots asserts against. */}
          <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
            {scenario.text}
          </pre>
          <button type="button" onClick={copyScenario} className="btn-secondary mt-3">
            {copied ? "Copied" : "Copy the message"}
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}

      <section>
        <h2 className="eyebrow">2. The clock</h2>

        <div className="card-strong mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted">
              {phase === "done" ? "Finished in" : "Elapsed"}
            </p>
            {/* The one moving thing on this page. */}
            <p className="mt-0.5 font-mono text-4xl font-semibold tabular-nums leading-none">
              {formatElapsed(elapsed)}
              <span className="ml-1 text-xl font-normal text-muted">s</span>
            </p>
          </div>

          <div className="flex shrink-0 gap-2">
            {phase === "idle" && (
              <button type="button" onClick={start} className="btn-primary">
                Start the run
              </button>
            )}
            {phase === "running" && (
              <button type="button" onClick={reset} className="btn-secondary">
                Abandon this run
              </button>
            )}
            {phase === "done" && (
              <button type="button" onClick={reset} className="btn-secondary">
                Run it again
              </button>
            )}
          </div>
        </div>

        {phase === "done" && ack && (
          <div className="card mt-3">
            <p className="text-sm leading-relaxed">
              Acknowledgement <span className="font-mono font-medium">{ack}</span> was issued
              after {formatElapsed(elapsed)} seconds.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              That figure is wall-clock from the moment you pressed start, so it includes the
              time you spent reading the scenario. The product&apos;s own clock starts at your
              first interaction with the intake and will read lower. The number above is the
              less flattering of the two, which is the reason it is the one shown here.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Nothing was frozen and nothing was sent. That acknowledgement number corresponds
              to nothing in any government system.
            </p>
          </div>
        )}

        {phase === "idle" && (
          <p className="mt-2 text-xs leading-relaxed text-faint">
            The clock stops by itself when an acknowledgement number appears. Nothing here
            asks you to sign in — there is no login anywhere in this product, on purpose.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}

      <section>
        <h2 className="eyebrow">3. The product</h2>

        {phase === "idle" && (
          <div className="card mt-2 flex min-h-40 items-center justify-center">
            <p className="max-w-xs text-center text-sm leading-relaxed text-muted">
              Press start and the real intake loads here, with the clock running.
            </p>
          </div>
        )}

        {/*
          Always mounted, hidden while idle, rather than rendered on demand.
          A conditionally-rendered iframe has a null ref inside the click
          handler that starts the run, which is exactly how this page shipped
          with a stopwatch running over a frame that never loaded.
        */}
        <div
          hidden={phase === "idle"}
          className="mt-2 overflow-hidden rounded-lg border border-line"
        >
          <iframe
            ref={frame}
            title="Golden Hour, running"
            className="h-[70vh] min-h-125 w-full bg-ink"
            src="about:blank"
          />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-faint">
          That frame is the shipped product, not a copy of it. It does not know it is being
          timed.{" "}
          <Link href="/start" className="underline underline-offset-2">
            Open it full screen
          </Link>{" "}
          if the frame gets in the way.
        </p>
      </section>

      {/* ------------------------------------------------------------------
          The honesty strip. Fixed, so it cannot be scrolled past on the one
          page most likely to be screenshotted and shown to somebody else.
          ------------------------------------------------------------------ */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-3 sm:px-6">
        <p className="pointer-events-auto mx-auto max-w-2xl rounded-lg border border-line-strong bg-raised px-3 py-2 text-xs leading-relaxed text-muted shadow-lg">
          <span className="font-medium text-text">Prototype.</span> No bank integration, no
          CFCFRMS connection, not affiliated with I4C or cybercrime.gov.in. Nothing here
          freezes anyone&apos;s money.{" "}
          <Link href="/honesty" className="underline underline-offset-2">
            What is real and what is not
          </Link>
          {" · "}
          <a href="tel:1930" className="underline underline-offset-2">
            Real help: 1930
          </a>
        </p>
      </div>
    </div>
  );
}
