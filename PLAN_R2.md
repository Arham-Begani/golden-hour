# Round 2 plan

Audit written 2026-09-02, against commit `0ea75a3` and the live deployment at
`golden-hour-kappa.vercel.app`. Findings first, then ranked work, then what not to build.

Everything below was verified against the running code or the live site. Where I ran
something, the result is quoted.

---

## 0. The deadline is not nine days

Today is **2 September**. The resubmission is **7 September**. That is five days, not
nine, and the video cannot be re-recorded on "day 7–8" because day 7 is after the
deadline.

Working days available: Wed 3 / Thu 4 / Fri 5 at ~3h, Sat 6 / Sun 7 heavy. **The video
gets recorded Saturday 5th, and the 6th is the buffer, and the 7th is submission only.**
That is roughly 24–27 hours of build time, and about 5 of those belong to the video and
the 250 words.

The nine-day figure only works if it is measured to the Bengaluru pitch on the 12th. If
so, days 6–9 are pitch prep contingent on making the top 10, and nothing in them can be
counted on for the resubmission. **The plan below is built to the 7th.** If the 7th is
wrong, say so before Wednesday, because it changes the ordering.

---

## 1. What I found

The engineering here is genuinely good, and I am going to spend the rest of this document
attacking it, so this goes first: the health check that round-trips instead of checking
config, the real/demo timing split fingerprinted server-side, `HONESTY.md` generated from
the same file as `/honesty` with a snapshot test enforcing it, deleting the recovery
percentage rather than softening it — that is better engineering judgement than most of
what will be in the top 250. None of it is what is wrong.

What is wrong is that **the two things the project most wants to be believed for are, right
now, the two things it cannot show.**

### 1.1 `/judge` does not work in production

This is the worst finding and it is not a nuance. I loaded
`https://golden-hour-kappa.vercel.app/judge`, clicked **Start the run**, and waited.

```
{"iframeExists":true, "src":"about:blank", "liveSrc":"about:blank", "innerPath":"blank"}
```

The stopwatch ran to 16.4 seconds against a permanently blank black rectangle labelled
"3. The product". It never loads. It never stops.

The cause is three lines. `app/judge/page.tsx:113` calls `setPhase("running")` and then
`if (frame.current) frame.current.src = "/start"` — but the `<iframe>` is conditionally
rendered and only exists when `phase !== "idle"`, so at the moment `start()` runs the ref
is still `null`, the assignment is skipped, and the iframe subsequently mounts with the
`src="about:blank"` that is hardcoded in the JSX.

Two consequences, and the second is bigger than the first:

- `SUBMISSION.md` offers `/judge` to reviewers as the guided run, in the credentials
  field. A judge who takes that offer watches a clock count up over an empty box.
- **It is why there are no measured runs.** No run can ever complete through the harness.

### 1.2 The headline claim has zero measurements behind it

```
GET /api/timings → {"count":0, "median_ms":null, ... "demo":{"count":12,...}}
```

Twelve demo replays, correctly bucketed and correctly excluded. Zero real runs. So the
landing page's own headline tile reads "Not yet measured", and `/evidence` says, in the
product's own words, *"No human run has been recorded, so the sixty-second claim above is
unproven."*

The honesty of saying that is real and it is worth points. But a judge holding 250 good
projects reads a front page whose central number is blank, and the argument that the
blankness is principled is a second-order argument that a tired reader will not make on
your behalf. **This is the single biggest judge-visible gap in the project and it is
cheap to close** — it needs the harness fixed and about an hour of somebody actually
doing the task.

### 1.3 The landing page states the exact number `/evidence` refuses to guess

Landing page, first paragraph, on the live site:

> "The national portal asks for **about fifty facts** before it takes one."

`/evidence`, four sections down the same site:

> "**Not counted, and not guessed.** The portal column is empty because nobody has opened
> the live portal and counted it. […] *We could not measure this* is a fine thing to show
> you; *we guessed* is not."

