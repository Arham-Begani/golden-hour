# Citations

The decay meter's entire ethical defence is that its number is **real, cited, and
derived from the user's own timestamp**. An uncited decaying counter is urgency
theatre — the exact dark pattern the product claims not to be.

So this file gates the pitch. Every anchor in `lib/decay.ts` carries a `source`
field. While any cited anchor has `source: null`, `/evidence` renders a loud
unverified banner and `anchorsFullySourced()` returns false.

---

## STATUS: ⚠️ UNVERIFIED — do not present the meter as sourced

| Anchor | Figure | Source | Status |
|---|---|---|---|
| Reported within 1 hour | ~50% recovered | — | **unsourced** |
| Reported within 24 hours | ~10% recovered | — | **unsourced** |
| Reported after 7 days | ~2% recovered | — | **unsourced** |
| t → 0 (sub-hour) | 58% | n/a | interpolation, labelled as such in the UI |

These three figures came from the project brief (`idea_2.md` §2). A first search
pass did **not** find a primary source for them.

---

## What the search actually turned up

Reported here so nobody re-does the work, and so the contradiction is not lost.
**None of these are verified — they are secondary reporting and starting points,
not citations.**

- *"If called within minutes, the success rate of freezing the funds is over 60%"* —
  [The420.in, on Mumbai's 1930 helpline](https://the420.in/mumbai-1930-cyber-helpline-saves-202-crore-2025/)
- *"If a fraud is reported within six hours, the police can block 70 to 75 per cent
  of the stolen money"* — same reporting thread
- CFCFRMS aggregate: >₹11,158 crore saved across 32.80 lakh complaints to 30 June 2026 —
  [PIB release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2205201&reg=3&lang=1),
  [IMPRI on CFCFRMS](https://www.impriindia.com/insights/policy-update/citizen-financial-cyber-fraud-reporting-and-management-system-cfcfrms-strengthening-indias-response-to-digital-financial-fraud/)
- Complaint volume 2,62,846 (2021) → 24,02,579 (2025); losses ₹551cr → ₹22,495cr —
  attributed to I4C data in the above

### ⚠️ The contradiction, stated plainly

"Reported within **six hours** → **70–75%** blocked" cannot be reconciled with the
brief's "within **24 hours** → **10%**". One of the two is wrong, or they measure
different things (funds *blocked* at the beneficiary bank vs funds ultimately
*returned to the victim* — these are genuinely different numbers, and the gap
between them is where most of the ambiguity in this space lives).

Resolve this before the pitch. A judge who knows the domain will ask.

---

## What to do — pick one, then update `lib/decay.ts`

1. **Source the brief's figures.** Find the I4C / MHA / RBI / parliamentary answer
   they came from. Put the URL in each anchor's `source`. Done.
2. **Re-anchor on what you *can* source.** If the defensible figures are
   "60%+ within minutes" and "70–75% within six hours", change the anchors to those
   and cite them. The curve's shape is not the claim — the *sequencing* argument is.
   A gentler, sourced curve costs the pitch nothing and makes it unattackable.
3. **Drop the precision.** If nothing is sourceable, replace the percentage readout
   with the elapsed clock alone and state the direction qualitatively. Weaker, but
   still honest.

**What not to do:** ship the numbers as-is with a citation link that doesn't support
them. That is worse than having no meter, because it makes every other honest thing
in this product — `UNREADABLE`, the stated holes, the "no bank integration" line —
look like decoration.

---

## Other claims made in the product

| Claim | Where | Status |
|---|---|---|
| Freeze alerts propagate to beneficiary banks via CFCFRMS | pitch, `/evidence` | plausible, cite the PIB/IMPRI links above |
| 1930 is the faster route for people who can reach an operator | receipt copy | uncontroversial, no citation needed |
| Field count on cybercrime.gov.in before first submit | `/evidence` | **you must count this yourself** — see `data/portal-benchmark.json` |
