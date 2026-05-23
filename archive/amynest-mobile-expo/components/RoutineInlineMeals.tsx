/**
 * RoutineInlineMeals (React Native)
 *
 * Compact Amy AI meal suggestion strip inside meal / tiffin cards on the
 * Routine detail screen. Tap a card to open the recipe bottom sheet.
 *
 * instanceIndex (0, 1, 2…) picks a non-overlapping 4-meal window from the
 * API's ranked list so multiple blocks on the same page show different meals.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, Pressable, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { brand, palette } from "@/constants/colors";
import { API_BASE_URL } from "@/constants/api";
import { useTranslation } from "react-i18next";

interface RankedMeal {
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
  isVeg: boolean;
  matchedIngredients: string[];
  missingIngredients: string[];
}

interface SuggestionResult {
  meals: RankedMeal[];
  amyMessage: string;
}

interface Props {
  region?: string;
  audience?: "kids_tiffin" | "parent_healthy";
  childAge?: number;
  isVeg?: boolean;
  /** 0-based index — used to show a different 4-meal slice per block */
  instanceIndex?: number;
}

export default function RoutineInlineMeals({
  region = "pan_indian",
  audience = "kids_tiffin",
  childAge,
  isVeg,
  instanceIndex = 0,
}: Props) {
  const { t } = useTranslation();
  const [meals, setMeals] = useState<RankedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMeal, setOpenMeal] = useState<RankedMeal | null>(null);

  const handleClose = useCallback(() => setOpenMeal(null), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const p = new URLSearchParams({ region, audience });
    if (childAge != null) p.set("childAge", String(childAge));
    if (isVeg === true) p.set("isVeg", "true");

    void (async () => {
      const { default: i18nInstance } = await import("@/i18n");
      p.set("language", i18nInstance.language || "en");

      // /api/meals/suggest is a public endpoint — plain fetch, no auth needed
      try {
        const r = await fetch(`${API_BASE_URL}/api/meals/suggest?${p.toString()}`);
        const json = r.ok ? ((await r.json()) as SuggestionResult | null) : null;
        if (cancelled) return;
        if (json && json.meals?.length > 0) {
          const start = instanceIndex * 4;
          const end = start + 4;
          const slice = json.meals.slice(start, end);
          setMeals(slice.length > 0 ? slice : json.meals.slice(0, 4));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [region, audience, childAge, isVeg, instanceIndex]);

  return (
    <View style={[styles.wrapper, { borderColor: "rgba(251,146,60,0.3)", backgroundColor: "rgba(251,146,60,0.06)" }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🤖</Text>
        <Text style={styles.headerText}>{t("components.routine_inline_meals.amy_ai_meal_suggestions")}</Text>
      </View>

      {/* Cards */}
      {loading ? (
        <View style={styles.loadingRow}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.skeleton, { backgroundColor: "rgba(251,146,60,0.12)" }]} />
          ))}
        </View>
      ) : meals.length === 0 ? (
        <Text style={styles.emptyText}>{t("components.routine_inline_meals.no_suggestions_available")}</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={140}
          snapToAlignment="start"
        >
          {meals.map(m => (
            <MiniCard
              key={m.id}
              meal={m}
              onPress={() => setOpenMeal(m)}
            />
          ))}
        </ScrollView>
      )}

      {/* Recipe Modal */}
      <Modal
        visible={!!openMeal}
        animationType="slide"
        transparent
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {openMeal ? (
          <RecipeSheet meal={openMeal} onClose={handleClose} />
        ) : null}
      </Modal>
    </View>
  );
}

