// ─── Life Skills Mode — shared data + helpers ────────────────────────────────
// Used by both web (artifacts/kidschedule) and mobile (artifacts/amynest-mobile).
// Pure data, no platform deps. Strings are localized to en/hi/hinglish.

export type LifeSkillLang = "en" | "hi" | "hinglish";

export type LifeSkillAgeBand = "toddler" | "preschool" | "kid" | "teen";

export type LifeSkillCategory =
  | "hygiene"
  | "social"
  | "responsibility"
  | "emotional"
  | "money"
  | "time"
  | "self_care"
  | "chores";

export type LifeSkillDifficulty = "easy" | "medium" | "hard";

export interface LocalizedText { en: string; hi: string; hinglish: string }

export interface LifeSkillTask {
  id: string;
  ageBand: LifeSkillAgeBand;
  category: LifeSkillCategory;
  difficulty: LifeSkillDifficulty;
  title: LocalizedText;
  description: LocalizedText;
  parentTip: LocalizedText;
}

// ─── Age band helper ──────────────────────────────────────────────────────────
export function ageBandForLifeSkills(ageYears: number): LifeSkillAgeBand {
  if (ageYears <= 4) return "toddler";
  if (ageYears <= 6) return "preschool";
  if (ageYears <= 10) return "kid";
  return "teen";
}

export function ageBandLabel(band: LifeSkillAgeBand, lang: LifeSkillLang = "en"): string {
  const map: Record<LifeSkillAgeBand, LocalizedText> = {
    toddler:    { en: "2–4 yrs",  hi: "2–4 साल", hinglish: "2–4 saal" },
    preschool:  { en: "5–6 yrs",  hi: "5–6 साल", hinglish: "5–6 saal" },
    kid:        { en: "7–10 yrs", hi: "7–10 साल", hinglish: "7–10 saal" },
    teen:       { en: "11–15 yrs", hi: "11–15 साल", hinglish: "11–15 saal" },
  };
  return map[band][lang];
}

// ─── Categories ───────────────────────────────────────────────────────────────
export const CATEGORY_EMOJI: Record<LifeSkillCategory, string> = {
  hygiene: "🧼",
  social: "🤝",
  responsibility: "📋",
  emotional: "💗",
  money: "💰",
  time: "⏰",
  self_care: "🧴",
  chores: "🧹",
};

export const CATEGORY_LABEL: Record<LifeSkillCategory, LocalizedText> = {
  hygiene:        { en: "Hygiene",        hi: "स्वच्छता",     hinglish: "Safai" },
  social:         { en: "Social",         hi: "सामाजिक",     hinglish: "Social" },
  responsibility: { en: "Responsibility", hi: "ज़िम्मेदारी",   hinglish: "Zimmedari" },
  emotional:      { en: "Emotional",      hi: "भावनात्मक",   hinglish: "Emotional" },
  money:          { en: "Money",          hi: "पैसा",         hinglish: "Paisa" },
  time:           { en: "Time",           hi: "समय",          hinglish: "Time" },
  self_care:      { en: "Self-care",      hi: "स्व-देखभाल",   hinglish: "Self-care" },
  chores:         { en: "Chores",         hi: "घरेलू काम",    hinglish: "Ghar ka kaam" },
};

export const POINTS_BY_DIFFICULTY: Record<LifeSkillDifficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 15,
};

export const DIFFICULTY_LABEL: Record<LifeSkillDifficulty, LocalizedText> = {
  easy:   { en: "Easy",   hi: "आसान",  hinglish: "Easy" },
  medium: { en: "Medium", hi: "मध्यम",  hinglish: "Medium" },
  hard:   { en: "Hard",   hi: "कठिन",  hinglish: "Hard" },
};

// ─── Task bank ────────────────────────────────────────────────────────────────
const T = (
  id: string,
  ageBand: LifeSkillAgeBand,
  category: LifeSkillCategory,
  difficulty: LifeSkillDifficulty,
  title: LocalizedText,
  description: LocalizedText,
  parentTip: LocalizedText,
): LifeSkillTask => ({ id, ageBand, category, difficulty, title, description, parentTip });

