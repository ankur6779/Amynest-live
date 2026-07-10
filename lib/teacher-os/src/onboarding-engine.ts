import type { OnboardingProgress, OnboardingStepId } from "./pilot-types.js";

const KEY = "teacher-os-onboarding-v81";

const ALL_STEPS: OnboardingStepId[] = [
  "create_first_lesson",
  "generate_first_worksheet",
  "export_pdf",
  "open_studio",
  "create_homework",
];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepId, string> = {
  create_first_lesson: "Create your first lesson",
  generate_first_worksheet: "Generate your first worksheet",
  export_pdf: "Export a PDF",
  open_studio: "Open Worksheet Studio",
  create_homework: "Create homework",
};

function load(): OnboardingProgress {
  try {
    if (typeof localStorage === "undefined") return defaultProgress();
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as OnboardingProgress;
  } catch { /* */ }
  return defaultProgress();
}

function defaultProgress(): OnboardingProgress {
  return { completed: [], skipped: false, startedAt: new Date().toISOString() };
}

function save(p: OnboardingProgress): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* */ }
}

export function shouldShowTeacherOsOnboarding(): boolean {
  const p = load();
  return !p.skipped && p.completed.length < ALL_STEPS.length;
}

export function getOnboardingProgress(): OnboardingProgress {
  return load();
}

export function completeOnboardingStep(step: OnboardingStepId): OnboardingProgress {
  const p = load();
  if (!p.completed.includes(step)) p.completed = [...p.completed, step];
  if (p.completed.length >= ALL_STEPS.length) {
    p.completedAt = new Date().toISOString();
  }
  save(p);
  return p;
}

export function skipOnboarding(): OnboardingProgress {
  const p = { ...load(), skipped: true, completedAt: new Date().toISOString() };
  save(p);
  return p;
}

export function resetOnboarding(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
  } catch { /* */ }
}

export function onboardingPercentComplete(): number {
  const p = load();
  return Math.round((p.completed.length / ALL_STEPS.length) * 100);
}

export function listOnboardingSteps(): OnboardingStepId[] {
  return [...ALL_STEPS];
}
