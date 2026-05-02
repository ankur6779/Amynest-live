// Infant Hub — Research-based content for parents of children 0–24 months.
// Inspired by AAP, WHO, and pediatric development literature.
// All content is guidance only — never medical diagnosis.

export type InfantCategory =
  | "sleep"
  | "feeding"
  | "development"
  | "behavior"
  | "daily_care";

export type Lang = "en" | "hi" | "hin";

export type LocalizedText = { en: string; hi: string; hin: string };

export type InfantTip = {
  id: string;
  category: InfantCategory;
  /** inclusive lower bound in months */
  fromMonths: number;
  /** exclusive upper bound in months */
  toMonths: number;
  emoji: string;
  title: LocalizedText;
  body: LocalizedText;
  /** Pediatric source family — for transparency, never shown as medical claim */
  sourceType:
    | "pediatric_guideline"
    | "who_growth"
    | "aap_safe_sleep"
    | "developmental_milestone"
    | "general_care";
};

export const INFANT_CATEGORIES: {
  key: InfantCategory;
  emoji: string;
  label: LocalizedText;
}[] = [
  {
    key: "sleep",
    emoji: "💤",
    label: { en: "Sleep", hi: "नींद", hin: "Sleep" },
  },
  {
    key: "feeding",
    emoji: "🍼",
    label: { en: "Feeding", hi: "आहार", hin: "Feeding" },
  },
  {
    key: "development",
    emoji: "👶",
    label: { en: "Development", hi: "विकास", hin: "Development" },
  },
  {
    key: "behavior",
    emoji: "🧠",
    label: { en: "Behavior", hi: "व्यवहार", hin: "Behavior" },
  },
  {
    key: "daily_care",
    emoji: "❤️",
    label: { en: "Daily Care", hi: "रोज़ाना देखभाल", hin: "Daily Care" },
  },
];

// ─── Tips dataset ────────────────────────────────────────────────────────────
// Age windows: 0–3m, 3–6m, 6–12m, 12–24m
// Keep each tip short, clear, actionable. No medical diagnosis language.

