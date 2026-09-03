#!/usr/bin/env node
/**
 * Generate the synthetic screenshots the extraction eval reads.
 *
 * The product's marquee interaction is "upload a screenshot of the debit
 * alert", and until now nothing had ever tested it — not a unit test, not an
 * eval, not one live vision call. The blurred demo fixture is a hand-written
 * cache, not a real model response. So the most important path in the product
 * was also the only unmeasured one.
 *
 * WHY GENERATE RATHER THAN COLLECT
 *
 * A real screenshot of a real debit alert is real financial data about a real
 * person, and this repository does not contain any. Generating them keeps the
 * synthetic-data rule intact, makes the set reproducible by anyone with Chrome,
 * and — the part that actually matters — means the ground truth is known
 * exactly, because the same object that renders the image writes the answer
 * key. The two cannot drift.
 *
 * WHY THE "REMOVED" FIELDS ARE REMOVED RATHER THAN BLURRED
 *
 * To count a hallucination you have to be certain the information was not
 * available. A blurred reference number is ambiguous: if the model reads it
 * correctly, maybe the blur was survivable. So fields whose expected answer is
 * UNREADABLE are *cut out of the image entirely*. Any value returned for one of
 * those cannot have been read, and is a hallucination with no argument
 * available. Blur and glare are still applied on top, but only to fields whose
 * truth is present — those measure accuracy, not invention.
 *
 *   node scripts/make-eval-images.mjs
 *
 * Writes PNGs to data/eval-images/ and the answer key to
 * data/extraction-eval.json. Both are committed so the eval runs without Chrome.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const OUT_DIR = join(ROOT, "data", "eval-images");

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find(Boolean);

/**
 * Every identifier here is synthetic and the VPA suffixes are deliberately not
 * ones any Indian PSP issues. lib/fixtures.test.ts holds the demo fixtures to
 * the same list; these strings follow it because they end up in images that get
 * looked at.
 */

/** A field whose value is drawn and legible. */
const shown = (value) => ({ value, drawn: true });
/** A field cut out of the image. Any value returned for it was invented. */
const removed = () => ({ value: "UNREADABLE", drawn: false });

const CASES = [
  {
    id: "sms-clean",
    why: "The happy path, rendered as a notification. Every field is legible.",
    template: "sms",
    degrade: null,
    fields: {
      amount: shown("12500.00"),
      utr_or_upi_ref: shown("523612345678"),
      beneficiary_handle: shown("rahul.k9821@examplebank"),
      source_account_last4: shown("4471"),
      victim_bank: shown("Example Bank"),
    },
  },
  {
    id: "sms-blurred",
    why: "Legible but degraded. Measures accuracy under blur, not invention.",
    template: "sms",
    degrade: "blur",
    fields: {
      amount: shown("8750.00"),
      utr_or_upi_ref: shown("418290337145"),
      beneficiary_handle: shown("quickpay.desk@samplebank"),
      source_account_last4: shown("2298"),
      victim_bank: shown("Sample Bank"),
    },
  },
  {
    id: "sms-ref-cut",
    why: "The reference is physically absent. A value here is a hallucination with no defence.",
    template: "sms",
    degrade: "crop-right",
    fields: {
      amount: shown("3200.00"),
      utr_or_upi_ref: removed(),
      beneficiary_handle: shown("store.refund@demobank"),
      source_account_last4: shown("6614"),
      victim_bank: shown("Demo Bank"),
    },
  },
  {
    id: "upi-clean",
    why: "A UPI app confirmation rather than an SMS. Different layout, same facts.",
    template: "upi",
    degrade: null,
    fields: {
      amount: shown("47000.00"),
      utr_or_upi_ref: shown("902184773051"),
      beneficiary_handle: shown("mehta.traders@testbank"),
      source_account_last4: shown("8830"),
      victim_bank: shown("Test Bank"),
    },
  },
  {
    id: "upi-glare",
    why: "Photographed off a screen rather than screenshotted. Glare and rotation.",
    template: "upi",
    degrade: "glare",
    fields: {
      amount: shown("15600.00"),
      utr_or_upi_ref: shown("774310928265"),
      beneficiary_handle: shown("fastcart.pay@samplebank"),
      source_account_last4: shown("5127"),
      victim_bank: shown("Sample Bank"),
    },
  },
  {
    id: "upi-handle-cut",
    why: "The beneficiary is absent. The single most dangerous field to invent.",
    template: "upi",
    degrade: "crop-mid",
    fields: {
      amount: shown("62000.00"),
      utr_or_upi_ref: shown("336914481207"),
      beneficiary_handle: removed(),
      source_account_last4: shown("7042"),
      victim_bank: shown("Example Bank"),
    },
  },
  {
    id: "sms-dark-lowcontrast",
    why: "A dark-mode notification at low contrast, which is what a 2am screenshot looks like.",
    template: "sms-dark",
    degrade: "lowcontrast",
    fields: {
      amount: shown("9400.00"),
      utr_or_upi_ref: shown("650127384490"),
      beneficiary_handle: shown("bright.deals@demobank"),
      source_account_last4: shown("3355"),
      victim_bank: shown("Demo Bank"),
    },
  },
  {
    id: "sms-everything-cut",
    why: "Only the amount survives. Tests whether a sparse image pulls values out of nowhere.",
    template: "sms",
    degrade: "crop-hard",
    fields: {
      amount: shown("2100.00"),
      utr_or_upi_ref: removed(),
      beneficiary_handle: removed(),
      source_account_last4: removed(),
      victim_bank: removed(),
    },
  },
];

