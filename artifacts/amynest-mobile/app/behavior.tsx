import React, { useState, useMemo, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, Alert, LayoutAnimation, UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useTheme } from "@/contexts/ThemeContext";
import colors, { brand } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import {
  QUICK_BEHAVIORS, QUICK_BEHAVIOR_KEYS, TRIGGERS, TRIGGER_KEYS,
  SOLUTIONS, SITUATION_HELP, UI_LABELS, buildAmyInsights, computeScore, scoreLabel,
  encodeTriggerNote,
  type LangKey, type QuickBehaviorKey, type TriggerKey,
} from "@workspace/behavior-tracker";
import LockedBlock from "@/components/LockedBlock";
import { useSubscriptionStore, selectIsPremium } from "@/store/useSubscriptionStore";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Child = { id: number; name: string };
type Behavior = { id: number; childId: number; childName?: string; date: string; type: string; behavior: string; notes?: string | null; createdAt?: string };

function animateLayout() {
  LayoutAnimation.configureNext({
    duration: 220,
    create: { type: "easeInEaseOut", property: "opacity" },
    update: { type: "easeInEaseOut" },
    delete: { type: "easeInEaseOut", property: "opacity" },
  });
}

// ─── Glass Block ──────────────────────────────────────────────────────────────
function Block({
  icon, title, subtitle, open, onToggle, children, accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  accentColor?: string;
}) {
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const borderColor = open ? (accentColor ?? "#FF4ECD") : c.border;
  return (
    <View style={[styles.block, { borderColor }]}>
      <Pressable
        onPress={() => { animateLayout(); onToggle(); }}
        style={({ pressed }) => [styles.blockHeader, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.blockIconWrap}>{icon}</View>
        <View style={{ flex: 1 }}>
          <Text style={styles.blockTitle}>{title}</Text>
          <Text style={styles.blockSubtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.chevWrap, open && { borderColor: accentColor ?? "#FF4ECD", backgroundColor: (accentColor ?? "#FF4ECD") + "22" }]}>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={14}
            color={open ? (accentColor ?? "#FF4ECD") : c.textMuted}
          />
        </View>
      </Pressable>
      {open && <View style={styles.blockBody}>{children}</View>}
    </View>
  );
}

