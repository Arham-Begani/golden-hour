#!/usr/bin/env node
/**
 * Score the extraction — the path the whole product is for.
 *
 * The interrupt has had a rigorous eval since 28 August. Extraction, which is
 * the thing a user actually comes here to do, had none, and the image path had
 * never been exercised even once. So the project measured its second-most
 * important feature and not its most important one.
 *
 * WHAT THIS MEASURES, AND WHY IT IS NOT ACCURACY
 *
 * Accuracy is the obvious metric and it is the less important one. The claim
 * this product rests on is not "the model reads well", it is:
 *
 *   a missing transaction ID means the bank works with what it has;
 *   a WRONG one means the bank freezes the wrong account while the real one
 *   empties.
 *
 * So the number that matters is how often a wrong value reaches the packet.
 * Three outcomes per field, and only the third is a real failure:
 *
 *   correct   the value matches the answer key
 *   missed    came back UNREADABLE when a value was available — safe, by design
 *   BAD       a value came back that is not the true one
 *
 * A BAD value is then either caught by lib/validate.ts (downgraded to
 * UNREADABLE before dispatch) or ESCAPED into the packet. Escapes are the only
 * outcome that could send a bank after the wrong account, and they are what the
 * exit code fails on.
 *
 * HOW THE MODEL'S RAW ANSWER IS RECOVERED
 *
 * /api/extract returns the validated extraction *and* the downgrade list, and
 * each downgrade carries `original` — what the model actually said before the
 * server refused it. So both sides are visible from one call: raw model output,
 * and what survived validation. That is what makes the catch rate measurable
 * rather than assumed.
 *
 *   npm run build && npx next start
 *   npm run eval:extract
 *
 * Options:
 *   --base <url>     server to hit (default http://localhost:3000)
 *   --only <images|text>  score just one half
 *   --concurrency N  parallel cases (default 2; images are large)
 *   --out <path>     result file (default data/extraction-eval-result.json)
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const BASE = flag("--base", process.env.EVAL_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const ONLY = flag("--only", "both");
const CONCURRENCY = Math.max(1, Number(flag("--concurrency", "2")) || 2);
/**
 * How many times to run the whole suite.
 *
 * The model is called at temperature 0, which is not determinism. The first run
 * of this eval produced one escaped value; the immediate re-run of that same
 * case produced the correct one. A single pass therefore cannot tell you
 * whether an escape is a property of the system or a sample of it, and
 * reporting one pass as if it could is the kind of number this project spends
 * its time deleting. Repeats make the instability itself the measurement.
 */
const REPEAT = Math.max(1, Number(flag("--repeat", "1")) || 1);
const OUT = resolve(ROOT, flag("--out", "data/extraction-eval-result.json"));

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const OFF = "\x1b[0m";

const UNREADABLE = "UNREADABLE";

/** The fields the answer keys cover. The five a bank reads first. */
const SCORED = [
  "amount",
  "utr_or_upi_ref",
  "beneficiary_handle",
  "source_account_last4",
  "victim_bank",
];

async function mapLimit(items, limit, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await worker(items[i]);
      }
    }),
  );
  return out;
}

/* -------------------------------------------------------------------------- */
/* Comparison                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Compare like for like.
 *
 * lib/validate.ts normalises before it stores (strips separators from a UTR,
 * currency symbols from an amount), so the answer key is compared against the
 * same shapes rather than against raw punctuation. This is deliberately
 * generous about formatting and strict about substance: "12,500.00" and
 * "12500" are the same amount, and 523612345678 against 523612345679 is not
 * the same reference.
 */
function same(field, expected, actual) {
  if (expected == null || actual == null) return false;

  /**
   * An answer key entry may list several equally-correct answers.
   *
   * This exists for one real case rather than as generality for its own sake:
   * asked in Devanagari, the model returns the bank's name in Devanagari. That
   * is the same value in the script the person used, not a wrong one — it
   * cannot send a bank anywhere different — so scoring it as a misread would
   * have published a defect that does not exist. Where a field genuinely has
   * two right forms, the key says so.
   */
  if (Array.isArray(expected)) return expected.some((option) => same(field, option, actual));

  const a = String(expected).trim();
  const b = String(actual).trim();

  if (field === "amount") {
    const n = (v) => Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n(a)) && Number.isFinite(n(b)) && Math.abs(n(a) - n(b)) < 0.01;
  }
  if (field === "utr_or_upi_ref" || field === "source_account_last4") {
    const n = (v) => String(v).replace(/[\s-]/g, "").toUpperCase();
    return n(a) === n(b);
  }
  // Handles and bank names: case and spacing are not substance.
  return a.toLowerCase().replace(/\s+/g, " ") === b.toLowerCase().replace(/\s+/g, " ");
}

const isHole = (v) => v == null || v === "" || v === UNREADABLE;

/* -------------------------------------------------------------------------- */

