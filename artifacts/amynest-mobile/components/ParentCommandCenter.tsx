import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  PanResponder,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { brand, palette, ACCENT_PINK, BRAND_GRADIENT } from "@/constants/colors";
import {
  computeCommandCenter,
  type AdaptiveItem,
  type AdaptiveMood,
  type AdaptiveSleepQuality,
  type CommandActionId,
  type CommandSuggestion,
  type CommandCenterResult,
} from "@workspace/family-routine";

type Child = { id: number; name: string };

type Routine = { id: number; date: string; items: AdaptiveItem[] };
type Summary = {
  positiveBehaviorsToday: number;
  negativeBehaviorsToday: number;
  routinesGeneratedThisWeek: number;
};

const MOOD_LABEL: Record<AdaptiveMood, string> = {
  low: "😔 Low",
  neutral: "🙂 Neutral",
  active: "🤸 Active",
};
const SLEEP_LABEL: Record<AdaptiveSleepQuality, string> = {
  poor: "😴 Poor",
  ok: "🌙 OK",
  good: "✨ Good",
};

const MOOD_CYCLE: AdaptiveMood[] = ["low", "neutral", "active"];
const SLEEP_CYCLE: AdaptiveSleepQuality[] = ["poor", "ok", "good"];

/**
 * Compact tile (lives in the Hub). Always-visible status + an "Open"
 * affordance that pushes the fullscreen Interactive Command Center modal.
 * The actual interactive surface lives inside the modal — this tile is a
 * read-only summary so the Hub stays scannable.
 */
