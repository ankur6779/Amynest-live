import React, { useMemo, useState } from "react";
import {
  Modal, View, Text, StyleSheet, Pressable, ScrollView,
  TouchableOpacity, Dimensions, Image, ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, SlideInDown, SlideOutDown } from "react-native-reanimated";
import SlideToComplete from "./SlideToComplete";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { getActivityImage } from "@/lib/activity-images";

type Recipe = {
  name: string;
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  steps: { step: number; instruction: string }[];
  tips?: string;
};

type ItemStatus = "pending" | "completed" | "skipped" | "delayed";
export type RoutineItemLike = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: ItemStatus;
  skipReason?: string;
  meal?: string;
  recipe?: {
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: string[];
    steps: string[];
    tip?: string;
  };
  nutrition?: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    notes?: string;
  };
  ageBand?: "2-5" | "6-10" | "10+";
  parentHubTopic?: string;
};

const SCREEN_H = Dimensions.get("window").height;

interface Props {
  item: RoutineItemLike | null;
  visible: boolean;
  isInteractive?: boolean;
  onClose: () => void;
  onComplete: () => void;
  onDelay: (mins: number) => void;
  onSkip: () => void;
  onReopen: () => void;
}

const CATEGORY_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; gradient: readonly [string, string] }> = {
  morning:  { icon: "sunny",       gradient: ["#F59E0B", "#FB923C"] as const },
  meal:     { icon: "restaurant",  gradient: ["#F97316", "#F43F5E"] as const },
  tiffin:   { icon: "fast-food",   gradient: ["#FB923C", "#EF4444"] as const },
  snack:    { icon: "ice-cream",   gradient: ["#FACC15", "#F97316"] as const },
  school:   { icon: "school",      gradient: ["#3B82F6", "#6366F1"] as const },
  homework: { icon: "create",      gradient: ["#6366F1", "#8B5CF6"] as const },
  reading:  { icon: "book",        gradient: ["#8B5CF6", "#EC4899"] as const },
  exercise: { icon: "fitness",     gradient: ["#10B981", "#059669"] as const },
  play:     { icon: "happy",       gradient: ["#EC4899", "#A855F7"] as const },
  bonding:  { icon: "heart",       gradient: ["#F472B6", "#EC4899"] as const },
  hygiene:  { icon: "water",       gradient: ["#22D3EE", "#3B82F6"] as const },
  travel:   { icon: "car",         gradient: ["#0EA5E9", "#6366F1"] as const },
  screen:   { icon: "tv",          gradient: ["#64748B", "#475569"] as const },
  sleep:    { icon: "moon",        gradient: ["#6366F1", "#1E1B4B"] as const },
  "wind-down": { icon: "cloud-outline", gradient: ["#7C3AED", "#1E1B4B"] as const },
};

function pickCategory(category = "") {
  const k = Object.keys(CATEGORY_ICON).find((x) => category.toLowerCase().includes(x));
  return k ? CATEGORY_ICON[k] : { icon: "ellipse" as const, gradient: ["#7B3FF2", "#FF4ECD"] as const };
}

function statusBadge(status: ItemStatus) {
  switch (status) {
    case "completed": return { text: "✓ Done",   bg: "rgba(34,197,94,0.85)" };
    case "skipped":   return { text: "Skipped",   bg: "rgba(100,116,139,0.85)" };
    case "delayed":   return { text: "⏱ Delayed", bg: "rgba(245,158,11,0.85)" };
    default:          return null;
  }
}

