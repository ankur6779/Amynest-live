import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import {
  EVENT_CATEGORIES, EVENT_CHARACTERS,
  charactersByCategory, applyFilters, recommendForChild, speechForAge,
  type EventCategory, type EventCharacter, type EventCategoryId, type EventFilter,
} from "@workspace/event-prep";
import { EventPrepGeneratorSheet } from "@/components/event-prep-generator-sheet";

type Child = { id: number; name: string; age: number; ageMonths?: number };

type View0 =
  | { kind: "child-pick" }
  | { kind: "home"; childId: number }
  | { kind: "category"; childId: number; categoryId: EventCategoryId }
  | { kind: "detail"; childId: number; characterId: string };

export default function EventPrepScreen() {
  const authFetch = useAuthFetch();
  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });

  const [view, setView] = useState<View0>({ kind: "child-pick" });
  const [filter, setFilter] = useState<EventFilter>({});
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const { speak, stop, speaking } = useAmyVoice();

  React.useEffect(() => {
    if (view.kind === "child-pick" && children.length === 1) {
      setView({ kind: "home", childId: children[0].id });
    }
  }, [children, view.kind]);

  // Sync speakingId with Amy's playing state
  React.useEffect(() => {
    if (!speaking) setSpeakingId(null);
  }, [speaking]);

  const child = useMemo(() => {
    if (view.kind === "child-pick") return null;
    return children.find((c) => c.id === (view as { childId: number }).childId) ?? null;
  }, [view, children]);

  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id && speaking) {
      stop();
      setSpeakingId(null);
      return;
    }
    stop();
    setSpeakingId(id);
    speak(text);
  };

  if (isLoading) {
    return (
      <LinearGradient colors={["#fdf2f8", "#fff7ed"]} style={S.center}>
        <ActivityIndicator size="large" color="#db2777" />
      </LinearGradient>
    );
  }

  if (children.length === 0) {
    return (
      <LinearGradient colors={["#fdf2f8", "#fff7ed"]} style={S.center}>
        <Stack.Screen options={{ title: "Event Prep" }} />
        <Text style={S.emptyTitle}>Add a child first</Text>
        <Text style={S.emptyDesc}>Event Prep needs your child's age to suggest the best ideas.</Text>
        <Pressable onPress={() => router.push("/children/new" as never)} style={S.primaryBtn}>
          <Text style={S.primaryBtnText}>Add Child</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  // ── child-pick ───────────────────────────────────────────────────────────
  if (view.kind === "child-pick") {
    return (
      <LinearGradient colors={["#fdf2f8", "#fff7ed"]} style={{ flex: 1 }}>
        <Stack.Screen options={{ title: "🎉 Event Prep" }} />
        <ScrollView contentContainerStyle={S.scroll}>
          <Text style={S.h1}>🎉 Event Prep</Text>
          <Text style={S.sub}>Pick a child to begin</Text>
          {children.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setView({ kind: "home", childId: c.id })}
              style={S.childCard}
            >
              <View style={S.childAvatar}><Text style={{ fontSize: 24 }}>👧</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={S.childName}>{c.name}</Text>
                <Text style={S.childAge}>Age {c.age}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          ))}
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── home ─────────────────────────────────────────────────────────────────
  if (view.kind === "home" && child) {
    return (
      <LinearGradient colors={["#fdf2f8", "#fff7ed"]} style={{ flex: 1 }}>
        <Stack.Screen options={{ title: "🎉 Event Prep" }} />
        <ScrollView contentContainerStyle={S.scroll}>
          <Text style={S.h1}>🎉 Event Prep</Text>
          <Text style={S.sub}>Quick fancy dress, DIY guide & speeches for {child.name}</Text>

          {/* Amy AI Generator entry */}
          <Pressable onPress={() => setGenOpen(true)} style={S.lastMinHero}>
            <LinearGradient
              colors={["#9333ea", "#db2777", "#f97316"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={S.heroGrad}
            >
              <View style={S.heroIcon}><Ionicons name="sparkles" size={26} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={S.heroTitle}>✨ Amy AI Generator</Text>
                <Text style={S.heroSub}>Tell Amy your event, time & budget</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>

          {/* Last-Minute hero */}
          <Pressable
            onPress={() => {
              setFilter({ lastMinute: true });
              setView({ kind: "category", childId: child.id, categoryId: "fancy-dress" });
            }}
            style={S.lastMinHero}
          >
            <LinearGradient
              colors={["#fbbf24", "#f97316", "#ec4899"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={S.heroGrad}
            >
              <View style={S.heroIcon}><Ionicons name="flash" size={28} color="#fff" /></View>
              <View style={{ flex: 1 }}>
                <Text style={S.heroTitle}>⏱ Last-Minute Mode</Text>
                <Text style={S.heroSub}>30 min · easy · stuff already at home</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>

          {/* Amy AI picks */}
          <Text style={S.h2}>✨ Amy AI picks for {child.name}</Text>
          <AmyRecsRow child={child} onOpen={(id) => setView({ kind: "detail", childId: child.id, characterId: id })} />

          {/* Categories */}
          <Text style={S.h2}>Browse by event</Text>
          {EVENT_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => { setFilter({}); setView({ kind: "category", childId: child.id, categoryId: cat.id }); }}
              style={S.catCard}
            >
              <LinearGradient
                colors={cat.accent}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={S.catGrad}
              >
                <Text style={S.catEmoji}>{cat.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.catTitle}>{cat.title}</Text>
                  <Text style={S.catBlurb}>{cat.blurb}</Text>
                </View>
                <Text style={S.catCount}>{charactersByCategory(cat.id).length}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        <EventPrepGeneratorSheet
          visible={genOpen}
          onClose={() => setGenOpen(false)}
          onOpenCharacter={(id) => setView({ kind: "detail", childId: child.id, characterId: id })}
        />
      </LinearGradient>
    );
  }

  // ── category ─────────────────────────────────────────────────────────────
  if (view.kind === "category" && child) {
    const cat = EVENT_CATEGORIES.find((c) => c.id === view.categoryId);
    if (!cat) {
      setView({ kind: "home", childId: child.id });
      return null;
    }
    const all = filter.lastMinute ? EVENT_CHARACTERS : charactersByCategory(view.categoryId);
    const filtered = applyFilters(all, filter);

    return (
      <LinearGradient colors={["#fdf2f8", "#fff7ed"]} style={{ flex: 1 }}>
        <Stack.Screen options={{ title: filter.lastMinute ? "Last-Minute Picks" : cat.title }} />
        <ScrollView contentContainerStyle={S.scroll}>
          <Pressable onPress={() => setView({ kind: "home", childId: child.id })} style={S.backRow}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text style={S.backText}>Back</Text>
          </Pressable>
          <Text style={S.h1}>{filter.lastMinute ? "⏱ Last-Minute Picks" : `${cat.emoji} ${cat.title}`}</Text>
          <Text style={S.sub}>{filter.lastMinute ? "Easy · low-cost · 30 min or less" : cat.blurb}</Text>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipRow}>
            <Chip active={!!filter.easyOnly}    onPress={() => setFilter({ ...filter, easyOnly: !filter.easyOnly,    lastMinute: false })}>Easy</Chip>
            <Chip active={!!filter.lowCostOnly} onPress={() => setFilter({ ...filter, lowCostOnly: !filter.lowCostOnly, lastMinute: false })}>💸 Low cost</Chip>
            <Chip active={!!filter.quickOnly}   onPress={() => setFilter({ ...filter, quickOnly: !filter.quickOnly,   lastMinute: false })}>⚡ ≤ 30 min</Chip>
            {filter.lastMinute && <Chip active onPress={() => setFilter({})}>⏱ Last-Minute (clear)</Chip>}
          </ScrollView>

          {filtered.length === 0 ? (
            <View style={S.emptyBox}>
              <Text style={S.emptyDesc}>No ideas match these filters. Try removing a filter.</Text>
            </View>
          ) : (
            filtered.map((ch) => (
              <Pressable
                key={ch.id}
                onPress={() => setView({ kind: "detail", childId: child.id, characterId: ch.id })}
                style={S.charCard}
              >
                <LinearGradient colors={ch.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.charBanner}>
                  <Text style={S.charEmoji}>{ch.emoji}</Text>
                  <View style={S.timeBadge}>
                    <Ionicons name="time-outline" size={10} color="#fff" />
                    <Text style={S.timeBadgeText}>{ch.timeMinutes} min</Text>
                  </View>
                  <View style={S.diffBadge}><Text style={S.diffBadgeText}>{ch.difficulty}</Text></View>
                  {ch.lowCost && <View style={S.lowCostBadge}><Text style={S.diffBadgeText}>💸</Text></View>}
                </LinearGradient>
                <View style={S.charBody}>
                  <Text style={S.charName}>{ch.character}</Text>
                  <Text style={S.charTagline} numberOfLines={1}>{ch.tagline}</Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </LinearGradient>
    );
  }

  // ── detail ───────────────────────────────────────────────────────────────
  if (view.kind === "detail" && child) {
    const ch = EVENT_CHARACTERS.find((c) => c.id === view.characterId);
    if (!ch) {
      setView({ kind: "home", childId: child.id });
      return null;
    }
    const speech = speechForAge(ch, child.age);
    return (
      <LinearGradient colors={["#fdf2f8", "#fff7ed"]} style={{ flex: 1 }}>
        <Stack.Screen options={{ title: ch.character }} />
        <ScrollView contentContainerStyle={S.scroll}>
          <Pressable onPress={() => setView({ kind: "home", childId: child.id })} style={S.backRow}>
            <Ionicons name="arrow-back" size={20} color="#374151" />
            <Text style={S.backText}>Back</Text>
          </Pressable>

          {/* Hero */}
          <LinearGradient colors={ch.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.detailHero}>
            <Text style={S.detailEmoji}>{ch.emoji}</Text>
            <Text style={S.detailTitle}>{ch.character}</Text>
            <Text style={S.detailTag}>{ch.tagline}</Text>
            <View style={S.pillRow}>
              <View style={S.pill}><Ionicons name="time-outline" size={12} color="#fff" /><Text style={S.pillText}>{ch.timeMinutes} min</Text></View>
              <View style={S.pill}><Text style={S.pillText}>{ch.difficulty}</Text></View>
              {ch.lowCost && <View style={S.pill}><Text style={S.pillText}>💸 Low cost</Text></View>}
            </View>
          </LinearGradient>

          {/* Materials */}
          <View style={S.detailCard}>
            <Text style={S.detailHead}>🧰 Materials Needed</Text>
            {ch.materials.map((m, i) => (
              <View key={i} style={S.bulletRow}>
                <Text style={S.bullet}>•</Text>
                <Text style={S.bulletText}>{m}</Text>
              </View>
            ))}
          </View>

          {/* Steps */}
          <View style={S.detailCard}>
            <Text style={S.detailHead}>📋 Step-by-step</Text>
            {ch.steps.map((s, i) => (
              <View key={i} style={S.bulletRow}>
                <View style={S.stepNum}><Text style={S.stepNumText}>{i + 1}</Text></View>
                <Text style={S.bulletText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Speech */}
          <View style={[S.detailCard, { backgroundColor: "#fdf2f8", borderColor: "#fbcfe8" }]}>
            <View style={S.speechHead}>
              <Text style={S.detailHead}>🎤 Your Speech</Text>
              <Pressable onPress={() => handleSpeak(ch.id, speech)} style={S.speechBtn}>
                <Ionicons
                  name={speakingId === ch.id ? "volume-mute" : "volume-high"}
                  size={14}
                  color="#fff"
                />
                <Text style={S.speechBtnText}>{speakingId === ch.id ? "Stop" : "Read aloud"}</Text>
              </Pressable>
            </View>
            <Text style={S.speechText}>"{speech}"</Text>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return null;
}

function Chip({ active, onPress, children }: { active: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} style={[S.chip, active && S.chipActive]}>
      <Text style={[S.chipText, active && S.chipTextActive]}>{children}</Text>
    </Pressable>
  );
}

function AmyRecsRow({ child, onOpen }: { child: Child; onOpen: (id: string) => void }) {
  const m = new Date().getMonth();
  const cat: EventCategoryId =
    m === 0 ? "republic-day" :
    (m === 7 || m === 8) ? "independence-day" :
    m === 9 ? "gandhi-jayanti" :
    (m === 11 || m === 1) ? "annual-day" : "fancy-dress";
  const recs = recommendForChild(cat, child.age);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      {recs.map((ch) => (
        <Pressable key={ch.id} onPress={() => onOpen(ch.id)} style={S.recCard}>
          <Text style={{ fontSize: 32 }}>{ch.emoji}</Text>
          <Text style={S.recName}>{ch.character}</Text>
          <Text style={S.recMeta}>{ch.timeMinutes} min · {ch.difficulty}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  scroll: { padding: 16, paddingBottom: 64, gap: 10 },
  h1: { fontSize: 22, fontWeight: "800", color: "#831843", marginTop: 4 },
  h2: { fontSize: 15, fontWeight: "800", color: "#831843", marginTop: 16, marginBottom: 4 },
  sub: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  backText: { fontSize: 14, color: "#374151", fontWeight: "600" },

  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#9d174d", marginTop: 12 },
  emptyDesc: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 6, marginHorizontal: 12 },
  emptyBox: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center", marginTop: 12, borderWidth: 1, borderColor: "#fbcfe8" },
  primaryBtn: { backgroundColor: "#db2777", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999, marginTop: 16 },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  childCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: "#fff", borderRadius: 14, marginTop: 8, borderWidth: 1, borderColor: "#fbcfe8" },
  childAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fce7f3", alignItems: "center", justifyContent: "center" },
  childName: { fontSize: 15, fontWeight: "700", color: "#1f2937" },
  childAge: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  lastMinHero: { borderRadius: 18, overflow: "hidden", marginTop: 8 },
  heroGrad: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  heroIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.95)", fontSize: 12, marginTop: 2 },

  catCard: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  catGrad: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  catEmoji: { fontSize: 30 },
  catTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  catBlurb: { color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 },
  catCount: { color: "#fff", fontSize: 14, fontWeight: "800", backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },

  chipRow: { gap: 8, paddingVertical: 10, paddingRight: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: "#fbcfe8", backgroundColor: "#fff" },
  chipActive: { backgroundColor: "#db2777", borderColor: "#db2777" },
  chipText: { fontSize: 12, color: "#1f2937", fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  charCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", marginTop: 10, borderWidth: 1, borderColor: "#fbcfe8" },
  charBanner: { height: 110, alignItems: "center", justifyContent: "center", position: "relative" },
  charEmoji: { fontSize: 50 },
  timeBadge: { position: "absolute", top: 8, right: 8, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.4)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  timeBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  diffBadge: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(255,255,255,0.3)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  lowCostBadge: { position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(255,255,255,0.3)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  diffBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  charBody: { padding: 12 },
  charName: { fontSize: 15, fontWeight: "800", color: "#1f2937" },
  charTagline: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  recCard: { backgroundColor: "#fff", borderRadius: 14, padding: 12, width: 130, borderWidth: 1, borderColor: "#fbcfe8" },
  recName: { fontSize: 13, fontWeight: "800", color: "#1f2937", marginTop: 4 },
  recMeta: { fontSize: 10, color: "#6b7280", marginTop: 2 },

  detailHero: { borderRadius: 20, padding: 24, alignItems: "center", marginTop: 8 },
  detailEmoji: { fontSize: 72 },
  detailTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 8 },
  detailTag: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.4)", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  detailCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1, borderColor: "#e5e7eb" },
  detailHead: { fontSize: 15, fontWeight: "800", color: "#1f2937", marginBottom: 8 },
  bulletRow: { flexDirection: "row", gap: 8, marginTop: 6, alignItems: "flex-start" },
  bullet: { fontSize: 16, color: "#db2777", lineHeight: 20 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#db2777", alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  bulletText: { flex: 1, fontSize: 13.5, color: "#374151", lineHeight: 20 },

  speechHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  speechBtn: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#db2777", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  speechBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  speechText: { fontSize: 15, fontStyle: "italic", color: "#1f2937", lineHeight: 22, marginTop: 4 },
});
