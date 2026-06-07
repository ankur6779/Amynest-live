import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { AppLink, useAppNavigate } from "@/components/app-link";
import { AddChildLink } from "@/components/add-child-link";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import {
  resolveStudyMode, MODE_LABELS,
  getPracticePickerTopics,
  lookupPracticeTitle,
  practicePackForSubject,
  getPlayCategoriesForChild,
  playUnlocksTomorrowForCategory,
  todayIso,
  getBasicSubjectsForChild,
  getAdvancedSubjectsForChild,
  isAdaptivePracticeTopic,
  getPlayItemSpeakParts,
  getTopicNotesCatalogSpeakOpts,
  getTopicAmyCatalogSpeakOpts,
  type StudyMode, type PlayCategory, type PlayItem,
  type SubjectPack, type StudyTopic,
  type DailyPlan, type PlanItem,
} from "@workspace/study-zone";
import { AdaptiveQuestionRunner } from "@/components/adaptive-question-runner";
import { useStudyCountry } from "@/hooks/use-study-country";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import {
  GraduationCap, ArrowLeft, Volume2, VolumeX, CheckCircle2, XCircle,
  Sparkles, RotateCcw, ChevronRight, Trophy,
} from "lucide-react";
import { useHubJourney } from "@/hooks/use-hub-journey";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import {
  useRecordLearningActivity,
  playCategoryToSection,
  studySubjectToSection,
} from "@/hooks/use-record-learning-activity";
import { getPlayCategoriesWithProgress } from "@workspace/learning-progress-engine";
import {
  DailyFreshnessCard,
  ProgressionStrip,
  AmyPresenceStrip,
} from "@/components/learning-progress";
import { StudyCurriculumVisibility } from "@/components/study-curriculum-visibility";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { catalogPlaybackSpeakOptions } from "@/lib/unified-catalog-playback";
import {
  loadProgress, markPlayItem, markTopicResult,
  categoryPercent, subjectPercent, mergePlayProgressWithServer, type StudyProgress,
} from "@/lib/study-progress";
import {
  EngagementStrip, XpPopup, ConfettiBurst, useStudyFx,
} from "@/components/study-engagement";
import { HubModuleGateWrap } from "@/components/hub-module-gate-wrap";
import { cn } from "@/lib/utils";
import {
  STUDY_ACCENT,
  STUDY_BACK_BTN,
  STUDY_HEADER,
  STUDY_HINT_BANNER,
  STUDY_ICON_SHELL,
  STUDY_MAIN,
  STUDY_PAGE,
  STUDY_SECTION_TITLE,
  studyEmojiShell,
  studyGlassCard,
  studyPanelCard,
  studyPlayTile,
} from "@/lib/study-zone-theme";

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
  | { kind: "study-topic"; childId: number; mode: "basic" | "advanced"; subjectId: string; topicId: string }
  | { kind: "smart-pick"; childId: number; mode: "basic" | "advanced" }
  | { kind: "smart-run"; childId: number; mode: "basic" | "advanced"; subjectId: string };

