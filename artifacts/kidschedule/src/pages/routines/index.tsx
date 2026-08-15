import { useState } from "react";
import {
  useListRoutines,
  getListRoutinesQueryKey,
  useListChildren,
  getListChildrenQueryKey,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, ChevronRight, ChevronLeft, TrendingUp, Users, HelpCircle, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartMealSuggestions } from "@/components/smart-meal-suggestions";
import { WeeklyReportCard } from "@/components/intelligence/weekly-report-card";
import { LearningWeightsCard } from "@/components/intelligence/learning-weights-card";
import { ProductiveNudgesCard } from "@/components/intelligence/productive-nudges-card";
import { ChildTodaySignal } from "@/components/routines/child-today-signal";
import { RoutinesEnvironmentPreview } from "@/components/routines/routines-environment-preview";
import { AmyTrustLayer } from "@/components/routines/amy-trust-layer";
import { CollapsibleRoutinesSection } from "@/components/routines/collapsible-routines-section";
import { RoutinePremiumCta } from "@/components/routines/routine-premium-cta";
import { TodayRoutineSection } from "@/components/routines/today-routine-section";
import { RoutineChildChips } from "@/components/routines/routine-child-chips";
import { RoutineStickyPill } from "@/components/routines/routine-sticky-pill";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import { shouldBypassRoutineGeneratePaywall } from "@/lib/activation-gate";
import { trackRoutineCtaClicked } from "@/lib/first-value-telemetry";
import { useTranslation } from "react-i18next";
import ForecastPage from "@/pages/forecast";
import HouseholdPage from "@/pages/household";
import ExplainPage from "@/pages/explain";
import { SafetyPanel } from "@/components/safety/safety-panel";
import { cn } from "@/lib/utils";
import { formatRoutineDateKey } from "@/lib/routine-ux";
import { isRoutineLivingV1Enabled } from "@/lib/routine-generation/living-entry";
import { RoutineLivingDashboard } from "@/components/routines/routine-living-dashboard";
import {
  PARENT_HUB_PAGE,
  ROUTINES_HUB_ACCENT,
  HUB_PAGE_CHIP_INACTIVE,
  HUB_SECTION_TITLE,
  HUB_BODY,
  hubSectionCardClasses,
  hubAccentBarClasses,
} from "@/lib/parent-hub-premium";
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
  activeChildId?: number | null;
  onGatedNavigate: (path: string) => void;
  onLockedRoutineTap: () => void;
}
function WeekCalendar({
  routines,
  isPremium,
  routinesMax,
  activeChildId,
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
            const preferred =
              (activeChildId != null
                ? dayRoutines.find((r) => r.childId === activeChildId)
                : undefined) ??
              dayRoutines.find((r) => !isRoutineLocked(r.id)) ??
              dayRoutines[0];
            if (isRoutineLocked(preferred.id)) {
              onLockedRoutineTap();
            } else {
              setLocation(`/routines/${preferred.id}`);
            }
          } else {
            const query =
              activeChildId != null ? `?date=${dateStr}&childId=${activeChildId}` : `?date=${dateStr}`;
            onGatedNavigate(`/routines/generate${query}`);
          }
        }} className={cn(
          "relative flex flex-col items-center gap-1 p-1.5 rounded-2xl border-2 transition-all text-xs min-h-[76px] justify-between",
          isToday
            ? "border-[rgba(255,184,0,0.65)] bg-[rgba(255,184,0,0.22)] text-foreground shadow-[0_0_14px_rgba(255,184,0,0.28)] ring-1 ring-amber-400/25"
            : dayRoutines.length > 0
              ? "border-white/15 bg-white/[0.06] text-foreground hover:border-emerald-400/35"
              : isWeekend
                ? "border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:border-white/12"
                : "border-white/[0.06] bg-[rgba(18,28,60,0.45)] text-muted-foreground hover:border-white/12",
        )}>
              {dayRoutines.length > 0 && (
                <span
                  className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.65)]"
                  title={t("pages.routines.index.has_routine")}
                />
              )}
              {dayRoutines.length > 1 && (
                <span className="absolute top-1 left-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-amber-500 text-[8px] font-black text-white flex items-center justify-center leading-none">
                  {dayRoutines.length}
                </span>
              )}
              <span className={cn("font-bold text-[10px]", isToday ? "text-amber-200/90" : "text-muted-foreground")}>
                {DAY_NAMES[i]}
              </span>
              <span className={cn("font-black text-base leading-none", isToday && "text-amber-50")}>{day.getDate()}</span>
              {dayRoutines.length > 0 ? <div className="flex flex-col items-center gap-0.5 w-full">
                  <div className="w-full h-1 rounded-full bg-current/20 overflow-hidden">
                    <div className={cn("h-full rounded-full", isToday ? "bg-white/70" : "bg-emerald-400/90")} style={{
                width: `${dayPct}%`
              }} />
                  </div>
                  <span className={cn("text-[9px] font-bold leading-tight text-center", isToday ? "text-amber-100/85" : "text-emerald-300/90")}>
                    {dayRoutines.length > 1
                      ? t("pages.routines.index.routines_count_short", {
                          count: dayRoutines.length,
                          defaultValue: "{{count}} routines",
                        })
                      : `${dayPct}%`}
                  </span>
                </div> : isWeekend ? <span className="text-[9px]">🏖️</span> : <span className="text-[9px] opacity-40">{t("pages.routines.index.add")}</span>}
            </button>;
      })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-[rgba(255,184,0,0.65)] bg-[rgba(255,184,0,0.22)]" />{t("pages.routines.index.today")}</span>
        <span className="flex items-center gap-1"><span className="relative w-3 h-3 rounded border border-white/15 bg-white/[0.06]"><span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" /></span>{t("pages.routines.index.has_routine")}</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-white/[0.06] bg-white/[0.03]" />{t("pages.routines.index.weekend_no_school")}</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-white/[0.06] bg-[rgba(18,28,60,0.45)]" />{t("pages.routines.index.tap_to_generate")}</span>
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
  const { data: childrenData } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const {
    isPremium,
    entitlements,
  } = useSubscription();
  const {
    openPaywall
  } = usePaywall();
  const allRoutines = (routines ?? []) as Routine[];
  const childrenList = (childrenData ?? []) as Array<{ id: number; name: string }>;
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const routinesMax = entitlements?.limits.routinesMax ?? 2;
  const generateLocked =
    !isPremium && (entitlements?.usage?.features?.routine_generate?.locked ?? false);

  const todayStr = formatRoutineDateKey(new Date());
  const lockedRoutineIds = new Set<number>(
    isPremium ? [] : allRoutines.slice(routinesMax).map((r) => r.id),
  );
  const isRoutineLocked = (id: number) => !isPremium && lockedRoutineIds.has(id);

  const todayRoutines = allRoutines.filter((r) => r.date.slice(0, 10) === todayStr);
  const childIdsWithTodayRoutine = new Set(todayRoutines.map((r) => r.childId));

  const defaultChildId =
    todayRoutines.find((r) => !isRoutineLocked(r.id))?.childId ??
    todayRoutines[0]?.childId ??
    childrenList[0]?.id ??
    null;
  const activeChildId =
    selectedChildId != null && childrenList.some((c) => c.id === selectedChildId)
      ? selectedChildId
      : defaultChildId;
  const activeChildName =
    childrenList.find((c) => c.id === activeChildId)?.name ??
    todayRoutines.find((r) => r.childId === activeChildId)?.childName;
  const activeTodayRoutine =
    todayRoutines.find((r) => r.childId === activeChildId) ?? null;
  const activeChildHasRoutine = activeTodayRoutine != null;

  function openRoutineById(id: number) {
    if (isRoutineLocked(id)) {
      openPaywall("routines_limit");
      return;
    }
    setLocation(`/routines/${id}`);
  }

  function handleGenerateClick(childId?: number, source = "routines_list") {
    trackRoutineCtaClicked({
      source,
      screen: "/routines",
      childId: childId ?? activeChildId ?? undefined,
    });
    if (
      generateLocked &&
      !shouldBypassRoutineGeneratePaywall(allRoutines.length)
    ) {
      openPaywall("routines_limit");
      return;
    }
    const targetChildId = childId ?? activeChildId ?? undefined;
    const queryParts = [`source=${source}`];
    if (targetChildId) queryParts.unshift(`childId=${targetChildId}`);
    const query = `?${queryParts.join("&")}`;
    setLocation(`/routines/generate${query}`);
  }

  function handlePrimaryCta() {
    if (activeChildHasRoutine && activeTodayRoutine) {
      openRoutineById(activeTodayRoutine.id);
      return;
    }
    handleGenerateClick(activeChildId ?? undefined);
  }

  function handleGatedNavigate(path: string) {
    if (
      generateLocked &&
      !shouldBypassRoutineGeneratePaywall(allRoutines.length)
    ) {
      openPaywall("routines_limit");
    } else {
      setLocation(path);
    }
  }

  const tabTriggerClass = cn(
    HUB_PAGE_CHIP_INACTIVE,
    "flex-1 min-w-[100px] flex items-center gap-1.5 rounded-xl",
    "data-[state=active]:border-[rgba(255,184,0,0.55)] data-[state=active]:bg-[rgba(255,184,0,0.14)]",
    "data-[state=active]:shadow-[0_0_16px_rgba(255,184,0,0.28)] data-[state=active]:text-foreground data-[state=active]:scale-[1.02]",
    "data-[state=inactive]:shadow-none",
  );

  const livingDashboard = isRoutineLivingV1Enabled();
  const firstPlanItem = activeTodayRoutine?.items?.[0];
  const supporting = (
    <>
      <AmyTrustLayer />
      <RoutinesEnvironmentPreview />
      <ChildTodaySignal />
      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-2xl" />
      ) : (
        <WeekCalendar
          routines={allRoutines}
          isPremium={isPremium}
          routinesMax={routinesMax}
          activeChildId={activeChildId}
          onGatedNavigate={handleGatedNavigate}
          onLockedRoutineTap={() => openPaywall("routines_limit")}
        />
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
      <SmartMealSuggestions />
      <p className="rg-dash-more-title">{t("routines.tabs.forecast", { defaultValue: "Forecast" })}</p>
      <ForecastPage />
      <p className="rg-dash-more-title">{t("routines.tabs.household", { defaultValue: "Household" })}</p>
      <HouseholdPage />
      <p className="rg-dash-more-title">{t("routines.tabs.explain", { defaultValue: "Why?" })}</p>
      <ExplainPage />
      <p className="rg-dash-more-title">{t("routines.tabs.safety", { defaultValue: "Safety" })}</p>
      <SafetyPanel />
    </>
  );

  if (livingDashboard) {
    return (
      <RoutineLivingDashboard
        childName={activeChildName ?? "your child"}
        childrenList={childrenList}
        activeChildId={activeChildId}
        onSelectChild={setSelectedChildId}
        childIdsWithTodayRoutine={childIdsWithTodayRoutine}
        hasPlan={activeChildHasRoutine}
        firstAction={
          firstPlanItem
            ? {
                time: firstPlanItem.time,
                activity: firstPlanItem.activity,
                duration: firstPlanItem.duration,
              }
            : null
        }
        arcPreview={(activeTodayRoutine?.items ?? []).slice(0, 4).map((item) => ({
          time: item.time,
          label: item.activity,
        }))}
        onPrimary={handlePrimaryCta}
        onRebuild={() => handleGenerateClick(activeChildId ?? undefined)}
        isLoading={isLoading}
        supporting={supporting}
      />
    );
  }

  return <div className={cn(PARENT_HUB_PAGE, "max-w-4xl mx-auto space-y-4 pb-28 animate-in fade-in duration-500")}>
      <header className="hub-page-enter">
        <h1 className={HUB_SECTION_TITLE}>{t("pages.routines.index.routines")}</h1>
        <p className={HUB_BODY}>{t("pages.routines.index.daily_schedules_generated_by_ai")}</p>
      </header>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1.5 h-auto p-0 bg-transparent rounded-none">
          <TabsTrigger value="schedule" className={tabTriggerClass}>
            <Calendar className="h-4 w-4" /> {t("routines.tabs.schedule", { defaultValue: "Schedule" })}
          </TabsTrigger>
          <TabsTrigger value="forecast" className={tabTriggerClass}>
            <TrendingUp className="h-4 w-4" /> {t("routines.tabs.forecast", { defaultValue: "Forecast" })}
          </TabsTrigger>
          <TabsTrigger value="household" className={tabTriggerClass}>
            <Users className="h-4 w-4" /> {t("routines.tabs.household", { defaultValue: "Household" })}
          </TabsTrigger>
          <TabsTrigger value="explain" className={tabTriggerClass}>
            <HelpCircle className="h-4 w-4" /> {t("routines.tabs.explain", { defaultValue: "Why?" })}
          </TabsTrigger>
          <TabsTrigger value="safety" className={tabTriggerClass}>
            <ShieldCheck className="h-4 w-4" /> {t("routines.tabs.safety", { defaultValue: "Safety" })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="mt-4"><ForecastPage /></TabsContent>
        <TabsContent value="household" className="mt-4"><HouseholdPage /></TabsContent>
        <TabsContent value="explain" className="mt-4"><ExplainPage /></TabsContent>
        <TabsContent value="safety" className="mt-4"><SafetyPanel /></TabsContent>

        <TabsContent value="schedule" className="mt-4 flex flex-col gap-5">
          {childrenList.length > 1 && (
            <RoutineChildChips
              children={childrenList}
              activeChildId={activeChildId ?? childrenList[0].id}
              onSelect={setSelectedChildId}
              childIdsWithRoutine={childIdsWithTodayRoutine}
            />
          )}

          {/* Primary CTA — single path: Smart Amy AI routine */}
          <div className="space-y-2 hub-page-enter">
            <RoutinePremiumCta
              variant={activeChildHasRoutine ? "view" : "generate"}
              onClick={handlePrimaryCta}
              testId="routines-primary-cta"
              title={
                activeChildHasRoutine
                  ? childrenList.length > 1 && activeChildName
                    ? t("pages.routines.index.view_childs_routine", {
                        name: activeChildName,
                        defaultValue: "View {{name}}'s routine",
                      })
                    : t("pages.routines.index.view_todays_routine", {
                        defaultValue: "View today's routine",
                      })
                  : childrenList.length > 1 && activeChildName
                    ? t("pages.routines.index.generate_for_child", {
                        name: activeChildName,
                        defaultValue: "Generate routine for {{name}}",
                      })
                    : t("pages.routines.index.generate_smart_amy", {
                        defaultValue: "Generate Smart Amy Routine",
                      })
              }
              subtext={
                activeChildHasRoutine
                  ? t("pages.routines.index.open_in_one_tap", {
                      defaultValue: "Your schedule is ready — open in one tap",
                    })
                  : childrenList.length > 1 && activeChildName
                    ? t("pages.routines.index.no_routine_for_child_today", {
                        name: activeChildName,
                        defaultValue: "No routine yet for {{name}} today",
                      })
                    : t("pages.routines.index.ai_powered_subtext", {
                        defaultValue: "AI-powered personalized routine",
                      })
              }
            />
            {activeChildHasRoutine && (
              <button
                type="button"
                onClick={() => handleGenerateClick(activeChildId ?? undefined)}
                className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-amber-200/90 py-1 transition-colors"
              >
                {childrenList.length > 1 && activeChildName
                  ? t("pages.routines.index.regenerate_for_child", {
                      name: activeChildName,
                      defaultValue: "Regenerate {{name}}'s routine",
                    })
                  : t("pages.routines.index.regenerate_secondary", {
                      defaultValue: "Regenerate routine",
                    })}
              </button>
            )}
          </div>

          {/* Today's generated routine preview */}
          {activeTodayRoutine && (
            <TodayRoutineSection
              childName={activeTodayRoutine.childName}
              title={activeTodayRoutine.title}
              createdAt={activeTodayRoutine.createdAt}
              items={activeTodayRoutine.items}
              onView={() => openRoutineById(activeTodayRoutine.id)}
              onRegenerate={() => handleGenerateClick(activeChildId ?? undefined)}
            />
          )}

          {!activeChildHasRoutine && activeChildId != null && childrenList.length > 1 && (
            <div
              className={cn(
                hubSectionCardClasses(ROUTINES_HUB_ACCENT),
                "hub-page-enter overflow-hidden border-dashed border-white/15",
              )}
            >
              <div className="flex">
                <div className={hubAccentBarClasses(ROUTINES_HUB_ACCENT)} />
                <div className="flex-1 p-4 sm:p-5 space-y-3 text-center">
                  <p className="font-quicksand font-bold text-base text-foreground">
                    {t("pages.routines.index.empty_child_routine_title", {
                      name: activeChildName ?? t("pages.routines.index.this_child", {
                        defaultValue: "This child",
                      }),
                      defaultValue: "No routine for {{name}} today",
                    })}
                  </p>
                  <p className={cn(HUB_BODY, "opacity-100 text-xs")}>
                    {t("pages.routines.index.empty_child_routine_body", {
                      defaultValue:
                        "Switch between children above, or generate a personalized schedule for this child.",
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerateClick(activeChildId)}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5",
                      "text-sm font-bold text-foreground",
                      "bg-[rgba(255,184,0,0.14)] border border-[rgba(255,184,0,0.45)]",
                      "hover:bg-[rgba(255,184,0,0.22)] transition-all active:scale-[0.985]",
                    )}
                  >
                    {t("pages.routines.index.generate_for_child_cta", {
                      name: activeChildName,
                      defaultValue: "Generate for {{name}}",
                    })}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI insights & context */}
          <AmyTrustLayer />
          <RoutinesEnvironmentPreview />
          <ChildTodaySignal />

          {/* Week calendar */}
          {isLoading ? (
            <div className="grid gap-4">
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
          ) : (
            <div className={cn(hubSectionCardClasses(ROUTINES_HUB_ACCENT), "hub-page-enter overflow-hidden")}>
              <div className="flex">
                <div className={hubAccentBarClasses(ROUTINES_HUB_ACCENT)} />
                <div className="flex-1 p-4 sm:p-6">
                  {allRoutines.length === 0 && (
                    <p className={cn(HUB_BODY, "mb-4 opacity-100 text-center")}>
                      {t("pages.routines.index.calendar_empty_hint", {
                        defaultValue:
                          "Tap a day below to generate, or use the button above for today's Smart Amy routine.",
                      })}
                    </p>
                  )}
                  <WeekCalendar
                    routines={allRoutines}
                    isPremium={isPremium}
                    routinesMax={routinesMax}
                    activeChildId={activeChildId}
                    onGatedNavigate={handleGatedNavigate}
                    onLockedRoutineTap={() => openPaywall("routines_limit")}
                  />
                </div>
              </div>
            </div>
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

          <SmartMealSuggestions />

          <p className="text-center text-[10px] font-medium text-muted-foreground/60 tracking-wide">
            {t("patent_pending.microcopy_routine")}
          </p>

          {activeTodayRoutine && (
            <RoutineStickyPill
              childName={activeTodayRoutine.childName}
              onView={() => openRoutineById(activeTodayRoutine.id)}
            />
          )}

        </TabsContent>
      </Tabs>
    </div>;
}