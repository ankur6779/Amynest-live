export type AgeBucket = "0-2" | "2-4" | "5-7" | "8-10" | "10+";
export type LangCode = "en" | "hi" | "hinglish";

export interface MultiLang {
  en: string;
  hi: string;
  hinglish: string;
}

export interface Lesson {
  id: string;
  title: MultiLang;
  description: MultiLang;
  durationMin: number;
  ageBucket: AgeBucket;
  emoji: string;
  expert: string;
  paragraphs: {
    en: string[];
    hi: string[];
    hinglish: string[];
  };
}

export function getLessonText(lesson: Lesson, lang: string) {
  const l: LangCode = lang === "hi" ? "hi" : lang === "hinglish" ? "hinglish" : "en";
  return {
    title: lesson.title[l],
    description: lesson.description[l],
    paragraphs: lesson.paragraphs[l],
  };
}

const L = (l: Lesson): Lesson => l;

export const LESSONS: Lesson[] = [
  // ─── 0–2 yrs ─────────────────────────────────────────────────────
  L({
    id: "infant-sleep-foundations",
    title: {
      en: "The Sleep Foundations Every Newborn Parent Needs",
      hi: "हर नए माता-पिता के लिए जरूरी नींद की बुनियाद",
      hinglish: "Naye Parent ke Liye Zaroori Neend ki Buniyad",
    },
    description: {
      en: "Wake windows, drowsy-but-awake, the 4-month sleep regression — explained simply.",
      hi: "वेक विंडो, नींद के चरण और 4 महीने की रिग्रेशन — सरल भाषा में।",
      hinglish: "Wake windows, drowsy-but-awake, aur 4-month sleep regression — simple mein samjhein.",
    },
    durationMin: 4, ageBucket: "0-2", emoji: "🌙", expert: "Based on AAP & Dr Harvey Karp",
    paragraphs: {
      en: [
        "Newborn sleep is not broken — it is biologically designed to be short, fragmented, and frequent. In the first 12 weeks, your baby has no circadian rhythm yet. Their melatonin production matures around week 8 to 12, which is why bedtimes start to settle only after that point.",
        "The single most useful tool in the first year is the wake window. A wake window is the time your baby stays awake between sleeps. For 0 to 8 weeks it is roughly 45 to 60 minutes. For 3 to 4 months it grows to 75 to 90 minutes. Putting your baby down before they cross their wake window is the #1 way to avoid the over-tired, hard-to-settle spiral.",
        "Place your baby in the crib drowsy but awake. This sounds clinical but it is the bedrock of independent sleep. If they always fall asleep on the breast, bottle, or in your arms, they will wake every sleep cycle (about every 45 minutes) and look for that exact same condition to fall back asleep.",
        "The 4-month sleep regression is not a regression — it is a permanent reorganisation of your baby's sleep architecture. Their sleep now has cycles like an adult, but they do not yet know how to bridge those cycles on their own. This is the right moment to gently teach independent sleep.",
        "Most importantly: a 'good sleeper' is largely made, not born. Consistency over the same 2 weeks beats any single technique. Pick one approach, and stick with it.",
      ],
      hi: [
        "नवजात की नींद टूटी-टूटी लगती है, लेकिन यह जैविक रूप से ऐसे ही बनी है। पहले 12 हफ्तों में शिशु की कोई सर्कैडियन लय नहीं होती। मेलाटोनिन उत्पादन 8-12 हफ्तों में शुरू होता है, तब जाकर सोने का समय स्थिर होता है।",
        "पहले साल में सबसे उपयोगी चीज़ है 'वेक विंडो' — दो नींदों के बीच जागने का समय। 0-8 हफ्तों में यह 45-60 मिनट होता है, 3-4 महीनों में 75-90 मिनट। वेक विंडो पार होने से पहले ही बच्चे को सुलाना सबसे जरूरी है।",
        "बच्चे को नींद आने लगे पर पूरी नींद आने से पहले पालने में रखें। यह 'drowsy but awake' तकनीक स्वतंत्र नींद की नींव है। अगर बच्चा हमेशा गोद या स्तन पर सोता है, तो हर 45 मिनट में उसी स्थिति को ढूंढेगा।",
        "4 महीने की स्लीप रिग्रेशन वास्तव में रिग्रेशन नहीं है — यह नींद की संरचना में स्थायी बदलाव है। अब नींद के चक्र वयस्कों जैसे हो जाते हैं, लेकिन बच्चा अभी उन्हें खुद से जोड़ना नहीं जानता। यही सही समय है धीरे-धीरे स्वतंत्र नींद सिखाने का।",
        "याद रखें: अच्छी नींद लेने वाला बच्चा ज्यादातर बनाया जाता है, पैदा नहीं होता। 2 हफ्तों की एकसमान दिनचर्या किसी भी तकनीक से बेहतर काम करती है।",
      ],
      hinglish: [
        "Newborn ki neend tuti-futi lagti hai, lekin yeh biology ke hisaab se hi aisa hota hai — yeh normal hai. Pehle 12 hafton mein baby ka koi circadian rhythm nahi hota. Melatonin production 8-12 hafte mein develop hoti hai, tab jaake sone ka waqt settle hona shuru hota hai.",
        "Pehle saal ka sabse useful tool hai 'wake window' — do sleeps ke beech jaagne ka time. 0-8 hafte mein yeh 45-60 minutes hota hai, 3-4 mahine mein 75-90 minutes ho jaata hai. Baby ko wake window cross karne se pehle sulana sabse zaroori hai, warna overtired ho jaata hai.",
        "Baby ko 'drowsy but awake' state mein cot mein rakhein — neenda aa rahi ho, par poori neend na aayi ho. Agar woh hamesha breast, bottle ya arms mein sota hai, toh har 45 minute ki sleep cycle mein usi cheez ko dhundhega.",
        "4-month sleep regression asal mein regression nahi hai — yeh sleep architecture ka permanent change hai. Ab baby ki neend adult cycles jaisi ho jaati hai, lekin wo khud se cycles bridge nahi kar paata. Yahi waqt hai gently independent sleep sikhane ka.",
        "Sabse zaroori baat: accha neend lene wala baccha banta hai, paida nahi hota. 2 hafte consistent rehna kisi bhi technique se zyaada kaam karta hai — ek approach choose karein aur usi par tikein.",
      ],
    },
  }),
  L({
    id: "infant-feeding-cues",
    title: {
      en: "Reading Your Baby's Hunger and Fullness Cues",
      hi: "बच्चे की भूख और तृप्ति के संकेत पहचानें",
      hinglish: "Baby ke Bhooke aur Pete Bhare Hone ke Signs Pehchanein",
    },
    description: {
      en: "Stop watching the clock. Read the baby — early hunger, late hunger, fullness signals.",
      hi: "घड़ी देखना बंद करें। बच्चे के संकेत पढ़ें — शुरुआती भूख, देर की भूख, पेट भरने के संकेत।",
      hinglish: "Clock band karein. Baby padhein — early hunger, late hunger, fullness ke signals.",
    },
    durationMin: 3, ageBucket: "0-2", emoji: "🍼", expert: "Based on WHO & Ellyn Satter",
    paragraphs: {
      en: [
        "Babies are born with one of the most reliable hunger and fullness systems in nature. Our job is to not break it. Schedule-feeding by the clock works against this; cue-feeding works with it.",
        "Early hunger cues: stirring, opening the mouth, turning the head and rooting, hand to mouth. This is the ideal time to feed — baby is calm and feeds efficiently.",
        "Mid hunger cues: stretching, increasing physical movement, fussing. You still have a calm window of a few minutes.",
        "Late hunger cues: crying, agitation, red face. Once a baby is crying from hunger, they are too dysregulated to latch well. Calm them first (skin-to-skin, gentle rocking) before offering the feed.",
        "Fullness cues are equally important: turning away, slowing the suck, falling asleep, pushing the bottle out, closing the mouth. Honour them. Forcing a baby to 'finish the bottle' overrides their satiety system and is one of the earliest causes of feeding battles later.",
      ],
      hi: [
        "बच्चे प्रकृति की सबसे भरोसेमंद भूख-तृप्ति प्रणाली के साथ पैदा होते हैं। हमारा काम है इसे बिगाड़ना नहीं। घड़ी के हिसाब से दूध पिलाना इस प्रणाली के खिलाफ काम करता है; संकेतों के अनुसार दूध पिलाना इसके साथ काम करता है।",
        "शुरुआती भूख के संकेत: हलचल करना, मुंह खोलना, सिर घुमाना और मुंह से ढूंढना, हाथ मुंह में डालना। यह दूध पिलाने का आदर्श समय है — बच्चा शांत होता है और अच्छे से दूध पीता है।",
        "बीच की भूख के संकेत: खिंचाव, ज्यादा हलचल, चिड़चिड़ापन। अभी भी कुछ मिनटों की शांत खिड़की बची है।",
        "देर की भूख के संकेत: रोना, बेचैनी, लाल चेहरा। एक बार रोने लगे तो शांत करना जरूरी है — पहले त्वचा से त्वचा का स्पर्श या धीरे हिलाएं, फिर दूध दें।",
        "तृप्ति के संकेत भी उतने ही महत्वपूर्ण हैं: मुंह फेरना, धीरे-धीरे चूसना, सो जाना, बोतल धकेलना। इन्हें मानें। 'बोतल खत्म करो' की जिद बच्चे की तृप्ति प्रणाली को नुकसान पहुंचाती है।",
      ],
      hinglish: [
        "Baby bhookh aur pet bhara hone ki sabse reliable natural system ke saath paida hota hai. Hamare kaam hai isko kharaab na karein. Clock ke hisaab se feed karna is system ke khilaf kaam karta hai; baby ke signals par feed karna sahi hai.",
        "Early hunger ke signs: hilna, muh kholna, sar ghoomana aur rooting, haath muh mein dalna. Yeh doodh pilane ka perfect time hai — baby calm hota hai aur acchi tarah peeta hai.",
        "Mid hunger ke signs: body stretching karna, zyaada movement, thoda fussy hona. Ab bhi kuch minute ka calm window bacha hai.",
        "Late hunger ke signs: rona, restless hona, laal chehra. Ek baar rona shuru ho jaye toh pehle calm karein — skin-to-skin ya gentle rocking — phir doodh dein. Rote hue latch achhi tarah nahi pakad paata.",
        "Fullness ke signs bhi utne hi important hain: muh pherna, dheere-dheere chusna, so jaana, bottle push karna. Inhe respect karein. 'Bottle khatam karo' ki zid baby ki natural satiety system ko break karti hai — baad mein feeding fights ka yahi sabse bada reason banta hai.",
      ],
    },
  }),
  L({
    id: "infant-tummy-time",
    title: {
      en: "Tummy Time: The 5-Minute Habit That Changes Everything",
      hi: "टमी टाइम: 5 मिनट की आदत जो सब बदल देती है",
      hinglish: "Tummy Time: 5-Minute ki Aadat Jo Sab Badal Deti Hai",
    },
    description: {
      en: "Why tummy time matters, when to start, and how to do it without tears.",
      hi: "टमी टाइम क्यों जरूरी है, कब शुरू करें, और बिना रोए कैसे करें।",
      hinglish: "Tummy time kyun zaroori hai, kab start karein, aur bina roye kaise karein.",
    },
    durationMin: 3, ageBucket: "0-2", emoji: "🤸", expert: "Based on AAP & paediatric PT",
    paragraphs: {
      en: [
        "Tummy time is the single most important developmental activity in the first 6 months. It builds neck strength, shoulder stability, core control, and prepares the baby for rolling, sitting, crawling and even later fine-motor skills.",
        "Start from day one. A 1 to 2 minute session 3 to 5 times a day is the goal. By 3 months, aim for 15 to 30 minutes total per day in short bursts.",
        "Most babies hate it at first. That is normal — it is hard work for them. Get down on the floor face-to-face with your baby. Sing, talk, make eye contact. Your face is the best toy.",
        "If your baby cries within seconds, try chest-to-chest tummy time on your reclined body. It still counts.",
        "Skipping tummy time is linked to delayed gross-motor milestones and to plagiocephaly (flat head). Make it a non-negotiable daily ritual, not a 'when I remember' activity.",
      ],
      hi: [
        "टमी टाइम पहले 6 महीनों में सबसे महत्वपूर्ण विकासात्मक गतिविधि है। यह गर्दन की ताकत, कंधे की स्थिरता, और कोर कंट्रोल बनाता है — जो बाद में करवट लेने, बैठने, और रेंगने के लिए जरूरी है।",
        "पहले दिन से शुरू करें। दिन में 3-5 बार 1-2 मिनट का सत्र लक्ष्य है। 3 महीने तक, दिन में कुल 15-30 मिनट का लक्ष्य रखें।",
        "ज्यादातर बच्चे शुरू में इसे नापसंद करते हैं — यह उनके लिए मेहनत का काम है। जमीन पर उतरें और बच्चे से आंखें मिलाएं, गाएं, बात करें। आपका चेहरा सबसे अच्छा खिलौना है।",
        "अगर बच्चा फौरन रोने लगे, तो अपने सीने पर लिटाकर tummy time करें — यह भी उतना ही काम करता है।",
        "टमी टाइम छोड़ने से motor milestones देर से आते हैं और सिर चपटा हो सकता है। इसे रोज़ की जरूरी दिनचर्या बनाएं।",
      ],
      hinglish: [
        "Tummy time pehle 6 mahino ki sabse important developmental activity hai. Isse baby ki gardan, shoulders, aur core strong hoti hai — jo baad mein palat'ne, baithne aur ghutne chalne ke liye zaruri hai.",
        "Pehle din se shuru karein. Din mein 3-5 baar 1-2 minute ka session goal hai. 3 mahine tak, din mein total 15-30 minute tak pahunchein.",
        "Zyaadatar babies pehle ise pasand nahi karte — yeh unke liye mehnat ka kaam hai. Zameen par utar'ke baby se aankhen milayein, gaayein, baat karein. Aapka chehra sabse accha toy hai.",
        "Agar baby turant rona shuru kar de, toh apne seene par lita'ke tummy time karein — yeh bhi utna hi count karta hai.",
        "Tummy time chhod'ne se motor milestones late aate hain aur sir납chahta (flat head) ho sakta hai. Ise roz ki zaruri routine banayein, 'jab yaad aaye' wali activity mat banayen.",
      ],
    },
  }),
  L({
    id: "infant-bonding-language",
    title: {
      en: "How Talking to Your Baby Wires Their Brain",
      hi: "बच्चे से बात करना उनका दिमाग कैसे बनाता है",
      hinglish: "Baby se Baat Karna Unka Dimaag Kaise Banata Hai",
    },
    description: {
      en: "The 30-million-word gap and why narrating your day matters.",
      hi: "3 करोड़ शब्दों का अंतर और रोज़ की बातचीत का महत्व।",
      hinglish: "30-million word gap aur roz narrate karne ki ahmiyat.",
    },
    durationMin: 3, ageBucket: "0-2", emoji: "🧠", expert: "Based on Hart & Risley research",
    paragraphs: {
      en: [
        "By age 4, children from talk-rich homes have heard roughly 30 million more words than children from talk-poor homes. This gap predicts vocabulary, reading readiness, and academic outcomes years later.",
        "The good news: 'talk-rich' is free. Narrate your day. 'Now mama is rinsing the dal, see the bubbles, the water is warm.' Your baby does not understand the words but their brain is laying down the language scaffolding.",
        "Use parentese, not baby talk. Parentese is real words spoken with exaggerated melody, longer vowels and slightly higher pitch. It is the format babies process best.",
        "Pause and wait. When your baby coos or babbles, respond. Then pause. This 'serve and return' is the foundation of conversation and one of the strongest predictors of later language.",
        "Read aloud daily, even at 3 months. The same book over and over is a feature, not a bug — repetition is how language consolidates.",
      ],
      hi: [
        "4 साल की उम्र तक, बात-बहुल घरों के बच्चों ने शांत घरों के बच्चों से लगभग 3 करोड़ ज्यादा शब्द सुने होते हैं। यह अंतर शब्दावली, पढ़ने की तैयारी और शैक्षणिक प्रदर्शन को प्रभावित करता है।",
        "अच्छी बात यह है: बात करना मुफ्त है। अपना दिन बयान करें। 'अभी मम्मा दाल धो रही है, देखो बुलबुले, पानी गर्म है।' बच्चा शब्द नहीं समझता लेकिन दिमाग भाषा का ढांचा बना रहा होता है।",
        "Parentese का उपयोग करें — असली शब्द लेकिन लंबी आवाज़ और ऊंचे सुर में। बच्चे इसे सबसे अच्छे से समझते हैं।",
        "बच्चा जब गुनगुनाए या बोले, तो जवाब दें और फिर रुकें। यह 'serve and return' बातचीत की नींव है और भाषा विकास का सबसे बड़ा संकेतक।",
        "रोज़ ज़ोर से पढ़ें, 3 महीने से भी। एक ही किताब बार-बार पढ़ना फायदेमंद है — दोहराव से ही भाषा पक्की होती है।",
      ],
      hinglish: [
        "4 saal ki umra tak, zyaada baat karne wale ghar ke bachche 3 crore zyaada words sun chuke hote hain. Yeh gap vocabulary, reading readiness aur academic performance ko kaafi baad tak affect karta hai.",
        "Acchi khabar yeh hai: baat karna free hai. Apna din narrate karein. 'Ab mama dal dho rahi hai, dekho bubbles, paani garam hai.' Baby words nahi samajhta lekin brain language ka scaffolding bana raha hota hai.",
        "Parentese use karein — asli words lekin lambi awaaz aur thodi oonji pitch mein. Baby ise sabse achhi tarah process karta hai — baby talk nahi, real words melodically.",
        "Baby jab gungunaye ya bole, toh jawab dein phir ruk'ke intezaar karein. Yeh 'serve and return' baatcheet ki buniyadh hai aur language development ka sabse bada predictor.",
        "Roz zor se padhein, chahe 3 mahine ki umra mein hi ho. Ek hi kitaab baar baar padhna achha hai — repetition se hi language consolidate hoti hai.",
      ],
    },
  }),

  // ─── 2–4 yrs ─────────────────────────────────────────────────────
  L({
    id: "toddler-tantrums-101",
    title: {
      en: "Why Toddlers Tantrum — and What Actually Works",
      hi: "बच्चे क्यों करते हैं गुस्सा — और क्या वाकई काम आता है",
      hinglish: "Toddler Tantrum Kyun Karta Hai — Aur Kya Kaam Aata Hai",
    },
    description: {
      en: "The 'flipped lid' brain, co-regulation, and the 3-step in-the-moment script.",
      hi: "फ्लिप्ड लिड ब्रेन, को-रेगुलेशन और 3 कदमों का स्क्रिप्ट।",
      hinglish: "'Flipped lid' brain, co-regulation, aur 3-step in-the-moment script.",
    },
    durationMin: 4, ageBucket: "2-4", emoji: "🌋", expert: "Based on Dr Dan Siegel & Mona Delahooke",
    paragraphs: {
      en: [
        "A tantrum is not bad behaviour. It is a nervous-system event. The thinking part of your toddler's brain — the prefrontal cortex — is biologically incapable of overriding strong emotion until at least age 5, and is still maturing into the mid-twenties.",
        "Dr Dan Siegel calls this the 'flipped lid'. When a toddler is in tantrum, their downstairs brain has taken over and their upstairs brain is offline. Reasoning, consequences, and lectures literally cannot be processed in this state.",
        "The only thing that works in the moment is co-regulation. Your calm body lends regulation to their dysregulated body. Drop your voice, soften your face, slow your breathing.",
        "The 3-step script: (1) 'You are safe.' (2) 'I am right here.' (3) Silence. Stay close, do not lecture. Wait for the wave to pass. The average tantrum lasts 3 to 5 minutes if you do not pour fuel on it.",
        "Repair after, not during. Once your toddler is calm, hug them and say one short sentence: 'That was big. We figured it out together.' That is the lesson they remember — not the lecture you gave at peak storm.",
      ],
      hi: [
        "गुस्सा या tantrum बुरा व्यवहार नहीं है — यह nervous system की घटना है। बच्चे के दिमाग का सोचने वाला हिस्सा (prefrontal cortex) कम से कम 5 साल तक तेज़ भावनाओं को रोकने में सक्षम नहीं होता।",
        "Dr Dan Siegel इसे 'flipped lid' कहते हैं। Tantrum के दौरान बच्चे का भावनात्मक दिमाग काबिज़ हो जाता है और सोचने वाला हिस्सा बंद हो जाता है। इस अवस्था में समझाना, डांटना या सज़ा — कुछ भी काम नहीं करता।",
        "उस वक्त सिर्फ co-regulation काम करती है। आपका शांत शरीर उनके बेचैन शरीर को शांति देता है। आवाज़ धीमी करें, चेहरा नरम रखें, धीरे-धीरे सांस लें।",
        "3 कदम का script: (1) 'तुम सुरक्षित हो।' (2) 'मैं यहीं हूं।' (3) चुप्पी। पास रहें, भाषण मत दें। तूफान गुज़रने दें। औसत tantrum 3-5 मिनट में खत्म हो जाता है अगर आग में तेल न डालें।",
        "बाद में जोड़ें, बीच में नहीं। शांत होने पर गले लगाएं और एक छोटा वाक्य बोलें: 'यह बहुत मुश्किल था। हमने साथ मिलाकर इसे पार किया।' यही वह lesson है जो बच्चा याद रखता है।",
      ],
      hinglish: [
        "Tantrum bura behavior nahi hai — yeh nervous system ki event hai. Toddler ke brain ka sochne wala hissa (prefrontal cortex) biological roop se kam se kam 5 saal tak strong emotions ko rok nahi sakta.",
        "Dr Dan Siegel ise 'flipped lid' kehte hain. Tantrum ke waqt brain ka emotional hissa control le leta hai aur sochne wala hissa band ho jaata hai. Is halat mein samjhana, daantna ya result dikhana — kuch bhi kaam nahi karta.",
        "Us waqt sirf co-regulation kaam karti hai. Aapka calm body unke dysregulated body ko shanti deta hai. Awaaz dheemi karein, chehra naram rakhein, dheere-dheere saans lein.",
        "3-step script: (1) 'Tum safe ho.' (2) 'Main yahan hoon.' (3) Chup'pi. Paas rahein, lecture mat dein. Toofan guzarne dein. Zyaadatar tantrum 3-5 minute mein khatam ho jaata hai agar aag mein tel na dalein.",
        "Baad mein connect karein, beech mein nahi. Bachcha shant hone par gale lagayein aur ek chhota waqya bolein: 'Yeh bahut bada tha. Humne milke ise handle kiya.' Yahi woh lesson hai jo baccha yaad rakhta hai.",
      ],
    },
  }),
  L({
    id: "toddler-no-phase",
    title: {
      en: "The 'No' Phase: Decoding the Tiny Tyrant",
      hi: "'ना' का दौर: छोटे ज़िद्दी को समझें",
      hinglish: "'Na' Phase: Chhote Ziddi Ko Samjhein",
    },
    description: {
      en: "Why your 2-year-old says no to everything — and the choice trick that ends it.",
      hi: "2 साल का बच्चा हर बात पर 'ना' क्यों कहता है — और choice trick जो काम करती है।",
      hinglish: "2 saal ka baccha har baat pe 'na' kyun kehta hai — aur choice trick jo kaam karti hai.",
    },
    durationMin: 3, ageBucket: "2-4", emoji: "🙅", expert: "Based on Erikson & Janet Lansbury",
    paragraphs: {
      en: [
        "The 'no' phase is not defiance. It is the developmental stage Erik Erikson called Autonomy vs Shame and Doubt. Your toddler is discovering, for the first time, that they are a separate person with their own will.",
        "Saying no is how they practise being themselves. If you crush every no, you can damage this critical sense of agency. If you give in to every no, the home becomes chaos. The middle path is the choice trick.",
        "Replace yes/no questions with two-option choices, both of which you accept. Not 'do you want to wear shoes?' but 'do you want the red shoes or the blue shoes?'. Not 'time for bath' but 'do you want to walk or hop to the bath?'.",
        "Inside the choice, the toddler still feels powerful. Outside the choice, you still set the limit. Both needs are met.",
        "Save your no for the things that truly matter — safety, cruelty, big values. If you are saying no twenty times a day, your toddler will tune you out by lunch.",
      ],
      hi: [
        "'ना' का दौर जिद नहीं है — यह Erikson का Autonomy vs Shame & Doubt का विकासात्मक चरण है। आपका बच्चा पहली बार यह महसूस कर रहा है कि वह एक अलग इंसान है जिसकी अपनी इच्छाएं हैं।",
        "'ना' कहना उनका खुद को अभिव्यक्त करने का तरीका है। हर 'ना' को दबाने से उनकी स्वतंत्रता की भावना कमज़ोर होती है। हर 'ना' मान लेने से घर अस्त-व्यस्त हो जाता है। बीच का रास्ता है choice trick।",
        "हाँ/ना वाले सवाल छोड़ें और दो विकल्प दें — दोनों आपको मंजूर हों। 'जूते पहनोगे?' की जगह 'लाल जूते या नीले जूते?'। 'नहाने चलो' की जगह 'चलकर जाओगे या उछलकर?'।",
        "Choice के अंदर बच्चा ताकतवर महसूस करता है। Choice के बाहर आप अपनी सीमा बनाए रखते हैं। दोनों की जरूरत पूरी होती है।",
        "अपना 'ना' सिर्फ असल जरूरी बातों के लिए बचाएं — सुरक्षा, मूल्य। अगर दिन में बीस बार 'ना' कह रहे हैं, तो बच्चा आपको सुनना बंद कर देगा।",
      ],
      hinglish: [
        "'Na' phase zaidi nahi hai — yeh Erikson ka Autonomy vs Shame & Doubt development stage hai. Aapka toddler pehli baar discover kar raha hai ki woh ek alag insaan hai jiske apne wishes hain.",
        "'Na' kehna unka khud ko express karne ka tarika hai. Har 'na' dabane se unki independence feeling weak hoti hai. Har 'na' maan lene se ghar chaos ban jaata hai. Middle path hai choice trick.",
        "Haan/na wale questions chhod'den aur do options dein — dono aapko accept ho. 'Joote pahno?' ki jagah 'Lal joote ya neele joote?'. 'Nahane chalo' ki jagah 'Chal'ke jaoge ya uchhal'ke?'.",
        "Choice ke andar toddler powerful feel karta hai. Choice ke bahar aap apni limit maintain karte hain. Dono ki zarurat puri hoti hai.",
        "Apna 'na' sirf asli zaroori cheezein ke liye bachayein — safety, bade values. Agar din mein bees baar 'na' keh rahe hain, toh baccha aapko sunna band kar dega.",
      ],
    },
  }),
  L({
    id: "toddler-potty-readiness",
    title: {
      en: "Potty Training: The Readiness Checklist",
      hi: "पॉटी ट्रेनिंग: तैयारी की जांच-सूची",
      hinglish: "Potty Training: Readiness ki Checklist",
    },
    description: {
      en: "Why timing matters more than method, and how to know your child is truly ready.",
      hi: "तरीके से ज्यादा समय क्यों मायने रखता है, और बच्चे की तैयारी कैसे पहचानें।",
      hinglish: "Technique se zyaada timing kyun important hai, aur baccha ready hai ye kaise pehchanein.",
    },
    durationMin: 3, ageBucket: "2-4", emoji: "🚽", expert: "Based on AAP & T. Berry Brazelton",
    paragraphs: {
      en: [
        "Potty training fails most often when the child is not yet ready. The American Academy of Pediatrics is clear: readiness, not age, is the trigger.",
        "Look for these signs together: stays dry for 2 hours or more, predictable bowel movements, can pull pants up and down, shows interest in the toilet, can follow simple instructions, hides to poop, dislikes a wet or dirty nappy.",
        "If five of these seven are present, your child is ready. If fewer, wait. Pushing early is the #1 cause of regressions and battles.",
        "When you start: clear three days. Switch to underwear, not pull-ups. Pull-ups feel like a nappy and confuse the body's signal.",
        "Accidents are not failures — they are data. Stay neutral: 'Pee goes in the potty. Let us clean up together.' No shame, no big celebration either. The body learns fastest in a calm, low-stakes environment.",
      ],
      hi: [
        "पॉटी ट्रेनिंग सबसे ज़्यादा तब विफल होती है जब बच्चा तैयार नहीं होता। American Academy of Pediatrics स्पष्ट है: उम्र नहीं, तैयारी जरूरी है।",
        "ये संकेत देखें: 2 घंटे या ज्यादा सूखा रहना, नियमित मल त्याग, पैंट खुद उतारना-पहनना, टॉयलेट में दिलचस्पी, सरल निर्देश मानना, पूप के लिए छुपना, गीले डायपर से नाराजगी।",
        "सातों में से पांच संकेत हों तो बच्चा तैयार है। कम हों तो इंतजार करें। जल्दी शुरू करना regression और लड़ाइयों का सबसे बड़ा कारण है।",
        "जब शुरू करें: तीन दिन खाली रखें। Underwear पहनाएं, pull-ups नहीं। Pull-ups डायपर जैसे लगते हैं और body का signal confuse करते हैं।",
        "गलतियां विफलता नहीं हैं — ये सूचनाएं हैं। शांत रहें: 'पेशाब potty में होता है। चलो साफ करते हैं।' न शर्मिंदगी, न बड़ा जश्न। शरीर शांत माहौल में सबसे जल्दी सीखता है।",
      ],
      hinglish: [
        "Potty training sabse zyaada tab fail hoti hai jab baccha ready nahi hota. American Academy of Pediatrics clear hai: umra nahi, readiness zaruri hai.",
        "Ye signs dekhen: 2 ghante ya zyaada dry rehna, regular bowel movements, pant khud utaarna-pahanna, toilet mein interest, simple instructions maanna, poop ke liye chhupp'na, geele diaper se naraz hona.",
        "Saat mein se paanch signs hon toh baccha ready hai. Kam hon toh wait karein. Jaldi shuru karna regression aur fights ka #1 reason hai.",
        "Jab shuru karein: teen din clear rakhein. Underwear pahnayen, pull-ups nahi. Pull-ups diaper jaisi lagti hai aur body ka signal confuse karti hai.",
        "Galtiyan failure nahi hain — ye data hain. Neutral rahein: 'Susu potty mein hoti hai. Chalo saaf karte hain.' Na sharmindagi, na bada celebration. Body calm low-stakes environment mein sabse jaldi seekhti hai.",
      ],
    },
  }),
  L({
    id: "toddler-screen-time",
    title: {
      en: "Screen Time Under 5: What the Research Actually Says",
      hi: "5 साल से कम बच्चों के लिए Screen Time: Research क्या कहती है",
      hinglish: "5 Saal se Kam Bacchon ke Liye Screen Time: Research Kya Kehti Hai",
    },
    description: {
      en: "WHO guidelines, why under-2 should not have screens, and how to recover from too much.",
      hi: "WHO के दिशा-निर्देश, 2 साल से कम को screen क्यों नहीं, और बहुत ज्यादा screen से कैसे उबरें।",
      hinglish: "WHO guidelines, 2 saal se kam ko screen kyun nahi, aur bahut zyaada screen se kaise recover karein.",
    },
    durationMin: 3, ageBucket: "2-4", emoji: "📱", expert: "Based on WHO & AAP",
    paragraphs: {
      en: [
        "The World Health Organisation recommends zero screen time for children under 2, and no more than 1 hour per day of high-quality, co-viewed content for children 2 to 4. Most of us are far above this — and the research shows real cost.",
        "Under 2, screens compete with the experiences that build the brain: face-to-face talk, tummy time, manipulating real objects. Even background TV reduces parent-child speech by up to 40%.",
        "From 2 to 4, the issue is not just screen time but what it replaces. Every hour on a screen is an hour not spent in the activities — outdoor play, reading, free play, conversation — that actually predict school readiness.",
        "If you have drifted into too much screen time, do not panic. Replace, do not just remove. Stock a basket of high-engagement alternatives: blocks, play dough, outdoor time, sticker books. Boredom is the door to creativity.",
        "Rule of thumb: screens are a tool, not a babysitter. Co-view when possible. Choose slow-paced, language-rich content. Hard cut-off 30 minutes before bed — blue light and stimulation both wreck sleep.",
      ],
      hi: [
        "WHO 2 साल से कम बच्चों के लिए शून्य screen time और 2-4 साल के लिए प्रतिदिन अधिकतम 1 घंटा उच्च-गुणवत्ता का सह-देखा content सुझाता है। ज्यादातर हम इससे बहुत आगे हैं — और शोध असली नुकसान दिखाता है।",
        "2 साल से कम में screen वे अनुभव छीन लेती है जो दिमाग बनाते हैं: आमने-सामने की बातचीत, tummy time, असली चीज़ें पकड़ना। Background TV भी parent-child speech 40% तक घटा देता है।",
        "2-4 साल में समस्या सिर्फ screen time नहीं है बल्कि वह क्या replace करती है। Screen पर हर घंटा, outdoor play, पढ़ाई, free play, बातचीत से छीन लिया जाता है।",
        "अगर screen time बढ़ गई है तो घबराएं नहीं। सिर्फ हटाएं नहीं, बदलें। Blocks, play dough, बाहर खेलना जैसे विकल्प रखें। ऊब रचनात्मकता का दरवाज़ा है।",
        "याद रखें: screen एक tool है, babysitter नहीं। हो सके तो साथ देखें। Slow-paced, भाषा-समृद्ध content चुनें। सोने से 30 मिनट पहले screen बंद — blue light और excitement दोनों नींद बर्बाद करते हैं।",
      ],
      hinglish: [
        "WHO 2 saal se kam ke liye zero screen time aur 2-4 saal ke liye roz zyaadatar 1 ghante tak high-quality co-viewed content suggest karta hai. Zyaadatar hum isse kaafi zyaada de rahe hain — aur research real cost dikhati hai.",
        "2 saal se kam mein screen un experiences se compete karti hai jo brain banate hain: face-to-face baat, tummy time, asli cheezein pakad'na. Background TV bhi parent-child speech 40% tak ghata deta hai.",
        "2-4 saal mein problem sirf screen time nahi hai balki woh kya replace karti hai. Screen par har ghanta, outdoor play, reading, free play, conversation se chhin jaata hai.",
        "Agar screen time badh gayi hai toh ghabrayein nahi. Sirf hatayein nahi, badlein. Blocks, play dough, bahar khelna jaisi alternatives rakhein. Bore hona creativity ka darwaza hai.",
        "Yaad rakhein: screen ek tool hai, babysitter nahi. Ho sake toh saath dekhein. Slow-paced, language-rich content chunein. Sone se 30 minute pehle screen band karein — blue light aur stimulation dono neend barbad karte hain.",
      ],
    },
  }),

  // ─── 5–7 yrs ─────────────────────────────────────────────────────
  L({
    id: "early-school-emotional-regulation",
    title: {
      en: "Building Emotional Regulation in the Early School Years",
      hi: "स्कूल शुरू होने पर भावनात्मक नियंत्रण कैसे सिखाएं",
      hinglish: "Early School Years mein Emotional Regulation Kaise Sikhayein",
    },
    description: {
      en: "Naming feelings, the calm-down corner, and why labels reduce intensity.",
      hi: "भावनाओं के नाम, calm-down corner, और लेबल क्यों intensity कम करते हैं।",
      hinglish: "Feelings ke naam, calm-down corner, aur labels intensity kyun kam karte hain.",
    },
    durationMin: 4, ageBucket: "5-7", emoji: "🌈", expert: "Based on Dr Marc Brackett & RULER approach",
    paragraphs: {
      en: [
        "Between 5 and 7, children are developing the ability to name and reflect on their own feelings — a skill called emotional granularity. Children with high emotional granularity are less aggressive, less anxious, and do better academically. The good news: this skill is teachable.",
        "Step 1: build the vocabulary. Beyond happy, sad, angry — teach frustrated, disappointed, jealous, embarrassed, proud, nervous. Use feelings charts on the fridge. Name your own feelings out loud.",
        "Step 2: validate before you correct. 'You are so frustrated that the tower fell. That makes sense — you worked hard on it.' Validation reduces intensity. Correction without validation amplifies it.",
        "Step 3: build a calm-down corner together. A small space with cushions, a few books, maybe a stuffed animal. Not a punishment zone — a regulation tool. Visit it together when calm so it becomes familiar.",
        "Most importantly: model it. Children learn regulation by watching you regulate, not by being told to calm down. When you mess up, the repair ('I shouted, that was not okay, I am sorry') teaches more than a hundred lectures.",
      ],
      hi: [
        "5-7 साल के बीच बच्चे अपनी भावनाओं को पहचानने और नाम देने की क्षमता विकसित करते हैं — इसे emotional granularity कहते हैं। ज्यादा emotional granularity वाले बच्चे कम आक्रामक, कम चिंतित और पढ़ाई में बेहतर होते हैं।",
        "पहला कदम: शब्दावली बनाएं। खुश, दुखी, गुस्से से आगे — निराश, jealous, शर्मिंदा, गर्व, नर्वस सिखाएं। Fridge पर feelings chart लगाएं। अपनी भावनाएं ज़ोर से बोलें।",
        "दूसरा कदम: सुधारने से पहले validate करें। 'तुम बहुत निराश हो कि tower गिर गया। यह समझ में आता है — तुमने मेहनत की थी।' Validation intensity कम करता है। बिना validation के correction उसे बढ़ाता है।",
        "तीसरा कदम: calm-down corner बनाएं। Cushions, किताबें, stuffed animal — punishment zone नहीं, regulation tool। शांत वक्त में साथ जाएं ताकि जगह परिचित लगे।",
        "सबसे जरूरी: खुद करके दिखाएं। बच्चे regulation आपको देखकर सीखते हैं, बताने से नहीं। जब आप गलती करें तो repair करें — 'मैंने चिल्लाया, यह ठीक नहीं था, माफ करना' — यह सौ lectures से ज्यादा सिखाता है।",
      ],
      hinglish: [
        "5-7 saal mein bacche apni feelings ko naam dene ki ability develop karte hain — ise emotional granularity kehte hain. Zyaada emotional granularity wale bacche kam aggressive, kam anxious aur padhai mein behtar hote hain. Acchi khabar: yeh skill sikhaayi ja sakti hai.",
        "Step 1: vocabulary banayein. Khush, dukhi, gusse se aage — nirash, jealous, sharminda, garv, nervous seekhayein. Fridge par feelings chart lagayein. Apni feelings zor se bolein.",
        "Step 2: correct karne se pehle validate karein. 'Tum bahut nirash ho ki tower gir gaya. Yeh samajh mein aata hai — tumne mehnat ki thi.' Validation intensity kam karta hai. Bina validation ke correction use badhata hai.",
        "Step 3: calm-down corner banayein. Cushions, kitaabein, stuffed animal — punishment zone nahi, regulation tool. Shant waqt mein saath jayen taaki jagah familiar lage.",
        "Sabse zaroori: khud karke dikhayein. Bacche regulation aapko dekhkar seekhte hain, batane se nahi. Jab aap galti karein toh repair karein — 'Mujhe gussa aa gaya tha, yeh theek nahi tha, maafi chahta hoon' — yeh sau lectures se zyaada sikhata hai.",
      ],
    },
  }),
  L({
    id: "early-school-friendship",
    title: {
      en: "Helping Your Child Make and Keep Friends",
      hi: "बच्चे को दोस्त बनाने और रखने में मदद करें",
      hinglish: "Bacche ko Dost Banaane aur Rakhne mein Madad Karein",
    },
    description: {
      en: "The friendship skills that predict lifelong wellbeing — and how to coach them.",
      hi: "दोस्ती के वे कौशल जो जीवन भर की खुशी की भविष्यवाणी करते हैं — और उन्हें कैसे सिखाएं।",
      hinglish: "Dosti ke skills jo lifetime wellbeing predict karte hain — aur unhe kaise coach karein.",
    },
    durationMin: 3, ageBucket: "5-7", emoji: "👫", expert: "Based on Dr Eileen Kennedy-Moore",
    paragraphs: {
      en: [
        "Friendships in the 5 to 7 range are short, intense, and full of conflict. This is normal — your child is learning the skills of negotiation, empathy, and repair in real time.",
        "Coach four core skills: joining play (asking 'can I play?' is the wrong opener — better is to watch, then add value), sharing (start with turn-taking, not splitting), conflict repair ('I am sorry I grabbed it. Can we start over?'), and reading social cues (faces and body language).",
        "Resist the urge to fix every fight. Children build social skill by stumbling through conflict. Step in only for safety, cruelty, or when both children are stuck. Your role is sportscaster, not judge.",
        "Watch for signs of social struggle: comes home alone often, no one to sit with at lunch, says 'nobody likes me'. Do not panic — but do open a calm conversation. Sometimes it is a skill to learn, sometimes a peer-group mismatch.",
        "Quality over quantity. One genuine friendship at this age is worth more than being part of a popular crowd. Help your child invest in it — playdates, small gestures, remembering birthdays.",
      ],
      hi: [
        "5-7 साल में दोस्तियां छोटी, गहरी और झगड़ों से भरी होती हैं। यह सामान्य है — बच्चा negotiation, empathy और repair के skills असल समय में सीख रहा है।",
        "चार मुख्य skills coach करें: खेल में शामिल होना ('क्या मैं खेल सकता हूं?' गलत opener है — पहले देखें, फिर value add करें), sharing (turn-taking से शुरू करें), झगड़े की repair ('माफ करो, मैंने खींच लिया। फिर से शुरू करें?'), और social cues पढ़ना।",
        "हर झगड़ा fix करने की इच्छा रोकें। बच्चे conflict से ही social skill बनाते हैं। सिर्फ सुरक्षा, क्रूरता या stuck होने पर दखल दें। आपकी भूमिका referee नहीं, commentator की है।",
        "सामाजिक संघर्ष के संकेत देखें: अक्सर अकेले घर आना, lunch में साथ बैठने वाला न हो, 'कोई मुझे पसंद नहीं करता'। घबराएं नहीं — शांत बातचीत खोलें। कभी skill की कमी, कभी peer-group mismatch होता है।",
        "संख्या से ज्यादा गुणवत्ता। इस उम्र में एक सच्ची दोस्ती popular crowd का हिस्सा होने से ज्यादा कीमती है। बच्चे को उसमें निवेश करने में मदद करें।",
      ],
      hinglish: [
        "5-7 saal mein dosti chhoti, intense aur jhagdon se bhari hoti hai. Yeh normal hai — baccha negotiation, empathy aur repair ke skills real time mein seekh raha hai.",
        "Chaar core skills coach karein: khel mein shamil hona ('kya main khel sakta hoon?' galat opener hai — pehle dekhen, phir value add karein), sharing (turn-taking se shuru karein), jhagrade ki repair ('sorry, maine kheench liya. Phir se shuru karein?'), aur social cues padhna.",
        "Har jhagrade ko fix karne ki ichha rokein. Bacche conflict se hi social skill banate hain. Sirf safety, cruelty ya stuck hone par dakhalna dein. Aapki role referee nahi, commentator ki hai.",
        "Social struggle ke signs dekhein: aksar akele ghar aana, lunch mein koi saath na ho, 'koi mujhe pasand nahi karta'. Ghabrayein nahi — shaant baatcheet shuru karein. Kabhi skill ki kami, kabhi peer-group mismatch hota hai.",
        "Sankhya se zyaada quality. Is umra mein ek sacchi dosti popular crowd ka hissa hone se zyaada keemat'i hai. Bacche ko usme invest karne mein madad karein — playdates, chhote gestures, janmdin yaad rakhna.",
      ],
    },
  }),
  L({
    id: "early-school-homework",
    title: {
      en: "Homework Without Tears: A Calm 4-Step System",
      hi: "बिना रोए होमवर्क: शांत 4-कदम प्रणाली",
      hinglish: "Homework Bina Jhagde ke: Shant 4-Step System",
    },
    description: {
      en: "End the daily battle with a structure that respects your child's brain.",
      hi: "रोज़ की लड़ाई खत्म करें एक ऐसे structure के साथ जो बच्चे के दिमाग का सम्मान करे।",
      hinglish: "Roz ki ladaai khatam karein ek aisi structure ke saath jo bacche ke brain ka respect kare.",
    },
    durationMin: 3, ageBucket: "5-7", emoji: "✏️", expert: "Based on Dr Stuart Shanker, self-reg",
    paragraphs: {
      en: [
        "Most homework battles are not motivation problems — they are dysregulation problems. After a full school day, your child's executive function tank is empty. Sitting them down immediately is a recipe for war.",
        "Step 1: snack and movement first. 30 to 45 minutes of free play, outdoor time, or a snack rebuilds the regulation needed to focus. Skip this and the next 60 minutes will be hell.",
        "Step 2: same place, same time. The brain loves predictability. A consistent homework spot with the materials ready cuts setup friction by 80%.",
        "Step 3: micro-chunks with the timer. 10 to 15 minutes work, 5 minutes break, repeat. The 5-minute break is not optional — it is what makes the next chunk possible.",
        "Step 4: be a co-regulator, not an enforcer. Sit nearby, not over their shoulder. Ask 'what is the next step?' not 'why did you not do it?'. Your role is to lend calm focus, not to answer the questions.",
      ],
      hi: [
        "ज्यादातर homework की लड़ाइयां motivation की नहीं — dysregulation की समस्याएं हैं। पूरे स्कूल दिन के बाद बच्चे का executive function tank खाली होता है। तुरंत बिठाना युद्ध का नुस्खा है।",
        "Step 1: पहले snack और movement। 30-45 मिनट खेलना, बाहर जाना या snack लेना — यह focus के लिए ज़रूरी regulation वापस लाता है। यह छोड़ा तो अगले 60 मिनट मुश्किल होंगे।",
        "Step 2: एक ही जगह, एक ही समय। दिमाग predictability पसंद करता है। नियमित homework spot setup friction 80% कम कर देता है।",
        "Step 3: timer के साथ छोटे टुकड़े। 10-15 मिनट काम, 5 मिनट ब्रेक, दोहराएं। 5 मिनट का ब्रेक optional नहीं है — यही अगले chunk को possible बनाता है।",
        "Step 4: enforcer नहीं, co-regulator बनें। पास बैठें, कंधे के ऊपर नहीं। 'अगला कदम क्या है?' पूछें, 'यह क्यों नहीं किया?' नहीं। आपकी भूमिका शांत focus उधार देना है, सवाल हल करना नहीं।",
      ],
      hinglish: [
        "Zyaadatar homework ki ladaiyan motivation ki nahi — dysregulation ki problems hain. Poore school din ke baad bacche ka executive function tank khaali hota hai. Turant bithana war ka nuskha hai.",
        "Step 1: pehle snack aur movement. 30-45 minute khelna, bahar jaana ya snack — yeh focus ke liye zaroori regulation wapas laata hai. Yeh chhoda toh agle 60 minute mushkil honge.",
        "Step 2: ek hi jagah, ek hi waqt. Brain predictability pasand karta hai. Consistent homework spot setup friction 80% kam kar deta hai.",
        "Step 3: timer ke saath chhote tukde. 10-15 minute kaam, 5 minute break, dobara. 5 minute ka break optional nahi hai — yahi agla chunk possible banata hai.",
        "Step 4: enforcer nahi, co-regulator banein. Paas baithein, kandhe ke oopar nahi. 'Agla kadam kya hai?' puchein, 'yeh kyun nahi kiya?' nahi. Aapki role shaant focus udhar dena hai, sawaal hal karna nahi.",
      ],
    },
  }),
  L({
    id: "early-school-growth-mindset",
    title: {
      en: "Praise Effort, Not Smart: Building a Growth Mindset",
      hi: "Smart की नहीं, मेहनत की तारीफ करें: Growth Mindset कैसे बनाएं",
      hinglish: "Smart ki Nahi, Mehnat ki Tarif Karein: Growth Mindset Kaise Banayein",
    },
    description: {
      en: "Carol Dweck's research, in plain language, with the exact phrases that work.",
      hi: "Carol Dweck की research, सरल भाषा में, और काम आने वाले सटीक वाक्यांश।",
      hinglish: "Carol Dweck ki research, simple mein, aur exact phrases jo kaam aate hain.",
    },
    durationMin: 3, ageBucket: "5-7", emoji: "🌱", expert: "Based on Dr Carol Dweck",
    paragraphs: {
      en: [
        "Praising 'You are so smart' actually backfires. Stanford researcher Carol Dweck has shown that children praised for being smart become risk-averse — they avoid challenges that might prove them not-smart. Children praised for effort take on harder challenges and persist longer.",
        "Replace identity praise with process praise. Not 'you are a great artist' but 'I see how carefully you mixed those colours'. Not 'you are so clever' but 'you tried three different ways before that worked'.",
        "Use the word 'yet'. 'I cannot do this' becomes 'I cannot do this yet'. That tiny word reframes failure as a stage, not a verdict.",
        "Talk about your own struggles out loud. 'I am working on being patient — I messed up earlier and I am trying again.' Children learn that effort and failure are part of growth, not a sign that something is wrong with them.",
        "Be careful with results-only feedback. A child who only hears praise for an A on the test learns that the grade is what matters. Praise the practice, the strategy, the persistence — and the grade takes care of itself.",
      ],
      hi: [
        "'तुम बहुत होशियार हो' कहना उल्टा पड़ता है। Stanford researcher Carol Dweck ने दिखाया है कि होशियारी के लिए तारीफ पाने वाले बच्चे risk से डरते हैं — वे ऐसी चुनौतियों से बचते हैं जो उन्हें 'कम होशियार' साबित कर सकती हैं।",
        "Identity praise को process praise से बदलें। 'तुम बड़े artist हो' नहीं, बल्कि 'मैंने देखा तुमने रंगों को कितनी सावधानी से मिलाया'। 'तुम बहुत चालाक हो' नहीं, 'तुमने तीन अलग तरीके आजमाए जब तक यह काम नहीं आया'।",
        "'अभी तक' शब्द का उपयोग करें। 'मुझे नहीं आता' बन जाता है 'मुझे अभी तक नहीं आता'। यह छोटा शब्द विफलता को एक मंज़िल के रूप में reframe करता है।",
        "अपनी मुश्किलें ज़ोर से बोलें। 'मैं धैर्य रखने पर काम कर रहा हूं — आज गलती हुई और फिर कोशिश कर रहा हूं।' बच्चे सीखते हैं कि मेहनत और गलती growth का हिस्सा हैं।",
        "सिर्फ result की तारीफ से बचें। जो बच्चा सिर्फ A grade की तारीफ सुनता है, वह सोचने लगता है कि grade ही सब कुछ है। Practice, strategy और persistence की तारीफ करें — grade खुद आ जाएगा।",
      ],
      hinglish: [
        "'Tum bahut hoshiyaar ho' kehna ulta padta hai. Stanford researcher Carol Dweck ne dikhaya hai ki hoshiyaari ki tarif wale bacche risk se darte hain — woh aisi challenges se bachte hain jo unhe 'kam hoshiyaar' sabit kar sakti hain.",
        "Identity praise ko process praise se badlein. 'Tum bade artist ho' nahi, 'mujhe dikha tum'ne colours ko kitni carefully mix kiya'. 'Tum bahut chalak ho' nahi, 'tum'ne teen alag tarike aazmaaye jab tak yeh kaam nahi aaya'.",
        "'Abhi tak' word use karein. 'Mujhe nahi aata' ban jaata hai 'Mujhe abhi tak nahi aata'. Yeh chhota sa word failure ko ek stage ke roop mein reframe karta hai, verdict nahi.",
        "Apni mushkilein zor se bolein. 'Main patience par kaam kar raha hoon — aaj galti hui aur phir koshish kar raha hoon.' Bacche seekhte hain ki mehnat aur galti growth ka hissa hai.",
        "Sirf result ki tarif se bachein. Jo baccha sirf A grade ki tarif sunta hai, woh sochne lagta hai ki grade hi sab kuch hai. Practice, strategy aur persistence ki tarif karein — grade khud aa jayega.",
      ],
    },
  }),

  // ─── 8–10 yrs ────────────────────────────────────────────────────
  L({
    id: "tween-independence",
    title: {
      en: "Letting Go: Building Independence in the Tween Years",
      hi: "जाने दें: Tween सालों में आज़ादी कैसे दें",
      hinglish: "Jaane Dein: Tween Years mein Azadi Kaise Dein",
    },
    description: {
      en: "Why over-helping hurts, and the 'one notch more' weekly experiment.",
      hi: "ज्यादा मदद क्यों नुकसान करती है, और 'एक कदम और' का साप्ताहिक प्रयोग।",
      hinglish: "Zyaada help kyun nuksan karti hai, aur 'ek kadam aur' ka weekly experiment.",
    },
    durationMin: 4, ageBucket: "8-10", emoji: "🪜", expert: "Based on Dr Lenore Skenazy",
    paragraphs: {
      en: [
        "Between 8 and 10, children desperately need to feel competent. Their growing brain craves real-world challenges. Over-helping — packing the bag, signing the diary, fighting their school battles — sends a quiet message: 'I do not believe you can'.",
        "Try the 'one notch more' experiment. Once a week, hand back one task you have been doing for them. Walking to the gate alone. Making their own breakfast. Calling grandma on the phone. Each notch is a vote of confidence.",
        "Expect mistakes — and protect them. A forgotten lunch, a missed homework, a bad grade. These small failures are the cheapest tuition your child will ever pay. Rescue them, and you steal the lesson.",
        "Resist the rescue urge. When they complain, your script is: 'That sounds hard. What do you think you will do?'. You are coaching the problem-solver, not solving the problem.",
        "Independence is built in tiny doses, weekly. By 12, the child you were hovering over at 8 will either be the one who launches with confidence or the one who freezes when you are not there. Start the notches now.",
      ],
      hi: [
        "8-10 साल में बच्चे सक्षम महसूस करने की गहरी ज़रूरत रखते हैं। उनका बढ़ता दिमाग असल चुनौतियां चाहता है। ज़्यादा मदद करना — बैग pack करना, diary sign करना, स्कूल की लड़ाइयां लड़ना — एक शांत संदेश देता है: 'मुझे विश्वास नहीं कि तुम कर सकते हो'।",
        "'एक कदम और' का प्रयोग करें। हर हफ्ते एक काम जो आप उनके लिए करते थे, वापस दे दें। अकेले gate तक चलना। खुद breakfast बनाना। दादी को फोन करना। हर कदम विश्वास का वोट है।",
        "गलतियों की उम्मीद रखें — और उन्हें बचाएं। भूली हुई lunch, छूटा homework, बुरा grade। ये छोटी विफलताएं सबसे सस्ती पाठशाला हैं। बचा लेंगे तो lesson चुरा लेंगे।",
        "बचाने की इच्छा रोकें। शिकायत पर आपका script: 'यह मुश्किल लगता है। तुम क्या करोगे?' आप problem-solver को coach कर रहे हैं, problem solve नहीं।",
        "आज़ादी हर हफ्ते थोड़ी-थोड़ी बनती है। 12 साल तक, जिस बच्चे पर आप 8 साल में hover कर रहे थे — वह या तो आत्मविश्वास से उड़ान भरेगा या अकेले थम जाएगा। अभी शुरू करें।",
      ],
      hinglish: [
        "8-10 saal mein bacche capable feel karne ki gehri zarurat rakhte hain. Unka badhta brain real challenges chahta hai. Zyaada help karna — bag pack karna, diary sign karna, school ki ladaiyan lad'na — ek shaant message deta hai: 'Mujhe vishwas nahi ki tum kar sakte ho'.",
        "'Ek kadam aur' ka experiment karein. Har hafte ek kaam jo aap unke liye karte the, wapas de dein. Akele gate tak chalna. Khud breakfast banana. Dadi ko phone karna. Har kadam vishwas ka vote hai.",
        "Galtiyon ki umeed rakhein — aur unhe bacha'ne se bachein. Bhooli hui lunch, chhuta homework, bura grade. Ye chhoti failures sabse sasti paathshaala hain. Bachaa lenge toh lesson chura lenge.",
        "Bachane ki ichha rokein. Shikaayat par aapka script: 'Yeh mushkil lagta hai. Tum kya karoge?' Aap problem-solver ko coach kar rahe hain, problem solve nahi kar rahe.",
        "Azadi har hafte thodi-thodi banti hai. 12 saal tak, jis bacche par aap 8 saal mein hover kar rahe the — woh ya toh confidence se udaan bharega ya akele tham jayega. Abhi start karein.",
      ],
    },
  }),
  L({
    id: "tween-sibling-fights",
    title: {
      en: "Sibling Fights: Stop Being the Referee",
      hi: "भाई-बहन के झगड़े: Referee बनना बंद करें",
      hinglish: "Bhai-Behen ke Jhagde: Referee Banna Band Karein",
    },
    description: {
      en: "Faber & Mazlish's sportscasting method — describe, do not judge.",
      hi: "Faber & Mazlish का sportscasting तरीका — बताएं, निर्णय न लें।",
      hinglish: "Faber & Mazlish ka sportscasting method — describe karein, judge nahi.",
    },
    durationMin: 3, ageBucket: "8-10", emoji: "🥊", expert: "Based on Adele Faber & Elaine Mazlish",
    paragraphs: {
      en: [
        "If you are pulled into 12 sibling fights a day, you are training your children to need a referee. The fights will not go away — they will multiply, because the referee has become part of the game.",
        "The shift is from referee to sportscaster. A referee judges and decides. A sportscaster describes the action. 'I see two children both want the same iPad. There is only one iPad. Hmm, this is a tough problem.'",
        "Resist the urge to investigate ('who started it?'). You will get two opposite answers and you cannot prove either. Instead, refuse the role: 'It does not matter who started it. The question is — how do we end it?'",
        "Coach skills, not verdicts. Teach 'I-statements' ('I felt mad when you took it without asking') instead of accusations. Teach the repair ritual: name what you did, name the impact, propose a fix.",
        "Most importantly: protect 1:1 time with each child. Sibling rivalry is rarely about toys or fairness — it is about the bucket of parental attention. A predictable 15 minutes of 1:1 a day, per child, halves most sibling conflict over a few weeks.",
      ],
      hi: [
        "अगर आप रोज़ 12 झगड़ों में खींचे जाते हैं, तो आप बच्चों को referee की ज़रूरत सिखा रहे हैं। झगड़े नहीं जाएंगे — बढ़ेंगे, क्योंकि referee अब game का हिस्सा बन गया है।",
        "Referee से sportscaster बनें। Referee निर्णय करता है। Sportscaster describe करता है। 'मैं देख रहा हूं दोनों बच्चे एक ही iPad चाहते हैं। एक ही iPad है। हम्म, यह मुश्किल problem है।'",
        "'किसने शुरू किया?' न पूछें — दो अलग जवाब मिलेंगे और कोई साबित नहीं। बजाय इसके, role refuse करें: 'किसने शुरू किया यह मायने नहीं रखता। सवाल यह है — कैसे खत्म होगा?'",
        "Verdict नहीं, skills coach करें। 'I-statements' सिखाएं ('मुझे बुरा लगा जब तुमने बिना पूछे लिया') accusations की जगह। Repair ritual सिखाएं: क्या किया, क्या असर, क्या solution।",
        "सबसे जरूरी: हर बच्चे के साथ अलग 1:1 time बचाएं। Sibling rivalry खिलौनों या इंसाफ के बारे में कम होती है — यह माता-पिता के ध्यान के बारे में है। रोज़ हर बच्चे के साथ 15 मिनट का नियमित समय ज्यादातर sibling conflict आधा कर देता है।",
      ],
      hinglish: [
        "Agar aap roz 12 jhagdon mein khainche jaate hain, toh aap bacchon ko referee ki zarurat sikha rahe hain. Jhagde nahi jayenge — badhenge, kyunki referee ab game ka hissa ban gaya hai.",
        "Referee se sportscaster banein. Referee decide karta hai. Sportscaster describe karta hai. 'Main dekh raha hoon dono bacche ek hi iPad chahte hain. Ek hi iPad hai. Hmm, yeh mushkil problem hai.'",
        "'Kisne shuru kiya?' mat poochein — do alag jawab milenge aur koi prove nahi hoga. Bajaye, role refuse karein: 'Kisne shuru kiya yeh mayne nahi rakhta. Sawaal yeh hai — kaise khatam hoga?'",
        "Verdict nahi, skills coach karein. 'I-statements' sikhayen ('Mujhe bura laga jab tum'ne bina pooche liya') accusations ki jagah. Repair ritual sikhayen: kya kiya, kya asar, kya solution.",
        "Sabse zaroori: har bacche ke saath alag 1:1 time bachayein. Sibling rivalry khilonon ya insaaf ke baare mein kam hoti hai — yeh mata-pita ke dhyan ke baare mein hai. Roz har bacche ke saath 15 minute ka regular time zyaadatar sibling conflict aadha kar deta hai.",
      ],
    },
  }),
  L({
    id: "tween-screen-balance",
    title: {
      en: "Screens, Phones and YouTube: Drawing the Lines That Stick",
      hi: "Screens, फोन और YouTube: टिकाऊ सीमाएं कैसे तय करें",
      hinglish: "Screens, Phone aur YouTube: Tikau Limits Kaise Tay Karein",
    },
    description: {
      en: "What the research says, and how to negotiate limits without daily war.",
      hi: "Research क्या कहती है, और रोज़ की लड़ाई के बिना limits कैसे तय करें।",
      hinglish: "Research kya kehti hai, aur roz ki ladai ke bina limits kaise negotiate karein.",
    },
    durationMin: 4, ageBucket: "8-10", emoji: "📺", expert: "Based on Dr Jean Twenge & Common Sense Media",
    paragraphs: {
      en: [
        "Between 8 and 10, screen use explodes — and so do conflicts about it. The research is consistent: more than 2 hours a day of recreational screens is associated with worse sleep, lower wellbeing, and lower school performance.",
        "Lines that work are clear, predictable, and co-created. A vague 'not too much' is unenforceable. A specific 'weekdays 30 min after homework, weekends 90 min, never in the bedroom, screens off 60 min before bed' is enforceable.",
        "Build the contract together. A child who helped write the rule fights it less. Ask: 'When do you think screens get in the way of sleep, schoolwork, friends, mood? What is a fair limit?'",
        "Phones in the bedroom is the single biggest mistake. Sleep deteriorates, anxiety rises, and night-time scrolling is where most problems start. Use a charging dock in the kitchen for the whole family — including parents.",
        "Be the model. Children watch your screen habits more than they listen to your screen rules. A no-phones-at-meals rule that you also follow is worth a hundred lectures.",
      ],
      hi: [
        "8-10 साल में screen का उपयोग बहुत बढ़ जाता है — और इस पर झगड़े भी। Research स्पष्ट है: प्रतिदिन 2 घंटे से ज्यादा recreational screens खराब नींद, कम wellbeing और कम academic performance से जुड़ी हैं।",
        "जो rules काम करते हैं वे स्पष्ट, predictable और साथ मिलकर बनाए गए होते हैं। 'ज्यादा नहीं' वाला vague rule लागू नहीं होता। 'Weekdays homework के बाद 30 मिनट, weekends 90 मिनट, कमरे में नहीं, सोने से 60 मिनट पहले बंद' — यह लागू होता है।",
        "Contract साथ मिलकर बनाएं। जिस बच्चे ने rule बनाने में हिस्सा लिया वह कम लड़ता है। पूछें: 'तुम्हें लगता है screen कब नींद, पढ़ाई, दोस्तों और mood में आड़े आती है? क्या fair limit है?'",
        "कमरे में फोन सबसे बड़ी गलती है। नींद खराब होती है, anxiety बढ़ती है, और रात की scrolling ज्यादातर problems की शुरुआत है। पूरे परिवार के लिए किचन में charging dock रखें — parents समेत।",
        "खुद मिसाल बनें। बच्चे आपकी screen habits देखते हैं ज्यादा, rules सुनते हैं कम। खाने पर no-phones का rule जो आप भी follow करते हों — सौ lectures से ज्यादा असर करता है।",
      ],
      hinglish: [
        "8-10 saal mein screen ka use bahut badh jaata hai — aur iske baare mein jhagde bhi. Research clear hai: roz 2 ghante se zyaada recreational screens kharaab neend, kam wellbeing aur kam academic performance se judi hain.",
        "Jo rules kaam karte hain woh clear, predictable aur saath milkar banaye hote hain. 'Zyaada nahi' wala vague rule apply nahi hota. 'Weekdays homework ke baad 30 minute, weekends 90 minute, kamre mein nahi, sone se 60 minute pehle band' — yeh apply hota hai.",
        "Contract saath milkar banayein. Jis bacche ne rule banana mein hissa liya woh kam ladhta hai. Poochein: 'Tumhe lagta hai screen kab neend, padhai, doston aur mood mein aad'e aati hai? Kya fair limit hai?'",
        "Kamre mein phone sabse badi galti hai. Neend kharaab hoti hai, anxiety badhti hai, aur raat ki scrolling zyaadatar problems ki shuruwat hai. Poore parivaar ke liye kitchen mein charging dock rakhein — parents samet.",
        "Khud misaal banein. Bacche aapki screen habits dekhte hain zyaada, rules sunte hain kam. Khaane par no-phones ka rule jo aap bhi follow karte hon — sau lectures se zyaada asar karta hai.",
      ],
    },
  }),
  L({
    id: "tween-talking-to-them",
    title: {
      en: "How to Talk So Your 8 to 10 Year Old Will Actually Listen",
      hi: "8-10 साल के बच्चे से बात करना जिससे वे सुनें",
      hinglish: "8-10 Saal ke Bacche se Baat Karna Jisse Woh Sunein",
    },
    description: {
      en: "Side-by-side, not face-to-face. The car-conversation rule, and the 5-second pause.",
      hi: "Side-by-side, आमने-सामने नहीं। Car conversation का नियम और 5 सेकंड का रुकाव।",
      hinglish: "Side-by-side, aamnae-saamne nahi. Car conversation rule aur 5-second pause.",
    },
    durationMin: 3, ageBucket: "8-10", emoji: "💬", expert: "Based on Dr Lisa Damour",
    paragraphs: {
      en: [
        "Tweens are starting to pull away — that is healthy. But they still desperately want to feel known. The trick is changing how you talk, not how often.",
        "Side-by-side beats face-to-face. The car, the kitchen, on a walk — this is where tweens open up. Direct eye contact across a table feels like an interrogation to a 9-year-old.",
        "The 5-second pause: when your child says something hard, do not respond for 5 full seconds. Most parents jump in with advice, judgement, or a question. The pause is what tells your child you actually heard.",
        "Ask better questions. Not 'how was school?' (you will get 'fine'), but 'what was the best part?', 'what was the most boring part?', 'who did you sit with at lunch today?'.",
        "Drop one-word reactions to bombs. When your child tells you something shocking, your face decides whether they ever tell you again. Practise the neutral 'mm, tell me more' — even when your insides are screaming.",
      ],
      hi: [
        "Tweens दूरी बनाने लगते हैं — यह स्वस्थ है। लेकिन वे अभी भी पहचाने जाने की गहरी ज़रूरत रखते हैं। तरकीब है बात करने का तरीका बदलना, बार-बार बात करना नहीं।",
        "Side-by-side, आमने-सामने से बेहतर है। Car, kitchen, walk पर — यहीं tweens खुलते हैं। Table के आर-पार सीधी आंखें मिलाना 9 साल के बच्चे को interrogation जैसा लगता है।",
        "5 सेकंड का रुकाव: जब बच्चा कुछ मुश्किल कहे, 5 पूरे सेकंड जवाब न दें। ज्यादातर parents तुरंत सलाह, निर्णय या सवाल करते हैं। रुकाव बताता है कि आपने सुना।",
        "बेहतर सवाल पूछें। 'स्कूल कैसा था?' नहीं (जवाब होगा 'ठीक'), बल्कि 'सबसे अच्छा हिस्सा क्या था?', 'सबसे बोरिंग क्या था?', 'आज lunch में किसके साथ बैठे?'।",
        "चौंकाने वाली बात पर एक शब्द में जवाब न दें। जब बच्चा कुछ shocking बताए तो आपका चेहरा तय करता है कि वह फिर बताएगा या नहीं। 'अच्छा, और बताओ' — यह practice करें।",
      ],
      hinglish: [
        "Tweens door hona shuru karte hain — yeh healthy hai. Lekin woh abhi bhi jaane-pehchane jaane ki gehri zarurat rakhte hain. Trick hai baat karne ka tarika badalna, baar-baar baat karna nahi.",
        "Side-by-side, aamnae-saamne se behtar hai. Car, kitchen, walk par — yahan tweens khulte hain. Table ke aar-paar seedhi aankhein milana 9 saal ke bacche ko interrogation jaisa lagta hai.",
        "5-second pause: jab baccha kuch mushkil kahe, 5 poore second jawab na dein. Zyaadatar parents turant salah, niraay ya sawaal karte hain. Rukaav bataata hai ki aap'ne suna.",
        "Behtar sawaal puchein. 'School kaisa tha?' nahi (jawab hoga 'theek'), balki 'sabse achha hissa kya tha?', 'sabse boring kya tha?', 'aaj lunch mein kiske saath baithe?'.",
        "Chaukane wali baat par ek shabd mein jawab na dein. Jab baccha kuch shocking bataye toh aapka chehra tay karta hai ki woh phir batayega ya nahi. 'Achha, aur batao' — yeh practice karein.",
      ],
    },
  }),

  // ─── 10+ yrs (tween / teen) ──────────────────────────────────────
  L({
    id: "teen-brain-101",
    title: {
      en: "Inside the Teen Brain — What Every Parent Should Know",
      hi: "Teen के दिमाग के अंदर — हर माता-पिता को यह जानना चाहिए",
      hinglish: "Teen ke Brain ke Andar — Har Parent ko Yeh Jaanna Chahiye",
    },
    description: {
      en: "Why your teen makes wild decisions — and why this is biology, not bad character.",
      hi: "Teen अजीब फैसले क्यों करता है — और यह biology है, बुरे किरदार का नहीं।",
      hinglish: "Teen wild decisions kyun karta hai — aur yeh biology hai, bura character nahi.",
    },
    durationMin: 4, ageBucket: "10+", emoji: "🧠", expert: "Based on Dr Frances Jensen & Dr B.J. Casey",
    paragraphs: {
      en: [
        "The teen brain is not a finished adult brain making bad decisions. It is a unique biological stage. The limbic system (emotion, reward, social) develops fully by around 14. The prefrontal cortex (judgement, planning, impulse control) is not done until the mid-twenties.",
        "This 10-year gap is the entire story. A 13-year-old can want something with the full force of an adult drive system, but only a fraction of the adult braking system. This is not a flaw — it is what makes adolescents the great explorers, learners and risk-takers our species needs.",
        "What this means for you: lectures land worse, consequences delivered later land better, and emotional reactivity is biological. When your teen 'overreacts', their amygdala is genuinely louder than yours.",
        "Stay regulated yourself. A teen meltdown plus a parent meltdown equals a relationship crack. Your calm body is still doing co-regulation, even at 14.",
        "Pick your battles. Hair, clothes, music, room — let it slide. Safety, cruelty, school engagement, mental health — hold the line. This is the parental version of the choice trick: give them autonomy where it costs little, hold firm where it matters.",
      ],
      hi: [
        "Teen का दिमाग पूरी तरह विकसित adult brain नहीं है जो गलत फैसले ले रहा है। यह एक अनोखा biological चरण है। Limbic system (भावनाएं, इनाम, सामाजिक) 14 साल तक पूरी तरह बन जाता है। Prefrontal cortex (निर्णय, योजना, आवेग नियंत्रण) mid-twenties तक पूरा नहीं होता।",
        "यह 10 साल का gap ही पूरी कहानी है। 13 साल का किशोर किसी चीज़ को adult drive से चाह सकता है, लेकिन adult braking system का सिर्फ एक अंश उसके पास है। यह कमी नहीं — यही उन्हें महान खोजकर्ता और learner बनाता है।",
        "इसका मतलब: lectures कम काम करते हैं, बाद में दी गई consequences ज्यादा; emotional reactivity biological है। जब teen 'ज्यादा react' करे, तो उनकी amygdala वाकई आपसे तेज़ आवाज़ में काम कर रही है।",
        "खुद शांत रहें। Teen का meltdown + parent का meltdown = relationship में दरार। आपका शांत शरीर अभी भी co-regulation कर रहा है, 14 साल की उम्र में भी।",
        "लड़ाइयां चुनें। बाल, कपड़े, संगीत, कमरा — जाने दें। सुरक्षा, क्रूरता, पढ़ाई, mental health — यहां टिकें। जहां कम कीमत हो वहां autonomy दें, जहां जरूरी हो वहां दृढ़ रहें।",
      ],
      hinglish: [
        "Teen ka brain poori tarah developed adult brain nahi hai jo galat decisions le raha hai. Yeh ek anokha biological stage hai. Limbic system (emotions, reward, social) 14 saal tak poori tarah ban jaata hai. Prefrontal cortex (judgment, planning, impulse control) mid-twenties tak poora nahi hota.",
        "Yeh 10 saal ka gap hi poori kahani hai. 13 saal ka teen kisi cheez ko adult drive se chah sakta hai, lekin adult braking system ka sirf ek fraction uske paas hai. Yeh kami nahi — yahi unhe explorer aur learner banata hai.",
        "Iska matlab: lectures kam kaam karte hain, baad mein di gayi consequences zyaada; emotional reactivity biological hai. Jab teen 'zyaada react' kare, toh unki amygdala sachchi aapke brain se zyaada loud hai.",
        "Khud shaant rahein. Teen ka meltdown + parent ka meltdown = relationship mein daraar. Aapka shaant body abhi bhi co-regulation kar raha hai, 14 saal mein bhi.",
        "Ladaiyan chunein. Baal, kapde, sangeet, kamra — jaane dein. Safety, cruelty, padhai, mental health — yahan tikein. Jahan kam keemat ho wahan autonomy dein, jahan zaroori ho wahan drid rahein.",
      ],
    },
  }),
  L({
    id: "teen-social-media",
    title: {
      en: "Social Media and Teen Mental Health: The Honest Truth",
      hi: "Social Media और Teen का Mental Health: सच्चाई",
      hinglish: "Social Media aur Teen ka Mental Health: Sach Baat",
    },
    description: {
      en: "What the data shows, what to actually do, and why a delayed phone is a gift.",
      hi: "Data क्या दिखाता है, वास्तव में क्या करें, और phone देर से देना क्यों gift है।",
      hinglish: "Data kya dikhata hai, actually kya karein, aur phone baad mein dena kyun gift hai.",
    },
    durationMin: 4, ageBucket: "10+", emoji: "📲", expert: "Based on Dr Jonathan Haidt & Dr Jean Twenge",
    paragraphs: {
      en: [
        "Since 2012, rates of teen anxiety, depression and self-harm have risen sharply across many countries — particularly in girls. The strongest culprit, in the research of Dr Jonathan Haidt and others, is the smartphone with social media.",
        "The mechanism: social comparison on a 24/7 scale, sleep displaced by night-time scrolling, real-world play and friendship displaced by feeds, and addictive design loops engineered by trillion-dollar companies.",
        "Four norms now backed by significant research: no smartphone before high school, no social media before 16, phone-free schools, and far more independence and free play in the real world.",
        "If your child already has a phone — do not panic, recalibrate. Move charging out of the bedroom. Set the screens-off time 60 minutes before bed. Use built-in screen time limits. Have a once-a-week phone-down family ritual.",
        "Most importantly: replace, do not just remove. The teens who do best in the 'no phone' families are the ones whose parents fill that time with sport, friends, hobbies, jobs and unstructured outdoor time. The phone is not the only need — the need underneath is connection.",
      ],
      hi: [
        "2012 के बाद से, कई देशों में teens में anxiety, depression और self-harm की दरें तेज़ी से बढ़ी हैं — खास तौर पर लड़कियों में। Dr Jonathan Haidt जैसे researchers के शोध में सबसे बड़ा कारण है: social media वाला smartphone।",
        "तंत्र यह है: 24/7 सामाजिक तुलना, रात की scrolling से नींद की क्षति, असली खेल और दोस्ती की जगह feeds, और खरबों कमाने वाली कंपनियों के addictive design loops।",
        "Research-backed चार नियम: high school से पहले smartphone नहीं, 16 से पहले social media नहीं, phone-free schools, और असली दुनिया में ज्यादा स्वतंत्रता और खेल।",
        "अगर बच्चे के पास phone है — घबराएं नहीं, recalibrate करें। Charging bedroom से बाहर करें। सोने से 60 मिनट पहले screen बंद। Built-in screen limits use करें। हफ्ते में एक बार phone-down ritual रखें।",
        "सबसे जरूरी: सिर्फ हटाएं नहीं, बदलें। 'No phone' परिवारों में जो teens सबसे अच्छे रहते हैं — उनके parents उस समय को खेल, दोस्त, hobby, काम और बाहरी गतिविधियों से भरते हैं।",
      ],
      hinglish: [
        "2012 ke baad se, kai deshon mein teens mein anxiety, depression aur self-harm ki darein tezi se badhi hain — khaas taur par ladhkiyon mein. Dr Jonathan Haidt jaisa research mein sabse bada reason hai: social media wala smartphone.",
        "Mechanism yeh hai: 24/7 social comparison, raat ki scrolling se neend ki khatiya, asli khelna aur dosti ki jagah feeds, aur kharbon kamaane wali companies ke addictive design loops.",
        "Research-backed chaar norms: high school se pehle smartphone nahi, 16 se pehle social media nahi, phone-free schools, aur asli duniya mein zyaada azadi aur khelna.",
        "Agar bacche ke paas phone hai — ghabrayein nahi, recalibrate karein. Charging bedroom se bahar karein. Sone se 60 minute pehle screen band. Built-in screen limits use karein. Hafte mein ek baar phone-down family ritual rakhein.",
        "Sabse zaroori: sirf hatayen nahi, badlein. 'No phone' parivaron mein jo teens sabse achhe rehte hain — unke parents us time ko sport, dost, hobby, kaam aur bahari activities se bharte hain.",
      ],
    },
  }),
  L({
    id: "teen-staying-connected",
    title: {
      en: "Staying Connected When They Want to Pull Away",
      hi: "जब वे दूर जाना चाहें तब जुड़े रहना",
      hinglish: "Jab Woh Door Jaana Chahein Tab Jude Rehna",
    },
    description: {
      en: "The 1:1 ritual, the car rule, and why showing up boring beats showing up fixing.",
      hi: "1:1 ritual, car rule, और boring रहना क्यों fixing से बेहतर है।",
      hinglish: "1:1 ritual, car rule, aur boring dikhna kyun fixing se behtar hai.",
    },
    durationMin: 3, ageBucket: "10+", emoji: "🤝", expert: "Based on Dr Lisa Damour & Dr Laurence Steinberg",
    paragraphs: {
      en: [
        "Teens are biologically wired to pull away from parents and toward peers. This is healthy — it is how they prepare to launch. Your job is not to fight it. Your job is to remain the safe base they return to.",
        "Protect a 1:1 ritual that is not about school, behaviour or chores. A weekly walk, a Saturday breakfast, the drive to a class. Keep it sacred and keep it light.",
        "Be available, not intrusive. Sit in the kitchen when they are doing homework. Drive them places. The boring background presence is when teens drop the real things.",
        "When they share something hard — listen, do not fix. Adolescents who feel heard come back. Adolescents who feel lectured stop telling you anything by 14.",
        "Repair publicly when you mess up. 'I overreacted last night and I am sorry. I should have listened.' Teens have a finely-tuned hypocrisy detector. The parent who can apologise keeps their authority.",
      ],
      hi: [
        "Teens biologically माता-पिता से दूर और दोस्तों की तरफ जाने के लिए wired हैं। यह स्वस्थ है — यही launch की तैयारी है। आपका काम इससे लड़ना नहीं, बल्कि वह safe base बने रहना है जहां वे वापस आते हैं।",
        "1:1 ritual बचाएं जो school, behavior या काम के बारे में न हो। Weekly walk, शनिवार का breakfast, class तक drive। इसे पवित्र और हल्का रखें।",
        "Available रहें, intrusive नहीं। जब वे homework कर रहे हों, kitchen में बैठें। उन्हें कहीं छोड़ने जाएं। Boring background presence वही जगह है जहां teens असली बातें share करते हैं।",
        "जब वे मुश्किल बात share करें — सुनें, fix न करें। जो teens सुने हुए महसूस करते हैं, वे वापस आते हैं। जिन्हें lecture मिलता है, वे 14 साल में बताना बंद कर देते हैं।",
        "गलती पर माफी मांगें। 'कल मैं ज्यादा react कर गया था और माफी चाहता हूं। मुझे सुनना चाहिए था।' Teens में hypocrisy detector बहुत sharp होता है। माफी मांग सकने वाला parent अपनी authority बनाए रखता है।",
      ],
      hinglish: [
        "Teens biologically mata-pita se door aur doston ki taraf jaane ke liye wired hain. Yeh healthy hai — yahi launch ki taiyaari hai. Aapka kaam isse lad'na nahi, balki woh safe base bane rehna hai jahan woh wapas aate hain.",
        "1:1 ritual bachayein jo school, behavior ya kaam ke baare mein na ho. Weekly walk, Saturday ka breakfast, class tak drive. Ise sacred aur halka rakhein.",
        "Available rahein, intrusive nahi. Jab woh homework kar rahe hon, kitchen mein baithein. Unhein kahin chodne jayein. Boring background presence wahi jagah hai jahan teens asli baatein share karte hain.",
        "Jab woh mushkil baat share karein — sunein, fix na karein. Jo teens sune hue feel karte hain, woh wapas aate hain. Jinhe lecture milta hai, woh 14 saal mein batana band kar dete hain.",
        "Galti par maafi maangein. 'Kal main zyaada react kar gaya tha aur maafi chahta hoon. Mujhe sunna chahiye tha.' Teens mein hypocrisy detector bahut sharp hota hai. Maafi maang sakne wala parent apni authority banaye rakhta hai.",
      ],
    },
  }),
  L({
    id: "teen-mental-health-signs",
    title: {
      en: "When to Worry: Spotting Real Mental Health Concerns",
      hi: "चिंता कब करें: असली Mental Health समस्याओं को पहचानें",
      hinglish: "Chinta Kab Karein: Asli Mental Health Problems Ko Pehchanein",
    },
    description: {
      en: "Normal teen moods vs warning signs, and exactly what to do next.",
      hi: "सामान्य teen मूड बनाम warning signs, और आगे क्या करें।",
      hinglish: "Normal teen mood vs warning signs, aur aage kya karein.",
    },
    durationMin: 4, ageBucket: "10+", emoji: "💛", expert: "Based on AAP & WHO adolescent mental health guidelines",
    paragraphs: {
      en: [
        "Teen moods can be intense, fast-changing and confusing — and most of the time this is normal. But about 1 in 5 adolescents experiences a real mental-health condition. Knowing the line is one of the most important parenting skills of this decade.",
        "Normal: bad days, irritability, slammed doors, periods of wanting to be alone. These come and go and do not stop your teen from school, friends, food, sleep, or things they once enjoyed.",
        "Warning signs that warrant a professional conversation: persistent low mood for more than 2 weeks, withdrawal from friends and activities they used to love, big sleep or appetite changes, falling grades, talking about being a burden, hopelessness, or any mention of self-harm or suicide.",
        "What to do. Open a calm, private conversation. 'I have noticed you seem really weighed down. I love you and I want to understand. Can you tell me what is going on?'. Listen. Do not minimise. Do not promise to keep it a secret.",
        "Get help early. The first call is your paediatrician — they can screen and refer. Therapy works. Most teen mental-health conditions are highly treatable when caught early. Asking for help is a strength, not a failure of parenting.",
      ],
      hi: [
        "Teen के मूड तीव्र, जल्दी बदलने वाले और confusing हो सकते हैं — और ज़्यादातर समय यह सामान्य है। लेकिन लगभग 5 में से 1 किशोर वास्तविक mental health समस्या का अनुभव करता है। इस रेखा को जानना इस दशक की सबसे महत्वपूर्ण parenting skills में से एक है।",
        "सामान्य: बुरे दिन, चिड़चिड़ापन, दरवाज़ा पटकना, अकेले रहने के दौर। ये आते-जाते रहते हैं और school, दोस्त, खाना, नींद या पहले पसंद की चीज़ें बंद नहीं करते।",
        "Warning signs जो professional बातचीत की ज़रूरत बताते हैं: 2 हफ्ते से ज्यादा लगातार उदासी, पहले पसंद की activities से दूरी, नींद या भूख में बड़ा बदलाव, grades गिरना, बोझ होने की बातें, निराशा, या self-harm/suicide का कोई ज़िक्र।",
        "क्या करें: शांत, निजी बातचीत खोलें। 'मैंने देखा है तुम बहुत बोझिल लग रहे हो। मैं तुमसे प्यार करता हूं और समझना चाहता हूं। क्या मुझे बता सकते हो क्या हो रहा है?' सुनें। छोटा न करें। गुप्त रखने का वादा न करें।",
        "जल्दी मदद लें। पहली call आपके paediatrician को करें — वे screen करेंगे और refer करेंगे। Therapy काम करती है। जब जल्दी पकड़ा जाए तो ज्यादातर teen mental health conditions बहुत treatable हैं।",
      ],
      hinglish: [
        "Teen ke moods tivra, jaldi badalne wale aur confusing ho sakte hain — aur zyaadatar waqt yeh normal hai. Lekin lagbhag 5 mein se 1 adolescent asli mental health problem ka anubhav karta hai. Is rekha ko jaanna is dasak ki sabse important parenting skills mein se ek hai.",
        "Normal: bure din, chidchidaapan, darwaza patakna, akele rehne ke daur. Yeh aate-jaate rehte hain aur school, dost, khaana, neend ya pehle pasand ki cheezein band nahi karte.",
        "Warning signs jo professional baatcheet ki zarurat batate hain: 2 hafte se zyaada lagaataar udaasi, pehle pasand ki activities se doori, neend ya bhoookh mein bada badlaav, grades girna, bojh hone ki baatein, niraasha, ya self-harm/suicide ka koi zikr.",
        "Kya karein: shaant, niji baatcheet kholen. 'Mujhe dikha hai tum bahut bojhil lag rahe ho. Main tumse pyaar karta hoon aur samajhna chahta hoon. Kya mujhe bata sakte ho kya ho raha hai?' Sunein. Chhota na karein. Gupt rakhne ka waada na karein.",
        "Jaldi madad lein. Pehli call aapke paediatrician ko karein — woh screen karenge aur refer karenge. Therapy kaam karti hai. Jab jaldi pakda jaaye toh zyaadatar teen mental health conditions bahut treatable hain.",
      ],
    },
  }),

  // ─── Kids Health Concern (research & science-based) ───────────────
  L({
    id: "health-early-milestones",
    title: {
      en: "Milestones 0–5: Sign-Posts, Not Deadlines (and the Red Flags You Must Not Wait On)",
      hi: "0–5 साल के Milestones: समय-सीमा नहीं, संकेत — और जिन red flags पर रुकना नहीं है",
      hinglish: "Milestones 0–5 saal: deadlines nahi, sign-posts — aur Red Flags jin par wait nahi karna",
    },
    description: {
      en: "What's normal range, what's not, and exactly when to ask for an evaluation.",
      hi: "क्या सामान्य है, क्या नहीं, और evaluation कब मांगनी है।",
      hinglish: "Normal range kya hai, kya nahi, aur evaluation kab maangni hai.",
    },
    durationMin: 5, ageBucket: "0-2", emoji: "🌱",
    expert: "Based on CDC Learn the Signs / AAP Bright Futures & Indian Academy of Pediatrics",
    paragraphs: {
      en: [
        "Developmental milestones are the typical age range when most children reach a skill — not deadlines. The CDC updated its checklist in 2022 specifically because the old '50 percent of kids do this by X' was making families wait too long. The new checklist marks milestones at the age 75 percent of kids should be doing them. If your child has not, that is the moment to ask, not to wait.",
        "By 12 months, most babies respond to their name, look where you point, babble, and stand with help. By 18 months, single words, walking, pointing to ask for things, and simple play (feeding a doll). By 2 years, two-word phrases, running, and copying you doing chores. By 3 years, short sentences, riding a tricycle, separating from you without a meltdown most days. By 4 years, telling a simple story, drawing a person with two body parts, hopping on one foot.",
        "Red flags that need a same-week paediatric review, no waiting: no babbling by 12 months, no single words by 16 months, no two-word phrases by 24 months, ANY loss of skills they previously had at any age, no eye contact, not responding to their name by 12 months, walking on toes only, hand flapping, lining up toys repeatedly, or major delays compared to siblings at the same age.",
        "The single biggest brain-builder is serve-and-return: your baby coos, you coo back. Your toddler points at a dog, you say 'yes, big brown dog'. This back-and-forth, not flashcards or apps, builds language and the social brain. Harvard's Center on the Developing Child has 30 years of evidence: the quality of these tiny exchanges predicts cognition more than any toy or programme.",
        "If something feels off, trust the gut. Early intervention before age 3 changes the lifelong trajectory of autism, speech delay, motor delay, and learning differences. A normal evaluation reassures you. An early diagnosis gets the help started. Both are wins. The only loss is waiting and watching.",
      ],
      hi: [
        "Developmental milestones वह typical age range हैं जब ज्यादातर बच्चे एक skill पाते हैं — deadline नहीं। CDC ने 2022 में checklist update की क्योंकि पुरानी '50% बच्चे यह X तक करते हैं' families को बहुत देर तक wait कराती थी। नई checklist उस उम्र पर milestone रखती है जब 75% बच्चे यह करते हैं। अगर आपका बच्चा नहीं कर रहा तो पूछने का यही समय है, wait करने का नहीं।",
        "12 महीने तक: नाम पर response, इशारे को follow करना, बबलिंग, मदद से खड़े होना। 18 महीने तक: एक शब्द, चलना, मांगने के लिए point करना, simple play। 2 साल तक: दो-शब्दों के phrases, दौड़ना, आपकी नकल करना। 3 साल तक: छोटे sentences, tricycle, ज़्यादातर दिन बिना meltdown अलग होना। 4 साल तक: छोटी कहानी बताना, इंसान का चित्र दो body parts के साथ, एक पैर पर hop।",
        "Red flags जिन पर उसी हफ्ते paediatric review चाहिए: 12 महीने तक बबलिंग नहीं, 16 महीने तक एक शब्द नहीं, 24 महीने तक दो-शब्दों के phrases नहीं, किसी भी उम्र में पहले की skills खो देना, eye contact नहीं, 12 महीने तक नाम पर react नहीं, सिर्फ पंजों पर चलना, hand flapping, खिलौनों को बार-बार line करना, या भाई-बहन के मुकाबले बड़ी देरी।",
        "सबसे बड़ा brain-builder है serve-and-return: बच्चा coo करे, आप coo back करें। Toddler कुत्ते की तरफ point करे, आप कहें 'हाँ, बड़ा भूरा कुत्ता'। यह back-and-forth — flashcards या apps नहीं — language और social brain बनाता है। Harvard Center on the Developing Child की 30 साल की evidence है: इन tiny exchanges की quality किसी toy से ज्यादा cognition predict करती है।",
        "अगर कुछ ठीक नहीं लगता, gut पर भरोसा करें। 3 साल से पहले early intervention autism, speech delay, motor delay और learning differences की lifelong trajectory बदल देती है। Normal evaluation आश्वासन देती है। Early diagnosis मदद शुरू कर देती है। दोनों जीत हैं। हार सिर्फ wait-and-watch में है।",
      ],
      hinglish: [
        "Developmental milestones woh typical age range hain jab zyaadatar bacche ek skill paate hain — yeh deadlines nahi hain. CDC ne 2022 mein apni checklist isliye update ki kyunki purani '50% bacche yeh X tak karte hain' families ko bahut der tak wait karaati thi. Nayi checklist us umar par milestone rakhti hai jab 75% bacche yeh karte hain. Agar aapka bacha nahi kar raha, toh poochne ka yahi waqt hai — wait karne ka nahi.",
        "12 mahine tak: naam par response, ishaare ko follow karna, babbling, madad se khade hona. 18 mahine tak: ek shabd, chalna, maangne ke liye point karna, simple play (gudiya ko khilana). 2 saal tak: do-shabdon ke phrases, daudna, aapki nakal karke kaam karna. 3 saal tak: chhote sentences, tricycle, zyaadatar din bina meltdown alag ho jaana. 4 saal tak: chhoti kahaani batana, insaan ka chitra do body parts ke saath, ek pair par hop karna.",
        "Red flags jin par usi hafte paediatric review chahiye, wait mat karein: 12 mahine tak babbling nahi, 16 mahine tak ek shabd nahi, 24 mahine tak do-shabdon ke phrases nahi, kisi bhi umar par pehle ki skills kho dena, eye contact nahi, 12 mahine tak naam par react nahi, sirf panjon par chalna, haath flap karna, khilonon ko baar-baar line karna, ya behen-bhai ke mukaable badi der.",
        "Sabse bada brain-builder hai serve-and-return: bacha coo kare, aap coo back karein. Toddler kutte ki taraf point kare, aap kahein 'haan, bada bhura kutta'. Yeh back-and-forth — flashcards ya apps nahi — language aur social brain banata hai. Harvard Center on the Developing Child ki 30 saal ki evidence: in tiny exchanges ki quality kisi toy se zyaada cognition predict karti hai.",
        "Agar kuch theek nahi lagta, gut par bharosa karein. 3 saal se pehle early intervention autism, speech delay, motor delay aur learning differences ki lifelong trajectory badal deti hai. Normal evaluation aaschwasan deti hai. Early diagnosis madad shuru kar deti hai. Dono jeet hain. Haar sirf 'wait & watch' mein hai.",
      ],
    },
  }),
  L({
    id: "health-dental-care",
    title: {
      en: "Cavity-Free Childhood: The 4 Habits That Beat 90% of Tooth Decay",
      hi: "Cavity-Free बचपन: 90% दांतों की सड़न रोकने वाली 4 आदतें",
      hinglish: "Cavity-Free Bachpan: 90% Tooth Decay Rokne Wali 4 Aadatein",
    },
    description: {
      en: "Fluoride from the first tooth, sugar frequency rules, and the bottle-in-bed mistake.",
      hi: "पहले दांत से fluoride, चीनी की frequency के नियम, और bottle-in-bed की गलती।",
      hinglish: "Pehle daant se fluoride, sugar frequency rules, aur bottle-in-bed wali galti.",
    },
    durationMin: 4, ageBucket: "2-4", emoji: "🦷",
    expert: "Based on AAPD, WHO Oral Health & Indian Society of Pedodontics",
    paragraphs: {
      en: [
        "Tooth decay is the most common chronic disease of childhood worldwide — and almost 100 percent preventable. By age 5, nearly 50 percent of Indian children already have cavities. The science is settled: four habits prevent 90 percent of them.",
        "Habit one: brush with fluoride toothpaste from the very first tooth. The American Academy of Pediatric Dentistry, the WHO, and the Indian Society of Pedodontics all agree. The amount matters: a smear the size of a rice grain for under-3s, a pea-size dab for ages 3 to 6, a full strip after that. Twice a day, morning and night. The night brush is the most important — saliva drops during sleep so anything left on the teeth feeds bacteria for 8 hours. After brushing, spit, do not rinse. The thin film of fluoride is what works.",
        "Habit two: never put a child to bed with a bottle of milk, juice, or anything but water. This is the single biggest cause of 'bottle-mouth' decay in toddlers. Milk pools around the front teeth all night and ferments. If a bottle is needed for comfort, it must be water only.",
        "Habit three: it is not the AMOUNT of sugar that causes decay — it is the FREQUENCY. Each sugar exposure starts a 20-minute acid attack on enamel. A chocolate after lunch is one attack. The same chocolate eaten one square at a time over an hour is six attacks. So the rule is: sweets and juice only with meals, never sipped or grazed between. Water between meals, always.",
        "Habit four: first dental visit by age 1, or when the first tooth comes — whichever is earlier. The goal is not treatment, it is prevention and a lifelong friendly relationship with the dentist. Parents brush for kids until age 7 or 8 because their hand coordination is not enough before that. And one final thing: avoid sharing spoons and pre-chewing food. Cavity-causing bacteria pass from caregiver mouths to the baby's mouth that way.",
      ],
      hi: [
        "दांतों की सड़न दुनिया में बचपन की सबसे आम chronic बीमारी है — और लगभग 100% रोकी जा सकती है। 5 साल की उम्र तक भारत में करीब 50% बच्चों को cavities होती हैं। Science साफ है: 4 आदतें इनमें से 90% रोक देती हैं।",
        "आदत 1: पहले दांत के आते ही fluoride toothpaste से ब्रश करें। AAPD, WHO और Indian Society of Pedodontics सभी सहमत हैं। मात्रा matter करती है: 3 साल से छोटे के लिए चावल के दाने जितना, 3-6 साल के लिए मटर जितना, उसके बाद पूरी पट्टी। दिन में दो बार। रात की ब्रश सबसे ज़रूरी है — नींद में लार कम होती है तो दांत पर बचा कुछ भी 8 घंटे bacteria को खिलाता है। ब्रश के बाद थूकें, कुल्ला न करें। Fluoride की पतली परत ही काम करती है।",
        "आदत 2: सोते समय कभी दूध, juice या पानी के अलावा कुछ नहीं देना। यही toddler 'bottle-mouth' decay का सबसे बड़ा कारण है। दूध सामने के दांतों पर पूरी रात जमता है और ferment होता है। आराम के लिए bottle चाहिए तो सिर्फ पानी।",
        "आदत 3: सड़न चीनी की मात्रा से नहीं — frequency से होती है। हर बार चीनी = enamel पर 20 मिनट का acid attack। दोपहर के बाद एक chocolate = एक attack। वही chocolate एक-एक square करके एक घंटे में खाई = छह attacks। नियम: मिठाई और juice सिर्फ meal के साथ, beech में sip नहीं। बीच में हमेशा पानी।",
        "आदत 4: पहले दांत के साथ या 1 साल तक — जो पहले हो — पहली dental visit। मकसद इलाज नहीं, prevention और जीवनभर की दोस्ती है। 7-8 साल तक माता-पिता बच्चे के लिए ब्रश करें क्योंकि उनकी hand coordination उससे पहले काफी नहीं है। एक आख़िरी बात: चम्मच share न करें और बच्चे का खाना चबाकर न दें — Cavity के bacteria बड़ों के मुंह से बच्चे के मुंह में ऐसे ही जाते हैं।",
      ],
      hinglish: [
        "Daanton ki sadan duniya mein bachpan ki sabse aam chronic bimari hai — aur lagbhag 100% rok'i ja sakti hai. 5 saal ki umar tak Bharat mein karib 50% bacchon ko cavities hoti hain. Science clear hai: 4 aadatein inmein se 90% rok deti hain.",
        "Aadat 1: pehle daant ke aate hi fluoride toothpaste se brush karein. AAPD, WHO aur Indian Society of Pedodontics — sab agree hain. Maatra matter karti hai: 3 saal se chhote ke liye chawal ke daane jitna, 3-6 saal ke liye matar jitna, uske baad poori patti. Din mein do baar — subah aur raat. Raat ki brush sabse zaruri hai — neend mein laar kam hoti hai, toh daant par bacha kuch bhi 8 ghante bacteria ko khilata hai. Brush ke baad thookein, kulla mat karein. Fluoride ki patli parat hi kaam karti hai.",
        "Aadat 2: sote samay kabhi doodh, juice ya paani ke alawa kuch mat dein. Yahi toddler 'bottle-mouth' decay ka sabse bada karan hai. Doodh saamne ke daanton par poori raat jamta hai aur ferment hota hai. Comfort ke liye bottle chahiye toh sirf paani.",
        "Aadat 3: sadan sugar ki AMOUNT se nahi — FREQUENCY se hoti hai. Har baar sugar = enamel par 20 minute ka acid attack. Lunch ke baad ek chocolate = ek attack. Wahi chocolate ek-ek square karke ek ghante mein khaayi = chhah attacks. Niyam: mithai aur juice sirf meal ke saath, beech mein sip-sip nahi. Beech mein hamesha paani.",
        "Aadat 4: pehle daant ke saath ya 1 saal tak — jo pehle ho — pehli dental visit. Maksad ilaaj nahi, prevention aur lifelong dosti hai. 7-8 saal tak parents bachhe ke liye brush karein kyunki unki hand coordination usse pehle kafi nahi hoti. Ek aakhri baat: chamach share na karein aur bachhe ka khaana chabakar mat dein — cavity ke bacteria badon ke muh se bachhe ke muh mein aise hi jaate hain.",
      ],
    },
  }),
  L({
    id: "health-immunity-truth",
    title: {
      en: "Building Real Immunity: What Works, What's a Myth, When to Worry",
      hi: "असली Immunity कैसे बनाएं: क्या काम करता है, क्या myth है, कब चिंता करें",
      hinglish: "Asli Immunity Kaise Banayein: Kya Kaam Karta Hai, Kya Myth Hai, Kab Chinta Karein",
    },
    description: {
      en: "Why 8–12 colds a year is normal, the 3 evidence-based immunity levers, and the red flags.",
      hi: "साल में 8-12 जुकाम क्यों normal है, 3 evidence-based immunity levers, और red flags।",
      hinglish: "Saal mein 8-12 cold kyon normal hai, 3 evidence-based immunity levers, aur red flags.",
    },
    durationMin: 5, ageBucket: "2-4", emoji: "🛡️",
    expert: "Based on Indian Academy of Pediatrics (IAP), WHO & Cochrane Reviews",
    paragraphs: {
      en: [
        "If your toddler caught 8 to 12 colds last year, that is not weak immunity — that is a normal, healthy immune system going through its training years. Children under 5 average 6 to 12 viral infections a year, more if they go to daycare. Each one is a workout for the immune system. By age 6, the rate drops sharply. So before fixing 'low immunity', first know: this is probably normal.",
        "Three things genuinely move the needle on a child's immunity, all backed by strong evidence. One: sleep. A child sleeping under their age-target hours produces fewer antibodies after vaccination and gets sick more often. The targets: 1 to 2 yrs need 11 to 14 hours, 3 to 5 yrs need 10 to 13 hours, 6 to 12 yrs need 9 to 12 hours, including any naps. Two: outdoor play and microbial diversity. The 'old friends' theory and decades of hygiene-hypothesis research show that children who play outside, get a bit dirty, have pets, and eat a fibre-diverse diet build stronger, better-calibrated immune systems. Three: gut health. About 70 percent of immune cells live in the gut. Fibre, fermented foods like yoghurt, dahi, kanji, and a wide variety of plants — not probiotic supplements — feed the right microbes.",
        "The myths to drop. Mega-doses of Vitamin C do not prevent colds in healthy kids — Cochrane reviews are clear on this. Zinc lozenges are not safe for young children. Most 'immunity tonics' on the market have no robust evidence. Cold weather does not cause colds; viruses do. Going out with wet hair does not cause illness. What about Vitamin D? This is the one supplement worth checking — Indian children are widely deficient and a Cochrane review shows supplementation reduces respiratory infections in those who are low. Get a 25-OH-D test before supplementing.",
        "Vaccines are the single biggest immunity intervention in human history. Follow the IAP schedule, including flu shots every year for children 6 months and older. A vaccinated child is not 'overloading' their immune system — they are training it against the worst threats with the smallest risk.",
        "When to actually worry — these are the immune red flags from the Jeffrey Modell Foundation: more than four ear infections in a year, more than two serious sinus infections in a year, more than two pneumonias in a year, two or more deep-tissue or organ infections, recurrent thrush after age 1, failure to thrive, or a family history of immune disease. Any of these = ask your paediatrician for an immune workup, do not just keep treating the next infection.",
      ],
      hi: [
        "अगर पिछले साल आपके toddler को 8-12 जुकाम हुए तो यह कमज़ोर immunity नहीं — यह सामान्य, स्वस्थ immune system की training years है। 5 साल से कम के बच्चों को साल में 6-12 viral infections औसतन होते हैं, daycare जाने पर ज़्यादा। हर एक immune system की workout है। 6 साल तक यह तेजी से कम हो जाती है। तो 'low immunity' fix करने से पहले जानें: यह शायद normal है।",
        "तीन चीज़ें बच्चे की immunity पर असल में काम करती हैं, सब strong evidence पर। एक: नींद। उम्र के target से कम सोने वाला बच्चा vaccination के बाद कम antibodies बनाता है और ज़्यादा बीमार होता है। Targets: 1-2 साल = 11-14 घंटे, 3-5 साल = 10-13 घंटे, 6-12 साल = 9-12 घंटे (naps सहित)। दो: बाहर खेलना और microbial diversity। 'Old friends' theory और दशकों की hygiene-hypothesis research बताती है कि बाहर खेलने वाले, थोड़ा गंदे होने वाले, pets रखने वाले, fibre-rich diverse खाना खाने वाले बच्चे ज़्यादा मज़बूत immunity बनाते हैं। तीन: gut health। लगभग 70% immune cells gut में रहती हैं। Fibre, fermented foods जैसे दही, कांजी और कई तरह के पौधे — probiotic supplements नहीं — सही microbes को खिलाते हैं।",
        "Myths जो छोड़ने हैं। Vitamin C की mega-doses healthy बच्चों में जुकाम नहीं रोकतीं — Cochrane reviews साफ हैं। Zinc lozenges छोटे बच्चों के लिए safe नहीं हैं। Market में ज़्यादातर 'immunity tonics' की कोई robust evidence नहीं है। ठंडा मौसम जुकाम नहीं करता; viruses करते हैं। गीले बाल से बाहर जाने से बीमारी नहीं होती। Vitamin D? यही एक supplement check करने लायक है — भारतीय बच्चों में widespread कमी है और Cochrane review कमी वालों में respiratory infections कम करना दिखाती है। Supplement से पहले 25-OH-D test करवाएं।",
        "Vaccines मानव इतिहास का सबसे बड़ा immunity intervention हैं। IAP schedule follow करें, 6 महीने से ज़्यादा के बच्चों के लिए हर साल flu shot सहित। Vaccinated बच्चा अपनी immune system 'overload' नहीं कर रहा — वह उसे सबसे बुरे ख़तरों के खिलाफ train कर रहा है, सबसे कम जोखिम पर।",
        "वाकई कब चिंता करें — Jeffrey Modell Foundation के immune red flags: साल में 4 से ज़्यादा ear infections, साल में 2 से ज़्यादा serious sinus infections, साल में 2 से ज़्यादा pneumonias, 2 या उससे ज़्यादा deep-tissue infections, 1 साल के बाद बार-बार thrush, failure to thrive, या परिवार में immune बीमारी का history। इनमें से कुछ भी = paediatrician से immune workup मांगें, सिर्फ अगले infection का इलाज न करते रहें।",
      ],
      hinglish: [
        "Agar pichle saal aapke toddler ko 8-12 cold hue toh yeh kamzor immunity nahi — yeh normal, healthy immune system ke training years hain. 5 saal se chhote bacchon ko saal mein average 6-12 viral infections hote hain, daycare jaane par zyaada. Har ek immune system ke liye workout hai. 6 saal tak yeh sharply kam ho jaata hai. Toh 'low immunity' fix karne se pehle jaanein: yeh probably normal hai.",
        "Teen cheezein bachhe ki immunity par asal mein move-the-needle karti hain, sab strong evidence par. Ek: neend. Apne age-target se kam sone wala bacha vaccination ke baad kam antibodies banata hai aur zyaada bimaar hota hai. Targets: 1-2 saal = 11-14 ghante, 3-5 saal = 10-13 ghante, 6-12 saal = 9-12 ghante (naps milake). Do: outdoor play aur microbial diversity. 'Old friends' theory aur decades ki hygiene-hypothesis research dikhati hai bahar khelne wale, thoda gande hone wale, pets rakhne wale, fibre-rich variety wala khaana khaane wale bacche zyaada mazboot, better-calibrated immune system banate hain. Teen: gut health. Lagbhag 70% immune cells gut mein rehti hain. Fibre, fermented foods jaise dahi, kanji, aur kayi tarah ke plants — probiotic supplements nahi — sahi microbes ko feed karte hain.",
        "Myths jo chhodne hain. Vitamin C ki mega-doses healthy bacchon mein cold nahi rokti — Cochrane reviews clear hain. Zinc lozenges chhote bacchon ke liye safe nahi hain. Market ke zyaadatar 'immunity tonics' ki koi robust evidence nahi hai. Thanda mausam cold nahi karta; viruses karte hain. Geele baal lekar bahar jaane se bimari nahi hoti. Vitamin D? Yahi ek supplement check karne layak hai — Indian bacchon mein widespread deficiency hai aur Cochrane review kami wale bacchon mein respiratory infections kam karna dikhati hai. Supplement se pehle 25-OH-D test karwayein.",
        "Vaccines maanav itihaas ka sabse bada immunity intervention hain. IAP schedule follow karein, 6 mahine se zyaada ke bacchon ke liye har saal flu shot ke saath. Vaccinated bacha apni immune system 'overload' nahi kar raha — woh use sabse bure khatron ke khilaaf train kar raha hai, sabse kam risk par.",
        "Wakai kab chinta karein — Jeffrey Modell Foundation ke immune red flags: saal mein 4 se zyaada ear infections, 2 se zyaada serious sinus infections, 2 se zyaada pneumonias, 2 ya zyaada deep-tissue ya organ infections, 1 saal ke baad recurrent thrush, failure to thrive, ya parivar mein immune disease ka history. Inmein se kuch bhi = paediatrician se immune workup maango, bas next infection ka ilaaj mat karte raho.",
      ],
    },
  }),
  L({
    id: "health-hidden-nutrition-gaps",
    title: {
      en: "The Hidden Hunger: Iron, Vitamin D & B12 in Indian Children",
      hi: "Hidden Hunger: भारतीय बच्चों में Iron, Vitamin D और B12 की कमी",
      hinglish: "Hidden Hunger: Indian Bacchon mein Iron, Vitamin D aur B12 ki Kami",
    },
    description: {
      en: "Why a normal-weight, well-fed child can still be deficient — and how to fix it.",
      hi: "Normal वज़न और भरपेट खाने वाला बच्चा भी कमी का शिकार क्यों हो सकता है — और इसे कैसे ठीक करें।",
      hinglish: "Normal-weight aur bharpet khaane wala bacha bhi deficient kyon ho sakta hai — aur kaise theek karein.",
    },
    durationMin: 5, ageBucket: "2-4", emoji: "🥗",
    expert: "Based on ICMR-NIN, WHO First-1000-Days & NFHS-5 data",
    paragraphs: {
      en: [
        "There is a paradox in Indian families: the child eats three meals a day, the plate looks full, the child looks well, and yet blood tests show iron, vitamin D, or B12 deficiency. The NFHS-5 data is striking — 67 percent of Indian under-5s are anaemic. This is not because we feed too little. It is because of WHAT we feed and HOW the body absorbs it.",
        "Iron is the most common deficiency and the one most strongly linked to focus, school performance, and behaviour. The trick is bioavailability. Heme iron from meat, eggs, and fish is absorbed at 15 to 35 percent. Non-heme iron from dal, palak, ragi, and rajma is absorbed at only 2 to 10 percent. Two simple tricks change everything. Add a vitamin C source — nimbu, amla, tomato, capsicum, guava — to the SAME meal as the iron-rich food. This boosts absorption 3 to 4 times. And do NOT serve milk, dahi, chai, or coffee within an hour of an iron meal — calcium and tannins block iron absorption sharply.",
        "Vitamin D is the second silent crisis. 70 to 90 percent of Indian children are deficient even though we have abundant sunshine. Why? Sunscreen, indoor play, school timing during peak sun, dark skin needing more sun exposure, and pollution. The fix needs both: 15 to 20 minutes of midday sun on bare arms and legs three to four times a week, AND fortified foods or a tested supplement if levels are low. Get a 25-OH-D test before supplementing — never guess the dose.",
        "Vitamin B12 hits vegetarian families hardest because it is found mainly in animal foods. Symptoms are sneaky: tiredness, irritability, low appetite, and in severe cases, developmental delay. Sources: eggs, milk, dahi, paneer, fortified cereals. Strict vegetarian or vegan children almost always need a supplement. Iodine, zinc, and omega-3 are the next gaps; iodised salt covers most iodine needs.",
        "What to do this week. Watch for the red flag pattern: tiredness, pale lower eyelids and palms, poor appetite, frequent infections, poor focus, and slow growth. If you see two or more, ask your paediatrician for a CBC, ferritin, 25-OH-D, and B12 test. Then switch to food-first fixes guided by the result. Do not start your child on a multi-vitamin without testing — too much iron or vitamin A can be more dangerous than the deficiency.",
      ],
      hi: [
        "भारतीय परिवारों में एक paradox है: बच्चा तीन meal खाता है, plate भरी दिखती है, बच्चा अच्छा दिखता है, फिर भी blood test में iron, Vitamin D या B12 की कमी निकलती है। NFHS-5 data चौंकाने वाला है — भारत में 5 साल से छोटे 67% बच्चे anaemic हैं। वजह यह नहीं कि हम कम खिलाते हैं। वजह है क्या खिलाते हैं और शरीर कैसे absorb करता है।",
        "Iron सबसे आम कमी है और focus, पढ़ाई और behaviour से सबसे मज़बूती से जुड़ा है। राज है bioavailability। मांस, अंडा, मछली से heme iron 15-35% absorb होता है। दाल, पालक, रागी, राजमा से non-heme iron सिर्फ 2-10% absorb होता है। दो trick सब बदल देती हैं। Iron-rich खाने के SAME meal में Vitamin C — नींबू, आँवला, tomato, capsicum, अमरूद — डालें। Absorption 3-4 गुना बढ़ता है। और iron meal के एक घंटे के अंदर दूध, दही, चाय या कॉफी न दें — calcium और tannins iron absorption काफी रोकते हैं।",
        "Vitamin D दूसरा silent crisis है। भारत में 70-90% बच्चे deficient हैं, धूप भरपूर होते हुए भी। क्यों? Sunscreen, indoor play, peak sun में school, dark skin को ज़्यादा सूरज चाहिए, pollution। Fix दोनों चाहिए: हफ्ते में 3-4 बार 15-20 मिनट दोपहर की धूप — खुले हाथ और पैर पर — और fortified foods या tested supplement अगर level कम है। Supplement से पहले 25-OH-D test करवाएं — dose कभी guess न करें।",
        "Vitamin B12 vegetarian families पर सबसे ज़्यादा असर करता है क्योंकि यह मुख्यतः animal foods में होता है। लक्षण subtle: थकान, चिड़चिड़ापन, कम भूख, severe में developmental delay। Sources: अंडा, दूध, दही, पनीर, fortified cereals। Strict vegetarian या vegan बच्चों को लगभग हमेशा supplement चाहिए। Iodine, zinc, omega-3 अगले gaps हैं; iodised नमक ज़्यादातर iodine ज़रूरत पूरी करता है।",
        "इस हफ्ते क्या करें। Red flag pattern देखें: थकान, पीली निचली पलक और हथेली, कम भूख, बार-बार infections, focus कमज़ोर, धीमी growth। दो या ज़्यादा हों तो paediatrician से CBC, ferritin, 25-OH-D और B12 test मांगें। Result के हिसाब से food-first fix करें। बिना test multi-vitamin शुरू न करें — ज़्यादा iron या Vitamin A कमी से भी ज़्यादा खतरनाक हो सकता है।",
      ],
      hinglish: [
        "Indian families mein ek paradox hai: bacha teen meal khata hai, plate bhari dikhti hai, bacha accha dikhta hai, phir bhi blood test mein iron, Vitamin D ya B12 ki kami nikalti hai. NFHS-5 data striking hai — Bharat mein 5 saal se chhote 67% bacche anaemic hain. Wajah yeh nahi ki hum kam khilate hain. Wajah hai KYA khilate hain aur shareer kaise absorb karta hai.",
        "Iron sabse aam kami hai aur focus, padhai aur behaviour se sabse mazbooti se juda hai. Raaz hai bioavailability. Maas, anda, machhli se heme iron 15-35% absorb hota hai. Daal, palak, ragi, rajma se non-heme iron sirf 2-10% absorb hota hai. Do simple tricks sab badal deti hain. Iron-rich khaane ke SAME meal mein Vitamin C — nimbu, amla, tamatar, capsicum, amrood — daalein. Yeh absorption 3-4 guna badhata hai. Aur iron meal ke ek ghante ke andar doodh, dahi, chai ya coffee mat dein — calcium aur tannins iron absorption ko sharply block karte hain.",
        "Vitamin D doosra silent crisis hai. Bharat mein 70-90% bacche deficient hain, dhoop bharpoor hote hue bhi. Kyon? Sunscreen, indoor play, peak sun mein school, dark skin ko zyaada sun chahiye, pollution. Fix dono chahiye: hafte mein 3-4 baar 15-20 minute dopahar ki dhoop khule haath aur pair par, AUR fortified foods ya tested supplement agar level kam hai. Supplement se pehle 25-OH-D test karwayein — dose kabhi guess mat karein.",
        "Vitamin B12 vegetarian families par sabse zyaada asar karta hai kyunki yeh mukhyatah animal foods mein hota hai. Lakshan sneaky hote hain: thakaan, chidchidaapan, kam bhookh, severe mein developmental delay. Sources: anda, doodh, dahi, paneer, fortified cereals. Strict vegetarian ya vegan bacchon ko lagbhag hamesha supplement chahiye. Iodine, zinc, omega-3 agle gaps hain; iodised namak zyaadatar iodine zarurat poori karta hai.",
        "Is hafte kya karein. Red flag pattern dekhein: thakaan, peeli nichli palak aur hatheli, kam bhookh, baar-baar infections, kamzor focus, dheemi growth. Do ya zyaada hon toh paediatrician se CBC, ferritin, 25-OH-D aur B12 test maango. Result ke hisaab se food-first fix karein. Bina test multi-vitamin shuru mat karein — zyaada iron ya Vitamin A kami se bhi zyaada khatarnaak ho sakta hai.",
      ],
    },
  }),
  L({
    id: "health-childhood-obesity",
    title: {
      en: "Childhood Weight Worry: The Family-First Way (No Diets, No Shame)",
      hi: "बच्चों का वज़न: पूरे परिवार का तरीका (कोई diet नहीं, कोई शर्म नहीं)",
      hinglish: "Bacchon ka Vazan: Pure Parivar ka Tarika (Diets Nahi, Sharam Nahi)",
    },
    description: {
      en: "AAP-aligned 5-2-1-0 plan, weight-neutral language, and what NOT to do at the table.",
      hi: "AAP-aligned 5-2-1-0 plan, weight-neutral भाषा, और table पर क्या नहीं करना है।",
      hinglish: "AAP-aligned 5-2-1-0 plan, weight-neutral language, aur table par kya NAHI karna hai.",
    },
    durationMin: 5, ageBucket: "5-7", emoji: "⚖️",
    expert: "Based on AAP 2023 Clinical Guideline & Ellyn Satter's Division of Responsibility",
    paragraphs: {
      en: [
        "Childhood obesity in India has tripled in twenty years. Urban children are now at the same risk as Western kids. But the way most families try to solve it — restriction, dieting, lecturing — actually backfires. Decades of research show kids who are dieted at home become MORE likely to develop weight problems and disordered eating in their teens. The solution from the 2023 American Academy of Pediatrics guideline is the opposite: family-based behaviour change, not child-targeted restriction.",
        "Rule one: language. Never talk about your child's body, weight, fat, size, or 'diet'. Not even kindly. Studies show parental weight comments — even loving ones — predict body dissatisfaction and disordered eating later. Talk instead about strong bodies, energy, what foods help us run, climb, and focus. The whole family plays. Nobody is on a diet.",
        "Rule two: the AAP-endorsed 5-2-1-0 daily target for the WHOLE family. Five servings of fruit and vegetables. Two hours or less of recreational screen time. One hour of active play. Zero sugary drinks — including juice, sweetened milk, sodas, energy drinks. This works because it focuses on what to ADD, not what to subtract.",
        "Rule three: Ellyn Satter's Division of Responsibility, the most-evidenced eating framework for children. Parents decide WHAT food is offered, WHEN it is offered, and WHERE it is eaten. The child decides WHETHER to eat it and HOW MUCH. No bribing, no forcing, no clearing the plate, no second-helping rules. Trust their hunger and fullness. Pressure increases the very behaviours you are trying to fix.",
        "Rule four: environment beats willpower every time. What is in the home gets eaten. Restock, do not police. Move sweets and chips out of sight. Keep a fruit bowl on the counter. Pre-cut vegetables for snacking. Family meals at the table — no screens — three times a week or more is one of the strongest evidence-based predictors of healthy weight. And finally: when to involve the doctor. If your child's BMI percentile is at or above the 95th, or if you see dark velvety skin in neck folds, snoring with pauses, knee pain, or rapid weight gain, ask your paediatrician for a proper assessment. This is medicine, not parenting failure.",
      ],
      hi: [
        "भारत में childhood obesity 20 साल में तीन गुना हो गई है। शहरी बच्चे अब Western kids जितने risk पर हैं। लेकिन ज़्यादातर families जो तरीका अपनाती हैं — restriction, diet, lecture — असल में backfire करता है। दशकों की research बताती है घर पर diet कराए गए बच्चों में teen ages में weight problems और disordered eating ज़्यादा होते हैं। 2023 AAP guideline का solution उल्टा है: परिवार-आधारित behaviour change, बच्चे-targeted restriction नहीं।",
        "Rule 1: भाषा। बच्चे के शरीर, वज़न, मोटाई, size या 'diet' पर बात कभी न करें — प्यार से भी नहीं। Studies दिखाती हैं parents के weight comments — caring वाले भी — बाद में body dissatisfaction और disordered eating predict करते हैं। बजाय बात करें मज़बूत शरीर, energy, कौन से foods हमें दौड़ने, चढ़ने, focus करने में मदद करते हैं। पूरा परिवार खेलता है। कोई diet पर नहीं है।",
        "Rule 2: AAP-endorsed 5-2-1-0 daily target — पूरे परिवार के लिए। 5 servings फल-सब्ज़ी। 2 घंटे या कम recreational screen time। 1 घंटा active play। Zero sugary drinks — juice, sweetened milk, sodas, energy drinks सहित। यह काम करता है क्योंकि focus जोड़ने पर है, घटाने पर नहीं।",
        "Rule 3: Ellyn Satter की Division of Responsibility — बच्चों के लिए सबसे evidence-based eating framework। माता-पिता तय करते हैं क्या खाना दिया जाता है, कब और कहाँ। बच्चा तय करता है खाना है या नहीं, और कितना। कोई bribery, कोई force, कोई 'plate खत्म करो', कोई second-helping rule नहीं। उनकी भूख और तृप्ति पर भरोसा करें। Pressure वही behaviours बढ़ाता है जो आप fix करना चाहते हैं।",
        "Rule 4: environment हर बार willpower को हरा देता है। घर में जो है वही खाया जाता है। Restock करें, police नहीं। मिठाई और chips नज़र से हटाएं। Counter पर फल का bowl रखें। सब्ज़ियाँ pre-cut करके snack के लिए रखें। Table पर family meals — बिना screen के — हफ्ते में 3+ बार healthy weight का सबसे मज़बूत evidence-based predictor है। और आख़िरी: doctor कब involve करें। अगर बच्चे का BMI percentile 95th या ज़्यादा है, या गर्दन पर काली velvety त्वचा, खर्राटे साथ pauses, घुटनों में दर्द, या तेज़ी से weight बढ़ रहा है — paediatrician से proper assessment मांगें। यह medicine है, parenting failure नहीं।",
      ],
      hinglish: [
        "Bharat mein childhood obesity 20 saal mein teen guna ho gayi hai. Urban bacche ab Western kids jitne risk par hain. Lekin zyaadatar families jo tarika apnaati hain — restriction, dieting, lecturing — asal mein backfire karta hai. Decades ki research dikhati hai ghar par diet karaye gaye bacchon mein teen years mein weight problems aur disordered eating ZYAADA likely hote hain. 2023 American Academy of Pediatrics guideline ka solution ulta hai: family-based behaviour change, child-targeted restriction nahi.",
        "Rule 1: language. Bachhe ke shareer, vazan, motai, size ya 'diet' par baat KABHI mat karein. Pyaar se bhi nahi. Studies dikhati hain parents ke weight comments — loving wale bhi — baad mein body dissatisfaction aur disordered eating predict karte hain. Bajaye baat karein mazboot bodies, energy, kaun se foods humein daudne, chadhne, focus karne mein madad karte hain. Pura parivar khelta hai. Koi diet par nahi hai.",
        "Rule 2: AAP-endorsed 5-2-1-0 daily target — pure parivar ke liye. 5 servings phal-sabzi. 2 ghante ya kam recreational screen time. 1 ghanta active play. Zero sugary drinks — juice, sweetened doodh, sodas, energy drinks ke saath. Yeh kaam karta hai kyunki focus JODNE par hai, ghatane par nahi.",
        "Rule 3: Ellyn Satter ki Division of Responsibility — bacchon ke liye sabse evidence-based eating framework. Parents tay karte hain KYA khaana diya jaata hai, KAB diya jaata hai, KAHAN khaaya jaata hai. Bacha tay karta hai khaana hai ya nahi, aur kitna. Koi bribing nahi, koi forcing nahi, koi 'plate khatam karo' nahi, koi second-helping rule nahi. Unki bhookh aur fullness par bharosa karein. Pressure unhi behaviours ko badhata hai jo aap fix karna chahte hain.",
        "Rule 4: environment har baar willpower ko haraata hai. Ghar mein jo hai wahi khaaya jaata hai. Restock karein, police mat karein. Mithai aur chips najar se hatayein. Counter par phal ka bowl rakhein. Sabziyan pre-cut karke snack ke liye rakhein. Table par family meals — bina screen ke — hafte mein 3+ baar healthy weight ka sabse mazboot evidence-based predictor hai. Aur aakhri: doctor kab involve karein. Agar bacche ka BMI percentile 95th par ya zyaada hai, ya gardan ki silwaton mein kaali velvety skin, snoring with pauses, ghutnon mein dard, ya tezi se weight badh raha hai — paediatrician se proper assessment maango. Yeh medicine hai, parenting failure nahi.",
      ],
    },
  }),
  L({
    id: "health-digital-eyes-posture",
    title: {
      en: "Digital Health Beyond Addiction: Eyes, Posture & Sleep",
      hi: "Addiction से आगे Digital Health: आँखें, posture और नींद",
      hinglish: "Addiction se Aage Digital Health: Aankhein, Posture aur Neend",
    },
    description: {
      en: "20-20-20, the outdoor-time myopia shield, tech-neck, and the no-screen-1-hr-before-bed rule.",
      hi: "20-20-20, बाहर का समय और myopia, tech-neck, और सोने से 1 घंटे पहले no-screen का rule।",
      hinglish: "20-20-20, outdoor time aur myopia shield, tech-neck, aur no-screen-1-hr-before-bed rule.",
    },
    durationMin: 5, ageBucket: "5-7", emoji: "👀",
    expert: "Based on AAP/AAO Joint Statement & All India Ophthalmological Society",
    paragraphs: {
      en: [
        "We talk about screen time as if the only worry is addiction. The bigger silent damage is to the eyes, posture, and sleep of growing kids. Childhood myopia is an epidemic — Asian populations are heading to 80 percent short-sightedness by adulthood. India is on the same curve. The good news: the science of how to protect children is now very clear.",
        "Habit one: the 20-20-20 rule, taught as a game. Every 20 minutes of screen, take a 20-second break and look at something 20 feet away. Why? Up-close focusing for long stretches is the strongest known driver of myopia progression. Set a soft alarm. Make it a family ritual at the dinner table screen-time window. Even a 20-second break resets the focusing muscles.",
        "Habit two: at least 2 hours of daylight outdoor exposure every day. This is the single most-evidenced myopia-protection factor we have. Bright daylight stimulates dopamine release in the retina, which slows the eyeball's elongation that causes short-sight. It does not need to be exercise — even reading outdoors helps. Take walks. Eat a snack on the balcony. Find an outdoor sport.",
        "Habit three: distance and posture. Tablets and phones at arm's length. Top of the monitor at eye level so the head is not tilted down. Feet flat on the floor. Why does it matter? A head tilted forward by 60 degrees puts 27 kilograms of load on a developing cervical spine. Years of this leads to 'tech-neck', headaches, and chronic pain by the teen years. Big screens at proper distance are vastly better for eyes than small screens held close.",
        "Habit four: no screens for one full hour before bed. Bright screen light suppresses melatonin and delays sleep onset by 30 to 60 minutes in children. Worse, the type of content — fast-cut, exciting, social — keeps the brain aroused. Replace the last hour with a wind-down ritual: warm bath, dim lights, reading aloud, gentle stretches, music. And when to see an eye doctor: if your child squints, sits very close to screens or books, tilts their head while reading, complains of headaches, or has a sudden drop in school marks — get a pediatric optometrist appointment. Most childhood vision problems are easily corrected, but only if caught.",
      ],
      hi: [
        "हम screen time के बारे में ऐसे बात करते हैं जैसे एकमात्र चिंता addiction है। बड़ा silent नुकसान बढ़ते बच्चों की आँखों, posture और नींद को होता है। Childhood myopia एक epidemic है — एशियाई आबादी adulthood तक 80% short-sightedness की तरफ जा रही है। भारत भी उसी curve पर है। अच्छी खबर: बच्चों की रक्षा का science अब बहुत साफ़ है।",
        "आदत 1: 20-20-20 rule — game की तरह सिखाएं। हर 20 मिनट screen पर, 20 second का break और 20 feet दूर देखें। क्यों? लंबे समय तक पास focus करना myopia बढ़ाने का सबसे बड़ा driver है। एक soft alarm रखें। Family ritual बनाएं। 20 second का break भी focusing muscles को reset करता है।",
        "आदत 2: रोज़ कम से कम 2 घंटे की धूप वाली बाहर की activity। यह myopia-protection का सबसे evidence-based factor है। तेज़ धूप retina में dopamine release करती है जो eyeball की वो elongation धीमी करती है जो short-sight करती है। Exercise ज़रूरी नहीं — बाहर पढ़ना भी मदद करता है। टहलें, balcony पर snack खाएं, outdoor sport खोजें।",
        "आदत 3: दूरी और posture। Tablet और phone arm's length पर। Monitor का top eye level पर ताकि सिर नीचे न झुके। पैर ज़मीन पर flat। क्यों matter? 60 degree आगे झुका सिर developing cervical spine पर 27 kg load डालता है। सालों यही = teen years तक 'tech-neck', headaches, chronic pain। Proper distance पर बड़ी screens — पास रखी छोटी screens से आँखों के लिए बहुत बेहतर।",
        "आदत 4: सोने से ठीक 1 घंटे पहले कोई screen नहीं। तेज़ screen light melatonin दबाती है और बच्चों में sleep onset 30-60 मिनट देर करती है। Worse, content का type — fast-cut, exciting, social — brain को aroused रखता है। आख़िरी घंटा wind-down ritual से बदलें: गर्म स्नान, dim lights, ज़ोर से पढ़ाना, gentle stretches, music। Eye doctor कब दिखाएँ: बच्चा squint करे, screen या book बहुत पास रखे, पढ़ते समय सिर tilt करे, headaches की शिकायत करे, या marks में अचानक गिरावट हो — pediatric optometrist के पास जाएं। बचपन की ज़्यादातर vision problems आसानी से ठीक होती हैं, बशर्ते pakdi जाएं।",
      ],
      hinglish: [
        "Hum screen time ke baare mein aise baat karte hain jaise ek hi chinta addiction hai. Bada silent nuksaan badhte bacchon ki aankhon, posture aur neend ko hota hai. Childhood myopia ek epidemic hai — Asian populations adulthood tak 80% short-sightedness ki taraf ja rahi hain. Bharat bhi usi curve par hai. Achi khabar: bacchon ki raksha ka science ab bahut clear hai.",
        "Aadat 1: 20-20-20 rule, game ki tarah sikhayein. Har 20 minute screen par, 20-second ka break aur 20 feet door dekho. Kyon? Lambe samay tak paas focus karna myopia badhane ka sabse bada known driver hai. Ek soft alarm rakhein. Family ritual banayein dinner ke screen-time window mein. 20-second ka break bhi focusing muscles ko reset karta hai.",
        "Aadat 2: roz kam se kam 2 ghante ki dhoop wali bahar ki activity. Yeh myopia-protection ka sabse evidence-based factor hai. Tez dhoop retina mein dopamine release karti hai jo eyeball ki woh elongation dheemi karti hai jo short-sight karti hai. Exercise zaruri nahi — bahar padhna bhi madad karta hai. Tahlein, balcony par snack khayein, ek outdoor sport khojein.",
        "Aadat 3: doori aur posture. Tablet aur phone arm's length par. Monitor ka top eye-level par taaki sar neeche na jhuke. Pair zameen par flat. Kyon matter? 60 degree aage jhuka sar developing cervical spine par 27 kg load daalta hai. Saalon yahi = teen years tak 'tech-neck', headaches, chronic pain. Proper distance par badi screens — paas rakhi chhoti screens se aankhon ke liye bahut behtar.",
        "Aadat 4: sone se theek 1 ghante pehle koi screen nahi. Tez screen light melatonin dabati hai aur bacchon mein sleep onset 30-60 minute der karti hai. Worse, content ka type — fast-cut, exciting, social — brain ko aroused rakhta hai. Aakhri ghanta wind-down ritual se badlein: garam snaan, dim lights, zor se padhna, gentle stretches, music. Eye doctor kab dikhayein: bacha squint kare, screen ya kitaab bahut paas rakhe, padhte samay sar tilt kare, headaches ki shikayat kare, ya marks mein achanak girawat ho — pediatric optometrist ke paas jayein. Bachpan ki zyaadatar vision problems aasani se theek hoti hain, bashart pakdi jayein.",
      ],
    },
  }),
];

export const AGE_LABELS: Record<AgeBucket, Record<LangCode, string>> = {
  "0-2": { en: "0–2 years (infant)", hi: "0–2 साल (शिशु)", hinglish: "0–2 saal (infant)" },
  "2-4": { en: "2–4 years (toddler)", hi: "2–4 साल (toddler)", hinglish: "2–4 saal (toddler)" },
  "5-7": { en: "5–7 years (early school)", hi: "5–7 साल (शुरुआती स्कूल)", hinglish: "5–7 saal (early school)" },
  "8-10": { en: "8–10 years (tween)", hi: "8–10 साल (tween)", hinglish: "8–10 saal (tween)" },
  "10+": { en: "10+ years (tween / teen)", hi: "10+ साल (teen)", hinglish: "10+ saal (teen)" },
};

export function getAgeLabel(bucket: AgeBucket, lang: string): string {
  const l: LangCode = lang === "hi" ? "hi" : lang === "hinglish" ? "hinglish" : "en";
  return AGE_LABELS[bucket][l];
}

export function lessonsForAge(age: AgeBucket): Lesson[] {
  return LESSONS.filter((l) => l.ageBucket === age);
}
