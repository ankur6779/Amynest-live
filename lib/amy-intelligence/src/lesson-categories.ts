import type { LessonCategory, LessonRef } from "./types.js";

const ID_CATEGORY: Array<[RegExp, LessonCategory]> = [
  [/sleep|colic|bedtime|routine/i, "sleep"],
  [/tantrum|no-phase|hitting|biting|lying|bullying|rivalry|aggression/i, "behavior"],
  [/feeding|picky|nutrition|dental|obesity|meal/i, "nutrition"],
  [/^health-/i, "health"],
  [/screen|digital|social-media|phone/i, "screens"],
  [/friend|sibling|peer|cyber|puberty|connected|talking/i, "social"],
  [/homework|exam|school|growth-mindset|learning/i, "school"],
  [/milestone|bonding|tummy|brain|independence|regulation/i, "development"],
];

export function categoryForLessonId(lessonId: string): LessonCategory {
  for (const [pattern, category] of ID_CATEGORY) {
    if (pattern.test(lessonId)) return category;
  }
  return "general";
}

export function categoryForLesson(lesson: LessonRef): LessonCategory {
  return categoryForLessonId(lesson.id);
}

export function rankLessonsByCategories(
  lessons: LessonRef[],
  preferred: LessonCategory[],
): LessonRef[] {
  if (preferred.length === 0) return [...lessons];
  const weight = new Map<LessonCategory, number>();
  preferred.forEach((c, i) => weight.set(c, preferred.length - i));
  return [...lessons].sort((a, b) => {
    const wa = weight.get(categoryForLesson(a)) ?? 0;
    const wb = weight.get(categoryForLesson(b)) ?? 0;
    return wb - wa || a.id.localeCompare(b.id);
  });
}
