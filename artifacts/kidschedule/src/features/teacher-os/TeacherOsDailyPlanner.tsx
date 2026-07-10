import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";
import { generateDailyLessonPlan, recordTeacherOsEvent } from "@workspace/teacher-os";
import { CLASS_LABELS, SUBJECT_LABELS } from "@workspace/worksheet-studio";
import { useTeacherOs } from "./context/teacher-os-context";
import {
  WS_GLASS_CARD,
  WS_MUTED_TEXT,
  WS_CONTAINER,
  WS_INPUT,
  WS_CONTEXT_LINE,
  WS_PRIMARY_BTN,
} from "@/features/worksheet-studio/worksheet-studio-theme";
import { useEffect, useRef, useState } from "react";

export function TeacherOsDailyPlanner() {
  const { classLevel, subject, difficulty, topic, setTopic } = useTeacherOs();
  const [plan, setPlan] = useState<ReturnType<typeof generateDailyLessonPlan> | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const planRef = useRef<HTMLElement>(null);

  const generate = () => {
    const p = generateDailyLessonPlan({
      date,
      classLevel,
      subject,
      topic: topic.trim() || "Today's topic",
      difficulty,
    });
    setPlan(p);
    recordTeacherOsEvent("lesson");
  };

  useEffect(() => {
    if (plan && planRef.current) {
      planRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [plan]);

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-28")}>
      <header className={cn(WS_GLASS_CARD, "flex items-center gap-3 p-4")}>
        <Calendar className="h-8 w-8 text-[#1e3a5f]" />
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f]">Daily Lesson Planner</h2>
          <p className={cn("text-sm", WS_MUTED_TEXT)}>Timeline with estimated minutes</p>
        </div>
      </header>

      <section className={cn(WS_GLASS_CARD, "space-y-3 p-4")}>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">Date</span>
          <input
            type="date"
            className={WS_INPUT}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Lesson date"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">Topic</span>
          <input
            className={WS_INPUT}
            placeholder="e.g. Sea Animals"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <p className={WS_CONTEXT_LINE}>
          {CLASS_LABELS[classLevel]} · {SUBJECT_LABELS[subject]} · {difficulty}
        </p>
        <Button className={cn(WS_PRIMARY_BTN, "w-full")} onClick={generate}>
          Generate daily plan
        </Button>
      </section>

      {!plan && (
        <p className={cn("text-center text-sm", WS_MUTED_TEXT)}>
          Tap Generate to see your lesson timeline below.
        </p>
      )}

      {plan && (
        <section ref={planRef} className={cn(WS_GLASS_CARD, "space-y-3 p-4")}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
            <Clock className="h-4 w-4" />
            {plan.estimatedMinutes} minutes total · {plan.topic}
          </div>
          {plan.timeline.map((slot) => (
            <div key={slot.id} className="rounded-xl bg-[#1e3a5f]/5 p-3">
              <p className="font-semibold text-[#1e3a5f]">{slot.label} · {slot.durationMinutes} min</p>
              <p className="mt-1 text-sm leading-relaxed text-[#1e3a5f]/85">{slot.description}</p>
            </div>
          ))}
          <div className="text-sm">
            <p className="font-semibold text-[#1e3a5f]">Objectives</p>
            <ul className="mt-1 list-disc pl-4 text-sm text-[#1e3a5f]/85">
              {plan.learningObjectives.map((o) => <li key={o}>{o}</li>)}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
