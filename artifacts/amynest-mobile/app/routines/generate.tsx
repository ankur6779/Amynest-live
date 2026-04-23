import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import colors, { brand, brandAlpha } from "@/constants/colors";
import {
  HANDLER_TYPES,
  type HandlerKey,
  getHandlerInfo,
  simplifyForHandler,
  appendHandlerToPlans,
} from "@workspace/family-routine";

type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
  wakeUpTime?: string;
  isSchoolGoing?: boolean;
  schoolStartTime?: string;
  schoolEndTime?: string;
  schoolDays?: number[] | null;
};

type Mood = "happy" | "normal" | "lazy" | "angry";

type MoodEntry = { value: Mood; emoji: string; label: string; hint: string; bg: string; border: string; text: string };

function getMoods(roseBg: string): MoodEntry[] {
  return [
    { value: "happy",  emoji: "😊", label: "Happy",  hint: "Productive & energetic", bg: "#F0FDF4", border: "#86EFAC", text: "#166534" },
    { value: "normal", emoji: "😐", label: "Normal", hint: "Balanced day",            bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
    { value: "lazy",   emoji: "😴", label: "Lazy",   hint: "Easier tasks",            bg: "#FFFBEB", border: "#FCD34D", text: "#92400E" },
    { value: "angry",  emoji: "😡", label: "Upset",  hint: "Calming activities",      bg: roseBg,    border: "#FDA4AF", text: "#9F1239" },
  ];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function GenerateRoutineScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const MOODS = useMemo(() => getMoods(colors.statusRoseBg), [colors.statusRoseBg]);
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ childId?: string; date?: string }>();

  const initialChildId = params.childId ? Number(params.childId) : null;
  const initialDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(String(params.date)) ? String(params.date) : todayISO();

  const [selectedChild, setSelectedChild] = useState<number | null>(initialChildId);
  const [date, setDate] = useState<string>(initialDate);
  const [mood, setMood] = useState<Mood>("normal");
  const [hasSchool, setHasSchool] = useState<boolean | null>(null);
  const [specialPlans, setSpecialPlans] = useState<string>("");
  const [fridgeItems, setFridgeItems] = useState<string>("");
  const [handlerType, setHandlerType] = useState<HandlerKey>("mom");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then((r) => r.json()),
  });

  // Parent profile region — sent in generation payload so the server can pick
  // region-aware meals deterministically instead of falling back.
  const { data: parentProfile } = useQuery<{ region?: string } | null>({
    queryKey: ["parent-profile"],
    queryFn: () => authFetch("/api/parent-profile").then((r) => (r.ok ? r.json() : null)),
  });
  const parentRegion = parentProfile?.region;

  // Auto-pick the first child if none selected
  useEffect(() => {
    if (selectedChild == null && children.length > 0) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Auto-pre-fill hasSchool from the child's schoolDays and the selected date.
  // Mirrors the web behaviour and the server's isSchoolDay() resolution:
  // not school-going → false, schoolDays=null (legacy) → Mon-Fri fallback,
  // otherwise check the ISO weekday membership.
  useEffect(() => {
    if (selectedChild == null || children.length === 0) return;
    const data = children.find((c) => c.id === selectedChild);
    if (!data) return;
    if (!data.isSchoolGoing) {
      setHasSchool(false);
      return;
    }
    const day = new Date(date + "T00:00:00").getDay(); // 0=Sun..6=Sat
    const isoWeekday = day === 0 ? 7 : day; // ISO 1=Mon..7=Sun
    const days = data.schoolDays;
    const effectiveDays = Array.isArray(days) ? days : [1, 2, 3, 4, 5];
    setHasSchool(effectiveDays.includes(isoWeekday));
  }, [selectedChild, children, date]);

  const selectedChildData = useMemo(
    () => children.find((c) => c.id === selectedChild),
    [children, selectedChild]
  );

  const isFormValid = selectedChild != null;

  const onGenerate = async () => {
    if (!isFormValid || isGenerating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    try {
      // Step 1: ask the server to build a routine
      const genRes = await authFetch("/api/routines/generate", {
        method: "POST",
        body: JSON.stringify({
          childId: selectedChild,
          date,
          hasSchool: hasSchool ?? undefined,
          specialPlans: appendHandlerToPlans(specialPlans, handlerType),
          fridgeItems: fridgeItems.trim() || undefined,
          mood: mood !== "normal" ? mood : undefined,
          age: selectedChildData?.age,
          wakeTime: selectedChildData?.wakeUpTime,
          schoolStart: selectedChildData?.schoolStartTime,
          schoolEnd: selectedChildData?.schoolEndTime,
          region: parentRegion,
        }),
      });
      // Global Paywall: 402 feature_locked OR legacy 403 routine_limit_exceeded → paywall.
      if (genRes.status === 402 || genRes.status === 403) {
        const body = (await genRes.json().catch(() => null)) as { reason?: string; error?: string; feature?: string } | null;
        const isFeatureLocked = genRes.status === 402 && (body?.error === "feature_locked" || body?.feature === "routine_generate");
        const isLegacyLimit = genRes.status === 403 && body?.reason === "routine_limit_exceeded";
        if (isFeatureLocked || isLegacyLimit) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.push({ pathname: "/paywall", params: { reason: "routines_limit" } });
          return;
        }
      }
      if (!genRes.ok) throw new Error("Generate failed");
      const generated = (await genRes.json()) as { title: string; items: any[] };

      // Apply handler-based simplification (grandparent / babysitter)
      const simplifiedItems = simplifyForHandler(generated.items as any, handlerType);

      // Step 2: persist it (override = true so we replace any existing routine for same child+date)
      const saveRes = await authFetch("/api/routines", {
        method: "POST",
        body: JSON.stringify({
          childId: selectedChild,
          date,
          title: generated.title,
          items: simplifiedItems,
          override: true,
        }),
      });
      if (!saveRes.ok) throw new Error("Save failed");
      const saved = (await saveRes.json()) as { id: number };

      // Step 3: refresh dashboard + routines lists, then navigate
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["routines-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-routines"] });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/routines/${saved.id}` as never);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Couldn't generate routine",
        "Amy ran into an issue. Please try again in a moment."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 12 : 0);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={brand.purple500} />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 60, paddingHorizontal: 24 }]}>
        <Stack.Screen options={{ title: "Generate Routine" }} />
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>👶</Text>
          <Text style={styles.emptyTitle}>Add a child first</Text>
          <Text style={styles.emptySub}>
            Amy needs to know about your child before she can plan their day.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace("/children/new" as never)}
            activeOpacity={0.9}
            style={{ marginTop: 18 }}
          >
            <LinearGradient
              colors={[brand.purple500, "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Add child</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Generate Routine" }} />
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + 140, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={["rgba(123,63,242,0.22)", "rgba(255,78,205,0.18)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={20} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Plan your child's day</Text>
          <Text style={styles.heroSub}>
            Amy will build a smart, age-appropriate routine in seconds.
          </Text>
        </LinearGradient>

        {/* Child picker */}
        <Text style={styles.sectionLabel}>1. Choose a child</Text>
        <View style={styles.chipsRow}>
          {children.map((c) => {
            const active = selectedChild === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedChild(c.id);
                }}
                activeOpacity={0.85}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                <Text style={[styles.chipMeta, active && { color: "rgba(255,255,255,0.85)" }]}>
                  {c.age}y
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date picker */}
        <Text style={styles.sectionLabel}>2. Which day?</Text>
        <View style={styles.chipsRow}>
          {[
            { label: "Today", value: todayISO() },
            { label: "Tomorrow", value: tomorrowISO() },
          ].map((opt) => {
            const active = date === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { Haptics.selectionAsync(); setDate(opt.value); }}
                activeOpacity={0.85}
                style={[styles.dateChip, active && styles.dateChipActive]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={active ? "#fff" : brand.violet600}
                />
                <Text style={[styles.dateChipText, active && { color: "#fff" }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.dateHint}>{formatDate(date)}</Text>

        {/* Handler Type */}
        <Text style={styles.sectionLabel}>3. {t("family_routine.handler_title")}</Text>
        <View style={styles.handlerGrid}>
          {HANDLER_TYPES.map((h) => {
            const active = handlerType === h.key;
            return (
              <TouchableOpacity
                key={h.key}
                onPress={() => { Haptics.selectionAsync(); setHandlerType(h.key); }}
                activeOpacity={0.85}
                style={[
                  styles.handlerCard,
                  {
                    backgroundColor: active ? h.bg : "rgba(255,255,255,0.05)",
                    borderColor: active ? h.border : "rgba(255,255,255,0.12)",
                  },
                ]}
              >
                <Text style={{ fontSize: 24 }}>{h.emoji}</Text>
                <Text style={[styles.handlerLabel, { color: active ? h.fg : "rgba(255,255,255,0.92)" }]}>
                  {t(`family_routine.handler_${h.key}`, { defaultValue: h.label })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.handlerNote}>{getHandlerInfo(handlerType).note}</Text>

        {/* Mood */}
        <Text style={styles.sectionLabel}>4. How is {selectedChildData?.name ?? "your child"} feeling?</Text>
        <View style={styles.moodGrid}>
          {MOODS.map((m) => {
            const active = mood === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                onPress={() => { Haptics.selectionAsync(); setMood(m.value); }}
                activeOpacity={0.85}
                style={[
                  styles.moodCard,
                  {
                    backgroundColor: active ? m.bg : "rgba(255,255,255,0.05)",
                    borderColor: active ? m.border : "rgba(255,255,255,0.12)",
                  },
                ]}
              >
                <Text style={{ fontSize: 28 }}>{m.emoji}</Text>
                <Text style={[styles.moodLabel, { color: active ? m.text : "rgba(255,255,255,0.92)" }]}>
                  {m.label}
                </Text>
                <Text style={styles.moodHint}>{m.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* School toggle */}
        <Text style={styles.sectionLabel}>5. School day?</Text>
        <View style={styles.chipsRow}>
          {[
            { label: "🎒 Yes, school", value: true },
            { label: "🏠 No, home day", value: false },
          ].map((opt) => {
            const active = hasSchool === opt.value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                onPress={() => { Haptics.selectionAsync(); setHasSchool(opt.value); }}
                activeOpacity={0.85}
                style={[styles.toggleChip, active && styles.toggleChipActive]}
              >
                <Text style={[styles.toggleChipText, active && { color: "#fff" }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Special plans */}
        <Text style={styles.sectionLabel}>6. Anything special today? <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          value={specialPlans}
          onChangeText={setSpecialPlans}
          placeholder="e.g. doctor visit at 4pm, birthday party, swimming class…"
          placeholderTextColor={colors.textFaint}
          style={styles.textarea}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Food items */}
        <Text style={styles.sectionLabel}>7. Food items at home <Text style={styles.optional}>(optional)</Text></Text>
        <Text style={[styles.optional, { marginTop: -4, marginBottom: 8 }]}>
          List ingredients you'd like Amy to use today (comma-separated). Leave blank to use your regional cuisine.
        </Text>
        <TextInput
          value={fridgeItems}
          onChangeText={setFridgeItems}
          placeholder="e.g. paneer, tomato, eggs, spinach, leftover dal…"
          placeholderTextColor={colors.textFaint}
          style={styles.textarea}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Generate button */}
        <TouchableOpacity
          onPress={onGenerate}
          disabled={!isFormValid || isGenerating}
          activeOpacity={0.9}
          style={{ marginTop: 24, opacity: isFormValid && !isGenerating ? 1 : 0.6 }}
        >
          <LinearGradient
            colors={[brand.purple500, "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="sparkles" size={18} color="#fff" />
            )}
            <Text style={styles.primaryBtnText}>
              {isGenerating ? "Amy is planning…" : "Generate with Amy"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerHint}>
          Amy will replace any existing routine for {selectedChildData?.name ?? "this child"} on{" "}
          {formatDate(date)}.
        </Text>
      </ScrollView>

      {isGenerating && (
        <GenerateProgressOverlay childName={selectedChildData?.name ?? "your child"} />
      )}
    </View>
  );
}

// ─── Generate progress overlay ───────────────────────────────────────────────
const GENERATE_STEPS = [
  { icon: "person-outline" as const, label: "Reading {name}'s profile…" },
  { icon: "color-palette-outline" as const, label: "Picking the right activities…" },
  { icon: "time-outline" as const, label: "Optimising the schedule…" },
  { icon: "sparkles-outline" as const, label: "Adding Amy's finishing touches…" },
];

function GenerateProgressOverlay({ childName }: { childName: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % GENERATE_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    barAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(barAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [barAnim]);

  const widthInterp = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["20%", "90%"] });
  const step = GENERATE_STEPS[stepIndex];
  const label = step.label.replace("{name}", childName);

  return (
    <View style={styles.progressOverlay} pointerEvents="auto">
      <View style={styles.progressCard}>
        <LinearGradient
          colors={[brand.purple500, "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.progressIconWrap}
        >
          <Ionicons name={step.icon} size={28} color="#fff" />
        </LinearGradient>
        <Text style={styles.progressTitle}>Amy is planning</Text>
        <Text style={styles.progressStep}>{label}</Text>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: widthInterp }]} />
        </View>
        <Text style={styles.progressHint}>This usually takes a few seconds.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    alignItems: "flex-start",
    gap: 6,
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.purple500,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 18, fontWeight: "800", color: brand.purple900 },
  heroSub: { fontSize: 13, color: brand.violet600 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 10,
    marginTop: 8,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#14142B",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  chipActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  chipText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  chipTextActive: { color: "#fff" },
  chipMeta: { fontSize: 11, color: "rgba(255,255,255,0.45)" },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: brand.violet200,
    backgroundColor: brand.violet50,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateChipActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  dateChipText: { fontSize: 14, fontWeight: "700", color: brand.violet700 },
  dateHint: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: -8, marginBottom: 16, marginLeft: 2 },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  moodCard: {
    width: "47%",
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    alignItems: "flex-start",
    gap: 4,
  },
  moodLabel: { fontSize: 14, fontWeight: "800" },
  moodHint: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  toggleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#14142B",
    alignItems: "center",
  },
  toggleChipActive: { backgroundColor: colors.light.primary, borderColor: colors.light.primary },
  toggleChipText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  handlerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  handlerCard: {
    flexBasis: "23%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 2,
    gap: 4,
  },
  handlerLabel: { fontSize: 12, fontWeight: "800" },
  handlerNote: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginTop: -2,
    marginBottom: 18,
    fontStyle: "italic",
  },
  optional: { fontWeight: "500", color: "rgba(255,255,255,0.45)", fontSize: 12 },
  textarea: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#14142B",
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 88,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  footerHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    marginTop: 12,
  },
  emptyWrap: { alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,15,25,0.78)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  progressCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#1A1530",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  progressIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
  },
  progressStep: {
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    marginBottom: 20,
    minHeight: 36,
  },
  progressBarTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginBottom: 14,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: brand.purple500,
  },
  progressHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
  },
});
