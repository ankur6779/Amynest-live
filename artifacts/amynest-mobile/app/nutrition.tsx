import React, { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, TouchableOpacity,
  Alert, Platform, UIManager, LayoutAnimation,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { palette, brand } from "@/constants/colors";
import {
  AGE_GROUPS, NUTRIENTS, MEAL_PLANS, FAMILY_PORTIONS,
  MEDICAL_DISCLAIMER, REFERENCES, AgeGroupId, Nutrient,
} from "@/lib/nutrition-data";
import { useTranslation } from "react-i18next";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Tab = "nutrients" | "meals" | "family" | "score";

// ─── Score helpers ────────────────────────────────────────────────────────────
function scoreColor(s: number, c: ReturnType<typeof useColors>) {
  if (s >= 80) return palette.green500;
  if (s >= 50) return palette.amber500;
  return palette.red500;
}
function scoreLabelKey(s: number) {
  if (s >= 80) return "screens.nutrition.score_excellent";
  if (s >= 60) return "screens.nutrition.score_good";
  if (s >= 40) return "screens.nutrition.score_attention";
  return "screens.nutrition.score_critical";
}

// ─── Age Group colors (simple mapping) ───────────────────────────────────────
const AGE_COLORS: Record<AgeGroupId, { bg: string; text: string; border: string }> = {
  infant_0_6:    { bg: palette.pink50, text: palette.pink700, border: palette.pink200 },
  infant_6_12:   { bg: palette.rose50, text: palette.rose700, border: palette.rose200 },
  toddler_1_3:   { bg: palette.violet50, text: brand.violet600, border: palette.violet200 },
  preschool_3_6: { bg: palette.indigo50, text: palette.indigo700, border: palette.indigo200 },
  school_6_10:   { bg: palette.blue50, text: palette.blue700, border: palette.blue200 },
  preteen_10_15: { bg: palette.cyan50, text: palette.cyan700, border: palette.cyan200 },
  adult:         { bg: palette.teal50, text: palette.teal700, border: palette.teal200 },
  pregnancy:     { bg: palette.violet50, text: brand.violet600, border: palette.violet200 },
  postpartum:    { bg: palette.fuchsia50, text: palette.fuchsia700, border: palette.fuchsia300 },
};

const NUTRIENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  protein:    { bg: palette.orange50, text: palette.orange700, border: palette.orange200 },
  iron:       { bg: palette.rose50, text: palette.rose700, border: palette.rose200 },
  calcium:    { bg: palette.sky50, text: palette.sky700, border: palette.sky200 },
  vitamin_a:  { bg: palette.amber50, text: palette.amber700, border: palette.amber200 },
  vitamin_c:  { bg: palette.yellow50, text: palette.yellow700, border: palette.yellow200 },
  vitamin_d:  { bg: palette.orange50, text: palette.orange700, border: palette.orange200 },
  vitamin_b:  { bg: palette.emerald50, text: palette.green700, border: palette.green200 },
  vitamin_b12:{ bg: palette.rose50, text: palette.rose700, border: palette.rose200 },
  vitamin_k:  { bg: palette.emerald50, text: palette.emerald800, border: palette.emerald200 },
};