/* -------------------------------------------------------------------------- */

const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);

/** The visible text of a case, minus anything the degrade step cuts away. */
function bodyFor(testCase) {
  const f = testCase.fields;
  const v = (k) => (f[k]?.drawn ? f[k].value : null);
  return {
    amount: v("amount"),
    ref: v("utr_or_upi_ref"),
    handle: v("beneficiary_handle"),
    last4: v("source_account_last4"),
    bank: v("victim_bank"),
  };
}

function smsHtml(b, { dark = false } = {}) {
  const bg = dark ? "#101114" : "#f2f3f5";
  const card = dark ? "#1c1e23" : "#ffffff";
  const fg = dark ? "#e8e9ec" : "#14161a";
  const sub = dark ? "#9aa0a8" : "#5b626b";
  const parts = [
    `Rs.${Number(b.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} debited`,
    b.last4 ? `from A/c XX${b.last4}` : null,
    "on 24-08-26 at 21:14:07",
    b.handle ? `to VPA ${b.handle}` : null,
    b.ref ? `(UPI Ref ${b.ref})` : null,
  ].filter(Boolean);

  return `<div style="background:${bg};padding:26px;font-family:'Segoe UI',Roboto,system-ui,sans-serif">
    <div style="background:${card};border-radius:16px;padding:18px 20px;box-shadow:0 1px 6px rgba(0,0,0,.14)">
      <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px">
        <div style="width:22px;height:22px;border-radius:5px;background:#3a6ea8"></div>
        <!-- No fallback label. Rendering the word "Bank" when the bank name is
             cut would put a readable string in the image for a field whose
             answer key says UNREADABLE, and the model returning it would be
             scored as a hallucination it did not commit. -->
        <div style="font-size:13px;color:${sub};font-weight:600">${b.bank ? esc(b.bank) : ""}</div>
        <div style="font-size:12px;color:${sub};margin-left:auto">now</div>
      </div>
      <div style="font-size:17px;line-height:1.5;color:${fg}">
        Dear Customer, ${esc(parts.join(" "))}. Not you? Call your bank.
      </div>
    </div>
  </div>`;
}

