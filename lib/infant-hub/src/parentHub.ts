// Parent-Hub-parity data for the mobile InfantHub.
//
// Mirrors the data already shipped in the web Parent Hub
// (artifacts/kidschedule/src/components/infant-hub.tsx,
//  infant-sleep-module.tsx, infant-milestones.tsx, infant-baby-cues.tsx,
//  infant-sounds.tsx). Web is the source of truth — when an entry changes
// on web, mirror it here so the mobile featured InfantHub card stays in
// sync.
//
// All long-form copy is shipped as { en, hi, hin } objects so the mobile
// app can render the same depth of guidance in English, Hindi
// (Devanagari) or Hinglish (Roman script). Use `pickLang(field, lang)`
// from `./index` at the call site.

// Local alias for the localised-text shape. Mirrors the `LocalizedText`
// type re-exported from `./index` — re-defined here to avoid a circular
// import (index.ts already does `export * from "./parentHub"`).
type L = { en: string; hi: string; hin: string };

// ─── Sub-band helper (matches web `getBand` in infant-hub.tsx) ──────────────
export type InfantBand =
  | "0-3"
  | "3-6"
  | "6-9"
  | "9-12"
  | "12-18"
  | "18-24";

export function getInfantBand(months: number): InfantBand {
  if (months < 3) return "0-3";
  if (months < 6) return "3-6";
  if (months < 9) return "6-9";
  if (months < 12) return "9-12";
  if (months < 18) return "12-18";
  return "18-24";
}

// ─── Vaccinations (India NIS + IAP) ────────────────────────────────────────
export type VaxEntry = {
  ageLabel: string;
  ageMonths: number;
  vaccines: readonly string[];
};

export const VACCINATIONS: readonly VaxEntry[] = [
  { ageLabel: "Birth",     ageMonths: 0,    vaccines: ["BCG", "OPV-0", "Hep B-1"] },
  { ageLabel: "6 weeks",   ageMonths: 1.5,  vaccines: ["DTwP/DTaP-1", "IPV-1", "Hep B-2", "Hib-1", "Rotavirus-1", "PCV-1"] },
  { ageLabel: "10 weeks",  ageMonths: 2.5,  vaccines: ["DTwP/DTaP-2", "IPV-2", "Hib-2", "Rotavirus-2", "PCV-2"] },
  { ageLabel: "14 weeks",  ageMonths: 3.5,  vaccines: ["DTwP/DTaP-3", "IPV-3", "Hib-3", "Rotavirus-3", "PCV-3"] },
  { ageLabel: "6 months",  ageMonths: 6,    vaccines: ["OPV-1", "Hep B-3"] },
  { ageLabel: "9 months",  ageMonths: 9,    vaccines: ["OPV-2", "MMR-1", "Vitamin A-1"] },
  { ageLabel: "12 months", ageMonths: 12,   vaccines: ["PCV Booster", "Hep A-1", "Varicella-1"] },
  { ageLabel: "15 months", ageMonths: 15,   vaccines: ["MMR-2", "Varicella-2"] },
  { ageLabel: "18 months", ageMonths: 18,   vaccines: ["DTwP Booster-1", "IPV Booster-1", "Hib Booster", "Hep A-2"] },
  { ageLabel: "24 months", ageMonths: 24,   vaccines: ["Typhoid (TCV)"] },
];

/** Vaccinations due now or in the next 2 months. */
export function getUpcomingVaccinations(months: number): VaxEntry[] {
  return VACCINATIONS.filter(
    (v) => v.ageMonths >= months && v.ageMonths <= months + 2,
  );
}

/** Vaccinations whose target age has passed. */
export function getCompletedVaccinations(months: number): VaxEntry[] {
  return VACCINATIONS.filter((v) => v.ageMonths < months);
}

// ─── Per-child vaccination tracking ────────────────────────────────────────
//
// The child's status for a given schedule entry comes from the server-side
// `vaccination_logs` table (see `lib/db/src/schema/vaccination_logs.ts`).
// Status is keyed by the `ageLabel` string so the UI can pass a simple
// `Record<ageLabel, status>` map into the helpers below.

export type VaxStatus = "done" | "missed";
export type VaxLogMap = Readonly<Record<string, VaxStatus>>;

const EMPTY_LOG: VaxLogMap = {};

/** Vaccinations due now or in the next 2 months — excluding any marked "done". */
export function getUpcomingVaccinationsWithLog(
  months: number,
  log: VaxLogMap = EMPTY_LOG,
): VaxEntry[] {
  return getUpcomingVaccinations(months).filter(
    (v) => log[v.ageLabel] !== "done",
  );
}

/** Doses whose target age has already passed but the parent has not marked
 *  as "done" — these are the ones at risk of being forgotten. */
export function getPendingVaccinations(
  months: number,
  log: VaxLogMap = EMPTY_LOG,
): VaxEntry[] {
  return VACCINATIONS.filter(
    (v) => v.ageMonths < months && log[v.ageLabel] !== "done",
  );
}

export type VaccinationSummary = {
  /** Total entries in the schedule (constant). */
  total: number;
  /** Entries the parent has explicitly marked done. */
  done: number;
  /** Entries the parent has explicitly marked missed. */
  missed: number;
  /**
   * Entries whose target age has passed AND the parent has not marked them
   * "done". Includes entries explicitly marked "missed" so the parent sees
   * the gap they self-flagged.
   */
  pending: number;
};

/** Quick per-child rollup — drives the summary banner in the Health tab. */
export function getVaccinationSummary(
  months: number,
  log: VaxLogMap = EMPTY_LOG,
): VaccinationSummary {
  let done = 0;
  let missed = 0;
  let pending = 0;
  for (const v of VACCINATIONS) {
    const status = log[v.ageLabel];
    if (status === "done") done++;
    else if (status === "missed") {
      missed++;
      if (v.ageMonths < months) pending++;
    } else if (v.ageMonths < months) {
      pending++;
    }
  }
  return { total: VACCINATIONS.length, done, missed, pending };
}

// ─── Common issues ─────────────────────────────────────────────────────────
export type CommonIssue = {
  id: string;
  emoji: string;
  title: string;
  bands: readonly InfantBand[];
  content: L;
};

export const COMMON_ISSUES: readonly CommonIssue[] = [
  {
    id: "colic", emoji: "😭", title: "Colic / Excessive Crying",
    bands: ["0-3", "3-6"],
    content: {
      en: "Rule of 3: crying >3 hrs/day, >3 days/week, >3 weeks in a healthy baby. Try: gentle tummy massage clockwise, bicycle legs, white noise, feeding position upright 30 min after feed, check for gas. Usually peaks at 6 weeks and resolves by 3–4 months. See doctor if baby has fever or isn't eating.",
      hi: "3 का नियम: स्वस्थ बच्चे में रोना दिन में >3 घंटे, हफ़्ते में >3 दिन, >3 हफ़्ते तक। आज़माएँ: पेट पर घड़ी की दिशा में हल्की मालिश, साइकिल वाली टांगें, सफ़ेद शोर, फीड के 30 मिनट बाद तक सीधा रखना, गैस की जाँच। आमतौर पर 6 हफ़्ते पर सबसे ज़्यादा होता है और 3–4 महीने तक ठीक हो जाता है। बुख़ार हो या दूध न पी रहा हो तो डॉक्टर को दिखाएँ।",
      hin: "Rule of 3: healthy baby mein rona din mein >3 ghante, hafte mein >3 din, >3 hafte tak. Try karo: pet par clockwise gentle massage, bicycle legs, white noise, feed ke 30 min baad tak upright rakhna, gas check karo. Aam taur par 6 weeks par peak hota hai aur 3–4 months tak khud theek ho jaata hai. Agar bukhar ho ya doodh na pi raha ho toh doctor ko dikhao.",
    },
  },
  {
    id: "teething", emoji: "🦷", title: "Teething",
    bands: ["6-9", "9-12", "12-18"],
    content: {
      en: "First tooth usually arrives 6–10 months. Signs: drooling, gum rubbing, fussiness, mild fever (under 38°C). Help: cold teething ring, gentle gum massage with clean finger. Do NOT use teething gels with benzocaine. Mild symptoms are normal — high fever, rash or diarrhoea are not teething symptoms.",
      hi: "पहला दाँत आमतौर पर 6–10 महीने पर आता है। संकेत: लार बहना, मसूड़े रगड़ना, चिड़चिड़ापन, हल्का बुख़ार (38°C से कम)। राहत: ठंडा टीदिंग रिंग, साफ़ उंगली से मसूड़ों की हल्की मालिश। बेंज़ोकेन वाली टीदिंग जेल का इस्तेमाल न करें। हल्के लक्षण सामान्य हैं — तेज़ बुख़ार, चकत्ते या दस्त दाँत निकलने के लक्षण नहीं हैं।",
      hin: "Pehla daant aam taur par 6–10 months par aata hai. Signs: laar girna, gums ragadna, chidchidapan, halka bukhar (38°C se kam). Aaram ke liye: thanda teething ring, saaf ungli se gums par halka massage. Benzocaine wali teething gel kabhi use mat karo. Halke symptoms normal hain — tez bukhar, rashes ya diarrhoea teething ke signs nahi hain.",
    },
  },
  {
    id: "fever", emoji: "🌡️", title: "Fever",
    bands: ["0-3", "3-6", "6-9", "9-12", "12-18", "18-24"],
    content: {
      en: "Under 3 months: any temp ≥38°C → go to hospital immediately. 3–6 months: call doctor if ≥38°C or baby seems unwell. 6 months+: treat if uncomfortable with paracetamol (correct dose for weight). Keep hydrated. Go to ER if: temp ≥40°C, seizure, rash, stiff neck, won't stop crying, very lethargic.",
      hi: "3 महीने से छोटा: 38°C या ज़्यादा बुख़ार → तुरंत अस्पताल जाएँ। 3–6 महीने: 38°C से ऊपर हो या बच्चा ठीक न लगे तो डॉक्टर को कॉल करें। 6 महीने से बड़ा: तकलीफ़ हो तो पैरासिटामोल दें (वज़न के अनुसार सही खुराक)। पानी/दूध देते रहें। ER जाएँ अगर: तापमान ≥40°C, झटके, चकत्ते, गर्दन अकड़ी हो, रोना न रुके, बहुत सुस्त हो।",
      hin: "3 months se chote: koi bhi temp ≥38°C → turant hospital le jao. 3–6 months: 38°C se zyada ho ya baby unwell lage toh doctor ko call karo. 6 months+: agar uncomfortable lage toh paracetamol do (weight ke hisaab se correct dose). Hydrated rakho. ER jao agar: temp ≥40°C, seizure, rash, gardan akdi ho, rona band na ho, bahut lethargic ho.",
    },
  },
  {
    id: "cold", emoji: "🤧", title: "Cold / Stuffy Nose",
    bands: ["3-6", "6-9", "9-12", "12-18", "18-24"],
    content: {
      en: "Babies can't blow their nose — use a nasal aspirator and saline drops before feeds. Keep room humidified. Slightly elevate head end of mattress (not pillow). Under 2 years: NO over-the-counter cough/cold medicine. Breastfeed frequently — milk transfers antibodies. See doctor if breathing is laboured or symptoms worsen after 10 days.",
      hi: "बच्चे अपनी नाक नहीं छिड़क सकते — फीड से पहले नेज़ल एस्पिरेटर और सेलाइन ड्रॉप का इस्तेमाल करें। कमरे में नमी रखें। गद्दे का सिर वाला सिरा थोड़ा ऊँचा करें (तकिया नहीं)। 2 साल से छोटे: बिना डॉक्टर के सर्दी-खाँसी की दवा बिल्कुल न दें। बार-बार स्तनपान कराएँ — दूध एंटीबॉडी देता है। साँस लेने में दिक़्क़त हो या 10 दिन बाद हालत बिगड़े तो डॉक्टर को दिखाएँ।",
      hin: "Babies apni naak khud nahi sikod sakte — feed se pehle nasal aspirator aur saline drops use karo. Room mein humidity rakho. Mattress ka sir wala side thoda upar karo (pillow nahi). 2 saal se chote: bina doctor ke koi bhi cold/cough medicine BILKUL nahi. Bar-bar breastfeed karo — milk antibodies deta hai. Agar saans lene mein dikkat ho ya 10 din baad halat aur bigde toh doctor ko dikhao.",
    },
  },
];

