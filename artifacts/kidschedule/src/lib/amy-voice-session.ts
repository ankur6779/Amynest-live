/**
 * Session-scoped Amy voice optimization — success priority + failure demotion.
 */

import { recordAdaptiveOutcome } from "@/lib/amy-voice-adaptive";
import type { AmyVoiceLayer } from "@/lib/amy-voice-telemetry";

const STORAGE_KEY = "amynest_amy_voice_last_layer";
const DEMOTE_AFTER_CONSECUTIVE_FAILURES = 2;

let memoryLastLayer: AmyVoiceLayer | null = null;

const consecutiveFailures: Partial<Record<AmyVoiceLayer, number>> = {};

export function getSessionLastSuccessfulLayer(): AmyVoiceLayer | null {
  if (memoryLastLayer) return memoryLastLayer;
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    memoryLastLayer = raw as AmyVoiceLayer;
    return memoryLastLayer;
  } catch {
    return null;
  }
}

export function setSessionLastSuccessfulLayer(layer: AmyVoiceLayer): void {
  memoryLastLayer = layer;
  consecutiveFailures[layer] = 0;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, layer);
  } catch {
    /* ignore */
  }
}

export function recordSessionLayerOutcome(layer: AmyVoiceLayer, success: boolean): void {
  recordAdaptiveOutcome(layer, success);
  if (success) {
    setSessionLastSuccessfulLayer(layer);
    return;
  }
  const prev = consecutiveFailures[layer] ?? 0;
  consecutiveFailures[layer] = prev + 1;
}

export function isLayerDeprioritized(layer: AmyVoiceLayer): boolean {
  return (consecutiveFailures[layer] ?? 0) >= DEMOTE_AFTER_CONSECUTIVE_FAILURES;
}

export type PregenLayerKind = "static" | "cache";
export type DynamicLayerKind = "api" | "elevenlabs";

const PREGEN_QUALITY: Record<PregenLayerKind, number> = { static: 100, cache: 80 };
const DYNAMIC_QUALITY: Record<DynamicLayerKind, number> = { api: 60, elevenlabs: 50 };

export function getPregenLayerQuality(kind: PregenLayerKind): number {
  return PREGEN_QUALITY[kind];
}

export function getDynamicLayerQuality(kind: DynamicLayerKind): number {
  return DYNAMIC_QUALITY[kind];
}

function sortPregenBySession(base: PregenLayerKind[]): PregenLayerKind[] {
  const last = getSessionLastSuccessfulLayer();
  const preferred: PregenLayerKind[] = [];
  const rest: PregenLayerKind[] = [];
  for (const k of base) {
    if (isLayerDeprioritized(k === "static" ? "static" : "cache")) {
      rest.push(k);
      continue;
    }
    if (
      (last === "static" && k === "static") ||
      (last === "cache" && k === "cache")
    ) {
      preferred.unshift(k);
    } else {
      rest.push(k);
    }
  }
  return [...preferred, ...rest];
}

/** Default static-first; demoted layers trail; session winner leads among active. */
export function getPregenLayerOrder(): PregenLayerKind[] {
  return sortPregenBySession(["static", "cache"]);
}

export function getDynamicLayerOrder(): DynamicLayerKind[] {
  const base: DynamicLayerKind[] = ["api", "elevenlabs"];
  const last = getSessionLastSuccessfulLayer();
  const ordered: DynamicLayerKind[] = [];
  const trailing: DynamicLayerKind[] = [];

  for (const k of base) {
    const layer: AmyVoiceLayer = k === "api" ? "api" : "elevenlabs";
    if (isLayerDeprioritized(layer)) {
      trailing.push(k);
      continue;
    }
    if (
      (last === "api" && k === "api") ||
      (last === "elevenlabs" && k === "elevenlabs")
    ) {
      ordered.unshift(k);
    } else {
      trailing.push(k);
    }
  }
  return [...ordered, ...trailing];
}
