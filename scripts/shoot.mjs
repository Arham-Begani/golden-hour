/**
 * Screenshot the journey at phone width and report any horizontal overflow.
 *
 * The design claims to work at 360px on a throttled connection, so that claim
 * needs a check that runs rather than an eyeball. This drives the locally
 * installed Chrome with real device emulation — `chrome --headless
 * --window-size` does NOT set the layout viewport and will happily render at
 * desktop width and crop the image, which looks exactly like an overflow bug.
 *
 *   node scripts/shoot.mjs [baseUrl] [outDir]
 *
 * Exits non-zero if any page scrolls sideways.
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
  console.error("No Chrome found. Set the path in scripts/shoot.mjs.");
  process.exit(2);
}

/** A 360px-wide phone — the floor the design commits to. */
const VIEWPORT = { width: 360, height: 780, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const PAGES = process.env.GH_PAGES
  ? JSON.parse(process.env.GH_PAGES)
  : [
      ["landing", "/"],
      ["intake", "/start"],
      ["intake-demo", "/start?demo=1"],
      ["confirm", "/confirm"],
      ["evidence", "/evidence"],
      ["honesty", "/honesty"],
      ["judge", "/judge"],
      ["changes", "/changes"],
    ];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.setViewport(VIEWPORT);

let overflowed = false;

for (const [name, path] of PAGES) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 30_000 });
  // Client components hydrate and the meter ticks once before it reads right.
  await new Promise((resolve) => setTimeout(resolve, 1200));

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    // Any element sticking out past the viewport, so a failure names a culprit.
    const wide = [...document.querySelectorAll("*")]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 5)
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`);

    return { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, wide };
  });

  const bad = metrics.scrollWidth > metrics.innerWidth + 1;
  if (bad) overflowed = true;

  console.log(
    `${bad ? "OVERFLOW" : "ok      "} ${name.padEnd(14)} scroll=${metrics.scrollWidth} viewport=${metrics.innerWidth}` +
      (metrics.wide.length ? `\n           culprits: ${metrics.wide.join(" | ")}` : ""),
  );

  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
}

await browser.close();
process.exit(overflowed ? 1 : 0);