// ─── NutrientCard ─────────────────────────────────────────────────────────────
function NutrientCard({
  nutrient, ageGroupId, onPress,
}: {
  nutrient: Nutrient;
  ageGroupId: AgeGroupId;
  onPress: () => void;
}) {
  const c = useColors();
  const { t } = useTranslation();
  const nc = NUTRIENT_COLORS[nutrient.id] ?? { bg: palette.gray50, text: palette.gray700, border: palette.gray200 };
  const need = nutrient.dailyNeeds[ageGroupId];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.nutrientCard,
        { backgroundColor: nc.bg, borderColor: nc.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <Text style={{ fontSize: 28 }}>{nutrient.emoji}</Text>
        <Ionicons name="chevron-forward" size={16} color={nc.text} />
      </View>
      <Text style={[styles.nutrientName, { color: nc.text }]}>{nutrient.name}</Text>
      <Text style={[styles.nutrientNameHi, { color: nc.text + "99" }]}>{nutrient.nameHi}</Text>
      <Text style={[styles.tagline, { color: palette.slate500 }]}>{nutrient.tagline}</Text>
      <View style={[styles.needBadge, { backgroundColor: "#ffffff88" }]}>
        <Text style={[{ color: nc.text, fontSize: 11, fontWeight: "700" }]}>
          {t("screens.nutrition.per_day", { amount: need.amount, unit: need.unit })}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── NutrientDetailSheet (Modal) ──────────────────────────────────────────────
function NutrientDetail({
  nutrient, ageGroupId, onClose,
}: {
  nutrient: Nutrient;
  ageGroupId: AgeGroupId;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const nc = NUTRIENT_COLORS[nutrient.id] ?? { bg: palette.gray50, text: palette.gray700, border: palette.gray200 };
  const need = nutrient.dailyNeeds[ageGroupId];
  const ag = AGE_GROUPS.find(a => a.id === ageGroupId)!;

  return (
    <View style={styles.detailContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.detailHeader, { backgroundColor: nc.bg, borderBottomColor: nc.border }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={palette.slate500} />
          </Pressable>
          <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>{nutrient.emoji}</Text>
          <Text style={[styles.detailTitle, { color: nc.text }]}>{nutrient.name}</Text>
          <Text style={{ color: nc.text + "99", fontSize: 14, textAlign: "center" }}>{nutrient.nameHi}</Text>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {/* Daily need */}
          <View style={[styles.needCard, { backgroundColor: nc.bg, borderColor: nc.border }]}>
            <Text style={{ fontSize: 11, color: palette.slate500, fontWeight: "600", marginBottom: 4 }}>
              {t("screens.nutrition.daily_need_for", { label: ag.label.toUpperCase(), labelHi: ag.labelHi.toUpperCase() })}
            </Text>
            <Text style={[{ fontSize: 28, fontWeight: "900", color: nc.text }]}>
              {need.amount} <Text style={{ fontSize: 16 }}>{need.unit}</Text>
            </Text>
            {need.note && <Text style={{ fontSize: 11, color: palette.slate500, marginTop: 4 }}>{need.note}</Text>}
          </View>

          {/* Benefits */}
          <View>
            <Text style={styles.sectionTitle}>{t("screens.nutrition.benefits_title")}</Text>
            {nutrient.benefits.map((b, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={{ color: palette.green500, marginRight: 6 }}>✓</Text>
                <Text style={{ color: palette.gray700, flex: 1, fontSize: 13 }}>{b}</Text>
              </View>
            ))}
            <View style={{ marginTop: 8, backgroundColor: palette.emerald50, borderRadius: 10, padding: 10 }}>
              {nutrient.benefitsHi.map((b, i) => (
                <Text key={i} style={{ fontSize: 12, color: palette.green700, marginBottom: 2 }}>• {b}</Text>
              ))}
            </View>
          </View>

          {/* Food Sources */}
          <View>
            <Text style={styles.sectionTitle}>{t("screens.nutrition.sources_title")}</Text>
            <View style={{ gap: 8 }}>
              {nutrient.sources.map((src, i) => (
                <View key={i} style={styles.sourceRow}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{src.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontWeight: "600", color: palette.slate800, fontSize: 13 }}>{src.name}</Text>
                      {src.type === "veg" ? (
                        <View style={[styles.typeBadge, { backgroundColor: palette.green100 }]}>
                          <Text style={{ fontSize: 9, color: palette.green700, fontWeight: "700" }}>{t("screens.nutrition.veg_badge")}</Text>
                        </View>
                      ) : (
                        <View style={[styles.typeBadge, { backgroundColor: palette.orange200 }]}>
                          <Text style={{ fontSize: 9, color: palette.orange700, fontWeight: "700" }}>{t("screens.nutrition.nonveg_badge")}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: palette.slate500 }}>{src.nameHi} · {src.serving}</Text>
                    <Text style={{ fontSize: 11, color: palette.slate600, fontWeight: "600" }}>→ {src.amount}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Deficiency */}
          <View>
            <Text style={styles.sectionTitle}>{t("screens.nutrition.deficiency_title")}</Text>
            <View style={[styles.deficiencyBox, { borderColor: palette.rose200 }]}>
              {nutrient.deficiencySymptoms.map((d, i) => (
                <Text key={i} style={{ color: palette.rose700, fontSize: 12, marginBottom: 4 }}>⚠ {d}</Text>
              ))}
            </View>
          </View>

          {/* Source */}
          <Text style={{ fontSize: 10, color: palette.slate400, textAlign: "center" }}>
            {t("screens.nutrition.source_footer")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Meal Plan Tab ─────────────────────────────────────────────────────────────
function MealPlanTab({ ageGroupId }: { ageGroupId: AgeGroupId }) {
  const { t } = useTranslation();
  const plan = MEAL_PLANS.find(p => p.applies.includes(ageGroupId));
  const [dayIdx, setDayIdx] = useState(0);
  const [isVeg, setIsVeg] = useState(true);

  if (!plan) {
    return (
      <View style={{ padding: 24, alignItems: "center" }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🍼</Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: palette.slate800, textAlign: "center", marginBottom: 8 }}>
          {t("screens.nutrition.ebf_title")}
        </Text>
        <Text style={{ fontSize: 13, color: palette.slate600, textAlign: "center", lineHeight: 20 }}>
          {t("screens.nutrition.ebf_desc")}
        </Text>
        <View style={{ marginTop: 12, backgroundColor: palette.violet50, borderRadius: 12, padding: 12 }}>
          <Text style={{ fontSize: 12, color: brand.violet600, textAlign: "center" }}>
            {t("screens.nutrition.ebf_hi")}
          </Text>
        </View>
      </View>
    );
  }

  const day = plan.days[dayIdx];
  const meal = isVeg ? day.veg : day.nonVeg;
  const MEAL_SLOTS = [
    { key: "breakfast", time: "🌅 Breakfast", color: palette.orange50, border: palette.orange200, text: palette.amber800 },
    meal.midMorning ? { key: "midMorning", time: "🍎 Mid-Morning", color: palette.emerald50, border: palette.green200, text: palette.emerald800 } : null,
    { key: "lunch", time: "🌞 Lunch", color: palette.orange50, border: palette.orange300, text: palette.orange800 },
    { key: "snack", time: "🍪 Snack", color: palette.violet50, border: palette.violet200, text: brand.violet800 },
    { key: "dinner", time: "🌙 Dinner", color: palette.blue50, border: palette.blue200, text: palette.blue800 },
  ].filter(Boolean) as { key: string; time: string; color: string; border: string; text: string }[];

  return (
    <View style={{ gap: 12 }}>
      {/* Header */}
      <View>
        <Text style={{ fontSize: 16, fontWeight: "800", color: palette.slate800 }}>{plan.ageCategory}</Text>
        <Text style={{ fontSize: 12, color: palette.slate500 }}>{plan.ageCategoryHi}</Text>
      </View>

      {/* Portion note */}
      <View style={{ backgroundColor: palette.blue50, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.blue200 }}>
        <Text style={{ fontSize: 12, color: palette.blue800 }}>📏 {plan.portionNote}</Text>
        <Text style={{ fontSize: 11, color: palette.blue500, marginTop: 4 }}>{plan.portionNoteHi}</Text>
      </View>

      {/* Veg / Non-veg toggle */}
      <View style={{ flexDirection: "row", backgroundColor: palette.slate100, borderRadius: 30, padding: 3 }}>
        <Pressable
          onPress={() => setIsVeg(true)}
          style={[styles.toggleBtn, isVeg && { backgroundColor: palette.green500 }]}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: isVeg ? "#fff" : palette.slate500 }}>{t("screens.nutrition.veg")}</Text>
        </Pressable>
        <Pressable
          onPress={() => setIsVeg(false)}
          style={[styles.toggleBtn, !isVeg && { backgroundColor: palette.orange500 }]}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: !isVeg ? "#fff" : palette.slate500 }}>{t("screens.nutrition.nonveg")}</Text>
        </Pressable>
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {plan.days.map((d, i) => (
          <Pressable
            key={i}
            onPress={() => setDayIdx(i)}
            style={[
              styles.dayBtn,
              dayIdx === i && { backgroundColor: brand.violet600, borderColor: brand.violet600 },
            ]}
          >
            <Text style={[{ fontSize: 12, fontWeight: "700" }, dayIdx === i ? { color: "#fff" } : { color: palette.slate500 }]}>
              {d.day.slice(0, 3)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Meal cards */}
      <View style={{ gap: 10 }}>
        {MEAL_SLOTS.map(slot => (
          <View key={slot.key} style={[styles.mealCard, { backgroundColor: slot.color, borderColor: slot.border }]}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: slot.text, marginBottom: 4 }}>{slot.time}</Text>
            <Text style={{ fontSize: 13, color: palette.gray700, lineHeight: 18 }}>
              {(meal as Record<string, string | undefined>)[slot.key] ?? "—"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Family Mode Tab ───────────────────────────────────────────────────────────
function FamilyModeTab() {
  const { t } = useTranslation();
  return (
    <View style={{ gap: 12 }}>
      {/* Info */}
      <View style={{ backgroundColor: palette.violet50, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.violet200 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: brand.violet600, marginBottom: 4 }}>
          {t("screens.nutrition.family_title_hi")}
        </Text>
        <Text style={{ fontSize: 12, color: brand.violet800 }}>
          {t("screens.nutrition.family_desc")}
        </Text>
      </View>

      {/* Column headers */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tableRow, { backgroundColor: palette.slate100 }]}>
            <Text style={[styles.tableCell, styles.tableCellFirst, styles.tableHeader]}>{t("screens.nutrition.table_food")}</Text>
            {["🍼\n6–12m", "🧒\n1–3y", "📚\n6–10y", "🌱\n10–15y", "👨‍👩\nAdult", "🤰\nPregnant"].map((h, i) => (
              <Text key={i} style={[styles.tableCell, styles.tableHeader]}>{h}</Text>
            ))}
          </View>
          {FAMILY_PORTIONS.map((row, ri) => (
            <View key={ri} style={[styles.tableRow, ri % 2 === 0 ? { backgroundColor: "#ffffff" } : { backgroundColor: palette.slate50 }]}>
              <View style={[styles.tableCell, styles.tableCellFirst, { flexDirection: "row", alignItems: "center", gap: 6 }]}>
                <Text style={{ fontSize: 18 }}>{row.emoji}</Text>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: palette.slate800 }}>{row.food}</Text>
                  <Text style={{ fontSize: 10, color: palette.slate500 }}>{row.foodHi}</Text>
                </View>
              </View>
              {[row.infant, row.toddler, row.schoolChild, row.teen, row.adult, row.pregnant].map((v, ci) => (
                <Text key={ci} style={[styles.tableCell, { fontSize: 10, color: palette.gray700 }]}>{v}</Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={{ fontSize: 10, color: palette.slate400, textAlign: "center" }}>
        {t("screens.nutrition.katori_note")}
      </Text>
    </View>
  );
}

// ─── Score Tab ─────────────────────────────────────────────────────────────────
function ScoreTab({ ageGroupId }: { ageGroupId: AgeGroupId }) {
  const { t } = useTranslation();
  const ag = AGE_GROUPS.find(a => a.id === ageGroupId)!;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const items = [
    { id: "breakfast", label: t("screens.nutrition.item_breakfast"), labelHi: "आज पौष्टिक नाश्ता किया" },
    { id: "protein", label: t("screens.nutrition.item_protein"), labelHi: "प्रोटीन लिया" },
    { id: "dairy", label: t("screens.nutrition.item_dairy"), labelHi: "डेयरी या कैल्शियम स्रोत" },
    { id: "greens", label: t("screens.nutrition.item_greens"), labelHi: "हरी पत्तेदार सब्जी खाई" },
    { id: "fruit", label: t("screens.nutrition.item_fruit"), labelHi: "आज कम से कम 1 फल खाया" },
    { id: "water", label: t("screens.nutrition.item_water"), labelHi: "पर्याप्त पानी पिया" },
    { id: "noJunk", label: t("screens.nutrition.item_noJunk"), labelHi: "जंक फूड से बचे" },
    { id: "wholegrains", label: t("screens.nutrition.item_wholegrains"), labelHi: "साबुत अनाज चुना" },
  ];
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const score = Math.round((checkedCount / items.length) * 100);
  const sc = scoreColor(score, {} as ReturnType<typeof useColors>);

  return (
    <View style={{ gap: 14 }}>
      {/* Info */}
      <View style={{ backgroundColor: palette.emerald50, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.green200 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: palette.green700, marginBottom: 2 }}>
          {t("screens.nutrition.score_tab_title")}
        </Text>
        <Text style={{ fontSize: 12, color: palette.green800 }}>
          {t("screens.nutrition.score_tab_sub", { label: ag.label })}
        </Text>
      </View>

      {/* Score circle */}
      <View style={styles.scoreCard}>
        <Text style={[styles.scoreNumber, { color: sc }]}>{score}</Text>
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${score}%` as any, backgroundColor: sc }]} />
        </View>
        <Text style={[{ fontSize: 14, fontWeight: "700", color: sc, marginTop: 8 }]}>{t(scoreLabelKey(score))}</Text>
        <Text style={{ fontSize: 12, color: palette.slate500, marginTop: 2 }}>
          {t("screens.nutrition.goals_met", { done: checkedCount, total: items.length })}
        </Text>
      </View>

      {/* Checklist */}
      <View style={{ gap: 8 }}>
        {items.map(item => {
          const done = !!checked[item.id];
          return (
            <Pressable
              key={item.id}
              onPress={() => toggle(item.id)}
              style={[
                styles.checkItem,
                done && { backgroundColor: palette.emerald50, borderColor: palette.green300 },
              ]}
            >
              <View style={[styles.checkbox, done && { backgroundColor: palette.green500, borderColor: palette.green500 }]}>
                {done && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: done ? palette.slate400 : palette.slate800, textDecorationLine: done ? "line-through" : "none" }}>
                  {item.label}
                </Text>
                <Text style={{ fontSize: 11, color: palette.slate400 }}>{item.labelHi}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Tip */}
      {score < 80 ? (
        <View style={{ backgroundColor: palette.violet50, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.violet200 }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: brand.violet600, marginBottom: 4 }}>{t("screens.nutrition.tip_label")}</Text>
          <Text style={{ fontSize: 12, color: brand.violet800, lineHeight: 18 }}>
            {score < 40
              ? t("screens.nutrition.tip_low")
              : score < 60
              ? t("screens.nutrition.tip_med")
              : t("screens.nutrition.tip_high")}
          </Text>
        </View>
      ) : (
        <View style={{ backgroundColor: palette.emerald50, borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: palette.green300 }}>
          <Text style={{ fontSize: 28, marginBottom: 4 }}>🌟</Text>
          <Text style={{ fontSize: 15, fontWeight: "800", color: palette.green700 }}>{t("screens.nutrition.outstanding_title")}</Text>
          <Text style={{ fontSize: 12, color: palette.green800, textAlign: "center", marginTop: 4 }}>
            {t("screens.nutrition.outstanding_sub")}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [activeAgeId, setActiveAgeId] = useState<AgeGroupId>("toddler_1_3");
  const [activeTab, setActiveTab] = useState<Tab>("nutrients");
  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  const activeAg = AGE_GROUPS.find(a => a.id === activeAgeId)!;
  const ac = AGE_COLORS[activeAgeId];

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "nutrients", label: t("screens.nutrition.tab_nutrients"), icon: "nutrition" },
    { id: "meals", label: t("screens.nutrition.tab_meals"), icon: "restaurant" },
    { id: "family", label: t("screens.nutrition.tab_family"), icon: "people" },
    { id: "score", label: t("screens.nutrition.tab_score"), icon: "trophy" },
  ];

  if (selectedNutrient) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Stack.Screen options={{ title: t("screens.nutrition.screen_title"), headerShown: false }} />
        <NutrientDetail
          nutrient={selectedNutrient}
          ageGroupId={activeAgeId}
          onClose={() => setSelectedNutrient(null)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero Header */}
      <LinearGradient
        colors={[brand.violet600, brand.violet700, palette.indigo600]}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 32, marginBottom: 4 }}>🥗</Text>
          <Text style={styles.heroTitle}>{t("screens.nutrition.hero_title")}</Text>
          <Text style={styles.heroSubtitle}>{t("screens.nutrition.hero_subtitle")}</Text>
          <View style={styles.heroBadge}>
            <Text style={{ fontSize: 10, color: brand.violet400, fontWeight: "600" }}>{t("screens.nutrition.hero_badge")}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Age Group Selector */}
      <View style={styles.ageBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {AGE_GROUPS.map(ag => {
            const sel = ag.id === activeAgeId;
            const agc = AGE_COLORS[ag.id];
            return (
              <Pressable
                key={ag.id}
                onPress={() => setActiveAgeId(ag.id)}
                style={[
                  styles.agePill,
                  sel
                    ? { backgroundColor: agc.bg, borderColor: agc.border }
                    : { backgroundColor: palette.slate100, borderColor: palette.slate200 },
                  sel && styles.agePillSelected,
                ]}
              >
                <Text style={{ fontSize: 14 }}>{ag.emoji}</Text>
                <Text style={[styles.agePillLabel, { color: sel ? agc.text : palette.slate500 }]}>
                  {ag.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Age Info Card */}
        <View style={{ padding: 16 }}>
          <View style={[styles.ageCard, { backgroundColor: ac.bg, borderColor: ac.border }]}>
            <Text style={{ fontSize: 36 }}>{activeAg.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ageCardTitle, { color: ac.text }]}>{activeAg.label}</Text>
              <Text style={{ fontSize: 12, color: ac.text + "99", marginBottom: 4 }}>{activeAg.labelHi} · {activeAg.labelHinglish}</Text>
              <Text style={{ fontSize: 12, color: palette.gray700, lineHeight: 18 }}>{activeAg.description}</Text>
              <Text style={{ fontSize: 11, color: palette.slate500, marginTop: 4 }}>{activeAg.descriptionHi}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {activeAg.keyFocus.map((f, i) => (
                  <View key={i} style={[styles.focusBadge, { borderColor: ac.border }]}>
                    <Text style={{ fontSize: 9, color: ac.text, fontWeight: "600" }}>{f}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {TABS.map(tab => (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tabBtn,
                activeTab === tab.id && { backgroundColor: brand.violet600, borderColor: brand.violet600 },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.id ? "#fff" : palette.slate500}
              />
              <Text style={[styles.tabLabel, { color: activeTab === tab.id ? "#fff" : palette.slate500 }]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Tab Content */}
        <View style={{ padding: 16 }}>
          {/* Nutrients */}
          {activeTab === "nutrients" && (
            <View>
              <Text style={styles.sectionHeader}>{t("screens.nutrition.section_nutrient_lib")}</Text>
              <Text style={{ fontSize: 12, color: palette.slate500, marginBottom: 12 }}>
                {t("screens.nutrition.section_nutrient_desc", { label: activeAg.label })}
              </Text>
              <View style={styles.nutrientGrid}>
                {NUTRIENTS.map(n => (
                  <NutrientCard
                    key={n.id}
                    nutrient={n}
                    ageGroupId={activeAgeId}
                    onPress={() => setSelectedNutrient(n)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Meals */}
          {activeTab === "meals" && (
            <View>
              <Text style={styles.sectionHeader}>{t("screens.nutrition.section_meal_plan")}</Text>
              <Text style={{ fontSize: 12, color: palette.slate500, marginBottom: 12 }}>
                {t("screens.nutrition.section_meal_desc")}
              </Text>
              <MealPlanTab ageGroupId={activeAgeId} />
            </View>
          )}

          {/* Family */}
          {activeTab === "family" && (
            <View>
              <Text style={styles.sectionHeader}>{t("screens.nutrition.section_family")}</Text>
              <Text style={{ fontSize: 12, color: palette.slate500, marginBottom: 12 }}>
                {t("screens.nutrition.section_family_desc")}
              </Text>
              <FamilyModeTab />
            </View>
          )}

          {/* Score */}
          {activeTab === "score" && (
            <ScoreTab ageGroupId={activeAgeId} />
          )}

          {/* Divider */}
          <View style={styles.divider} />

          {/* Disclaimer */}
          <Pressable
            onPress={() => setShowDisclaimer(!showDisclaimer)}
            style={styles.disclaimerHeader}
          >
            <Ionicons name="warning-outline" size={16} color={palette.amber600} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: palette.amber600, flex: 1 }}>
              {t("screens.nutrition.med_disclaimer")}
            </Text>
            <Ionicons name={showDisclaimer ? "chevron-up" : "chevron-down"} size={14} color={palette.amber600} />
          </Pressable>
          {showDisclaimer && (
            <View style={styles.disclaimerBody}>
              <Text style={{ fontSize: 11, color: palette.amber800, lineHeight: 17, marginBottom: 8 }}>
                {MEDICAL_DISCLAIMER.en}
              </Text>
              <Text style={{ fontSize: 11, color: palette.amber700, lineHeight: 17 }}>
                {MEDICAL_DISCLAIMER.hi}
              </Text>
              <Pressable onPress={() => setShowRefs(!showRefs)} style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 10, color: palette.amber700, textDecorationLine: "underline" }}>
                  {showRefs ? t("screens.nutrition.hide_refs") : t("screens.nutrition.show_refs")}
                </Text>
              </Pressable>
              {showRefs && REFERENCES.map((ref, i) => (
                <Text key={i} style={{ fontSize: 9, color: palette.yellow700, marginTop: 3 }}>
                  {i + 1}. {ref}
                </Text>
              ))}
            </View>
          )}

          {/* Growth Link */}
          <Pressable
            onPress={() => router.push("/progress")}
            style={styles.growthCard}
          >
            <Text style={{ fontSize: 24 }}>📈</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: palette.slate800 }}>{t("screens.nutrition.growth_title")}</Text>
              <Text style={{ fontSize: 11, color: palette.slate500 }}>{t("screens.nutrition.growth_sub")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.slate400} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
  },
  heroSubtitle: {
    fontSize: 12,
    color: brand.violet300,
    marginTop: 2,
  },
  heroBadge: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  ageBar: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.slate200,
    backgroundColor: "#fff",
  },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  agePillSelected: {
    transform: [{ scale: 1.04 }],
  },
  agePillLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  ageCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  ageCardTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  focusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.slate200,
    backgroundColor: palette.slate50,
    marginBottom: 12,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.slate800,
    marginBottom: 4,
  },
  nutrientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  nutrientCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  nutrientName: {
    fontSize: 14,
    fontWeight: "800",
  },
  nutrientNameHi: {
    fontSize: 11,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 10,
    fontStyle: "italic",
    marginBottom: 8,
  },
  needBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  toggleBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 30,
  },
  dayBtn: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: palette.slate200,
    backgroundColor: palette.slate50,
  },
  mealCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  scoreCard: {
    backgroundColor: palette.slate50,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: "900",
    lineHeight: 72,
  },
  scoreBarBg: {
    width: "100%",
    height: 10,
    backgroundColor: palette.slate200,
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 10,
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.slate200,
    backgroundColor: "#fff",
    padding: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: palette.slate300,
    alignItems: "center",
    justifyContent: "center",
  },
  detailContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  detailHeader: {
    padding: 20,
    paddingTop: 48,
    borderBottomWidth: 1,
    alignItems: "center",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  needCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.gray700,
    marginBottom: 10,
    marginTop: 4,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: palette.slate50,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.slate200,
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  deficiencyBox: {
    backgroundColor: palette.rose50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.slate100,
  },
  tableCell: {
    width: 100,
    padding: 8,
    textAlign: "center",
  },
  tableCellFirst: {
    width: 150,
    textAlign: "left",
    flexDirection: "row" as any,
  },
  tableHeader: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.slate500,
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: palette.slate200,
    marginVertical: 20,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.amber50,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.amber200,
  },
  disclaimerBody: {
    backgroundColor: palette.amber50,
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: palette.amber200,
  },
  growthCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: palette.slate50,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.slate200,
    marginTop: 12,
  },
});
