let counter = 0;

/** Compact unique id — works in browsers and Node without crypto dependency. */
export function createLearningEventId(): string {
  counter += 1;
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `le_${t}_${r}_${counter.toString(36)}`;
}

export function resetLearningEventIdCounter(): void {
  counter = 0;
}
