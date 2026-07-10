import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";
import { getTeacherOsAnalytics } from "@workspace/teacher-os";
import { getAnalyticsDashboard } from "@workspace/worksheet-studio/client";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_CONTAINER } from "@/features/worksheet-studio/worksheet-studio-theme";

export function TeacherOsAnalytics() {
  const tos = getTeacherOsAnalytics();
  const ws = getAnalyticsDashboard();

  const stats = [
    { label: "Lessons", value: tos.lessonsCreated },
    { label: "Teaching packs", value: tos.packsGenerated },
    { label: "Worksheets", value: ws.worksheetsCreated },
    { label: "Topics", value: tos.topicsCompleted },
    { label: "Homework", value: tos.homeworkPacks },
    { label: "Assessments", value: tos.assessments },
  ];

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-4")}>
      <header className={cn(WS_GLASS_CARD, "flex items-center gap-3 p-4")}>
        <BarChart3 className="h-8 w-8 text-[#1e3a5f]" />
        <h2 className="text-lg font-bold text-[#1e3a5f]">Analytics</h2>
      </header>
      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className={cn(WS_GLASS_CARD, "p-4 text-center")}>
            <p className="text-2xl font-bold text-[#1e3a5f]">{s.value}</p>
            <p className={cn("text-xs", WS_MUTED_TEXT)}>{s.label}</p>
          </div>
        ))}
      </div>
      <p className={cn(WS_GLASS_CARD, "p-4 text-sm", WS_MUTED_TEXT)}>
        AI acceptance rate: {tos.aiAcceptanceRate}% · Exports: {ws.exports}
      </p>
    </div>
  );
}
