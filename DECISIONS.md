# Decisions

One section per architectural choice, with what was rejected and why. Where a decision
departs from the original brief, the departure is stated rather than smoothed over.

---

## 1. Gemini, not OpenAI

**Chosen:** `@google/genai` with `responseSchema` + `responseMimeType: "application/json"`.

**Rejected:** OpenAI Structured Outputs (`response_format: json_schema`, `strict: true`),
which is what the build brief specified.

The brief's requirement has two parts, and only one of them is about the vendor. The part
that matters is *never free-text parse a model response* — the extraction must come back
shaped, or not at all. Both providers give that: OpenAI via constrained decoding against a
strict JSON Schema, Gemini via `responseSchema` against an OpenAPI 3.0 subset. The
guarantee is equivalent for this schema.

The part that does not matter is which vendor supplies it. The repository was already
built end to end on Gemini — `lib/gemini.ts`, `lib/gemini-schema.ts`, `lib/extract.ts`,
four recorded fixtures, and the only model key present locally and on Vercel — so
switching would have cost roughly a working session, re-recorded fixtures, and a new key,
and delivered no user-visible change. On a four-day deadline that session is better spent
on `/judge` and `/honesty`, which do not exist yet.

Confirmed with the project owner before proceeding. Noted here because it is a deliberate
deviation from a written instruction, not an oversight.

**Consequence:** Gemini's `responseSchema` accepts a *subset* of JSON Schema, which is why
`lib/gemini-schema.ts` exists — it inlines `$ref`s, drops unsupported keywords, and pins
property order. That file is pure overhead that the OpenAI path would not need. It is
tested (`lib/gemini-schema.test.ts`) precisely because it is the seam where a silent
schema mismatch could let an unvalidated field through.

---

## 2. Upstash Redis, not Vercel KV

**Chosen:** `@upstash/redis`, with an in-memory `Map` fallback for local development.

**Rejected:** Vercel KV, which is what the brief specified.

Vercel KV is no longer offered as a product; the storage that used to be sold under that
name is now provisioned through the Vercel Marketplace, and Upstash Redis is its direct
descendant. This is not really a decision so much as the only available way to do what the
brief asked for.

**The fallback is a trap and is treated as one.** An in-memory Map works locally and is
silently broken on serverless: every invocation is a separate process, so the receipt
request usually lands somewhere that has never seen the packet, and 404s. `/api/health`
therefore does not merely check that the credentials are *set* — it performs an actual
round-trip and reports `store_reachable`. That check earned its keep on 2026-08-28, when
production had credentials configured but a token that Upstash rejected with `WRONGPASS`;
the health endpoint named the problem in one request.

---

## 3. One model call, not two

**Chosen:** `extract()` returns the freeze fields *and* the interrupt signals in a single
round trip.

**Rejected:** A separate triage call after extraction.

The entire product claim is sixty seconds. A second sequential model call costs roughly a
second of that for information the first call has already read — the same sentence carries
both the amount and the fact that the caller is still on the line.

**But `/api/triage` exists anyway**, for the case the single call cannot cover: a
screenshot of a debit SMS contains no evidence about whether the attack is ongoing, and
that signal only ever lives in the sentence the user types — which they often type second.
Triage is available on its own for that path, and it is what the eval scores.

The risk this creates is prompt drift: two calls, two copies of the triage wording, and an
eval that measures a paragraph the product does not use. `lib/prompts.ts` resolves it —
`TRIAGE_INSTRUCTION` is one constant, composed into both `EXTRACTION_INSTRUCTION` and
`TRIAGE_ONLY_INSTRUCTION`, and `lib/triage.test.ts` asserts the composition rather than
trusting it.

---

## 4. `UNREADABLE` is enforced, not requested

**Chosen:** A server-side validation layer (`lib/validate.ts`) that downgrades any field
whose *shape* is wrong for what it claims to be, or whose confidence is below 0.55.

**Rejected:** Prompting the model to say `UNREADABLE` and trusting it.

Telling a model "say UNREADABLE if you cannot read it" is a request, not a guarantee.
Structured Outputs guarantees the *shape* of the response, not the *truth* of it — a
schema-valid string field will happily hold a hallucinated twelve-digit UTR.

