/**
 * Recover from stale Vite pre-bundle paths (dev) and deploy chunk mismatches (prod).
 */

import { markCacheRecoveryPending } from "@/lib/boot-recovery";

const RELOAD_TS_KEY = "amynest:stale-chunk-reload:ts";
const RELOAD_COUNT_KEY = "amynest:stale-chunk-reload:count";
const RELOAD_WINDOW_MS = 30_000;
const MAX_RELOADS_IN_WINDOW = 2;

const STALE_CHUNK_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "error loading dynamically imported module",
  "Failed to load module script",
  "Loading chunk",
  "ChunkLoadError",
  "Cannot find module",
  "vite/dist/node/chunks",
  "@tailwindcss/node",
] as const;

function messageFromUnknown(err: unknown, fallback = ""): string {
  if (err instanceof Error) return `${err.message}\n${err.stack ?? ""}`;
  if (typeof err === "string") return err;
  return fallback;
}

export function isStaleChunkError(err: unknown, fallbackMessage = ""): boolean {
  const message = messageFromUnknown(err, fallbackMessage);
  if (!message) return false;
  return STALE_CHUNK_PATTERNS.some((p) => message.includes(p));
}

let reloadInFlight = false;

/** Rate-limited full reload for stale chunk / Vite path errors. */
export function tryStaleChunkRecovery(
  err: unknown,
  fallbackMessage = "",
): boolean {
  if (typeof window === "undefined") return false;
  if (!isStaleChunkError(err, fallbackMessage)) return false;
  if (reloadInFlight) return true;

  const now = Date.now();
  let lastTs = 0;
  let count = 0;
  try {
    lastTs = Number(sessionStorage.getItem(RELOAD_TS_KEY) ?? "0");
    count = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) ?? "0");
  } catch {
    /* sessionStorage may be blocked */
  }

  if (lastTs && now - lastTs < RELOAD_WINDOW_MS) {
    if (count >= MAX_RELOADS_IN_WINDOW) {
      console.warn("[amynest:chunk] Stale chunk reload limit reached — not reloading again");
      return false;
    }
    count += 1;
  } else {
    count = 1;
  }

  try {
    sessionStorage.setItem(RELOAD_TS_KEY, String(now));
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(count));
  } catch {
    /* ignore */
  }

  console.warn("[amynest:chunk] Stale chunk detected — reloading", {
    message: messageFromUnknown(err, fallbackMessage).split("\n")[0],
  });
  reloadInFlight = true;
  markCacheRecoveryPending();
  window.setTimeout(() => {
    window.location.reload();
  }, 50);
  return true;
}

/** Dev HMR: full reload when Vite rebundles deps (avoids mixed chunk hashes). */
function installDevHmrFullReload(): void {
  if (!import.meta.hot) return;

  import.meta.hot.on("vite:beforeUpdate", () => {
    console.info("[amynest:chunk] Vite dependency graph changed — full reload");
    window.location.reload();
  });
}

export function installViteChunkRecovery(): void {
  if (typeof window === "undefined") return;

  installDevHmrFullReload();

  window.addEventListener("error", (event) => {
    if (tryStaleChunkRecovery(event.error ?? event.message, event.message)) {
      event.preventDefault();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (tryStaleChunkRecovery(event.reason)) {
      event.preventDefault();
    }
  });
}
