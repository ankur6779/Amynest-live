import React, {   useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Platform, ActivityIndicator, KeyboardAvoidingView, Alert, Image, Modal,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useUser } from "@/lib/firebase-auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import * as Haptics from "expo-haptics";
import { brand, palette, brandExtended } from "@/constants/colors";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

type ChatRole = "amy" | "user";
type ChatMsg = { id: string; role: ChatRole; text: string };
type Step =
  | "intro" | "child-name" | "child-dob" | "child-school" | "child-class"
  | "child-school-start" | "child-school-end" | "child-school-days"
  | "child-wake" | "child-sleep"
  | "child-food" | "add-more" | "parent-name" | "parent-role" | "parent-work"
  | "parent-region" | "parent-mobile" | "parent-allergies"
  | "saving" | "save-error" | "done";

type ChildData = {
  name: string; dob: string; age: number; ageMonths: number;
  isSchoolGoing: boolean; childClass: string;
  schoolStartTime: string; schoolEndTime: string;
  schoolDays: number[] | null; // ISO weekdays (1=Mon..7=Sun); null when not school-going
  wakeUpTime: string; sleepTime: string; foodType: string;
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
  { key: "work_homemaker", value: "homemaker" },
];

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
  const listRef = useRef<FlatList<ChatMsg>>(null);
  const stepRef = useRef<Step>("intro");

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
            goals: "balanced-routine",
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
      await qc.invalidateQueries({ queryKey: ["onboarding-status"] });
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
          onPress={() => {
            qc.setQueryData(["onboarding-status"], { onboardingComplete: true, profileComplete: true });
            router.replace("/(tabs)");
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
            <Text style={styles.doneBtnText}>{t("screens.onboarding_chat.go_dashboard")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
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
                setCurr(c => ({ ...c, dob, age: years, ageMonths: months }));
                userReplies(dob, "child-school", t("screens.onboarding_chat.amy_school_q", { name: curr.name }));
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
          <View style={styles.chipGrid}>
            {SCHOOL_START.map(time => (
              <TouchableOpacity key={time}
                style={[styles.chip, { backgroundColor: selected === time ? PRIMARY : GLASS_BG, borderColor: selected === time ? PRIMARY : GLASS_BORDER }]}
                onPress={() => {
                  setSelected(time); Haptics.selectionAsync();
                  setCurr(c => ({ ...c, schoolStartTime: to24h(time) }));
                  userReplies(time, "child-school-end", t("screens.onboarding_chat.amy_school_end_q"));
                }}>
                <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-school-end":
        return (
          <View style={styles.chipGrid}>
            {SCHOOL_END.map(time => (
              <TouchableOpacity key={time}
                style={[styles.chip, { backgroundColor: selected === time ? PRIMARY : GLASS_BG, borderColor: selected === time ? PRIMARY : GLASS_BORDER }]}
                onPress={() => {
                  setSelected(time); Haptics.selectionAsync();
                  setCurr(c => ({ ...c, schoolEndTime: to24h(time), schoolDays: c.schoolDays ?? [1, 2, 3, 4, 5] }));
                  userReplies(time, "child-school-days", t("screens.onboarding_chat.amy_school_days_q", { name: curr.name }));
                }}>
                <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
          <View style={styles.chipGrid}>
            {WAKE_OPTS.map(time => (
              <TouchableOpacity key={time}
                style={[styles.chip, { backgroundColor: selected === time ? PRIMARY : GLASS_BG, borderColor: selected === time ? PRIMARY : GLASS_BORDER }]}
                onPress={() => {
                  setSelected(time); Haptics.selectionAsync();
                  setCurr(c => ({ ...c, wakeUpTime: to24h(time) }));
                  userReplies(time, "child-sleep", t("screens.onboarding_chat.amy_sleep_q", { name: curr.name }));
                }}>
                <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-sleep":
        return (
          <View style={styles.chipGrid}>
            {SLEEP_OPTS.map(time => (
              <TouchableOpacity key={time}
                style={[styles.chip, { backgroundColor: selected === time ? PRIMARY : GLASS_BG, borderColor: selected === time ? PRIMARY : GLASS_BORDER }]}
                onPress={() => {
                  setSelected(time); Haptics.selectionAsync();
                  setCurr(c => ({ ...c, sleepTime: to24h(time) }));
                  userReplies(time, "child-food", t("screens.onboarding_chat.amy_food_q", { name: curr.name }));
                }}>
                <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{time}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-food": {
        const foodOpts: { label: string; value: "veg" | "nonveg" | "egg" }[] = [
          { label: t("screens.onboarding_chat.food_veg"), value: "veg" },
          { label: t("screens.onboarding_chat.food_nonveg"), value: "nonveg" },
          { label: t("screens.onboarding_chat.food_egg"), value: "egg" },
        ];
        return (
          <View style={styles.chipGrid}>
            {foodOpts.map(opt => (
              <TouchableOpacity key={opt.value}
                style={[styles.chip, { backgroundColor: selected === opt.label ? PRIMARY : GLASS_BG, borderColor: selected === opt.label ? PRIMARY : GLASS_BORDER }]}
                onPress={() => {
                  setSelected(opt.label); Haptics.selectionAsync();
                  const finishedChild = { ...curr, foodType: opt.value } as ChildData;
                  setChildren(cs => [...cs, finishedChild]);
                  setCurr({});
                  userReplies(opt.label, "add-more", t("screens.onboarding_chat.amy_more_q"));
                }}>
                <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      }

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

      case "parent-region":
        return (
          <View style={styles.chipGrid}>
            {REGION_KEYS.map(opt => {
              const label = t(`screens.onboarding_chat.${opt.key}`);
              return (
                <TouchableOpacity key={opt.value}
                  style={[styles.chip, { backgroundColor: selected === opt.value ? PRIMARY : GLASS_BG, borderColor: selected === opt.value ? PRIMARY : GLASS_BORDER }]}
                  onPress={() => {
                    setSelected(opt.value); Haptics.selectionAsync();
                    setParent(p => ({ ...p, region: opt.value }));
                    userReplies(label, "parent-mobile", t("screens.onboarding_chat.amy_mobile_q"));
                  }}>
                  <Text style={[styles.chipText, { color: TEXT_ON_DARK }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

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
          <View>
            <Text style={styles.amyName}>Amy</Text>
            <Text style={styles.amyStatus}>{t("screens.onboarding_chat.amy_status")}</Text>
          </View>
        </View>
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
                <View style={[styles.dot, { backgroundColor: PRIMARY }]} />
                <View style={[styles.dot, { backgroundColor: PRIMARY }]} />
                <View style={[styles.dot, { backgroundColor: PRIMARY }]} />
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
});
