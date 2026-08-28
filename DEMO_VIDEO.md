# Demo video script

Target runtime **2:50**. One continuous narration. A 60-second cut is at the bottom.

Every on-screen line quoted here is the real copy from `lib/i18n.ts`. If you change the
copy, change the narration with it.

---

## How this is built

**Record the voiceover in one take, start to finish.** It is written to be read straight
through — the connective sentences are load-bearing, and reading it in pieces is what
makes a demo sound stitched together.

**Then lay the picture under it.** Every split below is a *picture* cut. The voice keeps
running across it, which is exactly why the viewer never feels the seam. You are never
cutting the narration; you are changing what is on screen beneath a sentence that is
already moving.

Two hard rules:

1. **Never cut the picture mid-sentence at a split.** Land the cut on the sentence break
   marked, so the new image arrives with a new thought.
2. **Never cut inside the run** (SPLIT B → SPLIT C). That stretch is one continuous
   screen recording. The claim is temporal; an edit inside it destroys the only thing
   being demonstrated. If a take goes badly, discard the whole take and start again.

---

# The narration

Read it all. `(beat)` is a pause, not a stop. `⟢ SPLIT` marks a picture change only.

---

⟢ **SPLIT A — open on the real portal.** Screen recording of cybercrime.gov.in. No title
card, no logo, no music sting.

**0:00**

> Someone in India loses money to a UPI scam at 9:14 at night. By 9:16, they know.
>
> This is where they're told to go.