export const LIFE_SKILL_TASKS: LifeSkillTask[] = [
  // ── TODDLER (2–4) ─────────────────────────────────────────────────────────
  T("tod-hyg-1", "toddler", "hygiene", "easy",
    { en: "Wash your hands before eating",
      hi: "खाने से पहले हाथ धोएं",
      hinglish: "Khaane se pehle haath dhoyein" },
    { en: "Use soap and rinse for 20 seconds before any meal.",
      hi: "साबुन से 20 सेकंड तक हाथ धोएं।",
      hinglish: "Saaboon se 20 second tak haath dhoyein." },
    { en: "Sing a short song with them while they wash — makes it fun.",
      hi: "हाथ धोते समय उनके साथ एक छोटा गाना गाएं।",
      hinglish: "Haath dhote samay ek chhota song saath gaayein." }),
  T("tod-self-1", "toddler", "self_care", "easy",
    { en: "Eat your meal yourself",
      hi: "अपना खाना खुद खाएं",
      hinglish: "Apna khaana khud khao" },
    { en: "Try eating with a spoon without help today.",
      hi: "आज बिना मदद के चम्मच से खाने की कोशिश करें।",
      hinglish: "Aaj bina help spoon se khaane ki try karo." },
    { en: "Spills are okay! Praise effort, not neatness.",
      hi: "गिरना ठीक है — प्रयास की तारीफ करें।",
      hinglish: "Spill ho jaaye toh thik hai — effort ki tareef karein." }),
  T("tod-resp-1", "toddler", "responsibility", "easy",
    { en: "Put your toys back in the box",
      hi: "अपने खिलौने डिब्बे में रखें",
      hinglish: "Apne toys box mein rakho" },
    { en: "After playing, put every toy back where it belongs.",
      hi: "खेलने के बाद हर खिलौना उसकी जगह पर रखें।",
      hinglish: "Khelne ke baad har toy apni jagah pe rakho." },
    { en: "Clean up alongside them — they copy what you do.",
      hi: "साथ में सफाई करें — बच्चे आपकी नकल करते हैं।",
      hinglish: "Saath mein cleanup karein — bachche aapko copy karte hain." }),
  T("tod-soc-1", "toddler", "social", "easy",
    { en: "Say 'please' and 'thank you'",
      hi: "‘कृपया’ और ‘धन्यवाद’ कहें",
      hinglish: "‘Please’ aur ‘Thank you’ bolo" },
    { en: "Use these magic words at every meal today.",
      hi: "आज हर भोजन पर ये जादुई शब्द बोलें।",
      hinglish: "Aaj har meal pe ye magic words bolo." },
    { en: "Model it yourself — children mirror your manners.",
      hi: "आप खुद बोलें — बच्चे आपकी आदतें अपनाते हैं।",
      hinglish: "Aap khud bolo — bachche aapki habits copy karte hain." }),
  T("tod-emo-1", "toddler", "emotional", "easy",
    { en: "Name your feeling",
      hi: "अपनी भावना का नाम लें",
      hinglish: "Apni feeling ka naam batao" },
    { en: "Point to a face emoji that matches how you feel.",
      hi: "आप कैसा महसूस कर रहे हैं वह इमोजी दिखाएं।",
      hinglish: "Jo feel ho rahi hai woh emoji point karo." },
    { en: "Reflect back: 'You feel happy, that's wonderful.'",
      hi: "उनकी भावना दोहराएं — 'आप खुश हैं, बहुत अच्छा'।",
      hinglish: "'Tum khush ho, bahut accha' bolke unki feeling acknowledge karo." }),
  T("tod-hyg-2", "toddler", "hygiene", "medium",
    { en: "Brush your teeth twice today",
      hi: "आज दो बार दांत साफ करें",
      hinglish: "Aaj 2 baar daant brush karo" },
    { en: "Once after waking up, once before sleep.",
      hi: "एक बार सुबह, एक बार सोने से पहले।",
      hinglish: "Ek baar subah, ek baar raat ko." },
    { en: "Brush yours alongside theirs — make it a duet.",
      hi: "उनके साथ अपने भी ब्रश करें।",
      hinglish: "Unke saath aap bhi brush karein." }),

  // ── PRESCHOOL (5–6) ──────────────────────────────────────────────────────
  T("pre-self-1", "preschool", "self_care", "easy",
    { en: "Dress yourself today",
      hi: "आज खुद कपड़े पहनें",
      hinglish: "Aaj khud kapde pehno" },
    { en: "Pick out and put on your own clothes without help.",
      hi: "बिना मदद के अपने कपड़े चुनें और पहनें।",
      hinglish: "Bina help ke apne kapde choose karke pehno." },
    { en: "Lay out 2 outfit choices — gives autonomy without overwhelm.",
      hi: "2 विकल्प सामने रखें — पसंद बनाना आसान हो।",
      hinglish: "2 options aage rakho — choice asaan ho jaayegi." }),
  T("pre-soc-1", "preschool", "social", "easy",
    { en: "Share a toy with someone",
      hi: "किसी के साथ खिलौना साझा करें",
      hinglish: "Kisi ke saath toy share karo" },
    { en: "Pick one toy and let a friend or sibling play with it.",
      hi: "एक खिलौना चुनें और दूसरे को खेलने दें।",
      hinglish: "Ek toy choose karo aur kisi aur ko khelne do." },
    { en: "Use a timer to make sharing fair: '5 mins each'.",
      hi: "बारी-बारी के लिए टाइमर का उपयोग करें।",
      hinglish: "Turn-by-turn ke liye timer set karo." }),
  T("pre-resp-1", "preschool", "responsibility", "easy",
    { en: "Follow a 3-step instruction",
      hi: "3 कदम वाला निर्देश पूरा करें",
      hinglish: "3 step ka instruction follow karo" },
    { en: "Example: 'Pick up the cup, take it to the kitchen, put it in the sink.'",
      hi: "उदाहरण: कप उठाएं, रसोई में ले जाएं, सिंक में रखें।",
      hinglish: "Example: cup uthao, kitchen le jao, sink mein rakho." },
    { en: "Give instructions slowly and let them repeat back.",
      hi: "धीरे से बोलें और बच्चे को दोहराने दें।",
      hinglish: "Dheere bolo aur bachche ko repeat karne do." }),
  T("pre-emo-1", "preschool", "emotional", "medium",
    { en: "Talk about something that made you happy",
      hi: "किसी ऐसी बात के बारे में बताएं जिससे खुशी हुई",
      hinglish: "Aaj kya cheez khushi di — batao" },
    { en: "Share one happy moment from today at dinner.",
      hi: "रात के खाने पर एक खुशी का पल साझा करें।",
      hinglish: "Dinner pe ek happy moment share karo." },
    { en: "Share yours first — it makes them feel safe to open up.",
      hi: "पहले अपना साझा करें — बच्चा भी खुलेगा।",
      hinglish: "Pehle aap apna share karo — bachcha bhi khulega." }),
  T("pre-chr-1", "preschool", "chores", "easy",
    { en: "Help set the dinner table",
      hi: "रात के खाने की मेज लगाने में मदद करें",
      hinglish: "Dinner table lagaane mein help karo" },
    { en: "Place spoons, plates, or napkins — your choice.",
      hi: "चम्मच, थाली या नैपकिन रखें।",
      hinglish: "Spoon, plate ya napkin rakho." },
    { en: "Praise the help, not the perfection.",
      hi: "मदद की तारीफ करें, परफेक्शन की नहीं।",
      hinglish: "Help ki tareef karo, perfection ki nahi." }),
  T("pre-hyg-1", "preschool", "hygiene", "easy",
    { en: "Take a bath without resistance",
      hi: "बिना मनाए नहाएं",
      hinglish: "Bina nakhre ke nahaao" },
    { en: "Get in, scrub, rinse — all in good cheer today.",
      hi: "खुशी से नहाएं — रगड़ें और पानी डालें।",
      hinglish: "Khushi se nahaao — scrub karo aur paani daalo." },
    { en: "Add a fun bath toy or song to make it pleasant.",
      hi: "एक मज़ेदार खिलौना या गाना जोड़ें।",
      hinglish: "Ek fun toy ya gaana add karo." }),

  // ── KID (7–10) ───────────────────────────────────────────────────────────
  T("kid-time-1", "kid", "time", "medium",
    { en: "Pack your school bag yourself",
      hi: "अपना स्कूल बैग खुद पैक करें",
      hinglish: "Apna school bag khud pack karo" },
    { en: "Check the timetable and pack everything for tomorrow.",
      hi: "कल के लिए समय-सारणी देखकर सब रखें।",
      hinglish: "Kal ka timetable dekhke sab rakho." },
    { en: "Make a small checklist they tick off the first few times.",
      hi: "एक छोटी चेकलिस्ट बनाएं जिसे वे टिक करें।",
      hinglish: "Ek chhoti checklist banao jo wo tick karein." }),
  T("kid-resp-1", "kid", "responsibility", "medium",
    { en: "Finish homework before screen time",
      hi: "स्क्रीन से पहले होमवर्क खत्म करें",
      hinglish: "Screen time se pehle homework khatam karo" },
    { en: "Complete all assignments before any TV/phone today.",
      hi: "आज सारा होमवर्क पहले करें, फिर स्क्रीन।",
      hinglish: "Aaj saara homework pehle, screen baad mein." },
    { en: "Sit nearby quietly — your presence is calming, not policing.",
      hi: "पास बैठें — आपकी मौजूदगी दिलासा देती है।",
      hinglish: "Paas baitho chupchaap — presence se calm milta hai." }),
  T("kid-money-1", "kid", "money", "medium",
    { en: "Save 2 coins in a jar today",
      hi: "आज एक डिब्बे में 2 सिक्के बचाएं",
      hinglish: "Aaj jar mein 2 coins save karo" },
    { en: "Drop any 2 small coins into your savings jar.",
      hi: "अपनी बचत डिब्बी में कोई 2 सिक्के डालें।",
      hinglish: "Apni saving jar mein koi bhi 2 coins daalo." },
    { en: "Talk about what they're saving for — connect saving to a goal.",
      hi: "किस लिए बचा रहे हैं — लक्ष्य के बारे में बात करें।",
      hinglish: "Kis cheez ke liye save kar rahe ho — goal pe baat karo." }),
  T("kid-chr-1", "kid", "chores", "medium",
    { en: "Make your bed in the morning",
      hi: "सुबह अपना बिस्तर ठीक करें",
      hinglish: "Subah apna bed bana lo" },
    { en: "Straighten the sheet, fluff the pillow, fold the blanket.",
      hi: "चादर सीधी करें, तकिया फुलाएं, कंबल मोड़ें।",
      hinglish: "Bedsheet seedhi karo, pillow fluff karo, blanket fold karo." },
    { en: "Don't redo their work — celebrate their version.",
      hi: "उनका काम दोबारा न करें — उनके प्रयास की सराहना करें।",
      hinglish: "Unka kaam dobara mat karo — unke version ko celebrate karo." }),
  T("kid-soc-1", "kid", "social", "easy",
    { en: "Greet 3 family members today",
      hi: "आज परिवार के 3 लोगों का अभिवादन करें",
      hinglish: "Aaj ghar ke 3 logon ko greet karo" },
    { en: "Look in their eyes and say 'Good morning' or 'How are you?'",
      hi: "उनकी आंखों में देखकर अभिवादन करें।",
      hinglish: "Aankhon mein dekhke greeting bolo." },
    { en: "Eye contact is a key skill — don't rush it.",
      hi: "आंखों का संपर्क एक अहम कौशल है — जल्दबाज़ी न करें।",
      hinglish: "Eye contact zaroori skill hai — jaldi mat karo." }),
  T("kid-hyg-1", "kid", "hygiene", "easy",
    { en: "Trim and clean your nails",
      hi: "अपने नाखून काटें और साफ करें",
      hinglish: "Apne nails kaato aur saaf karo" },
    { en: "Check both hands and feet today.",
      hi: "हाथ और पैर दोनों के नाखून जांचें।",
      hinglish: "Haath aur pair dono ke nails check karo." },
    { en: "Help with tools, but let them do the inspection.",
      hi: "औज़ार में मदद करें, जांच उन्हें करने दें।",
      hinglish: "Tools mein help karo, par check unhein karne do." }),

  // ── TEEN (11–15) ─────────────────────────────────────────────────────────
  T("teen-time-1", "teen", "time", "hard",
    { en: "Plan tomorrow in 5 minutes",
      hi: "5 मिनट में कल की योजना बनाएं",
      hinglish: "5 minute mein kal ka plan banao" },
    { en: "Write down top 3 tasks for tomorrow before bed.",
      hi: "सोने से पहले कल के 3 ज़रूरी काम लिखें।",
      hinglish: "Sone se pehle kal ke top 3 kaam likho." },
    { en: "Don't critique their list — discuss only if they ask.",
      hi: "उनकी सूची की आलोचना न करें — पूछने पर ही चर्चा।",
      hinglish: "List ki criticism mat karo — wo poochein toh hi discuss karo." }),
  T("teen-resp-1", "teen", "responsibility", "hard",
    { en: "Make one decision independently today",
      hi: "आज एक निर्णय खुद लें",
      hinglish: "Aaj ek decision khud lo" },
    { en: "Pick one small choice (meal, outfit, activity) and own it.",
      hi: "एक छोटा निर्णय (खाना, कपड़े) खुद लें।",
      hinglish: "Ek chhoti choice (khaana, kapde) khud karo." },
    { en: "Even if you disagree — let it stand. Confidence is built here.",
      hi: "असहमत हो तो भी रहने दें — यहीं आत्मविश्वास बनता है।",
      hinglish: "Disagree ho toh bhi rehne do — yahin se confidence aata hai." }),
  T("teen-money-1", "teen", "money", "medium",
    { en: "Track today's spending",
      hi: "आज के खर्चे लिखें",
      hinglish: "Aaj ka kharcha track karo" },
    { en: "Note every rupee you spend today in a notes app.",
      hi: "आज के हर खर्च को नोट करें।",
      hinglish: "Aaj ka har kharcha note karo." },
    { en: "Review together at week-end without judgement.",
      hi: "सप्ताह के अंत में बिना न्याय के साथ देखें।",
      hinglish: "Week end pe saath review karo, bina judgement." }),
  T("teen-emo-1", "teen", "emotional", "medium",
    { en: "Take 5 deep breaths when frustrated",
      hi: "गुस्सा आने पर 5 गहरी सांस लें",
      hinglish: "Frustration mein 5 deep breath lo" },
    { en: "Pause before reacting — try this once today.",
      hi: "प्रतिक्रिया से पहले रुकें — आज एक बार आज़माएं।",
      hinglish: "React karne se pehle ruko — aaj ek baar try karo." },
    { en: "Practice it yourself out loud sometimes — they notice.",
      hi: "कभी-कभी आप भी ज़ोर से अभ्यास करें — वे देखते हैं।",
      hinglish: "Kabhi aap bhi out loud practice karo — wo notice karte hain." }),
  T("teen-soc-1", "teen", "social", "medium",
    { en: "Help someone without being asked",
      hi: "बिना कहे किसी की मदद करें",
      hinglish: "Bina kahe kisi ki help karo" },
    { en: "Spot one chance to help at home or school today.",
      hi: "घर या स्कूल में एक अवसर ढूंढ़ें।",
      hinglish: "Ghar ya school mein ek chance dhoondho." },
    { en: "Notice and name it: 'I saw what you did, that was kind.'",
      hi: "उनके काम को पहचानें — 'मैंने देखा, बहुत अच्छा'।",
      hinglish: "Unka kaam notice karke bolo — 'Maine dekha, bahut accha.'" }),
  T("teen-self-1", "teen", "self_care", "medium",
    { en: "Sleep on time today",
      hi: "आज समय पर सोएं",
      hinglish: "Aaj time pe sojao" },
    { en: "Be in bed by your target time — phone away 30 mins before.",
      hi: "अपने तय समय पर सोएं — फोन 30 मिनट पहले दूर रखें।",
      hinglish: "Apne target time pe sojao — phone 30 min pehle door rakho." },
    { en: "Model it yourself. No screens at the dinner table either.",
      hi: "आप भी पालन करें — खाने पर भी फोन नहीं।",
      hinglish: "Aap bhi follow karo — dinner pe bhi phone nahi." }),
];

