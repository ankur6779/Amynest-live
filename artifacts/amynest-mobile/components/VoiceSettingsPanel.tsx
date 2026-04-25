import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { brand } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useAmyVoice } from "@/hooks/useAmyVoice";

export const VOICE_KEY = "amynest.voice_settings.v1";

export type VoiceLang = "en-IN" | "hi-IN";
export type VoiceGender = "female" | "male";

export interface VoiceSettings {
  enabled: boolean;
  lang: VoiceLang;
  gender: VoiceGender;
  voiceName: string | null;
}

const DEFAULTS: VoiceSettings = {
  enabled: false,
  lang: "en-IN",
  gender: "female",
  voiceName: null,
};

export async function loadVoiceSettings(): Promise<VoiceSettings> {
  try {
    const raw = await AsyncStorage.getItem(VOICE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULTS.enabled,
      lang: parsed.lang === "hi-IN" || parsed.lang === "en-IN" ? parsed.lang : DEFAULTS.lang,
      gender: parsed.gender === "male" ? "male" : "female",
      voiceName: null,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveVoiceSettings(s: VoiceSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(VOICE_KEY, JSON.stringify(s));
  } catch {/* ignore */}
}

// ─── ElevenLabs Indian voices ─────────────────────────────────
interface ElevenLabsVoice {
  id: string;
  label: string;
  lang: VoiceLang;
  gender: VoiceGender;
  modelId: string;
  previewText: string;
}

const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  {
    id: "QbQKfe9vgx5OsbZUvlFv",
    label: "Ananya K",
    lang: "en-IN",
    gender: "female",
    modelId: "eleven_turbo_v2_5",
    previewText: "Hi! I am Ananya, your Indian English voice.",
  },
  {
    id: "oaz5NvoRIhcJystOASAA",
    label: "Karthik",
    lang: "en-IN",
    gender: "male",
    modelId: "eleven_turbo_v2_5",
    previewText: "Hi! I am Karthik, your Indian English voice.",
  },
  {
    id: "TllHtNijgXBd45uTSCS7",
    label: "Anjura",
    lang: "hi-IN",
    gender: "female",
    modelId: "eleven_multilingual_v2",
    previewText: "नमस्ते! मैं अंजुरा हूँ, आपकी हिंदी आवाज़।",
  },
  {
    id: "2cdvnKJ5TZi631y5PN1s",
    label: "Rahul S",
    lang: "hi-IN",
    gender: "male",
    modelId: "eleven_multilingual_v2",
    previewText: "नमस्ते! मैं राहुल हूँ, आपकी हिंदी आवाज़।",
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onChange: (s: VoiceSettings) => void;
}

function VoicePreviewButton({ voice }: { voice: ElevenLabsVoice }) {
  const { speaking, loading, speak, stop } = useAmyVoice({
    voiceId: voice.id,
    modelId: voice.modelId,
  });
  const c = useColors();

  const handlePress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    if (speaking || loading) {
      stop();
    } else {
      void speak(voice.previewText);
    }
  }, [speaking, loading, speak, stop, voice.previewText]);

  return (
    <Pressable onPress={handlePress} hitSlop={8} style={styles.playBtn}>
      {loading ? (
        <ActivityIndicator size={18} color={brand.violet500} />
      ) : (
        <Ionicons
          name={speaking ? "stop-circle" : "play-circle"}
          size={22}
          color={brand.violet500}
        />
      )}
    </Pressable>
  );
}

