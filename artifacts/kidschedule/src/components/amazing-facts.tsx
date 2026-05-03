import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ThumbsUp, Sparkles } from "lucide-react";
import type { AgeGroup } from "@/lib/age-groups";

// ─── Types ─────────────────────────────────────────────────────────────────────
import { useTranslation } from "react-i18next";
type FactCategory = "animal" | "science" | "gk";
type Fact = {
  id: string;
  emoji: string;
  text: string;
  textHi: string;
  category: FactCategory;
  ageGroups: AgeGroup[];
};

// ─── Dataset ────────────────────────────────────────────────────────────────────
// ~15 facts per age group; facts can appear in multiple age groups.

const ALL_FACTS: Fact[] = [
// ── INFANT (0–11 months) ──────────────────────────────────────────
{
  id: "i-a-01",
  emoji: "👶",
  category: "science",
  ageGroups: ["infant"],
  text: "Newborns can recognise their mother's voice from the very first day!",
  textHi: "नवजात शिशु पहले ही दिन से अपनी माँ की आवाज़ पहचान लेते हैं!"
}, {
  id: "i-a-02",
  emoji: "👁️",
  category: "science",
  ageGroups: ["infant"],
  text: "Babies are born with blue or grey eyes — colour develops over 6–12 months.",
  textHi: "शिशु नीली या भूरी आँखों के साथ पैदा होते हैं — असली रंग 6–12 महीनों में आता है।"
}, {
  id: "i-a-03",
  emoji: "🐼",
  category: "animal",
  ageGroups: ["infant"],
  text: "A baby panda is smaller than a mouse when it is born!",
  textHi: "एक बेबी पांडा जन्म के समय चूहे से भी छोटा होता है!"
}, {
  id: "i-a-04",
  emoji: "🦁",
  category: "animal",
  ageGroups: ["infant"],
  text: "Lion cubs are born with spots that fade as they grow up.",
  textHi: "शेर के शावक धब्बों के साथ पैदा होते हैं जो बड़े होने पर मिट जाते हैं।"
}, {
  id: "i-a-05",
  emoji: "🌈",
  category: "science",
  ageGroups: ["infant"],
  text: "Babies can see high-contrast colours — black, white and red — best at birth.",
  textHi: "शिशु जन्म के समय काले, सफेद और लाल रंग सबसे अच्छे देख पाते हैं।"
}, {
  id: "i-a-06",
  emoji: "🐝",
  category: "animal",
  ageGroups: ["infant"],
  text: "A baby bee takes only 21 days to go from egg to adult!",
  textHi: "एक मधुमक्खी का बच्चा अंडे से वयस्क बनने में केवल 21 दिन लेता है!"
}, {
  id: "i-a-07",
  emoji: "🧠",
  category: "science",
  ageGroups: ["infant"],
  text: "A baby's brain doubles in size in the first year of life!",
  textHi: "शिशु का दिमाग जीवन के पहले साल में आकार में दोगुना हो जाता है!"
}, {
  id: "i-a-08",
  emoji: "😄",
  category: "science",
  ageGroups: ["infant"],
  text: "Babies start smiling at their parents as early as 6 weeks old.",
  textHi: "शिशु 6 हफ्तों में ही अपने माता-पिता को देखकर मुस्कुराने लगते हैं।"
}, {
  id: "i-a-09",
  emoji: "🐬",
  category: "animal",
  ageGroups: ["infant"],
  text: "Dolphin calves are born tail-first to prevent drowning.",
  textHi: "डॉल्फिन के बच्चे डूबने से बचाने के लिए पहले पूँछ से पैदा होते हैं।"
}, {
  id: "i-a-10",
  emoji: "🌙",
  category: "gk",
  ageGroups: ["infant"],
  text: "The Moon is slowly moving away from Earth — about 3.8 cm every year.",
  textHi: "चंद्रमा धीरे-धीरे पृथ्वी से दूर जा रहा है — हर साल लगभग 3.8 सेमी।"
}, {
  id: "i-a-11",
  emoji: "🎶",
  category: "science",
  ageGroups: ["infant"],
  text: "Lullabies from ALL cultures share a similar slow, soothing rhythm.",
  textHi: "सभी संस्कृतियों की लोरियों में एक जैसी धीमी, सुकून देने वाली लय होती है।"
}, {
  id: "i-a-12",
  emoji: "🐘",
  category: "animal",
  ageGroups: ["infant"],
  text: "Baby elephants can walk within hours of being born!",
  textHi: "हाथी का बच्चा जन्म के कुछ घंटों के भीतर चलने लगता है!"
}, {
  id: "i-a-13",
  emoji: "💧",
  category: "science",
  ageGroups: ["infant"],
  text: "Human babies are made of about 75% water at birth.",
  textHi: "जन्म के समय मानव शिशु का लगभग 75% हिस्सा पानी होता है।"
}, {
  id: "i-a-14",
  emoji: "🌸",
  category: "gk",
  ageGroups: ["infant"],
  text: "The lotus flower opens during the day and closes at night.",
  textHi: "कमल का फूल दिन में खिलता है और रात को बंद हो जाता है।"
}, {
  id: "i-a-15",
  emoji: "🐓",
  category: "animal",
  ageGroups: ["infant"],
  text: "A hen turns her egg about 50 times per day to keep it warm evenly.",
  textHi: "एक मुर्गी अपने अंडे को दिन में लगभग 50 बार घुमाती है ताकि वह समान रूप से गर्म रहे।"
},
// ── TODDLER (1–3 years) ───────────────────────────────────────────
{
  id: "t-a-01",
  emoji: "🦒",
  category: "animal",
  ageGroups: ["toddler"],
  text: "Giraffes have the same number of neck bones as humans — just 7, but much bigger!",
  textHi: "जिराफ की गर्दन की हड्डियाँ इंसान जितनी ही होती हैं — सिर्फ 7, पर बहुत बड़ी!"
}, {
  id: "t-a-02",
  emoji: "🐸",
  category: "animal",
  ageGroups: ["toddler"],
  text: "Frogs drink water through their skin — they never use their mouth to drink!",
  textHi: "मेंढक अपनी त्वचा के ज़रिए पानी पीते हैं — वे पीने के लिए कभी मुँह नहीं इस्तेमाल करते!"
}, {
  id: "t-a-03",
  emoji: "☀️",
  category: "gk",
  ageGroups: ["toddler"],
  text: "The Sun is so big that one million Earths could fit inside it!",
  textHi: "सूरज इतना बड़ा है कि उसमें 10 लाख पृथ्वियाँ समा सकती हैं!"
}, {
  id: "t-a-04",
  emoji: "🍎",
  category: "science",
  ageGroups: ["toddler"],
  text: "Apples float in water because they are 25% air!",
  textHi: "सेब पानी में तैरते हैं क्योंकि उनमें 25% हवा होती है!"
}, {
  id: "t-a-05",
  emoji: "🌊",
  category: "gk",
  ageGroups: ["toddler"],
  text: "Oceans cover more than 70% of the Earth's surface.",
  textHi: "महासागर पृथ्वी की सतह का 70% से ज़्यादा हिस्सा ढकते हैं।"
}, {
  id: "t-a-06",
  emoji: "🦋",
  category: "animal",
  ageGroups: ["toddler"],
  text: "Butterflies taste with their feet — they have taste sensors on their legs!",
  textHi: "तितलियाँ अपने पैरों से स्वाद लेती हैं — उनके पैरों में स्वाद की इंद्रियाँ होती हैं!"
}, {
  id: "t-a-07",
  emoji: "🌿",
  category: "science",
  ageGroups: ["toddler"],
  text: "Plants make their own food using sunlight, water and air — it's called photosynthesis.",
  textHi: "पौधे सूर्य के प्रकाश, पानी और हवा से अपना खाना खुद बनाते हैं — इसे प्रकाश संश्लेषण कहते हैं।"
}, {
  id: "t-a-08",
  emoji: "🐢",
  category: "animal",
  ageGroups: ["toddler"],
  text: "Turtles have been on Earth for over 200 million years — older than dinosaurs!",
  textHi: "कछुए 20 करोड़ से भी ज़्यादा वर्षों से पृथ्वी पर हैं — डायनासोर से भी पुराने!"
}, {
  id: "t-a-09",
  emoji: "🌈",
  category: "gk",
  ageGroups: ["toddler"],
  text: "A rainbow always appears opposite the Sun — you must stand with the Sun behind you to see it.",
  textHi: "इंद्रधनुष हमेशा सूरज के विपरीत दिशा में दिखता है।"
}, {
  id: "t-a-10",
  emoji: "🐧",
  category: "animal",
  ageGroups: ["toddler"],
  text: "Penguins live only in the Southern Hemisphere — you'll never find a wild penguin at the North Pole!",
  textHi: "पेंगुइन केवल दक्षिणी गोलार्ध में रहते हैं — उत्तरी ध्रुव पर जंगली पेंगुइन नहीं मिलते!"
}, {
  id: "t-a-11",
  emoji: "🧲",
  category: "science",
  ageGroups: ["toddler"],
  text: "Magnets always have two ends — a North pole and a South pole.",
  textHi: "चुम्बक के हमेशा दो सिरे होते हैं — उत्तरी ध्रुव और दक्षिणी ध्रुव।"
}, {
  id: "t-a-12",
  emoji: "🌍",
  category: "gk",
  ageGroups: ["toddler"],
  text: "India is the largest democracy in the world.",
  textHi: "भारत दुनिया का सबसे बड़ा लोकतंत्र है।"
}, {
  id: "t-a-13",
  emoji: "🦈",
  category: "animal",
  ageGroups: ["toddler"],
  text: "Sharks have been around for over 400 million years — before trees even existed!",
  textHi: "शार्क 40 करोड़ वर्षों से भी पहले से हैं — यहाँ तक कि पेड़ों से भी पहले!"
}, {
  id: "t-a-14",
  emoji: "❄️",
  category: "gk",
  ageGroups: ["toddler"],
  text: "No two snowflakes are exactly the same shape.",
  textHi: "कोई भी दो बर्फ के टुकड़े बिल्कुल एक जैसे नहीं होते।"
}, {
  id: "t-a-15",
  emoji: "🐝",
  category: "animal",
  ageGroups: ["toddler"],
  text: "Bees can recognise human faces — just like we do!",
  textHi: "मधुमक्खियाँ इंसानी चेहरे पहचान सकती हैं — बिल्कुल हमारी तरह!"
},
// ── PRESCHOOL (3–5 years) ─────────────────────────────────────────
{
  id: "p-a-01",
  emoji: "🦜",
  category: "animal",
  ageGroups: ["preschool"],
  text: "Parrots can learn to say hundreds of words and even understand their meaning!",
  textHi: "तोते सैकड़ों शब्द सीख सकते हैं और उनका अर्थ भी समझ सकते हैं!"
}, {
  id: "p-a-02",
  emoji: "🌺",
  category: "science",
  ageGroups: ["preschool"],
  text: "Flowers have different colours to attract bees and butterflies for pollination.",
  textHi: "फूलों के अलग-अलग रंग मधुमक्खियों और तितलियों को परागण के लिए आकर्षित करते हैं।"
}, {
  id: "p-a-03",
  emoji: "🚀",
  category: "gk",
  ageGroups: ["preschool"],
  text: "There are 8 planets in our solar system. Earth is the third one from the Sun.",
  textHi: "हमारे सौरमंडल में 8 ग्रह हैं। पृथ्वी सूर्य से तीसरा ग्रह है।"
}, {
  id: "p-a-04",
  emoji: "🐙",
  category: "animal",
  ageGroups: ["preschool"],
  text: "An octopus has 3 hearts, 9 brains, and blue blood!",
  textHi: "एक ऑक्टोपस के 3 दिल, 9 दिमाग और नीला खून होता है!"
}, {
  id: "p-a-05",
  emoji: "🌍",
  category: "gk",
  ageGroups: ["preschool"],
  text: "The Nile is the longest river in the world. The Ganga is one of the holiest rivers in India.",
  textHi: "नील दुनिया की सबसे लंबी नदी है। गंगा भारत की सबसे पवित्र नदियों में से एक है।"
}, {
  id: "p-a-06",
  emoji: "🍌",
  category: "science",
  ageGroups: ["preschool"],
  text: "Bananas are slightly radioactive — but totally safe to eat!",
  textHi: "केले थोड़े रेडियोएक्टिव होते हैं — लेकिन खाने के लिए बिल्कुल सुरक्षित हैं!"
}, {
  id: "p-a-07",
  emoji: "🦩",
  category: "animal",
  ageGroups: ["preschool"],
  text: "Flamingos are born white — they turn pink from eating pink shrimp and algae!",
  textHi: "फ्लेमिंगो सफेद पैदा होते हैं — गुलाबी झींगे और शैवाल खाने से वे गुलाबी हो जाते हैं!"
}, {
  id: "p-a-08",
  emoji: "🏔️",
  category: "gk",
  ageGroups: ["preschool"],
  text: "Mount Everest is the tallest mountain in the world — it's in the Himalayas!",
  textHi: "माउंट एवरेस्ट दुनिया का सबसे ऊँचा पर्वत है — यह हिमालय में है!"
}, {
  id: "p-a-09",
  emoji: "🐘",
  category: "animal",
  ageGroups: ["preschool"],
  text: "Elephants are the only animals that cannot jump!",
  textHi: "हाथी एकमात्र ऐसा जानवर है जो कूद नहीं सकता!"
}, {
  id: "p-a-10",
  emoji: "🌊",
  category: "science",
  ageGroups: ["preschool"],
  text: "The Pacific Ocean is bigger than all the land on Earth put together!",
  textHi: "प्रशांत महासागर पृथ्वी की सभी भूमि से मिलकर भी बड़ा है!"
}, {
  id: "p-a-11",
  emoji: "🦴",
  category: "science",
  ageGroups: ["preschool"],
  text: "Babies are born with 270 bones, but adults only have 206 — some fuse together as we grow.",
  textHi: "शिशु 270 हड्डियों के साथ पैदा होते हैं, लेकिन वयस्कों में केवल 206 होती हैं।"
}, {
  id: "p-a-12",
  emoji: "🌙",
  category: "gk",
  ageGroups: ["preschool"],
  text: "The Moon has no air, no wind and no weather. Footprints left there could last millions of years!",
  textHi: "चाँद पर हवा, आँधी और मौसम नहीं है। वहाँ छोड़े गए पैरों के निशान लाखों वर्षों तक रह सकते हैं!"
}, {
  id: "p-a-13",
  emoji: "🐌",
  category: "animal",
  ageGroups: ["preschool"],
  text: "A snail can sleep for up to 3 years at a time!",
  textHi: "एक घोंघा एक बार में 3 साल तक सो सकता है!"
}, {
  id: "p-a-14",
  emoji: "🎨",
  category: "gk",
  ageGroups: ["preschool"],
  text: "Red, yellow and blue are the 3 primary colours — you can mix them to make all other colours!",
  textHi: "लाल, पीला और नीला — ये 3 मूल रंग हैं — इन्हें मिलाकर सारे रंग बनाए जा सकते हैं!"
}, {
  id: "p-a-15",
  emoji: "🦅",
  category: "animal",
  ageGroups: ["preschool"],
  text: "Eagles can spot a rabbit from 3 km away — their eyesight is 5 times sharper than humans!",
  textHi: "बाज 3 किमी दूर से खरगोश देख सकता है — उसकी दृष्टि इंसानों से 5 गुना तेज होती है!"
},
// ── EARLY SCHOOL (5–9 years) ──────────────────────────────────────
{
  id: "e-a-01",
  emoji: "⚡",
  category: "science",
  ageGroups: ["early_school"],
  text: "Lightning is 5 times hotter than the surface of the Sun!",
  textHi: "बिजली सूर्य की सतह से 5 गुना अधिक गर्म होती है!"
}, {
  id: "e-a-02",
  emoji: "🌿",
  category: "science",
  ageGroups: ["early_school"],
  text: "There are more trees on Earth than stars in the Milky Way galaxy.",
  textHi: "पृथ्वी पर आकाशगंगा में तारों से भी ज़्यादा पेड़ हैं।"
}, {
  id: "e-a-03",
  emoji: "🐝",
  category: "animal",
  ageGroups: ["early_school"],
  text: "A single honeybee makes only 1/12 teaspoon of honey in its entire lifetime.",
  textHi: "एक मधुमक्खी अपने पूरे जीवन में केवल 1/12 चम्मच शहद बनाती है।"
}, {
  id: "e-a-04",
  emoji: "🏛️",
  category: "gk",
  ageGroups: ["early_school"],
  text: "The Great Wall of China took over 1,000 years and millions of workers to build.",
  textHi: "चीन की महान दीवार बनाने में 1,000 से अधिक वर्ष और लाखों श्रमिक लगे।"
}, {
  id: "e-a-05",
  emoji: "🦠",
  category: "science",
  ageGroups: ["early_school"],
  text: "Your body has more bacteria in it than it has human cells!",
  textHi: "आपके शरीर में मानव कोशिकाओं से ज़्यादा बैक्टीरिया हैं!"
}, {
  id: "e-a-06",
  emoji: "🌋",
  category: "gk",
  ageGroups: ["early_school"],
  text: "The deepest point on Earth is the Mariana Trench — it's deeper than Everest is tall!",
  textHi: "पृथ्वी का सबसे गहरा स्थान मारियाना ट्रेंच है — यह एवरेस्ट की ऊँचाई से भी गहरा है!"
}, {
  id: "e-a-07",
  emoji: "🦑",
  category: "animal",
  ageGroups: ["early_school"],
  text: "Giant squids have eyes the size of a football — the biggest eyes of any animal!",
  textHi: "विशालकाय स्क्विड की आँखें फुटबॉल के आकार की होती हैं — किसी भी जानवर की सबसे बड़ी आँखें!"
}, {
  id: "e-a-08",
  emoji: "🧪",
  category: "science",
  ageGroups: ["early_school"],
  text: "Water can exist as solid (ice), liquid (water) and gas (steam) — the same molecule, three forms.",
  textHi: "पानी ठोस (बर्फ), तरल और गैस (भाप) — एक ही अणु, तीन रूप।"
}, {
  id: "e-a-09",
  emoji: "🗺️",
  category: "gk",
  ageGroups: ["early_school"],
  text: "Russia is the world's largest country by area — it spans 11 time zones!",
  textHi: "रूस क्षेत्रफल में दुनिया का सबसे बड़ा देश है — यह 11 समय क्षेत्रों में फैला है!"
}, {
  id: "e-a-10",
  emoji: "🦜",
  category: "animal",
  ageGroups: ["early_school"],
  text: "Crows are so smart they can make tools and remember human faces for years.",
  textHi: "कौवे इतने होशियार होते हैं कि वे औज़ार बना सकते हैं और सालों तक इंसानी चेहरे याद रखते हैं।"
}, {
  id: "e-a-11",
  emoji: "💡",
  category: "gk",
  ageGroups: ["early_school"],
  text: "Thomas Edison invented the lightbulb after more than 1,000 failed experiments!",
  textHi: "थॉमस एडिसन ने 1,000 से ज़्यादा असफल प्रयोगों के बाद बल्ब का आविष्कार किया!"
}, {
  id: "e-a-12",
  emoji: "🐊",
  category: "animal",
  ageGroups: ["early_school"],
  text: "Crocodiles have barely changed since the time of dinosaurs — 200 million years ago!",
  textHi: "मगरमच्छ डायनासोर के ज़माने से लगभग नहीं बदले हैं — 20 करोड़ वर्ष पहले से!"
}, {
  id: "e-a-13",
  emoji: "🌡️",
  category: "science",
  ageGroups: ["early_school"],
  text: "The hottest temperature ever recorded on Earth was 56.7°C in Death Valley, USA.",
  textHi: "पृथ्वी पर अब तक का सबसे अधिक तापमान 56.7°C था — अमेरिका की डेथ वैली में।"
}, {
  id: "e-a-14",
  emoji: "🎯",
  category: "gk",
  ageGroups: ["early_school"],
  text: "Chess was invented in India — it was called 'Chaturanga' more than 1,500 years ago.",
  textHi: "शतरंज का आविष्कार भारत में हुआ था — 1,500 से ज़्यादा वर्ष पहले इसे 'चतुरंग' कहते थे।"
}, {
  id: "e-a-15",
  emoji: "🕸️",
  category: "animal",
  ageGroups: ["early_school"],
  text: "Spider silk is stronger than steel of the same thickness — and stretchy too!",
  textHi: "मकड़ी का जाल उतनी मोटाई की इस्पात से भी मज़बूत होता है — और लचीला भी!"
},
// ── PRE-TEEN (10–14 years) ────────────────────────────────────────
{
  id: "pt-a-01",
  emoji: "🌌",
  category: "science",
  ageGroups: ["pre_teen"],
  text: "The observable universe contains an estimated 2 trillion galaxies.",
  textHi: "दृश्यमान ब्रह्मांड में लगभग 2 लाख करोड़ आकाशगंगाएँ हैं।"
}, {
  id: "pt-a-02",
  emoji: "🧬",
  category: "science",
  ageGroups: ["pre_teen"],
  text: "Human DNA is 98.8% identical to chimpanzee DNA.",
  textHi: "मानव DNA चिंपैंजी के DNA से 98.8% समान है।"
}, {
  id: "pt-a-03",
  emoji: "⚛️",
  category: "science",
  ageGroups: ["pre_teen"],
  text: "If you removed all the empty space from atoms in all humans, the entire human race would fit in a sugar cube.",
  textHi: "अगर सभी इंसानों के परमाणुओं से खाली जगह हटा दी जाए, तो पूरी मानव जाति एक चीनी के टुकड़े में समा जाएगी।"
}, {
  id: "pt-a-04",
  emoji: "🦠",
  category: "science",
  ageGroups: ["pre_teen"],
  text: "Viruses are not alive — they are just packets of genetic code that hijack living cells.",
  textHi: "वायरस जीवित नहीं होते — वे केवल जेनेटिक कोड के पैकेट हैं जो जीवित कोशिकाओं पर कब्जा करते हैं।"
}, {
  id: "pt-a-05",
  emoji: "🏛️",
  category: "gk",
  ageGroups: ["pre_teen"],
  text: "Ancient Egyptians used geometry so precisely that the Great Pyramid was aligned to true north within 0.05 degrees.",
  textHi: "प्राचीन मिस्रवासियों ने महान पिरामिड को सच्चे उत्तर के 0.05 डिग्री के भीतर संरेखित किया था।"
}, {
  id: "pt-a-06",
  emoji: "🐙",
  category: "animal",
  ageGroups: ["pre_teen"],
  text: "Octopuses can edit their own RNA to adapt to temperature changes — a form of intelligence at the molecular level.",
  textHi: "ऑक्टोपस तापमान परिवर्तन के अनुकूल होने के लिए अपना RNA संपादित कर सकते हैं।"
}, {
  id: "pt-a-07",
  emoji: "🌍",
  category: "gk",
  ageGroups: ["pre_teen"],
  text: "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  textHi: "क्लियोपेट्रा महान पिरामिड के निर्माण से अधिक चंद्रमा की लैंडिंग के करीब समय में रहती थीं।"
}, {
  id: "pt-a-08",
  emoji: "🔢",
  category: "gk",
  ageGroups: ["pre_teen"],
  text: "The number zero was invented in India by the mathematician Brahmagupta around 628 CE.",
  textHi: "शून्य का आविष्कार भारत में गणितज्ञ ब्रह्मगुप्त ने लगभग 628 ई. में किया था।"
}, {
  id: "pt-a-09",
  emoji: "🌊",
  category: "science",
  ageGroups: ["pre_teen"],
  text: "More than 80% of Earth's oceans have never been explored by humans.",
  textHi: "पृथ्वी के 80% से ज़्यादा महासागर अभी तक मनुष्यों द्वारा अनुसंधान नहीं किए गए हैं।"
}, {
  id: "pt-a-10",
  emoji: "🧠",
  category: "science",
  ageGroups: ["pre_teen"],
  text: "Your brain generates about 70,000 thoughts per day and uses 20% of your body's energy.",
  textHi: "आपका दिमाग रोज़ लगभग 70,000 विचार उत्पन्न करता है और शरीर की 20% ऊर्जा उपयोग करता है।"
}, {
  id: "pt-a-11",
  emoji: "🌡️",
  category: "science",
  ageGroups: ["pre_teen"],
  text: "Absolute zero (−273.15°C) is the coldest possible temperature — at that point all atomic motion stops.",
  textHi: "परम शून्य (−273.15°C) सबसे कम संभव तापमान है — उस बिंदु पर सभी परमाणु गति रुक जाती है।"
}, {
  id: "pt-a-12",
  emoji: "🦈",
  category: "animal",
  ageGroups: ["pre_teen"],
  text: "Sharks can detect electrical fields — including the tiny fields produced by a heartbeat.",
  textHi: "शार्क विद्युत क्षेत्र का पता लगा सकती हैं — यहाँ तक कि दिल की धड़कन से उत्पन्न छोटे क्षेत्र भी।"
}, {
  id: "pt-a-13",
  emoji: "🚀",
  category: "gk",
  ageGroups: ["pre_teen"],
  text: "India's Chandrayaan-3 became the first spacecraft to land near the Moon's south pole in 2023.",
  textHi: "भारत का चंद्रयान-3 2023 में चंद्रमा के दक्षिणी ध्रुव के पास उतरने वाला पहला यान बना।"
}, {
  id: "pt-a-14",
  emoji: "💻",
  category: "gk",
  ageGroups: ["pre_teen"],
  text: "The first computer programmer was Ada Lovelace — she wrote the first algorithm in the 1840s.",
  textHi: "पहली कंप्यूटर प्रोग्रामर Ada Lovelace थीं — उन्होंने 1840 के दशक में पहला एल्गोरिद्म लिखा था।"
}, {
  id: "pt-a-15",
  emoji: "🌿",
  category: "science",
  ageGroups: ["pre_teen"],
  text: "Trees communicate with each other through a fungal network in the soil — scientists call it the 'Wood Wide Web'.",
  textHi: "पेड़ मिट्टी में एक फफूंद नेटवर्क के ज़रिए एक-दूसरे से संवाद करते हैं — वैज्ञानिक इसे 'Wood Wide Web' कहते हैं।"
}];

