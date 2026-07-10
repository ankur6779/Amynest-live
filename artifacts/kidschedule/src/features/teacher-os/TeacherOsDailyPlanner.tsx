import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, Clock } from "lucide-react";
import { generateDailyLessonPlan, recordTeacherOsEvent } from "@workspace/teacher-os";
import { CLASS_LABELS, SUBJECT_LABELS } from "@workspace/worksheet-studio";
import { useTeacherOs } from "./context/teacher-os-context";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_CONTAINER } from "@/features/worksheet-studio/worksheet-studio-theme";
import { useState } from "react";

export function TeacherOsDailyPlanner() {
  const { classLevel, subject, difficulty, topic, setTopic } = useTeacherOs();
  const [plan, setPlan] = useState<ReturnType<typeof generateDailyLessonPlan> | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

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

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-4")}>
      <header className={cn(WS_GLASS_CARD, "flex items-center gap-3 p-4")}>
        <Calendar className="h-8 w-8 text-[#1e3a5f]" />
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f]">Daily Lesson Planner</h2>
          <p className={cn("text-sm", WS_MUTED_TEXT)}>Timeline with estimated minutes</p>
        </div>
      </header>

      <section className={cn(WS_GLASS_CARD, "space-y-3 p-4")}>
        <input type="date" className="w-full rounded-xl border px-3 py-2 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <p className={cn("text-xs", WS_MUTED_TEXT)}>{CLASS_LABELS[classLevel]} · {SUBJECT_LABELS[subject]}</p>
        <Button className="w-full" onClick={generate}>Generate daily plan</Button>
      </section>

      {plan && (
        <section className={cn(WS_GLASS_CARD, "space-y-3 p-4")}>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
            <Clock className="h-4 w-4" />
            {plan.estimatedMinutes} minutes total
          </div>
          {plan.timeline.map((slot) => (
            <div key={slot.id} className="rounded-xl bg-[#1e3a5f]/5 p-3">
              <p className="font-medium text-[#1e3a5f]">{slot.label} · {slot.durationMinutes} min</p>
              <p className={cn("mt-1 text-sm", WS_MUTED_TEXT)}>{slot.description}</p>
            </div>
          ))}
          <div className="text-sm">
            <p className="font-semibold text-[#1e3a5f]">Objectives</p>
            <ul className={cn("mt-1 list-disc pl-4", WS_MUTED_TEXT)}>
              {plan.learningObjectives.map((o) => <li key={o}>{o}</li>)}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
