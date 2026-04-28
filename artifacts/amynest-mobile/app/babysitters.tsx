import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/useColors";
import { brand } from "@/constants/colors";

type Babysitter = { id: number; name: string; mobileNumber?: string; notes?: string; createdAt: string };

export default function BabysittersScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const { theme } = useTheme();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", mobileNumber: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data: sitters = [], isLoading } = useQuery<Babysitter[]>({
    queryKey: ["babysitters"],
    queryFn: async () => {
      const r = await authFetch("/api/babysitters");
      if (!r.ok) return [];
      return r.json();
    },
  });

  const handleAdd = async () => {
    if (!form.name.trim()) { Alert.alert("Name required"); return; }
    setSaving(true);
    try {
      const body: any = { name: form.name.trim() };
      if (form.mobileNumber.trim()) body.mobileNumber = form.mobileNumber.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();
      const res = await authFetch("/api/babysitters", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      await qc.invalidateQueries({ queryKey: ["babysitters"] });
      setForm({ name: "", mobileNumber: "", notes: "" });
      setOpen(false);
    } catch {
      Alert.alert("Error", "Could not add babysitter.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert("Remove babysitter", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          const r = await authFetch(`/api/babysitters/${id}`, { method: "DELETE" });
          if (!r.ok) throw new Error();
          await qc.invalidateQueries({ queryKey: ["babysitters"] });
        } catch { Alert.alert("Error", "Could not remove."); }
      }},
    ]);
  };

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <LinearGradient colors={["#FB7185", brand.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.headerIcon}>
          <MaterialCommunityIcons name="baby-face-outline" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{t("babysitters.title")}</Text>
          <Text style={styles.headerSubtitle}>Manage your trusted helpers</Text>
        </View>
        <Pressable onPress={() => setOpen(true)} style={styles.addBtn}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }}>
        {isLoading && <ActivityIndicator color={brand.accent} style={{ marginTop: 40 }} />}
        {!isLoading && sitters.length === 0 && (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="baby-face-outline" size={48} color="rgba(255,78,205,0.5)" />
            <Text style={styles.emptyTitle}>No babysitters yet</Text>
            <Text style={styles.emptyDesc}>Add a sitter so Amy can tailor routines for when they're on duty.</Text>
            <Pressable onPress={() => setOpen(true)} style={styles.primaryBtn}>
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Add your first sitter</Text>
            </Pressable>
          </View>
        )}
        {sitters.map(s => (
          <View key={s.id} style={styles.card}>
            <LinearGradient colors={[brand.primary, brand.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.avatar}>
              <Text style={styles.avatarText}>{s.name[0]?.toUpperCase()}</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{s.name}</Text>
              {s.mobileNumber && (
                <View style={styles.cardSubRow}>
                  <Ionicons name="call" size={11} color={c.textMuted} />
                  <Text style={styles.cardSub}>{s.mobileNumber}</Text>
                </View>
              )}
              {s.notes && <Text style={styles.cardNotes} numberOfLines={2}>{s.notes}</Text>}
            </View>
            <Pressable onPress={() => handleDelete(s.id, s.name)} hitSlop={10} style={styles.delBtn}>
              <Ionicons name="trash-outline" size={18} color="#FB7185" />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)} />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Babysitter</Text>
            <View style={{ gap: 12, marginTop: 8 }}>
              <View>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={form.name}
                  onChangeText={t => setForm(f => ({ ...f, name: t }))}
                  placeholder="e.g. Aisha Malik"
                  placeholderTextColor={c.textDim}
                />
              </View>
              <View>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  value={form.mobileNumber}
                  onChangeText={t => setForm(f => ({ ...f, mobileNumber: t }))}
                  placeholder="+92 300 1234567"
                  placeholderTextColor={c.textDim}
                  keyboardType="phone-pad"
                />
              </View>
              <View>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                  value={form.notes}
                  onChangeText={t => setForm(f => ({ ...f, notes: t }))}
                  placeholder="Special instructions, allergies, etc."
                  placeholderTextColor={c.textDim}
                  multiline
                />
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <Pressable onPress={() => setOpen(false)} style={[styles.modalBtn, styles.modalBtnCancel]}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleAdd} disabled={saving} style={[styles.modalBtn, { flex: 1 }]}>
                  <LinearGradient colors={[brand.primary, brand.accent]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.modalBtnGrad}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Add Sitter</Text>}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  headerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: c.text, fontWeight: "800", fontSize: 16 },
  headerSubtitle: { color: c.textMuted, fontSize: 11 },
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,78,205,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,78,205,0.4)" },

  emptyCard: { padding: 24, borderRadius: 24, alignItems: "center", gap: 10, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderStyle: "dashed", marginTop: 24 },
  emptyTitle: { color: c.text, fontWeight: "800", fontSize: 16 },
  emptyDesc: { color: c.textMuted, textAlign: "center", fontSize: 13 },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: brand.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, marginTop: 6 },
  primaryBtnText: { color: "#FFFFFF" /* audit-ok: on brand primary */, fontWeight: "700" },

  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF" /* audit-ok: on brand gradient */, fontWeight: "800", fontSize: 16 },
  cardName: { color: c.text, fontWeight: "700", fontSize: 15 },
  cardSubRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardSub: { color: c.textMuted, fontSize: 12 },
  cardNotes: { color: c.textDim, fontSize: 11, fontStyle: "italic", marginTop: 4 },
  delBtn: { padding: 6 },

  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  modalCard: { backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 6, borderTopWidth: 1, borderColor: "rgba(255,78,205,0.25)" },
  modalHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 8 },
  modalTitle: { color: c.text, fontSize: 18, fontWeight: "800" },
  label: { color: c.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 14 },
  modalBtn: { borderRadius: 14, overflow: "hidden", flex: 1 },
  modalBtnGrad: { paddingVertical: 14, alignItems: "center" },
  modalBtnCancel: { backgroundColor: c.surfaceElevated, paddingVertical: 14, alignItems: "center" },
});
