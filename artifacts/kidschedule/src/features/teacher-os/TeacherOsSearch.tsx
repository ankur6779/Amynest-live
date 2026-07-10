import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { searchTeachingPack, searchTopicCatalog } from "@workspace/teacher-os";
import { CURRICULUM_TOPICS } from "@workspace/worksheet-studio";
import type { TeacherOsModuleId } from "@workspace/teacher-os";
import { useTeacherOs } from "./context/teacher-os-context";
import { WS_GLASS_CARD, WS_MUTED_TEXT, WS_CONTAINER, WS_INPUT } from "@/features/worksheet-studio/worksheet-studio-theme";

const ENABLED_MODULES = new Set<TeacherOsModuleId>([
  "dashboard", "teaching_pack", "daily_planner", "weekly_planner", "curriculum",
  "studio", "lesson_chat", "search", "analytics",
]);

export function TeacherOsSearch() {
  const { lastPack, setActiveModule, setTopic } = useTeacherOs();
  const [query, setQuery] = useState("");
  const labels = CURRICULUM_TOPICS.map((t) => t.label);
  const results = [
    ...(lastPack ? searchTeachingPack(lastPack, query) : []),
    ...searchTopicCatalog(query, labels),
  ];

  const openResult = (module: TeacherOsModuleId, topic: string) => {
    const target = ENABLED_MODULES.has(module) ? module : "dashboard";
    if (topic) setTopic(topic);
    setActiveModule(target);
  };

  return (
    <div className={cn(WS_CONTAINER, "space-y-4 pb-4")}>
      <header className={cn(WS_GLASS_CARD, "flex items-center gap-3 p-4")}>
        <Search className="h-8 w-8 text-[#1e3a5f]" />
        <h2 className="text-lg font-bold text-[#1e3a5f]">Smart Search</h2>
      </header>
      <input
        className={cn(WS_GLASS_CARD, WS_INPUT, "px-4 py-3")}
        placeholder="Search e.g. Sea Animals"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 ? (
        <ul className={cn(WS_GLASS_CARD, "divide-y")}>
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full px-4 py-3 text-left touch-manipulation hover:bg-[#1e3a5f]/5"
                onClick={() => openResult(r.module, r.topic)}
              >
                <p className="font-medium text-[#1e3a5f]">{r.title}</p>
                <p className={cn("text-xs capitalize", WS_MUTED_TEXT)}>{r.type} · {r.module}</p>
                <p className={cn("mt-1 text-sm", WS_MUTED_TEXT)}>{r.snippet}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : query ? (
        <p className={cn("text-center text-sm", WS_MUTED_TEXT)}>No results — generate a teaching pack first.</p>
      ) : null}
    </div>
  );
}
