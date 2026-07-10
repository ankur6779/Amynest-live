import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { generateWeeklyPlan } from "@workspace/worksheet-studio";
import { recordTeacherOsEvent } from "@workspace/teacher-os";
import { useTeacherOs } from "./context/teacher-os-context";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_CONTAINER } from "@/features/worksheet-studio/worksheet-studio-theme";

type Props = {
  onOpenDocuments: (docs: import("@workspace/worksheet-studio").WorksheetDocument[], label: string) => void;
};

export function TeacherOsWeeklyPlanner({ onOpenDocuments }: Props) {
  const { classLevel, subject, difficulty, topic, setTopic } = useTeacherOs();

  const generate = () => {
    const plan = generateWeeklyPlan({
      prompt: topic.trim() || "Weekly topic",
      classLevel,
      subject,
      difficulty,
      pageCount: 1,
    }, topic.trim() || undefined);
    recordTeacherOsEvent("lesson");
    onOpenDocuments(plan.days.map((d) => d.document), `Weekly Plan — ${plan.topic}`);
  };

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-4")}>
      <header className={cn(WS_GLASS_CARD, "flex items-center gap-3 p-4")}>
        <CalendarDays className="h-8 w-8 text-[#1e3a5f]" />
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f]">Weekly Planner</h2>
          <p className={cn("text-sm", WS_MUTED_TEXT)}>Mon–Fri with gradual difficulty</p>
        </div>
      </header>
      <section className={cn(WS_GLASS_CARD, "space-y-3 p-4")}>
        <input className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Week topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <Button className="w-full" onClick={generate}>Generate weekly plan</Button>
        <p className={cn("text-xs", WS_MUTED_TEXT)}>Avoids repetition · balances activities · tracks curriculum</p>
      </section>
    </div>
  );
}
