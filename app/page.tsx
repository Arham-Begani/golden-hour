"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useJourney } from "@/components/JourneyProvider";

/**
 * The landing page.
 *
 * This screen did not exist for most of the project's life, and the reason it
 * did not is written into the intake: someone whose money has just left their
 * account does not need a pitch, they need a text box. That is still true, and
 * it is why the first tappable thing here is the report itself and why the real
 * emergency routes — 1930, cybercrime.gov.in — sit above every word of
 * explanation rather than under it.
 *
 * What the argument needs is the other audience: anyone who opens this cold and
 * cannot tell from an input field why a form was rebuilt. The sequence is the
 * whole idea, so the sequence is what gets drawn.
 *
 * The palette rule from globals.css holds here, and holds strictly: this page
 * is monochrome throughout. Step one is emphasised with weight and contrast
 * instead of colour.
 *
 * The accent is rationed to the meter and the interrupt, the two places where
 * colour carries an instruction rather than a label. Spending it on a diagram
 * node here would teach the reader that the colour means "look at this", and
 * the interrupt needs it to mean "stop".
 */

type Timings = { count: number; median_ms: number | null };

export default function LandingPage() {
  const { copy } = useJourney();
  const landing = copy.landing;

  /**
   * The headline number, read from the same endpoint /evidence uses.
   *
   * It is here because a landing page claiming sixty seconds while the evidence
   * page reads "not yet measured" would be the product contradicting itself on
   * its own front door. Whatever the real distribution says is what this says,
   * including when it says nothing.
   */
  const [timings, setTimings] = useState<Timings | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/timings")
      .then((response) => response.json())
      .then((result) => !cancelled && result.ok && setTimings(result))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const median =
    timings && timings.count > 0 && timings.median_ms !== null
      ? `${(timings.median_ms / 1000).toFixed(1)}${copy.common.seconds}`
      : null;

  return (
    <div className="flex flex-col gap-10 pb-6">
      {/* ---------------------------------------------------------------- */}

      <section>
        <p className="eyebrow">{landing.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-5xl">
          {landing.heading}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">{landing.sub}</p>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/start" className="btn-primary">
            {landing.start}
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/start?demo=1" className="btn-secondary">
              {landing.demo}
            </Link>
            <Link href="/evidence" className="btn-secondary">
              {landing.evidence}
            </Link>
          </div>
        </div>
      </section>

      {/* The real routes, above the explanation rather than under it. Someone in
          the middle of a fraud is the one person this page cannot help. */}
      <section className="card-strong">
        <h2 className="text-base font-semibold">{landing.urgentHeading}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{landing.urgentBody}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href="tel:1930"
            className="flex min-h-12 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium no-underline transition-colors hover:bg-raised-hover"
          >
            {copy.receipt.call}
          </a>
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium no-underline transition-colors hover:bg-raised-hover"
          >
            {copy.receipt.portal}
          </a>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {landing.howHeading}
        </h2>

        {/* A rail rather than three cards: the point is that these happen in an
            order, and three cards side by side say "three features" instead. */}
        <ol className="mt-5 flex flex-col">
          {landing.steps.map((step, index) => {
            const first = index === 0;
            const last = index === landing.steps.length - 1;

            return (
              <li key={step.title} className="relative flex gap-4 pb-7 last:pb-0">
                {!last && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-line"
                  />
                )}

                <span
                  aria-hidden
                  className={`z-10 flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-sm ${
                    /**
                     * Step one is emphasised with weight and contrast, not
                     * colour. The accent is rationed to the meter and the
                     * interrupt — the two places where colour carries an
                     * instruction rather than a label. A coloured node in a
                     * diagram on the front page spends that budget on
                     * decoration, and every later use of it reads as decoration
                     * too.
                     */
                    first
                      ? "border-text bg-raised font-semibold text-text"
                      : "border-line bg-surface text-muted"
                  }`}
                >
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-lg font-medium">{step.title}</h3>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-xs ${
                        first ? "border-text text-text" : "border-line text-faint"
                      }`}
                    >
                      {step.aside}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---------------------------------------------------------------- */}

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {landing.whyHeading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{landing.whyBody}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="card">
            <p className="eyebrow">{landing.whyBank}</p>
            <p className="mt-2 text-sm leading-relaxed">{landing.whyBankBody}</p>
          </div>
          <div className="card">
            <p className="eyebrow">{landing.whyCase}</p>
            <p className="mt-2 text-sm leading-relaxed">{landing.whyCaseBody}</p>
          </div>
        </div>

        {/* The argument's strongest external support, moved up from four
            sections down /evidence. The state already runs this sequence on
            the helpline; the claim is only that the web route should match. */}
        <div className="card-strong mt-4">
          <h3 className="text-base font-semibold">{landing.alreadyHeading}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{landing.alreadyBody}</p>
          <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-sm leading-relaxed text-muted">
            &ldquo;{landing.alreadyQuote}&rdquo;
          </blockquote>
          <p className="mt-2 text-sm leading-relaxed">{landing.alreadyAfter}</p>
          {/* Source next to the claim, never on a separate references page. */}
          {/* text-muted, not text-faint: this block is card-strong (bg-raised),
              where faint measures 4.49:1 and misses the 4.5:1 floor. */}
          <p className="mt-2 text-xs leading-relaxed text-muted">
            <a
              href="https://cybercrime.gov.in/UploadMedia/instructions_citizenreportingcyberfrauds.pdf"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {landing.alreadySource}
            </a>{" "}
            {landing.alreadySourceNote}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {landing.measuredHeading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{landing.measuredBody}</p>

        <Link
          href="/evidence"
          className="card card-interactive mt-4 flex items-center justify-between gap-4 no-underline"
        >
          <div className="min-w-0">
            <p className="text-xs text-muted">{landing.measuredMedian}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">
              {median ?? (
                <span className="text-lg font-medium text-faint">{landing.measuredNone}</span>
              )}
            </p>
            {timings && timings.count > 0 && (
              <p className="mt-0.5 text-xs text-faint">{landing.measuredRuns(timings.count)}</p>
            )}
          </div>
          <span aria-hidden className="shrink-0 text-muted">
            →
          </span>
        </Link>
      </section>

      {/* ----------------------------------------------------------------
          The two pages a sceptical reader needs, which until now were
          reachable only by typing the URL. /honesty answers the honesty
          criterion and /judge is where the median above gets its data, and
          neither is any use unlinked.
          ---------------------------------------------------------------- */}

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {landing.checkHeading}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{landing.checkBody}</p>

        {/* Full width above the pair rather than a third column: the delta is
            what this round is judged on, and three cards at this measure would
            each be too narrow to hold a sentence. */}
        <Link href="/changes" className="card card-interactive mt-4 block no-underline">
          <p className="text-base font-medium">{landing.changesTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{landing.changesBody}</p>
        </Link>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link href="/judge" className="card card-interactive no-underline">
            <p className="text-base font-medium">{landing.judgeTitle}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{landing.judgeBody}</p>
          </Link>
          <Link href="/honesty" className="card card-interactive no-underline">
            <p className="text-base font-medium">{landing.honestyTitle}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{landing.honestyBody}</p>
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}

      <section className="card-strong">
        <h2 className="text-base font-semibold">{landing.honestHeading}</h2>
        <p className="mt-2 text-sm leading-relaxed">{landing.honestBody}</p>
      </section>
    </div>
  );
}
