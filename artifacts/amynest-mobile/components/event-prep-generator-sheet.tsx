import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal, SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import {
  EVENT_OCCASIONS, generateEventIdea,
  type AgeBand, type CostBudget, type EventOccasionId,
  type GeneratorIdea, type GeneratorResult, type TimeBudget,
} from "@workspace/event-prep";

interface Props {
  visible: boolean;
  onClose: () => void;
  onOpenCharacter: (characterId: string) => void;
}

const AGES: { id: AgeBand; label: string }[] = [
  { id: "2-5", label: "2–5 yrs" },
  { id: "6-10", label: "6–10 yrs" },
  { id: "10+", label: "10+ yrs" },
];
const TIMES: { id: TimeBudget; label: string }[] = [
  { id: 15, label: "15 min" },
  { id: 30, label: "30 min" },
  { id: 60, label: "1 hour" },
];
const BUDGETS: { id: CostBudget; label: string }[] = [
  { id: "low", label: "💸 Low" },
  { id: "medium", label: "💰 Medium" },
];

export function EventPrepGeneratorSheet({ visible, onClose, onOpenCharacter }: Props) {
  const [event, setEvent] = useState<EventOccasionId | "any">("any");
  const [age, setAge] = useState<AgeBand>("6-10");
  const [time, setTime] = useState<TimeBudget>(30);
  const [budget, setBudget] = useState<CostBudget>("low");
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const { speak: amySpeak, stop: amyStop } = useAmyVoice({
    onFinished: () => setSpeakingId(null),
  });

  React.useEffect(() => {
    if (!visible) {
      amyStop();
      setSpeakingId(null);
    }
  }, [visible, amyStop]);

  const handleGenerate = () => {
    amyStop();
    setSpeakingId(null);
    setResult(generateEventIdea({
      event: event === "any" ? undefined : event,
      ageBand: age,
      timeMinutes: time,
      budget,
    }));
  };

  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id) {
      amyStop();
      setSpeakingId(null);
      return;
    }
    amyStop();
    setSpeakingId(id);
    void amySpeak(text);
  };

  const openCharacter = (id: string) => { onClose(); onOpenCharacter(id); };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fdf2f8" }}>
        {/* Header */}
        <View style={S.header}>
          <View style={{ flex: 1 }}>
            <Text style={S.headerTitle}>✨ Amy AI Generator</Text>
            <Text style={S.headerSub}>Tell me a few things and I'll suggest the perfect idea ❤️</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color="#374151" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 64, gap: 14 }}>
          <Field label="Event">
            <ChipRow>
              <Chip active={event === "any"} onPress={() => setEvent("any")}>Any / Surprise me</Chip>
              {EVENT_OCCASIONS.map((c) => (
                <Chip key={c.id} active={event === c.id} onPress={() => setEvent(c.id)}>
                  {c.emoji} {c.title}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label="Child age">
            <ChipRow>
              {AGES.map((b) => (<Chip key={b.id} active={age === b.id} onPress={() => setAge(b.id)}>{b.label}</Chip>))}
            </ChipRow>
          </Field>

          <Field label="Time available">
            <ChipRow>
              {TIMES.map((t) => (<Chip key={t.id} active={time === t.id} onPress={() => setTime(t.id)}>{t.label}</Chip>))}
            </ChipRow>
          </Field>

          <Field label="Budget">
            <ChipRow>
              {BUDGETS.map((b) => (<Chip key={b.id} active={budget === b.id} onPress={() => setBudget(b.id)}>{b.label}</Chip>))}
            </ChipRow>
          </Field>

          <Pressable onPress={handleGenerate} style={S.cta}>
            <LinearGradient colors={["#db2777", "#9333ea"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.ctaGrad}>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={S.ctaText}>{result ? "Generate again" : "Generate idea"}</Text>
            </LinearGradient>
          </Pressable>

          {result && result.ideas.length > 0 && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <View style={S.introRow}>
                <Ionicons name="heart" size={14} color="#ec4899" />
                <Text style={S.introText}>{result.intro}</Text>
              </View>

              <IdeaCard idea={result.ideas[0]} highlight speakingId={speakingId} onSpeak={handleSpeak} onOpenFull={() => openCharacter(result.ideas[0].character.id)} />

              {result.ideas.length > 1 && (
                <Text style={S.altHead}>OTHER IDEAS</Text>
              )}
              {result.ideas.slice(1).map((alt) => (
                <IdeaCard key={alt.character.id} idea={alt} speakingId={speakingId} onSpeak={handleSpeak} onOpenFull={() => openCharacter(alt.character.id)} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function IdeaCard({
  idea, highlight, speakingId, onSpeak, onOpenFull,
}: {
  idea: GeneratorIdea;
  highlight?: boolean;
  speakingId: string | null;
  onSpeak: (id: string, text: string) => void;
  onOpenFull: () => void;
}) {
  const c = idea.character;
  return (
    <View style={[S.card, highlight && S.cardHighlight]}>
      <LinearGradient colors={c.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.cardHero}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 42 }}>{c.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={S.cardTitle}>{c.character}</Text>
            <Text style={S.cardTag}>{c.tagline}</Text>
          </View>
        </View>
        <View style={S.pillRow}>
          <View style={S.pill}><Ionicons name="time-outline" size={10} color="#fff" /><Text style={S.pillText}>{c.timeMinutes} min</Text></View>
          <View style={S.pill}><Text style={S.pillText}>{c.difficulty}</Text></View>
          {c.lowCost && <View style={S.pill}><Text style={S.pillText}>💸 Low cost</Text></View>}
          <View style={S.pillDark}><Text style={S.pillText}>{idea.template}</Text></View>
        </View>
      </LinearGradient>
      <View style={S.cardBody}>
        <Text style={S.reason}>{idea.reason}</Text>
        <Text style={S.bodyHead}>🧰 Materials</Text>
        {c.materials.slice(0, 4).map((m, i) => (
          <View key={i} style={S.bullet}><Text style={S.bulletDot}>•</Text><Text style={S.bulletText}>{m}</Text></View>
        ))}
        {c.materials.length > 4 && <Text style={S.more}>+ {c.materials.length - 4} more…</Text>}

        <Text style={[S.bodyHead, { marginTop: 8 }]}>📋 Quick steps</Text>
        {c.steps.slice(0, 3).map((s, i) => (
          <View key={i} style={S.bullet}><Text style={S.bulletDot}>{i + 1}.</Text><Text style={S.bulletText}>{s}</Text></View>
        ))}
        {c.steps.length > 3 && <Text style={S.more}>+ {c.steps.length - 3} more in full guide…</Text>}

        <View style={S.speechBox}>
          <View style={S.speechHead}>
            <Text style={S.bodyHead}>🎤 Speech</Text>
            <Pressable onPress={() => onSpeak(c.id, idea.speech)} style={S.playBtn}>
              <Ionicons name={speakingId === c.id ? "volume-mute" : "volume-high"} size={12} color="#fff" />
              <Text style={S.playText}>{speakingId === c.id ? "Stop" : "Play"}</Text>
            </Pressable>
          </View>
          <Text style={S.speechText}>"{idea.speech}"</Text>
        </View>

        <Pressable onPress={onOpenFull} style={S.openBtn}>
          <Text style={S.openBtnText}>Open full guide</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={S.fieldLabel}>{label}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}
function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}
function Chip({ active, onPress, children }: { active: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={[S.chip, active && S.chipActive]}>
      <Text style={[S.chipText, active && S.chipTextActive]}>{children}</Text>
    </Pressable>
  );
}

const S = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", padding: 16, paddingTop: 8, gap: 12, borderBottomWidth: 1, borderBottomColor: "#fbcfe8" },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#831843" },
  headerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: "#fbcfe8", backgroundColor: "#fff" },
  chipActive: { backgroundColor: "#9333ea", borderColor: "#9333ea" },
  chipText: { fontSize: 12, color: "#1f2937", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  cta: { borderRadius: 999, overflow: "hidden", marginTop: 6 },
  ctaGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
  ctaText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  introRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, paddingHorizontal: 4 },
  introText: { fontStyle: "italic", color: "#374151", fontSize: 13, flex: 1 },
  altHead: { fontSize: 11, fontWeight: "800", color: "#6b7280", marginTop: 8, letterSpacing: 0.5 },

  card: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" },
  cardHighlight: { borderWidth: 2, borderColor: "#ec4899" },
  cardHero: { padding: 16 },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  cardTag: { color: "rgba(255,255,255,0.92)", fontSize: 12, marginTop: 2 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillDark: { backgroundColor: "rgba(0,0,0,0.25)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { color: "#fff", fontSize: 10.5, fontWeight: "800" },

  cardBody: { padding: 14 },
  reason: { fontSize: 12, color: "#6b7280", fontStyle: "italic", marginBottom: 10 },
  bodyHead: { fontSize: 12, fontWeight: "800", color: "#1f2937", marginBottom: 4 },
  bullet: { flexDirection: "row", gap: 6, marginTop: 3, alignItems: "flex-start" },
  bulletDot: { fontSize: 13, color: "#9333ea", fontWeight: "800", lineHeight: 18, minWidth: 14 },
  bulletText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 },
  more: { fontSize: 11.5, color: "#9ca3af", marginTop: 4, fontStyle: "italic" },

  speechBox: { backgroundColor: "#fdf2f8", borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#fbcfe8" },
  speechHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  playBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#db2777", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  playText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  speechText: { fontSize: 13, fontStyle: "italic", color: "#1f2937", lineHeight: 19 },

  openBtn: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 999, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  openBtnText: { fontSize: 13, fontWeight: "700", color: "#374151" },
});
