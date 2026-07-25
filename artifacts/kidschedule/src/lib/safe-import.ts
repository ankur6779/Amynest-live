import {
  createElement,
  type ComponentType,
  lazy,
  type LazyExoticComponent,
} from "react";
import { StaleChunkUpdatePage } from "@/components/stale-chunk-update-page";
import {
  failedModuleUrl,
  isStaleChunkError,
  tryStaleChunkRecovery,
} from "@/lib/vite-chunk-recovery";

async function retryImportWithCacheBust<T>(err: unknown): Promise<T | null> {
  const url = failedModuleUrl(err);
  if (!url) return null;
  try {
    return (await import(/* @vite-ignore */ `${url}?stale=${Date.now()}`)) as T;
  } catch {
    return null;
  }
}

/** Optional dynamic import — never throws, never triggers stale-chunk reload. */
export async function safeOptionalImport<T>(
  importFn: () => Promise<T>,
): Promise<T | null> {
  try {
    return await importFn();
  } catch (err) {
    console.warn("[amynest:optional-import] module unavailable", err);
    return null;
  }
}

/**
 * Wrap dynamic import() with cache-bust retry and stale-chunk recovery (cache clear + reload).
 * Use with React.lazy: lazy(() => safeImport(() => import("./page"))).
 */
export async function safeImport<T>(importFn: () => Promise<T>): Promise<T> {
  try {
    return await importFn();
  } catch (firstErr) {
    if (!isStaleChunkError(firstErr)) throw firstErr;

    console.warn("[amynest:chunk] Dynamic import failed — cache-bust retry...");

    const busted = await retryImportWithCacheBust<T>(firstErr);
    if (busted != null) return busted;

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
  options?: { label?: string },
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await safeImport(importFn);
    } catch (err) {
      // After cache-bust + reload budget, never throw into AppErrorBoundary —
      // that caused Astro/Birth Sky "Taking you to a safe page…" loops.
      if (isStaleChunkError(err)) {
        const label = options?.label;
        const Fallback = (() =>
          createElement(StaleChunkUpdatePage, { label })) as unknown as T;
        return { default: Fallback };
      }
      throw err;
    }
  });
}
