import { useEffect, useRef, type DependencyList, type EffectCallback } from "react";
import { getEditorSyncAudit } from "./editor-state-sync-audit";

/** STEP 3 — audited useEffect: logs deps old/new when audit is active. */
export function useAuditedEffect(name: string, effect: EffectCallback, deps: DependencyList) {
  const audit = getEditorSyncAudit();
  const prev = useRef<DependencyList | undefined>(undefined);

  // Log dependency transition before running effect
  useEffect(() => {
    audit?.logEffect(name, [...deps]);
    prev.current = deps;
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- audited wrapper; deps provided by caller
  }, deps);
}
