# Golden Hour

**A rebuild of India's National Cyber Crime Reporting Portal, designed around the one hour that decides whether the money comes back.**

---

## 1. The problem

Someone in India loses money to a UPI scam at 9:14 PM. By 9:16 they know. What happens in the next hour determines almost everything about whether they ever see that money again — and almost nothing about the next hour is designed for them.

They go to cybercrime.gov.in. They are asked to choose a complaint category before they know what happened to them. They are asked to register an account. They wait for an OTP on the same phone that a scammer may still be talking to them on. They log in. They are presented with a form that asks for the incident date, the incident time, whether it was reported elsewhere, the suspect's details, the delay reason if any, a description in 200+ characters, supporting documents, their own full identity, their address, their relationship to the victim, and dozens of fields more — all before anything is submitted, and therefore before anything can be sent to a bank.

Meanwhile the money is moving. It has already been split across two mule accounts and is on its way to a third.

By the time they finish the form, the hour that mattered is gone.

## 2. The golden hour is not a metaphor

The recovery curve for cyber fraud in India is brutally steep and well documented:

- Reported within **60 minutes** — roughly **50%** of funds recovered
- Reported within **24 hours** — roughly **10%**
- Reported after **7 days** — roughly **2%**

The mechanism behind that curve is specific. When a complaint is logged into the Citizen Financial Cyber Fraud Reporting and Management System (CFCFRMS), an alert propagates to the beneficiary bank, which can place a hold on the account before the balance is withdrawn or layered onward. The freeze is the entire game. Everything else — the FIR, the investigation, the suspect details — happens on a timescale of weeks and is not what recovers money.

So there are two clocks running in a fraud report, and they could not be more different:

| | The bank's clock | The investigation's clock |
|---|---|---|
| Deadline | Minutes | Weeks |
| Needs | Transaction ID, UTR/UPI ref, amount, timestamp, beneficiary handle | Everything else |
| Consequence of delay | Money is unrecoverable | Case is slower |

**The portal collapses both clocks into a single form, and paces the whole thing at the speed of the slower one.**

That is the entire problem, and it is an information-architecture problem, not a technology problem. Nothing about the current portal is broken. It is working exactly as designed. It was simply designed as an intake form for a police case, and then asked to also be an emergency stop button, and no one re-sequenced it when that second job arrived.

## 3. The second thing the portal gets wrong about its user

Every field on the form assumes the person filling it is calm, alone, and finished being defrauded.

None of those are usually true.

They are not calm. They have just lost money, often money they cannot lose, and cognitive load research on acute financial stress is unambiguous about what that does to a person's ability to work through a long structured form. Asking someone in that state to correctly classify their own fraud into one of a dozen bureaucratic categories, on the first screen, before anything else, is asking for the one thing they are least able to give.

They are not alone in the relevant sense — they are isolated, which is worse. A defining feature of the "digital arrest" and impersonation scams now dominating Indian cyber fraud is that the fraudster explicitly instructs the victim to tell nobody: this is a confidential investigation, discussing it is itself an offence, stay on the call. Victims have stayed on these calls for hours and in some cases days. What breaks the spell, overwhelmingly, is contact with one other human being — a family member, a bank manager, a colleague who walks past. Isolation is the scam's load-bearing structure.

And they are frequently **not finished being defrauded**. A meaningful share of people who reach a reporting portal are still inside the scam: the remote-access app is still installed, the screen is still shared, the caller is still on the line telling them the next transfer will resolve everything. The portal treats every report as a post-mortem. Some of them are hostage situations in progress.

A reporting tool that ignores all three of these is not neutral. It is optimised for a user who does not exist.

## 4. The idea

**Golden Hour splits the report in two and sends the urgent half first.**

The freeze packet — the small set of facts a bank needs to place a hold — is assembled, confirmed, and dispatched as step one, in under a minute. The police statement is collected afterwards, unhurried, from a person who is no longer racing a clock they didn't know was running.

That is the whole reframe. One form becomes two, ordered by consequence rather than by bureaucratic convention.

Everything else in the product falls out of that decision.

### 4.1 The intake

There is no landing page. No hero, no explanation of what the site is, no category picker. The first screen is the intake, and a clock is already running on it.

The user does one of three things, whichever is fastest for them:

- Upload a screenshot of the transaction — the UPI app confirmation, the bank SMS, the debit notification
- Paste the SMS text
- Type or dictate a single sentence about what happened

A vision-capable model reads whatever it is given and extracts the freeze-relevant fields: transaction reference, UTR or UPI ref, amount, timestamp, beneficiary handle, payment rail. It also infers the fraud category, which means the user never has to classify their own trauma into a dropdown — the thing the current portal demands first, this product never asks at all.

The extracted fields are shown back, editable, with per-field confidence. The user corrects what's wrong. That is the entire first step.

### 4.2 UNREADABLE is a value, not an error

If the screenshot is blurred, cropped, or the transaction ID is genuinely illegible, the field reads `UNREADABLE`. Not a guess, not a plausible-looking reconstruction, not an empty string that silently passes validation.

This matters more than it sounds. A hallucinated transaction ID in a freeze request is worse than a missing one: a missing field means the bank works with what it has, while a wrong field means the bank chases the wrong account and the real one empties out. The failure mode of a confident model in this specific context is not embarrassment, it is money.

