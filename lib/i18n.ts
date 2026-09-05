/**
 * Copy.
 *
 * Rules, applied to every string in here:
 *   - Imperative. Say what to do.
 *   - No apology, no reassurance theatre, no exclamation marks.
 *   - Errors say what happened and what to do next.
 *   - A stressed reader does not parse hedging.
 *
 * A flat dictionary rather than an i18n library: one journey does not need
 * locale routing, and the library would cost a day it is not worth.
 *
 * NOTE: the Hindi below is a first pass and needs a native speaker to read it
 * before the pitch. Emergency instructions are the last place to ship
 * machine-shaped phrasing.
 */

import { elapsedParts } from "./decay";

export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABEL: Record<Lang, string> = { en: "English", hi: "हिन्दी" };

/** Short forms for the header toggle — the full names overflow a 360px screen. */
export const LANG_CODE: Record<Lang, string> = { en: "EN", hi: "हि" };

export const isLang = (value: unknown): value is Lang =>
  typeof value === "string" && (LANGS as readonly string[]).includes(value);

/**
 * Read the language cookie on the server so Hindi does not flash English on
 * first paint. Lives here rather than beside the provider because that module
 * is "use client", and a server component cannot call into one.
 */
export const langFromCookie = (value: string | undefined): Lang =>
  isLang(value) ? value : "en";