Those cannot both stand. The same figure is in `SUBMISSION.md` ("around fifty fields" —
with a note to yourself to check it, which was never done) and in the video script ("The
portal asks for fifty before it takes one"). This is the one finding that actively costs
you on the criterion the project is otherwise strongest on, because it is a reviewer's
free win: they find it in ninety seconds and it makes the honesty page look like a
posture rather than a practice.

### 1.4 `/honesty` and `/judge` are reachable from nowhere

```
grep -rn "honesty\|/judge" app/page.tsx components/*.tsx lib/i18n.ts   →   (no matches)
```

Neither page is linked from the header, the footer, the landing page, or any product
screen. `/honesty` is linked only from `/judge`'s fixed strip (broken, unlinked) and from
its own footer. The judging criteria name **Honesty** explicitly. The page built for that
criterion cannot be found by browsing the site.

### 1.5 The measured 0% describes a code path the product never executes

```
grep -rn "api/triage" app components lib scripts | grep -v "^app/api/triage"
→ scripts/eval.mjs:74 only
```

`/api/triage` has exactly one caller in the repository, and it is the eval. The shipped
intake calls `/api/extract`, which uses `EXTRACTION_INSTRUCTION`; the eval calls
`/api/triage`, which uses `TRIAGE_ONLY_INSTRUCTION`. Those are different system prompts —
different length, different surrounding rules, and in the shipped case the model is also
holding an image and eleven freeze fields while it makes the same judgement.

`lib/triage.test.ts` asserts that both prompts *contain* `TRIAGE_INSTRUCTION`. That is
containment, not equivalence, and the documents overclaim from it. `lib/prompts.ts` says
composing from one constant "is what makes that number mean anything". `DECISIONS.md` §3
and `HONESTY.md` both present the figure as measuring the shipped gate. It measures a
sibling of the shipped gate.

`HONESTY.md` already lists four honest limits on that 0%. This is a fifth and it is the
most material one, and it is the only one not listed.

### 1.6 The anti-hallucination layer is never demonstrated — only asserted

`lib/validate.ts` is the best code in the repository and the product's strongest technical
argument: *the model's confidently-wrong values get caught server-side before they reach a
bank.* Then look at what a judge actually sees.

All four demo fixtures in `lib/fixtures.ts` produce their holes because **the model
already said `UNREADABLE`**. Not one of them triggers a `wrong_shape` downgrade. Which
means the `Dropped` chip in `FieldRow.tsx`, and the copy next to it — *"The model read
this, but it isn't shaped like a real value, so it was dropped rather than sent wrong"*,
followed by the rejected value in monospace — is **unreachable in every demo path on the
site.**

So the demo of the guardrail is a demo of the prompt behaving well. The thing that
separates this project from every other "we used an LLM to fill a form" submission is the
one thing it never puts on screen. A live run can trigger it (I got a `low_confidence`
downgrade off an ambiguous sentence in one API call), but no scripted path guarantees it,
so it will not happen in the video.

### 1.7 The strongest external evidence in the project is buried

`/evidence`, section four, quotes the portal's own CFCFRMS instructions: minimal packet
first → system-generated acknowledgement number → full complaint against that number
within 24 hours. **The government already runs this sequence on the phone line.** That
turns the project from "a student thinks the form should be reordered" into "the state's
own procedure disagrees with the state's own web form."

It is the best paragraph on the site. It is four sections down a page reachable by one
small header link, and it appears nowhere on the landing page, in `SUBMISSION.md`, or in
the video script.

### 1.8 Smaller, but real

- **The interrupt cannot fire on the intake's primary input.** A screenshot of a debit SMS
  contains no evidence about whether the caller is still on the line. `/api/triage` was
  built for precisely this and is not wired to anything. `BUILD_LOG.md` records this as
  "uncertain"; from outside it reads as unfinished. Nothing re-triages after the user types
  on `/confirm`, or at all on the manual-entry path.
- **`occurred_at` cannot be corrected.** It is a freeze field and it drives the meter, but
  it is not in `EDITABLE` on `/confirm`, and the "when did this happen" fieldset only
  renders when the value is missing. A misread timestamp is uncorrectable and silently
  wrong on the one element that moves.
- **The receipt over-counts.** `isMissing()` is false for `payment_rail: "UNKNOWN"`, so a
  wholly empty manual packet reports "1 of 9 fields" sent. Small, but it is on the
  showcase screen, in a product whose pitch is that it counts holes honestly.
- **The judge frame nests the entire site chrome inside itself** — header, language
  toggle and prototype strip twice on one screen, in a 70vh frame with a 500px minimum on
  a phone. Fix this while fixing 1.1.
- **`DEMO_VIDEO.md`'s pre-flight says "the live site is out of date."** It is not; `/start`,
  `/judge` and `/honesty` all return 200 and `deploy_ready: true`. Stale instruction to
  yourself, thirty seconds to remove, and it will cost you time on shoot day if left.

### 1.9 What is not a problem, so you stop looking at it

`npm test` → 85 passing. `/api/health` → `deploy_ready: true`, `store_reachable: true`, no
warnings. Live extraction works and is fast (2.3s on a bank SMS, all nine fields, one
correct `UNREADABLE`). Graded confidence is real — an ambiguous input produced a genuine
`low_confidence` downgrade. The real/demo fingerprint split works. The design is good and
does not need touching.

---

## 2. Ranked work

Ranked by judge-visible movement per hour. Items 1–5 are unblocked by mentor feedback and
should be done before it lands; the checkpoint is item 6.

### 1. Fix the `/judge` frame · 0.5h
**Criterion:** Working build, Usability.
Assign the `src` in an effect keyed on `phase`, or render the iframe always and hide it
when idle. Suppress the nested chrome while you are in there (`SiteChrome` can skip the
header/footer when `?embed=1`). Verify by clicking Start on the deployed URL and watching
the frame reach `/receipt/…` and stop the clock.
**A judge sees:** a stopwatch and a working product on one screen, instead of a clock
counting up over a black box. This is the difference between the judging harness being
your best asset and being the thing that sinks you.

### 2. Record real runs and put a number on the front page · 1h
**Criterion:** Working build, Honesty, Product thinking. **Depends on item 1.**
Do 8–12 unaided runs on a real phone, all of them, keeping the slow ones. Do not curate.
`/evidence` and the landing tile then read a real median instead of "Not yet measured".
**A judge sees:** the project's headline claim proven by its own instrument, and a
distribution strip with the slow runs still in it. If the median lands above 60s, change
the claim on the landing page — that is a better story than the claim, and it is the story
the whole project is built to tell.

### 3. Count the portal by hand, and delete "about fifty" · 1.5h
**Criterion:** Problem, Honesty, End-to-end thinking.
Open cybercrime.gov.in on a phone. Count fields to first submit, count screens, note
whether registration/OTP gates it. Do not submit anything. Fill
`data/portal-benchmark.json`, set `verified: true`, `measuredBy`, `measuredOn`. Then
replace "about fifty facts" on the landing page, in `SUBMISSION.md` and in the video
script with the counted figure — or with "we counted N" phrasing. If the portal is
unreachable, delete the fifty from the landing page anyway and say on the front door what
`/evidence` already says.
**A judge sees:** the comparison table filled in with a number a human observed, and a
product that does not contradict its own honesty page on its own front page. This is the
highest-value 1.5 hours in the plan.

### 4. Route `/honesty` and `/judge` into the site · 0.75h
**Criterion:** Honesty, Usability.
`/honesty` into the footer on every screen and as a card on the landing page. `/judge` as
a clearly-labelled line on the landing page ("Time it yourself") and in the footer.
**A judge sees:** the honesty disclosure without being told where it is, and a timed run
they can start from the front door. Right now both require the URL.

### 5. Lead with the CFCFRMS quote · 0.75h
**Criterion:** Problem, Product thinking, End-to-end thinking.
Move the "the sequence already exists" block onto the landing page, above the fold or just
below the CTA, with the quote intact and the source link next to it. Put one line of it in
the 250 words and one sentence in minute two of the video.
**A judge sees:** the argument validated by the government's own published procedure
rather than by your reasoning. It reframes the whole submission from proposal to
correction.

---

### ⛳ CHECKPOINT — Thursday 4 September, or whenever mentor feedback lands

Stop. Re-read this file against what the mentors said. Items 1–5 are safe under any
feedback because they fix breakage and unsourced claims; **items 6 onward are the ones to
re-rank or drop.**

Two specific things to bring to the mentors, because they are the open questions I cannot
resolve from the code:

- Is the right Round 2 delta **depth** (wire triage end to end, prove the validator) or
  **evidence** (portal benchmark, real medians, the CFCFRMS finding on the front page)?
  The plan currently assumes evidence-first and I think that is right, but a mentor from
  the OpenAI side may well say the model path is what they want to see.
- Does the "no landing page" constraint being dropped still look right to them? It is
  disclosed as a departure, which is the correct handling either way.

Write what came back into `DECISIONS.md` the same day, with names. **Absorbing feedback
visibly is half of what Round 2 is scoring**, and a decision log entry dated the 4th
saying "X said Y, so we did Z" is the artefact that proves it.

---

### 6. Wire triage into `/confirm`, and stop overclaiming the eval · 2h
**Criterion:** End-to-end thinking, Working build, Honesty.
Call `/api/triage` when the user types a description after a screenshot-only extraction,
and re-run the gate on edit. Then add the fifth limit to `lib/honesty.ts`: the 0% was
measured on the triage prompt, and the shipped extraction prompt differs. Better still,
add an eval mode that scores `/api/extract` so the number describes the hot path.
**A judge sees:** the interrupt actually reachable from the product's primary input, and
an honesty page that discloses the limit a sharp reviewer would otherwise find first. The
second half of this item is worth more than the first.

### 7. A demo case that catches the model being confidently wrong · 1h
**Criterion:** Honesty, Product thinking.
Add a fifth fixture whose raw model output contains a plausible, confident, **wrong-shaped**
UTR (eleven digits, or a phone number in the beneficiary field). It gets caught by
`validate.ts`, the `Dropped` chip renders, and the receipt names it.
**A judge sees:** the guardrail working, once, on screen — instead of reading a paragraph
claiming it exists. This is the cheapest way to convert your best code into something a
reviewer can watch happen, and it gives the video a shot worth taking.

### 8. Write the delta, on the site · 1h — **do this Saturday, not before**
**Criterion:** Product thinking, Honesty.
A short `/changes` page, or a block on the landing page: what changed since Round 1, what
mentors said, and what you did about each. Name the feedback. Include what you were told
and chose not to do, and why.
**A judge sees:** the exact thing Round 2 is scoring. The brief says the differentiator is
whether feedback was absorbed; this is the only artefact that shows it. It has to be last
because it summarises everything above it.

### 9. Make `occurred_at` correctable · 0.75h
**Criterion:** Usability, Working build.
Always show the "when did this happen" control on `/confirm`, pre-filled when the model
read a time. It drives the meter and it is a freeze field.
**A judge sees:** the one moving element on the page can be corrected when it is wrong.
Someone will try this.

### 10. Fix the receipt's field count · 0.25h
**Criterion:** Honesty.
Treat `payment_rail: "UNKNOWN"` and `fraud_category: "OTHER"` as holes for the count.
**A judge sees:** nothing — until they file an empty report, see "1 of 9 fields", and stop
trusting the other counts. Twenty-five minutes of insurance on the showcase screen.

### 11. Re-record the video and rewrite the 250 words · 4h — Saturday 5th
**Criterion:** all of them.
`DEMO_VIDEO.md` is a good script and mostly survives. Changes needed: the counted portal
figure replaces "fifty"; one line on the CFCFRMS procedure in minute two; the real median
on screen; delete the stale "live site is out of date" pre-flight line. If item 7 lands,
the dropped-field shot is worth three seconds in minute one.
**A judge sees:** a two-minute video whose every number is one they can verify on the live
link in the same session.

---

## 3. Do not build

Each of these is either forbidden by the project's own rules, invalidates work already
banked, or costs more than a judge will notice.

- **A police, bank or admin dashboard.** `idea_2.md` §6 rules it out and the ruling is
  correct. The claim is about the citizen's sixty seconds; a second persona halves the
  depth of the one you have.
- **Any mock of a real bank or CFCFRMS connection**, however clearly labelled. The entire
  honesty position rests on "nothing here reaches anybody". A fake integration puts that
  sentence in tension with the thing next to it, and nothing is gained.
- **Bringing back a recovery percentage**, in any form, including "illustrative". Deleting
  it is the best decision in the project and it is quotable in the video.
- **Having a model review the Hindi.** `README.md` already argues this correctly: an
  unreviewed translation labelled unreviewed is honest; one polished into confidence is
  not. If you can get a native speaker in five days, do that; otherwise leave it and leave
  the notice.
- **Migrating to OpenAI.** Zero user-visible change, a working session gone, fixtures
  re-recorded. `DECISIONS.md` §1 already defends the choice better than the migration
  would.
- **Wiring triage into the intake hot path as a second sequential model call.** It costs a
  second of the sixty and `DECISIONS.md` §3 already reasoned it out. Item 6 puts it on
  `/confirm`, which is off the critical clock.
- **More unit tests.** 85 passing across the parts that matter. Nobody in the top 250 is
  losing on test count.
- **A new visual direction, a light theme, animation, or a logo.** The design is good, the
  palette rationing is defensible, and every hour here is an hour not spent on the empty
  benchmark table.
- **Estimating the portal benchmark from screenshots or the citizen manuals.** Already
  tried and correctly refused. Count it or leave it null; there is no third option that
  survives contact with a judge.
- **Upstash credentials for the preview environment**, `p90` on `/evidence`, the legacy
  timings key, more fraud categories, more languages. All real, all invisible.

---

## 4. Schedule

| Day | Hours | Items |
|---|---|---|
| Wed 2 | 3 | 1 (judge fix), 4 (routing), 10 (receipt count) |
| Thu 3 | 3 | 3 (count the portal, delete "fifty"), **checkpoint on mentor feedback** |
| Fri 4 | 3 | 5 (CFCFRMS to the front page), 7 (the wrong-shape fixture) |
| Sat 5 | 8 | 2 (real runs — needs the site final), 11 (video), 8 (the delta page) |
| Sun 6 | 8 | 6 (triage wiring + eval honesty), 9 (occurred_at), buffer, 250 words |
| Mon 7 | 2 | Submit. `/api/health` green, one full run on a phone, nothing else. |

Item 2 is deliberately on Saturday and not earlier: the runs must be recorded against the
site you are submitting, and every real run you do lands in the median permanently.

---

## 5. The one-sentence version

The build is stronger than its evidence: the harness that proves the claim is broken, the
claim has no measurements, the front page states the one number the evidence page refuses
to guess, and the honesty page nobody can navigate to. Five days of fixing what is already
built beats anything new.
