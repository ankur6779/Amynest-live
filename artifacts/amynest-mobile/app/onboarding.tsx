import React, {   useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Platform, ActivityIndicator, KeyboardAvoidingView, Image, Modal, Animated, Easing,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useUser } from "@/lib/firebase-auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import * as Haptics from "expo-haptics";
// `expo-device` is loaded lazily so unit tests that import this screen
// don't pull in the native module graph (which fails under JSDOM).
let Device: typeof import("expo-device") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
  Device = require("expo-device") as typeof import("expo-device");
} catch {
  Device = null;
}
import { brand, palette, brandExtended } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

// expo-notifications is unavailable in Expo Go (SDK 53+) for remote push.
// Permission APIs work even in Expo Go, but we still guard the require so a
// missing native module never crashes the JS bundle.
let Notifications: typeof import("expo-notifications") | null = null;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    Notifications = null;
  }
}

type ChatRole = "amy" | "user";
type ChatMsg = { id: string; role: ChatRole; text: string };
type AgeGroup = "infant" | "toddler" | "kid";
type Step =
  | "intro" | "child-name" | "child-dob" | "child-school" | "child-class"
  | "child-school-start" | "child-school-end" | "child-school-days"
  | "child-wake" | "child-sleep"
  | "infant-feeding" | "infant-sleep"
  | "add-more" | "parent-name" | "parent-role" | "parent-work"
  | "parent-region" | "parent-mobile" | "parent-allergies"
  | "saving" | "save-error" | "done" | "notifications";

type ChildData = {
  name: string; dob: string; age: number; ageMonths: number;
  ageGroup: AgeGroup;
  isSchoolGoing: boolean; childClass: string;
  schoolStartTime: string; schoolEndTime: string;
  schoolDays: number[] | null; // ISO weekdays (1=Mon..7=Sun); null when not school-going
  wakeUpTime: string; sleepTime: string; foodType: string;
  dietNote: string;
  feedingType?: string;
  sleepPattern?: string;
};
type ParentData = { name: string; role: string; workType: string; region: string; mobileNumber?: string; allergies?: string };

function genId(): string { return Date.now().toString() + Math.random().toString(36).substr(2, 6); }

function dobToAge(dob: string): { years: number; months: number } {
  const born = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  if (months < 0) { years--; months += 12; }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}

