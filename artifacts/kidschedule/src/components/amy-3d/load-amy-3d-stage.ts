import type { ComponentType } from "react";
import { safeOptionalImport } from "@/lib/safe-import";
import type { Amy3DStageProps } from "@/components/amy-3d/amy-3d-stage";

let cached: ComponentType<Amy3DStageProps> | null | undefined;

/** Load the WebGL stage once; returns null when the chunk is unavailable (dev stale HMR, etc.). */
export async function loadAmy3DStage(): Promise<ComponentType<Amy3DStageProps> | null> {
  if (cached !== undefined) return cached;
  const mod = await safeOptionalImport(() => import("@/components/amy-3d/amy-3d-stage"));
  cached = mod?.default ?? null;
  return cached;
}