export function getCommonIssuesForAge(months: number): CommonIssue[] {
  const band = getInfantBand(months);
  return COMMON_ISSUES.filter((i) => i.bands.includes(band));
}

// ─── Milestones (motor / cognitive / social / language) ────────────────────
export type MilestoneCategory = "motor" | "cognitive" | "social" | "language";

export type Milestone = {
  id: string;
  emoji: string;
  title: string;
  category: MilestoneCategory;
  explanation: L;
  whyItMatters: L;
  activity: L;
  fromMonths: number;
  toMonths: number;
};

export const MILESTONES: readonly Milestone[] = [
  // 0–3 months
  { id: "b03_head_lift",    emoji: "💪", title: "Head Control Improving",   category: "motor",     fromMonths: 0, toMonths: 4,
    explanation: {
      en: "Baby starts lifting their head briefly during tummy time.",
      hi: "बच्चा पेट के बल लेटते समय थोड़ी देर के लिए सिर उठाने लगता है।",
      hin: "Baby tummy time ke dauran thodi der ke liye sir uthana shuru kar deta hai.",
    },
    whyItMatters: {
      en: "Strong neck muscles are the foundation for rolling, sitting, crawling — every motor milestone builds on this.",
      hi: "गर्दन की मज़बूत मांसपेशियाँ करवट, बैठने और रेंगने की नींव हैं — हर मोटर मील का पत्थर इसी पर बनता है।",
      hin: "Mazboot neck muscles rolling, baithne aur crawling ki neev hain — har motor milestone isi par banta hai.",
    },
    activity: {
      en: "Place baby on tummy on a firm surface and lie down face-to-face. Talk and smile to encourage head lifting.",
      hi: "बच्चे को सख़्त सतह पर पेट के बल लिटाएँ और आमने-सामने लेटें। सिर उठाने के लिए बात करें और मुस्कुराएँ।",
      hin: "Baby ko firm surface par tummy par litao aur face-to-face leto. Sir uthane ke liye baat karo aur smile do.",
    } },
  { id: "b03_social_smile", emoji: "😊", title: "First Social Smile",       category: "social",    fromMonths: 0, toMonths: 4,
    explanation: {
      en: "Baby smiles back when you smile or talk — a real intentional smile, not gas.",
      hi: "जब आप मुस्कुराते या बात करते हैं तो बच्चा वापस मुस्कुराता है — असली, जान-बूझकर दी गई मुस्कान, गैस से नहीं।",
      hin: "Jab aap smile karte ya baat karte ho, baby wapas smile karta hai — real intentional smile, gas se nahi.",
    },
    whyItMatters: {
      en: "The first sign that baby recognises connection. It strengthens parent-baby bonding hormones for both of you.",
      hi: "यह पहला संकेत है कि बच्चा रिश्ते को पहचानता है। यह माँ/पिता और बच्चे दोनों के बंधन वाले हॉर्मोन मज़बूत करता है।",
      hin: "Yeh pehla sign hai ki baby connection ko pehchanta hai. Parent-baby bonding hormones dono ke liye strengthen hote hain.",
    },
    activity: {
      en: "Get face-to-face about 25 cm away. Smile widely and say their name in a sing-song tone. Wait 5 seconds for a response.",
      hi: "लगभग 25 सेमी की दूरी पर आमने-सामने आएँ। चौड़ी मुस्कान दें और बच्चे का नाम सुर में लें। जवाब के लिए 5 सेकंड रुकें।",
      hin: "Lagbhag 25 cm dur face-to-face aao. Wide smile do aur baby ka naam sing-song tone mein lo. Response ke liye 5 second ruko.",
    } },
  { id: "b03_eye_track",    emoji: "👀", title: "Tracking with Eyes",       category: "cognitive", fromMonths: 1, toMonths: 5,
    explanation: {
      en: "Baby's eyes follow a moving face or toy from one side to the other.",
      hi: "बच्चे की आँखें हिलते हुए चेहरे या खिलौने को एक तरफ़ से दूसरी तरफ़ तक देखती हैं।",
      hin: "Baby ki aankhein moving face ya toy ko ek side se dusri side tak follow karti hain.",
    },
    whyItMatters: {
      en: "Visual tracking trains the brain's attention system — the same system that will later support reading.",
      hi: "नज़र से पीछा करना दिमाग़ के ध्यान-तंत्र को सिखाता है — वही तंत्र आगे चलकर पढ़ने में मदद करता है।",
      hin: "Visual tracking dimaag ke attention system ko train karta hai — yahi system aage chal kar reading mein help karega.",
    },
    activity: {
      en: "Hold a black-and-white card or your face 25 cm from baby. Slowly move side-to-side. They should follow.",
      hi: "एक काले-सफ़ेद कार्ड या अपना चेहरा बच्चे से 25 सेमी दूर रखें। धीरे-धीरे एक तरफ़ से दूसरी तरफ़ ले जाएँ। बच्चे को पीछा करना चाहिए।",
      hin: "Black-and-white card ya apna face baby se 25 cm dur rakho. Dheere-dheere side-to-side move karo. Baby follow karega.",
    } },
  { id: "b03_coo",          emoji: "🗣️", title: "First Coos & Vowels",     category: "language",  fromMonths: 1, toMonths: 5,
    explanation: {
      en: "Baby makes soft 'aah' and 'ooh' sounds, especially when looking at you.",
      hi: "बच्चा हल्की ‘आह’ और ‘ऊह’ जैसी आवाज़ें निकालता है, ख़ासकर जब आपकी ओर देख रहा हो।",
      hin: "Baby halki 'aah' aur 'ooh' jaisi awaazein nikalta hai, khaaskar jab aapki taraf dekh raha ho.",
    },
    whyItMatters: {
      en: "Cooing is baby's first attempt at conversation. Every coo you respond to wires the speech centre of their brain.",
      hi: "ये आवाज़ें बातचीत की बच्चे की पहली कोशिश हैं। आप हर आवाज़ का जवाब देते हैं तो दिमाग़ का बोलने वाला हिस्सा मज़बूत होता है।",
      hin: "Cooing baby ki first conversation try hai. Aap har coo ka response dete ho toh brain ka speech centre wire hota hai.",
    },
    activity: {
      en: "When baby coos, copy the sound back exactly. Pause for 5 seconds. They'll often try again.",
      hi: "जब बच्चा आवाज़ करे तो वही आवाज़ हू-ब-हू दोहराएँ। 5 सेकंड रुकें। बच्चा अक्सर फिर कोशिश करेगा।",
      hin: "Jab baby coo kare, wahi sound exactly wapas karo. 5 second ruko. Baby aksar phir try karega.",
    } },
  { id: "b03_hands",        emoji: "✋", title: "Discovers Their Hands",    category: "cognitive", fromMonths: 2, toMonths: 5,
    explanation: {
      en: "Baby looks at their own hands, brings them to mouth, and starts to grab.",
      hi: "बच्चा अपने हाथों को देखता है, मुँह में ले जाता है और पकड़ने लगता है।",
      hin: "Baby apne haathon ko dekhta hai, muh mein le jata hai, aur pakadna shuru karta hai.",
    },
    whyItMatters: {
      en: "Discovering 'these are mine!' is the start of body awareness — the foundation of self-concept.",
      hi: "‘ये मेरे हैं!’ यह समझना शरीर की पहचान की शुरुआत है — आत्म-बोध की नींव।",
      hin: "'Ye mere hain!' yeh samajhna body awareness ki shuruat hai — self-concept ki neev.",
    },
    activity: {
      en: "Lay baby on back and place your finger or a soft rattle in their palm. Their grip reflex will close.",
      hi: "बच्चे को पीठ के बल लिटाएँ और हथेली में अपनी उंगली या एक नरम झुनझुना रखें। पकड़ने वाला रिफ़्लेक्स बंद हो जाएगा।",
      hin: "Baby ko back par litao aur uski hatheli mein apni ungli ya soft rattle rakho. Grip reflex band ho jayega.",
    } },

  // 3–6 months
  { id: "b36_roll",         emoji: "🔄", title: "First Roll Over",          category: "motor",     fromMonths: 3, toMonths: 7,
    explanation: {
      en: "Baby rolls from tummy to back (back-to-tummy comes later, around 5–6 months).",
      hi: "बच्चा पेट से पीठ की ओर करवट लेता है (पीठ से पेट थोड़ा बाद, लगभग 5–6 महीने पर)।",
      hin: "Baby tummy se back par roll karta hai (back-to-tummy thoda baad, lagbhag 5–6 months par).",
    },
    whyItMatters: {
      en: "Rolling shows baby has the core strength and coordination to start moving — a huge leap toward independent mobility.",
      hi: "करवट लेना दिखाता है कि बच्चे के पास हिलने-डुलने की कोर ताक़त और तालमेल है — स्वतंत्र चलने-फिरने की ओर बड़ा क़दम।",
      hin: "Rolling dikhata hai ki baby mein move karne ki core strength aur coordination hai — independent mobility ki taraf bada step.",
    },
    activity: {
      en: "During tummy time, gently rock baby's hip to one side to give them the feel of rolling. Don't do the work — just hint.",
      hi: "पेट के बल खेल के दौरान बच्चे के कूल्हे को धीरे से एक तरफ़ हिलाएँ ताकि करवट लेने का अहसास हो। पूरा काम न करें — बस संकेत दें।",
      hin: "Tummy time ke dauran baby ki hip ko gently ek side jhulao taaki rolling ka feel ho. Pura kaam mat karo — sirf hint do.",
    } },
  { id: "b36_head_steady",  emoji: "👶", title: "Head Held Steady",         category: "motor",     fromMonths: 3, toMonths: 6,
    explanation: {
      en: "When held upright, baby keeps their head steady without bobbing.",
      hi: "जब सीधा गोद में लिया जाए तो बच्चा बिना डगमगाए सिर सीधा रखता है।",
      hin: "Jab upright pakda jaye, baby bina bobbing kiye sir steady rakhta hai.",
    },
    whyItMatters: {
      en: "Steady head = ready to sit, ready to start solids safely, ready to see the world from your eye-level.",
      hi: "स्थिर सिर = बैठने को तैयार, सुरक्षित रूप से ठोस आहार शुरू करने को तैयार, आपकी आँख की ऊँचाई से दुनिया देखने को तैयार।",
      hin: "Steady head = baithne ke liye ready, safely solids start karne ke liye ready, aapki eye-level se duniya dekhne ke liye ready.",
    },
    activity: {
      en: "Hold baby upright on your lap facing outward. Talk to them so they look around. The looking strengthens neck muscles.",
      hi: "बच्चे को अपनी गोद में सीधा बिठाएँ, मुँह बाहर की ओर। बात करें ताकि वह इधर-उधर देखे। देखने से गर्दन की मांसपेशियाँ मज़बूत होती हैं।",
      hin: "Baby ko apni god mein upright pakdo, face bahar ki taraf. Baat karo taaki idhar-udhar dekhe. Dekhne se neck muscles strong hote hain.",
    } },
  { id: "b36_laugh",        emoji: "😆", title: "First Belly Laugh",        category: "social",    fromMonths: 3, toMonths: 6,
    explanation: {
      en: "Baby laughs out loud — not just smiles, but real giggles in response to play.",
      hi: "बच्चा खुलकर हँसता है — सिर्फ़ मुस्कान नहीं, खेल पर असली खिलखिलाहट।",
      hin: "Baby khulkar hasta hai — sirf smile nahi, play par real giggles.",
    },
    whyItMatters: {
      en: "Laughter releases bonding hormones in BOTH of you. It's also a sign their emotional brain is thriving.",
      hi: "हँसी आप दोनों में बंधन वाले हॉर्मोन छोड़ती है। यह भी संकेत है कि बच्चे का भावनात्मक दिमाग़ अच्छी तरह बढ़ रहा है।",
      hin: "Hasi aap DONO mein bonding hormones release karti hai. Yeh bhi sign hai ki baby ka emotional brain achha grow ho raha hai.",
    },
    activity: {
      en: "Try gentle blowing on tummy, peek-a-boo, or surprise faces. Find what makes YOUR baby giggle.",
      hi: "पेट पर हल्की फूँक मारें, पीकू-बू खेलें या चौंकाने वाले चेहरे बनाएँ। ढूंढिए कि आपके बच्चे को क्या हँसाता है।",
      hin: "Pet par halki phoonk maro, peek-a-boo karo, ya surprise faces banao. Dhundo ki AAPKE baby ko kya hasata hai.",
    } },
  { id: "b36_reach",        emoji: "🤲", title: "Reaches for Objects",      category: "motor",     fromMonths: 3, toMonths: 6,
    explanation: {
      en: "Baby reaches out and bats at toys, eventually grabbing them.",
      hi: "बच्चा हाथ बढ़ाकर खिलौनों को छूता और मारता है, फिर पकड़ने लगता है।",
      hin: "Baby haath badhakar toys ko chuata aur maarta hai, dhire-dhire pakadna shuru karta hai.",
    },
    whyItMatters: {
      en: "Hand-eye coordination is the building block of every fine-motor skill — eating, drawing, writing, dressing.",
      hi: "हाथ-आँख का तालमेल हर बारीक मोटर कौशल की नींव है — खाना, चित्र बनाना, लिखना, कपड़े पहनना।",
      hin: "Hand-eye coordination har fine-motor skill ki neev hai — khaana, drawing, likhna, kapde pehenna.",
    },
    activity: {
      en: "Hold a soft, rattly toy 20 cm from baby's hand. Wait. Let them work for it.",
      hi: "एक नरम, झुनझुने वाला खिलौना बच्चे के हाथ से 20 सेमी दूर पकड़ें। रुकें। बच्चे को ख़ुद कोशिश करने दें।",
      hin: "Soft rattly toy baby ke haath se 20 cm dur pakdo. Ruko. Baby ko khud effort karne do.",
    } },
  { id: "b36_babble",       emoji: "👄", title: "Babbling Begins",          category: "language",  fromMonths: 4, toMonths: 8,
    explanation: {
      en: "Baby strings consonants together: 'ba-ba', 'da-da', 'ma-ma' — without meaning yet.",
      hi: "बच्चा व्यंजन जोड़ने लगता है: ‘बा-बा’, ‘दा-दा’, ‘मा-मा’ — अभी अर्थ के बिना।",
      hin: "Baby consonants jodne lagta hai: 'ba-ba', 'da-da', 'ma-ma' — abhi meaning ke bina.",
    },
    whyItMatters: {
      en: "Babbling is brain rehearsal for real words. Every babble is the speech motor system practicing.",
      hi: "बबलिंग असली शब्दों के लिए दिमाग़ की रिहर्सल है। हर बबल बोलने वाले मोटर तंत्र का अभ्यास है।",
      hin: "Babbling real words ke liye brain rehearsal hai. Har babble speech motor system ki practice hai.",
    },
    activity: {
      en: "Sit face-to-face. Slowly say 'ba-ba' or 'ma-ma' with exaggerated lip movement. Pause and watch them try.",
      hi: "आमने-सामने बैठें। धीरे-धीरे ‘बा-बा’ या ‘मा-मा’ बोलें, होंठ साफ़-साफ़ हिलाएँ। रुककर देखिए कि बच्चा कोशिश करता है।",
      hin: "Face-to-face baitho. Dheere-dheere 'ba-ba' ya 'ma-ma' bolo, lips exaggerate karke hilao. Ruko aur dekho ki baby try karta hai.",
    } },

  // 6–12 months
  { id: "b612_sit",         emoji: "🪑", title: "Sits Without Support",     category: "motor",     fromMonths: 5, toMonths: 9,
    explanation: {
      en: "Baby sits independently for a minute or longer without falling over.",
      hi: "बच्चा बिना गिरे एक मिनट या उससे ज़्यादा अकेले बैठता है।",
      hin: "Baby bina girey ek minute ya zyada akele baithta hai.",
    },
    whyItMatters: {
      en: "Independent sitting frees both hands for play — a huge boost for cognitive and fine-motor development.",
      hi: "अकेले बैठना दोनों हाथ खेलने के लिए खाली कर देता है — मानसिक और बारीक मोटर विकास के लिए बड़ी मदद।",
      hin: "Independent baithna dono haath play ke liye free kar deta hai — cognitive aur fine-motor development ke liye bada boost.",
    },
    activity: {
      en: "Sit on the floor with baby between your legs (no support). Roll a soft ball back and forth.",
      hi: "बच्चे को अपनी टांगों के बीच बिठाएँ (बिना सहारे) और ख़ुद ज़मीन पर बैठें। एक नरम गेंद को आगे-पीछे लुढ़काएँ।",
      hin: "Floor par baitho aur baby ko apni legs ke beech bithao (bina support). Soft ball aage-piche roll karo.",
    } },
  { id: "b612_crawl",       emoji: "🐛", title: "Starts to Crawl",          category: "motor",     fromMonths: 6, toMonths: 12,
    explanation: {
      en: "Baby moves themselves across the floor — could be classic crawl, army crawl, or bottom-shuffle. All count!",
      hi: "बच्चा फ़र्श पर ख़ुद को आगे बढ़ाता है — साधारण रेंगना, आर्मी क्रॉल या कूल्हे पर खिसकना — सब चलेंगे!",
      hin: "Baby khud ko floor par move karta hai — classic crawl, army crawl ya bottom-shuffle — sab count hote hain!",
    },
    whyItMatters: {
      en: "Crawling cross-wires the left and right sides of the brain — important for coordination, attention, and even reading later.",
      hi: "रेंगना दिमाग़ के बाएँ-दाएँ हिस्सों को जोड़ता है — तालमेल, ध्यान और आगे चलकर पढ़ने के लिए ज़रूरी।",
      hin: "Crawl karna brain ke left aur right side ko cross-wire karta hai — coordination, attention aur baad mein reading ke liye bhi important.",
    },
    activity: {
      en: "Place a favourite toy 30 cm in front of baby during tummy time. Don't move it. Let them figure out movement.",
      hi: "पेट के बल खेल के समय बच्चे के सामने 30 सेमी दूर पसंदीदा खिलौना रखें। उसे न हिलाएँ। बच्चे को ख़ुद हिलना ढूँढने दें।",
      hin: "Tummy time mein baby ke saamne 30 cm dur favourite toy rakho. Hilao mat. Baby ko khud movement figure out karne do.",
    } },
  { id: "b612_pincer",      emoji: "🤏", title: "Pincer Grip",              category: "motor",     fromMonths: 7, toMonths: 12,
    explanation: {
      en: "Baby picks up small objects (e.g. a piece of soft puffed cereal) with thumb and forefinger.",
      hi: "बच्चा अंगूठे और तर्जनी से छोटी चीज़ें उठाता है (जैसे फूले हुए नर्म अनाज का टुकड़ा)।",
      hin: "Baby thumb aur forefinger se chhoti cheezein uthata hai (jaise soft puffed cereal ka piece).",
    },
    whyItMatters: {
      en: "Pincer grip = independence at meals, plus the foundation for writing, buttoning, and using utensils.",
      hi: "पिंसर ग्रिप = खाने में आत्मनिर्भरता, और लिखने, बटन लगाने व चम्मच पकड़ने की नींव।",
      hin: "Pincer grip = meals mein independence, aur likhne, button lagane aur spoon use karne ki neev.",
    },
    activity: {
      en: "Place 3–4 puffed cereal pieces on baby's high-chair tray. Sit and let them figure out the pickup.",
      hi: "बच्चे की हाई-चेयर ट्रे पर 3–4 फूले अनाज के टुकड़े रखें। पास बैठिए और बच्चे को ख़ुद उठाना सीखने दें।",
      hin: "Baby ki high-chair tray par 3–4 puffed cereal pieces rakho. Paas baitho aur baby ko khud pickup figure out karne do.",
    } },
  { id: "b612_object_perm", emoji: "🙈", title: "Object Permanence",        category: "cognitive", fromMonths: 6, toMonths: 12,
    explanation: {
      en: "Baby looks for a toy when you hide it under a cloth — they understand it still exists.",
      hi: "जब आप खिलौना कपड़े के नीचे छिपाते हैं तो बच्चा उसे ढूँढता है — वह समझ गया कि वह अब भी मौजूद है।",
      hin: "Jab aap toy cloth ke neeche chupate ho, baby usse dhundta hai — woh samajh gaya ki toy abhi bhi exist karta hai.",
    },
    whyItMatters: {
      en: "This is one of the biggest cognitive leaps in infancy. It also means separation anxiety is normal and developmental.",
      hi: "यह बचपन की सबसे बड़ी मानसिक छलांगों में से एक है। इसका मतलब है कि अलगाव की चिंता सामान्य और विकास का हिस्सा है।",
      hin: "Yeh infancy ke sabse bade cognitive leaps mein se ek hai. Iska matlab separation anxiety bhi normal aur developmental hai.",
    },
    activity: {
      en: "Cover a favourite toy partly with a cloth in front of baby. Watch — they should pull the cloth off.",
      hi: "बच्चे के सामने पसंदीदा खिलौने को आधा कपड़े से ढकें। देखिए — बच्चा कपड़ा खींचकर हटाएगा।",
      hin: "Baby ke saamne favourite toy ko thoda cloth se cover karo. Dekho — baby cloth kheench ke hatayega.",
    } },
  { id: "b612_mama",        emoji: "💖", title: "First Meaningful Word",    category: "language",  fromMonths: 8, toMonths: 14,
    explanation: {
      en: "Baby says 'mama', 'dada', or another word AND clearly means it (e.g. says 'mama' when looking at you).",
      hi: "बच्चा ‘मामा’, ‘दादा’ या कोई और शब्द कहता है और साफ़ तौर पर उसका मतलब समझता है (जैसे आपकी ओर देखते हुए ‘मामा’ कहता है)।",
      hin: "Baby 'mama', 'dada' ya koi aur word bolta hai AUR clearly uska matlab samajhta hai (jaise aapko dekh kar 'mama' bolta hai).",
    },
    whyItMatters: {
      en: "The first true word marks the shift from babbling to symbolic language — a doorway to all communication.",
      hi: "पहला सच्चा शब्द बबलिंग से प्रतीकात्मक भाषा की ओर बढ़ने का निशान है — पूरी बातचीत का दरवाज़ा।",
      hin: "Pehla true word babbling se symbolic language ki shift ka nishan hai — saari communication ka darwaza.",
    },
    activity: {
      en: "Whenever you appear, say 'Mama is here!' (or your name). Repeat the word linked to YOU consistently.",
      hi: "जब भी आप सामने आएँ, कहें ‘मामा आ गई!’ (या अपना नाम)। उसी शब्द को अपने साथ बार-बार जोड़कर बोलें।",
      hin: "Jab bhi aap saamne aao, bolo 'Mama aa gayi!' (ya apna naam). AAPSE juda word consistently repeat karo.",
    } },
  { id: "b612_wave",        emoji: "👋", title: "Waves Bye-Bye",            category: "social",    fromMonths: 7, toMonths: 12,
    explanation: {
      en: "Baby waves when prompted — and eventually starts waving on their own.",
      hi: "कहने पर बच्चा हाथ हिलाता है — और धीरे-धीरे ख़ुद से भी हिलाने लगता है।",
      hin: "Bolne par baby haath hilata hai — aur dheere-dheere khud bhi wave karne lagta hai.",
    },
    whyItMatters: {
      en: "Waving is symbolic gesture — the same brain skill that lets them later use signs and then words to communicate.",
      hi: "हाथ हिलाना प्रतीकात्मक इशारा है — वही दिमाग़ी कौशल जो आगे चलकर इशारों और फिर शब्दों से बातचीत करने देता है।",
      hin: "Wave karna symbolic gesture hai — wahi brain skill jo aage chal kar signs aur phir words se communicate karne deti hai.",
    },
    activity: {
      en: "Every time someone leaves, say 'Bye-bye' clearly and wave. Take baby's hand and wave it gently.",
      hi: "हर बार जब कोई जाए, साफ़-साफ़ ‘बाय-बाय’ कहें और हाथ हिलाएँ। बच्चे का हाथ पकड़कर धीरे से हिलाएँ।",
      hin: "Jab bhi koi jaye, clearly 'Bye-bye' bolo aur wave karo. Baby ka haath pakad ke gently hilao.",
    } },
  { id: "b612_pull_stand",  emoji: "🧍", title: "Pulls to Standing",        category: "motor",     fromMonths: 8, toMonths: 13,
    explanation: {
      en: "Baby uses furniture (sofa, low table) to pull themselves up to standing.",
      hi: "बच्चा फ़र्नीचर (सोफ़ा, छोटी मेज़) पकड़कर ख़ुद को खड़ा कर लेता है।",
      hin: "Baby furniture (sofa, low table) pakad ke khud ko khada kar leta hai.",
    },
    whyItMatters: {
      en: "The strength + balance to stand is the precursor to cruising along furniture and then to walking.",
      hi: "खड़े होने की ताक़त और संतुलन फ़र्नीचर पकड़कर चलने की और फिर चलने की पहली सीढ़ी है।",
      hin: "Khade hone ki strength + balance furniture pakad kar chalne aur phir walking ka pehla step hai.",
    },
    activity: {
      en: "Place a favourite toy on a low, sturdy surface. Sit baby on the floor next to it. Watch them work.",
      hi: "एक छोटी, मज़बूत सतह पर पसंदीदा खिलौना रखें। बच्चे को उसके पास ज़मीन पर बिठाएँ। देखिए वह कैसे कोशिश करता है।",
      hin: "Low sturdy surface par favourite toy rakho. Baby ko uske paas floor par bithao. Dekho woh kaise effort karta hai.",
    } },

  // 12–24 months
  { id: "b1224_walk",       emoji: "🚶", title: "First Independent Steps",  category: "motor",     fromMonths: 11, toMonths: 18,
    explanation: {
      en: "Toddler takes 2–3 steps without holding on — eventually walks across a room.",
      hi: "बच्चा बिना सहारा लिए 2–3 क़दम चलता है — धीरे-धीरे पूरा कमरा पार करता है।",
      hin: "Toddler bina kisi ka sahara liye 2–3 steps chalta hai — dheere-dheere pura kamra cross karta hai.",
    },
    whyItMatters: {
      en: "Walking unlocks a new world of exploration, which fuels cognitive, language and social leaps over the next 6 months.",
      hi: "चलना खोज की एक नई दुनिया खोल देता है, जो अगले 6 महीनों में मानसिक, भाषाई और सामाजिक छलांगों को बढ़ावा देती है।",
      hin: "Chalna ek nayi exploration ki duniya khol deta hai, jo agle 6 months mein cognitive, language aur social leaps ko fuel karti hai.",
    },
    activity: {
      en: "Stand a few steps in front of toddler, arms out. Encourage them to step toward you. Cheer EVERY attempt.",
      hi: "बच्चे से कुछ क़दम दूर खड़े हों, बाहें फैलाएँ। उसे अपनी ओर क़दम बढ़ाने को कहें। हर कोशिश की वाहवाही करें।",
      hin: "Toddler se kuch steps dur khade ho, baahein faila ke. Use apni taraf step karne ko encourage karo. HAR koshish par cheer karo.",
    } },
  { id: "b1224_words",      emoji: "📚", title: "10–20 Word Vocabulary",    category: "language",  fromMonths: 12, toMonths: 20,
    explanation: {
      en: "Toddler uses 10–20+ single words meaningfully — names of people, animals, foods, body parts.",
      hi: "बच्चा 10–20+ अलग-अलग शब्दों का सही मतलब के साथ इस्तेमाल करता है — लोग, जानवर, खाना, शरीर के अंग।",
      hin: "Toddler 10–20+ single words ko matlab ke saath use karta hai — log, animals, khaana, body parts.",
    },
    whyItMatters: {
      en: "Vocabulary at 18 months is one of the strongest predictors of school readiness later.",
      hi: "18 महीने पर शब्द-भंडार आगे चलकर स्कूल के लिए तैयारी का सबसे बड़ा संकेत है।",
      hin: "18 months par vocabulary aage chal kar school readiness ke sabse strong predictors mein se ek hai.",
    },
    activity: {
      en: "Read ONE picture book together daily. Point and name everything. 'Cat. Big cat. Soft cat.'",
      hi: "रोज़ एक तस्वीर वाली किताब साथ पढ़ें। हर चीज़ पर उँगली रख कर नाम बताएँ। ‘बिल्ली। बड़ी बिल्ली। नर्म बिल्ली।’",
      hin: "Roz EK picture book saath padho. Har cheez par point karo aur naam lo. 'Billi. Badi billi. Soft billi.'",
    } },
  { id: "b1224_two_word",   emoji: "💬", title: "Two-Word Phrases",         category: "language",  fromMonths: 14, toMonths: 24,
    explanation: {
      en: "Toddler combines two words: 'more milk', 'mama up', 'all gone', 'bye dada'.",
      hi: "बच्चा दो शब्द जोड़ता है: ‘और दूध’, ‘मामा गोद’, ‘सब ख़त्म’, ‘बाय दादा’।",
      hin: "Toddler do words combine karta hai: 'aur doodh', 'mama god', 'sab khatam', 'bye dada'.",
    },
    whyItMatters: {
      en: "Combining words = the start of grammar. From here, sentences explode.",
      hi: "शब्दों को जोड़ना = व्याकरण की शुरुआत। यहाँ से वाक्य फूट निकलते हैं।",
      hin: "Words combine karna = grammar ki shuruat. Yahan se sentences explode hote hain.",
    },
    activity: {
      en: "Whenever toddler uses one word, model a two-word version. They say 'milk' → you say 'more milk?'",
      hi: "जब भी बच्चा एक शब्द कहे, दो शब्दों वाला रूप बोलकर दिखाएँ। वह कहे ‘दूध’ → आप कहें ‘और दूध?’",
      hin: "Jab bhi toddler ek word bole, do words wala version model karo. Woh bole 'doodh' → aap bolo 'aur doodh?'",
    } },
  { id: "b1224_body_parts", emoji: "👃", title: "Points to Body Parts",     category: "cognitive", fromMonths: 13, toMonths: 24,
    explanation: {
      en: "Toddler points to nose, eyes, mouth, ears, hair when named.",
      hi: "बच्चा नाम सुनकर नाक, आँख, मुँह, कान, बाल पर उँगली रखता है।",
      hin: "Toddler naam sun ke naak, aankh, muh, kaan, baal par point karta hai.",
    },
    whyItMatters: {
      en: "Knowing body parts builds receptive vocabulary AND spatial awareness — the brain's map of self.",
      hi: "शरीर के अंगों को जानना समझ वाली शब्दावली और स्थान-बोध दोनों बनाता है — दिमाग़ का अपने शरीर का नक्शा।",
      hin: "Body parts jaanna receptive vocabulary AUR spatial awareness dono banata hai — brain ka apne body ka map.",
    },
    activity: {
      en: "Sing 'Head, shoulders, knees & toes' daily. Touch each part as you sing.",
      hi: "रोज़ ‘सिर, कंधे, घुटने और पैर’ गाएँ। गाते समय हर अंग को छूएँ।",
      hin: "Roz 'Sir, kandhe, ghutne, paer' gao. Gaate hue har part ko touch karo.",
    } },
  { id: "b1224_scribble",   emoji: "✏️", title: "Scribbles with Crayon",   category: "motor",     fromMonths: 12, toMonths: 24,
    explanation: {
      en: "Toddler holds a crayon (whole-fist grip is fine) and makes marks on paper.",
      hi: "बच्चा क्रेयॉन पकड़ता है (पूरी मुट्ठी की पकड़ ठीक है) और काग़ज़ पर निशान बनाता है।",
      hin: "Toddler crayon pakadta hai (whole-fist grip chalega) aur paper par marks banata hai.",
    },
    whyItMatters: {
      en: "Scribbling builds the hand strength and shoulder stability needed for writing later. It also expresses emotions.",
      hi: "लकीरें खींचना हाथ की ताक़त और कंधे की स्थिरता बनाता है — आगे चलकर लिखने के लिए ज़रूरी। यह भावनाएँ भी व्यक्त करता है।",
      hin: "Scribbling hand strength aur shoulder stability banata hai — aage likhne ke liye zaruri. Yeh emotions bhi express karta hai.",
    },
    activity: {
      en: "Put a large piece of paper on the floor, give a chunky crayon, and demo a scribble. Then let them lead.",
      hi: "ज़मीन पर एक बड़ा काग़ज़ बिछाएँ, मोटा क्रेयॉन दें और एक लकीर बनाकर दिखाएँ। फिर बच्चे को अपनी मर्ज़ी से चलने दें।",
      hin: "Floor par bada paper rakho, chunky crayon do, aur ek scribble karke dikhao. Phir baby ko khud lead karne do.",
    } },
  { id: "b1224_pretend",    emoji: "🍼", title: "Pretend Play",             category: "cognitive", fromMonths: 14, toMonths: 24,
    explanation: {
      en: "Toddler feeds a doll, talks on a toy phone, or 'cooks' with kitchen toys.",
      hi: "बच्चा गुड़िया को खिलाता है, खिलौने वाले फ़ोन पर बात करता है या किचन सेट से ‘खाना’ बनाता है।",
      hin: "Toddler doll ko khilata hai, toy phone par baat karta hai, ya kitchen set se 'khana' banata hai.",
    },
    whyItMatters: {
      en: "Pretend play is one of the most powerful predictors of language, social, and problem-solving development.",
      hi: "बहाने का खेल भाषा, सामाजिक और समस्या-सुलझाने वाले विकास का सबसे ताक़तवर संकेत है।",
      hin: "Pretend play language, social aur problem-solving development ke sabse powerful predictors mein se ek hai.",
    },
    activity: {
      en: "Set up a tea party or doctor kit. Join in: 'Oh, the doll is hungry — feed her!' Model, then let them lead.",
      hi: "एक टी-पार्टी या डॉक्टर सेट लगाएँ। साथ खेलें: ‘ओह, गुड़िया भूखी है — उसे खिलाओ!’ पहले दिखाएँ, फिर बच्चे को आगे ले जाने दें।",
      hin: "Tea party ya doctor kit set up karo. Saath khelo: 'Arey, doll bhookhi hai — usse khilao!' Pehle model karo, phir baby ko lead karne do.",
    } },
  { id: "b1224_one_step",   emoji: "🎯", title: "Follows One-Step Commands", category: "language", fromMonths: 12, toMonths: 22,
    explanation: {
      en: "Toddler does what you ask for simple actions: 'Bring the ball', 'Sit down', 'Give me the spoon'.",
      hi: "बच्चा सरल कामों के लिए कही गई बात मानता है: ‘गेंद लाओ’, ‘बैठो’, ‘मुझे चम्मच दो’।",
      hin: "Toddler simple actions ke liye kahi baat manta hai: 'Ball lao', 'Baith jao', 'Spoon do'.",
    },
    whyItMatters: {
      en: "Following directions shows receptive language is far ahead of speech — they understand more than they say.",
      hi: "निर्देश मानना दिखाता है कि समझ वाली भाषा बोलने से कहीं आगे है — वह जितना बोलता है उससे ज़्यादा समझता है।",
      hin: "Directions follow karna dikhata hai ki receptive language speech se kaafi aage hai — woh bolne se zyada samajhta hai.",
    },
    activity: {
      en: "Use one clear command at a time during play. 'Give the bear a hug!' Smile and praise when they do.",
      hi: "खेल के दौरान एक बार में एक साफ़ निर्देश दें। ‘भालू को गले लगाओ!’ काम करने पर मुस्कुराएँ और तारीफ़ करें।",
      hin: "Play ke dauran ek baar mein ek clear command do. 'Bear ko gale lagao!' Karne par smile karo aur praise do.",
    } },
];

