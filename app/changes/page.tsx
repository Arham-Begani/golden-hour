import Link from "next/link";
import type { Metadata } from "next";

/**
 * What changed for Round 2.
 *
 * A defect ledger, not a feature list. The obvious version of this page is
 * "what we added" — every project in the round will have one of those, and it
 * asks the reader to take the improvement on trust. This one names what was
 * wrong first, in the same voice /honesty uses, and hands over the link that
 * proves it is not wrong now. Two of the entries are still open and sit at the
 * top rather than the bottom.
 *
 * Visually it is deliberately a sibling of /honesty: the same hairline-split
 * row list, the same monochrome treatment, no colour. The two pages do the
 * same job — they are the ones making claims about the project rather than
 * claims inside it — so they should read as a pair.
 *
 * Server component, no client JavaScript, English only. Same reasoning as
 * /honesty: a page whose job is to be believed is the wrong place for an
 * unreviewed translation, and it should not itself be doing anything.
 */

export const metadata: Metadata = {
  title: "What changed for Round 2 — Golden Hour",
  description:
    "The defects found auditing Golden Hour between rounds, what was done about each, and where to check.",
};

type Entry = {
  /** What was actually wrong. Stated before the fix, on purpose. */
  found: string;
  /** What was done about it, or what is blocking it while it is still open. */
  did: string;
  /** Where a reader confirms it for themselves. */
  check?: { label: string; href: string };
};

const OPEN: Entry[] = [
  {
    found:
      "The sixty-second claim still has no human runs behind it. The harness that records them was broken for the whole of Round 1, so the distribution is empty and the landing page reads “Not yet measured”.",
    did: "The harness works now, so the number can finally be earned. Until somebody sits down with a phone and does the task unaided, it stays blank — filling it with scripted runs would be the exact fabrication this project refuses everywhere else.",
    check: { label: "See the empty distribution", href: "/evidence" },
  },
  {
    found:
      "The comparison against cybercrime.gov.in is still uncounted. Nobody has opened the live portal and counted the fields it asks for before it accepts anything.",
    did: "The documentary route was tried and failed — the portal's own manuals either cover the helpline route or are image-only. So the column stays empty and says why, rather than carrying an estimate.",
    check: { label: "See the empty column", href: "/evidence" },
  },
];

const FIXED: Entry[] = [
  {
    found:
      "The most important path in the product had never been measured. The interrupt — a supporting feature — had a rigorous evaluation, 22 labelled cases and five disclosed limits. Extraction, which is the thing a person actually comes here to do, had none, and the screenshot path that the front page leads with had never been run once. The project measured its second-most important feature and not its most important one.",
    did: "There is now an extraction evaluation over generated screenshots and text in English, Hinglish, Hindi and an unpunctuated dictation transcript. Across three passes: 74 of 75 fields correct, and the screenshot path 40 of 40 with nothing invented — including three images where a field was cut out entirely, so any value returned for it could not have been read.",
    check: { label: "The numbers and their limits", href: "/honesty" },
  },
  {
    found:
      "One value got through wrong, and it is the one that matters. Given a dictation transcript saying “fastcart dot pay at samplebank”, the model returned fastcart@samplebank — a different account, and a perfectly well-formed handle. The server checks shape, so it had nothing to object to, and the value went into the packet.",
    did: "Nothing automatic, deliberately. Shape validation catches malformed values and cannot catch plausible ones; that is now a measured limit stated on the honesty page rather than a suspicion. The mitigation that exists is the confirm screen, where the handle is shown back and can be corrected before sending. A guard built in three days against a single observed case would either fire constantly or never.",
    check: { label: "Read the limit", href: "/honesty" },
  },
  {
    found:
      "The judging harness did not work. Pressing “Start the run” at /judge began a stopwatch over a frame that never loaded — a clock counting up against an empty box. It had been shipping that way since the page was written, and it is the page the submission offers reviewers as the guided run.",
    did: "The iframe was rendered only once a run started, so the ref was still null in the click handler that set its source and the frame kept the blank placeholder from its markup. It is now always mounted and driven by an effect. This is also why no run had ever been recorded: none could finish.",
    check: { label: "Time a run yourself", href: "/judge" },
  },
  {
    found:
      "The front page asserted a number the evidence page refuses to guess. It opened with “about fifty facts”, while /evidence says in as many words that guessing the portal's field count would discredit everything next to it.",
    did: "Removed from the landing page, the summary and the video script. The sentence now describes what the portal does without counting it. A figure goes back only when a person has counted one.",
    check: { label: "Read the claim and its limits", href: "/evidence" },
  },
  {
    found:
      "The front page then did the same thing again, with its own number. When the first real runs landed, /evidence learned that a handful of runs is not a distribution and started showing a caveat below five. The landing tile had only ever been taught about the case of exactly one — so at two runs it went back to reading “Median time to dispatch”, while the page one tap away said two runs “is not yet a distribution”. The same figure, described more confidently on the screen a reader reaches first.",
    did: "The threshold and the labelling rule moved into one module that both pages read, so they cannot drift apart again. Below five runs neither of them uses the word median, and neither does the tile at zero.",
    check: { label: "Compare the two", href: "/evidence" },
  },
  {
    found:
      "The honesty page was unreachable. /honesty and /judge were linked from nowhere — not the header, not the footer, not the landing page. A disclosure nobody can navigate to is not a disclosure.",
    did: "Both are in the footer on every screen and on the landing page.",
    check: { label: "What is real and what is not", href: "/honesty" },
  },
  {
    found:
      "The interrupt could not fire on the product's most likely input. A screenshot of a debit alert carries no evidence about whether the caller is still on the line, and there was nowhere to say so afterwards — so a screenshot-only report could never trip the stop screen. The route built for exactly this had no caller outside the test script.",
    did: "The confirm screen now takes an optional sentence and triages it through the same gate. It cannot block the send button: dispatch before it answers and the packet goes.",
    check: { label: "Try it on a demo case", href: "/start?demo=1" },
  },
  {
    found:
      "The measured false-positive rate described a code path the product never ran. The number came from one route; the report flow calls a different one, with a different prompt, asking the same question alongside nine other fields. The two were assumed equivalent because both are built from one shared paragraph.",
    did: "The evaluation now scores both and leads with the one a user actually hits. They agreed on all 22 cases with identical verdicts, so the old claim turns out to have been true — it had just never been tested, which is a different thing, and the honesty page now says so in those words.",
    check: { label: "The numbers and their limits", href: "/honesty" },
  },
  {
    found:
      "No demo could show the anti-hallucination layer working. Every demo case's blanks came from the model declining to read a field — which demonstrates the prompt behaving, not the server refusing a confident wrong answer. The strongest thing in the codebase was the one thing a reviewer could not watch happen.",
    did: "A demo case now returns an eleven-digit reference at high confidence. The server refuses it on shape, the confirm screen shows the rejected value, and the receipt lists the field as sent blank. A test fails if that case stops being refused.",
    check: { label: "Run “A confident misread”", href: "/start?demo=1" },
  },
  {
    found:
      "A misread timestamp could not be corrected. The time control appeared only when the model failed to read one — so if it read one wrongly, the field that drives the meter and that a bank reads first was stuck.",
    did: "The control is always shown, with what was read stated in words above it.",
    check: { label: "Start a report", href: "/start" },
  },
  {
    found:
      "The receipt counted a blank as sent. An unread payment method is stored as “unknown”, which is not a value a bank can use, but the count treated it as one — so an entirely empty packet reported one of nine fields sent.",
    did: "Both the confirm screen and the receipt now treat those placeholders as the holes they are. On the screen whose argument is that it counts its holes honestly, that count should not have been the generous one.",
  },
  {
    found:
      "The comparison table hid its own column on a phone. It is 32rem across at its narrowest and a 360px screen gives it 20.5, so it scrolled sideways inside its own container — and the column that went over the edge was Golden Hour's. The page's central comparison needed a swipe to see half of, on the width this design commits to.",
    did: "The rows stack below the small breakpoint, so both columns are on screen at once, and stay a table above it where both fit anyway. The comparison is the argument; it should not have needed a gesture.",
    check: { label: "See it at phone width", href: "/evidence" },
  },
  {
    found:
      "The clock counted in English on Hindi screens. The meter's units came from the arithmetic module, which is English by design because it is the tested one.",
    did: "The units are looked up from the copy dictionary instead. The Hindi is still unreviewed and still says so.",
  },
];

