"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { DecayMeter } from "@/components/DecayMeter";
import { useJourney } from "@/components/JourneyProvider";
import { useDictation } from "@/components/useDictation";
import { FIXTURES } from "@/lib/fixtures";
import { prepareImage, type PreparedImage } from "@/lib/image";

/**
 * The intake. There is no landing page — this is the first screen.
 *
 * Three ways in, whichever is fastest for the person: a screenshot, a pasted
 * SMS, or one sentence typed or spoken. The clock starts on their first
 * interaction, not on page load, and the meter is already visible so what is
 * at stake is legible before they have done anything.
 */

type Status = "idle" | "reading" | "failed";

function Intake() {
  const router = useRouter();
  const params = useSearchParams();
  const { copy, lang, markStart, setState, reset } = useJourney();

  const [text, setText] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const demo = params.get("demo") === "1";

  const dictation = useDictation(lang, (transcript) => {
    markStart();
    setText((current) => (current ? `${current} ${transcript}` : transcript));
  });

  const pickFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      markStart();
      setError(null);

      if (!file.type.startsWith("image/")) {
        setError(copy.errors.badType);
        return;
      }

      const prepared = await prepareImage(file);
      if (prepared.bytes > 3_500_000) {
        setError(copy.errors.tooLarge);
        return;
      }
      setImage(prepared);
    },
    [copy.errors.badType, copy.errors.tooLarge, markStart],
  );

  const submit = useCallback(
    async (fixtureId?: string) => {
      markStart();
      setStatus("reading");
      setError(null);

      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            fixtureId ? { fixture: fixtureId } : { text, image: image ?? undefined },
          ),
        });

        const result = await response.json();

        if (!result.ok) {
          // Designed-for path: hand them the form rather than an error page,
          // with everything blank and the clock still running.
          setStatus("failed");
          setError(
            result.reason === "timeout"
              ? copy.errors.timeout
              : result.reason === "image_too_large"
                ? copy.errors.tooLarge
                : result.reason === "unsupported_image_type"
                  ? copy.errors.badType
                  : copy.errors.unreadable,
          );
          return;
        }

        setState({
          extraction: result.extraction,
          downgrades: result.downgrades ?? [],
          interrupt: result.interrupt ?? null,
          source: result.source,
          corrected: [],
          interruptShown: false,
        });

        router.push(result.interrupt?.fires ? "/interrupt" : "/confirm");
      } catch {
        setStatus("failed");
        setError(copy.errors.network);
      }
    },
    [copy.errors, image, markStart, router, setState, text],
  );

  const manual = useCallback(() => {
    markStart();
    reset();
    setState({ extraction: null, source: "manual" });
    router.push("/confirm");
  }, [markStart, reset, router, setState]);

  const busy = status === "reading";
  const canSubmit = Boolean(text.trim() || image);

  return (
    <div className="flex flex-col gap-5">
      <DecayMeter occurredAt={null} lang={lang} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {copy.intake.heading}
        </h1>
        <p className="mt-1 text-muted">{copy.intake.sub}</p>
      </div>

      {/* 1 — the screenshot */}
      <div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => void pickFile(event.target.files?.[0])}
        />

        {image ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3">
            <span className="text-sm">{copy.intake.imageReady}</span>
            <button
              type="button"
              onClick={() => setImage(null)}
              className="min-h-11 px-2 text-sm text-muted underline underline-offset-2"
            >
              {copy.intake.remove}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex min-h-16 w-full flex-col items-start justify-center rounded-lg border border-dashed border-line-strong bg-surface px-4 py-3 text-left"
          >
            <span className="text-base font-medium">{copy.intake.upload}</span>
            <span className="text-sm text-muted">{copy.intake.uploadHint}</span>
          </button>
        )}
        <p className="mt-1.5 text-xs text-faint">{copy.intake.uploadNote}</p>
      </div>

      {/* 2 and 3 — the paste, and the sentence */}
      <div>
        <label htmlFor="account" className="text-base font-medium">
          {copy.intake.paste}
        </label>
        <textarea
          id="account"
          value={text}
          onChange={(event) => {
            markStart();
            setText(event.target.value);
          }}
          onPaste={markStart}
          rows={4}
          placeholder={copy.intake.placeholder}
          className="field-input mt-1.5 resize-y"
        />

        {dictation.supported && (
          <button
            type="button"
            onClick={dictation.toggle}
            aria-pressed={dictation.listening}
            className={`mt-2 min-h-11 rounded-lg border px-4 text-sm ${
              dictation.listening
                ? "border-mark bg-raised text-text"
                : "border-line bg-surface text-muted"
            }`}
          >
            {dictation.listening ? copy.intake.dictating : copy.intake.dictate}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-line-strong bg-raised px-4 py-3 text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={!canSubmit || busy}
          onClick={() => void submit()}
          className="btn-primary"
        >
          {busy ? copy.intake.reading : copy.intake.submit}
        </button>

        <button
          type="button"
          onClick={manual}
          className="min-h-11 text-sm text-muted underline underline-offset-2"
        >
          {copy.intake.skip}
        </button>
      </div>

      {/* Demo mode. Cached cases so a dead venue connection cannot take the
          pitch down with it. Never shown unless explicitly asked for. */}
      {demo && (
        <div className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-medium text-muted">{copy.intake.demo}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {FIXTURES.map((fixture) => (
              <li key={fixture.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit(fixture.id)}
                  className="min-h-11 w-full rounded-md border border-line bg-raised px-3 py-2 text-left disabled:opacity-40"
                >
                  <span className="block text-sm font-medium">{fixture.label}</span>
                  <span className="block text-xs text-muted">{fixture.purpose}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Intake />
    </Suspense>
  );
}