// ─── Mini Card ───────────────────────────────────────────────────────────────
function MiniCard({ meal, onPress }: { meal: RankedMeal; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={styles.miniCard}
    >
      <LinearGradient
        colors={meal.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.miniHero}
      >
        <Text style={styles.miniEmoji}>{meal.emoji}</Text>
        {meal.tags[0] ? (
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{meal.tags[0]}</Text>
          </View>
        ) : null}
      </LinearGradient>
      <View style={styles.miniInfo}>
        <Text style={styles.miniTitle} numberOfLines={2}>{meal.title}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={10} color={palette.slate400} />
          <Text style={styles.metaText}>{meal.prepMinutes}m</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Recipe Sheet ────────────────────────────────────────────────────────────
function RecipeSheet({ meal, onClose }: { meal: RankedMeal; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    // Outer Pressable = scrim / backdrop
    <Pressable style={styles.recipeScrim} onPress={onClose}>
      {/* Inner View (not Pressable) stops touch propagation to scrim */}
      <View style={styles.recipeSheet}>
        {/* Drag handle */}
        <View style={styles.recipeHandle} />

        {/* Hero gradient */}
        <LinearGradient
          colors={meal.bgGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recipeHero}
        >
          <Text style={styles.recipeEmoji}>{meal.emoji}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Scrollable body — FlatList replaced with ScrollView to avoid
            nested-VirtualizedList warnings and touch-propagation issues */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <View style={styles.recipeBody}>
            <Text style={styles.recipeTitle}>{meal.title}</Text>

            {/* Tags */}
            <View style={styles.recipeTagRow}>
              {meal.tags.map(t => (
                <View key={t} style={styles.recipeTag}>
                  <Text style={styles.recipeTagText}>{t}</Text>
                </View>
              ))}
              <View style={styles.recipeTag}>
                <Ionicons name="time-outline" size={10} color={palette.orange500} />
                <Text style={styles.recipeTagText}> {meal.prepMinutes}m</Text>
              </View>
              {meal.calories > 0 && (
                <View style={styles.recipeTag}>
                  <Text style={styles.recipeTagText}>🔥 {meal.calories} kcal</Text>
                </View>
              )}
            </View>

            {/* Ingredients */}
            <Text style={styles.sectionLabel}>{t("components.routine_inline_meals.ingredients")}</Text>
            <View style={styles.ingredientsRow}>
              {meal.ingredients.map(ing => (
                <View key={ing} style={styles.ingChip}>
                  <Text style={styles.ingText}>{ing}</Text>
                </View>
              ))}
            </View>

            {/* Steps */}
            <Text style={styles.sectionLabel}>{t("components.routine_inline_meals.steps")}</Text>
            {meal.steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251,146,60,0.2)",
  },
  headerEmoji: { fontSize: 14 },
  headerText: { fontSize: 11.5, fontWeight: "800", color: palette.orange600, letterSpacing: 0.2 },
  loadingRow: { flexDirection: "row", gap: 8, padding: 10 },
  skeleton: { width: 120, height: 130, borderRadius: 12 },
  emptyText: { fontSize: 12, color: palette.slate400, padding: 12 },
  scrollContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 8 },

  miniCard: {
    width: 128,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  miniHero: { height: 70, alignItems: "center", justifyContent: "center" },
  miniEmoji: { fontSize: 34 },
  tagPill: {
    position: "absolute",
    bottom: 4, left: 6,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  tagText: { fontSize: 8.5, fontWeight: "800", color: palette.slate900 },
  miniInfo: { padding: 7 },
  miniTitle: { fontSize: 11.5, fontWeight: "800", color: "#FFFFFF", lineHeight: 15, marginBottom: 3 }, // audit-ok: white text on dark meal card
  metaRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  metaText: { fontSize: 10, color: palette.slate400 },

  recipeScrim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  recipeSheet: {
    backgroundColor: "#141428", // audit-ok: deep navy-purple for recipe sheet bg
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    overflow: "hidden",
  },
  recipeHandle: {
    width: 36, height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
  },
  recipeHero: {
    height: 150,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeEmoji: { fontSize: 72 },
  closeBtn: {
    position: "absolute", top: 10, right: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
    width: 30, height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  recipeBody: { padding: 18 },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF", // audit-ok: white title text on dark recipe sheet
    marginBottom: 10,
  },
  recipeTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  recipeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(249,115,22,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  recipeTagText: { fontSize: 10, fontWeight: "800", color: palette.orange400 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: palette.orange500,
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  ingredientsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 },
  ingChip: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ingText: { fontSize: 11, color: "rgba(255,255,255,0.8)" },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  stepNum: {
    width: 22, height: 22,
    borderRadius: 11,
    backgroundColor: palette.orange500,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { fontSize: 11, fontWeight: "900", color: "#FFFFFF" }, // audit-ok: white text on orange step bubble
  stepText: { flex: 1, fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 18 },
});
