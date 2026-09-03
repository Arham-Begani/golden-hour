# Build log

Reasoning, not a changelog. One entry per step: what got built, the non-obvious technical
decisions and why, what was tried and failed, and what is still uncertain.

Entries below the first were written as the work happened. The first entry is a backfill,
and says so.

---

## Steps 1–4 — backfilled 2026-08-28

**This entry is reconstructed from the code and the commit history, not written at the
time.** The build log was started at step 5. Treat the reasoning here as accurate and the
sequencing as approximate; where I could not tell from the code why something was done, I
have said so rather than invented a motive.

### What exists

Intake at `/`, extraction through `/api/extract`, a confirm screen, `/api/freeze` issuing
an acknowledgement number into Upstash, a receipt at `/receipt/[ack]`, the second-half
statement form at `/report/[ack]`, the interrupt screen, the decay meter, and `/evidence`.
Plus `npm run shots` (360px screenshots with a sideways-scroll assertion) and
`npm run journey` (all four demo cases driven end to end in a real browser).

### The decisions worth reading the code for

**The extraction schema was built with `UNREADABLE` in it from the first pass**, which is
the only way it could have worked. Retrofitting a sentinel means finding every place that
already treats `""` as "fine, carry on" — and the whole point of the value is that an
empty string silently passes validation while `UNREADABLE` is loud.

**`lib/gemini-schema.ts` is the load-bearing piece nobody would guess.** Zod is the single
source of truth for the extraction shape, but Gemini's `responseSchema` accepts an OpenAPI
3.0 subset rather than full JSON Schema. So the converter inlines every `$ref`, drops every
keyword Gemini rejects, and pins `propertyOrdering`. Without it the schema, the server-side
validation and the TypeScript types would be three separate things that drift.

**The confidence floor is 0.55 and shape is checked before confidence.** That ordering is
deliberate: a confidently-wrong UTR is the dangerous case, not an uncertain one.

### What failed, from the commit history

- **The recovery-probability meter was built and then removed.** The three figures it was
  fitted to could not be traced to a primary source; the MHA's own answer to a direct
  parliamentary question about recovery does not contain the word "recovered". The
  percentage was deleted rather than softened. `CITATIONS.md` records the search.
- **`thinkingBudget: 0` broke every live extraction.** `gemini-3.5-flash-lite` rejects it
  with a bare "Request contains an invalid argument." and a 400 — the word "thinking"
  appears nowhere in the error, so a retry guard matching `/thinking/i` never fired. The
  fix widened the guard to treat any 400 as worth one retry with the optional config key
  dropped. Commit `a97b765`.
- **`/api/health` originally only checked that the store was *configured*.** That is not
  the failure mode. Commit `e61b07a` made it perform a real round-trip. See step 1 below
  for the day that paid off.
- **Demo replays were polluting the timing distribution.** Fixed by fingerprinting the
  summary server-side rather than trusting the client's `source` hint. Commits `075f31e`,
  `e803894`.

### Uncertain

The Hindi in `lib/i18n.ts` has not been read by a native speaker. It is labelled as
unreviewed on every Hindi screen, which is the honest state; the temptation to have a model
"improve" it should be resisted, because that converts an honest unreviewed translation
into a confident unreviewed one.

---

## Step 1 (re-verified) — 2026-08-28

The scaffold and deployment already existed, so this was a verification pass rather than a
build. It found something.

**Production was live and public but not working.** `https://golden-hour-kappa.vercel.app`
returned 200 with no SSO redirect and no access prompt — the no-auth non-negotiable holds —
but `/api/health` reported `deploy_ready: false`. The Upstash credentials were set in the
Vercel project and the token was being rejected: `WRONGPASS invalid or missing auth token`.

The consequence is worse than it sounds. `lib/store.ts` falls back to an in-memory `Map`
when the store is unreachable, which works locally and is silently broken on serverless:
each invocation is a separate process, so the receipt request lands somewhere that has
never seen the packet and 404s. **The acknowledgement number — the moment the entire
product is built around — would have failed in front of a judge**, with no error anywhere
except a 404 on a page nobody would think to check first.

