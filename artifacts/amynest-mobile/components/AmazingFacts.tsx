import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";

type AgeGroup = "infant" | "toddler" | "preschool" | "early_school" | "pre_teen";
type FactCategory = "animal" | "science" | "gk";

interface Fact {
  id: string;
  emoji: string;
  text: string;
  category: FactCategory;
  ageGroups: AgeGroup[];
}

const FACTS: Fact[] = [
  // Infant (0–11 months)
  { id: "i1", emoji: "👶", category: "science", ageGroups: ["infant"], text: "Newborns can recognise their mother's voice from the very first day!" },
  { id: "i2", emoji: "🐼", category: "animal", ageGroups: ["infant"], text: "A baby panda is smaller than a mouse when it is born!" },
  { id: "i3", emoji: "🧠", category: "science", ageGroups: ["infant"], text: "A baby's brain doubles in size in the first year of life!" },
  { id: "i4", emoji: "🐬", category: "animal", ageGroups: ["infant"], text: "Dolphin calves are born tail-first to prevent drowning." },
  { id: "i5", emoji: "🌙", category: "gk", ageGroups: ["infant"], text: "The Moon is slowly moving away from Earth — about 3.8 cm every year." },
  { id: "i6", emoji: "🐘", category: "animal", ageGroups: ["infant"], text: "Baby elephants can walk within hours of being born!" },
  { id: "i7", emoji: "💧", category: "science", ageGroups: ["infant"], text: "Human babies are made of about 75% water at birth." },
  { id: "i8", emoji: "👁️", category: "science", ageGroups: ["infant"], text: "Babies are born with blue or grey eyes — colour develops over 6–12 months." },

  // Toddler (1–3 years) — also surfaced to the extended infant band (12–24 m)
  // so 1-year-olds get a richer pool of facts than just the 8 newborn ones.
  { id: "t1", emoji: "🦒", category: "animal", ageGroups: ["infant", "toddler"], text: "Giraffes have the same number of neck bones as humans — just 7, but much bigger!" },
  { id: "t2", emoji: "🐸", category: "animal", ageGroups: ["infant", "toddler"], text: "Frogs drink water through their skin — they never use their mouth to drink!" },
  { id: "t3", emoji: "☀️", category: "gk", ageGroups: ["infant", "toddler"], text: "The Sun is so big that one million Earths could fit inside it!" },
  { id: "t4", emoji: "🍎", category: "science", ageGroups: ["infant", "toddler"], text: "Apples float in water because they are 25% air!" },
  { id: "t5", emoji: "🦋", category: "animal", ageGroups: ["infant", "toddler"], text: "Butterflies taste with their feet — they have taste sensors on their legs!" },
  { id: "t6", emoji: "🐢", category: "animal", ageGroups: ["infant", "toddler"], text: "Turtles have been on Earth for over 200 million years — older than dinosaurs!" },
  { id: "t7", emoji: "🐧", category: "animal", ageGroups: ["infant", "toddler"], text: "Penguins live only in the Southern Hemisphere — never in the wild at the North Pole!" },
  { id: "t8", emoji: "❄️", category: "gk", ageGroups: ["infant", "toddler"], text: "No two snowflakes are exactly the same shape." },
  { id: "t9", emoji: "🐝", category: "animal", ageGroups: ["infant", "toddler"], text: "Bees can recognise human faces — just like we do!" },

  // Preschool (3–5 years)
  { id: "p1", emoji: "🦜", category: "animal", ageGroups: ["preschool"], text: "Parrots can learn hundreds of words and even understand their meaning!" },
  { id: "p2", emoji: "🚀", category: "gk", ageGroups: ["preschool"], text: "There are 8 planets in our solar system. Earth is the third one from the Sun." },
  { id: "p3", emoji: "🐙", category: "animal", ageGroups: ["preschool"], text: "An octopus has 3 hearts, 9 brains, and blue blood!" },
  { id: "p4", emoji: "🍌", category: "science", ageGroups: ["preschool"], text: "Bananas are slightly radioactive — but totally safe to eat!" },
  { id: "p5", emoji: "🦩", category: "animal", ageGroups: ["preschool"], text: "Flamingos are born white — they turn pink from eating pink shrimp!" },
  { id: "p6", emoji: "🏔️", category: "gk", ageGroups: ["preschool"], text: "Mount Everest is the tallest mountain in the world — it's in the Himalayas!" },
  { id: "p7", emoji: "🐘", category: "animal", ageGroups: ["preschool"], text: "Elephants are the only animals that cannot jump!" },
  { id: "p8", emoji: "🦴", category: "science", ageGroups: ["preschool"], text: "Babies are born with 270 bones, but adults only have 206 — some fuse as we grow." },
  { id: "p9", emoji: "🐌", category: "animal", ageGroups: ["preschool"], text: "A snail can sleep for up to 3 years at a time!" },
  { id: "p10", emoji: "🦅", category: "animal", ageGroups: ["preschool"], text: "Eagles can spot a rabbit from 3 km away — eyesight 5 times sharper than humans!" },

  // Early school (5–9 years)
  { id: "e1", emoji: "⚡", category: "science", ageGroups: ["early_school"], text: "Lightning is 5 times hotter than the surface of the Sun!" },
  { id: "e2", emoji: "🌿", category: "science", ageGroups: ["early_school"], text: "There are more trees on Earth than stars in the Milky Way galaxy." },
  { id: "e3", emoji: "🐝", category: "animal", ageGroups: ["early_school"], text: "A single honeybee makes only 1/12 teaspoon of honey in its entire lifetime." },
  { id: "e4", emoji: "🏛️", category: "gk", ageGroups: ["early_school"], text: "The Great Wall of China took over 1,000 years and millions of workers to build." },
  { id: "e5", emoji: "🦠", category: "science", ageGroups: ["early_school"], text: "Your body has more bacteria in it than it has human cells!" },
  { id: "e6", emoji: "🌋", category: "gk", ageGroups: ["early_school"], text: "The deepest point on Earth — the Mariana Trench — is deeper than Everest is tall!" },
  { id: "e7", emoji: "🦑", category: "animal", ageGroups: ["early_school"], text: "Giant squids have eyes the size of a football — biggest of any animal!" },
  { id: "e8", emoji: "🗺️", category: "gk", ageGroups: ["early_school"], text: "Russia is the world's largest country by area — it spans 11 time zones!" },
  { id: "e9", emoji: "🦜", category: "animal", ageGroups: ["early_school"], text: "Crows are smart enough to make tools and remember human faces for years." },
  { id: "e10", emoji: "🎯", category: "gk", ageGroups: ["early_school"], text: "Chess was invented in India — it was called 'Chaturanga' over 1,500 years ago." },
  { id: "e11", emoji: "🕸️", category: "animal", ageGroups: ["early_school"], text: "Spider silk is stronger than steel of the same thickness — and stretchy too!" },

  // Pre-teen (10–14 years)
  { id: "pt1", emoji: "🌌", category: "science", ageGroups: ["pre_teen"], text: "The observable universe contains an estimated 2 trillion galaxies." },
  { id: "pt2", emoji: "🧬", category: "science", ageGroups: ["pre_teen"], text: "Human DNA is 98.8% identical to chimpanzee DNA." },
  { id: "pt3", emoji: "⚛️", category: "science", ageGroups: ["pre_teen"], text: "All humans, with empty atomic space removed, would fit in a sugar cube." },
  { id: "pt4", emoji: "🏛️", category: "gk", ageGroups: ["pre_teen"], text: "The Great Pyramid was aligned to true north within 0.05 degrees." },
  { id: "pt5", emoji: "🐙", category: "animal", ageGroups: ["pre_teen"], text: "Octopuses can edit their own RNA to adapt to temperature changes." },
  { id: "pt6", emoji: "🌍", category: "gk", ageGroups: ["pre_teen"], text: "Cleopatra lived closer in time to the Moon landing than to the Great Pyramid's construction." },
  { id: "pt7", emoji: "🔢", category: "gk", ageGroups: ["pre_teen"], text: "The number zero was invented in India by Brahmagupta around 628 CE." },
  { id: "pt8", emoji: "🌊", category: "science", ageGroups: ["pre_teen"], text: "More than 80% of Earth's oceans have never been explored by humans." },
];

