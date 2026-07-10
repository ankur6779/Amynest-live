import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Package, Sparkles } from "lucide-react";
import { generateTeachingPack, recordTeacherOsEvent, teachingPackDocuments } from "@workspace/teacher-os";
import { CLASS_LABELS, SUBJECT_LABELS } from "@workspace/worksheet-studio";
import { useTeacherOs } from "./context/teacher-os-context";
import { WS_GLASS_CARD, WS_PRIMARY_BTN, WS_MUTED_TEXT, WS_TOUCH, WS_CONTAINER } from "@/features/worksheet-studio/worksheet-studio-theme";

type Props = {
  onOpenDocuments: (docs: import("@workspace/worksheet-studio").WorksheetDocument[], label: string) => void;
};

export function TeacherOsTeachingPack({ onOpenDocuments }: Props) {
  const { classLevel, subject, difficulty, topic, setTopic, setLastPack } = useTeacherOs();

  const generate = () => {
    const t = topic.trim() || "Classroom topic";
    const pack = generateTeachingPack({
      prompt: t,
      classLevel,
      subject,
      difficulty,
      pageCount: 1,
    });
    setLastPack(pack);
    recordTeacherOsEvent("teaching_pack");
    onOpenDocuments(teachingPackDocuments(pack), `Teaching Pack — ${t}`);
  };

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-4")}>
      <header className={cn(WS_GLASS_CARD, "p-4")}>
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-[#c9a227]" />
          <div>
            <h2 className="text-lg font-bold text-[#1e3a5f]">AI Teaching Pack</h2>
            <p className={cn("text-sm", WS_MUTED_TEXT)}>Complete pack for one topic</p>
          </div>
        </div>
      </header>

      <section className={cn(WS_GLASS_CARD, "space-y-3 p-4")}>
        <input
          className="w-full rounded-xl border border-[#1e3a5f]/15 px-3 py-3 text-sm text-[#1e3a5f]"
          placeholder="Topic e.g. Sea Animals"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <p className={cn("text-xs", WS_MUTED_TEXT)}>
          {CLASS_LABELS[classLevel]} · {SUBJECT_LABELS[subject]}
        </p>
        <Button className={cn(WS_PRIMARY_BTN, WS_TOUCH, "w-full")} onClick={generate}>
          <Sparkles className="mr-2 h-5 w-5" />
          Generate Teaching Pack
        </Button>
      </section>

      <section className={cn(WS_GLASS_CARD, "p-4")}>
        <p className="text-xs font-bold uppercase text-[#1e3a5f]/60">Includes</p>
        <ul className={cn("mt-2 space-y-1 text-sm", WS_MUTED_TEXT)}>
          <li>✓ Lesson plan & learning objectives</li>
          <li>✓ Circle time & blackboard notes</li>
          <li>✓ Flashcards & picture cards</li>
          <li>✓ Worksheet, homework, assessment, revision</li>
          <li>✓ Parent message (EN + HI)</li>
          <li>✓ Answer key</li>
        </ul>
      </section>
    </div>
  );
}
