import type { TeacherOsSearchResult } from "./types.js";
import type { TeachingPack } from "./types.js";

export function searchTeachingPack(pack: TeachingPack, query: string): TeacherOsSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const results: TeacherOsSearchResult[] = [];
  const topic = pack.topic.toLowerCase();

  if (topic.includes(q) || q.includes(topic)) {
    results.push({
      id: `${pack.id}_lesson`,
      type: "lesson_plan",
      title: `Lesson Plan — ${pack.topic}`,
      topic: pack.topic,
      module: "teaching_pack",
      snippet: pack.lessonPlan.learningObjectives[0] ?? "",
    });
    results.push({
      id: `${pack.id}_worksheet`,
      type: "worksheet",
      title: `Worksheet — ${pack.topic}`,
      topic: pack.topic,
      module: "studio",
      snippet: pack.worksheets.printable.meta.title,
    });
    results.push({
      id: `${pack.id}_homework`,
      type: "homework",
      title: `Homework — ${pack.topic}`,
      topic: pack.topic,
      module: "teaching_pack",
      snippet: pack.worksheets.homework.meta.title,
    });
    results.push({
      id: `${pack.id}_assessment`,
      type: "assessment",
      title: `Assessment — ${pack.topic}`,
      topic: pack.topic,
      module: "teaching_pack",
      snippet: pack.worksheets.assessment.meta.title,
    });
    for (const item of pack.classroomPack.items) {
      if (item.type.includes("flash") || item.type.includes("picture")) {
        results.push({
          id: `${pack.id}_${item.type}`,
          type: item.type.includes("flash") ? "flashcard" : "activity",
          title: item.label,
          topic: pack.topic,
          module: "classroom_resources",
          snippet: item.document.meta.title,
        });
      }
    }
    results.push({
      id: `${pack.id}_parent`,
      type: "parent_message",
      title: `Parent Message — ${pack.topic}`,
      topic: pack.topic,
      module: "parent_communication",
      snippet: pack.parentMessages.whatsapp.slice(0, 80),
    });
  }
  return results;
}

export function searchTopicCatalog(query: string, topicLabels: string[]): TeacherOsSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return topicLabels
    .filter((t) => t.toLowerCase().includes(q))
    .map((t) => ({
      id: `topic_${t}`,
      type: "activity" as const,
      title: t,
      topic: t,
      module: "curriculum" as const,
      snippet: `Curriculum topic: ${t}`,
    }));
}
