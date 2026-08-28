import Link from "next/link";
import type { Metadata } from "next";
import { INTRO, SECTIONS, TITLE, type Claim } from "@/lib/honesty";

/**
 * The honesty route.
 *
 * Everything on this page comes from `lib/honesty.ts`, which is the same file
 * `HONESTY.md` is generated from and which a test keeps the two in sync. There
 * is deliberately no copy authored here — a claim that exists only in JSX is a
 * claim the repo file does not make.
 *
 * It is a server component with no client JavaScript at all. The page makes
 * assertions about what the product does and does not do; it should not itself
 * be doing anything.
 *
 * English only, on purpose, and it says so at the top. Every other screen has
 * Hindi and the Hindi is unreviewed. The one page whose entire job is to be
 * believed is the worst possible place to put a translation nobody has checked.
 */

export const metadata: Metadata = {
  title: "What is real and what is not — Golden Hour",
  description:
    "Golden Hour does not freeze anyone's money. What is real in this prototype, what is mocked, and what was measured.",
};

const STATUS_LABEL: Record<Claim["status"], string> = {
  real: "Real",
  "not-real": "Not real",
  partial: "With limits",
};

/**
 * Monochrome, including here.
 *
 * The obvious design is a red badge on every "Not real" row. It is the wrong
 * one twice over: it spends the accent that the interrupt needs to mean "stop",
 * and it makes the honest disclosures look like errors — which quietly teaches
 * the reader that admitting a limit is a failure state.
 */
const STATUS_STYLE: Record<Claim["status"], string> = {
  real: "border-line-strong text-text",
  "not-real": "border-line-strong bg-raised text-text",
  partial: "border-line text-muted",
};

function StatusBadge({ status }: { status: Claim["status"] }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export default function HonestyPage() {
  return (
    <article className="flex flex-col gap-10 pb-6">
      <header>
        <p className="eyebrow">Golden Hour</p>
        <h1 className="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl">
          {TITLE}
        </h1>

        {INTRO.map((paragraph) => (
          <p key={paragraph} className="mt-4 text-base leading-relaxed text-muted">
            {paragraph}
          </p>
        ))}

        <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
          This page is in English only. The Hindi elsewhere on this site has not been read by
          a native speaker, and this is not the page to put an unreviewed translation on.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-6">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{section.heading}</h2>

          {section.body.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}

          {section.claims && (
            /**
             * A list of rows rather than a `<table>`. A three-column table at
             * 360px either scrolls sideways or crushes the detail column into a
             * word per line, and this content has to be readable on the cheap
             * phone the product is otherwise designed for.
             */
            <ul className="mt-4 flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
              {section.claims.map((claim) => (
                <li key={claim.thing} className="bg-surface p-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                    <h3 className="text-sm font-medium">{claim.thing}</h3>
                    <StatusBadge status={claim.status} />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{claim.detail}</p>
                </li>
              ))}
            </ul>
          )}

          {section.points && (
            <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted marker:text-faint">
              {section.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ol>
          )}

          {/* Non-negotiable: a statistic is shown with its source next to it,
              not on a separate references page nobody opens. */}
          {section.source && (
            <p className="mt-3 text-sm">
              <span className="text-faint">Source: </span>
              <a
                href={section.source.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {section.source.label}
              </a>
            </p>
          )}
        </section>
      ))}

      <footer className="border-t border-line pt-5">
        <p className="text-sm text-muted">
          The claim, and how it is measured, is on{" "}
          <Link href="/evidence" className="underline underline-offset-2">
            the evidence page
          </Link>
          . The report itself starts at{" "}
          <Link href="/start" className="underline underline-offset-2">
            /start
          </Link>
          .
        </p>
        <p className="mt-3 text-sm text-muted">
          If money has just left your account, stop reading this and call{" "}
          <a href="tel:1930" className="underline underline-offset-2">
            1930
          </a>
          .
        </p>
      </footer>
    </article>
  );
}
