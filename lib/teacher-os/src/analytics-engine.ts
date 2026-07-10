import type { TeacherOsAnalytics } from "./types.js";

const ANALYTICS_KEY = "teacher-os-analytics-v1";

const DEFAULT: TeacherOsAnalytics = {
  lessonsCreated: 0,
  worksheetsGenerated: 0,
  homeworkPacks: 0,
  assessments: 0,
  topicsCompleted: 0,
  packsGenerated: 0,
  aiAcceptanceRate: 100,
  updatedAt: new Date().toISOString(),
};

function load(): TeacherOsAnalytics {
  try {
    if (typeof localStorage === "undefined") return { ...DEFAULT };
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as TeacherOsAnalytics) } : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

function save(data: TeacherOsAnalytics): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
  } catch { /* */ }
}

export function getTeacherOsAnalytics(): TeacherOsAnalytics {
  return load();
}

export function recordTeacherOsEvent(
  event: "lesson" | "worksheet" | "homework_pack" | "assessment" | "topic" | "teaching_pack",
): TeacherOsAnalytics {
  const data = load();
  switch (event) {
    case "lesson": data.lessonsCreated += 1; break;
    case "worksheet": data.worksheetsGenerated += 1; break;
    case "homework_pack": data.homeworkPacks += 1; break;
    case "assessment": data.assessments += 1; break;
    case "topic": data.topicsCompleted += 1; break;
    case "teaching_pack": data.packsGenerated += 1; break;
  }
  save(data);
  return data;
}
