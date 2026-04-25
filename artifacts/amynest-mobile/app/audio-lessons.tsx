import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated,
  Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { brand } from "@/constants/colors";
import * as Haptics from "expo-haptics";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useAmyVoice } from "@/hooks/useAmyVoice";

// Hindi Amy voice — eleven_multilingual_v2 handles Devanagari natively.
// Swap the voice ID for any Indian-accent voice (e.g. Priya, Meera) if desired.
const AMY_VOICE_HINDI    = "21m00Tcm4TlvDq8ikWAM"; // Rachel via multilingual model
const MODEL_MULTILINGUAL = "eleven_multilingual_v2";

function formatTime(secs: number): string {
  const s = Math.round(secs);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

// ── Lesson data — trilingual ───────────────────────────────────────────────
type AgeBucket = "0-2" | "2-4" | "5-7" | "8-10" | "10+";
type LangCode = "en" | "hi" | "hinglish";

interface MultiScript { en: string; hi: string; hinglish: string }
interface MultiText   { en: string; hi: string; hinglish: string }

interface Lesson {
  id: string;
  title: MultiText;
  age: AgeBucket;
  duration: string;
  emoji: string;
  scripts: MultiScript;
}

function getScript(l: Lesson, lang: string): string {
  const k: LangCode = lang === "hi" ? "hi" : lang === "hinglish" ? "hinglish" : "en";
  return l.scripts[k];
}
function getTitle(l: Lesson, lang: string): string {
  const k: LangCode = lang === "hi" ? "hi" : lang === "hinglish" ? "hinglish" : "en";
  return l.title[k];
}

const LESSONS: Lesson[] = [
  // 0-2 ──────────────────────────────────────────────────────────────────
  {
    id: "a1",
    title: { en: "Newborn Sleep Cycles", hi: "नवजात की नींद के चक्र", hinglish: "Newborn Sleep Cycles" },
    age: "0-2", duration: "4 min", emoji: "😴",
    scripts: {
      en: "Newborns sleep 14–17 hours a day in short bursts of 45–90 minutes. Their sleep cycles are shorter than adults — about 50 minutes — which is why they wake so often. The best thing you can do is follow their cues. Watch for eye-rubbing, yawning, or looking away. Responding quickly prevents overtiredness, which actually makes sleep harder. A consistent pre-sleep routine — dim lights, a warm bath, a soft song — begins building sleep associations from week 4 onwards.",
      hi: "नवजात शिशु दिन में 14-17 घंटे सोते हैं — 45-90 मिनट के छोटे-छोटे periods में। उनके sleep cycles वयस्कों से छोटे होते हैं (लगभग 50 मिनट), इसीलिए वे अक्सर जागते हैं। सबसे अच्छा तरीका है उनके संकेतों को follow करना — आँखें मलना, जम्हाई लेना या मुँह फेरना। जल्दी respond करने से overtiredness रुकती है जो नींद और मुश्किल बना देती है। Week 4 से एक consistent pre-sleep routine शुरू करें — मद्धिम रोशनी, गर्म स्नान, धीमा गाना।",
      hinglish: "Newborns din mein 14-17 ghante sote hain — 45-90 minute ke chhote bursts mein. Unke sleep cycles adults se chhote hote hain (lagbhag 50 minute), isliye woh aksar jagte hain. Sabse accha hai unke cues follow karna — aankhen malana, jamhaayi lena ya muh pherna. Jaldi respond karna overtiredness rokta hai jo neend aur mushkil banati hai. Week 4 se ek consistent pre-sleep routine shuru karein — maddham roshni, garam nahaana, dheema gaana.",
    },
  },
  {
    id: "a2",
    title: { en: "Tummy Time Basics", hi: "टमी टाइम की बुनियाद", hinglish: "Tummy Time Basics" },
    age: "0-2", duration: "3 min", emoji: "🐢",
    scripts: {
      en: "Tummy time builds the neck, shoulder, and core muscles babies need to roll, sit, and crawl. Start with 2–3 minutes, 2–3 times a day, from the very first week home. Use a rolled towel under the chest for support. Make it fun: lie face-to-face with your baby, use a mirror, or place a high-contrast toy in front. By 4 months, most babies can lift their head 90 degrees. If your baby hates it, try tummy time on your chest or lap first.",
      hi: "Tummy time से बच्चे की गर्दन, कंधे और core muscles बनती हैं जो बाद में करवट लेने, बैठने और रेंगने के लिए जरूरी हैं। घर आने के पहले हफ्ते से शुरू करें — दिन में 2-3 बार, 2-3 मिनट। Support के लिए सीने के नीचे मुड़ा हुआ तौलिया रखें। इसे मज़ेदार बनाएं: आमने-सामने लेटें, आईना इस्तेमाल करें या high-contrast खिलौना सामने रखें। 4 महीने तक ज़्यादातर बच्चे सिर 90 डिग्री उठा सकते हैं। अगर बच्चा पसंद न करे तो अपने सीने पर rummy time try करें।",
      hinglish: "Tummy time se baby ki gardan, kandhe aur core muscles banti hain jo baad mein palatne, baithne aur ghutnon ke balne ke liye zaruri hain. Ghar aane ke pehle hafte se shuru karein — din mein 2-3 baar, 2-3 minute. Support ke liye seene ke neeche moda hua towel rakhein. Ise mazedaar banayein: aamnae-samnae letein, mirror use karein ya high-contrast toy saamne rakhein. 4 mahine tak zyaadatar bacche sar 90 degree uthaa lete hain. Agar baccha pasand na kare toh apne seene par tummy time try karein.",
    },
  },
  {
    id: "a3",
    title: { en: "Responsive Feeding", hi: "बच्चे के संकेतों पर दूध पिलाना", hinglish: "Responsive Feeding" },
    age: "0-2", duration: "3 min", emoji: "🍼",
    scripts: {
      en: "Responsive feeding means following your baby's hunger and fullness cues rather than a strict schedule. Look for rooting, sucking motions, or hands moving toward the mouth as early hunger signals — crying is a late cue. Feed until satisfied, not until a bottle is empty. This builds a healthy relationship with food and trust. Research shows responsive feeding is linked to better self-regulation, healthy weight, and stronger attachment.",
      hi: "Responsive feeding का मतलब है बच्चे के भूख और तृप्ति के संकेतों को follow करना — घड़ी के schedule को नहीं। Rooting, चूसने की हरकत या हाथ मुँह की तरफ जाना शुरुआती भूख के संकेत हैं — रोना देर का संकेत है। जब तक संतुष्ट न हो तब तक खिलाएं, बोतल खाली होने तक नहीं। इससे खाने के साथ healthy रिश्ता और trust बनता है। Research बताती है responsive feeding बेहतर self-regulation, healthy weight और मजबूत attachment से जुड़ी है।",
      hinglish: "Responsive feeding matlab hai baby ke bhooke aur pet bhare hone ke signs follow karna — strict schedule nahi. Rooting, chusne ki harkat ya haath muh ki taraf jaana early hunger ke signs hain — rona late cue hai. Jab tak satisfied na ho tab tak khilayein, bottle khaali hone tak nahi. Isse khaane ke saath healthy rishta aur trust banta hai. Research batati hai responsive feeding behtar self-regulation, healthy weight aur mazboot attachment se judi hai.",
    },
  },

  // 2-4 ──────────────────────────────────────────────────────────────────
  {
    id: "b1",
    title: { en: "Toddler Tantrums", hi: "Toddler का Tantrum", hinglish: "Toddler Tantrums" },
    age: "2-4", duration: "4 min", emoji: "😤",
    scripts: {
      en: "Tantrums peak between ages 2 and 3 because children have big emotions but immature prefrontal cortices — the part of the brain that manages them. The most effective response is calm consistency. Stay close, name the emotion: 'You're really frustrated.' Don't try to reason mid-tantrum — the thinking brain is offline. After it passes, reconnect with a hug, then briefly discuss what happened. Prevention: hunger, tiredness, and overstimulation are the biggest triggers. Two-minute warnings before transitions help enormously.",
      hi: "Tantrum 2-3 साल में सबसे ज्यादा होते हैं क्योंकि बच्चों में बड़ी भावनाएं होती हैं पर prefrontal cortex अभी अविकसित होता है। सबसे effective response है शांत consistency। पास रहें, emotion को नाम दें: 'तुम बहुत frustrated हो।' Tantrum के बीच में reason न करें — सोचने वाला brain offline होता है। बाद में गले लगाएं और briefly बात करें। बचाव: भूख, थकान और overstimulation सबसे बड़े triggers हैं। Transition से 2 मिनट पहले warning बहुत मदद करती है।",
      hinglish: "Tantrum 2-3 saal mein sabse zyaada hote hain kyunki bachon mein badi feelings hoti hain par prefrontal cortex abhi immature hota hai. Sabse effective response hai shant consistency. Paas rahein, emotion ko naam dein: 'Tum bahut frustrated ho.' Tantrum ke beech reason na karein — sochne wala brain offline hota hai. Baad mein gale lagayein aur briefly baat karein. Prevention: bhoookh, thakaan aur overstimulation sabse bade triggers hain. Transition se 2 minute pehle warning bahut madad karti hai.",
    },
  },
  {
    id: "b2",
    title: { en: "Language Explosion", hi: "भाषा का विस्फोट", hinglish: "Language Explosion" },
    age: "2-4", duration: "3 min", emoji: "💬",
    scripts: {
      en: "Between 18 months and 3 years, most children add up to 10 new words a day. The single biggest predictor of vocabulary size is how much parents talk to and with their child — not at them. Use parallel talk: narrate what you both are doing. Expand their sentences: if they say 'more milk', you say 'you want more milk, here you go'. Read together daily — even the same books repeatedly. Dual-language children may mix languages, which is completely normal and a cognitive advantage.",
      hi: "18 महीने से 3 साल के बीच ज्यादातर बच्चे रोज़ 10 नए शब्द सीखते हैं। Vocabulary का सबसे बड़ा predictor है माता-पिता कितना बच्चे से बात करते हैं — उन पर नहीं। Parallel talk करें: जो आप दोनों कर रहे हैं उसे narrate करें। उनके sentences expand करें: अगर वे 'aur doodh' कहते हैं तो आप कहें 'तुम aur doodh chahte ho, lo'। रोज़ साथ पढ़ें — एक ही किताब बार-बार भी ठीक है। दो भाषाओं वाले बच्चे भाषाएं mix कर सकते हैं — यह बिल्कुल normal और cognitive advantage है।",
      hinglish: "18 mahine se 3 saal ke beech zyaadatar bacche roz 10 naye words seekhte hain. Vocabulary ka sabse bada predictor hai parents kitna bacche se baat karte hain — unpar nahi. Parallel talk karein: jo aap dono kar rahe hain use narrate karein. Unke sentences expand karein: agar woh 'aur doodh' kehte hain toh aap kahein 'tum aur doodh chahte ho, lo'. Roz saath padhein — ek hi kitaab baar baar bhi theek hai. Do bhashao wale bacche languages mix kar sakte hain — yeh bilkul normal aur cognitive advantage hai.",
    },
  },
  {
    id: "b3",
    title: { en: "Screen Time for Toddlers", hi: "Toddlers के लिए Screen Time", hinglish: "Toddlers ke liye Screen Time" },
    age: "2-4", duration: "3 min", emoji: "📱",
    scripts: {
      en: "WHO and AAP guidelines suggest under 1 hour of high-quality screen time per day for ages 2–5, with a parent present when possible. The problem isn't screens — it's displacement of talk, play, and sleep. Video chat with grandparents counts as quality screen time. Educational apps with two-way interaction (where the child must respond) are better than passive watching. The best habit: no screens 1 hour before bedtime, no screens during meals, and always discuss what you watched together.",
      hi: "WHO और AAP guidelines 2-5 साल के बच्चों के लिए रोज़ 1 घंटे से कम high-quality screen time suggest करते हैं — अगर हो सके तो parent साथ हो। Problem screens नहीं हैं — बात, खेल और नींद का displacement है। दादा-दादी से video call quality screen time में गिना जाता है। Two-way interaction वाले educational apps passive देखने से बेहतर हैं। Best habit: सोने से 1 घंटे पहले screen नहीं, खाने के दौरान screen नहीं, और हमेशा साथ में discuss करें।",
      hinglish: "WHO aur AAP guidelines 2-5 saal ke bachon ke liye roz 1 ghante se kam high-quality screen time suggest karte hain — ho sake toh parent saath ho. Problem screens nahi hai — baat, khel aur neend ka displacement hai. Daada-daadi se video call quality screen time mein count hoti hai. Two-way interaction wale educational apps passive dekhne se behtar hain. Best habit: sone se 1 ghante pehle screen nahi, khaane ke dauran screen nahi, aur hamesha saath discuss karein.",
    },
  },

  // 5-7 ──────────────────────────────────────────────────────────────────
  {
    id: "c1",
    title: { en: "Building Reading Habits", hi: "पढ़ने की आदत बनाना", hinglish: "Reading Habits Banana" },
    age: "5-7", duration: "4 min", emoji: "📚",
    scripts: {
      en: "The 5–7 window is when children move from learning to read to reading to learn — a critical transition. Reading aloud together even after children can read independently accelerates vocabulary and comprehension. Create a reading ritual: same time daily, cozy spot, no pressure to read perfectly. Let children choose books. Comic books and non-fiction count. Libraries remove cost as a barrier. Research shows children who read for 20 minutes a day are exposed to 1.8 million words a year more than those who don't.",
      hi: "5-7 साल का दौर वह है जब बच्चे पढ़ना सीखने से पढ़कर सीखने की तरफ जाते हैं। साथ ज़ोर से पढ़ना vocabulary और comprehension बढ़ाता है — जब बच्चा खुद पढ़ सकता हो तब भी। एक reading ritual बनाएं: रोज़ एक ही समय, आरामदेह जगह, कोई pressure नहीं। बच्चों को किताब चुनने दें। Comics और non-fiction भी count होती हैं। Research बताती है जो बच्चे रोज़ 20 मिनट पढ़ते हैं उन्हें साल में 18 लाख ज़्यादा words मिलते हैं।",
      hinglish: "5-7 saal ka daur woh hai jab bacche padhna seekhne se pad'hkar seekhne ki taraf jaate hain. Saath zor se padhna vocabulary aur comprehension badhata hai — jab baccha khud padh sakta ho tab bhi. Ek reading ritual banayein: roz ek hi waqt, aaram'deha jagah, koi pressure nahi. Bachon ko kitaab chunne dein. Comics aur non-fiction bhi count hoti hain. Research batati hai jo bacche roz 20 minute padhte hain unhe saal mein 18 lakh zyaada words milte hain.",
    },
  },
  {
    id: "c2",
    title: { en: "School Anxiety", hi: "स्कूल की चिंता", hinglish: "School Anxiety" },
    age: "5-7", duration: "4 min", emoji: "🎒",
    scripts: {
      en: "School anxiety is very common in the 5–7 range during transitions — new school year, new teacher, or after illness. Validate the feeling first: 'It makes sense you feel nervous.' Avoid excessive reassurance loops (which backfire) and instead focus on coping: 'What's one thing that might be okay today?' Maintain a predictable morning routine — chaos amplifies anxiety. Coordinate with the teacher for a check-in strategy. If avoidance is severe or physical symptoms appear regularly, consult a paediatric psychologist.",
      hi: "5-7 साल में school anxiety बहुत सामान्य है — खासकर transition में: नया school year, नया teacher या बीमारी के बाद। पहले feeling को validate करें: 'यह समझ में आता है कि तुम nervous हो।' ज़्यादा reassurance से बचें (उल्टा असर होता है) — बजाय coping पर focus करें: 'एक चीज़ जो आज ठीक हो सकती है वह क्या है?' Morning routine predictable रखें। Teacher के साथ check-in strategy तय करें। अगर avoidance गंभीर हो या regular physical symptoms आएं तो paediatric psychologist से मिलें।",
      hinglish: "5-7 saal mein school anxiety bahut saamaan hai — khaaskar transition mein: naya school year, naya teacher ya beemar'i ke baad. Pehle feeling validate karein: 'Yeh samajh mein aata hai ki tum nervous ho.' Zyaada reassurance se bachein (ulta asar hota hai) — bajaye coping par focus karein: 'Ek cheez jo aaj theek ho sakti hai woh kya hai?' Morning routine predictable rakhein. Teacher ke saath check-in strategy tay karein. Agar avoidance gambhir ho ya regular physical symptoms aayen toh paediatric psychologist se milein.",
    },
  },
  {
    id: "c3",
    title: { en: "Emotional Coaching", hi: "Emotional Coaching", hinglish: "Emotional Coaching" },
    age: "5-7", duration: "4 min", emoji: "❤️",
    scripts: {
      en: "Emotional coaching is the parenting approach most strongly linked to children's social competence and academic achievement. It has 5 steps: notice the emotion, see it as a teaching moment, listen and validate, name the emotion, and then problem-solve together. The opposite — dismissing ('You're fine') or punishing emotions ('Stop crying or I'll give you something to cry about') — suppresses emotional development. Children who are emotionally coached show better stress responses, stronger friendships, and lower rates of anxiety and depression.",
      hi: "Emotional coaching वह parenting approach है जो बच्चों की social competence और academic achievement से सबसे ज्यादा जुड़ी है। इसके 5 कदम हैं: emotion को notice करना, इसे teaching moment मानना, सुनना और validate करना, emotion को नाम देना, फिर साथ problem-solve करना। विपरीत — dismiss करना ('तुम ठीक हो') या emotions को punish करना — emotional development को दबाता है। Emotionally coached बच्चे बेहतर stress response, मज़बूत दोस्तियाँ और कम anxiety दिखाते हैं।",
      hinglish: "Emotional coaching woh parenting approach hai jo bachon ki social competence aur academic achievement se sabse zyaada judi hai. Iske 5 kadam hain: emotion ko notice karna, ise teaching moment maanna, sunna aur validate karna, emotion ko naam dena, phir saath problem-solve karna. Ulta — dismiss karna ('tum theek ho') ya emotions punish karna — emotional development ko dabata hai. Emotionally coached bacche behtar stress response, mazboot dostiyaan aur kam anxiety dikhate hain.",
    },
  },

  // 8-10 ─────────────────────────────────────────────────────────────────
  {
    id: "d1",
    title: { en: "Homework Motivation", hi: "Homework की Motivation", hinglish: "Homework Motivation" },
    age: "8-10", duration: "4 min", emoji: "✏️",
    scripts: {
      en: "Motivation research consistently shows that autonomy, competence, and connection drive intrinsic motivation better than rewards and punishments. For homework: let children choose when and where within limits ('you can do it before or after dinner'). Break large tasks into 20-minute chunks. Celebrate effort and strategy, not just results: 'You really stuck with that hard problem.' Avoid hovering — struggle is where learning happens. If power struggles are chronic, speak with the teacher about workload or check for an undiagnosed learning difference.",
      hi: "Motivation research बताती है कि autonomy, competence और connection rewards और punishments से बेहतर intrinsic motivation drive करते हैं। Homework के लिए: limits के अंदर बच्चे को choose करने दें ('dinner से पहले या बाद में करो')। बड़े tasks को 20-20 मिनट में तोड़ें। Result ही नहीं, effort और strategy celebrate करें: 'तुमने वह मुश्किल problem नहीं छोड़ी।' Hover करने से बचें — struggle ही learning होती है। अगर power struggles chronic हों तो teacher से workload के बारे में बात करें।",
      hinglish: "Motivation research batati hai ki autonomy, competence aur connection rewards aur punishments se behtar intrinsic motivation drive karte hain. Homework ke liye: limits ke andar bacche ko choose karne dein ('dinner se pehle ya baad mein karo'). Bade tasks ko 20-20 minute mein todein. Result hi nahi, effort aur strategy celebrate karein: 'Tum'ne woh mushkil problem nahi chhhodi.' Hover karne se bachein — struggle hi learning hai. Agar power struggles chronic hon toh teacher se workload ke baare mein baat karein.",
    },
  },
  {
    id: "d2",
    title: { en: "Peer Pressure & Friendships", hi: "Peer Pressure और दोस्ती", hinglish: "Peer Pressure aur Dosti" },
    age: "8-10", duration: "3 min", emoji: "👫",
    scripts: {
      en: "Ages 8–10 mark the shift from family as the primary social world to peers. Children this age are intensely concerned with belonging. Build a strong home base: regular one-on-one time, open dinner conversations, and genuine interest in their social world without interrogating. Teach the 'broken record' technique for peer pressure: simply repeat your position calmly. Help them identify at least one trusted adult at school. Research shows children with even one close friendship have dramatically better mental health outcomes.",
      hi: "8-10 साल की उम्र में family से peers की तरफ primary social world shift होती है। इस उम्र के बच्चे belong करने की गहरी चिंता रखते हैं। एक मज़बूत घरेलू base बनाएं: regular 1:1 time, खुली dinner conversations और उनकी social दुनिया में genuine दिलचस्पी — पूछताछ नहीं। Peer pressure के लिए 'broken record' technique सिखाएं: शांति से अपनी बात repeat करते रहें। School में कम से कम एक trusted adult identify करने में मदद करें। Research बताती है एक भी close friendship होने से mental health बहुत बेहतर होती है।",
      hinglish: "8-10 saal mein family se peers ki taraf primary social world shift hoti hai. Is umra ke bacche belong karne ki gehri chinta rakhte hain. Ek mazboot ghar ka base banayein: regular 1:1 time, khuli dinner baatein aur unki social duniya mein genuine dilchaspi — poochhataach nahi. Peer pressure ke liye 'broken record' technique sikhayen: shanti se apni baat repeat karte rahein. School mein kam se kam ek trusted adult identify karne mein madad karein. Research batati hai ek bhi close friendship hone se mental health bahut behtar hoti hai.",
    },
  },

  // 10+ ──────────────────────────────────────────────────────────────────
  {
    id: "e1",
    title: { en: "Talking to Teens", hi: "Teens से बात करना", hinglish: "Teens se Baat Karna" },
    age: "10+", duration: "5 min", emoji: "🎧",
    scripts: {
      en: "The teenage brain prioritises peer opinion and novelty because the reward system develops earlier than the prefrontal cortex. This makes risk-taking and peer influence peak behaviours — not defiance. The most predictive factor of teen wellbeing is whether they feel they can come to a parent without being lectured. Practice the 20-second rule: listen for at least 20 seconds before speaking. Ask open questions. Share your own experiences non-judgementally. Repair after arguments quickly — 'I got frustrated and I could have listened better.'",
      hi: "Teenage brain peer opinion और novelty को priority देता है क्योंकि reward system prefrontal cortex से पहले develop होता है। इससे risk-taking और peer influence peak behaviours बनते हैं — defiance नहीं। Teen wellbeing का सबसे बड़ा predictor यह है कि क्या वे बिना lecture के parent के पास आ सकते हैं। 20-second rule practice करें: बोलने से पहले कम से कम 20 सेकंड सुनें। Open questions पूछें। अपने अनुभव non-judgementally share करें। झगड़े के बाद जल्दी repair करें — 'मुझे frustration आ गया और मैं बेहतर सुन सकता था।'",
      hinglish: "Teenage brain peer opinion aur novelty ko priority deta hai kyunki reward system prefrontal cortex se pehle develop hota hai. Isse risk-taking aur peer influence peak behaviours bante hain — defiance nahi. Teen wellbeing ka sabse bada predictor yeh hai ki kya woh bina lecture ke parent ke paas aa sakte hain. 20-second rule practice karein: bolne se pehle kam se kam 20 second sunein. Open questions puchein. Apne anubhav non-judgementally share karein. Jhagde ke baad jaldi repair karein — 'Mujhe frustration aa gaya aur main behtar sun sakta tha.'",
    },
  },
  {
    id: "e2",
    title: { en: "Digital Safety for Older Kids", hi: "बड़े बच्चों के लिए Digital Safety", hinglish: "Bade Bachon ke liye Digital Safety" },
    age: "10+", duration: "4 min", emoji: "🔒",
    scripts: {
      en: "Research on digital wellbeing shows that rules without explanation backfire with older children. Instead, co-create agreements: what platforms, how long, where devices sleep at night (not in bedrooms). Teach them to evaluate sources, spot manipulation, and protect their personal information. Have explicit conversations about sexting and its legal consequences before they encounter pressure — studies show this reduces incidence. Model the behaviour you want: phones away at meals, no scrolling while talking.",
      hi: "Digital wellbeing की research बताती है कि explanation के बिना rules older बच्चों पर उल्टा असर डालते हैं। बजाय इसके, साथ मिलकर agreements बनाएं: कौन से platforms, कितनी देर, रात को devices कहाँ रहें (bedroom में नहीं)। Sources evaluate करना, manipulation पहचानना और personal information protect करना सिखाएं। Sexting और उसके legal consequences के बारे में pressure आने से पहले बात करें — studies इसका incidence कम दिखाती हैं। जो behavior चाहते हैं खुद वैसा करें।",
      hinglish: "Digital wellbeing ki research batati hai ki explanation ke bina rules older bachon par ulta asar dalte hain. Bajaye, saath milkar agreements banayein: kaun se platforms, kitni der, raat ko devices kahan rahein (bedroom mein nahi). Sources evaluate karna, manipulation pahchanna aur personal information protect karna sikhayen. Sexting aur uske legal consequences ke baare mein pressure aane se pehle baat karein — studies iska incidence kam dikhati hain. Jo behavior chahte hain khud waisa karein.",
    },
  },
  {
    id: "e3",
    title: { en: "Supporting Teen Mental Health", hi: "Teen के Mental Health को Support करें", hinglish: "Teen ke Mental Health ko Support Karein" },
    age: "10+", duration: "5 min", emoji: "🌱",
    scripts: {
      en: "1 in 5 teenagers experience a mental health condition — most go undetected and untreated. Warning signs include: persistent sadness or irritability, social withdrawal, sleep changes, declining grades, giving away possessions. If you're concerned, say so directly: 'I've noticed you seem down lately. I'm not going anywhere — I want to understand.' Avoid minimising ('everyone feels like that') or catastrophising. Seek assessment early; most conditions respond well to therapy when caught before they're entrenched. Your relationship is the most protective factor.",
      hi: "5 में से 1 किशोर mental health condition experience करता है — ज्यादातर undetected और untreated रहते हैं। Warning signs: लगातार उदासी या चिड़चिड़ापन, social withdrawal, नींद में बदलाव, grades गिरना, चीज़ें दूसरों को देना। अगर चिंतित हैं तो सीधे बोलें: 'मैंने देखा है तुम कुछ time से ठीक नहीं लग रहे। मैं कहीं नहीं जा रहा — समझना चाहता हूं।' Minimise या catastrophise न करें। जल्दी assessment लें — जल्दी catch होने पर ज्यादातर conditions therapy से ठीक होती हैं।",
      hinglish: "5 mein se 1 teenager mental health condition experience karta hai — zyaadatar undetected aur untreated rehte hain. Warning signs: lagaataar udaasi ya chidchidaapan, social withdrawal, neend mein badlaav, grades girna, cheezein doosron ko dena. Agar chintit hain toh seedha bolein: 'Mujhe dikha hai tum kuch time se theek nahi lag rahe. Main kahin nahi ja raha — samajhna chahta hoon.' Minimise ya catastrophise na karein. Jaldi assessment lein — jaldi catch hone par zyaadatar conditions therapy se theek hoti hain.",
    },
  },

  // ── Kids Health Concern (research & science-based) ──────────────────────
  {
    id: "h1",
    title: { en: "Milestones 0–5: The Red Flags You Must Not Wait On", hi: "0–5 साल के Milestones: जिन red flags पर रुकना नहीं", hinglish: "Milestones 0–5: Red Flags Jin par Wait Nahi Karna" },
    age: "0-2", duration: "5 min", emoji: "🌱",
    scripts: {
      en: "Developmental milestones are typical age ranges, not deadlines. The CDC updated its checklist in 2022 to mark milestones at the age 75 percent of children should be doing them — so if your child has not, that is the moment to ASK, not to wait. By 12 months, expect response to name, pointing, babbling, standing with help. By 18 months, single words, walking, simple play. By 2 years, two-word phrases. By 3 years, short sentences. Red flags that need a same-week paediatric review: no babbling by 12 months, no single words by 16 months, no two-word phrases by 24 months, ANY loss of skills at any age, no eye contact, no response to name by 12 months, walking only on toes, hand flapping, lining up toys repeatedly. The biggest brain-builder is serve-and-return — your baby coos, you coo back; your toddler points, you name what they see. Harvard's Center on the Developing Child has 30 years of evidence: this back-and-forth, not flashcards, builds the brain. Trust your gut. Early intervention before age 3 changes the lifelong trajectory of autism, speech delay, motor delay, and learning differences. A normal evaluation reassures you. An early diagnosis starts help. Both are wins. The only loss is wait-and-watch.",
      hi: "Developmental milestones typical age range हैं, deadlines नहीं। CDC ने 2022 में checklist update की ताकि milestones उस उम्र पर हों जब 75% बच्चे यह करते हैं — तो आपका बच्चा नहीं कर रहा तो पूछने का समय है, wait करने का नहीं। 12 महीने तक: नाम पर response, pointing, बबलिंग। 18 महीने तक: एक शब्द, चलना, simple play। 2 साल तक: दो-शब्दों के phrases। 3 साल तक: छोटे sentences। Red flags जिन पर इसी हफ्ते paediatric review चाहिए: 12 महीने तक बबलिंग नहीं, 16 महीने तक एक शब्द नहीं, 24 महीने तक दो-शब्द phrases नहीं, किसी भी उम्र पर पहले की skills खो देना, eye contact नहीं, सिर्फ पंजों पर चलना, hand flapping, खिलौनों को बार-बार line करना। सबसे बड़ा brain-builder है serve-and-return — बच्चा coo करे, आप coo back; toddler point करे, आप नाम बताएं। Harvard की 30 साल की research बताती है यही back-and-forth — flashcards नहीं — brain बनाता है। Gut पर भरोसा करें। 3 साल से पहले early intervention autism, speech delay, motor delay की lifelong trajectory बदल देती है।",
      hinglish: "Developmental milestones typical age ranges hain, deadlines nahi. CDC ne 2022 mein apni checklist update ki taaki milestones us umar par hon jab 75% bacche yeh karte hain — toh agar aapka bacha nahi kar raha, toh poochne ka samay hai, wait karne ka nahi. 12 mahine tak: naam par response, pointing, babbling. 18 mahine tak: ek shabd, chalna, simple play. 2 saal tak: do-shabdon ke phrases. 3 saal tak: chhote sentences. Red flags jin par usi hafte paediatric review chahiye: 12 mahine tak babbling nahi, 16 mahine tak ek shabd nahi, 24 mahine tak do-shabdon ke phrases nahi, kisi bhi umar par pehle ki skills kho dena, eye contact nahi, sirf panjon par chalna, haath flap karna, khilonon ko baar-baar line karna. Sabse bada brain-builder hai serve-and-return — bacha coo kare, aap coo back karein; toddler point kare, aap naam batayein. Harvard ki 30 saal ki research dikhati hai yahi back-and-forth — flashcards nahi — brain banata hai. Gut par bharosa karein. 3 saal se pehle early intervention autism, speech delay, motor delay ki lifelong trajectory badal deti hai.",
    },
  },
  {
    id: "h2",
    title: { en: "Cavity-Free Childhood: 4 Habits That Beat 90% of Tooth Decay", hi: "Cavity-Free बचपन: 90% सड़न रोकने वाली 4 आदतें", hinglish: "Cavity-Free Bachpan: 90% Decay Rokne Wali 4 Aadatein" },
    age: "2-4", duration: "4 min", emoji: "🦷",
    scripts: {
      en: "Tooth decay is the most common chronic disease of childhood — and almost 100% preventable. By age 5, nearly 50% of Indian children already have cavities. Four science-based habits prevent 90% of them. ONE: brush with fluoride toothpaste from the first tooth. AAPD, WHO and Indian Society of Pedodontics all agree. A rice-grain smear under age 3, pea-size from 3-6, full strip after. Twice daily — the night brush is most important because saliva drops during sleep. After brushing, spit, do NOT rinse. The thin film of fluoride is what works. TWO: never put a child to bed with a bottle of milk or juice. Only water. Milk pools around front teeth all night and ferments — this is the #1 cause of toddler 'bottle-mouth' decay. THREE: it is not the AMOUNT of sugar that causes decay, it is the FREQUENCY. Each sugar exposure starts a 20-minute acid attack. So sweets and juice ONLY with meals, never sipped or grazed between. Water between meals, always. FOUR: first dental visit by age 1, or when the first tooth comes — whichever is earlier. Parents brush for kids until age 7-8. And avoid sharing spoons and pre-chewing food — cavity-causing bacteria pass from caregiver mouths to babies that way.",
      hi: "दांतों की सड़न बचपन की सबसे आम chronic बीमारी है — और लगभग 100% रोकी जा सकती है। 5 साल तक भारत में करीब 50% बच्चों को cavities होती हैं। 4 science-based आदतें इनमें से 90% रोक देती हैं। 1: पहले दांत से fluoride toothpaste से brush। 3 साल से छोटे के लिए चावल के दाने जितना, 3-6 के लिए मटर जितना, बाद में पूरी पट्टी। दिन में 2 बार — रात की brush सबसे ज़रूरी क्योंकि नींद में लार कम होती है। Brush के बाद थूकें, कुल्ला न करें। 2: सोते समय कभी दूध या juice की bottle न दें। सिर्फ पानी। दूध सामने के दांतों पर पूरी रात जमता है — यही toddler 'bottle-mouth' decay का सबसे बड़ा कारण है। 3: सड़न चीनी की मात्रा से नहीं, frequency से होती है। हर sugar exposure = 20 मिनट का acid attack। तो मिठाई और juice सिर्फ meal के साथ, बीच में sip नहीं। बीच में हमेशा पानी। 4: पहले दांत पर या 1 साल तक — पहली dental visit। 7-8 साल तक माता-पिता बच्चे के लिए brush करें। चम्मच share न करें और चबाकर खाना न दें।",
      hinglish: "Daanton ki sadan bachpan ki sabse aam chronic bimari hai — aur lagbhag 100% rok'i ja sakti hai. 5 saal tak Bharat mein karib 50% bacchon ko cavities hoti hain. 4 science-based aadatein inmein se 90% rok deti hain. EK: pehle daant se fluoride toothpaste se brush. AAPD, WHO aur Indian Society of Pedodontics — sab agree hain. 3 saal se chhote ke liye chawal ke daane jitna, 3-6 ke liye matar jitna, baad mein poori patti. Din mein 2 baar — raat ki brush sabse zaruri kyunki neend mein laar kam hoti hai. Brush ke baad thookein, kulla mat karein. Fluoride ki patli parat hi kaam karti hai. DO: sote samay kabhi doodh ya juice ki bottle mat dein. Sirf paani. Doodh saamne ke daanton par poori raat jamta hai — yahi toddler 'bottle-mouth' decay ka sabse bada karan hai. TEEN: sadan sugar ki AMOUNT se nahi, FREQUENCY se hoti hai. Har sugar exposure = 20 minute ka acid attack. Toh mithai aur juice sirf meal ke saath, beech mein sip-sip nahi. Beech mein hamesha paani. CHAR: pehle daant par ya 1 saal tak — pehli dental visit. 7-8 saal tak parents bachhe ke liye brush karein. Chamach share na karein aur chabakar khaana mat dein.",
    },
  },
  {
    id: "h3",
    title: { en: "Real Immunity: What Works, What's a Myth, When to Worry", hi: "असली Immunity: क्या काम करता है, क्या myth है, कब चिंता करें", hinglish: "Asli Immunity: Kya Kaam Karta Hai, Kya Myth Hai, Kab Chinta Karein" },
    age: "2-4", duration: "5 min", emoji: "🛡️",
    scripts: {
      en: "If your toddler caught 8-12 colds last year, that is not weak immunity — that is a normal immune system in its training years. Children under 5 average 6-12 viral infections a year, more in daycare. By age 6, the rate drops sharply. Three things genuinely move the needle on immunity, all backed by strong evidence. ONE: sleep. A child sleeping under their age-target produces fewer antibodies after vaccination and gets sick more. Targets: 1-2 yrs need 11-14 hrs; 3-5 yrs need 10-13 hrs; 6-12 yrs need 9-12 hrs (including naps). TWO: outdoor play and microbial diversity — the 'old friends' theory shows kids who play outside, get a bit dirty, eat fibre-diverse food build stronger immunity. THREE: gut health — 70% of immune cells live there; fibre, dahi, kanji feed the right microbes (NOT supplements). Myths to drop: mega-Vitamin C does not prevent colds (Cochrane reviews are clear). Zinc lozenges are unsafe for young children. Cold weather doesn't cause colds; viruses do. Vitamin D IS worth checking — Indian kids are widely deficient. When to actually worry — Jeffrey Modell red flags: more than 4 ear infections, 2+ serious sinus infections, 2+ pneumonias in a year, recurrent thrush after age 1, failure to thrive. Any of these = ask paediatrician for an immune workup.",
      hi: "अगर पिछले साल आपके toddler को 8-12 जुकाम हुए तो यह कमज़ोर immunity नहीं — यह सामान्य immune system की training years है। 5 साल से छोटे बच्चों को साल में 6-12 viral infections औसतन होते हैं, daycare में ज़्यादा। 6 साल तक यह तेजी से घटता है। तीन चीज़ें immunity पर असल में काम करती हैं। 1: नींद। उम्र-target से कम सोने वाला बच्चा vaccination के बाद कम antibodies बनाता है। Targets: 1-2 साल = 11-14 घंटे; 3-5 साल = 10-13 घंटे; 6-12 साल = 9-12 घंटे (naps सहित)। 2: बाहर खेलना और microbial diversity — 'old friends' theory दिखाती है बाहर खेलने वाले, थोड़े गंदे होने वाले, fibre-rich diverse खाने वाले बच्चे ज़्यादा मज़बूत immunity बनाते हैं। 3: gut health — 70% immune cells वहाँ रहती हैं; fibre, दही, कांजी सही microbes को खिलाते हैं (supplements नहीं)। Myths: Mega-Vitamin C healthy बच्चों में जुकाम नहीं रोकती (Cochrane साफ है)। Zinc lozenges छोटों के लिए safe नहीं। Vitamin D ज़रूर check करें। कब चिंता करें — Jeffrey Modell red flags: साल में 4+ ear infections, 2+ serious sinus, 2+ pneumonias, 1 साल के बाद recurrent thrush, failure to thrive। इनमें से कुछ = paediatrician से immune workup मांगें।",
      hinglish: "Agar pichle saal aapke toddler ko 8-12 cold hue toh yeh kamzor immunity nahi — yeh normal immune system ke training years hain. 5 saal se chhote bacchon ko saal mein average 6-12 viral infections hote hain, daycare mein zyaada. 6 saal tak yeh sharply kam hota hai. Teen cheezein immunity par asal mein kaam karti hain. EK: neend. Apne age-target se kam sone wala bacha vaccination ke baad kam antibodies banata hai. Targets: 1-2 saal = 11-14 ghante; 3-5 saal = 10-13 ghante; 6-12 saal = 9-12 ghante (naps milake). DO: outdoor play aur microbial diversity — 'old friends' theory dikhati hai bahar khelne wale, thode gande hone wale, fibre-rich variety khaane wale bacche zyaada mazboot immunity banate hain. TEEN: gut health — 70% immune cells wahin rehti hain; fibre, dahi, kanji sahi microbes ko feed karte hain (supplements NAHI). Myths: mega-Vitamin C healthy bacchon mein cold nahi rokti (Cochrane reviews clear hain). Zinc lozenges chhoton ke liye safe nahi. Vitamin D zaroor check karein — Indian bacchon mein widespread deficiency hai. Kab chinta karein — Jeffrey Modell red flags: saal mein 4+ ear infections, 2+ serious sinus, 2+ pneumonias, 1 saal ke baad recurrent thrush, failure to thrive. Inmein se kuch bhi = paediatrician se immune workup maango.",
    },
  },
  {
    id: "h4",
    title: { en: "Hidden Hunger: Iron, Vitamin D & B12 in Indian Children", hi: "Hidden Hunger: भारतीय बच्चों में Iron, Vitamin D और B12 की कमी", hinglish: "Hidden Hunger: Indian Bacchon mein Iron, Vitamin D aur B12 ki Kami" },
    age: "2-4", duration: "5 min", emoji: "🥗",
    scripts: {
      en: "There is a paradox in Indian families: the child eats three meals, the plate looks full, the child looks well — and yet blood tests show iron, Vitamin D or B12 deficiency. NFHS-5 data: 67% of Indian under-5s are anaemic. The problem is not WHAT we feed — it is bioavailability. Heme iron from meat, eggs and fish absorbs at 15-35%. Non-heme iron from dal, palak, ragi, rajma absorbs at only 2-10%. Two simple tricks change everything: ADD a Vitamin C source — nimbu, amla, tomato, capsicum, guava — to the SAME meal as iron. This boosts absorption 3-4x. And do NOT serve milk, dahi, chai or coffee within an hour of an iron meal — calcium and tannins block iron sharply. Vitamin D: 70-90% of Indian kids deficient even with sunshine. Need 15-20 min midday sun on bare arms 3-4x/week PLUS fortified foods or a tested supplement if low. Get a 25-OH-D test before supplementing. B12 hits vegetarian families hardest; eggs, milk, dahi, paneer, fortified cereals are sources. Strict vegetarian/vegan kids almost always need a supplement. Red flag pattern to watch: tiredness, pale lower eyelids and palms, poor appetite, frequent infections, poor focus, slow growth. Two or more = ask paediatrician for CBC, ferritin, 25-OH-D, B12 test. Never start a multi-vitamin without testing.",
      hi: "भारतीय परिवारों में paradox: बच्चा 3 meal खाता है, plate भरी है, बच्चा अच्छा दिखता है — फिर भी blood test में iron, Vitamin D या B12 की कमी निकलती है। NFHS-5: भारत में 5 साल से छोटे 67% बच्चे anaemic हैं। समस्या क्या खिलाते हैं नहीं — bioavailability है। Heme iron (मांस, अंडा, मछली) 15-35% absorb होता है। Non-heme iron (दाल, पालक, रागी, राजमा) सिर्फ 2-10%। दो trick: Iron meal में Vitamin C — नींबू, आँवला, tomato, अमरूद — डालें। Absorption 3-4 गुना। Iron meal के एक घंटे के अंदर दूध, दही, चाय, coffee न दें — calcium और tannins iron रोकते हैं। Vitamin D: भारतीय 70-90% बच्चे deficient। हफ्ते में 3-4 बार 15-20 मिनट दोपहर की धूप खुले हाथ-पैर पर, और कमी हो तो tested supplement। 25-OH-D test पहले। B12 vegetarian families पर सबसे ज़्यादा असर — अंडा, दूध, दही, पनीर, fortified cereals sources हैं। Strict vegetarian/vegan बच्चों को लगभग हमेशा supplement चाहिए। Red flags: थकान, पीली निचली पलक और हथेली, कम भूख, बार-बार infections, focus कमज़ोर, धीमी growth। दो या ज़्यादा = paediatrician से CBC, ferritin, 25-OH-D, B12 test मांगें। बिना test multi-vitamin शुरू न करें।",
      hinglish: "Indian families mein paradox: bacha teen meal khata hai, plate bhari hai, bacha accha dikhta hai — phir bhi blood test mein iron, Vitamin D ya B12 ki kami nikalti hai. NFHS-5: Bharat mein 5 saal se chhote 67% bacche anaemic hain. Problem KYA khilate hain nahi — bioavailability hai. Heme iron (maas, anda, machhli) 15-35% absorb hota hai. Non-heme iron (daal, palak, ragi, rajma) sirf 2-10%. Do simple tricks: Iron meal mein Vitamin C — nimbu, amla, tamatar, capsicum, amrood — daalein. Absorption 3-4x. Aur iron meal ke ek ghante ke andar doodh, dahi, chai, coffee mat dein — calcium aur tannins iron ko sharply block karte hain. Vitamin D: 70-90% Indian bacche deficient hain dhoop hote hue bhi. Hafte mein 3-4 baar 15-20 minute dopahar ki dhoop khule haath-pair par, AUR fortified foods ya tested supplement agar level kam hai. 25-OH-D test pehle. B12 vegetarian families par sabse zyaada asar — anda, doodh, dahi, paneer, fortified cereals sources hain. Strict vegetarian/vegan bacchon ko lagbhag hamesha supplement chahiye. Red flags: thakaan, peeli nichli palak aur hatheli, kam bhookh, baar-baar infections, kamzor focus, dheemi growth. Do ya zyaada = paediatrician se CBC, ferritin, 25-OH-D, B12 test maango. Bina test multi-vitamin shuru mat karein.",
    },
  },
  {
    id: "h5",
    title: { en: "Childhood Weight Worry: Family-First, No Diets, No Shame", hi: "बच्चों का वज़न: पूरे परिवार का तरीका, कोई diet नहीं", hinglish: "Bacchon ka Vazan: Family-First, Diets Nahi, Sharam Nahi" },
    age: "5-7", duration: "5 min", emoji: "⚖️",
    scripts: {
      en: "Childhood obesity in India has tripled in 20 years. But the way most families try to solve it — restriction, dieting, lecturing — actually backfires. Decades of research show kids who are dieted at home become MORE likely to develop weight problems and disordered eating in their teens. The 2023 American Academy of Pediatrics guideline calls for the opposite: family-based behaviour change, not child-targeted restriction. Four rules. ONE: language. Never talk about your child's body, weight, fat, size or 'diet' — not even kindly. Talk instead about strong bodies, energy, what foods help us run and focus. Whole family plays. Nobody is on a diet. TWO: AAP-endorsed 5-2-1-0 daily target for the WHOLE family — 5 servings fruit and veg, 2 hours or less recreational screen, 1 hour active play, 0 sugary drinks. Focus on what to ADD, not subtract. THREE: Ellyn Satter's Division of Responsibility — parents decide WHAT, WHEN and WHERE; the child decides WHETHER and HOW MUCH. No bribing, no forcing, no clearing the plate. Trust their hunger. FOUR: environment beats willpower. What is in the home gets eaten. Move sweets out of sight. Keep a fruit bowl on the counter. Family meals at the table 3+ times a week is one of the strongest predictors of healthy weight. When to involve a paediatrician: BMI at or above the 95th percentile, dark velvety skin in neck folds, snoring with pauses, knee pain, rapid weight gain — get a proper assessment. This is medicine, not parenting failure.",
      hi: "भारत में childhood obesity 20 साल में 3 गुना। पर ज़्यादातर families जो तरीका अपनाती हैं — restriction, diet, lecture — backfire करता है। दशकों की research बताती है घर पर diet कराए बच्चों में teen ages में weight problems ज़्यादा होते हैं। 2023 AAP guideline का solution उल्टा है: परिवार-आधारित behaviour change। 4 rules: 1: भाषा। बच्चे के शरीर, वज़न, मोटाई या 'diet' पर बात कभी न करें — प्यार से भी नहीं। बजाय बात करें मज़बूत शरीर, energy, कौन से foods हमें दौड़ने, focus करने में मदद करते हैं। पूरा परिवार खेले। 2: AAP-endorsed 5-2-1-0 daily target — पूरे परिवार के लिए। 5 फल-सब्ज़ी, 2 घंटे या कम recreational screen, 1 घंटा active play, 0 sugary drinks। Focus जोड़ने पर है। 3: Ellyn Satter की Division of Responsibility — माता-पिता क्या, कब, कहाँ तय करते हैं; बच्चा खाना है या नहीं और कितना तय करता है। कोई bribery, कोई force, कोई 'plate खत्म करो' नहीं। 4: environment willpower से ज़्यादा important है। मिठाई नज़र से हटाएं, फल bowl counter पर। Table पर family meals हफ्ते में 3+ बार healthy weight का सबसे मज़बूत predictor है। Doctor कब: BMI 95th+ percentile, गर्दन पर velvety त्वचा, snoring with pauses, घुटनों में दर्द — proper assessment मांगें।",
      hinglish: "Bharat mein childhood obesity 20 saal mein 3 guna ho gayi hai. Par zyaadatar families jo tarika apnaati hain — restriction, dieting, lecturing — backfire karta hai. Decades ki research dikhati hai ghar par diet karaye gaye bacchon mein teen years mein weight problems aur disordered eating ZYAADA likely hote hain. 2023 AAP guideline ka solution ulta hai: family-based behaviour change. 4 rules. EK: language. Bachhe ke shareer, vazan, motai, size ya 'diet' par baat KABHI mat karein — pyaar se bhi nahi. Bajaye baat karein mazboot bodies, energy, kaun se foods humein daudne, focus karne mein madad karte hain. Pura parivar khele. Koi diet par nahi. DO: AAP-endorsed 5-2-1-0 daily target pure parivar ke liye — 5 servings phal-sabzi, 2 ghante ya kam recreational screen, 1 ghanta active play, 0 sugary drinks. Focus JODNE par hai. TEEN: Ellyn Satter ki Division of Responsibility — parents tay karte hain KYA, KAB, KAHAN; bacha tay karta hai khaana hai ya nahi aur kitna. Koi bribing nahi, koi forcing nahi, koi 'plate khatam karo' nahi. CHAR: environment willpower ko har baar haaraata hai. Mithai najar se hatayein, phal bowl counter par. Table par family meals hafte mein 3+ baar healthy weight ka sabse mazboot predictor hai. Doctor kab: BMI 95th+ percentile, gardan ki silwaton mein velvety skin, snoring with pauses, ghutnon mein dard — proper assessment maango. Yeh medicine hai, parenting failure nahi.",
    },
  },
  {
    id: "h6",
    title: { en: "Digital Health Beyond Addiction: Eyes, Posture & Sleep", hi: "Digital Health: आँखें, posture और नींद", hinglish: "Digital Health: Aankhein, Posture aur Neend" },
    age: "5-7", duration: "5 min", emoji: "👀",
    scripts: {
      en: "We talk about screen time as if the only worry is addiction. The bigger silent damage is to eyes, posture and sleep. Childhood myopia is an epidemic — Asian populations are heading to 80% short-sightedness by adulthood. India is on the same curve. Four habits backed by AAP, AAO and All India Ophthalmological Society. ONE: 20-20-20 rule, taught as a game. Every 20 min of screen, 20-second break, look 20 feet away. Up-close focusing for long stretches is the strongest known driver of myopia. TWO: at least 2 hours of daylight outdoor exposure every day — the single most-evidenced myopia-protection factor. Bright daylight stimulates dopamine in the retina which slows the eyeball elongation that causes short-sight. Walks, balcony snacks, an outdoor sport. THREE: distance and posture. Tablets and phones at arm's length. Top of monitor at eye level. Feet flat. A head tilted forward by 60 degrees puts 27 kg of load on a developing cervical spine — years of this leads to tech-neck, headaches, chronic pain. Bigger screens at proper distance are far better than small screens held close. FOUR: no screens for 1 full hour before bed. Bright screen light suppresses melatonin and delays sleep onset by 30-60 min in kids. Replace with a wind-down ritual — warm bath, dim lights, reading aloud, music. See an eye doctor if your child squints, sits very close to screens, tilts the head while reading, complains of headaches, or shows a sudden drop in school marks. Most childhood vision problems are easily corrected — only if caught.",
      hi: "हम screen time को सिर्फ addiction की चिंता मानते हैं। बड़ा silent नुकसान आँखों, posture और नींद को होता है। Childhood myopia epidemic है — एशियाई आबादी adulthood तक 80% short-sightedness की तरफ। भारत भी उसी curve पर। AAP, AAO और All India Ophthalmological Society की 4 आदतें। 1: 20-20-20 rule, game की तरह। हर 20 मिनट screen पर, 20 second का break, 20 feet दूर देखें। 2: रोज़ कम से कम 2 घंटे की धूप वाली outdoor activity — myopia-protection का सबसे evidence-based factor। तेज़ दिन की रोशनी retina में dopamine release करती है जो eyeball की elongation धीमी करती है। 3: दूरी और posture। Tablet और phone arm's length पर। Monitor का top eye level पर। पैर flat। 60 डिग्री आगे झुका सिर developing cervical spine पर 27 kg load डालता है — सालों यही = tech-neck, headaches, chronic pain। 4: सोने से 1 घंटा पहले कोई screen नहीं। तेज़ screen light melatonin दबाती है और बच्चों में sleep onset 30-60 मिनट देर करती है। Wind-down ritual से बदलें — गर्म स्नान, dim lights, ज़ोर से पढ़ाना, music। Eye doctor कब: squint करे, screen बहुत पास रखे, पढ़ते समय सिर tilt करे, headaches की शिकायत करे, या marks में अचानक गिरावट हो। ज़्यादातर बचपन की vision problems आसानी से ठीक होती हैं — बशर्ते pakdi जाएं।",
      hinglish: "Hum screen time ke baare mein aise baat karte hain jaise ek hi chinta addiction hai. Bada silent nuksaan badhte bacchon ki aankhon, posture aur neend ko hota hai. Childhood myopia ek epidemic hai — Asian populations adulthood tak 80% short-sightedness ki taraf ja rahi hain. Bharat bhi usi curve par hai. AAP, AAO aur All India Ophthalmological Society ki 4 aadatein. EK: 20-20-20 rule, game ki tarah. Har 20 min screen par, 20-second break, 20 feet door dekho. Lambe samay tak paas focus karna myopia ka sabse bada known driver hai. DO: roz kam se kam 2 ghante ki dhoop wali outdoor activity — myopia-protection ka sabse evidence-based factor. Tez dhoop retina mein dopamine release karti hai jo eyeball ki elongation dheemi karti hai. Walks, balcony par snack, ek outdoor sport. TEEN: doori aur posture. Tablet aur phone arm's length par. Monitor ka top eye-level par. Pair flat. 60 degree aage jhuka sar developing cervical spine par 27 kg load daalta hai — saalon yahi = tech-neck, headaches, chronic pain. Badi screens proper distance par chhoti screens paas se bahut behtar hain. CHAR: sone se theek 1 ghante pehle koi screen nahi. Tez screen light melatonin dabati hai aur bacchon mein sleep onset 30-60 minute der karti hai. Wind-down ritual se badlein — garam snaan, dim lights, zor se padhna, music. Eye doctor kab: bacha squint kare, screen ya kitaab bahut paas rakhe, padhte samay sar tilt kare, headaches ki shikayat kare, ya marks mein achanak girawat ho. Zyaadatar bachpan ki vision problems aasani se theek hoti hain — bashart pakdi jayein.",
    },
  },
];

// ── Age bucket labels ──────────────────────────────────────────────────────
const AGE_LABELS: Record<AgeBucket, Record<LangCode, string>> = {
  "0-2":  { en: "0–2 yrs", hi: "0–2 साल", hinglish: "0–2 saal" },
  "2-4":  { en: "2–4 yrs", hi: "2–4 साल", hinglish: "2–4 saal" },
  "5-7":  { en: "5–7 yrs", hi: "5–7 साल", hinglish: "5–7 saal" },
  "8-10": { en: "8–10 yrs", hi: "8–10 साल", hinglish: "8–10 saal" },
  "10+":  { en: "10+ yrs", hi: "10+ साल", hinglish: "10+ saal" },
};
const AGE_EMOJIS: Record<AgeBucket, string> = {
  "0-2": "👶", "2-4": "🧒", "5-7": "🎨", "8-10": "📚", "10+": "🎒",
};
const AGE_ORDER: AgeBucket[] = ["0-2", "2-4", "5-7", "8-10", "10+"];

export default function AudioLessonsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const lang = i18n.language;

  const [selectedAge, setSelectedAge] = useState<AgeBucket>("2-4");
  const [openLesson, setOpenLesson] = useState<Lesson | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const lessons = useMemo(() => LESSONS.filter(l => l.age === selectedAge), [selectedAge]);
  const amy = useAmyVoice({ voiceId: AMY_VOICE_HINDI, modelId: MODEL_MULTILINGUAL });
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const authFetch = useAuthFetch();
  const refreshSub = useSubscriptionStore((s) => s.refresh);

  // Stop audio whenever the open lesson changes (collapse or switch lesson).
  useEffect(() => {
    amy.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openLesson?.id]);

  // Global Paywall: free users get 1 audio lesson per UTC day. Premium users
  // bypass server-side. The /consume endpoint returns 200 (no-op for premium)
  // or 402 feature_locked when the cap is exhausted, in which case we route
  // to the paywall instead of opening the lesson.
  const handlePickLesson = async (lesson: Lesson) => {
    if (unlocking) return;
    if (openLesson?.id === lesson.id) {
      // Collapsing the same lesson — no need to consume again.
      setOpenLesson(null);
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      return;
    }
    setUnlocking(true);
    try {
      const res = await authFetch("/api/features/audio_lesson/consume", {
        method: "POST",
      });
      if (res.status === 402) {
        router.push({ pathname: "/paywall", params: { reason: "audio_lessons" } });
        return;
      }
      // Any other non-2xx (network/server) — fail open so infra issues
      // don't block the user. Counter wasn't burned (featureGate refunds).
      void refreshSub();
      setOpenLesson(lesson);
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    } catch {
      setOpenLesson(lesson);
    } finally {
      setUnlocking(false);
    }
  };

  const pulsePlay = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  const introText = lang === "hi"
    ? "हाथ भरे हैं? Amy आपको बच्चे की उम्र के हिसाब से जरूरी parenting topics समझाएगी। हर lesson 3–5 मिनट का है।"
    : lang === "hinglish"
    ? "Haath bhare hain? Amy aapko bacche ki umra ke hisaab se important topics samjhayegi. Har lesson 3–5 minute ka hai."
    : "Hands full? Let Amy talk you through the most important parenting topics for your child's age. Each lesson is 3–5 minutes.";

  return (
    <LinearGradient colors={["#0f0c29", "#1a1040", "#0c1220"]} style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color="#c4b5fd" />
        </TouchableOpacity>
        <Ionicons name="headset" size={20} color="#c4b5fd" style={{ marginRight: 6 }} />
        <Text style={styles.headerTitle}>Amy Audio Lessons</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <Text style={styles.intro}>{introText}</Text>

        {/* Age selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.agePills} style={{ marginBottom: 20 }}>
          {AGE_ORDER.map(key => {
            const active = key === selectedAge;
            const label = `${AGE_EMOJIS[key]} ${AGE_LABELS[key][lang as LangCode] ?? AGE_LABELS[key].en}`;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => { setSelectedAge(key); setOpenLesson(null); if (Platform.OS !== "web") Haptics.selectionAsync(); }}
                activeOpacity={0.8}
              >
                {active ? (
                  <LinearGradient colors={[brand.primary, "#ec4899"]} style={styles.pill}>
                    <Text style={styles.pillTextActive}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.pillInactive}>
                    <Text style={styles.pillText}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lesson list */}
        {lessons.map(lesson => {
          const isOpen = openLesson?.id === lesson.id;
          const title = getTitle(lesson, lang);
          const script = getScript(lesson, lang);
          return (
            <View key={lesson.id} style={[styles.lessonCard, isOpen && styles.lessonCardOpen]}>
              <TouchableOpacity
                onPress={() => void handlePickLesson(lesson)}
                disabled={unlocking}
                activeOpacity={0.85}
                style={[styles.lessonHeader, unlocking && { opacity: 0.7 }]}
              >
                <View style={styles.lessonEmoji}><Text style={{ fontSize: 26 }}>{lesson.emoji}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonTitle}>{title}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                    <Ionicons name="time-outline" size={11} color="#a99fd9" />
                    <Text style={styles.lessonMeta}>{lesson.duration}</Text>
                  </View>
                </View>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#a99fd9" />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.playerWrap}>
                  {/* TTS error */}
                  {amy.error && (
                    <Text style={styles.errorText}>
                      {lang === "hi"
                        ? "Amy की आवाज़ अभी नहीं चल पा रही। थोड़ी देर बाद try करें।"
                        : lang === "hinglish"
                        ? "Amy ki awaaz load nahi ho payi. Thodi der baad try karein."
                        : "Couldn't load Amy's voice. Please try again shortly."}
                    </Text>
                  )}

                  {/* Progress bar — real position from expo-audio */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, {
                      width: `${amy.duration > 0 ? Math.min(amy.currentTime / amy.duration, 1) * 100 : 0}%` as any,
                    }]} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                    <Text style={styles.timeText}>{formatTime(amy.currentTime)}</Text>
                    <Text style={styles.timeText}>{lesson.duration}</Text>
                  </View>

                  {/* Controls */}
                  <View style={styles.controls}>
                    <TouchableOpacity
                      onPress={() => amy.seekTo(amy.currentTime - 15)}
                      style={[styles.skipBtn, { opacity: amy.speaking ? 1 : 0.4 }]}
                      activeOpacity={0.7}
                      disabled={!amy.speaking}
                    >
                      <Ionicons name="play-back" size={22} color="#c4b5fd" />
                    </TouchableOpacity>

                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                      <TouchableOpacity
                        onPress={() => {
                          pulsePlay();
                          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          if (amy.speaking || amy.loading) {
                            amy.stop();
                          } else {
                            void amy.speak(getScript(lesson, "hi"));
                          }
                        }}
                        style={styles.playBtn}
                        activeOpacity={0.85}
                      >
                        <LinearGradient colors={[brand.primary, "#ec4899"]} style={styles.playBtnGrad}>
                          {amy.loading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Ionicons name={(amy.speaking || amy.loading) ? "pause" : "play"} size={26} color="#fff" />
                          }
                        </LinearGradient>
                      </TouchableOpacity>
                    </Animated.View>

                    <TouchableOpacity
                      onPress={() => amy.seekTo(amy.currentTime + 15)}
                      style={[styles.skipBtn, { opacity: amy.speaking ? 1 : 0.4 }]}
                      activeOpacity={0.7}
                      disabled={!amy.speaking}
                    >
                      <Ionicons name="play-forward" size={22} color="#c4b5fd" />
                    </TouchableOpacity>
                  </View>

                  {/* Script preview — shown in app language for reading */}
                  <Text style={styles.script} numberOfLines={5}>{script}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(139,92,246,0.2)",
    gap: 6,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(167,139,250,0.15)",
    alignItems: "center", justifyContent: "center", marginRight: 4,
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  intro: { color: "#c7c0e8", fontSize: 13, lineHeight: 20, marginVertical: 16 },
  agePills: { gap: 8, paddingVertical: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  pillInactive: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(139,92,246,0.35)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  pillText: { color: "#c4b5fd", fontSize: 13, fontWeight: "600" },
  pillTextActive: { color: "#fff", fontSize: 13, fontWeight: "700" },
  lessonCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1, borderColor: "rgba(139,92,246,0.25)",
    borderRadius: 16, marginBottom: 10, overflow: "hidden",
  },
  lessonCardOpen: { borderColor: brand.primary + "60" },
  lessonHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  lessonEmoji: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  lessonTitle: { color: "#fff", fontSize: 14, fontWeight: "800", lineHeight: 19 },
  lessonMeta: { color: "#a99fd9", fontSize: 11 },
  playerWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: brand.primary },
  timeText: { color: "#a99fd9", fontSize: 11 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginVertical: 16 },
  skipBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  playBtn: { width: 60, height: 60, borderRadius: 30, overflow: "hidden" },
  playBtnGrad: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  script: {
    color: "#c7c0e8", fontSize: 12.5, lineHeight: 18.5,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10, padding: 12,
  },
  errorText: {
    color: "#fecaca", fontSize: 12.5, lineHeight: 18,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
});
