import { type ComponentType, lazy, type LazyExoticComponent } from "react";
import { isStaleChunkError, tryStaleChunkRecovery } from "@/lib/vite-chunk-recovery";

/**
 * Wrap dynamic import() with one retry and stale-chunk recovery (cache clear + reload).
 * Use with React.lazy: lazy(() => safeImport(() => import("./page"))).
 */
export async function safeImport<T>(importFn: () => Promise<T>): Promise<T> {
  try {
    return await importFn();
  } catch (firstErr) {
    if (!isStaleChunkError(firstErr)) throw firstErr;

    console.warn("[amynest:chunk] Dynamic import failed — retrying...");

    try {
      return await importFn();
    } catch (secondErr) {
      console.warn("[amynest:chunk] Retry failed — forcing reload");
      tryStaleChunkRecovery(firstErr);
      throw firstErr instanceof Error ? firstErr : secondErr;
    }
  }
}

/** Cache-bust retry for relative entry chunks (e.g. AppCore). */
export async function safeImportModule<T>(
  importFn: () => Promise<T>,
  moduleId: string,
): Promise<T> {
  try {
    return await importFn();
  } catch (firstErr) {
    if (!isStaleChunkError(firstErr)) throw firstErr;

    console.warn("[amynest:chunk] Entry chunk failed — cache-bust retry", { moduleId });

    try {
      return (await import(
        /* @vite-ignore */ `${moduleId}?retry=${Date.now()}`
      )) as T;
    } catch (secondErr) {
      console.warn("[amynest:chunk] Entry chunk retry failed — forcing reload");
      tryStaleChunkRecovery(firstErr);
      throw firstErr instanceof Error ? firstErr : secondErr;
    }
  }
}

/** lazy() helper for route/page components. */
export function lazyPage<T extends ComponentType>(
  importFn: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(() => safeImport(importFn));
}
