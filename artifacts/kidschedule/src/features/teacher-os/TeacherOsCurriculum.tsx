import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import {
  CURRICULUM_TOPICS,
  CLASS_LABELS,
  topicPrompt,
} from "@workspace/worksheet-studio";
import { loadCurriculumMemory, suggestNextTopic } from "@workspace/teacher-os";
import { useTeacherOs } from "./context/teacher-os-context";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_CONTAINER } from "@/features/worksheet-studio/worksheet-studio-theme";

export function TeacherOsCurriculum() {
  const { classLevel, setTopic, setSubject, setActiveModule } = useTeacherOs();
  const memory = loadCurriculumMemory();
  const next = suggestNextTopic(classLevel, 6);
  const topics = CURRICULUM_TOPICS.filter((t) => t.classes.includes(classLevel));

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-4")}>
      <header className={cn(WS_GLASS_CARD, "flex items-center gap-3 p-4")}>
        <BookOpen className="h-8 w-8 text-[#1e3a5f]" />
        <div>
          <h2 className="text-lg font-bold text-[#1e3a5f]">Curriculum</h2>
          <p className={cn("text-sm", WS_MUTED_TEXT)}>{CLASS_LABELS[classLevel]} · LPS + NEP aligned</p>
        </div>
      </header>

      <section className={cn(WS_GLASS_CARD, "p-4")}>
        <p className="text-xs font-bold uppercase text-[#1e3a5f]/60">Amy suggests next</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {next.map((label) => (
            <button
              key={label}
              type="button"
              className="rounded-full bg-[#c9a227]/20 px-3 py-1.5 text-xs font-semibold text-[#1e3a5f]"
              onClick={() => { setTopic(label); setActiveModule("dashboard"); }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className={cn(WS_GLASS_CARD, "divide-y divide-[#1e3a5f]/10")}>
        {topics.map((t) => {
          const done = memory.completedTopics.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left touch-manipulation"
              onClick={() => {
                setTopic(topicPrompt(t, classLevel));
                setSubject(t.subject);
                setActiveModule("teaching_pack");
              }}
            >
              <span className="font-medium text-[#1e3a5f]">{t.label}</span>
              <span className={cn("text-xs", done ? "text-green-700" : WS_MUTED_TEXT)}>
                {done ? "Done" : "Plan →"}
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
