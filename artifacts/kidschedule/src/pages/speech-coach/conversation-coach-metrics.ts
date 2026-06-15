import { getApiUrl } from "@/lib/api";
import type { AuthFetchFn } from "@/lib/poll-result";
import {
  isAndroidUa,
  isCapacitorIosShell,
  isNativeAmyNestAndroidWrapper,
} from "@/lib/device-lite";

export type ConvoPlatform = "ios" | "android" | "web";

export type ConvoTurnMetric = {
  platform: ConvoPlatform;
  sttMs: number | null;
  llmMs: number | null;
  ttsMs: number | null;
  ttfaMs: number | null;
  e2eMs: number;
  error?: string;
};

const pending: ConvoTurnMetric[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function detectConvoPlatform(): ConvoPlatform {
  if (isCapacitorIosShell()) return "ios";
  if (isNativeAmyNestAndroidWrapper() || isAndroidUa()) return "android";
  return "web";
}

export function recordConvoTurnMetric(sample: ConvoTurnMetric): void {
  pending.push({ ...sample, platform: sample.platform ?? detectConvoPlatform() });
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
  }, 0);
}

export async function flushConvoTurnMetrics(authFetch: AuthFetchFn): Promise<void> {
  if (pending.length === 0) return;
  const batch = pending.splice(0, 20);
  try {
    await authFetch(getApiUrl("/api/speech/converse/metrics"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples: batch }),
    });
  } catch {
    pending.unshift(...batch);
  }
}

export class ConvoTurnTimer {
  private readonly turnStartMs = performance.now();
  private sttEndMs: number | null = null;
  private llmEndMs: number | null = null;
  private ttsStartMs: number | null = null;
  private ttfaMs: number | null = null;

  markSttEnd(): void {
    if (this.sttEndMs == null) this.sttEndMs = performance.now();
  }

  markLlmEnd(): void {
    if (this.llmEndMs == null) this.llmEndMs = performance.now();
  }

  markTtsStart(): void {
    if (this.ttsStartMs == null) this.ttsStartMs = performance.now();
  }

  markTtfa(): void {
    if (this.ttfaMs == null && this.ttsStartMs != null) {
      this.ttfaMs = Math.round(performance.now() - this.ttsStartMs);
    }
  }

  finish(error?: string): ConvoTurnMetric {
    const now = performance.now();
    const sttMs =
      this.sttEndMs != null ? Math.round(this.sttEndMs - this.turnStartMs) : null;
    const llmMs =
      this.sttEndMs != null && this.llmEndMs != null
        ? Math.round(this.llmEndMs - this.sttEndMs)
        : null;
    const ttsMs =
      this.llmEndMs != null ? Math.round(now - this.llmEndMs) : null;
    return {
      platform: detectConvoPlatform(),
      sttMs,
      llmMs,
      ttsMs,
      ttfaMs: this.ttfaMs,
      e2eMs: Math.round(now - this.turnStartMs),
      error,
    };
  }
}