const en = {
  brand: "Golden Hour",

  prototype: {
    /**
     * Shown only in Hindi. The translation has not been read by a native
     * speaker, and emergency instructions are the last place to leave that
     * unsaid. Delete this string the day someone reviews lib/i18n.ts.
     */
    hindiUnreviewed:
      "The Hindi on this site has not been checked by a native speaker yet. If anything reads wrong, switch to English.",
    short: "Prototype — no bank integration",
    full: "Prototype. Not affiliated with I4C, NCRP or cybercrime.gov.in. Nothing here freezes anyone's money.",
  },

  /**
   * The landing page.
   *
   * The intake used to be the first screen, on the reasoning that anyone who
   * arrives already knows why they are here. That is true of the person the
   * product is for and false of everyone else who opens it — and the argument
   * this thing is making is not self-evident from a text box. So the sequence
   * gets explained once, here, and the report is one tap away at the top of
   * the page rather than behind the explanation.
   */
  landing: {
    eyebrow: "Cyber fraud reporting, re-sequenced",
    /**
     * Nine, because nine is what the product actually collects — FREEZE_FIELDS,
     * and the number the receipt counts against. This read "five facts" for a
     * while, borrowed from the concept doc's rhetoric, while every screen below
     * it said nine.
     */
    heading: "Send the bank the nine facts first.",
    /**
     * This sentence used to open "The national portal asks for about fifty
     * facts before it takes one."
     *
     * Nobody counted fifty. data/portal-benchmark.json refuses to guess that
     * exact figure, and /evidence says in as many words that guessing it would
     * discredit everything next to it — so the front page was asserting the one
     * number the evidence page declines to. Restore a count here only once a
     * human has opened the portal and made one.
     */
    sub: "The national portal collects the whole police complaint before it accepts anything. A bank needs a handful of those facts to place a hold, and it needs them while the money is still in the first account. Golden Hour sends that half first and collects the rest afterwards.",
    start: "Start a report",
    demo: "Walk through a demo case",
    evidence: "Read the claim and its limits",

    urgentHeading: "If money has just left your account",
    urgentBody: "This prototype cannot help you. Call 1930 — the national cyber fraud helpline — or file at cybercrime.gov.in.",

    howHeading: "How it goes",
    steps: [
      {
        title: "Give whatever is fastest",
        body: "A screenshot of the debit alert, a pasted SMS, or one spoken sentence. It is read into nine fields for the bank. Not one of them is required.",
        aside: "Target: under a minute",
      },
      {
        title: "Send, and get a number",
        body: "The packet goes with its holes in it, and the holes are named. A wrong reference number sends a bank after the wrong account; a blank one does not.",
        aside: "Acknowledgement",
      },
      {
        title: "Then the unhurried half",
        body: "The statement, your details, the suspect — everything the investigation needs, attached to that number. No clock on this half.",
        aside: "No deadline",
      },
    ],

    whyHeading: "Why it is split",
    whyBody: "The bank and the investigation want different things at different speeds. A hold has to be placed before the money moves onward. A case file can be built over weeks. One form asking for both at once runs the whole thing at the speed of the slower half.",
    whyBank: "The freeze needs",
    whyBankBody: "Amount, where it went, the reference, your bank, when. Minutes matter.",
    whyCase: "The case needs",
    whyCaseBody: "Statement, identity, address, suspect details, prior reports. Weeks are fine.",

    /**
     * The strongest evidence in the project, and it was buried four sections
     * down /evidence. The government already runs this sequence on the 1930
     * helpline: minimal packet, acknowledgement number, full complaint against
     * that number within 24 hours. That moves the argument from "a redesign
     * someone thought of" to "the state's own procedure disagrees with the
     * state's own web form", which is a different claim entirely.
     *
     * The quote is verbatim and the source sits next to it, per the rule that
     * a statistic is never shown on a separate references page.
     */
    alreadyHeading: "This sequence is already official procedure",
    alreadyBody: "Not on the website — on the phone. The portal's own instructions for reporting a financial fraud through 1930 take a short list of facts first, then say:",
    alreadyQuote: "the complainant will get a system generated Log-in Id/acknowledgement number through SMS/Mail. Using the above Log-in Id/acknowledgement number, the complainant must complete registration of complaint on National Cybercrime Reporting Portal (www.cybercrime.gov.in) within 24 hours.",
    alreadyAfter: "Minimal packet, acknowledgement number, full statement afterwards against that number. That is exactly the re-sequencing this prototype argues for. Golden Hour's claim is only that the web route should work the way the helpline already does.",
    alreadySource: "Citizen Financial Cyber Frauds Reporting and Management System — MHA / I4C",
    alreadySourceNote: "Marked “For Delhi Only”, which is a limit of the document, not of the argument.",

    honestHeading: "What this is not",
    honestBody: "It is not a government service and it freezes nothing. There is no bank integration and no CFCFRMS connection — nothing sent here reaches a bank, a police force or any government system. It is a prototype of a sequence, and the sequence is the argument.",

    measuredHeading: "Measured, not asserted",
    measuredBody: "Every dispatch is timed and the whole distribution is published, slow runs included. Demo replays are counted separately and never mixed in. Where a figure could not be traced to a source, it is left empty and the page says why.",
    measuredMedian: "Median time to dispatch",
    /**
     * Used until there are enough runs for "median" to mean anything —
     * ENOUGH_RUNS in lib/timings.ts, which /evidence reads from the same place.
     *
     * It carries no count of its own: the line underneath already says "2
     * recorded runs", and saying it twice in a tile this small reads as
     * hedging rather than as precision.
     */
    measuredSmall: "Time to dispatch",
    measuredNone: "Not yet measured",
    measuredRuns: (n: number) => `${n} recorded ${n === 1 ? "run" : "runs"}`,

    /**
     * The two pages that answer the two questions a sceptical reader has, and
     * that were previously reachable only by typing the URL.
     */
    checkHeading: "Check it yourself",
    checkBody: "None of these asks you to take our word for anything.",
    changesTitle: "What changed for Round 2, and what was wrong",
    changesBody: "The defects found auditing this project against itself, worst first, with the two that are still open listed at the top.",
    judgeTitle: "Time a run yourself",
    judgeBody: "A scenario, a stopwatch, and the live product on one screen. Nothing is pre-filled, and your run counts toward the median above.",
    honestyTitle: "What is real and what is not",
    honestyBody: "Every claim this prototype makes, line by line, marked real or not real — including the number we deleted because we could not source it.",
  },

  nav: {
    start: "Report",
    about: "What this is",
    judge: "Time a run",
    honesty: "What is real",
    changes: "What changed",
  },

  footer: {
    what: "What this is",
    real: "The real routes",
    source: "How it works",
  },

  intake: {
    heading: "What happened?",
    sub: "Give whatever is fastest. One of these is enough.",
    upload: "Add a screenshot",
    uploadHint: "The payment confirmation, the bank SMS, the debit alert",
    uploadNote: "The image is read and discarded. It is never stored.",
    imageReady: "Screenshot attached",
    remove: "Remove",
    or: "or",
    paste: "Paste the SMS, or type one sentence",
    placeholder: "Rs 12,500 debited to a UPI ID I don't recognise…",
    dictate: "Dictate",
    dictating: "Listening — tap to stop",
    submit: "Read this",
    reading: "Reading…",
    skip: "Enter the details myself",
    demo: "Demo cases",
  },

  meter: {
    label: "Time since the fraud",
    unknown: "Unknown",
    /**
     * The elapsed units, localised.
     *
     * `lib/decay.ts` stays pure and English — it is the tested module and its
     * job is arithmetic, not copy. The keys here are exactly the unit strings
     * `elapsedParts` returns, so the mapping is a lookup rather than a parse.
     * Before this existed the meter counted in English on every Hindi screen.
     */
    units: { min: "min", hour: "hour", hours: "hours", day: "day", days: "days" } as Record<
      string,
      string
    >,
    justNow: "just now",
    ago: (value: string, unit: string) => `${value} ${unit} ago`,
    unknownWhy: "We don't know when this happened yet.",
    since: "Fraud reported as",
    source: "Where this comes from",
    explainer:
      "Counted from when the fraud happened, not from when you opened this page.",
    /**
     * Bands, not percentages. No published figure gives a recovery rate by
     * elapsed time, so none is shown. See CITATIONS.md.
     */
    bands: {
      "first-hour": "Inside the first hour",
      "same-day": "Past the first hour",
      "first-week": "Past the first day",
      older: "More than a week ago",
    },
    bandWhy: {
      "first-hour": "A hold can still land before the money is moved onward. Send now.",
      "same-day": "The money has probably moved at least once. Still worth sending now.",
      "first-week": "Send it anyway. The account trail is still the investigation's starting point.",
      older: "Send it anyway. This is a police report now, and it still counts.",
    },
  },

  confirm: {
    heading: "Check these, then send",
    sub: "Correct anything that's wrong. Blanks are fine — send anyway.",
    when: "When did this happen?",
    whenSub: "We could not read a time. One tap is enough.",
    /**
     * Shown when the model DID read a time.
     *
     * This control used to render only when the timestamp was missing, which
     * meant a misread time could not be corrected at all — on the one field
     * that drives the meter and that a bank reads first.
     */
    whenRead: "Read from what you gave us. Change it if it is wrong.",
    whenEdited: "Set by you.",
    justNow: "Just now",
    withinHour: "Within the hour",
    today: "Earlier today",
    yesterday: "Yesterday",
    older: "Longer ago",
    unreadable: "Could not read",
    unreadableHint: "Blanks are deliberate. Nothing here is ever guessed at.",
    lowConfidence: "Low confidence",
    edited: "Edited",
    dropped: "Dropped",
    droppedWhy: "The model read this, but it isn't shaped like a real value, so it was dropped rather than sent wrong.",
    send: "Send freeze request",
    sending: "Sending…",
    holes: (n: number) => `${n} field${n === 1 ? "" : "s"} unreadable. Send anyway.`,
    complete: "Everything readable.",

    /**
     * The place the description arrives second.
     *
     * DECISIONS.md §3 justified /api/triage by saying the "is this still
     * happening" signal lives only in a sentence the user types, "which they
     * often type second" — but there was nowhere to type it second. A
     * screenshot-only intake could therefore never fire the interrupt, and the
     * route had no caller outside the eval. This is that missing surface.
     *
     * Optional, below the fields, and it never blocks the send button.
     */
    describe: "Anything else about what happened?",
    describeHint:
      "Optional. A screenshot cannot say whether this is still going on right now. A sentence can.",
    describePlaceholder: "He is still on the call telling me not to hang up…",
  },

  fields: {
    amount: "Amount",
    currency: "Currency",
    transaction_ref: "Transaction ID",
    utr_or_upi_ref: "UTR / UPI reference",
    occurred_at: "When it happened",
    beneficiary_handle: "Money went to",
    beneficiary_name: "Recipient name",
    victim_bank: "Your bank or app",
    source_account_last4: "Your account (last 4)",
    payment_rail: "Payment method",
    fraud_category: "Category",
  },

  interrupt: {
    heading: "Stop.",
    why: "You told us:",
    remote_access_app: {
      title: "Turn your phone off. Now.",
      body: "A remote-access app is installed. While it runs, whoever is on the other end can see and control this device. Hold the power button and switch it off. Report from a different device.",
    },
    screen_sharing: {
      title: "End the screen share. Now.",
      body: "Your screen is being watched. Disconnect the share before you do anything else, including typing here.",
    },
    caller_on_line: {
      title: "Hang up.",
      body: "Hang up now. Do not verify anything, do not confirm any code, do not transfer anything else. They will call back and threaten you. That is expected and it is not an emergency. No real police officer, bank or agency arrests anyone over a phone call.",
    },
    verification_transfer_requested: {
      title: "Do not send that transfer.",
      body: "There is no payment that unblocks, verifies, clears or releases your money. That request is the scam continuing. Send nothing further.",
    },
    tellHeading: "Tell one person. Right now.",
    tellBody:
      "Being told to keep this secret is part of how it works. One phone call to someone you trust ends it faster than anything on this page.",
    tellButton: "Send a message",
    tellSms: "Send by SMS",
    tellWhatsapp: "Send on WhatsApp",
    tellCopied: "Message copied",
    message:
      "I think I'm being scammed right now and I was told not to tell anyone. Please call me.",
    call1930: "Call 1930",
    continue: "I've done this — continue the report",
  },

  receipt: {
    heading: "Freeze request sent",
    ack: "Acknowledgement number",
    ackHint: "Write this down. Everything else attaches to it.",
    ackCopy: "Copy",
    ackCopied: "Copied",
    elapsed: "Time taken",
    sentWith: "Sent with",
    ofFields: (sent: number, total: number) => `${sent} of ${total} fields`,
    missing: "Sent blank",
    missingWhy: "These were unreadable. Sending them blank is deliberate — a wrong reference number sends a bank after the wrong account.",
    next: "Now the unhurried part",
    nextBody: "The statement, your details, the suspect. No clock on this half.",
    continue: "Continue the report",
    realHeading: "This is a prototype",
    realBody:
      "Nothing here reached a bank. To actually report this, call 1930 or file at cybercrime.gov.in.",
    call: "Call 1930",
    portal: "cybercrime.gov.in",
    retention: "This packet is deleted automatically after 24 hours.",

    /**
     * The payload block. "Dispatchable" was an assertion about an artefact
     * nobody could look at; this is the artefact.
     */
    payload: "What would be transmitted",
    payloadIntro:
      "The freeze packet in the shape a beneficiary bank would receive it. Fields that could not be read are absent and named under unreadable, so a hole cannot be mistaken for a value. The triage signals, the model's confidence scores and anything written for the police statement are deliberately not in here.",
    payloadNowhere:
      "This is posted nowhere. There is no bank integration and no CFCFRMS connection, which is why the payload says so about itself.",
  },

  report: {
    heading: "The rest of the report",
    sub: "Nothing here has a deadline. Saved as you type.",
    saved: "Saved",
    saving: "Saving…",
    statement: "What happened, in your words",
    statementHint: "As much or as little as you want.",
    reporter_name: "Your name",
    reporter_phone: "Your phone",
    reporter_email: "Your email",
    reporter_address: "Your address",
    relationship_to_victim: "Your relationship to the victim",
    relationshipHint: "Leave blank if it happened to you.",
    suspect_details: "Anything you know about who did this",
    suspectHint: "Numbers they called from, names they used, links they sent.",
    reported_elsewhere: "Reported anywhere else?",
    delay_reason: "If you waited before reporting, why?",
    delayHint: "Optional, and there is no wrong answer.",
    done: "Done for now",
  },

  evidence: {
    heading: "The claim",
    nav: "The claim",
  },

  errors: {
    unreadable: "Could not read that. Enter the details yourself — the clock is still running.",
    timeout: "The reader took too long. Enter the details yourself rather than wait.",
    network: "No connection. Enter the details yourself and send when you're back.",
    tooLarge: "That image is too big. Take a screenshot instead of a photo, or crop it.",
    badType: "That file type can't be read. Use a screenshot (PNG or JPG).",
    noAck: "That acknowledgement number isn't recognised. It may have expired.",
  },

  common: {
    back: "Back",
    optional: "Optional",
    seconds: "s",
  },
};

