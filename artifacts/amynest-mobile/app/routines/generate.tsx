import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Animated,
  Easing,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, palette } from "@/constants/colors";
import {
  HANDLER_TYPES,
  type HandlerKey,
  getHandlerInfo,
  simplifyForHandler,
  appendHandlerToPlans,
  defaultAvailability,
  isParentAvailComplete,
  parentStatusLabel,
  buildParentAvailPayload,
  AVAIL_KEY,
  WAKE_KEY,
  REGION_OPTIONS,
  type ParentAvailData,
  type ParentAvailEntry,
  type WorkType,
  type RegionValue,
  extractTiffinSummary,
  buildCombinedTimeline,
  type FRTimelineFamilyResult,
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
  foodType?: string;
};

type Mood = "happy" | "normal" | "lazy" | "angry";
type MoodEntry = { value: Mood; emoji: string; label: string; hint: string; bg: string; border: string; text: string };

function getMoods(roseBg: string): MoodEntry[] {
  return [
    { value: "happy",  emoji: "😊", label: "Happy",  hint: "Productive & energetic", bg: palette.emerald50, border: palette.green300, text: palette.green800 },
    { value: "normal", emoji: "😐", label: "Normal", hint: "Balanced day",            bg: palette.blue50, border: palette.blue200, text: palette.blue800 },
    { value: "lazy",   emoji: "😴", label: "Lazy",   hint: "Easier tasks",            bg: palette.amber50, border: palette.amber300, text: palette.amber800 },
    { value: "angry",  emoji: "😡", label: "Upset",  hint: "Calming activities",      bg: roseBg,    border: palette.rose300, text: palette.rose800 },
  ];
}

const todayISO = (): string => new Date().toISOString().slice(0, 10);
const tomorrowISO = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};
function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Per-child colors used by the combined timeline preview (mirrors web).
const CHILD_COLORS = [palette.blue500, brand.purple500, palette.emerald500, palette.rose500, palette.amber500];

type FamilyChildSettings = Record<number, { selected: boolean; hasSchool: boolean | null }>;

