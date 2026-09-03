import { describe, expect, it } from "vitest";
import { FREEZE_FIELDS, UNREADABLE, type ReadField } from "./schema";
import { emptyExtraction, isMissing, isMissingFreezeField, validateExtraction } from "./validate";

const field = (value: string, confidence = 0.95) => ({ value, confidence });

/** A well-formed extraction, so each test can vary exactly one thing. */
const good = () => ({
  amount: field("12500.00"),
  currency: field("INR"),
  transaction_ref: field("T2508241914ABCD"),
  utr_or_upi_ref: field("523612345678"),
  occurred_at: field(new Date(Date.now() - 10 * 60_000).toISOString()),
  beneficiary_handle: field("rahul.k@okaxis"),
  beneficiary_name: field("Rahul K"),
  victim_bank: field("HDFC Bank"),
  source_account_last4: field("4471"),
  payment_rail: field("UPI"),
  fraud_category: field("UPI_PAYMENT_FRAUD"),
  active_scam: {
    remote_access_app: { present: false, evidence: "" },
    screen_sharing: { present: false, evidence: "" },
    caller_on_line: { present: false, evidence: "" },
    verification_transfer_requested: { present: false, evidence: "" },
    told_to_tell_nobody: { present: false, evidence: "" },
    verdict: "ENDED",
  },
  summary: "Paid 12500 to a UPI handle after a fake delivery call.",
});

const reasonFor = (downgrades: { field: string; reason: string }[], key: string) =>
  downgrades.find((d) => d.field === key)?.reason;

describe("validateExtraction — clean input", () => {
  it("passes well-formed fields through untouched", () => {
    const { extraction, downgrades } = validateExtraction(good());

    expect(downgrades).toHaveLength(0);
    expect(extraction.utr_or_upi_ref.value).toBe("523612345678");
    expect(extraction.beneficiary_handle.value).toBe("rahul.k@okaxis");
    expect(extraction.amount.value).toBe("12500.00");
  });

  it("normalises without inventing characters", () => {
    const { extraction } = validateExtraction({
      ...good(),
      amount: field("₹12,500.00"),
      utr_or_upi_ref: field("5236 1234 5678"),
      source_account_last4: field("XXXX4471"),
      currency: field("inr"),
    });

    expect(extraction.amount.value).toBe("12500.00");
    expect(extraction.utr_or_upi_ref.value).toBe("523612345678");
    expect(extraction.source_account_last4.value).toBe("4471");
    expect(extraction.currency.value).toBe("INR");
  });
});

describe("validateExtraction — the anti-hallucination layer", () => {
  it("downgrades a wrong-shaped UTR even when the model was confident", () => {
    const { extraction, downgrades } = validateExtraction({
      ...good(),
      // Nine digits. Plausible-looking, and completely wrong.
      utr_or_upi_ref: field("523612345", 0.99),
    });

    expect(extraction.utr_or_upi_ref.value).toBe(UNREADABLE);
    expect(reasonFor(downgrades, "utr_or_upi_ref")).toBe("wrong_shape");
  });

  it("rejects a UTR containing letters in the wrong place", () => {
    const { extraction } = validateExtraction({
      ...good(),
      utr_or_upi_ref: field("52361234567X", 0.98),
    });
    expect(extraction.utr_or_upi_ref.value).toBe(UNREADABLE);
  });

  it("accepts a bank-prefixed NEFT/RTGS UTR", () => {
    const { extraction } = validateExtraction({
      ...good(),
      utr_or_upi_ref: field("SBIN523612345678"),
    });
    expect(extraction.utr_or_upi_ref.value).toBe("SBIN523612345678");
  });

  it("downgrades a low-confidence field the model was not sure about", () => {
    const { extraction, downgrades } = validateExtraction({
      ...good(),
      transaction_ref: field("T2508241914ABCD", 0.3),
    });

    expect(extraction.transaction_ref.value).toBe(UNREADABLE);
    expect(reasonFor(downgrades, "transaction_ref")).toBe("low_confidence");
  });

  it("never produces an empty string, which would pass validation silently", () => {
    const { extraction, downgrades } = validateExtraction({
      ...good(),
      beneficiary_handle: field("", 0.9),
    });

    expect(extraction.beneficiary_handle.value).toBe(UNREADABLE);
    expect(extraction.beneficiary_handle.value).not.toBe("");
    expect(reasonFor(downgrades, "beneficiary_handle")).toBe("empty");
  });

  it("believes the model when it says UNREADABLE, without logging a downgrade", () => {
    const { extraction, downgrades } = validateExtraction({
      ...good(),
      utr_or_upi_ref: field(UNREADABLE, 0.1),
    });

    expect(extraction.utr_or_upi_ref.value).toBe(UNREADABLE);
    expect(downgrades).toHaveLength(0);
  });

  it("rejects an impossible timestamp rather than trusting it", () => {
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    const ancient = new Date(Date.now() - 5 * 365 * 24 * 60 * 60_000).toISOString();

    expect(validateExtraction({ ...good(), occurred_at: field(future) }).extraction.occurred_at.value).toBe(UNREADABLE);
    expect(validateExtraction({ ...good(), occurred_at: field(ancient) }).extraction.occurred_at.value).toBe(UNREADABLE);
  });

  it("accepts an account number or a phone number as a beneficiary handle", () => {
    expect(
      validateExtraction({ ...good(), beneficiary_handle: field("50100234567890") }).extraction
        .beneficiary_handle.value,
    ).toBe("50100234567890");
    expect(
      validateExtraction({ ...good(), beneficiary_handle: field("9876543210") }).extraction
        .beneficiary_handle.value,
    ).toBe("9876543210");
  });

  it("rejects a handle that is neither VPA, account, nor phone", () => {
    const { extraction } = validateExtraction({
      ...good(),
      beneficiary_handle: field("the scammer", 0.9),
    });
    expect(extraction.beneficiary_handle.value).toBe(UNREADABLE);
  });

  it("falls back to a safe enum value instead of passing garbage through", () => {
    const { extraction } = validateExtraction({
      ...good(),
      payment_rail: field("BITCOIN"),
      fraud_category: field("SOMETHING_INVENTED"),
    });

    expect(extraction.payment_rail.value).toBe("UNKNOWN");
    expect(extraction.fraud_category.value).toBe("OTHER");
  });

  it("survives a completely malformed response without throwing", () => {
    const { extraction } = validateExtraction({ nonsense: true });

    expect(extraction.amount.value).toBe(UNREADABLE);
    expect(extraction.active_scam.verdict).toBe("UNCLEAR");
    expect(extraction.summary).toBe("");
  });
});

