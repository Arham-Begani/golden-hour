# Citations

The meter's entire ethical defence is that what it shows is **real, cited, and derived
from the user's own timestamp**. An uncited decaying counter is urgency theatre — the
exact dark pattern the product claims not to be.

This file gates the pitch. Every claim the meter rests on carries a source in
`lib/decay.ts`. While any of them lacks one, `/evidence` renders a warning and
`claimsFullySourced()` returns false.

---

## STATUS: ✅ RESOLVED — the percentage was removed, not sourced

The meter no longer shows a recovery probability. It shows elapsed time since the
fraud, the band that falls in, and what to do about it. Everything it now asserts has a
primary source.

| Claim | Where | Source |
|---|---|---|
| CFCFRMS exists to stop funds being siphoned onward | meter, `/evidence` | [MHA, RS US Q1349, 11.02.2026](https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS11022026/1349.pdf) |
| ₹8,189 crore saved across 23.61 lakh complaints to 31.12.2025 | `/evidence` | same |
| No published recovery curve exists | `/evidence` | same — see below |
| Elapsed time since the fraud | meter | the user's own timestamp |

---

## What the research found

### The brief's figures have no primary source

`idea_2.md` §2 gives a recovery curve: ~50% within 60 minutes, ~10% within 24 hours,
~2% after 7 days. **None of these could be traced to MHA, I4C, NCRB or RBI.**

### The government was asked for the curve and did not produce it

This is the finding that settled it. In [Rajya Sabha Unstarred Question
1349](https://www.mha.gov.in/MHA1/Par2017/pdfs/par2026-pdfs/RS11022026/1349.pdf) of 11
February 2026, Smt. Renuka Chowdhury asked the Ministry of Home Affairs, at part (d):

> whether it is a fact that a large proportion of fraud amounts remain unrecovered, if
> so, details of total amount recovered vis-à-vis losses incurred, year-wise?

The answer gives NCRB case counts for 2021–2023 and the CFCFRMS aggregate. **The word
"recovered" does not appear in it.** The Government of India was asked point-blank for
recovery against losses and did not give it.

That is not a gap in our search. It is the state of the published record.

### What that same answer does establish

> (CFCFRMS), under I4C, has been launched in year 2021 for immediate reporting of
> financial frauds and to stop siphoning off funds by the fraudsters. Till 31.12.2025,
> financial amount of more than Rs. 8,189 Crore has been saved in more than 23.61 lakh
> complaints.

This is a primary source for the *mechanism* the whole product is sequenced around —
`idea_2.md` §8. It is an aggregate of funds **saved**, over the system's lifetime. It is
not a rate, and it is not a function of elapsed time.

### The percentages in circulation are police statements

- *"If called within minutes, the success rate of freezing the funds is over 60%"* —
  [The420.in on Mumbai's 1930 helpline](https://the420.in/mumbai-1930-cyber-helpline-saves-202-crore-2025/)
- *"If a fraud is reported within six hours, the police can block 70 to 75 per cent of
  the stolen money"* — same reporting thread

These are officers quoted in the press, not published statistics. The apparent
contradiction with the brief's "24 hours → 10%" is best explained by the two describing
different quantities: funds **blocked or lien-marked at the beneficiary bank** versus
funds **ultimately returned to the victim**. Those are genuinely different numbers, and
the gap between them is where most of the ambiguity in this space lives. Neither is
published as a time series.

### "Golden hour" is officially-used language

The term is not ours. RBI invoked "the 'golden hour' principle in fraud-risk management"
in its proposal for a one-hour lag on account-to-account transfers above ₹10,000, and
state police forces use it routinely. The *concept* is citable even though the *curve*
is not.

---

## What was done about it

Option 3 from the original three, in a form that keeps the meter.

The percentage readout is gone. The meter shows the elapsed clock and a qualitative band
— inside the first hour, past the first hour, past the first day, more than a week — with
an instruction attached to each. The direction is real and sourced. The magnitude is not
claimed at all.

`/evidence` states this in full rather than quietly dropping it: that an earlier version
showed 50/10/2, that those figures could not be sourced, that the government was asked
and did not answer, and that a number nobody can source is worse than no number.

**What was not done:** ship the figures with a citation link that does not support them.
That would have been worse than having no meter, because it would make every other honest
thing in this product — `UNREADABLE`, the stated holes, the "no bank integration" line —
look like decoration.

---

## Still open

| Claim | Where | Status |
|---|---|---|
| Field count on cybercrime.gov.in before first submit | `/evidence` | see `data/portal-benchmark.json` |
| Median seconds to a dispatchable packet | `/evidence` | measured from real runs only; reads "not yet measured" until humans have done some |
| Hindi copy | `lib/i18n.ts` | not reviewed by a native speaker; labelled as such in the product |