The local `.env.local` token round-tripped fine, so the fix was to replace the production
and preview values and redeploy. Verified after: `deploy_ready: true`,
`store_reachable: true`, and a real end-to-end POST through `/api/freeze` →
`GH-52CV-H6NS` → `/api/report/{ack}` → `/receipt/{ack}`, all 200, all persisted.

**The lesson worth keeping:** `/api/health` checking for the *presence* of credentials
would have reported green. The round-trip check (commit `e61b07a`) is what caught it. Any
health check that only verifies configuration is checking the thing that rarely breaks.

**Left undone:** the preview environment still lacks the Upstash pair. The Vercel CLI wants
a git-branch argument to scope a preview variable and I did not want to guess at one.
Preview receipts will 404 until it is set.

---

## Step 5 — `/api/triage`, the interrupt, and the measured false-positive rate — 2026-08-28

The interrupt screen and the gate already existed. What did not exist was triage as an
addressable thing, or any measurement of it. The brief asks for the false-positive rate on
the COMPLETED cases, and that number is the entire justification for the feature, so it
needed to be real.

### The design problem: measuring the thing that actually ships

The hot path deliberately makes **one** model call. `extract()` returns the freeze fields
and the triage signals together, because a second sequential round trip costs about a
second of a sixty-second budget for information the first call already read.

That creates a trap for the eval. If `/api/triage` had its own prompt, the eval would score
a paragraph the product does not use, and the reported false-positive rate would describe
nothing. A number that describes nothing is worse than no number, because it gets quoted.

So the triage wording was factored into `lib/prompts.ts` as a single `TRIAGE_INSTRUCTION`
constant, composed into both `EXTRACTION_INSTRUCTION` and `TRIAGE_ONLY_INSTRUCTION`. And
because a convention like that decays the moment someone edits one of the two,
`lib/triage.test.ts` asserts the composition:

```ts
expect(EXTRACTION_INSTRUCTION).toContain(TRIAGE_INSTRUCTION);
expect(TRIAGE_ONLY_INSTRUCTION).toContain(TRIAGE_INSTRUCTION);
```

The same reasoning drove pulling `validateActiveScam` out of `validateExtraction`. The
"drop any signal the model could not quote" rule is what makes the gate conservative; a
second, subtly different copy of it behind the triage route would be the worst possible
place for a divergence. Both paths now call one function. The refactor was behaviour-
preserving — the existing 50 tests passed unchanged before anything new was added, which is
the only reason to trust it.

### Why `/api/triage` exists at all, given the single-call design

One case the single call genuinely cannot cover: a screenshot of a debit SMS contains no
evidence about whether the attack is ongoing. That signal only ever lives in the sentence
the user types — and they often type it *after* uploading. Triage has to be callable on its
own for that path.

It also accepts a raw `signals` object and runs the gate with no model call at all, which
is how the gate can be exercised offline and re-run after a user edit.

### The eval

`data/triage-eval.json`, 22 labelled synthetic cases, driven through the real route over
HTTP by `scripts/eval.mjs`.

**The COMPLETED set is where the work went.** 14 of the 22 are COMPLETED, and over half of
those deliberately name remote access, a live-sounding call, or an instruction to stay
silent — in the past tense. That is the shape a keyword matcher fails on:

- `completed-anydesk-uninstalled` — "got me to install AnyDesk… I uninstalled it the same
  night"
- `completed-quotes-the-scammer` — quotes the scammer's present-tense words *inside* a
  past-tense report: "he kept saying 'stay on the line, do not disconnect'… that was
  yesterday"
- `completed-bank-already-called` — a live call exists, but with the real bank. Tests
  whether "on a call" is scoped to the attacker.
- `completed-loan-app-harassment` — the hardest one. Something genuinely *is* still
  happening, daily, but it is not the thing the interrupt is for.

### The result

