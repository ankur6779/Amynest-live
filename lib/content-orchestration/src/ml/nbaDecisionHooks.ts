import type { NbaAction } from "./types.js";
import type { RealtimeDecisionAction } from "../realtime/types.js";

export type NbaDecisionHookPayload = {
  childId: string;
  /** True when hybrid selected the ML path (source === "ml"). */
  used: boolean;
  confidence: number;
  action: NbaAction;
  source: "ml" | "rule";
  mappedAction?: RealtimeDecisionAction;
};

type NbaDecisionListener = (payload: NbaDecisionHookPayload) => void;

const LISTENERS_KEY = Symbol.for("amynest.nbaDecisionListeners");

function getListenerSet(): Set<NbaDecisionListener> {
  const g = globalThis as typeof globalThis & {
    [LISTENERS_KEY]?: Set<NbaDecisionListener>;
  };
  if (!g[LISTENERS_KEY]) {
    g[LISTENERS_KEY] = new Set();
  }
  return g[LISTENERS_KEY];
}

/**
 * Register a listener for every hybrid NBA decision (simulation, monitoring, tests).
 */
export function onNbaDecision(listener: NbaDecisionListener): () => void {
  const listeners = getListenerSet();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearNbaDecisionHooks(): void {
  getListenerSet().clear();
}

export function emitNbaDecision(payload: NbaDecisionHookPayload): void {
  for (const listener of getListenerSet()) {
    listener(payload);
  }
}
