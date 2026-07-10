import { cn } from "@/lib/utils";
import { Lock } from "lucide-react";
import { TEACHER_OS_MODULE_LABELS, type TeacherOsModuleId } from "@workspace/teacher-os";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_CONTAINER } from "@/features/worksheet-studio/worksheet-studio-theme";

export function TeacherOsComingSoon({ moduleId }: { moduleId: TeacherOsModuleId }) {
  return (
    <div className={cn(WS_CONTAINER, "py-12")}>
      <div className={cn(WS_GLASS_CARD, "flex flex-col items-center gap-3 p-8 text-center")}>
        <Lock className="h-10 w-10 text-[#1e3a5f]/40" />
        <h2 className="text-lg font-bold text-[#1e3a5f]">{TEACHER_OS_MODULE_LABELS[moduleId]}</h2>
        <p className={cn("text-sm", WS_MUTED_TEXT)}>Coming soon — module is behind a feature flag until production-ready.</p>
      </div>
    </div>
  );
}
