import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Pressable, ActivityIndicator, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { useColors } from "@/hooks/useColors";
import { brand, brandAlpha } from "@/constants/colors";
import TiffinFeedbackPanel, { loadHistoryAsync as loadTiffinHistoryAsync } from "@/components/TiffinFeedbackPanel";
import { getLearningSignals, type TiffinHistory } from "@workspace/tiffin-feedback";

type MealTag = "Healthy" | "Quick" | "Protein" | "Veg" | "Non-Veg" | "Sweet";

interface RankedMeal {
  id: string;
  title: string;
  emoji: string;
  bgGradient: [string, string];
  region: string;
  category: "kids_tiffin" | "parent_healthy";
  ingredients: string[];
  steps: string[];
  calories: number;
  tags: MealTag[];
  prepMinutes: number;
  audioText: string;
  isVeg: boolean;
  matchedIngredients: string[];
  missingIngredients: string[];
}

interface SuggestionResult {
  meals: RankedMeal[];
  amyMessage: string;
  usedFallback: boolean;
}

type Audience = "kids_tiffin" | "parent_healthy";

const FRIDGE_QUICK = [
  "milk", "bread", "paneer", "egg", "rice", "dal",
  "potato", "onion", "tomato", "curd", "cheese", "oats",
];
const STORAGE_FRIDGE = "amynest.fridge_items.v1";
const STORAGE_VOICE = "amynest.tts_voice.v1";

// ElevenLabs voice IDs used by the Amy persona on mobile.
// Indian ElevenLabs voices.
const VOICE_FEMALE_ID = "QbQKfe9vgx5OsbZUvlFv"; // Ananya K — Indian English Female
const VOICE_MALE_ID   = "oaz5NvoRIhcJystOASAA"; // Karthik — Indian English Male

interface Props {
  region?: string;
  childAge?: number;
  isVeg?: boolean;
}

