import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import * as Haptics from "expo-haptics";

type Colors = ReturnType<typeof useColors>;

type Babysitter = { id: number; name: string };

const FOOD_TYPES: { label: string; value: string }[] = [
  { label: "Vegetarian", value: "veg" },
  { label: "Non-Vegetarian", value: "non_veg" },
];

const WEEKDAYS: { iso: number; short: string }[] = [
  { iso: 1, short: "Mon" }, { iso: 2, short: "Tue" }, { iso: 3, short: "Wed" },
  { iso: 4, short: "Thu" }, { iso: 5, short: "Fri" }, { iso: 6, short: "Sat" },
  { iso: 7, short: "Sun" },
];

function dobToAge(dob: string): { years: number; months: number } {
  const born = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  if (months < 0) { years--; months += 12; }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}

export default function NewChildScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [pickingPhoto, setPickingPhoto] = useState(false);

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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [babysitterId, setBabysitterId] = useState<number | null>(null);

  const { data: babysitters = [] } = useQuery<Babysitter[]>({
    queryKey: ["babysitters"],
    queryFn: async () => {
      const r = await authFetch("/api/babysitters");
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : (data?.babysitters ?? []);
    },
  });

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert(t("alerts.children.permission_title"), t("alerts.children.permission_msg_new"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      if (result.canceled || !result.assets[0]?.base64) return;
      setPickingPhoto(true);
      const a = result.assets[0];
      const dataUri = `data:${a.mimeType ?? "image/jpeg"};base64,${a.base64}`;
      setPhotoUrl(dataUri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Alert.alert(t("alerts.children.photo_error_title"), t("alerts.children.photo_error_msg"));
    } finally {
      setPickingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t("alerts.children.name_required_title"), t("alerts.children.name_required_msg")); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const { years, months } = dobToAge(dob || new Date().toISOString().slice(0, 10));
      await authFetch("/api/children", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(), dob: dob || "",
          age: years, ageMonths: months,
          isSchoolGoing: isSchool,
          childClass: isSchool ? childClass : "",
          schoolStartTime: schoolStart, schoolEndTime: schoolEnd,
          schoolDays: isSchool
            ? (schoolDays.length > 0 ? [...schoolDays].sort() : [1, 2, 3, 4, 5])
            : null,
          wakeUpTime: wakeUp, sleepTime: sleep,
          travelMode: "car", foodType, goals: "balanced-routine",
          photoUrl, babysitterId,
        }),
      });
      qc.invalidateQueries({ queryKey: ["children"] });
      router.back();
    } catch {
      Alert.alert(t("alerts.children.add_failed_title"), t("alerts.children.add_failed_msg"));
    } finally {
      setSaving(false);
    }
  };

  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 0);

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: botPad + 32, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Add Child</Text>

        {/* Photo picker */}
        <View style={styles.photoBlock}>
          <TouchableOpacity
            onPress={handlePickPhoto}
            disabled={pickingPhoto}
            activeOpacity={0.85}
            style={[styles.photoCircle, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Add child photo"
            testID="child-photo-picker"
          >
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.photoImg} />
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
          <Text style={[styles.photoHint, { color: colors.mutedForeground }]}>
            {photoUrl ? "Tap to change photo" : "Tap to add a photo (optional)"}
          </Text>
        </View>

        <View style={styles.formSection}>
          <Field label="Child's Name *" value={name} onChange={setName} colors={colors} placeholder="Enter name" />
          <Field label="Date of Birth (YYYY-MM-DD)" value={dob} onChange={setDob} colors={colors} placeholder="e.g. 2020-05-15" keyboardType="numeric" />

          <View style={styles.switchRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>School Going</Text>
            <TouchableOpacity
              style={[styles.toggle, { backgroundColor: isSchool ? colors.primary : colors.muted }]}
              onPress={() => { setIsSchool(!isSchool); Haptics.selectionAsync(); }}
            >
              <View style={[styles.toggleKnob, { transform: [{ translateX: isSchool ? 20 : 2 }] }]} />
            </TouchableOpacity>
          </View>

          {isSchool && (
            <>
              <Field label="Class" value={childClass} onChange={setChildClass} colors={colors} placeholder="e.g. 3rd" />
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

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6 }]}>Food Preference</Text>
          <View style={styles.chipRow}>
            {FOOD_TYPES.map(f => (
              <TouchableOpacity key={f.value}
                style={[styles.chip, { backgroundColor: foodType === f.value ? colors.primary : colors.card, borderColor: foodType === f.value ? colors.primary : colors.border }]}
                onPress={() => { setFoodType(f.value); Haptics.selectionAsync(); }}>
                <Text style={[styles.chipText, { color: foodType === f.value ? "#fff" : colors.foreground }]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginBottom: 6, marginTop: 4 }]}>
            Assigned Babysitter
          </Text>
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, { backgroundColor: babysitterId === null ? colors.primary : colors.card, borderColor: babysitterId === null ? colors.primary : colors.border }]}
              onPress={() => { setBabysitterId(null); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.chipText, { color: babysitterId === null ? "#fff" : colors.foreground }]}>None</Text>
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
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving || !name.trim() ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving || !name.trim()}
          testID="save-child-btn"
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Add Child</Text>
            </>
          )}
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
        value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 16 },
  photoBlock: { alignItems: "center", gap: 8, marginBottom: 20 },
  photoCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5,
    overflow: "hidden", position: "relative",
  },
  photoImg: { width: "100%", height: "100%" },
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
  formSection: { gap: 14, marginBottom: 24 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { height: 48, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  toggle: { width: 46, height: 26, borderRadius: 13, justifyContent: "center" },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  saveBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