**0% false positives — 0 of 14 COMPLETED cases fired.**
0% false negatives — 0 of 8 ACTIVE cases stayed quiet. Median triage latency 1332ms.

Written to `data/triage-eval-result.json` by the run, so the number on the site can be read
from the measurement rather than typed in from memory.

### What I do not believe about that result

A clean 0/14 invites more confidence than it has earned, and `HONESTY.md` says so on the
product's behalf:

1. **I wrote both the gate and the cases.** They are adversarial on purpose, but an
   author's own adversarial cases are not an independent benchmark.
2. **0/14 is consistent with a true false-positive rate up to roughly 20%** at 95%
   confidence. The honest claim is "no false positive was observed", not "false positives
   do not occur".
3. **It is all English prose.** A real user is at least as likely to give it Hinglish, or a
   dictation transcript with no punctuation. Nothing here says what happens then. This is
   the gap I would close first with more time.

The 0% false-negative rate is the *weaker* result, not the stronger one. The gate is built
to miss rather than over-fire; that it missed nothing says the ACTIVE cases were written
clearly, not that the gate is sensitive.

### The eval's exit code is a design decision

Non-zero on a false positive, zero on a false negative. Tightening the gate until every
ACTIVE case fires is precisely the change that would make the false-positive rate worse, so
the run must not create pressure to make it.

### What went wrong during this step

**The working tree changed under me.** Partway through, `app/page.tsx` was moved to
`app/start/page.tsx` and a new landing page appeared at `/`, along with edits to
`globals.css`, `SiteChrome.tsx` and `i18n.ts` — none of them mine. It also left the tree
failing typecheck (`copy.start.or` is referenced and does not exist in `lib/i18n.ts`), which
blocked `npm run build`.

Two things follow. First, a landing page at `/` contradicts the non-negotiable that the
first screen *is* the intake, so it is not something to quietly build on top of — it is
escalated, not resolved unilaterally. Second, I needed the eval number without a working
production build, so I ran it against `next dev`, which compiles per route and did not care
that an unrelated page failed to typecheck. That is the only reason step 5 has a number at
all today.

### Uncertain

Whether `/api/triage` should be wired into the client at all. The single-call path already
covers the common case, and adding a second call to the intake would spend part of the
sixty seconds to catch a signal that is usually already caught. Right now the route exists
and the client does not call it, which is a defensible place to stop but is not obviously
the final answer.

---

## Step 6 — `/judge` and `/honesty` — 2026-08-28

Built on a branch (`step-6-judge-honesty`) in a separate git worktree, because another
session was writing to the shared working directory at the same time and had already left
the tree failing typecheck once mid-step.

### `/honesty`, and the problem the brief handed me

The brief asks for two artefacts that must agree: a `/honesty` route, and a `HONESTY.md`
that mirrors it and is "kept in sync with what is actually real in the code at that moment".

Writing both by hand is the obvious reading and it is a trap. Two copies of a document stay
in sync for about a week. On most documents that decays into mild inaccuracy; on this one it
is fatal, because the failure mode is a page claiming to be the honest account of the project
being contradicted by a file claiming to be the honest account of the project. That is worse
evidence than having neither.

So there is one copy. `lib/honesty.ts` holds the content as typed data; the page renders it
to the screen and `lib/honesty-doc.ts` renders it to markdown. The sync is enforced by a
vitest **file snapshot** — `expect(renderHonestyMarkdown()).toMatchFileSnapshot("../HONESTY.md")`
— so `npm test` fails when the two disagree and `npm run docs:honesty` regenerates.

I tried a standalone `scripts/honesty-doc.mjs` first and threw it away. A plain node script
cannot import a `.ts` module without a loader, and `lib/honesty.ts` imports the eval result
JSON, which in Node 22 needs an import attribute that complicates the TypeScript side. Vitest
already runs TypeScript and already has exactly this feature. Reaching for the tool that was
in the room was the right answer and it took me one detour to notice.

