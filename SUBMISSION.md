# Submission — project summary

Paste-ready answers for the submission form. Word counts are for the 250-word cap.

---

## Project summary

**248 words.**

Golden Hour is a web app for the first hour after online financial fraud in India.

Today a victim is sent to cybercrime.gov.in, which asks them to pick a category, register,
and wait for an OTP — often while the scammer is still on the phone — then complete the
police complaint before it accepts anything.

Two jobs are merged into one form. A bank needs a handful of facts to freeze an account, in
minutes; an investigation needs everything else, over weeks. The government already splits
them: the 1930 helpline takes a short list, issues an acknowledgement number, and asks for
the full complaint within 24 hours. The website does not.

So Golden Hour sends the nine facts a bank needs first. You upload a screenshot of the debit
alert, a model extracts the fields, you correct what is wrong and send. No login, no OTP, no
required field — a freeze request is never blocked for being incomplete.

The model may not guess. Every field is re-validated server-side; anything that fails is
marked UNREADABLE rather than sent, and the receipt names it. Across 75 fields it was right
74 times, inventing nothing from a screenshot. The miss: a dictated handle came back as a
different, well-formed account. Shape checks cannot catch that; /honesty says so.

If the extraction shows the scam is still running, the flow stops and says to hang up.

Timings are published with their sample size. Where I could not source a number, I deleted
it.

---

## Before you paste

- **"I" throughout** — switch to "we" if you are submitting with a teammate. Every other
  document in the repository (`BUILD_LOG.md`, `DECISIONS.md`, `MENTORS.md`) is written in
  the first person singular, so this matches them by default.
- **The portal's field count is still deliberately absent.** An earlier draft said "around
  fifty fields", which nobody counted, and it has been removed from here, the landing page
  and the video script. `data/portal-benchmark.json` and `/evidence` both refuse to guess
  it. Put a number back only after you have opened the portal and counted — and then put the
  same number in all four places at once.
- **Check the last line against the live site before pasting.** It says timings are
  published with their sample size, which is true at any count; but if `/api/timings` still
  reports fewer than five real runs on submission day, the front page will be showing a
  caveat rather than a median, and you should know that before a judge tells you.
- **The 74-of-75 figure is the worst of three passes**, not the best. If you re-run
  `npm run eval:extract --repeat 3` before submitting and it moves, change the number here
  to whatever the new worst pass says.

---

## Consumer test login credentials

Not required — the project has no login. Every screen, including the full reporting flow,
is reachable without an account. This is deliberate: the existing portal makes victims
register and wait for an OTP before it accepts anything, often while the scammer is still
on the phone, and removing that step is central to the project. Reviewers wanting a guided
run can open `/judge` — a scenario, a stopwatch, and the live product on one screen, no
setup. `/changes` lists what was fixed since Round 1, and what is still open.

Short version, if the field is cramped:

> Not required — no login. All screens are public.
