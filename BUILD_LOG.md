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
