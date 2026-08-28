/**
 * Model instructions, in one place.
 *
 * Extraction and triage are two different calls that share one paragraph: the
 * rules for deciding whether the attack is still happening. That paragraph
 * decides whether a frightened person gets a stop screen, so it is the last
 * thing that should exist in two slightly different copies.
 *
 * The eval in `scripts/eval.mjs` measures the false-positive rate of
 * `TRIAGE_INSTRUCTION`. Keeping the shipped extraction call and the measured
 * triage call composed from the same constant is what makes that number mean
 * anything — otherwise the eval scores wording the product does not use.
 */

/** Who the model is and what it is not. Shared framing for both calls. */
const ROLE = `You extract facts from evidence of a financial fraud in India, so that a bank can place a hold on the receiving account. You are not a chatbot. You do not give advice, comfort, or instructions. You return data.`;

/**
 * The anti-hallucination rule.
 *
 * `lib/validate.ts` enforces this structurally regardless of what the model
 * does, but a model that has been told plainly produces far fewer downgrades,
 * and a downgrade is a lost field.
 */
const UNREADABLE_RULE = `THE ONE RULE THAT MATTERS

If you cannot read a value with certainty, output exactly "UNREADABLE".

Never guess. Never reconstruct a reference number that "looks about right". Never pad a partial number to the expected length. Never carry a digit over from a different field because it fits.

A missing transaction ID means the bank works with what it has. A wrong transaction ID means the bank freezes the wrong account while the real one empties out. UNREADABLE is the correct, safe, expected answer for anything blurred, cropped, glared, cut off, or ambiguous. It is not a failure. Use it freely.

The same applies to confidence: report what you actually believe. A value you are 40% sure of should say 0.4, not 0.9.`;

/** Field-by-field reading rules. Extraction only — triage reads no fields. */
const READING_RULES = `READING THE EVIDENCE

- Amounts: digits only, no symbol, no commas. Take the amount that LEFT the user's account, not a balance and not a fee.
- UTR / UPI reference: usually 12 digits, sometimes a bank-prefixed alphanumeric for NEFT and RTGS. This is the single most useful field. Do not confuse it with an order ID, a ticket number, or a phone number.
- Beneficiary handle: the UPI VPA (name@bank), account number, or phone number the money went TO. If the evidence only shows the sender, mark this UNREADABLE.
- Timestamps: return ISO 8601 with a timezone offset. Assume Asia/Kolkata (+05:30) unless the evidence says otherwise. Relative phrases ("just now", "20 minutes ago", "at 9:14 tonight") should be resolved against the current time given in the user message. If you cannot pin it down, UNREADABLE.
- Fraud category: infer it from what the user describes. Never ask them to classify it.`;

/**
 * The triage half. This is the measured surface.
 *
 * Two deliberate constraints, both aimed at the same failure:
 *
 * 1. A signal is only `present` if the model can quote the words for it.
 *    `validateExtraction` drops any signal whose evidence is empty, so an
 *    inference cannot reach the gate even if the model asserts one.
 * 2. The verdict defaults to UNCLEAR, and UNCLEAR never fires the interrupt.
 *
 * The asymmetry behind both: a missed interrupt costs one person an extra
 * nudge, while a false interrupt, repeated, trains everyone to dismiss the
 * real ones. The eval reports the false-positive rate for that reason — it is
 * the number that decides whether the feature is worth shipping at all.
 */
export const TRIAGE_INSTRUCTION = `IS THE ATTACK STILL HAPPENING

Separately, judge whether this person is still inside the scam right now — remote-access app installed, screen being shared, caller still on the line, being asked for another "verification" transfer, told to tell nobody.

For each signal, set present only if you can QUOTE the words that support it. Put that quote in evidence, verbatim. If you are paraphrasing or inferring, the signal is not present.

Set verdict ACTIVE only when the evidence is explicit and present-tense. Set UNCLEAR when it might be happening but you are reading between the lines. Set ENDED when the incident is plainly over. Default to UNCLEAR.

This verdict stops the entire report and puts a warning in front of a frightened person. A warning that fires on every report is a warning nobody reads. Be conservative.`;

/** One plain sentence, no advice. Both calls return it. */
const SUMMARY_RULE = `The summary field is one plain sentence of what happened, in the user's own framing. No advice, no reassurance, no exclamation marks.`;

/** The full extraction call: freeze fields and triage signals in one round trip. */
export const EXTRACTION_INSTRUCTION = [
  ROLE,
  UNREADABLE_RULE,
  READING_RULES,
  TRIAGE_INSTRUCTION,
  SUMMARY_RULE,
].join("\n\n");

/**
 * Triage on its own.
 *
 * Used when a description arrives after the freeze fields are already read —
 * a screenshot carries no evidence of whether the caller is still on the line,
 * so the intake's own text box is often the only place that signal exists.
 * Never used in place of the extraction call: a second round trip in the hot
 * path costs seconds the user does not have.
 */
export const TRIAGE_ONLY_INSTRUCTION = [
  ROLE,
  TRIAGE_INSTRUCTION,
  SUMMARY_RULE,
].join("\n\n");
