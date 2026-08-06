/**
 * Analytics Context — identity & session for V2 core.
 * No child PII (no name, free-text worry, email, etc.).
 */

import type { V2AnalyticsContext, V2Platform } from "./types";

export type CreateV2AnalyticsContextInput = {
  anonymousId: string;
  accountId?: string | null;
  sessionId: string;
  journeyId?: string | null;
  journeyVersion?: number | null;
  appVersion?: string | null;
  platform: V2Platform;
};

export type ContextValidationResult =
  | { ok: true; context: V2AnalyticsContext }
  | { ok: false; message: string };

export function createV2AnalyticsContext(
  input: CreateV2AnalyticsContextInput,
): ContextValidationResult {
  const anonymousId = input.anonymousId?.trim() ?? "";
  const sessionId = input.sessionId?.trim() ?? "";
  if (!anonymousId) {
    return { ok: false, message: "anonymousId is required" };
  }
  if (!sessionId) {
    return { ok: false, message: "sessionId is required" };
  }
  if (!input.platform) {
    return { ok: false, message: "platform is required" };
  }

  // Context shape is closed — no child name / email / free-text fields exist on the type.

  const context: V2AnalyticsContext = {
    anonymousId,
    accountId: input.accountId?.trim() ? input.accountId.trim() : null,
    sessionId,
    journeyId: input.journeyId?.trim() ? input.journeyId.trim() : null,
    journeyVersion:
      typeof input.journeyVersion === "number" ? input.journeyVersion : null,
    appVersion: input.appVersion?.trim() ? input.appVersion.trim() : null,
    platform: input.platform,
  };

  return { ok: true, context };
}

/** Mutable holder used by the bus — set by app bootstrap later (not this sprint). */
let activeContext: V2AnalyticsContext | null = null;

export function setActiveV2AnalyticsContext(context: V2AnalyticsContext | null): void {
  activeContext = context;
}

export function getActiveV2AnalyticsContext(): V2AnalyticsContext | null {
  return activeContext;
}

export function resetActiveV2AnalyticsContextForTests(): void {
  activeContext = null;
}
