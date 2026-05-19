/** True in Vite dev server or when agent/boot debug is explicitly enabled. */
export function isDevDebugEnabled(): boolean {
  return (
    import.meta.env.DEV || import.meta.env.VITE_AGENT_DEBUG === "true"
  );
}

export function devLog(...args: unknown[]): void {
  if (isDevDebugEnabled()) console.log(...args);
}