/**
 * No per-row status marker.
 *
 * The first draft repeated "Still open" under each open entry, directly beneath
 * a heading that already said it — the same mistake FieldRow avoids when it
 * explains only the first hole. The section heading carries the status; the
 * rows carry the content.
 */
function Ledger({ entries }: { entries: Entry[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-px overflow-hidden rounded-lg border border-line bg-line">
      {entries.map((entry) => (
        <li key={entry.found} className="bg-surface p-4">
          <p className="text-sm leading-relaxed">{entry.found}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{entry.did}</p>
          {entry.check && (
            <Link
              href={entry.check.href}
              className="mt-2.5 inline-flex min-h-11 items-center text-sm underline underline-offset-2 transition-colors hover:text-mark"
            >
              {entry.check.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ChangesPage() {
  return (
    <article className="flex flex-col gap-10 pb-6">
      <header>
        <p className="eyebrow">Round 2</p>
        <h1 className="mt-2 text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl">
          What changed, and what was wrong
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Between rounds this project was audited against itself, harshly, on the assumption
          that anything it asserted rather than demonstrated would be found by somebody else
          first. Most of what follows is not a new feature. It is a defect that was shipping.
        </p>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Each entry says what was wrong before it says what was done, and links to where you
          can check the claim. The two that are still open are at the top, because a list of
          fixes that quietly omits the unfinished work is the kind of thing this project spent
          the rest of its time removing.
        </p>

        <p className="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
          This page is in English only, for the same reason /honesty is: the Hindi elsewhere
          on this site has not been read by a native speaker, and a page whose job is to be
          believed is the wrong place for an unreviewed translation.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Still open</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Both of these are measurements nobody has taken yet. Neither can be closed by
          writing code, and neither may be filled in with an estimate.
        </p>
        <Ledger entries={OPEN} />
      </section>

      <section>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Fixed</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          In the order they would cost a reader confidence, worst first.
        </p>
        <Ledger entries={FIXED} />
      </section>

      <footer className="border-t border-line pt-5">
        <p className="text-sm leading-relaxed text-muted">
          The reasoning behind each change is in the build log and decision record in the
          repository, written as the work happened rather than afterwards. What the product
          does and does not do is on{" "}
          <Link href="/honesty" className="underline underline-offset-2">
            the honesty page
          </Link>
          , and the claim and its measurements are on{" "}
          <Link href="/evidence" className="underline underline-offset-2">
            the evidence page
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