*(Let the portal breathe here — the category dropdown, the register prompt, the OTP
screen. Don't rush to the next line.)*

> It asks them to pick a category for a crime they don't understand yet. Then to
> register. Then to wait for a one-time password — on the phone the scammer may still be
> calling.
>
> Meanwhile the money is moving. It's already been split across two accounts.

*(Scroll the reporting form so its full length passes. Hold a beat longer than feels
comfortable. The length of that form is the argument.)*

> The thing is, two clocks are running, and they're nothing alike.

⟢ **SPLIT B — cut to the landing page at `/`.** Lands on "two clocks are running", so the
new screen arrives with the new idea.

**0:30**

> A bank needs about five facts to place a hold, and it needs them in minutes. An
> investigation needs about fifty, and it has weeks.

*(Scroll to "Why it is split" and stop on the two columns — The freeze needs / The case
needs. Do not read the heading aloud. Let it be read.)*

> The portal collects both at once — and runs the whole thing at the speed of the slower
> half.
>
> So: send the five first.

⟢ **SPLIT C — cut to the phone. THE RUN BEGINS. One unbroken take from here to SPLIT D.**

**0:45**

> A screenshot of the debit alert. That's the whole first step.

*(Silence. Tap **Start a report** → **Add a screenshot** → pick the real debit SMS →
**Read this**. Say nothing while it reads. The quiet reads as confidence.)*

> Nine fields for the bank. Not one of them is required.

*(Silence through the correction and the send. Correct exactly one field, then tap
**Send freeze request**.)*

**On the receipt:**

> Acknowledgement number. Time taken — on screen. Sent with six of nine fields, and it
> names the three that are missing.

*(Hold on **Time taken** for two full seconds. That figure is the claim. No zoom, no
stopwatch overlay — the product measures itself and prints the result; an overlay implies
you don't trust your own instrument.)*

> That's the sequence. Everything after this point has no clock on it.
>
> But some people who reach a reporting form are still inside the scam. The caller is
> still on the line. The remote-access app is still installed.

⟢ **SPLIT D — cut to the interrupt.** Lands on "still inside the scam". Use the digital
arrest demo case, or type a real in-progress sentence.

**1:35**

> So the report stops.

*(On screen: **Stop.** then **Hang up.**)*

> One instruction for what's actually happening. And then this.

*(Scroll to **Tell one person. Right now.** Tap **Send a message** so the pre-written SMS
composer opens. Show the message text. Do not send it.)*

*(beat)*

> Being told to keep it secret is how these scams hold. One call to someone you trust
> ends it faster than anything on this page.
>
> Now — back to those blank fields.

⟢ **SPLIT E — cut to the blurred screenshot run.** Lands on "back to those blank fields".

**2:05**

> This screenshot is blurred. A model asked to read it will happily invent a reference
> number that looks about right.

*(Upload it, let it read, land on `/confirm` with several fields showing **Could not
read**. Send anyway.)*

> A missing transaction ID means the bank works with what it has. A wrong one means the
> bank freezes the wrong account while the real one empties.

*(On the receipt, land on the missing-fields block.)*

> So the fields come back blank, the packet goes anyway, and the receipt names what was
> dropped and why.
>
> That refusal runs through the whole thing.

⟢ **SPLIT F — cut to `/evidence`.** Lands on "runs through the whole thing".

**2:25**

> Every dispatch is timed, and the whole distribution is published — slow runs included.
> Demo runs are counted separately and never mixed in.

*(Scroll to the portal comparison.)*

> The comparison against the live portal is empty, because nobody has counted it.

*(Scroll to the clock section.)*

> The meter shows a clock, not a recovery percentage — because we went looking for the
> published curve, and there isn't one. The government was asked for it in Parliament in
> February, and didn't give it.
>
> Where we couldn't source something, it's blank, and the page says why.

⟢ **SPLIT G — cut to the prototype notice, then the receipt's real-routes block.**

**2:40**

> This freezes nothing. No bank integration, no government connection.
>
> It's a prototype of a sequence — and the sequence is the argument.

*(Last frame: **Call 1930** and **cybercrime.gov.in**. Hold. Cut to black. No outro
card.)*

**2:50 — end**

---

## The splits, for the edit

| | At the words | Picture becomes | Safe because |
|---|---|---|---|
| **A** | *(cold open)* | cybercrime.gov.in | — |
| **B** | "two clocks are running" | landing page `/` | new idea, new screen |
| **C** | "send the five first" | phone, `/start` | imperative hands off to action |
| **D** | "still inside the scam" | `/interrupt` | the sentence names what you're cutting to |
| **E** | "back to those blank fields" | blurred run | explicit callback, signals the move |
| **F** | "runs through the whole thing" | `/evidence` | widens scope, so the wider shot follows |
| **G** | "prototype of a sequence" | prototype notice → 1930 | closing thought, closing frame |

Every one lands on a sentence boundary where the narration is already turning. **C → D is
the one that must stay whole.**

---

## Before you record

- [ ] **Deploy the current work.** The live URL is behind — the landing page, `/start`
      and `/api/triage` are not on it yet. Shoot what you will submit.
- [ ] `curl .../api/health` → `deploy_ready: true`, `warnings: []`
- [ ] A **real** payment screenshot — genuine debit SMS or UPI confirmation. Redact digits
      if you like; do not fabricate one. A staged screenshot is the one thing a sharp
      viewer can smell.
- [ ] A **blurred or cropped** transaction screenshot for SPLIT E.
- [ ] Phone on Do Not Disturb. A notification banner mid-run costs you the take.
- [ ] Rehearse on `?demo=1` — bucketed as demo, excluded from the measured median.
      Rehearse as much as you like.
- [ ] Decide now that **every real take counts**.

---

## The honesty trap

Read this before your first real take.

**Every non-demo dispatch counts in the measured median.** Your takes are real runs.

- **Do not cherry-pick.** Using your fastest take while `/evidence` shows a slower median
  is exactly the dishonesty this product is built against — and it is discoverable,
  because the site is deployed and anyone can open it.
- **Keep every take.** Then SPLIT F shows the real median across all of them. If the
  video take is 41s and the median is 52s, showing both is *stronger* than either alone,
  because it proves you are not curating.
- **If the median lands above sixty seconds**, change the claim, not the data — and say
  the real number out loud in the narration. A product whose evidence page contradicts
  its own headline is finished the moment a judge clicks through.

---

## The 60-second cut

Keep **SPLIT C alone**, unbroken, with one line of setup in front of it:

> The national portal asks for about fifty facts before it accepts one. A bank needs five
> of them, in minutes.

Then the run. Then the receipt.

The run *is* the thesis, demonstrated in real time. The interrupt is the most memorable
thirty seconds you have, but it is not the claim — add it back only if there is room.

---

## Production notes

- **Record on an actual phone, portrait.** The design targets 360px on a throttled
  connection. A wide desktop capture quietly throws that away.
- **Plain, imperative voiceover.** Match the product's copy: no apology, no reassurance
  theatre, no exclamation marks. No "imagine a world where."
- **No music under the run.** If you want a bed, bring it in at SPLIT F and keep it under
  the voice.
- **Do not narrate what is legible.** If a line is on screen, let it be read.
- **Do not explain the stack.** Nobody is deciding based on Zod.
- **Subtitle it.** Burned-in captions — much of this gets watched muted.

---

## Optional: the measured interrupt

For a technical audience with thirty seconds spare. Insert at SPLIT D, after "ends it
faster than anything on this page":

*(Picture: `npm run eval` running, then `data/triage-eval-result.json`.)*

> The interrupt fires on an explicit verdict plus a quoted signal, and nothing else. On
> twenty-two labelled cases it produced no false positives and no false negatives.
>
> Twenty-two cases written by the same person who wrote the gate. So: no false positive
> was observed. Not that they don't occur.

That last sentence is the only reason to include this. Anyone can show a green test run;
volunteering the limit of your own measurement is what makes the rest of the video
credible.
