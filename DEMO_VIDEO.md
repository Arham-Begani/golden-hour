# Demo video — 2 minutes

**Brief:** max 2:00. Minute one demos the project as a citizen. Minute two explains how
you built it and why you made those choices.

**Your plan, which this script is written for:**

- **Minute 1** — voice recorded first, screen recording edited in on top. No facecam.
- **Minute 2** — facecam only, you explaining the build.

---

# What "the run" means

Wherever this page says **the run**, it means one continuous screen recording of you
using the app, start to finish, without stopping:

> Start a report → Add a screenshot → Read this → correct one field → Send freeze
> request → hold on the receipt

About 40 seconds, filmed on your phone. **This is the demo** — everything else in the
video is context around it.

The app times it and prints the result on the receipt as **Time taken**. That is why it
cannot be scripted, sped up, or edited in the middle: the number on screen has to be a
real person doing a real task, or it is not evidence of anything.

---

# First: time your run

Everything in minute one is budgeted around one number, and only you know it.

Do one real run on your phone, start to finish, and read the **Time taken** figure off
the receipt. That is `R`.

| If `R` is… | Minute one is |
|---|---|
| ~30s | 10s problem · 30s run · 15s interrupt · 5s spare |
| ~40s | 8s problem · 40s run · 10s interrupt · 2s spare |
| ~50s | 5s problem · 50s run · **cut the interrupt** |
| over 60s | Cut the interrupt, trim the problem to one line, and see Part 6 |

**Do not speed up, trim, or cut inside the run to make it fit.** The run's real duration
is the claim. If it doesn't fit, something else goes — never the run.

---

# MINUTE ONE — the citizen demo

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

*(Only if your budget allows — see the table above:)*

> And if you're still inside the scam, the report stops and tells you to hang up, and to
> tell one person right now.

**99 words** without the interrupt line, **122** with it — roughly 38s and 47s of speech. The rest of the minute is the run playing under the silences.

## What to film

**Clip A — the portal · ~8 seconds**
cybercrime.gov.in on your phone. The category dropdown, the register prompt, then scroll
the form so its length passes. **Do not submit anything** — filing a fake report to a
live government system is a false police complaint.

**Clip B — the run · ONE UNBROKEN TAKE**
1. **Start a report**
2. **Add a screenshot** → your real debit-SMS screenshot
3. **Read this**, wait while it reads
4. correct exactly one field
5. **Send freeze request**
6. hold on the receipt 3 seconds

Fumble it? Delete and start over. Never fix this one with an edit.

**Clip C — the interrupt · ~10 seconds** *(only if the budget above allows)*
The digital-arrest demo case. Show **Stop.** → **Hang up.** → **Tell one person. Right
now.** Do not send the message.

## Where each clip goes

| Switch to | When you hear |
|---|---|
| Clip A | *(the start)* |
| Clip B | "So: send the bank's half first." |
| Clip C | "And if you're still inside the scam…" |

---

# MINUTE TWO — how you built it, and why

**Straight to camera. No script-reading — know the three beats and talk.**

Three decisions, twenty seconds each. Don't add a fourth.

## What to say

*(the split)*

> After a scam, two things have to happen. The money has to be frozen — that's minutes.
> The crime has to be investigated — that's weeks. Both sit on the same form, so the
> urgent one waits for the slow one. The government already splits them on the 1930
> helpline: a short list of facts, a number, the full complaint within 24 hours. The
> website doesn't. So I send the bank's nine facts first, and the rest attaches to that
> number.

*(no guessing)*

> The app reads that screenshot for you, and it can get things wrong. Misread the
> transaction ID and you freeze the wrong account while the real one keeps draining. So
> nothing the model reads is trusted — every field is checked again on the server, and
> anything that fails is sent blank instead of guessed. The receipt shows you what got
> dropped.

*(deleted my own number)*

> The countdown used to show a recovery percentage. I couldn't source it. I asked the
> government for that data in February and the answer doesn't have it — so I deleted my
> own number. It's a clock now, and the evidence page says why.

**187 words**, about 64 seconds. Plain language costs words — that is the trade for
being understood. The bracketed labels are for you, not to be said out loud. Don't add a
fourth decision, and don't sign off at the end.

