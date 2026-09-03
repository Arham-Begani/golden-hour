import evalResult from "../data/triage-eval-result.json";
import extractResult from "../data/extraction-eval-result.json";

/**
 * What is real and what is not, as data.
 *
 * The brief asks for two things: a `/honesty` route, and a `HONESTY.md` that
 * mirrors it and stays in sync. Two hand-written copies of the same document
 * stay in sync for about a week, and the failure is silent — the page says one
 * thing, the repo says another, and nobody notices until someone reads both.
 *
 * So there is one copy. This file is it. `scripts/honesty-doc.mjs` renders it
 * to HONESTY.md, `app/honesty/page.tsx` renders it to the screen, and
 * `lib/honesty.test.ts` fails the build if the committed markdown has drifted
 * from what this file would produce. The sync is enforced rather than promised,
 * which is the same argument as `UNREADABLE` being enforced in `validate.ts`
 * rather than requested in a prompt.
 *
 * The measured numbers are read from `data/triage-eval-result.json` — written
 * by the eval run itself — so the figure on the page is the figure that was
 * measured and cannot be a remembered one.
 *
 * This page is English only. Every other screen has Hindi, and the Hindi is
 * unreviewed; a page whose entire job is to be believed is the worst possible
 * place to put a translation nobody has checked. That is stated on the page.
 */

export type Claim = {
  thing: string;
  /** Short verdict, rendered as a badge. */
  status: "real" | "not-real" | "partial";
  detail: string;
};

export type Section = {
  id: string;
  heading: string;
  /** Paragraphs. Rendered as prose in both targets. */
  body: string[];
  claims?: Claim[];
  /** Rendered as a numbered list under the prose. */
  points?: string[];
  /** Inline source, shown next to the claim it supports. Never a bare link. */
  source?: { label: string; url: string };
};

const fp = evalResult.false_positive_rate_pct;
const fn = evalResult.false_negative_rate_pct;

/**
 * The comparison between the two prompts, when the run produced one.
 *
 * Until 3 September the eval scored `/api/triage` only, while the intake calls
 * `/api/extract`. Both compose the same TRIAGE_INSTRUCTION constant, and a test
 * asserted that composition — but containment is not equivalence, and the
 * shipped call asks the question with nine freeze fields in the same breath.
 * The number was presented as describing the shipped gate and did not, quite.
 * It does now, and the other path is reported beside it.
 */
const comparison = evalResult.comparison ?? null;

/** The measured interrupt numbers, phrased once and used in both renderers. */
export const EVAL_HEADLINE =
  `${fp}% false positives on ${evalResult.completed_cases} COMPLETED cases ` +
  `(${evalResult.false_positives}/${evalResult.completed_cases}). ` +
  `${fn}% false negatives on ${evalResult.active_cases} ACTIVE cases ` +
  `(${evalResult.false_negatives}/${evalResult.active_cases}). ` +
  `Median latency ${evalResult.median_latency_ms}ms on ${evalResult.route}, ` +
  `the route the intake actually calls. ` +
  `Measured ${evalResult.measured_at.slice(0, 10)}.`;

/** What the second path said, and whether it agreed. */
export const EVAL_CROSS_CHECK = comparison
  ? `The same ${comparison.compared} cases were also run through /api/triage, which uses a ` +
    `shorter prompt asking only this question. The two agreed on ${comparison.agreed} of ` +
    `${comparison.compared} decisions and returned identical verdicts on ` +
    `${comparison.verdict_agreed} of ${comparison.compared}. ` +
    `Triage: ${comparison.triage.false_positives}/${comparison.triage.completed_cases} false ` +
    `positives, ${comparison.triage.false_negatives}/${comparison.triage.active_cases} false ` +
    `negatives, median ${comparison.triage.median_latency_ms}ms.`
  : "Only one path was scored on this run, so there is no cross-check to report.";

/**
 * The extraction eval.
 *
 * Added 3 September, and it should have existed first. The interrupt — a
 * supporting feature — had a rigorous eval from the start, while extraction,
 * which is the thing a user comes here to do, had none, and the image path had
 * never been exercised even once. The project measured its second-most
 * important feature and not its most important one.
 */
const ex = extractResult;
const exOverall = ex.overall;

export const EXTRACTION_HEADLINE =
  `${exOverall.correct} of ${exOverall.fields_scored} fields read correctly across ` +
  `${ex.image_cases} generated screenshots and ${ex.text_cases} text cases ` +
  `(English, Hinglish, Hindi, and an unpunctuated dictation transcript), ` +
  `over ${ex.passes} full passes. ` +
  `Measured ${ex.measured_at.slice(0, 10)}.`;

