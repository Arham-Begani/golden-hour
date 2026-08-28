# Demo video script

Target runtime **2:45**. A 60-second cut is at the bottom.

Every on-screen line quoted below is the real copy from `lib/i18n.ts`. Narration is
written so it never says something the screen contradicts — if you change the copy,
change the narration with it.

---

## The one rule

**Do not cut inside the sixty seconds.**

The claim is temporal. A viewer cannot tell a 45-second run from a four-minute run with
the boring parts removed, so an edit inside the run destroys the only thing being
demonstrated. Shot 3 is one continuous take from first tap to receipt. Everything
outside it can be cut freely.

If a take goes badly, throw the whole take away and start again. Do not repair it.

---

## Before you record

- [ ] **Deploy the current work.** The live URL is behind — the landing page, `/start`,
      and `/api/triage` are not on it yet. Shoot against what you will submit.
- [ ] `curl .../api/health` → `deploy_ready: true`, `warnings: []`
- [ ] Have a **real** payment screenshot ready — a genuine debit SMS or UPI confirmation.
      Redact the account digits if you like; do not fabricate one. A staged screenshot is
      the one thing a sharp viewer can smell.
- [ ] Have a **blurred/cropped** version of a transaction screenshot for shot 5.
- [ ] Phone on Do Not Disturb. A notification banner mid-run costs you the take.
- [ ] Rehearse with `?demo=1` — those runs are bucketed as demo and excluded from the
      measured median. Rehearse as many times as you like.
- [ ] Decide now that **every real take counts**. See "The honesty trap" below.

---

## Shot 1 — The problem, on the real portal

**0:00 – 0:18** · Screen recording of cybercrime.gov.in, not our product. No title card,
no logo, no music sting.

**On screen:** the category dropdown. The "Register" / login prompt. The OTP screen.
Scroll the reporting form so its length is visible.

**VO:**
> Someone in India loses money to a UPI scam at 9:14 at night. By 9:16 they know.
>
> This is where they are told to go. It asks them to pick a category for a crime they
> don't understand yet. Then to register. Then to wait for a one-time password — on the
> phone the scammer may still be calling.
>
> Meanwhile the money is moving. It has already been split across two accounts.

**Note:** let the scroll run a beat longer than feels comfortable. The length of that
form is the argument.

---

## Shot 2 — The reframe

**0:18 – 0:32** · Cut to the landing page at `/`.

**On screen:** the heading, then scroll once to "Why it is split" and stop on the two
columns — *The freeze needs* / *The case needs*.

**VO:**
> A bank needs about five facts to place a hold, and it needs them in minutes. An
> investigation needs about fifty, and it has weeks.
>
> The portal collects both at once, and runs the whole thing at the speed of the slower
> half.

**Note:** do not read the heading aloud — it is on screen. Let it be read.

---

## Shot 3 — The run · ONE UNBROKEN TAKE

**0:32 – 1:25** · Real phone, portrait, thumbs. This is the video.

**Actions, in order:**

1. Tap **Start a report**
2. Tap **Add a screenshot** → pick the real debit SMS screenshot
3. Tap **Read this**
4. Fields come back on `/confirm` with per-field confidence. Correct exactly one.
5. Tap **Send freeze request**
6. Land on the receipt

**VO — front-load it, then stop talking:**
> A screenshot of the debit alert. That's it. That's the whole first step.

*(Say nothing while it reads. Silence here is confidence.)*

> Nine fields for the bank. Not one of them is required.

*(Silence through the correction and the send.)*

Then, on the receipt:

> Acknowledgement number. Time taken — on screen. Sent with six of nine fields, and it
> says which three are missing.

**The payoff frame:** the receipt showing **Time taken** with the real number. Hold on
it for a full two seconds before cutting. That figure is the claim.

**Note:** do not zoom, do not add a stopwatch overlay. The product measures itself and
prints the result; an overlay implies you don't trust your own instrument.

---

## Shot 4 — The interrupt

**1:25 – 1:55** · Separate take. Use the *digital arrest* demo case, or type a real
sentence describing an in-progress scam.

**On screen:** the flow stops. `/interrupt` — the word **Stop.** then **Hang up.** Scroll
to **Tell one person. Right now.** and tap **Send a message** so the pre-written SMS
composer opens.

**VO:**
> Some people who reach a reporting form are still inside the scam. The caller is still
> on the line. The remote-access app is still installed.
>
> So the report stops. It gives one instruction for what is actually happening — and then
> this.

*(Beat. Let "Tell one person. Right now." sit on screen.)*

