import type { TeacherOsRecommendation } from "./types.js";
import type { CurriculumMemory } from "./types.js";

export function getPostLessonRecommendations(
  topic: string,
  memory?: CurriculumMemory,
): TeacherOsRecommendation[] {
  const recs: TeacherOsRecommendation[] = [
    { id: "rev", label: "Revision sheet", description: `Quick revision on ${topic}`, module: "teaching_pack", priority: "high" },
    { id: "hw", label: "Homework", description: "Send homework to parents", module: "parent_communication", priority: "high" },
    { id: "assess", label: "Assessment", description: "Short oral + written check", module: "student_assessment", priority: "medium" },
    { id: "craft", label: "Craft activity", description: "Hands-on craft for Friday", module: "classroom_resources", priority: "medium" },
    { id: "story", label: "Story time", description: `Read a story about ${topic}`, module: "daily_planner", priority: "low" },
    { id: "parent", label: "Parent follow-up", description: "WhatsApp update to parents", module: "parent_communication", priority: "high" },
    { id: "next", label: "Next lesson", description: "Plan tomorrow's topic", module: "daily_planner", priority: "medium" },
  ];

  if (memory?.revisionRequired.includes(topic)) {
    recs.unshift({
      id: "weak",
      label: "Extra revision",
      description: `${topic} flagged as weak area — add practice`,
      module: "curriculum",
      priority: "high",
    });
  }
  return recs;
}
