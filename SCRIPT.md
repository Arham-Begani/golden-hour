# The script

The words, and nothing else. This is the page you hold while recording.

Everything about *producing* it — what to film, the shot list, the arithmetic, the
checklist, which footage is stale — is in [`DEMO_VIDEO.md`](./DEMO_VIDEO.md). The spoken
words live here and only here, so the two files cannot drift into two versions of the same
sentence.

**Two minutes total. Leave 3–5 seconds of headroom.**

---

# MINUTE ONE — the problem, and the thing working

Voice recorded first, screen recording laid under it. **No face.**

> Someone loses money to a UPI scam at 9:14 at night. By 9:16 they know.
>
> This is where they're told to go. Pick a category. Register. Wait for an OTP — on the
> phone the scammer may still be calling.
>
> A bank needs a handful of facts to freeze the account. The portal wants the whole police
> complaint before it takes one.
>
> So: send the bank's half first.

**— Stop talking. Let the run play. —**

> A screenshot of the debit alert. That's the whole first step.

**— silence, about 8 seconds —**

> Nine fields. None of them required.

**— silence until the receipt appears —**

> Acknowledgement number. Time taken, on screen. Six of nine fields — and it names the
> three that are missing.

**102 words · roughly 38 seconds of speech.** The rest of the minute is the run playing
under the silences. Say the last line *as* the receipt lands, not before.

### The one number you do not choose

**"Six of nine" depends on your screenshot, and the receipt prints the real figure.** Do
your run, look at the receipt, say *that*. If it reads "8 of 9 fields", say eight and one.
If it reads nine of nine, say:

> all nine — and when it can't read one, it says so instead of guessing

which sets up minute two anyway. Narrating a number the screen contradicts is the single
easiest way to lose the credit this whole project is built to earn.

---

# MINUTE TWO — one feature, told as a story

**Straight to camera.** Know the five beats and say the rest in your own words. Reading to
camera is obvious and costs more than a perfect sentence gains.

The arc: *everyone did the easy version → the easy version is a request, not a guarantee →
here is what I did instead → here is why the stakes are asymmetric → here is where mine
still fails.* The last beat is the one that will be remembered.

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

**180 words · roughly 63 seconds at a measured pace.**

### If you need seconds back

Cut these two. About three seconds each; losing both brings this to roughly 57.

- *"Real ones are twelve."* — the number lands without it
- *"Blank passes every check after it."*

---

# Delivery

- **Say "transaction ID", not "UTR". Say "the model", not "Gemini" or "the LLM."** The
  script avoids the jargon; don't put it back in on the day.
- **Don't read out text that's on screen.** Let people read it.
- **Slow down on the last beat.** Most people claim their thing works. Almost nobody
  finishes by showing you the case where theirs doesn't.
- **One take per beat is fine.** Nobody sees a cut on a talking head that holds still.
- **Then stop.** Don't summarise, don't thank anyone, don't say "and that's Golden Hour."
  Cut on the last word.
- **No music during the run.** The silence is the point.
- **Subtitles.** Most people watch without sound.

---

# If your run comes in over a minute

**Change the claim, not the data** — here, on the landing page, and in the 250 words. Say
the real number out loud.

A project that says "I claimed sixty seconds, measured it honestly, and it came in at
sixty-four" is telling a better story about its build than one that claimed sixty and got
it. That is this round's stated criterion, and it is the one place you can meet it that
nobody else can fake.
