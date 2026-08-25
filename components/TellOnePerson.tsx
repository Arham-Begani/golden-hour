"use client";

import { useCallback, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

/**
 * The isolation-breaking primitive.
 *
 * A defining feature of the digital-arrest and impersonation scams now
 * dominating Indian cyber fraud is that the fraudster instructs the victim to
 * tell nobody: this is a confidential investigation, discussing it is itself an
 * offence, stay on the call. What breaks the spell, overwhelmingly, is contact
 * with one other person.
 *
 * So this is one tap, one contact, message already written. It is the single
 * feature here that treats the scam as a social attack rather than a financial
 * event, and it must never require typing.
 */
export function TellOnePerson({ lang }: { lang: Lang }) {
  const copy = t(lang).interrupt;
  const [copied, setCopied] = useState(false);

  const message = copy.message;
  const encoded = encodeURIComponent(message);

  const share = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        // Dismissed the sheet, or the browser refused. Fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [message]);

  return (
    <section className="rounded-xl border border-danger bg-danger-dim/40 p-4 sm:p-5">
      <h2 className="text-xl font-semibold">{copy.tellHeading}</h2>
      <p className="mt-1 text-sm leading-relaxed">{copy.tellBody}</p>

      <p className="mt-3 rounded-lg border border-line bg-ink px-3 py-2 text-sm text-muted">
        {message}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="btn-primary"
        >
          {copied ? copy.tellCopied : copy.tellButton}
        </button>

        <div className="flex gap-2">
          {/* Deep links, for when the share sheet is unavailable. Both open a
              composer with the message already in it — still no typing. */}
          <a
            href={`sms:?&body=${encoded}`}
            className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-line bg-raised px-3 text-center text-sm no-underline"
          >
            {copy.tellSms}
          </a>
          <a
            href={`https://wa.me/?text=${encoded}`}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 flex-1 items-center justify-center rounded-lg border border-line bg-raised px-3 text-center text-sm no-underline"
          >
            {copy.tellWhatsapp}
          </a>
        </div>
      </div>
    </section>
  );
}