async function runCase(testCase, kind) {
  const started = Date.now();

  const body =
    kind === "image"
      ? {
          image: {
            mimeType: "image/png",
            data: (await readFile(resolve(ROOT, testCase.image))).toString("base64"),
          },
        }
      : { text: testCase.text };

  const response = await fetch(`${BASE}/api/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const latency_ms = Date.now() - started;
  const result = await response.json();

  if (!result.ok) {
    return { id: testCase.id, kind, errored: true, reason: result.reason ?? "unknown", latency_ms };
  }

  /** field -> what the model said before the server touched it. */
  const rawByField = new Map();
  for (const d of result.downgrades ?? []) rawByField.set(d.field, d.original);

  const fields = SCORED.map((field) => {
    const expected = testCase.expect[field];
    const validated = result.extraction?.[field]?.value ?? null;
    // A downgrade means the server refused what the model said; without one the
    // validated value IS what the model said.
    const downgraded = rawByField.has(field);
    const raw = downgraded ? rawByField.get(field) : validated;

    const expectedAbsent = expected === UNREADABLE;
    const rawIsHole = isHole(raw);

    let outcome;
    if (expectedAbsent) {
      // The field was not in the source. A hole is the right answer; anything
      // else was invented, because there was nothing there to read.
      outcome = rawIsHole ? "correct" : "invented";
    } else if (rawIsHole) {
      outcome = "missed";
    } else {
      outcome = same(field, expected, raw) ? "correct" : "misread";
    }

    const bad = outcome === "invented" || outcome === "misread";

    return {
      field,
      expected,
      raw,
      validated,
      outcome,
      bad,
      // Of the bad values, did the server stop it before dispatch?
      caught: bad ? isHole(validated) : null,
      downgrade_reason: (result.downgrades ?? []).find((d) => d.field === field)?.reason ?? null,
      confidence: result.extraction?.[field]?.confidence ?? null,
    };
  });

  return { id: testCase.id, kind, why: testCase.why, errored: false, latency_ms, fields };
}

function tally(results) {
  const flat = results.filter((r) => !r.errored).flatMap((r) => r.fields);
  const count = (fn) => flat.filter(fn).length;

  const bad = flat.filter((f) => f.bad);
  return {
    fields_scored: flat.length,
    correct: count((f) => f.outcome === "correct"),
    missed: count((f) => f.outcome === "missed"),
    misread: count((f) => f.outcome === "misread"),
    invented: count((f) => f.outcome === "invented"),
    bad_values: bad.length,
    caught_by_validator: bad.filter((f) => f.caught).length,
    escaped_to_packet: bad.filter((f) => !f.caught).length,
  };
}

const pct = (n, d) => (d === 0 ? null : Math.round((n / d) * 1000) / 10);

function printTally(label, t, results) {
  const errored = results.filter((r) => r.errored).length;
  console.log(`\n${BOLD}${label}${OFF}  ${DIM}${results.length} cases, ${t.fields_scored} fields${
    errored ? `, ${errored} errored` : ""
  }${OFF}`);
  console.log(`  ${GREEN}correct${OFF}   ${t.correct}   ${DIM}read right, or correctly refused${OFF}`);
  console.log(`  ${YELLOW}missed${OFF}    ${t.missed}   ${DIM}came back empty when a value was there — safe${OFF}`);
  console.log(`  ${RED}misread${OFF}   ${t.misread}   ${DIM}wrong value for a field that was present${OFF}`);
  console.log(`  ${RED}invented${OFF}  ${t.invented}   ${DIM}value for a field that was NOT in the source${OFF}`);
  console.log(
    `\n  ${BOLD}bad values ${t.bad_values}${OFF} — ${GREEN}${t.caught_by_validator} caught by lib/validate.ts${OFF}, ` +
      `${t.escaped_to_packet ? RED : GREEN}${t.escaped_to_packet} escaped to the packet${OFF}`,
  );
}

async function main() {
  const wantImages = ONLY === "both" || ONLY === "images";
  const wantText = ONLY === "both" || ONLY === "text";

  const imageCases = wantImages
    ? JSON.parse(await readFile(resolve(ROOT, "data/extraction-eval.json"), "utf8")).cases
    : [];
  const textCases = wantText
    ? JSON.parse(await readFile(resolve(ROOT, "data/extraction-text-eval.json"), "utf8")).cases
    : [];

  console.log(
    `${BOLD}Extraction eval${OFF} — ${imageCases.length} images, ${textCases.length} text cases against ${BASE}`,
  );

  try {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
    if (!health.gemini_key) {
      console.error(`${RED}No model key on the server.${OFF}`);
      process.exit(1);
    }
  } catch {
    console.error(`${RED}No server at ${BASE}.${OFF}  npm run build && npx next start`);
    process.exit(1);
  }

  /** One pass over every case. */
  const onePass = async () => {
    const images = await mapLimit(imageCases, CONCURRENCY, (c) => runCase(c, "image"));
    const text = await mapLimit(textCases, CONCURRENCY, (c) => runCase(c, "text"));
    return { images, text, all: [...images, ...text] };
  };

  const passes = [];
  for (let i = 0; i < REPEAT; i++) {
    if (REPEAT > 1) console.log(`
${DIM}pass ${i + 1} of ${REPEAT}${OFF}`);
    passes.push(await onePass());
  }

  const { images: imageResults, text: textResults, all } = passes[0];

  for (const r of all) {
    if (r.errored) {
      console.log(`  ${RED}ERR ${OFF} ${r.id.padEnd(26)} ${r.reason}`);
      continue;
    }
    const bad = r.fields.filter((f) => f.bad);
    const escaped = bad.filter((f) => !f.caught);
    const mark = escaped.length ? `${RED}ESCAPE${OFF}` : bad.length ? `${YELLOW}caught${OFF}` : `${GREEN}ok    ${OFF}`;
    const summary = r.fields.map((f) => f.outcome[0].toUpperCase()).join("");
    console.log(`  ${mark} ${r.id.padEnd(26)} ${DIM}${summary}  ${r.latency_ms}ms${OFF}`);
    for (const f of bad) {
      console.log(
        `      ${f.caught ? `${GREEN}caught${OFF}` : `${RED}ESCAPED${OFF}`} ${f.field}: ` +
          `model said ${JSON.stringify(f.raw)}, truth ${JSON.stringify(f.expected)}` +
          `${f.downgrade_reason ? ` ${DIM}(${f.downgrade_reason})${OFF}` : ""}`,
      );
    }
  }

  const overall = tally(all);
  if (imageResults.length) printTally("Images — the vision path", tally(imageResults), imageResults);
  if (textResults.length) printTally("Text — English, Hinglish, Hindi, dictation", tally(textResults), textResults);
  if (imageResults.length && textResults.length) printTally("Overall", overall, all);

  const latencies = all.filter((r) => !r.errored).map((r) => r.latency_ms).sort((a, b) => a - b);

  /**
   * Across passes: what changed, and what the worst pass looked like.
   *
   * `stable` is the honest headline when REPEAT > 1 — a field that escaped on
   * one pass and was correct on another has not been shown to be safe, and
   * quoting the good pass would be picking the flattering number.
   */
  let stability = null;
  if (REPEAT > 1) {
    const key = (caseId, field) => `${caseId}.${field}`;
    const outcomes = new Map();
    for (const pass of passes) {
      for (const r of pass.all) {
        if (r.errored) continue;
        for (const f of r.fields) {
          const k = key(r.id, f.field);
          if (!outcomes.has(k)) outcomes.set(k, new Set());
          outcomes.get(k).add(f.outcome);
        }
      }
    }
    const varying = [...outcomes.entries()].filter(([, set]) => set.size > 1);
    const perPass = passes.map((p) => tally(p.all));

    stability = {
      passes: REPEAT,
      fields_tracked: outcomes.size,
      fields_that_varied: varying.length,
      varied: varying.map(([k, set]) => ({ field: k, outcomes: [...set] })),
      escaped_per_pass: perPass.map((t) => t.escaped_to_packet),
      worst_pass_escapes: Math.max(...perPass.map((t) => t.escaped_to_packet)),
      correct_per_pass: perPass.map((t) => t.correct),
    };

    console.log(`
${BOLD}Stability across ${REPEAT} passes${OFF}`);
    console.log(`  escapes per pass: ${stability.escaped_per_pass.join(", ")}`);
    console.log(`  ${varying.length} of ${outcomes.size} fields changed outcome between passes`);
    for (const v of stability.varied) {
      console.log(`    ${YELLOW}varies${OFF} ${v.field}: ${v.outcomes.join(" / ")}`);
    }
  }

  const report = {
    measured_at: new Date().toISOString(),
    base_url: BASE,
    scored_fields: SCORED,
    image_cases: imageResults.length,
    text_cases: textResults.length,
    errored: all.filter((r) => r.errored).length,
    median_latency_ms: latencies.length ? latencies[Math.floor(latencies.length / 2)] : null,
    passes: REPEAT,
    stability,
    overall,
    /** The headline: of everything the model got wrong, what reached the packet. */
    catch_rate_pct: pct(overall.caught_by_validator, overall.bad_values),
    images: tally(imageResults),
    text: tally(textResults),
    cases: all.map((r) =>
      r.errored
        ? { id: r.id, kind: r.kind, errored: true, reason: r.reason }
        : {
            id: r.id,
            kind: r.kind,
            latency_ms: r.latency_ms,
            fields: r.fields.map((f) => ({
              field: f.field,
              outcome: f.outcome,
              caught: f.caught,
              downgrade_reason: f.downgrade_reason,
            })),
          },
    ),
  };

  await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\n${DIM}written to ${OUT.replace(ROOT, ".")}${OFF}`);

  /**
   * An escape is the failure this whole layer exists to prevent, so it fails the
   * run. A `missed` does not: refusing to read something is the safe behaviour
   * and the product is built to prefer it. Failing on misses would create
   * pressure to loosen the validator, which is exactly backwards.
   */
  if (report.errored) process.exit(1);
  // The worst pass, never the kindest one.
  const worstEscapes = stability ? stability.worst_pass_escapes : overall.escaped_to_packet;
  process.exit(worstEscapes > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
