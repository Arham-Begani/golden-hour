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

  intake: {
    heading: "What happened?",
    sub: "Give whatever is fastest. One of these is enough.",
    upload: "Add a screenshot",
    uploadHint: "The payment confirmation, the bank SMS, the debit alert",
    uploadNote: "The image is read and discarded. It is never stored.",
    imageReady: "Screenshot attached",
    remove: "Remove",
    paste: "Or paste the SMS, or type one sentence",
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

  intake: {
    heading: "क्या हुआ?",
    sub: "जो सबसे तेज़ हो वही दीजिए। इनमें से एक ही काफ़ी है।",
    upload: "स्क्रीनशॉट जोड़ें",
    uploadHint: "पेमेंट कन्फ़र्मेशन, बैंक का SMS, या डेबिट अलर्ट",
    uploadNote: "तस्वीर पढ़कर हटा दी जाती है। कहीं सेव नहीं होती।",
    imageReady: "स्क्रीनशॉट जुड़ गया",
    remove: "हटाएँ",
    paste: "या SMS पेस्ट करें, या एक वाक्य लिखें",
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