**The measured numbers are read from `data/triage-eval-result.json`**, which the eval writes.
The number on the page is the number that was measured; re-running the eval moves the page.
Nobody can type in a remembered figure.

**English only, and it says so.** Every other screen has Hindi and the Hindi is unreviewed.
The one page whose entire job is to be believed is the worst possible place to put a
translation nobody has read.

The page has no client JavaScript at all. It makes assertions about what the product does and
does not do; it should not itself be doing anything.

### `/judge`, and the decision the whole page turns on

Seeding the intake with a fixture and starting a clock would have been about three lines. It
would also have produced a meaningless number: a pre-filled run measures how long someone
takes to *review* a filled form.

That is not a hypothetical objection — it is the exact error the storage layer was already
built to prevent. `run_kind: "demo"` exists in `lib/schema.ts` precisely so that replayed
runs stay out of the timing distribution. Building the judging harness on top of the mistake
the schema was designed to catch would have been a strange way to demonstrate the product's
honesty.

So `/judge` shows the scenario the way a phone would show it, and the judge types or pastes
it into the real intake themselves. `lib/judge-scenarios.ts` holds raw inputs only — no
cached extraction, unlike `lib/fixtures.ts`. The model reads it live, the run is a real run,
and it counts toward the measured median that `/evidence` still reports as unmeasured. That
is the point: this page is how that number gets its first data.

**The product runs in an iframe.** The brief wants the stopwatch and the honesty strip on
screen throughout, which is impossible if the judge navigates away. Completion is detected by
polling the framed page's own `location.pathname` for `/receipt/` — same origin, so this is
permitted. The alternative was a `postMessage` from the receipt screen, which would have
meant editing a product screen so it could participate in being measured. The flow being
timed is completely unmodified and does not know the harness exists.

**The stopwatch deliberately reports the worse number.** It runs from the press of start,
including the seconds spent reading the scenario; the app's own clock starts at first
interaction with the intake. The judge's figure is always the larger of the two, and it is the
one displayed, with a note explaining why. A harness that picks the more flattering of two
available numbers is not a harness.

Verified end to end in a real browser: the stopwatch runs, the frame loads the shipped
intake, driving the frame to a receipt stops the clock, captures the acknowledgement number
and offers a re-run.

### Non-negotiable 6, and where the stopwatch sits with it

Exactly one element animates. On every product screen that is the decay meter and nothing
else, unchanged. `/judge` is an instrument rather than a product screen and the brief asks
for a stopwatch on it by name; the running digits are the only moving thing there, and the
meter is not on that page.

### The landing page

Escalated rather than resolved unilaterally, because it contradicts non-negotiable 5. The
decision came back to keep it and drop the constraint, so it is now recorded as a deliberate
departure in `DECISIONS.md` and on `/honesty` itself, next to the two others — the dark
ground and the choice of Gemini over OpenAI. A constraint quietly abandoned is
indistinguishable from one that was never noticed, which is the whole reason that section
exists.

The one change I did make to it: the step-one node in the sequence diagram carried the accent
colour and now does not. A coloured node in a diagram teaches the reader that the colour means
"look at this", and the interrupt needs it to mean "stop".

### Quality floor

Both new routes pass the 360px overflow check and are wired into `npm run shots`. 85 unit
tests, typecheck clean, production build clean.

The scenario block is a `<pre>` with `whitespace-pre-wrap break-words` rather than a scrolling
block: a sideways-scrolling element inside a 360px page is the exact failure `npm run shots`
asserts against, and a bank SMS is long enough to trip it.

### Uncertain

Whether the iframe survives contact with a real judge on a real phone. It is same-origin and
tested at 360px, but a 70vh frame on a small screen means two scrollbars in the same gesture
space, and the "open it full screen" escape hatch exists because I do not fully trust it. If
one thing on this page needs a human to try it before demo day, it is that.

---

## Step 7 — the Round 2 audit's first five items — 2026-09-02