/**
 * Deliberately no `as const`: the English dictionary is the *shape* every other
 * language must match, not a set of literal values it has to equal. Widening
 * the strings is what lets `hi` be checked for completeness rather than for
 * being identical to English.
 */
type Dict = typeof en;

const hi: Dict = {
  brand: "गोल्डन आवर",

  prototype: {
    hindiUnreviewed:
      "इस साइट का हिन्दी अनुवाद अभी किसी हिन्दीभाषी ने जाँचा नहीं है। कुछ ग़लत लगे तो अंग्रेज़ी पर जाएँ।",
    short: "प्रोटोटाइप — किसी बैंक से जुड़ा नहीं",
    full: "यह एक प्रोटोटाइप है। I4C, NCRP या cybercrime.gov.in से इसका कोई संबंध नहीं है। यह किसी का पैसा फ़्रीज़ नहीं करता।",
  },

  landing: {
    eyebrow: "साइबर धोखाधड़ी की रिपोर्ट, नए क्रम में",
    heading: "बैंक को ज़रूरी नौ बातें पहले भेजिए।",
    sub: "राष्ट्रीय पोर्टल कुछ भी स्वीकार करने से पहले पूरी पुलिस शिकायत माँगता है। बैंक को रोक लगाने के लिए इनमें से गिनी-चुनी बातें चाहिए, और वह भी तब तक जब तक पैसा पहले खाते में है। गोल्डन आवर पहले वही आधा हिस्सा भेजता है, बाक़ी बाद में लेता है।",
    start: "रिपोर्ट शुरू करें",
    demo: "डेमो केस देखें",
    evidence: "दावा और उसकी सीमाएँ पढ़ें",

    urgentHeading: "अगर अभी-अभी आपके खाते से पैसा गया है",
    urgentBody: "यह प्रोटोटाइप आपकी मदद नहीं कर सकता। 1930 पर कॉल कीजिए — राष्ट्रीय साइबर धोखाधड़ी हेल्पलाइन — या cybercrime.gov.in पर शिकायत दर्ज कीजिए।",

    howHeading: "यह इस तरह चलता है",
    steps: [
      {
        title: "जो सबसे तेज़ हो वही दीजिए",
        body: "डेबिट अलर्ट का स्क्रीनशॉट, पेस्ट किया हुआ SMS, या बोला हुआ एक वाक्य। इसे पढ़कर बैंक के लिए नौ जानकारियाँ निकाली जाती हैं। इनमें से कोई भी अनिवार्य नहीं है।",
        aside: "लक्ष्य: एक मिनट से कम",
      },
      {
        title: "भेजिए, और नंबर लीजिए",
        body: "पैकेट अपनी ख़ाली जगहों के साथ जाता है, और वे ख़ाली जगहें बताई जाती हैं। ग़लत रेफ़रेंस नंबर बैंक को ग़लत खाते के पीछे भेज देता है; ख़ाली जगह नहीं भेजती।",
        aside: "पावती संख्या",
      },
      {
        title: "फिर बिना जल्दबाज़ी वाला हिस्सा",
        body: "बयान, आपकी जानकारी, आरोपी का विवरण — जाँच के लिए जो चाहिए, वह सब उसी नंबर से जुड़ जाता है। इस हिस्से पर कोई घड़ी नहीं।",
        aside: "कोई समय-सीमा नहीं",
      },
    ],

    whyHeading: "इसे दो हिस्सों में क्यों बाँटा गया",
    whyBody: "बैंक और जाँच, दोनों को अलग चीज़ें और अलग रफ़्तार चाहिए। रोक तब लगनी है जब तक पैसा आगे न बढ़े। केस फ़ाइल हफ़्तों में बन सकती है। एक ही फ़ॉर्म में दोनों माँगने से पूरा काम धीमे आधे हिस्से की रफ़्तार से चलता है।",
    whyBank: "रोक लगाने के लिए",
    whyBankBody: "रकम, पैसा कहाँ गया, रेफ़रेंस, आपका बैंक, कब हुआ। यहाँ मिनट मायने रखते हैं।",
    whyCase: "जाँच के लिए",
    whyCaseBody: "बयान, पहचान, पता, आरोपी का विवरण, पहले की शिकायतें। यहाँ हफ़्ते चल जाते हैं।",

    alreadyHeading: "यह क्रम पहले से सरकारी प्रक्रिया है",
    alreadyBody: "वेबसाइट पर नहीं — फ़ोन पर। 1930 के ज़रिए वित्तीय धोखाधड़ी की शिकायत के लिए पोर्टल के अपने निर्देश पहले थोड़ी-सी जानकारी लेते हैं, फिर कहते हैं:",
    alreadyQuote: "the complainant will get a system generated Log-in Id/acknowledgement number through SMS/Mail. Using the above Log-in Id/acknowledgement number, the complainant must complete registration of complaint on National Cybercrime Reporting Portal (www.cybercrime.gov.in) within 24 hours.",
    alreadyAfter: "थोड़ी-सी जानकारी, पावती संख्या, और उसके बाद उसी नंबर से जुड़ा पूरा बयान। यह प्रोटोटाइप ठीक यही क्रम माँगता है। गोल्डन आवर का दावा सिर्फ़ इतना है कि वेब वाला रास्ता भी वैसे ही चले जैसे हेल्पलाइन पहले से चलती है।",
    alreadySource: "Citizen Financial Cyber Frauds Reporting and Management System — MHA / I4C",
    alreadySourceNote: "इस दस्तावेज़ पर “For Delhi Only” लिखा है — यह दस्तावेज़ की सीमा है, तर्क की नहीं।",

    honestHeading: "यह क्या नहीं है",
    honestBody: "यह कोई सरकारी सेवा नहीं है और यह कुछ भी फ़्रीज़ नहीं करता। किसी बैंक से जुड़ाव नहीं है, CFCFRMS से जुड़ाव नहीं है — यहाँ से भेजी कोई चीज़ किसी बैंक, पुलिस या सरकारी सिस्टम तक नहीं जाती। यह एक क्रम का प्रोटोटाइप है, और वही क्रम इसका तर्क है।",

    measuredHeading: "दावा नहीं, माप",
    measuredBody: "हर भेजे गए पैकेट का समय मापा जाता है और पूरा आँकड़ा दिखाया जाता है, धीमे रन भी। डेमो रन अलग गिने जाते हैं और कभी इनमें नहीं मिलाए जाते। जिस आँकड़े का कोई स्रोत नहीं मिला, उसे ख़ाली छोड़ा गया है और वजह लिखी गई है।",
    measuredMedian: "भेजने में लगा औसत समय",
    measuredSmall: "भेजने में लगा समय",
    measuredNone: "अभी मापा नहीं गया",
    measuredRuns: (n: number) => `${n} दर्ज रन`,

    checkHeading: "ख़ुद जाँचिए",
    checkBody: "इनमें से किसी के लिए भी आपको हमारी बात मान लेने की ज़रूरत नहीं है।",
    changesTitle: "राउंड 2 में क्या बदला, और क्या ग़लत था",
    changesBody: "इस प्रोजेक्ट की ख़ुद की जाँच में मिली ख़ामियाँ, सबसे गंभीर पहले, और जो दो अब भी बाक़ी हैं वे सबसे ऊपर।",
    judgeTitle: "ख़ुद एक रन का समय मापिए",
    judgeBody: "एक परिस्थिति, एक स्टॉपवॉच, और साथ में चलता हुआ असली प्रोडक्ट। कुछ भी पहले से भरा नहीं है, और आपका रन ऊपर दिए औसत में गिना जाएगा।",
    honestyTitle: "क्या असली है और क्या नहीं",
    honestyBody: "इस प्रोटोटाइप का हर दावा, एक-एक करके, असली या नक़ली के रूप में चिह्नित — उस आँकड़े समेत जिसे स्रोत न मिलने पर हमने हटा दिया।",
  },

  nav: {
    start: "रिपोर्ट",
    about: "यह क्या है",
    judge: "रन का समय मापें",
    honesty: "क्या असली है",
    changes: "क्या बदला",
  },

  footer: {
    what: "यह क्या है",
    real: "असली रास्ते",
    source: "यह कैसे काम करता है",
  },

  intake: {
    heading: "क्या हुआ?",
    sub: "जो सबसे तेज़ हो वही दीजिए। इनमें से एक ही काफ़ी है।",
    upload: "स्क्रीनशॉट जोड़ें",
    uploadHint: "पेमेंट कन्फ़र्मेशन, बैंक का SMS, या डेबिट अलर्ट",
    uploadNote: "तस्वीर पढ़कर हटा दी जाती है। कहीं सेव नहीं होती।",
    imageReady: "स्क्रीनशॉट जुड़ गया",
    remove: "हटाएँ",
    or: "या",
    paste: "SMS पेस्ट करें, या एक वाक्य लिखें",
    placeholder: "एक अनजान UPI आईडी पर 12,500 रुपये कट गए…",
    dictate: "बोलकर लिखें",
    dictating: "सुन रहे हैं — रोकने के लिए दबाएँ",
    submit: "इसे पढ़ें",
    reading: "पढ़ रहे हैं…",
    skip: "मैं ख़ुद विवरण भरूँगा",
    demo: "डेमो केस",
  },

  meter: {
    label: "धोखाधड़ी को कितना समय हुआ",
    unknown: "पता नहीं",
    units: { min: "मिनट", hour: "घंटा", hours: "घंटे", day: "दिन", days: "दिन" },
    justNow: "अभी-अभी",
    ago: (value: string, unit: string) => `${value} ${unit} पहले`,
    unknownWhy: "यह कब हुआ, अभी हमें नहीं पता।",
    since: "धोखाधड़ी का समय",
    source: "यह जानकारी कहाँ से आई",
    explainer: "यह आपके बताए समय से गिना गया है, इस पेज को खोलने के समय से नहीं।",
    bands: {
      "first-hour": "पहले एक घंटे के भीतर",
      "same-day": "एक घंटे से ज़्यादा",
      "first-week": "एक दिन से ज़्यादा",
      older: "एक हफ़्ते से ज़्यादा",
    },
    bandWhy: {
      "first-hour": "पैसा आगे भेजे जाने से पहले रोक लग सकती है। अभी भेजें।",
      "same-day": "पैसा शायद एक बार आगे जा चुका है। फिर भी अभी भेजें।",
      "first-week": "फिर भी भेजें। खाते का रिकॉर्ड जाँच की शुरुआत है।",
      older: "फिर भी भेजें। यह अब पुलिस शिकायत है, और इसकी अहमियत है।",
    },
  },

  confirm: {
    heading: "जाँच लें, फिर भेजें",
    sub: "जो ग़लत है उसे ठीक करें। ख़ाली जगह चलेगी — फिर भी भेजें।",
    when: "यह कब हुआ?",
    whenSub: "हमें समय नहीं मिला। एक टैप काफ़ी है।",
    whenRead: "आपने जो दिया उसी से पढ़ा गया है। ग़लत हो तो बदल दीजिए।",
    whenEdited: "आपका बताया हुआ।",
    justNow: "अभी-अभी",
    withinHour: "एक घंटे के भीतर",
    today: "आज पहले",
    yesterday: "कल",
    older: "उससे भी पहले",
    unreadable: "पढ़ा नहीं जा सका",
    unreadableHint: "ख़ाली जगह जानबूझकर है। यहाँ किसी चीज़ का अंदाज़ा नहीं लगाया जाता।",
    lowConfidence: "कम भरोसा",
    edited: "बदला गया",
    dropped: "हटाया गया",
    droppedWhy: "यह पढ़ा तो गया, पर सही आकार का नहीं था, इसलिए ग़लत भेजने के बजाय हटा दिया गया।",
    send: "फ़्रीज़ अनुरोध भेजें",
    sending: "भेजा जा रहा है…",
    holes: (n: number) => `${n} जानकारी पढ़ी नहीं जा सकी। फिर भी भेजें।`,
    complete: "सब कुछ पढ़ लिया गया।",

    describe: "और कुछ बताना चाहेंगे कि क्या हुआ?",
    describeHint:
      "वैकल्पिक। स्क्रीनशॉट से यह पता नहीं चलता कि यह अभी भी चल रहा है या नहीं। एक वाक्य से चल जाता है।",
    describePlaceholder: "वह अभी भी कॉल पर है और कह रहा है कि फ़ोन मत काटो…",
  },

  fields: {
    amount: "रकम",
    currency: "मुद्रा",
    transaction_ref: "ट्रांज़ैक्शन आईडी",
    utr_or_upi_ref: "UTR / UPI रेफ़रेंस",
    occurred_at: "कब हुआ",
    beneficiary_handle: "पैसा कहाँ गया",
    beneficiary_name: "पाने वाले का नाम",
    victim_bank: "आपका बैंक या ऐप",
    source_account_last4: "आपका खाता (आख़िरी 4)",
    payment_rail: "भुगतान का तरीक़ा",
    fraud_category: "श्रेणी",
  },

  interrupt: {
    heading: "रुकिए।",
    why: "आपने बताया:",
    remote_access_app: {
      title: "फ़ोन अभी बंद कीजिए।",
      body: "रिमोट-एक्सेस ऐप इंस्टॉल है। जब तक वह चल रहा है, सामने वाला यह फ़ोन देख और चला सकता है। पावर बटन दबाकर फ़ोन बंद कीजिए। किसी दूसरे डिवाइस से रिपोर्ट कीजिए।",
    },
    screen_sharing: {
      title: "स्क्रीन शेयर तुरंत बंद कीजिए।",
      body: "आपकी स्क्रीन देखी जा रही है। कुछ भी और करने से पहले, यहाँ टाइप करने से भी पहले, शेयरिंग बंद कीजिए।",
    },
    caller_on_line: {
      title: "कॉल काट दीजिए।",
      body: "अभी कॉल काटिए। कुछ भी वेरिफ़ाई मत कीजिए, कोई कोड मत बताइए, और पैसा मत भेजिए। वे दोबारा फ़ोन करेंगे और डराएँगे। यह होना ही है और यह आपात स्थिति नहीं है। कोई असली पुलिस अधिकारी, बैंक या एजेंसी फ़ोन कॉल पर किसी को गिरफ़्तार नहीं करती।",
    },
    verification_transfer_requested: {
      title: "वह ट्रांसफ़र मत भेजिए।",
      body: "ऐसा कोई भुगतान नहीं होता जो आपका पैसा अनब्लॉक, वेरिफ़ाई या रिलीज़ करता हो। यह माँग ठगी का ही अगला क़दम है। और कुछ मत भेजिए।",
    },
    tellHeading: "अभी किसी एक को बताइए।",
    tellBody:
      "इसे छिपाने को कहना ठगी का ही हिस्सा है। किसी भरोसेमंद इंसान को एक कॉल इस पेज की हर चीज़ से जल्दी इसे रोक देती है।",
    tellButton: "संदेश भेजें",
    tellSms: "SMS से भेजें",
    tellWhatsapp: "WhatsApp पर भेजें",
    tellCopied: "संदेश कॉपी हो गया",
    message: "मुझे लगता है अभी मेरे साथ ठगी हो रही है और मुझे किसी को न बताने को कहा गया है। कृपया मुझे कॉल कीजिए।",
    call1930: "1930 पर कॉल करें",
    continue: "हो गया — रिपोर्ट जारी रखें",
  },

  receipt: {
    heading: "फ़्रीज़ अनुरोध भेजा गया",
    ack: "पावती संख्या",
    ackHint: "इसे लिख लीजिए। बाक़ी सब इसी से जुड़ता है।",
    ackCopy: "कॉपी करें",
    ackCopied: "कॉपी हो गया",
    elapsed: "लगा समय",
    sentWith: "भेजा गया",
    ofFields: (sent: number, total: number) => `${total} में से ${sent} जानकारियाँ`,
    missing: "ख़ाली भेजा गया",
    missingWhy: "ये पढ़ी नहीं जा सकीं। इन्हें ख़ाली भेजना जानबूझकर है — ग़लत रेफ़रेंस नंबर बैंक को ग़लत खाते के पीछे भेज देता है।",
    next: "अब बिना जल्दबाज़ी वाला हिस्सा",
    nextBody: "बयान, आपकी जानकारी, आरोपी का विवरण। इस हिस्से पर कोई घड़ी नहीं है।",
    continue: "रिपोर्ट जारी रखें",
    realHeading: "यह एक प्रोटोटाइप है",
    realBody:
      "यहाँ से कुछ भी किसी बैंक तक नहीं गया। असल में रिपोर्ट करने के लिए 1930 पर कॉल कीजिए या cybercrime.gov.in पर दर्ज कीजिए।",
    call: "1930 पर कॉल करें",
    portal: "cybercrime.gov.in",
    retention: "यह पैकेट 24 घंटे बाद अपने आप हट जाता है।",

    payload: "क्या भेजा जाता",
    payloadIntro:
      "फ़्रीज़ पैकेट, उसी रूप में जिसमें लाभार्थी बैंक को मिलता। जो जानकारी पढ़ी नहीं जा सकी वह इसमें है ही नहीं और unreadable के नीचे नाम से दर्ज है, ताकि ख़ाली जगह को कभी कोई मान न समझ ले। ट्रायाज संकेत, मॉडल का कॉन्फ़िडेंस और पुलिस बयान के लिए लिखी बातें जान-बूझकर इसमें नहीं हैं।",
    payloadNowhere:
      "यह कहीं नहीं भेजा जाता। किसी बैंक से जुड़ाव नहीं है और CFCFRMS से जुड़ाव नहीं है — इसीलिए पैकेट ख़ुद अपने बारे में यही कहता है।",
  },

  report: {
    heading: "बाक़ी रिपोर्ट",
    sub: "यहाँ किसी चीज़ की कोई समय-सीमा नहीं है। लिखते ही सेव होता रहता है।",
    saved: "सेव हो गया",
    saving: "सेव हो रहा है…",
    statement: "आपके शब्दों में, क्या हुआ",
    statementHint: "जितना चाहें उतना, या उतना ही कम।",
    reporter_name: "आपका नाम",
    reporter_phone: "आपका फ़ोन नंबर",
    reporter_email: "आपका ईमेल",
    reporter_address: "आपका पता",
    relationship_to_victim: "पीड़ित से आपका रिश्ता",
    relationshipHint: "अगर यह आपके साथ हुआ है तो ख़ाली छोड़ दें।",
    suspect_details: "जिसने यह किया, उसके बारे में जो भी पता हो",
    suspectHint: "जिन नंबरों से कॉल आई, जो नाम बताए, जो लिंक भेजे।",
    reported_elsewhere: "कहीं और भी शिकायत की है?",
    delay_reason: "अगर रिपोर्ट करने में देर हुई, तो क्यों?",
    delayHint: "वैकल्पिक, और कोई जवाब ग़लत नहीं है।",
    done: "फ़िलहाल हो गया",
  },

  evidence: {
    heading: "दावा",
    nav: "दावा",
  },

  errors: {
    unreadable: "यह पढ़ा नहीं जा सका। विवरण ख़ुद भरिए — घड़ी अब भी चल रही है।",
    timeout: "पढ़ने में बहुत समय लग रहा है। इंतज़ार के बजाय विवरण ख़ुद भरिए।",
    network: "कनेक्शन नहीं है। विवरण ख़ुद भरिए और कनेक्शन आने पर भेजिए।",
    tooLarge: "यह तस्वीर बहुत बड़ी है। फ़ोटो के बजाय स्क्रीनशॉट लीजिए, या उसे क्रॉप कीजिए।",
    badType: "यह फ़ाइल पढ़ी नहीं जा सकती। स्क्रीनशॉट (PNG या JPG) इस्तेमाल कीजिए।",
    noAck: "यह पावती संख्या पहचानी नहीं गई। शायद इसकी अवधि पूरी हो गई है।",
  },

  common: {
    back: "वापस",
    optional: "वैकल्पिक",
    seconds: "से",
  },
};

const DICTS: Record<Lang, Dict> = { en, hi };

export const t = (lang: Lang): Dict => DICTS[lang] ?? en;

/**
 * "14 minutes ago", in the reader's language.
 *
 * Lives here rather than in `lib/decay.ts` because it is copy, and decay.ts is
 * the tested arithmetic module — its `elapsedLabel` and `elapsedParts` stay
 * English and stay pinned. Both the meter and the confirm screen's timestamp
 * row go through this, so the same instant never renders two different ways on
 * one screen.
 */
export function elapsedText(lang: Lang, minutes: number): string {
  const copy = t(lang).meter;
  const { value, unit } = elapsedParts(minutes);
  if (value === "<1") return copy.justNow;
  return copy.ago(value, copy.units[unit] ?? unit);
}