export default function RoutineItemModal({
  item, visible, isInteractive = true,
  onClose, onComplete, onDelay, onSkip, onReopen,
}: Props) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const authFetch = useAuthFetch();

  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  const fetchRecipe = async (mealName: string) => {
    setSelectedMeal(mealName);
    setRecipe(null);
    setRecipeError(null);
    setRecipeLoading(true);
    try {
      const res = await authFetch("/api/ai/recipe", {
        method: "POST",
        body: JSON.stringify({ mealName }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as Recipe;
      setRecipe(data);
    } catch {
      setRecipeError("Couldn't load this recipe. Please try again.");
    } finally {
      setRecipeLoading(false);
    }
  };
  const closeRecipe = () => {
    setSelectedMeal(null);
    setRecipe(null);
    setRecipeError(null);
    setRecipeLoading(false);
  };

  if (!item) return null;
  const status = (item.status ?? "pending") as ItemStatus;
  const isPending = status === "pending";
  const cat = pickCategory(item.category);
  const badge = statusBadge(status);

  const isMealOptions = !!item.notes && item.notes.startsWith("Options:");
  const mealOpts = isMealOptions
    ? item.notes!.replace("Options:", "").split("|").map((x) => x.trim()).filter(Boolean)
    : [];

  const heroSeed = (item.activity?.length ?? 0) + (item.time?.length ?? 0);
  const heroImg = getActivityImage(item.category ?? "", item.activity ?? "", heroSeed);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View entering={FadeIn.duration(180)} style={s.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={selectedMeal !== null ? closeRecipe : onClose} />

        <Animated.View
          entering={SlideInDown.springify().damping(18).stiffness(180)}
          exiting={SlideOutDown.duration(200)}
          style={[s.sheet, { maxHeight: SCREEN_H * 0.92 }]}
        >
          {selectedMeal !== null ? (
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <LinearGradient colors={["#FB923C", "#F43F5E"] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
                <View style={s.handle} />
                <TouchableOpacity onPress={closeRecipe} style={s.closeBtn} activeOpacity={0.85} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close recipe">
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={s.heroIconWrap}>
                  <MaterialCommunityIcons name="chef-hat" size={36} color="#fff" />
                </View>
                <Text style={s.heroTitle} numberOfLines={3}>
                  {recipeLoading ? "Loading recipe…" : (recipe?.name ?? selectedMeal ?? "Recipe")}
                </Text>
              </LinearGradient>

              <View style={s.body}>
                {recipeLoading && (
                  <View style={{ alignItems: "center", paddingVertical: 24, gap: 10 }}>
                    <ActivityIndicator color="#F97316" />
                    <Text style={[s.notesText, { textAlign: "center" }]}>Generating recipe…</Text>
                  </View>
                )}

                {recipeError && !recipeLoading && (
                  <View style={s.skipBox}>
                    <Text style={s.skipEmoji}>⚠️</Text>
                    <Text style={s.skipText}>{recipeError}</Text>
                  </View>
                )}

                {recipe && !recipeLoading && (
                  <View style={{ gap: 16 }}>
                    <View style={s.statsRow}>
                      <View style={[s.statBox, { backgroundColor: "rgba(251,146,60,0.12)" }]}>
                        <Ionicons name="timer-outline" size={16} color="#F97316" />
                        <Text style={s.statValue}>{recipe.prepTime}</Text>
                        <Text style={s.statLabel}>Prep</Text>
                      </View>
                      <View style={[s.statBox, { backgroundColor: "rgba(244,63,94,0.12)" }]}>
                        <Ionicons name="flame-outline" size={16} color="#F43F5E" />
                        <Text style={s.statValue}>{recipe.cookTime}</Text>
                        <Text style={s.statLabel}>Cook</Text>
                      </View>
                      <View style={[s.statBox, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                        <Ionicons name="people-outline" size={16} color="#10B981" />
                        <Text style={s.statValue}>{recipe.servings}</Text>
                        <Text style={s.statLabel}>Serves</Text>
                      </View>
                    </View>

                    <View>
                      <Text style={s.sectionLabel}>Ingredients</Text>
                      <View style={{ marginTop: 6, gap: 6 }}>
                        {(recipe.ingredients ?? []).map((ing, i) => (
                          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
                            <Text style={{ color: "#F97316", fontWeight: "800" }}>•</Text>
                            <Text style={[s.notesText, { flex: 1 }]}>{ing}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    <View>
                      <Text style={s.sectionLabel}>Instructions</Text>
                      <View style={{ marginTop: 8, gap: 12 }}>
                        {(recipe.steps ?? []).map((st) => (
                          <View key={st.step} style={{ flexDirection: "row", gap: 10 }}>
                            <View style={s.stepNum}>
                              <Text style={s.stepNumText}>{st.step}</Text>
                            </View>
                            <Text style={[s.notesText, { flex: 1 }]}>{st.instruction}</Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {recipe.tips ? (
                      <View style={s.tipBox}>
                        <Text style={s.tipLabel}>💡 Parent tip</Text>
                        <Text style={s.tipText}>{recipe.tips}</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <TouchableOpacity onPress={closeRecipe} activeOpacity={0.85} style={s.closeFooter}>
                  <Text style={s.closeFooterText}>Back</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Hero header */}
            <LinearGradient colors={cat.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
              <View style={s.handle} />
              <TouchableOpacity
                onPress={onClose}
                style={s.closeBtn}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>

              <View style={s.heroIconWrap}>
                <Image source={heroImg.src} style={s.heroImage} resizeMode="cover" />
              </View>

              <Text style={s.heroTitle} numberOfLines={3}>{item.activity}</Text>

              <View style={s.heroMeta}>
                <View style={s.metaPill}>
                  <Ionicons name="time-outline" size={12} color="#fff" />
                  <Text style={s.metaText}>{item.time}</Text>
                </View>
                <View style={s.metaPill}>
                  <Ionicons name="hourglass-outline" size={12} color="#fff" />
                  <Text style={s.metaText}>{item.duration}m</Text>
                </View>
                <View style={s.metaPill}>
                  <Text style={s.metaText}>{item.category}</Text>
                </View>
                {badge && (
                  <View style={[s.metaPill, { backgroundColor: badge.bg }]}>
                    <Text style={[s.metaText, { fontWeight: "800" }]}>{badge.text}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Body */}
            <View style={s.body}>
              {item.skipReason ? (
                <View style={s.skipBox}>
                  <Text style={s.skipEmoji}>⚠️</Text>
                  <Text style={s.skipText}>{item.skipReason}</Text>
                </View>
              ) : null}

              {(item.recipe || item.nutrition) ? (
                <View style={s.notesBox}>
                  <Text style={s.sectionLabel}>👨‍🍳 Recipe & Nutrition {item.meal ? `— ${item.meal}` : ""}</Text>
                  {item.recipe ? (
                    <View style={{ gap: 6, marginTop: 6 }}>
                      <Text style={[s.notesText, { fontSize: 11, opacity: 0.7 }]}>
                        Prep {item.recipe.prepTime} · Cook {item.recipe.cookTime} · Serves {item.recipe.servings}
                      </Text>
                      <Text style={[s.notesText, { fontWeight: "700" }]}>Ingredients</Text>
                      {(item.recipe.ingredients ?? []).map((ing, i) => (
                        <Text key={`ing-${i}`} style={s.notesText}>• {ing}</Text>
                      ))}
                      <Text style={[s.notesText, { fontWeight: "700", marginTop: 4 }]}>Steps</Text>
                      {(item.recipe.steps ?? []).map((st, i) => (
                        <Text key={`st-${i}`} style={s.notesText}>{i + 1}. {st}</Text>
                      ))}
                      {item.recipe.tip ? (
                        <Text style={[s.notesText, { fontStyle: "italic", marginTop: 4 }]}>💡 {item.recipe.tip}</Text>
                      ) : null}
                    </View>
                  ) : null}
                  {item.nutrition ? (
                    <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" }}>
                      <Text style={[s.notesText, { fontWeight: "700" }]}>Nutrition (approx.)</Text>
                      <View style={[s.statsRow, { marginTop: 6 }]}>
                        <View style={[s.statBox, { backgroundColor: "rgba(251,146,60,0.12)" }]}>
                          <Text style={s.statValue}>{item.nutrition.calories}</Text>
                          <Text style={s.statLabel}>Cal</Text>
                        </View>
                        <View style={[s.statBox, { backgroundColor: "rgba(244,63,94,0.12)" }]}>
                          <Text style={s.statValue}>{item.nutrition.protein}</Text>
                          <Text style={s.statLabel}>Protein</Text>
                        </View>
                        <View style={[s.statBox, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                          <Text style={s.statValue}>{item.nutrition.carbs}</Text>
                          <Text style={s.statLabel}>Carbs</Text>
                        </View>
                        <View style={[s.statBox, { backgroundColor: "rgba(99,102,241,0.12)" }]}>
                          <Text style={s.statValue}>{item.nutrition.fat}</Text>
                          <Text style={s.statLabel}>Fat</Text>
                        </View>
                      </View>
                      {item.nutrition.notes ? (
                        <Text style={[s.notesText, { marginTop: 6, fontStyle: "italic" }]}>{item.nutrition.notes}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {isMealOptions ? (
                <View style={{ gap: 8 }}>
                  <Text style={s.sectionLabel}>🍽️ Today's meal options</Text>
                  <View style={s.optionsWrap}>
                    {mealOpts.map((opt, oi) => (
                      <TouchableOpacity
                        key={oi}
                        style={s.optionPill}
                        activeOpacity={0.8}
                        onPress={() => fetchRecipe(opt)}
                        accessibilityRole="button"
                        accessibilityLabel={`View recipe for ${opt}`}
                      >
                        <MaterialCommunityIcons name="chef-hat" size={12} color="#c2410c" />
                        <Text style={s.optionText}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={s.optionHint}>Tap a meal to view its recipe</Text>
                </View>
              ) : item.notes ? (
                <View style={s.notesBox}>
                  <Text style={s.sectionLabel}>📋 Instructions</Text>
                  <Text style={s.notesText}>{item.notes}</Text>
                </View>
              ) : null}

              {isInteractive && isPending && (
                <View style={{ gap: 10, marginTop: 4 }}>
                  <SlideToComplete onComplete={onComplete} />
                  <View style={s.secondaryRow}>
                    <TouchableOpacity
                      onPress={() => onDelay(15)}
                      activeOpacity={0.85}
                      style={[s.secondaryBtn, { backgroundColor: c.statusWarningBg, borderColor: c.statusWarningBorder }]}
                    >
                      <Ionicons name="time" size={16} color={c.statusWarningText} />
                      <Text style={[s.secondaryText, { color: c.statusWarningText }]}>Delay +15m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={onSkip}
                      activeOpacity={0.85}
                      style={[s.secondaryBtn, { backgroundColor: c.calloutBg, borderColor: c.glassBorder }]}
                    >
                      <MaterialCommunityIcons name="skip-next" size={16} color={c.textBody} />
                      <Text style={[s.secondaryText, { color: c.textBody }]}>Skip</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isInteractive && !isPending && (
                <TouchableOpacity onPress={onReopen} activeOpacity={0.85} style={s.reopenBtn}>
                  <Ionicons name="arrow-undo" size={16} color={c.foreground} />
                  <Text style={s.reopenText}>Mark as pending again</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={s.closeFooter}>
                <Text style={s.closeFooterText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.65)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: c.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: c.glassBorder,
    },

    hero: {
      paddingTop: 14,
      paddingBottom: 22,
      paddingHorizontal: 20,
      position: "relative",
    },
    handle: {
      alignSelf: "center",
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: "rgba(255,255,255,0.4)",
      marginBottom: 12,
    },
    closeBtn: {
      position: "absolute", top: 10, right: 10,
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center", justifyContent: "center",
    },
    heroIconWrap: {
      width: 72, height: 72, borderRadius: 24,
      backgroundColor: "rgba(255,255,255,0.18)",
      alignItems: "center", justifyContent: "center",
      marginBottom: 12,
      borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    },
    heroTitle: {
      color: "#fff",
      fontSize: 22,
      fontWeight: "800",
      lineHeight: 28,
    },
    heroMeta: {
      flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10,
    },
    metaPill: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 8, paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(0,0,0,0.28)",
    },
    metaText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    body: { padding: 20, gap: 14 },

    skipBox: {
      flexDirection: "row", gap: 8,
      backgroundColor: c.statusWarningBg,
      borderWidth: 1, borderColor: c.statusWarningBorder,
      borderRadius: 14, padding: 12,
    },
    skipEmoji: { fontSize: 16 },
    skipText: { flex: 1, color: c.statusWarningText, fontSize: 13, fontWeight: "600", lineHeight: 18 },

    sectionLabel: { color: c.foreground, fontSize: 13, fontWeight: "800" },

    optionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    optionPill: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: "rgba(251,146,60,0.18)",
      borderWidth: 1, borderColor: "rgba(251,146,60,0.45)",
    },
    optionText: { color: "#c2410c", fontSize: 12, fontWeight: "700" },
    optionHint: { color: c.textMuted, fontSize: 11, fontStyle: "italic" },
    heroImage: { width: 72, height: 72, borderRadius: 24 },
    statsRow: { flexDirection: "row", gap: 8 },
    statBox: { flex: 1, alignItems: "center", padding: 10, borderRadius: 14, gap: 2 },
    statValue: { color: c.foreground, fontSize: 13, fontWeight: "800", marginTop: 2 },
    statLabel: { color: c.textMuted, fontSize: 10, fontWeight: "600" },
    stepNum: {
      width: 22, height: 22, borderRadius: 11,
      alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(251,146,60,0.2)", borderWidth: 1, borderColor: "rgba(251,146,60,0.4)",
      marginTop: 2,
    },
    stepNumText: { color: "#c2410c", fontSize: 11, fontWeight: "800" },
    tipBox: {
      backgroundColor: "rgba(245,158,11,0.12)",
      borderWidth: 1, borderColor: "rgba(245,158,11,0.35)",
      borderRadius: 14, padding: 12, gap: 4,
    },
    tipLabel: { color: "#92400E", fontSize: 11, fontWeight: "800" },
    tipText: { color: "#92400E", fontSize: 12, lineHeight: 17 },

    notesBox: {
      backgroundColor: c.calloutBg,
      borderWidth: 1, borderColor: c.glassBorder,
      borderRadius: 14, padding: 14, gap: 6,
    },
    notesText: { color: c.textBody, fontSize: 13, lineHeight: 19 },

    secondaryRow: { flexDirection: "row", gap: 8 },
    secondaryBtn: {
      flex: 1,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      paddingVertical: 11,
      borderRadius: 14,
      borderWidth: 1,
    },
    secondaryText: { fontSize: 13, fontWeight: "700" },

    reopenBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: c.calloutBg,
      borderWidth: 1, borderColor: c.glassBorder,
    },
    reopenText: { color: c.foreground, fontSize: 13, fontWeight: "700" },

    closeFooter: {
      paddingVertical: 12,
      borderRadius: 14,
      borderWidth: 1, borderColor: c.glassBorder,
      alignItems: "center",
    },
    closeFooterText: { color: c.textMuted, fontSize: 13, fontWeight: "700" },
  });
}