Round 2 is a resubmission on 7 September, judged partly on what visibly changed. `PLAN_R2.md`
is the audit that set the order; this entry is what came of items 1–5 of it.

The framing that produced the list, and which is worth keeping: **the build was stronger
than its evidence.** Nothing here needed new features. What it needed was for the things
already built to actually be reachable and actually be true.

### `/judge` had been dead in production the whole time

The worst finding, and it had been shipping since the page was written. Loading the live
`/judge`, pressing **Start the run**, and waiting produced a stopwatch counting up over a
permanently blank frame:

```
{"iframeExists":true, "src":"about:blank", "innerPath":"blank"}
```

`start()` set `phase` to `"running"` and then assigned `frame.current.src = "/start"`. But
the `<iframe>` was rendered only while `phase !== "idle"`, so inside that click handler it
had not mounted, the ref was `null`, the assignment was skipped, and the frame then mounted
with the `about:blank` hardcoded in its JSX. React batches state updates in event handlers,
so there was never a version of this that worked.

Fixed by mounting the frame always and hiding it with `hidden` while idle, and driving
`src` from an effect keyed on `[phase, run]` — `run` being a counter bumped by `start()`,
without which "Run it again" would leave the previous run's receipt on screen, since the
URL string does not change between runs.

**Two things this had been costing, and the second is the larger one.** `SUBMISSION.md`
offers `/judge` to reviewers as the guided run. And it is the reason `/api/timings` reports
`count: 0` — no run could ever complete through the harness, so the sixty-second claim had
no measurements and the landing page's own headline tile read "Not yet measured".

Verified end to end in a real browser this time, and verified the part that matters rather
than the part that is easy: the frame loads `/start` and renders the real intake, driving
it to a `/receipt/` path stops the clock and captures the acknowledgement number, and
"Run it again" reloads the intake. Deliberately **not** verified by completing a freeze —
the local server points at the production Upstash, so a scripted completion would have put
a bot run into the real distribution. Driving the frame straight to a nonexistent receipt
exercises the same poll and writes nothing.

### The front page asserted the one number `/evidence` refuses to guess

The landing page opened with *"The national portal asks for about fifty facts before it
takes one."* Nobody counted fifty. `data/portal-benchmark.json` refuses that exact figure
in writing, and `/evidence` says guessing it "would discredit every honest thing next to
it". The same number was in `SUBMISSION.md` — under a note to myself to check it, which was
never actioned — and in the video script.

Removed from all three rather than softened, because "about" is not a hedge that survives a
reviewer opening `/evidence` in the next tab. The sentence now describes the portal's
behaviour without counting it. A number goes back only when a human has opened the portal
and counted, and `SUBMISSION.md` now says so where the stale note used to be.

The heading moved from "five facts" to "nine facts" in the same pass. Five was borrowed
from the concept doc's rhetoric while every screen underneath said nine — `FREEZE_FIELDS`
is nine, and the receipt counts against nine.

### `/honesty` and `/judge` were reachable from nowhere

```
grep -rn "honesty\|/judge" app/page.tsx components/*.tsx lib/i18n.ts   →   no matches
```

Not in the header, the footer, the landing page, or any product screen. Honesty is a named
judging criterion and the page built for it could only be reached by typing the URL. Both
now sit in the footer on every screen and as a pair of cards on the landing page.

### The strongest evidence in the project was buried four sections deep

`/evidence` quotes the portal's own CFCFRMS instructions: short list of facts → system
generated acknowledgement number → full complaint against that number within 24 hours.
**The government already runs this sequence on the helpline.** That is the difference
between "a student thinks the form should be reordered" and "the state's own procedure
disagrees with the state's own web form", and it was below the fold of a page reachable by
one small header link. It is now on the landing page with the quote verbatim and the source
next to it, and it is in the 250 words and in minute two of the video.

### What I chose not to do, and why

**Suppressing the site chrome inside the judge frame.** The product currently draws its
header and prototype notice inside the frame, under the harness's own copies of both. The
obvious fix is to have `SiteChrome` detect `window.self !== window.top` and render less.

