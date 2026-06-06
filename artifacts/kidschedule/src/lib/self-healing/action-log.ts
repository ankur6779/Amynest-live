/**
 * Recent user actions for crash intelligence (Level 9).
 * Ring buffer — no PII beyond route/component labels.
 */

const MAX_ACTIONS = 30;
const actions: string[] = [];

export function recordSelfHealingAction(action: string): void {
  const entry = `${Date.now()}:${action.slice(0, 120)}`;
  actions.push(entry);
  if (actions.length > MAX_ACTIONS) actions.shift();
  try {
    const w = window as Window & { __amynestRecentActions?: string[] };
    w.__amynestRecentActions = [...actions];
  } catch {
    /* ignore */
  }
}

export function getRecentSelfHealingActions(): string[] {
  return [...actions];
}

export function clearSelfHealingActions(): void {
  actions.length = 0;
}
