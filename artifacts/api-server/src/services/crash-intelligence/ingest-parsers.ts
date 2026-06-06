import type { CrashEventIngestPayload } from "./types.js";

export function parseCrashEventFromClientLog(input: {
  message: string;
  route?: string;
  userId?: string | null;
  meta?: Record<string, unknown>;
}): CrashEventIngestPayload | null {
  const meta = input.meta ?? {};
  const errorId =
    typeof meta.errorId === "string" ? meta.errorId : undefined;
  const fingerprint =
    typeof meta.fingerprint === "string" ? meta.fingerprint : undefined;
  if (!errorId || !fingerprint) return null;

  const readableFingerprint =
    typeof meta.readableFingerprint === "string"
      ? meta.readableFingerprint
      : "";

  return {
    errorId,
    fingerprint,
    readableFingerprint,
    route: input.route ?? (typeof meta.route === "string" ? meta.route : null),
    message: input.message,
    stack:
      typeof meta.stack === "string"
        ? meta.stack
        : typeof input.meta?.stack === "string"
          ? input.meta.stack
          : null,
    componentStack:
      typeof meta.componentStack === "string" ? meta.componentStack : null,
    userId: input.userId ?? (typeof meta.userId === "string" ? meta.userId : null),
    childId:
      typeof meta.childId === "string"
        ? meta.childId
        : meta.childId === null
          ? null
          : undefined,
    meta,
    timestamp:
      typeof meta.timestamp === "string" ? meta.timestamp : undefined,
  };
}