export default function GenerateRoutineScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { theme } = useTheme();
  const MOODS = useMemo(() => getMoods(colors.statusRoseBg), [colors.statusRoseBg]);
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ childId?: string; date?: string }>();

  const initialChildId = params.childId ? Number(params.childId) : null;
  const initialDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(String(params.date)) ? String(params.date) : todayISO();

  // ── Mode toggle ─────────────────────────────────────────────────────────
  const [mode, setMode] = useState<"single" | "family">("single");

  // ── Single mode state ───────────────────────────────────────────────────
  const [selectedChild, setSelectedChild] = useState<number | null>(initialChildId);
  const [date, setDate] = useState<string>(initialDate);
  const [mood, setMood] = useState<Mood>("normal");
  const [hasSchool, setHasSchool] = useState<boolean | null>(null);
  const [specialPlans, setSpecialPlans] = useState<string>("");
  const [fridgeItems, setFridgeItems] = useState<string>("");
  const [handlerType, setHandlerType] = useState<HandlerKey>("mom");
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Region picker (overrides parent profile when set) ───────────────────
  const [region, setRegion] = useState<RegionValue | null>(null);

  // ── Parent availability ─────────────────────────────────────────────────
  const [parentAvail, setParentAvail] = useState<ParentAvailData>(() => defaultAvailability());

  // ── Family mode state ───────────────────────────────────────────────────
  const [familyChildSettings, setFamilyChildSettings] = useState<FamilyChildSettings>({});
  const [familyProgress, setFamilyProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [familyResults, setFamilyResults] = useState<FRTimelineFamilyResult[] | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then((r) => r.json()),
  });

  // Parent profile region — used as fallback when the local region picker
  // hasn't been touched. Mirrors web behaviour.
  const { data: parentProfile } = useQuery<{ region?: string } | null>({
    queryKey: ["parent-profile"],
    queryFn: () => authFetch("/api/parent-profile").then((r) => (r.ok ? r.json() : null)),
  });
  const effectiveRegion = (region ?? (parentProfile?.region as RegionValue | undefined)) || undefined;

  // ── Hydrate parent availability from AsyncStorage when date changes ────
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(AVAIL_KEY(date))
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as ParentAvailData;
            if (parsed?.p1) setParentAvail(parsed);
          } catch {
            /* ignore stale */
          }
        }
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [date]);

  // Persist on every change so multiple kids generated same-day reuse the answers.
  useEffect(() => {
    AsyncStorage.setItem(AVAIL_KEY(date), JSON.stringify(parentAvail)).catch(() => { /* ignore */ });
  }, [date, parentAvail]);

  // Auto-pick the first child if none selected
  useEffect(() => {
    if (selectedChild == null && children.length > 0) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  // Auto-pre-fill hasSchool from the child's schoolDays and the selected date.
  useEffect(() => {
    if (selectedChild == null || children.length === 0) return;
    const data = children.find((c) => c.id === selectedChild);
    if (!data) return;
    if (!data.isSchoolGoing) {
      setHasSchool(false);
      return;
    }
    const day = new Date(date + "T00:00:00").getDay();
    const isoWeekday = day === 0 ? 7 : day;
    const days = data.schoolDays;
    const effectiveDays = Array.isArray(days) ? days : [1, 2, 3, 4, 5];
    setHasSchool(effectiveDays.includes(isoWeekday));
  }, [selectedChild, children, date]);

  // Initialise familyChildSettings whenever children load or date changes.
  useEffect(() => {
    if (children.length === 0) return;
    setFamilyChildSettings((prev) => {
      const next: FamilyChildSettings = {};
      const day = new Date(date + "T00:00:00").getDay();
      const isoWeekday = day === 0 ? 7 : day;
      children.forEach((c) => {
        const existing = prev[c.id];
        let defaultSchool: boolean | null = null;
        if (!c.isSchoolGoing) defaultSchool = false;
        else {
          const days = Array.isArray(c.schoolDays) ? c.schoolDays : [1, 2, 3, 4, 5];
          defaultSchool = days.includes(isoWeekday);
        }
        next[c.id] = {
          selected: existing?.selected ?? true,
          hasSchool: existing?.hasSchool ?? defaultSchool,
        };
      });
      return next;
    });
  }, [children, date]);

  const selectedChildData = useMemo(
    () => children.find((c) => c.id === selectedChild),
    [children, selectedChild],
  );

  const isFormValid = selectedChild != null;

  // ── Parent avail mutators ───────────────────────────────────────────────
  const updateP1 = useCallback((patch: Partial<ParentAvailEntry>) => {
    setParentAvail((prev) => ({ ...prev, p1: { ...prev.p1, ...patch } }));
  }, []);
  const updateP2 = useCallback((patch: Partial<ParentAvailEntry>) => {
    setParentAvail((prev) => ({
      ...prev,
      p2: { ...(prev.p2 ?? { role: "Father", workType: null, isWorking: null, workHours: "" }), ...patch },
    }));
  }, []);
  const toggleSecondParent = useCallback(() => {
    setParentAvail((prev) => {
      if (prev.hasSecondParent) return { ...prev, hasSecondParent: false };
      return {
        ...prev,
        hasSecondParent: true,
        p2: prev.p2 ?? { role: "Father", workType: null, isWorking: null, workHours: "" },
      };
    });
  }, []);

  // ── Single-mode generate ────────────────────────────────────────────────
  const onGenerate = async () => {
    if (!isFormValid || isGenerating) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    // Read the child's previously confirmed wake time for `today` so the
    // server can shift the day if the child slept in. Same key shape as web.
    let wakeOverride: string | undefined;
    try {
      if (selectedChild != null) {
        const stored = await AsyncStorage.getItem(WAKE_KEY(selectedChild, date));
        if (stored && /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(stored)) wakeOverride = stored;
      }
    } catch { /* ignore */ }

    try {
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
          wakeTime: wakeOverride ?? selectedChildData?.wakeUpTime,
          schoolStart: selectedChildData?.schoolStartTime,
          schoolEnd: selectedChildData?.schoolEndTime,
          region: effectiveRegion,
          ...buildParentAvailPayload(parentAvail),
        }),
      });
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

      const simplifiedItems = simplifyForHandler(generated.items as any, handlerType);

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

      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["routines-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-routines"] });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/routines/${saved.id}` as never);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("toasts.routines_generate.save_failed_title", { defaultValue: "Couldn't generate routine" }),
        t("toasts.routines_generate.save_failed_body", { defaultValue: "Amy ran into an issue. Please try again in a moment." }),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Family-mode generate (sequential) ──────────────────────────────────
  const handleFamilyGenerate = async () => {
    if (children.length === 0) return;
    const selectedChildren = children.filter(
      (c) => familyChildSettings[c.id]?.selected && familyChildSettings[c.id]?.hasSchool !== null,
    );
    if (selectedChildren.length === 0) {
      Alert.alert(
        t("toasts.routines_generate.select_child_school", {
          defaultValue: "Please select at least one child and set their school status.",
        }),
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFamilyResults(null);
    const results: FRTimelineFamilyResult[] = [];

    for (let i = 0; i < selectedChildren.length; i++) {
      const child = selectedChildren[i];
      setFamilyProgress({ current: i + 1, total: selectedChildren.length, currentName: child.name });

      try {
        const res = await authFetch("/api/routines/generate", {
          method: "POST",
          body: JSON.stringify({
            childId: child.id,
            date,
            hasSchool: familyChildSettings[child.id]?.hasSchool ?? undefined,
            specialPlans: appendHandlerToPlans(specialPlans, handlerType),
            fridgeItems: fridgeItems.trim() || undefined,
            age: child.age,
            wakeTime: child.wakeUpTime,
            schoolStart: child.schoolStartTime,
            schoolEnd: child.schoolEndTime,
            region: effectiveRegion,
            ...buildParentAvailPayload(parentAvail),
          }),
        });

        if (res.status === 402 || res.status === 403) {
          const body = (await res.json().catch(() => null)) as { reason?: string; error?: string; feature?: string } | null;
          const isFeatureLocked = res.status === 402 && (body?.error === "feature_locked" || body?.feature === "routine_generate");
          const isLegacyLimit = res.status === 403 && body?.reason === "routine_limit_exceeded";
          if (isFeatureLocked || isLegacyLimit) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.push({ pathname: "/paywall", params: { reason: "routines_limit" } });
            break;
          }
        }
        if (!res.ok) throw new Error("Generate failed");
        const generated = (await res.json()) as { title: string; items: any[] };
        const simplifiedItems = simplifyForHandler(generated.items as any, handlerType);
        results.push({
          child: { id: child.id, name: child.name, foodType: child.foodType },
          routine: { title: generated.title, items: simplifiedItems as any },
        });
      } catch {
        Alert.alert(
          t("toasts.routines_generate.family_generate_failed", {
            name: child.name,
            defaultValue: `Failed to generate routine for ${child.name}`,
          }),
        );
      }
    }

    setFamilyProgress(null);
    setFamilyResults(results);
    if (results.length > 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleSaveAll = async () => {
    if (!familyResults || familyResults.length === 0) return;
    setIsSavingAll(true);
    let saved = 0;
    for (const { child, routine } of familyResults) {
      try {
        const res = await authFetch("/api/routines", {
          method: "POST",
          body: JSON.stringify({
            childId: child.id,
            date,
            title: routine.title,
            items: routine.items,
            override: true,
          }),
        });
        if (res.ok) saved++;
        else throw new Error("Save failed");
      } catch {
        Alert.alert(
          t("toasts.routines_generate.family_save_failed", {
            name: child.name,
            defaultValue: `Failed to save routine for ${child.name}`,
          }),
        );
      }
    }
    setIsSavingAll(false);
    if (saved > 0) {
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["routines-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        t("toasts.routines_generate.family_saved", {
          count: saved,
          defaultValue: `✨ Saved ${saved} routine${saved === 1 ? "" : "s"}!`,
        }),
      );
      router.replace("/routines" as never);
    }
  };

  const isGeneratingFamily = !!familyProgress;
  const familySelectedCount = Object.values(familyChildSettings).filter((s) => s.selected).length;

  const topPad = insets.top + (Platform.OS === "web" ? 12 : 0);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <ActivityIndicator size="large" color={brand.purple500} />
      </View>
    );
  }

  if (children.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 60, paddingHorizontal: 24 }]}>
        <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <Stack.Screen options={{ title: "Generate Routine" }} />
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>👶</Text>
          <Text style={styles.emptyTitle}>Add a child first</Text>
          <Text style={styles.emptySub}>Amy needs to know about your child before she can plan their day.</Text>
          <TouchableOpacity
            onPress={() => router.replace("/children/new" as never)}
            activeOpacity={0.9}
            style={{ marginTop: 18 }}
          >
            <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Add child</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <Stack.Screen options={{ title: "Generate Routine" }} />
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: insets.bottom + 140, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient colors={["rgba(123,63,242,0.22)", "rgba(255,78,205,0.18)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="sparkles" size={20} color="#fff" /></View>
          <Text style={styles.heroTitle}>Plan your child's day</Text>
          <Text style={styles.heroSub}>Amy will build a smart, age-appropriate routine in seconds.</Text>
        </LinearGradient>

        {/* Mode toggle: Single vs Family (only when more than 1 child) */}
        {children.length > 1 && (
          <View style={styles.modeRow}>
            {(["single", "family"] as const).map((m) => {
              const active = mode === m;
              const label = m === "single"
                ? t("routines_generate.mode_single", { defaultValue: "Single child" })
                : t("routines_generate.mode_family", { defaultValue: "Whole family" });
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => { Haptics.selectionAsync(); setMode(m); setFamilyResults(null); }}
                  activeOpacity={0.85}
                  style={[styles.modeChip, active && styles.modeChipActive]}
                >
                  <Ionicons
                    name={m === "single" ? "person-outline" : "people-outline"}
                    size={14}
                    color={active ? "#fff" : "rgba(255,255,255,0.7)"}
                  />
                  <Text style={[styles.modeChipText, active && { color: "#fff" }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Date picker */}
        <Text style={styles.sectionLabel}>{t("routines_generate.date_label", { defaultValue: "Which day?" })}</Text>
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
                <Ionicons name="calendar-outline" size={14} color={active ? "#fff" : "rgba(255,255,255,0.65)"} />
                <Text style={[styles.dateChipText, active && { color: "#fff" }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.dateHint}>{formatDate(date)}</Text>

        {/* Region picker */}
        <Text style={styles.sectionLabel}>{t("routines_generate.region_label", { defaultValue: "Cuisine region (optional)" })}</Text>
        <Text style={[styles.optional, { marginTop: -4, marginBottom: 8 }]}>
          {t("routines_generate.region_hint", { defaultValue: "Amy uses this to suggest meals. Falls back to your profile region." })}
        </Text>
        <View style={styles.chipsRow}>
          {REGION_OPTIONS.map((opt) => {
            const active = (region ?? parentProfile?.region) === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => { Haptics.selectionAsync(); setRegion(opt.value); }}
                activeOpacity={0.85}
                style={[styles.regionChip, active && styles.regionChipActive]}
              >
                <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
                <Text style={[styles.regionChipText, active && { color: "#fff" }]}>
                  {t(`routines_generate.region_${opt.value}`, { defaultValue: opt.label })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Parent availability */}
        <Text style={styles.sectionLabel}>{t("parent_avail.title", { defaultValue: "Who's around today?" })}</Text>
        <Text style={[styles.optional, { marginTop: -4, marginBottom: 8 }]}>
          {t("parent_avail.hint", { defaultValue: "Helps Amy assign tasks to the parent who's free." })}
        </Text>
        <ParentAvailEntryCard
          entry={parentAvail.p1}
          onChange={updateP1}
          label={t("parent_avail.p1_label", { defaultValue: "Parent 1" })}
        />
        <TouchableOpacity onPress={() => { Haptics.selectionAsync(); toggleSecondParent(); }} style={styles.secondParentToggle} activeOpacity={0.85}>
          <Ionicons
            name={parentAvail.hasSecondParent ? "remove-circle-outline" : "add-circle-outline"}
            size={18}
            color={brand.purple500}
          />
          <Text style={styles.secondParentText}>
            {parentAvail.hasSecondParent
              ? t("parent_avail.remove_p2", { defaultValue: "Remove second parent" })
              : t("parent_avail.add_p2", { defaultValue: "Add second parent" })}
          </Text>
        </TouchableOpacity>
        {parentAvail.hasSecondParent && parentAvail.p2 && (
          <ParentAvailEntryCard
            entry={parentAvail.p2}
            onChange={updateP2}
            label={t("parent_avail.p2_label", { defaultValue: "Parent 2" })}
          />
        )}

        {mode === "single" ? (
          <SingleModeBody
            t={t}
            colors={colors}
            children={children}
            selectedChild={selectedChild}
            setSelectedChild={setSelectedChild}
            selectedChildData={selectedChildData}
            handlerType={handlerType}
            setHandlerType={setHandlerType}
            mood={mood}
            setMood={setMood}
            MOODS={MOODS}
            hasSchool={hasSchool}
            setHasSchool={setHasSchool}
            specialPlans={specialPlans}
            setSpecialPlans={setSpecialPlans}
            fridgeItems={fridgeItems}
            setFridgeItems={setFridgeItems}
          />
        ) : (
          <FamilyModeBody
            t={t}
            colors={colors}
            children={children}
            familyChildSettings={familyChildSettings}
            setFamilyChildSettings={setFamilyChildSettings}
            handlerType={handlerType}
            setHandlerType={setHandlerType}
            specialPlans={specialPlans}
            setSpecialPlans={setSpecialPlans}
            fridgeItems={fridgeItems}
            setFridgeItems={setFridgeItems}
          />
        )}

        {/* Generate button */}
        {mode === "single" ? (
          <TouchableOpacity
            onPress={onGenerate}
            disabled={!isFormValid || isGenerating}
            activeOpacity={0.9}
            style={{ marginTop: 24, opacity: isFormValid && !isGenerating ? 1 : 0.6 }}
          >
            <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              {isGenerating
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="sparkles" size={18} color="#fff" />}
              <Text style={styles.primaryBtnText}>
                {isGenerating
                  ? t("routines_generate.generating", { defaultValue: "Amy is planning…" })
                  : t("routines_generate.generate_btn", { defaultValue: "Generate with Amy" })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleFamilyGenerate}
            disabled={isGeneratingFamily || familySelectedCount === 0}
            activeOpacity={0.9}
            style={{ marginTop: 24, opacity: !isGeneratingFamily && familySelectedCount > 0 ? 1 : 0.6 }}
          >
            <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              {isGeneratingFamily
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="people" size={18} color="#fff" />}
              <Text style={styles.primaryBtnText}>
                {isGeneratingFamily
                  ? t("routines_generate.family_generating", { defaultValue: "Amy is planning…" })
                  : t("routines_generate.family_generate_btn", {
                      count: familySelectedCount,
                      defaultValue: `Generate for ${familySelectedCount} kid${familySelectedCount === 1 ? "" : "s"}`,
                    })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Family results preview */}
        {mode === "family" && familyResults && familyResults.length > 0 && (
          <FamilyResultsPreview
            t={t}
            results={familyResults}
            onSaveAll={handleSaveAll}
            onCancel={() => setFamilyResults(null)}
            isSaving={isSavingAll}
          />
        )}

        <Text style={styles.footerHint}>
          {mode === "single"
            ? `Amy will replace any existing routine for ${selectedChildData?.name ?? "this child"} on ${formatDate(date)}.`
            : t("routines_generate.family_footer", { defaultValue: "Amy will plan one routine per selected child." })}
        </Text>
      </ScrollView>

      {(isGenerating || isGeneratingFamily) && (
        <GenerateProgressOverlay
          childName={isGeneratingFamily ? (familyProgress?.currentName ?? "") : (selectedChildData?.name ?? "your child")}
          familyProgress={familyProgress}
        />
      )}
    </View>
  );
}

// ─── Single mode body ────────────────────────────────────────────────────
function SingleModeBody(props: {
  t: ReturnType<typeof useTranslation>["t"];
  colors: ReturnType<typeof useColors>;
  children: Child[];
  selectedChild: number | null;
  setSelectedChild: (id: number) => void;
  selectedChildData?: Child;
  handlerType: HandlerKey;
  setHandlerType: (h: HandlerKey) => void;
  mood: Mood;
  setMood: (m: Mood) => void;
  MOODS: MoodEntry[];
  hasSchool: boolean | null;
  setHasSchool: (b: boolean) => void;
  specialPlans: string;
  setSpecialPlans: (s: string) => void;
  fridgeItems: string;
  setFridgeItems: (s: string) => void;
}) {
  const {
    t, colors, children, selectedChild, setSelectedChild, selectedChildData,
    handlerType, setHandlerType, mood, setMood, MOODS, hasSchool, setHasSchool,
    specialPlans, setSpecialPlans, fridgeItems, setFridgeItems,
  } = props;
  return (
    <>
      {/* Child picker */}
      <Text style={styles.sectionLabel}>{t("routines_generate.choose_child", { defaultValue: "Choose a child" })}</Text>
      <View style={styles.chipsRow}>
        {children.map((c) => {
          const active = selectedChild === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              onPress={() => { Haptics.selectionAsync(); setSelectedChild(c.id); }}
              activeOpacity={0.85}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
              <Text style={[styles.chipMeta, active && { color: "rgba(255,255,255,0.85)" }]}>{c.age}y</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Handler */}
      <Text style={styles.sectionLabel}>{t("family_routine.handler_title")}</Text>
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
      <Text style={styles.sectionLabel}>How is {selectedChildData?.name ?? "your child"} feeling?</Text>
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
              <Text style={[styles.moodLabel, { color: active ? m.text : "rgba(255,255,255,0.92)" }]}>{m.label}</Text>
              <Text style={styles.moodHint}>{m.hint}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* School toggle */}
      <Text style={styles.sectionLabel}>School day?</Text>
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
              <Text style={[styles.toggleChipText, active && { color: "#fff" }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Anything special today? <Text style={styles.optional}>(optional)</Text></Text>
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

      <Text style={styles.sectionLabel}>Food items at home <Text style={styles.optional}>(optional)</Text></Text>
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
    </>
  );
}

// ─── Family mode body ────────────────────────────────────────────────────
function FamilyModeBody(props: {
  t: ReturnType<typeof useTranslation>["t"];
  colors: ReturnType<typeof useColors>;
  children: Child[];
  familyChildSettings: FamilyChildSettings;
  setFamilyChildSettings: React.Dispatch<React.SetStateAction<FamilyChildSettings>>;
  handlerType: HandlerKey;
  setHandlerType: (h: HandlerKey) => void;
  specialPlans: string;
  setSpecialPlans: (s: string) => void;
  fridgeItems: string;
  setFridgeItems: (s: string) => void;
}) {
  const {
    t, colors, children, familyChildSettings, setFamilyChildSettings,
    handlerType, setHandlerType, specialPlans, setSpecialPlans, fridgeItems, setFridgeItems,
  } = props;
  return (
    <>
      <Text style={styles.sectionLabel}>{t("routines_generate.family_select_kids", { defaultValue: "Pick the kids to plan for" })}</Text>
      <View style={{ gap: 10, marginBottom: 16 }}>
        {children.map((c) => {
          const s = familyChildSettings[c.id] ?? { selected: true, hasSchool: null };
          return (
            <View key={c.id} style={styles.familyChildCard}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setFamilyChildSettings((prev) => ({
                    ...prev,
                    [c.id]: { ...prev[c.id], selected: !prev[c.id]?.selected },
                  }));
                }}
                activeOpacity={0.85}
                style={styles.familyChildHeader}
              >
                <View style={[styles.checkbox, s.selected && styles.checkboxActive]}>
                  {s.selected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.familyChildName}>{c.name}</Text>
                  <Text style={styles.familyChildMeta}>{c.age} y{c.isSchoolGoing ? " · 🎒" : ""}</Text>
                </View>
              </TouchableOpacity>
              {s.selected && (
                <View style={styles.familySchoolRow}>
                  {[
                    { label: "🎒 School", value: true },
                    { label: "🏠 Home", value: false },
                  ].map((opt) => {
                    const active = s.hasSchool === opt.value;
                    return (
                      <TouchableOpacity
                        key={String(opt.value)}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setFamilyChildSettings((prev) => ({
                            ...prev,
                            [c.id]: { ...prev[c.id], hasSchool: opt.value },
                          }));
                        }}
                        activeOpacity={0.85}
                        style={[styles.familySchoolChip, active && styles.familySchoolChipActive]}
                      >
                        <Text style={[styles.familySchoolChipText, active && { color: "#fff" }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Handler */}
      <Text style={styles.sectionLabel}>{t("family_routine.handler_title")}</Text>
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

      <Text style={styles.sectionLabel}>{t("routines_generate.family_special_plans", { defaultValue: "Anything special today?" })} <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        value={specialPlans}
        onChangeText={setSpecialPlans}
        placeholder="e.g. family outing, doctor visit, party…"
        placeholderTextColor={colors.textFaint}
        style={styles.textarea}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
      <Text style={styles.sectionLabel}>{t("routines_generate.family_fridge", { defaultValue: "Food items at home" })} <Text style={styles.optional}>(optional)</Text></Text>
      <TextInput
        value={fridgeItems}
        onChangeText={setFridgeItems}
        placeholder="e.g. paneer, tomato, eggs…"
        placeholderTextColor={colors.textFaint}
        style={styles.textarea}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </>
  );
}

// ─── Parent availability entry card ──────────────────────────────────────
function ParentAvailEntryCard({
  entry,
  onChange,
  label,
}: {
  entry: ParentAvailEntry;
  onChange: (patch: Partial<ParentAvailEntry>) => void;
  label: string;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const complete = isParentAvailComplete(entry);
  const WORK_TYPES: { key: WorkType; emoji: string; tKey: string; fallback: string }[] = [
    { key: "work_from_home", emoji: "🏠", tKey: "parent_avail.work_from_home", fallback: "WFH" },
    { key: "work_from_office", emoji: "🏢", tKey: "parent_avail.work_from_office", fallback: "Office" },
    { key: "homemaker", emoji: "🏡", tKey: "parent_avail.homemaker", fallback: "Homemaker" },
  ];
  return (
    <View style={[styles.parentCard, complete && styles.parentCardComplete]}>
      <View style={styles.parentCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.parentCardLabel}>{label}</Text>
          <Text style={styles.parentCardStatus}>{parentStatusLabel(entry)}</Text>
        </View>
        {complete && <Ionicons name="checkmark-circle" size={20} color={palette.emerald500} />}
      </View>

      <Text style={styles.parentSubLabel}>{t("parent_avail.role_label", { defaultValue: "Role" })}</Text>
      <TextInput
        value={entry.role}
        onChangeText={(v) => onChange({ role: v })}
        placeholder="Mother, Father, Caregiver…"
        placeholderTextColor={colors.textFaint}
        style={styles.smallInput}
      />

      <Text style={styles.parentSubLabel}>{t("parent_avail.work_type_label", { defaultValue: "Work type" })}</Text>
      <View style={styles.workTypeRow}>
        {WORK_TYPES.map((w) => {
          const active = entry.workType === w.key;
          return (
            <TouchableOpacity
              key={w.key}
              onPress={() => { Haptics.selectionAsync(); onChange({ workType: w.key }); }}
              activeOpacity={0.85}
              style={[styles.workTypeChip, active && styles.workTypeChipActive]}
            >
              <Text style={{ fontSize: 14 }}>{w.emoji}</Text>
              <Text style={[styles.workTypeChipText, active && { color: "#fff" }]}>
                {t(w.tKey, { defaultValue: w.fallback })}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {entry.workType && entry.workType !== "homemaker" && (
        <>
          <Text style={styles.parentSubLabel}>{t("parent_avail.is_working_today", { defaultValue: "Working today?" })}</Text>
          <View style={styles.workTypeRow}>
            {[
              { label: t("parent_avail.yes_working", { defaultValue: "Yes, working" }), value: true },
              { label: t("parent_avail.holiday", { defaultValue: "Holiday / off" }), value: false },
            ].map((opt) => {
              const active = entry.isWorking === opt.value;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  onPress={() => { Haptics.selectionAsync(); onChange({ isWorking: opt.value }); }}
                  activeOpacity={0.85}
                  style={[styles.workTypeChip, active && styles.workTypeChipActive]}
                >
                  <Text style={[styles.workTypeChipText, active && { color: "#fff" }]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {entry.isWorking === true && (
            <>
              <Text style={styles.parentSubLabel}>{t("parent_avail.work_hours_label", { defaultValue: "Work hours (optional)" })}</Text>
              <TextInput
                value={entry.workHours}
                onChangeText={(v) => onChange({ workHours: v })}
                placeholder="e.g. 9 AM – 5 PM"
                placeholderTextColor={colors.textFaint}
                style={styles.smallInput}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

// ─── Family results preview ──────────────────────────────────────────────
function FamilyResultsPreview({
  t,
  results,
  onSaveAll,
  onCancel,
  isSaving,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  results: FRTimelineFamilyResult[];
  onSaveAll: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const tiffin = useMemo(() => extractTiffinSummary(results), [results]);
  const timeline = useMemo(() => buildCombinedTimeline(results), [results]);

  return (
    <View style={{ marginTop: 24, gap: 16 }}>
      <Text style={styles.previewHeading}>
        {t("routines_generate.family_preview_title", {
          count: results.length,
          defaultValue: `Preview · ${results.length} routine${results.length === 1 ? "" : "s"}`,
        })}
      </Text>

      {/* Tiffin Summary */}
      {tiffin.length > 0 && (
        <View style={styles.tiffinCard}>
          <View style={styles.tiffinHeader}>
            <Text style={{ fontSize: 22 }}>🍱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tiffinTitle}>{t("tiffin_summary.title", { defaultValue: "Tiffin Box Suggestions" })}</Text>
              <Text style={styles.tiffinSub}>{t("tiffin_summary.subtitle", { defaultValue: "For school-going kids — choose one per child" })}</Text>
            </View>
          </View>
          <View style={{ gap: 10 }}>
            {tiffin.map(({ child, time, options }) => (
              <View key={child.id} style={styles.tiffinChildCard}>
                <View style={styles.tiffinChildHeader}>
                  <View style={styles.tiffinNameBadge}>
                    <Ionicons name="person" size={11} color={palette.amber800} />
                    <Text style={styles.tiffinNameText}>{child.name}</Text>
                  </View>
                  <Text style={styles.tiffinTime}>
                    {t("tiffin_summary.pack_by", { time, defaultValue: `Pack by ${time}` })}
                  </Text>
                  <Text style={styles.tiffinFood}>
                    {child.foodType === "non_veg" ? "🍗" : "🥦"}
                  </Text>
                </View>
                <View style={styles.tiffinOptionsRow}>
                  {options.map((opt, i) => (
                    <View key={i} style={styles.tiffinOption}>
                      <Text style={{ fontSize: 11, color: palette.amber600 }}>🥘</Text>
                      <Text style={styles.tiffinOptionText}>{opt}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Combined Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>{t("combined_timeline.title", { defaultValue: "Combined Family Timeline" })}</Text>
        <Text style={styles.timelineSub}>
          {t("combined_timeline.subtitle", { defaultValue: "All your kids' day in one view, sorted by time." })}
        </Text>
        <View style={{ gap: 6, marginTop: 10 }}>
          {timeline.map((row, idx) => (
            <View key={idx} style={styles.timelineRow}>
              <Text style={styles.timelineRowTime}>{row.time}</Text>
              <View style={[styles.timelineDot, { backgroundColor: CHILD_COLORS[row.colorIdx % CHILD_COLORS.length] }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={styles.timelineActivity} numberOfLines={1}>{row.activity}</Text>
                  <View style={[styles.timelineBadge, { borderColor: CHILD_COLORS[row.colorIdx % CHILD_COLORS.length] }]}>
                    <Text style={[styles.timelineBadgeText, { color: CHILD_COLORS[row.colorIdx % CHILD_COLORS.length] }]}>
                      {row.childName}
                    </Text>
                  </View>
                </View>
                <Text style={styles.timelineMeta}>{row.duration}m · {row.category}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity onPress={onCancel} disabled={isSaving} activeOpacity={0.85} style={[styles.secondaryBtn, { flex: 1 }]}>
          <Text style={styles.secondaryBtnText}>{t("common.discard", { defaultValue: "Discard" })}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSaveAll} disabled={isSaving} activeOpacity={0.9} style={{ flex: 2 }}>
          <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
            {isSaving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="save-outline" size={16} color="#fff" />}
            <Text style={styles.primaryBtnText}>
              {isSaving
                ? t("routines_generate.family_saving", { defaultValue: "Saving…" })
                : t("routines_generate.family_save_all", { defaultValue: "Save all routines" })}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Generate progress overlay (single + family) ────────────────────────
const GENERATE_STEPS = [
  { icon: "person-outline" as const, label: "Reading {name}'s profile…" },
  { icon: "color-palette-outline" as const, label: "Picking the right activities…" },
  { icon: "time-outline" as const, label: "Optimising the schedule…" },
  { icon: "sparkles-outline" as const, label: "Adding Amy's finishing touches…" },
];

function GenerateProgressOverlay({
  childName,
  familyProgress,
}: {
  childName: string;
  familyProgress: { current: number; total: number; currentName: string } | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;
  const isFamily = !!familyProgress;

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % GENERATE_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isFamily) return; // family bar tracks current/total
    barAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(barAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(barAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [barAnim, isFamily]);

  const step = GENERATE_STEPS[stepIndex];
  const label = step.label.replace("{name}", childName || "your child");
  const familyPct = `${Math.round(((familyProgress?.current ?? 0) / Math.max(1, familyProgress?.total ?? 1)) * 100)}%` as `${number}%`;
  const singleWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ["20%", "90%"] });

  return (
    <View style={styles.progressOverlay} pointerEvents="auto">
      <View style={styles.progressCard}>
        <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.progressIconWrap}>
          <Ionicons name={step.icon} size={28} color="#fff" />
        </LinearGradient>
        <Text style={styles.progressTitle}>
          {isFamily ? `Building ${familyProgress?.currentName}'s routine` : "Amy is planning"}
        </Text>
        <Text style={styles.progressStep}>
          {isFamily ? `${familyProgress?.current} of ${familyProgress?.total} children` : label}
        </Text>
        <View style={styles.progressBarTrack}>
          {isFamily
            ? <View style={[styles.progressBarFill, { width: familyPct }]} />
            : <Animated.View style={[styles.progressBarFill, { width: singleWidth }]} />}
        </View>
        <Text style={styles.progressHint}>This usually takes a few seconds.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { borderRadius: 20, padding: 18, marginBottom: 16, alignItems: "flex-start", gap: 6 },
  heroIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: brand.purple500, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "rgba(255,255,255,0.95)" },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },

  modeRow: { flexDirection: "row", gap: 8, marginBottom: 16, padding: 4, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14 },
  modeChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10 },
  modeChipActive: { backgroundColor: brand.purple500 },
  modeChipText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.7)" },

  sectionLabel: { fontSize: 13, fontWeight: "800", color: "rgba(255,255,255,0.85)", marginBottom: 10, marginTop: 8 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#13102e", flexDirection: "row", alignItems: "baseline", gap: 6,
  },
  chipActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  chipText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  chipTextActive: { color: "#fff" },
  chipMeta: { fontSize: 11, color: "rgba(255,255,255,0.45)" },

  dateChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 2,
    borderColor: "rgba(168,85,247,0.25)", backgroundColor: "rgba(168,85,247,0.12)",
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  dateChipActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  dateChipText: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  dateHint: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: -8, marginBottom: 16, marginLeft: 2 },

  regionChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  regionChipActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  regionChipText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

  parentCard: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 16, padding: 14, marginBottom: 10,
  },
  parentCardComplete: { borderColor: "rgba(16,185,129,0.4)" },
  parentCardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  parentCardLabel: { fontSize: 14, fontWeight: "800", color: "#fff" },
  parentCardStatus: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  parentSubLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", marginTop: 8, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  smallInput: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: "#fff",
  },
  workTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  workTypeChip: {
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  workTypeChipActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  workTypeChipText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  secondParentToggle: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, marginBottom: 10,
  },
  secondParentText: { fontSize: 13, color: brand.purple500, fontWeight: "700" },

  familyChildCard: {
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 14, padding: 12,
  },
  familyChildHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  familyChildName: { fontSize: 14, fontWeight: "800", color: "#fff" },
  familyChildMeta: { fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  familySchoolRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  familySchoolChip: {
    flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center",
  },
  familySchoolChipActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  familySchoolChipText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  moodCard: { width: "47%", borderWidth: 2, borderRadius: 16, padding: 14, alignItems: "flex-start", gap: 4 },
  moodLabel: { fontSize: 14, fontWeight: "800" },
  moodHint: { fontSize: 11, color: "rgba(255,255,255,0.6)" },

  toggleChip: {
    flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#13102e", alignItems: "center",
  },
  toggleChipActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  toggleChipText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

  handlerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  handlerCard: { flexBasis: "23%", flexGrow: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16, borderWidth: 2, gap: 4 },
  handlerLabel: { fontSize: 12, fontWeight: "800" },
  handlerNote: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: -2, marginBottom: 18, fontStyle: "italic" },

  optional: { fontWeight: "500", color: "rgba(255,255,255,0.45)", fontSize: 12 },
  textarea: {
    borderWidth: 2, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#13102e",
    borderRadius: 14, padding: 12, fontSize: 14, color: "#FFFFFF", minHeight: 88,
  },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  secondaryBtnText: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "700" },
  footerHint: { fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center", marginTop: 12 },

  emptyWrap: { alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF", marginBottom: 6 },
  emptySub: { fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "center" },

  previewHeading: { fontSize: 15, fontWeight: "800", color: "#fff" },

  tiffinCard: {
    backgroundColor: palette.amber50, borderWidth: 1, borderColor: palette.amber200,
    borderRadius: 20, padding: 14,
  },
  tiffinHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  tiffinTitle: { fontSize: 14, fontWeight: "800", color: palette.amber800 },
  tiffinSub: { fontSize: 11, color: palette.amber600 },
  tiffinChildCard: { backgroundColor: "#fff", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: palette.amber200 },
  tiffinChildHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  tiffinNameBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: palette.amber100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
  },
  tiffinNameText: { fontSize: 11, fontWeight: "800", color: palette.amber800 },
  tiffinTime: { fontSize: 11, color: palette.amber600 },
  tiffinFood: { fontSize: 12, marginLeft: "auto" },
  tiffinOptionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tiffinOption: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: palette.amber50, borderWidth: 1, borderColor: palette.amber200,
  },
  tiffinOptionText: { fontSize: 11, fontWeight: "600", color: palette.amber800 },

  timelineCard: {
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)", borderRadius: 18, padding: 14,
  },
  timelineTitle: { fontSize: 14, fontWeight: "800", color: "#fff" },
  timelineSub: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  timelineRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(255,255,255,0.02)", padding: 8, borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  timelineRowTime: { width: 56, fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.6)", textAlign: "right" },
  timelineDot: { width: 8, height: 8, borderRadius: 4 },
  timelineActivity: { fontSize: 12, fontWeight: "700", color: "#fff", flexShrink: 1 },
  timelineBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, borderWidth: 1 },
  timelineBadgeText: { fontSize: 9, fontWeight: "800" },
  timelineMeta: { fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 1 },

  progressOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,15,25,0.78)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  progressCard: {
    width: "100%", maxWidth: 360, backgroundColor: "#1A1530", borderRadius: 24, padding: 28,
    alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  progressIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  progressTitle: { fontSize: 18, fontWeight: "800", color: "#fff", marginBottom: 6, textAlign: "center" },
  progressStep: { fontSize: 14, color: "rgba(255,255,255,0.78)", textAlign: "center", marginBottom: 20, minHeight: 36 },
  progressBarTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 14 },
  progressBarFill: { height: "100%", borderRadius: 3, backgroundColor: brand.purple500 },
  progressHint: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
});
