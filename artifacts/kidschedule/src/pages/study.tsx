import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import {
  PLAY_CATEGORIES, BASIC_SUBJECTS, ADVANCED_SUBJECTS,
  resolveStudyMode, MODE_LABELS,
  type StudyMode, type PlayCategory, type PlayItem,
  type SubjectPack, type StudyTopic,
  type DailyPlan, type PlanItem,
} from "@workspace/study-zone";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap, ArrowLeft, Volume2, VolumeX, CheckCircle2, XCircle,
  Sparkles, RotateCcw, ChevronRight, Trophy,
} from "lucide-react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import {
  loadProgress, markPlayItem, markTopicResult,
  categoryPercent, subjectPercent, type StudyProgress,
} from "@/lib/study-progress";
import {
  EngagementStrip, XpPopup, ConfettiBurst, useStudyFx,
} from "@/components/study-engagement";

type Child = {
  id: number;
  name: string;
  age: number;
  ageMonths?: number;
  childClass?: string | null;
};

type View =
  | { kind: "child-pick" }
  | { kind: "play-home"; childId: number }
  | { kind: "play-cat"; childId: number; categoryId: string }
  | { kind: "study-home"; childId: number; mode: "basic" | "advanced" }
  | { kind: "study-subject"; childId: number; mode: "basic" | "advanced"; subjectId: string }
  | { kind: "study-topic"; childId: number; mode: "basic" | "advanced"; subjectId: string; topicId: string };

export default function StudyPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { data: children, isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });

  const list = (children ?? []) as Child[];
  const [view, setView] = useState<View>({ kind: "child-pick" });
  const [progress, setProgress] = useState<StudyProgress | null>(null);

  // Auto-pick when there's only one child.
  useEffect(() => {
    if (view.kind === "child-pick" && list.length === 1) {
      const onlyChild = list[0];
      const mode = resolveStudyMode(onlyChild.age, onlyChild.childClass);
      setView(mode === "play"
        ? { kind: "play-home", childId: onlyChild.id }
        : { kind: "study-home", childId: onlyChild.id, mode });
    }
  }, [list, view.kind]);

  // Load progress when child changes.
  useEffect(() => {
    if ("childId" in view) setProgress(loadProgress(view.childId));
  }, [("childId" in view) ? view.childId : null]);

  const child = "childId" in view ? list.find((c) => c.id === view.childId) : undefined;
  const mode: StudyMode | undefined = child ? resolveStudyMode(child.age, child.childClass) : undefined;

  const goBack = () => {
    if (view.kind === "play-home" || view.kind === "study-home") {
      if (list.length > 1) setView({ kind: "child-pick" });
      else navigate("/parenting-hub");
      return;
    }
    if (view.kind === "play-cat" || view.kind === "study-subject") {
      setView(mode === "play"
        ? { kind: "play-home", childId: view.childId }
        : { kind: "study-home", childId: view.childId, mode: (view as any).mode });
      return;
    }
    if (view.kind === "study-topic") {
      setView({ kind: "study-subject", childId: view.childId, mode: view.mode, subjectId: view.subjectId });
      return;
    }
    navigate("/parenting-hub");
  };

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0"
            onClick={goBack}
            aria-label={t("screens.study.back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-quicksand text-2xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-foreground" />
              {t("screens.study.header_title")}
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {child ? `${child.name} · ${mode ? MODE_LABELS[mode].title : ""}` : t("screens.study.pick_child")}
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <EmptyChildren />
      ) : view.kind === "child-pick" ? (
        <ChildPicker children={list} onPick={(c) => {
          const m = resolveStudyMode(c.age, c.childClass);
          setView(m === "play"
            ? { kind: "play-home", childId: c.id }
            : { kind: "study-home", childId: c.id, mode: m });
        }} />
      ) : view.kind === "play-home" ? (
        <>
          {progress && <EngagementStrip engagement={progress.engagement} />}
          <PlayHome
            progress={progress}
            onOpen={(catId) => setView({ kind: "play-cat", childId: view.childId, categoryId: catId })}
          />
        </>
      ) : view.kind === "play-cat" ? (
        <PlayCategoryView
          childId={view.childId}
          categoryId={view.categoryId}
          progress={progress}
          onItemDone={(p) => setProgress(p)}
        />
      ) : view.kind === "study-home" ? (
        <>
          {progress && <EngagementStrip engagement={progress.engagement} />}
          <TodaysPlanSection
            childId={view.childId}
            childName={child?.name ?? ""}
            onOpen={(item) => setView({
              kind: "study-topic",
              childId: view.childId,
              mode: item.mode,
              subjectId: item.subject,
              topicId: item.topicId,
            })}
          />
          <StudyHome
            mode={view.mode}
            progress={progress}
            onOpen={(subjId) => setView({ kind: "study-subject", childId: view.childId, mode: view.mode, subjectId: subjId })}
          />
        </>
      ) : view.kind === "study-subject" ? (
        <SubjectTopicList
          mode={view.mode}
          subjectId={view.subjectId}
          progress={progress}
          onOpen={(topicId) => setView({
            kind: "study-topic", childId: view.childId, mode: view.mode, subjectId: view.subjectId, topicId,
          })}
        />
      ) : (
        <TopicDetail
          childId={view.childId}
          mode={view.mode}
          subjectId={view.subjectId}
          topicId={view.topicId}
          onScored={(p) => setProgress(p)}
        />
      )}
    </div>
  );
}

