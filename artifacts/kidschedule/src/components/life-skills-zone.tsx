import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Compass, Sparkles, Lightbulb, CheckCircle2, SkipForward, Languages,
} from "lucide-react";
import {
  type LifeSkillTask, type LifeSkillCategory, type LifeSkillLang,
  type CategoryStat,
  ageBandForLifeSkills, ageBandLabel,
  CATEGORY_EMOJI, CATEGORY_LABEL, DIFFICULTY_LABEL,
  POINTS_BY_DIFFICULTY, pickDailyLifeSkillTasks, tasksFor,
  buildAmyLifeSkillInsight, uiLabel,
} from "@workspace/life-skills";
import { SubItemGate } from "@/components/sub-item-gate";

// ─── Storage shape ────────────────────────────────────────────────────────────
interface DailyRecord { taskIds: string[]; done: string[]; skipped: string[] }
interface ChildLifeSkillStats {
  totalPoints: number;
  byCategory: Record<LifeSkillCategory, CategoryStat>;
  daily: Record<string, DailyRecord>;
  lang: LifeSkillLang;
}

const EMPTY_STATS: ChildLifeSkillStats = {
  totalPoints: 0,
  byCategory: {
    hygiene: { done: 0, skipped: 0 },
    social: { done: 0, skipped: 0 },
    responsibility: { done: 0, skipped: 0 },
    emotional: { done: 0, skipped: 0 },
    money: { done: 0, skipped: 0 },
    time: { done: 0, skipped: 0 },
    self_care: { done: 0, skipped: 0 },
    chores: { done: 0, skipped: 0 },
  },
  daily: {},
  lang: "en",
};

const storageKey = (childId: string | number) => `lifeskills:v1:${childId}`;

