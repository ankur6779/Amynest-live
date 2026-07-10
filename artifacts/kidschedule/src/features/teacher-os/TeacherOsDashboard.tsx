import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import {
  generateTeachingPack,
  parseNaturalLessonRequest,
  recordTopicTaught,
  suggestNextTopic,
  loadCurriculumMemory,
  recordTeacherOsEvent,
  getPostLessonRecommendations,
  teachingPackDocuments,
} from "@workspace/teacher-os";
import { CLASS_LABELS, SUBJECT_LABELS } from "@workspace/worksheet-studio";
import { useTeacherOs } from "./context/teacher-os-context";
import {
  WS_GLASS_CARD,
  WS_PRIMARY_BTN,
  WS_MUTED_TEXT,
  WS_TOUCH,
  WS_CONTAINER,
  WS_HEADING,
} from "@/features/worksheet-studio/worksheet-studio-theme";
import { trackTeachingPackCreated } from "./teacher-os-analytics";

type Props = {
  onOpenDocuments: (docs: import("@workspace/worksheet-studio").WorksheetDocument[], label: string) => void;
};

export function TeacherOsDashboard({ onOpenDocuments }: Props) {
  const {
    classLevel, subject, difficulty, topic, setTopic, setClassLevel, setSubject, setLastPack,
    setActiveModule,
  } = useTeacherOs();
  const memory = loadCurriculumMemory();
  const suggestions = suggestNextTopic(classLevel, 4);
  const [amyCommand, setAmyCommand] = useState("");

  const handleAmyCommand = (message: string) => {
    const parsed = parseNaturalLessonRequest(message);
    const t = parsed.topic ?? topic;
    if (parsed.classLevel) setClassLevel(parsed.classLevel);
    if (t) setTopic(t);
    if (!t) return;

    const pack = generateTeachingPack({
      prompt: t,
      classLevel: parsed.classLevel ?? classLevel,
      subject,
      difficulty,
      pageCount: 1,
      date: parsed.date,
    });
    setLastPack(pack);
    recordTopicTaught(t, parsed.classLevel ?? classLevel);
    recordTeacherOsEvent("teaching_pack");
    recordTeacherOsEvent("lesson");
    trackTeachingPackCreated();
    const docs = teachingPackDocuments(pack);
    onOpenDocuments(docs, `Teaching Pack — ${t}`);
  };

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-4")}>
      <header className={cn(WS_GLASS_CARD, "px-4 py-5 text-center")}>
        <h1 className={cn(WS_HEADING, "text-[#1e3a5f]")}>AmyNest Teacher OS</h1>
        <p className={cn("mt-1 text-sm", WS_MUTED_TEXT)}>
          Your AI teaching assistant — plan a day, week, or full lesson in seconds.
        </p>
      </header>

      <section className={cn(WS_GLASS_CARD, "space-y-3 p-4")}>
        <p className="text-sm font-semibold text-[#1e3a5f]">Tell Amy what you need</p>
        <textarea
          className="min-h-[88px] w-full rounded-xl border border-[#1e3a5f]/15 bg-white px-3 py-2 text-sm text-[#1e3a5f] placeholder:text-[#1e3a5f]/40"
          placeholder='e.g. "I have to teach Sea Animals tomorrow to UKG"'
          value={amyCommand}
          onChange={(e) => setAmyCommand(e.target.value)}
        />
        <Button
          className={cn(WS_PRIMARY_BTN, WS_TOUCH, "w-full")}
          onClick={() => handleAmyCommand(amyCommand.trim() || `I have to teach ${topic || "today's topic"} tomorrow to ${CLASS_LABELS[classLevel]}`)}
          disabled={!amyCommand.trim() && !topic.trim()}
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Prepare Everything
        </Button>
        <p className={cn("text-xs", WS_MUTED_TEXT)}>
          Generates lesson plan, worksheets, homework, flashcards, assessment & parent message.
        </p>
      </section>

      <section className={cn(WS_GLASS_CARD, "p-4")}>
        <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">Curriculum memory</p>
        <p className={cn("mt-2 text-sm", WS_MUTED_TEXT)}>
          Completed: {memory.completedTopics.length} · Pending: {memory.pendingTopics.length}
          {memory.lastTopic ? ` · Last: ${memory.lastTopic}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-full bg-[#1e3a5f]/10 px-3 py-1.5 text-xs font-medium text-[#1e3a5f] touch-manipulation"
              onClick={() => { setTopic(s); handleAmyCommand(`teach ${s} tomorrow to ${CLASS_LABELS[classLevel]}`); }}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      {topic && (
        <section className={cn(WS_GLASS_CARD, "p-4")}>
          <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">After {topic}</p>
          <ul className={cn("mt-2 space-y-1 text-sm", WS_MUTED_TEXT)}>
            {getPostLessonRecommendations(topic, memory).slice(0, 4).map((r) => (
              <li key={r.id}>• {r.label} — {r.description}</li>
            ))}
          </ul>
          <Button variant="link" className="mt-2 h-auto p-0 text-[#1e3a5f]" onClick={() => setActiveModule("lesson_chat")}>
            Ask Amy in chat →
          </Button>
        </section>
      )}

      <section className={cn(WS_GLASS_CARD, "p-4 text-sm", WS_MUTED_TEXT)}>
        <p className="font-semibold text-[#1e3a5f]">Quick context</p>
        <p className="mt-1">{CLASS_LABELS[classLevel]} · {SUBJECT_LABELS[subject]} · {difficulty}</p>
      </section>
    </div>
  );
}
