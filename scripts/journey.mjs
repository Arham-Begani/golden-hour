/**
 * Drive the whole journey in a real browser at phone width.
 *
 * This is the end-to-end check that the unit tests cannot do: that a demo case
 * actually routes intake -> (interrupt) -> confirm -> receipt -> statement,
 * that UNREADABLE fields render as holes rather than blockers, and that the
 * send button is never disabled by a missing field.
 *
 *   node scripts/journey.mjs [baseUrl] [outDir]
 *
 * Screenshots land in outDir, named by case and step.
 */

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "shots";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => existsSync(path));

if (!CHROME) {
  console.error("No Chrome found. Set the path in scripts/journey.mjs.");
  process.exit(2);
}

const VIEWPORT = { width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/** label as it appears in the demo strip -> whether it should stop the report */
const CASES = [
  { label: "Clean bank SMS", slug: "clean", expectInterrupt: false },
  { label: "Blurred screenshot", slug: "blurred", expectInterrupt: false },
  { label: "Digital arrest, in progress", slug: "arrest", expectInterrupt: true },
  { label: "Six days old", slug: "old", expectInterrupt: false },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Click the button whose text contains `text`. Throws if there isn't one. */
async function clickByText(page, text) {
  const handle = await page.evaluateHandle((needle) => {
    const nodes = [...document.querySelectorAll("button, a")];
    return nodes.find((node) => node.textContent?.includes(needle)) ?? null;
  }, text);

  const element = handle.asElement();
  if (!element) throw new Error(`no clickable element containing "${text}"`);
  await element.click();
}

mkdirSync(OUT, { recursive: true });

/**
 * Timings before the run, so we can prove afterwards that driving four demo
 * cases did not move the real distribution.
 *
 * Every case here goes through the demo strip, so the server's fixture
 * fingerprint should bucket all four as demo replays. That is a property of the
 * code rather than of this script — which is exactly why it is worth asserting.
 * If someone edits a fixture summary and the fingerprint stops matching, the
 * scripted runs quietly start counting toward the sixty-second claim, and
 * nothing else would notice.
 */
const readTimings = async () => {
  try {
    const response = await fetch(`${BASE}/api/timings`);
    const result = await response.json();
    return { real: result.count ?? 0, demo: result.demo?.count ?? 0 };
  } catch {
    return null;
  }
};

const before = await readTimings();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let failures = 0;

for (const testCase of CASES) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const step = async (name) => {
    await wait(700);
    await page.screenshot({ path: join(OUT, `${testCase.slug}-${name}.png`), fullPage: true });
  };

  try {
    await page.goto(`${BASE}/?demo=1`, { waitUntil: "networkidle0" });
    await wait(600);
    await clickByText(page, testCase.label);
    await wait(1600);

    const afterIntake = new URL(page.url()).pathname;
    const interrupted = afterIntake === "/interrupt";

    if (interrupted !== testCase.expectInterrupt) {
      console.log(
        `FAIL ${testCase.slug}: expected interrupt=${testCase.expectInterrupt}, landed on ${afterIntake}`,
      );
      failures++;
    }

    if (interrupted) {
      await step("interrupt");
      await clickByText(page, "continue the report");
      await wait(1200);
    }

    await step("confirm");

    // The send button must never be blocked by a missing field.
    const sendDisabled = await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find((node) =>
        /freeze request|फ़्रीज़ अनुरोध/.test(node.textContent ?? ""),
      );
      return button ? button.disabled : "not found";
    });

    if (sendDisabled !== false) {
      console.log(`FAIL ${testCase.slug}: send button state = ${sendDisabled}`);
      failures++;
    }

    const holes = await page.evaluate(
      () => document.querySelectorAll("input.field-input-missing").length,
    );

    await clickByText(page, "Send freeze request");
    await wait(2200);
    await step("receipt");

    const ack = new URL(page.url()).pathname.split("/").pop();
    const onReceipt = page.url().includes("/receipt/");
    if (!onReceipt) {
      console.log(`FAIL ${testCase.slug}: did not reach a receipt (${page.url()})`);
      failures++;
    }

    await clickByText(page, "Continue the report");
    await wait(1500);
    await step("statement");

    console.log(
      `ok   ${testCase.slug.padEnd(8)} interrupt=${interrupted} holes=${holes} ack=${ack}` +
        (errors.length ? `\n     JS ERRORS: ${errors.slice(0, 3).join(" | ")}` : ""),
    );
    if (errors.length) failures++;
  } catch (error) {
    console.log(`FAIL ${testCase.slug}: ${error.message}`);
    failures++;
  }

  await page.close();
}

await browser.close();

const after = await readTimings();
if (before && after) {
  const realAdded = after.real - before.real;
  const demoAdded = after.demo - before.demo;

  if (realAdded !== 0) {
    console.log(
      `FAIL timings: ${realAdded} scripted run(s) landed in the REAL distribution. ` +
        "Demo replays must never count toward the sixty-second claim.",
    );
    failures++;
  }
  if (demoAdded !== CASES.length) {
    console.log(
      `FAIL timings: expected ${CASES.length} demo timings, got ${demoAdded}. ` +
        "The fixture fingerprint may have stopped matching.",
    );
    failures++;
  }
  if (realAdded === 0 && demoAdded === CASES.length) {
    console.log(`\nok   timings  real +0, demo +${demoAdded}`);
  }
} else {
  console.log("\nwarn timings  could not read /api/timings; provenance not checked");
}

console.log(failures === 0 ? "\nall journeys passed" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
