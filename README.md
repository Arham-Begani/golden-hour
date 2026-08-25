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
| Recovery curve | `lib/decay.ts` | Log-time interpolation from the user's own timestamp |
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

**The meter is computed from the fraud's timestamp, not the page load.** A six-day-old
fraud reads 2% on arrival and stays there. The sub-one-hour stretch of the curve is
drawn dashed because the published figures do not anchor inside the first hour, and the
three cited points are ticked on the axis so the fit and its evidence are visible at
once.

**The interrupt is hard to trip on purpose.** It fires only on an explicit `ACTIVE`
verdict *and* at least one hard signal backed by a verbatim quote. `UNCLEAR` never
fires. A missed interrupt costs one person an extra nudge; a false one, repeated, trains
everyone to dismiss the real ones.

---

## Verifying

```bash
npm run verify     # typecheck + unit tests + production build
npm run test       # 42 unit tests: decay curve, validation, interrupt gate, schema
npm run shots      # screenshots at 360px; fails if any page scrolls sideways
npm run journey    # drives all four demo cases end to end in a real browser
```

`npm run journey` is the one that matters. It walks intake → interrupt → confirm →
receipt → statement for each case and asserts the interrupt fires only where it should
and that the send button is **never** disabled by a missing field.

Both browser scripts need Chrome installed and the dev server running.

---

## Two things a human still has to do

Neither of these may be filled in by a model. Both are load-bearing for the pitch.

1. **[`CITATIONS.md`](./CITATIONS.md) — the recovery curve is currently UNSOURCED.**
   The 50% / 10% / 2% figures come from the concept doc and a first search pass could
   not trace them to a primary source. Worse, it found a published claim that appears to
   *contradict* the 24-hour anchor. `/evidence` renders a loud unverified banner until
   every anchor has a `source`. Read `CITATIONS.md` — it records what was found and the
   three ways out.

2. **[`data/portal-benchmark.json`](./data/portal-benchmark.json) — the portal column is
   empty.** Someone has to open cybercrime.gov.in and count the fields. `/evidence`
   shows unfilled rows as "not yet counted" rather than hiding them. A fabricated
   benchmark would discredit every other honest thing on the site.

Also: the Hindi copy in `lib/i18n.ts` is a first pass and needs a native speaker before
the pitch. Machine-shaped phrasing in emergency instructions is a bad look in a product
about not being misled.
