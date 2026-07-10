import type { TeacherOsModuleId } from "./types.js";

/** Production-ready modules — enabled by default */
const ENABLED_MODULES: TeacherOsModuleId[] = [
  "dashboard",
  "teaching_pack",
  "daily_planner",
  "weekly_planner",
  "curriculum",
  "studio",
  "lesson_chat",
  "search",
  "analytics",
];

/** Future modules — behind feature flags until ready */
const PREVIEW_MODULES: TeacherOsModuleId[] = [
  "monthly_curriculum",
  "yearly_curriculum",
  "classroom_assistant",
  "parent_communication",
  "classroom_resources",
  "student_assessment",
  "school_events",
  "admin_dashboard",
  "knowledge_base",
];

const STORAGE_KEY = "teacher-os-module-flags-v1";

function loadOverrides(): Partial<Record<TeacherOsModuleId, boolean>> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<TeacherOsModuleId, boolean>>) : {};
  } catch {
    return {};
  }
}

export function isTeacherOsModuleEnabled(module: TeacherOsModuleId): boolean {
  const overrides = loadOverrides();
  if (module in overrides) return Boolean(overrides[module]);
  return ENABLED_MODULES.includes(module);
}

export function setTeacherOsModuleEnabled(module: TeacherOsModuleId, enabled: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
    const overrides = loadOverrides();
    overrides[module] = enabled;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch { /* */ }
}

export function listEnabledTeacherOsModules(): TeacherOsModuleId[] {
  const all = [...ENABLED_MODULES, ...PREVIEW_MODULES];
  return all.filter(isTeacherOsModuleEnabled);
}

export function listPreviewModules(): TeacherOsModuleId[] {
  return PREVIEW_MODULES.filter((m) => !ENABLED_MODULES.includes(m));
}

export const TEACHER_OS_MODULE_LABELS: Record<TeacherOsModuleId, string> = {
  dashboard: "Home",
  teaching_pack: "Teaching Pack",
  daily_planner: "Daily Plan",
  weekly_planner: "Weekly Plan",
  curriculum: "Curriculum",
  studio: "Worksheet Studio",
  lesson_chat: "Amy Chat",
  search: "Search",
  analytics: "Analytics",
  monthly_curriculum: "Monthly Plan",
  yearly_curriculum: "Year Plan",
  classroom_assistant: "Classroom AI",
  parent_communication: "Parent Comms",
  classroom_resources: "Resources",
  student_assessment: "Assessment",
  school_events: "Events",
  admin_dashboard: "Admin",
  knowledge_base: "Curriculum KB",
};