// ─── Today's Plan ────────────────────────────────────────────────────────────

function TodaysPlanSection({
  childId, childName, onOpen,
}: {
  childId: number;
  childName: string;
  onOpen: (item: PlanItem) => void;
}) {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [completionPct, setCompletionPct] = useState(0);
  const [doneTopicIds, setDoneTopicIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        if (!token) { if (!cancelled) setLoading(false); return; }
        const res = await fetch("/api/smart-study/daily-plan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ childId }),
        });
        if (!res.ok) { if (!cancelled) setLoading(false); return; }
        const data = (await res.json()) as {
          plan: DailyPlan;
          completionPct: number;
          doneTopicIds: string[];
        };
        if (cancelled) return;
        setPlan(data.plan);
        setCompletionPct(data.completionPct);
        setDoneTopicIds(new Set(data.doneTopicIds));
      } catch {
        /* surface nothing — falls back to subject grid */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [childId, getToken]);

  if (loading || !plan) return null;

  return (
    <Card className="rounded-2xl mb-3 border-indigo-200 dark:border-indigo-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="font-quicksand text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            {t("screens.study.todays_plan")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("screens.study.plan_completion", { pct: completionPct })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {t("screens.study.todays_plan_subtitle", { name: childName })}
        </p>
        {plan.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("screens.study.todays_plan_empty")}</p>
        ) : (
          <div className="grid gap-2">
            {plan.items.map((it) => {
              const done = doneTopicIds.has(it.topicId);
              return (
                <button
                  key={it.id}
                  onClick={() => onOpen(it)}
                  className="text-left rounded-xl border p-3 flex items-center gap-3 hover-elevate transition"
                  data-testid={`plan-item-${it.subject}-${it.topicId}`}
                >
                  <div className="text-2xl">{it.subjectEmoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-quicksand font-bold text-foreground truncate">
                      {it.topicTitle}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>{it.subjectTitle}</span>
                      <span>·</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {t(`screens.study.plan_difficulty_${it.difficulty}`)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        {t(`screens.study.plan_source_${it.source}`)}
                      </span>
                    </div>
                  </div>
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function EmptyChildren() {
  const { t } = useTranslation();
  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="p-10 text-center">
        <h3 className="font-quicksand text-xl font-bold text-foreground mb-2">{t("screens.study.no_children_title")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("screens.study.no_children_body")}</p>
        <Button asChild className="rounded-full">
          <Link href="/children/new">{t("screens.study.add_child")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ChildPicker({ children, onPick }: { children: Child[]; onPick: (c: Child) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {children.map((c) => {
        const m = resolveStudyMode(c.age, c.childClass);
        const label = MODE_LABELS[m];
        return (
          <Card key={c.id} className="rounded-2xl hover-elevate cursor-pointer" onClick={() => onPick(c)}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted text-foreground flex items-center justify-center text-xl">
                {label.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-quicksand font-bold text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.age} {t("screens.study.year_short")}{c.childClass ? ` · ${t("screens.study.class_label", { class: c.childClass })}` : ""} · {label.title}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PlayHome({ progress, onOpen }: { progress: StudyProgress | null; onOpen: (catId: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {PLAY_CATEGORIES.map((cat) => {
        const pct = progress ? categoryPercent(progress, cat.id, cat.items.length) : 0;
        return (
          <Card key={cat.id} className="rounded-2xl hover-elevate cursor-pointer" onClick={() => onOpen(cat.id)}>
            <CardContent className="p-4 flex flex-col items-start gap-2 min-h-[124px]">
              <div className="text-3xl">{cat.emoji}</div>
              <div className="font-quicksand font-bold text-foreground">{cat.title}</div>
              <div className="text-xs text-muted-foreground">{t("screens.study.items_done", { done: progress?.play[cat.id]?.length ?? 0, total: cat.items.length })}</div>
              <Progress value={pct} className="h-1.5 w-full" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PlayCategoryView({
  childId, categoryId, progress, onItemDone,
}: {
  childId: number;
  categoryId: string;
  progress: StudyProgress | null;
  onItemDone: (p: StudyProgress) => void;
}) {
  const { t } = useTranslation();
  const cat = PLAY_CATEGORIES.find((c) => c.id === (categoryId as PlayCategory["id"]));
  const { speak } = useAmyVoice();
  const fx = useStudyFx();
  const { toast } = useToast();
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [xpTrigger, setXpTrigger] = useState(0);
  const [xpAmount, setXpAmount] = useState(0);
  if (!cat) return <p className="text-sm text-muted-foreground">{t("screens.study.category_not_found")}</p>;
  const completed = new Set(progress?.play[cat.id] ?? []);
  const handleTap = (item: PlayItem) => {
    speak(item.speak);
    fx.play("tap");
    setPoppedId(item.id);
    window.setTimeout(() => setPoppedId((v) => (v === item.id ? null : v)), 350);
    const { progress: nextP, engagement: result } = markPlayItem(childId, cat.id, item.id);
    onItemDone(nextP);
    if (result.xpDelta > 0) {
      setXpAmount(result.xpDelta);
      setXpTrigger((t) => t + 1);
    }
    if (result.streakIncreased && result.next.streak > 1) {
      toast({ title: t("screens.study.streak_toast_title", { count: result.next.streak }), description: t("screens.study.streak_toast_play") });
    }
    if (result.newBadges.length > 0) {
      toast({ title: t("screens.study.badge_toast_title"), description: t("screens.study.badge_toast_body", { count: result.newBadges.length }) });
    }
  };
  return (
    <div className="relative">
      <XpPopup amount={xpAmount} trigger={xpTrigger} />
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-quicksand text-xl font-bold text-foreground flex items-center gap-2">
          <span className="text-2xl">{cat.emoji}</span> {cat.title}
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {cat.items.map((item) => {
          const done = completed.has(item.id);
          const isRhyme = cat.id === "rhymes";
          const popping = poppedId === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => handleTap(item)}
              animate={popping ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0 0 rgba(99,102,241,0)", "0 0 0 10px rgba(99,102,241,0.18)", "0 0 0 0 rgba(99,102,241,0)"] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
              className={[
                "group relative rounded-2xl border-2 p-4 text-left transition-colors",
                "bg-card",
                done ? "border-primary" : "border-border",
                "hover:shadow-md active:shadow-inner",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <motion.div
                  animate={popping ? { scale: [1, 1.4, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.45 }}
                  className="text-4xl leading-none"
                >
                  {item.emoji ?? "·"}
                </motion.div>
                {done && <CheckCircle2 className="h-4 w-4 text-foreground" />}
              </div>
              <div className="mt-2 font-quicksand font-bold text-foreground text-lg">{item.label}</div>
              {isRhyme && item.body ? (
                <div className="text-[11px] text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">
                  {item.body}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground mt-1">{item.speak}</div>
              )}
              <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-foreground font-medium">
                <Volume2 className="h-3 w-3" /> {t("screens.study.tap_to_hear")}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function StudyHome({
  mode, progress, onOpen,
}: {
  mode: "basic" | "advanced";
  progress: StudyProgress | null;
  onOpen: (subjectId: string) => void;
}) {
  const { t } = useTranslation();
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {subjects.map((s) => {
        const pct = progress ? subjectPercent(progress, mode, s.id, s.topics.length) : 0;
        const completed = progress
          ? Object.values(progress[mode][s.id] ?? {}).filter((t) => t.completed).length
          : 0;
        return (
          <Card key={s.id} className="rounded-2xl hover-elevate cursor-pointer" onClick={() => onOpen(s.id)}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl">{s.emoji}</div>
                <div>
                  <div className="font-quicksand text-lg font-bold text-foreground">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{t("screens.study.topics_count", { done: completed, total: s.topics.length })}</div>
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function SubjectTopicList({
  mode, subjectId, progress, onOpen,
}: {
  mode: "basic" | "advanced";
  subjectId: string;
  progress: StudyProgress | null;
  onOpen: (topicId: string) => void;
}) {
  const { t: tr } = useTranslation();
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return <p className="text-sm text-muted-foreground">{tr("screens.study.subject_not_found")}</p>;
  return (
    <div className="grid gap-3">
      <h2 className="font-quicksand text-xl font-bold text-foreground flex items-center gap-2">
        <span className="text-2xl">{subj.emoji}</span> {subj.title}
      </h2>
      {subj.topics.map((t) => {
        const stat = progress?.[mode][subj.id]?.[t.id];
        return (
          <Card key={t.id} className="rounded-2xl hover-elevate cursor-pointer" onClick={() => onOpen(t.id)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-quicksand font-bold text-foreground">{t.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{t.notes.split("\n")[0]}</div>
                {stat && (
                  <div className="text-[11px] mt-1 inline-flex items-center gap-1 text-foreground font-medium">
                    <Trophy className="h-3 w-3" /> {tr("screens.study.best_score", { score: stat.score, total: stat.total })}
                  </div>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TopicDetail({
  childId, mode, subjectId, topicId, onScored,
}: {
  childId: number;
  mode: "basic" | "advanced";
  subjectId: string;
  topicId: string;
  onScored: (p: StudyProgress) => void;
}) {
  const subjects: SubjectPack[] = mode === "basic" ? BASIC_SUBJECTS : ADVANCED_SUBJECTS;
  const subj = subjects.find((s) => s.id === subjectId);
  const topic: StudyTopic | undefined = subj?.topics.find((t) => t.id === topicId);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [picks, setPicks] = useState<number[]>(() => topic ? Array(topic.questions.length).fill(-1) : []);
  const [submitted, setSubmitted] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [xpTrigger, setXpTrigger] = useState(0);
  const [xpAmount, setXpAmount] = useState(0);
  const [shakeWrong, setShakeWrong] = useState(0);
  const fx = useStudyFx();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { speak: amySpeak, stop: amyStop, speaking: amySpeaking, loading: amyLoading } = useAmyVoice();
  const { getToken } = useAuth();
  if (!subj || !topic) return <p className="text-sm text-muted-foreground">{t("screens.study.topic_not_found")}</p>;

  const score = topic.questions.reduce((acc, q, i) => acc + (picks[i] === q.answer ? 1 : 0), 0);
  const total = topic.questions.length;
  const isPerfect = submitted && score === total && total > 0;

  const submit = () => {
    setSubmitted(true);
    const { progress: nextP, engagement: result } = markTopicResult(
      childId, mode, subj.id, topic.id, score, total,
    );
    onScored(nextP);

    // Fire-and-forget: tell the server about every question attempted so
    // the rolling 20-attempt window fills quickly and weak-topic
    // detection reacts within the same session, not across sessions.
    // Batched into a single POST to keep network cost flat.
    const nowIso = new Date().toISOString();
    const perQuestion = topic.questions.map((q, i) => ({
      childId,
      subject: subj.id,
      topicId: topic.id,
      correct: picks[i] === q.answer,
      ts: nowIso,
    }));
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        await fetch("/api/smart-study/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(perQuestion),
        });
      } catch { /* best-effort */ }
    })();

    const perfect = score === total && total > 0;
    const passed = score >= Math.ceil(total * 0.6);
    if (perfect) {
      fx.play("perfect");
      setConfettiTrigger((t) => t + 1);
    } else if (passed) {
      fx.play("correct");
    } else {
      fx.play("wrong");
      setShakeWrong((s) => s + 1);
    }
    if (result.xpDelta > 0) {
      setXpAmount(result.xpDelta);
      setXpTrigger((t) => t + 1);
    }
    if (result.streakIncreased && result.next.streak > 1) {
      toast({ title: t("screens.study.streak_toast_title", { count: result.next.streak }), description: t("screens.study.streak_toast_study") });
    }
    if (result.goalReached) {
      toast({ title: t("screens.study.goal_toast_title"), description: t("screens.study.goal_toast_body") });
    }
    if (result.newBadges.some((b) => b.startsWith("perfect-"))) {
      toast({ title: t("screens.study.perfect_toast_title"), description: t("screens.study.perfect_toast_body", { topic: topic.title }) });
    }
  };
  const reset = () => { setPicks(Array(total).fill(-1)); setSubmitted(false); };

  return (
    <div className="grid gap-4 relative">
      <XpPopup amount={xpAmount} trigger={xpTrigger} />
      <ConfettiBurst trigger={confettiTrigger} />
      <div>
        <h2 className="font-quicksand text-2xl font-bold text-foreground">{topic.title}</h2>
        <p className="text-xs text-muted-foreground">{subj.emoji} {subj.title}</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-5">
          {topic.imageExample && (
            <div className="mb-4 rounded-xl overflow-hidden border border-border/40 bg-card">
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(topic.imageExample)}`}
                alt={`${topic.title} illustration`}
                className="w-full h-auto block"
                style={{ maxHeight: 220, objectFit: "contain" }}
              />
            </div>
          )}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="font-quicksand font-bold text-foreground inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-foreground" /> {t("screens.study.notes_from_amy")}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                if (amySpeaking || amyLoading) { amyStop(); return; }
                amySpeak(topic.notes.replace(/\n/g, "."));
              }}
            >
              {(amySpeaking || amyLoading) ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
              {amySpeaking ? t("screens.study.stop") : amyLoading ? "…" : t("screens.study.read_aloud")}
            </Button>
          </div>
          <div className="text-sm text-foreground whitespace-pre-line leading-relaxed">{topic.notes}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                if (amySpeaking || amyLoading) { amyStop(); return; }
                amySpeak(topic.amyPrompt);
              }}
            >
              {t("screens.study.hear_amy_prompt")}
            </Button>
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/assistant">{t("screens.study.ask_amy_more")}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-quicksand font-bold text-foreground">{t("screens.study.practice_label", { count: total })}</div>
            {!practiceOpen && (
              <Button className="rounded-full bg-primary hover:bg-primary" onClick={() => setPracticeOpen(true)}>
                {t("screens.study.try_now")}
              </Button>
            )}
          </div>
          {practiceOpen && (
            <motion.div
              key={shakeWrong}
              animate={shakeWrong > 0 ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
              transition={{ duration: 0.4 }}
              className="grid gap-4"
            >
              {topic.questions.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-border/50 p-3">
                  <div className="font-medium text-foreground mb-2">{qi + 1}. {q.q}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const selected = picks[qi] === oi;
                      const correct = q.answer === oi;
                      const showState = submitted;
                      const cls = !showState
                        ? selected ? "border-primary bg-muted" : "border-border"
                        : correct ? "border-primary bg-muted"
                        : selected ? "border-primary bg-muted"
                        : "border-border opacity-70";
                      return (
                        <button
                          key={oi}
                          disabled={submitted}
                          onClick={() => setPicks((p) => { const n = [...p]; n[qi] = oi; return n; })}
                          className={`text-left rounded-lg border-2 px-3 py-2 text-sm ${cls} transition-colors`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {showState && correct && <CheckCircle2 className="h-4 w-4 text-foreground" />}
                            {showState && !correct && selected && <XCircle className="h-4 w-4 text-foreground" />}
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {submitted && q.hint && (
                    <div className="text-[12px] text-muted-foreground mt-2">💡 {q.hint}</div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between flex-wrap gap-3">
                {!submitted ? (
                  <Button
                    className="rounded-full bg-primary hover:bg-primary"
                    onClick={submit}
                    disabled={picks.some((p) => p === -1)}
                  >
                    {t("screens.study.submit")}
                  </Button>
                ) : (
                  <>
                    <motion.div
                      key={`score-${score}`}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className={`font-quicksand font-extrabold text-lg ${isPerfect ? "text-foreground" : "text-foreground"}`}
                    >
                      {t("screens.study.you_got", { score, total, emoji: score === total ? "🎉" : score >= Math.ceil(total * 0.6) ? "👍" : "💪" })}
                    </motion.div>
                    <Button variant="outline" className="rounded-full" onClick={reset}>
                      <RotateCcw className="h-4 w-4 mr-1" /> {t("screens.study.try_again")}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
