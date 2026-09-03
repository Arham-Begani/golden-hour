# Submission — project summary

Paste-ready answers for the submission form. Word counts are for the 250-word cap.

---

## Project summary

**248 words.**

Golden Hour is a web app for the first hour after online financial fraud in India.

Today a victim is sent to cybercrime.gov.in, which asks them to pick a category, register,
and wait for an OTP — often while the scammer is still on the phone — then complete the
whole police complaint before it accepts anything.

Two jobs are merged into one form. A bank needs a handful of facts to freeze an account,
in minutes; an investigation needs everything else, over weeks. The government already
splits them on the phone — the 1930 helpline takes a short list of facts, issues an
acknowledgement number, and asks for the full complaint against it within 24 hours. The
website does not.

So Golden Hour sends the nine facts a bank needs first. You upload a screenshot of the
debit alert, a model extracts the fields, you correct what is wrong and send. No login, no
OTP, no required field — a freeze request is never blocked for being incomplete.

Two things make it trustworthy, not just fast. The model may not guess: every field is
re-validated server-side, anything failing is marked UNREADABLE rather than sent, and the
receipt names what was dropped. And if the extraction shows the scam is still running, the
flow stops and tells you to hang up.

The speed claim is measured from real runs, demo replays excluded. Where we could not
source a number, we deleted it — /evidence and /honesty say which.

---

## Before you paste

- **"we" in the last line** — switch to "I" if you are submitting solo.
- **The portal's field count is deliberately not stated.** An earlier draft said "around
  fifty fields", which nobody counted — and `data/portal-benchmark.json` and `/evidence`
  both refuse to guess that exact figure. Asserting it here while the evidence page
  declines to is the one contradiction a reviewer gets for free. Put a number back only
  after you have opened the portal and counted, and then put the same number on the
  landing page, in `data/portal-benchmark.json` and in the video.

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