// ─── Pickers ──────────────────────────────────────────────────────────────────
export function tasksFor(ageBand: LifeSkillAgeBand): LifeSkillTask[] {
  return LIFE_SKILL_TASKS.filter((t) => t.ageBand === ageBand);
}

function dateSeed(date: string, key: string | number): number {
  let h = 0;
  const s = `${date}|${key}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Pick the day's tasks. Deterministic per (date, child). Tries to vary
 *  category from yesterday's pick when `previousIds` are provided. */
export function pickDailyLifeSkillTasks(opts: {
  ageBand: LifeSkillAgeBand;
  date: string;
  childKey: string | number;
  count?: number;
  previousIds?: string[];
}): LifeSkillTask[] {
  const { ageBand, date, childKey, count = 2, previousIds = [] } = opts;
  const pool = tasksFor(ageBand);
  if (pool.length === 0) return [];
  const seed = dateSeed(date, childKey);
  // Order pool by a seeded shuffle; deprioritize tasks done in the prior set.
  const annotated = pool.map((t, i) => ({
    t,
    score: ((seed + i * 31) ^ (Math.imul(seed, i + 7))) & 0x7fffffff,
    recent: previousIds.includes(t.id) ? 1 : 0,
  }));
  annotated.sort((a, b) => a.recent - b.recent || a.score - b.score);
  const picks: LifeSkillTask[] = [];
  const seenCats = new Set<LifeSkillCategory>();
  for (const { t } of annotated) {
    if (picks.length >= count) break;
    if (!seenCats.has(t.category)) {
      picks.push(t);
      seenCats.add(t.category);
    }
  }
  // Fill if categories ran out.
  for (const { t } of annotated) {
    if (picks.length >= count) break;
    if (!picks.find((p) => p.id === t.id)) picks.push(t);
  }
  return picks.slice(0, count);
}

// ─── Insight & guidance helpers ───────────────────────────────────────────────
export interface CategoryStat { done: number; skipped: number }

export function buildAmyLifeSkillInsight(
  byCategory: Partial<Record<LifeSkillCategory, CategoryStat>>,
  childName: string,
  lang: LifeSkillLang = "en",
): string {
  const entries = (Object.entries(byCategory) as [LifeSkillCategory, CategoryStat | undefined][])
    .filter(([, v]) => (v?.done ?? 0) + (v?.skipped ?? 0) >= 1)
    .map(([c, v]) => ({ c, done: v!.done, total: v!.done + v!.skipped }));
  if (entries.length === 0) {
    const t: LocalizedText = {
      en: `${childName} hasn't started any life skill tasks yet. Tap one above to begin!`,
      hi: `${childName} ने अभी कोई कौशल कार्य शुरू नहीं किया है — ऊपर एक चुनें।`,
      hinglish: `${childName} ne abhi koi task start nahi kiya — upar se ek choose karo.`,
    };
    return t[lang];
  }
  entries.sort((a, b) => (b.done / Math.max(1, b.total)) - (a.done / Math.max(1, a.total)));
  const best = entries[0]!;
  const bestLabel = CATEGORY_LABEL[best.c][lang];
  const t: LocalizedText = {
    en: `${childName} is improving in ${bestLabel} — keep up the daily practice!`,
    hi: `${childName} ${bestLabel} में आगे बढ़ रहा है — रोज़ अभ्यास जारी रखें।`,
    hinglish: `${childName} ${bestLabel} mein improve kar raha hai — daily practice continue karo.`,
  };
  return t[lang];
}