> Being told to keep it secret is how these scams hold. One call to someone you trust
> ends it faster than anything on this page.

**Note:** show the message text in the composer. Do not send it.

---

## Shot 5 — `UNREADABLE`

**1:55 – 2:18** · The blurred screenshot.

**On screen:** upload it, let it read, land on `/confirm` with several fields showing
**Could not read**. Send anyway. On the receipt, land on the missing-fields block.

**VO:**
> This one is blurred. A model asked to read it will happily invent a reference number
> that looks about right.
>
> A missing transaction ID means the bank works with what it has. A wrong one means the
> bank freezes the wrong account while the real one empties.
>
> So the fields come back blank, the packet goes anyway, and the receipt names what was
> dropped and why.

**Note:** this is your technical credibility moment. It is a system refusing to guess,
demonstrated rather than asserted. Do not rush it.

---

## Shot 6 — What it does not claim

**2:18 – 2:40** · `/evidence`.

**On screen, in this order:** the *Measured* block. Then the portal column reading
*not yet counted*. Then the clock section — "There is no published recovery curve, so we
do not draw one."

**VO:**
> Every dispatch is timed and the whole distribution is published, slow runs included.
> Demo runs are counted separately and never mixed in.
>
> The comparison against the live portal is empty, because nobody has counted it. The
> meter shows a clock and not a recovery percentage, because we went looking for the
> published curve and there isn't one — the government was asked for it in Parliament in
> February and did not give it.
>
> Where we could not source something, it is blank, and the page says why.

**Note:** if your measured median is on screen and it is above sixty seconds, say the
number out loud anyway. See below.

---

## Shot 7 — Close

**2:40 – 2:50** · The prototype notice, then the receipt's real-routes block.

**VO:**
> This freezes nothing. There is no bank integration and no government connection.
>
> It is a prototype of a sequence — and the sequence is the argument.

**Last frame:** `Call 1930` and `cybercrime.gov.in`. Hold. Cut to black. No outro card.

---

## The honesty trap

Read this before your first real take.

**Every non-demo dispatch counts in the measured median.** Your takes are real runs.

- **Do not cherry-pick.** Using your fastest take in the video while `/evidence` shows a
  slower median is exactly the dishonesty this product is built against — and it is
  discoverable, because the site is deployed and anyone can open it.
- **Keep every take.** Then shot 6 shows the real median across all of them. If the video
  take is 41s and the median is 52s, showing both is *stronger* than showing either,
  because it proves you are not curating.
- **If the median lands above sixty seconds**, change the claim, not the data. A product
  whose evidence page contradicts its own headline is finished the moment a judge clicks
  through. Say the real number and explain what the slow runs were.
- **Rehearse on `?demo=1`.** Auto-excluded, costs you nothing.

---

## The 60-second cut

If you only get a minute, use **shot 3 alone**, unbroken, with shot 1 compressed to a
single line of setup:

> The national portal asks for about fifty facts before it accepts one. A bank needs five
> of them, in minutes.

Then the run, then the receipt.

Shot 3 *is* the thesis, demonstrated in real time. The interrupt is the most memorable
thirty seconds you have, but it is not the claim — keep it as the "one more thing" only
if there is room.

---

## Production notes

- **Record on an actual phone, portrait.** The whole design targets 360px on a throttled
  connection. A wide desktop capture quietly throws that away.
- **Plain, imperative voiceover.** Match the product's copy: no apology, no reassurance
  theatre, no exclamation marks. No "imagine a world where."
- **No music under the run.** Silence during shot 3 reads as confidence. If you want a
  bed, bring it in on shot 6 and keep it under the voice.
- **Do not explain the stack.** Nobody is deciding based on Zod. If the architecture
  matters to your audience, it belongs in a README or a follow-up question, not here.
- **Do not narrate what is legible.** If a line is on screen, let it be read.
- **Subtitle it.** Burned-in captions, because a lot of this will be watched muted.

---

## Optional: the measured interrupt

If your audience is technical and you have thirty seconds spare, insert after shot 4:

**On screen:** `npm run eval` running, then `data/triage-eval-result.json`.

**VO:**
> The interrupt fires on an explicit verdict plus a quoted signal, and nothing else. On
> twenty-two labelled cases it produced no false positives and no false negatives.
>
> Twenty-two cases written by the same person who wrote the gate. That means no false
> positive was observed — not that they don't occur.

That last sentence is the reason to include this at all. Anyone can show a green test
run; volunteering the limit of your own measurement is what makes the rest of the video
credible.
