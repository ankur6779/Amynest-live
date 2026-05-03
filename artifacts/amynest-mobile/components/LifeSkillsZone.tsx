import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import {
  type LifeSkillTask, type LifeSkillCategory, type LifeSkillLang,
  type LifeSkillAgeBand, type RolePlayScenario,
  type CategoryStat,
  ageBandForLifeSkills, ageBandLabel,
  CATEGORY_EMOJI, CATEGORY_LABEL, DIFFICULTY_LABEL,
  POINTS_BY_DIFFICULTY, pickDailyLifeSkillTasks, tasksFor,
  buildAmyLifeSkillInsight, uiLabel,
} from "@workspace/life-skills";
import { brand, brandAlpha, palette } from "@/constants/colors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

interface TodayResponse {
  ageBand: LifeSkillAgeBand;
  date: string;
  tasks: LifeSkillTask[];
  completedSkillIds: string[];
  skippedSkillIds: string[];
  streak: { current: number; best: number };
  weeklyBar: Array<{ date: string; completed: boolean }>;
}

const ALL_CATEGORIES: LifeSkillCategory[] = [
  "hygiene", "social", "responsibility", "emotional",
  "money", "time", "self_care", "chores",
];
const cacheKey = (childId: string | number) => `lifeskills:v1:${childId}`;
const langKey = (childId: string | number) => `lifeskills:lang:${childId}`;
const skipKey = (childId: string | number, date: string) =>
  `lifeskills:skip:${childId}:${date}`;
// Offline mutation queue — pending POST /life-skills/progress payloads that
// the user submitted while offline. Replayed on next successful refresh.
const queueKey = (childId: string | number) => `lifeskills:queue:${childId}`;

interface QueuedDone {
  childId: number;
  skillId: string;
  action: "done";
  date: string;
  queuedAt: number;
}

async function readQueue(childId: string | number): Promise<QueuedDone[]> {
  try {
    const raw = await AsyncStorage.getItem(queueKey(childId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (q): q is QueuedDone =>
        !!q && typeof q === "object" &&
        typeof (q as QueuedDone).childId === "number" &&
        typeof (q as QueuedDone).skillId === "string" &&
        (q as QueuedDone).action === "done" &&
        typeof (q as QueuedDone).date === "string",
    );
  } catch { return []; }
}

async function writeQueue(childId: string | number, q: QueuedDone[]): Promise<void> {
  try { await AsyncStorage.setItem(queueKey(childId), JSON.stringify(q)); } catch { /* noop */ }
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function detectLang(i18nLang: string | undefined): LifeSkillLang {
  if (!i18nLang) return "en";
  const l = i18nLang.toLowerCase();
  if (l === "hinglish" || l.includes("hing") || l === "in-en") return "hinglish";
  if (l === "hi" || l.startsWith("hi-") || l.startsWith("hi_")) return "hi";
  return "en";
}

function localFallback(child: { id: string | number; age: number }): TodayResponse {
  const ageBand = ageBandForLifeSkills(child.age);
  const date = todayISO();
  const weeklyBar: Array<{ date: string; completed: boolean }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    weeklyBar.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      completed: false,
    });
  }
  return {
    ageBand,
    date,
    tasks: pickDailyLifeSkillTasks({ ageBand, date, childKey: child.id, count: 2 }),
    completedSkillIds: [],
    skippedSkillIds: [],
    streak: { current: 0, best: 0 },
    weeklyBar,
  };
}

interface Props {
  child: { id: string | number; name: string; age: number };
}