// ─── Tiny UI dictionary used by both web + mobile components ─────────────────
export const UI_LABELS = {
  sectionTitle:  { en: "Life Skills Mode",     hi: "जीवन कौशल मोड",     hinglish: "Life Skills Mode" },
  sectionDesc:   { en: "Daily real-life skills for ages 2–15",
                   hi: "2–15 वर्ष के लिए दैनिक जीवन कौशल",
                   hinglish: "2–15 saal ke liye daily life skills" },
  todayTitle:    { en: "Today's Life Skills",  hi: "आज के जीवन कौशल",  hinglish: "Aaj ke Life Skills" },
  markDone:      { en: "Mark Done",            hi: "पूरा हुआ",          hinglish: "Done" },
  skip:          { en: "Skip",                 hi: "छोड़ें",            hinglish: "Skip" },
  done:          { en: "Done",                 hi: "पूरा हुआ",          hinglish: "Done" },
  skipped:       { en: "Skipped",              hi: "छोड़ दिया",         hinglish: "Skipped" },
  parentTip:     { en: "Parent Tip",           hi: "अभिभावक सलाह",      hinglish: "Parent Tip" },
  amyInsight:    { en: "Amy AI Insight",       hi: "एमी AI अंतर्दृष्टि", hinglish: "Amy AI Insight" },
  category:      { en: "Category",             hi: "श्रेणी",            hinglish: "Category" },
  difficulty:    { en: "Difficulty",           hi: "कठिनाई",            hinglish: "Difficulty" },
  points:        { en: "Points",               hi: "अंक",               hinglish: "Points" },
  totalPoints:   { en: "Total Points",         hi: "कुल अंक",           hinglish: "Total Points" },
  progressByCat: { en: "Progress by Category", hi: "श्रेणी के अनुसार प्रगति", hinglish: "Category-wise Progress" },
  language:      { en: "Language",             hi: "भाषा",              hinglish: "Bhasha" },
  noneToday:     { en: "All today's skills are done. Come back tomorrow!",
                   hi: "आज के सभी कौशल पूरे हो गए — कल फिर आएं!",
                   hinglish: "Aaj ke saare skills done — kal phir aana!" },
  dayStreak:     { en: "day streak",           hi: "दिन की लय",         hinglish: "din ki streak" },
  best:          { en: "best",                 hi: "सर्वश्रेष्ठ",        hinglish: "best" },
  rolePlayTitle: { en: "Role-play this skill", hi: "इस कौशल का रोल-प्ले", hinglish: "Is skill ka role-play" },
  show:          { en: "Show",                 hi: "दिखाएँ",            hinglish: "Dikhayein" },
  hide:          { en: "Hide",                 hi: "छिपाएँ",            hinglish: "Chhupayein" },
  noScenarios:   { en: "No scenarios yet.",    hi: "अभी कोई परिदृश्य नहीं।", hinglish: "Abhi koi scenario nahi." },
} as const satisfies Record<string, LocalizedText>;

