# Demo video — 2 minutes

**The brief changed for Phase 2. This script is written to the new one.**

> **Minute 1** — the problem you are solving, and a demonstration of your project in action.
> **Minute 2** — **one specific feature** you have built or improved that differentiates your
> project. Rather than covering the entire build, focus on this one thing: why it matters,
> and what makes your approach distinct.
>
> "This round, we will be assessing how clearly you tell the story of your build alongside
> the quality of the build itself."

**What that changes.** The previous script's minute two was three decisions at twenty
seconds each. That is now explicitly the wrong shape — *"rather than covering the entire
build, focus on this one thing."* Minute two is now **one** feature, told as a story with a
beginning and an end.

**The feature is: the model may not guess.** Server-side validation — `lib/validate.ts`.
Chosen over the interrupt and over the deleted recovery percentage because it is the one
that is *built or improved this round* (the extraction eval and the misread fixture are both
from this round), it is watchable in three seconds, and its story contains a failure, which
is the part nobody else will have.

**Cut from the video: the interrupt.** There is no room for it once the run plays, and
minute two belongs to one feature. It stays on the live site and in `/judge` for anyone who
looks. Losing it is a real cost and it is the right trade.

**Format:** minute one is voice recorded first with the screen recording laid under it, no
face. Minute two is straight to camera.

---

# What "the run" means

Wherever this says **the run**, it means one continuous screen recording of you using the
app, start to finish, without stopping:

> Start a report → Add a screenshot → Read this → correct one field → Send freeze request
> → hold on the receipt

Filmed on your phone. **This is the demonstration** — everything else is context around it.

The app times it and prints the result on the receipt as **Time taken**. That is why it
cannot be scripted, sped up, or edited in the middle: the number on screen has to be a real
person doing a real task, or it is not evidence of anything.

---

# First: time your run

Minute one is budgeted around one number and only you know it. Do one real run on your
phone and read **Time taken** off the receipt. That is `R`.

| If `R` is… | Minute one is |
|---|---|
| ~35s | 12s problem over Clip A · 35s run · ~10s spare for the receipt to hold |
| ~45s | 10s problem over Clip A · 45s run · hold the receipt to the end |
| ~55s | 5s problem — one sentence only · 55s run |
| over 60s | See *If the run is over a minute* below. Do not speed it up |

**Do not speed up, trim, or cut inside the run to make it fit.** The run's real duration is
the claim. If it does not fit, something else goes — never the run.

---

# MINUTE ONE — the problem, and the thing working

Voice first, then lay the screen recording under it. No face.

## What to say

> Someone loses money to a UPI scam at 9:14 at night. By 9:16 they know.
>
> This is where they're told to go. Pick a category. Register. Wait for an OTP — on the
> phone the scammer may still be calling.
>
> A bank needs a handful of facts to freeze the account. The portal wants the whole police
> complaint before it takes one.
>
> So: send the bank's half first.

*(Stop talking. Let the run play.)*

> A screenshot of the debit alert. That's the whole first step.

*(silence — about 8 seconds)*

> Nine fields. None of them required.

*(silence until the receipt appears)*

> Acknowledgement number. Time taken, on screen. Six of nine fields — and it names the
> three that are missing.

> ⚠️ **The "six of nine" is the one line here that is not yours to choose.** It depends on
> your screenshot and what the model could read off it, and the receipt prints the real
> figure. Do your run first, look at the receipt, and say *that* number. If it reads
> "8 of 9 fields", say eight and one. If it reads nine of nine, say *"all nine — and when
> it can't read one, it says so instead of guessing,"* which sets up minute two anyway.
> Narrating a number the screen contradicts is the single easiest way to lose the credit
> this whole project is built to earn.

**102 words**, roughly 38 seconds of speech. The rest of the minute is the run playing under
the silences. Say the last line as the receipt lands, not before.

## What to film

**Clip A — the portal · ~8 seconds**
cybercrime.gov.in on your phone. The category dropdown, the register prompt, then scroll the
form so its length passes. **Do not submit anything** — filing a fake report to a live
government system is a false police complaint.

**Clip B — the run · ONE UNBROKEN TAKE**

1. **Start a report**
2. **Add a screenshot** → your real debit-SMS screenshot
3. **Read this**, wait while it reads
4. correct exactly one field
5. **Send freeze request**
6. hold on the receipt 3 seconds

Fumble it? Delete and start over. Never fix this one with an edit.

| Switch to | When you hear |
|---|---|
| Clip A | *(the start)* |
| Clip B | "So: send the bank's half first." |

---

# MINUTE TWO — one feature, told as a story

**Straight to camera. Know the arc, don't read it.**

The arc, in five beats: *everyone did the easy version → the easy version is a request, not
a guarantee → here is what I did instead → here is why the stakes are asymmetric → here is
where mine still fails.* The last beat is the one that will be remembered.

## What to say

> Everyone this round used a model to fill in a form. So did I. What's different is what
> happens when it's wrong.
>
> Ask a model to say "unreadable" when it can't read something and it usually will. That's
> a request, not a guarantee. Mine handed back a transaction reference — eleven digits,
> ninety-three percent confident. Real ones are twelve.
>
> So nothing the model reads is trusted. The server checks every field's shape again and
> refuses anything that doesn't fit, however confident the model was. A refused field comes
> back as "unreadable", never blank. Blank passes every check after it.
>
> That matters because the stakes aren't symmetric. A missing transaction ID means the bank
> works with what it has. A wrong one means the bank freezes the wrong account while the
> real one empties.
>
> Then I measured it. Seventy-five fields, seventy-four right. From screenshots, forty out
> of forty, nothing invented.
>
> One escaped. Someone dictating said "fastcart dot pay at samplebank", and the model wrote
> a different account — a perfectly well-formed one. Shape checking can't catch that. So
> it's on the honesty page.