export function getMilestonesForAge(months: number): Milestone[] {
  return MILESTONES.filter(
    (m) => months >= m.fromMonths && months < m.toMonths,
  );
}

// ─── Baby Cues ─────────────────────────────────────────────────────────────
export type CueCategory = "hunger" | "sleep" | "overstim" | "discomfort";

export type BabyCue = {
  id: string;
  emoji: string;
  label: string;
  category: CueCategory;
  insight: L;
  action: L;
  fromMonths: number;
  toMonths: number;
};

export const CUES: readonly BabyCue[] = [
  // Hunger
  { id: "rooting",         emoji: "👶", label: "Rooting / mouth open",       category: "hunger",     fromMonths: 0, toMonths: 8,
    insight: {
      en: "Baby is asking for milk — early hunger cue.",
      hi: "बच्चा दूध माँग रहा है — भूख का शुरुआती संकेत।",
      hin: "Baby doodh maang raha hai — early hunger cue.",
    },
    action: {
      en: "Offer breast or bottle now. Catching hunger early means a calmer feed than waiting for crying.",
      hi: "अभी स्तन या बोतल दें। भूख जल्दी पकड़ लेना मतलब रोने का इंतज़ार करने से कहीं शांत फीड।",
      hin: "Abhi breast ya bottle offer karo. Hunger jaldi pakadna matlab rone ka wait karne se kahin calmer feed.",
    } },
  { id: "lip_smacking",    emoji: "👄", label: "Lip smacking",               category: "hunger",     fromMonths: 0, toMonths: 12,
    insight: {
      en: "Anticipating food — earliest hunger window.",
      hi: "खाने का इंतज़ार — भूख की सबसे शुरुआती खिड़की।",
      hin: "Khaane ka anticipation — earliest hunger window.",
    },
    action: {
      en: "Begin a feed in the next 5 minutes for the easiest latch and least fuss.",
      hi: "अगले 5 मिनट में फीड शुरू करें ताकि लैच आसान हो और कम चिड़चिड़ापन हो।",
      hin: "Agle 5 minutes mein feed start karo — easiest latch aur kam fuss.",
    } },
  { id: "hands_to_mouth",  emoji: "🤲", label: "Hands to mouth",             category: "hunger",     fromMonths: 0, toMonths: 8,
    insight: {
      en: "Mid-stage hunger cue.",
      hi: "बीच के स्तर का भूख का संकेत।",
      hin: "Mid-stage hunger cue.",
    },
    action: {
      en: "Feed now. If you wait, hunger escalates to crying within 5–10 minutes.",
      hi: "अभी फीड करें। इंतज़ार किया तो 5–10 मिनट में भूख रोने तक बढ़ जाएगी।",
      hin: "Abhi feed karo. Wait karoge toh 5–10 minutes mein hunger rone tak escalate ho jayegi.",
    } },
  // Sleep
  { id: "yawning",         emoji: "🥱", label: "Yawning",                    category: "sleep",      fromMonths: 0, toMonths: 24,
    insight: {
      en: "Sleep window is opening — wind down.",
      hi: "नींद की खिड़की खुल रही है — माहौल शांत करें।",
      hin: "Sleep window khul rahi hai — wind down karo.",
    },
    action: {
      en: "Begin nap routine NOW: dim lights, quiet voice, swaddle (if under 4m).",
      hi: "अभी नैप रूटीन शुरू करें: रोशनी मद्धम करें, धीमी आवाज़ में बात करें, लपेटें (अगर 4 महीने से कम हो)।",
      hin: "Nap routine ABHI start karo: lights dim karo, soft voice mein baat karo, swaddle karo (agar 4m se kam ho).",
    } },
  { id: "eye_rubbing",     emoji: "😪", label: "Eye rubbing",                category: "sleep",      fromMonths: 0, toMonths: 24,
    insight: {
      en: "Tired — sleep window is mid-stage.",
      hi: "थका हुआ — नींद की खिड़की बीच के स्तर पर है।",
      hin: "Thaka hua — sleep window mid-stage par hai.",
    },
    action: {
      en: "Skip stimulating play. Move straight to nap routine.",
      hi: "उत्तेजना वाले खेल छोड़ें। सीधे नैप रूटीन पर जाएँ।",
      hin: "Stimulating play skip karo. Seedhe nap routine par jao.",
    } },
  { id: "staring",         emoji: "👀", label: "Glazed staring into space",  category: "sleep",      fromMonths: 0, toMonths: 18,
    insight: {
      en: "Earliest sleep cue — easy to miss.",
      hi: "नींद का सबसे पहला संकेत — आसानी से छूट जाता है।",
      hin: "Earliest sleep cue — aasani se miss ho jata hai.",
    },
    action: {
      en: "Stop play, dim lights, start nap routine for an easy fall-asleep.",
      hi: "खेल बंद करें, रोशनी मद्धम करें, आसानी से सोने के लिए नैप रूटीन शुरू करें।",
      hin: "Play band karo, lights dim karo, easy fall-asleep ke liye nap routine start karo.",
    } },
  // Overstim
  { id: "gaze_aversion",   emoji: "🙈", label: "Looking away during play",   category: "overstim",   fromMonths: 0, toMonths: 12,
    insight: {
      en: "Sensory system needs a break.",
      hi: "इंद्रियों के तंत्र को थोड़ी राहत चाहिए।",
      hin: "Sensory system ko ek break chahiye.",
    },
    action: {
      en: "Pause. Speak softly, lower stimulation. Wait for them to re-engage.",
      hi: "रुकें। धीमे बोलें, उत्तेजना कम करें। बच्चे के दोबारा जुड़ने का इंतज़ार करें।",
      hin: "Pause karo. Softly bolo, stimulation kam karo. Baby ke dobara engage hone ka wait karo.",
    } },
  { id: "arching_back",    emoji: "🌀", label: "Arching back / pushing away",category: "overstim",   fromMonths: 0, toMonths: 12,
    insight: {
      en: "Too much stimulation — back off.",
      hi: "बहुत ज़्यादा उत्तेजना — पीछे हटें।",
      hin: "Bahut zyada stimulation — back off karo.",
    },
    action: {
      en: "Move to a calmer environment. Hold baby close upright until they settle.",
      hi: "शांत माहौल में जाएँ। बच्चे को सीने से लगाकर सीधा पकड़ें जब तक वह शांत न हो जाए।",
      hin: "Calmer environment mein jao. Baby ko close pakad ke upright rakho jab tak settle na ho.",
    } },
  // Discomfort
  { id: "pulling_legs",    emoji: "🦵", label: "Pulling legs to belly",      category: "discomfort", fromMonths: 0, toMonths: 6,
    insight: {
      en: "Likely gas or wind discomfort.",
      hi: "संभवतः गैस या वायु की तकलीफ़।",
      hin: "Likely gas ya wind ki takleef.",
    },
    action: {
      en: "Try bicycle legs, gentle clockwise tummy massage, then upright burping.",
      hi: "साइकिल वाली टांगें, घड़ी की दिशा में पेट की हल्की मालिश, फिर सीधा बिठाकर डकार दिलाएँ।",
      hin: "Bicycle legs try karo, clockwise gentle tummy massage do, phir upright burp karao.",
    } },
];

