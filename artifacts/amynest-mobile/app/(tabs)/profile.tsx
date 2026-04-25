import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, Linking,
} from "react-native";
import { useUser, useAuth } from "@/lib/firebase-auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Switch } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";

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
const FOOD_TYPES: { label: string; value: string }[] = [
  { label: "Non-Vegetarian", value: "non_veg" },
  { label: "Vegetarian", value: "veg" },
];
const REGIONS: { label: string; value: string }[] = [
  { label: "Pan-Indian", value: "pan_indian" },
  { label: "North Indian", value: "north_indian" },
  { label: "South Indian", value: "south_indian" },
  { label: "Bengali", value: "bengali" },
  { label: "Gujarati", value: "gujarati" },
  { label: "Maharashtrian", value: "maharashtrian" },
  { label: "Punjabi", value: "punjabi" },
  { label: "Global / Continental", value: "global" },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useAuth();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();

  const router = useRouter();
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
  const [foodType, setFoodType] = useState("non_veg");
  const [allergies, setAllergies] = useState("");
  const [region, setRegion] = useState("pan_indian");

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
    queryFn: () => authFetch("/api/children").then(r => r.json()) as Promise<Child[]>,
  });

  // ─── Notification preferences ─────────────────────────────────────────
  type NotifPrefs = { emailNotificationsEnabled: boolean; lastWeeklyRecapSentAt: string | null };
  const { data: notifPrefs } = useQuery<NotifPrefs>({
    queryKey: ["notification-preferences"],
    queryFn: async () => authFetch("/api/notifications/preferences").then(r => r.json()) as Promise<NotifPrefs>,
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
      Alert.alert("Couldn't save", "We couldn't update your email preference. Please try again.");
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
        Alert.alert("On its way", "We just sent a fresh recap to your email.");
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
        Alert.alert("Recap not sent", msg);
      }
    } catch {
      Alert.alert("Recap not sent", "Couldn't reach the server. Please try again.");
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
      setFoodType(profile.foodType ?? "non_veg");
      setAllergies(profile.allergies ?? "");
      setRegion(profile.region ?? "pan_indian");
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

  const handleProfilePicUpload = async () => {
    if (!user) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Please allow photo access to update your picture.");
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
      Alert.alert("Upload failed", "Could not update profile picture.");
    } finally {
      setUploadingPic(false);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaving(true);
    try {
      const body: any = { role, workType, foodType, region };
      if (name) body.name = name;
      if (gender) body.gender = gender;
      if (mobileNumber) body.mobileNumber = mobileNumber;
      if (workStartTime) body.workStartTime = workStartTime;
      if (workEndTime) body.workEndTime = workEndTime;
      if (freeSlots.length > 0) body.freeSlots = freeSlots;
      if (allergies) body.allergies = allergies;

      const res = await authFetch("/api/parent-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      qc.invalidateQueries({ queryKey: ["parent-profile"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Your profile is up to date.");
    } catch {
      Alert.alert("Error", "Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
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
      "This permanently deletes your account, children, routines, behaviors and all AmyNest data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final confirmation",
              "Tap 'Yes, delete everything' to permanently erase your AmyNest account.",
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

  const handleContactUs = async () => {
    Haptics.selectionAsync();
    const subject = encodeURIComponent("AmyNest Support");
    const body = encodeURIComponent("");
    const url = `mailto:Support@amynest.in?subject=${subject}&body=${body}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Email app not available", "Please email Support@amynest.in");
      return;
    }
    await Linking.openURL(url);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 16 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 16 : 0);
  const displayName = name || user?.firstName || "Parent";

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad + 100, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Parent Profile</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Helps Amy AI build smarter routines for your child.
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
        <Section title="Personal Info" subtitle="Basic details about you and your role" colors={colors}>
          <Field label="Your Name" colors={colors}>
            <TextInput
              style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ayesha, Sarah, Ahmed…"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>This name appears in your dashboard greeting.</Text>
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
        <Section title="Work Schedule" subtitle="Amy AI uses this to assign tasks when you're free or busy" colors={colors}>
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
          title="Free / Available Slots"
          subtitle="Times during the day you're free for your child"
          icon="time-outline"
          colors={colors}
          headerRight={
            <TouchableOpacity onPress={addFreeSlot} style={[styles.smallBtn, { borderColor: colors.border }]}>
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={[styles.smallBtnText, { color: colors.primary }]}>Add Slot</Text>
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
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </Section>

        {/* Food Preferences */}
        <Section
          title="Food Preferences"
          subtitle="Used by Amy AI to suggest appropriate meals"
          icon="restaurant-outline"
          colors={colors}
        >
          <Field label="Diet Type" colors={colors}>
            <ChipPicker options={FOOD_TYPES} value={foodType} onChange={setFoodType} colors={colors} />
          </Field>
          <Field label="Regional Cuisine" colors={colors}>
            <ChipPicker options={REGIONS} value={region} onChange={setRegion} colors={colors} />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              Amy AI tailors meal suggestions to your regional cuisine.
            </Text>
          </Field>
          <Field label="Allergies / Foods to Avoid" colors={colors}>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={allergies}
              onChangeText={setAllergies}
              placeholder="e.g. peanuts, shellfish, dairy, gluten…"
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
              <Text style={styles.saveText}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Notifications */}
        <Section
          title="Notifications"
          subtitle="Choose what AmyNest sends you"
          icon="mail-unread-outline"
          colors={colors}
        >
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Weekly recap email</Text>
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
            <Text style={[styles.smallActionText, { color: colors.primary }]}>Push notification settings</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        </Section>

        {/* My Recipes */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: "#FFF7ED", borderColor: "#FDBA7455" }]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/recipes");
          }}
        >
          <Ionicons name="restaurant-outline" size={20} color="#F97316" />
          <Text style={[styles.logoutText, { color: "#F97316" }]}>My Recipes</Text>
          <Ionicons name="chevron-forward" size={16} color="#F97316" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        {/* Invite & Earn */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: "#A855F715", borderColor: "#A855F755" }]}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/referrals");
          }}
        >
          <Ionicons name="gift" size={20} color="#A855F7" />
          <Text style={[styles.logoutText, { color: "#A855F7" }]}>Invite & Earn Premium</Text>
          <Ionicons name="chevron-forward" size={16} color="#A855F7" style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={handleContactUs}
        >
          <Ionicons name="mail-outline" size={20} color={colors.primary} />
          <Text style={[styles.logoutText, { color: colors.foreground }]}>Contact Us</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => { Haptics.selectionAsync(); router.push("/privacy"); }}
          testID="privacy-policy-link"
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={[styles.logoutText, { color: colors.foreground }]}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.statusErrorBg, borderColor: colors.statusErrorBorder }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete account — destructive, separated by extra spacing */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: "transparent", borderColor: "#EF444455", marginTop: 4 }]}
          onPress={handleDeleteAccount}
          disabled={deleting}
          testID="delete-account-button"
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          )}
          <Text style={[styles.logoutText, { color: "#EF4444" }]}>
            {deleting ? "Deleting…" : "Delete Account"}
          </Text>
        </TouchableOpacity>

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
            <Text style={[styles.devToolsText, { color: colors.mutedForeground }]}>Developer Tools</Text>
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
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
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
  statChipText: { fontSize: 11, fontFamily: "Inter_700Bold" },

  section: {
    borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 14,
  },
  sectionHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  label: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 16 },
  smallActionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  smallActionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  input: {
    height: 44, borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular",
  },
  textArea: { height: 80, paddingTop: 10, paddingBottom: 10 },

  row2: { flexDirection: "row", gap: 12 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  smallBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5,
  },
  smallBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 12 },

  slotRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 8, borderRadius: 12,
  },
  toLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  trashBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },

  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 16, marginBottom: 12,
  },
  saveText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },

  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 16, borderWidth: 1,
  },
  logoutText: { color: "#EF4444", fontSize: 15, fontFamily: "Inter_600SemiBold" },

  devToolsBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 16, borderWidth: 1, marginTop: 8,
  },
  devToolsText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
