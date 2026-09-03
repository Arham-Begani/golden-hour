import { FREEZE_FIELDS, type FreezePacket, type ReadField } from "./schema";
import { isMissingFreezeField } from "./validate";

/**
 * The wire format — what a beneficiary bank would actually be sent.
 *
 * This exists because the product's central claim is "a complete, dispatchable
 * freeze packet", and until now the packet was not a thing you could look at.
 * It lived as nine rows on a receipt and a Redis value shaped like the app's
 * internal state. "Dispatchable" was an assertion about an artefact nobody
 * could see, which is the pattern this project spends its time removing.
 *
 * So the payload is a real function with a real shape, rendered on the receipt.
 * Two properties matter more than the field list:
 *
 *  1. **The holes are in the format.** `unreadable` names every field that was
 *     not read, rather than omitting it or sending an empty string. A bank
 *     receiving this can tell the difference between "no UTR was captured" and
 *     "the UTR field is missing from this integration" — and a consumer that
 *     ignores the array still cannot mistake a hole for a value, because the
 *     field simply is not there.
 *  2. **It is not the internal state.** The triage signals, the model's
 *     confidence scores, the elapsed timing and the user's free-text
 *     description are all deliberately absent. They are ours, for the product
 *     and for the police statement; none of them is a bank's business, and
 *     shipping the whole stored object would be a privacy decision made by
 *     accident rather than on purpose.
 *
 * Nothing dispatches this. There is no bank integration and no CFCFRMS
 * connection; `dispatched` is a literal `false` in the payload and the receipt
 * says so beside it.
 */

/** Where the money went. A handle is a VPA, account number or phone number. */
type Beneficiary = {
  handle?: string;
  name?: string;
};

/** Where the money left from. Identified by institution, never by a handle. */
type Payer = {
  bank?: string;
  account_last4?: string;
};

export type BankPayload = {
  /** The prototype's own reference. Corresponds to nothing in any real system. */
  acknowledgement: string;
  raised_at: string;
  occurred_at: string | null;
  amount: string | null;
  currency: string | null;
  payment_rail: string | null;
  transaction_ref: string | null;
  utr_or_upi_ref: string | null;
  beneficiary: Beneficiary;
  payer: Payer;
  /** Every freeze field that could not be read. The holes, stated. */
  unreadable: string[];
  /** Which fields the person corrected by hand after seeing the model's read. */
  corrected_by_reporter: string[];
  source: "golden-hour-prototype";
  /** Always false. There is no integration to dispatch to. */
  dispatched: false;
};

/** The value of a freeze field, or null when it is a hole. */
function readable(packet: FreezePacket, key: (typeof FREEZE_FIELDS)[number]): string | null {
  const field = packet.extraction[key] as ReadField;
  return isMissingFreezeField(key, field) ? null : field.value;
}

/**
 * Project a stored packet into the payload a bank would receive.
 *
 * Pure, so the receipt renders exactly what a dispatcher would send rather than
 * a description of it.
 */
export function toBankPayload(packet: FreezePacket): BankPayload {
  const value = (key: (typeof FREEZE_FIELDS)[number]) => readable(packet, key);

  /**
   * Undefined rather than null inside the party objects, so `JSON.stringify`
   * drops the key entirely. A bank should see the field absent and find it in
   * `unreadable`; a null would render as a value-shaped blank.
   */
  const party = <T extends Record<string, string | undefined>>(fields: {
    [K in keyof T]: (typeof FREEZE_FIELDS)[number];
  }): T => {
    const out = {} as T;
    for (const [prop, key] of Object.entries(fields) as [keyof T, (typeof FREEZE_FIELDS)[number]][]) {
      const read = value(key);
      if (read !== null) out[prop] = read as T[keyof T];
    }
    return out;
  };

  return {
    acknowledgement: packet.ack,
    raised_at: packet.created_at,
    occurred_at: value("occurred_at"),
    amount: value("amount"),
    // Currency is not a freeze field but a bank cannot read an amount without it.
    currency: packet.extraction.currency?.value === "UNREADABLE"
      ? null
      : (packet.extraction.currency?.value ?? null),
    payment_rail: value("payment_rail"),
    transaction_ref: value("transaction_ref"),
    utr_or_upi_ref: value("utr_or_upi_ref"),
    beneficiary: party<Beneficiary>({
      handle: "beneficiary_handle",
      name: "beneficiary_name",
    }),
    // The payer is identified by institution and masked account, never by a
    // handle: this side of the transaction belongs to the person reporting, and
    // the bank receiving the packet is not owed more of it than that.
    payer: party<Payer>({ bank: "victim_bank", account_last4: "source_account_last4" }),
    unreadable: FREEZE_FIELDS.filter((key) =>
      isMissingFreezeField(key, packet.extraction[key] as ReadField),
    ),
    corrected_by_reporter: packet.corrected,
    source: "golden-hour-prototype",
    dispatched: false,
  };
}