**180 words**, roughly 63 seconds at a measured pace. If you need seconds back, cut *"Real
ones are twelve"* (the number lands without it) and *"Blank passes every check after it."*
Each is about three seconds, and losing both brings this to about 57.

## Will it fit? Do this arithmetic before you film

Minute one is not 60 seconds of speech — it is the run, with the problem spoken over the
portal clip in front of it. So:

```
total ≈ (10s problem over Clip A) + R + (3s holding the receipt) + 63s
```

| `R` | Total | Verdict |
|---|---|---|
| 35s | ~1:51 | Fits with room |
| 45s | ~2:01 | Trim the two phrases above → ~1:55 |
| 55s | ~2:11 | Trim minute two **and** cut the problem to one sentence |
| 65s | ~2:21 | See *If the run is over a minute* |

Work this out with your real `R` **before** you record minute two, so you know which
version of it you are recording.

**Then stop.** Don't summarise, don't thank anyone, don't say "and that's Golden Hour." Cut
on the last word.

## Cutaways — worth it here

Minute two is about a thing that can be seen, so show it. Keep your voice running
underneath and cut back to your face straight after.

- On *"eleven digits, ninety-three percent confident"* → the **`Dropped` chip** on the
  confirm screen, using the **"A confident misread"** demo case at `/start?demo=1`. The
  chip reads *Dropped*, the line under it reads *"The model read this, but it isn't shaped
  like a real value, so it was dropped rather than sent wrong,"* and the rejected value
  `52361234567` sits underneath in monospace. **This is the single strongest two seconds
  available to you** — the guarantee happening, not being described.
- On *"it's on the honesty page"* → `/honesty`, the row about the escape.

If either costs you time, drop it. The words carry it alone.

## Delivery notes

- **Don't read this off the screen.** Learn the five beats and say the rest in your own
  words. Reading to camera is obvious and costs more than a perfect sentence gains.
- **Say "transaction ID", not "UTR". Say "the model", not "Gemini" or "the LLM".** The
  script avoids the jargon; don't put it back in on the day.
- **Slow down on the last beat.** Most people claim their thing works. Almost nobody
  finishes by showing you the case where theirs doesn't.
- **One take per beat is fine.** Nobody sees a cut on a talking head that holds still.

---

# Before you record

- [ ] **Know what the site is currently saying about its own timings.** There are now five
      real runs, and they fall into two groups too far apart to average — roughly 8–12s and
      roughly 50–64s — so `/evidence` shows both groups and prints no median, and the
      landing tile shows the span. One run is over sixty seconds and stays in. Adding runs
      in the middle of the gap is what would turn this back into one distribution; adding
      more fast ones will not.
- [ ] **Deploy your latest work, then open the live URL and look.** Don't trust this file
      about what is deployed.
- [ ] `/api/health` shows `deploy_ready: true`, no warnings.
- [ ] **Open `/judge` on the phone you are filming with.**
- [ ] A **real** payment screenshot. Blur the digits if you want; don't fabricate one.
- [ ] Do one timed run and write down `R`. Budget minute one off it.
- [ ] **Open `/start?demo=1` → "A confident misread" once** and check the `Dropped` chip
      renders, before you need the shot.
- [ ] Phone on Do Not Disturb — one banner ruins Clip B.
- [ ] Practise on `?demo=1`. Those runs don't count toward your measured time.

---

# The one thing that could sink you

**Every real run you record lands on `/evidence`, in public.** Film Clip B six times and all
six are on that page.

- **Don't use your fastest take while the site shows slower ones.** Anyone can open
  `/evidence` and see the whole distribution, one dot per run. That is the exact dishonesty
  this project is built against.
- **Keep every take.** If your video run is 41 seconds and the page shows runs at 64, that's
  fine — and saying so out loud is a better answer than a curated number.
- **A run in the 15–45s range is worth more than a fast one right now.** The five recorded
  runs sit in two clumps with a thirty-seven-second hole between them, which is why the page
  refuses to print a median. Runs that land in the hole are the ones that make it one
  distribution again.
- **Practice runs on `?demo=1` don't count.** Use them freely.

## If the run is over a minute

One of the five runs on record already is. If the figure lands above sixty seconds,
**change the claim, not the data** — on the landing page, in the 250 words, and in minute
one. Say the real number out loud in the video.

A project that says "I claimed sixty seconds, measured it honestly, and it came in at
sixty-four" is telling a better story about its build than one that claimed sixty and got
it. That is the round's stated criterion, and this is the one place you can meet it that
nobody else can fake.

---

# If you're over 2:00

Cut in this order. Stop as soon as you fit.

1. **The cutaways in minute two**
2. **The portal (Clip A)** — drop to one sentence over a single still of the form
3. **"Real ones are twelve"** and **"Blank passes every check after it"** in minute two
4. **The problem statement** — down to the first two sentences

**Never cut:** the run itself, or any of it. And never cut the last beat of minute two —
the escape is the whole reason this feature was chosen.

Time the final edit. If it lands at 2:01, it's over. Leave 3–5 seconds of headroom.

---

# Rules for the look

- **Film the demo on a real phone, upright.** The design is built for a small screen.
- **Plain speaking voice.** No hype, no "imagine a world where."
- **No music during the run.** The silence is the point.
- **Don't read out text that's on screen.** Let people read it.
- **Subtitles.** Most people watch without sound.