So the system dispatches packets with holes in them and says so, and a partial packet sent at 60 seconds beats a complete one sent at fourteen minutes. Half the fields, on time, is the correct answer.

### 4.3 The freeze packet

Once the fields are confirmed, one action: **Send freeze request.**

An acknowledgement number is issued immediately. This is the moment the product is built around and the moment the user's stress should drop. Everything before it is compressed to the minimum; everything after it is allowed to breathe.

### 4.4 The decay meter

One element on the page moves. Everything else is completely still.

The meter shows the current recovery probability, computed from the timestamp of the fraud the user just entered — not from when the page loaded — and it visibly falls while they work. It is sourced inline, with the citation next to it, so it reads as a fact rather than a pressure tactic.

It does two jobs. It tells the user, honestly, what is at stake in a way no progress bar can. And it makes the product's argument legible in five seconds to anyone who looks at it, including someone who has never used the portal.

The risk of a decaying counter is that it becomes dark-pattern urgency theatre. The defence is that the number is real, cited, and derived from the user's own timestamp. If they were defrauded six days ago, the meter shows 2% and does not pretend otherwise. It never manufactures urgency that isn't there — which is exactly what separates it from a manipulation.

### 4.5 The interrupt

If the description indicates the scam is still in progress — a remote-access app was installed, the screen is being shared, the caller is still on the line, a "verification transfer" is being requested — the flow stops.

Three things, nothing else:

1. **The specific stop instruction** for what's actually happening. Remote access installed → power the device off. Still on the call → hang up, do not verify anything, they will call back and that is expected. Screen shared → disconnect now.
2. **"Tell one person now."** One tap, one contact, message pre-written. This is the isolation-breaking primitive, and it is the single feature here that treats the scam as a social attack rather than a financial event.
3. **A way to continue.** The interrupt must never trap the user.

The classifier has to be conservative. A warning that fires on every report is a warning nobody reads, so ambiguous cases do not fire it — the cost of a missed interrupt is one user who doesn't get an extra nudge, while the cost of a false interrupt, repeated, is that the real ones get dismissed.

### 4.6 The second half

Only after the acknowledgement number exists does the product ask for the statement, the identity details, the suspect information, the supporting documents. Same information the current portal wants — different position in the sequence, and asked of a person whose emergency has already been handled.

## 5. Why the design looks the way it does

Every visual decision is downstream of "this person is stressed and possibly still under attack."

**No landing page.** Explaining the product costs time the user doesn't have. If they're here, they already know why.

**One moving element.** Under acute stress, attention narrows. Give it exactly one thing to land on and make it the thing that matters.

**Plain, imperative copy.** No apology, no reassurance theatre, no exclamation marks. Errors say what happened and what to do. A stressed reader does not parse hedging.

**Large type, high contrast, works at 360px on a throttled connection.** Fraud does not preferentially target people with good phones and fast internet. It does the opposite.

**Never a login.** An OTP is a delay, and worse, on a compromised phone with a screen-sharing session running, it is a live security hazard. The report is not gated behind proving who you are; identity is collected afterwards, in the unhurried half.

## 6. What this deliberately does not do

- It does not replace the 1930 helpline. 1930 is faster than any web form for people who can reach an operator; this is for the enormous number who can't get through, or who are told to file online anyway, or who reach for a browser first at 2 AM.
- It does not build a police or admin view. The whole claim is about the citizen's sixty seconds.
- It does not do multi-service, multi-fraud-type breadth. One journey, done properly.
- It does not detect or accuse anyone of fraud. It records what the user reports.

## 7. What it does not claim

**It does not claim to freeze anyone's money.** There is no bank integration and no CFCFRMS connection. What it claims is narrower and fully demonstrable: *a complete, dispatchable freeze packet in under sixty seconds*, measured against the same task on the live portal.

That distinction is the difference between a defensible claim and a bluff, and it is stated on the product itself, not buried in a README.

## 8. How this would actually work at scale

Nothing here requires new infrastructure. CFCFRMS already exists and already propagates alerts to beneficiary banks. The freeze fields are already collected — just at the end of a fourteen-minute form instead of the start of a sixty-second one.

What the real portal would need to adopt this is a re-sequencing: accept a minimal packet, issue an acknowledgement, propagate to the bank, and open the full statement as a follow-up against that acknowledgement number. The complaint record ends up identical. It simply arrives in two parts, and the part that has a deadline meets its deadline.

The model-driven extraction is the piece that makes the sixty seconds possible rather than merely shorter — without it, you have reordered a form; with it, a screenshot becomes a structured packet without the user typing a transaction ID they can barely read off a cracked screen at midnight.

## 9. The argument in one paragraph

India's cybercrime portal is a police intake form that has been asked to double as an emergency stop button, and it is paced like the former. The recovery curve says the first hour is worth twenty-five times the first week, and the bank needs five facts to act while the investigation needs fifty — so the five should not be trapped behind the fifty. Golden Hour separates them, uses a model to lift those five facts off a screenshot in seconds, refuses to invent any of them, and interrupts the report entirely if the scam is still happening. It is not a redesign of the portal. It is a re-sequencing of it, and the sequence is where the money is being lost.
