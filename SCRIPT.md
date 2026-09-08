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

### Over Clip A — the portal · ~10 seconds

> Nine fourteen at night. The money's gone, and by nine sixteen they know.
>
> This is where they're sent. Pick a category. Register. Wait for an OTP.

**— cut to the run. Keep talking over it. —**

> On the same phone the scammer may still be calling.
>
> A bank needs a handful of facts to freeze the account. This wants the whole police
> complaint first.
>
> So — the bank's half, first.

**— silence. Let the screenshot go in. —**

> A screenshot of the debit alert. That's the whole first step.

**— silence, about 6 seconds —**

> Nine fields. None of them required.

**— silence, about 5 seconds —**

> And this isn't my idea. The helpline already works this way — short list,
> acknowledgement number, full complaint within twenty-four hours. Just not the website.

**— silence until the receipt appears —**

> Acknowledgement number. Time taken, on screen. Six of nine — and it names the three
> it's missing.

**133 words · roughly 48 seconds of speech**, spread across the whole minute. Only the
first 27 words play over Clip A; everything else rides over the run, in the gaps.

### What changed, and why

**Clip A shrank from ~25 seconds of narration to ~10.** The old opening put four
paragraphs over a clip specified as eight seconds long. It never fitted, and with `R`
now larger it pushed the whole video past 2:15. The problem statement is now two
sentences and the rest of the argument moved onto the run — which was sitting in silence
with budget to spare.

**The 1930 line is new, and it is the most valuable sentence in the minute.** The first
objection any judge has to this project is *who are you to redesign a government portal.*
The answer is that the government already runs this exact sequence on the phone and simply
never brought it to the web — it is on `/evidence` under "The sequence already exists" and
it was nowhere in the video. It costs eleven seconds of dead air that was already dead.

> **If you are asked to source it:** the MHA/I4C instruction sheet for reporting financial
> cyber fraud through 1930 — short list of facts, system-generated acknowledgement number,
> full complaint on cybercrime.gov.in within 24 hours. The PDF is marked "For Delhi Only",
> which is a limit of that document rather than of the argument. Say *"the helpline already
> works this way"*, which is what the document supports. Don't upgrade it to "the
> government mandates this nationally."

**"Nine fourteen", not "9:14".** You are reading it aloud; write it the way you say it.

**"A handful of facts", not "nine facts".** Nine is *this product's* count of freeze
fields. What a bank actually requires is not a number anyone here has counted, and the
README makes that distinction explicitly. Don't collapse it on camera.

### The one number you do not choose

**"Six of nine" depends on your screenshot, and the receipt prints the real figure.** Do
your run, look at the receipt, say *that*. If it reads "8 of 9 fields", say eight and one.
If it reads nine of nine, say:

> all nine — and when it can't read one, it says so instead of guessing

which sets up minute two anyway. Narrating a number the screen contradicts is the single
easiest way to lose the credit this whole project is built to earn.

---

# Record it in your own voice

Not a synthetic one, and the reason is not sentiment.

- **Minute two is your face and your voice.** A generated minute one puts a seam right
  down the middle of a two-minute video, and it is audible.
- **This project deleted a statistic it could not source and publishes its own failures.**
  Narrating that with a synthetic voice is a contradiction a sharp judge will enjoy
  pointing out, and it costs more than a clean read gains.
- **The round is scored on how clearly you tell the story of your build.** That is a person
  talking.

### The timing is easier than it looks

The worry is real and the fix is in the order you record, which is why minute one says
*voice first*:

1. **Record the voice alone.** No video, no pressure, as many takes as you want. It is
   about 48 seconds of speech — a cheap thing to redo.
2. **Do the run separately**, one unbroken take, and don't narrate while filming it.
3. **Lay the run under the voice** and stretch or trim the silences until they meet.

You are never performing to a stopwatch. The only fixed duration in the whole video is the
run itself, and that one is fixed on purpose.

**An accent is not a defect.** A slightly imperfect real voice reads as a person who built
something. A flawless synthetic one reads as a person who did not want to be heard.

---

# MINUTE TWO — one feature, told as a story

**Straight to camera.** Know the five beats and say the rest in your own words. Reading to
camera is obvious and costs more than a perfect sentence gains.

The arc: *here is the feature → asking a model is not the same as guaranteeing, and mine
proved it → here is what I built instead → here is why the stakes are asymmetric → here is
where it still fails.* The last beat is the one that will be remembered.

> The one feature I want to show you is what happens when the model gets it wrong.
>
> Ask a model to say "unreadable" when it can't read something and it usually will. That's
> a request, not a guarantee. Mine handed back a transaction reference — eleven digits,
> ninety-three percent confident. Real ones are twelve.
>
> So nothing the model reads is trusted. The server checks every field's shape again and
> refuses anything that doesn't fit, however confident the model was. A refused field comes
> back as "unreadable", never blank — blank passes every check after it.
>
> The stakes aren't symmetric. A missing transaction ID means the bank works with what it
> has. A wrong one means the bank freezes the wrong account while the real one empties.
>
> Then I measured it. Seventy-five fields, seventy-four right. From screenshots, forty out
> of forty, nothing invented.
>
> One escaped. Someone dictating said "fastcart dot pay at samplebank", and the model wrote
> a different account — a perfectly well-formed one. Shape checking can't catch that. So
> it's on the honesty page.

**177 words · roughly 62 seconds at a measured pace.**

### Why this does not open on anyone else

It used to start *"Everyone this round used a model to fill in a form. So did I. What's
different is what happens when it's wrong."*

Two things wrong with that, and the tone is the smaller one. It is **a claim about 249
projects nobody has opened** — the same defect as "about fifty facts", said out loud in the
one place there is no footnote to qualify it. And it spends the opening seconds on other
people's work when the brief asked about yours.

The replacement motivates the feature with **your own model failing**, which is stronger
and costs nothing: the eleven-digit reference is a thing that actually happened in this
build, not a guess about somebody else's. Nothing else in the minute changed.

### If you need seconds back

Cut these two. About three seconds each; losing both brings this to roughly 56.

- *"Real ones are twelve."* — the number lands without it
- *"— blank passes every check after it."*

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
