import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { palette } from "@/constants/colors";
import * as Haptics from "expo-haptics";

type Colors = ReturnType<typeof useColors>;

type Babysitter = { id: number; name: string };

type Child = {
  id: number; name: string; age: number; ageMonths?: number; dob?: string;
  isSchoolGoing?: boolean; childClass?: string;
  schoolStartTime: string; schoolEndTime: string;
  schoolDays?: number[] | null;
  wakeUpTime: string; sleepTime: string; foodType?: string; goals: string;
  travelMode?: string; travelModeOther?: string | null;
  photoUrl?: string | null; babysitterId?: number | null;
  feedingType?: string | null;
  sleepPattern?: string | null;
};

const FEEDING_TYPES: { label: string; value: string }[] = [
  { label: "Breastfeeding", value: "breastfeeding" },
  { label: "Formula", value: "formula" },
  { label: "Both", value: "mixed" },
];
const INFANT_SLEEP_PATTERNS: { label: string; value: string }[] = [
  { label: "Flexible", value: "flexible" },
  { label: "Irregular", value: "irregular" },
  { label: "Short naps", value: "short_naps" },
];

function feedingLabel(value?: string | null): string {
  return FEEDING_TYPES.find(f => f.value === value)?.label ?? "—";
}
function sleepPatternLabel(value?: string | null): string {
  return INFANT_SLEEP_PATTERNS.find(p => p.value === value)?.label ?? "—";
}

const WEEKDAYS: { iso: number; short: string }[] = [
  { iso: 1, short: "Mon" }, { iso: 2, short: "Tue" }, { iso: 3, short: "Wed" },
  { iso: 4, short: "Thu" }, { iso: 5, short: "Fri" }, { iso: 6, short: "Sat" },
  { iso: 7, short: "Sun" },
];

const FOOD_TYPES: { label: string; value: string }[] = [
  { label: "Vegetarian", value: "veg" },
  { label: "Non-Vegetarian", value: "non_veg" },
];
const TRAVEL_MODES: { label: string; value: string }[] = [
  { label: "Van", value: "van" },
  { label: "Car", value: "car" },
  { label: "Walk", value: "walk" },
  { label: "Other", value: "other" },
];

