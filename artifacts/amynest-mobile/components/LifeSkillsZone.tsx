import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import {
  type LifeSkillTask, type LifeSkillCategory, type LifeSkillLang,
  type CategoryStat,
  ageBandForLifeSkills, ageBandLabel,
  CATEGORY_EMOJI, CATEGORY_LABEL, DIFFICULTY_LABEL,
  POINTS_BY_DIFFICULTY, pickDailyLifeSkillTasks, tasksFor,
  buildAmyLifeSkillInsight, uiLabel,
} from "@workspace/life-skills";
import { brand, brandAlpha, palette } from "@/constants/colors";

interface DailyRecord { taskIds: string[]; done: string[]; skipped: string[] }
interface ChildLifeSkillStats {
  totalPoints: number;
  byCategory: Record<LifeSkillCategory, CategoryStat>;
  daily: Record<string, DailyRecord>;
  lang: LifeSkillLang;
}

const ALL_CATEGORIES: LifeSkillCategory[] = [
  "hygiene", "social", "responsibility", "emotional",
  "money", "time", "self_care", "chores",
];

function emptyStats(lang: LifeSkillLang): ChildLifeSkillStats {
  const byCategory = {} as Record<LifeSkillCategory, CategoryStat>;
  for (const c of ALL_CATEGORIES) byCategory[c] = { done: 0, skipped: 0 };
  return { totalPoints: 0, byCategory, daily: {}, lang };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const storageKey = (childId: string | number) => `lifeskills:v1:${childId}`;
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const yesterdayISO = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function parseStats(raw: string | null, fallbackLang: LifeSkillLang): ChildLifeSkillStats {
  const def = emptyStats(fallbackLang);
  if (!raw) return def;
  try {
    const p = JSON.parse(raw) as Partial<ChildLifeSkillStats>;
    const byCategory = { ...def.byCategory };
    for (const c of ALL_CATEGORIES) {
      const e = (p.byCategory as Record<string, unknown> | undefined)?.[c] as
        { done?: unknown; skipped?: unknown } | undefined;
      byCategory[c] = { done: num(e?.done), skipped: num(e?.skipped) };
    }
    const daily: Record<string, DailyRecord> = {};
    if (p.daily && typeof p.daily === "object") {
      for (const [k, v] of Object.entries(p.daily as Record<string, unknown>)) {
        const r = v as Partial<DailyRecord> | undefined;
        daily[k] = {
          taskIds: Array.isArray(r?.taskIds) ? r!.taskIds.filter((x): x is string => typeof x === "string") : [],
          done: Array.isArray(r?.done) ? r!.done.filter((x): x is string => typeof x === "string") : [],
          skipped: Array.isArray(r?.skipped) ? r!.skipped.filter((x): x is string => typeof x === "string") : [],
        };
      }
    }
    const lang: LifeSkillLang =
      p.lang === "hi" || p.lang === "hinglish" || p.lang === "en" ? p.lang : fallbackLang;
    return { totalPoints: num(p.totalPoints), byCategory, daily, lang };
  } catch {
    return def;
  }
}

function detectLang(i18nLang: string | undefined): LifeSkillLang {
  if (!i18nLang) return "en";
  const l = i18nLang.toLowerCase();
  // Check hinglish FIRST — "hinglish" also startsWith "hi".
  if (l === "hinglish" || l.includes("hing") || l === "in-en") return "hinglish";
  if (l === "hi" || l.startsWith("hi-") || l.startsWith("hi_")) return "hi";
  return "en";
}

interface Props {
  child: { id: string | number; name: string; age: number };
}

export function LifeSkillsZone({ child }: Props) {
  const { t, i18n } = useTranslation();
  const fallbackLang = detectLang(i18n.language);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStatsState] = useState<ChildLifeSkillStats>(() => emptyStats(fallbackLang));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey(child.id));
        if (!alive) return;
        setStatsState(parseStats(raw, fallbackLang));
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [child.id]);

  // Serialize AsyncStorage writes so they can't complete out of order.
  const writeChainRef = React.useRef<Promise<void>>(Promise.resolve());
  const updateStats = (mut: (prev: ChildLifeSkillStats) => ChildLifeSkillStats) => {
    setStatsState((prev) => {
      const next = mut(prev);
      const payload = JSON.stringify(next);
      writeChainRef.current = writeChainRef.current
        .catch(() => {})
        .then(() => AsyncStorage.setItem(storageKey(child.id), payload).catch(() => {}));
      return next;
    });
  };
  const setLang = (lang: LifeSkillLang) => updateStats((prev) => ({ ...prev, lang }));
  const lang = stats.lang;

  const ageBand = ageBandForLifeSkills(child.age);
  const date = todayISO();
  const yesterdayPicks = stats.daily[yesterdayISO()]?.taskIds ?? [];

  const todaysTasks = useMemo(
    () => pickDailyLifeSkillTasks({ ageBand, date, childKey: child.id, count: 2, previousIds: yesterdayPicks }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ageBand, date, child.id, yesterdayPicks.join("|")],
  );

  // Resolve today's locked tasks. Hardened: if persisted IDs no longer resolve
  // (age-band changed, stale data), fall back to today's fresh picks. If only
  // some IDs resolve, backfill from today's picks up to the target count.
  const TARGET_COUNT = 2;
  const lockedTasks = useMemo<LifeSkillTask[]>(() => {
    if (todaysTasks.length === 0) return [];
    const todayRec = stats.daily[date];
    if (!todayRec || todayRec.taskIds.length === 0) return todaysTasks;
    const resolved = todayRec.taskIds
      .map((id) => todaysTasks.find((t) => t.id === id) ?? tasksFor(ageBand).find((t) => t.id === id))
      .filter((t): t is LifeSkillTask => Boolean(t));
    if (resolved.length === 0) return todaysTasks;
    if (resolved.length >= TARGET_COUNT) return resolved;
    const seen = new Set(resolved.map((t) => t.id));
    for (const t of todaysTasks) {
      if (resolved.length >= TARGET_COUNT) break;
      if (!seen.has(t.id)) { resolved.push(t); seen.add(t.id); }
    }
    return resolved;
  }, [todaysTasks, stats.daily, date, ageBand]);

  const handleAction = (task: LifeSkillTask, action: "done" | "skip") => {
    updateStats((prev) => {
      const lockedIds = lockedTasks.map((t) => t.id);
      const baseRec: DailyRecord = prev.daily[date] ?? { taskIds: lockedIds, done: [], skipped: [] };
      if (baseRec.done.includes(task.id) || baseRec.skipped.includes(task.id)) return prev;
      const newRec: DailyRecord = {
        taskIds: baseRec.taskIds.length > 0 ? baseRec.taskIds : lockedIds,
        done: action === "done" ? [...baseRec.done, task.id] : baseRec.done,
        skipped: action === "skip" ? [...baseRec.skipped, task.id] : baseRec.skipped,
      };
      const cat = task.category;
      const byCategory = { ...prev.byCategory };
      byCategory[cat] = {
        done: prev.byCategory[cat].done + (action === "done" ? 1 : 0),
        skipped: prev.byCategory[cat].skipped + (action === "skip" ? 1 : 0),
      };
      return {
        ...prev,
        totalPoints: prev.totalPoints + (action === "done" ? POINTS_BY_DIFFICULTY[task.difficulty] : 0),
        byCategory,
        daily: { ...prev.daily, [date]: newRec },
      };
    });
  };

  const categoriesForBand = useMemo(() => {
    const set = new Set<LifeSkillCategory>();
    for (const t of tasksFor(ageBand)) set.add(t.category);
    return Array.from(set);
  }, [ageBand]);

  const langs: LifeSkillLang[] = ["en", "hi", "hinglish"];

  if (!loaded) {
    return <Text style={styles.muted}>{t("components.life_skills_zone.loading")}</Text>;
  }

  return (
    <View style={{ gap: 10 }}>
      {/* Header strip */}
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>
          {ageBandLabel(ageBand, lang)} · {stats.totalPoints} {uiLabel("points", lang)}
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

      {/* Today's tasks */}
      <Text style={styles.sectionLabel}>{uiLabel("todayTitle", lang)}</Text>
      {(() => {
        // Banner rule (shared with web): all assigned tasks settled.
        const doneSet = stats.daily[date]?.done ?? [];
        const skipSet = stats.daily[date]?.skipped ?? [];
        const allSettled = lockedTasks.length > 0 &&
          lockedTasks.every((t) => doneSet.includes(t.id) || skipSet.includes(t.id));
        if (allSettled) {
          return <Text style={styles.muted}>✅ {uiLabel("noneToday", lang)}</Text>;
        }
        return null;
      })()}
      {lockedTasks.map((task) => {
        const isDone = (stats.daily[date]?.done ?? []).includes(task.id);
        const isSkipped = (stats.daily[date]?.skipped ?? []).includes(task.id);
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
                <Pressable onPress={() => handleAction(task, "done")} style={[styles.btn, styles.btnPrimary, { flex: 1 }]}>
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

      {/* Per-category progress */}
      <View style={styles.subCard}>
        <Text style={styles.sectionLabel}>{uiLabel("progressByCat", lang)}</Text>
        {categoriesForBand.map((c) => {
          const stat = stats.byCategory[c];
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
          <Ionicons name="sparkles" size={16} color="#C7B6FF" /> {/* audit-ok: violet-200 sparkle for life-skills insight */}
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionLabel}>{uiLabel("amyInsight", lang)}</Text>
            <Text style={[styles.muted, { marginTop: 4 }]}>
              {buildAmyLifeSkillInsight(stats.byCategory, child.name, lang)}
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
});

// Silence unused-import lint when ScrollView ever isn't used in v1.
void ScrollView;