function to24h(display: string): string {
  const [time, period] = display.split(" ");
  const parts = (time ?? "").split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  const hour = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const WAKE_OPTS = ["5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM"];
const SLEEP_OPTS = ["8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM"];
const SCHOOL_START = ["7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM"];
const SCHOOL_END = ["12:00 PM", "1:00 PM", "2:00 PM", "2:30 PM", "3:00 PM", "4:00 PM"];
const CLASSES = ["Nursery", "LKG / KG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th+"];
const ROLE_KEYS: { key: string; value: string }[] = [
  { key: "role_mother", value: "Mother" },
  { key: "role_father", value: "Father" },
  { key: "role_both", value: "Both" },
  { key: "role_grandparent", value: "Grandparent" },
];
const WORK_TYPE_KEYS: { key: string; value: string }[] = [
  { key: "work_wfh", value: "work_from_home" },
  { key: "work_office", value: "office" },
  { key: "work_not_working", value: "not_working" },
];
const FEEDING_KEYS: { key: string; value: string }[] = [
  { key: "feeding_breast", value: "breastfeeding" },
  { key: "feeding_formula", value: "formula" },
  { key: "feeding_both", value: "mixed" },
];
const INFANT_SLEEP_KEYS: { key: string; value: string }[] = [
  { key: "sleep_flexible", value: "flexible" },
  { key: "sleep_irregular", value: "irregular" },
  { key: "sleep_short", value: "short_naps" },
];

// Step ordering used to drive the top progress bar. Mirrors the web flow:
// each branch (school-age vs infant) has its own denominator that covers
// every step the user will actually see, so the bar grows smoothly all the
// way to "Saving" without jumping when crossing from child → parent.
const PARENT_TAIL: Step[] = [
  "add-more", "parent-name", "parent-role", "parent-work",
  "parent-region", "parent-mobile", "parent-allergies",
];
const STANDARD_ORDER: Step[] = [
  "child-name", "child-dob", "child-school", "child-class",
  "child-school-start", "child-school-end", "child-school-days",
  "child-wake", "child-sleep",
  ...PARENT_TAIL,
];
const INFANT_ORDER: Step[] = [
  "child-name", "child-dob", "infant-feeding", "infant-sleep",
  ...PARENT_TAIL,
];
const INFANT_ONLY: Step[] = ["infant-feeding", "infant-sleep"];

/** Convert 24-h "HH:MM" → display "H:MM AM/PM" */
function from24hDisplay(v: string): string {
  const parts = (v || "07:00").split(":");
  const h = parseInt(parts[0] ?? "7", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * TimePickerField — native time wheel (spinner on iOS, clock dialog on
 * Android). Tapping the display row opens the picker; the "Confirm" button
 * fires the callback so the parent can advance to the next step.
 */
function TimePickerField({
  initial24h,
  confirmLabel,
  onConfirm,
}: {
  initial24h: string;
  confirmLabel: string;
  onConfirm: (display: string, time24h: string) => void;
}) {
  const { t } = useTranslation();
  const initParts = (initial24h || "07:00").split(":");
  const initD = new Date();
  initD.setHours(parseInt(initParts[0] ?? "7", 10), parseInt(initParts[1] ?? "0", 10), 0, 0);

  const [date, setDate] = useState<Date>(initD);
  const [show, setShow] = useState(false);

  function fmt24(d: Date) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  const onDateChange = (_event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === "android") setShow(false);
    if (picked) setDate(picked);
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Tappable display row */}
      <TouchableOpacity
        style={{
          height: 52, borderRadius: 16, borderWidth: 1.5,
          borderColor: GLASS_BORDER, backgroundColor: GLASS_BG,
          justifyContent: "center", paddingHorizontal: 18,
          flexDirection: "row", alignItems: "center", gap: 10,
        }}
        onPress={() => { Haptics.selectionAsync(); setShow(true); }}
        activeOpacity={0.75}
      >
        <Ionicons name="time-outline" size={18} color={PRIMARY} />
        <Text style={{ color: TEXT_ON_DARK, fontSize: 17, fontFamily: "Inter_600SemiBold" }}>
          {from24hDisplay(fmt24(date))}
        </Text>
        <Text style={{ color: TEXT_MUTED, fontSize: 13, fontFamily: "Inter_400Regular", marginLeft: "auto" }}>
          tap to change
        </Text>
      </TouchableOpacity>

      {/* iOS — bottom-sheet spinner modal */}
      {show && Platform.OS === "ios" && (
        <Modal transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
            <View style={{
              backgroundColor: "rgba(18,4,45,0.97)", borderTopLeftRadius: 24, borderTopRightRadius: 24,
              padding: 20, borderWidth: 1, borderColor: GLASS_BORDER,
            }}>
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 }}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={{ color: PRIMARY, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{t("screens.onboarding_chat.btn_done")}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date} mode="time" display="spinner"
                onChange={onDateChange} style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android — system dialog */}
      {show && Platform.OS === "android" && (
        <DateTimePicker value={date} mode="time" display="default" onChange={onDateChange} />
      )}

      {/* Confirm button */}
      <TouchableOpacity
        style={[{ backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 14, alignItems: "center" }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onConfirm(from24hDisplay(fmt24(date)), fmt24(date)); }}
        activeOpacity={0.85}
      >
        <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>{confirmLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const REGION_KEYS: { key: string; value: string }[] = [
  { key: "region_pan", value: "pan_indian" },
  { key: "region_north", value: "north_indian" },
  { key: "region_south", value: "south_indian" },
  { key: "region_bengali", value: "bengali" },
  { key: "region_gujarati", value: "gujarati" },
  { key: "region_maharashtrian", value: "maharashtrian" },
  { key: "region_punjabi", value: "punjabi" },
  { key: "region_global", value: "global" },
];

const PRIMARY = brand.purple500;
const GLASS_BG = "rgba(18,4,45,0.80)";
const GLASS_BORDER = "rgba(168,85,247,0.22)";
const TEXT_ON_DARK = "#FFFFFF";
const TEXT_MUTED = "rgba(200,180,255,0.55)";

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState<Step>("intro");
  const [textInput, setTextInput] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [dobDate, setDobDate] = useState<Date>(new Date(2019, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saveError, setSaveError] = useState<string>("");
  const [selected, setSelected] = useState("");
  const [children, setChildren] = useState<ChildData[]>([]);
  const [curr, setCurr] = useState<Partial<ChildData>>({});
  const [parent, setParent] = useState<Partial<ParentData>>({});
  const [regionDrillDown, setRegionDrillDown] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMsg>>(null);
  const stepRef = useRef<Step>("intro");

  // Progress bar — mirrors web. Steps inside the infant branch use the
  // shorter denominator, all other steps use the standard flow length.
  const { progressCurrent, progressTotal } = useMemo(() => {
    // Once the user picks an infant DOB, all later steps (parent flow
    // included) advance against the shorter infant denominator so the bar
    // never visually jumps backwards mid-flow.
    const inInfantBranch =
      INFANT_ONLY.includes(step) ||
      (curr.ageGroup === "infant") ||
      (children.length > 0 && children.every(c => c.ageGroup === "infant"));
    const order = inInfantBranch ? INFANT_ORDER : STANDARD_ORDER;
    const idx = order.indexOf(step);
    return {
      progressCurrent: idx >= 0 ? idx + 1 : 0,
      progressTotal: order.length,
    };
  }, [step, curr.ageGroup, children]);
  const progressPct = progressTotal > 0
    ? Math.max(4, Math.min(100, Math.round((progressCurrent / progressTotal) * 100)))
    : 0;
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPct,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progressPct, progressAnim]);

  // Animated typing indicator — three dots that pulse in sequence.
  const dotA = useRef(new Animated.Value(0.35)).current;
  const dotB = useRef(new Animated.Value(0.35)).current;
  const dotC = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (!typing) return;
    const make = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 360, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.35, duration: 360, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
    const loop = Animated.parallel([make(dotA, 0), make(dotB, 140), make(dotC, 280)]);
    loop.start();
    return () => loop.stop();
  }, [typing, dotA, dotB, dotC]);

  const addMsg = useCallback((role: ChatRole, text: string) => {
    setMessages(m => [{ id: genId(), role, text }, ...m]);
  }, []);

  const amySays = useCallback((text: string, delay = 700) => {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMsg("amy", text);
    }, delay);
  }, [addMsg]);

  const userReplies = useCallback((text: string, nextStep: Step, nextAmyMsg?: string) => {
    addMsg("user", text);
    setSelected("");
    setTextInput("");
    if (nextAmyMsg) {
      setTimeout(() => amySays(nextAmyMsg), 400);
    }
    setTimeout(() => {
      stepRef.current = nextStep;
      setStep(nextStep);
    }, nextAmyMsg ? 1400 : 400);
  }, [addMsg, amySays]);

  useEffect(() => {
    const firstName = user?.firstName || t("screens.onboarding_chat.amy_intro_default_name");
    setTimeout(() => {
      addMsg("amy", t("screens.onboarding_chat.amy_intro", { name: firstName }));
      setTimeout(() => amySays(t("screens.onboarding_chat.amy_first_q"), 800), 1200);
      setTimeout(() => { stepRef.current = "child-name"; setStep("child-name"); }, 2200);
    }, 600);
  }, []);

  const saveEverything = async (finalParent: ParentData, finalChildren: ChildData[]) => {
    stepRef.current = "saving";
    setStep("saving");
    addMsg("amy", t("screens.onboarding_chat.amy_saving"));

    try {
      for (const child of finalChildren) {
        const dietNote = (child.dietNote || "").trim();
        const goals = dietNote ? `${dietNote}|balanced-routine` : "balanced-routine";
        const res = await authFetch("/api/children", {
          method: "POST",
          body: JSON.stringify({
            name: child.name, dob: child.dob || "",
            age: child.age || 0, ageMonths: child.ageMonths || 0,
            isSchoolGoing: child.isSchoolGoing ?? false,
            childClass: child.childClass || "",
            schoolStartTime: child.schoolStartTime || "09:00",
            schoolEndTime: child.schoolEndTime || "15:00",
            schoolDays: child.isSchoolGoing ? (child.schoolDays ?? [1, 2, 3, 4, 5]) : null,
            wakeUpTime: child.wakeUpTime || "07:00",
            sleepTime: child.sleepTime || "21:00",
            travelMode: "car",
            foodType: child.foodType || "veg",
            goals,
            feedingType: child.feedingType ?? null,
            sleepPattern: child.sleepPattern ?? null,
            isOnboarding: true,
          }),
        });
        if (!res.ok) throw new Error(`Failed to create child: ${res.status}`);
      }

      const parentPayload: Record<string, unknown> = {
        name: finalParent.name || "",
        role: (finalParent.role || "mother").toLowerCase(),
        workType: finalParent.workType || "work_from_home",
        region: finalParent.region || "pan_indian",
      };
      if (finalParent.mobileNumber) parentPayload.mobileNumber = finalParent.mobileNumber;
      if (finalParent.allergies) parentPayload.allergies = finalParent.allergies;

      const profileRes = await authFetch("/api/parent-profile", {
        method: "PUT",
        body: JSON.stringify(parentPayload),
      });
      if (!profileRes.ok) throw new Error(`Failed to update profile: ${profileRes.status}`);

      const onboardingRes = await authFetch("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          children: finalChildren.map(c => ({ name: c.name, ageGroup: `${c.age}`, problems: [] })),
          parent: { caregiver: finalParent.role, concern: "", routineLevel: "medium" },
          priorityGoal: "balanced-routine",
          onboardingComplete: true,
        }),
      });
      if (!onboardingRes.ok) throw new Error(`Failed to complete onboarding: ${onboardingRes.status}`);

      qc.setQueryData(["onboarding-status"], { onboardingComplete: true, profileComplete: true });
      void qc.invalidateQueries({ queryKey: ["children"] });
      stepRef.current = "done";
      setStep("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSaveError(message);
      stepRef.current = "save-error";
      setStep("save-error");
      addMsg("amy", t("screens.onboarding_chat.amy_save_error"));
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (step === "saving") {
    return (
      <LinearGradient
        colors={["#0a061a", "#120a2e", "#050010"]} // audit-ok: intentional dark bg / custom color
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.doneContainer, { paddingTop: topPad, paddingBottom: botPad }]}
      >
        <Image
          source={require("../assets/images/amynest-logo.png")}
          style={styles.amyBigBubble}
          resizeMode="cover"
        />
        <Text style={styles.doneTitle}>{t("screens.onboarding_chat.saving_title")}</Text>
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 16 }} />
      </LinearGradient>
    );
  }

  if (step === "done") {
    return (
      <LinearGradient
        colors={["#0a061a", "#120a2e", "#050010"]} // audit-ok: intentional dark bg / custom color
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.doneContainer, { paddingTop: topPad, paddingBottom: botPad }]}
      >
        <View style={[styles.amyBigBubble, { backgroundColor: palette.emerald500 }]}>
          <Ionicons name="checkmark" size={36} color="#fff" />
        </View>
        <Text style={styles.doneTitle}>{t("screens.onboarding_chat.done_title")}</Text>
        <Text style={styles.doneSub}>{t("screens.onboarding_chat.done_sub", { name: children[0]?.name ?? t("screens.onboarding_chat.done_default_name") })}</Text>
        <TouchableOpacity
          onPress={async () => {
            qc.setQueryData(["onboarding-status"], { onboardingComplete: true, profileComplete: true });
            // Mirror web: only show the dedicated notifications step if the
            // user has not yet made a permission decision. Skip straight to
            // the dashboard when permission is already granted/denied or the
            // platform has no notifications module.
            let shouldAsk = true;
            try {
              if (!Notifications || Platform.OS === "web" || !Device || !Device.isDevice) {
                shouldAsk = false;
              } else {
                const settings = await Notifications.getPermissionsAsync();
                if (settings.granted || settings.status === "denied") shouldAsk = false;
              }
            } catch {
              shouldAsk = false;
            }
            if (shouldAsk) {
              stepRef.current = "notifications";
              setStep("notifications");
            } else {
              router.replace("/(tabs)");
            }
          }}
          activeOpacity={0.9}
          style={styles.doneBtnWrap}
          testID="go-dashboard-btn"
        >
          <LinearGradient
            colors={[brand.purple500, brand.pink500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.doneBtn}
          >
            <Text style={styles.doneBtnText}>{t("screens.onboarding_chat.btn_continue")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  if (step === "notifications") {
    const goDashboard = () => {
      qc.setQueryData(["onboarding-status"], { onboardingComplete: true, profileComplete: true });
      router.replace("/(tabs)");
    };
    const requestPush = async () => {
      if (notifLoading) return;
      setNotifLoading(true);
      try {
        if (!Notifications || Platform.OS === "web" || !Device || !Device.isDevice) {
          goDashboard();
          return;
        }
        if (Platform.OS === "android") {
          try {
            await Notifications.setNotificationChannelAsync("default", {
              name: "Default",
              importance: Notifications.AndroidImportance.HIGH,
              sound: "default",
              vibrationPattern: [0, 250, 250, 250],
              lightColor: brand.purple500,
            });
          } catch { /* best-effort */ }
        }
        await Notifications.requestPermissionsAsync();
      } catch {
        // Permission flow failed — still continue to the dashboard so the
        // user is never stuck on the notifications step.
      } finally {
        setNotifLoading(false);
        goDashboard();
      }
    };
    return (
      <LinearGradient
        colors={["#0a061a", "#120a2e", "#050010"]} // audit-ok: intentional dark bg / custom color
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.doneContainer, { paddingTop: topPad, paddingBottom: botPad }]}
      >
        <View style={[styles.amyBigBubble, { backgroundColor: brand.purple500 }]}>
          <Ionicons name="notifications" size={36} color="#fff" />
        </View>
        <Text style={styles.doneTitle}>{t("screens.onboarding_chat.notif_title")}</Text>
        <Text style={styles.doneSub}>{t("screens.onboarding_chat.notif_subtitle")}</Text>
        <View style={styles.notifBenefits}>
          {[
            "notif_benefit_routines",
            "notif_benefit_bedtime",
            "notif_benefit_meals",
          ].map(key => (
            <View key={key} style={styles.notifBenefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={palette.emerald500} />
              <Text style={styles.notifBenefitText}>{t(`screens.onboarding_chat.${key}`)}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          onPress={requestPush}
          activeOpacity={0.9}
          disabled={notifLoading}
          style={[styles.doneBtnWrap, notifLoading && { opacity: 0.7 }]}
          testID="notif-allow-btn"
        >
          <LinearGradient
            colors={[brand.purple500, brand.pink500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.doneBtn}
          >
            {notifLoading
              ? <ActivityIndicator color="#fff" />
              : <Ionicons name="notifications" size={18} color="#fff" />}
            <Text style={styles.doneBtnText}>
              {notifLoading
                ? t("screens.onboarding_chat.notif_enabling")
                : t("screens.onboarding_chat.notif_allow")}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goDashboard}
          activeOpacity={0.7}
          style={{ paddingVertical: 12, paddingHorizontal: 16 }}
          testID="notif-skip-btn"
        >
          <Text style={{ color: TEXT_MUTED, fontSize: 14, fontFamily: "Inter_500Medium" }}>
            {t("screens.onboarding_chat.notif_skip")}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  if (step === "save-error") {
    return (
      <LinearGradient
        colors={["#0a061a", "#120a2e", "#050010"]} // audit-ok: intentional dark bg / custom color
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.doneContainer, { paddingTop: topPad, paddingBottom: botPad }]}
      >
        <View style={[styles.amyBigBubble, { backgroundColor: palette.red500 }]}>
          <Ionicons name="alert-circle" size={36} color="#fff" />
        </View>
        <Text style={styles.doneTitle}>{t("screens.onboarding_chat.error_title")}</Text>
        <Text style={styles.doneSub}>
          {t("screens.onboarding_chat.error_sub")}
        </Text>
        {saveError ? (
          <Text style={[styles.doneSub, { color: brandExtended.errorSoft, fontSize: 12, marginTop: -8 }]}>{saveError}</Text>
        ) : null}
        <TouchableOpacity
          onPress={() => {
            stepRef.current = "parent-work";
            setStep("parent-work");
          }}
          activeOpacity={0.9}
          style={styles.doneBtnWrap}
          testID="retry-save-btn"
        >
          <LinearGradient
            colors={[brand.purple500, brand.pink500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.doneBtn}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.doneBtnText}>{t("screens.onboarding_chat.try_again")}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  function renderInput(): React.ReactNode {
    switch (step) {
      case "intro":
        return null;

      case "child-name":
        return (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: TEXT_ON_DARK, borderColor: GLASS_BORDER, backgroundColor: GLASS_BG }]}
              value={textInput}
              onChangeText={setTextInput}
              placeholder={t("screens.onboarding_chat.ph_child_name")}
              placeholderTextColor={TEXT_MUTED}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setCurr(c => ({ ...c, name }));
                userReplies(name, "child-dob", t("screens.onboarding_chat.amy_dob_q", { name }));
              }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: PRIMARY }]}
              onPress={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setCurr(c => ({ ...c, name }));
                userReplies(name, "child-dob", t("screens.onboarding_chat.amy_dob_q", { name }));
              }}
            >
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case "child-dob": {
        const maxDate = new Date();
        const minDate = new Date();
        minDate.setFullYear(minDate.getFullYear() - 15);
        const formatDob = (d: Date) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
          if (Platform.OS === "android") setShowDatePicker(false);
          if (date) setDobDate(date);
        };
        return (
          <View style={styles.dobContainer}>
            <TouchableOpacity
              style={[styles.textInput, { flex: 1, justifyContent: "center", borderColor: GLASS_BORDER, backgroundColor: GLASS_BG }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.75}
            >
              <Text style={{ color: TEXT_ON_DARK, fontSize: 15, fontFamily: "Inter_400Regular" }}>
                {formatDob(dobDate)}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              Platform.OS === "ios" ? (
                <Modal transparent animationType="slide">
                  <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
                    <View style={{ backgroundColor: GLASS_BG, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, borderWidth: 1, borderColor: GLASS_BORDER }}>
                      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 }}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={{ color: PRIMARY, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>{t("screens.onboarding_chat.btn_done")}</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={dobDate}
                        mode="date"
                        display="spinner"
                        maximumDate={maxDate}
                        minimumDate={minDate}
                        onChange={onDateChange}
                        style={{ height: 200 }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={dobDate}
                  mode="date"
                  display="default"
                  maximumDate={maxDate}
                  minimumDate={minDate}
                  onChange={onDateChange}
                />
              )
            )}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: PRIMARY }]}
              onPress={() => {
                const dob = formatDob(dobDate);
                const { years, months } = dobToAge(dob);
                const ageGroup: AgeGroup = years < 2 ? "infant" : years < 5 ? "toddler" : "kid";
                setCurr(c => ({ ...c, dob, age: years, ageMonths: months, ageGroup }));
                if (ageGroup === "infant") {
                  userReplies(
                    dob,
                    "infant-feeding",
                    t("screens.onboarding_chat.infant_dob_reply", { name: curr.name }),
                  );
                } else {
                  userReplies(
                    dob,
                    "child-school",
                    t("screens.onboarding_chat.amy_school_q", { name: curr.name }),
                  );
                }
              }}
            >
              <Text style={styles.confirmBtnText}>{t("screens.onboarding_chat.btn_confirm")}</Text>
            </TouchableOpacity>
          </View>
        );
      }

      case "child-school": {
        const schoolOpts: { label: string; isSchool: boolean }[] = [
          { label: t("screens.onboarding_chat.yes_school"), isSchool: true },
          { label: t("screens.onboarding_chat.no_school"), isSchool: false },
        ];
        return (
          <View style={styles.rowBtns}>
            {schoolOpts.map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.optionBtn, { backgroundColor: GLASS_BG, borderColor: GLASS_BORDER }]}
                onPress={() => {
                  setCurr(c => ({ ...c, isSchoolGoing: opt.isSchool }));
                  if (opt.isSchool) {
                    userReplies(opt.label, "child-class", t("screens.onboarding_chat.amy_class_q", { name: curr.name }));
                  } else {
                    setCurr(c => ({ ...c, childClass: "", schoolStartTime: "09:00", schoolEndTime: "15:00" }));
                    userReplies(opt.label, "child-wake", t("screens.onboarding_chat.amy_wake_q", { name: curr.name }));
                  }
                }}
              >
                <Text style={[styles.optionBtnText, { color: TEXT_ON_DARK }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      }

      case "child-class":
        return (
          <View style={styles.chipGrid}>
            {CLASSES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, { backgroundColor: selected === c ? PRIMARY : GLASS_BG, borderColor: selected === c ? PRIMARY : GLASS_BORDER }]}
                onPress={() => {
                  setSelected(c);
                  Haptics.selectionAsync();
                  setCurr(ch => ({ ...ch, childClass: c }));
                  userReplies(c, "child-school-start", t("screens.onboarding_chat.amy_school_start_q"));
                }}
              >
                <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-school-start":
        return (
          <TimePickerField
            initial24h={curr.schoolStartTime ?? "08:00"}
            confirmLabel={t("screens.onboarding_chat.btn_confirm")}
            onConfirm={(display, time24h) => {
              setCurr(c => ({ ...c, schoolStartTime: time24h }));
              userReplies(display, "child-school-end", t("screens.onboarding_chat.amy_school_end_q"));
            }}
          />
        );

      case "child-school-end":
        return (
          <TimePickerField
            initial24h={curr.schoolEndTime ?? "15:00"}
            confirmLabel={t("screens.onboarding_chat.btn_confirm")}
            onConfirm={(display, time24h) => {
              setCurr(c => ({ ...c, schoolEndTime: time24h, schoolDays: c.schoolDays ?? [1, 2, 3, 4, 5] }));
              userReplies(display, "child-school-days", t("screens.onboarding_chat.amy_school_days_q", { name: curr.name }));
            }}
          />
        );

      case "child-school-days": {
        const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const current = curr.schoolDays ?? [1, 2, 3, 4, 5];
        const toggle = (d: number) => {
          Haptics.selectionAsync();
          setCurr(c => {
            const cur = c.schoolDays ?? [1, 2, 3, 4, 5];
            const next = cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d].sort((a, b) => a - b);
            return { ...c, schoolDays: next };
          });
        };
        const summarize = (days: number[]): string => {
          if (days.length === 5 && days.every(d => d <= 5)) return t("screens.onboarding_chat.summary_mon_fri");
          if (days.length === 0) return t("screens.onboarding_chat.summary_no_days");
          return days.map(d => labels[d - 1]).join(", ");
        };
        return (
          <View>
            <View style={styles.chipGrid}>
              {labels.map((label, i) => {
                const day = i + 1;
                const on = current.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.chip, { backgroundColor: on ? PRIMARY : GLASS_BG, borderColor: on ? PRIMARY : GLASS_BORDER }]}
                    onPress={() => toggle(day)}>
                    <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: PRIMARY, borderColor: PRIMARY, marginTop: 12, alignSelf: "stretch", alignItems: "center" }]}
              onPress={() => {
                const days = curr.schoolDays ?? [1, 2, 3, 4, 5];
                userReplies(summarize(days), "child-wake", t("screens.onboarding_chat.amy_wake_q", { name: curr.name }));
              }}>
              <Text style={[styles.chipText, { color: "#fff", fontWeight: "600" }]}>{t("screens.onboarding_chat.btn_continue")}</Text>
            </TouchableOpacity>
          </View>
        );
      }


      case "child-wake":
        return (
          <TimePickerField
            initial24h={curr.wakeUpTime ?? "07:00"}
            confirmLabel={t("screens.onboarding_chat.btn_confirm")}
            onConfirm={(display, time24h) => {
              setCurr(c => ({ ...c, wakeUpTime: time24h }));
              userReplies(display, "child-sleep", t("screens.onboarding_chat.amy_sleep_q", { name: curr.name }));
            }}
          />
        );

      case "child-sleep":
        return (
          <TimePickerField
            initial24h={curr.sleepTime ?? "21:00"}
            confirmLabel={t("screens.onboarding_chat.btn_confirm")}
            onConfirm={(display, time24h) => {
              const finishedChild = {
                ...curr,
                sleepTime: time24h,
                foodType: "veg",
                dietNote: "",
                ageGroup: curr.ageGroup ?? "kid",
              } as ChildData;
              setChildren(cs => [...cs, finishedChild]);
              setCurr({});
              userReplies(display, "add-more", t("screens.onboarding_chat.amy_more_q"));
            }}
          />
        );

      case "infant-feeding":
        return (
          <View style={{ gap: 8 }}>
            <View style={styles.chipGrid}>
              {FEEDING_KEYS.map(opt => {
                const label = t(`screens.onboarding_chat.${opt.key}`);
                return (
                  <TouchableOpacity key={opt.value}
                    style={[styles.chip, { backgroundColor: selected === opt.value ? PRIMARY : GLASS_BG, borderColor: selected === opt.value ? PRIMARY : GLASS_BORDER }]}
                    onPress={() => {
                      setSelected(opt.value); Haptics.selectionAsync();
                      setCurr(c => ({ ...c, feedingType: opt.value }));
                      userReplies(
                        label,
                        "infant-sleep",
                        t("screens.onboarding_chat.feeding_reply", { name: curr.name }),
                      );
                    }}>
                    <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => userReplies(
                t("screens.onboarding_chat.skip_feeding_label"),
                "infant-sleep",
                t("screens.onboarding_chat.skip_sleep_reply", { name: curr.name }),
              )}
              style={{ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12 }}
            >
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{t("screens.onboarding_chat.skip_feeding")}</Text>
            </TouchableOpacity>
          </View>
        );

      case "infant-sleep":
        return (
          <View style={{ gap: 8 }}>
            <View style={styles.chipGrid}>
              {INFANT_SLEEP_KEYS.map(opt => {
                const label = t(`screens.onboarding_chat.${opt.key}`);
                return (
                  <TouchableOpacity key={opt.value}
                    style={[styles.chip, { backgroundColor: selected === opt.value ? PRIMARY : GLASS_BG, borderColor: selected === opt.value ? PRIMARY : GLASS_BORDER }]}
                    onPress={() => {
                      setSelected(opt.value); Haptics.selectionAsync();
                      const finishedChild = {
                        ...curr,
                        sleepPattern: opt.value,
                        isSchoolGoing: false,
                        childClass: "",
                        schoolStartTime: "09:00",
                        schoolEndTime: "15:00",
                        schoolDays: null,
                        wakeUpTime: "07:00",
                        sleepTime: "21:00",
                        foodType: "veg",
                        dietNote: "",
                      } as ChildData;
                      setChildren(cs => [...cs, finishedChild]);
                      setCurr({});
                      userReplies(label, "add-more", t("screens.onboarding_chat.amy_more_q"));
                    }}>
                    <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case "add-more": {
        const addMoreOpts: { label: string; isYes: boolean }[] = [
          { label: t("screens.onboarding_chat.yes_add"), isYes: true },
          { label: t("screens.onboarding_chat.no_continue"), isYes: false },
        ];
        return (
          <View style={styles.rowBtns}>
            {addMoreOpts.map(opt => (
              <TouchableOpacity key={opt.label}
                style={[styles.optionBtn, { backgroundColor: GLASS_BG, borderColor: GLASS_BORDER }]}
                onPress={() => {
                  if (opt.isYes) {
                    userReplies(opt.label, "child-name", t("screens.onboarding_chat.amy_next_child_q"));
                  } else {
                    userReplies(opt.label, "parent-name", t("screens.onboarding_chat.amy_parent_name_q"));
                  }
                }}>
                <Text style={[styles.optionBtnText, { color: TEXT_ON_DARK }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      }

      case "parent-name":
        return (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: TEXT_ON_DARK, borderColor: GLASS_BORDER, backgroundColor: GLASS_BG }]}
              value={textInput}
              onChangeText={setTextInput}
              placeholder={t("screens.onboarding_chat.ph_your_name")}
              placeholderTextColor={TEXT_MUTED}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setParent(p => ({ ...p, name }));
                userReplies(name, "parent-role", t("screens.onboarding_chat.amy_role_q", { name }));
              }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: PRIMARY }]}
              onPress={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setParent(p => ({ ...p, name }));
                userReplies(name, "parent-role", t("screens.onboarding_chat.amy_role_q", { name }));
              }}
            >
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case "parent-role":
        return (
          <View style={styles.chipGrid}>
            {ROLE_KEYS.map(r => {
              const label = t(`screens.onboarding_chat.${r.key}`);
              return (
                <TouchableOpacity key={r.value}
                  style={[styles.chip, { backgroundColor: selected === r.value ? PRIMARY : GLASS_BG, borderColor: selected === r.value ? PRIMARY : GLASS_BORDER }]}
                  onPress={() => {
                    setSelected(r.value); Haptics.selectionAsync();
                    setParent(p => ({ ...p, role: r.value }));
                    userReplies(label, "parent-work", t("screens.onboarding_chat.amy_work_q"));
                  }}>
                  <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case "parent-work":
        return (
          <View style={styles.chipGrid}>
            {WORK_TYPE_KEYS.map(wt => {
              const label = t(`screens.onboarding_chat.${wt.key}`);
              return (
                <TouchableOpacity key={wt.value}
                  style={[styles.chip, { backgroundColor: selected === wt.value ? PRIMARY : GLASS_BG, borderColor: selected === wt.value ? PRIMARY : GLASS_BORDER }]}
                  onPress={() => {
                    setSelected(wt.value); Haptics.selectionAsync();
                    setParent(p => ({ ...p, workType: wt.value }));
                    userReplies(label, "parent-region", t("screens.onboarding_chat.amy_region_q"));
                  }}>
                  <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case "parent-region": {
        const globalRegionOpts = [
          { label: t("screens.onboarding_chat.region_western"),        value: "western" },
          { label: t("screens.onboarding_chat.region_asian"),          value: "asian" },
          { label: t("screens.onboarding_chat.region_middle_eastern"), value: "middle_eastern" },
          { label: t("screens.onboarding_chat.region_plant_based"),    value: "vegetarian" },
          { label: t("screens.onboarding_chat.region_mixed"),          value: "mixed" },
          { label: t("screens.onboarding_chat.region_indian"),         value: "indian" },
        ];
        const indianRegionOpts = [
          { label: t("screens.onboarding_chat.region_north"),          value: "north_indian" },
          { label: t("screens.onboarding_chat.region_south"),          value: "south_indian" },
          { label: t("screens.onboarding_chat.region_gujarati"),       value: "gujarati" },
          { label: t("screens.onboarding_chat.region_maharashtrian"),  value: "maharashtrian" },
          { label: t("screens.onboarding_chat.region_punjabi"),        value: "punjabi" },
          { label: t("screens.onboarding_chat.region_bengali"),        value: "bengali" },
          { label: t("screens.onboarding_chat.region_mixed_indian"),   value: "pan_indian" },
        ];
        const regionOpts = regionDrillDown ? indianRegionOpts : globalRegionOpts;
        return (
          <View style={styles.chipGrid}>
            {regionOpts.map(opt => (
              <TouchableOpacity key={opt.value}
                style={[styles.chip, { backgroundColor: selected === opt.value ? PRIMARY : GLASS_BG, borderColor: selected === opt.value ? PRIMARY : GLASS_BORDER }]}
                onPress={() => {
                  if (!regionDrillDown && opt.value === "indian") {
                    setRegionDrillDown(true);
                    Haptics.selectionAsync();
                    setMessages(m => [...m, { id: Date.now().toString(), role: "amy", text: t("screens.onboarding_chat.region_indian_drilldown") }]);
                    return;
                  }
                  setRegionDrillDown(false);
                  setSelected(opt.value);
                  Haptics.selectionAsync();
                  setParent(p => ({ ...p, region: opt.value }));
                  userReplies(opt.label, "parent-mobile", t("screens.onboarding_chat.amy_mobile_q"));
                }}>
                <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      }

      case "parent-mobile":
        return (
          <View style={{ gap: 8 }}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: TEXT_ON_DARK, borderColor: GLASS_BORDER, backgroundColor: GLASS_BG }]}
                value={textInput}
                onChangeText={setTextInput}
                placeholder={t("screens.onboarding_chat.ph_mobile")}
                placeholderTextColor={TEXT_MUTED}
                keyboardType="phone-pad"
                autoFocus
                returnKeyType="send"
                onSubmitEditing={() => {
                  const m = textInput.trim();
                  if (!m) return;
                  setParent(p => ({ ...p, mobileNumber: m }));
                  userReplies(m, "parent-allergies", t("screens.onboarding_chat.amy_allergies_q"));
                }}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: PRIMARY }]}
                onPress={() => {
                  const m = textInput.trim();
                  if (!m) return;
                  setParent(p => ({ ...p, mobileNumber: m }));
                  userReplies(m, "parent-allergies", t("screens.onboarding_chat.amy_allergies_q"));
                }}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => userReplies(t("screens.onboarding_chat.skip_mobile"), "parent-allergies", t("screens.onboarding_chat.amy_allergies_q"))}
              style={{ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{t("screens.onboarding_chat.skip_mobile")}</Text>
            </TouchableOpacity>
          </View>
        );

      case "parent-allergies":
        return (
          <View style={{ gap: 8 }}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: TEXT_ON_DARK, borderColor: GLASS_BORDER, backgroundColor: GLASS_BG }]}
                value={textInput}
                onChangeText={setTextInput}
                placeholder={t("screens.onboarding_chat.ph_allergies")}
                placeholderTextColor={TEXT_MUTED}
                autoFocus
                returnKeyType="send"
                onSubmitEditing={() => {
                  const a = textInput.trim();
                  if (!a) return;
                  const updatedParent = { ...parent, allergies: a } as ParentData;
                  setParent(updatedParent);
                  userReplies(a, "saving");
                  setTimeout(() => saveEverything(updatedParent, children), 800);
                }}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: PRIMARY }]}
                onPress={() => {
                  const a = textInput.trim();
                  if (!a) return;
                  const updatedParent = { ...parent, allergies: a } as ParentData;
                  setParent(updatedParent);
                  userReplies(a, "saving");
                  setTimeout(() => saveEverything(updatedParent, children), 800);
                }}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                const updatedParent = { ...parent } as ParentData;
                userReplies(t("screens.onboarding_chat.skip_allergies"), "saving");
                setTimeout(() => saveEverything(updatedParent, children), 800);
              }}
              style={{ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 13, color: TEXT_MUTED }}>{t("screens.onboarding_chat.skip_allergies")}</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  }

  const inputNode = renderInput();

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#0a061a", "#120a2e", "#050010"]} // audit-ok: intentional dark bg / custom color
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: "rgba(10,6,26,0.80)" }]}>
        <View style={styles.amyRow}>
          <Image
            source={require("../assets/images/amynest-logo.png")}
            style={styles.amyAvatar}
            resizeMode="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.amyName}>{t("screens.onboarding.amy")}</Text>
            <Text style={styles.amyStatus}>{t("screens.onboarding_chat.amy_status")}</Text>
          </View>
          {progressTotal > 0 && progressCurrent > 0 ? (
            <Text style={styles.progressLabel}>
              {t("screens.onboarding_chat.progress_label", { current: progressCurrent, total: progressTotal })}
            </Text>
          ) : null}
        </View>
        {progressTotal > 0 ? (
          <View style={styles.progressTrack} accessibilityRole="progressbar">
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            >
              <LinearGradient
                colors={[brand.purple500, brand.pink500]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          typing ? (
            <View style={[styles.msgRow, { justifyContent: "flex-start" }]}>
              <Image
                source={require("../assets/images/amynest-logo.png")}
                style={{ width: 28, height: 28, borderRadius: 14 }}
                resizeMode="cover"
              />
              <View style={[styles.typingBubble, styles.bubbleAmy]}>
                <Animated.View style={[styles.dot, { backgroundColor: PRIMARY, opacity: dotA, transform: [{ scale: dotA.interpolate({ inputRange: [0.35, 1], outputRange: [0.8, 1.15] }) }] }]} />
                <Animated.View style={[styles.dot, { backgroundColor: PRIMARY, opacity: dotB, transform: [{ scale: dotB.interpolate({ inputRange: [0.35, 1], outputRange: [0.8, 1.15] }) }] }]} />
                <Animated.View style={[styles.dot, { backgroundColor: PRIMARY, opacity: dotC, transform: [{ scale: dotC.interpolate({ inputRange: [0.35, 1], outputRange: [0.8, 1.15] }) }] }]} />
              </View>
            </View>
          ) : null
        }
        renderItem={({ item: m }) => (
          <View style={[styles.msgRow, { justifyContent: m.role === "amy" ? "flex-start" : "flex-end" }]}>
            {m.role === "amy" && (
              <Image
                source={require("../assets/images/amynest-logo.png")}
                style={{ width: 28, height: 28, borderRadius: 14 }}
                resizeMode="cover"
              />
            )}
            <View style={[
              styles.bubble,
              m.role === "amy"
                ? styles.bubbleAmy
                : styles.bubbleUser,
            ]}>
              <Text style={[styles.bubbleText, { color: "#fff" }]}>{m.text}</Text>
            </View>
          </View>
        )}
      />

      {inputNode && (
        <View style={[styles.inputContainer, { paddingBottom: botPad + 16, borderTopColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(10,6,26,0.85)" }]}>
          {inputNode}
          <Text style={{ textAlign: "center", fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase", color: "rgba(168,85,247,0.38)", marginTop: 8, marginBottom: 2 }}>
            {t("patent_pending.powered_by")}
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 12 },
  amyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  amyAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  amyName: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: -0.2 },
  amyStatus: { fontSize: 11, fontFamily: "Inter_500Medium", color: palette.emerald500 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 },
  bubble: { maxWidth: "78%", padding: 12, borderRadius: 18, borderWidth: 1, borderColor: "transparent" },
  bubbleAmy: { backgroundColor: "rgba(18,4,45,0.80)", borderColor: "rgba(168,85,247,0.22)" },
  bubbleUser: { backgroundColor: brand.purple500 },
  bubbleText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  typingBubble: { flexDirection: "row", gap: 4, padding: 14, borderRadius: 18, borderWidth: 1, alignItems: "center" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  inputContainer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  textInput: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  sendBtn: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dobContainer: { flexDirection: "row", gap: 10, alignItems: "center" },
  confirmBtn: { paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  rowBtns: { flexDirection: "row", gap: 10 },
  optionBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", borderWidth: 1.5 },
  optionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  doneContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 32 },
  amyBigBubble: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center", color: "#FFFFFF", letterSpacing: -0.4 },
  doneSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", color: "rgba(255,255,255,0.65)" },
  doneBtnWrap: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  doneBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 16 },
  doneBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16, letterSpacing: 0.1 },
  progressLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(200,180,255,0.65)", marginLeft: 8 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: { height: 4, borderRadius: 2, overflow: "hidden" },
  notifBenefits: { gap: 10, marginTop: 8, marginBottom: 8, alignSelf: "stretch" },
  notifBenefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  notifBenefitText: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
});
