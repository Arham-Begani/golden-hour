#!/usr/bin/env node
/**
 * Score the interrupt.
 *
 * The interrupt stops a report and puts a red screen in front of a frightened
 * person. That is worth doing only if it is rare and right, so this measures
 * the number that decides it: the false-positive rate on the COMPLETED cases.
 *
 *   False positive  = the incident is over, and we fired anyway.
 *   False negative  = the attack is live, and we stayed quiet.
 *
 * The two are not symmetric and the product does not treat them as symmetric.
 * A missed interrupt costs one person an extra nudge. A false interrupt,
 * repeated, trains everyone to dismiss the real ones — including the person
 * whose screen is being shared right now. So the gate is tuned to make false
 * positives rare and the eval reports that rate first.
 *
 * It runs against a live server on purpose. Every case goes through the real
 * `/api/triage` route, the real model call, the real `validateActiveScam`
 * drop-unquoted-signals rule and the real `decideInterrupt` gate. Mocking any
 * of that would score something the product does not do.
 *
 *   npm run build && npx next start        # or: npm run dev
 *   npm run eval
 *
 * Options:
 *   --base <url>    server to hit (default http://localhost:3000)
 *   --concurrency N parallel cases (default 3; the free tier rate-limits)
 *   --out <path>    where to write the result (default data/triage-eval-result.json)
 *   --quiet         suppress the per-case lines
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

const BASE = (flag("--base", process.env.EVAL_BASE_URL || "http://localhost:3000")).replace(/\/$/, "");
const CONCURRENCY = Math.max(1, Number(flag("--concurrency", "3")) || 3);
const OUT = resolve(ROOT, flag("--out", "data/triage-eval-result.json"));
const QUIET = argv.includes("--quiet");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const OFF = "\x1b[0m";

/** Run `worker` over `items` with a fixed number of parallel slots, order preserved. */
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function triageOne(testCase) {
  const started = Date.now();
  const response = await fetch(`${BASE}/api/triage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: testCase.text }),
  });

  const latency_ms = Date.now() - started;

  if (!response.ok && response.status >= 500) {
    throw new Error(`${testCase.id}: server returned ${response.status}`);
  }

  const body = await response.json();

  // A triage failure is not a firing interrupt, and it is not a pass either.
  // Record it as an error so it cannot quietly improve the false-positive rate.
  if (body.ok === false) {
    return { errored: true, reason: body.reason ?? "unknown", detail: body.detail, latency_ms };
  }

  return {
    errored: false,
    fires: body.interrupt?.fires === true,
    primary: body.interrupt?.primary ?? null,
    gateReason: body.interrupt?.reason ?? null,
    verdict: body.active_scam?.verdict ?? null,
    evidence: body.interrupt?.evidence ?? "",
    latency_ms,
  };
}

function pct(n, d) {
  return d === 0 ? null : Math.round((n / d) * 1000) / 10;
}

async function main() {
  const raw = JSON.parse(await readFile(resolve(ROOT, "data/triage-eval.json"), "utf8"));
  const cases = raw.cases;

  const completed = cases.filter((c) => c.label === "COMPLETED");
  const active = cases.filter((c) => c.label === "ACTIVE");

  console.log(
    `${BOLD}Interrupt eval${OFF} — ${cases.length} cases (${completed.length} COMPLETED, ${active.length} ACTIVE) against ${BASE}\n`,
  );

  // Fail loudly and early rather than reporting a rate built on a dead server.
  try {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
    if (!health.gemini_key) {
      console.error(`${RED}No model key on the server. The eval needs live triage calls.${OFF}`);
      process.exit(1);
    }
  } catch {
    console.error(`${RED}No server at ${BASE}. Start one:${OFF}\n  npm run build && npx next start\n`);
    process.exit(1);
  }

  const results = await mapLimit(cases, CONCURRENCY, async (testCase) => {
    let outcome;
    try {
      outcome = await triageOne(testCase);
    } catch (error) {
      outcome = { errored: true, reason: "request_failed", detail: String(error), latency_ms: 0 };
    }

    const shouldFire = testCase.label === "ACTIVE";
    const correct = !outcome.errored && outcome.fires === shouldFire;

    if (!QUIET) {
      const mark = outcome.errored ? `${RED}ERR ${OFF}` : correct ? `${GREEN}ok  ${OFF}` : `${RED}MISS${OFF}`;
      const fired = outcome.errored ? "—" : outcome.fires ? "fires" : "quiet";
      console.log(
        `  ${mark} ${testCase.label.padEnd(9)} ${testCase.id.padEnd(34)} ${fired.padEnd(6)} ${DIM}${
          outcome.errored ? outcome.reason : `${outcome.verdict}/${outcome.primary ?? outcome.gateReason}`
        }${OFF}`,
      );
    }

    return { ...testCase, ...outcome, correct };
  });

  const errors = results.filter((r) => r.errored);
  const scored = results.filter((r) => !r.errored);

  const scoredCompleted = scored.filter((r) => r.label === "COMPLETED");
  const scoredActive = scored.filter((r) => r.label === "ACTIVE");

  const falsePositives = scoredCompleted.filter((r) => r.fires);
  const falseNegatives = scoredActive.filter((r) => !r.fires);

  const fpRate = pct(falsePositives.length, scoredCompleted.length);
  const fnRate = pct(falseNegatives.length, scoredActive.length);

  const latencies = scored.map((r) => r.latency_ms).sort((a, b) => a - b);
  const medianLatency = latencies.length
    ? latencies[Math.floor(latencies.length / 2)]
    : null;

  console.log(`\n${BOLD}False-positive rate on COMPLETED cases: ${
    fpRate === null ? "n/a" : `${fpRate}%`
  }${OFF}  (${falsePositives.length}/${scoredCompleted.length} fired when the incident was over)`);
  console.log(
    `False-negative rate on ACTIVE cases:     ${
      fnRate === null ? "n/a" : `${fnRate}%`
    }  (${falseNegatives.length}/${scoredActive.length} stayed quiet during a live attack)`,
  );
  console.log(`${DIM}median triage latency ${medianLatency ?? "—"}ms${OFF}`);

  if (falsePositives.length) {
    console.log(`\n${RED}False positives:${OFF}`);
    for (const r of falsePositives) {
      console.log(`  ${r.id} — fired on ${r.primary}, quoting: "${r.evidence.slice(0, 120)}"`);
    }
  }

  if (falseNegatives.length) {
    console.log(`\n${DIM}Missed (cheaper failure, but worth reading):${OFF}`);
    for (const r of falseNegatives) {
      console.log(`  ${r.id} — verdict ${r.verdict}, gate said ${r.gateReason}`);
    }
  }

  if (errors.length) {
    console.log(`\n${RED}${errors.length} case(s) errored and were excluded from both rates:${OFF}`);
    for (const r of errors) console.log(`  ${r.id} — ${r.reason}`);
  }

  const report = {
    measured_at: new Date().toISOString(),
    base_url: BASE,
    total_cases: cases.length,
    scored: scored.length,
    errored: errors.length,
    completed_cases: scoredCompleted.length,
    active_cases: scoredActive.length,
    false_positives: falsePositives.length,
    false_negatives: falseNegatives.length,
    false_positive_rate_pct: fpRate,
    false_negative_rate_pct: fnRate,
    median_latency_ms: medianLatency,
    cases: results.map((r) => ({
      id: r.id,
      label: r.label,
      fires: r.errored ? null : r.fires,
      verdict: r.errored ? null : r.verdict,
      primary: r.errored ? null : r.primary,
      correct: r.errored ? null : r.correct,
      errored: r.errored,
    })),
  };

  await writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`\n${DIM}written to ${OUT.replace(ROOT, ".")}${OFF}`);

  /**
   * A false positive is the failure this gate exists to avoid, so it fails the
   * run. A false negative prints and passes: the gate is deliberately
   * conservative, and tightening it until every ACTIVE case fires is exactly
   * the change that would make the false-positive rate worse.
   */
  if (errors.length) process.exit(1);
  process.exit(falsePositives.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