export function getCuesForAge(months: number): BabyCue[] {
  return CUES.filter((c) => months >= c.fromMonths && months < c.toMonths);
}

// ─── Wake Window Spec (mirrors infant-sleep-module.tsx) ────────────────────
export type WakeWindowSpec = {
  range: string;
  windowMin: number;
  windowMax: number;
  napCount: string;
  totalDayMin: number;
  napDurMin: number;
  nightSleepHrs: string;
};

export function getWakeSpec(months: number): WakeWindowSpec {
  if (months < 1)  return { range: "0–1 mo",   windowMin: 45,  windowMax: 60,  napCount: "5–7 micro", totalDayMin: 480, napDurMin: 60,  nightSleepHrs: "8–9 (interrupted)" };
  if (months < 2)  return { range: "1–2 mo",   windowMin: 60,  windowMax: 90,  napCount: "4–5",       totalDayMin: 360, napDurMin: 60,  nightSleepHrs: "8–10 (interrupted)" };
  if (months < 3)  return { range: "2–3 mo",   windowMin: 90,  windowMax: 120, napCount: "4–5",       totalDayMin: 300, napDurMin: 60,  nightSleepHrs: "10–11" };
  if (months < 5)  return { range: "3–5 mo",   windowMin: 90,  windowMax: 150, napCount: "3–4",       totalDayMin: 270, napDurMin: 75,  nightSleepHrs: "10–11" };
  if (months < 7)  return { range: "5–7 mo",   windowMin: 120, windowMax: 150, napCount: "3",         totalDayMin: 240, napDurMin: 80,  nightSleepHrs: "11" };
  if (months < 9)  return { range: "7–9 mo",   windowMin: 150, windowMax: 180, napCount: "2–3",       totalDayMin: 210, napDurMin: 90,  nightSleepHrs: "11" };
  if (months < 12) return { range: "9–12 mo",  windowMin: 180, windowMax: 240, napCount: "2",         totalDayMin: 180, napDurMin: 90,  nightSleepHrs: "11" };
  if (months < 15) return { range: "12–15 mo", windowMin: 240, windowMax: 300, napCount: "1–2",       totalDayMin: 150, napDurMin: 90,  nightSleepHrs: "11–12" };
  if (months < 18) return { range: "15–18 mo", windowMin: 300, windowMax: 360, napCount: "1",         totalDayMin: 120, napDurMin: 120, nightSleepHrs: "11–12" };
  return                  { range: "18–24 mo", windowMin: 300, windowMax: 360, napCount: "1",         totalDayMin: 120, napDurMin: 120, nightSleepHrs: "11–12" };
}