export default function StudyPage() {
  const { t } = useTranslation();
  const { navigate, back } = useAppNavigate();
  const { data: children, isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });

  const list = (children ?? []) as Child[];
  const { country } = useStudyCountry();
  const [view, setView] = useState<View>({ kind: "child-pick" });
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const activeChildId = "childId" in view ? view.childId : null;
  const hubJourney = useHubJourney(activeChildId);
  const journeyDay = hubJourney.journeyDay;
  const learningProgress = useLearningProgress(activeChildId);
  const { recordActivity, trackNextSessionOpened } = useRecordLearningActivity(activeChildId);

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

  // Merge server-side play completions so progress survives reloads / new devices.
  useEffect(() => {
    if (!activeChildId || !learningProgress.profile?.completedActivities) return;
    setProgress((prev) => {
      const base = prev ?? loadProgress(activeChildId);
      return mergePlayProgressWithServer(
        activeChildId,
        base,
        learningProgress.profile!.completedActivities,
      );
    });
  }, [activeChildId, learningProgress.profile?.completedActivities]);

  const child = "childId" in view ? list.find((c) => c.id === view.childId) : undefined;
  const mode: StudyMode | undefined = child ? resolveStudyMode(child.age, child.childClass) : undefined;
  const gateChildName = child?.name ?? list[0]?.name ?? "your child";

  const goBack = useCallback(() => {
    if (view.kind === "play-home" || view.kind === "study-home") {
      if (list.length > 1) setView({ kind: "child-pick" });
      else back("study-back");
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
    if (view.kind === "smart-pick" || view.kind === "smart-run") {
      setView({ kind: "study-home", childId: view.childId, mode: view.mode });
      return;
    }
    back("study-back");
  }, [view, list.length, mode, back]);

  usePageBackHandler(() => {
    goBack();
    return true;
  }, [goBack]);

  return (
    <div className={STUDY_PAGE}>
      <header className={STUDY_HEADER}>
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <button
            type="button"
            className={STUDY_BACK_BTN}
            onClick={goBack}
            aria-label={t("screens.study.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className={STUDY_ICON_SHELL}>
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-quicksand text-xl font-black leading-tight text-foreground">
              {t("screens.study.header_title")}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {child ? `${child.name} · ${mode ? MODE_LABELS[mode].title : ""}` : t("screens.study.pick_child")}
            </p>
          </div>
        </div>
      </header>

      <main className={cn(STUDY_MAIN, "study-page-enter")}>
      <HubModuleGateWrap
        featureId="hub_smart_study"
        childId={activeChildId}
        childName={gateChildName}
      >
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
          {activeChildId && (
            <div className="mb-3">
              <AmyPresenceStrip surface="study" childId={activeChildId} />
            </div>
          )}
          {learningProgress.unlocks && (
            <DailyFreshnessCard
              items={learningProgress.unlocks.todaysUnlocks}
              isRevisionDay={learningProgress.unlocks.isRevisionDay}
              className="mb-3"
            />
          )}
          {progress && <EngagementStrip engagement={progress.engagement} />}
          <PlayHome
            country={country}
            childAge={child?.age}
            journeyDay={journeyDay}
            unlocks={learningProgress.unlocks}
            isPremium={learningProgress.isPremium}
            progress={progress}
            recordActivity={recordActivity}
            onOpen={(catId) => setView({ kind: "play-cat", childId: view.childId, categoryId: catId })}
          />
          {learningProgress.profile && (
            <ProgressionStrip profile={learningProgress.profile} className="mb-3" />
          )}
          {child && mode && (
            <StudyCurriculumVisibility
              childId={view.childId}
              childAge={child.age}
              childClass={child.childClass}
              mode={mode}
              childName={child.name}
              progress={progress}
              todayUnlockTitles={learningProgress.unlocks?.todaysUnlocks.map((u) => u.title)}
              nextSessionUnlocks={learningProgress.unlocks?.nextSessionUnlocks}
              onNextSessionVisible={trackNextSessionOpened}
              onContinuePlay={(categoryId) => setView({ kind: "play-cat", childId: view.childId, categoryId })}
            />
          )}
        </>
      ) : view.kind === "play-cat" ? (
        <PlayCategoryView
          childId={view.childId}
          categoryId={view.categoryId}
          country={country}
          childAge={child?.age}
          journeyDay={journeyDay}
          unlocks={learningProgress.unlocks}
          isPremium={learningProgress.isPremium}
          recordActivity={recordActivity}
          progress={progress}
          onItemDone={(p) => setProgress(p)}
        />
      ) : view.kind === "study-home" ? (
        <>
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
          <SmartAdaptiveCta
            onOpen={() => setView({ kind: "smart-pick", childId: view.childId, mode: view.mode })}
          />
          <StudyHome
            mode={view.mode}
            country={country}
            childClass={child?.childClass}
            childAge={child?.age}
            progress={progress}
            onOpen={(subjId) => setView({ kind: "study-subject", childId: view.childId, mode: view.mode, subjectId: subjId })}
          />
          {progress && <EngagementStrip engagement={progress.engagement} />}
          {child && mode && (
            <StudyCurriculumVisibility
              childId={view.childId}
              childAge={child.age}
              childClass={child.childClass}
              mode={mode}
              childName={child.name}
              progress={progress}
              todayUnlockTitles={learningProgress.unlocks?.todaysUnlocks.map((u) => u.title)}
              nextSessionUnlocks={learningProgress.unlocks?.nextSessionUnlocks}
              onNextSessionVisible={trackNextSessionOpened}
            />
          )}
        </>
      ) : view.kind === "smart-pick" ? (
        <SmartSubjectPicker
          mode={view.mode}
          onPick={(subjectId) => setView({
            kind: "smart-run", childId: view.childId, mode: view.mode, subjectId,
          })}
        />
      ) : view.kind === "smart-run" ? (
        (() => {
          const meta = lookupPracticeTitle(view.subjectId, view.mode);
          return (
            <AdaptiveQuestionRunner
              childId={view.childId}
              practiceSubject={view.subjectId}
              progressPackId={meta?.packId ?? practicePackForSubject(view.subjectId)}
              topicId={view.subjectId}
              country={country}
              subjectTitle={meta?.title ?? view.subjectId}
              subjectEmoji={meta?.emoji ?? "✨"}
              onExit={() => setView({ kind: "smart-pick", childId: view.childId, mode: view.mode })}
            />
          );
        })()
      ) : view.kind === "study-subject" ? (
        <SubjectTopicList
          mode={view.mode}
          subjectId={view.subjectId}
          country={country}
          childClass={child?.childClass}
          childAge={child?.age}
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
          country={country}
          childClass={child?.childClass}
          childAge={child?.age}
          onScored={(p) => setProgress(p)}
        />
      )}
      </HubModuleGateWrap>
      </main>
    </div>
  );
}

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
  const [planDate, setPlanDate] = useState(() => todayIso());

  useEffect(() => {
    const syncDate = () => {
      const next = todayIso();
      setPlanDate((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("focus", syncDate);
    document.addEventListener("visibilitychange", syncDate);
    return () => {
      window.removeEventListener("focus", syncDate);
      document.removeEventListener("visibilitychange", syncDate);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const token = await getToken();
        if (!token) { if (!cancelled) setLoading(false); return; }
        const res = await fetch(getApiUrl("/api/smart-study/daily-plan"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ childId, date: planDate }),
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
  }, [childId, getToken, planDate]);

  if (loading || !plan) return <Skeleton className="h-32 w-full rounded-[24px]" />;

  return (
    <div className={cn(studyPanelCard(), "mb-3")}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="font-quicksand text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[hsl(var(--brand-indigo-500))]" />
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
                  className={cn(
                    STUDY_HINT_BANNER,
                    "w-full text-left rounded-xl p-3 flex items-center gap-3",
                  )}
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
                      <span className="px-1.5 py-0.5 rounded bg-[hsl(var(--brand-indigo-100))] dark:bg-[hsl(var(--brand-indigo-950))] text-[hsl(var(--brand-indigo-700))] dark:text-[hsl(var(--brand-indigo-300))]">
                        {t(`screens.study.plan_difficulty_${it.difficulty}`)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[hsl(var(--brand-amber-100))] dark:bg-[hsl(var(--brand-amber-900))] text-[hsl(var(--brand-amber-700))] dark:text-[hsl(var(--brand-amber-300))]">
                        {t(`screens.study.plan_source_${it.source}`)}
                      </span>
                    </div>
                  </div>
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-[hsl(var(--brand-emerald-500))]" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-views ───────────────────────────────────────────────────────────────

function EmptyChildren() {
  const { t } = useTranslation();
  return (
    <div className={cn(studyPanelCard(), "border-dashed")}>
      <div className="p-10 text-center">
        <h3 className="font-quicksand text-xl font-bold text-foreground mb-2">{t("screens.study.no_children_title")}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t("screens.study.no_children_body")}</p>
        <Button asChild className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500">
          <AddChildLink source="study-add-child">{t("screens.study.add_child")}</AddChildLink>
        </Button>
      </div>
    </div>
  );
}

function ChildPicker({ children, onPick }: { children: Child[]; onPick: (c: Child) => void }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {children.map((c) => {
        const m = resolveStudyMode(c.age, c.childClass);
        const label = MODE_LABELS[m];
        return (
          <div
            key={c.id}
            className={studyGlassCard()}
            onClick={() => onPick(c)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onPick(c);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-4 p-5">
              <div className={studyEmojiShell()}>{label.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="font-quicksand font-bold text-foreground">{c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.age} {t("screens.study.year_short")}{c.childClass ? ` · ${t("screens.study.class_label", { class: c.childClass })}` : ""} · {label.title}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlayHome({
  country,
  childAge,
  journeyDay,
  unlocks,
  isPremium,
  progress,
  recordActivity: _recordActivity,
  onOpen,
}: {
  country: string;
  childAge?: number;
  journeyDay: number;
  unlocks?: import("@workspace/learning-progress-engine").UnlockResult;
  isPremium?: boolean;
  progress: StudyProgress | null;
  recordActivity?: ReturnType<typeof useRecordLearningActivity>["recordActivity"];
  onOpen: (catId: string) => void;
}) {
  const { t } = useTranslation();
  const categories = useMemo(() => {
    if (unlocks) {
      return getPlayCategoriesWithProgress(country, childAge, journeyDay, unlocks, { isPremium });
    }
    return getPlayCategoriesForChild(country, childAge, journeyDay);
  }, [country, childAge, journeyDay, unlocks, isPremium]);
  const numbersTomorrow = isPremium
    ? 0
    : playUnlocksTomorrowForCategory("numbers", journeyDay);
  return (
    <>
      {numbersTomorrow > 0 && (
        <p className={cn(STUDY_HINT_BANNER, "mb-3 text-xs text-muted-foreground")}>
          {t("screens.study.journey_unlock_hint", {
            count: numbersTomorrow,
            day: Math.min(journeyDay + 1, 3),
            defaultValue: "{{count}} more numbers unlock on journey day {{day}} — complete Today's Path in Parent Hub.",
          })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {categories.map((cat) => {
        const pct = progress ? categoryPercent(progress, cat.id, cat.items.length) : 0;
        return (
          <div key={cat.id} className={studyGlassCard()} onClick={() => onOpen(cat.id)}>
            <div className="flex min-h-[124px] flex-col items-start gap-2 p-4">
              <div className="text-3xl">{cat.emoji}</div>
              <div className="font-quicksand font-bold text-foreground">{cat.title}</div>
              <div className="text-xs text-muted-foreground">{t("screens.study.items_done", { done: progress?.play[cat.id]?.length ?? 0, total: cat.items.length })}</div>
              <Progress value={pct} className="h-1.5 w-full" />
            </div>
          </div>
        );
      })}
      </div>
    </>
  );
}

function PlayCategoryView({
  childId, categoryId, country, childAge, journeyDay, unlocks, isPremium, recordActivity, progress, onItemDone,
}: {
  childId: number;
  categoryId: string;
  country: string;
  childAge?: number;
  journeyDay: number;
  unlocks?: import("@workspace/learning-progress-engine").UnlockResult;
  isPremium?: boolean;
  recordActivity?: ReturnType<typeof useRecordLearningActivity>["recordActivity"];
  progress: StudyProgress | null;
  onItemDone: (p: StudyProgress) => void;
}) {
  const { t } = useTranslation();
  const categories = useMemo(() => {
    if (unlocks) {
      return getPlayCategoriesWithProgress(country, childAge, journeyDay, unlocks, { isPremium });
    }
    return getPlayCategoriesForChild(country, childAge, journeyDay);
  }, [country, childAge, journeyDay, unlocks, isPremium]);
  const cat = categories.find((c) => c.id === (categoryId as PlayCategory["id"]));
  const { speak, primeSpeakGesture } = useAmyVoice();
  const fx = useStudyFx();
  const { toast } = useToast();
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [xpTrigger, setXpTrigger] = useState(0);
  const [xpAmount, setXpAmount] = useState(0);
  const numberBlocks = useMemo(() => {
    if (cat?.id !== "numbers") return null;
    const blocks: Array<{ start: number; end: number; items: PlayItem[] }> = [];
    for (let i = 0; i < cat.items.length; i += 10) {
      const chunk = cat.items.slice(i, i + 10);
      const start = parseInt(chunk[0]?.id ?? "1", 10);
      const end = parseInt(chunk[chunk.length - 1]?.id ?? String(start), 10);
      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        blocks.push({ start, end, items: chunk });
      }
    }
    return blocks;
  }, [cat?.id, cat?.items]);
  if (!cat) return <p className="text-sm text-muted-foreground">{t("screens.study.category_not_found")}</p>;
  const completed = new Set(progress?.play[cat.id] ?? []);
  const hideTileBadge = cat.id === "numbers";

  const playItemAudio = async (item: PlayItem) => {
    const parts = getPlayItemSpeakParts(item, cat.id);
    for (const part of parts) {
      const result = await speak(part, catalogPlaybackSpeakOptions(part));
      if (!result.success) break;
    }
  };

  const handleTap = (item: PlayItem) => {
    void playItemAudio(item);
    fx.play("tap");
    setPoppedId(item.id);
    window.setTimeout(() => setPoppedId((v) => (v === item.id ? null : v)), 350);
    const { progress: nextP, engagement: result } = markPlayItem(childId, cat.id, item.id);
    onItemDone(nextP);
    void recordActivity?.({
      activityId: `play_${cat.id}_${item.id}`,
      section: playCategoryToSection(cat.id),
      correct: true,
    });
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

  const renderPlayTile = (item: PlayItem) => {
    const done = completed.has(item.id);
    const isRhyme = cat.id === "rhymes";
    const popping = poppedId === item.id;
    const speakParts = getPlayItemSpeakParts(item, cat.id);
    return (
      <motion.button
        key={item.id}
        onPointerDown={() => {
          primeSpeakGesture(speakParts[0]!, catalogPlaybackSpeakOptions(speakParts[0]!));
        }}
        onClick={() => handleTap(item)}
        animate={popping ? { scale: [1, 1.08, 1], boxShadow: ["0 0 0 0 rgba(99,102,241,0)", "0 0 0 10px rgba(99,102,241,0.18)", "0 0 0 0 rgba(99,102,241,0)"] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className={studyPlayTile(done)}
      >
        <div className={cn("flex items-start gap-2", hideTileBadge ? "justify-end" : "justify-between")}>
          {!hideTileBadge ? (
            <motion.div
              animate={popping ? { scale: [1, 1.4, 1], rotate: [0, -8, 8, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.45 }}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg text-lg leading-none",
                "bg-gradient-to-br from-violet-500/25 to-fuchsia-500/15",
                "border border-white/[0.10] font-bold text-foreground",
              )}
            >
              {item.emoji ?? item.label.slice(0, 1)}
            </motion.div>
          ) : null}
          {done && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
        </div>
        <div className="mt-2 font-quicksand text-lg font-bold text-foreground">{item.label}</div>
        {isRhyme && item.body ? (
          <div className="text-[11px] text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">
            {item.body}
          </div>
        ) : (
          <div className="text-[11px] text-muted-foreground mt-1">{item.speak}</div>
        )}
        <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-violet-200/80">
          <Volume2 className="h-3 w-3" /> {t("screens.study.tap_to_hear")}
        </div>
      </motion.button>
    );
  };

  return (
    <div className="relative">
      <XpPopup amount={xpAmount} trigger={xpTrigger} />
      <div className="mb-3 flex items-center justify-between">
        <h2 className={STUDY_SECTION_TITLE}>
          <span className="text-2xl">{cat.emoji}</span> {cat.title}
        </h2>
      </div>
      <div className={cn("grid gap-3", numberBlocks ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}>
        {numberBlocks
          ? numberBlocks.map((block) => (
              <section key={`${block.start}-${block.end}`} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  {block.items[0]?.emoji ? (
                    <span className="text-2xl" aria-hidden>
                      {block.items[0].emoji}
                    </span>
                  ) : null}
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {block.start}–{block.end}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {block.items.map((item) => renderPlayTile(item))}
                </div>
              </section>
            ))
          : cat.items.map((item) => renderPlayTile(item))}
      </div>
    </div>
  );
}

function StudyHome({
  mode, country, childClass, childAge, progress, onOpen,
}: {
  mode: "basic" | "advanced";
  country: string;
  childClass?: string | null;
  childAge?: number;
  progress: StudyProgress | null;
  onOpen: (subjectId: string) => void;
}) {
  const { t } = useTranslation();
  const subjects: SubjectPack[] = useMemo(
    () => (mode === "basic"
      ? getBasicSubjectsForChild(country, childClass, childAge)
      : getAdvancedSubjectsForChild(country, childClass, childAge)),
    [mode, country, childClass, childAge],
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {subjects.map((s) => {
        const pct = progress ? subjectPercent(progress, mode, s.id, s.topics.length) : 0;
        const completed = progress
          ? Object.values(progress[mode][s.id] ?? {}).filter((t) => t.completed).length
          : 0;
        return (
          <div key={s.id} className={studyGlassCard()} onClick={() => onOpen(s.id)}>
            <div className="p-5">
              <div className="mb-2 flex items-center gap-3">
                <div className={studyEmojiShell(STUDY_ACCENT)}>{s.emoji}</div>
                <div>
                  <div className="font-quicksand text-lg font-bold text-foreground">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{t("screens.study.topics_count", { done: completed, total: s.topics.length })}</div>
                </div>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SubjectTopicList({
  mode, subjectId, country, childClass, childAge, progress, onOpen,
}: {
  mode: "basic" | "advanced";
  subjectId: string;
  country: string;
  childClass?: string | null;
  childAge?: number;
  progress: StudyProgress | null;
  onOpen: (topicId: string) => void;
}) {
  const { t: tr } = useTranslation();
  const subjects: SubjectPack[] = useMemo(
    () => (mode === "basic"
      ? getBasicSubjectsForChild(country, childClass, childAge)
      : getAdvancedSubjectsForChild(country, childClass, childAge)),
    [mode, country, childClass, childAge],
  );
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return <p className="text-sm text-muted-foreground">{tr("screens.study.subject_not_found")}</p>;
  return (
    <div className="grid gap-3">
      <h2 className={STUDY_SECTION_TITLE}>
        <span className="text-2xl">{subj.emoji}</span> {subj.title}
      </h2>
      {subj.topics.map((t) => {
        const stat = progress?.[mode][subj.id]?.[t.id];
        return (
          <div key={t.id} className={studyGlassCard()} onClick={() => onOpen(t.id)}>
            <div className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="font-quicksand font-bold text-foreground">{t.title}</div>
                <div className="line-clamp-1 text-xs text-muted-foreground">{t.notes.split("\n")[0]}</div>
                {stat && (
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-200/90">
                    <Trophy className="h-3 w-3" /> {tr("screens.study.best_score", { score: stat.score, total: stat.total })}
                  </div>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopicDetail({
  childId, mode, subjectId, topicId, country, childClass, childAge, onScored,
}: {
  childId: number;
  mode: "basic" | "advanced";
  subjectId: string;
  topicId: string;
  country: string;
  childClass?: string | null;
  childAge?: number;
  onScored: (p: StudyProgress) => void;
}) {
  const subjects: SubjectPack[] = useMemo(
    () => (mode === "basic"
      ? getBasicSubjectsForChild(country, childClass, childAge)
      : getAdvancedSubjectsForChild(country, childClass, childAge)),
    [mode, country, childClass, childAge],
  );
  const subj = subjects.find((s) => s.id === subjectId);
  const topic: StudyTopic | undefined = subj?.topics.find((t) => t.id === topicId);
  const useAdaptivePractice = isAdaptivePracticeTopic(topicId);
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
  const { speak: amySpeak, pause: amyPause, speaking: amySpeaking, loading: amyLoading, primeSpeakGesture } = useAmyVoice();
  const notesSpeakOpts = useMemo(
    () => (topic ? getTopicNotesCatalogSpeakOpts(topic) : null),
    [topic],
  );
  const amySpeakOpts = useMemo(
    () => (topic ? getTopicAmyCatalogSpeakOpts(topic) : null),
    [topic],
  );
  const { getToken } = useAuth();
  const { recordActivity } = useRecordLearningActivity(childId);
  if (!subj || !topic || !notesSpeakOpts || !amySpeakOpts) {
    return <p className="text-sm text-muted-foreground">{t("screens.study.topic_not_found")}</p>;
  }

  if (practiceOpen && useAdaptivePractice) {
    return (
      <AdaptiveQuestionRunner
        childId={childId}
        practiceSubject={topicId}
        progressPackId={subj.id}
        topicId={topicId}
        country={country}
        subjectTitle={topic.title}
        subjectEmoji={subj.emoji}
        onExit={() => setPracticeOpen(false)}
      />
    );
  }

  const score = topic.questions.reduce((acc, q, i) => acc + (picks[i] === q.answer ? 1 : 0), 0);
  const total = topic.questions.length;
  const isPerfect = submitted && score === total && total > 0;

  const submit = () => {
    setSubmitted(true);
    const { progress: nextP, engagement: result } = markTopicResult(
      childId, mode, subj.id, topic.id, score, total,
    );
    onScored(nextP);

    const passed = score >= Math.ceil(total * 0.6);
    void recordActivity({
      activityId: `topic_${subj.id}_${topic.id}`,
      section: studySubjectToSection(subj.id),
      correct: passed,
      metadata: { score, total },
    });

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
        await fetch(getApiUrl("/api/smart-study/attempt"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(perQuestion),
        });
      } catch { /* best-effort */ }
    })();

    const perfect = score === total && total > 0;
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

      <div className={studyPanelCard()}>
        <div className="p-5">
          {topic.imageExample && (
            <div className="mb-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[rgba(18,28,60,0.45)]">
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(topic.imageExample)}`}
                alt={`${topic.title} illustration`}
                className="w-full h-auto block"
                style={{ maxHeight: 220, objectFit: "contain" }}
              />
            </div>
          )}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 font-quicksand font-bold text-foreground">
              <Sparkles className="h-4 w-4 text-fuchsia-300" /> {t("screens.study.notes_from_amy")}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onPointerDown={() => primeSpeakGesture(notesSpeakOpts.staticCatalogTexts[0]!, notesSpeakOpts)}
              onClick={() => {
                if (amySpeaking || amyLoading) { amyPause(); return; }
                void amySpeak(notesSpeakOpts.staticCatalogTexts[0]!, notesSpeakOpts);
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
              onPointerDown={() => primeSpeakGesture(amySpeakOpts.staticCatalogTexts[0]!, amySpeakOpts)}
              onClick={() => {
                if (amySpeaking || amyLoading) { amyPause(); return; }
                void amySpeak(amySpeakOpts.staticCatalogTexts[0]!, amySpeakOpts);
              }}
            >
              {t("screens.study.hear_amy_prompt")}
            </Button>
            <Button asChild variant="ghost" className="rounded-full">
              <AppLink href="/assistant" source="study-ask-amy">{t("screens.study.ask_amy_more")}</AppLink>
            </Button>
          </div>
        </div>
      </div>

      <div className={studyPanelCard()}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-quicksand font-bold text-foreground">
              {useAdaptivePractice
                ? t("screens.study.adaptive_practice_label", "Adaptive practice")
                : t("screens.study.practice_label", { count: total })}
            </div>
            {!practiceOpen && (
              <Button
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500"
                onClick={() => setPracticeOpen(true)}
              >
                {useAdaptivePractice
                  ? t("screens.study.start_adaptive", "Start adaptive practice")
                  : t("screens.study.try_now")}
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
                <div key={qi} className="rounded-xl border border-white/[0.08] bg-[rgba(18,28,60,0.35)] p-3">
                  <div className="font-medium text-foreground mb-2">{qi + 1}. {q.q}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => {
                      const selected = picks[qi] === oi;
                      const correct = q.answer === oi;
                      const showState = submitted;
                      const cls = !showState
                        ? selected
                          ? "border-fuchsia-400/60 bg-fuchsia-500/10"
                          : "border-white/[0.10] bg-[rgba(18,28,60,0.35)]"
                        : correct
                          ? "border-emerald-400/60 bg-emerald-500/10"
                          : selected
                            ? "border-rose-400/50 bg-rose-500/10"
                            : "border-white/[0.08] opacity-70";
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
                    className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500"
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
        </div>
      </div>
    </div>
  );
}

// ─── Smart Adaptive Practice (Smart Study Zone v2) ───────────────────────────
//
// Entry tile shown on the study-home view + the subject picker grid that
// launches the adaptive runner. Kept inline alongside the rest of the
// study-page composition so the routing/state stays in one file.

function SmartAdaptiveCta({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onOpen}
      data-testid="smart-adaptive-cta"
      className={cn(
        studyGlassCard(),
        "bg-gradient-to-br from-fuchsia-500/10 via-violet-600/5 to-transparent",
      )}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="text-3xl">✨</div>
        <div className="min-w-0 flex-1">
          <div className="font-quicksand text-base font-bold text-foreground">
            {t("screens.study.smart_adaptive_title", "Smart Adaptive Practice")}
          </div>
          <div className="text-xs text-muted-foreground">
            {t("screens.study.smart_adaptive_subtitle", "AI-picked questions that match your level")}
          </div>
        </div>
        <Button
          size="sm"
          className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500"
        >
          {t("screens.study.start", "Start")}
        </Button>
      </div>
    </div>
  );
}

function SmartSubjectPicker({ mode, onPick }: { mode: "basic" | "advanced"; onPick: (subjectId: string) => void }) {
  const { t } = useTranslation();
  const topics = useMemo(() => getPracticePickerTopics(mode), [mode]);
  return (
    <div className="grid gap-3">
      <header>
        <h2 className="font-quicksand text-xl font-bold text-foreground">
          {t("screens.study.smart_pick_title", "Pick a topic to practice")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("screens.study.smart_pick_subtitle", "Difficulty adapts as you go")}
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {topics.map((s) => (
          <div
            key={s.id}
            onClick={() => onPick(s.id)}
            data-testid={`smart-subject-${s.id}`}
            className={studyGlassCard()}
          >
            <div className="p-4 text-center">
              <div className="mb-1 text-3xl">{s.emoji}</div>
              <div className="font-quicksand text-sm font-bold text-foreground">
                {s.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
