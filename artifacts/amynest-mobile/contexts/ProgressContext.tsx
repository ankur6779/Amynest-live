import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type RoutineTask = {
  id: string;
  title: string;
  time: string;
  minutes: number;
  icon: string;
  done: boolean;
  ageBand?: "2-5" | "6-10" | "10+";
};

export type CoachStep = {
  index: number;
  total: number;
  title: string;
  summary: string;
};

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  tag: "behavior" | "sleep" | "focus";
};

export type ChildProfile = {
  name: string;
  ageGroup: string;
  focusGoal: string;
};

export type ProgressState = {
  child: ChildProfile;
  parentName: string;
  routine: RoutineTask[];
  coach: CoachStep;
  recommendations: Recommendation[];
  streakDays: number;
  dailyGoal: number;
};

type ProgressContextValue = ProgressState & {
  routineCompleted: number;
  routineProgress: number;
  coachProgress: number;
  totalProgress: number;
  toggleTask: (id: string) => void;
  advanceCoach: () => void;
  setChild: (c: Partial<ChildProfile>) => void;
};

const DEFAULT_TASKS: RoutineTask[] = [
  { id: "t1", title: "Morning stretch", time: "7:00 AM", minutes: 10, icon: "sunny", done: true },
  { id: "t2", title: "Breakfast together", time: "7:30 AM", minutes: 20, icon: "restaurant", done: true },
  { id: "t3", title: "Reading time", time: "10:00 AM", minutes: 15, icon: "book", done: false },
  { id: "t4", title: "Outdoor play", time: "4:00 PM", minutes: 30, icon: "leaf", done: false },
  { id: "t5", title: "Wind-down ritual", time: "7:30 PM", minutes: 20, icon: "moon", done: false },
];

const DEFAULT_RECS: Recommendation[] = [
  {
    id: "r1",
    title: "Try a focus activity today",
    description: "10 min of building blocks before screens to anchor attention.",
    tag: "focus",
  },
  {
    id: "r2",
    title: "Adjust the bedtime routine",
    description: "Shift dinner 15 min earlier — sleep onset improves within 3 days.",
    tag: "sleep",
  },
  {
    id: "r3",
    title: "Replace 'no' with 'when-then'",
    description: "Gentle compliance language that reduces resistance instantly.",
    tag: "behavior",
  },
];

const DEFAULT_STATE: ProgressState = {
  child: {
    name: "Aarav",
    ageGroup: "5-7 yrs",
    focusGoal: "Reduce screen time",
  },
  parentName: "Parent",
  routine: DEFAULT_TASKS,
  coach: {
    index: 3,
    total: 12,
    title: "Connection before correction",
    summary:
      "Spend 60 seconds at eye level before any instruction — it cuts resistance dramatically.",
  },
  recommendations: DEFAULT_RECS,
  streakDays: 3,
  dailyGoal: 80,
};

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProgressState>(DEFAULT_STATE);

  const toggleTask = useCallback((id: string) => {
    setState((prev) => {
      const target = prev.routine.find((t) => t.id === id);
      const nextDone = target ? !target.done : true;
      // Fire-and-forget: enqueues now, syncs when online
      import("@/utils/offlineActions")
        .then(({ submitAction }) =>
          submitAction(nextDone ? "COMPLETE_ROUTINE" : "UNDO_ROUTINE", {
            taskId: id,
            done: nextDone,
          }),
        )
        .catch((e) => {
          if (__DEV__) console.warn("[offline] toggleTask submit failed", e);
        });
      return {
        ...prev,
        routine: prev.routine.map((t) => (t.id === id ? { ...t, done: nextDone } : t)),
      };
    });
  }, []);

  const advanceCoach = useCallback(() => {
    setState((prev) => {
      const nextIndex = Math.min(prev.coach.total, prev.coach.index + 1);
      import("@/utils/offlineActions")
        .then(({ submitAction }) =>
          submitAction("COMPLETE_COACH_STEP", {
            stepIndex: nextIndex,
            totalSteps: prev.coach.total,
          }),
        )
        .catch((e) => {
          if (__DEV__) console.warn("[offline] advanceCoach submit failed", e);
        });
      return {
        ...prev,
        coach: {
          ...prev.coach,
          index: nextIndex,
        },
      };
    });
  }, []);

  const setChild = useCallback((c: Partial<ChildProfile>) => {
    setState((prev) => ({ ...prev, child: { ...prev.child, ...c } }));
  }, []);

  const value = useMemo<ProgressContextValue>(() => {
    const routineCompleted = state.routine.filter((t) => t.done).length;
    const routineProgress =
      state.routine.length === 0 ? 0 : routineCompleted / state.routine.length;
    const coachProgress = state.coach.total === 0 ? 0 : state.coach.index / state.coach.total;
    const totalProgress = (routineProgress + coachProgress) / 2;
    return {
      ...state,
      routineCompleted,
      routineProgress,
      coachProgress,
      totalProgress,
      toggleTask,
      advanceCoach,
      setChild,
    };
  }, [state, toggleTask, advanceCoach, setChild]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) {
    throw new Error("useProgress must be used inside <ProgressProvider>");
  }
  return ctx;
}