I did not, and the reason is the harness's own claim: the frame is the shipped product,
unmodified, and it "does not know it is being timed". That is exactly why `postMessage`
from `/receipt` was rejected when this page was built. Teaching a product screen to render
differently when it is being watched costs more than the duplication does. What I did
instead is parent-side only — `/judge` pins its own prototype notice, so `SiteChrome` no
longer also renders the inline one on that route. Two copies instead of three, and the
product untouched.

### Also fixed, because it would have cost time on shoot day

`DEMO_VIDEO.md`'s pre-flight said "the live site is out of date — the landing page and
`/start` aren't on it". It has not been true since 28 August; `/start`, `/judge` and
`/honesty` all return 200 and `deploy_ready: true`.

Worse, minute two's script was garbled: the "no guessing" beat ran into the third beat
mid-sentence (`"So I+ asked the government for that data in February"`), the third beat had
no opening, and the delivery notes below referenced three beats where only two existed.
Rewritten as three, recounted at 187 words / ~64s.

### Uncertain

**Whether the median that comes out of the harness will be under sixty seconds.** Nothing
has been measured yet, and the point of fixing `/judge` is that this is now findable out.
`/evidence` and the landing tile both read from the same endpoint, so whatever the runs say
is what the site says. If it lands above sixty, the claim changes and not the data.

**The 0% false-positive rate still describes `/api/triage`, which the product never calls.**
Item 6 in `PLAN_R2.md`, deliberately left until after mentor feedback, because it is the
item most likely to be redirected by it.

---

## Step 8 — the route with no caller, and the number that measured the wrong thing — 2026-09-03

`PLAN_R2.md` item 6, both halves. They looked like two jobs and were one: `/api/triage`
existed, was documented as load-bearing, was the thing the headline number measured, and
was called by nothing except the eval.

### The gap was in the UI, not the model

`DECISIONS.md` §3 justified the route like this: a screenshot of a debit SMS carries no
evidence about whether the caller is still on the line, so that signal "only ever lives in
the sentence the user types — which they often type second."

There was no second. The intake submits its textarea *with* the image, in the same call.
Nothing downstream ever asked for prose again. So the justification described a moment in
the flow that did not exist, and the consequence was concrete: **a screenshot-only report
could never fire the interrupt at all.** The most likely input to the product was the one
input the safety feature could not see.

So the confirm screen now carries an optional description box. Debounced 900ms, minimum 20
characters, one call per distinct sentence.

**It cannot block the send button, and that is not a limitation.** A missed interrupt costs
one person an extra nudge; a send button that waits on a model call costs the sixty-second
claim, for everyone. The call is fire-and-forget: dispatch before it returns and the packet
goes. Same asymmetry as the gate's threshold in decision 5, applied to latency.

No spinner either. The meter is the one moving element on that screen, and a "checking…"
beside the send button reads as a reason to wait — the opposite of what the rest of the
screen says.

### Two defects I introduced, found by driving it rather than by reading it

Typing an ACTIVE description on `/confirm` correctly landed on `/interrupt`. Then:

1. **The description was gone on the way back.** It was local component state, and
   continuing from the interrupt re-mounts the page. The one screen whose job is to not
   make a frightened person repeat themselves was making them repeat themselves. Moved into
   `JourneyState`, which is mirrored to sessionStorage, and read through the same
   draft-overlay pattern `edits` already uses — an effect copying it into local state would
   race the provider's post-mount read.

2. **Latent trap.** `triaged.current` resets on re-mount, so one more keystroke after
   continuing would have re-triaged the restored text and bounced the user straight back
   into the interrupt. "The interrupt must never trap the user" is a stated rule and this
   would have broken it. The screen is now shown at most once per report, gated on
   `state.interruptShown`.

Neither was visible from reading the diff. Both took about ninety seconds to find in a
browser.

### The number was measuring a sibling of the shipped path

