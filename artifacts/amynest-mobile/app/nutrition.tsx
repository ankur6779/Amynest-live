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
import {
  AGE_GROUPS, NUTRIENTS, MEAL_PLANS, FAMILY_PORTIONS,
  MEDICAL_DISCLAIMER, REFERENCES, AgeGroupId, Nutrient,
} from "@/lib/nutrition-data";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Tab = "nutrients" | "meals" | "family" | "score";

// ─── Score helpers ────────────────────────────────────────────────────────────
function scoreColor(s: number, c: ReturnType<typeof useColors>) {
  if (s >= 80) return "#22c55e";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}
function scoreLabel(s: number) {
  if (s >= 80) return "Excellent · Shandar 🌟";
  if (s >= 60) return "Good · Achha 👍";
  if (s >= 40) return "Needs attention · Dhyan do ⚠️";
  return "Critical · Zaruri hai 🚨";
}

// ─── Age Group colors (simple mapping) ───────────────────────────────────────
const AGE_COLORS: Record<AgeGroupId, { bg: string; text: string; border: string }> = {
  infant_0_6:    { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
  infant_6_12:   { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  toddler_1_3:   { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  preschool_3_6: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
  school_6_10:   { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  preteen_10_15: { bg: "#ecfeff", text: "#0e7490", border: "#a5f3fc" },
  adult:         { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  pregnancy:     { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  postpartum:    { bg: "#fdf4ff", text: "#a21caf", border: "#f0abfc" },
};

const NUTRIENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  protein:    { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  iron:       { bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  calcium:    { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" },
  vitamin_a:  { bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  vitamin_c:  { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  vitamin_d:  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  vitamin_b:  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  vitamin_b12:{ bg: "#fff1f2", text: "#be123c", border: "#fecdd3" },
  vitamin_k:  { bg: "#f0fdf4", text: "#065f46", border: "#a7f3d0" },
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
  const nc = NUTRIENT_COLORS[nutrient.id] ?? { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" };
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
      <Text style={[styles.tagline, { color: "#64748b" }]}>{nutrient.tagline}</Text>
      <View style={[styles.needBadge, { backgroundColor: "#ffffff88" }]}>
        <Text style={[{ color: nc.text, fontSize: 11, fontWeight: "700" }]}>
          {need.amount} {need.unit} / day
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
  const nc = NUTRIENT_COLORS[nutrient.id] ?? { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" };
  const need = nutrient.dailyNeeds[ageGroupId];
  const ag = AGE_GROUPS.find(a => a.id === ageGroupId)!;

  return (
    <View style={styles.detailContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.detailHeader, { backgroundColor: nc.bg, borderBottomColor: nc.border }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color="#64748b" />
          </Pressable>
          <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 8 }}>{nutrient.emoji}</Text>
          <Text style={[styles.detailTitle, { color: nc.text }]}>{nutrient.name}</Text>
          <Text style={{ color: nc.text + "99", fontSize: 14, textAlign: "center" }}>{nutrient.nameHi}</Text>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {/* Daily need */}
          <View style={[styles.needCard, { backgroundColor: nc.bg, borderColor: nc.border }]}>
            <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "600", marginBottom: 4 }}>
              DAILY NEED FOR {ag.label.toUpperCase()} · {ag.labelHi.toUpperCase()}
            </Text>
            <Text style={[{ fontSize: 28, fontWeight: "900", color: nc.text }]}>
              {need.amount} <Text style={{ fontSize: 16 }}>{need.unit}</Text>
            </Text>
            {need.note && <Text style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{need.note}</Text>}
          </View>

          {/* Benefits */}
          <View>
            <Text style={styles.sectionTitle}>✅ Benefits · फायदे</Text>
            {nutrient.benefits.map((b, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={{ color: "#22c55e", marginRight: 6 }}>✓</Text>
                <Text style={{ color: "#374151", flex: 1, fontSize: 13 }}>{b}</Text>
              </View>
            ))}
            <View style={{ marginTop: 8, backgroundColor: "#f0fdf4", borderRadius: 10, padding: 10 }}>
              {nutrient.benefitsHi.map((b, i) => (
                <Text key={i} style={{ fontSize: 12, color: "#15803d", marginBottom: 2 }}>• {b}</Text>
              ))}
            </View>
          </View>

          {/* Food Sources */}
          <View>
            <Text style={styles.sectionTitle}>🥗 Indian Food Sources · भारतीय स्रोत</Text>
            <View style={{ gap: 8 }}>
              {nutrient.sources.map((src, i) => (
                <View key={i} style={styles.sourceRow}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{src.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontWeight: "600", color: "#1e293b", fontSize: 13 }}>{src.name}</Text>
                      {src.type === "veg" ? (
                        <View style={[styles.typeBadge, { backgroundColor: "#dcfce7" }]}>
                          <Text style={{ fontSize: 9, color: "#15803d", fontWeight: "700" }}>VEG</Text>
                        </View>
                      ) : (
                        <View style={[styles.typeBadge, { backgroundColor: "#fed7aa" }]}>
                          <Text style={{ fontSize: 9, color: "#c2410c", fontWeight: "700" }}>NON-VEG</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: "#64748b" }}>{src.nameHi} · {src.serving}</Text>
                    <Text style={{ fontSize: 11, color: "#475569", fontWeight: "600" }}>→ {src.amount}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Deficiency */}
          <View>
            <Text style={styles.sectionTitle}>⚠️ Deficiency Signs · कमी के लक्षण</Text>
            <View style={[styles.deficiencyBox, { borderColor: "#fecdd3" }]}>
              {nutrient.deficiencySymptoms.map((d, i) => (
                <Text key={i} style={{ color: "#be123c", fontSize: 12, marginBottom: 4 }}>⚠ {d}</Text>
              ))}
            </View>
            <View style={[styles.hindiBox, { backgroundColor: "#fffbeb", borderColor: "#fef08a" }]}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400e", marginBottom: 4 }}>हिंदी में लक्षण:</Text>
              {nutrient.deficiencyHi.map((d, i) => (
                <Text key={i} style={{ fontSize: 12, color: "#a16207" }}>• {d}</Text>
              ))}
            </View>
          </View>

          {/* Source */}
          <Text style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
            📚 Source: ICMR-NIN Nutrient Requirements for Indians (2020) & WHO Guidelines
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Meal Plan Tab ─────────────────────────────────────────────────────────────
function MealPlanTab({ ageGroupId }: { ageGroupId: AgeGroupId }) {
  const plan = MEAL_PLANS.find(p => p.applies.includes(ageGroupId));
  const [dayIdx, setDayIdx] = useState(0);
  const [isVeg, setIsVeg] = useState(true);

  if (!plan) {
    return (
      <View style={{ padding: 24, alignItems: "center" }}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🍼</Text>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e293b", textAlign: "center", marginBottom: 8 }}>
          Exclusive Breastfeeding (0–6 Months)
        </Text>
        <Text style={{ fontSize: 13, color: "#475569", textAlign: "center", lineHeight: 20 }}>
          WHO recommends only breast milk for the first 6 months. No other food or water is needed.
        </Text>
        <View style={{ marginTop: 12, backgroundColor: "#f5f3ff", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontSize: 12, color: "#7c3aed", textAlign: "center" }}>
            विश्व स्वास्थ्य संगठन 6 महीने तक केवल माँ के दूध की सलाह देता है।
          </Text>
        </View>
      </View>
    );
  }

  const day = plan.days[dayIdx];
  const meal = isVeg ? day.veg : day.nonVeg;
  const MEAL_SLOTS = [
    { key: "breakfast", time: "🌅 Breakfast", color: "#fff7ed", border: "#fed7aa", text: "#92400e" },
    meal.midMorning ? { key: "midMorning", time: "🍎 Mid-Morning", color: "#f0fdf4", border: "#bbf7d0", text: "#065f46" } : null,
    { key: "lunch", time: "🌞 Lunch", color: "#fff7ed", border: "#fdba74", text: "#9a3412" },
    { key: "snack", time: "🍪 Snack", color: "#f5f3ff", border: "#ddd6fe", text: "#5b21b6" },
    { key: "dinner", time: "🌙 Dinner", color: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
  ].filter(Boolean) as { key: string; time: string; color: string; border: string; text: string }[];

  return (
    <View style={{ gap: 12 }}>
      {/* Header */}
      <View>
        <Text style={{ fontSize: 16, fontWeight: "800", color: "#1e293b" }}>{plan.ageCategory}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>{plan.ageCategoryHi}</Text>
      </View>

      {/* Portion note */}
      <View style={{ backgroundColor: "#eff6ff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#bfdbfe" }}>
        <Text style={{ fontSize: 12, color: "#1e40af" }}>📏 {plan.portionNote}</Text>
        <Text style={{ fontSize: 11, color: "#3b82f6", marginTop: 4 }}>{plan.portionNoteHi}</Text>
      </View>

      {/* Veg / Non-veg toggle */}
      <View style={{ flexDirection: "row", backgroundColor: "#f1f5f9", borderRadius: 30, padding: 3 }}>
        <Pressable
          onPress={() => setIsVeg(true)}
          style={[styles.toggleBtn, isVeg && { backgroundColor: "#22c55e" }]}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: isVeg ? "#fff" : "#64748b" }}>🌿 Veg</Text>
        </Pressable>
        <Pressable
          onPress={() => setIsVeg(false)}
          style={[styles.toggleBtn, !isVeg && { backgroundColor: "#f97316" }]}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: !isVeg ? "#fff" : "#64748b" }}>🍗 Non-Veg</Text>
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
              dayIdx === i && { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
            ]}
          >
            <Text style={[{ fontSize: 12, fontWeight: "700" }, dayIdx === i ? { color: "#fff" } : { color: "#64748b" }]}>
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
            <Text style={{ fontSize: 13, color: "#374151", lineHeight: 18 }}>
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
  return (
    <View style={{ gap: 12 }}>
      {/* Info */}
      <View style={{ backgroundColor: "#f5f3ff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd6fe" }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#7c3aed", marginBottom: 4 }}>
          👨‍👩‍👧 एक खाना, अलग-अलग हिस्से
        </Text>
        <Text style={{ fontSize: 12, color: "#5b21b6" }}>
          Cook one meal for the whole family and serve age-appropriate portions. No separate cooking needed!
        </Text>
      </View>

      {/* Column headers */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tableRow, { backgroundColor: "#f1f5f9" }]}>
            <Text style={[styles.tableCell, styles.tableCellFirst, styles.tableHeader]}>Food Item</Text>
            {["🍼\n6–12m", "🧒\n1–3y", "📚\n6–10y", "🌱\n10–15y", "👨‍👩\nAdult", "🤰\nPregnant"].map((h, i) => (
              <Text key={i} style={[styles.tableCell, styles.tableHeader]}>{h}</Text>
            ))}
          </View>
          {FAMILY_PORTIONS.map((row, ri) => (
            <View key={ri} style={[styles.tableRow, ri % 2 === 0 ? { backgroundColor: "#ffffff" } : { backgroundColor: "#f8fafc" }]}>
              <View style={[styles.tableCell, styles.tableCellFirst, { flexDirection: "row", alignItems: "center", gap: 6 }]}>
                <Text style={{ fontSize: 18 }}>{row.emoji}</Text>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: "#1e293b" }}>{row.food}</Text>
                  <Text style={{ fontSize: 10, color: "#64748b" }}>{row.foodHi}</Text>
                </View>
              </View>
              {[row.infant, row.toddler, row.schoolChild, row.teen, row.adult, row.pregnant].map((v, ci) => (
                <Text key={ci} style={[styles.tableCell, { fontSize: 10, color: "#374151" }]}>{v}</Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
        * 1 katori ≈ 150ml cup. Adjust to child's appetite.
      </Text>
    </View>
  );
}

// ─── Score Tab ─────────────────────────────────────────────────────────────────
function ScoreTab({ ageGroupId }: { ageGroupId: AgeGroupId }) {
  const ag = AGE_GROUPS.find(a => a.id === ageGroupId)!;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const items = [
    { id: "breakfast", label: "Wholesome breakfast today", labelHi: "आज पौष्टिक नाश्ता किया" },
    { id: "protein", label: "Protein source (dal / egg / paneer / meat)", labelHi: "प्रोटीन लिया" },
    { id: "dairy", label: "Dairy or calcium source", labelHi: "डेयरी या कैल्शियम स्रोत" },
    { id: "greens", label: "Green leafy vegetables (palak/methi)", labelHi: "हरी पत्तेदार सब्जी खाई" },
    { id: "fruit", label: "At least 1 fruit today", labelHi: "आज कम से कम 1 फल खाया" },
    { id: "water", label: "Adequate water / fluids", labelHi: "पर्याप्त पानी पिया" },
    { id: "noJunk", label: "No junk food / packaged snacks", labelHi: "जंक फूड से बचे" },
    { id: "wholegrains", label: "Whole grains (atta roti vs maida)", labelHi: "साबुत अनाज चुना" },
  ];
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const score = Math.round((checkedCount / items.length) * 100);
  const sc = scoreColor(score, {} as ReturnType<typeof useColors>);

  return (
    <View style={{ gap: 14 }}>
      {/* Info */}
      <View style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#bbf7d0" }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#15803d", marginBottom: 2 }}>
          🏆 Daily Nutrition Score · दैनिक पोषण स्कोर
        </Text>
        <Text style={{ fontSize: 12, color: "#166534" }}>
          Track for {ag.label} · आज क्या खाया वो चेक करें
        </Text>
      </View>

      {/* Score circle */}
      <View style={styles.scoreCard}>
        <Text style={[styles.scoreNumber, { color: sc }]}>{score}</Text>
        <View style={styles.scoreBarBg}>
          <View style={[styles.scoreBarFill, { width: `${score}%` as any, backgroundColor: sc }]} />
        </View>
        <Text style={[{ fontSize: 14, fontWeight: "700", color: sc, marginTop: 8 }]}>{scoreLabel(score)}</Text>
        <Text style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {checkedCount} of {items.length} daily goals met
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
                done && { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
              ]}
            >
              <View style={[styles.checkbox, done && { backgroundColor: "#22c55e", borderColor: "#22c55e" }]}>
                {done && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: done ? "#94a3b8" : "#1e293b", textDecorationLine: done ? "line-through" : "none" }}>
                  {item.label}
                </Text>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>{item.labelHi}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Tip */}
      {score < 80 ? (
        <View style={{ backgroundColor: "#f5f3ff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd6fe" }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: "#7c3aed", marginBottom: 4 }}>🧠 Amy AI Tip</Text>
          <Text style={{ fontSize: 12, color: "#5b21b6", lineHeight: 18 }}>
            {score < 40
              ? "Boost your nutrition — add dal, a fruit, and a glass of milk. · दाल, फल और दूध जरूर लें।"
              : score < 60
              ? "Include green vegetables like palak or methi. · पालक/मेथी जरूर खाएं।"
              : "Almost there! Replace a packaged snack with roasted chana. · भुने चने खाएं।"}
          </Text>
        </View>
      ) : (
        <View style={{ backgroundColor: "#f0fdf4", borderRadius: 12, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#86efac" }}>
          <Text style={{ fontSize: 28, marginBottom: 4 }}>🌟</Text>
          <Text style={{ fontSize: 15, fontWeight: "800", color: "#15803d" }}>Outstanding! · Shandar!</Text>
          <Text style={{ fontSize: 12, color: "#166534", textAlign: "center", marginTop: 4 }}>
            Consistency is the key to health. Keep it up tomorrow too! · हर दिन यही करें!
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

  const [activeAgeId, setActiveAgeId] = useState<AgeGroupId>("toddler_1_3");
  const [activeTab, setActiveTab] = useState<Tab>("nutrients");
  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  const activeAg = AGE_GROUPS.find(a => a.id === activeAgeId)!;
  const ac = AGE_COLORS[activeAgeId];

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "nutrients", label: "Nutrients", icon: "nutrition" },
    { id: "meals", label: "Meal Plan", icon: "restaurant" },
    { id: "family", label: "Family", icon: "people" },
    { id: "score", label: "Score", icon: "trophy" },
  ];

  if (selectedNutrient) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Stack.Screen options={{ title: "Nutrient Detail", headerShown: false }} />
        <NutrientDetail
          nutrient={selectedNutrient}
          ageGroupId={activeAgeId}
          onClose={() => setSelectedNutrient(null)}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Hero Header */}
      <LinearGradient
        colors={["#7c3aed", "#6d28d9", "#4f46e5"]}
        style={[styles.hero, { paddingTop: insets.top + 8 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 32, marginBottom: 4 }}>🥗</Text>
          <Text style={styles.heroTitle}>Nutrition Hub</Text>
          <Text style={styles.heroSubtitle}>न्यूट्रिशन हब · Poshan Ka Ghar</Text>
          <View style={styles.heroBadge}>
            <Text style={{ fontSize: 10, color: "#a78bfa", fontWeight: "600" }}>WHO · ICMR-NIN · Science-backed</Text>
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
                    : { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
                  sel && styles.agePillSelected,
                ]}
              >
                <Text style={{ fontSize: 14 }}>{ag.emoji}</Text>
                <Text style={[styles.agePillLabel, { color: sel ? agc.text : "#64748b" }]}>
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
              <Text style={{ fontSize: 12, color: "#374151", lineHeight: 18 }}>{activeAg.description}</Text>
              <Text style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{activeAg.descriptionHi}</Text>
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
                activeTab === tab.id && { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
              ]}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.id ? "#fff" : "#64748b"}
              />
              <Text style={[styles.tabLabel, { color: activeTab === tab.id ? "#fff" : "#64748b" }]}>
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
              <Text style={styles.sectionHeader}>Nutrient Library · पोषक तत्व पुस्तकालय</Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Tap a nutrient to see benefits, Indian food sources & daily needs for {activeAg.label}.
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
              <Text style={styles.sectionHeader}>Weekly Meal Plan · साप्ताहिक भोजन योजना</Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Age-appropriate Indian meals for every day of the week.
              </Text>
              <MealPlanTab ageGroupId={activeAgeId} />
            </View>
          )}

          {/* Family */}
          {activeTab === "family" && (
            <View>
              <Text style={styles.sectionHeader}>Family Mode · परिवार मोड</Text>
              <Text style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Same meal — different portions for each family member. Cook once, serve smart!
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
            <Ionicons name="warning-outline" size={16} color="#d97706" />
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#d97706", flex: 1 }}>
              Medical Disclaimer · चिकित्सा अस्वीकरण
            </Text>
            <Ionicons name={showDisclaimer ? "chevron-up" : "chevron-down"} size={14} color="#d97706" />
          </Pressable>
          {showDisclaimer && (
            <View style={styles.disclaimerBody}>
              <Text style={{ fontSize: 11, color: "#92400e", lineHeight: 17, marginBottom: 8 }}>
                {MEDICAL_DISCLAIMER.en}
              </Text>
              <Text style={{ fontSize: 11, color: "#b45309", lineHeight: 17 }}>
                {MEDICAL_DISCLAIMER.hi}
              </Text>
              <Pressable onPress={() => setShowRefs(!showRefs)} style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 10, color: "#b45309", textDecorationLine: "underline" }}>
                  {showRefs ? "Hide" : "Show"} References / स्रोत
                </Text>
              </Pressable>
              {showRefs && REFERENCES.map((ref, i) => (
                <Text key={i} style={{ fontSize: 9, color: "#a16207", marginTop: 3 }}>
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
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1e293b" }}>Track Growth Progress</Text>
              <Text style={{ fontSize: 11, color: "#64748b" }}>बच्चे की वृद्धि ट्रैक करें</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
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
    color: "#c4b5fd",
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
    borderBottomColor: "#e2e8f0",
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
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    marginBottom: 12,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
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
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  mealCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  scoreCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: "900",
    lineHeight: 72,
  },
  scoreBarBg: {
    width: "100%",
    height: 10,
    backgroundColor: "#e2e8f0",
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
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
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
    backgroundColor: "#f1f5f9",
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
    color: "#374151",
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
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  typeBadge: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  deficiencyBox: {
    backgroundColor: "#fff1f2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  hindiBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
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
    color: "#64748b",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 20,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  disclaimerBody: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  growthCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 12,
  },
});
