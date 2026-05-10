import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { brand, palette } from "@/constants/colors";

// ─── Types ───────────────────────────────────────────────────

type TipCategory = "tip" | "health" | "activity" | "guidance";
type DataAgeGroup = "infant" | "toddler" | "preschool" | "early_school" | "pre_teen";
type TipEntry = { id: string; en: string };

const CATEGORIES: TipCategory[] = ["tip", "health", "activity", "guidance"];
const AI_DAILY_LIMIT = 2;

const CATEGORY_META: Record<TipCategory, { emoji: string; label: string; accent: string }> = {
  tip:      { emoji: "💡", label: "Today's Tip",    accent: brand.purple500 },
  health:   { emoji: "🩺", label: "Health Tip",     accent: palette.emerald500 },
  activity: { emoji: "🎯", label: "Activity",        accent: palette.blue500 },
  guidance: { emoji: "💗", label: "Parent Guidance", accent: palette.amber500 },
};

// ─── Tip data (ported from web parenting-tips-data.ts) ───────

const TIPS: Record<DataAgeGroup, Record<TipCategory, TipEntry[]>> = {
  infant: {
    tip: [
      { id: "i-t-1", en: "Keep baby's sleep routine consistent — same time, same lullaby every night." },
      { id: "i-t-2", en: "Use a soft voice when talking before sleep — your tone calms baby's brain." },
      { id: "i-t-3", en: "Respond to every cry within 1 minute — it builds deep trust." },
      { id: "i-t-4", en: "Skin-to-skin contact for 15 minutes daily boosts bonding hormones." },
      { id: "i-t-5", en: "Talk to your baby constantly — narrate what you're doing." },
      { id: "i-t-6", en: "Dim lights 30 minutes before bedtime to signal sleep time." },
    ],
    health: [
      { id: "i-h-1", en: "Burp baby for 5 minutes after every feed to prevent gas." },
      { id: "i-h-2", en: "Check vaccination calendar this month — never skip a due date." },
      { id: "i-h-3", en: "Sterilize bottles in boiling water for 5 minutes daily." },
      { id: "i-h-4", en: "Tummy time 3 times a day strengthens neck and back muscles." },
      { id: "i-h-5", en: "Massage baby with warm oil 20 minutes before bath — boosts circulation." },
    ],
    activity: [
      { id: "i-a-1", en: "Show a colorful toy and slowly move it side to side — eye tracking." },
      { id: "i-a-2", en: "Play peek-a-boo for 5 minutes — teaches object permanence." },
      { id: "i-a-3", en: "Read a board book aloud — even if baby just looks at pictures." },
      { id: "i-a-4", en: "Make different facial expressions — baby will try to copy you." },
      { id: "i-a-5", en: "Gently shake a rattle on each side — helps locate sound." },
    ],
    guidance: [
      { id: "i-g-1", en: "Never compare your baby's milestones — every child grows at their own pace." },
      { id: "i-g-2", en: "Trust your gut — if something feels off, talk to the doctor." },
      { id: "i-g-3", en: "Sleep when baby sleeps — your rest matters as much as theirs." },
      { id: "i-g-4", en: "Ask for help — accepting support is not weakness, it's wisdom." },
    ],
  },

  toddler: {
    tip: [
      { id: "t-t-1", en: "Offer choices, not commands — 'red shirt or blue?' instead of 'wear this'." },
      { id: "t-t-2", en: "Get down to their eye level when talking — it builds connection fast." },
      { id: "t-t-3", en: "Tantrums mean big feelings — stay calm, hold space, don't argue." },
      { id: "t-t-4", en: "Use 'when-then' instead of 'no' — 'when toys are away, then storytime'." },
      { id: "t-t-5", en: "Praise effort not result — 'you tried so hard!' not just 'good job'." },
    ],
    health: [
      { id: "t-h-1", en: "Brush teeth twice daily — make it a fun song they look forward to." },
      { id: "t-h-2", en: "Offer water in a sippy cup every hour — toddlers forget to drink." },
      { id: "t-h-3", en: "Include 1 fruit and 1 veggie at every meal — even if just a tiny piece." },
      { id: "t-h-4", en: "30 minutes of outdoor play daily — sunlight helps Vitamin D and mood." },
      { id: "t-h-5", en: "Put toddler to bed by 8 PM — sleep before 9 grows brain best." },
    ],
    activity: [
      { id: "t-a-1", en: "Sort toys by color in 3 baskets — teaches color and order together." },
      { id: "t-a-2", en: "Give a wooden spoon and a pot — the best drum set ever." },
      { id: "t-a-3", en: "Sing 'Head Shoulders Knees Toes' — teaches body parts and rhythm." },
      { id: "t-a-4", en: "Hide a toy under a cup and switch — cup game builds memory." },
      { id: "t-a-5", en: "Fill a tray with rice and let them dig with hands — sensory play." },
    ],
    guidance: [
      { id: "t-g-1", en: "Saying 'no' 100 times a day is normal — they're testing the world." },
      { id: "t-g-2", en: "When you lose your temper, apologize — it teaches them how to repair." },
      { id: "t-g-3", en: "Don't punish for accidents — spilled milk is just spilled milk." },
      { id: "t-g-4", en: "One 'special 10 minutes' a day — undivided attention transforms behavior." },
    ],
  },

  preschool: {
    tip: [
      { id: "p-t-1", en: "Ask 'what do you think?' before answering — builds critical thinking." },
      { id: "p-t-2", en: "Read 20 minutes daily — strongest predictor of school success." },
      { id: "p-t-3", en: "Let them pour their own water and dress themselves — independence grows fast." },
      { id: "p-t-4", en: "Ask open questions about their day — 'best part?' instead of 'how was it?'." },
      { id: "p-t-5", en: "Make mistakes openly — show them how to laugh and try again." },
    ],
    health: [
      { id: "p-h-1", en: "60 minutes of active play daily — running, jumping, climbing." },
      { id: "p-h-2", en: "Sleep 10–13 hours total including nap — non-negotiable for brain growth." },
      { id: "p-h-3", en: "Brush teeth with parent supervision until age 7 — they miss spots." },
      { id: "p-h-4", en: "Pack 5 colors on the plate — variety prevents picky eating." },
    ],
    activity: [
      { id: "p-a-1", en: "Make a treasure hunt with 5 picture clues — practices reading and logic." },
      { id: "p-a-2", en: "Play 'I Spy' with colors and shapes — builds vocabulary on the go." },
      { id: "p-a-3", en: "Bake together — measuring cups teach fractions naturally." },
      { id: "p-a-4", en: "Play freeze dance — when music stops, freeze. Self-control practice." },
    ],
    guidance: [
      { id: "p-g-1", en: "Time-in not time-out — sit together until big feelings pass." },
      { id: "p-g-2", en: "Whisper instead of shouting when they're loud — they'll lean in to listen." },
      { id: "p-g-3", en: "Let them be bored sometimes — boredom births creativity." },
      { id: "p-g-4", en: "Connection before correction — hug first, teach second." },
    ],
  },

  early_school: {
    tip: [
      { id: "e-t-1", en: "Set a homework-first rule before TV — habit beats willpower every day." },
      { id: "e-t-2", en: "Ask 'what was hard today?' — opens deeper conversations than 'how was school?'." },
      { id: "e-t-3", en: "Praise the strategy, not the talent — 'smart way to solve it!'." },
      { id: "e-t-4", en: "Plan one screen-free family night a week — board games and laughter." },
    ],
    health: [
      { id: "e-h-1", en: "9–11 hours of sleep — screens off 1 hour before bed." },
      { id: "e-h-2", en: "60 minutes of physical play or sport every day — non-negotiable." },
      { id: "e-h-3", en: "Pack a protein at every meal — eggs, dal, paneer, chicken." },
      { id: "e-h-4", en: "Eye care — 20-20-20 rule: every 20 min, look 20 feet away for 20 sec." },
    ],
    activity: [
      { id: "e-a-1", en: "Make a 'why' jar — they ask 1 curious question daily, you research together." },
      { id: "e-a-2", en: "Cook one simple recipe a week together — math, chemistry, life skill." },
      { id: "e-a-3", en: "Family chess or carrom night — strategy thinking grows fast." },
      { id: "e-a-4", en: "Build a paper airplane challenge — test which design flies furthest." },
    ],
    guidance: [
      { id: "e-g-1", en: "Listen without solving — sometimes they just need to be heard." },
      { id: "e-g-2", en: "Avoid comparing with siblings or classmates — it kills self-worth slowly." },
      { id: "e-g-3", en: "Allow safe failure — protected kids become fragile adults." },
      { id: "e-g-4", en: "Praise effort and kindness more than marks — character lasts longer." },
    ],
  },

  pre_teen: {
    tip: [
      { id: "x-t-1", en: "Drive time = talk time — kids open up most when not facing you." },
      { id: "x-t-2", en: "Knock before entering their room — respect builds trust." },
      { id: "x-t-3", en: "Talk about real topics — money, safety, relationships, mental health." },
      { id: "x-t-4", en: "Don't lecture — ask questions and let them think out loud." },
    ],
    health: [
      { id: "x-h-1", en: "8–10 hours sleep — growth and brain wiring happen at night." },
      { id: "x-h-2", en: "Daily protein + iron — especially important during growth spurts." },
      { id: "x-h-3", en: "Encourage 1 sport — physical activity protects mental health." },
      { id: "x-h-4", en: "Limit junk food at home — they eat what's available." },
    ],
    activity: [
      { id: "x-a-1", en: "Plan a weekend trip together — they decide budget, route, food." },
      { id: "x-a-2", en: "Cook a full meal together — recipe, shop, prep, serve." },
      { id: "x-a-3", en: "Watch a documentary together and discuss — sparks real ideas." },
      { id: "x-a-4", en: "Teach a life skill — change a tyre, sew a button, set up a router." },
    ],
    guidance: [
      { id: "x-g-1", en: "Their mood swings are not personal — hormones are doing their job." },
      { id: "x-g-2", en: "Pick your battles — clothes and hair are not worth war." },
      { id: "x-g-3", en: "Privacy is a need, not a luxury — give it generously." },
      { id: "x-g-4", en: "Stay curious not furious — ask 'help me understand' before reacting." },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────

function getDataGroup(ageMonths: number): DataAgeGroup {
  if (ageMonths < 12) return "infant";
  if (ageMonths < 36) return "toddler";
  if (ageMonths < 60) return "preschool";
  if (ageMonths < 144) return "early_school";
  return "pre_teen";
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ─── Component ───────────────────────────────────────────────

interface DailyTipsProps {
  ageMonths: number;
  childName: string;
}

export function DailyTips({ ageMonths, childName }: DailyTipsProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const authFetch = useAuthFetch();
  const group = getDataGroup(ageMonths);

  const [salts, setSalts] = useState<Record<TipCategory, number>>({
    tip: 0, health: 0, activity: 0, guidance: 0,
  });
  const [helpful, setHelpful] = useState<Record<string, boolean>>({});
  const [aiCache, setAiCache] = useState<Record<string, string>>({});
  const [aiUsed, setAiUsed] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  React.useEffect(() => {
    const today = todayKey();
    Promise.all([
      AsyncStorage.getItem(`amynest_tips_helpful_${today}`),
      AsyncStorage.getItem(`amynest_tip_ai_cache_${today}_en`),
      AsyncStorage.getItem(`amynest_tip_ai_${today}`),
    ]).then(([h, c, a]) => {
      if (h) setHelpful(JSON.parse(h));
      if (c) setAiCache(JSON.parse(c));
      if (a) setAiUsed(parseInt(a, 10) || 0);
    }).catch(() => {});
  }, []);

  const tips = useMemo(() => {
    const out = {} as Record<TipCategory, TipEntry>;
    for (const cat of CATEGORIES) {
      const pool = TIPS[group][cat] ?? [];
      if (pool.length === 0) {
        out[cat] = { id: "fallback", en: "Spend a quiet moment together." };
        continue;
      }
      const seed = hashSeed(`${todayKey()}_${group}_${cat}_${salts[cat]}`);
      out[cat] = pool[seed % pool.length];
    }
    return out;
  }, [group, salts]);

  const handleNext = useCallback((cat: TipCategory) => {
    Haptics.selectionAsync().catch(() => {});
    setSalts(s => ({ ...s, [cat]: s[cat] + 1 }));
  }, []);

  const handleHelpful = useCallback(async (tipId: string) => {
    const next = { ...helpful, [tipId]: !helpful[tipId] };
    setHelpful(next);
    await AsyncStorage.setItem(`amynest_tips_helpful_${todayKey()}`, JSON.stringify(next)).catch(() => {});
  }, [helpful]);

  const handlePersonalize = useCallback(async (cat: TipCategory) => {
    const tip = tips[cat];
    const cacheKey = `${tip.id}_en`;
    if (aiCache[cacheKey] || aiUsed >= AI_DAILY_LIMIT || busyId) return;
    setBusyId(tip.id);
    try {
      const res = await authFetch("/api/ai/rewrite-tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tip.en, childName, language: "en" }),
      });
      if (!res.ok) throw new Error("rewrite failed");
      const json = await res.json() as { rewritten?: string };
      const rewritten = (json.rewritten ?? "").trim();
      if (rewritten) {
        const next = { ...aiCache, [cacheKey]: rewritten };
        setAiCache(next);
        const today = todayKey();
        const newCount = aiUsed + 1;
        setAiUsed(newCount);
        await Promise.all([
          AsyncStorage.setItem(`amynest_tip_ai_cache_${today}_en`, JSON.stringify(next)),
          AsyncStorage.setItem(`amynest_tip_ai_${today}`, String(newCount)),
        ]).catch(() => {});
      }
    } catch {
      // silent fallback
    } finally {
      setBusyId(null);
    }
  }, [tips, aiCache, aiUsed, busyId, authFetch, childName]);

  return (
    <View style={s.root}>
      {CATEGORIES.map(cat => {
        const meta = CATEGORY_META[cat];
        const tip = tips[cat];
        const cacheKey = `${tip.id}_en`;
        const text = aiCache[cacheKey] ?? tip.en;
        const isPersonalized = Boolean(aiCache[cacheKey]);
        const liked = Boolean(helpful[tip.id]);
        const isBusy = busyId === tip.id;
        const canPersonalize = !isPersonalized && aiUsed < AI_DAILY_LIMIT && !isBusy;

        return (
          <View
            key={cat}
            style={[
              s.card,
              {
                borderLeftColor: meta.accent,
                borderColor: colors.border,
                backgroundColor: colors.calloutBg,
              },
            ]}
          >
            {/* Header */}
            <View style={s.cardHeader}>
              <View style={s.headerLeft}>
                <Text style={s.emoji}>{meta.emoji}</Text>
                <Text style={[s.catLabel, { color: meta.accent }]}>{meta.label}</Text>
              </View>
              {isPersonalized && (
                <View style={[s.aiPill, { backgroundColor: meta.accent + "22" }]}>
                  <Ionicons name="sparkles" size={10} color={meta.accent} />
                  <Text style={[s.aiPillText, { color: meta.accent }]}>
                    {t("components.daily_tips.amy_ai")}
                  </Text>
                </View>
              )}
            </View>

            {/* Tip text */}
            <Text style={[s.tipText, { color: colors.textBody }]}>{text}</Text>

            {/* Actions */}
            <View style={s.actions}>
              <Pressable
                onPress={() => handleHelpful(tip.id)}
                style={[s.actionBtn, liked && { backgroundColor: meta.accent + "22" }]}
              >
                <Ionicons
                  name={liked ? "thumbs-up" : "thumbs-up-outline"}
                  size={14}
                  color={liked ? meta.accent : colors.textMuted}
                />
                <Text style={[s.actionText, { color: liked ? meta.accent : colors.textMuted }]}>
                  {liked ? `${t("components.daily_tips.helpful")} ✓` : t("components.daily_tips.helpful")}
                </Text>
              </Pressable>

              <View style={s.rightActions}>
                {canPersonalize && (
                  <Pressable onPress={() => handlePersonalize(cat)} style={s.actionBtn}>
                    <Ionicons name="sparkles-outline" size={13} color={meta.accent} />
                    <Text style={[s.actionText, { color: meta.accent }]}>
                      {t("components.daily_tips.personalize")}
                    </Text>
                  </Pressable>
                )}
                <Pressable onPress={() => handleNext(cat)} style={s.actionBtn}>
                  {isBusy ? (
                    <ActivityIndicator size={12} color={colors.textMuted} />
                  ) : (
                    <MaterialCommunityIcons name="refresh" size={14} color={colors.textMuted} />
                  )}
                  <Text style={[s.actionText, { color: colors.textMuted }]}>
                    {t("components.daily_tips.next_tip")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}

      {/* AI quota footer */}
      <Text style={[s.quota, { color: colors.textMuted }]}>
        {t("components.daily_tips.ai_left", { count: Math.max(0, AI_DAILY_LIMIT - aiUsed) })}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  emoji: { fontSize: 22 },
  catLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiPillText: { fontSize: 10, fontWeight: "700" },
  tipText: { fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rightActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionText: { fontSize: 12, fontWeight: "700" },
  quota: { fontSize: 10, textAlign: "right" },
});