export type UILabelKey = keyof typeof UI_LABELS;

export function uiLabel(key: UILabelKey, lang: LifeSkillLang = "en"): string {
  return UI_LABELS[key][lang];
}

// ─── Streak & weekly bar helpers ─────────────────────────────────────────────
// Pure functions used by both client + server so the streak math is
// guaranteed identical no matter who computes it.

/** Format a Date as YYYY-MM-DD in local time. */
export function formatLifeSkillDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/**
 * Compute the current consecutive-day streak ending today (or yesterday if
 * the user hasn't logged anything yet today). Any day with ≥ 1 completed
 * skill counts. A gap of even one day resets the streak.
 *
 * `dates` may contain duplicates and ordering doesn't matter.
 */
export function computeLifeSkillStreak(
  dates: readonly string[],
  today: Date = new Date(),
): { current: number; best: number } {
  const set = new Set<string>();
  for (const raw of dates) {
    if (typeof raw === "string" && raw.length >= 10) set.add(raw.slice(0, 10));
  }
  if (set.size === 0) return { current: 0, best: 0 };

  // Best streak — scan sorted dates and count longest consecutive run.
  const sorted = Array.from(set).sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]! + "T00:00:00");
    const cur = new Date(sorted[i]! + "T00:00:00");
    const diff = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diff === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }

  // Current streak — count back from today (or yesterday if no entry today).
  const todayKey = formatLifeSkillDate(today);
  const yKey = formatLifeSkillDate(addDays(today, -1));
  let cursor: Date;
  if (set.has(todayKey)) cursor = new Date(today);
  else if (set.has(yKey)) cursor = addDays(today, -1);
  else return { current: 0, best };

  let current = 0;
  while (set.has(formatLifeSkillDate(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, best };
}

/**
 * Return the last 7 calendar days (oldest first) flagged by whether any
 * skill was completed that day. Drives the weekly progress bar UI.
 */
export function buildLifeSkillWeeklyBar(
  dates: readonly string[],
  today: Date = new Date(),
): Array<{ date: string; completed: boolean }> {
  const set = new Set<string>();
  for (const raw of dates) {
    if (typeof raw === "string" && raw.length >= 10) set.add(raw.slice(0, 10));
  }
  const out: Array<{ date: string; completed: boolean }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = formatLifeSkillDate(addDays(today, -i));
    out.push({ date: d, completed: set.has(d) });
  }
  return out;
}