/** The number that actually matters: what reached the packet wrong. */
export const EXTRACTION_ESCAPES =
  `On the vision path, ${ex.images.correct} of ${ex.images.fields_scored} fields were ` +
  `correct with nothing invented and nothing misread — including three images where a ` +
  `field was cut out entirely, so any value returned for it could not have been read. ` +
  `Across the whole suite ${ex.overall.bad_values} wrong value` +
  `${ex.overall.bad_values === 1 ? "" : "s"} reached the packet, and ` +
  `lib/validate.ts caught ${ex.overall.caught_by_validator} of them.`;

export const TITLE = "What is real and what is not";

export const INTRO = [
  "This page and HONESTY.md in the repository are generated from one file. If a claim appears in one and not the other, that is a bug and not a judgement call.",
  "The rule it exists to enforce: if something gets mocked, it gets listed here in the same commit as the mock.",
];

export const SECTIONS: Section[] = [
  {
    id: "claim",
    heading: "The headline claim",
    body: [
      "Golden Hour does not freeze anyone's money. There is no bank integration, no connection to CFCFRMS, no connection to the National Cyber Crime Reporting Portal, and no connection to any police force or government system. Nothing submitted here reaches anybody.",
      "What it claims is narrower and fully demonstrable: a complete, dispatchable freeze packet in under sixty seconds — the small set of facts a beneficiary bank needs to place a hold, assembled while the money is still recoverable instead of trapped behind a fourteen-minute form.",
      "This is not a government service and must never be mistakable for one. No emblem, no national colours, no gov.in styling. If you are in the middle of a fraud right now, call 1930 or use cybercrime.gov.in. Those are the real routes and they are linked from every screen on this site.",
    ],
  },

  {
    id: "status",
    heading: "Line by line",
    body: [],
    claims: [
      {
        thing: "Model extraction from a screenshot, SMS, or typed sentence",
        status: "real",
        detail: "A live, schema-constrained Gemini call. The response is never free-text parsed.",
      },
      {
        thing: "UNREADABLE as a first-class value",
        status: "real",
        detail:
          "Enforced server-side in lib/validate.ts, not requested of the model. A value whose shape is wrong for its field is downgraded however confident the model was, and a downgrade produces UNREADABLE rather than an empty string. You can watch it happen: the “A confident misread” demo case returns an eleven-digit reference at 0.93 confidence, the server refuses it on shape, and the receipt lists the field as sent blank. Until 3 September no demo could show this — every case’s blanks came from the model declining to read a field, which demonstrates the prompt behaving rather than the guarantee holding.",
      },
      {
        thing: "The dropped-field list on the receipt",
        status: "real",
        detail: "Every field that was thrown away is named, with the reason it was thrown away.",
      },
      {
        thing: "The acknowledgement number and its persistence",
        status: "real",
        detail: "Upstash Redis, 24-hour TTL. The receipt reads back what was actually stored.",
      },
      {
        thing: "The acknowledgement number's authority",
        status: "not-real",
        detail:
          "It is a receipt for a prototype, not a case number. It corresponds to nothing in any government system and no one is expecting it.",
      },
      {
        thing: "Any freeze actually happening",
        status: "not-real",
        detail: "Nothing is dispatched anywhere. This is a prototype of a sequence.",
      },
      {
        thing: "The decay meter's elapsed time",
        status: "real",
        detail:
          "Computed from the fraud timestamp the user entered, never from page load. A six-day-old fraud reads six days.",
      },
      {
        thing: "The recovery percentage the meter used to show",
        status: "not-real",
        detail: "Removed rather than mocked. See below — it is the entry that matters most here.",
      },
      {
        thing: "The interrupt gate",
        status: "real",
        detail:
          "A tested pure function over quoted signals. It fires only on an explicit ACTIVE verdict plus a hard signal the model could quote.",
      },
      {
        thing: "Extraction accuracy, and the screenshot path",
        status: "partial",
        detail: `Measured, and only since 3 September. ${EXTRACTION_HEADLINE} ${EXTRACTION_ESCAPES} The screenshots are generated by scripts/make-eval-images.mjs, which writes the answer key from the same object that draws the image, so the two cannot drift. Reproduce with npm run eval:extract.`,
      },
      {
        thing: "Shape validation catching a plausible wrong value",
        status: "not-real",
        detail:
          "It cannot, and this is now measured rather than suspected. Given a dictation transcript saying “fastcart dot pay at samplebank”, the model returned fastcart@samplebank — a different account, and a perfectly well-formed VPA. lib/validate.ts checks shape, so it has nothing to object to and the value goes into the packet. It did so on two of three passes. The mitigation that exists is the confirm screen, where the handle is shown back and can be corrected before sending; the mitigation that does not exist is anything automatic. A wrong beneficiary is the single most consequential field to get wrong, so this is the most important limit on this page.",
      },
      {
        thing: "The interrupt's false-positive rate",
        status: "partial",
        detail: `Really measured, with real limits. ${EVAL_HEADLINE} ${EVAL_CROSS_CHECK}`,
      },
      {
        thing: "The interrupt firing on a screenshot-only report",
        status: "real",
        detail:
          "A screenshot of a debit SMS carries no evidence about whether the caller is still on the line, so the intake's single model call cannot catch it. The confirm screen therefore has an optional description box, and what is typed there is triaged through the same gate. It never blocks the send button: if the packet is dispatched before triage returns, it is dispatched.",
      },
      {
        thing: "The freeze packet as a bank would receive it",
        status: "real",
        detail:
          "lib/packet.ts projects the stored packet into a wire format, and the receipt renders exactly what that function returns rather than a description of it. Unread fields are absent from the payload and named under `unreadable`, so a hole cannot be read as a value. The triage signals, the confidence scores and the reporter’s free text are deliberately excluded. Nothing dispatches it — `dispatched` is a literal false in the payload.",
      },
      {
        thing: "Accessibility",
        status: "partial",
        detail:
          "Checked rather than asserted, on 3 September, and not by an expert. Every colour pair was measured: body text is 17–19:1, muted text 7.1–8.4:1, the amber mark 5.8:1 and the interrupt red 6.5:1. Two failures were found and fixed — the meter’s empty-state dash was 1.9:1, and one source line sat at 4.49:1 on a raised card. The meter no longer emits a heading above the page’s own h1, the interrupt announces itself, and the send button reports its busy state. What has not been done: no test with a real screen reader, and no audit by anyone who uses one.",
      },
      {
        thing: "The portal comparison benchmark",
        status: "not-real",
        detail:
          "Not measured. The portal column of data/portal-benchmark.json is empty, and /evidence says so rather than hiding it. Someone has to open cybercrime.gov.in and count the fields; a fabricated benchmark would discredit every honest thing next to it.",
      },
      {
        thing: "The measured median completion time",
        status: "not-real",
        detail:
          "Not yet measured. No unaided human run-throughs have been recorded. Demo replays and the automated journey are bucketed separately and excluded on purpose, because they serve a cached extraction and start the clock at the fixture click.",
      },
      {
        thing: "The Hindi copy",
        status: "partial",
        detail:
          "Present and unreviewed. No native speaker has read it. Every Hindi screen says so, and this page is deliberately English only.",
      },
      {
        thing: "Authentication",
        status: "real",
        detail:
          "There is none, anywhere, by design and permanently. An OTP is a delay, and on a phone with a screen-sharing session running it is a live security hazard.",
      },
    ],
  },

  {
    id: "recovery-curve",
    heading: "The number that was deleted",
    body: [
      "The meter used to show a falling recovery probability, fitted to three figures: roughly 50% of funds recovered when reported within an hour, 10% within a day, 2% after a week. Those figures are widely repeated.",
      "None of them could be traced to a primary source. Asked directly in Parliament for the total amount recovered against losses incurred, year-wise, the Ministry of Home Affairs gave an answer that does not contain the word recovered. There is no published recovery curve to cite.",
      "So the percentage was deleted and the clock was kept. The meter shows elapsed time since the user's own timestamp and the band it falls in — a fact about their own input, needing no citation at all.",
      "A decaying counter is one decision away from dark-pattern urgency theatre, and the only thing separating the two is whether the number is real. Never manufacturing urgency that isn't there is what makes the urgency that is there worth believing.",
    ],
    source: {
      label: "Rajya Sabha Unstarred Question 1349, 11 February 2026",
      url: "https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS11022026/1349.pdf",
    },
  },

  {
    id: "eval",
    heading: "What the interrupt's 0% does not mean",
    body: [
      EVAL_HEADLINE,
      EVAL_CROSS_CHECK,
      "Reproduce it with npm run eval. Every case runs through a real route, a real model call and the real gate; nothing is stubbed. The cases are in data/triage-eval.json and the raw result in data/triage-eval-result.json.",
      "A clean result invites more confidence than it has earned, so:",
    ],
    points: [
      "The same person wrote the gate and the cases. They are adversarial on purpose — over half the COMPLETED set names remote access, a live-sounding call, or an instruction to stay silent, in the past tense — but an author's own adversarial cases are not an independent benchmark.",
      `${evalResult.total_cases} cases is a small sample. Zero false positives in ${evalResult.completed_cases} is consistent with a true rate of anything up to roughly 20% at 95% confidence. The honest reading is that no false positive was observed, not that they do not occur.`,
      "It measures English prose. Nothing here says what the gate does with Hinglish, with Hindi, or with a dictation transcript that has no punctuation — which is what a real user is most likely to give it.",
      "The false-negative result is the weaker of the two, not the stronger. The gate is built to miss rather than over-fire; that it missed nothing says the ACTIVE cases were written clearly, not that the gate is sensitive.",
      "Until 3 September this number was measured on /api/triage only, while the intake calls /api/extract — a different system prompt, asked alongside nine freeze fields. The write-up around it said the number described the shipped gate, and it did not, quite. It does now, and the older figure is not being quietly restated: the extraction path was re-run from scratch.",
      "Each figure is one run. The model is called at temperature 0, but that is not a guarantee of determinism — running the same 22 cases locally and against production on the same day produced the same decisions everywhere and one differing verdict (UNCLEAR against ENDED on a completed case, which leaves the gate shut either way). Treat a single clean run as evidence, not as a fixed property.",
    ],
  },

  {
    id: "extraction",
    heading: "What the extraction eval found",
    body: [
      EXTRACTION_HEADLINE,
      EXTRACTION_ESCAPES,
      "The screenshots are synthetic and generated, not collected: a real screenshot of a real debit alert is real financial data about a real person, and there is none in this repository. Generating them also means the answer key is written by the same object that draws the image, so a case cannot quietly disagree with its own ground truth.",
      "Fields whose expected answer is “unreadable” are cut out of the image entirely rather than blurred. A blurred number is ambiguous — if the model reads it, perhaps the blur was survivable. A number that was never drawn cannot have been read, so a value returned for one is an invention with no argument available.",
      "The limits are as real as the result:",
    ],
    points: [
      "75 fields is a small sample, and the same person wrote the product and the cases. Generated images are also cleaner than the photographs people actually take of cracked screens at midnight.",
      `The model is called at temperature 0, which is not determinism. Escapes across the ${ex.passes} passes were ${(ex.stability?.escaped_per_pass ?? []).join(", ")} — the same input produced a wrong beneficiary handle on some passes and the right one on others. The eval reports the worst pass rather than the kindest, and fails on it.`,
      "The one field that fails is the one that matters most. A wrong beneficiary handle sends a hold to the wrong account, which is the exact harm the UNREADABLE rule exists to prevent — and it is the case where that rule does not help, because the wrong value is well-formed.",
      "The Hindi case's answer key was wrong twice before it was right, both times mine rather than the model's. Both corrections are recorded in data/extraction-text-eval.json rather than quietly applied, because a benchmark whose author edits the key after seeing the output is not a benchmark.",
    ],
  },

  {
    id: "design-departures",
    heading: "Where this departs from its own brief",
    body: [
      "Three of the original build constraints were dropped deliberately rather than met. They are listed here because a constraint quietly abandoned is indistinguishable from one that was never noticed.",
    ],
    points: [
      "There is a landing page. The brief said the first screen must be the intake, on the reasoning that anyone arriving already knows why they are here. That is true of the person the product is for and false of everyone else who opens it, so the sequence is explained at / and the intake moved to /start, one tap away at the top of the page. The cost is real: the person mid-fraud now has one more tap, which is why 1930 and cybercrime.gov.in sit above every word of explanation.",
      "The ground is dark, not paper-white. A deliberate visual choice, not an oversight.",
      "The model is Gemini, not OpenAI. The brief specified OpenAI Structured Outputs; the requirement that mattered — a schema-constrained response, never free-text parsed — is met either way, and the repository was already built on Gemini.",
    ],
  },

  {
    id: "data",
    heading: "Demo data",
    body: [
      "Every fixture, eval case and test input in this repository is synthetic and was written for it. No real transaction ID, UTR, UPI handle, phone number, Aadhaar number, PAN, account number or personal detail appears anywhere, including in seeds and tests. The test suite asserts this rather than trusting it — across the demo fixtures, the judge scenarios and the eval cases, each checked against the list of handle suffixes Indian PSPs actually issue.",
      "Uploaded images are sent to the model and never persisted. Freeze packets are stored for 24 hours and then expire.",
      "That assertion was not always true of the fixtures. Until 3 September the clean-SMS demo case carried a @okaxis handle — a suffix Axis Bank actually issues, and one this project’s own judge-scenario test already forbade by name — along with a real bank helpline number. The rule was enforced everywhere except the strings most likely to end up in a screenshot. It is enforced there now, and the gap is recorded here rather than quietly closed.",
    ],
  },
];
