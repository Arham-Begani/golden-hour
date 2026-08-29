/**
 * Screen recordings for the demo video.
 *
 * Records with CDP screencast (page.screencast) rather than a screenshot loop.
 * The loop capped out around 5 frames a second and saturated the connection
 * badly enough that clicks and keystrokes went missing; screencast records real
 * video off the compositor, so typing and scrolling can both be natural and the
 * page stays responsive while it runs.
 *
 *   node scripts/broll.mjs [baseUrl] [outDir]
 *
 * Needs Chrome and ffmpeg on PATH, and a server running.
 *
 * A NOTE ON THE RUN CLIP. It goes through the real intake path, so the server
 * records a real timing. That entry is this script's pacing, not a person doing
 * the task, and it must not sit in the distribution behind the sixty-second
 * claim — the script prints a reminder to clear it when it finishes.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? "broll";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => existsSync(path));

if (!CHROME) {
  console.error("No Chrome found. Set the path in scripts/broll.mjs.");
  process.exit(2);
}

/** Phone-shaped, so it cuts against handheld footage. */
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--hide-scrollbars"],
});

/** Record `drive` to `<name>.mp4`. */
async function record(name, setup, drive) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await setup(page);
  await wait(700); // settle and hydrate before the first frame

  const webm = join(OUT, `${name}.webm`);
  const recorder = await page.screencast({ path: webm });

  const started = Date.now();
  await drive(page);
  const elapsed = (Date.now() - started) / 1000;

  await recorder.stop();
  await page.close();

  // webm out of the box; mp4 is what editors want.
  const mp4 = join(OUT, `${name}.mp4`);
  execFileSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p",
     "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2", "-movflags", "+faststart", mp4],
    { stdio: "inherit" },
  );
  rmSync(webm, { force: true });
  console.log(`  ${name}.mp4  ${elapsed.toFixed(1)}s`);
}

/**
 * Scroll smoothly, eased, over `ms`.
 *
 * Screencast reads the compositor, so a real animated scroll is captured as a
 * real animated scroll — no need to fake it with jump cuts the way the
 * screenshot loop required.
 */
const scrollTo = (page, y, ms = 2200) =>
  page.evaluate(
    (to, duration) =>
      new Promise((resolve) => {
        const from = window.scrollY;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / duration);
          // easeInOutCubic — starts and stops gently, like a thumb.
          const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
          window.scrollTo(0, from + (to - from) * e);
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    y,
    ms,
  );

/** Poll for a condition. Survives the context teardown of a navigation. */
async function until(page, predicate, label, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await page.evaluate(predicate)) return true;
    } catch {
      /* navigating */
    }
    await wait(150);
  }
  let where = "unknown";
  try {
    where = await page.evaluate(() => `path=${location.pathname}`);
  } catch {
    /* nothing to report */
  }
  throw new Error(`timed out waiting for ${label} (${where})`);
}

/** Click the button or link whose text contains `text`, from inside the page. */
async function clickByText(page, text) {
  const ok = await page.evaluate((needle) => {
    const el = [...document.querySelectorAll("button, a")].find((n) =>
      (n.textContent ?? "").toLowerCase().includes(needle.toLowerCase()),
    );
    if (!el || el.disabled) return false;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(() => el.click(), 420); // let the scroll land, so the tap reads
    return true;
  }, text);
  if (!ok) throw new Error(`no enabled element containing "${text}"`);
  await wait(700);
}

/**
 * Type into a React-controlled field.
 *
 * Real keystrokes now that screencast leaves the input pipeline alone, with a
 * value check afterwards: a field that quietly never took focus used to swallow
 * the lot and leave the submit button disabled.
 */
async function typeInto(page, selector, text) {
  await page.click(selector);
  await page.type(selector, text, { delay: 30 });
  try {
    await until(
      page,
      (sel) => (document.querySelector(sel)?.value ?? "").length > 10,
      `text to land in ${selector}`,
      4000,
    );
  } catch {
    // Fall back to the native setter if the keyboard route lost them.
    await page.evaluate(
      (sel, value) => {
        const el = document.querySelector(sel);
        const proto =
          el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      },
      selector,
      text,
    );
  }
}

const goto = (url) => async (page) => {
  await page.goto(url, { waitUntil: "networkidle2" });
};

const SMS =
  "Rs 12,500.00 debited from A/c XX4471 on 24-08 to rahulk.9821@okaxis. " +
  "UPI Ref 523612345678. Not done by me.";

console.log(`recording from ${BASE}\n`);

/* -------------------------------------------------------------------------- */
/* The run: landing -> intake -> confirm -> receipt, one continuous take.      */
/* -------------------------------------------------------------------------- */

await record("run", goto(`${BASE}/`), async (page) => {
  // Open on the landing page, so the argument is on screen before the demo.
  await wait(2600);
  await scrollTo(page, 620, 2600);
  await wait(2000);

  await clickByText(page, "Start a report");
  await until(page, () => location.pathname === "/start", "the intake");
  await wait(1600);

  await typeInto(page, "textarea", SMS);
  await wait(1200);

  await clickByText(page, "Read this");
  await until(page, () => location.pathname === "/confirm", "extraction to finish");
  await wait(2000);

  // Look down the fields the way someone checking them would.
  await scrollTo(page, 430, 2000);
  await wait(1500);
  await scrollTo(page, 880, 2000);
  await wait(1500);

  const field = "input[type='text'], input[inputmode='text']";
  if (await page.$(field)) {
    await page.click(field, { clickCount: 3 });
    await page.type(field, "rahulk.9821@okaxis", { delay: 55 });
    await wait(1400);
  }

  await scrollTo(page, 20_000, 1800); // down to the send button
  await wait(1000);
  await clickByText(page, "Send freeze request");
  await until(page, () => location.pathname.startsWith("/receipt/"), "the receipt");
  await wait(3200);
  await scrollTo(page, 520, 2400);
  await wait(2200);
});

/* -------------------------------------------------------------------------- */
/* Supporting clips. None of these makes a timing claim.                       */
/* -------------------------------------------------------------------------- */

await record(
  "interrupt",
  async (page) => {
    await page.goto(`${BASE}/start?demo=1`, { waitUntil: "networkidle2" });
    await wait(600);
    await clickByText(page, "Digital arrest");
    await until(page, () => location.pathname === "/interrupt", "the interrupt");
    await wait(900);
  },
  async (page) => {
    await wait(3000);
    await scrollTo(page, 700, 2600);
    await wait(2000);
    await scrollTo(page, 1350, 2400);
    await wait(2200);
  },
);

await record(
  "confirm-unreadable",
  async (page) => {
    await page.goto(`${BASE}/start?demo=1`, { waitUntil: "networkidle2" });
    await wait(600);
    await clickByText(page, "Blurred");
    await until(page, () => location.pathname === "/confirm", "the confirm screen");
    await wait(900);
  },
  async (page) => {
    await wait(2400);
    await scrollTo(page, 560, 2400);
    await wait(1800);
    await scrollTo(page, 1120, 2400);
    await wait(2200);
  },
);

await record("evidence", goto(`${BASE}/evidence`), async (page) => {
  await wait(2600);
  for (const y of [820, 1640, 2500, 3400]) {
    await scrollTo(page, y, 2400);
    await wait(1700);
  }
});

await record("landing", goto(`${BASE}/`), async (page) => {
  await wait(2600);
  for (const y of [700, 1450, 2200]) {
    await scrollTo(page, y, 2400);
    await wait(1700);
  }
});

await browser.close();
console.log(`\ndone -> ${OUT}/`);
console.log("The run wrote a real timing. Clear gh:timings:real before it counts.");
