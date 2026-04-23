import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import * as Haptics from "expo-haptics";
import { brand } from "@/constants/colors";

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
const ROLES = ["Mother", "Father", "Both", "Grandparent"];
const WORK_TYPES: { label: string; value: string }[] = [
  { label: "Work from Home", value: "work_from_home" },
  { label: "Office Job", value: "office" },
  { label: "Not Working", value: "not_working" },
  { label: "Homemaker", value: "homemaker" },
];

const REGION_OPTS: { label: string; value: string }[] = [
  { label: "Pan-Indian (Mixed)", value: "pan_indian" },
  { label: "North Indian", value: "north_indian" },
  { label: "South Indian", value: "south_indian" },
  { label: "Bengali", value: "bengali" },
  { label: "Gujarati", value: "gujarati" },
  { label: "Maharashtrian", value: "maharashtrian" },
  { label: "Punjabi", value: "punjabi" },
  { label: "Global / Continental", value: "global" },
];

const PRIMARY = brand.indigo500;

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

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
    const firstName = user?.firstName || "there";
    setTimeout(() => {
      addMsg("amy", `Hi ${firstName}! I'm Amy, your parenting coach. Let me set up your profile — it'll take about 2 minutes!`);
      setTimeout(() => amySays("Let's start — what's your child's name?", 800), 1200);
      setTimeout(() => { stepRef.current = "child-name"; setStep("child-name"); }, 2200);
    }, 600);
  }, []);

  const saveEverything = async (finalParent: ParentData, finalChildren: ChildData[]) => {
    stepRef.current = "saving";
    setStep("saving");
    addMsg("amy", "Saving your profile now...");

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

      qc.invalidateQueries();
      stepRef.current = "done";
      setStep("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setSaveError(message);
      stepRef.current = "save-error";
      setStep("save-error");
      addMsg("amy", "Something went wrong saving your profile. Please try again.");
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (step === "saving") {
    return (
      <View style={[styles.doneContainer, { paddingTop: topPad, paddingBottom: botPad, backgroundColor: colors.background }]}>
        <Image
          source={require("../assets/images/amynest-logo.png")}
          style={styles.amyBigBubble}
          resizeMode="cover"
        />
        <Text style={[styles.doneTitle, { color: colors.foreground }]}>Amy is setting up your profile...</Text>
        <ActivityIndicator color={PRIMARY} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (step === "done") {
    return (
      <View style={[styles.doneContainer, { paddingTop: topPad, paddingBottom: botPad, backgroundColor: colors.background }]}>
        <View style={[styles.amyBigBubble, { backgroundColor: "#10B981" }]}>
          <Ionicons name="checkmark" size={36} color="#fff" />
        </View>
        <Text style={[styles.doneTitle, { color: colors.foreground }]}>Profile ready!</Text>
        <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>All set for {children[0]?.name ?? "your child"}</Text>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: PRIMARY }]}
          onPress={() => router.replace("/(tabs)")}
          testID="go-dashboard-btn"
        >
          <Text style={styles.doneBtnText}>Go to Dashboard</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  if (step === "save-error") {
    return (
      <View style={[styles.doneContainer, { paddingTop: topPad, paddingBottom: botPad, backgroundColor: colors.background }]}>
        <View style={[styles.amyBigBubble, { backgroundColor: "#EF4444" }]}>
          <Ionicons name="alert-circle" size={36} color="#fff" />
        </View>
        <Text style={[styles.doneTitle, { color: colors.foreground }]}>Something went wrong</Text>
        <Text style={[styles.doneSub, { color: colors.mutedForeground }]}>
          We couldn't save your profile. Check your connection and try again.
        </Text>
        {saveError ? (
          <Text style={[styles.doneSub, { color: "#EF4444", fontSize: 12, marginTop: -8 }]}>{saveError}</Text>
        ) : null}
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: PRIMARY }]}
          onPress={() => {
            stepRef.current = "parent-work";
            setStep("parent-work");
          }}
          testID="retry-save-btn"
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.doneBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
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
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Child's name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setCurr(c => ({ ...c, name }));
                userReplies(name, "child-dob", `Nice! When is ${name}'s date of birth?`);
              }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: PRIMARY }]}
              onPress={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setCurr(c => ({ ...c, name }));
                userReplies(name, "child-dob", `Nice! When is ${name}'s date of birth?`);
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
              style={[styles.textInput, { flex: 1, justifyContent: "center", borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.75}
            >
              <Text style={{ color: colors.foreground, fontSize: 15, fontFamily: "Inter_400Regular" }}>
                {formatDob(dobDate)}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              Platform.OS === "ios" ? (
                <Modal transparent animationType="slide">
                  <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
                    <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 }}>
                      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 }}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={{ color: PRIMARY, fontSize: 16, fontFamily: "Inter_600SemiBold" }}>Done</Text>
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
                userReplies(dob, "child-school", `Is ${curr.name} going to school?`);
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        );
      }

      case "child-school":
        return (
          <View style={styles.rowBtns}>
            {["Yes, school going", "No, not yet"].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.optionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  const isSchool = opt.startsWith("Yes");
                  setCurr(c => ({ ...c, isSchoolGoing: isSchool }));
                  if (isSchool) {
                    userReplies(opt, "child-class", `Which class is ${curr.name} in?`);
                  } else {
                    setCurr(c => ({ ...c, childClass: "", schoolStartTime: "09:00", schoolEndTime: "15:00" }));
                    userReplies(opt, "child-wake", `What time does ${curr.name} wake up?`);
                  }
                }}
              >
                <Text style={[styles.optionBtnText, { color: colors.foreground }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-class":
        return (
          <View style={styles.chipGrid}>
            {CLASSES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, { backgroundColor: selected === c ? PRIMARY : colors.card, borderColor: selected === c ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(c);
                  Haptics.selectionAsync();
                  setCurr(ch => ({ ...ch, childClass: c }));
                  userReplies(c, "child-school-start", "What time does school start?");
                }}
              >
                <Text style={[styles.chipText, { color: selected === c ? "#fff" : colors.foreground }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-school-start":
        return (
          <View style={styles.chipGrid}>
            {SCHOOL_START.map(t => (
              <TouchableOpacity key={t}
                style={[styles.chip, { backgroundColor: selected === t ? PRIMARY : colors.card, borderColor: selected === t ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(t); Haptics.selectionAsync();
                  setCurr(c => ({ ...c, schoolStartTime: to24h(t) }));
                  userReplies(t, "child-school-end", "And school ends at?");
                }}>
                <Text style={[styles.chipText, { color: selected === t ? "#fff" : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-school-end":
        return (
          <View style={styles.chipGrid}>
            {SCHOOL_END.map(t => (
              <TouchableOpacity key={t}
                style={[styles.chip, { backgroundColor: selected === t ? PRIMARY : colors.card, borderColor: selected === t ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(t); Haptics.selectionAsync();
                  setCurr(c => ({ ...c, schoolEndTime: to24h(t), schoolDays: c.schoolDays ?? [1, 2, 3, 4, 5] }));
                  userReplies(t, "child-school-days", `Which days does ${curr.name} have school?`);
                }}>
                <Text style={[styles.chipText, { color: selected === t ? "#fff" : colors.foreground }]}>{t}</Text>
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
          if (days.length === 5 && days.every(d => d <= 5)) return "Mon–Fri";
          if (days.length === 0) return "No school days";
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
                    style={[styles.chip, { backgroundColor: on ? PRIMARY : colors.card, borderColor: on ? PRIMARY : colors.border }]}
                    onPress={() => toggle(day)}>
                    <Text style={[styles.chipText, { color: on ? "#fff" : colors.foreground }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: PRIMARY, borderColor: PRIMARY, marginTop: 12, alignSelf: "stretch", alignItems: "center" }]}
              onPress={() => {
                const days = curr.schoolDays ?? [1, 2, 3, 4, 5];
                userReplies(summarize(days), "child-wake", `What time does ${curr.name} wake up?`);
              }}>
              <Text style={[styles.chipText, { color: "#fff", fontWeight: "600" }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        );
      }


      case "child-wake":
        return (
          <View style={styles.chipGrid}>
            {WAKE_OPTS.map(t => (
              <TouchableOpacity key={t}
                style={[styles.chip, { backgroundColor: selected === t ? PRIMARY : colors.card, borderColor: selected === t ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(t); Haptics.selectionAsync();
                  setCurr(c => ({ ...c, wakeUpTime: to24h(t) }));
                  userReplies(t, "child-sleep", `And bedtime for ${curr.name}?`);
                }}>
                <Text style={[styles.chipText, { color: selected === t ? "#fff" : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-sleep":
        return (
          <View style={styles.chipGrid}>
            {SLEEP_OPTS.map(t => (
              <TouchableOpacity key={t}
                style={[styles.chip, { backgroundColor: selected === t ? PRIMARY : colors.card, borderColor: selected === t ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(t); Haptics.selectionAsync();
                  setCurr(c => ({ ...c, sleepTime: to24h(t) }));
                  userReplies(t, "child-food", `What does ${curr.name} eat?`);
                }}>
                <Text style={[styles.chipText, { color: selected === t ? "#fff" : colors.foreground }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "child-food": {
        const foodOpts: { label: string; value: "veg" | "nonveg" | "egg" }[] = [
          { label: "Vegetarian", value: "veg" },
          { label: "Non-Vegetarian", value: "nonveg" },
          { label: "Eggetarian", value: "egg" },
        ];
        return (
          <View style={styles.chipGrid}>
            {foodOpts.map(opt => (
              <TouchableOpacity key={opt.value}
                style={[styles.chip, { backgroundColor: selected === opt.label ? PRIMARY : colors.card, borderColor: selected === opt.label ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(opt.label); Haptics.selectionAsync();
                  const finishedChild = { ...curr, foodType: opt.value } as ChildData;
                  setChildren(cs => [...cs, finishedChild]);
                  setCurr({});
                  userReplies(opt.label, "add-more", "Got it! Do you have another child to add?");
                }}>
                <Text style={[styles.chipText, { color: selected === opt.label ? "#fff" : colors.foreground }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      }

      case "add-more":
        return (
          <View style={styles.rowBtns}>
            {["Yes, add another", "No, continue"].map(opt => (
              <TouchableOpacity key={opt}
                style={[styles.optionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  if (opt.startsWith("Yes")) {
                    userReplies(opt, "child-name", "Great! What's the next child's name?");
                  } else {
                    userReplies(opt, "parent-name", "Almost done! What's your name?");
                  }
                }}>
                <Text style={[styles.optionBtnText, { color: colors.foreground }]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "parent-name":
        return (
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
              value={textInput}
              onChangeText={setTextInput}
              placeholder="Your name"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setParent(p => ({ ...p, name }));
                userReplies(name, "parent-role", `Nice to meet you, ${name}! What's your role?`);
              }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: PRIMARY }]}
              onPress={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setParent(p => ({ ...p, name }));
                userReplies(name, "parent-role", `Nice to meet you, ${name}! What's your role?`);
              }}
            >
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case "parent-role":
        return (
          <View style={styles.chipGrid}>
            {ROLES.map(r => (
              <TouchableOpacity key={r}
                style={[styles.chip, { backgroundColor: selected === r ? PRIMARY : colors.card, borderColor: selected === r ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(r); Haptics.selectionAsync();
                  setParent(p => ({ ...p, role: r }));
                  userReplies(r, "parent-work", "And your work situation?");
                }}>
                <Text style={[styles.chipText, { color: selected === r ? "#fff" : colors.foreground }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "parent-work":
        return (
          <View style={styles.chipGrid}>
            {WORK_TYPES.map(wt => (
              <TouchableOpacity key={wt.value}
                style={[styles.chip, { backgroundColor: selected === wt.value ? PRIMARY : colors.card, borderColor: selected === wt.value ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(wt.value); Haptics.selectionAsync();
                  setParent(p => ({ ...p, workType: wt.value }));
                  userReplies(wt.label, "parent-region", "Which regional cuisine should Amy plan meals from? 🍛");
                }}>
                <Text style={[styles.chipText, { color: selected === wt.value ? "#fff" : colors.foreground }]}>{wt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "parent-region":
        return (
          <View style={styles.chipGrid}>
            {REGION_OPTS.map(opt => (
              <TouchableOpacity key={opt.value}
                style={[styles.chip, { backgroundColor: selected === opt.value ? PRIMARY : colors.card, borderColor: selected === opt.value ? PRIMARY : colors.border }]}
                onPress={() => {
                  setSelected(opt.value); Haptics.selectionAsync();
                  setParent(p => ({ ...p, region: opt.value }));
                  userReplies(opt.label, "parent-mobile", "📱 What's your mobile number for reminders? (You can skip this.)");
                }}>
                <Text style={[styles.chipText, { color: selected === opt.value ? "#fff" : colors.foreground }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case "parent-mobile":
        return (
          <View style={{ gap: 8 }}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="phone-pad"
                autoFocus
                returnKeyType="send"
                onSubmitEditing={() => {
                  const m = textInput.trim();
                  if (!m) return;
                  setParent(p => ({ ...p, mobileNumber: m }));
                  userReplies(m, "parent-allergies", "🌾 Any food allergies to avoid in meal plans? (Skip if none.)");
                }}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: PRIMARY }]}
                onPress={() => {
                  const m = textInput.trim();
                  if (!m) return;
                  setParent(p => ({ ...p, mobileNumber: m }));
                  userReplies(m, "parent-allergies", "🌾 Any food allergies to avoid in meal plans? (Skip if none.)");
                }}>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => userReplies("Skip — I'll add it later", "parent-allergies", "🌾 Any food allergies to avoid in meal plans? (Skip if none.)")}
              style={{ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Skip — I'll add it later</Text>
            </TouchableOpacity>
          </View>
        );

      case "parent-allergies":
        return (
          <View style={{ gap: 8 }}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
                value={textInput}
                onChangeText={setTextInput}
                placeholder="e.g. peanuts, dairy, shellfish..."
                placeholderTextColor={colors.mutedForeground}
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
                userReplies("Skip — no allergies", "saving");
                setTimeout(() => saveEverything(updatedParent, children), 800);
              }}
              style={{ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Skip — no allergies</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  }

  const inputNode = renderInput();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <View style={styles.amyRow}>
          <Image
            source={require("../assets/images/amynest-logo.png")}
            style={styles.amyAvatar}
            resizeMode="cover"
          />
          <View>
            <Text style={[styles.amyName, { color: colors.foreground }]}>Amy</Text>
            <Text style={[styles.amyStatus, { color: "#10B981" }]}>Parenting Coach</Text>
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
              <View style={[styles.typingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                ? { backgroundColor: colors.card, borderColor: colors.border }
                : { backgroundColor: PRIMARY },
            ]}>
              <Text style={[styles.bubbleText, { color: m.role === "amy" ? colors.foreground : "#fff" }]}>{m.text}</Text>
            </View>
          </View>
        )}
      />

      {inputNode && (
        <View style={[styles.inputContainer, { paddingBottom: botPad + 16, borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {inputNode}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 12 },
  amyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  amyAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  amyName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  amyStatus: { fontSize: 11, fontFamily: "Inter_500Medium" },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 12 },
  bubble: { maxWidth: "78%", padding: 12, borderRadius: 18, borderWidth: 1, borderColor: "transparent" },
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
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  doneSub: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center" },
  doneBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16, marginTop: 8 },
  doneBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