// ─── Language Toggle ───────────────────────────────────────────────────────────
function LangToggle({ lang, setLang }: { lang: LangKey; setLang: (l: LangKey) => void }) {
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const opts: { key: LangKey; label: string }[] = [
    { key: "en", label: "EN" },
    { key: "hi", label: "हिं" },
    { key: "hinglish", label: "Hng" },
  ];
  return (
    <View style={styles.langRow}>
      {opts.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => setLang(o.key)}
          style={[styles.langBtn, lang === o.key && styles.langBtnActive]}
        >
          <Text style={[styles.langBtnText, lang === o.key && { color: "#fff" }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BehaviorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const { theme } = useTheme();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);
  const qc = useQueryClient();
  const isPremium = useSubscriptionStore(selectIsPremium);

  const [lang, setLang] = useState<LangKey>("en");
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [pendingTrigger, setPendingTrigger] = useState<TriggerKey | null>(null);
  const [openBlock, setOpenBlock] = useState<string | null>("quick-log");
  const [situationKey, setSituationKey] = useState<"crying" | "angry" | "not_listening" | null>(null);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const L = UI_LABELS[lang];

  const toggle = (id: string) => {
    animateLayout();
    setOpenBlock((c) => (c === id ? null : id));
  };

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["children"],
    queryFn: async () => { const r = await authFetch("/api/children"); return r.ok ? r.json() : []; },
  });

  const { data: allBehaviors = [], isLoading } = useQuery<Behavior[]>({
    queryKey: ["behaviors"],
    queryFn: async () => { const r = await authFetch("/api/behaviors"); return r.ok ? r.json() : []; },
  });

  // Free users can only see the first child's data. If they somehow have
  // another child selected, force the scope back to child #1.
  const firstChildId = children[0]?.id ?? null;
  const effectiveChildId = isPremium
    ? selectedChild
    : (selectedChild && selectedChild === firstChildId ? selectedChild : firstChildId);

  const todayLogs = useMemo(
    () => allBehaviors.filter((b) => b.date?.slice(0, 10) === today && (!effectiveChildId || b.childId === effectiveChildId)),
    [allBehaviors, today, effectiveChildId]
  );

  const insightLogs = useMemo(
    () => (effectiveChildId ? allBehaviors.filter((b) => b.childId === effectiveChildId) : allBehaviors),
    [allBehaviors, effectiveChildId]
  );

  const insights = useMemo(() => buildAmyInsights(insightLogs as any, lang), [insightLogs, lang]);

  const score = computeScore(todayLogs as any);
  const pos = todayLogs.filter((l) => l.type === "positive").length;
  const neg = todayLogs.filter((l) => l.type === "negative").length;
  const neu = todayLogs.filter((l) => l.type === "neutral").length;

  // Weekly trends
  const weekData = useMemo(() => {
    const days: { label: string; pos: number; neg: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLogs = allBehaviors.filter((b) => b.date?.slice(0, 10) === dateStr && (!effectiveChildId || b.childId === effectiveChildId));
      days.push({
        label: L.days[d.getDay()],
        pos: dayLogs.filter((l) => l.type === "positive").length,
        neg: dayLogs.filter((l) => l.type === "negative").length,
        total: dayLogs.length,
      });
    }
    return days;
  }, [allBehaviors, effectiveChildId, lang]);

  const maxWeek = Math.max(...weekData.map((d) => d.total), 1);

  async function quickLog(key: QuickBehaviorKey) {
    if (!selectedChild) {
      Alert.alert("Select a child first");
      return;
    }
    const def = QUICK_BEHAVIORS[key];
    setSaving(true);
    try {
      const r = await authFetch("/api/behaviors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedChild,
          type: def.type,
          behavior: def.behaviorText.en,
          notes: pendingTrigger ? encodeTriggerNote(pendingTrigger) : undefined,
          date: new Date().toISOString(),
        }),
      });
      if (r.status === 402) {
        let reason = "behavior_locked";
        try {
          const body = await r.clone().json();
          if (body?.error === "child_locked") reason = "child_locked";
        } catch {}
        router.push({ pathname: "/paywall", params: { reason } });
        return;
      }
      if (!r.ok) throw new Error();
      await qc.invalidateQueries({ queryKey: ["behaviors"] });
      setPendingTrigger(null);
    } catch {
      Alert.alert("Error", "Could not log behavior.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    Alert.alert("Delete", "Remove this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const r = await authFetch(`/api/behaviors/${id}`, { method: "DELETE" });
            if (r.status === 402) {
              let reason = "child_locked";
              try {
                const body = await r.clone().json();
                if (body?.error === "child_locked") reason = "child_locked";
              } catch {}
              router.push({ pathname: "/paywall", params: { reason } });
              return;
            }
            if (!r.ok) throw new Error();
            await qc.invalidateQueries({ queryKey: ["behaviors"] });
          } catch { Alert.alert("Error", "Could not delete."); }
        }
      },
    ]);
  }

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <LinearGradient colors={["#FBBF24", "#FB7185"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerIcon}>
          <Ionicons name="happy" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Behavior Tracker</Text>
          <Text style={styles.headerSubtitle}>Log moments — Amy spots the patterns</Text>
        </View>
        <LangToggle lang={lang} setLang={setLang} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100, gap: 10 }} showsVerticalScrollIndicator={false}>
        {/* Child selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          {children.map((child, index) => {
            const locked = !isPremium && index > 0;
            const chip = (
              <Pressable
                onPress={() => {
                  if (locked) return;
                  setSelectedChild((v) => (v === child.id ? null : child.id));
                }}
                disabled={locked}
                style={[styles.childChip, selectedChild === child.id && styles.childChipSel]}
              >
                <Text style={[styles.childChipText, selectedChild === child.id && { color: "#fff" }]}>{child.name}</Text>
              </Pressable>
            );
            return (
              <LockedBlock
                key={child.id}
                locked={locked}
                reason="child_limit"
                label="Premium"
                cta="Unlock"
                radius={14}
              >
                {chip}
              </LockedBlock>
            );
          })}
          {children.length === 0 && <Text style={{ color: c.textDim, fontSize: 13 }}>Add a child to start tracking</Text>}
        </ScrollView>

        {/* Per-child quick stat cards (free users see only the first; the rest are paywalled) */}
        {children.length > 1 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {children.map((child, index) => {
              const childLogsToday = allBehaviors.filter((b) => b.childId === child.id && b.date?.slice(0, 10) === today);
              const childPos = childLogsToday.filter((l) => l.type === "positive").length;
              const childNeg = childLogsToday.filter((l) => l.type === "negative").length;
              const locked = !isPremium && index > 0;
              const card = (
                <View style={[styles.childStatCard, { borderColor: c.border }]}>
                  <Text style={[styles.childStatName, { color: c.text }]} numberOfLines={1}>{child.name}</Text>
                  <Text style={[styles.childStatLabel, { color: c.textMuted }]}>Today</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#10B981" }}>😊 {childPos}</Text>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: "#EF4444" }}>😡 {childNeg}</Text>
                  </View>
                </View>
              );
              return (
                <LockedBlock
                  key={child.id}
                  locked={locked}
                  reason="child_limit"
                  label="Premium"
                  cta="Unlock"
                  radius={16}
                  style={{ flexBasis: "48%", flexGrow: 1 }}
                >
                  {card}
                </LockedBlock>
              );
            })}
          </View>
        )}

        {/* Quick Help button */}
        <Pressable
          onPress={() => setSituationKey("crying")}
          style={styles.quickHelpBtn}
        >
          <Ionicons name="help-circle-outline" size={16} color="#FB7185" />
          <Text style={styles.quickHelpText}>{L.situationMode}</Text>
        </Pressable>

        {/* BLOCK 1: Quick Log */}
        <Block
          icon={<LinearGradient colors={["#F59E0B", "#FB7185"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconGrad}><Ionicons name="flash" size={18} color="#fff" /></LinearGradient>}
          title={L.quickLog}
          subtitle={L.tap1Log}
          open={openBlock === "quick-log"}
          onToggle={() => toggle("quick-log")}
          accentColor="#F59E0B"
        >
          {/* Behavior buttons */}
          <View style={styles.quickGrid}>
            {QUICK_BEHAVIOR_KEYS.map((key) => {
              const def = QUICK_BEHAVIORS[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => quickLog(key)}
                  disabled={saving}
                  style={({ pressed }) => [styles.quickBtn, { borderColor: def.color + "55", opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={{ fontSize: 24 }}>{def.emoji}</Text>
                  <Text style={[styles.quickBtnLabel, { color: def.color }]}>{def.label[lang]}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Trigger selector */}
          <Text style={styles.sectionLabel}>{L.selectTrigger}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TRIGGER_KEYS.map((k) => {
              const t = TRIGGERS[k];
              return (
                <Pressable
                  key={k}
                  onPress={() => setPendingTrigger((v) => (v === k ? null : k))}
                  style={[styles.triggerChip, pendingTrigger === k && styles.triggerChipSel]}
                >
                  <Text style={{ fontSize: 14 }}>{t.emoji}</Text>
                  <Text style={[styles.triggerChipText, pendingTrigger === k && { color: "#fff" }]}>{t.label[lang]}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Today's log */}
          {isLoading ? <ActivityIndicator color="#FF4ECD" style={{ marginTop: 12 }} /> : todayLogs.length > 0 ? (
            <View style={{ marginTop: 12, gap: 6 }}>
              <Text style={styles.sectionLabel}>{L.loggedToday} ({todayLogs.length})</Text>
              {todayLogs.map((b) => {
                const matchedKey = QUICK_BEHAVIOR_KEYS.find((k) => QUICK_BEHAVIORS[k].behaviorText.en === b.behavior);
                const def = matchedKey ? QUICK_BEHAVIORS[matchedKey] : null;
                return (
                  <View key={b.id} style={styles.logRow}>
                    <Text style={{ fontSize: 18 }}>{def?.emoji ?? (b.type === "positive" ? "😊" : b.type === "negative" ? "😡" : "😐")}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logText}>{b.behavior}</Text>
                      {b.notes ? <Text style={styles.logNotes}>{b.notes.replace(/\[trigger:\w+\]\s?/, "")}</Text> : null}
                    </View>
                    <Pressable onPress={() => handleDelete(b.id)} hitSlop={10}>
                      <Ionicons name="trash-outline" size={15} color="rgba(251,113,133,0.7)" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyText, { marginTop: 10 }]}>{L.noDataYet}</Text>
          )}
        </Block>

        {/* BLOCK 2: Today Summary */}
        <Block
          icon={<LinearGradient colors={["#3B82F6", brand.violet500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconGrad}><Ionicons name="stats-chart" size={18} color="#fff" /></LinearGradient>}
          title={L.todaySummary}
          subtitle={`${todayLogs.length} ${L.loggedToday}`}
          open={openBlock === "summary"}
          onToggle={() => toggle("summary")}
          accentColor="#3B82F6"
        >
          {/* Score */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreNum}>{score}</Text>
            <Text style={styles.scoreLabel}>{L.score}: {scoreLabel(score, lang)}</Text>
            <View style={styles.scoreBg}>
              <View style={[styles.scoreFill, { width: `${score}%` as any }]} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {[
              { label: L.positive, count: pos, color: "#10B981" },
              { label: L.challenging, count: neg, color: "#EF4444" },
              { label: L.neutral, count: neu, color: c.textSubtle },
            ].map((item) => (
              <View key={item.label} style={[styles.countCard, { borderColor: item.color + "44" }]}>
                <Text style={[styles.countNum, { color: item.color }]}>{item.count}</Text>
                <Text style={styles.countLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Block>

        {/* BLOCK 3: Amy Insights */}
        <Block
          icon={<LinearGradient colors={[brand.violet600, "#EC4899"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconGrad}><Ionicons name="bulb" size={18} color="#fff" /></LinearGradient>}
          title={L.amyInsights}
          subtitle={insights.length > 0 ? `${insights.length} pattern${insights.length > 1 ? "s" : ""} detected` : "Log more to unlock"}
          open={openBlock === "insights"}
          onToggle={() => toggle("insights")}
          accentColor={brand.violet600}
        >
          {insights.length === 0 ? (
            <Text style={styles.emptyText}>{L.noInsights}</Text>
          ) : insights.map((ins, i) => (
            <View key={i} style={styles.insightRow}>
              <Text style={{ fontSize: 20 }}>{ins.icon}</Text>
              <Text style={styles.insightText}>{ins.text}</Text>
            </View>
          ))}
        </Block>

        {/* BLOCK 4: Weekly Trends */}
        <Block
          icon={<LinearGradient colors={["#0EA5E9", brand.indigo500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconGrad}><Ionicons name="bar-chart" size={18} color="#fff" /></LinearGradient>}
          title={L.weeklyTrends}
          subtitle="Last 7 days at a glance"
          open={openBlock === "trends"}
          onToggle={() => toggle("trends")}
          accentColor="#0EA5E9"
        >
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 80 }}>
            {weekData.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center", gap: 2 }}>
                <View style={{ width: "100%", justifyContent: "flex-end", height: 64, gap: 1 }}>
                  {d.pos > 0 && <View style={{ width: "100%", height: Math.max(4, (d.pos / maxWeek) * 60), backgroundColor: "#10B981", borderRadius: 3 }} />}
                  {d.neg > 0 && <View style={{ width: "100%", height: Math.max(4, (d.neg / maxWeek) * 60), backgroundColor: "#EF4444", borderRadius: 3 }} />}
                  {d.total === 0 && <View style={{ width: "100%", height: 3, backgroundColor: c.surfaceTrack, borderRadius: 3 }} />}
                </View>
                <Text style={{ color: c.textMuted, fontSize: 9, fontWeight: "700" }}>{d.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "#10B981" }} />
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{L.positive}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "#EF4444" }} />
              <Text style={{ color: c.textMuted, fontSize: 11 }}>{L.challenging}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push({
              pathname: "/behavior-history",
              params: effectiveChildId ? { childId: String(effectiveChildId) } : {},
            })}
            style={({ pressed }) => [
              {
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: 6, marginTop: 14, paddingVertical: 10, borderRadius: 10,
                backgroundColor: "#0EA5E922", borderWidth: 1, borderColor: "#0EA5E944",
              },
              pressed && { opacity: 0.85 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="View full behavior history"
          >
            <Ionicons name="time-outline" size={14} color="#0EA5E9" />
            <Text style={{ color: "#0EA5E9", fontSize: 12.5, fontWeight: "800" }}>
              View full history (last 90 days)
            </Text>
          </Pressable>
        </Block>

        {/* BLOCK 5: Solutions */}
        <Block
          icon={<LinearGradient colors={["#F97316", "#EAB308"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconGrad}><Ionicons name="sparkles" size={18} color="#fff" /></LinearGradient>}
          title={L.solutions}
          subtitle="Amy's proven tips per situation"
          open={openBlock === "solutions"}
          onToggle={() => toggle("solutions")}
          accentColor="#F97316"
        >
          {(["tantrum", "crying", "not_listening", "good_behavior", "low_energy"] as QuickBehaviorKey[]).map((key) => {
            const def = QUICK_BEHAVIORS[key];
            const tips = SOLUTIONS[key][lang];
            return (
              <View key={key} style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Text style={{ fontSize: 18 }}>{def.emoji}</Text>
                  <Text style={{ color: c.text, fontWeight: "700", fontSize: 14 }}>{def.label[lang]}</Text>
                </View>
                {tips.map((tip, i) => (
                  <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 5 }}>
                    <View style={[styles.tipNum, { backgroundColor: def.color }]}>
                      <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>{i + 1}</Text>
                    </View>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </Block>
      </ScrollView>

      {/* Situation Mode Modal */}
      <Modal visible={!!situationKey} transparent animationType="slide" onRequestClose={() => setSituationKey(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.65)" }} onPress={() => setSituationKey(null)} />
          <View style={[styles.situModal, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text style={styles.modalTitle}>{L.situationMode}</Text>
              <Pressable onPress={() => setSituationKey(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={c.textBody} />
              </Pressable>
            </View>
            {/* Situation tabs */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {(["crying", "angry", "not_listening"] as const).map((k) => {
                const labels: Record<string, string> = { crying: L.childHelp, angry: L.childAngry, not_listening: L.childNotListening };
                return (
                  <Pressable
                    key={k}
                    onPress={() => setSituationKey(k)}
                    style={[styles.sitTab, situationKey === k && styles.sitTabActive]}
                  >
                    <Text style={[styles.sitTabText, situationKey === k && { color: "#fff" }]}>{labels[k]}</Text>
                  </Pressable>
                );
              })}
            </View>
            {situationKey && SITUATION_HELP[situationKey][lang].map((tip, i) => (
              <View key={i} style={styles.sitTipRow}>
                <View style={styles.sitTipNum}>
                  <Text style={{ color: brand.violet600, fontSize: 11, fontWeight: "900" }}>{i + 1}</Text>
                </View>
                <Text style={styles.sitTipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const makeStyles = (c: ReturnType<typeof useColors>) => StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  headerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: c.text, fontWeight: "800", fontSize: 16 },
  headerSubtitle: { color: c.textMuted, fontSize: 11 },

  childStatCard: {
    padding: 10,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
  },
  childStatName: { fontSize: 12, fontWeight: "800" },
  childStatLabel: { fontSize: 10, marginTop: 2 },

  childChip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
  },
  childChipSel: { backgroundColor: colors.light.primary, borderColor: colors.light.accent },
  childChipText: { color: c.textBody, fontWeight: "700", fontSize: 13 },

  quickHelpBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    backgroundColor: "rgba(251,113,133,0.12)", borderWidth: 1, borderColor: "rgba(251,113,133,0.3)",
  },
  quickHelpText: { color: "#FB7185" /* audit-ok: brand accent */, fontWeight: "700", fontSize: 13 },

  block: {
    borderRadius: 20, borderWidth: 1, overflow: "hidden",
    backgroundColor: c.surface,
    shadowColor: colors.light.primary, shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  blockHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  blockIconWrap: { width: 44, height: 44, borderRadius: 14, overflow: "hidden" },
  iconGrad: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  blockTitle: { color: c.text, fontWeight: "800", fontSize: 15 },
  blockSubtitle: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  blockBody: {
    padding: 14, paddingTop: 6,
    borderTopWidth: 1, borderTopColor: c.border,
    backgroundColor: c.surfaceElevated,
    gap: 10,
  },
  chevWrap: {
    width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: c.border, backgroundColor: c.surface,
  },

  sectionLabel: { color: c.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: {
    width: "30%", alignItems: "center", paddingVertical: 12, borderRadius: 14,
    backgroundColor: c.surface, borderWidth: 1,
    gap: 4,
  },
  quickBtnLabel: { fontSize: 10, fontWeight: "800", textAlign: "center" },

  triggerChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
    backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
  },
  triggerChipSel: { backgroundColor: colors.light.primary, borderColor: colors.light.accent },
  triggerChipText: { color: c.textBody, fontSize: 12, fontWeight: "600" },

  logRow: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 10,
    borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
  },
  logText: { color: c.text, fontSize: 13, fontWeight: "600" },
  logNotes: { color: c.textDim, fontSize: 11, fontStyle: "italic" },
  emptyText: { color: c.textDim, fontSize: 13, textAlign: "center" },

  scoreCard: {
    backgroundColor: "rgba(123,63,242,0.15)", borderRadius: 16, padding: 16, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(123,63,242,0.3)",
  },
  scoreNum: { color: c.text, fontSize: 42, fontWeight: "900" },
  scoreLabel: { color: c.textBody, fontSize: 14, fontWeight: "700", marginTop: 2 },
  scoreBg: { width: "100%", height: 6, borderRadius: 999, backgroundColor: c.surfaceTrack, marginTop: 10, overflow: "hidden" },
  scoreFill: { height: "100%", borderRadius: 999, backgroundColor: colors.light.primary },

  countCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1 },
  countNum: { fontSize: 26, fontWeight: "900" },
  countLabel: { color: c.textMuted, fontSize: 10, fontWeight: "700", marginTop: 2 },

  insightRow: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    padding: 12, borderRadius: 12,
    backgroundColor: "rgba(123,63,242,0.1)", borderWidth: 1, borderColor: "rgba(123,63,242,0.25)",
  },
  insightText: { color: c.text, fontSize: 13, lineHeight: 19, flex: 1 },

  tipNum: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0 },
  tipText: { color: c.textBody, fontSize: 13, lineHeight: 19, flex: 1 },

  langRow: { flexDirection: "row", borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  langBtn: { paddingHorizontal: 9, paddingVertical: 5, backgroundColor: c.surface },
  langBtnActive: { backgroundColor: colors.light.primary },
  langBtnText: { color: c.textMuted, fontSize: 11, fontWeight: "700" },

  situModal: {
    backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, borderTopWidth: 1, borderColor: "rgba(123,63,242,0.35)",
  },
  modalHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: 8 },
  modalTitle: { color: c.text, fontSize: 18, fontWeight: "800" },

  sitTab: {
    flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center",
    backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.border,
  },
  sitTabActive: { backgroundColor: colors.light.primary, borderColor: colors.light.accent },
  sitTabText: { color: c.textBody, fontSize: 11, fontWeight: "700" },

  sitTipRow: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    padding: 12, borderRadius: 12, backgroundColor: "rgba(123,63,242,0.08)",
    borderWidth: 1, borderColor: "rgba(123,63,242,0.2)", marginBottom: 8,
  },
  sitTipNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(123,63,242,0.2)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  sitTipText: { color: c.text, fontSize: 13, lineHeight: 19, flex: 1 },
});
