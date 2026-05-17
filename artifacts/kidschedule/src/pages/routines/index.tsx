import { useState } from "react";
import { useListRoutines, getListRoutinesQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, ChevronRight, Wand2, Sparkles, ChevronLeft, Zap, TrendingUp, Users, HelpCircle, ShieldCheck } from "lucide-react";
import { getLastGenSettings } from "./generate";
import { Skeleton } from "@/components/ui/skeleton";
import { LockedBlock } from "@/components/locked-block";
import { SmartMealSuggestions } from "@/components/smart-meal-suggestions";
import { WeeklyReportCard } from "@/components/intelligence/weekly-report-card";
import { LearningWeightsCard } from "@/components/intelligence/learning-weights-card";
import { ProductiveNudgesCard } from "@/components/intelligence/productive-nudges-card";
import { ChildTodaySignal } from "@/components/routines/child-today-signal";
import { RoutinesEnvironmentPreview } from "@/components/routines/routines-environment-preview";
import { AmyTrustLayer } from "@/components/routines/amy-trust-layer";
import { CollapsibleRoutinesSection } from "@/components/routines/collapsible-routines-section";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { useTranslation } from "react-i18next";
import ForecastPage from "@/pages/forecast";
import HouseholdPage from "@/pages/household";
import ExplainPage from "@/pages/explain";
import { SafetyPanel } from "@/components/safety/safety-panel";
type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
};
type Routine = {
  id: number;
  childId: number;
  childName: string;
  date: string;
  title: string;
  items: RoutineItem[];
  createdAt: string;
};
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function formatDate(date: Date): string {
  // Use LOCAL date components (YYYY-MM-DD) so calendar cells map to the user's
  // calendar day, not UTC. Using toISOString() shifts dates by ±1 for users
  // east/west of UTC and was the source of "click date X opens day X-1" bug.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
interface WeekCalendarProps {
  routines: Routine[];
  isPremium: boolean;
  routinesMax: number;
  onGatedNavigate: (path: string) => void;
  onLockedRoutineTap: () => void;
}
function WeekCalendar({
  routines,
  isPremium,
  routinesMax,
  onGatedNavigate,
  onLockedRoutineTap
}: WeekCalendarProps) {
  const {
    t
  } = useTranslation();
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [, setLocation] = useLocation();
  const todayStr = formatDate(new Date());
  const lockedRoutineIds = new Set<number>(isPremium ? [] : routines.slice(routinesMax).map(r => r.id));
  const isRoutineLocked = (id: number) => !isPremium && lockedRoutineIds.has(id);
  const routinesByDate = new Map<string, Routine[]>();
  routines.forEach(r => {
    const key = r.date.slice(0, 10);
    if (!routinesByDate.has(key)) routinesByDate.set(key, []);
    routinesByDate.get(key)!.push(r);
  });
  const days = Array.from({
    length: 7
  }, (_, i) => addDays(weekStart, i));
  const weekLabel = (() => {
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(undefined, {
        month: "long"
      })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    })} – ${end.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    })}`;
  })();
  const weekRoutines = days.flatMap(d => routinesByDate.get(formatDate(d)) ?? []);
  const weekItems = weekRoutines.flatMap(r => r.items);
  const weekCompleted = weekItems.filter(i => i.status === "completed").length;
  const weekTotal = weekItems.length;
  const weekPct = weekTotal > 0 ? Math.round(weekCompleted / weekTotal * 100) : 0;
  return <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-bold text-foreground text-sm">{weekLabel}</p>
          {weekTotal > 0 && <p className="text-xs text-muted-foreground">{weekCompleted}/{weekTotal} {t("pages.routines.index.tasks_done_this_week")} {weekPct}%</p>}
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
        const dateStr = formatDate(day);
        const dayRoutines = routinesByDate.get(dateStr) ?? [];
        const isToday = dateStr === todayStr;
        const isWeekend = i >= 5;
        const dayItems = dayRoutines.flatMap(r => r.items);
        const dayTotal = dayItems.length;
        const dayDone = dayItems.filter(ii => ii.status === "completed").length;
        const dayPct = dayTotal > 0 ? Math.round(dayDone / dayTotal * 100) : 0;
        return <button key={dateStr} onClick={() => {
          if (dayRoutines.length === 1) {
            if (isRoutineLocked(dayRoutines[0].id)) {
              onLockedRoutineTap();
            } else {
              setLocation(`/routines/${dayRoutines[0].id}`);
            }
          } else if (dayRoutines.length > 1) {
            const first =
              dayRoutines.find((r) => !isRoutineLocked(r.id)) ?? dayRoutines[0];
            if (isRoutineLocked(first.id)) {
              onLockedRoutineTap();
            } else {
              setLocation(`/routines/${first.id}`);
            }
          } else {
            onGatedNavigate(`/routines/generate?date=${dateStr}`);
          }
        }} className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl border-2 transition-all text-xs min-h-[72px] justify-between ${isToday ? "border-primary bg-primary text-primary-foreground" : dayRoutines.length > 0 ? "border-border bg-muted text-primary hover:border-border" : isWeekend ? "border-border/40 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted" : "border-border/50 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
              <span className={`font-bold text-[10px] ${isToday ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {DAY_NAMES[i]}
              </span>
              <span className="font-black text-base leading-none">{day.getDate()}</span>
              {dayRoutines.length > 0 ? <div className="flex flex-col items-center gap-0.5 w-full">
                  <div className="w-full h-1 rounded-full bg-current/20 overflow-hidden">
                    <div className={`h-full rounded-full ${isToday ? "bg-white/60" : "bg-primary"}`} style={{
                width: `${dayPct}%`
              }} />
                  </div>
                  <span className={`text-[9px] font-bold ${isToday ? "text-primary-foreground/70" : "text-primary"}`}>
                    {dayRoutines.length > 1 ? `${dayRoutines.length} routines` : `${dayPct}%`}
                  </span>
                </div> : isWeekend ? <span className="text-[9px]">🏖️</span> : <span className="text-[9px] opacity-50">{t("pages.routines.index.add")}</span>}
            </button>;
      })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-primary bg-primary" />{t("pages.routines.index.today")}</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-border bg-muted" />{t("pages.routines.index.has_routine")}</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-border/40 bg-muted/30" />{t("pages.routines.index.weekend_no_school")}</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-border/50 bg-card" />{t("pages.routines.index.tap_to_generate")}</span>
      </div>

    </div>;
}
export default function RoutinesList() {
  const {
    t
  } = useTranslation();
  const [, setLocation] = useLocation();
  const {
    data: routines,
    isLoading
  } = useListRoutines(undefined, {
    query: {
      queryKey: getListRoutinesQueryKey()
    }
  });
  const {
    isPremium,
    entitlements,
    loading: subLoading
  } = useSubscription();
  const {
    openPaywall
  } = usePaywall();
  const allRoutines = (routines ?? []) as Routine[];
  const routinesMax = entitlements?.limits.routinesMax ?? 1;
  const generateLocked = !isPremium && allRoutines.length >= routinesMax;

  // Quick Generate: premium users with saved last-used settings get a one-tap
  // shortcut that opens the generate wizard pre-filled and ready to confirm.
  function buildTodayStr() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  }
  function handleGenerateClick() {
    if (generateLocked) {
      openPaywall("routines_limit");
    } else {
      setLocation("/routines/generate");
    }
  }
  function handleQuickGenerate() {
    const s = getLastGenSettings();
    if (!s) {
      setLocation("/routines/generate");
      return;
    }
    const p = new URLSearchParams({
      childId:  String(s.childId),
      mood:     s.mood,
      weather:  s.weatherOutdoor,
      caregiver: s.caregiver,
      date:     buildTodayStr(),
    });
    setLocation(`/routines/generate?${p.toString()}`);
  }
  function handleGatedNavigate(path: string) {
    if (generateLocked) {
      openPaywall("routines_limit");
    } else {
      setLocation(path);
    }
  }
  const hasLastSettings = isPremium && !!getLastGenSettings();

  const generateCta = (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleGenerateClick}
        size="lg"
        className="w-full rounded-full h-14 text-base font-bold shadow-md ring-2 ring-primary/20"
        data-testid="routines-generate-btn"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        {t("pages.routines.index.generate_child_routine")}
      </Button>
      {hasLastSettings && (
        <Button
          onClick={handleQuickGenerate}
          size="lg"
          variant="outline"
          className="w-full rounded-full h-12 text-sm font-semibold border-primary/40 text-primary hover:bg-primary/5"
          data-testid="routines-quick-generate-btn"
        >
          <Zap className="mr-2 h-4 w-4" />
          {t("pages.routines.index.use_yesterday_pattern", {
            defaultValue: "Use yesterday's pattern",
          })}
        </Button>
      )}
    </div>
  );

  return <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header>
        <h1 className="font-quicksand text-3xl font-bold text-foreground">{t("pages.routines.index.routines")}</h1>
        <p className="text-muted-foreground mt-1">{t("pages.routines.index.daily_schedules_generated_by_ai")}</p>
      </header>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1 h-auto p-1 rounded-2xl bg-muted">
          <TabsTrigger value="schedule" className="flex-1 min-w-[100px] flex items-center gap-1.5 rounded-xl">
            <Calendar className="h-4 w-4" /> {t("routines.tabs.schedule", { defaultValue: "Schedule" })}
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex-1 min-w-[100px] flex items-center gap-1.5 rounded-xl">
            <TrendingUp className="h-4 w-4" /> {t("routines.tabs.forecast", { defaultValue: "Forecast" })}
          </TabsTrigger>
          <TabsTrigger value="household" className="flex-1 min-w-[100px] flex items-center gap-1.5 rounded-xl">
            <Users className="h-4 w-4" /> {t("routines.tabs.household", { defaultValue: "Household" })}
          </TabsTrigger>
          <TabsTrigger value="explain" className="flex-1 min-w-[100px] flex items-center gap-1.5 rounded-xl">
            <HelpCircle className="h-4 w-4" /> {t("routines.tabs.explain", { defaultValue: "Why?" })}
          </TabsTrigger>
          <TabsTrigger value="safety" className="flex-1 min-w-[100px] flex items-center gap-1.5 rounded-xl">
            <ShieldCheck className="h-4 w-4" /> {t("routines.tabs.safety", { defaultValue: "Safety" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="mt-4"><ForecastPage /></TabsContent>
        <TabsContent value="household" className="mt-4"><HouseholdPage /></TabsContent>
        <TabsContent value="explain" className="mt-4"><ExplainPage /></TabsContent>
        <TabsContent value="safety" className="mt-4"><SafetyPanel /></TabsContent>

        <TabsContent value="schedule" className="mt-4 flex flex-col gap-5">
          {generateCta}

          <AmyTrustLayer />
          <RoutinesEnvironmentPreview />
          <ChildTodaySignal />

          {isLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : allRoutines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/20">
              <div className="h-14 w-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                <Wand2 className="h-7 w-7" />
              </div>
              <h3 className="font-quicksand text-lg font-bold text-foreground mb-1">
                {t("pages.routines.index.no_routines_yet")}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("pages.routines.index.let_the_ai_build_a_perfect_day_for_your_child_based_on_their")}
              </p>
            </div>
          ) : (
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardContent className="p-4 sm:p-6">
                <WeekCalendar
                  routines={allRoutines}
                  isPremium={isPremium}
                  routinesMax={routinesMax}
                  onGatedNavigate={handleGatedNavigate}
                  onLockedRoutineTap={() => openPaywall("routines_limit")}
                />
              </CardContent>
            </Card>
          )}

          <CollapsibleRoutinesSection
            title={t("intelligence.weekly.title")}
            subtitle={t("pages.routines.index.weekly_collapsed_hint", {
              defaultValue: "Tap to view your 7-day intelligence report",
            })}
          >
            <WeeklyReportCard />
          </CollapsibleRoutinesSection>

          <CollapsibleRoutinesSection
            title={t("pages.routines.index.more_insights_title", {
              defaultValue: "More insights",
            })}
            subtitle={t("pages.routines.index.more_insights_subtitle", {
              defaultValue: "Learning patterns and helpful nudges",
            })}
          >
            <div className="flex flex-col gap-4">
              <LearningWeightsCard />
              <ProductiveNudgesCard />
            </div>
          </CollapsibleRoutinesSection>

          {generateCta}

          <SmartMealSuggestions />

          <p className="text-center text-[10px] font-medium text-muted-foreground/60 tracking-wide">
            {t("patent_pending.microcopy_routine")}
          </p>

        </TabsContent>
      </Tabs>
    </div>;
}