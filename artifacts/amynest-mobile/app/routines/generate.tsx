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
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, palette } from "@/constants/colors";
import { BRAND } from "@/constants/brand";
import {
  HANDLER_TYPES,
  type HandlerKey,
  simplifyForHandler,
  appendHandlerToPlans,
  WAKE_KEY,
  extractTiffinSummary,
  buildCombinedTimeline,
  applyTiffinSelection,
  shiftItemTime,
  removeItemAt,
  type FRTimelineFamilyResult,
  shiftRoutineItems,
  isEssentialTask,
  parseDisplayTime,
  inputToDisplay,
  displayToInput,
} from "@workspace/family-routine";

type WeatherOutdoor = "yes" | "no" | "limited";

// ── Silent pre-generate weather/location detect ───────────────────────────
// Returns the resolved WeatherOutdoor verdict, or null on any failure
// (permission denied, no fix, offline, timeout). Mirrors the web helper.
async function detectWeatherOutdoorFromDevice(timeoutMs = 5000): Promise<WeatherOutdoor | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (!pos) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=precipitation,temperature_2m,wind_speed_10m`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data?.current ?? {};
    const precip = Number(cur.precipitation ?? 0);
    const wind = Number(cur.wind_speed_10m ?? 0);
    const temp = Number(cur.temperature_2m ?? 22);
    if (precip > 0.5) return "no";
    if (wind > 30 || temp < 5 || temp > 35) return "limited";
    return "yes";
  } catch {
    return null;
  }
}

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
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // ── Existing routine check (debounced) ──────────────────────────────────
  const [existingRoutine, setExistingRoutine] = useState<{ exists: boolean; routineId?: number } | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);
  const checkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkRequestIdRef = useRef(0);

  // ── Wake-up confirmation system ─────────────────────────────────────────
  const [showWakeConfirm, setShowWakeConfirm] = useState(false);
  const [wakeAnswer, setWakeAnswer] = useState<"yes" | "no" | null>(null);
  const [wakeInputValue, setWakeInputValue] = useState("07:00");
  const [confirmedWakeTime, setConfirmedWakeTime] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: "standard" | "ai"; forceOverride: boolean; weatherOverride?: WeatherOutdoor } | null>(null);

  // ── Past essential task check (after generating today) ──────────────────
  type PendingRoutineSave = {
    generatedData: { title: string; items: any[] };
    shouldOverride: boolean | undefined;
  };
  const [showTaskCheck, setShowTaskCheck] = useState(false);
  const [pendingRoutineSave, setPendingRoutineSave] = useState<PendingRoutineSave | null>(null);
  const [pastEssentialTasks, setPastEssentialTasks] = useState<{ idx: number; item: any }[]>([]);
  const [taskCheckMap, setTaskCheckMap] = useState<Record<number, boolean>>({});

  // ── Weather (outdoor go-out today?) ────────────────────────────────────
  const [weatherOutdoor, setWeatherOutdoor] = useState<WeatherOutdoor | null>(null);
  const [weatherDetecting, setWeatherDetecting] = useState(false);
  // Whether the user has explicitly engaged with the weather control this
  // visit (manual chip tap OR successful auto-detect). When false at generate
  // time, we silently re-detect once so meals/recipes/outdoor activities
  // reflect actual conditions instead of the default.
  const [weatherTouched, setWeatherTouched] = useState(false);
  const [prefetchingLocation, setPrefetchingLocation] = useState(false);
  // Refs for the silent pre-detect: an in-flight promise so concurrent
  // generate taps share one geolocation lookup (no duplicate permission
  // prompts), and a "touched" mirror so a late-resolving detection can be
  // discarded if the user manually picked a chip during the lookup.
  const weatherDetectInFlightRef = useRef<Promise<WeatherOutdoor | null> | null>(null);
  const weatherTouchedRef = useRef(false);
  const markWeatherTouched = useCallback(() => {
    weatherTouchedRef.current = true;
    setWeatherTouched(true);
  }, []);

  const handleAutoDetectWeather = useCallback(async () => {
    if (weatherDetecting) return;
    setWeatherDetecting(true);
    try {
      const verdict = await detectWeatherOutdoorFromDevice();
      if (verdict) {
        setWeatherOutdoor(verdict);
        markWeatherTouched();
        Haptics.selectionAsync();
      }
    } finally {
      setWeatherDetecting(false);
    }
  }, [weatherDetecting, markWeatherTouched]);

  // Pre-generate detect — runs once before any routine generation when the
  // user hasn't touched the weather control. Returns the value to use for
  // THIS generation's payload. Idempotent: concurrent calls share one
  // in-flight Promise (no duplicate permission prompts). Late results are
  // discarded if the user manually picked a chip during the lookup
  // ("transparency over surgery").
  const ensureWeatherDetected = useCallback(async (): Promise<WeatherOutdoor | undefined> => {
    if (weatherTouchedRef.current || weatherTouched) return weatherOutdoor ?? undefined;
    if (!weatherDetectInFlightRef.current) {
      setPrefetchingLocation(true);
      weatherDetectInFlightRef.current = detectWeatherOutdoorFromDevice().finally(() => {
        setPrefetchingLocation(false);
        weatherDetectInFlightRef.current = null;
      });
    }
    const detected = await weatherDetectInFlightRef.current;
    if (weatherTouchedRef.current) return weatherOutdoor ?? undefined;
    if (detected) {
      setWeatherOutdoor(detected);
      markWeatherTouched();
      return detected;
    }
    return weatherOutdoor ?? undefined;
  }, [weatherTouched, weatherOutdoor, markWeatherTouched]);

  // ── Family mode state ───────────────────────────────────────────────────
  const [familyChildSettings, setFamilyChildSettings] = useState<FamilyChildSettings>({});
  const [familyProgress, setFamilyProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [familyResults, setFamilyResults] = useState<FRTimelineFamilyResult[] | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then((r) => r.json()),
  });

  // Parent profile region — silently passed in the generation payload
  // (mirrors web behaviour; no UI override picker on mobile).
  const { data: parentProfile } = useQuery<{ region?: string } | null>({
    queryKey: ["parent-profile"],
    queryFn: () => authFetch("/api/parent-profile").then((r) => (r.ok ? r.json() : null)),
  });
  const effectiveRegion = (parentProfile?.region as string | undefined) || undefined;

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

  // ── Check for existing routine when child + date both selected ──────────
  useEffect(() => {
    if (selectedChild == null || !date) {
      setExistingRoutine(null);
      setOverrideMode(false);
      return;
    }
    if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
    const reqId = ++checkRequestIdRef.current;
    checkDebounceRef.current = setTimeout(() => {
      authFetch(`/api/routines/check?childId=${selectedChild}&date=${date}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: any) => {
          // Guard against stale responses after child/date changed mid-flight
          if (reqId !== checkRequestIdRef.current) return;
          setExistingRoutine(data ?? null);
          if (data?.exists) setOverrideMode(false);
        })
        .catch(() => {
          if (reqId !== checkRequestIdRef.current) return;
          setExistingRoutine(null);
        });
    }, 400);
    return () => {
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
    };
  }, [selectedChild, date, authFetch]);

  // Reset confirmed wake time when child or date changes (mirrors web)
  useEffect(() => {
    setConfirmedWakeTime(null);
  }, [selectedChild, date]);

  // ── Today helper ───────────────────────────────────────────────────────
  const todayKey = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // ── Core save helper ───────────────────────────────────────────────────
  const saveGeneratedRoutine = useCallback(async (data: { title: string; items: any[] }, shouldOverride: boolean | undefined) => {
    try {
      const saveRes = await authFetch("/api/routines", {
        method: "POST",
        body: JSON.stringify({
          childId: selectedChild,
          date,
          title: data.title,
          items: data.items,
          override: shouldOverride,
        }),
      });
      if (saveRes.status === 402 || saveRes.status === 403) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.push({ pathname: "/paywall", params: { reason: "routines_limit" } });
        return;
      }
      if (!saveRes.ok) throw new Error("Save failed");
      const saved = (await saveRes.json()) as { id: number };
      queryClient.invalidateQueries({ queryKey: ["routines"] });
      queryClient.invalidateQueries({ queryKey: ["routines-all"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-routines"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/routines/${saved.id}` as never);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("toasts.routines_generate.save_failed_title", { defaultValue: "Couldn't save routine" }),
        t("toasts.routines_generate.save_failed_body", { defaultValue: `${BRAND.aiName} ran into an issue. Please try again in a moment.` }),
      );
    }
  }, [authFetch, selectedChild, date, queryClient, router, t]);

  // ── Post-generate: adjust for today (past tasks + wake shift) ──────────
  const handlePostGenerate = useCallback((generatedData: { title: string; items: any[] }, shouldOverride: boolean | undefined, wakeTime: string | null) => {
    const isToday = date === todayKey;
    const childDefaultWake = selectedChildData?.wakeUpTime ?? "7:00 AM";
    let adjustedItems = [...generatedData.items];

    // 1. Shift by actual wake time if different from default
    if (isToday && wakeTime && wakeTime !== childDefaultWake) {
      adjustedItems = shiftRoutineItems(adjustedItems as any, childDefaultWake, wakeTime) as any[];
    }

    // 2. For today: identify past tasks; auto-complete non-essentials; queue essentials
    if (isToday) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const essentials: { idx: number; item: any }[] = [];
      adjustedItems = adjustedItems.map((item, idx) => {
        const itemMins = parseDisplayTime(item.time);
        if (itemMins < 0 || itemMins >= nowMins) return item; // future
        if (item.category === "sleep") return item; // never auto-touch sleep
        if (isEssentialTask(item.activity, item.category)) {
          essentials.push({ idx, item: { ...item } });
          return item; // resolved by task check dialog
        }
        return { ...item, status: "completed" };
      });
      const adjustedData = { title: generatedData.title, items: adjustedItems };
      if (essentials.length > 0) {
        setPastEssentialTasks(essentials);
        setTaskCheckMap(Object.fromEntries(essentials.map(({ idx }) => [idx, true])));
        setPendingRoutineSave({ generatedData: adjustedData, shouldOverride });
        setShowTaskCheck(true);
        return;
      }
      void saveGeneratedRoutine(adjustedData, shouldOverride);
    } else {
      void saveGeneratedRoutine({ title: generatedData.title, items: adjustedItems }, shouldOverride);
    }
  }, [date, todayKey, selectedChildData, saveGeneratedRoutine]);

  // ── Common payload builder ─────────────────────────────────────────────
  // weatherOverride: when present, takes priority over state — used by the
  // pre-generate location re-detect path so the freshly-detected value is in
  // the payload even before React commits the setState.
  const buildGeneratePayload = useCallback((wakeTime: string | null, weatherOverride?: WeatherOutdoor) => ({
    childId: selectedChild,
    date,
    hasSchool: hasSchool ?? undefined,
    specialPlans: appendHandlerToPlans(specialPlans, handlerType),
    fridgeItems: fridgeItems.trim() || undefined,
    mood: mood !== "normal" ? mood : undefined,
    age: selectedChildData?.age,
    wakeTime: wakeTime ?? selectedChildData?.wakeUpTime,
    schoolStart: selectedChildData?.schoolStartTime,
    schoolEnd: selectedChildData?.schoolEndTime,
    region: effectiveRegion,
    caregiver: handlerType,
    weatherOutdoor: weatherOverride ?? weatherOutdoor ?? undefined,
  }), [selectedChild, date, hasSchool, specialPlans, handlerType, fridgeItems, mood, selectedChildData, effectiveRegion, weatherOutdoor]);

  // ── Handle paywall response shared helper ──────────────────────────────
  const handlePaywallResponse = useCallback(async (res: Response): Promise<boolean> => {
    if (res.status !== 402 && res.status !== 403) return false;
    const body = (await res.json().catch(() => null)) as { reason?: string; error?: string; feature?: string } | null;
    const isFeatureLocked = res.status === 402 && (body?.error === "feature_locked" || body?.feature === "routine_generate");
    const isLegacyLimit = res.status === 403 && body?.reason === "routine_limit_exceeded";
    if (isFeatureLocked || isLegacyLimit) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push({ pathname: "/paywall", params: { reason: "routines_limit" } });
      return true;
    }
    return false;
  }, [router]);

  // ── Core generate (rule-based) ─────────────────────────────────────────
  const proceedGenerate = useCallback(async (forceOverride: boolean, wakeTime: string | null, weatherOverride?: WeatherOutdoor) => {
    const shouldOverride = forceOverride || overrideMode || !!existingRoutine?.exists;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    try {
      const res = await authFetch("/api/routines/generate", {
        method: "POST",
        body: JSON.stringify(buildGeneratePayload(wakeTime, weatherOverride)),
      });
      if (await handlePaywallResponse(res)) return;
      if (!res.ok) throw new Error("Generate failed");
      const generated = (await res.json()) as { title: string; items: any[] };
      const simplified = simplifyForHandler(generated.items as any, handlerType) as any[];
      handlePostGenerate({ title: generated.title, items: simplified }, shouldOverride, wakeTime);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("toasts.routines_generate.save_failed_title", { defaultValue: "Couldn't generate routine" }),
        t("toasts.routines_generate.generate_failed", { defaultValue: "Failed to generate routine" }),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [overrideMode, existingRoutine, authFetch, buildGeneratePayload, handlePaywallResponse, handlerType, handlePostGenerate, t]);

  // ── Core generate (AI) ─────────────────────────────────────────────────
  const proceedAiGenerate = useCallback(async (forceOverride: boolean, wakeTime: string | null, weatherOverride?: WeatherOutdoor) => {
    const shouldOverride = forceOverride || overrideMode || !!existingRoutine?.exists;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAiGenerating(true);
    try {
      const res = await authFetch("/api/routines/generate-ai", {
        method: "POST",
        body: JSON.stringify(buildGeneratePayload(wakeTime, weatherOverride)),
      });
      if (await handlePaywallResponse(res)) return;
      if (!res.ok) throw new Error("AI generate failed");
      const generated = (await res.json()) as { title: string; items: any[] };
      const simplified = simplifyForHandler(generated.items as any, handlerType) as any[];
      handlePostGenerate({ title: generated.title, items: simplified }, shouldOverride, wakeTime);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t("toasts.routines_generate.save_failed_title", { defaultValue: "Couldn't generate routine" }),
        t("toasts.routines_generate.generate_failed", { defaultValue: "Failed to generate routine" }),
      );
    } finally {
      setIsAiGenerating(false);
    }
  }, [overrideMode, existingRoutine, authFetch, buildGeneratePayload, handlePaywallResponse, handlerType, handlePostGenerate, t]);

  // ── Wake-check entry point ─────────────────────────────────────────────
  const triggerWithWakeCheck = useCallback(async (type: "standard" | "ai", forceOverride: boolean, weatherOverride?: WeatherOutdoor) => {
    const isToday = date === todayKey;
    if (!isToday || selectedChild == null) {
      if (type === "standard") void proceedGenerate(forceOverride, null, weatherOverride);
      else void proceedAiGenerate(forceOverride, null, weatherOverride);
      return;
    }
    if (confirmedWakeTime) {
      if (type === "standard") void proceedGenerate(forceOverride, confirmedWakeTime, weatherOverride);
      else void proceedAiGenerate(forceOverride, confirmedWakeTime, weatherOverride);
      return;
    }
    // Check stored wake time for child+date — if present, skip dialog
    try {
      const stored = await AsyncStorage.getItem(WAKE_KEY(selectedChild, date));
      if (stored && /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(stored)) {
        setConfirmedWakeTime(stored);
        if (type === "standard") void proceedGenerate(forceOverride, stored, weatherOverride);
        else void proceedAiGenerate(forceOverride, stored, weatherOverride);
        return;
      }
    } catch { /* ignore */ }
    // Open wake-confirm dialog (carry the freshly-detected weather along).
    setPendingAction({ type, forceOverride, weatherOverride });
    setWakeAnswer(null);
    const def = selectedChildData?.wakeUpTime ?? "7:00 AM";
    setWakeInputValue(displayToInput(def));
    setShowWakeConfirm(true);
  }, [date, todayKey, selectedChild, confirmedWakeTime, selectedChildData, proceedGenerate, proceedAiGenerate]);

  const handleWakeConfirmSubmit = useCallback(async () => {
    if (wakeAnswer === null) return;
    const childDefaultWake = selectedChildData?.wakeUpTime ?? "7:00 AM";
    const finalWakeTime = wakeAnswer === "yes"
      ? childDefaultWake
      : (inputToDisplay(wakeInputValue) || childDefaultWake);
    setConfirmedWakeTime(finalWakeTime);
    // Persist for later sessions (mirrors web's localStorage behavior)
    if (selectedChild != null) {
      AsyncStorage.setItem(WAKE_KEY(selectedChild, date), finalWakeTime).catch(() => {});
    }
    setShowWakeConfirm(false);
    if (pendingAction?.type === "standard") void proceedGenerate(pendingAction.forceOverride, finalWakeTime, pendingAction.weatherOverride);
    else if (pendingAction?.type === "ai") void proceedAiGenerate(pendingAction.forceOverride, finalWakeTime, pendingAction.weatherOverride);
    setPendingAction(null);
  }, [wakeAnswer, wakeInputValue, selectedChildData, selectedChild, date, pendingAction, proceedGenerate, proceedAiGenerate]);

  const handleTaskCheckDone = useCallback(() => {
    if (!pendingRoutineSave) {
      setShowTaskCheck(false);
      return;
    }
    const finalItems = pendingRoutineSave.generatedData.items.map((item: any, idx: number) => {
      if (idx in taskCheckMap) {
        return { ...item, status: taskCheckMap[idx] ? "completed" : "skipped" };
      }
      return item;
    });
    setShowTaskCheck(false);
    void saveGeneratedRoutine(
      { title: pendingRoutineSave.generatedData.title, items: finalItems },
      pendingRoutineSave.shouldOverride,
    );
    setPendingRoutineSave(null);
  }, [pendingRoutineSave, taskCheckMap, saveGeneratedRoutine]);

  // ── Public entry points (button handlers) ──────────────────────────────
  const handleGenerate = useCallback(async (forceOverride = false) => {
    if (!isFormValid || isGenerating || isAiGenerating) return;
    if (existingRoutine?.exists && !forceOverride && !overrideMode) return;
    const weatherOverride = await ensureWeatherDetected();
    void triggerWithWakeCheck("standard", forceOverride, weatherOverride);
  }, [isFormValid, isGenerating, isAiGenerating, existingRoutine, overrideMode, triggerWithWakeCheck, ensureWeatherDetected]);

  const handleAiGenerate = useCallback(async (forceOverride = false) => {
    if (!isFormValid || isGenerating || isAiGenerating) return;
    if (existingRoutine?.exists && !forceOverride && !overrideMode) return;
    const weatherOverride = await ensureWeatherDetected();
    void triggerWithWakeCheck("ai", forceOverride, weatherOverride);
  }, [isFormValid, isGenerating, isAiGenerating, existingRoutine, overrideMode, triggerWithWakeCheck, ensureWeatherDetected]);

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

    // Pre-generate location detect — same gate as single-mode so all family
    // routines share the freshly-detected outdoor signal.
    const familyWeather = await ensureWeatherDetected();

    // Family-mode existing-routine override gate (parity with single-mode).
    // Check each selected child for an existing routine on the chosen date,
    // then ask the parent once before regenerating + replacing them all.
    try {
      const checks = await Promise.all(
        selectedChildren.map(async (c) => {
          try {
            const r = await authFetch(`/api/routines/check?childId=${c.id}&date=${date}`);
            if (!r.ok) return null;
            const data = (await r.json()) as { exists?: boolean };
            return data?.exists ? c : null;
          } catch {
            return null;
          }
        }),
      );
      const conflicts = checks.filter((c): c is (typeof selectedChildren)[number] => !!c);
      if (conflicts.length > 0) {
        const names = conflicts.map((c) => c.name).join(", ");
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t("toasts.routines_generate.family_existing_title", {
              defaultValue: "Replace existing routines?",
            }),
            t("toasts.routines_generate.family_existing_confirm", {
              names,
              date,
              defaultValue: `${names} already have a routine for ${date}. Replace?`,
            }),
            [
              {
                text: t("toasts.routines_generate.family_existing_cancel", { defaultValue: "Cancel" }),
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: t("toasts.routines_generate.family_existing_replace", { defaultValue: "Replace" }),
                style: "destructive",
                onPress: () => resolve(true),
              },
            ],
            // Android: ensure tap-outside also resolves (else the loop hangs).
            { cancelable: true, onDismiss: () => resolve(false) },
          );
        });
        if (!proceed) return;
      }
    } catch {
      // If the check itself fails we don't block generation — save-all
      // uses override:true so any stale routine will still be replaced.
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
            wakeTime: child.wakeUpTime ?? undefined,
            schoolStart: child.schoolStartTime ?? undefined,
            schoolEnd: child.schoolEndTime ?? undefined,
            region: effectiveRegion,
            caregiver: handlerType,
            weatherOutdoor: familyWeather ?? undefined,
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
          <Text style={styles.emptyTitle}>{t("screens.routines_generate.add_a_child_first")}</Text>
          <Text style={styles.emptySub}>{t("screens.routines_generate.amy_needs_to_know_about_your_child_befor")}</Text>
          <TouchableOpacity
            onPress={() => router.replace("/children/new" as never)}
            activeOpacity={0.9}
            style={{ marginTop: 18 }}
          >
            <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              <Ionicons name="person-add" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>{t("screens.routines_generate.add_child")}</Text>
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
          <Text style={styles.heroTitle}>{t("screens.routines_generate.plan_your_child_s_day")}</Text>
          <Text style={styles.heroSub}>{t("screens.routines_generate.amy_will_build_a_smart_age_appropriate_r")}</Text>
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

        {/* Weather: outdoor go-out today? */}
        <Text style={styles.sectionLabel}>
          {t("routines_generate.weather_prompt", { defaultValue: "Can the kids go outdoor today?" })}
        </Text>
        <Text style={[styles.optional, { marginTop: -4, marginBottom: 8 }]}>
          {t("routines_generate.weather_hint", { defaultValue: `Helps ${BRAND.aiName} plan outdoor vs indoor activities.` })}
        </Text>
        <View style={[styles.chipsRow, { marginBottom: 8 }]}>
          {(["yes", "limited", "no"] as const).map((v) => {
            const active = weatherOutdoor === v;
            const label = t(`routines_generate.weather_${v}`, {
              defaultValue: v === "yes" ? "☀️ Yes" : v === "no" ? "🌧️ No" : "⛅ Limited",
            });
            return (
              <TouchableOpacity
                key={v}
                onPress={() => { Haptics.selectionAsync(); setWeatherOutdoor(v); markWeatherTouched(); }}
                activeOpacity={0.85}
                style={[styles.toggleChip, active && styles.toggleChipActive]}
              >
                <Text style={[styles.toggleChipText, active && { color: "#fff" }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity
          onPress={handleAutoDetectWeather}
          disabled={weatherDetecting}
          activeOpacity={0.85}
          style={styles.weatherDetectBtn}
        >
          {weatherDetecting
            ? <ActivityIndicator size="small" color={brand.purple500} />
            : <Ionicons name="locate-outline" size={14} color={brand.purple500} />}
          <Text style={styles.weatherDetectText}>
            {weatherDetecting
              ? t("routines_generate.weather_auto_detecting", { defaultValue: "Detecting…" })
              : t("routines_generate.weather_auto_detect", { defaultValue: "Auto-detect" })}
          </Text>
        </TouchableOpacity>

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

        {/* Existing routine banner — surfaces override gate (mirrors web) */}
        {mode === "single" && existingRoutine?.exists && !overrideMode && (
          <View style={styles.existingBanner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="information-circle" size={18} color={brand.purple500} />
              <Text style={styles.existingBannerTitle}>
                {t("routines_generate.existing_title", { defaultValue: "A routine already exists for this day" })}
              </Text>
            </View>
            <Text style={styles.existingBannerBody}>
              {t("routines_generate.existing_body", { defaultValue: "Open it, or replace it with a new one." })}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  if (existingRoutine.routineId) router.push(`/routines/${existingRoutine.routineId}` as never);
                }}
                activeOpacity={0.85}
                style={[styles.existingBtn, { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.18)" }]}
              >
                <Text style={[styles.existingBtnText, { color: "rgba(255,255,255,0.92)" }]}>
                  {t("routines_generate.open_existing", { defaultValue: "Open existing" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); setOverrideMode(true); }}
                activeOpacity={0.85}
                style={[styles.existingBtn, { backgroundColor: brand.purple500, borderColor: brand.purple500 }]}
              >
                <Text style={[styles.existingBtnText, { color: "#fff" }]}>
                  {t("routines_generate.replace_existing", { defaultValue: "Replace it" })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pre-generate location detect hint (silent re-detect in flight). */}
        {prefetchingLocation && (
          <View style={styles.locationHintRow}>
            <Ionicons name="location-outline" size={14} color={brand.purple500} />
            <Text style={styles.locationHintText}>
              {t("routines_generate.location_redetecting", {
                defaultValue: "Detecting your location for accurate meals & outdoor plan…",
              })}
            </Text>
          </View>
        )}

        {/* Generate button */}
        {mode === "single" ? (
          <>
            <TouchableOpacity
              onPress={() => handleGenerate(false)}
              disabled={!isFormValid || isGenerating || isAiGenerating || (existingRoutine?.exists && !overrideMode)}
              activeOpacity={0.9}
              style={{ marginTop: 24, opacity: (isFormValid && !isGenerating && !isAiGenerating && !(existingRoutine?.exists && !overrideMode)) ? 1 : 0.6 }}
            >
              <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                {isGenerating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="sparkles" size={18} color="#fff" />}
                <Text style={styles.primaryBtnText}>
                  {isGenerating
                    ? t("routines_generate.generating", { defaultValue: `${BRAND.aiName} is planning…` })
                    : overrideMode
                      ? t("routines_generate.replace_btn", { defaultValue: "Replace with new routine" })
                      : t("routines_generate.generate_btn", { defaultValue: `Generate with ${BRAND.aiName}` })}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Smart Amy AI button — uses /routines/generate-ai */}
            <TouchableOpacity
              onPress={() => handleAiGenerate(false)}
              disabled={!isFormValid || isGenerating || isAiGenerating || (existingRoutine?.exists && !overrideMode)}
              activeOpacity={0.9}
              style={[styles.aiBtn, { opacity: (isFormValid && !isGenerating && !isAiGenerating && !(existingRoutine?.exists && !overrideMode)) ? 1 : 0.6 }]}
            >
              {isAiGenerating
                ? <ActivityIndicator color={brand.purple500} size="small" />
                : <Ionicons name="flash" size={16} color={brand.purple500} />}
              <Text style={styles.aiBtnText}>
                {isAiGenerating
                  ? t("routines_generate.amy_thinking", { defaultValue: `${BRAND.aiName} AI is thinking…` })
                  : t("routines_generate.smart_ai_btn", { defaultValue: `Smart ${BRAND.aiName} AI Routine` })}
              </Text>
            </TouchableOpacity>
          </>
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
                  ? t("routines_generate.family_generating", { defaultValue: `${BRAND.aiName} is planning…` })
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
            setResults={setFamilyResults}
            onSaveAll={handleSaveAll}
            onCancel={() => setFamilyResults(null)}
            isSaving={isSavingAll}
          />
        )}

        <Text style={styles.footerHint}>
          {mode === "single"
            ? `${BRAND.aiName} will replace any existing routine for ${selectedChildData?.name ?? "this child"} on ${formatDate(date)}.`
            : t("routines_generate.family_footer", { defaultValue: `${BRAND.aiName} will plan one routine per selected child.` })}
        </Text>
      </ScrollView>

      {(isGenerating || isAiGenerating || isGeneratingFamily) && (
        <GenerateProgressOverlay
          childName={isGeneratingFamily ? (familyProgress?.currentName ?? "") : (selectedChildData?.name ?? "your child")}
          familyProgress={familyProgress}
          aiMode={isAiGenerating}
        />
      )}

      {/* ── Wake-up Confirmation Modal ────────────────────────────────────── */}
      <Modal visible={showWakeConfirm} transparent animationType="fade" onRequestClose={() => { setShowWakeConfirm(false); setPendingAction(null); }}>
        <Pressable style={styles.modalBackdrop} onPress={() => { setShowWakeConfirm(false); setPendingAction(null); }}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalHeader}>
              <Text style={{ fontSize: 28 }}>⏰</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>
                  {t("routines_generate.good_morning", { defaultValue: "Good morning!" })}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {t("routines_generate.lets_personalise", { defaultValue: "Let's personalise today's routine." })}
                </Text>
              </View>
            </LinearGradient>
            <View style={{ padding: 18, gap: 16 }}>
              <View>
                <Text style={styles.modalQuestion}>
                  {t("routines_generate.wake_question", {
                    name: selectedChildData?.name ?? "your child",
                    defaultValue: `Did ${selectedChildData?.name ?? "your child"} wake up at their usual time?`,
                  })}
                </Text>
                <Text style={styles.modalDefaultWake}>
                  {selectedChildData?.wakeUpTime ?? "7:00 AM"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setWakeAnswer("yes"); }}
                  activeOpacity={0.85}
                  style={[styles.wakeChoice, wakeAnswer === "yes" && { backgroundColor: brand.purple500, borderColor: brand.purple500 }]}
                >
                  <Text style={{ fontSize: 22 }}>✅</Text>
                  <Text style={[styles.wakeChoiceText, wakeAnswer === "yes" && { color: "#fff" }]}>
                    {t("routines_generate.wake_yes", { defaultValue: "Yes, on time" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { Haptics.selectionAsync(); setWakeAnswer("no"); }}
                  activeOpacity={0.85}
                  style={[styles.wakeChoice, wakeAnswer === "no" && { backgroundColor: brand.purple500, borderColor: brand.purple500 }]}
                >
                  <Text style={{ fontSize: 22 }}>⏱️</Text>
                  <Text style={[styles.wakeChoiceText, wakeAnswer === "no" && { color: "#fff" }]}>
                    {t("routines_generate.wake_no", { defaultValue: "No, different time" })}
                  </Text>
                </TouchableOpacity>
              </View>
              {wakeAnswer === "no" && (
                <View style={{ gap: 6 }}>
                  <Text style={styles.modalLabel}>
                    {t("routines_generate.enter_actual_wake", { defaultValue: "Enter today's actual wake-up time" })}
                  </Text>
                  <View style={styles.timeInputRow}>
                    <Ionicons name="time-outline" size={16} color={brand.purple500} />
                    <TextInput
                      value={wakeInputValue}
                      onChangeText={setWakeInputValue}
                      placeholder="07:00"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={styles.timeInput}
                      keyboardType="numbers-and-punctuation"
                    />
                    <Text style={{ color: brand.purple500, fontWeight: "800", fontSize: 13 }}>
                      {/^\d{1,2}:\d{2}$/.test(wakeInputValue) ? inputToDisplay(wakeInputValue) : ""}
                    </Text>
                  </View>
                  <Text style={styles.modalHint}>
                    {t("routines_generate.wake_shift_hint", { defaultValue: "The routine will shift to start from this time." })}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                onPress={handleWakeConfirmSubmit}
                disabled={wakeAnswer === null || (wakeAnswer === "no" && !wakeInputValue)}
                activeOpacity={0.9}
                style={{ opacity: wakeAnswer === null || (wakeAnswer === "no" && !wakeInputValue) ? 0.55 : 1 }}
              >
                <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {wakeAnswer === "yes"
                      ? t("routines_generate.wake_submit_yes", { defaultValue: "Great! Generate Routine" })
                      : t("routines_generate.wake_submit_no", { defaultValue: "Adjust & Generate" })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowWakeConfirm(false); setPendingAction(null); }} activeOpacity={0.7}>
                <Text style={styles.modalCancel}>{t("routines_generate.cancel", { defaultValue: "Cancel" })}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Past Essential Task Check Modal ───────────────────────────────── */}
      <Modal visible={showTaskCheck} transparent animationType="fade" onRequestClose={() => {
        // Dismiss = save as-is so user is not stuck with hidden pending state
        setShowTaskCheck(false);
        if (pendingRoutineSave) void saveGeneratedRoutine(pendingRoutineSave.generatedData, pendingRoutineSave.shouldOverride);
        setPendingRoutineSave(null);
      }}>
        <Pressable style={styles.modalBackdrop} onPress={() => {
          setShowTaskCheck(false);
          if (pendingRoutineSave) void saveGeneratedRoutine(pendingRoutineSave.generatedData, pendingRoutineSave.shouldOverride);
          setPendingRoutineSave(null);
        }}>
          <Pressable style={[styles.modalCard, { maxHeight: "85%" }]} onPress={(e) => e.stopPropagation()}>
            <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalHeader}>
              <Text style={{ fontSize: 28 }}>✅</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>
                  {t("routines_generate.morning_checkin", { defaultValue: "Morning check-in" })}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {t("routines_generate.mark_done", { defaultValue: "Mark what's already been done." })}
                </Text>
              </View>
            </LinearGradient>
            <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ padding: 18, gap: 12 }}>
              <Text style={styles.modalHint}>
                {t("routines_generate.checkin_hint", {
                  name: selectedChildData?.name ?? "your child",
                  defaultValue: `These activities should have happened before now. Did ${selectedChildData?.name ?? "your child"} complete them?`,
                })}
              </Text>
              {pastEssentialTasks.map(({ idx, item }) => {
                const done = !!taskCheckMap[idx];
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => { Haptics.selectionAsync(); setTaskCheckMap((prev) => ({ ...prev, [idx]: !prev[idx] })); }}
                    activeOpacity={0.85}
                    style={[styles.taskRow, done && { borderColor: brand.purple500 }]}
                  >
                    <Text style={{ fontSize: 18 }}>{done ? "✅" : "❌"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskRowTitle} numberOfLines={1}>{item.activity}</Text>
                      <Text style={styles.taskRowMeta}>{item.time} · {item.duration}m</Text>
                    </View>
                    <Text style={[styles.taskRowStatus, { color: done ? brand.purple500 : "rgba(255,255,255,0.55)" }]}>
                      {done
                        ? t("routines_generate.task_done", { defaultValue: "Done" })
                        : t("routines_generate.task_missed", { defaultValue: "Missed" })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <Text style={[styles.modalHint, { textAlign: "center" }]}>
                {t("routines_generate.tap_toggle_hint", { defaultValue: "Tap to toggle. Missed tasks will be marked as skipped." })}
              </Text>
            </ScrollView>
            <View style={{ padding: 18, paddingTop: 0, gap: 8 }}>
              <TouchableOpacity onPress={handleTaskCheckDone} activeOpacity={0.9}>
                <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {t("routines_generate.save_view_routine", { defaultValue: "Save & View Routine" })}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setShowTaskCheck(false);
                if (pendingRoutineSave) void saveGeneratedRoutine(pendingRoutineSave.generatedData, pendingRoutineSave.shouldOverride);
                setPendingRoutineSave(null);
              }} activeOpacity={0.7}>
                <Text style={styles.modalCancel}>
                  {t("routines_generate.skip_checkin", { defaultValue: "Skip check-in & save as is" })}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
      {/* Child picker — auto-skipped for single-child families */}
      {children.length > 1 && (
        <>
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
        </>
      )}

      {/* Caregiver / handler */}
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
      <Text style={styles.handlerNote}>
        {t(`routines_generate.caregiver_note_${handlerType}`, { defaultValue: CAREGIVER_NOTE_FALLBACKS[handlerType] })}
      </Text>

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
      <Text style={styles.sectionLabel}>{t("screens.routines_generate.school_day")}</Text>
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

      <Text style={styles.sectionLabel}>{t("screens.routines_generate.anything_special_today")}<Text style={styles.optional}>{t("screens.routines_generate.optional")}</Text></Text>
      <TextInput
        value={specialPlans}
        onChangeText={setSpecialPlans}
        placeholder={t("screens.routines_generate.e_g_doctor_visit_at_4pm_birthday_party_s")}
        placeholderTextColor={colors.textFaint}
        style={styles.textarea}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <Text style={styles.sectionLabel}>{t("screens.routines_generate.food_items_at_home")}<Text style={styles.optional}>{t("screens.routines_generate.optional")}</Text></Text>
      <TextInput
        value={fridgeItems}
        onChangeText={setFridgeItems}
        placeholder={t("screens.routines_generate.e_g_paneer_tomato_eggs_spinach_leftover")}
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
      <Text style={styles.handlerNote}>
        {t(`routines_generate.caregiver_note_${handlerType}`, { defaultValue: CAREGIVER_NOTE_FALLBACKS[handlerType] })}
      </Text>

      <Text style={styles.sectionLabel}>{t("routines_generate.family_special_plans", { defaultValue: "Anything special today?" })} <Text style={styles.optional}>{t("screens.routines_generate.optional")}</Text></Text>
      <TextInput
        value={specialPlans}
        onChangeText={setSpecialPlans}
        placeholder={t("screens.routines_generate.e_g_family_outing_doctor_visit_party")}
        placeholderTextColor={colors.textFaint}
        style={styles.textarea}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
      <Text style={styles.sectionLabel}>{t("routines_generate.family_fridge", { defaultValue: "Food items at home" })} <Text style={styles.optional}>{t("screens.routines_generate.optional")}</Text></Text>
      <TextInput
        value={fridgeItems}
        onChangeText={setFridgeItems}
        placeholder={t("screens.routines_generate.e_g_paneer_tomato_eggs")}
        placeholderTextColor={colors.textFaint}
        style={styles.textarea}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />
    </>
  );
}

// ─── Caregiver helper-note copy (mirrors web spec wording) ───────────────
const CAREGIVER_NOTE_FALLBACKS: Record<HandlerKey, string> = {
  mom: `${BRAND.aiName} will plan nurturing, gentle activities.`,
  dad: `${BRAND.aiName} will add active, energetic play.`,
  both: `${BRAND.aiName} will create a structured, balanced day.`,
  grandparent: `${BRAND.aiName} will lean on storytelling and slow-paced moments.`,
  babysitter: `${BRAND.aiName} will keep activities simple and safe.`,
};

// ─── Family results preview (editable) ──────────────────────────────────
function FamilyResultsPreview({
  t,
  results,
  setResults,
  onSaveAll,
  onCancel,
  isSaving,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  results: FRTimelineFamilyResult[];
  setResults: React.Dispatch<React.SetStateAction<FRTimelineFamilyResult[] | null>>;
  onSaveAll: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const tiffin = useMemo(() => extractTiffinSummary(results), [results]);
  const timeline = useMemo(() => buildCombinedTimeline(results), [results]);

  // Tap-to-edit modal state for timeline rows.
  const [editing, setEditing] = useState<{
    childId: number;
    itemIdx: number;
    time: string;
    activity: string;
    childName: string;
  } | null>(null);

  const mutateChild = useCallback(
    (
      childId: number,
      fn: (items: FRTimelineFamilyResult["routine"]["items"]) => FRTimelineFamilyResult["routine"]["items"],
    ) => {
      setResults((prev) =>
        (prev ?? []).map((r) =>
          r.child.id === childId
            ? { ...r, routine: { ...r.routine, items: fn(r.routine.items) } }
            : r,
        ),
      );
    },
    [setResults],
  );

  const handlePickTiffin = useCallback(
    (childId: number, opt: string) => {
      Haptics.selectionAsync();
      mutateChild(childId, (items) => applyTiffinSelection(items, opt));
    },
    [mutateChild],
  );

  const handleShift = useCallback(
    (deltaMinutes: number) => {
      if (!editing) return;
      Haptics.selectionAsync();
      mutateChild(editing.childId, (items) => shiftItemTime(items, editing.itemIdx, deltaMinutes));
      setEditing(null);
    },
    [editing, mutateChild],
  );

  const handleDelete = useCallback(() => {
    if (!editing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    mutateChild(editing.childId, (items) => removeItemAt(items, editing.itemIdx));
    setEditing(null);
  }, [editing, mutateChild]);

  return (
    <View style={{ marginTop: 24, gap: 16 }}>
      <Text style={styles.previewHeading}>
        {t("routines_generate.family_preview_title", {
          count: results.length,
          defaultValue: `Preview · ${results.length} routine${results.length === 1 ? "" : "s"}`,
        })}
      </Text>
      <Text style={styles.previewEditHint}>
        {t("routines_generate.family_preview_edit_hint", {
          defaultValue: "Tap a tiffin option to swap it. Tap a timeline row to delay, advance, or skip it.",
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
            {tiffin.map(({ child, time, options }) => {
              // Selected option is whichever option string matches the
              // tiffin row's current `activity`. Falls back to none until
              // the parent makes a pick.
              const currentItem = results
                .find((r) => r.child.id === child.id)
                ?.routine.items.find((i) => i.category === "tiffin");
              const selected = currentItem?.activity;
              return (
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
                    {options.map((opt, i) => {
                      const isSelected = selected === opt;
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => handlePickTiffin(child.id, opt)}
                          activeOpacity={0.85}
                          style={[styles.tiffinOption, isSelected && styles.tiffinOptionSelected]}
                          accessibilityRole="button"
                          accessibilityLabel={`Pick ${opt} for ${child.name}`}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text style={{ fontSize: 11, color: isSelected ? "#fff" : palette.amber600 }}>
                            {isSelected ? "✓" : "🥘"}
                          </Text>
                          <Text style={[styles.tiffinOptionText, isSelected && styles.tiffinOptionTextSelected]}>
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
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
            <TouchableOpacity
              key={`${row.childId}-${row.itemIdx}-${idx}`}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync();
                setEditing({
                  childId: row.childId,
                  itemIdx: row.itemIdx,
                  time: row.time,
                  activity: row.activity,
                  childName: row.childName,
                });
              }}
              style={styles.timelineRow}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${row.activity} at ${row.time} for ${row.childName}`}
            >
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
              <Ionicons name="create-outline" size={14} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Per-row edit sheet */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setEditing(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <LinearGradient colors={[brand.purple500, brand.pink500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalHeader}>
              <Text style={{ fontSize: 26 }}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                  {editing?.activity ?? ""}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  {editing ? `${editing.childName} · ${editing.time}` : ""}
                </Text>
              </View>
            </LinearGradient>
            <View style={{ padding: 16, gap: 10 }}>
              <Text style={styles.modalLabel}>
                {t("routines_generate.family_preview_edit_title", { defaultValue: "Adjust this task" })}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => handleShift(-15)}
                  activeOpacity={0.85}
                  style={[styles.editAction, { flex: 1 }]}
                >
                  <Ionicons name="play-back" size={16} color={brand.purple500} />
                  <Text style={styles.editActionText}>
                    {t("routines_generate.family_preview_advance", { defaultValue: "−15 min" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleShift(15)}
                  activeOpacity={0.85}
                  style={[styles.editAction, { flex: 1 }]}
                >
                  <Ionicons name="play-forward" size={16} color={brand.purple500} />
                  <Text style={styles.editActionText}>
                    {t("routines_generate.family_preview_delay", { defaultValue: "+15 min" })}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={handleDelete}
                activeOpacity={0.85}
                style={[styles.editAction, styles.editActionDanger]}
              >
                <Ionicons name="trash-outline" size={16} color={palette.rose500} />
                <Text style={[styles.editActionText, { color: palette.rose500 }]}>
                  {t("routines_generate.family_preview_skip", { defaultValue: "Skip / remove from day" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(null)} activeOpacity={0.7} style={{ paddingVertical: 6 }}>
                <Text style={styles.modalCancel}>
                  {t("common.cancel", { defaultValue: "Cancel" })}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
  { icon: "sparkles-outline" as const, label: `Adding ${BRAND.aiName}'s finishing touches…` },
];

function GenerateProgressOverlay({
  childName,
  familyProgress,
  aiMode = false,
}: {
  childName: string;
  familyProgress: { current: number; total: number; currentName: string } | null;
  aiMode?: boolean;
}) {
  const { t } = useTranslation();
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
          {isFamily ? `Building ${familyProgress?.currentName}'s routine` : `${BRAND.aiName} is planning`}
        </Text>
        <Text style={styles.progressStep}>
          {isFamily ? `${familyProgress?.current} of ${familyProgress?.total} children` : label}
        </Text>
        <View style={styles.progressBarTrack}>
          {isFamily
            ? <View style={[styles.progressBarFill, { width: familyPct }]} />
            : <Animated.View style={[styles.progressBarFill, { width: singleWidth }]} />}
        </View>
        <Text style={styles.progressHint}>{t("screens.routines_generate.this_usually_takes_a_few_seconds")}</Text>
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
    backgroundColor: "#13102e", flexDirection: "row", alignItems: "baseline", gap: 6, // audit-ok: static dark-surface chip on the always-dark routine generator
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

  weatherDetectBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(167,139,250,0.45)",
    backgroundColor: "rgba(167,139,250,0.10)", marginBottom: 16,
  },
  weatherDetectText: { fontSize: 12, fontWeight: "700", color: brand.purple500 },
  locationHintRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(167,139,250,0.10)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.30)",
  },
  locationHintText: { fontSize: 12, fontWeight: "600", color: brand.purple500, flexShrink: 1 },

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
    borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#13102e", alignItems: "center", // audit-ok: static dark surface (matches dark.card token)
  },
  toggleChipActive: { backgroundColor: brand.purple500, borderColor: brand.purple500 },
  toggleChipText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

  handlerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  handlerCard: { flexBasis: "23%", flexGrow: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 6, borderRadius: 16, borderWidth: 2, gap: 4 },
  handlerLabel: { fontSize: 12, fontWeight: "800" },
  handlerNote: { fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: -2, marginBottom: 18, fontStyle: "italic" },

  optional: { fontWeight: "500", color: "rgba(255,255,255,0.45)", fontSize: 12 },
  textarea: {
    borderWidth: 2, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#13102e", // audit-ok: static dark textarea on always-dark generator
    borderRadius: 14, padding: 12, fontSize: 14, color: "#FFFFFF", minHeight: 88,
  },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  aiBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14, marginTop: 10,
    borderWidth: 2, borderColor: "rgba(167,139,250,0.55)",
    backgroundColor: "rgba(167,139,250,0.10)",
  },
  aiBtnText: { color: brand.purple500, fontSize: 14, fontWeight: "800" },
  existingBanner: {
    marginTop: 16, padding: 14, borderRadius: 16,
    backgroundColor: "rgba(167,139,250,0.10)",
    borderWidth: 2, borderColor: "rgba(167,139,250,0.45)",
    gap: 6,
  },
  existingBannerTitle: { fontSize: 14, fontWeight: "800", color: "rgba(255,255,255,0.95)", flex: 1 },
  existingBannerBody: { fontSize: 12, color: "rgba(255,255,255,0.65)" },
  existingBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  existingBtnText: { fontSize: 13, fontWeight: "700" },
  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center", padding: 16,
  },
  modalCard: {
    width: "100%", maxWidth: 420, borderRadius: 24, overflow: "hidden",
    backgroundColor: "#1a1330", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", // audit-ok: static dark modal surface on always-dark generator
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 18,
  },
  modalHeaderTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  modalHeaderSubtitle: { color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 2 },
  modalQuestion: { color: "rgba(255,255,255,0.95)", fontSize: 15, fontWeight: "700" },
  modalDefaultWake: { color: brand.purple500, fontSize: 22, fontWeight: "900", marginTop: 4 },
  modalLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700" },
  modalHint: { color: "rgba(255,255,255,0.55)", fontSize: 11 },
  modalCancel: { color: "rgba(255,255,255,0.55)", fontSize: 12, textAlign: "center", paddingVertical: 4 },
  wakeChoice: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 14, borderRadius: 16,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  wakeChoiceText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.92)" },
  timeInputRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14,
    borderWidth: 2, borderColor: "rgba(167,139,250,0.55)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  timeInput: {
    flex: 1, color: "#fff", fontSize: 16, fontWeight: "800",
    padding: 0,
  },
  taskRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  taskRowTitle: { color: "rgba(255,255,255,0.95)", fontSize: 13, fontWeight: "800" },
  taskRowMeta: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },
  taskRowStatus: { fontSize: 11, fontWeight: "800" },
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
  previewEditHint: {
    fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: -8,
    fontStyle: "italic",
  },
  editAction: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12,
    borderWidth: 1, borderColor: "rgba(167,139,250,0.45)",
    backgroundColor: "rgba(167,139,250,0.10)",
  },
  editActionDanger: {
    borderColor: "rgba(244,63,94,0.45)",
    backgroundColor: "rgba(244,63,94,0.08)",
  },
  editActionText: { fontSize: 13, fontWeight: "700", color: brand.purple500 },

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
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: palette.amber50, borderWidth: 1, borderColor: palette.amber200,
  },
  tiffinOptionSelected: {
    backgroundColor: palette.amber600,
    borderColor: palette.amber800,
  },
  tiffinOptionText: { fontSize: 11, fontWeight: "600", color: palette.amber800 },
  tiffinOptionTextSelected: { color: "#fff", fontWeight: "800" },

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
    width: "100%", maxWidth: 360, backgroundColor: "#1A1530", borderRadius: 24, padding: 28, // audit-ok: static dark progress card on always-dark generator
    alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  progressIconWrap: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  progressTitle: { fontSize: 18, fontWeight: "800", color: "#fff", marginBottom: 6, textAlign: "center" },
  progressStep: { fontSize: 14, color: "rgba(255,255,255,0.78)", textAlign: "center", marginBottom: 20, minHeight: 36 },
  progressBarTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 14 },
  progressBarFill: { height: "100%", borderRadius: 3, backgroundColor: brand.purple500 },
  progressHint: { fontSize: 12, color: "rgba(255,255,255,0.45)" },
});