The eval scored `/api/triage`. The intake calls `/api/extract`. Different system
instructions — `TRIAGE_ONLY_INSTRUCTION` against `EXTRACTION_INSTRUCTION` — and the shipped
one asks the question with nine freeze fields, and possibly an image, competing for the
model's attention in the same call.

`lib/prompts.ts` composes both from one `TRIAGE_INSTRUCTION` constant and
`lib/triage.test.ts` asserts that composition. But `toContain` is containment, not
equivalence, and the write-up around it — in `prompts.ts`, in `DECISIONS.md` §3, on
`/honesty` — said the number described the shipped gate. It described a sibling of it.

`npm run eval` now takes `--path extract | triage | both` and defaults to both. The
extraction path is the headline because it is the one a user hits; the triage path is
reported beside it; every disagreement is listed by name.

**Decisions and verdicts are counted separately**, because they are not the same claim. Two
prompts can shut the same gate from different readings, and reporting only the decision
agreement would overstate how alike they are. That distinction earned itself immediately:
the local run had one case (`completed-loan-app-harassment`) come back UNCLEAR on extraction
and ENDED on triage — same closed gate, different reading.

### The result

Against production, 3 September: **0/14 false positives and 0/8 false negatives on
`/api/extract`**, median 2014ms. 22/22 identical decisions against the triage path, 22/22
identical verdicts.

So the old claim was true. It had simply never been tested, which is a different thing, and
`/honesty` now says it in those words rather than quietly restating the old figure.

### What I do not believe about that result, beyond what was already listed

**Each figure is one run.** Temperature is 0, which is not determinism: the same 22 cases
run locally and against production on the same day produced one differing verdict. Both
readings left the gate shut, so nothing user-visible moved, but a single clean run is
evidence and not a fixed property. Added to `/honesty` as a fifth limit alongside the
disclosure about which path was historically measured.

### Also

What the person types on `/confirm` is carried into the freeze packet as `description` and
seeds the statement on `/report/[ack]` — only when nothing has been saved against that
acknowledgement yet, since once they have edited the statement, that is the statement.
Verified end to end: packet stored, statement pre-filled, run bucketed `demo`, real
distribution still at zero.

`README.md` and `DECISIONS.md` §3 and §6 corrected; decision 12 added for the description
box. The README's own intro was still repeating the unsourced "five behind the fifty" that
step 7 removed from the product, and now names the one count this repository is willing to
state — its own nine.

### Uncertain

**Whether the description box slows the median.** It sits above the send button on the
screen where the clock is still running, and it is the first thing step 7's item 2 will
measure. If real runs come in slower than expected, this is the first thing to look at, and
moving it below the send button is the cheap experiment.

---

## Step 9 — the packet, the accessibility audit, and the delta page — 2026-09-03

The rest of `PLAN_R2.md`, plus the two builds from the winning plan that close a judging
criterion with evidence rather than surface.

### "Dispatchable" was an assertion about an artefact nobody could see

The central claim is *a complete, dispatchable freeze packet*. A judge could see nine rows
on a receipt. The packet itself existed only as the app's internal state in Redis, shaped
for the app rather than for a recipient, and the honest answer to "what would you actually
send CFCFRMS?" was "read the repo".

`lib/packet.ts` makes it a real thing: `toBankPayload()` projects a stored packet into a
wire format, and the receipt renders exactly what that function returns. Not a mockup of a
payload — the function's output.

Two properties carry the argument, and both are tested:

- **The holes are in the format.** Unread fields are *absent* from the payload and named in
  an `unreadable` array. A null would serialise as a value-shaped blank; absence plus an
  explicit list cannot be mistaken for one. That is the product's entire thesis expressed
  as a schema rather than as a sentence.
- **It is not the internal state.** The triage signals, the confidence scores, the elapsed
  timing and the reporter's free text are all excluded. A bank placing a hold has no use
  for any of it, and shipping the stored object wholesale would be a privacy decision made
  by accident. `lib/packet.test.ts` asserts none of them can leak.

