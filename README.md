# Golden Hour

**A rebuild of India's cyber fraud reporting flow, sequenced around the one hour that
decides whether the money comes back.**

The concept is in [`idea_2.md`](./idea_2.md). The short version: the national portal is
a police intake form that has been asked to double as an emergency stop button, and it
is paced like the former. The bank needs about five facts within minutes to place a
hold; the investigation needs about fifty over weeks. The portal traps the five behind
the fifty.

Golden Hour splits the report in two and sends the urgent half first.

---

## What it claims, and what it does not

**Claims:** a complete, dispatchable freeze packet in under sixty seconds, measured.

**Does not claim:** to freeze anyone's money. There is no bank integration and no
CFCFRMS connection. Nothing sent here reaches a bank, a police force, or any government
system. This is a prototype of a *sequence*.

That distinction is stated on the product itself — in the header of every screen and
again on the receipt — not buried here.

**It is not a government service and must never be able to be mistaken for one.** No
emblem, no national colours, no `.gov.in` styling. Every screen carries the prototype
notice, and the receipt links to the real routes: `tel:1930` and cybercrime.gov.in.

---

## Running it

```bash
npm install
cp .env.example .env.local     # add GEMINI_API_KEY
npm run dev
```

Open `http://localhost:3000`. Add `?demo=1` for the four cached demo cases, which work
with no API key and no network.

Check `http://localhost:3000/api/health` — it reports `deploy_ready` and names anything
missing. `?live=1` runs a real extraction end to end.

### Deploying

Set `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the
Vercel project environment.

> **The Upstash keys are not optional in production.** Without them the store falls back
> to an in-memory Map. That is fine locally and broken on serverless: each invocation is
> a separate process, so the receipt request usually lands somewhere that has never seen
> the packet and 404s. `/api/health` will tell you.

---

## How it works

| Piece | File | What it does |
|---|---|---|
| Extraction schema | `lib/schema.ts` | Zod, single source of truth for model output, validation and types |
| Gemini schema | `lib/gemini-schema.ts` | Converts JSON Schema to Gemini's OpenAPI subset |
| Extraction | `lib/extract.ts` | One call returns the freeze fields *and* the interrupt signals |
| Anti-hallucination | `lib/validate.ts` | Shape + confidence checks that force `UNREADABLE` |
| The clock | `lib/decay.ts` | Elapsed time and band, from the user's own timestamp. No percentage — see below |
| Interrupt gate | `lib/interrupt.ts` | Conservative: `ACTIVE` **and** a quoted hard signal |
| Store | `lib/store.ts` | Upstash, or in-memory for local dev. 24h TTL |
| Demo cases | `lib/fixtures.ts` | Cached extractions, run through the real validation path |

### The three ideas worth reading the code for

**`UNREADABLE` is a value, not an error.** Telling a model "say UNREADABLE if you can't
read it" is a request, not a guarantee. `lib/validate.ts` enforces it: anything whose
*shape* is wrong for the field it claims to be, or that the model itself wasn't
confident about, is downgraded — however plausible it looks. A downgrade produces
`UNREADABLE`, never `""`, because an empty string silently passes every downstream
check. The receipt then names what was dropped and why.

The reason: a missing transaction ID means the bank works with what it has. A wrong one
means the bank freezes the wrong account while the real one empties.

**The meter shows a clock, not a percentage — and that is the interesting part.** It
used to show a falling recovery probability fitted to three figures from the concept doc:
50% within an hour, 10% within a day, 2% after a week. None of them could be traced to a
primary source. In [Rajya Sabha Unstarred Question
1349](https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS11022026/1349.pdf) of 11
February 2026 the MHA was asked for "total amount recovered vis-à-vis losses incurred,
year-wise" and the answer does not contain the word *recovered*. There is no published
recovery curve.

So the percentage is gone and the clock stayed: elapsed time since the user's own
timestamp, the band it falls in, and what to do about it. A six-day-old fraud reads
"6 days" and does not pretend to be urgent. The direction is real and sourced; the
magnitude is not claimed. `/evidence` says all of this on the product itself.

**The interrupt is hard to trip on purpose.** It fires only on an explicit `ACTIVE`
verdict *and* at least one hard signal backed by a verbatim quote. `UNCLEAR` never
fires. A missed interrupt costs one person an extra nudge; a false one, repeated, trains
everyone to dismiss the real ones.

---

## Verifying

```bash
npm run verify     # typecheck + unit tests + production build
npm run test       # 50 unit tests: clock and bands, validation, interrupt gate, schema, run provenance
npm run shots      # screenshots at 360px; fails if any page scrolls sideways
npm run journey    # drives all four demo cases end to end in a real browser
```

`npm run journey` is the one that matters. It walks intake → interrupt → confirm →
receipt → statement for each case and asserts the interrupt fires only where it should,
that the send button is **never** disabled by a missing field, and that its own four
runs land in the demo timing bucket and leave the real distribution untouched.

Both browser scripts need Chrome installed and a server running. Prefer a production
server (`npm run build && npx next start`) over `npm run dev` — the scripts use fixed
waits, and dev-mode on-demand compilation makes them flaky for reasons that have nothing
to do with the app.

---

## What is still open

None of these may be filled in by a model.

1. **[`data/portal-benchmark.json`](./data/portal-benchmark.json) — the portal column is
   empty.** Someone has to open cybercrime.gov.in and count the fields. The documentary
   route was tried and failed: the portal's own citizen manuals do not enumerate this
   form — the financial-fraud one covers the 1930 helpline route and is marked "For Delhi
   Only", and the general manual is image-only. `/evidence` says so in those words rather
   than hiding the empty column. A fabricated benchmark would discredit every other
   honest thing on the site.

2. **The measured median has no real runs yet.** `/evidence` reads "not yet measured"
   until humans have done unaided run-throughs. Demo replays and `npm run journey` are
   recorded separately and excluded on purpose — they serve a cached extraction and start
   the clock at the fixture click, so they measure review time, not the task. Whatever
   the real median turns out to be is what the site claims; if it lands above 60s, the
   claim changes, not the data.

3. **The Hindi in `lib/i18n.ts` has not been read by a native speaker.** It reads well —
   idiomatic register, correct nuqta — but it is unverified, and the product says so on
   every Hindi screen rather than only here. Do not have a model "improve" it: an
   unreviewed translation labelled as such is honest; one polished into greater confidence
   is not.

[`CITATIONS.md`](./CITATIONS.md) records the recovery-curve research and how it was
resolved.