export default function SmartMealSuggestions({ region: regionProp, childAge: ageProp, isVeg: isVegProp }: Props) {
  const colors = useColors();
  const authFetch = useAuthFetch();
  const [audience, setAudience] = useState<Audience>("kids_tiffin");
  const [region, setRegion] = useState<string>(regionProp ?? "pan_indian");
  const [childAge, setChildAge] = useState<number | undefined>(ageProp);
  const [isVeg, setIsVeg] = useState<boolean | undefined>(isVegProp);
  const [fridge, setFridge] = useState<string[]>([]);
  const [fridgeInput, setFridgeInput] = useState("");
  const [data, setData] = useState<SuggestionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [openMeal, setOpenMeal] = useState<RankedMeal | null>(null);
  const [manualSearch, setManualSearch] = useState(0);
  const [searchFlash, setSearchFlash] = useState(false);

  const handleFindCook = () => {
    setManualSearch(n => n + 1);
    setSearchFlash(true);
    setTimeout(() => setSearchFlash(false), 600);
  };
  const [tiffinHistory, setTiffinHistory] = useState<TiffinHistory>([]);
  useEffect(() => { loadTiffinHistoryAsync().then(setTiffinHistory); }, []);
  const learning = useMemo(() => getLearningSignals(tiffinHistory), [tiffinHistory]);

  // Sync props
  useEffect(() => { if (regionProp) setRegion(regionProp); }, [regionProp]);
  useEffect(() => { if (ageProp != null) setChildAge(ageProp); }, [ageProp]);
  useEffect(() => { if (isVegProp != null) setIsVeg(isVegProp); }, [isVegProp]);

  // Pull region/diet/age from server if props are missing
  useEffect(() => {
    let cancelled = false;
    if (regionProp && ageProp != null) return;
    Promise.all([
      authFetch("/api/parent-profile").then(r => r.ok ? r.json() : null).catch(() => null),
      authFetch("/api/children").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([profile, children]) => {
      if (cancelled) return;
      if (profile?.region && !regionProp) setRegion(profile.region);
      if (profile?.foodType === "veg" && isVegProp == null) setIsVeg(true);
      if (Array.isArray(children) && children[0]?.age != null && ageProp == null) {
        setChildAge(Number(children[0].age));
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Load fridge from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_FRIDGE).then(raw => {
      if (raw) {
        try { setFridge((JSON.parse(raw) as string[]).slice(0, 30)); } catch {}
      }
    });
  }, []);

  // Persist fridge
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_FRIDGE, JSON.stringify(fridge)).catch(() => {});
  }, [fridge]);

  // Fetch suggestions
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("region", region);
    params.set("audience", audience);
    if (fridge.length > 0) params.set("fridge", fridge.join(","));
    if (audience === "kids_tiffin" && childAge != null) {
      params.set("childAge", String(childAge));
    }
    if (isVeg === true) params.set("isVeg", "true");
    if (audience === "kids_tiffin") {
      if (learning.liked.length > 0) params.set("liked", learning.liked.join(","));
      if (learning.disliked.length > 0) params.set("disliked", learning.disliked.join(","));
    }

    if (manualSearch > 0) params.set("_t", String(Date.now()));
    authFetch(`/api/meals/suggest?${params.toString()}`)
      .then(r => r.ok ? r.json() : null)
      .then((r: SuggestionResult | null) => {
        if (!cancelled) {
          setData(r);
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, audience, fridge, childAge, isVeg, learning.liked.join(","), learning.disliked.join(","), manualSearch]);

  // Audio playback lifecycle is owned by useAmyVoice inside RecipeModal,
  // which tears down the player on unmount. Closing the modal unmounts the
  // hook, so no extra cleanup is required here.

  const addFridgeItem = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v) return;
    setFridge(prev => prev.includes(v) ? prev : [...prev, v].slice(0, 30));
    setFridgeInput("");
  };
  const removeFridgeItem = (v: string) => setFridge(prev => prev.filter(x => x !== v));

  const showCalories = audience === "parent_healthy";
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.wrapper}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconBadgeText}>🍱</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>Smart Tiffin & Meal Suggestions</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Personalised by region, fridge & age</Text>
          </View>
        </View>
        <View style={styles.audienceToggle}>
          <TouchableOpacity
            onPress={() => setAudience("kids_tiffin")}
            style={[styles.audPill, audience === "kids_tiffin" && styles.audPillActive]}
          >
            <Text style={[styles.audPillText, audience === "kids_tiffin" && styles.audPillTextActive]}>Kids</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAudience("parent_healthy")}
            style={[styles.audPill, audience === "parent_healthy" && styles.audPillActive]}
          >
            <Text style={[styles.audPillText, audience === "parent_healthy" && styles.audPillTextActive]}>Parent</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 🍱 Tiffin Feedback — daily rating + Top Liked + Amy hint */}
      {audience === "kids_tiffin" ? (
        <TiffinFeedbackPanel
          pickableMeals={(data?.meals ?? []).map(m => ({
            id: m.id, title: m.title, emoji: m.emoji, tag: m.tags[0],
          }))}
          onChange={setTiffinHistory}
        />
      ) : null}

      {/* Amy message */}
      {data ? (
        <View style={styles.amyBox}>
          <Text style={styles.amyEmoji}>🤖</Text>
          <Text style={styles.amyText}>{stripBold(data.amyMessage)}</Text>
        </View>
      ) : null}

      {/* Fridge input */}
      <View style={{ paddingHorizontal: 14, marginTop: 10 }}>
        <Text style={styles.sectionLabel}>What's in your fridge? (optional)</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={fridgeInput}
            onChangeText={setFridgeInput}
            onSubmitEditing={() => addFridgeItem(fridgeInput)}
            placeholder="e.g. paneer"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={() => addFridgeItem(fridgeInput)} style={styles.addBtn}>
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Quick chips */}
        <View style={styles.chipRow}>
          {FRIDGE_QUICK.filter(x => !fridge.includes(x)).slice(0, 8).map(x => (
            <TouchableOpacity key={x} onPress={() => addFridgeItem(x)} style={styles.chipDashed}>
              <Text style={styles.chipDashedText}>+ {x}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {fridge.length > 0 ? (
          <View style={styles.chipRow}>
            {fridge.map(x => (
              <View key={x} style={styles.chipFilled}>
                <Text style={styles.chipFilledText}>{x}</Text>
                <TouchableOpacity onPress={() => removeFridgeItem(x)} hitSlop={8}>
                  <Ionicons name="close" size={11} color={brand.violet700} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {/* CTA: Find What I Can Cook */}
        <TouchableOpacity
          onPress={handleFindCook}
          activeOpacity={0.82}
          style={[
            searchFlash ? styles.findBtnFlash : styles.findBtn,
          ]}
        >
          <LinearGradient
            colors={searchFlash ? ["#EA580C", "#DB2777"] : ["#F97316", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.findBtnGrad}
          >
            <Ionicons name="search" size={15} color="#FFFFFF" />
            <Text style={styles.findBtnText}>🔍 Find What I Can Cook</Text>
            <Ionicons name="sparkles" size={13} color="rgba(255,255,255,0.8)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Cards — horizontal scroll */}
      <View style={{ marginTop: 12, paddingBottom: 14 }}>
        {loading && !data ? (
          <View style={{ paddingVertical: 28, alignItems: "center" }}>
            <ActivityIndicator color={brand.violet600} />
          </View>
        ) : data && data.meals.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 12 }}
            decelerationRate="fast"
            snapToInterval={224}
            snapToAlignment="start"
          >
            {data.meals.map(m => (
              <MealCard
                key={m.id}
                meal={m}
                showCalories={showCalories}
                onPress={() => setOpenMeal(m)}
                styles={styles}
              />
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.emptyText}>No meals found. Try removing a fridge item.</Text>
        )}
      </View>

      {/* Recipe Modal */}
      <Modal visible={!!openMeal} animationType="slide" transparent onRequestClose={() => setOpenMeal(null)}>
        {openMeal ? (
          <RecipeModal
            meal={openMeal}
            showCalories={showCalories}
            onClose={() => setOpenMeal(null)}
            styles={styles}
            colors={colors}
          />
        ) : null}
      </Modal>
    </View>
  );
}

// ─── Card ───────────────────────────────────────────────────────────────────
function MealCard({
  meal, showCalories, onPress, styles,
}: { meal: RankedMeal; showCalories: boolean; onPress: () => void; styles: any }) {
  const tag = meal.tags[0] ?? "Healthy";
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
      <LinearGradient colors={meal.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardHero}>
        <Text style={styles.cardEmoji}>{meal.emoji}</Text>
        <View style={styles.tagPillTL}>
          <Text style={styles.tagPillText}>{tag}</Text>
        </View>
        {meal.matchedIngredients.length > 0 ? (
          <View style={styles.matchPillTR}>
            <Text style={styles.matchPillText}>✓ {meal.matchedIngredients.length}</Text>
          </View>
        ) : null}
      </LinearGradient>
      <View style={{ padding: 10 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{meal.title}</Text>
        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={11} color="#94A3B8" />
            <Text style={styles.metaText}>{meal.prepMinutes}m</Text>
          </View>
          {showCalories ? (
            <View style={styles.metaItem}>
              <Ionicons name="flame-outline" size={11} color="#F97316" />
              <Text style={styles.metaText}>{meal.calories} kcal</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Modal ──────────────────────────────────────────────────────────────────
function RecipeModal({
  meal, showCalories, onClose, styles, colors,
}: { meal: RankedMeal; showCalories: boolean; onClose: () => void; styles: any; colors: any }) {
  const [voicePref, setVoicePref] = useState<"female" | "male">("female");
  const voiceId = voicePref === "male" ? VOICE_MALE_ID : VOICE_FEMALE_ID;
  const { speaking, loading, speak, stop } = useAmyVoice({ voiceId });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_VOICE).then(v => {
      if (v === "male" || v === "female") setVoicePref(v);
    });
  }, []);

  const handleReadAloud = () => {
    // Toggle: tap while loading/playing stops, otherwise starts fresh.
    if (speaking || loading) stop();
    else void speak(meal.audioText);
  };

  const switchVoice = (pref: "female" | "male") => {
    setVoicePref(pref);
    AsyncStorage.setItem(STORAGE_VOICE, pref).catch(() => {});
    // Stop in-flight playback so the next tap synthesises with the new voice.
    stop();
  };

  return (
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={styles.modalSheet} onPress={() => {}}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <LinearGradient colors={meal.bgGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHero}>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={18} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalEmoji}>{meal.emoji}</Text>
          </LinearGradient>

          <View style={{ padding: 18 }}>
            <Text style={styles.modalTitle}>{meal.title}</Text>
            <View style={styles.tagRow}>
              {meal.tags.map(t => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{t}</Text>
                </View>
              ))}
              <View style={[styles.tagChip, { backgroundColor: brandAlpha.violet500_18 }]}>
                <Ionicons name="time-outline" size={10} color={brand.violet700} />
                <Text style={[styles.tagChipText, { color: brand.violet700 }]}> {meal.prepMinutes} min</Text>
              </View>
              {showCalories ? (
                <View style={[styles.tagChip, { backgroundColor: "rgba(249,115,22,0.15)" }]}>
                  <Ionicons name="flame-outline" size={10} color="#C2410C" />
                  <Text style={[styles.tagChipText, { color: "#C2410C" }]}> {meal.calories} kcal</Text>
                </View>
              ) : null}
            </View>

            {/* Read Aloud */}
            <View style={styles.audioBox}>
              <TouchableOpacity
                onPress={handleReadAloud}
                disabled={loading}
                style={[styles.readBtn, loading && { opacity: 0.7 }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name={speaking ? "volume-mute" : "volume-high"} size={14} color="#fff" />
                )}
                <Text style={styles.readBtnText}>{loading ? "Loading…" : speaking ? "Stop" : "Read Aloud"}</Text>
              </TouchableOpacity>
              <View style={styles.voiceToggle}>
                <TouchableOpacity onPress={() => switchVoice("female")} style={[styles.voicePill, voicePref === "female" && styles.voicePillActive]}>
                  <Text style={[styles.voicePillText, voicePref === "female" && styles.voicePillTextActive]}>♀ Female</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => switchVoice("male")} style={[styles.voicePill, voicePref === "male" && styles.voicePillActive]}>
                  <Text style={[styles.voicePillText, voicePref === "male" && styles.voicePillTextActive]}>♂ Male</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ingredients */}
            <Text style={styles.modalSectionLabel}>🛒  Ingredients</Text>
            <View style={styles.tagRow}>
              {meal.ingredients.map(ing => {
                const matched = meal.matchedIngredients.some(m => ing.includes(m) || m.includes(ing));
                return (
                  <View key={ing} style={[styles.ingChip, matched && styles.ingChipMatched]}>
                    <Text style={[styles.ingChipText, matched && styles.ingChipTextMatched]}>
                      {matched ? "✓ " : ""}{ing}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Steps */}
            <Text style={styles.modalSectionLabel}>👨‍🍳  Steps</Text>
            <View style={{ gap: 10 }}>
              {meal.steps.map((step, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                  <View style={styles.stepBullet}>
                    <Text style={styles.stepBulletText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
            <View style={{ height: 24 }} />
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

function stripBold(s: string): string {
  return (s || "").replace(/\*\*([^*]+)\*\*/g, "$1");
}

// ─── Styles ─────────────────────────────────────────────────────────────────
function makeStyles(colors: any) {
  return StyleSheet.create({
    wrapper: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: brandAlpha.violet600_15,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    headerRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 14, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: brandAlpha.violet600_10,
      gap: 10,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
    iconBadge: {
      width: 34, height: 34, borderRadius: 12,
      backgroundColor: brandAlpha.violet500_18,
      alignItems: "center", justifyContent: "center",
    },
    iconBadgeText: { fontSize: 18 },
    title: { fontWeight: "800", fontSize: 14, color: colors.text },
    subtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
    audienceToggle: {
      flexDirection: "row", padding: 2,
      borderRadius: 999, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    audPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    audPillActive: { backgroundColor: brand.violet600 },
    audPillText: { fontSize: 11, fontWeight: "800", color: colors.textMuted },
    audPillTextActive: { color: "#fff" },

    amyBox: {
      flexDirection: "row", gap: 8, alignItems: "flex-start",
      marginHorizontal: 14, marginTop: 12, padding: 10,
      borderRadius: 12, borderWidth: 1,
      borderColor: brandAlpha.violet600_15,
      backgroundColor: brandAlpha.violet500_10,
    },
    amyEmoji: { fontSize: 16, marginTop: 1 },
    amyText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: colors.text },

    sectionLabel: {
      fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4,
      textTransform: "uppercase", color: colors.textMuted, marginBottom: 6,
    },
    input: {
      flex: 1, height: 36, paddingHorizontal: 12, borderRadius: 10,
      borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface, color: colors.text, fontSize: 13,
    },
    addBtn: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 12, height: 36, borderRadius: 10,
      backgroundColor: brand.violet600,
    },
    addBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },

    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    chipDashed: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
    },
    chipDashedText: { fontSize: 11, color: colors.textMuted },
    chipFilled: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingLeft: 8, paddingRight: 6, paddingVertical: 3, borderRadius: 999,
      backgroundColor: brandAlpha.violet500_18,
      borderWidth: 1, borderColor: brandAlpha.violet600_25,
    },
    chipFilledText: { fontSize: 11, fontWeight: "800", color: brand.violet700 },

    findBtn: { marginTop: 12, borderRadius: 14, overflow: "hidden" },
    findBtnFlash: { marginTop: 12, borderRadius: 14, overflow: "hidden", opacity: 0.88 },
    findBtnGrad: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, paddingVertical: 12, paddingHorizontal: 18,
    },
    findBtnText: { color: "#FFFFFF", fontWeight: "900", fontSize: 14, letterSpacing: 0.2 },

    emptyText: { textAlign: "center", color: colors.textMuted, paddingVertical: 18, fontSize: 12.5 },

    card: {
      width: 212, borderRadius: 16, overflow: "hidden",
      borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card,
    },
    cardHero: { height: 110, alignItems: "center", justifyContent: "center", position: "relative" },
    cardEmoji: { fontSize: 56 },
    tagPillTL: {
      position: "absolute", top: 8, left: 8,
      backgroundColor: "rgba(255,255,255,0.85)",
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    },
    tagPillText: { fontSize: 9.5, fontWeight: "900", color: "#1E293B", letterSpacing: 0.4, textTransform: "uppercase" },
    matchPillTR: {
      position: "absolute", top: 8, right: 8,
      backgroundColor: "#10B981",
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
    },
    matchPillText: { fontSize: 9.5, fontWeight: "900", color: "#fff" },
    cardTitle: { fontSize: 13, fontWeight: "800", color: colors.text },
    cardMetaRow: { flexDirection: "row", gap: 10, marginTop: 4 },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
    metaText: { fontSize: 11, color: colors.textMuted },

    // Modal
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 26, borderTopRightRadius: 26,
      maxHeight: "90%",
    },
    modalHero: {
      height: 170, alignItems: "center", justifyContent: "center",
      borderTopLeftRadius: 26, borderTopRightRadius: 26, position: "relative",
    },
    modalClose: {
      position: "absolute", top: 12, right: 12,
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.9)",
      alignItems: "center", justifyContent: "center",
    },
    modalEmoji: { fontSize: 88 },
    modalTitle: { fontSize: 20, fontWeight: "900", color: colors.text },
    tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
    tagChip: {
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      backgroundColor: brandAlpha.violet500_18,
    },
    tagChipText: { fontSize: 10, fontWeight: "800", color: brand.violet700, textTransform: "uppercase", letterSpacing: 0.3 },

    audioBox: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      gap: 8, marginTop: 16, padding: 10, borderRadius: 14,
      backgroundColor: brandAlpha.violet500_10, borderWidth: 1,
      borderColor: brandAlpha.violet600_15,
    },
    readBtn: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
      backgroundColor: brand.violet600,
    },
    readBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
    voiceToggle: {
      flexDirection: "row", padding: 2, borderRadius: 999,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    },
    voicePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    voicePillActive: { backgroundColor: brand.violet600 },
    voicePillText: { fontSize: 10, fontWeight: "800", color: colors.textMuted },
    voicePillTextActive: { color: "#fff" },

    modalSectionLabel: { fontSize: 13, fontWeight: "800", color: colors.text, marginTop: 18, marginBottom: 8 },
    ingChip: {
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    },
    ingChipMatched: {
      borderColor: "rgba(16,185,129,0.4)", backgroundColor: "rgba(16,185,129,0.12)",
    },
    ingChipText: { fontSize: 11, color: colors.text },
    ingChipTextMatched: { color: "#047857", fontWeight: "700" },
    stepBullet: {
      width: 22, height: 22, borderRadius: 11,
      backgroundColor: brand.violet600,
      alignItems: "center", justifyContent: "center", marginTop: 1,
    },
    stepBulletText: { color: "#fff", fontWeight: "900", fontSize: 11 },
    stepText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  });
}