// ─── Helpers ────────────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<FactCategory, string> = {
  animal: "Animal",
  science: "Science",
  gk: "G.K."
};
const CATEGORY_COLORS: Record<FactCategory, string> = {
  animal: "bg-muted dark:bg-primary text-primary dark:text-muted-foreground border-border dark:border-border",
  science: "bg-muted dark:bg-primary text-primary dark:text-muted-foreground border-border dark:border-border",
  gk: "bg-muted dark:bg-primary text-primary dark:text-muted-foreground border-border dark:border-border"
};
function lsKey(childName: string) {
  return `amynest_facts_${childName.replace(/\s+/g, "_").toLowerCase()}`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// seeded shuffle — deterministic for a given seed
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = s * 1664525 + 1013904223 & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
function pickFacts(ageGroup: AgeGroup, seed: number, count = 10): Fact[] {
  const pool = ALL_FACTS.filter(f => f.ageGroups.includes(ageGroup));
  if (pool.length === 0) return [];
  const shuffled = seededShuffle(pool, seed);
  // Ensure category mix: prioritise animal + science + gk variety
  const byCategory: Record<FactCategory, Fact[]> = {
    animal: [],
    science: [],
    gk: []
  };
  shuffled.forEach(f => byCategory[f.category].push(f));
  const result: Fact[] = [];
  const cats: FactCategory[] = ["animal", "science", "gk"];
  let ci = 0;
  while (result.length < count) {
    const cat = cats[ci % 3]!;
    const next = byCategory[cat].shift();
    if (next) result.push(next);
    ci++;
    if (cats.every(c => byCategory[c].length === 0)) break;
  }
  return result;
}
function dateSeed(date: string, childName: string): number {
  const s = date + childName;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ─── Component ──────────────────────────────────────────────────────────────────

interface AmazingFactsProps {
  childName: string;
  ageGroup: AgeGroup;
  lang?: "en" | "hi";
}
export function AmazingFacts({
  childName,
  ageGroup,
  lang = "en"
}: AmazingFactsProps) {
  const {
    t
  } = useTranslation();
  const [likes, setLikes] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`${lsKey(childName)}_likes`) || "[]"));
    } catch {
      return new Set();
    }
  });
  const [facts, setFacts] = useState<Fact[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  useEffect(() => {
    const seed = dateSeed(todayStr() + refreshCount, childName);
    setFacts(pickFacts(ageGroup, seed));
  }, [ageGroup, childName, refreshCount]);
  const toggleLike = useCallback((id: string) => {
    setLikes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem(`${lsKey(childName)}_likes`, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, [childName]);
  const refreshFacts = () => setRefreshCount(c => c + 1);
  if (facts.length === 0) return null;
  return <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-base">{t("components.amazing_facts.amazing_facts_for_today")}</h3>
        </div>
        <button onClick={refreshFacts} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full">
          <RefreshCw className="h-3.5 w-3.5" /> {t("components.amazing_facts.show_new_facts")}
        </button>
      </div>

      {/* Facts grid */}
      <div className="grid gap-3">
        {facts.map(fact => {
        const isLiked = likes.has(fact.id);
        return <Card key={fact.id} className="rounded-3xl border-border/50 overflow-hidden hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="text-3xl flex-shrink-0 mt-0.5">{fact.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <Badge className={`text-[10px] px-2 py-0 border rounded-full ${CATEGORY_COLORS[fact.category]}`}>
                      {CATEGORY_LABEL[fact.category]}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground leading-snug">
                    {lang === "hi" ? fact.textHi : fact.text}
                  </p>
                  {lang === "hi" && <p className="text-xs text-muted-foreground mt-1 leading-snug">{fact.text}</p>}
                </div>
                <button onClick={() => toggleLike(fact.id)} className={`flex-shrink-0 flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1.5 transition-all ${isLiked ? "bg-muted dark:bg-primary text-primary dark:text-muted-foreground border border-border dark:border-border" : "bg-muted/60 text-muted-foreground hover:bg-muted dark:bg-primary hover:text-primary"}`} title={t("components.amazing_facts.interesting")}>
                  <ThumbsUp className="h-3 w-3" />
                  {isLiked && <span>{t("components.amazing_facts.liked")}</span>}
                </button>
              </CardContent>
            </Card>;
      })}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("components.amazing_facts.tap_for_fresh_facts_tap_to_mark_favourites")}
      </p>
    </div>;
}