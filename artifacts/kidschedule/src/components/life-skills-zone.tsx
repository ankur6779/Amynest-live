import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Compass,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  SkipForward,
  Languages,
  Flame,
  Drama,
} from "lucide-react";
import {
  type LifeSkillTask,
  type LifeSkillCategory,
  type LifeSkillLang,
  type LifeSkillAgeBand,
  ageBandForLifeSkills,
  ageBandLabel,
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  POINTS_BY_DIFFICULTY,
  pickDailyLifeSkillTasks,
  tasksFor,
  buildAmyLifeSkillInsight,
  uiLabel,
} from "@workspace/life-skills";
import {
  useGetLifeSkillsToday,
  useSetLifeSkillProgress,
  useGetLifeSkillRolePlays,
  getGetLifeSkillsTodayQueryKey,
  type LifeSkillsTodayResponse,
} from "@workspace/api-client-react";
import { SubItemGate } from "@/components/sub-item-gate";

interface LifeSkillsZoneProps {
  child: { id: string | number; name: string; age: number };
}

function detectLang(i18nLang: string | undefined): LifeSkillLang {
  if (!i18nLang) return "en";
  const l = i18nLang.toLowerCase();
  if (l === "hinglish" || l.includes("hing") || l === "in-en") return "hinglish";
  if (l === "hi" || l.startsWith("hi-") || l.startsWith("hi_")) return "hi";
  return "en";
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const LANG_STORAGE_KEY = (childId: string | number) => `lifeskills:lang:${childId}`;
const SKIP_STORAGE_KEY = (childId: string | number, date: string) =>
  `lifeskills:skip:${childId}:${date}`;

export function LifeSkillsZone({ child }: LifeSkillsZoneProps) {
  const { i18n, t } = useTranslation();
  const fallbackLang = detectLang(i18n.language);
  const childIdNum = typeof child.id === "number" ? child.id : Number(child.id);
  const qc = useQueryClient();

  // Language persists per-child so caregivers don't reset it on every visit.
  const [lang, setLang] = useState<LifeSkillLang>(() => {
    if (typeof window === "undefined") return fallbackLang;
    try {
      const raw = localStorage.getItem(LANG_STORAGE_KEY(child.id));
      if (raw === "en" || raw === "hi" || raw === "hinglish") return raw;
    } catch { /* noop */ }
    return fallbackLang;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(LANG_STORAGE_KEY(child.id), lang); } catch { /* noop */ }
  }, [child.id, lang]);

  const ageBand = ageBandForLifeSkills(child.age);

  const todayQuery = useGetLifeSkillsToday(
    { childId: childIdNum },
    {
      query: {
        enabled: Number.isFinite(childIdNum) && childIdNum > 0,
        staleTime: 60_000,
      },
    },
  );

  const rolePlaysQuery = useGetLifeSkillRolePlays(
    { ageBand },
    { query: { staleTime: 5 * 60_000 } },
  );

  const [showRolePlay, setShowRolePlay] = useState(false);

  const setMutation = useSetLifeSkillProgress();

  // ── Offline / first-paint fallback ──────────────────────────────────────
  // Compute a synchronous "today" payload from the shared lib so the cards
  // render even before the API responds (or if the user is offline).
  const localFallback: LifeSkillsTodayResponse = useMemo(() => {
    const date = todayISO();
    return {
      ageBand,
      date,
      tasks: pickDailyLifeSkillTasks({
        ageBand,
        date,
        childKey: child.id,
        count: 2,
      }),
      completedSkillIds: [],
      skippedSkillIds: [],
      streak: { current: 0, best: 0 },
      weeklyBar: Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
          completed: false,
        };
      }),
    };
  }, [ageBand, child.id]);

  const data: LifeSkillsTodayResponse = todayQuery.data ?? localFallback;

  // Per-day skipped state lives on the client only — skip is a UI hint that
  // doesn't affect streaks (the server contract no longer accepts it). We
  // persist it per child+date in localStorage so a reload doesn't undo it,
  // and the date keying makes it self-cleanup at midnight.
  const [skippedToday, setSkippedToday] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (typeof window === "undefined") {
      setSkippedToday(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(SKIP_STORAGE_KEY(child.id, data.date));
      const parsed = raw ? (JSON.parse(raw) as unknown) : null;
      setSkippedToday(
        new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []),
      );
    } catch {
      setSkippedToday(new Set());
    }
  }, [data.date, child.id]);

  const completedSet = useMemo(
    () => new Set(data.completedSkillIds),
    [data.completedSkillIds],
  );

  const handleAction = async (task: LifeSkillTask, action: "done" | "skip") => {
    if (action === "skip") {
      setSkippedToday((prev) => {
        const next = new Set(prev);
        next.add(task.id);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              SKIP_STORAGE_KEY(child.id, data.date),
              JSON.stringify(Array.from(next)),
            );
          } catch { /* noop */ }
        }
        return next;
      });
      return;
    }
    if (completedSet.has(task.id) || setMutation.isPending) return;
    try {
      await setMutation.mutateAsync({
        data: {
          childId: childIdNum,
          skillId: task.id,
          action: "done",
          date: data.date,
        },
      });
      qc.invalidateQueries({
        queryKey: getGetLifeSkillsTodayQueryKey({ childId: childIdNum }),
      });
    } catch {
      // Surface a soft failure — keep the card actionable.
    }
  };

  const langs: LifeSkillLang[] = ["en", "hi", "hinglish"];

  // Derive a per-category points tally from how many of today's tasks are
  // done so the existing progress bars + insight have data to chew on.
  const byCategory = useMemo(() => {
    const cats: LifeSkillCategory[] = [
      "hygiene", "social", "responsibility", "emotional",
      "money", "time", "self_care", "chores",
    ];
    const acc: Record<LifeSkillCategory, { done: number; skipped: number }> = {
      hygiene: { done: 0, skipped: 0 }, social: { done: 0, skipped: 0 },
      responsibility: { done: 0, skipped: 0 }, emotional: { done: 0, skipped: 0 },
      money: { done: 0, skipped: 0 }, time: { done: 0, skipped: 0 },
      self_care: { done: 0, skipped: 0 }, chores: { done: 0, skipped: 0 },
    };
    for (const t of data.tasks) {
      if (completedSet.has(t.id)) acc[t.category].done += 1;
      else if (skippedToday.has(t.id)) acc[t.category].skipped += 1;
    }
    void cats;
    return acc;
  }, [data.tasks, completedSet, skippedToday]);

  const categoriesForBand = useMemo(() => {
    const allCats = new Set<LifeSkillCategory>();
    for (const t of tasksFor(ageBand)) allCats.add(t.category);
    return Array.from(allCats);
  }, [ageBand]);

  const totalPoints = useMemo(() => {
    let pts = 0;
    for (const t of data.tasks) {
      if (completedSet.has(t.id)) pts += POINTS_BY_DIFFICULTY[t.difficulty];
    }
    return pts;
  }, [data.tasks, completedSet]);

  const remainingTasks = data.tasks.filter(
    (t) => !completedSet.has(t.id) && !skippedToday.has(t.id),
  );

  return (
    <div className="space-y-3">
      {/* Header strip */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <Compass className="h-3.5 w-3.5 text-emerald-500" />
        <span>
          {ageBandLabel(ageBand as LifeSkillAgeBand, lang)} · {totalPoints} {uiLabel("points", lang)}
        </span>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border px-1 py-0.5">
          <Languages className="h-3 w-3" />
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-1.5 rounded-full text-[11px] ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {l === "en" ? "EN" : l === "hi" ? "हिं" : "Hng"}
            </button>
          ))}
        </span>
      </div>

      {/* Streak fire + weekly bar */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <Flame className="h-4 w-4 text-amber-500" />
            <span>
              {data.streak.current} {uiLabel("dayStreak", lang)}
            </span>
            <span className="text-xs text-muted-foreground font-normal ml-1">
              ({uiLabel("best", lang)}: {data.streak.best})
            </span>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {data.weeklyBar.map((d) => (
              <div
                key={d.date}
                className={`h-6 rounded-sm border ${
                  d.completed
                    ? "bg-emerald-500/80 border-emerald-600"
                    : "bg-muted/50 border-muted"
                }`}
                title={d.date}
                aria-label={d.completed ? `${d.date} completed` : `${d.date} no activity`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Today's tasks */}
      <div>
        <p className="font-quicksand font-bold text-sm mb-2">{uiLabel("todayTitle", lang)}</p>
        {data.tasks.length > 0 && remainingTasks.length === 0 && (
          <Card className="bg-emerald-50/80 dark:bg-emerald-900/20 border-emerald-300">
            <CardContent className="p-3 text-sm text-center text-emerald-900 dark:text-emerald-100">
              ✅ {uiLabel("noneToday", lang)}
            </CardContent>
          </Card>
        )}
        <div className="space-y-2">
          {data.tasks.map((task) => {
            const isDone = completedSet.has(task.id);
            const isSkipped = skippedToday.has(task.id);
            const settled = isDone || isSkipped;
            return (
              <SubItemGate key={task.id} sectionId="hub_life_skills" subItemId={task.id}>
                <Card className={settled ? "opacity-70" : ""}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xl shrink-0">{CATEGORY_EMOJI[task.category]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-quicksand font-bold text-sm leading-snug">
                            {task.title[lang]}
                          </p>
                          {isDone && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              ✓ {uiLabel("done", lang)}
                            </span>
                          )}
                          {isSkipped && (
                            <span className="text-[10px] font-bold text-amber-600">
                              — {uiLabel("skipped", lang)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.description[lang]}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground flex-wrap">
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            {CATEGORY_LABEL[task.category][lang]}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5">
                            {DIFFICULTY_LABEL[task.difficulty][lang]}
                          </span>
                          <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 px-2 py-0.5">
                            +{POINTS_BY_DIFFICULTY[task.difficulty]} {uiLabel("points", lang)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 flex gap-1.5 text-xs">
                      <Lightbulb className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <p>
                        <span className="font-semibold">{uiLabel("parentTip", lang)}: </span>
                        {task.parentTip[lang]}
                      </p>
                    </div>

                    {!settled && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAction(task, "done")}
                          disabled={setMutation.isPending}
                        >
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

      {/* Role-play scenarios */}
      <Card className="border-violet-200 dark:border-violet-800">
        <CardContent className="p-3">
          <button
            type="button"
            onClick={() => setShowRolePlay((v) => !v)}
            className="flex items-center gap-2 w-full text-left"
          >
            <Drama className="h-4 w-4 text-violet-600" />
            <span className="font-quicksand font-bold text-sm flex-1">
              {t("pages.life_skills_page.role_play_title")}
            </span>
            <span className="text-xs text-muted-foreground">
              {showRolePlay ? t("pages.life_skills_page.hide") : t("pages.life_skills_page.show")}
            </span>
          </button>
          {showRolePlay && (
            <div className="mt-3 space-y-2">
              {(rolePlaysQuery.data ?? []).map((rp) => (
                <div key={rp.id} className="rounded-lg border p-2 text-xs space-y-1">
                  <p className="font-bold">{rp.title[lang]}</p>
                  <p className="text-muted-foreground">{rp.setup[lang]}</p>
                  <p>
                    <span className="font-semibold">👧 </span>
                    {rp.childLine[lang]}
                  </p>
                  <p>
                    <span className="font-semibold">👨‍👩‍👧 </span>
                    {rp.parentPrompt[lang]}
                  </p>
                </div>
              ))}
              {(rolePlaysQuery.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">{t("pages.life_skills_page.no_scenarios")}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress by category (today only) */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-quicksand font-bold text-sm">{uiLabel("progressByCat", lang)}</p>
          {categoriesForBand.map((c) => {
            const stat = byCategory[c];
            const poolSize = tasksFor(ageBand).filter((t) => t.category === c).length;
            const pct = poolSize === 0 ? 0 : Math.min(100, Math.round((stat.done / poolSize) * 100));
            return (
              <div key={c}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">
                    {CATEGORY_EMOJI[c]} {CATEGORY_LABEL[c][lang]}
                  </span>
                  <span className="text-muted-foreground">
                    {stat.done} / {poolSize} · {pct}%
                  </span>
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
                {buildAmyLifeSkillInsight(byCategory, child.name, lang)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