So the checks run again server-side, after the model and again after the user edits, in
`/api/freeze`. A UTR that is not twelve digits or a bank-prefixed alphanumeric is not a
UTR, however confident the model was. Shape is checked *before* confidence, deliberately:
the dangerous case is a confidently-wrong value, not an uncertain one.

**A downgrade produces `UNREADABLE`, never `""`.** An empty string silently passes every
downstream check. `UNREADABLE` is loud, and the receipt names every field that was dropped
and why — a packet with stated holes is more trustworthy than one that quietly filled them
in.

**Rejected: blocking dispatch on missing fields.** `/api/freeze` must never refuse a packet
for being incomplete. Half the fields on time beats all of them fourteen minutes late, and
`npm run journey` asserts the send button is never disabled by a missing field.

---

## 5. The interrupt gate is a pure function, not a model judgement

**Chosen:** `decideInterrupt()` fires only on an explicit `ACTIVE` verdict **and** at least
one hard signal backed by a verbatim quote. `UNCLEAR` never fires.

**Rejected:** Letting the model decide whether to show the interrupt.

The asymmetry sets the threshold. A missed interrupt costs one person an extra nudge. A
false interrupt, repeated, trains everyone to dismiss the real ones — including the person
whose screen is being shared right now. The gate is therefore hard to trip on purpose, and
it is a tested pure function rather than a judgement left inside a prompt, so that the
threshold is legible and changeable without touching the model.

**Two mechanisms do the work:**

- **Quote or it did not happen.** `validateActiveScam` drops any signal claimed without
  verbatim evidence, before the gate sees it. An inference cannot reach the screen even if
  the model asserts one.
- **`told_to_tell_nobody` is a soft signal.** Isolation is the scam's load-bearing
  structure, but "I was told to tell nobody" is past tense — on its own it does not mean
  the call is live. It shapes the pre-written message; it never fires the screen alone.

Measured: 0 false positives on 14 COMPLETED cases, 0 false negatives on 8 ACTIVE cases.
The limits of that number are in `HONESTY.md`, and they are substantial.

---

## 6. The eval runs against a live server, not a mock

**Chosen:** `scripts/eval.mjs` drives the real `/api/triage` route over HTTP, with real
model calls.

**Rejected:** Unit-testing the gate against recorded model outputs and calling that the
eval.

A mocked eval scores the gate, which is a pure function that already has unit tests. The
number worth reporting is the one that includes the model's tense-reading — whether it can
tell "he made me install AnyDesk, I uninstalled it" from "the app is still running". That
only shows up in a live call.

The two layers are kept separate on purpose: `lib/triage.test.ts` pins the gate offline with
no key and no network, and `npm run eval` measures the whole path. If the false-positive
rate moves, the split says whether the gate changed or only the model did.

**The eval exits non-zero on a false positive and zero on a false negative.** That is not
an oversight. Tightening the gate until every ACTIVE case fires is exactly the change that
would make the false-positive rate worse, so the run must not create pressure to do it.

---

## 7. A clock, not a percentage

**Chosen:** The meter shows elapsed time since the user's own fraud timestamp, and the band
it falls in.

**Rejected:** A falling recovery-probability percentage, which was built first and then
deleted.

The percentage was fitted to three figures — 50% within an hour, 10% within a day, 2%
after a week — that could not be traced to a primary source. The Ministry of Home Affairs,
asked directly in Parliament for recovery figures, gave an answer that does not contain the
word *recovered*.

A decaying counter is one design decision away from dark-pattern urgency theatre, and the
only thing separating the two is whether the number is real. It was not, so it went. The
clock stayed, because elapsed time is a fact about the user's own input and needs no
citation at all.

A six-day-old fraud reads "6 days" and does not pretend to be urgent. Never manufacturing
urgency that isn't there is what makes the urgency that *is* there credible.

---

## 8. The timing distribution separates real runs from demo replays

**Chosen:** Every stored packet carries `run_kind: "real" | "demo"`, and only real runs
count toward the sixty-second claim.

**Rejected:** Recording every completion equally.

A demo replay serves a cached extraction and starts its clock at the fixture click. It
measures how long someone took to *review* a pre-filled form, which is a much smaller
number than the task. Letting those into the distribution would inflate the headline claim
with runs that never did the work.

The client sends a `source` hint, but the server does not trust it: `/api/freeze`
fingerprints the summary against the known fixtures, so a demo cannot be recorded as real
by editing a request body. `npm run journey` asserts its own four runs land in the demo
bucket and leave the real distribution untouched.

