"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANGS, LANG_CODE, LANG_LABEL } from "@/lib/i18n";
import { useJourney } from "./JourneyProvider";

/**
 * The only chrome on the site.
 *
 * The header stays deliberately thin — brand, the claim, the language toggle —
 * because the report screens below it are the product and a navigation bar
 * would be furniture on a screen where seconds are the unit. What it does carry
 * is the thing that must never be ambiguous: this is a prototype, and it is not
 * a government service.
 *
 * The footer is new, and it is for the reader rather than the reporter: someone
 * who lands on a deep link needs a way back to the explanation, and the real
 * routes belong on every page and not only on the receipt.
 *
 * It is suppressed on /interrupt. That screen is allowed exactly three things —
 * the stop instruction, tell one person, and a way to continue — and a row of
 * links under "turn your phone off" is the kind of thing that gets tapped by
 * accident at the worst possible moment.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const { lang, setLang, copy } = useJourney();
  const pathname = usePathname();

  const interrupted = pathname === "/interrupt";

  /**
   * /judge pins its own prototype notice to the bottom of the viewport, where
   * it cannot be scrolled past. Rendering this one as well puts the same
   * sentence on screen twice — three times once the framed product draws its
   * own copy inside the frame — which is how a disclosure stops being read.
   *
   * The frame's own copy is deliberately left alone. The harness's claim is
   * that it times the shipped product unmodified, and teaching a product
   * screen to render differently when it is being watched would cost more
   * than the duplication does.
   */
  const pinsOwnNotice = pathname === "/judge";

  return (
    // overflow-x-clip is a backstop, not the fix: a long word or a wide table
    // must never make the whole page scroll sideways on a 360px screen.
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col overflow-x-clip px-4 pb-10 sm:px-6">
      <header className="mb-4 flex min-w-0 items-center justify-between gap-2 border-b border-line py-3">
        <Link
          href="/"
          className="flex min-h-11 min-w-0 items-center gap-2 text-base font-semibold tracking-tight text-text no-underline"
        >
          {/* The one mark on the site, and it is the clock. Amber is rationed
              to the meter and this — the thing the product is named after. */}
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-mark" />
          <span className="truncate">{copy.brand}</span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/evidence"
            className="flex min-h-11 items-center text-xs text-muted underline underline-offset-2 transition-colors hover:text-text"
          >
            {copy.evidence.nav}
          </Link>

          <div
            className="flex overflow-hidden rounded-md border border-line"
            role="group"
            aria-label="Language"
          >
            {LANGS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLang(option)}
                aria-pressed={lang === option}
                aria-label={LANG_LABEL[option]}
                className={`min-h-11 px-3 text-sm transition-colors ${
                  lang === option
                    ? "bg-raised text-text"
                    : "text-muted hover:bg-surface hover:text-text"
                }`}
              >
                {LANG_CODE[option]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stated in the chrome, on every screen. Never only in a README. */}
      {!pinsOwnNotice && (
        <p className="mb-5 rounded-lg border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
          {copy.prototype.full}
        </p>
      )}

      {/* A product about not being misled should say which of its own copy is
          unverified. Shown in Hindi only, because that is the copy it is about. */}
      {lang === "hi" && (
        <p className="mb-5 rounded-lg border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
          {copy.prototype.hindiUnreviewed}
        </p>
      )}

      <main className="flex-1">{children}</main>

      {!interrupted && (
        <footer className="mt-12 border-t border-line pt-5 text-xs text-faint">
          <nav className="flex flex-wrap items-center gap-x-4">
            <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-text">
              {copy.footer.what}
            </Link>
            <Link href="/start" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-text">
              {copy.nav.start}
            </Link>
            <Link href="/evidence" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-text">
              {copy.evidence.nav}
            </Link>
            {/* The honesty page was previously reachable only by typing the
                URL. A disclosure nobody can navigate to is not a disclosure. */}
            <Link href="/honesty" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-text">
              {copy.nav.honesty}
            </Link>
            <Link href="/judge" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-text">
              {copy.nav.judge}
            </Link>
            <Link href="/changes" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-text">
              {copy.nav.changes}
            </Link>
            {/* The real routes, reachable from any screen and not only the
                receipt. This is the half of the footer that is not decoration. */}
            <a href="tel:1930" className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-text">
              {copy.receipt.call}
            </a>
            <a
              href="https://cybercrime.gov.in"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center underline underline-offset-2 transition-colors hover:text-text"
            >
              {copy.receipt.portal}
            </a>
          </nav>
          <p className="mt-3">{copy.prototype.short}</p>
        </footer>
      )}
    </div>
  );
}
