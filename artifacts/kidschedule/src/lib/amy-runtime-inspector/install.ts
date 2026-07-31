/**
 * Installs Runtime Inspector capture on the learning runtime.
 * DEV-only — production never imports this module via growth-bootstrap gate.
 */

import {
  isAmyRuntimeInspectorBuildEnabled,
  isAmyRuntimeInspectorEnabled,
} from "./enabled";
import { pushInspectorFrame } from "./trace-store";

let installed = false;

export function installAmyRuntimeInspector(): boolean {
  if (!isAmyRuntimeInspectorBuildEnabled()) return false;
  if (!isAmyRuntimeInspectorEnabled()) return false;
  if (installed) return true;
  installed = true;

  // Dynamic import keeps production trees free of inspector side-effects
  // even if this file is accidentally referenced.
  void import("@/lib/learning-runtime-bridge").then((bridge) => {
    try {
      const runtime = bridge.getLearningRuntime();
      runtime.setTracer((frame) => {
        pushInspectorFrame(frame);
      });
    } catch {
      installed = false;
    }
  });

  return true;
}

export function uninstallAmyRuntimeInspector(): void {
  if (!installed) return;
  void import("@/lib/learning-runtime-bridge").then((bridge) => {
    try {
      bridge.getLearningRuntime().setTracer(null);
    } catch {
      /* ignore */
    }
  });
  installed = false;
}

export function isAmyRuntimeInspectorInstalled(): boolean {
  return installed;
}