function ageMonthsToGroup(months: number): AgeGroup {
  // Extended in task #196: "infant" now spans the full Parent Hub infant
  // band (0–24 m) so the AmazingFacts tile surfaces for the InfantHub age
  // window. Toddler-tagged facts also light up via the dual ageGroups on
  // each FACTS entry below to keep coverage rich for 12–24m.
  if (months < 24) return "infant";
  if (months < 36) return "toddler";
  if (months < 60) return "preschool";
  if (months < 108) return "early_school";
  return "pre_teen";
}

const CATEGORY_LABEL: Record<FactCategory | "all", string> = {
  all: "All", animal: "Animals", science: "Science", gk: "GK",
};

export function AmazingFacts({ ageMonths = 60 }: { ageMonths?: number }) {
  const { t } = useTranslation();
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);

  const grp = ageMonthsToGroup(ageMonths);
  const ageFacts = useMemo(() => FACTS.filter(f => f.ageGroups.includes(grp)), [grp]);
  const [category, setCategory] = useState<FactCategory | "all">("all");

  const filtered = useMemo(
    () => category === "all" ? ageFacts : ageFacts.filter(f => f.category === category),
    [ageFacts, category],
  );
  const [idx, setIdx] = useState(0);

  useEffect(() => { setIdx(0); }, [category, ageMonths]);

  if (filtered.length === 0) {
    return <Text style={s.dim}>{t("components.amazing_facts.no_facts_available_right_now")}</Text>;
  }

  const fact = filtered[Math.min(idx, filtered.length - 1)];
  const next = () => setIdx(i => (i + 1) % filtered.length);

  return (
    <View style={{ gap: 12 }}>
      {/* Category pills */}
      <View style={s.pills}>
        {(["all", "animal", "science", "gk"] as const).map(cat => {
          const active = category === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setCategory(cat)}
              style={[s.pill, active && s.pillActive]}
            >
              <Text style={[s.pillText, active && s.pillTextActive]}>
                {CATEGORY_LABEL[cat]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Fact card */}
      <View style={s.factCard}>
        <Text style={s.factEmoji}>{fact.emoji}</Text>
        <Text style={s.factText}>{fact.text}</Text>
        <View style={s.factMeta}>
          <Text style={s.factTag}>{CATEGORY_LABEL[fact.category]}</Text>
          <Text style={s.factCounter}>{Math.min(idx + 1, filtered.length)} / {filtered.length}</Text>
        </View>
      </View>

      <Pressable onPress={next} style={s.nextBtn}>
        <Ionicons name="refresh" size={14} color="#fff" />
        <Text style={s.nextText}>{t("components.amazing_facts.show_another_fact")}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    dim: { color: c.textMuted, fontSize: 13 },
    pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    pill: {
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
      backgroundColor: c.calloutBg, borderWidth: 1, borderColor: c.glassBorder,
    },
    pillActive: {
      backgroundColor: "rgba(255,78,205,0.25)", borderColor: "rgba(255,78,205,0.6)",
    },
    pillText: { color: c.textBody, fontSize: 11.5, fontWeight: "600" },
    pillTextActive: { color: "#fff" },

    factCard: {
      backgroundColor: c.calloutBg, borderRadius: 14, padding: 16,
      borderWidth: 1, borderColor: c.glassBorder, alignItems: "center", gap: 10,
    },
    factEmoji: { fontSize: 48 },
    factText: { color: c.foreground, fontSize: 14, lineHeight: 20, textAlign: "center" },
    factMeta: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 2 },
    factTag: { color: c.statusWarningText, fontSize: 11, fontWeight: "700" },
    factCounter: { color: c.textDim, fontSize: 11 },

    nextBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      backgroundColor: "rgba(123,63,242,0.35)", borderRadius: 12, paddingVertical: 10,
      borderWidth: 1, borderColor: "rgba(255,78,205,0.4)",
    },
    nextText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  });
}
