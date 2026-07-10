import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  Home,
  MessageCircle,
  MoreHorizontal,
  Package,
  PenLine,
  Search,
} from "lucide-react";
import { useState } from "react";
import {
  TEACHER_OS_MODULE_LABELS,
  isTeacherOsModuleEnabled,
  type TeacherOsModuleId,
} from "@workspace/teacher-os";
import { useTeacherOs } from "../context/teacher-os-context";

const PRIMARY_NAV: Array<{ id: TeacherOsModuleId; icon: typeof Home }> = [
  { id: "dashboard", icon: Home },
  { id: "teaching_pack", icon: Package },
  { id: "daily_planner", icon: Calendar },
  { id: "curriculum", icon: BookOpen },
  { id: "studio", icon: PenLine },
];

const MORE_NAV: Array<{ id: TeacherOsModuleId; icon: typeof Home }> = [
  { id: "weekly_planner", icon: CalendarDays },
  { id: "lesson_chat", icon: MessageCircle },
  { id: "search", icon: Search },
  { id: "analytics", icon: BarChart3 },
];

export function TeacherOsNav() {
  const { activeModule, setActiveModule } = useTeacherOs();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = PRIMARY_NAV.filter((item) => isTeacherOsModuleEnabled(item.id));
  const more = MORE_NAV.filter((item) => isTeacherOsModuleEnabled(item.id));
  const moreActive = more.some((item) => item.id === activeModule);

  const navBtn = (id: TeacherOsModuleId, Icon: typeof Home, label?: string) => (
    <button
      key={id}
      type="button"
      onClick={() => { setActiveModule(id); setMoreOpen(false); }}
      className={cn(
        "flex min-h-11 min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold touch-manipulation",
        activeModule === id ? "bg-[#1e3a5f] text-white" : "text-[#1e3a5f]/70",
      )}
      aria-current={activeModule === id ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="truncate">{label ?? TEACHER_OS_MODULE_LABELS[id]}</span>
    </button>
  );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1e3a5f]/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
        aria-label="Teacher OS navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around gap-0.5 px-1 py-1.5">
          {primary.map(({ id, icon }) => navBtn(id, icon))}
          {more.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              className={cn(
                "flex min-h-11 min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-semibold touch-manipulation",
                moreActive || moreOpen ? "bg-[#1e3a5f] text-white" : "text-[#1e3a5f]/70",
              )}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              <MoreHorizontal className="h-5 w-5 shrink-0" aria-hidden />
              <span>More</span>
            </button>
          )}
        </div>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30"
          role="presentation"
          onClick={() => setMoreOpen(false)}
        />
      )}
      {moreOpen && (
        <div
          role="menu"
          aria-label="More modules"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 mx-auto max-w-lg rounded-2xl border border-[#1e3a5f]/10 bg-white p-2 shadow-lg"
        >
          <div className="grid grid-cols-2 gap-1">
            {more.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="menuitem"
                onClick={() => { setActiveModule(id); setMoreOpen(false); }}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium touch-manipulation",
                  activeModule === id ? "bg-[#1e3a5f] text-white" : "text-[#1e3a5f] hover:bg-[#1e3a5f]/5",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {TEACHER_OS_MODULE_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
