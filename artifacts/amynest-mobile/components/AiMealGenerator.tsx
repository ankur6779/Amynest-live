/**
 * AiMealGenerator (React Native)
 *
 * Free-text AI meal generation strip for meal/tiffin items on the
 * Routine detail screen. Parent types what they want to cook, taps
 * "Generate with Amy AI", and sees recipe cards powered by
 * POST /api/meals/ai-generate.
 *
 * Each card is tappable → full ingredients + steps in a bottom sheet.
 * Includes loading skeleton and error states.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { brand, palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

interface AiMeal {
  id: string;
  title: string;
  emoji: string;
  bgGradient: [string, string];
  region: string;
  category: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  tags: string[];
  prepMinutes: number;
  audioText?: string;
  isVeg: boolean;
  matchedIngredients: string[];
  missingIngredients: string[];
  safetyBadges?: string[];
  whyThisMeal?: string;
  safetyWarning?: string;
}

interface AiGenerateResult {
  meals: AiMeal[];
  amyMessage: string;
}

interface Props {
  region?: string;
  childAge?: number;
  isVeg?: boolean;
}


const QUERY_SUGGESTIONS = [
  "Quick tiffin with rice",
  "High protein breakfast",
  "No onion no garlic snack",
  "Sweet dish for dessert",
  "Healthy lunch in 15 min",
];

export default function AiMealGenerator({
  region = "pan_indian",
  childAge,
  isVeg,
}: Props) {
  const authFetch = useAuthFetch();

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AiGenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openMeal, setOpenMeal] = useState<AiMeal | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const requestIdRef = React.useRef(0);

  const handleGenerate = useCallback(async (overrideQuery?: string) => {
    const q = (overrideQuery ?? query).trim();
    const thisId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setResult(null);
    setHasGenerated(true);

    try {
      const { default: i18nInstance } = await import("@/i18n");
      const body: Record<string, unknown> = {
        query: q.length > 0 ? q : "quick healthy tiffin for kids",
        region,
        audience: "kids_tiffin",
        language: i18nInstance.language || "en",
      };
      if (childAge != null) body.childAge = childAge;
      if (isVeg != null) body.isVeg = isVeg;

      const res = await authFetch("/api/meals/ai-generate", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (thisId !== requestIdRef.current) return;

      if (!res.ok) {
        const errBody: unknown = await res.json().catch(() => ({}));
        const errMsg =
          errBody !== null &&
          typeof errBody === "object" &&
          "error" in errBody &&
          typeof (errBody as { error: unknown }).error === "string"
            ? (errBody as { error: string }).error
            : `Server error ${res.status}`;
        throw new Error(errMsg);
      }
      const data: AiGenerateResult = await res.json();
      if (thisId !== requestIdRef.current) return;
      setResult(data);
    } catch (e: unknown) {
      if (thisId !== requestIdRef.current) return;
      setError(e instanceof Error ? e.message : "Something went wrong. Please retry.");
    } finally {
      if (thisId === requestIdRef.current) setLoading(false);
    }
  }, [query, region, childAge, isVeg, authFetch]);

  const handleClose = useCallback(() => {
    setOpenMeal(null);
  }, []);

  const { t } = useTranslation();
  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="sparkles" size={16} color={brand.violet400} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{t("components.ai_meal_generator.generate_with_amy_ai")}</Text>
            <Text style={styles.headerSub}>{t("components.ai_meal_generator.type_what_you_want_to_cook")}</Text>
          </View>
        </View>
      </View>

      {/* Input row */}
      <View style={styles.inputSection}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.inputRow}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("components.ai_meal_generator.e_g_quick_protein_tiffin_without_onion")}
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.input}
              returnKeyType="go"
              onSubmitEditing={() => handleGenerate()}
              editable={!loading}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Quick suggestion chips */}
        {!hasGenerated && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionRow}
          >
            {QUERY_SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => { setQuery(s); handleGenerate(s); }}
                activeOpacity={0.75}
              >
                <Text style={styles.suggestionChipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Generate button */}
        <TouchableOpacity
          onPress={() => handleGenerate()}
          activeOpacity={0.82}
          disabled={loading}
          style={styles.generateBtn}
          testID="ai-meal-generate-btn"
        >
          <LinearGradient
            colors={[brand.violet600, palette.indigo600]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.generateBtnGrad}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                <Text style={styles.generateBtnText}>{t("components.ai_meal_generator.generate_with_amy_ai")}</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Amy message */}
      {result?.amyMessage ? (
        <View style={styles.amyBox}>
          <Text style={styles.amyEmoji}>🤖</Text>
          <Text style={styles.amyText}>{result.amyMessage}</Text>
        </View>
      ) : null}

      {/* Loading skeleton */}
      {loading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
          scrollEnabled={false}
          testID="ai-meal-skeleton"
        >
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.skeletonCard, { opacity: 1 - i * 0.15 }]}>
              <View style={styles.skeletonHero} />
              <View style={styles.skeletonInfo}>
                <View style={styles.skeletonTitleLine} />
                <View style={styles.skeletonMetaLine} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {/* Error state */}
      {error && !loading ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={20} color={palette.red400} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => handleGenerate()} style={styles.retryBtn} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>{t("components.ai_meal_generator.retry")}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Meal cards */}
      {!loading && result && result.meals.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
          decelerationRate="fast"
          snapToInterval={148}
          snapToAlignment="start"
        >
          {result.meals.map((m) => (
            <MealCard key={m.id} meal={m} onPress={() => setOpenMeal(m)} />
          ))}
        </ScrollView>
      ) : null}

      {/* No results */}
      {!loading && hasGenerated && result && result.meals.length === 0 && !error ? (
        <Text style={styles.emptyText}>{t("components.ai_meal_generator.no_recipes_generated_try_a_different_des")}</Text>
      ) : null}

      {/* Recipe bottom sheet */}
      <Modal
        visible={!!openMeal}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {openMeal ? <RecipeSheet meal={openMeal} onClose={handleClose} /> : null}
      </Modal>
    </View>
  );
}

