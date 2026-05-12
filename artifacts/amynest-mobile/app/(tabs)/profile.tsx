import React, {  useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, Linking,
} from "react-native";
import { useSubscriptionStore } from "@/store/useSubscriptionStore";
import { useUser, useAuth } from "@/lib/firebase-auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Switch } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, brandAlpha, palette } from "@/constants/colors";
import { BRAND } from "@/constants/brand";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

type Colors = ReturnType<typeof useColors>;

type FreeSlot = { start: string; end: string };

type ParentProfile = {
  id?: number;
  name?: string;
  role: string;
  workType: string;
  gender?: string;
  mobileNumber?: string;
  workStartTime?: string;
  workEndTime?: string;
  freeSlots?: FreeSlot[];
  foodType?: string;
  allergies?: string;
  region?: string;
  dietType?: string;
  foodStyle?: string;
  subCuisine?: string;
};

type Child = { id: number };

const ROLES: { label: string; value: string }[] = [
  { label: "Mother", value: "mother" },
  { label: "Father", value: "father" },
];
const GENDERS: { label: string; value: string }[] = [
  { label: "Female", value: "female" },
  { label: "Male", value: "male" },
  { label: "Prefer not to say", value: "" },
];
const WORK_TYPES: { label: string; value: string }[] = [
  { label: "Work from Home", value: "work_from_home" },
  { label: "Work from Office", value: "work_from_office" },
  { label: "Housewife / Homemaker", value: "homemaker" },
];

const DIET_OPTIONS: { label: string; value: string; emoji: string }[] = [
  { label: "Vegetarian", value: "vegetarian", emoji: "🥦" },
  { label: "Vegan", value: "vegan", emoji: "🌱" },
  { label: "Eggetarian", value: "eggetarian", emoji: "🥚" },
  { label: "Non-Veg", value: "non_veg", emoji: "🍗" },
  { label: "Pescatarian", value: "pescatarian", emoji: "🐟" },
  { label: "No Preference", value: "no_preference", emoji: "✨" },
];

const FOOD_STYLE_OPTIONS: { label: string; value: string; emoji: string }[] = [
  { label: "Indian", value: "indian", emoji: "🍛" },
  { label: "Western", value: "western", emoji: "🍕" },
  { label: "Asian", value: "asian", emoji: "🍜" },
  { label: "Middle Eastern", value: "middle_eastern", emoji: "🧆" },
  { label: "Mixed", value: "mixed", emoji: "🌍" },
];

const INDIAN_SUB_OPTIONS: { label: string; value: string; emoji: string }[] = [
  { label: "North Indian", value: "north_indian", emoji: "🫓" },
  { label: "South Indian", value: "south_indian", emoji: "🍚" },
  { label: "Bengali", value: "bengali", emoji: "🐟" },
  { label: "Gujarati", value: "gujarati", emoji: "🧆" },
  { label: "Punjabi", value: "punjabi", emoji: "🫕" },
];

const ALLERGY_CHIPS: { label: string; value: string }[] = [
  { label: "Dairy", value: "dairy" },
  { label: "Gluten", value: "gluten" },
  { label: "Nuts", value: "nuts" },
  { label: "Eggs", value: "eggs" },
  { label: "Soy", value: "soy" },
];

function deriveFoodType(dietType: string): string {
  if (["vegetarian", "vegan", "eggetarian"].includes(dietType)) return "veg";
  return "non_veg";
}

function deriveRegion(foodStyle: string, subCuisine: string): string {
  if (foodStyle === "indian") {
    if (subCuisine && subCuisine !== "") return subCuisine;
    return "pan_indian";
  }
  return "global";
}

function foodTypeFromOld(old: string): string {
  if (old === "veg") return "vegetarian";
  return "non_veg";
}