export const INFANT_TIPS: InfantTip[] = [
  // ── SLEEP ────────────────────────────────────────────────────────────────
  {
    id: "sleep_0_3_total",
    category: "sleep",
    fromMonths: 0, toMonths: 3, emoji: "😴",
    title: {
      en: "Total sleep: 14–17 hrs/day",
      hi: "कुल नींद: 14–17 घंटे/दिन",
      hin: "Total sleep: 14–17 hrs roz",
    },
    body: {
      en: "Newborns sleep in short stretches of 2–4 hours, day and night. Wake them gently to feed if they sleep more than 4 hrs in early weeks.",
      hi: "नवजात 2–4 घंटे की छोटी नींद लेते हैं। पहले हफ़्तों में 4 घंटे से ज़्यादा सोएँ तो धीरे जगाकर दूध पिलाएँ।",
      hin: "Newborn 2–4 ghante ki short sleep lete hain. Pehle weeks mein 4 ghante se zyada soyein toh gently jagao aur feed karo.",
    },
    sourceType: "aap_safe_sleep",
  },
  {
    id: "sleep_0_3_back",
    category: "sleep",
    fromMonths: 0, toMonths: 3, emoji: "🛌",
    title: {
      en: "Always place baby on back",
      hi: "हमेशा पीठ के बल सुलाएँ",
      hin: "Hamesha back par sulao",
    },
    body: {
      en: "Place baby on their back on a firm, flat surface. No pillows, blankets or soft toys in the crib — this lowers SIDS risk.",
      hi: "बच्चे को सख्त, समतल सतह पर पीठ के बल सुलाएँ। पालने में तकिया, कंबल या खिलौने न रखें।",
      hin: "Baby ko firm, flat surface par back par sulao. Crib mein pillow, blanket ya toys nahi — SIDS risk kam hota hai.",
    },
    sourceType: "aap_safe_sleep",
  },
  {
    id: "sleep_3_6_window",
    category: "sleep",
    fromMonths: 3, toMonths: 6, emoji: "⏰",
    title: {
      en: "Wake window: 1.5–2 hrs",
      hi: "जागने का समय: 1.5–2 घंटे",
      hin: "Wake window: 1.5–2 ghante",
    },
    body: {
      en: "Watch for sleepy cues — yawning, eye rubbing, staring. Putting baby down before overtiredness makes naps easier.",
      hi: "नींद के संकेत देखें — जम्हाई, आँखें मलना, खोई-खोई नज़र। थकान चढ़ने से पहले सुलाना आसान होता है।",
      hin: "Sleepy cues dekho — jamhai, aankh malna, staring. Overtired hone se pehle sulao toh nap easy hota hai.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "sleep_3_6_naps",
    category: "sleep",
    fromMonths: 3, toMonths: 6, emoji: "🌙",
    title: {
      en: "3–4 naps per day",
      hi: "दिन में 3–4 झपकियाँ",
      hin: "Din mein 3–4 naps",
    },
    body: {
      en: "Most babies need 3–4 naps totaling 3–5 hrs of day sleep. A short bedtime routine (bath, feed, lullaby) helps signal night sleep.",
      hi: "ज़्यादातर बच्चों को 3–4 झपकियाँ चाहिए, कुल 3–5 घंटे दिन की नींद। छोटा रात-समय रूटीन (नहाना, दूध, लोरी) मदद करता है।",
      hin: "Zyada baby ko 3–4 naps chahiye, total 3–5 hrs din ki sleep. Short bedtime routine (bath, feed, lori) help karta hai.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "sleep_6_12_naps",
    category: "sleep",
    fromMonths: 6, toMonths: 12, emoji: "💤",
    title: {
      en: "2–3 naps daily",
      hi: "रोज़ 2–3 झपकियाँ",
      hin: "Roz 2–3 naps",
    },
    body: {
      en: "Most 6–12 month babies need 2–3 naps and 11–12 hrs of night sleep. Keep a consistent bedtime within a 30-min window.",
      hi: "6–12 महीने के अधिकांश बच्चों को 2–3 झपकियाँ और 11–12 घंटे रात की नींद चाहिए। सोने का समय एक जैसा रखें।",
      hin: "6–12 month ke zyada baby ko 2–3 naps aur 11–12 hrs raat ki sleep chahiye. Bedtime same rakho 30-min window mein.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "sleep_12_24_one_nap",
    category: "sleep",
    fromMonths: 12, toMonths: 24, emoji: "🛏️",
    title: {
      en: "Transition to 1 nap",
      hi: "1 झपकी पर आना",
      hin: "1 nap par aana",
    },
    body: {
      en: "Around 15–18 months toddlers usually shift from 2 naps to 1 longer afternoon nap (1.5–3 hrs). Total sleep: 11–14 hrs.",
      hi: "15–18 महीने के बीच ज़्यादातर बच्चे 2 झपकियों से 1 लंबी दोपहर की झपकी (1.5–3 घंटे) पर आ जाते हैं।",
      hin: "15–18 months ke beech zyada baby 2 naps se 1 lambi afternoon nap (1.5–3 hrs) par shift hote hain.",
    },
    sourceType: "pediatric_guideline",
  },

  // ── FEEDING ──────────────────────────────────────────────────────────────
  {
    id: "feed_0_3_demand",
    category: "feeding",
    fromMonths: 0, toMonths: 3, emoji: "🤱",
    title: {
      en: "Feed every 2–3 hours",
      hi: "हर 2–3 घंटे में दूध पिलाएँ",
      hin: "Har 2–3 ghante mein feed karo",
    },
    body: {
      en: "Newborns feed 8–12 times in 24 hrs. Watch for hunger cues — rooting, sucking hands, smacking lips. Crying is a late sign.",
      hi: "नवजात 24 घंटे में 8–12 बार दूध पीते हैं। भूख के संकेत — हाथ चूसना, होंठ हिलाना। रोना आखिरी संकेत है।",
      hin: "Newborn 24 hrs mein 8–12 baar feed karte hain. Hunger cues — rooting, haath chusna, lip smacking. Rona late sign hai.",
    },
    sourceType: "who_growth",
  },
  {
    id: "feed_0_6_breast",
    category: "feeding",
    fromMonths: 0, toMonths: 6, emoji: "💗",
    title: {
      en: "Exclusive breastfeeding 0–6 mo",
      hi: "0–6 महीने तक केवल स्तनपान",
      hin: "0–6 months sirf breastfeeding",
    },
    body: {
      en: "WHO recommends exclusive breastfeeding for the first 6 months — no water, juice or solids. It builds immunity and bonding.",
      hi: "WHO 6 महीने तक केवल स्तनपान की सलाह देता है — पानी, जूस या ठोस आहार नहीं। यह रोग प्रतिरोधक क्षमता बढ़ाता है।",
      hin: "WHO ke according pehle 6 months sirf breastfeeding — paani, juice ya solid food nahi. Immunity aur bonding banti hai.",
    },
    sourceType: "who_growth",
  },
  {
    id: "feed_6_solids",
    category: "feeding",
    fromMonths: 6, toMonths: 9, emoji: "🥣",
    title: {
      en: "6 months: start semi-solids",
      hi: "6 महीने: ऊपरी आहार शुरू करें",
      hin: "6 months: semi-solid food shuru karo",
    },
    body: {
      en: "Begin with single-grain purees (rice, dal, ragi) and mashed fruits (banana, apple). Continue breast/formula milk as main feed.",
      hi: "एक अनाज की प्यूरी (चावल, दाल, रागी) और मसले फल (केला, सेब) से शुरू करें। माँ का दूध मुख्य आहार बना रहे।",
      hin: "Single-grain puree (chawal, dal, ragi) aur mashed fruits (kela, apple) se shuru karo. Maa ka doodh main feed rahe.",
    },
    sourceType: "who_growth",
  },
  {
    id: "feed_6_12_finger",
    category: "feeding",
    fromMonths: 6, toMonths: 12, emoji: "🍌",
    title: {
      en: "Try soft finger foods",
      hi: "नरम फिंगर फूड दें",
      hin: "Soft finger food try karo",
    },
    body: {
      en: "Around 8–9 months offer soft pieces — banana, paneer, well-cooked vegetables. Always supervise to prevent choking.",
      hi: "8–9 महीने पर नरम टुकड़े दें — केला, पनीर, अच्छी तरह पकी सब्ज़ियाँ। दम घुटने से बचाव के लिए साथ रहें।",
      hin: "8–9 months par soft pieces do — kela, paneer, well-cooked veggies. Choking se bachne ke liye saath raho.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "feed_12_24_family",
    category: "feeding",
    fromMonths: 12, toMonths: 24, emoji: "🍽️",
    title: {
      en: "3 meals + 2 snacks daily",
      hi: "रोज़ 3 भोजन + 2 नाश्ते",
      hin: "Roz 3 meals + 2 snacks",
    },
    body: {
      en: "Toddlers can join family meals — rice, dal, sabzi, roti in small soft pieces. Avoid added salt, sugar and honey before 1 year.",
      hi: "बच्चे अब परिवार के साथ खा सकते हैं — चावल, दाल, सब्ज़ी, रोटी छोटे टुकड़ों में। 1 साल से पहले शहद, अधिक नमक/चीनी न दें।",
      hin: "Toddler ab family meals join kar sakta hai — rice, dal, sabzi, roti chote pieces mein. 1 year se pehle honey, extra salt/sugar avoid.",
    },
    sourceType: "pediatric_guideline",
  },

  // ── DEVELOPMENT ──────────────────────────────────────────────────────────
  {
    id: "dev_0_3_eye",
    category: "development",
    fromMonths: 0, toMonths: 3, emoji: "👀",
    title: {
      en: "Milestone: eye contact",
      hi: "मील का पत्थर: आँखें मिलाना",
      hin: "Milestone: eye contact",
    },
    body: {
      en: "By 6–8 weeks most babies make eye contact and respond with a social smile. Hold them 8–12 inches from your face — that's their focus range.",
      hi: "6–8 हफ़्तों तक ज़्यादातर बच्चे आँखें मिलाते हैं और मुस्कान देते हैं। उन्हें अपने चेहरे से 8–12 इंच दूर रखें।",
      hin: "6–8 weeks tak zyada baby eye contact karte hain aur smile karte hain. Apne face se 8–12 inch dur rakho.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_3_6_roll",
    category: "development",
    fromMonths: 3, toMonths: 6, emoji: "🔄",
    title: {
      en: "Milestone: rolling over",
      hi: "मील का पत्थर: करवट लेना",
      hin: "Milestone: roll karna",
    },
    body: {
      en: "Most babies roll tummy-to-back by 4 months and back-to-tummy by 6 months. Daily tummy time (10–15 min) builds the strength.",
      hi: "अधिकांश बच्चे 4 महीने पर पेट से पीठ और 6 महीने पर पीठ से पेट करवट लेते हैं। रोज़ 10–15 मिनट पेट के बल खेल मदद करता है।",
      hin: "Zyada baby 4 months par tummy-to-back aur 6 months par back-to-tummy roll karte hain. Daily 10–15 min tummy time se taqat banti hai.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_6_9_sit",
    category: "development",
    fromMonths: 6, toMonths: 9, emoji: "🪑",
    title: {
      en: "Milestone: sitting up",
      hi: "मील का पत्थर: बैठना",
      hin: "Milestone: baithna",
    },
    body: {
      en: "Most babies sit with support by 6 mo and without support by 8–9 mo. Place toys just out of reach to encourage trunk control.",
      hi: "अधिकांश बच्चे 6 महीने पर सहारे से और 8–9 महीने पर बिना सहारे बैठने लगते हैं। खिलौने थोड़ी दूर रखें।",
      hin: "Zyada baby 6 mo par support se aur 8–9 mo par bina support baithte hain. Toys thodi dur rakho taaki reach karein.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_9_12_crawl",
    category: "development",
    fromMonths: 9, toMonths: 12, emoji: "🚼",
    title: {
      en: "Milestone: crawling",
      hi: "मील का पत्थर: रेंगना",
      hin: "Milestone: crawl karna",
    },
    body: {
      en: "Crawling typically appears between 7–10 months. Some babies skip it and go straight to standing — both are normal. Babyproof corners now.",
      hi: "रेंगना 7–10 महीने के बीच होता है। कुछ बच्चे सीधे खड़े होते हैं — दोनों सामान्य हैं। घर के कोने सुरक्षित कर लें।",
      hin: "Crawl 7–10 months ke beech aata hai. Kuch baby skip karke direct khade hote hain — dono normal. Ghar babyproof kar lo ab.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_12_18_walk",
    category: "development",
    fromMonths: 12, toMonths: 18, emoji: "🚶",
    title: {
      en: "Milestone: first steps",
      hi: "मील का पत्थर: पहले कदम",
      hin: "Milestone: pehle kadam",
    },
    body: {
      en: "Most babies walk independently between 12–15 months — but anywhere from 9 to 18 months is normal. Bare feet on safe floors helps balance.",
      hi: "अधिकांश बच्चे 12–15 महीने पर चलने लगते हैं — पर 9 से 18 महीने तक सामान्य है। नंगे पाँव चलने से संतुलन बेहतर होता है।",
      hin: "Zyada baby 12–15 months par chalna shuru karte hain — par 9 se 18 months tak normal. Nange paaon safe floor par balance better hota hai.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "dev_12_24_words",
    category: "development",
    fromMonths: 12, toMonths: 24, emoji: "🗣️",
    title: {
      en: "Milestone: first words",
      hi: "मील का पत्थर: पहले शब्द",
      hin: "Milestone: pehle words",
    },
    body: {
      en: "By 12 mo: 1–3 words. By 18 mo: 10–20 words. By 24 mo: 2-word phrases. Talk, read and sing every day — narration builds vocabulary.",
      hi: "12 महीने: 1–3 शब्द। 18 महीने: 10–20 शब्द। 24 महीने: 2-शब्द वाक्य। रोज़ बात करें, पढ़ें, गाएँ।",
      hin: "12 mo: 1–3 words. 18 mo: 10–20 words. 24 mo: 2-word phrases. Roz baat karo, padho, gaao — narration se vocab badhti hai.",
    },
    sourceType: "developmental_milestone",
  },

  // ── BEHAVIOR ─────────────────────────────────────────────────────────────
  {
    id: "beh_0_3_cry",
    category: "behavior",
    fromMonths: 0, toMonths: 3, emoji: "😢",
    title: {
      en: "Crying decoder",
      hi: "रोने को समझें",
      hin: "Rone ka matlab",
    },
    body: {
      en: "Most likely causes: hunger, dirty nappy, gas, tiredness, overstimulation. Try the 5 S's — swaddle, side-position, shush, swing, suck.",
      hi: "मुख्य कारण: भूख, गीला नैपी, गैस, थकान, ज़्यादा उत्तेजना। 5 S आज़माएँ — लपेटें, करवट, शू-शू, झूला, चूसना।",
      hin: "Likely causes: bhook, dirty nappy, gas, thakaan, overstimulation. 5 S's try karo — swaddle, side, shush, swing, suck.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "beh_3_6_overstim",
    category: "behavior",
    fromMonths: 3, toMonths: 6, emoji: "🌒",
    title: {
      en: "Overstimulation signs",
      hi: "अधिक उत्तेजना के संकेत",
      hin: "Overstimulation ke signs",
    },
    body: {
      en: "If baby turns face away, arches back or fusses suddenly — they need a calm break. Dim lights, quiet voice, gentle rocking helps reset.",
      hi: "यदि बच्चा मुँह फेरे, पीठ मोड़े या अचानक रोए — उसे शांत समय चाहिए। मद्धम रोशनी, धीमी आवाज़, झूला मदद करता है।",
      hin: "Agar baby face hatae, back arch kare ya suddenly fuss kare — usse calm break chahiye. Dim lights, soft voice, gentle rocking se reset hota hai.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "beh_6_12_separation",
    category: "behavior",
    fromMonths: 6, toMonths: 12, emoji: "🤗",
    title: {
      en: "Separation anxiety is normal",
      hi: "अलगाव की चिंता सामान्य है",
      hin: "Separation anxiety normal hai",
    },
    body: {
      en: "Around 8–10 months babies cry when you leave — this shows healthy attachment. Always say a calm goodbye; sneaking out increases anxiety.",
      hi: "8–10 महीने पर बच्चे आपके जाने पर रोते हैं — यह स्वस्थ लगाव है। हमेशा शांत अलविदा कहें; चुपके जाना चिंता बढ़ाता है।",
      hin: "8–10 months par baby aapke jaane par rote hain — yeh healthy attachment hai. Hamesha calm goodbye bolo; chupke nikalna anxiety badhata hai.",
    },
    sourceType: "developmental_milestone",
  },
  {
    id: "beh_12_24_tantrum",
    category: "behavior",
    fromMonths: 12, toMonths: 24, emoji: "🌊",
    title: {
      en: "Tantrums = big feelings",
      hi: "गुस्सा = बड़ी भावनाएँ",
      hin: "Tantrum = badi feelings",
    },
    body: {
      en: "Toddlers don't have words for big feelings yet. Stay close and calm, name the feeling: 'You feel angry — that's okay.' Reasoning comes later.",
      hi: "बच्चों के पास भावनाओं के लिए शब्द नहीं हैं। पास रहें और शांत रहें — 'तुम्हें गुस्सा आ रहा है — कोई बात नहीं।' तर्क बाद में आता है।",
      hin: "Toddler ke paas badi feelings ke liye words nahi hain. Paas raho calm raho, feeling ka naam lo: 'Tumhe gussa aa raha hai — koi baat nahi.' Logic baad mein.",
    },
    sourceType: "pediatric_guideline",
  },
  {
    id: "beh_12_24_no",
    category: "behavior",
    fromMonths: 12, toMonths: 24, emoji: "🚫",
    title: {
      en: "Saying 'no' is healthy",
      hi: "‘ना’ कहना स्वस्थ है",
      hin: "'No' bolna healthy hai",
    },
    body: {
      en: "When a toddler says no, they're testing autonomy — not defying you. Offer simple choices: 'Red shirt or blue shirt?' to give safe control.",
      hi: "जब बच्चा 'ना' कहे, वह स्वायत्तता आज़मा रहा है। सरल विकल्प दें: 'लाल कमीज़ या नीली?'",
      hin: "Jab toddler 'no' bole, woh autonomy test kar raha hai — defy nahi kar raha. Simple choice do: 'Lal shirt ya blue shirt?'",
    },
    sourceType: "developmental_milestone",
  },

  // ── DAILY CARE ───────────────────────────────────────────────────────────
  {
    id: "care_0_6_bath",
    category: "daily_care",
    fromMonths: 0, toMonths: 6, emoji: "🛁",
    title: {
      en: "Bathing: 2–3 times a week",
      hi: "नहाना: सप्ताह में 2–3 बार",
      hin: "Bath: hafte mein 2–3 baar",
    },
    body: {
      en: "Newborn skin is delicate. Use lukewarm water (37°C), mild fragrance-free cleanser, no longer than 5–10 minutes. Pat dry, don't rub.",
      hi: "नवजात की त्वचा नाज़ुक है। गुनगुना पानी (37°C), हल्का सुगंध-रहित साबुन, 5–10 मिनट तक। पोंछें, रगड़ें नहीं।",
      hin: "Newborn skin delicate hai. Lukewarm water (37°C), mild fragrance-free cleanser, 5–10 min se zyada nahi. Pat dry karo, ragdo nahi.",
    },
    sourceType: "general_care",
  },
  {
    id: "care_0_24_skin",
    category: "daily_care",
    fromMonths: 0, toMonths: 24, emoji: "🧴",
    title: {
      en: "Daily moisturizing helps",
      hi: "रोज़ाना मॉइस्चराइज़र लगाएँ",
      hin: "Roz moisturizer lagao",
    },
    body: {
      en: "Massage with light, fragrance-free oil or lotion after bath. Helps skin barrier and is a beautiful bonding ritual.",
      hi: "नहाने के बाद हल्के, सुगंध-रहित तेल/लोशन से मालिश करें। त्वचा की रक्षा और बंधन दोनों मजबूत होते हैं।",
      hin: "Bath ke baad halka fragrance-free oil ya lotion se massage karo. Skin barrier bhi banta hai, bonding bhi badhti hai.",
    },
    sourceType: "general_care",
  },
  {
    id: "care_0_24_safe",
    category: "daily_care",
    fromMonths: 0, toMonths: 24, emoji: "🛡️",
    title: {
      en: "Safe environment basics",
      hi: "सुरक्षित माहौल",
      hin: "Safe environment basics",
    },
    body: {
      en: "No smoking near baby. Room temperature 20–22°C. Cover plug points. Once mobile, install gates on stairs and lock low cabinets.",
      hi: "बच्चे के पास धूम्रपान न करें। कमरे का तापमान 20–22°C। प्लग ढकें। चलते ही सीढ़ियों पर गेट लगाएँ।",
      hin: "Baby ke paas smoking nahi. Room temp 20–22°C. Plug points cover karo. Mobile hote hi stairs par gate lagao, neeche cabinets lock karo.",
    },
    sourceType: "general_care",
  },
  {
    id: "care_6_24_teeth",
    category: "daily_care",
    fromMonths: 6, toMonths: 24, emoji: "🦷",
    title: {
      en: "Clean gums and first teeth",
      hi: "मसूड़े और दाँत साफ़ करें",
      hin: "Gums aur pehle daant clean karo",
    },
    body: {
      en: "From 6 mo, wipe gums with a clean wet cloth twice daily. Once teeth appear, use a soft baby brush with a rice-grain dab of fluoride paste.",
      hi: "6 महीने से दिन में दो बार साफ़ गीले कपड़े से मसूड़े पोंछें। दाँत आने पर मुलायम ब्रश और चावल के दाने जितना पेस्ट लगाएँ।",
      hin: "6 mo se din mein 2 baar saaf wet cloth se gums saaf karo. Daant aate hi soft baby brush + rice-grain itna toothpaste use karo.",
    },
    sourceType: "general_care",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function pickLang<T extends { en: string; hi: string; hin: string }>(
  text: T,
  lang: Lang,
): string {
  if (lang === "hi") return text.hi || text.en;
  if (lang === "hin") return text.hin || text.en;
  return text.en;
}

export function getTipsForAge(
  ageMonths: number,
  category: InfantCategory,
): InfantTip[] {
  return INFANT_TIPS.filter(
    (t) =>
      t.category === category &&
      ageMonths >= t.fromMonths &&
      ageMonths < t.toMonths,
  );
}

export type AmyInsight = LocalizedText & { emoji: string };

/**
 * Generate the contextual "Amy AI Suggests" line per category, deterministic
 * based on age in months. No API call — pure pattern matching on dev windows.
 */
export function getAmyInsight(
  ageMonths: number,
  category: InfantCategory,
): AmyInsight {
  switch (category) {
    case "sleep": {
      const wakeWindow =
        ageMonths < 3 ? 60 : ageMonths < 6 ? 105 : ageMonths < 12 ? 150 : 240;
      return {
        emoji: "💤",
        en: `Your baby's next sleep window is in about ${wakeWindow} mins of awake time.`,
        hi: `लगभग ${wakeWindow} मिनट जागने के बाद अगली नींद की खिड़की आ सकती है।`,
        hin: `Around ${wakeWindow} mins awake time ke baad next sleep window aa sakti hai.`,
      };
    }
    case "feeding": {
      if (ageMonths < 6) {
        return {
          emoji: "🍼",
          en: "Under 6 months — exclusive breast/formula milk is enough. No water needed.",
          hi: "6 महीने से कम — केवल माँ का दूध/फॉर्मूला काफ़ी है। पानी की ज़रूरत नहीं।",
          hin: "6 months se kam — sirf breast/formula milk kaafi hai. Paani ki zarurat nahi.",
        };
      }
      if (ageMonths < 9) {
        return {
          emoji: "🥣",
          en: "Time to introduce single-grain purees and mashed fruit, slowly one new food at a time.",
          hi: "एक-एक करके अनाज की प्यूरी और मसले फल देना शुरू करें।",
          hin: "Slowly single-grain puree aur mashed fruit ek-ek karke introduce karo.",
        };
      }
      if (ageMonths < 12) {
        return {
          emoji: "🍌",
          en: "Soft finger foods are great now — paneer cubes, banana, well-cooked veg. Always supervise.",
          hi: "अब नरम फिंगर फूड बढ़िया है — पनीर, केला, पकी सब्ज़ी। साथ रहें।",
          hin: "Soft finger foods ab perfect — paneer, banana, cooked veg. Saath raho.",
        };
      }
      return {
        emoji: "🍽️",
        en: "Toddler can join family meals — soft, low-salt, low-sugar versions of what you eat.",
        hi: "बच्चा परिवार के खाने में शामिल हो सकता है — कम नमक/चीनी वाला नरम भोजन।",
        hin: "Toddler family meals join kar sakta hai — soft, low salt/sugar version.",
      };
    }
    case "development": {
      if (ageMonths < 3) {
        return {
          emoji: "👀",
          en: "Watch for first social smile and eye contact in the next few weeks.",
          hi: "अगले कुछ हफ़्तों में पहली मुस्कान और आँखें मिलाने पर नज़र रखें।",
          hin: "Agle kuch weeks mein pehli social smile aur eye contact dekhna.",
        };
      }
      if (ageMonths < 6) {
        return {
          emoji: "🔄",
          en: "Rolling over is the milestone to watch for now. Daily tummy time helps.",
          hi: "अभी करवट लेना देखने वाला मील का पत्थर है। रोज़ पेट के बल खेल मदद करेगा।",
          hin: "Abhi rolling over watch karne wala milestone hai. Daily tummy time help karega.",
        };
      }
      if (ageMonths < 9) {
        return {
          emoji: "🪑",
          en: "Sitting without support is the next milestone. Place toys just out of reach.",
          hi: "अगला मील का पत्थर बिना सहारे बैठना है। खिलौने थोड़ी दूर रखें।",
          hin: "Next milestone bina support baithna hai. Toys thodi dur rakho.",
        };
      }
      if (ageMonths < 12) {
        return {
          emoji: "🚼",
          en: "Crawling and pulling to stand are this window. Babyproof low corners now.",
          hi: "रेंगना और सहारे से खड़े होना अभी आम है। नीचे के कोने सुरक्षित करें।",
          hin: "Crawl aur pull-to-stand abhi common hain. Niche ke corners babyproof karo.",
        };
      }
      if (ageMonths < 18) {
        return {
          emoji: "🚶",
          en: "First steps and first words are appearing. Read and narrate every day.",
          hi: "पहले कदम और पहले शब्द आ रहे हैं। रोज़ पढ़ें और बात करें।",
          hin: "Pehle kadam aur pehle words aa rahe hain. Roz padho aur baat karo.",
        };
      }
      return {
        emoji: "🗣️",
        en: "Vocabulary is growing fast. Aim for short sentences in your home language.",
        hi: "शब्द तेज़ी से बढ़ रहे हैं। अपनी घर की भाषा में छोटे वाक्य बनाएँ।",
        hin: "Vocab tezi se badh rahi hai. Apni home language mein short sentences try karo.",
      };
    }
    case "behavior": {
      if (ageMonths < 3) {
        return {
          emoji: "😢",
          en: "Most likely cause of crying: hunger or tiredness. Try a calm feed or swaddle.",
          hi: "रोने का मुख्य कारण: भूख या थकान। शांत दूध या लपेटना आज़माएँ।",
          hin: "Rone ka likely cause: bhook ya thakaan. Calm feed ya swaddle try karo.",
        };
      }
      if (ageMonths < 9) {
        return {
          emoji: "🌒",
          en: "Your baby may be overstimulated — reduce noise and light before sleep.",
          hi: "बच्चा अधिक उत्तेजित हो सकता है — सोने से पहले शोर और रोशनी कम करें।",
          hin: "Baby overstimulated ho sakta hai — sone se pehle noise aur light kam karo.",
        };
      }
      if (ageMonths < 12) {
        return {
          emoji: "🤗",
          en: "Separation anxiety is healthy at this age. Always say a calm goodbye.",
          hi: "इस उम्र में अलगाव की चिंता स्वस्थ है। हमेशा शांत अलविदा कहें।",
          hin: "Is age mein separation anxiety healthy hai. Hamesha calm goodbye bolo.",
        };
      }
      return {
        emoji: "🌊",
        en: "Tantrums are big feelings without words yet. Stay close, name the feeling.",
        hi: "गुस्सा बिना शब्दों की भावना है। पास रहें, भावना का नाम लें।",
        hin: "Tantrum bina words ki badi feeling hai. Paas raho, feeling ka naam lo.",
      };
    }
    case "daily_care": {
      if (ageMonths < 6) {
        return {
          emoji: "🛁",
          en: "Bathe 2–3 times a week with lukewarm water and a fragrance-free cleanser.",
          hi: "हफ़्ते में 2–3 बार गुनगुने पानी और सुगंध-रहित साबुन से नहलाएँ।",
          hin: "Hafte mein 2–3 baar lukewarm water aur fragrance-free cleanser se nehlao.",
        };
      }
      if (ageMonths < 12) {
        return {
          emoji: "🦷",
          en: "Wipe gums daily; once teeth appear, use a soft baby brush with rice-grain paste.",
          hi: "रोज़ मसूड़े पोंछें; दाँत आने पर मुलायम ब्रश और चावल जितना पेस्ट लगाएँ।",
          hin: "Roz gums saaf karo; daant aate hi soft brush aur rice-grain paste use karo.",
        };
      }
      return {
        emoji: "🛡️",
        en: "Now mobile — install stair gates, lock cabinets, cover plug points.",
        hi: "अब चलने लगा — सीढ़ियों पर गेट लगाएँ, अलमारी बंद करें, प्लग ढकें।",
        hin: "Ab mobile hai — stair gates lagao, cabinets lock karo, plug points cover karo.",
      };
    }
  }
}

/** Convenience: is the child within the infant-hub age window (≤24 months)? */
export function isInfantHubAge(ageMonths: number): boolean {
  return ageMonths >= 0 && ageMonths < 24;
}

// ─── Parent-Hub-parity data (vaccinations, milestones, cues, sounds, etc.) ──
// See `./parentHub.ts` for the full set of accessors and types used by the
// mobile InfantHub featured card to match the web Parent Hub surface.
export * from "./parentHub";

// Pure-JS WAV synth used by mobile InfantSoundsTab to play the white-noise
// catalogue without bundling audio assets.
export * from "./audioSynth";