// ─── Common Sleep Issues (preview — log-independent) ───────────────────────
export type SleepIssueTip = {
  id: string;
  emoji: string;
  title: string;
  detail: L;
  tip: L;
  bands: readonly InfantBand[];
};

/** Static "things to watch for" preview — the live web SleepIssueDetector
 *  needs the parent to log naps. The mobile featured card shows this static
 *  preview so parents at least see what the system would flag. */
export const SLEEP_ISSUE_PREVIEWS: readonly SleepIssueTip[] = [
  { id: "overtired", emoji: "😵", title: "Overtiredness",
    detail: {
      en: "Wake windows that stretch past the upper bound (cortisol spike).",
      hi: "जागने का समय ऊपरी सीमा से ज़्यादा खिंच जाना (कोर्टिसोल का बढ़ना)।",
      hin: "Wake windows upper bound se zyada stretch ho jaana (cortisol spike).",
    },
    tip: {
      en: "Push the next nap 15–20 min earlier than you think. Overtired babies actually need sleep SOONER, not later.",
      hi: "अगली नैप अपनी सोच से 15–20 मिनट पहले लगाएँ। बहुत थका हुआ बच्चा असल में जल्दी सोना चाहता है, देर से नहीं।",
      hin: "Agli nap apni soch se 15–20 min PEHLE lagao. Overtired baby ko asal mein SOONER nap chahiye, baad mein nahi.",
    },
    bands: ["0-3", "3-6", "6-9", "9-12"] },
  { id: "short_naps", emoji: "⚡", title: "Short naps (under 35 min)",
    detail: {
      en: "Catnapping under 35 min repeatedly across the week.",
      hi: "हफ़्ते भर 35 मिनट से छोटी झपकियाँ बार-बार होना।",
      hin: "Pure week mein 35 min se chhoti naps bar-bar lena.",
    },
    tip: {
      en: "Try going in BEFORE baby wakes (around 25 min mark) and gently soothing through the next sleep cycle.",
      hi: "बच्चे के उठने से पहले (लगभग 25 मिनट पर) पास जाएँ और अगले स्लीप साइकल के लिए हल्के से सहलाकर सुलाएँ।",
      hin: "Baby ke uthne se PEHLE (lagbhag 25 min par) jao aur gently soothe karke next sleep cycle mein le jao.",
    },
    bands: ["3-6", "6-9", "9-12", "12-18"] },
  { id: "night_wakings", emoji: "🌃", title: "Frequent night waking",
    detail: {
      en: "Multiple <90-min sleeps overnight.",
      hi: "रात में 90 मिनट से छोटी कई नींदें।",
      hin: "Raat ko 90-min se kam ki kai sleeps.",
    },
    tip: {
      en: "Common causes: hunger (under 6m), teething, sleep regressions (4m, 8m, 12m, 18m). Check room temp 18–20°C, white noise, blackout.",
      hi: "आम वजहें: भूख (6 महीने से छोटा), दाँत निकलना, नींद का रिग्रेशन (4m, 8m, 12m, 18m)। कमरे का तापमान 18–20°C, सफ़ेद शोर और अंधेरा जाँचें।",
      hin: "Common causes: bhook (6m se chote), teething, sleep regressions (4m, 8m, 12m, 18m). Room temp 18–20°C, white noise, blackout check karo.",
    },
    bands: ["0-3", "3-6", "6-9", "9-12", "12-18", "18-24"] },
  { id: "irregular", emoji: "🌪️", title: "Irregular nap lengths",
    detail: {
      en: "Naps swing widely day to day.",
      hi: "झपकियाँ रोज़ बहुत बदलती हैं।",
      hin: "Naps roz bahut alag-alag hoti hain.",
    },
    tip: {
      en: "Anchor the FIRST nap of the day at a consistent clock time. The first nap sets the rhythm for the rest of the day.",
      hi: "दिन की पहली नैप एक तय समय पर लगाएँ। पहली नैप पूरे दिन की लय तय करती है।",
      hin: "Din ki PEHLI nap ko ek consistent clock time par anchor karo. Pehli nap pure din ka rhythm set karti hai.",
    },
    bands: ["3-6", "6-9", "9-12", "12-18"] },
];