// ─── Meal Card ────────────────────────────────────────────────────────────────
function MealCard({ meal, onPress }: { meal: AiMeal; onPress: () => void }) {
  const { t } = useTranslation();
  const tag = meal.tags[0] ?? (meal.isVeg ? "veg" : "");
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={styles.card}>
      <LinearGradient
        colors={meal.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardHero}
      >
        <Text style={styles.cardEmoji}>{meal.emoji}</Text>
        {tag ? (
          <View style={styles.tagPill}>
            <Text style={styles.tagPillText}>{tag}</Text>
          </View>
        ) : null}
      </LinearGradient>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>{meal.title}</Text>
        <View style={styles.cardMeta}>
          <Ionicons name="time-outline" size={10} color={palette.slate400} />
          <Text style={styles.cardMetaText}>{meal.prepMinutes}m</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Recipe Sheet ─────────────────────────────────────────────────────────────
function RecipeSheet({ meal, onClose }: { meal: AiMeal; onClose: () => void }) {
  const { t } = useTranslation();
  const { speak, stop, speaking, loading } = useAmyVoice();

  const audioText =
    meal.audioText ??
    `${meal.title}. Ingredients: ${meal.ingredients.join(", ")}. Steps: ${meal.steps.join(". ")}`;

  const handleReadAloud = () => {
    if (speaking || loading) { stop(); return; }
    speak(audioText);
  };

  return (
    <Pressable style={styles.sheetScrim} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => {}}>
        {/* Drag handle */}
        <View style={styles.sheetHandle} />

        {/* Hero */}
        <LinearGradient
          colors={meal.bgGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sheetHero}
        >
          <Text style={styles.sheetEmoji}>{meal.emoji}</Text>
          <TouchableOpacity onPress={onClose} style={styles.sheetClose}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Scrollable body */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 36 }}
        >
          <View style={styles.sheetBody}>
            <Text style={styles.sheetTitle}>{meal.title}</Text>

            {/* Tags + meta */}
            <View style={styles.tagRow}>
              {meal.tags.map((t) => (
                <View key={t} style={styles.sheetTag}>
                  <Text style={styles.sheetTagText}>{t}</Text>
                </View>
              ))}
              <View style={styles.sheetTag}>
                <Ionicons name="time-outline" size={10} color={palette.orange500} />
                <Text style={styles.sheetTagText}> {meal.prepMinutes}m</Text>
              </View>
              {meal.calories > 0 && (
                <View style={styles.sheetTag}>
                  <Text style={styles.sheetTagText}>🔥 {meal.calories} kcal</Text>
                </View>
              )}
              {meal.isVeg && (
                <View style={[styles.sheetTag, { backgroundColor: "rgba(34,197,94,0.2)" }]}>
                  <Text style={[styles.sheetTagText, { color: palette.green600 }]}>{t("components.ai_meal_generator.veg")}</Text>
                </View>
              )}
            </View>

            {/* Read Aloud */}
            <View style={styles.audioBox}>
              <TouchableOpacity onPress={handleReadAloud} style={styles.readBtn} activeOpacity={0.8}>
                <Ionicons name={(speaking || loading) ? "volume-mute" : "volume-high"} size={14} color="#fff" />
                <Text style={styles.readBtnText}>
                  {speaking ? "Stop" : loading ? "Loading…" : "Read Aloud"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Safety Badges + Why This Meal */}
            {((meal.safetyBadges && meal.safetyBadges.length > 0) || meal.whyThisMeal) && (
              <View style={styles.safetyBox}>
                {meal.safetyBadges && meal.safetyBadges.length > 0 && (
                  <View style={styles.badgeRow}>
                    {meal.safetyBadges.map((badge) => (
                      <View key={badge} style={styles.safeBadge}>
                        <Text style={styles.safeBadgeText}>✓ {badge}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {meal.whyThisMeal ? (
                  <Text style={styles.whyText}>💡 {meal.whyThisMeal}</Text>
                ) : null}
              </View>
            )}
            {meal.safetyWarning ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnText}>⚠️ {meal.safetyWarning}</Text>
              </View>
            ) : null}

            {/* Ingredients */}
            <Text style={styles.sectionLabel}>{t("components.ai_meal_generator.ingredients")}</Text>
            <View style={styles.ingRow}>
              {meal.ingredients.map((ing) => (
                <View key={ing} style={styles.ingChip}>
                  <Text style={styles.ingChipText}>{ing}</Text>
                </View>
              ))}
            </View>

            {/* Steps */}
            <Text style={styles.sectionLabel}>{t("components.ai_meal_generator.steps")}</Text>
            <View style={{ gap: 10 }}>
              {meal.steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const ORANGE = palette.orange500;
const VIOLET = brand.violet600;

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.3)",
    backgroundColor: "rgba(124,58,237,0.06)",
    overflow: "hidden",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(124,58,237,0.15)",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  headerSub: { fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 1 },

  inputSection: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  inputRow: {
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: "#FFFFFF",
    fontSize: 13,
  },

  suggestionRow: { gap: 6, paddingBottom: 2 },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
    borderStyle: "dashed",
    backgroundColor: "rgba(124,58,237,0.08)",
  },
  suggestionChipText: { fontSize: 11, color: "rgba(196,181,253,0.9)", fontWeight: "600" },

  generateBtn: { borderRadius: 12, overflow: "hidden" },
  generateBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  generateBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13.5 },

  amyBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.22)",
  },
  amyEmoji: { fontSize: 16, marginTop: 1 },
  amyText: { flex: 1, fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.85)" },

  cardsRow: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },

  skeletonCard: {
    width: 136,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  skeletonHero: { height: 80, backgroundColor: "rgba(255,255,255,0.06)" },
  skeletonInfo: { padding: 8, gap: 6 },
  skeletonTitleLine: {
    height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.08)", width: "90%",
  },
  skeletonMetaLine: {
    height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)", width: "50%",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    flexWrap: "wrap",
  },
  errorText: { flex: 1, fontSize: 12, color: palette.red300, lineHeight: 16 },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.25)",
  },
  retryBtnText: { fontSize: 11, fontWeight: "800", color: palette.red300 },

  emptyText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    padding: 14,
  },

  card: {
    width: 136,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardHero: { height: 80, alignItems: "center", justifyContent: "center" },
  cardEmoji: { fontSize: 36 },
  tagPill: {
    position: "absolute",
    bottom: 4,
    left: 6,
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  tagPillText: { fontSize: 8.5, fontWeight: "800", color: palette.slate900 },
  cardInfo: { padding: 7 },
  cardTitle: { fontSize: 11.5, fontWeight: "800", color: "#FFFFFF", lineHeight: 15, marginBottom: 3 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 2 },
  cardMetaText: { fontSize: 10, color: palette.slate400 },

  sheetScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#141428", // audit-ok: deep navy recipe sheet bg
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
  },
  sheetHero: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetEmoji: { fontSize: 72 },
  sheetClose: {
    position: "absolute",
    top: 10,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBody: { padding: 18 },
  sheetTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", marginBottom: 10 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  sheetTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(249,115,22,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  sheetTagText: { fontSize: 10, fontWeight: "800", color: ORANGE },

  audioBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.22)",
  },
  readBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: VIOLET,
  },
  readBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  voiceToggle: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  voicePill: { paddingHorizontal: 8, paddingVertical: 5 },
  voicePillActive: { backgroundColor: VIOLET },
  voicePillText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.55)" },
  voicePillTextActive: { color: "#fff" },

  safetyBox: {
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.25)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    gap: 6,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  safeBadge: {
    backgroundColor: "rgba(34,197,94,0.2)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  safeBadgeText: { fontSize: 9.5, fontWeight: "800", color: palette.green400, letterSpacing: 0.3 },
  whyText: { fontSize: 11, color: "rgba(134,239,172,0.9)", lineHeight: 15 },

  warnBox: {
    backgroundColor: "rgba(251,191,36,0.1)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  warnText: { fontSize: 11, color: "rgba(253,224,71,0.9)", lineHeight: 15 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: ORANGE,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  ingRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  ingChip: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ingChipText: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
  stepRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ORANGE,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: "900", color: "#FFFFFF" },
  stepText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 18 },
});