`/evidence` reads "not yet measured" until real runs exist, and whatever the real median
turns out to be is what the site will claim — including if it lands above sixty seconds.

---

## 9. The honesty document has one source, not two

**Chosen:** `lib/honesty.ts` holds the content as data. `app/honesty/page.tsx` renders it to
the screen, `lib/honesty-doc.ts` renders it to markdown, and `lib/honesty.test.ts` writes
`HONESTY.md` through a vitest file snapshot — so the test run fails when the committed file
and the page disagree.

**Rejected:** Writing the page and the markdown separately and keeping them in sync by hand,
which is what the brief describes.

Two hand-maintained copies of a document stay in sync for about a week. On most documents
that decays into mild inaccuracy. On this one it is fatal: a page claiming to be the honest
account of the project, contradicted by a file claiming to be the honest account of the
project, is worse evidence than having neither.

This is the same argument as `UNREADABLE` being enforced in `validate.ts` rather than
requested in a prompt, and the same argument as `TRIAGE_INSTRUCTION` being one constant.
Where a property matters, assert it in code rather than intend it.

**The measured numbers are read from `data/triage-eval-result.json`**, which the eval run
writes. The figure on the page is therefore the figure that was measured, and re-running the
eval moves the page. Nobody can type in a remembered number.

**Rejected: translating `/honesty` into Hindi.** Every other screen has Hindi and the Hindi
is unreviewed. The one page whose entire job is to be believed is the worst place for a
translation nobody has checked, so it is English only and says so at the top.

---

## 10. `/judge` does not pre-fill the scenario

**Chosen:** The judge reads the scenario off the screen and types or pastes it into the real
intake themselves. The run is a real run and counts toward the measured median.

**Rejected:** Seeding the intake with a fixture and starting the clock.

Pre-filling would have been three lines and would have produced a meaningless number. A
seeded run measures how long someone takes to *review* a filled form — which is precisely
why demo replays are already excluded from the timing distribution (`run_kind: "demo"`,
decision 8). Building a judging harness that commits the exact error the storage layer was
designed to prevent would have been an odd way to demonstrate the product's honesty.

The cost is that a timed run needs a live model call and a working key, where a seeded one
would not. That is the right trade: the number is the deliverable.

**The product runs in an iframe rather than by navigation**, because the brief asks for the
stopwatch and the honesty strip to stay on screen and they cannot if the judge navigates
away. The harness detects completion by reading the framed page's own pathname — same
origin, so this is allowed — rather than having `/receipt` post a message. That keeps the
timed flow completely unmodified: the product does not know it is being measured, which is
the only way the measurement means anything.

**The stopwatch measures more than the app's own clock, deliberately.** It runs from the
moment the judge presses start, including the time spent reading the scenario; the app's
clock starts at first interaction with the intake. The judge's figure is therefore always
the larger, and it is the one displayed, because a harness should not report the more
flattering of two available numbers.

---

## 11. Non-negotiable 5 was dropped, not violated

The original brief said: no landing page, no hero, no title card — the first screen *is* the
intake, with the meter already running. The product now has a landing page at `/` and the
intake at `/start`.

**The reasoning for the original rule is still correct for the user it describes.** Someone
whose money left their account four minutes ago does not need a pitch, and every tap between
them and the text box is a real cost. That is why 1930 and cybercrime.gov.in sit above every
word of explanation on the landing page, and why the intake is the first tappable thing on
it rather than the last.

**What the rule did not account for is the second audience.** The argument this project makes
— that the portal collapses two clocks into one form and paces both at the slower one — is
not self-evident from a text box. Anyone who opens the product cold and is not mid-fraud sees
an input field and no case for it.

Recorded here, and on `/honesty` under "Where this departs from its own brief", because a
constraint quietly abandoned is indistinguishable from one that was never noticed. The other
two departures are listed in the same place: the ground is dark rather than paper-white, and
the model is Gemini rather than OpenAI.

**The accent rule survived intact.** Colour is still rationed — the mark on the meter, red on
the interrupt, and nothing else. The landing page's step-one node was originally given the
accent and is now monochrome, emphasised with weight and contrast instead: a coloured node in
a diagram teaches the reader that the colour means "look at this", and the interrupt needs it
to mean "stop".
