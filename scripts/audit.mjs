/**
 * Responsiveness and tap-target audit.
 *
 * shoot.mjs checks horizontal overflow at 360px only. This walks every route at
 * the widths people actually use — a 320px budget phone through a tablet — and
 * reports three things that are cheap to break and expensive to notice late:
 *
 *   1. horizontal page scroll, and which element causes it
 *   2. interactive targets under 44px, which are hard to hit under stress
 *   3. text that overflows its own container
 *
 *   node scripts/audit.mjs [baseUrl]
 */

import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] ?? "http://localhost:3100";

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find((path) => existsSync(path));

if (!CHROME) {
  console.error("No Chrome found.");
  process.exit(2);
}

/** 320 is the narrowest phone still in wide use in India. */
const WIDTHS = [320, 360, 390, 414, 768, 1024];
const ROUTES = ["/", "/start", "/start?demo=1", "/evidence"];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
let problems = 0;

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height: 780,
      deviceScaleFactor: 2,
      isMobile: width < 768,
      hasTouch: width < 768,
    });
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 900));

    const report = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;

      const overflowing = [...document.querySelectorAll("*")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return false;
          // An element inside its own scroll container is fine.
          let p = el.parentElement;
          while (p) {
            const style = getComputedStyle(p);
            if (style.overflowX === "auto" || style.overflowX === "scroll") return false;
            p = p.parentElement;
          }
          return r.right > vw + 1 || r.left < -1;
        })
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 40)}`);

      // Only standalone controls. A link inside a sentence is meant to be
      // text-sized — WCAG exempts inline prose links, and padding them out
      // would wreck the paragraph. Hidden inputs are not targets either.
      const isInlineProse = (el) => {
        const p = el.parentElement;
        if (!p) return false;
        if (!["P", "LI", "TD", "TH", "BLOCKQUOTE", "SPAN"].includes(p.tagName)) return false;
        // Prose if the parent holds text besides this element.
        return (p.textContent ?? "").trim().length > (el.textContent ?? "").trim().length + 4;
      };

      const small = [...document.querySelectorAll("button, a, input, textarea, select")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return false; // visually hidden
          if (isInlineProse(el)) return false;
          return r.height < 44;
        })
        .slice(0, 6)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName.toLowerCase()}"${(el.textContent ?? "").trim().slice(0, 18)}" ${Math.round(r.width)}x${Math.round(r.height)}`;
        });

      const clipped = [...document.querySelectorAll("p, h1, h2, h3, span, td, th, label")]
        .filter((el) => el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0)
        .filter((el) => {
          let p = el.parentElement;
          while (p) {
            const s = getComputedStyle(p);
            if (s.overflowX === "auto" || s.overflowX === "scroll") return false;
            p = p.parentElement;
          }
          return true;
        })
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}"${(el.textContent ?? "").trim().slice(0, 24)}"`);

      return {
        scrollWidth: document.documentElement.scrollWidth,
        vw,
        overflowing,
        small,
        clipped,
      };
    });

    const scrolls = report.scrollWidth > report.vw + 1;
    const issues = [];
    if (scrolls) issues.push(`page scrolls sideways (${report.scrollWidth} > ${report.vw})`);
    if (report.overflowing.length) issues.push(`overflow: ${report.overflowing.join(" | ")}`);
    if (report.small.length) issues.push(`small targets: ${report.small.join(" | ")}`);
    if (report.clipped.length) issues.push(`clipped text: ${report.clipped.join(" | ")}`);

    const tag = `${route.padEnd(15)} ${String(width).padStart(4)}px`;
    if (issues.length) {
      problems += issues.length;
      console.log(`FAIL ${tag}`);
      for (const i of issues) console.log(`       ${i}`);
    } else {
      console.log(`ok   ${tag}`);
    }

    await page.close();
  }
}

await browser.close();
console.log(problems === 0 ? "\nno layout problems found" : `\n${problems} issue(s)`);
process.exit(problems === 0 ? 0 : 1);