export default function ParentCommandCenter({ child }: { child: Child }) {
  const c = useColors();
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [open, setOpen] = useState(false);

  // ── Mood / sleep — shared with the routine adaptive engine via AsyncStorage ──
  const moodKey = `amynest:adaptive:mood:${child.id}:${todayStr}`;
  const sleepKey = `amynest:adaptive:sleep:${child.id}:${todayStr}`;
  const [mood, setMood] = useState<AdaptiveMood>("neutral");
  const [sleep, setSleep] = useState<AdaptiveSleepQuality>("good");
  useEffect(() => {
    (async () => {
      try {
        const m = (await AsyncStorage.getItem(moodKey)) as AdaptiveMood | null;
        const s = (await AsyncStorage.getItem(sleepKey)) as AdaptiveSleepQuality | null;
        if (m === "low" || m === "neutral" || m === "active") setMood(m);
        if (s === "poor" || s === "ok" || s === "good") setSleep(s);
      } catch {}
    })();
  }, [moodKey, sleepKey]);
  const persistMood = (m: AdaptiveMood) => {
    setMood(m);
    AsyncStorage.setItem(moodKey, m).catch(() => {});
  };
  const persistSleep = (s: AdaptiveSleepQuality) => {
    setSleep(s);
    AsyncStorage.setItem(sleepKey, s).catch(() => {});
  };

  // ── Data ──
  const { data: routines = [] } = useQuery<Routine[]>({
    queryKey: ["routines", child.id],
    queryFn: async () => {
      const r = await authFetch(`/api/routines?childId=${child.id}`);
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  const { data: summary } = useQuery<Summary>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const r = await authFetch("/api/dashboard/summary");
      if (!r.ok) return { positiveBehaviorsToday: 0, negativeBehaviorsToday: 0, routinesGeneratedThisWeek: 0 };
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const todayRoutine = useMemo(
    () => routines.find((r) => (r.date ?? "").slice(0, 10) === todayStr),
    [routines, todayStr],
  );
  const items: AdaptiveItem[] = todayRoutine?.items ?? [];

  // Tick once per minute *while the dashboard is open* so the engine's
  // current/next steps stay accurate without burning cycles when closed.
  const [nowMins, setNowMins] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => {
      const d = new Date();
      setNowMins(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, [open]);

  const result = useMemo(
    () =>
      computeCommandCenter({
        childName: child.name,
        items,
        positiveBehaviorsToday: summary?.positiveBehaviorsToday ?? 0,
        negativeBehaviorsToday: summary?.negativeBehaviorsToday ?? 0,
        mood,
        sleepQuality: sleep,
        weeklyPositive: summary?.positiveBehaviorsToday ?? 0,
        weeklyNegative: summary?.negativeBehaviorsToday ?? 0,
        weeklyRoutinesGenerated: summary?.routinesGeneratedThisWeek ?? 0,
        nowMins,
      }),
    [items, summary, mood, sleep, child.name, nowMins],
  );

  const { overview, suggestions } = result;

  // Mutations live on the tile (not the dashboard) so closing the modal
  // doesn't unmount in-flight requests.
  const updateItemsMut = useMutation({
    mutationFn: async (payload: { id: number; items: AdaptiveItem[] }) => {
      const r = await authFetch(`/api/routines/${payload.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload.items }),
      });
      if (!r.ok) throw new Error("update failed");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routines", child.id] });
    },
  });

  const createBehaviorMut = useMutation({
    mutationFn: async (payload: { behavior: string; type: "positive" | "negative" | "neutral" }) => {
      const r = await authFetch("/api/behaviors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: child.id,
          date: todayStr,
          behavior: payload.behavior,
          type: payload.type,
        }),
      });
      if (!r.ok) throw new Error("log failed");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  return (
    <>
      {/* Compact tile */}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel={`${child.name}'s Command Center`}
        accessibilityRole="button"
        testID="command-center-tile"
        style={({ pressed }) => [styles.tile, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
      >
        <LinearGradient
          colors={["rgba(168,85,247,0.22)", "rgba(236,72,153,0.10)", "rgba(16,185,129,0.18)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <ProgressRing pct={overview.routineCompletionPct} size={56} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="sparkles" size={12} color={brand.purple500} />
            <Text style={[styles.tileTitle, { color: c.foreground }]} numberOfLines={1}>
              {child.name}'s Command Center
            </Text>
          </View>
          <Text style={styles.tileSub} numberOfLines={1}>
            <Text style={{ fontWeight: "900", color: c.foreground }}>
              {overview.statusEmoji} {overview.statusLabel}
            </Text>
            {suggestions.length > 0 ? `  ·  ${suggestions[0].emoji} ${suggestions[0].label}` : ""}
          </Text>
          <Text style={styles.tileMeta} numberOfLines={1}>
            {overview.routineCompletedTasks}/{overview.routineTotalTasks} done · {MOOD_LABEL[overview.mood]} · {SLEEP_LABEL[overview.sleepQuality]}
          </Text>
        </View>
        <View style={styles.openPill}>
          <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
          <Text style={styles.openPillText}>Open</Text>
          <Ionicons name="arrow-forward" size={11} color="#fff" />
        </View>
      </Pressable>

      {/* Fullscreen dashboard modal */}
      <Modal
        visible={open}
        animationType={Platform.OS === "ios" ? "slide" : "fade"}
        presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}
        testID="command-center-modal"
      >
        <CommandCenterDashboard
          child={child}
          todayRoutine={todayRoutine}
          items={items}
          mood={mood}
          sleep={sleep}
          persistMood={persistMood}
          persistSleep={persistSleep}
          result={result}
          onClose={() => setOpen(false)}
          onSimplify={(items) => updateItemsMut.mutateAsync({ id: todayRoutine!.id, items })}
          onUpdateItems={(items) => updateItemsMut.mutateAsync({ id: todayRoutine!.id, items })}
          onLogBehavior={(behavior, type) => createBehaviorMut.mutateAsync({ behavior, type })}
          onOpenRoutine={() => {
            setOpen(false);
            // expo-router accepts strongly-typed string routes — both forms
            // resolve to the routines tab without needing an `any` cast.
            if (todayRoutine?.id) router.push(`/routines/${todayRoutine.id}`);
            else router.push("/routines");
          }}
          updating={updateItemsMut.isPending}
        />
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Fullscreen dashboard
// ─────────────────────────────────────────────────────────────────────────

type DashboardProps = {
  child: Child;
  todayRoutine: Routine | undefined;
  items: AdaptiveItem[];
  mood: AdaptiveMood;
  sleep: AdaptiveSleepQuality;
  persistMood: (m: AdaptiveMood) => void;
  persistSleep: (s: AdaptiveSleepQuality) => void;
  result: CommandCenterResult;
  onClose: () => void;
  onSimplify: (items: AdaptiveItem[]) => Promise<unknown>;
  onUpdateItems: (items: AdaptiveItem[]) => Promise<unknown>;
  onLogBehavior: (behavior: string, type: "positive" | "negative" | "neutral") => Promise<unknown>;
  onOpenRoutine: () => void;
  updating: boolean;
};

function CommandCenterDashboard(props: DashboardProps) {
  const {
    child, todayRoutine, items, mood, sleep, persistMood, persistSleep,
    result, onClose, onSimplify, onUpdateItems, onLogBehavior, onOpenRoutine, updating,
  } = props;
  const c = useColors();
  const { overview, insights, actions, parentStatus, timeline, suggestions } = result;

  const [activePanel, setActivePanel] = useState<
    null | "calm" | "sleep" | "play" | "phonics" | "lullaby" | "puzzle"
  >(null);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const empty = items.length === 0;
  const showToast = (msg: string, undo?: () => void) => {
    setToast({ msg, undo });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), undo ? 4500 : 2400);
  };
  const burst = () => setConfettiKey((k) => k + 1);
  const shake = () => setShakeKey((k) => k + 1);

  async function simplifyToday() {
    if (!todayRoutine || empty) {
      shake();
      showToast("No routine to simplify yet");
      return;
    }
    const lowPriority = new Set(["screen", "play", "creative"]);
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const next: AdaptiveItem[] = items.map((it) => {
      const t = parseClockMins(it.time);
      const eligible =
        it.status === "pending" &&
        lowPriority.has(it.category ?? "") &&
        (t < 0 || t >= nowMins);
      return eligible ? { ...it, status: "skipped" } : it;
    });
    const skipped = next.filter((it, i) => it.status !== items[i].status).length;
    if (skipped === 0) {
      showToast("Nothing to simplify — your day already looks light");
      return;
    }
    persistMood("low");
    await onSimplify(next).catch(() => {});
    burst();
    showToast(`Simplified — ${skipped} optional task${skipped === 1 ? "" : "s"} skipped`);
  }

  async function fixRoutine() {
    if (!todayRoutine || empty) {
      shake();
      showToast("No routine to fix yet");
      return;
    }
    const next: AdaptiveItem[] = items.map((it) =>
      it.status === "delayed" ? { ...it, status: "pending" } : it,
    );
    const reset = next.filter((it, i) => it.status !== items[i].status).length;
    if (reset === 0) {
      showToast("Routine already on track");
      return;
    }
    await onUpdateItems(next).catch(() => {});
    burst();
    showToast(`Reset — ${reset} step${reset === 1 ? "" : "s"} back on track`);
  }

  async function calmChild() {
    setActivePanel((p) => (p === "calm" ? null : "calm"));
    onLogBehavior("Used calming tools", "neutral").catch(() => {});
    burst();
  }

  async function improveSleep() {
    setActivePanel((p) => (p === "sleep" ? null : "sleep"));
    persistSleep(sleep === "poor" ? "ok" : "good");
    burst();
  }

  // The Quick activity strip handles connection ideas now; this opens the
  // first one to keep the suggestion-chip flow from breaking.
  function addActivity() {
    setActivePanel((p) => (p === "play" ? null : "play"));
    burst();
  }

  async function logQuickWin() {
    await onLogBehavior("Quality time win", "positive").catch(() => {});
    burst();
    showToast("Logged a positive moment ✨");
  }

  async function completeStep(itemIndex: number) {
    if (!todayRoutine) return;
    const next = items.map((it, i) => (i === itemIndex ? { ...it, status: "completed" as const } : it));
    await onUpdateItems(next).catch(() => {});
    burst();
    showToast("Step completed ✓");
  }

  // Swipe-to-skip with undo. Optimistically marks the item skipped, with a
  // 4.5s window to revert via the toast's Undo button.
  async function skipStep(itemIndex: number) {
    if (!todayRoutine) return;
    const prevStatus = items[itemIndex]?.status;
    const next = items.map((it, i) => (i === itemIndex ? { ...it, status: "skipped" as const } : it));
    await onUpdateItems(next).catch(() => {});
    showToast("Skipped — tap Undo to bring it back", async () => {
      const restored = items.map((it, i) =>
        i === itemIndex ? { ...it, status: (prevStatus ?? "pending") as AdaptiveItem["status"] } : it,
      );
      await onUpdateItems(restored).catch(() => {});
      showToast("Restored");
    });
  }

  // ── Quick activity strip — separate from the strategic action grid.
  type QuickActivity = {
    id: "play" | "phonics" | "lullaby" | "puzzle";
    label: string;
    minutes: number;
    emoji: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
  const quickActivities: QuickActivity[] = [
    { id: "play",    label: "10-min play",    minutes: 10, emoji: "🎮", icon: "game-controller" },
    { id: "phonics", label: "5-min phonics",  minutes: 5,  emoji: "📖", icon: "book" },
    { id: "lullaby", label: "5-min lullaby",  minutes: 5,  emoji: "🎶", icon: "musical-notes" },
    { id: "puzzle",  label: "5-min puzzle",   minutes: 5,  emoji: "🧩", icon: "extension-puzzle" },
  ];

  function startQuickActivity(id: QuickActivity["id"]) {
    setActivePanel((p) => (p === id ? null : id));
  }

  async function logQuickActivity(activity: QuickActivity) {
    setActivePanel(null);
    burst();
    await onLogBehavior(`${activity.label} together`, "positive").catch(() => {});
    showToast(`${activity.emoji} Logged ${activity.label}`);
  }

  function onAction(id: CommandActionId) {
    switch (id) {
      case "simplify-today": simplifyToday(); return;
      case "fix-routine": fixRoutine(); return;
      // "add-activity" is intentionally a no-op in the strategic grid; the
      // dedicated Quick activity strip below is the surface for that flow.
      case "add-activity": addActivity(); return;
      case "calm-child": calmChild(); return;
      case "improve-sleep": improveSleep(); return;
    }
  }

  function onSuggestion(s: CommandSuggestion) {
    if (s.id === "start-play") return addActivity();
    if (s.actionId) onAction(s.actionId);
  }

  return (
    <View style={[d.root, { backgroundColor: "#0a0820" }]} testID="command-center-dashboard">{/* audit-ok: dark neon dashboard backdrop */}
      {/* dark gradient backdrop */}
      <LinearGradient
        // audit-ok: dark neon dashboard backdrop
        colors={["#0a0820", "#1a1040", "#0a0820"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        contentContainerStyle={d.scroll}
        showsVerticalScrollIndicator={false}
        // Re-key the scroll container to replay the entry animation when
        // shake fires; cheap, reliable on RN where keyframes don't exist.
        key={`s-${shakeKey}`}
      >
        {/* Top bar */}
        <View style={d.topBar}>
          <View style={d.topLeft}>
            <View style={d.headerIcon}>
              <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
              <Ionicons name="sparkles" size={16} color="#fff" />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={d.title} numberOfLines={1}>{child.name}'s Command Center</Text>
              <Text style={d.subtitle} numberOfLines={1}>
                {overview.statusEmoji} {overview.statusLabel} · {parentStatus.effortSummary}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {todayRoutine?.id ? (
              <Pressable onPress={onOpenRoutine} style={d.routineBtn} accessibilityLabel="Open today's routine">
                <Text style={d.routineBtnText}>Open routine</Text>
                <Ionicons name="arrow-forward" size={11} color={brand.violetMist} />
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} style={d.closeBtn} accessibilityLabel="Close" testID="command-center-close">
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Hero — animated ring + cyclable mood/sleep */}
        <View style={d.hero}>
          <ProgressRing pct={overview.routineCompletionPct} size={132} />
          <View style={{ flex: 1, gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text style={d.heroPct}>{overview.routineCompletionPct}<Text style={d.heroPctSm}>%</Text></Text>
              <Text style={d.heroSub}>{overview.routineCompletedTasks}/{overview.routineTotalTasks} done</Text>
            </View>
            <Text style={d.heroNote}>{parentStatus.stressLabel}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <CycleChip
                label={MOOD_LABEL[mood]}
                caption="Mood — tap to cycle"
                onPress={() => persistMood(MOOD_CYCLE[(MOOD_CYCLE.indexOf(mood) + 1) % MOOD_CYCLE.length])}
                testID="cycle-mood"
              />
              <CycleChip
                label={SLEEP_LABEL[sleep]}
                caption="Sleep — tap to cycle"
                onPress={() => persistSleep(SLEEP_CYCLE[(SLEEP_CYCLE.indexOf(sleep) + 1) % SLEEP_CYCLE.length])}
                testID="cycle-sleep"
              />
            </View>
          </View>
        </View>

        {/* Auto-suggestion chips */}
        {suggestions.length > 0 && (
          <View style={d.suggestionRow} testID="suggestion-row">
            <Text style={d.suggestionTag}>TRY NEXT</Text>
            {suggestions.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => onSuggestion(s)}
                style={({ pressed }) => [d.suggestionChip, pressed && { opacity: 0.9 }]}
                testID={`suggestion-${s.id}`}
              >
                <Text style={d.suggestionEmoji}>{s.emoji}</Text>
                <Text style={d.suggestionLabel}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* When there's no routine yet, hide the timeline + quick activity
            strip + strategic action grid and show a single CTA hero. */}
        {empty ? (
          <EmptyState onCreate={onOpenRoutine} />
        ) : (
          <>
            {/* Today timeline (with swipe-to-skip + undo) */}
            <View style={d.section} testID="timeline-section">
              <View style={d.sectionHead}>
                <Text style={d.sectionTitle}>TODAY'S TIMELINE</Text>
                <Text style={d.sectionMeta}>
                  {timeline.filter((t) => t.status === "completed").length}/{timeline.length} complete
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                {timeline.slice(0, 8).map((t) => (
                  <SwipeableTimelineRow
                    key={`${t.index}-${t.time}-${t.activity}`}
                    step={t}
                    onComplete={() => completeStep(t.index)}
                    onSkip={() => skipStep(t.index)}
                  />
                ))}
              </View>
            </View>

            {/* Quick activity strip — separate from the strategic action
                grid; each opens an inline timed activity that logs a
                positive moment when finished. */}
            <View style={d.section} testID="quick-activity-strip">
              <View style={d.sectionHead}>
                <Text style={[d.sectionTitle, { color: palette.emerald400 }]}>
                  QUICK CONNECTION IDEAS
                </Text>
                <Text style={d.sectionMeta}>Tap to start a timer</Text>
              </View>
              <View style={d.actionGrid}>
                {quickActivities.map((q) => {
                  const active = activePanel === q.id;
                  return (
                    <Pressable
                      key={q.id}
                      onPress={() => startQuickActivity(q.id)}
                      style={({ pressed }) => [
                        d.actionBtn,
                        d.quickBtn,
                        active && d.quickBtnActive,
                        pressed && { transform: [{ scale: 0.96 }] },
                      ]}
                      testID={`quick-${q.id}`}
                      accessibilityLabel={q.label}
                    >
                      <Text style={d.actionEmoji}>{q.emoji}</Text>
                      <Text style={[d.actionLabel, { color: c.foreground }]}>{q.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Strategic action grid — the 4 in-place actions. We filter
                out "add-activity" since the Quick activity strip above is
                the surface for that flow. */}
            <View style={d.actionGrid} testID="quick-action-bar">
              {actions.filter((a) => a.id !== "add-activity").map((a) => {
                const isPrimary = a.severity === "primary";
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => onAction(a.id)}
                    disabled={updating && (a.id === "simplify-today" || a.id === "fix-routine")}
                    style={({ pressed }) => [
                      d.actionBtn,
                      isPrimary ? d.actionPrimary : d.actionDefault,
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                    testID={`action-${a.id}`}
                    accessibilityLabel={a.label}
                  >
                    {isPrimary ? (
                      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
                    ) : null}
                    <Text style={d.actionEmoji}>{a.emoji}</Text>
                    <Text style={[d.actionLabel, isPrimary ? { color: "#fff" } : { color: c.foreground }]}>{a.label}</Text>
                    {isPrimary ? <Text style={d.actionTopBadge}>TOP</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Strategic action panels */}
        {activePanel === "calm" && (
          <ActionPanel
            tone="rose"
            iconName="heart"
            title="Calming tools — try in order"
            steps={[
              "Breathe slowly 4-4-6 with them for 60 seconds.",
              "Offer a tight hug + soft voice (no questions).",
              "Switch to a low-stim activity: water, soft toy, dim light.",
            ]}
            onDone={() => { setActivePanel(null); logQuickWin(); }}
          />
        )}
        {activePanel === "sleep" && (
          <ActionPanel
            tone="indigo"
            iconName="moon"
            title="Wind-down plan for tonight"
            steps={[
              "Dim lights 30 min before bedtime; no screens after.",
              "Warm bath/face wash + same lullaby every night.",
              "Lights out at the same time — set a calm alarm cue.",
            ]}
            onDone={() => setActivePanel(null)}
          />
        )}

        {/* Timed quick activity panels — count down then log a positive
            moment when the parent taps "Done with my child". */}
        {(["play", "phonics", "lullaby", "puzzle"] as const).map((id) => {
          if (activePanel !== id) return null;
          const activity = quickActivities.find((q) => q.id === id)!;
          return (
            <TimedActivityPanel
              key={id}
              activity={activity}
              onCancel={() => setActivePanel(null)}
              onDone={() => logQuickActivity(activity)}
            />
          );
        })}

        {/* Insights footer */}
        {insights.length > 0 && (
          <View style={{ gap: 8 }}>
            {insights.map((ins, i) => (
              <View
                key={i}
                style={[
                  d.insight,
                  ins.tone === "good" && { borderColor: palette.emerald400 + "55", backgroundColor: "rgba(16,185,129,0.10)" },
                  ins.tone === "warn" && { borderColor: palette.amber400 + "55", backgroundColor: "rgba(245,158,11,0.10)" },
                  ins.tone === "info" && { borderColor: brand.purple500 + "55", backgroundColor: "rgba(168,85,247,0.10)" },
                ]}
              >
                <Text style={d.insightTag}>✨ AMY AI INSIGHT</Text>
                <Text style={d.insightWhat}>{ins.what}</Text>
                <Text style={d.insightWhy}>{ins.why}</Text>
                <Text style={d.insightAction}><Text style={{ fontWeight: "900" }}>→ </Text>{ins.action}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Toast — supports an optional Undo affordance for swipe-to-skip. */}
      {toast ? (
        <View style={d.toast} testID="command-center-toast">
          <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
          <Text style={d.toastText}>{toast.msg}</Text>
          {toast.undo ? (
            <Pressable
              onPress={() => {
                const fn = toast.undo;
                setToast(null);
                fn?.();
              }}
              style={({ pressed }) => [d.toastUndo, pressed && { opacity: 0.85 }]}
              testID="command-center-toast-undo"
              accessibilityLabel="Undo skip"
            >
              <Text style={d.toastUndoText}>UNDO</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Confetti — pure RN dot burst */}
      {confettiKey > 0 ? <Confetti key={confettiKey} /> : null}
    </View>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────

function ProgressRing({ pct, size = 80 }: { pct: number; size?: number }) {
  // SVG-free implementation so the engagement spec doesn't require
  // react-native-svg in tests; uses concentric overlapping borders that
  // approximate a ring. Good enough for the tile + still readable in the
  // 132px hero size.
  const safe = Math.max(0, Math.min(100, pct));
  const inner = Math.round(size * 0.66);
  return (
    <View style={[r.outer, { width: size, height: size, borderRadius: size / 2 }]} accessibilityLabel={`${safe}% complete`}>
      <View style={[r.track, { width: size, height: size, borderRadius: size / 2, borderWidth: Math.max(4, Math.round(size * 0.075)) }]} />
      <View
        style={[
          r.fill,
          {
            width: size, height: size, borderRadius: size / 2,
            borderWidth: Math.max(4, Math.round(size * 0.075)),
            // The "fill ratio" effect: rotate the ring's coloured arc based on the pct.
            // We approximate by tinting the border colour intensity from violet→pink→emerald
            // and overlaying a soft glow. Exact arc fidelity is sacrificed for cross-RN
            // simplicity (no SVG dep).
            borderTopColor: brand.purple500,
            borderRightColor: safe > 25 ? brand.pink500 : "transparent",
            borderBottomColor: safe > 50 ? ACCENT_PINK : "transparent",
            borderLeftColor: safe > 75 ? palette.emerald400 : "transparent",
            transform: [{ rotate: `${(safe / 100) * 360 - 90}deg` }],
          },
        ]}
      />
      <View style={[r.center, { width: inner, height: inner, borderRadius: inner / 2 }]}>
        <Text style={[r.pct, { fontSize: Math.max(12, Math.round(size * 0.26)) }]}>{safe}%</Text>
      </View>
    </View>
  );
}

function CycleChip({
  label, caption, onPress, testID,
}: { label: string; caption: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [d.cycle, pressed && { opacity: 0.85 }]}
      testID={testID}
      accessibilityLabel={`${caption}: ${label}`}
    >
      <Text style={d.cycleLabel}>{label}</Text>
      <Text style={d.cycleCaption}>{caption}</Text>
    </Pressable>
  );
}

function ActionPanel({
  tone, iconName, title, steps, onDone,
}: {
  tone: "rose" | "indigo" | "emerald";
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  steps: string[];
  onDone: () => void;
}) {
  const palettes = {
    rose:    { border: "rgba(244,114,182,0.45)", bg: "rgba(244,114,182,0.10)" },
    indigo:  { border: "rgba(129,140,248,0.45)", bg: "rgba(129,140,248,0.10)" },
    emerald: { border: "rgba(52,211,153,0.45)",  bg: "rgba(52,211,153,0.10)"  },
  } as const;
  const p = palettes[tone];
  return (
    <View style={[d.panel, { borderColor: p.border, backgroundColor: p.bg }]} testID="command-center-panel">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={d.panelIcon}>
          <Ionicons name={iconName} size={14} color="#fff" />
        </View>
        <Text style={d.panelTitle}>{title}</Text>
      </View>
      <View style={{ gap: 6, marginTop: 6 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 8 }}>
            <View style={d.panelStepNum}><Text style={d.panelStepNumText}>{i + 1}</Text></View>
            <Text style={d.panelStepText}>{s}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={onDone} style={d.panelDone} accessibilityLabel="Done">
        <Ionicons name="happy" size={13} color="#0a0820" /* audit-ok: dark neon dashboard backdrop */ />
        <Text style={d.panelDoneText}>Done</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={d.empty} testID="command-center-empty">
      <Text style={d.emptyEmoji}>🪄</Text>
      <Text style={d.emptyTitle}>No routine for today yet</Text>
      <Text style={d.emptySub}>Generate one to unlock the timeline + smart suggestions.</Text>
      <Pressable onPress={onCreate} style={d.emptyBtn} accessibilityLabel="Create today's routine">
        <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
        <Ionicons name="sparkles" size={12} color="#fff" />
        <Text style={d.emptyBtnText}>Create today's routine</Text>
      </Pressable>
    </View>
  );
}

// ─── Swipe-to-skip timeline row ─────────────────────────────────────────
// PanResponder-driven horizontal swipe. Past a 60px threshold the row
// commits "skip" — the parent can recover via the toast's Undo button.
function SwipeableTimelineRow({
  step,
  onComplete,
  onSkip,
}: {
  step: { index: number; time: string; duration: number; activity: string; category?: string; current?: boolean; next?: boolean; status?: string };
  onComplete: () => void;
  onSkip: () => void;
}) {
  const t = step;
  const translateX = useRef(new Animated.Value(0)).current;
  const skipped = t.status === "skipped";
  const completed = t.status === "completed";
  const interactive = !skipped && !completed;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g) => interactive && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_e, g) => {
        const dx = Math.max(-120, Math.min(0, g.dx));
        translateX.setValue(dx);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -60) {
          Animated.timing(translateX, { toValue: -120, duration: 150, useNativeDriver: true }).start(() => {
            translateX.setValue(0);
            onSkip();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    }),
  ).current;

  return (
    <Animated.View
      testID={t.current ? "timeline-current" : t.next ? "timeline-next" : undefined}
      style={[
        d.tlRow,
        t.current && d.tlRowCurrent,
        t.next && !t.current && d.tlRowNext,
        completed && { opacity: 0.6 },
        skipped && { opacity: 0.4 },
        { transform: [{ translateX }] },
      ]}
      {...responder.panHandlers}
    >
      <View style={{ width: 56 }}>
        <Text style={d.tlTime}>{t.time}</Text>
        <Text style={d.tlDur}>{t.duration}m</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[d.tlActivity, skipped && { textDecorationLine: "line-through" }]} numberOfLines={1}>
          {t.activity}
        </Text>
        <Text style={d.tlMeta} numberOfLines={1}>
          {t.current ? "Now" : t.next ? "Up next" : t.category || ""}
        </Text>
      </View>
      {completed ? (
        <View style={d.donePill}>
          <Text style={d.donePillText}>DONE</Text>
        </View>
      ) : skipped ? (
        <View style={[d.donePill, { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.20)" }]}>
          <Text style={[d.donePillText, { color: "rgba(255,255,255,0.7)" }]}>SKIPPED</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [d.skipBtn, pressed && { opacity: 0.85 }]}
            testID={`skip-step-${t.index}`}
            accessibilityLabel={`Skip ${t.activity}`}
          >
            <Text style={d.skipBtnText}>Skip</Text>
          </Pressable>
          <Pressable
            onPress={onComplete}
            style={({ pressed }) => [d.doneBtn, pressed && { opacity: 0.85 }]}
            testID={`complete-step-${t.index}`}
            accessibilityLabel={`Mark ${t.activity} done`}
          >
            <Ionicons name="checkmark" size={11} color={palette.emerald400} />
            <Text style={d.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Timed inline activity panel ────────────────────────────────────────
// Counts down minutes (rounded to seconds for visibility) and offers a
// "Done with my child" CTA that fires `onDone`.
function TimedActivityPanel({
  activity,
  onCancel,
  onDone,
}: {
  activity: { id: string; label: string; minutes: number; emoji: string; icon: keyof typeof Ionicons.glyphMap };
  onCancel: () => void;
  onDone: () => void;
}) {
  const totalSeconds = activity.minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");
  const pct = Math.round(((totalSeconds - remaining) / totalSeconds) * 100);

  return (
    <View
      testID={`timed-activity-${activity.id}`}
      style={[d.panel, { borderColor: "rgba(52,211,153,0.45)", backgroundColor: "rgba(52,211,153,0.10)" }]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={d.panelIcon}>
            <Ionicons name={activity.icon} size={14} color="#fff" />
          </View>
          <Text style={d.panelTitle}>{activity.emoji} {activity.label}</Text>
        </View>
        <Pressable onPress={onCancel} testID={`timed-cancel-${activity.id}`} accessibilityLabel="Close">
          <Text style={{ fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.7)" }}>Close</Text>
        </Pressable>
      </View>
      <View style={d.timerBox}>
        <Text style={d.timerClock} testID={`timed-clock-${activity.id}`}>{mm}:{ss}</Text>
        <View style={d.timerTrack}>
          <View style={[d.timerFill, { width: `${pct}%` }]} />
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8 }}>
        <Pressable
          onPress={() => setRunning((r) => !r)}
          style={({ pressed }) => [d.timerToggle, pressed && { opacity: 0.85 }]}
          testID={`timed-toggle-${activity.id}`}
          accessibilityLabel={running ? "Pause timer" : "Resume timer"}
        >
          <Text style={d.timerToggleText}>{running ? "Pause" : "Resume"}</Text>
        </Pressable>
        <Pressable
          onPress={onDone}
          style={({ pressed }) => [d.panelDone, pressed && { opacity: 0.85 }]}
          testID={`timed-done-${activity.id}`}
          accessibilityLabel="Done with my child"
        >
          <Ionicons name="happy" size={13} color="#0a0820" /* audit-ok: dark neon dashboard backdrop */ />
          <Text style={d.panelDoneText}>Done with my child</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Confetti() {
  // Tiny burst — 12 dots with random translations. Pure RN, no extra dep.
  const pieces = Array.from({ length: 12 }).map((_, i) => {
    const left = 10 + Math.random() * 80;
    const dx = Math.round(Math.random() * 80 - 40);
    const dy = 60 + Math.random() * 60;
    const colors = [brand.purple500, ACCENT_PINK, palette.emerald400, palette.amber400];
    const color = colors[i % colors.length];
    return (
      <View
        key={i}
        style={{
          position: "absolute",
          top: 80,
          left: `${left}%`,
          width: 6,
          height: 10,
          backgroundColor: color,
          borderRadius: 2,
          transform: [{ translateX: dx }, { translateY: dy }],
          opacity: 0.85,
        }}
      />
    );
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject} testID="command-center-confetti">
      {pieces}
    </View>
  );
}

// ─── Local helpers ───────────────────────────────────────────────────────

function parseClockMins(t: string): number {
  if (!t) return -1;
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const mn = parseInt(m12[2], 10);
    const ap = m12[3].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    return h * 60 + mn;
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);
  return -1;
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Compact tile
  tile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.35)",
    shadowColor: brand.purple500,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  },
  tileTitle: { fontSize: 14, fontWeight: "900", flexShrink: 1 },
  tileSub: { fontSize: 11, color: "rgba(255,255,255,0.78)", marginTop: 2 },
  tileMeta: { fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 1 },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  openPillText: { fontSize: 11, fontWeight: "900", color: "#fff" },
});

const d = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  topLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  headerIcon: {
    width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  title: { fontSize: 18, fontWeight: "900", color: "#fff" },
  subtitle: { fontSize: 12, color: "rgba(196,181,253,0.85)", marginTop: 1 },
  routineBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "rgba(168,85,247,0.45)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.05)",
  },
  routineBtnText: { fontSize: 11, fontWeight: "800", color: "rgba(196,181,253,0.95)" },
  closeBtn: {
    padding: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },

  hero: {
    flexDirection: "row", alignItems: "center", gap: 18,
    borderRadius: 24, padding: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(168,85,247,0.30)",
  },
  heroPct: { fontSize: 40, fontWeight: "900", color: "#fff" },
  heroPctSm: { fontSize: 18, color: "rgba(196,181,253,0.7)" },
  heroSub: { fontSize: 12, color: "rgba(196,181,253,0.85)", fontWeight: "800" },
  heroNote: { fontSize: 12, color: "rgba(245,243,255,0.9)", lineHeight: 17 },

  cycle: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(168,85,247,0.45)", backgroundColor: "rgba(168,85,247,0.10)",
  },
  cycleLabel: { fontSize: 12, fontWeight: "900", color: "#fff" },
  cycleCaption: { fontSize: 9, fontWeight: "800", color: "rgba(196,181,253,0.7)", letterSpacing: 0.5, marginTop: 1 },

  suggestionRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
  suggestionTag: { fontSize: 10, fontWeight: "900", color: "rgba(196,181,253,0.7)", letterSpacing: 0.5, marginRight: 4 },
  suggestionChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999,
    backgroundColor: "rgba(168,85,247,0.18)", borderWidth: 1, borderColor: "rgba(168,85,247,0.45)",
  },
  suggestionEmoji: { fontSize: 14 },
  suggestionLabel: { fontSize: 12, fontWeight: "900", color: "#fff" },

  section: {
    borderRadius: 20, padding: 14,
    backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(168,85,247,0.22)",
  },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 1, color: "rgba(221,214,254,0.95)" },
  sectionMeta: { fontSize: 11, color: "rgba(196,181,253,0.7)", fontWeight: "800" },

  tlRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 11, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.02)", borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
  },
  tlRowCurrent: {
    borderColor: "rgba(217,70,239,0.55)", backgroundColor: "rgba(217,70,239,0.10)",
  },
  tlRowNext: { borderColor: "rgba(168,85,247,0.45)", backgroundColor: "rgba(168,85,247,0.08)" },
  tlTime: { fontSize: 11, fontWeight: "900", color: "rgba(221,214,254,0.95)" },
  tlDur: { fontSize: 9, color: "rgba(196,181,253,0.7)", textTransform: "uppercase" },
  tlActivity: { fontSize: 13, fontWeight: "800", color: "#fff" },
  tlMeta: { fontSize: 11, color: "rgba(196,181,253,0.7)" },
  donePill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: "rgba(52,211,153,0.18)", borderWidth: 1, borderColor: "rgba(52,211,153,0.40)",
  },
  donePillText: { fontSize: 9, fontWeight: "900", color: palette.emerald400 },
  doneBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    backgroundColor: "rgba(52,211,153,0.16)", borderWidth: 1, borderColor: "rgba(52,211,153,0.40)",
  },
  doneBtnText: { fontSize: 11, fontWeight: "900", color: palette.emerald400 },
  skipBtn: {
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)",
  },
  skipBtnText: { fontSize: 11, fontWeight: "900", color: "rgba(255,255,255,0.78)" },

  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    flexBasis: "31.5%", flexGrow: 1,
    flexDirection: "column", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: 18, gap: 4, overflow: "hidden", borderWidth: 1,
  },
  actionDefault: { backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.12)" },
  actionPrimary: { borderColor: "transparent" },
  quickBtn: {
    backgroundColor: "rgba(52,211,153,0.10)",
    borderColor: "rgba(52,211,153,0.35)",
  },
  quickBtnActive: {
    backgroundColor: "rgba(52,211,153,0.22)",
    borderColor: palette.emerald400,
  },
  actionEmoji: { fontSize: 22 },
  actionLabel: { fontSize: 11, fontWeight: "900", textAlign: "center" },
  actionTopBadge: {
    position: "absolute", top: 4, right: 6,
    fontSize: 8, fontWeight: "900", color: "rgba(255,255,255,0.9)", letterSpacing: 0.6,
  },

  panel: { borderRadius: 18, borderWidth: 1, padding: 12, gap: 6 },
  panelIcon: {
    width: 26, height: 26, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)", alignItems: "center", justifyContent: "center",
  },
  panelTitle: { fontSize: 13, fontWeight: "900", color: "#fff" },
  panelStepNum: {
    width: 18, height: 18, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  panelStepNumText: { fontSize: 10, fontWeight: "900", color: "#fff" },
  panelStepText: { fontSize: 12, color: "rgba(255,255,255,0.92)", flex: 1, lineHeight: 16 },
  panelDone: {
    alignSelf: "flex-end",
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "#fff",
  },
  // audit-ok: dark neon dashboard backdrop
  panelDoneText: { fontSize: 12, fontWeight: "900", color: "#0a0820" },

  insight: { borderRadius: 16, padding: 11, borderWidth: 1, gap: 3 },
  insightTag: { fontSize: 9, fontWeight: "900", color: "rgba(255,255,255,0.65)", letterSpacing: 0.5 },
  insightWhat: { fontSize: 13, fontWeight: "900", color: "#fff", lineHeight: 17 },
  insightWhy: { fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 15 },
  insightAction: { fontSize: 11, color: "#fff", lineHeight: 15, marginTop: 2 },

  empty: {
    borderRadius: 18, borderWidth: 1, borderColor: "rgba(168,85,247,0.45)",
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 18, alignItems: "center", gap: 6,
  },
  emptyEmoji: { fontSize: 28 },
  emptyTitle: { fontSize: 13, fontWeight: "900", color: "#fff" },
  emptySub: { fontSize: 11, color: "rgba(196,181,253,0.7)", textAlign: "center" },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, overflow: "hidden",
  },
  emptyBtnText: { fontSize: 12, fontWeight: "900", color: "#fff" },

  toast: {
    position: "absolute", bottom: 24, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, overflow: "hidden",
    shadowColor: brand.purple500, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 8,
  },
  toastText: { fontSize: 13, fontWeight: "900", color: "#fff" },
  toastUndo: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
  },
  toastUndoText: { fontSize: 11, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },

  timerBox: { alignItems: "center", gap: 6, paddingVertical: 8 },
  timerClock: { fontSize: 28, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  timerTrack: {
    width: "100%", height: 6, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden",
  },
  timerFill: { height: "100%", backgroundColor: palette.emerald400 },
  timerToggle: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.20)",
  },
  timerToggleText: { fontSize: 12, fontWeight: "900", color: "#fff" },
});

const r = StyleSheet.create({
  outer: { alignItems: "center", justifyContent: "center" },
  track: {
    position: "absolute",
    borderColor: "rgba(255,255,255,0.10)",
  },
  fill: { position: "absolute" },
  center: {
    backgroundColor: "rgba(10,8,32,0.65)", alignItems: "center", justifyContent: "center",
  },
  pct: { fontWeight: "900", color: "#fff" },
});