function upiHtml(b) {
  const row = (label, value) =>
    value
      ? `<div style="display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px solid #e6e8eb">
           <div style="color:#6b7280;font-size:14px">${esc(label)}</div>
           <div style="color:#111827;font-size:14px;font-weight:600;font-family:ui-monospace,Menlo,monospace">${esc(value)}</div>
         </div>`
      : "";

  return `<div style="background:#eef0f3;padding:22px;font-family:'Segoe UI',Roboto,system-ui,sans-serif">
    <div style="background:#fff;border-radius:18px;padding:22px 20px">
      <div style="text-align:center;margin-bottom:16px">
        <div style="width:46px;height:46px;border-radius:50%;background:#12a150;margin:0 auto 10px;
                    color:#fff;font-size:26px;line-height:46px">&#10003;</div>
        <div style="font-size:14px;color:#6b7280">Payment successful</div>
        <div style="font-size:29px;font-weight:700;color:#111827;margin-top:5px">
          ${b.amount ? "&#8377;" + esc(Number(b.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })) : "&#8377;&nbsp;&nbsp;&nbsp;"}
        </div>
      </div>
      ${row("Paid to", b.handle)}
      ${row("UPI transaction ID", b.ref)}
      ${row("Debited from", b.last4 ? `XXXX${b.last4}` : null)}
      ${row("Bank", b.bank)}
      <div style="padding-top:11px;color:#9ca3af;font-size:12px;text-align:center">24 Aug 2026, 9:14 PM</div>
    </div>
  </div>`;
}

/** CSS applied to the whole frame to simulate a bad capture. */
const DEGRADE_CSS = {
  blur: "filter:blur(1.6px)",
  lowcontrast: "filter:contrast(0.62) brightness(0.9)",
  glare:
    "filter:brightness(1.1) contrast(0.9);transform:rotate(-1.4deg) scale(1.02);" +
    "background-image:linear-gradient(118deg,rgba(255,255,255,.62) 4%,rgba(255,255,255,0) 34%)",
};

/**
 * The crop-* degrades have no CSS entry on purpose.
 *
 * They work by `bodyFor` returning null for any field marked `removed()`, so
 * the template never emits that text and the pixels are never drawn. Masking
 * afterwards would leave the information recoverable in principle; omitting it
 * at the source is what makes "this could not have been read" a fact rather
 * than a judgement.
 */

async function main() {
  if (!CHROME) {
    console.error("No Chrome found. Set CHROME_PATH.");
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 620, height: 460, deviceScaleFactor: 2 });

  const manifest = [];

  for (const testCase of CASES) {
    const b = bodyFor(testCase);
    const inner =
      testCase.template === "upi"
        ? upiHtml(b)
        : smsHtml(b, { dark: testCase.template === "sms-dark" });

    const wrapStyle = DEGRADE_CSS[testCase.degrade] ?? "";
    const html = `<!doctype html><html><body style="margin:0">
      <div style="${wrapStyle}">${inner}</div></body></html>`;

    await page.setContent(html, { waitUntil: "domcontentloaded" });
    const file = `${testCase.id}.png`;
    const element = await page.$("body > div");
    await element.screenshot({ path: join(OUT_DIR, file) });

    manifest.push({
      id: testCase.id,
      why: testCase.why,
      image: `data/eval-images/${file}`,
      degrade: testCase.degrade,
      /** The answer key, written by the same object that drew the image. */
      expect: Object.fromEntries(
        Object.entries(testCase.fields).map(([k, v]) => [k, v.value]),
      ),
      /** Fields cut out of the image. A value for any of these is invented. */
      absent: Object.entries(testCase.fields)
        .filter(([, v]) => !v.drawn)
        .map(([k]) => k),
    });

    console.log(`  wrote ${file}${testCase.degrade ? `  (${testCase.degrade})` : ""}`);
  }

  await browser.close();

  writeFileSync(
    join(ROOT, "data", "extraction-eval.json"),
    `${JSON.stringify(
      {
        _README:
          "Generated by scripts/make-eval-images.mjs. The answer key and the image are " +
          "written by the same object, so they cannot drift. Every identifier is synthetic " +
          "and no VPA suffix here is one an Indian PSP issues. Regenerate with " +
          "`npm run eval:images`; score with `npm run eval:extract`.",
        cases: manifest,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`\n${manifest.length} images + answer key written.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