**If you need seconds back**, drop the first sentence of beat two — *"The app reads that
screenshot for you, and it can get things wrong."* — and then the helpline sentence in
beat one, which minute one has already implied. Each costs about five seconds. After that,
shorten the gaps between beats rather than talking faster.

**Then stop.** Don't summarise, don't thank anyone, don't say "and that's Golden Hour."
Cut on the last word.

## Delivery notes

- **Don't read this off the screen.** Learn the three headers — *the split*, *no
  guessing*, *deleted my own number* — and say the rest in your own words. Reading to
  camera is obvious and it costs you more than a perfect sentence gains.
- **Say "transaction ID", not "UTR". Say "the model", not "Gemini" or "the LLM".** The
  script already avoids the jargon; don't put it back in on the day.
- **One take per beat is fine.** Record each of the three separately if it's easier and
  join them; nobody can see a cut on a talking head that holds still.
- **Look at the lens, not at yourself.**
- **The third beat is your strongest.** Slow down for it. Most people claim their thing
  works; almost nobody says "I removed my own number because I couldn't back it up."

---

# Optional — cutaways in minute two

Facecam-only works. But if editing allows, a **2-second cutaway** on beats two and three
makes them land much harder, and still counts as explaining rather than demoing:

- On *"the receipt shows you what got dropped"* → the **`Dropped` chip on the confirm
  screen**, using the `A confident misread` demo case. This is the strongest two seconds
  available to you: the model returned an eleven-digit reference at 0.93 confidence and the
  server refused it, with the rejected value printed underneath. No earlier cut could show
  this — every demo case's blanks used to come from the model declining to read a field,
  which shows the prompt behaving, not the guarantee holding.
- On *"the evidence page explains why"* → `/evidence`, the line reading *"There is no
  published recovery curve, so we do not draw one"*
- If you have a third second spare, the receipt's **"What would be transmitted"** block
  open, showing `"unreadable": [...]` and `"dispatched": false` in the payload

Keep your voice running underneath; cut back to your face right after. If it costs you
time, drop them — the words carry it alone.

---

# Before you record

- [ ] **Deploy your latest work and re-check it.** (The old note here said the live site
      was missing the landing page and `/start`. It is not — both have been live since
      28 August. Verify rather than trust either note.)
- [ ] `/api/health` shows `deploy_ready: true`, no warnings.
- [ ] A **real** payment screenshot. Blur the digits if you want; don't fabricate one.
- [ ] Do one timed run and write down `R`. Budget minute one off it.
- [ ] Phone on Do Not Disturb — one banner ruins Clip B.
- [ ] Practise on `?demo=1`. Those runs don't count toward your measured time.
- [ ] Know where `/changes` is. If anyone asks what is new since Round 1, that is the answer
      and it is one link.

---

# The one thing that could sink you

**Every real run you record counts in the median on `/evidence`.** Film Clip B six times
and all six are in that number.

- **Don't use your fastest take while the site shows a slower average.** Anyone can open
  `/evidence` and see the gap. That's the exact dishonesty this project is built against.
- **Keep every take.** If your video run is 41 seconds and the average is 52, that's
  fine — and if anyone asks, saying so is a better answer than a curated number.
- **If the average lands above 60 seconds**, change the claim, not the data.
- **Practice runs on `?demo=1` don't count.** Use them freely.

---

# If you're over 2:00

Cut in this order. Stop as soon as you fit.

1. **The interrupt (Clip C)** — the biggest saving, ~10s, and minute two still stands
   without it
2. **The portal (Clip A)** — drop to one sentence over a single still of the form
3. **The third beat in minute two** — painful, it's the strongest, but it's the longest
4. **The cutaways**

**Never cut:** the run itself, or any of it.

Time the final edit. If it lands at 2:01, it's over. Leave yourself 3–5 seconds of
headroom.

---

# Both presenting

If your teammate presents too, the natural split is **one voice per minute** — one does
the citizen demo, the other does the build. Same script, and it saves you a costume
change between voice-only and facecam.

If you do that, the handover line at 1:00 should be plain: *"That's the citizen side.
Here's how it's built."* Don't do introductions — you have no seconds for them.

---

# Rules for the look

- **Film the demo on a real phone, upright.** The design is built for a small screen.
- **Plain speaking voice.** No hype, no "imagine a world where."
- **No music during the run.** The silence is the point.
- **Don't read out text that's on screen.** Let people read it.
- **Subtitles.** Most people watch without sound.
