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
 * It runs against a live server on purpose. Every case goes through a real
 * route, a real model call, the real `validateActiveScam` drop-unquoted-signals
 * rule and the real `decideInterrupt` gate. Mocking any of that would score
 * something the product does not do.
 *
 * WHICH PATH IS SCORED, AND WHY IT IS NOW TWO
 *
 * This used to score `/api/triage` only, and the write-up around it claimed the
 * number described the shipped gate. It did not, quite. The intake calls
 * `/api/extract`, whose system prompt is `EXTRACTION_INSTRUCTION`; `/api/triage`
 * uses `TRIAGE_ONLY_INSTRUCTION`. Both compose the same `TRIAGE_INSTRUCTION`
 * constant and `lib/triage.test.ts` asserts that composition — but containment
 * is not equivalence. The shipped call asks the same question with nine freeze
 * fields and possibly an image also competing for the model's attention, and
 * nothing measured what that does to the verdict.
 *
 * So the default now runs both and reports the extraction path as the headline,
 * because that is the one a user actually hits. The triage path is reported
 * beside it, and every case where the two disagree is listed by name. If they
 * agree the claim is stronger than it was; if they diverge, that divergence is
 * the finding and it belongs on /honesty.
 *
 *   npm run build && npx next start        # or: npm run dev
 *   npm run eval
 *
 * Options:
 *   --base <url>    server to hit (default http://localhost:3000)
 *   --path <which>  extract | triage | both (default both)
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

/**
 * Which route to score. "extract" is the shipped hot path and is the headline;
 * "triage" is the standalone route the eval used to score on its own.
 */
const PATH = flag("--path", "both");
if (!["extract", "triage", "both"].includes(PATH)) {
  console.error(`--path must be extract, triage or both (got ${PATH})`);
  process.exit(2);
}

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

/**
 * Score one case against one route.
 *
 * Both routes return the same `interrupt` decision from the same
 * `decideInterrupt` gate, so the only thing that differs between them is the
 * system prompt and what else the model was asked to do in the same breath —
 * which is exactly the variable this comparison exists to measure.
 */
async function scoreOne(testCase, path) {
  const started = Date.now();
  const response = await fetch(`${BASE}/api/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: testCase.text }),
  });

  const latency_ms = Date.now() - started;

  if (!response.ok && response.status >= 500) {
    throw new Error(`${testCase.id}: server returned ${response.status}`);
  }

  const body = await response.json();

  // A model failure is not a firing interrupt, and it is not a pass either.
  // Record it as an error so it cannot quietly improve the false-positive rate.
  if (body.ok === false) {
    return { errored: true, reason: body.reason ?? "unknown", detail: body.detail, latency_ms };
  }

  // /api/triage returns active_scam at the top level; /api/extract nests it
  // inside the extraction, alongside the nine freeze fields.
  const activeScam = body.active_scam ?? body.extraction?.active_scam;

  return {
    errored: false,
    fires: body.interrupt?.fires === true,
    primary: body.interrupt?.primary ?? null,
    gateReason: body.interrupt?.reason ?? null,
    verdict: activeScam?.verdict ?? null,
    evidence: body.interrupt?.evidence ?? "",
    latency_ms,
  };
}

function pct(n, d) {
  return d === 0 ? null : Math.round((n / d) * 1000) / 10;
}

/** Run every case against one route and reduce it to rates. */
async function runPath(cases, path) {
  const results = await mapLimit(cases, CONCURRENCY, async (testCase) => {
    let outcome;
    try {
      outcome = await scoreOne(testCase, path);
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

  const latencies = scored.map((r) => r.latency_ms).sort((a, b) => a - b);

  return {
    path,
    results,
    errors,
    scored,
    scoredCompleted,
    scoredActive,
    falsePositives,
    falseNegatives,
    fpRate: pct(falsePositives.length, scoredCompleted.length),
    fnRate: pct(falseNegatives.length, scoredActive.length),
    medianLatency: latencies.length ? latencies[Math.floor(latencies.length / 2)] : null,
  };
}

/** The numbers for one route, in the shape the report and /honesty read. */
const summarise = (run, cases) => ({
  path: run.path,
  route: `/api/${run.path}`,
  total_cases: cases.length,
  scored: run.scored.length,
  errored: run.errors.length,
  completed_cases: run.scoredCompleted.length,
  active_cases: run.scoredActive.length,
  false_positives: run.falsePositives.length,
  false_negatives: run.falseNegatives.length,
  false_positive_rate_pct: run.fpRate,
  false_negative_rate_pct: run.fnRate,
  median_latency_ms: run.medianLatency,
});

function report(run) {
  const title = run.path === "extract" ? "Shipped path" : "Triage route";
  console.log(`\n${BOLD}${title} — /api/${run.path}${OFF}`);
  console.log(`${BOLD}False-positive rate on COMPLETED cases: ${
    run.fpRate === null ? "n/a" : `${run.fpRate}%`
  }${OFF}  (${run.falsePositives.length}/${run.scoredCompleted.length} fired when the incident was over)`);
  console.log(
    `False-negative rate on ACTIVE cases:     ${
      run.fnRate === null ? "n/a" : `${run.fnRate}%`
    }  (${run.falseNegatives.length}/${run.scoredActive.length} stayed quiet during a live attack)`,
  );
  console.log(`${DIM}median latency ${run.medianLatency ?? "—"}ms${OFF}`);

  if (run.falsePositives.length) {
    console.log(`\n${RED}False positives:${OFF}`);
    for (const r of run.falsePositives) {
      console.log(`  ${r.id} — fired on ${r.primary}, quoting: "${r.evidence.slice(0, 120)}"`);
    }
  }

  if (run.falseNegatives.length) {
    console.log(`\n${DIM}Missed (cheaper failure, but worth reading):${OFF}`);
    for (const r of run.falseNegatives) {
      console.log(`  ${r.id} — verdict ${r.verdict}, gate said ${r.gateReason}`);
    }
  }

  if (run.errors.length) {
    console.log(`\n${RED}${run.errors.length} case(s) errored and were excluded from both rates:${OFF}`);
    for (const r of run.errors) console.log(`  ${r.id} — ${r.reason}`);
  }
}

async function main() {
  const raw = JSON.parse(await readFile(resolve(ROOT, "data/triage-eval.json"), "utf8"));
  const cases = raw.cases;

  const completed = cases.filter((c) => c.label === "COMPLETED");
  const active = cases.filter((c) => c.label === "ACTIVE");

  console.log(
    `${BOLD}Interrupt eval${OFF} — ${cases.length} cases (${completed.length} COMPLETED, ${active.length} ACTIVE) against ${BASE}`,
  );
  console.log(
    `${DIM}scoring: ${PATH === "both" ? "/api/extract and /api/triage" : `/api/${PATH}`}${OFF}\n`,
  );

  // Fail loudly and early rather than reporting a rate built on a dead server.
  try {
    const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
    if (!health.gemini_key) {
      console.error(`${RED}No model key on the server. The eval needs live model calls.${OFF}`);
      process.exit(1);
    }
  } catch {
    console.error(`${RED}No server at ${BASE}. Start one:${OFF}\n  npm run build && npx next start\n`);
    process.exit(1);
  }

  /**
   * The extraction path is the headline because it is the one a user hits.
   * The two runs are sequential rather than interleaved so the per-case lines
   * stay readable and so a rate-limited free tier is not hit twice as hard.
   */
  const wantExtract = PATH === "extract" || PATH === "both";
  const wantTriage = PATH === "triage" || PATH === "both";

  if (wantExtract && !QUIET) console.log(`${DIM}/api/extract — the shipped path${OFF}`);
  const extractRun = wantExtract ? await runPath(cases, "extract") : null;
  if (extractRun) report(extractRun);

  if (wantTriage && !QUIET) console.log(`\n${DIM}/api/triage — the standalone route${OFF}`);
  const triageRun = wantTriage ? await runPath(cases, "triage") : null;
  if (triageRun) report(triageRun);

  /**
   * Where the two prompts disagree.
   *
   * This is the number the old single-path eval could not produce, and it is
   * the one that says whether "the eval scores what ships" was ever true.
   */
  let disagreements = [];
  let verdictDisagreements = [];
  if (extractRun && triageRun) {
    const byId = new Map(triageRun.results.map((r) => [r.id, r]));
    const comparable = extractRun.results.filter((e) => {
      const t = byId.get(e.id);
      return t && !e.errored && !t.errored;
    });

    const pair = (e) => ({
      id: e.id,
      label: e.label,
      extract_fires: e.fires,
      triage_fires: byId.get(e.id).fires,
      extract_verdict: e.verdict,
      triage_verdict: byId.get(e.id).verdict,
    });

    disagreements = comparable.filter((e) => e.fires !== byId.get(e.id).fires).map(pair);

    /**
     * Verdicts that differed without changing the decision.
     *
     * Tracked separately because the two are not the same claim. "The prompts
     * agree" is a statement about what the user sees; the prompts can reach
     * that agreement from different readings — an UNCLEAR and an ENDED both
     * leave the gate shut. Reporting only the decision-level number would
     * overstate how alike the two prompts are.
     */
    verdictDisagreements = comparable
      .filter((e) => e.verdict !== byId.get(e.id).verdict)
      .map(pair);

    console.log(
      `\n${BOLD}Agreement between the two prompts: ${
        comparable.length - disagreements.length
      }/${comparable.length} decisions${OFF}`,
    );
    for (const d of disagreements) {
      console.log(
        `  ${RED}differs${OFF} ${d.id} (${d.label}) — extract ${
          d.extract_fires ? "fires" : "quiet"
        }/${d.extract_verdict}, triage ${d.triage_fires ? "fires" : "quiet"}/${d.triage_verdict}`,
      );
    }

    console.log(
      `${DIM}${comparable.length - verdictDisagreements.length}/${
        comparable.length
      } identical verdicts${OFF}`,
    );
    for (const d of verdictDisagreements) {
      console.log(
        `  ${DIM}same decision, different reading${OFF} ${d.id} — extract ${d.extract_verdict}, triage ${d.triage_verdict}`,
      );
    }
  }

  /**
   * The headline run is the shipped one when we have it.
   *
   * lib/honesty.ts reads the top level of this file, so whatever sits there is
   * what /honesty and HONESTY.md say. It must describe the path a user is
   * actually on, which is why extract wins the top level over triage.
   */
  const headline = extractRun ?? triageRun;

  const out = {
    measured_at: new Date().toISOString(),
    base_url: BASE,
    ...summarise(headline, cases),
    cases: headline.results.map((r) => ({
      id: r.id,
      label: r.label,
      fires: r.errored ? null : r.fires,
      verdict: r.errored ? null : r.verdict,
      primary: r.errored ? null : r.primary,
      correct: r.errored ? null : r.correct,
      errored: r.errored,
    })),
    /** Present only when both were run. Null means the comparison was skipped. */
    comparison:
      extractRun && triageRun
        ? {
            extract: summarise(extractRun, cases),
            triage: summarise(triageRun, cases),
            agreed: extractRun.scored.length - disagreements.length,
            compared: extractRun.scored.length,
            disagreements,
            /** Same decision, different reading. See the note above. */
            verdict_agreed: extractRun.scored.length - verdictDisagreements.length,
            verdict_disagreements: verdictDisagreements,
          }
        : null,
  };

  await writeFile(OUT, `${JSON.stringify(out, null, 2)}\n`, "utf8");
  console.log(`\n${DIM}written to ${OUT.replace(ROOT, ".")}${OFF}`);

  /**
   * A false positive is the failure this gate exists to avoid, so it fails the
   * run. A false negative prints and passes: the gate is deliberately
   * conservative, and tightening it until every ACTIVE case fires is exactly
   * the change that would make the false-positive rate worse.
   *
   * Both paths are held to that: a false positive on either is one a user could
   * see, because the extraction path is what the intake calls and the triage
   * path is what the confirm screen calls.
   */
  const runs = [extractRun, triageRun].filter(Boolean);
  if (runs.some((r) => r.errors.length)) process.exit(1);
  process.exit(runs.some((r) => r.falsePositives.length) ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
