const TAG = "[amynest:nav]";

export function logNavEvent(
  event: string,
  detail?: Record<string, unknown>,
): void {
  if (detail && Object.keys(detail).length > 0) {
    console.info(`${TAG} ${event}`, detail);
  } else {
    console.info(`${TAG} ${event}`);
  }
}

export function logNavError(
  event: string,
  error: unknown,
  detail?: Record<string, unknown>,
): void {
  console.error(`${TAG} ${event}`, error, detail ?? "");
  if (error instanceof Error && error.stack) {
    console.error(`${TAG} stack`, error.stack);
  }
}