export default function ChildDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [isSchool, setIsSchool] = useState(false);
  const [childClass, setChildClass] = useState("");
  const [schoolStart, setSchoolStart] = useState("09:00");
  const [schoolEnd, setSchoolEnd] = useState("15:00");
  const [schoolDays, setSchoolDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [wakeUp, setWakeUp] = useState("07:00");
  const [sleep, setSleep] = useState("21:00");
  const [foodType, setFoodType] = useState("veg");
  const [travelMode, setTravelMode] = useState("car");
  const [travelModeOther, setTravelModeOther] = useState("");
  const [goals, setGoals] = useState("balanced-routine");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [babysitterId, setBabysitterId] = useState<number | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [feedingType, setFeedingType] = useState<string | null>(null);
  const [sleepPattern, setSleepPattern] = useState<string | null>(null);

  const { data: child, isLoading } = useQuery<Child>({
    queryKey: ["child", id],
    queryFn: () => authFetch(`/api/children/${id}`).then(r => r.json() as Promise<Child>),
    enabled: !!id && id !== "new",
  });

  const { data: babysitters = [] } = useQuery<Babysitter[]>({
    queryKey: ["babysitters"],
    queryFn: async () => {
      const r = await authFetch("/api/babysitters");
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : (data?.babysitters ?? []);
    },
  });

  useEffect(() => {
    if (child) {
      setName(child.name ?? "");
      setDob(child.dob ?? "");
      setIsSchool(child.isSchoolGoing ?? false);
      setChildClass(child.childClass ?? "");
      setSchoolStart(child.schoolStartTime ?? "09:00");
      setSchoolEnd(child.schoolEndTime ?? "15:00");
      setSchoolDays(Array.isArray(child.schoolDays) ? child.schoolDays : [1, 2, 3, 4, 5]);
      setWakeUp(child.wakeUpTime ?? "07:00");
      setSleep(child.sleepTime ?? "21:00");
      setFoodType(child.foodType ?? "veg");
      setTravelMode(child.travelMode ?? "car");
      setTravelModeOther(child.travelModeOther ?? "");
      setGoals(child.goals ?? "balanced-routine");
      setPhotoUrl(child.photoUrl ?? null);
      setBabysitterId(child.babysitterId ?? null);
      setFeedingType(child.feedingType ?? null);
      setSleepPattern(child.sleepPattern ?? null);
    }
  }, [child]);

  // Total age in months — used to gate the infant-only feeding & sleep fields
  // (mirrors the cutoff used by the routine engine: < 12 months = infant).
  const totalMonths = (child?.age ?? 0) * 12 + (child?.ageMonths ?? 0);
  const isInfant = totalMonths < 12;

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(t("alerts.children.permission_title"), t("alerts.children.permission_msg_edit"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      setPickingPhoto(true);
      const a = result.assets[0];
      setPhotoUrl(`data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert(t("alerts.children.photo_error_title"), t("alerts.children.photo_error_msg"));
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      await authFetch(`/api/children/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name, dob, isSchoolGoing: isSchool,
          childClass: isSchool ? childClass : "",
          schoolStartTime: schoolStart, schoolEndTime: schoolEnd,
          schoolDays: isSchool
            ? (schoolDays.length > 0 ? [...schoolDays].sort() : [1, 2, 3, 4, 5])
            : null,
          wakeUpTime: wakeUp, sleepTime: sleep,
          foodType, travelMode,
          travelModeOther: travelMode === "other" ? travelModeOther.trim() || null : null,
          goals,
          photoUrl, babysitterId,
          feedingType: isInfant ? feedingType : null,
          sleepPattern: isInfant ? sleepPattern : null,
        }),
      });
      qc.invalidateQueries({ queryKey: ["children"] });
      qc.invalidateQueries({ queryKey: ["child", id] });
      setEditing(false);
    } catch {
      Alert.alert(t("alerts.children.save_failed_title"), t("alerts.children.save_failed_msg"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(t("alerts.children.delete_title"), t("alerts.children.delete_msg", { name }), [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          try {
            await authFetch(`/api/children/${id}`, { method: "DELETE" });
            qc.invalidateQueries({ queryKey: ["children"] });
            router.back();
          } catch {
            Alert.alert(t("alerts.children.delete_failed_title"), t("alerts.children.delete_failed_msg"));
          }
        },
      },
    ]);
  };

  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: botPad + 32, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: colors.secondary, overflow: "hidden" }]}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={styles.avatarEmoji}>{(child?.age ?? 0) < 4 ? "🧒" : "🧑"}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.childName, { color: colors.foreground }]}>{child?.name}</Text>
            <Text style={[styles.childMeta, { color: colors.mutedForeground }]}>
              {child?.age} yr{(child?.age ?? 0) !== 1 ? "s" : ""} · {child?.isSchoolGoing ? "School going" : "Not in school"}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.editIconBtn, { backgroundColor: editing ? colors.primary : colors.secondary }]}
            onPress={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#fff" /> :
              <Ionicons name={editing ? "checkmark" : "pencil"} size={18} color={editing ? "#fff" : colors.primary} />}
          </TouchableOpacity>
        </View>

        {editing ? (
          <View style={styles.formSection}>
            <View style={{ alignItems: "center", gap: 8, marginBottom: 6 }}>
              <TouchableOpacity
                onPress={handlePickPhoto}
                disabled={pickingPhoto}
                activeOpacity={0.85}
                style={[styles.photoCircle, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={t("screens.children_id.change_child_photo")}
                testID="child-photo-picker"
              >
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Ionicons name="camera-outline" size={26} color={colors.mutedForeground} />
                )}
                {pickingPhoto && (
                  <View style={styles.photoOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
                <View style={[styles.photoEditDot, { backgroundColor: colors.primary }]}>
                  <Ionicons name={photoUrl ? "pencil" : "add"} size={12} color="#fff" />
                </View>
              </TouchableOpacity>
              {photoUrl && (
                <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setPhotoUrl(null); }}>
                  <Text style={[styles.photoHint, { color: palette.red500 }]}>{t("screens.children_id.remove_photo")}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Field label="Name" value={name} onChange={setName} colors={colors} />
            <Field label="Date of Birth (YYYY-MM-DD)" value={dob} onChange={setDob} colors={colors} keyboardType="numeric" />

            <View style={styles.switchRow}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{t("screens.children_id.school_going")}</Text>
              <TouchableOpacity
                style={[styles.toggle, { backgroundColor: isSchool ? colors.primary : colors.muted }]}
                onPress={() => { setIsSchool(!isSchool); Haptics.selectionAsync(); }}
              >
                <View style={[styles.toggleKnob, { transform: [{ translateX: isSchool ? 20 : 2 }] }]} />
              </TouchableOpacity>
            </View>

            {isSchool && (
              <>
                <Field label="Class" value={childClass} onChange={setChildClass} colors={colors} />
                <Field label="School Start (HH:MM)" value={schoolStart} onChange={setSchoolStart} colors={colors} placeholder="09:00" />
                <Field label="School End (HH:MM)" value={schoolEnd} onChange={setSchoolEnd} colors={colors} placeholder="15:00" />

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6, marginTop: 4 }]}>
                  School Days
                </Text>
                <View style={styles.chipRow}>
                  {WEEKDAYS.map((d) => {
                    const on = schoolDays.includes(d.iso);
                    return (
                      <TouchableOpacity
                        key={d.iso}
                        style={[styles.chip, { backgroundColor: on ? colors.primary : colors.card, borderColor: on ? colors.primary : colors.border }]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSchoolDays((cur) => cur.includes(d.iso) ? cur.filter((x) => x !== d.iso) : [...cur, d.iso].sort());
                        }}
                      >
                        <Text style={[styles.chipText, { color: on ? "#fff" : colors.foreground }]}>{d.short}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <Field label="Wake Up Time (HH:MM)" value={wakeUp} onChange={setWakeUp} colors={colors} placeholder="07:00" />
            <Field label="Sleep Time (HH:MM)" value={sleep} onChange={setSleep} colors={colors} placeholder="21:00" />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>{t("screens.children_id.food_type")}</Text>
            <View style={styles.chipRow}>
              {FOOD_TYPES.map(f => (
                <TouchableOpacity key={f.value}
                  style={[styles.chip, { backgroundColor: foodType === f.value ? colors.primary : colors.card, borderColor: foodType === f.value ? colors.primary : colors.border }]}
                  onPress={() => { setFoodType(f.value); Haptics.selectionAsync(); }}>
                  <Text style={[styles.chipText, { color: foodType === f.value ? "#fff" : colors.foreground }]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6, marginTop: 4 }]}>{t("screens.children_id.travel_mode")}</Text>
            <View style={styles.chipRow}>
              {TRAVEL_MODES.map(t => (
                <TouchableOpacity key={t.value}
                  style={[styles.chip, { backgroundColor: travelMode === t.value ? colors.primary : colors.card, borderColor: travelMode === t.value ? colors.primary : colors.border }]}
                  onPress={() => { setTravelMode(t.value); Haptics.selectionAsync(); }}>
                  <Text style={[styles.chipText, { color: travelMode === t.value ? "#fff" : colors.foreground }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {travelMode === "other" && (
              <Field
                label="Specify travel mode"
                value={travelModeOther}
                onChange={setTravelModeOther}
                colors={colors}
                placeholder={t("screens.children_id.e_g_bus_auto_cycle")}
              />
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6, marginTop: 4 }]}>
              Assigned Babysitter
            </Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: babysitterId === null ? colors.primary : colors.card, borderColor: babysitterId === null ? colors.primary : colors.border }]}
                onPress={() => { setBabysitterId(null); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.chipText, { color: babysitterId === null ? "#fff" : colors.foreground }]}>{t("screens.children_id.none")}</Text>
              </TouchableOpacity>
              {babysitters.map((b) => (
                <TouchableOpacity key={b.id}
                  style={[styles.chip, { backgroundColor: babysitterId === b.id ? colors.primary : colors.card, borderColor: babysitterId === b.id ? colors.primary : colors.border }]}
                  onPress={() => { setBabysitterId(b.id); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.chipText, { color: babysitterId === b.id ? "#fff" : colors.foreground }]}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {babysitters.length === 0 && (
              <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                Add babysitters from the Babysitters tab to assign them here.
              </Text>
            )}

            {isInfant && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6, marginTop: 4 }]}>
                  Feeding Type
                </Text>
                <View style={styles.chipRow}>
                  {FEEDING_TYPES.map((f) => {
                    const on = feedingType === f.value;
                    return (
                      <TouchableOpacity key={f.value}
                        style={[styles.chip, { backgroundColor: on ? colors.primary : colors.card, borderColor: on ? colors.primary : colors.border }]}
                        onPress={() => { setFeedingType(on ? null : f.value); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.chipText, { color: on ? "#fff" : colors.foreground }]}>{f.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6, marginTop: 4 }]}>
                  Sleep Pattern
                </Text>
                <View style={styles.chipRow}>
                  {INFANT_SLEEP_PATTERNS.map((p) => {
                    const on = sleepPattern === p.value;
                    return (
                      <TouchableOpacity key={p.value}
                        style={[styles.chip, { backgroundColor: on ? colors.primary : colors.card, borderColor: on ? colors.primary : colors.border }]}
                        onPress={() => { setSleepPattern(on ? null : p.value); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.chipText, { color: on ? "#fff" : colors.foreground }]}>{p.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[styles.helperText, { color: colors.mutedForeground }]}>
                  Helps Amy AI tune feeding sessions and nap blocks for your infant's daily routine.
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.infoSection}>
            <InfoCard title={t("screens.children_id.daily_schedule")} colors={colors}>
              <InfoRow icon="sunny-outline" label="Wake Up" value={child?.wakeUpTime ?? "—"} colors={colors} />
              <InfoRow icon="moon-outline" label="Sleep" value={child?.sleepTime ?? "—"} colors={colors} />
              {child?.isSchoolGoing && (
                <>
                  <InfoRow icon="school-outline" label="School Start" value={child.schoolStartTime} colors={colors} />
                  <InfoRow icon="flag-outline" label="School End" value={child.schoolEndTime} colors={colors} />
                  <InfoRow
                    icon="calendar-outline"
                    label="School Days"
                    value={(() => {
                      const days = child.schoolDays;
                      if (!Array.isArray(days)) return "Mon, Tue, Wed, Thu, Fri";
                      if (days.length === 0) return "None";
                      const SHORT = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                      return [...days].sort().map((d) => SHORT[d] ?? "").filter(Boolean).join(", ");
                    })()}
                    colors={colors}
                  />
                  {child.childClass && <InfoRow icon="book-outline" label="Class" value={child.childClass} colors={colors} />}
                </>
              )}
            </InfoCard>
            <InfoCard title={t("screens.children_id.preferences")} colors={colors}>
              <InfoRow icon="restaurant-outline" label="Food" value={child?.foodType === "non_veg" ? "Non-Vegetarian" : "Vegetarian"} colors={colors} />
              <InfoRow
                icon="car-outline"
                label="Travel"
                value={
                  child?.travelMode === "other" && child?.travelModeOther
                    ? child.travelModeOther
                    : (child?.travelMode
                        ? child.travelMode.charAt(0).toUpperCase() + child.travelMode.slice(1)
                        : "Car")
                }
                colors={colors}
              />
            </InfoCard>
            {isInfant && ( // i18n-ok: Infant Care — technical section label
              <InfoCard title="Infant Care" colors={colors}>
                <InfoRow icon="nutrition-outline" label="Feeding" value={feedingLabel(child?.feedingType)} colors={colors} />
                <InfoRow icon="bed-outline" label="Sleep Pattern" value={sleepPatternLabel(child?.sleepPattern)} colors={colors} />
              </InfoCard>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: palette.red50, borderColor: palette.rose200 }]}
          onPress={handleDelete}
          testID="delete-child-btn"
        >
          <Ionicons name="trash-outline" size={18} color={palette.red500} />
          <Text style={styles.deleteBtnText}>{t("screens.children_id.remove_child")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  colors: Colors;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
};

function Field({ label, value, onChange, colors, placeholder, keyboardType }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.textInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
      />
    </View>
  );
}

type InfoCardProps = { title: string; children: React.ReactNode; colors: Colors };

function InfoCard({ title, children, colors }: InfoCardProps) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.infoCardTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

type InfoRowProps = { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string; colors: Colors };

function InfoRow({ icon, label, value, colors }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={16} color={colors.mutedForeground} />
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 24, paddingTop: 16 },
  avatar: { width: 60, height: 60, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarEmoji: { fontSize: 28 },
  childName: { fontSize: 20, fontFamily: "Inter_700Bold" },
  childMeta: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 3 },
  editIconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  formSection: { gap: 14, marginBottom: 20 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { height: 48, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  toggle: { width: 46, height: 26, borderRadius: 13, justifyContent: "center" },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  infoSection: { gap: 14, marginBottom: 20 },
  infoCard: { borderRadius: 18, borderWidth: 1, overflow: "hidden" },
  infoCardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", padding: 16, paddingBottom: 8 },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  infoLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1 },
  deleteBtnText: { color: palette.red500, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  photoCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
    overflow: "hidden", position: "relative",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  photoEditDot: {
    position: "absolute", right: 2, bottom: 2,
    width: 24, height: 24, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  photoHint: { fontSize: 12, fontFamily: "Inter_500Medium" },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
});
