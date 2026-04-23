import { useState } from "react";
import { useListRoutines, getListRoutinesQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, ChevronRight, Wand2, Sparkles, List, ChevronLeft, School, Sun } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LockedBlock } from "@/components/locked-block";
import { SchoolMorningFlowCard } from "@/components/school-morning-flow-card";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";

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
  const diff = (day === 0 ? -6 : 1 - day);
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

function WeekCalendar({ routines, isPremium, routinesMax, onGatedNavigate, onLockedRoutineTap }: WeekCalendarProps) {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [, setLocation] = useLocation();

  const todayStr = formatDate(new Date());

  const lockedRoutineIds = new Set<number>(
    isPremium ? [] : routines.slice(routinesMax).map((r) => r.id)
  );
  const isRoutineLocked = (id: number) => !isPremium && lockedRoutineIds.has(id);

  const routinesByDate = new Map<string, Routine[]>();
  routines.forEach((r) => {
    const key = r.date.slice(0, 10);
    if (!routinesByDate.has(key)) routinesByDate.set(key, []);
    routinesByDate.get(key)!.push(r);
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const weekLabel = (() => {
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(undefined, { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  })();

  const weekRoutines = days.flatMap((d) => routinesByDate.get(formatDate(d)) ?? []);
  const weekItems = weekRoutines.flatMap((r) => r.items);
  const weekCompleted = weekItems.filter((i) => i.status === "completed").length;
  const weekTotal = weekItems.length;
  const weekPct = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-bold text-foreground text-sm">{weekLabel}</p>
          {weekTotal > 0 && (
            <p className="text-xs text-muted-foreground">{weekCompleted}/{weekTotal} tasks done this week · {weekPct}%</p>
          )}
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
          const dayItems = dayRoutines.flatMap((r) => r.items);
          const dayTotal = dayItems.length;
          const dayDone = dayItems.filter((ii) => ii.status === "completed").length;
          const dayPct = dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0;

          return (
            <button
              key={dateStr}
              onClick={() => {
                if (dayRoutines.length === 1) {
                  if (isRoutineLocked(dayRoutines[0].id)) {
                    onLockedRoutineTap();
                  } else {
                    setLocation(`/routines/${dayRoutines[0].id}`);
                  }
                } else if (dayRoutines.length > 1) {
                  document.getElementById("routines-list")?.scrollIntoView({ behavior: "smooth" });
                } else {
                  onGatedNavigate(`/routines/generate?date=${dateStr}`);
                }
              }}
              className={`flex flex-col items-center gap-1 p-1.5 rounded-2xl border-2 transition-all text-xs min-h-[72px] justify-between ${
                isToday
                  ? "border-primary bg-primary text-primary-foreground"
                  : dayRoutines.length > 0
                  ? "border-green-300 bg-green-50 text-green-800 hover:border-green-400"
                  : isWeekend
                  ? "border-border/40 bg-muted/30 text-muted-foreground hover:border-amber-300 hover:bg-amber-50"
                  : "border-border/50 bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span className={`font-bold text-[10px] ${isToday ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {DAY_NAMES[i]}
              </span>
              <span className="font-black text-base leading-none">{day.getDate()}</span>
              {dayRoutines.length > 0 ? (
                <div className="flex flex-col items-center gap-0.5 w-full">
                  <div className="w-full h-1 rounded-full bg-current/20 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isToday ? "bg-white/60" : "bg-green-500"}`}
                      style={{ width: `${dayPct}%` }}
                    />
                  </div>
                  <span className={`text-[9px] font-bold ${isToday ? "text-primary-foreground/70" : "text-green-600"}`}>
                    {dayRoutines.length > 1 ? `${dayRoutines.length} routines` : `${dayPct}%`}
                  </span>
                </div>
              ) : isWeekend ? (
                <span className="text-[9px]">🏖️</span>
              ) : (
                <span className="text-[9px] opacity-50">+ add</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground px-1">
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-primary bg-primary" />Today</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-green-300 bg-green-50" />Has routine</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-border/40 bg-muted/30" />Weekend / No school</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 rounded border-2 border-border/50 bg-card" />Tap to generate</span>
      </div>

      {weekRoutines.length > 0 && (
        <div id="routines-list" className="mt-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">This Week's Routines</p>
          <div className="space-y-2">
            {weekRoutines.map((r) => {
              const items = r.items;
              const done = items.filter((i) => i.status === "completed").length;
              const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
              const locked = isRoutineLocked(r.id);
              return (
                <LockedBlock key={r.id} locked={locked} reason="routines_limit" label="Premium" cta="Unlock All Routines" rounded="rounded-2xl">
                  <Link href={locked ? "#" : `/routines/${r.id}`} onClick={locked ? (e) => e.preventDefault() : undefined}>
                    <Card className="rounded-2xl border-border/50 shadow-sm hover:border-primary/30 transition-all cursor-pointer group">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">{r.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{r.childName}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold text-foreground">{pct}%</div>
                            <div className="text-[10px] text-muted-foreground">{done}/{items.length}</div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </LockedBlock>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoutinesList() {
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [, setLocation] = useLocation();

  const { data: routines, isLoading } = useListRoutines(undefined, {
    query: { queryKey: getListRoutinesQueryKey() }
  });

  const { isPremium, entitlements, loading: subLoading } = useSubscription();
  const { openPaywall } = usePaywall();

  const allRoutines = (routines ?? []) as Routine[];
  const routinesMax = entitlements?.limits.routinesMax ?? 1;
  const generateLocked = !isPremium && allRoutines.length >= routinesMax;

  function handleGenerateClick() {
    if (generateLocked) {
      openPaywall("routines_limit");
    } else {
      setLocation("/routines/generate");
    }
  }

  function handleGatedNavigate(path: string) {
    if (generateLocked) {
      openPaywall("routines_limit");
    } else {
      setLocation(path);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-quicksand text-3xl font-bold text-foreground">Routines</h1>
          <p className="text-muted-foreground mt-1">Daily schedules generated by AI</p>
        </div>
        <Button
          onClick={handleGenerateClick}
          className="rounded-full shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
          data-testid="routines-generate-btn"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          Generate
        </Button>
      </header>

      {/* 🌅 School Morning Flow — moved here from Parent Hub */}
      <div className="rounded-3xl border border-orange-100 dark:border-orange-400/20 bg-gradient-to-br from-orange-50 dark:from-orange-500/10 to-amber-50 dark:to-amber-500/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Sun className="h-5 w-5 text-orange-500" />
          <p className="font-quicksand font-bold text-sm text-foreground">🌅 School Morning Flow</p>
          <p className="text-xs text-muted-foreground ml-1">Night prep + morning steps with smart delay detection</p>
        </div>
        <SchoolMorningFlowCard />
      </div>

      <div className="flex gap-2 p-1 bg-muted rounded-2xl">
        <button
          onClick={() => setView("calendar")}
          className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            view === "calendar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="h-4 w-4" /> Calendar
        </button>
        <button
          onClick={() => setView("list")}
          className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            view === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List className="h-4 w-4" /> All Routines
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {view === "calendar" && (
            <Card className="rounded-3xl border-none shadow-sm bg-card">
              <CardContent className="p-4 sm:p-6">
                <WeekCalendar routines={allRoutines} isPremium={isPremium} routinesMax={routinesMax} onGatedNavigate={handleGatedNavigate} onLockedRoutineTap={() => openPaywall("routines_limit")} />
              </CardContent>
            </Card>
          )}

          {view === "list" && (
            <>
              {allRoutines.length > 0 ? (
                <div className="grid gap-4">
                  {allRoutines.map((routine, index) => {
                    const isLocked = !isPremium && index >= routinesMax;
                    return (
                      <LockedBlock
                        key={routine.id}
                        locked={isLocked}
                        reason="routines_limit"
                        label="Premium"
                        cta="Unlock All Routines"
                        rounded="rounded-2xl"
                      >
                        <Link href={`/routines/${routine.id}`}>
                          <Card className="rounded-2xl border-border/50 shadow-sm hover:border-primary/30 transition-all cursor-pointer group hover-elevate" style={{ animationDelay: `${index * 50}ms` }}>
                            <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                              <div className="flex items-center gap-4 w-full">
                                <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                  <Calendar className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-quicksand text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">{routine.title}</h3>
                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center rounded-md bg-secondary/30 px-2 py-0.5 text-xs font-medium text-secondary-foreground border border-secondary/50">
                                      {routine.childName}
                                    </span>
                                    <span className="flex items-center text-xs">
                                      {new Date(routine.date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                                    </span>
                                    <span className="text-xs px-2 rounded-full bg-muted">
                                      {routine.items?.length || 0} activities
                                    </span>
                                  </div>
                                </div>
                                <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full bg-muted group-hover:bg-primary/10 transition-colors flex-shrink-0">
                                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      </LockedBlock>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/50 rounded-3xl bg-muted/20">
                  <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                    <Wand2 className="h-8 w-8" />
                  </div>
                  <h3 className="font-quicksand text-xl font-bold text-foreground mb-2">No routines yet</h3>
                  <p className="text-muted-foreground max-w-sm mb-6">
                    Let the AI build a perfect day for your child based on their goals and school times.
                  </p>
                  <Button onClick={handleGenerateClick} size="lg" className="rounded-full shadow-sm hover-elevate">
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate First Routine
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
