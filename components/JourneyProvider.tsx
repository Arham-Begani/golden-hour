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
  /**
   * The optional sentence typed on the confirm screen.
   *
   * It lives here rather than in the confirm page's own state because typing it
   * can send the user to /interrupt, and coming back re-mounts the page. Local
   * state meant their words were gone when they returned — from the one screen
   * whose entire job is to not make a frightened person repeat themselves.
   */
  description: string;
  /**
   * When the clock started, persisted alongside the rest of the journey.
   *
   * It lived only in a ref until a refresh on /confirm was found to drop the
   * run entirely: the ref reset to null, elapsedMs() returned null, and the
   * dispatch was never recorded. A run that silently vanishes biases the
   * distribution in a direction nobody can see afterwards.
   */
  startedAt: number | null;
};

const EMPTY: JourneyState = {
  extraction: null,
  downgrades: [],
  interrupt: null,
  corrected: [],
  source: null,
  interruptShown: false,
  description: "",
  startedAt: null,
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

  const startedAt = useRef<number | null>(null);

  const markStart = useCallback(
    () => {
      // The clock starts when the user first does something, not when the page
      // loaded. Timing from page load would flatter the number.
      //
      // The ref is the idempotence guard rather than the state, because
      // setState is async and markStart fires twice in a row on a paste
      // (onChange then onPaste). Checking state would let the second call
      // through and restart the clock.
      if (startedAt.current !== null) return;
      const now = Date.now();
      startedAt.current = now;
      setState({ startedAt: now });
    },
    [setState],
  );

  const elapsedMs = useCallback(() => {
    // Ref first, stored value second: the ref is authoritative within a page
    // life, and the stored value is what survives a refresh.
    const at = startedAt.current ?? state.startedAt;
    return at === null ? null : Date.now() - at;
  }, [state.startedAt]);

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

  // The clock is still not exposed directly: a ref read during render would be
  // captured stale, and callers only ever need elapsedMs(). It is persisted in
  // state so it survives a refresh, but read through the closure either way.
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
