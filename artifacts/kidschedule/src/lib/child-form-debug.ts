/** Dev-only render instrumentation for ChildForm loop diagnosis. */

const counts = new Map<string, number>();

export function countChildFormRender(label: string): void {
  if (!import.meta.env.DEV) return;
  const next = (counts.get(label) ?? 0) + 1;
  counts.set(label, next);
  console.count(label);
}

export function logChildFormEffect(effect: string, deps: Record<string, unknown>): void {
  if (!import.meta.env.DEV) return;
  console.log(`[child-form:effect] ${effect}`, deps);
}

export function resetChildFormRenderCounts(): void {
  counts.clear();
}

export function getChildFormRenderCounts(): ReadonlyMap<string, number> {
  return counts;
}
