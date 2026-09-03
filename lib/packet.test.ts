import { describe, expect, it } from "vitest";
import { toBankPayload } from "./packet";
import { FIXTURES, materialiseFixture } from "./fixtures";
import { validateExtraction } from "./validate";
import { FreezePacketSchema, type FreezePacket } from "./schema";

/**
 * The payload is the artefact behind the word "dispatchable". These pin the two
 * properties that make it honest rather than merely present.
 */

function packetFor(fixtureId: string): FreezePacket {
  const fixture = FIXTURES.find((f) => f.id === fixtureId)!;
  const { extraction } = validateExtraction(materialiseFixture(fixture));
  return FreezePacketSchema.parse({
    ack: "GH-TEST-TEST",
    created_at: new Date().toISOString(),
    occurred_at: extraction.occurred_at.value,
    extraction,
    corrected: [],
  });
}

describe("toBankPayload", () => {
  it("names every hole rather than sending it as a blank", () => {
    const payload = toBankPayload(packetFor("misread-reference"));

    // The refused eleven-digit reference is a hole, and it is named as one.
    expect(payload.utr_or_upi_ref).toBeNull();
    expect(payload.unreadable).toContain("utr_or_upi_ref");
  });

  it("omits unread party fields entirely rather than serialising a blank", () => {
    // A null would render as a value-shaped empty; absence plus `unreadable` cannot
    // be mistaken for one. This is the difference the whole product argues about.
    const json = JSON.parse(JSON.stringify(toBankPayload(packetFor("blurred"))));
    expect(json.beneficiary).not.toHaveProperty("handle");
    expect(json.unreadable).toContain("beneficiary_handle");
  });

  it("carries the readable values through", () => {
    const payload = toBankPayload(packetFor("clean-sms"));
    expect(payload.amount).toBe("12500.00");
    expect(payload.utr_or_upi_ref).toBe("523612345678");
    expect(payload.beneficiary.handle).toBe("rahulk.9821@okaxis");
    expect(payload.unreadable).not.toContain("amount");
  });

  it("never leaks the triage signals, confidences or the reporter's description", () => {
    // These belong to the product and the police statement. A bank placing a hold
    // has no use for them, and shipping the whole stored object would be a privacy
    // decision made by accident.
    const json = JSON.stringify(toBankPayload(packetFor("digital-arrest")));
    expect(json).not.toContain("active_scam");
    expect(json).not.toContain("confidence");
    expect(json).not.toContain("summary");
    expect(json).not.toContain("description");
  });

  it("identifies the payer by institution, never by a handle", () => {
    const payload = toBankPayload(packetFor("clean-sms"));
    expect(payload.payer.bank).toBe("HDFC Bank");
    expect(payload.payer).not.toHaveProperty("handle");
  });

  it("says it was not dispatched, in the payload itself", () => {
    const payload = toBankPayload(packetFor("clean-sms"));
    expect(payload.dispatched).toBe(false);
    expect(payload.source).toBe("golden-hour-prototype");
  });
});
