import {
  lessonsForAge,
  seriesForAge,
  getLessonById,
  type AgeBucket,
  type Lesson,
  type LessonSeries,
} from "@/lib/audio-lessons";

/** UI navigation groups — six age-first entry tiles. */
export type AgeNavGroup = "0-2" | "2-4" | "4-6" | "6-8" | "8-10" | "10+";

export const AGE_NAV_ORDER: AgeNavGroup[] = ["0-2", "2-4", "4-6", "6-8", "8-10", "10+"];

const PRESCHOOL_LESSON_IDS = new Set([
  "early-school-emotional-regulation",
  "early-school-friendship",
  "early-school-growth-mindset",
  "early-school-sibling-rivalry",
]);

const PRESCHOOL_SERIES_IDS = new Set(["school-emotions"]);

export function dataBucketForNav(group: AgeNavGroup): AgeBucket {
  if (group === "4-6" || group === "6-8") return "5-7";
  return group;
}

export function lessonsForNavGroup(group: AgeNavGroup): Lesson[] {
  const bucket = dataBucketForNav(group);
  const all = lessonsForAge(bucket);
  if (group === "4-6") return all.filter((l) => PRESCHOOL_LESSON_IDS.has(l.id));
  if (group === "6-8") return all.filter((l) => !PRESCHOOL_LESSON_IDS.has(l.id));
  return all;
}

export function lessonCountForNavGroup(group: AgeNavGroup): number {
  return lessonsForNavGroup(group).length;
}

export function seriesForNavGroup(group: AgeNavGroup): LessonSeries[] {
  const bucket = dataBucketForNav(group);
  const all = seriesForAge(bucket);
  if (group === "4-6") return all.filter((s) => PRESCHOOL_SERIES_IDS.has(s.id));
  if (group === "6-8") return all.filter((s) => !PRESCHOOL_SERIES_IDS.has(s.id));
  return all;
}

export function navGroupForLesson(lesson: Lesson): AgeNavGroup {
  if (lesson.ageBucket === "5-7") {
    return PRESCHOOL_LESSON_IDS.has(lesson.id) ? "4-6" : "6-8";
  }
  return lesson.ageBucket as AgeNavGroup;
}

/** Free users may preview one lesson per age navigation group. */
export const FREE_SAMPLE_LESSONS_PER_GROUP = 1;

export function isFreeSampleLessonForGroup(lesson: Lesson, group: AgeNavGroup): boolean {
  const groupLessons = lessonsForNavGroup(group);
  const idx = groupLessons.findIndex((l) => l.id === lesson.id);
  return idx >= 0 && idx < FREE_SAMPLE_LESSONS_PER_GROUP;
}

export function findResumeTarget(
  resumeMap: Record<string, number>,
  lastLessonId: string | null,
): { lesson: Lesson; ageGroup: AgeNavGroup; paragraphIdx: number } | null {
  if (lastLessonId) {
    const lesson = getLessonById(lastLessonId);
    const idx = resumeMap[lastLessonId] ?? 0;
    if (lesson && idx > 0) {
      return { lesson, ageGroup: navGroupForLesson(lesson), paragraphIdx: idx };
    }
  }

  let best: { lesson: Lesson; ageGroup: AgeNavGroup; paragraphIdx: number } | null = null;
  for (const [id, idx] of Object.entries(resumeMap)) {
    if (idx <= 0) continue;
    const lesson = getLessonById(id);
    if (!lesson) continue;
    if (!best || idx > best.paragraphIdx) {
      best = { lesson, ageGroup: navGroupForLesson(lesson), paragraphIdx: idx };
    }
  }
  return best;
}

export type AgeTileMeta = {
  group: AgeNavGroup;
  labelKey: string;
  subtitleKey: string;
  iconName: "baby" | "blocks" | "book" | "school" | "users" | "sparkles";
  gradient: string;
};

export const AGE_TILE_META: AgeTileMeta[] = [
  {
    group: "0-2",
    labelKey: "pages.audio_lessons.age_infant",
    subtitleKey: "pages.audio_lessons.age_infant_desc",
    iconName: "baby",
    gradient: "linear-gradient(135deg, hsl(var(--brand-pink-500) / 0.35), hsl(var(--brand-violet-600) / 0.25))",
  },
  {
    group: "2-4",
    labelKey: "pages.audio_lessons.age_toddler",
    subtitleKey: "pages.audio_lessons.age_toddler_desc",
    iconName: "blocks",
    gradient: "linear-gradient(135deg, hsl(var(--brand-amber-400) / 0.3), hsl(var(--brand-pink-500) / 0.25))",
  },
  {
    group: "4-6",
    labelKey: "pages.audio_lessons.age_preschool",
    subtitleKey: "pages.audio_lessons.age_preschool_desc",
    iconName: "book",
    gradient: "linear-gradient(135deg, hsl(var(--brand-emerald-500) / 0.28), hsl(var(--brand-violet-500) / 0.22))",
  },
  {
    group: "6-8",
    labelKey: "pages.audio_lessons.age_early_school",
    subtitleKey: "pages.audio_lessons.age_early_school_desc",
    iconName: "school",
    gradient: "linear-gradient(135deg, hsl(var(--brand-violet-500) / 0.3), hsl(var(--brand-emerald-500) / 0.2))",
  },
  {
    group: "8-10",
    labelKey: "pages.audio_lessons.age_tween",
    subtitleKey: "pages.audio_lessons.age_tween_desc",
    iconName: "users",
    gradient: "linear-gradient(135deg, hsl(var(--brand-violet-400) / 0.32), hsl(var(--brand-pink-500) / 0.22))",
  },
  {
    group: "10+",
    labelKey: "pages.audio_lessons.age_teen",
    subtitleKey: "pages.audio_lessons.age_teen_desc",
    iconName: "sparkles",
    gradient: "linear-gradient(135deg, hsl(var(--brand-violet-600) / 0.35), hsl(var(--brand-amber-400) / 0.18))",
  },
];