describe("validateExtraction — scam signals", () => {
  it("drops a signal asserted without a supporting quote", () => {
    const input = good();
    input.active_scam.remote_access_app = { present: true, evidence: "" };
    input.active_scam.verdict = "ACTIVE";

    const { extraction } = validateExtraction(input);
    expect(extraction.active_scam.remote_access_app.present).toBe(false);
  });

  it("keeps a signal that carries its evidence", () => {
    const input = good();
    input.active_scam.remote_access_app = {
      present: true,
      evidence: "they made me install AnyDesk",
    };
    input.active_scam.verdict = "ACTIVE";

    const { extraction } = validateExtraction(input);
    expect(extraction.active_scam.remote_access_app).toEqual({
      present: true,
      evidence: "they made me install AnyDesk",
    });
  });

  it("defaults an unrecognised verdict to UNCLEAR", () => {
    const input = { ...good(), active_scam: { ...good().active_scam, verdict: "MAYBE" } };
    expect(validateExtraction(input).extraction.active_scam.verdict).toBe("UNCLEAR");
  });
});

describe("isMissing", () => {
  it("treats UNREADABLE and blank alike as a hole", () => {
    expect(isMissing({ value: UNREADABLE, confidence: 0 })).toBe(true);
    expect(isMissing({ value: "  ", confidence: 1 })).toBe(true);
    expect(isMissing(undefined)).toBe(true);
    expect(isMissing({ value: "523612345678", confidence: 0.9 })).toBe(false);
  });
});

/**
 * The count the receipt shows, on the packet that has nothing in it.
 *
 * `isMissing` alone reported 1 of 9 sent for a completely empty report,
 * because an unread payment rail is stored as "UNKNOWN" rather than
 * UNREADABLE — the enum has no sentinel, so the placeholder looked like a
 * value. On the screen whose argument is that it counts its holes honestly,
 * the count was the generous one.
 */
describe("isMissingFreezeField", () => {
  it("treats every field of an empty extraction as a hole", () => {
    const blank = emptyExtraction();
    const present = FREEZE_FIELDS.filter(
      (key) => !isMissingFreezeField(key, blank[key] as ReadField),
    );
    expect(present, "an empty packet must report 0 of 9 fields sent").toEqual([]);
  });

  it("still counts a real payment rail as present", () => {
    expect(isMissingFreezeField("payment_rail", { value: "UPI", confidence: 0.9 })).toBe(false);
  });

  it("counts the enum placeholders as holes", () => {
    expect(isMissingFreezeField("payment_rail", { value: "UNKNOWN", confidence: 0.2 })).toBe(true);
    expect(isMissingFreezeField("fraud_category", { value: "OTHER", confidence: 0.2 })).toBe(true);
  });

  it("does not apply an enum placeholder rule to free-text fields", () => {
    // "OTHER" is a placeholder for fraud_category and an ordinary string here.
    expect(isMissingFreezeField("beneficiary_name", { value: "OTHER", confidence: 0.9 })).toBe(
      false,
    );
  });
});
