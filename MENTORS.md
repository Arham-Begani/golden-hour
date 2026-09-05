# Mentor feedback

Round 2 is scored partly on whether feedback was absorbed. This file is the record: what
was asked, who answered, what changed as a result — **including what was raised and
deliberately not acted on, and why.**

Answers get written down the same day. A decision that lands here also lands in
`DECISIONS.md` if it changed the architecture, and on `/changes` if it changed the product.

---

## How to use this

Do not open with "any feedback?". It costs a mentor more effort to find something than to
answer something, and the reply is usually generic. Ask one specific question with the
context already supplied, so answering is cheap.

Each question below is self-contained and paste-ready. Send **one per mentor**, matched to
what they work on. Then fill in the Answers section.

**Send question 5 first, and to the most people.** It is the highest-yield and the slowest
to come back, because it asks for fifteen minutes rather than an opinion.

Every question carries the deadline in its last line. That line is not politeness — without
it these sit in an inbox until after the resubmission, and an answer that arrives on Tuesday
scores nothing.

---

## The questions

### 1. On the interrupt's threshold — for anyone doing applied ML or evals

> Golden Hour stops the report if it detects the scam is still in progress — remote-access
> app installed, caller still on the line. The gate fires only on an explicit ACTIVE
> verdict **plus** a hard signal the model could quote verbatim; anything inferred is
> dropped before the gate sees it.
>
> Measured on 22 labelled synthetic cases: 0/14 false positives, 0/8 false negatives, and
> the two prompts I score agree 22/22. But it is all English prose that I wrote myself, and
> a real user is far likelier to give it Hinglish or an unpunctuated dictation transcript.
>
> **What would you want to see before you trusted that number?** I would rather add the
> right 20 cases than another 200 of the same shape.
>
> I resubmit on Monday the 7th — one line by Sunday is worth more to me than a considered
> reply on Tuesday.

### 2. On deleting a statistic — for a product or design mentor

> The meter on the main screen used to show a falling recovery probability — 50% in the
> first hour, 10% in a day. I could not trace those figures to any primary source; the MHA
> was asked in Parliament for recovery against losses and the answer does not contain the
> word "recovered". So I deleted the percentage and the meter is now a plain elapsed clock.
>
> The product's entire pitch is urgency, and I removed the number that conveyed it.
>
> **Was that the right call, or is it precious?** The counter-argument I keep having with
> myself is that a cited-but-imprecise number would have helped more people act than an
> honest clock does.
>
> I resubmit on Monday the 7th — one line by Sunday is worth more to me than a considered
> reply on Tuesday.

### 3. On where the remaining effort goes — for a senior engineer

> Four days left. Two things I could spend them on:
>
> **Depth** — the model path. Wire the triage call deeper, handle Hinglish, widen the eval.
> **Evidence** — measure what I already claim. The sixty-second claim has no human runs
> behind it yet, and the comparison against cybercrime.gov.in is uncounted.
>
> I have been assuming evidence beats depth, because an unproven headline number is the
> first thing a reviewer will poke. **Would you spend it the same way?**
>
> I resubmit on Monday the 7th — one line by Sunday is worth more to me than a considered
> reply on Tuesday.

### 4. On the honesty posture — for anyone who has judged before

> I publish a page listing what is real and what is mocked, including the things that make
> the project look worse: the acknowledgement number corresponds to nothing, the portal
> comparison is empty because nobody counted it, and the headline claim is unproven.
>
> **Does that read as rigour or as an excuse?** I cannot tell from inside it, and there is a
> version of this that just looks unfinished with good paperwork.
>
> I resubmit on Monday the 7th — one line by Sunday is worth more to me than a considered
> reply on Tuesday.

### 5. On the thing I cannot see — for the most senior person available

> Open the live link cold and give it fifteen minutes as if you were scoring it against 249
> other projects: `https://golden-hour-kappa.vercel.app`
>
> `/changes` lists what I fixed this week and what is still broken.
>
> **What is the first thing that makes you lose confidence?** Not what to add — what is
> already there that costs me.
>
> I resubmit on Monday the 7th — one line by Sunday is worth more to me than a considered
> reply on Tuesday.

---

## Answers

> Fill in as they arrive. Name the person, quote the substance rather than paraphrasing it,
> and record the decision even when the decision is "no".

**If fewer than three replies land by Sunday noon**, fall back to cold reviewers — a peer,
and one person who has never seen the project and does not work in software — and record
what they said here, labelled as exactly that. An honestly-labelled peer review is worth
having; a mentor quote that nobody said would end this project's entire position on the
first line anybody checked.

### [Name] — [date]

**Asked:** _(which question)_

**Said:**

**Did about it:**

**Where it landed:** _(DECISIONS.md § / /changes entry / not acted on, because …)_

---

## Raised and not acted on

Feedback that was considered and declined belongs here with the reasoning, not in a
silence. A mentor who sees their suggestion missing cannot tell whether it was rejected or
forgotten, and the two are very different.

| Suggestion | From | Why not | Date |
|---|---|---|---|
| | | | |