export function getSleepIssuePreviews(months: number): SleepIssueTip[] {
  const band = getInfantBand(months);
  return SLEEP_ISSUE_PREVIEWS.filter((i) => i.bands.includes(band));
}

// ─── Routine Preview (ported from infant-sleep-module generateRoutine) ─────
export type RoutinePreviewItem = {
  id: string;
  time: string;
  activity: string;
  emoji: string;
};

function fmtClock(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12 ? "AM" : "PM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m < 10 ? "0" : ""}${m} ${am}`;
}

export function getRoutinePreview(
  months: number,
  wakeUpTime: string = "7:00 AM",
): RoutinePreviewItem[] {
  const spec = getWakeSpec(months);
  const items: RoutinePreviewItem[] = [];

  const parseTime = (t: string): Date => {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    const d = new Date();
    if (!m) { d.setHours(7, 0, 0, 0); return d; }
    let h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    const ap = m[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    d.setHours(h, mins, 0, 0);
    return d;
  };

  const cur = parseTime(wakeUpTime);
  const napCount =
    months < 3 ? 4 :
    months < 6 ? 3 :
    months < 9 ? 3 :
    months < 12 ? 2 :
    months < 15 ? 1 :
                  1;

  items.push({ id: "wake", time: fmtClock(cur), activity: "Wake + Feed", emoji: "☀️" });

  for (let i = 0; i < napCount; i++) {
    cur.setMinutes(cur.getMinutes() + spec.windowMin);
    items.push({
      id: `nap${i + 1}`,
      time: fmtClock(cur),
      activity: `Nap ${i + 1}`,
      emoji: "😴",
    });
    cur.setMinutes(cur.getMinutes() + spec.napDurMin);
    items.push({
      id: `wake${i + 1}`,
      time: fmtClock(cur),
      activity: i === napCount - 1 ? "Wake + Snack" : "Wake + Play",
      emoji: i === napCount - 1 ? "🍪" : "🧸",
    });
  }

  // Bedtime sequence
  const wake = parseTime(wakeUpTime);
  const target = new Date(wake);
  target.setHours(target.getHours() + 12);
  const bedHour = Math.max(target.getHours(), 18);
  const bath = new Date(cur);
  bath.setHours(bedHour, 0, 0, 0);
  items.push({ id: "bath", time: fmtClock(bath), activity: "Bath time", emoji: "🛁" });
  bath.setMinutes(bath.getMinutes() + 20);
  items.push({
    id: "dinner",
    time: fmtClock(bath),
    activity: months >= 6 ? "Dinner / Last feed" : "Last feed",
    emoji: "🥄",
  });
  bath.setMinutes(bath.getMinutes() + 30);
  items.push({ id: "book", time: fmtClock(bath), activity: "Book / Lullaby", emoji: "📖" });
  bath.setMinutes(bath.getMinutes() + 15);
  items.push({ id: "bedtime", time: fmtClock(bath), activity: "Bedtime", emoji: "🌙" });

  return items;
}

// ─── Feeding Reference (mirrors infant-hub.tsx getFeedingGuide) ────────────
export type FeedingGuide = { type: L; freq: L; tip: L };

export function getFeedingGuide(months: number): FeedingGuide {
  if (months < 6) return {
    type: {
      en: "Breast milk / Formula only",
      hi: "केवल माँ का दूध / फ़ॉर्मूला",
      hin: "Sirf breast milk / formula",
    },
    freq: {
      en: "Every 2–3 hrs · 8–12 times/day",
      hi: "हर 2–3 घंटे · दिन में 8–12 बार",
      hin: "Har 2–3 ghante · 8–12 baar din mein",
    },
    tip: {
      en: "Watch hunger cues — rooting, lip-smacking, sucking fists. Crying is a late hunger sign.",
      hi: "भूख के संकेत देखें — रूटिंग, होंठ चटकाना, मुट्ठी चूसना। रोना भूख का देर वाला संकेत है।",
      hin: "Hunger cues dekho — rooting, lip-smacking, mutthi chusna. Rona late hunger sign hai.",
    },
  };
  if (months < 9) return {
    type: {
      en: "Breast milk + Puree start (6 m+)",
      hi: "माँ का दूध + प्यूरी की शुरुआत (6 महीने+)",
      hin: "Breast milk + puree start (6m+)",
    },
    freq: {
      en: "Breast 5–6×/day + 1–2 meals",
      hi: "स्तनपान दिन में 5–6 बार + 1–2 भोजन",
      hin: "Breast 5–6×/day + 1–2 meals",
    },
    tip: {
      en: "Start single-ingredient purees: banana, carrot, sweet potato. No honey, salt or sugar before 12 months.",
      hi: "एक-सामग्री वाली प्यूरी से शुरू करें: केला, गाजर, शकरकंद। 12 महीने से पहले शहद, नमक या चीनी न दें।",
      hin: "Single-ingredient purees se shuru karo: kela, gajar, sweet potato. 12 months se pehle shahad, namak ya cheeni nahi.",
    },
  };
  if (months < 12) return {
    type: {
      en: "Breast milk + Soft solids",
      hi: "माँ का दूध + नरम ठोस आहार",
      hin: "Breast milk + soft solids",
    },
    freq: {
      en: "Breast 4–5×/day + 2–3 meals",
      hi: "स्तनपान दिन में 4–5 बार + 2–3 भोजन",
      hin: "Breast 4–5×/day + 2–3 meals",
    },
    tip: {
      en: "Introduce family textures slowly. Finger foods (soft): banana slices, soft dal pieces, khichdi.",
      hi: "परिवार के खाने जैसे टेक्सचर धीरे-धीरे शुरू करें। फिंगर फूड (नरम): केले के टुकड़े, नरम दाल, खिचड़ी।",
      hin: "Family wala texture dheere-dheere introduce karo. Finger foods (soft): kele ke pieces, soft dal, khichdi.",
    },
  };
  if (months < 18) return {
    type: {
      en: "Family meals + Milk top-up",
      hi: "परिवार का खाना + ऊपर से दूध",
      hin: "Family meals + milk top-up",
    },
    freq: {
      en: "3 meals + 2 snacks · Milk 2–3×/day",
      hi: "3 भोजन + 2 नाश्ते · दिन में 2–3 बार दूध",
      hin: "3 meals + 2 snacks · Milk 2–3×/day",
    },
    tip: {
      en: "Offer cow's milk (full fat) from 12 months. Serve small, soft portions of everything the family eats.",
      hi: "12 महीने से गाय का दूध (फुल फ़ैट) दें। परिवार जो खाता है उसी का छोटा, नरम हिस्सा परोसें।",
      hin: "12 months se cow's milk (full fat) do. Family jo khaata hai uske small, soft portions serve karo.",
    },
  };
  return {
    type: {
      en: "Full family meals",
      hi: "पूरा परिवार वाला खाना",
      hin: "Pura family meal",
    },
    freq: {
      en: "3 meals + 1–2 snacks",
      hi: "3 भोजन + 1–2 नाश्ते",
      hin: "3 meals + 1–2 snacks",
    },
    tip: {
      en: "Self-feeding is great — let them make mess! Keep 300–400 ml cow's milk/day for calcium.",
      hi: "ख़ुद खाना अच्छा है — गंदगी करने दें! कैल्शियम के लिए दिन में 300–400 मिली गाय का दूध दें।",
      hin: "Self-feeding bahut achhi cheez hai — mess karne do! Calcium ke liye din mein 300–400 ml cow's milk rakho.",
    },
  };
}

// ─── Sounds: white-noise + lullaby preview (from infant-sounds.tsx) ────────
/**
 * Three primary noise colours we can synthesise in pure JS — see audioSynth.ts.
 * Composed sounds (rain, shush, etc.) map down to one of these for mobile
 * playback while keeping their distinct labels and copy.
 */
export type SynthKind = "white" | "pink" | "brown";

export type NoiseType = {
  id: string;
  emoji: string;
  label: string;
  desc: L;
  bestFor: L;
  /** Which raw noise colour to play on platforms without Web Audio. */
  synthKind: SynthKind;
};

export const NOISE_TYPES: readonly NoiseType[] = [
  { id: "shush",     emoji: "🫁", label: "Shushing",
    bestFor: {
      en: "Newborns (0–4 m), inconsolable crying",
      hi: "नवजात (0–4 महीने), जब चुप ही न हो",
      hin: "Newborns (0–4m), jab chup hi na ho",
    },
    desc: {
      en: "Rhythmic 'shhhh' — closest to what baby heard in the womb. Air rushing through blood vessels + muffled heartbeat = built-in white noise.",
      hi: "लयबद्ध ‘शूऽऽ’ — गर्भ में बच्चे ने जो सुना उसके सबसे क़रीब। ख़ून की नलियों में बहती हवा + दबी हुई धड़कन = क़ुदरती सफ़ेद शोर।",
      hin: "Rhythmic 'shhhh' — womb mein baby ne jo suna uske sabse close. Blood vessels mein air + muffled heartbeat = natural white noise.",
    },
    synthKind: "white" },
  { id: "rain",      emoji: "🌧️", label: "Rain",
    bestFor: {
      en: "All ages, especially 2–12 m for naps in noisy homes",
      hi: "हर उम्र, ख़ासकर 2–12 महीने — शोर वाले घरों में नैप के लिए",
      hin: "Sabhi umar, khaaskar 2–12 months — shor wale gharon mein naps ke liye",
    },
    desc: {
      en: "Consistent broadband noise that masks household sounds — TV, voices, traffic. Most universally soothing for babies.",
      hi: "लगातार चलने वाला ब्रॉडबैंड शोर जो घर की आवाज़ें — टीवी, बातचीत, ट्रैफ़िक — दबा देता है। बच्चों के लिए सबसे सर्व-स्वीकृत शांति-दायक।",
      hin: "Consistent broadband noise jo ghar ki awaazein — TV, baatein, traffic — mask kar deta hai. Babies ke liye sabse universally soothing.",
    },
    synthKind: "pink" },
  { id: "fan",       emoji: "🌀", label: "Fan",
    bestFor: {
      en: "Overtired newborns, summer sleep, colicky phases",
      hi: "बहुत थके नवजात, गर्मियों की नींद, कोलिक के दिन",
      hin: "Overtired newborns, garmiyon ki sleep, colic ke din",
    },
    desc: {
      en: "Low-frequency rumble that deeply masks sound and has a grounding effect.",
      hi: "कम फ़्रीक्वेंसी की गहरी गूँज जो आवाज़ को अच्छे से दबाती है और सुकून देती है।",
      hin: "Low-frequency rumble jo sound ko deeply mask karta hai aur grounding effect deta hai.",
    },
    synthKind: "brown" },
  { id: "heartbeat", emoji: "💓", label: "Heartbeat",
    bestFor: {
      en: "Newborns 0–3 m, transition from arms to cot",
      hi: "0–3 महीने के नवजात, गोद से पालने तक का बदलाव",
      hin: "Newborns 0–3m, gode se cot tak ki transition",
    },
    desc: {
      en: "Mimics what baby heard for 9 months in the womb. Deeply familiar and calming in the 4th trimester.",
      hi: "बच्चे ने 9 महीने गर्भ में जो सुना उसकी नक़ल। चौथे तिमाही में बेहद जाना-पहचाना और शांत करने वाला।",
      hin: "9 months tak baby ne womb mein jo suna uski mimicry. 4th trimester mein bahut familiar aur calming.",
    },
    synthKind: "brown" },
  { id: "pink",      emoji: "🔊", label: "Pink Noise",
    bestFor: {
      en: "Older babies 6 m+, toddlers who've outgrown white noise",
      hi: "6 महीने से बड़े बच्चे, टॉडलर जिन्हें सफ़ेद शोर अब चुभता है",
      hin: "Bade babies 6m+, toddlers jinhe white noise ab pasand nahi aata",
    },
    desc: {
      en: "Like white noise but weighted to lower frequencies — more like rushing water than static.",
      hi: "सफ़ेद शोर जैसा, पर कम फ़्रीक्वेंसी की तरफ़ झुका — स्टैटिक से ज़्यादा बहते पानी जैसा।",
      hin: "White noise jaisa, par lower frequencies par weighted — static se zyada rushing water jaisa.",
    },
    synthKind: "pink" },
  { id: "white",     emoji: "📻", label: "White Noise",
    bestFor: {
      en: "Newborns 0–4 m, masking loud household noise",
      hi: "0–4 महीने के नवजात, घर के तेज़ शोर को दबाने के लिए",
      hin: "Newborns 0–4m, ghar ka loud noise mask karne ke liye",
    },
    desc: {
      en: "Pure broadband static — every frequency at equal energy. The classic 'TV between channels' sound.",
      hi: "साफ़ ब्रॉडबैंड स्टैटिक — हर फ़्रीक्वेंसी बराबर ऊर्जा पर। ‘चैनलों के बीच टीवी’ वाली असली आवाज़।",
      hin: "Pure broadband static — har frequency equal energy par. Classic 'channels ke beech TV' wala sound.",
    },
    synthKind: "white" },
  { id: "womb",      emoji: "🫀", label: "Womb",
    bestFor: {
      en: "Newborns 0–6 weeks, especially premature/NICU graduates",
      hi: "0–6 हफ़्ते के नवजात, ख़ासकर समय से पहले/NICU से लौटे बच्चे",
      hin: "Newborns 0–6 weeks, khaaskar premature/NICU graduates",
    },
    desc: {
      en: "Recordings combining heartbeat, blood flow, and muffled voice. Most complete recreation of the womb sound environment.",
      hi: "धड़कन, रक्त-प्रवाह और दबी हुई आवाज़ की रिकॉर्डिंग। गर्भ के ध्वनि माहौल की सबसे पूरी पुनर्रचना।",
      hin: "Heartbeat, blood flow, aur muffled voice ki recordings. Womb ke sound environment ki sabse complete recreation.",
    },
    synthKind: "brown" },
];

export type AgeNoiseTip = {
  band: string;
  fromMonths: number;
  toMonths: number;
  headline: L;
  tip: L;
  volume: L;
  recommended: readonly string[];
};

export const NOISE_AGE_TIPS: readonly AgeNoiseTip[] = [
  { band: "0–3 months", fromMonths: 0, toMonths: 3,
    headline: {
      en: "White noise is a lifesaver right now",
      hi: "अभी सफ़ेद शोर असली ज़िंदगी-बचाने वाला है",
      hin: "Abhi white noise ek lifesaver hai",
    },
    tip: {
      en: "The 4th trimester — baby is adjusting to a world that is too quiet, too bright, and too still. White noise recreates the womb. Use it freely during sleep and fussy periods.",
      hi: "चौथी तिमाही — बच्चा एक ऐसी दुनिया में ढल रहा है जो बहुत शांत, बहुत रोशन और बहुत स्थिर है। सफ़ेद शोर गर्भ का माहौल फिर बनाता है। नींद और चिड़चिड़े समय में बेझिझक इस्तेमाल करें।",
      hin: "4th trimester — baby ek aisi duniya mein adjust ho raha hai jo bahut quiet, bahut bright aur bahut still hai. White noise womb wala feel laata hai. Sleep aur fussy time mein bina jhijhak use karo.",
    },
    volume: {
      en: "About as loud as a shower — roughly 60–65 dB. Never louder.",
      hi: "लगभग शॉवर जितनी आवाज़ — क़रीब 60–65 dB। इससे ज़्यादा कभी नहीं।",
      hin: "Lagbhag shower jitni loud — around 60–65 dB. Isse zyada KABHI nahi.",
    },
    recommended: ["shush", "heartbeat", "womb"] },
  { band: "3–6 months", fromMonths: 3, toMonths: 6,
    headline: {
      en: "Keep using it, but start fading volume",
      hi: "इस्तेमाल जारी रखें, पर अब आवाज़ कम करना शुरू करें",
      hin: "Use karte raho, par ab volume kam karna shuru karo",
    },
    tip: {
      en: "Still helpful — especially for naps — but start gradually lowering volume as baby becomes more settled. Songs are great for awake time.",
      hi: "अब भी मददगार — ख़ासकर नैप के लिए — पर जैसे-जैसे बच्चा शांत होता जाए, धीरे-धीरे आवाज़ कम करें। जागते समय गाने बढ़िया रहते हैं।",
      hin: "Abhi bhi helpful — khaaskar naps ke liye — par jaise-jaise baby zyada settled hota jaye, dheere-dheere volume kam karo. Awake time mein songs bahut achhe rehte hain.",
    },
    volume: {
      en: "50–60 dB. Keep the source at least 30 cm from baby's head.",
      hi: "50–60 dB। शोर के स्रोत को बच्चे के सिर से कम से कम 30 सेमी दूर रखें।",
      hin: "50–60 dB. Sound source ko baby ke sir se kam se kam 30 cm dur rakho.",
    },
    recommended: ["rain", "shush", "white"] },
  { band: "6–12 months", fromMonths: 6, toMonths: 12,
    headline: {
      en: "Use for sleep, shift to music for play",
      hi: "नींद के लिए इस्तेमाल करें, खेल के लिए संगीत पर आ जाएँ",
      hin: "Sleep ke liye use karo, play ke liye music par shift karo",
    },
    tip: {
      en: "White noise for naps and night sleep is fine. During awake play, songs and rhythmic music do more developmental work.",
      hi: "नैप और रात की नींद के लिए सफ़ेद शोर ठीक है। जागते खेल के दौरान गाने और लयबद्ध संगीत विकास के लिए ज़्यादा फ़ायदेमंद हैं।",
      hin: "Naps aur night sleep ke liye white noise theek hai. Awake play ke dauran songs aur rhythmic music zyada developmental kaam karte hain.",
    },
    volume: {
      en: "Keep at 50 dB or below. A quiet fan is a good reference.",
      hi: "50 dB या उससे कम रखें। एक धीमा पंखा अच्छा संदर्भ है।",
      hin: "50 dB ya usse kam rakho. Ek dheema fan achha reference hai.",
    },
    recommended: ["rain", "fan", "pink"] },
  { band: "12–24 months", fromMonths: 12, toMonths: 24,
    headline: {
      en: "Begin gentle weaning from white noise",
      hi: "सफ़ेद शोर से धीरे-धीरे छुड़ाना शुरू करें",
      hin: "White noise se gentle weaning shuru karo",
    },
    tip: {
      en: "Start fading slowly — reduce volume by a notch each week, then try turning it off 30 minutes after they've fallen asleep. Aim to be free of it by 2 years.",
      hi: "धीरे-धीरे कम करें — हर हफ़्ते एक स्तर आवाज़ घटाएँ, फिर सोने के 30 मिनट बाद बंद करने की कोशिश करें। 2 साल तक इसके बिना सोने का लक्ष्य रखें।",
      hin: "Dheere-dheere fade karo — har week ek notch volume kam karo, phir baby ke sone ke 30 min baad band karne ki try karo. 2 saal tak isse free hone ka goal rakho.",
    },
    volume: {
      en: "40–50 dB maximum. If they can talk over it easily, that's about right.",
      hi: "अधिकतम 40–50 dB। अगर बच्चा उसके ऊपर आसानी से बोल पाए, तो आवाज़ ठीक है।",
      hin: "Maximum 40–50 dB. Agar baby uske upar aasani se baat kar paaye, toh volume sahi hai.",
    },
    recommended: ["rain", "pink"] },
];

export function getNoiseAgeTip(months: number): AgeNoiseTip {
  return (
    NOISE_AGE_TIPS.find((t) => months >= t.fromMonths && months < t.toMonths) ??
    NOISE_AGE_TIPS[NOISE_AGE_TIPS.length - 1]
  );
}

// Simple traditional lullabies (mobile-only preview library — short, calming
// snippets, NOT the full poem catalogue used on web). Each track ships a
// short sine-wave melody synthesised via `audioSynth.buildMelodyWav` so
// parents can hear the tune; the lyric stays alongside as a sing-along
// reference.
export type LullabyLang = "en" | "hi" | "hin";

import { NOTE_FREQ } from "./audioSynth";
import type { Note } from "./audioSynth";
const { C4, D4, E4, F4, G4, A4, B4, C5 } = NOTE_FREQ;
const Q = 480;        // quarter note (~125 BPM lullaby tempo)
const H = Q * 2;      // half note
const D_ = Q * 3;     // dotted half

export type LullabyMelody = {
  notes: readonly Note[];
  /** Optional white-noise bed mixed under the tune. */
  noiseBed?: { kind: SynthKind; level: number };
  /** Peak amplitude (0..1). Defaults to 0.32 in the synth. */
  amplitude?: number;
};

export type Lullaby = {
  id: string;
  emoji: string;
  title: string;
  lang: LullabyLang;
  lyric: string;
  melody: LullabyMelody;
};

// "Twinkle Twinkle Little Star" — first two phrases (~8.6s).
const TWINKLE_NOTES: Note[] = [
  { freqHz: C4, durMs: Q }, { freqHz: C4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: G4, durMs: Q },
  { freqHz: A4, durMs: Q }, { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: H },
  { freqHz: F4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: Q }, { freqHz: E4, durMs: Q },
  { freqHz: D4, durMs: Q }, { freqHz: D4, durMs: Q }, { freqHz: C4, durMs: H },
];

// "Sleep Little One" — original gentle descending lullaby (~9s).
const SLEEP_LITTLE_ONE_NOTES: Note[] = [
  { freqHz: C5, durMs: Q }, { freqHz: B4, durMs: Q }, { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: H },
  { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: H },
  { freqHz: E4, durMs: Q }, { freqHz: D4, durMs: Q }, { freqHz: C4, durMs: D_ },
  { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: Q }, { freqHz: D4, durMs: Q },
  { freqHz: C4, durMs: D_ },
];

// "Rock-a-Bye Baby" — traditional 6/8 melody (~8s).
const ROCK_A_BYE_NOTES: Note[] = [
  { freqHz: E4, durMs: Q }, { freqHz: E4, durMs: Q }, { freqHz: G4, durMs: H },
  { freqHz: F4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: D4, durMs: H },
  { freqHz: E4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: G4, durMs: Q },
  { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: H },
];

// "Chanda Mama Door Ke" — simple Hindi pattern (~8s).
const CHANDA_MAMA_NOTES: Note[] = [
  { freqHz: G4, durMs: Q }, { freqHz: A4, durMs: Q }, { freqHz: B4, durMs: Q }, { freqHz: G4, durMs: Q },
  { freqHz: A4, durMs: Q }, { freqHz: B4, durMs: Q }, { freqHz: C5, durMs: H },
  { freqHz: B4, durMs: Q }, { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q },
  { freqHz: G4, durMs: H }, { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: H },
];

// "So Ja Meri Pyari Bachhi" — gentle descending Hinglish lullaby (~8s).
const SO_JA_NOTES: Note[] = [
  { freqHz: A4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: H },
  { freqHz: F4, durMs: Q }, { freqHz: G4, durMs: Q }, { freqHz: A4, durMs: H },
  { freqHz: G4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: E4, durMs: Q }, { freqHz: D4, durMs: Q },
  { freqHz: E4, durMs: Q }, { freqHz: F4, durMs: Q }, { freqHz: G4, durMs: H },
];

// "White Noise Dream" — a Twinkle hum (lower amplitude) over a soft pink
// noise bed; designed to bridge the white-noise + lullaby experience.
const WHITE_NOISE_DREAM_NOTES: Note[] = TWINKLE_NOTES.map((n) => ({ ...n }));

export const LULLABIES: readonly Lullaby[] = [
  { id: "twinkle", emoji: "⭐", title: "Twinkle Twinkle Little Star", lang: "en",
    lyric: "Twinkle, twinkle, little star,\nHow I wonder what you are.\nUp above the world so high,\nLike a diamond in the sky.",
    melody: { notes: TWINKLE_NOTES } },
  { id: "sleep_little_one", emoji: "🌟", title: "Sleep Little One", lang: "en",
    lyric: "Hush little one, close your eyes,\nThe moon is rising in the skies.\nSleep little one, dreams will come,\nMorning is far — rest now, my one.",
    melody: { notes: SLEEP_LITTLE_ONE_NOTES, amplitude: 0.30 } },
  { id: "white_noise_dream", emoji: "💫", title: "White Noise Dream", lang: "en",
    lyric: "A gentle hum under soft static —\nfor parents who want both melody and bed sound at once.",
    melody: { notes: WHITE_NOISE_DREAM_NOTES, amplitude: 0.20, noiseBed: { kind: "pink", level: 0.45 } } },
  { id: "rock_a_bye", emoji: "🌙", title: "Rock-a-Bye Baby", lang: "en",
    lyric: "Rock-a-bye baby, on the tree top,\nWhen the wind blows the cradle will rock.\nWhen the bough breaks the cradle will fall,\nAnd down will come baby, cradle and all.",
    melody: { notes: ROCK_A_BYE_NOTES } },
  { id: "chanda_mama", emoji: "🌝", title: "Chanda Mama Door Ke", lang: "hi",
    lyric: "चंदा मामा दूर के, पुए पकाए बूर के,\nआप खाएं थाली में, मुन्ने को दें प्याली में।",
    melody: { notes: CHANDA_MAMA_NOTES } },
  { id: "lori_so_ja", emoji: "💤", title: "So Ja Meri Pyari Bachhi", lang: "hin",
    lyric: "So ja, so ja, meri pyari bachhi,\nNeendon ki chadar mein lipti hui,\nChand sitaron ki roshni mein,\nMaa ki lori sun ke so ja.",
    melody: { notes: SO_JA_NOTES } },
];
