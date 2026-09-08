# Demo video — 2 minutes

> **The words are in [`SCRIPT.md`](./SCRIPT.md).** That is the page you hold while
> recording. This one is the production plan: what to film, the arithmetic, the checklist,
> and which footage has gone stale.

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

> **`R` will be bigger than it used to be, on purpose.** Until 8 September the clock did
> not start until the file picker handed back your screenshot, so the time spent finding
> the debit alert in your gallery was free. It is not free any more — the clock starts when
> you tap **Add a screenshot**. That is the honest measurement and it is the one the claim
> has to survive.
>
> Practical consequence: **have the screenshot ready to hand** before you start filming, the
> way a real victim would have the bank SMS on the screen they were just looking at. Do not
> hunt for it on camera. That is not gaming the number — it is the realistic case, and the
> unrealistic one is a person who has forgotten where their own debit alert is. But whatever
> the clock says, say *that*.

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

**[`SCRIPT.md` § Minute one](./SCRIPT.md#minute-one--the-problem-and-the-thing-working).**
102 words, roughly 38 seconds of speech; the rest of the minute is the run playing under
the silences. It carries the warning about the "six of nine" line, which is the one number
in the video you do not get to choose.

The words live in one file so that this one and that one cannot end up holding two versions
of the same sentence — the same rule `lib/timings.ts` exists to enforce about a number.

## What to film

**Clip A — the portal · ~10 seconds**
cybercrime.gov.in on your phone. The category dropdown, the register prompt, then scroll the
form so its length passes. **Do not submit anything** — filing a fake report to a live
government system is a false police complaint.

> Ten seconds, not the twenty-five the old script implied. The opening used to run four
> paragraphs over a clip specified at eight, which never fitted and pushed the finished
> video past 2:15 once `R` grew. The problem statement is two sentences now and the rest of
> the argument plays over the run — see `SCRIPT.md`.

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
| Clip B | "Pick a category. Register. Wait for an OTP." — cut on the last word |

Everything after that line is spoken over the run, including the pivot and the 1930
sentence. The run has the dead air to carry it and Clip A does not.

---

# MINUTE TWO — one feature, told as a story

**Straight to camera. Know the arc, don't read it.**

The arc, in five beats: *everyone did the easy version → the easy version is a request, not
a guarantee → here is what I did instead → here is why the stakes are asymmetric → here is
where mine still fails.* The last beat is the one that will be remembered.

## What to say

**[`SCRIPT.md` § Minute two](./SCRIPT.md#minute-two--one-feature-told-as-a-story).**
180 words, roughly 63 seconds at a measured pace, with the two phrases to cut if you need
seconds back — about 57 without them.

## Will it fit? Do this arithmetic before you film

Minute one is not 60 seconds of speech — it is the run, with the problem spoken over the
portal clip in front of it. So:

```
total ≈ (10s problem over Clip A) + R + (3s holding the receipt) + 63s
```

| `R` | Total | Verdict |
|---|---|---|
| 35s | ~1:51 | Fits with room |
| 45s | ~2:01 | Trim the two phrases in minute two → ~1:55 |
| 55s | ~2:11 | Trim minute two **and** drop the 1930 sentence → ~2:00. Tight |
| 65s | ~2:21 | See *If the run is over a minute* |

Work this out with your real `R` **before** you record minute two, so you know which
version of it you are recording.

The problem statement is already down to two sentences and there is nothing left to take
out of it, so at high `R` the 1930 line is the next thing to go — reluctantly, because it
is the best sentence in the minute. Clip A cannot be cut below about eight seconds either;
the portal has to be on screen long enough to be recognised as the portal.

**Then stop.** Don't summarise, don't thank anyone, don't say "and that's Golden Hour." Cut
on the last word.

## Cutaways — worth it here

Minute two is about a thing that can be seen, so show it. Keep your voice running
underneath and cut back to your face straight after.

- On *"eleven digits, ninety-three percent confident"* → the **`Dropped` chip** on the
  confirm screen, using the **"A confident misread"** demo case at `/start?demo=1`. The
  chip reads *Dropped*, the line under it reads *"The model read this, but it isn't shaped
  like a real value, so it was dropped rather than sent wrong,"* and the rejected value
  `52361234567` sits underneath in its own monospace box. **This is the single strongest
  two seconds available to you** — the guarantee happening, not being described.

  This shot was re-cut on 8 September and the old take is wrong: the chip used to look
  identical to the *Edited* and *Low confidence* chips next to it, and the rejected value
  was inline at the smallest size on the row. Both now carry weight. **Do not use footage
  recorded before 8 September** — it under-sells the one frame this minute exists for.
- On *"it's on the honesty page"* → `/honesty`, the row about the escape.

If either costs you time, drop it. The words carry it alone.

## Delivery notes

**[`SCRIPT.md` § Delivery](./SCRIPT.md#delivery).** Learn the beats rather than reading
them, keep the jargon out, slow down on the last one, and cut on the last word.

---

# Every clip recorded before 8 September is stale

Four commits on 8 September changed every screen the video shows. `broll/` was recorded on
the 6th, so all of it is wrong except one file.

| Clip | Status |
|---|---|
| `broll/cut/clip-a.mp4` — cybercrime.gov.in | **Still good.** It films the government portal, which none of this touched |
| `dropped-chip.mp4`, `cut/cutaway-dropped-chip.mp4` | **Re-shoot.** Old chip treatment. This is the shot minute two is built around |
| `evidence.mp4` | **Re-shoot.** Shows a median the live site no longer prints. A clip that contradicts the live page is the worst thing this project could ship |
| `landing.mp4` | **Re-shoot.** The tile now shows a span, not a median |
| `run-demo.mp4`, `golden-hour-demo.mp4`, `cut/minute-1*.mp4` | **Re-shoot.** Old confirm screen — separate holes box, old chip, smaller upload card |
| `interrupt.mp4` | Unchanged by the 8 September work, but re-shoot with the set for consistent grade |

Regenerate the screen recordings with `node scripts/broll.mjs http://localhost:3100 broll`
against a **local** production server. Needs Chrome and **ffmpeg** on `PATH`
(`winget install Gyan.FFmpeg`, then reopen the shell) — `page.screencast()` spawns ffmpeg
and the script exits early without it.

**These are b-roll and cutaways only.** None of them is minute one. The run in the
submitted video is you, on your phone, in one take — see *What "the run" means* above. A
scripted screencast has a scripted duration, and the number on the receipt is the claim.

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

One of the five runs on record already is, and the 8 September clock fix makes it likelier
still. **Change the claim, not the data** — on the landing page, in the 250 words, and in
minute one. The reasoning is in
[`SCRIPT.md` § If your run comes in over a minute](./SCRIPT.md#if-your-run-comes-in-over-a-minute),
next to the words you would be changing.

---

# If you're over 2:00

Cut in this order. Stop as soon as you fit.

1. **The cutaways in minute two**
2. **"Real ones are twelve"** and **"Blank passes every check after it"** in minute two
3. **The 1930 sentence** in minute one — the best line you have, which is why it is third
4. **Clip A** — down to a single still of the form, held while you speak

**Never cut:** the run itself, or any of it. And never cut the last beat of minute two —
the escape is the whole reason this feature was chosen.

Time the final edit. If it lands at 2:01, it's over. Leave 3–5 seconds of headroom.

---

# Rules for the look

- **Film the demo on a real phone, upright.** The design is built for a small screen.
- **Plain speaking voice.** No hype, no "imagine a world where."

The rest — no music under the run, don't read out what is on screen, subtitles — is with
the words in [`SCRIPT.md` § Delivery](./SCRIPT.md#delivery).
