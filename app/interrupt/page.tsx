"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useJourney } from "@/components/JourneyProvider";
import { TellOnePerson } from "@/components/TellOnePerson";

/**
 * The report stops here.
 *
 * Exactly three things, and nothing else on the screen:
 *   1. The specific stop instruction for what is actually happening.
 *   2. Tell one person, now.
 *   3. A way to continue — the interrupt must never trap the user.
 *
 * No meter on this screen. Money is not the emergency while the attack is
 * still live, and a decaying counter next to "turn your phone off" would be
 * arguing with itself.
 */
export default function InterruptPage() {
  const router = useRouter();
  const { copy, lang, state, setState } = useJourney();
  const decision = state.interrupt;

  useEffect(() => {
    // Nothing to interrupt about — someone deep-linked here.
    if (state.extraction && !decision?.fires) router.replace("/confirm");
  }, [decision, router, state.extraction]);

  useEffect(() => {
    if (decision?.fires && !state.interruptShown) setState({ interruptShown: true });
  }, [decision, setState, state.interruptShown]);

  if (!decision?.fires) return null;

  const instruction = copy.interrupt[decision.primary];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-danger">
          {copy.interrupt.heading}
        </p>
        <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {instruction.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed">{instruction.body}</p>
      </div>

      {/* Their own words, quoted back. This is why they are seeing this
          screen, and it is never a paraphrase. */}
      {decision.evidence && (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
          {copy.interrupt.why}{" "}
          <span className="text-text">“{decision.evidence}”</span>
        </p>
      )}

      <TellOnePerson lang={lang} />

      <div className="flex flex-col gap-2">
        <a
          href="tel:1930"
          className="flex min-h-14 w-full items-center justify-center rounded-lg border border-line-strong bg-surface px-4 text-lg font-semibold no-underline"
        >
          {copy.interrupt.call1930}
        </a>

        {/* Always available. An interrupt that traps someone is a worse
            product than no interrupt at all. */}
        <button
          type="button"
          onClick={() => router.push("/confirm")}
          className="min-h-12 text-sm text-muted underline underline-offset-2"
        >
          {copy.interrupt.continue}
        </button>
      </div>
    </div>
  );
}