export default function VoiceSettingsPanel({ visible, onClose, settings, onChange }: Props) {
  const c = useColors();

  const filtered = ELEVENLABS_VOICES.filter((v) => v.lang === settings.lang && v.gender === settings.gender);

  const update = (patch: Partial<VoiceSettings>) => {
    const next = { ...settings, ...patch };
    onChange(next);
    void saveVoiceSettings(next);
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.card, borderColor: c.border }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.foreground }]}>🎙 Voice Settings</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={c.foreground} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {/* Enable toggle */}
            <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>READ-ALOUD</Text>
            <Pressable
              onPress={() => update({ enabled: !settings.enabled })}
              style={[styles.toggleRow, { backgroundColor: c.muted, borderColor: c.border }]}
            >
              <Ionicons
                name={settings.enabled ? "volume-high" : "volume-mute"}
                size={20}
                color={settings.enabled ? brand.violet500 : c.mutedForeground}
              />
              <Text style={[styles.toggleLabel, { color: c.foreground }]}>
                {settings.enabled ? "On — Amy will speak the current task" : "Off"}
              </Text>
              <View style={[styles.switch, { backgroundColor: settings.enabled ? brand.violet500 : c.border }]}>
                <View style={[styles.switchThumb, { transform: [{ translateX: settings.enabled ? 18 : 0 }] }]} />
              </View>
            </Pressable>

            {settings.enabled && (
              <>
                {/* Language */}
                <Text style={[styles.sectionLabel, { color: c.mutedForeground, marginTop: 16 }]}>LANGUAGE</Text>
                <View style={styles.rowGap}>
                  {(["en-IN", "hi-IN"] as VoiceLang[]).map((lang) => {
                    const active = settings.lang === lang;
                    return (
                      <Pressable
                        key={lang}
                        onPress={() => update({ lang, voiceName: null })}
                        style={[styles.chip, { borderColor: active ? brand.violet500 : c.border, backgroundColor: active ? brand.violet500 : "transparent" }]}
                      >
                        <Text style={[styles.chipText, { color: active ? "#fff" : c.foreground }]}>
                          {lang === "en-IN" ? "🇬🇧 English" : "🇮🇳 Hindi"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Gender */}
                <Text style={[styles.sectionLabel, { color: c.mutedForeground, marginTop: 16 }]}>VOICE GENDER</Text>
                <View style={styles.rowGap}>
                  {(["female", "male"] as VoiceGender[]).map((g) => {
                    const active = settings.gender === g;
                    return (
                      <Pressable
                        key={g}
                        onPress={() => update({ gender: g, voiceName: null })}
                        style={[styles.chip, { borderColor: active ? brand.violet500 : c.border, backgroundColor: active ? brand.violet500 : "transparent" }]}
                      >
                        <Text style={[styles.chipText, { color: active ? "#fff" : c.foreground }]}>
                          {g === "female" ? "👩 Female" : "👨 Male"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* ElevenLabs voice list */}
                <Text style={[styles.sectionLabel, { color: c.mutedForeground, marginTop: 16 }]}>VOICE</Text>
                <View style={[styles.voiceList, { borderColor: c.border }]}>
                  {filtered.map((v) => (
                    <View key={v.id} style={styles.voiceRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.voiceName, { color: c.foreground }]}>{v.label}</Text>
                        <Text style={[styles.voiceMeta, { color: c.mutedForeground }]}>
                          {v.lang === "hi-IN" ? "Hindi · ElevenLabs AI" : "Indian English · ElevenLabs AI"}
                        </Text>
                      </View>
                      <VoicePreviewButton voice={v} />
                      <Ionicons name="checkmark" size={18} color={brand.violet500} style={{ marginLeft: 6 }} />
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          <Text style={[styles.footer, { color: c.mutedForeground }]}>Powered by ElevenLabs AI 🎙</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 20 },
  sheet: { borderRadius: 24, borderWidth: 1, padding: 18, maxWidth: 440, width: "100%", alignSelf: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 16, fontWeight: "800" },
  sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginTop: 8, marginBottom: 8 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  toggleLabel: { flex: 1, fontSize: 13, fontWeight: "600" },
  switch: { width: 38, height: 22, borderRadius: 11, padding: 2, justifyContent: "center" },
  switchThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#fff" },
  rowGap: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 2, alignItems: "center" },
  chipText: { fontSize: 13, fontWeight: "700" },
  voiceList: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  voiceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
  voiceName: { fontSize: 13, fontWeight: "600" },
  voiceMeta: { fontSize: 10, marginTop: 2 },
  playBtn: { padding: 4 },
  footer: { fontSize: 10, textAlign: "center", marginTop: 10 },
});