function freshStats(): ChildLifeSkillStats {
  return {
    ...EMPTY_STATS,
    byCategory: { ...EMPTY_STATS.byCategory },
    daily: {},
  };
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function loadStats(childId: string | number, fallbackLang: LifeSkillLang): ChildLifeSkillStats {
  const def = freshStats();
  def.lang = fallbackLang;
  if (typeof window === "undefined") return def;
  try {
    const raw = localStorage.getItem(storageKey(childId));
    if (!raw) return def;
    const p = JSON.parse(raw) as Partial<ChildLifeSkillStats>;
    const cats: LifeSkillCategory[] = [
      "hygiene", "social", "responsibility", "emotional",
      "money", "time", "self_care", "chores",
    ];
    const byCategory = { ...def.byCategory };
    for (const c of cats) {
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

function saveStats(childId: string | number, stats: ChildLifeSkillStats) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(storageKey(childId), JSON.stringify(stats)); } catch { /* noop */ }
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function detectLang(i18nLang: string | undefined): LifeSkillLang {
  if (!i18nLang) return "en";
  const l = i18nLang.toLowerCase();
  // Check hinglish FIRST — "hinglish" also startsWith "hi".
  if (l === "hinglish" || l.includes("hing") || l === "in-en") return "hinglish";
  if (l === "hi" || l.startsWith("hi-") || l.startsWith("hi_")) return "hi";
  return "en";
}

// ─── Component ───────────────────────────────────────────────────────────────
interface LifeSkillsZoneProps {
  child: { id: string | number; name: string; age: number };
}

export function LifeSkillsZone({ child }: LifeSkillsZoneProps) {
  const { i18n } = useTranslation();
  const fallbackLang = detectLang(i18n.language);
  const [stats, setStatsState] = useState<ChildLifeSkillStats>(() => loadStats(child.id, fallbackLang));

  useEffect(() => { setStatsState(loadStats(child.id, fallbackLang)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [child.id]);

  const updateStats = (mut: (prev: ChildLifeSkillStats) => ChildLifeSkillStats) => {
    setStatsState((prev) => {
      const next = mut(prev);
      saveStats(child.id, next);
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
    [ageBand, date, child.id, yesterdayPicks.join("|")], // eslint-disable-line react-hooks/exhaustive-deps
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
      const byCategory: Record<LifeSkillCategory, CategoryStat> = { ...prev.byCategory };
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

  const remainingTasks = lockedTasks.filter(
    (t) => !(stats.daily[date]?.done ?? []).includes(t.id) && !(stats.daily[date]?.skipped ?? []).includes(t.id),
  );

  // Per-category percentage = done / pool size (limit at 100%).
  const categoriesForBand = useMemo(() => {
    const allCats = new Set<LifeSkillCategory>();
    for (const t of tasksFor(ageBand)) allCats.add(t.category);
    return Array.from(allCats);
  }, [ageBand]);

  const langs: LifeSkillLang[] = ["en", "hi", "hinglish"];

  return (
    <div className="space-y-3">
      {/* Header strip */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <Compass className="h-3.5 w-3.5 text-emerald-500" />
        <span>Level: <strong>{ageBandLabel(ageBand, lang)}</strong></span>
        <span>·</span>
        <span>{stats.totalPoints} {uiLabel("points", lang)}</span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border px-1 py-0.5">
          <Languages className="h-3 w-3" />
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-1.5 rounded-full text-[11px] ${
                lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {l === "en" ? "EN" : l === "hi" ? "हिं" : "Hng"}
            </button>
          ))}
        </span>
      </div>

      {/* Today's tasks */}
      <div>
        <p className="font-quicksand font-bold text-sm mb-2">{uiLabel("todayTitle", lang)}</p>
        {/* Banner rule (shared with mobile): all assigned tasks settled. */}
        {lockedTasks.length > 0 && remainingTasks.length === 0 && (
          <Card className="bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-300">
            <CardContent className="p-3 text-sm text-center text-emerald-900 dark:text-emerald-100">
              ✅ {uiLabel("noneToday", lang)}
            </CardContent>
          </Card>
        )}
        <div className="space-y-2">
          {lockedTasks.map((task) => {
            const isDone = (stats.daily[date]?.done ?? []).includes(task.id);
            const isSkipped = (stats.daily[date]?.skipped ?? []).includes(task.id);
            const settled = isDone || isSkipped;
            return (
              <SubItemGate key={task.id} sectionId="hub_life_skills" subItemId={task.id}>
              <Card className={settled ? "opacity-70" : ""}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xl shrink-0">{CATEGORY_EMOJI[task.category]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-quicksand font-bold text-sm leading-snug">{task.title[lang]}</p>
                        {isDone && (
                          <span className="text-[10px] font-bold text-emerald-600">✓ {uiLabel("done", lang)}</span>
                        )}
                        {isSkipped && (
                          <span className="text-[10px] font-bold text-amber-600">— {uiLabel("skipped", lang)}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{task.description[lang]}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground flex-wrap">
                        <span className="rounded-full bg-muted px-2 py-0.5">{CATEGORY_LABEL[task.category][lang]}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5">{DIFFICULTY_LABEL[task.difficulty][lang]}</span>
                        <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-0.5">
                          +{POINTS_BY_DIFFICULTY[task.difficulty]} {uiLabel("points", lang)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Parent tip */}
                  <div className="rounded-lg bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 flex gap-1.5 text-xs">
                    <Lightbulb className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <p>
                      <span className="font-semibold">{uiLabel("parentTip", lang)}: </span>
                      {task.parentTip[lang]}
                    </p>
                  </div>

                  {!settled && (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => handleAction(task, "done")}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> {uiLabel("markDone", lang)}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAction(task, "skip")}>
                        <SkipForward className="h-4 w-4 mr-1" /> {uiLabel("skip", lang)}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              </SubItemGate>
            );
          })}
        </div>
      </div>

      {/* Progress by category */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-quicksand font-bold text-sm">{uiLabel("progressByCat", lang)}</p>
          {categoriesForBand.map((c) => {
            const stat = stats.byCategory[c];
            const poolSize = tasksFor(ageBand).filter((t) => t.category === c).length;
            const pct = poolSize === 0 ? 0 : Math.min(100, Math.round((stat.done / poolSize) * 100));
            return (
              <div key={c}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">
                    {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c][lang]}
                  </span>
                  <span className="text-muted-foreground">{stat.done} / {poolSize} · {pct}%</span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Amy AI Insight */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-quicksand font-bold text-sm">{uiLabel("amyInsight", lang)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {buildAmyLifeSkillInsight(stats.byCategory, child.name, lang)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
