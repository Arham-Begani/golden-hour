"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";

/**
 * Web Speech dictation for the "say one sentence" path.
 *
 * Chrome and Edge only, so it is feature-detected and the button is hidden
 * entirely where it isn't available. It is never the only way to fill a field
 * — typing and pasting always work.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const RECOGNITION_LANG: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };

export function useDictation(lang: Lang, onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const callback = useRef(onTranscript);

  // Keep the latest callback without re-creating the recogniser mid-sentence.
  // Assigned in an effect rather than during render — a ref written during
  // render is not safe under concurrent rendering.
  useEffect(() => {
    callback.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    // Feature detection touches `window`, so it cannot happen during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(Boolean(speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition));
  }, []);

  const stop = useCallback(() => {
    recognition.current?.stop();
    recognition.current = null;
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const instance = new Recognition();
    instance.lang = RECOGNITION_LANG[lang];
    instance.continuous = true;
    instance.interimResults = false;

    instance.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) text += result[0].transcript;
      }
      if (text.trim()) callback.current(text.trim());
    };

    // A failed mic is not worth an error screen — the textarea is right there.
    instance.onerror = () => setListening(false);
    instance.onend = () => setListening(false);

    recognition.current = instance;
    instance.start();
    setListening(true);
  }, [lang]);

  useEffect(() => () => recognition.current?.stop(), []);

  return { supported, listening, start, stop, toggle: () => (listening ? stop() : start()) };
}