// ─── Role-play scenarios ─────────────────────────────────────────────────────
// One scenario per age band so caregivers always have a concrete prompt
// they can act out with the child after finishing today's skill.

export interface RolePlayScenario {
  id: string;
  ageBand: LifeSkillAgeBand;
  title: LocalizedText;
  setup: LocalizedText;
  childLine: LocalizedText;
  parentPrompt: LocalizedText;
}

export const ROLE_PLAY_SCENARIOS: RolePlayScenario[] = [
  {
    id: "rp-tod-1",
    ageBand: "toddler",
    title: {
      en: "Sharing the snack",
      hi: "नाश्ता बाँटना",
      hinglish: "Snack share karna",
    },
    setup: {
      en: "Pretend two stuffed animals both want the same biscuit.",
      hi: "दो खिलौनों को एक ही बिस्किट चाहिए — दिखाएं।",
      hinglish: "Do toys ko ek hi biscuit chahiye — yeh act karo.",
    },
    childLine: {
      en: "Say: 'Let's share — one piece for you, one for me!'",
      hi: "बोलें: 'चलो बाँटते हैं — एक तुम्हारा, एक मेरा!'",
      hinglish: "Bolo: 'Chalo share karte hain — ek tumhara, ek mera!'",
    },
    parentPrompt: {
      en: "Praise the moment they break the biscuit themselves.",
      hi: "जब वे खुद बिस्किट तोड़ें, तारीफ करें।",
      hinglish: "Jab wo khud biscuit todein, tareef karo.",
    },
  },
  {
    id: "rp-pre-1",
    ageBand: "preschool",
    title: {
      en: "Asking for help politely",
      hi: "विनम्रता से मदद मांगना",
      hinglish: "Politely help maangna",
    },
    setup: {
      en: "Pretend the child can't reach a toy on a high shelf.",
      hi: "बच्चा ऊँची शेल्फ़ पर खिलौने तक नहीं पहुँच पा रहा।",
      hinglish: "Bachcha ek high shelf ka toy reach nahi kar pa raha.",
    },
    childLine: {
      en: "Say: 'Excuse me, can you please help me reach the toy?'",
      hi: "बोलें: 'माफ कीजिए, क्या आप मुझे खिलौना देने में मदद करेंगे?'",
      hinglish: "Bolo: 'Excuse me, kya aap mujhe woh toy dene mein help karenge?'",
    },
    parentPrompt: {
      en: "Model both polite and rude versions — let them pick the better one.",
      hi: "विनम्र और रूखे दोनों तरीके दिखाएं — उन्हें चुनने दें।",
      hinglish: "Polite aur rude dono versions dikhaao — wo choose karein.",
    },
  },
  {
    id: "rp-kid-1",
    ageBand: "kid",
    title: {
      en: "Asking for the bill at a shop",
      hi: "दुकान पर बिल माँगना",
      hinglish: "Shop pe bill maangna",
    },
    setup: {
      en: "You're the shopkeeper, they're buying notebooks worth ₹120.",
      hi: "आप दुकानदार हैं — वे ₹120 की कॉपियाँ खरीद रहे हैं।",
      hinglish: "Aap shopkeeper, woh ₹120 ki notebooks le rahe hain.",
    },
    childLine: {
      en: "Say: 'Bhaiya, kitne hue? Can I have the bill please?'",
      hi: "बोलें: 'भैया, कितने हुए? कृपया बिल दीजिए।'",
      hinglish: "Bolo: 'Bhaiya, kitne hue? Bill please de dijiye.'",
    },
    parentPrompt: {
      en: "Hand back the right change — let them count it before pocketing.",
      hi: "सही बाकी पैसे दें — पॉकेट में रखने से पहले गिनवाएं।",
      hinglish: "Sahi change wapas do — pocket mein rakhne se pehle ginwao.",
    },
  },
  {
    id: "rp-teen-1",
    ageBand: "teen",
    title: {
      en: "Saying no to a friend's bad idea",
      hi: "दोस्त के गलत सुझाव को मना करना",
      hinglish: "Friend ki galat baat ko mana karna",
    },
    setup: {
      en: "Pretend a friend wants them to skip class to hang out.",
      hi: "मान लें दोस्त चाहता है कि वे क्लास छोड़कर बाहर जाएँ।",
      hinglish: "Maan lo friend chahta hai wo class chhodke bahar jaayein.",
    },
    childLine: {
      en: "Say: 'Not today — I have a test tomorrow. Let's plan for Sunday.'",
      hi: "बोलें: 'आज नहीं — कल टेस्ट है। रविवार को मिलते हैं।'",
      hinglish: "Bolo: 'Aaj nahi — kal test hai. Sunday plan karte hain.'",
    },
    parentPrompt: {
      en: "Discuss why a firm but friendly 'no' protects both their goals and the friendship.",
      hi: "बात करें कि सख्त लेकिन मित्रवत ‘ना’ क्यों सही है।",
      hinglish: "Baat karo ki firm but friendly ‘no’ kyu sahi hai.",
    },
  },
];

export function rolePlaysFor(ageBand: LifeSkillAgeBand): RolePlayScenario[] {
  return ROLE_PLAY_SCENARIOS.filter((s) => s.ageBand === ageBand);
}
