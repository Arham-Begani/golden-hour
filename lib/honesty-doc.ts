import { INTRO, SECTIONS, TITLE, type Claim } from "./honesty";

/**
 * Render the honesty document to markdown.
 *
 * The brief asks for a `HONESTY.md` that mirrors the `/honesty` route and stays
 * in sync with what is actually real in the code. Two hand-maintained copies of
 * that document stay in sync for about a week and then diverge silently — and
 * on this document specifically, divergence is worse than having only one: a
 * page claiming to be the honest account, contradicting a file claiming to be
 * the honest account.
 *
 * So the markdown is generated from `lib/honesty.ts` and
 * `lib/honesty.test.ts` writes it through `toMatchFileSnapshot`, which fails
 * the test run when the committed file and this renderer disagree.
 *
 *   npm run docs:honesty   regenerate HONESTY.md after editing lib/honesty.ts
 */

const STATUS_LABEL: Record<Claim["status"], string> = {
  real: "Real",
  "not-real": "Not real",
  partial: "Real, with limits",
};

/** Table cells cannot contain a bare pipe. */
const cell = (s: string) => s.replace(/\|/g, "\\|");

export function renderHonestyMarkdown(): string {
  const out: string[] = [];

  out.push(`# ${TITLE}`, "");
  out.push(
    "<!-- Generated from lib/honesty.ts, and rendered to the screen by app/honesty/page.tsx.",
    "     Do not edit by hand: `npm test` fails when this file and lib/honesty.ts disagree.",
    "     Regenerate with `npm run docs:honesty`. -->",
    "",
  );

  for (const paragraph of INTRO) out.push(paragraph, "");

  for (const section of SECTIONS) {
    out.push("---", "", `## ${section.heading}`, "");

    for (const paragraph of section.body) out.push(paragraph, "");

    if (section.claims) {
      out.push("| Thing | Status | Detail |", "|---|---|---|");
      for (const claim of section.claims) {
        out.push(
          `| ${cell(claim.thing)} | **${STATUS_LABEL[claim.status]}** | ${cell(claim.detail)} |`,
        );
      }
      out.push("");
    }

    if (section.points) {
      section.points.forEach((point, i) => out.push(`${i + 1}. ${point}`, ""));
    }

    if (section.source) {
      out.push(`Source: [${section.source.label}](${section.source.url})`, "");
    }
  }

  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
