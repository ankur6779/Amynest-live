const TAG = "[amynest:nav]";

function navDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      import.meta.env.DEV ||
      window.localStorage?.getItem("amynest:nav-debug") === "1"
    );
  } catch {
    return import.meta.env.DEV;
  }
}

export function logNavEvent(
  event: string,
  detail?: Record<string, unknown>,
): void {
  if (!navDebugEnabled() && !event.startsWith("notif-") && event !== "nav-error") {
    return;
  }
  const payload = {
    ...detail,
    ts: Date.now(),
  };
  if (Object.keys(payload).length > 1) {
    console.info(`${TAG} ${event}`, payload);
  } else {
    console.info(`${TAG} ${event}`, { ts: payload.ts });
  }
}

export function logNavError(
  event: string,
  error: unknown,
  detail?: Record<string, unknown>,
): void {
  console.error(`${TAG} ${event}`, error, { ...detail, ts: Date.now() });
  if (error instanceof Error && error.stack) {
    console.error(`${TAG} stack`, error.stack);
  }
}
