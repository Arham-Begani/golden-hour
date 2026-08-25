"use client";

import Link from "next/link";
import { LANGS, LANG_CODE, LANG_LABEL } from "@/lib/i18n";
import { useJourney } from "./JourneyProvider";

/**
 * The only chrome on the site.
 *
 * No nav, no hero, no explanation of what this is. If someone is here they
 * already know why, and explaining costs time they do not have. What the
 * header does carry is the thing that must never be ambiguous: this is a
 * prototype, and it is not a government service.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const { lang, setLang, copy } = useJourney();

  return (
    // overflow-x-clip is a backstop, not the fix: a long word or a wide table
    // must never make the whole page scroll sideways on a 360px screen.
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col overflow-x-clip px-4 pb-10 sm:px-6">
      <header className="flex min-w-0 items-center justify-between gap-2 py-3">
        <Link
          href="/"
          className="truncate text-base font-semibold tracking-tight text-text no-underline"
        >
          {copy.brand}
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/evidence"
            className="text-xs text-muted underline underline-offset-2"
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
                className={`min-h-11 px-3 text-sm ${
                  lang === option ? "bg-raised text-text" : "text-muted"
                }`}
              >
                {LANG_CODE[option]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stated in the chrome, on every screen. Never only in a README. */}
      <p className="mb-4 rounded-md border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-muted">
        {copy.prototype.full}
      </p>

      <main className="flex-1">{children}</main>
    </div>
  );
}
