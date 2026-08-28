/**
 * Scenarios for the timed run at /judge.
 *
 * These are not the demo fixtures. The fixtures in `lib/fixtures.ts` carry a
 * cached model response so a demo works with no key and no network; using one
 * here would mean the judge's run replayed a recorded extraction and the
 * stopwatch measured reading speed.
 *
 * These are the raw inputs only. The judge reads the message off the screen the
 * way a user reads it off their own phone, types or pastes it into the real
 * intake, and the model reads it live. The run is a real run and is recorded as
 * one.
 *
 * Every string here is synthetic and was written for this file. The reference
 * numbers are the right *shape* so that `lib/validate.ts` accepts them rather
 * than downgrading everything to UNREADABLE — a run where every field is a hole
 * would not exercise the confirm step — but they belong to no real transaction,
 * and no VPA, phone number or account here resolves to a real person.
 */

export type JudgeScenario = {
  id: string;
  label: string;
  /** Why a judge should spend a run on this one. */
  purpose: string;
  /** What is "on the phone". Read, then typed or pasted into the intake. */
  text: string;
};

export const JUDGE_SCENARIOS: JudgeScenario[] = [
  {
    id: "bank-sms",
    label: "A bank SMS, four minutes ago",
    purpose:
      "The straight run. Everything a bank needs is in the message, so this is the fastest the product goes.",
    text: `Dear Customer, Rs.18,400.00 debited from A/c XX2298 on 28-08-26 at 21:47:11 to VPA quickpay.store42@examplebank (UPI Ref 481207336914). Not you? Call your bank. -Example Bank`,
  },
  {
    id: "partial-screenshot",
    label: "A half-remembered transfer",
    purpose:
      "No reference number anywhere. Shows that the packet dispatches with holes in it rather than blocking on a field nobody has.",
    text: `I sent 6,500 rupees about twenty minutes ago to someone who said they were from the delivery company and needed a refund verification. I did it from my phone's UPI app. I did not write down any reference number and the app has logged me out.`,
  },
  {
    id: "still-happening",
    label: "The scam is still running",
    purpose:
      "Trips the interrupt. The report stops, the stop instruction comes first, and there is still a way to continue.",
    text: `A man says he is a police officer and that there is a warrant against me. He is on the call with me now and told me not to hang up or tell my family because it is a confidential case. He made me install a screen sharing app so he could verify my bank account, and he is asking me to transfer 50,000 more to clear it.`,
  },
  {
    id: "six-days-old",
    label: "Six days old",
    purpose:
      "The meter reads six days and does not pretend to be urgent. The clearest evidence that the countdown is not theatre.",
    text: `On 22-08-26 at about 7pm I paid Rs.3,200.00 for a train ticket on a website that turned out to be fake. The payment reference was 902184773051. I only realised this week when the ticket never arrived.`,
  },
];