`dispatched: false` is a literal in the payload, so the artefact discloses its own status
without depending on the surrounding copy.

Collapsed behind a native `<details>`: the receipt is the moment the person's stress is
supposed to drop, and a wall of JSON is not that. Native, so it needs no JavaScript and is
keyboard-operable for free.

### The accessibility claims were claims

The product asserts large type and high contrast. Nothing had measured either, which is the
exact pattern the last two days were spent removing everywhere else — and a reviewer who
checks would have found it before we did.

Measured every colour pair. Most are comfortable: body text 17–19:1, muted 7.1–8.4:1, the
amber mark 5.8:1, the interrupt red 6.5:1. The palette comments' own claims (faint at 5.3:1
on ink, mark at 5.8:1 on surface) turned out to be accurate.

**Two failures, both fixed:**

- The meter's empty-state em dash used `--color-line-strong` at **1.9:1** — below the floor
  even for display sizes. The intent was right (the placeholder must read as the absence of
  a value, not as one) but the execution was invisible. Added `--color-placeholder` at
  3.4:1, which clears the large-text minimum and still reads as empty. Nothing else uses it.
- One source line on the landing page sits on `card-strong` (raised), where `faint`
  measures **4.49:1** and misses 4.5:1 by a hair. Moved to `muted`. It is a citation, which
  is the last thing on this site that should be the hardest to read.

**Three structural fixes:**

- The meter emitted an `<h2>` above the page's own `<h1>` on both screens that use it. It is
  a `<p>` now; the `<section>` already carried `aria-label`, so nothing was lost.
- `/interrupt` arrives by client-side navigation, which a screen reader does not report. It
  is `role="alert"` now — the one screen where not being told what happened is a safety
  problem rather than an inconvenience.
- The send button's busy state was a label swap on a disabled button, which is not
  announced. `aria-live="polite"`.

Recorded on `/honesty` as a **partial** claim, not a real one, because the limit is real:
nothing has been tested with an actual screen reader, and nobody who uses one has looked at
it. Measuring contrast is not an accessibility audit; it is the part that can be done
without a person.

### `/changes`

A defect ledger rather than a feature list. The obvious version of this page is "what we
added" — every project in the round will have one, and it asks the reader to take the
improvement on trust. This one names what was wrong first and hands over the link that
proves it is not wrong now.

The two still-open items are at the top rather than the bottom. A list of fixes that quietly
omits the unfinished work is the thing this project spent the week removing.

Built as a visual sibling of `/honesty` — same hairline row list, no colour, server
component, English only for the same reason. The first draft repeated "Still open" under
each open entry, directly beneath a heading that already said it; cut, on the same reasoning
`FieldRow` uses when it explains only the first hole.

### Also in this batch

- **The receipt over-counted.** `isMissing` sees `payment_rail: "UNKNOWN"` as a value, so a
  wholly empty packet reported *1 of 9 fields sent*. `isMissingFreezeField` treats the enum
  placeholders as the holes they are. On the screen whose argument is that it counts holes
  honestly, that count should not have been the generous one.
- **A misread timestamp could not be corrected.** The time control rendered only when the
  model failed to read one, so a wrong reading was stuck — on the field that drives the
  meter and that a bank reads first. Always shown now, with the stored value in words above
  it, rendered through the same formatter the meter uses so one instant never appears two
  ways on one screen.
- **The meter counted in English on Hindi screens.** `elapsedParts` is English by design
  (it is the tested arithmetic module), and the unit went straight to the DOM. `elapsedText`
  in `lib/i18n.ts` looks it up instead. `lib/decay.ts` stays pure and its tests stay pinned.

### Uncertain

**Whether the payload block belongs on the receipt at all.** It is collapsed and it is
below the acknowledgement number, so it should not compete — but the receipt is a stress-
drop screen for a victim and this is a block written for a judge. If the two audiences pull
harder apart than expected, the honest move is to leave a link on the receipt and put the
payload on `/evidence`, where the other judge-facing material already lives.
