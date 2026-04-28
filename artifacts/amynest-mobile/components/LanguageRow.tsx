import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";
import { brand } from "@/constants/colors";

export function LanguageRow() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        style={styles.row}
      >
        <View style={styles.rowLeft}>
          <Ionicons name="globe-outline" size={18} color={brand.violet400} />
          <Text style={styles.label}>{t("nav.language")}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.value}>{current.native}</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.45)" />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <LinearGradient
              colors={["#1B1B3A", "#0F0C29"]} // audit-ok: deep navy gradient for language picker sheet
              style={styles.sheetInner}
            >
              <Text style={styles.sheetTitle}>{t("nav.language")}</Text>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const active = lang.code === i18n.language;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    activeOpacity={0.85}
                    onPress={async () => {
                      await setLanguage(lang.code as LanguageCode);
                      setOpen(false);
                    }}
                    style={styles.optionWrap}
                  >
                    {active ? (
                      <LinearGradient
                        colors={["rgba(123,63,242,0.35)", "rgba(255,78,205,0.25)"]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.option}
                      >
                        <Text style={[styles.optionText, { color: "#FFFFFF" }]}>{lang.native}</Text>
                        <Ionicons name="checkmark" size={20} color={brand.violet400} />
                      </LinearGradient>
                    ) : (
                      <View style={styles.option}>
                        <Text style={styles.optionText}>{lang.native}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </LinearGradient>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, marginBottom: 6,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
  value: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden",
    borderTopWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  sheetInner: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 36 },
  sheetTitle: {
    fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF",
    marginBottom: 16,
  },
  optionWrap: { marginBottom: 8 },
  option: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  optionText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
});