export function LifeSkillsZone({ child }: Props) {
  const { i18n } = useTranslation();
  const fallbackLang = detectLang(i18n.language);
  const authFetch = useAuthFetch();

  const [data, setData] = useState<TodayResponse>(() => localFallback(child));
  const [lang, setLangState] = useState<LifeSkillLang>(fallbackLang);
  const [skippedToday, setSkippedToday] = useState<Set<string>>(new Set());
  const [rolePlays, setRolePlays] = useState<RolePlayScenario[]>([]);
  const [showRolePlay, setShowRolePlay] = useState(false);
  const [pending, setPending] = useState(false);

  // Hydrate language preference + offline cache.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rawLang, rawCache] = await Promise.all([
          AsyncStorage.getItem(langKey(child.id)),
          AsyncStorage.getItem(cacheKey(child.id)),
        ]);
        if (!alive) return;
        if (rawLang === "en" || rawLang === "hi" || rawLang === "hinglish") {
          setLangState(rawLang);
        }
        if (rawCache) {
          try { setData(JSON.parse(rawCache) as TodayResponse); } catch { /* noop */ }
        }
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, [child.id]);

  // Hydrate per-day skipped state from AsyncStorage so reload preserves it.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(skipKey(child.id, data.date));
        if (!alive) return;
        const parsed = raw ? (JSON.parse(raw) as unknown) : null;
        setSkippedToday(
          new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []),
        );
      } catch { setSkippedToday(new Set()); }
    })();
    return () => { alive = false; };
  }, [data.date, child.id]);

  // Replay any queued offline `done` mutations, then fetch authoritative
  // data + cache it. Each replayed item is removed only when the server
  // accepts it; transient failures keep the queue intact for next refresh.
  const refresh = React.useCallback(async () => {
    const queue = await readQueue(child.id);
    if (queue.length > 0) {
      const remaining: QueuedDone[] = [];
      for (const item of queue) {
        try {
          const r = await authFetch("/api/life-skills/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              childId: item.childId,
              skillId: item.skillId,
              action: item.action,
              date: item.date,
            }),
          });
          // Treat 2xx and 4xx (e.g. unknown skill) as terminal so we don't
          // retry forever; only network/5xx stays in the queue.
          if (!r.ok && r.status >= 500) remaining.push(item);
        } catch {
          remaining.push(item);
        }
      }
      await writeQueue(child.id, remaining);
    }

    try {
      const r = await authFetch(`/api/life-skills/today?childId=${encodeURIComponent(String(child.id))}`);
      if (!r.ok) return;
      const body = (await r.json()) as TodayResponse;
      setData(body);
      AsyncStorage.setItem(cacheKey(child.id), JSON.stringify(body)).catch(() => {});
    } catch { /* keep cached/fallback */ }
  }, [authFetch, child.id]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Fetch role-play scenarios for this band.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await authFetch(`/api/life-skills/role-plays?ageBand=${encodeURIComponent(data.ageBand)}`);
        if (!r.ok || !alive) return;
        const body = (await r.json()) as RolePlayScenario[];
        if (alive) setRolePlays(body);
      } catch { /* offline — leave empty */ }
    })();
    return () => { alive = false; };
  }, [authFetch, data.ageBand]);

  const setLang = (l: LifeSkillLang) => {
    setLangState(l);
    AsyncStorage.setItem(langKey(child.id), l).catch(() => {});
  };

  const completedSet = useMemo(() => new Set(data.completedSkillIds), [data.completedSkillIds]);

  const handleAction = async (task: LifeSkillTask, action: "done" | "skip") => {
    if (action === "skip") {
      setSkippedToday((p) => {
        const n = new Set(p); n.add(task.id);
        AsyncStorage.setItem(skipKey(child.id, data.date), JSON.stringify(Array.from(n))).catch(() => {});
        return n;
      });
      return;
    }
    if (completedSet.has(task.id) || pending) return;
    setPending(true);
    const childIdNum = typeof child.id === "number" ? child.id : Number(child.id);
    const payload: QueuedDone = {
      childId: childIdNum,
      skillId: task.id,
      action: "done",
      date: data.date,
      queuedAt: Date.now(),
    };
    try {
      const r = await authFetch("/api/life-skills/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: payload.childId,
          skillId: payload.skillId,
          action: payload.action,
          date: payload.date,
        }),
      });
      if (r.ok) {
        await refresh();
      } else if (r.status >= 500) {
        // Server hiccup — queue for replay so the user's tap isn't lost.
        const q = await readQueue(child.id);
        await writeQueue(child.id, [...q, payload]);
      }
      // 4xx (e.g. unknown skill / forbidden) is intentionally NOT queued.
    } catch {
      // Offline / network error — persist the intent so refresh() replays it.
      const q = await readQueue(child.id);
      await writeQueue(child.id, [...q, payload]);
      // Optimistically reflect completion locally so UI feels responsive;
      // the next successful refresh will overwrite with server truth.
      setData((prev) => ({
        ...prev,
        completedSkillIds: prev.completedSkillIds.includes(task.id)
          ? prev.completedSkillIds
          : [...prev.completedSkillIds, task.id],
      }));
    }
    finally { setPending(false); }
  };

  const ageBand = data.ageBand;
  const categoriesForBand = useMemo(() => {
    const set = new Set<LifeSkillCategory>();
    for (const t of tasksFor(ageBand)) set.add(t.category);
    return Array.from(set);
  }, [ageBand]);

  // Per-category tally for today's two tasks (mirrors web).
  const byCategory = useMemo(() => {
    const acc: Record<LifeSkillCategory, CategoryStat> = {} as Record<LifeSkillCategory, CategoryStat>;
    for (const c of ALL_CATEGORIES) acc[c] = { done: 0, skipped: 0 };
    for (const t of data.tasks) {
      if (completedSet.has(t.id)) acc[t.category].done += 1;
      else if (skippedToday.has(t.id)) acc[t.category].skipped += 1;
    }
    return acc;
  }, [data.tasks, completedSet, skippedToday]);

  const totalPoints = useMemo(() => {
    let pts = 0;
    for (const t of data.tasks) {
      if (completedSet.has(t.id)) pts += POINTS_BY_DIFFICULTY[t.difficulty];
    }
    return pts;
  }, [data.tasks, completedSet]);

  const langs: LifeSkillLang[] = ["en", "hi", "hinglish"];
  const allSettled =
    data.tasks.length > 0 &&
    data.tasks.every((t) => completedSet.has(t.id) || skippedToday.has(t.id));

  return (
    <View style={{ gap: 10 }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>
          {ageBandLabel(ageBand, lang)} · {totalPoints} {uiLabel("points", lang)}
        </Text>
        <View style={styles.langRow}>
          {langs.map((l) => (
            <Pressable
              key={l}
              onPress={() => setLang(l)}
              style={[styles.langChip, lang === l && styles.langChipActive]}
            >
              <Text style={[styles.langChipText, lang === l && styles.langChipTextActive]}>
                {l === "en" ? "EN" : l === "hi" ? "हिं" : "Hng"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Streak fire + weekly bar */}
      <View style={styles.streakCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="flame" size={16} color={brand.amber400} />
          <Text style={styles.streakText}>
            {data.streak.current} {uiLabel("dayStreak", lang)}
          </Text>
          <Text style={styles.muted}>· {uiLabel("best", lang)} {data.streak.best}</Text>
        </View>
        <View style={styles.weeklyRow}>
          {data.weeklyBar.map((d) => (
            <View
              key={d.date}
              style={[styles.weeklyCell, d.completed && styles.weeklyCellOn]}
            />
          ))}
        </View>
      </View>

      {/* Today's tasks */}
      <Text style={styles.sectionLabel}>{uiLabel("todayTitle", lang)}</Text>
      {allSettled && <Text style={styles.muted}>✅ {uiLabel("noneToday", lang)}</Text>}
      {data.tasks.map((task) => {
        const isDone = completedSet.has(task.id);
        const isSkipped = skippedToday.has(task.id);
        const settled = isDone || isSkipped;
        return (
          <View key={task.id} style={[styles.taskCard, settled && { opacity: 0.65 }]}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ fontSize: 22 }}>{CATEGORY_EMOJI[task.category]}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={styles.taskTitle}>{task.title[lang]}</Text>
                  {isDone && <Text style={styles.doneTag}>✓ {uiLabel("done", lang)}</Text>}
                  {isSkipped && <Text style={styles.skipTag}>— {uiLabel("skipped", lang)}</Text>}
                </View>
                <Text style={styles.taskDesc}>{task.description[lang]}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaPill}>{CATEGORY_LABEL[task.category][lang]}</Text>
                  <Text style={styles.metaPill}>{DIFFICULTY_LABEL[task.difficulty][lang]}</Text>
                  <Text style={[styles.metaPill, styles.pointPill]}>
                    +{POINTS_BY_DIFFICULTY[task.difficulty]} {uiLabel("points", lang)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.tipBox}>
              <Ionicons name="bulb" size={14} color={brand.amber400} />
              <Text style={styles.tipText}>
                <Text style={{ fontWeight: "700" }}>{uiLabel("parentTip", lang)}: </Text>
                {task.parentTip[lang]}
              </Text>
            </View>

            {!settled && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  disabled={pending}
                  onPress={() => handleAction(task, "done")}
                  style={[styles.btn, styles.btnPrimary, { flex: 1 }, pending && { opacity: 0.6 }]}
                >
                  <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  <Text style={styles.btnPrimaryText}>{uiLabel("markDone", lang)}</Text>
                </Pressable>
                <Pressable onPress={() => handleAction(task, "skip")} style={[styles.btn, styles.btnGhost]}>
                  <Ionicons name="play-skip-forward" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.btnGhostText}>{uiLabel("skip", lang)}</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

      {/* Role-play */}
      <View style={styles.subCard}>
        <Pressable onPress={() => setShowRolePlay((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="happy" size={16} color="#C7B6FF" />{/* audit-ok: violet-200 role-play marker */}
          <Text style={[styles.sectionLabel, { flex: 1 }]}>{uiLabel("rolePlayTitle", lang)}</Text>
          <Text style={styles.muted}>{showRolePlay ? uiLabel("hide", lang) : uiLabel("show", lang)}</Text>
        </Pressable>
        {showRolePlay && (
          <View style={{ marginTop: 8, gap: 8 }}>
            {rolePlays.map((rp) => (
              <View key={rp.id} style={styles.rolePlayCard}>
                <Text style={styles.rpTitle}>{rp.title[lang]}</Text>
                <Text style={styles.rpBody}>{rp.setup[lang]}</Text>
                <Text style={styles.rpBody}>👧 {rp.childLine[lang]}</Text>
                <Text style={styles.rpBody}>👨‍👩‍👧 {rp.parentPrompt[lang]}</Text>
              </View>
            ))}
            {rolePlays.length === 0 && <Text style={styles.muted}>{uiLabel("noScenarios", lang)}</Text>}
          </View>
        )}
      </View>

      {/* Per-category progress (today only) */}
      <View style={styles.subCard}>
        <Text style={styles.sectionLabel}>{uiLabel("progressByCat", lang)}</Text>
        {categoriesForBand.map((c) => {
          const stat = byCategory[c];
          const poolSize = tasksFor(ageBand).filter((t) => t.category === c).length;
          const pct = poolSize === 0 ? 0 : Math.min(100, Math.round((stat.done / poolSize) * 100));
          return (
            <View key={c} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={styles.catLabel}>{CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c][lang]}</Text>
                <Text style={styles.muted}>{stat.done}/{poolSize} · {pct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Amy AI Insight */}
      <View style={[styles.subCard, styles.insightCard]}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
          <Ionicons name="sparkles" size={16} color="#C7B6FF" />{/* audit-ok: violet-200 sparkle */}
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>{uiLabel("amyInsight", lang)}</Text>
            <Text style={[styles.muted, { marginTop: 4 }]}>
              {buildAmyLifeSkillInsight(byCategory, child.name, lang)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  headerText: { color: "rgba(255,255,255,0.75)", fontSize: 12, flex: 1 },
  langRow: { flexDirection: "row", gap: 4, padding: 2, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  langChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  langChipActive: { backgroundColor: "rgba(123,63,242,0.55)" },
  langChipText: { color: "rgba(255,255,255,0.6)", fontSize: 11, fontWeight: "700" },
  langChipTextActive: { color: "#fff" },

  sectionLabel: { color: "#fff", fontWeight: "800", fontSize: 13 },
  muted: { color: "rgba(255,255,255,0.6)", fontSize: 12 },

  streakCard: {
    padding: 12, borderRadius: 14, gap: 8,
    backgroundColor: brandAlpha.amber400_08,
    borderWidth: 1, borderColor: brandAlpha.amber400_25,
  },
  streakText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  weeklyRow: { flexDirection: "row", gap: 4 },
  weeklyCell: {
    flex: 1, height: 18, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  weeklyCellOn: { backgroundColor: palette.emerald400, borderColor: palette.emerald400 },

  taskCard: {
    padding: 12, borderRadius: 14, gap: 8,
    backgroundColor: "rgba(16,185,129,0.08)",
    borderWidth: 1, borderColor: "rgba(16,185,129,0.25)",
  },
  taskTitle: { color: "#fff", fontWeight: "800", fontSize: 13, flexShrink: 1 },
  taskDesc: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  doneTag: { color: palette.emerald400, fontWeight: "800", fontSize: 10 },
  skipTag: { color: palette.amber400, fontWeight: "800", fontSize: 10 },

  metaRow: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginTop: 6 },
  metaPill: {
    color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "700",
    backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  pointPill: { backgroundColor: brandAlpha.amber400_18, color: brand.amber400 },

  tipBox: {
    flexDirection: "row", gap: 6, alignItems: "flex-start",
    backgroundColor: brandAlpha.amber400_08, borderWidth: 1, borderColor: brandAlpha.amber400_25,
    padding: 8, borderRadius: 10,
  },
  tipText: { color: "rgba(255,255,255,0.85)", fontSize: 11, flex: 1, lineHeight: 16 },

  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  btnPrimary: { backgroundColor: brand.primary },
  btnPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  btnGhost: { paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  btnGhostText: { color: "rgba(255,255,255,0.85)", fontWeight: "700", fontSize: 12 },

  subCard: {
    padding: 12, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  insightCard: { borderColor: "rgba(167,139,250,0.4)", backgroundColor: "rgba(167,139,250,0.08)" },
  catLabel: { color: "#fff", fontWeight: "700", fontSize: 12 },
  progressTrack: { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: palette.emerald400 },

  rolePlayCard: {
    padding: 8, borderRadius: 10, gap: 4,
    backgroundColor: "rgba(167,139,250,0.06)",
    borderWidth: 1, borderColor: "rgba(167,139,250,0.18)",
  },
  rpTitle: { color: "#fff", fontWeight: "800", fontSize: 12 },
  rpBody: { color: "rgba(255,255,255,0.78)", fontSize: 11, lineHeight: 15 },
});

void ScrollView;
