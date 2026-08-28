# What is real and what is not

This is the mirror of the `/honesty` route. If the two ever disagree, one of them is
lying and both should be treated as unreliable until they match.

The rule this file exists to enforce: **if something gets mocked, it gets added here in
the same commit as the mock.**

---

## The headline claim

**Golden Hour does not freeze anyone's money.** There is no bank integration, no
connection to CFCFRMS, no connection to the National Cyber Crime Reporting Portal, and
no connection to any police force or government system. Nothing submitted here reaches
anybody.

What it claims is narrower and fully demonstrable: **a complete, dispatchable freeze
packet in under sixty seconds** — the small set of facts a beneficiary bank needs to
place a hold, assembled and confirmed while the money is still recoverable, instead of
trapped behind a fourteen-minute form.

That distinction is on the product itself, in the header of every screen and again on
the receipt. It is not buried in a repo file.

**This is not a government service and must never be mistakable for one.** No emblem,
no national colours, no `.gov.in` styling. The receipt links to the real routes:
`tel:1930` and cybercrime.gov.in.

---

## Real

| Thing | Status |
|---|---|
| Model extraction from a screenshot, SMS, or typed sentence | Real. Live Gemini call, schema-constrained. |
| `UNREADABLE` as a first-class value | Real, and enforced server-side in `lib/validate.ts` rather than requested of the model. |
| The confidence and shape downgrades on the receipt | Real. Every dropped field is named with the reason it was dropped. |
| The acknowledgement number and its persistence | Real. Upstash Redis, 24h TTL. The receipt reads back what was actually stored. |
| The decay meter's elapsed time | Real, computed from the timestamp the user entered. |
| The interrupt gate | Real. A pure function over quoted signals, `lib/interrupt.ts`. |
| The interrupt's false-positive rate | Really measured. See below. |
| No authentication | Real, and permanent. There is no login anywhere and there will not be one. |

## Not real, or not yet real

| Thing | Status |
|---|---|
| Any freeze actually happening | **Not real.** Nothing is dispatched anywhere. |
| The acknowledgement number's authority | **Not real.** It is a receipt for a demo, not a case number. It matches nothing in any government system. |
| The recovery *percentage* | **Removed, not mocked.** See below. |
| The portal comparison benchmark | **Not measured.** `data/portal-benchmark.json` has an empty portal column and `/evidence` says so in those words. |
| The measured median completion time | **Not yet measured.** No unaided human run-throughs have been recorded. Demo replays and `npm run journey` are bucketed separately and excluded on purpose. |
| The Hindi copy | **Unreviewed.** It reads well, but no native speaker has checked it. Every Hindi screen says so. |

---

## The recovery curve: a claim that was removed rather than mocked

The meter used to show a falling recovery *probability*, fitted to three figures from the
concept document: roughly 50% recovered within an hour, 10% within a day, 2% after a
week.

None of those three numbers could be traced to a primary source. In [Rajya Sabha
Unstarred Question 1349](https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS11022026/1349.pdf)
of 11 February 2026 the Ministry of Home Affairs was asked directly for "total amount
recovered vis-à-vis losses incurred, year-wise", and the answer does not contain the word
*recovered*. There is no published recovery curve to cite.

So the percentage was deleted and the clock kept. The meter now shows elapsed time since
the user's own timestamp, the band that falls in, and what to do about it. A six-day-old
fraud reads "6 days" and does not pretend to be urgent.

The direction is sourced. The magnitude is not claimed. `CITATIONS.md` records the
search; `/evidence` states the whole thing on the product.

This is the entry that matters most in this file, because it is the one where the
convenient number and the defensible one were different, and the convenient one lost.

---

## The interrupt's measured false-positive rate

**0% on 14 COMPLETED cases (0/14). 0% false negatives on 8 ACTIVE cases (0/8).**
Median triage latency 1332ms. Measured 2026-08-28 against `gemini-3.5-flash-lite`.

Reproduce it with `npm run eval`. The raw result is in `data/triage-eval-result.json`,
the cases are in `data/triage-eval.json`, and every case runs through the real
`/api/triage` route, the real model call and the real gate — nothing is stubbed.

**What that number does not mean.** Three limits, stated because a clean 0/14 invites
more confidence than it has earned:

1. **The cases were written by the same person who wrote the gate.** They are adversarial
   on purpose — over half the COMPLETED set names remote access, a call, or an
   instruction to stay silent, in the past tense — but an author's adversarial cases are
   not an independent benchmark. A false-positive rate measured against someone else's
   cases would mean considerably more.
2. **22 cases is a small sample.** 0/14 is consistent with a true false-positive rate of
   anything up to roughly 20% at 95% confidence. The honest reading is "no false positive
   was observed", not "false positives do not occur".
3. **It measures English text.** Nothing here says what the gate does with Hinglish,
   Hindi, or a transcription of dictated speech, which is what a real user is most likely
   to give it.

The 0% false-negative rate should be read as the *weaker* of the two results, not the
stronger. The gate is deliberately built to miss rather than over-fire; that it missed
nothing here says the ACTIVE cases were clearly written, not that the gate is sensitive.

---

## Demo data

Every fixture, eval case, and test input in this repository is synthetic and was written
for this repository. No real transaction ID, UTR, UPI handle, phone number, Aadhaar
number, PAN, account number, or personal detail appears anywhere, including in seeds and
tests. `lib/triage.test.ts` asserts this against the eval cases rather than trusting it.

Uploaded images are sent to the model and never persisted.

---

## The model

Gemini (`gemini-3.5-flash-lite` by default), called with a schema-constrained response —
`responseSchema` with `responseMimeType: application/json`. The model's output is never
free-text parsed. `lib/schema.ts` is the single source of truth and `lib/gemini-schema.ts`
converts it, so the schema, the server-side validation and the TypeScript types cannot
drift apart.