function foodStyleFromOldRegion(region: string): { foodStyle: string; subCuisine: string } {
  const indianSubs = ["north_indian", "south_indian", "bengali", "gujarati", "punjabi", "maharashtrian", "pan_indian"];
  if (region === "global") return { foodStyle: "mixed", subCuisine: "" };
  if (indianSubs.includes(region)) {
    return { foodStyle: "indian", subCuisine: region === "pan_indian" ? "" : region };
  }
  return { foodStyle: "indian", subCuisine: "" };
}

function parseAllergyChips(raw: string): { chips: string[]; text: string } {
  const knownValues = ALLERGY_CHIPS.map(c => c.value);
  const parts = raw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const chips: string[] = [];
  const rest: string[] = [];
  parts.forEach(p => {
    if (knownValues.includes(p)) chips.push(p);
    else rest.push(p);
  });
  return { chips, text: rest.join(", ") };
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useAuth();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const router = useRouter();
  const { i18n } = useTranslation();
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);

  // Profile state
  const [name, setName] = useState("");
  const [role, setRole] = useState("mother");
  const [gender, setGender] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [workType, setWorkType] = useState("work_from_home");
  const [workStartTime, setWorkStartTime] = useState("");
  const [workEndTime, setWorkEndTime] = useState("");
  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);

  // Food preferences — enriched
  const [dietType, setDietType] = useState("no_preference");
  const [foodStyle, setFoodStyle] = useState("indian");
  const [subCuisine, setSubCuisine] = useState("");
  const [allergyChips, setAllergyChips] = useState<string[]>([]);
  const [allergyText, setAllergyText] = useState("");

  const { data: profile, isLoading } = useQuery<ParentProfile | null>({
    queryKey: ["parent-profile"],
    queryFn: async () => {
      const res = await authFetch("/api/parent-profile");
      if (res.status === 404) return null;
      return res.json() as Promise<ParentProfile>;
    },
    retry: false,
  });

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: () => authFetch("/api/children").then(r => r.json() as Promise<Child[]>),
  });

  // ─── Notification preferences ─────────────────────────────────────────
  type NotifPrefs = { emailNotificationsEnabled: boolean; lastWeeklyRecapSentAt: string | null };
  const { data: notifPrefs } = useQuery<NotifPrefs>({
    queryKey: ["notification-preferences"],
    queryFn: async () => authFetch("/api/notifications/preferences").then(r => r.json() as Promise<NotifPrefs>),
  });
  const togglePrefMut = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await authFetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotificationsEnabled: enabled }),
      });
      if (!res.ok) throw new Error("Could not update preference");
      return enabled;
    },
    onMutate: async (enabled) => {
      await qc.cancelQueries({ queryKey: ["notification-preferences"] });
      const prev = qc.getQueryData<NotifPrefs>(["notification-preferences"]);
      qc.setQueryData<NotifPrefs>(["notification-preferences"], (old) => ({
        emailNotificationsEnabled: enabled,
        lastWeeklyRecapSentAt: old?.lastWeeklyRecapSentAt ?? null,
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notification-preferences"], ctx.prev);
      Alert.alert(t("alerts.profile.pref_save_failed_title"), t("alerts.profile.pref_save_failed_msg"));
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
  const [sendingRecap, setSendingRecap] = useState(false);
  const handleSendRecapNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSendingRecap(true);
    try {
      const res = await authFetch("/api/notifications/recap/send-now", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t("alerts.profile.recap_sent_title"), t("alerts.profile.recap_sent_msg"));
        qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      } else {
        const reason = data.reason as string | undefined;
        const msg =
          reason === "no_provider"
            ? "Email isn't configured yet. Please try again later."
            : reason === "no_email"
              ? "We couldn't find an email address on your account."
              : reason === "send_failed"
                ? "The email service had a hiccup. Please try again in a minute."
                : "Couldn't send right now. Please try again later.";
        Alert.alert(t("alerts.profile.recap_not_sent_title"), msg);
      }
    } catch {
      Alert.alert(t("alerts.profile.recap_not_sent_title"), t("alerts.profile.recap_unreachable_msg"));
    } finally {
      setSendingRecap(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? user?.firstName ?? "");
      setRole(profile.role ?? "mother");
      setGender(profile.gender ?? "");
      setMobileNumber(profile.mobileNumber ?? "");
      setWorkType(profile.workType ?? "work_from_home");
      setWorkStartTime(profile.workStartTime ?? "");
      setWorkEndTime(profile.workEndTime ?? "");
      setFreeSlots(profile.freeSlots ?? []);

      // Load enriched fields, falling back from old flat fields for existing mobile users
      if (profile.dietType) {
        setDietType(profile.dietType);
      } else if (profile.foodType) {
        setDietType(foodTypeFromOld(profile.foodType));
      } else {
        setDietType("no_preference");
      }

      if (profile.foodStyle) {
        setFoodStyle(profile.foodStyle);
        setSubCuisine(profile.subCuisine ?? "");
      } else if (profile.region) {
        const derived = foodStyleFromOldRegion(profile.region);
        setFoodStyle(derived.foodStyle);
        setSubCuisine(derived.subCuisine);
      } else {
        setFoodStyle("indian");
        setSubCuisine("");
      }

      const { chips, text } = parseAllergyChips(profile.allergies ?? "");
      setAllergyChips(chips);
      setAllergyText(text);
    }
  }, [profile, user?.firstName]);

  const addFreeSlot = () => {
    Haptics.selectionAsync();
    setFreeSlots(s => [...s, { start: "12:00", end: "13:00" }]);
  };
  const removeFreeSlot = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFreeSlots(s => s.filter((_, idx) => idx !== i));
  };
  const updateFreeSlot = (i: number, field: "start" | "end", value: string) => {
    setFreeSlots(s => {
      const next = [...s];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const toggleAllergyChip = (val: string) => {
    Haptics.selectionAsync();
    setAllergyChips(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  };

  const handleProfilePicUpload = async () => {
    if (!user) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("alerts.profile.permission_title"), t("alerts.profile.permission_msg"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      setUploadingPic(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const a = result.assets[0];
      const dataUri = `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`;
      await user.setProfileImage({ file: dataUri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(t("alerts.profile.upload_failed_title"), t("alerts.profile.upload_failed_msg"));
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaving(true);
    try {
      const combinedAllergies = [...allergyChips, allergyText.trim()].filter(Boolean).join(", ") || null;
      const body: Record<string, unknown> = {
        role,
        workType,
        // Enriched food fields
        dietType,
        foodStyle,
        subCuisine: subCuisine || null,
        allergies: combinedAllergies,
        // Derived legacy fields for routine engine backward compat
        foodType: deriveFoodType(dietType),
        region: deriveRegion(foodStyle, subCuisine),
      };
      if (name) body.name = name;
      if (gender) body.gender = gender;
      if (mobileNumber) body.mobileNumber = mobileNumber;
      if (workStartTime) body.workStartTime = workStartTime;
      if (workEndTime) body.workEndTime = workEndTime;
      if (freeSlots.length > 0) body.freeSlots = freeSlots;

      const res = await authFetch("/api/parent-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["parent-profile"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("alerts.profile.saved_title"), t("alerts.profile.saved_msg"));
    } catch {
      Alert.alert(t("alerts.profile.save_failed_title"), t("alerts.profile.save_failed_msg"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(t("alerts.profile.signout_title"), t("alerts.profile.signout_msg"), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          qc.clear();
          await signOut();
        },
      },
    ]);
  };

  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account?",
      `This permanently deletes your account, children, routines, behaviors and all ${BRAND.appName} data. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final confirmation",
              `Tap 'Yes, delete everything' to permanently erase your ${BRAND.appName} account.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, delete everything",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                      const res = await authFetch("/api/account", { method: "DELETE" });
                      if (!res.ok) throw new Error("delete failed");
                      qc.clear();
                      await signOut();
                    } catch {
                      setDeleting(false);
                      Alert.alert(
                        "Could not delete account",
                        "Please try again, or email Support@amynest.in for help.",
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleManageSubscription = async () => {
    Haptics.selectionAsync();
    const url = Platform.OS === "ios"
      ? "itms-apps://apps.apple.com/account/subscriptions"
      : `https://play.google.com/store/account/subscriptions?package=com.amynest.app`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(
        "Open Store Settings",
        Platform.OS === "ios"
          ? "Go to App Store → Account → Subscriptions to manage or cancel."
          : "Go to Google Play → Account → Subscriptions to manage or cancel.",
      );
      return;
    }
    await Linking.openURL(url);
  };

  const handleContactUs = async () => {
    Haptics.selectionAsync();
    const subject = encodeURIComponent(`${BRAND.appName} Support`);
    const body = encodeURIComponent("");
    const url = `mailto:Support@amynest.in?subject=${subject}&body=${body}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(t("alerts.profile.email_unavailable_title"), t("alerts.profile.email_unavailable_msg"));
      return;
    }
    await Linking.openURL(url);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 16 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 16 : 0);
  const displayName = name || user?.firstName || "Parent";

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad + 100, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.eyebrowRow}>
              <Ionicons name="person-circle" size={12} color={brand.purple500} />
              <Text style={styles.eyebrow}>{t("screens.tabs_profile.your_parent_profile")}</Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t("screens.tabs_profile.my_parent_profile")}</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Helps {BRAND.aiName} AI build smarter routines for your child.
            </Text>
          </View>
        </View>

        {/* Avatar block */}
        <View style={[styles.avatarSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarWrap}>
            {user?.imageUrl ? (
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              <View style={[styles.avatar, { backgroundColor: colors.primary, overflow: "hidden" }]}>
                {/* @ts-ignore — RN Image */}
                {React.createElement(require("react-native").Image, {
                  source: { uri: user.imageUrl },
                  style: { width: 80, height: 80 },
                })}
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleProfilePicUpload}
              disabled={uploadingPic}
              style={[styles.cameraBtn, { backgroundColor: colors.primary }]}
            >
              {uploadingPic
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="camera" size={14} color="#fff" />}
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{displayName}</Text>
            <Text style={[styles.profileEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
              {user?.emailAddresses?.[0]?.emailAddress}
            </Text>
            <View style={styles.statsMini}>
              <View style={[styles.statChip, { backgroundColor: colors.secondary }]}>
                <Ionicons name="people" size={12} color={colors.primary} />
                <Text style={[styles.statChipText, { color: colors.primary }]}>{children.length} children</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal Info */}
        <Section title={t("screens.tabs_profile.personal_info")} subtitle="Basic details about you and your role" colors={colors}>
          <Field label="Your Name" colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={name}
              onChangeText={setName}
              placeholder={t("screens.tabs_profile.e_g_ayesha_sarah_ahmed")}
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t("screens.tabs_profile.this_name_appears_in_your_dashboard_gree")}</Text>
          </Field>

          <Field label="Role" colors={colors}>
            <ChipPicker options={ROLES} value={role} onChange={setRole} colors={colors} />
          </Field>

          <Field label="Gender" colors={colors}>
            <ChipPicker options={GENDERS} value={gender} onChange={setGender} colors={colors} />
          </Field>

          <Field label="Mobile Number" colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={mobileNumber}
              onChangeText={setMobileNumber}
              placeholder="+92 300 1234567"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />
          </Field>
        </Section>

        {/* Work Schedule */}
        <Section title={t("screens.tabs_profile.work_schedule")} subtitle={`${BRAND.aiName} AI uses this to assign tasks when you're free or busy`} colors={colors}>
          <Field label="Work Type" colors={colors}>
            <ChipPicker options={WORK_TYPES} value={workType} onChange={setWorkType} colors={colors} />
          </Field>

          {workType !== "homemaker" && (
            <View style={styles.row2}>
              <Field label="Work Start" colors={colors} flex>
                <TimeField value={workStartTime} onChange={setWorkStartTime} colors={colors} />
              </Field>
              <Field label="Work End" colors={colors} flex>
                <TimeField value={workEndTime} onChange={setWorkEndTime} colors={colors} />
              </Field>
            </View>
          )}
        </Section>

        {/* Free Slots */}
        <Section
          title={t("screens.tabs_profile.free_available_slots")}
          subtitle="Times during the day you're free for your child"
          icon="time-outline"
          colors={colors}
          headerRight={
            <TouchableOpacity onPress={addFreeSlot} style={[styles.smallBtn, { borderColor: colors.border }]}>
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={[styles.smallBtnText, { color: colors.primary }]}>{t("screens.tabs_profile.add_slot")}</Text>
            </TouchableOpacity>
          }
        >
          {freeSlots.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No free slots added. Tap "Add Slot" to specify when you're available.
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {freeSlots.map((slot, i) => (
                <View key={i} style={[styles.slotRow, { backgroundColor: colors.muted }]}>
                  <TimeField value={slot.start} onChange={(v) => updateFreeSlot(i, "start", v)} colors={colors} compact />
                  <Text style={[styles.toLabel, { color: colors.mutedForeground }]}>to</Text>
                  <TimeField value={slot.end} onChange={(v) => updateFreeSlot(i, "end", v)} colors={colors} compact />
                  <TouchableOpacity onPress={() => removeFreeSlot(i)} style={styles.trashBtn}>
                    <Ionicons name="trash-outline" size={16} color={palette.red500} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* Food Preferences */}
        <Section
          title={t("screens.tabs_profile.food_preferences")}
          subtitle={`Used by ${BRAND.aiName} AI to suggest appropriate meals`}
          icon="restaurant-outline"
          colors={colors}
        >
          {/* 1. Diet Type */}
          <Field label="Diet Type" colors={colors}>
            <View style={styles.chipRow}>
              {DIET_OPTIONS.map(opt => {
                const active = dietType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => { Haptics.selectionAsync(); setDietType(opt.value); }}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>{opt.emoji} {opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          {/* 2. Food Style */}
          <Field label="Food Style" colors={colors}>
            <View style={styles.chipRow}>
              {FOOD_STYLE_OPTIONS.map(opt => {
                const active = foodStyle === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setFoodStyle(opt.value);
                      if (opt.value !== "indian") setSubCuisine("");
                    }}
                    style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>{opt.emoji} {opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Field>

          {/* 3. Indian Sub-cuisine (conditional) */}
          {foodStyle === "indian" && (
            <Field label="Indian Sub-cuisine (optional)" colors={colors}>
              <View style={[styles.chipRow, { paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: colors.primary + "33" }]}>
                {INDIAN_SUB_OPTIONS.map(opt => {
                  const active = subCuisine === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSubCuisine(prev => prev === opt.value ? "" : opt.value);
                      }}
                      style={[styles.chip, { backgroundColor: active ? colors.primary + "25" : colors.background, borderColor: active ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.chipText, { color: active ? colors.primary : colors.foreground }]}>{opt.emoji} {opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
          )}

          {/* 4. Allergies */}
          <Field label="Food Restrictions / Allergies" colors={colors}>
            <View style={styles.chipRow}>
              {ALLERGY_CHIPS.map(chip => {
                const active = allergyChips.includes(chip.value);
                return (
                  <TouchableOpacity
                    key={chip.value}
                    onPress={() => toggleAllergyChip(chip.value)}
                    style={[styles.chip, { backgroundColor: active ? colors.primary + "25" : colors.background, borderColor: active ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.foreground }]}>{chip.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, marginTop: 8 },
              ]}
              value={allergyText}
              onChangeText={setAllergyText}
              placeholder={t("screens.tabs_profile.e_g_peanuts_shellfish_dairy_gluten")}
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              List allergies or ingredients to avoid in AI meal suggestions.
            </Text>
          </Field>
        </Section>

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={16} color="#fff" />
              <Text style={styles.saveText}>{t("screens.tabs_profile.save_profile")}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Notifications */}
        <Section
          title={t("screens.tabs_profile.notifications")}
          subtitle={`Choose what ${BRAND.appName} sends you`}
          icon="mail-unread-outline"
          colors={colors}
        >
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{t("screens.tabs_profile.weekly_recap_email")}</Text>
              <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
                Every Sunday morning — a quick summary of routines, moments, and one thing to try next week.
              </Text>
            </View>
            <Switch
              value={notifPrefs?.emailNotificationsEnabled ?? true}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                togglePrefMut.mutate(v);
              }}
              disabled={togglePrefMut.isPending}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
          <TouchableOpacity
            onPress={handleSendRecapNow}
            disabled={sendingRecap}
            style={[styles.smallActionBtn, { borderColor: colors.border, opacity: sendingRecap ? 0.6 : 1 }]}
          >
            {sendingRecap ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="send-outline" size={14} color={colors.primary} />
            )}
            <Text style={[styles.smallActionText, { color: colors.primary }]}>
              {sendingRecap ? "Sending…" : "Send me one now"}
            </Text>
          </TouchableOpacity>
          {notifPrefs?.lastWeeklyRecapSentAt ? (
            <Text style={[styles.hint, { color: colors.mutedForeground, marginTop: 4 }]}>
              Last recap sent {new Date(notifPrefs.lastWeeklyRecapSentAt).toLocaleDateString()}.
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/notifications-settings");
            }}
            style={[styles.smallActionBtn, { borderColor: colors.primary, marginTop: 8 }]}
          >
            <Ionicons name="notifications-outline" size={14} color={colors.primary} />
            <Text style={[styles.smallActionText, { color: colors.primary }]}>{t("screens.tabs_profile.push_notification_settings")}</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </Section>

        {/* Manage Subscription — only shown for premium users */}
        {entitlements?.isPremium && (
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: brandAlpha.purple500_08, borderColor: brandAlpha.purple500_33 }]}
            onPress={handleManageSubscription}
          >
            <Ionicons name="card-outline" size={20} color={brand.purple500} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.logoutText, { color: brand.purple500 }]}>
                {t("screens.tabs_profile.manage_subscription")}
              </Text>
              <Text style={{ fontSize: 11, color: brand.violet300, marginTop: 1 }}>
                {Platform.OS === "ios"
                  ? t("screens.tabs_profile.manage_subscription_ios_hint")
                  : t("screens.tabs_profile.manage_subscription_android_hint")}
              </Text>
            </View>
            <Ionicons name="open-outline" size={15} color={brand.violet300} />
          </TouchableOpacity>
        )}

        {/* My Recipes */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/recipes");
          }}
        >
          <Ionicons name="restaurant-outline" size={20} color={palette.orange500} />
          <Text style={[styles.logoutText, { color: palette.orange500 }]}>{t("screens.tabs_profile.my_recipes")}</Text>
          <Ionicons name="chevron-forward" size={16} color={palette.orange500} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        {/* Invite & Earn */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: brandAlpha.purple500_08, borderColor: brandAlpha.purple500_33 }]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/referrals");
          }}
        >
          <Ionicons name="gift" size={20} color={brand.purple500} />
          <Text style={[styles.logoutText, { color: brand.purple500 }]}>{t("screens.tabs_profile.invite_earn_premium")}</Text>
          <Ionicons name="chevron-forward" size={16} color={brand.purple500} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={handleContactUs}
        >
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <Text style={[styles.logoutText, { color: colors.foreground }]}>{t("screens.tabs_profile.contact_us")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); router.push("/privacy"); }}
          testID="privacy-policy-link"
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={[styles.logoutText, { color: colors.foreground }]}>{t("screens.tabs_profile.privacy_policy")}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.statusErrorBg, borderColor: colors.statusErrorBorder }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={palette.red500} />
          <Text style={styles.logoutText}>{t("screens.tabs_profile.sign_out")}</Text>
        </TouchableOpacity>

        {/* Delete account — destructive, separated by extra spacing */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: "transparent", borderColor: "#EF444455", marginTop: 4 }]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          testID="delete-account-button"
        >
          {deleting ? (
            <ActivityIndicator size="small" color={palette.red500} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={palette.red500} />
          )}
          <Text style={[styles.logoutText, { color: palette.red500 }]}>
            {deleting ? "Deleting…" : "Delete Account"}
          </Text>
        </TouchableOpacity>

        {/* Patent-pending — About AmyNest */}
        <View style={{ marginTop: 28, alignItems: "center", gap: 5, paddingBottom: 8 }}>
          <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase", color: "rgba(168,85,247,0.50)" }}>
            {t("patent_pending.footer_label")}
          </Text>
          <Text style={{ fontSize: 10, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.30)", textAlign: "center", paddingHorizontal: 24, lineHeight: 15 }}>
            {t("patent_pending.settings_note")}
          </Text>
        </View>

        {/* Developer Tools — only visible in __DEV__ builds */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devToolsBtn, { borderColor: colors.border }]}
            onPress={() => {
              Haptics.selectionAsync();
              router.push("/dev/theme");
            }}
          >
            <Ionicons name="color-palette-outline" size={18} color={colors.mutedForeground} />
            <Text style={[styles.devToolsText, { color: colors.mutedForeground }]}>{t("screens.tabs_profile.developer_tools")}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Reusable building blocks ─────────────────────────────────────────────
function Section({
  title, subtitle, icon, colors, children, headerRight,
}: {
  title: string; subtitle?: string; icon?: React.ComponentProps<typeof Ionicons>["name"];
  colors: Colors; children: React.ReactNode; headerRight?: React.ReactNode;
}) {
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {icon ? <Ionicons name={icon} size={16} color={colors.primary} /> : null}
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
          </View>
          {subtitle ? (
            <Text style={[styles.sectionSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
          ) : null}
        </View>
        {headerRight}
      </View>
      <View style={{ gap: 14 }}>{children}</View>
    </View>
  );
}

function Field({
  label, colors, children, flex,
}: { label: string; colors: Colors; children: React.ReactNode; flex?: boolean }) {
  return (
    <View style={[{ gap: 6 }, flex && { flex: 1 }]}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );
}

function ChipPicker({
  options, value, onChange, colors,
}: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void; colors: Colors }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value || "_empty"}
            onPress={() => { Haptics.selectionAsync(); onChange(opt.value); }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.background,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? "#fff" : colors.foreground }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function TimeField({
  value, onChange, colors, compact,
}: { value: string; onChange: (v: string) => void; colors: Colors; compact?: boolean }) {
  return (
    <TextInput
      style={[
        styles.input,
        compact && { height: 36, paddingHorizontal: 10, fontSize: 13, flex: 1 },
        { color: colors.foreground, borderColor: colors.border, backgroundColor: compact ? "#fff" : colors.background },
      ]}
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor={colors.mutedForeground}
      keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
      maxLength={5}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4 },
  eyebrow: {
    fontSize: 10.5,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    letterSpacing: 1.4,
    color: brand.purple500,
  },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", fontWeight: "800", letterSpacing: -0.4 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  avatarSection: {
    flexDirection: "row", alignItems: "center", gap: 16,
    padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 16,
  },
  avatarWrap: { position: "relative" },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#fff" },
  cameraBtn: {
    position: "absolute", bottom: -2, right: -2,
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  profileName: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  profileEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statsMini: { flexDirection: "row", marginTop: 8, gap: 6 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  section: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6 },
  input: {
    height: 44, borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular",
  },
  textArea: { height: 80, paddingTop: 12, paddingBottom: 12 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  row2: { flexDirection: "row", gap: 12 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  slotRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 12 },
  toLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  trashBtn: { padding: 4 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 8 },

  smallBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  smallBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, marginBottom: 14 },
  saveText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  toggleHint: { fontSize: 12, fontFamily: "Inter_400Regular" },
  smallActionBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  smallActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, marginBottom: 10,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: palette.red500 },

  devToolsBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16,
    borderWidth: 1, borderStyle: "dashed", marginBottom: 10,
  },
  devToolsText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
