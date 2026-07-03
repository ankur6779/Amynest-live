const RESUME_KEY = "amynest:activation_resume_v1";

export type ActivationResumeState = {
  routineId: number;
  href: string;
  childName?: string;
  title?: string;
  done: number;
  total: number;
  dateKey: string;
  updatedAt: string;
};

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function saveActivationResume(
  state: Omit<ActivationResumeState, "updatedAt">,
): void {
  if (state.total <= 0 || state.done >= state.total) {
    clearActivationResume(state.routineId);
    return;
  }
  try {
    localStorage.setItem(
      RESUME_KEY,
      JSON.stringify({
        ...state,
        updatedAt: new Date().toISOString(),
      } satisfies ActivationResumeState),
    );
  } catch {
    /* private mode */
  }
}

export function readActivationResume(
  now: Date = new Date(),
): ActivationResumeState | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivationResumeState;
    if (!parsed?.routineId || !parsed.href) return null;
    if (parsed.dateKey !== todayKey(now)) return null;
    if (parsed.total <= 0 || parsed.done >= parsed.total) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearActivationResume(routineId?: number): void {
  try {
    if (routineId != null) {
      const current = readActivationResume();
      if (current && current.routineId !== routineId) return;
    }
    localStorage.removeItem(RESUME_KEY);
  } catch {
    /* ignore */
  }
}
