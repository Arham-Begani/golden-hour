"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { t, type Lang } from "@/lib/i18n";
import type { InterruptDecision } from "@/lib/interrupt";
import type { Extraction } from "@/lib/schema";
import type { Downgrade } from "@/lib/validate";

/**
 * The journey's state, held in the client for the length of one report.
 *
 * There is no login and nothing is written to the server until the freeze
 * packet is dispatched, so this lives in memory with a sessionStorage mirror
 * so a refresh doesn't cost the user their work. It is cleared the moment an
 * acknowledgement number exists.
 */

const STORAGE_KEY = "gh:journey";

export type JourneyState = {
  extraction: Extraction | null;
  downgrades: Downgrade[];
  interrupt: InterruptDecision | null;
  /** Fields the user corrected by hand after seeing the model's read. */
  corrected: string[];
  source: "model" | "fixture" | "manual" | null;
  interruptShown: boolean;
};

const EMPTY: JourneyState = {
  extraction: null,
  downgrades: [],
  interrupt: null,
  corrected: [],
  source: null,
  interruptShown: false,
};

type JourneyContext = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  copy: ReturnType<typeof t>;

  state: JourneyState;
  setState: (next: Partial<JourneyState>) => void;
  reset: () => void;

  /** Stamp the clock. Idempotent — only the first call counts. */
  markStart: () => void;
  /** Milliseconds since first interaction, or null if it hasn't happened. */
  elapsedMs: () => number | null;
};

const Context = createContext<JourneyContext | null>(null);

function readStored(): JourneyState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as JourneyState) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function JourneyProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [state, setFullState] = useState<JourneyState>(EMPTY);

  // sessionStorage is read after mount, not during render, so the server and
  // client produce the same first paint. This is the documented
  // browser-only-API-after-mount case, which is why the rule is waived here
  // rather than worked around.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setFullState(readStored()), []);

  const startedAt = useRef<number | null>(null);

  const markStart = useCallback(() => {
    // The clock starts when the user first does something, not when the page
    // loaded. Timing from page load would flatter the number.
    startedAt.current ??= Date.now();
  }, []);

  const elapsedMs = useCallback(
    () => (startedAt.current === null ? null : Date.now() - startedAt.current),
    [],
  );

  const setState = useCallback((next: Partial<JourneyState>) => {
    setFullState((current) => {
      const merged = { ...current, ...next };
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Private browsing, quota, whatever. In-memory state still works.
      }
      return merged;
    });
  }, []);

  const reset = useCallback(() => {
    startedAt.current = null;
    setFullState(EMPTY);
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clean up */
    }
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.lang = next;
    // A cookie so the server can render the right language on first paint.
    document.cookie = `gh_lang=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  // The clock is deliberately absent from this object: a ref read during
  // render would be captured stale, and callers only ever need elapsedMs().
  const value = useMemo<JourneyContext>(
    () => ({ lang, setLang, copy: t(lang), state, setState, reset, markStart, elapsedMs }),
    [lang, setLang, state, setState, reset, markStart, elapsedMs],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useJourney(): JourneyContext {
  const context = useContext(Context);
  if (!context) throw new Error("useJourney must be used inside JourneyProvider");
  return context;
}
