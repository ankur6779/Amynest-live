/**
 * Device-only audio root-cause trace — logs exact runtime values, stops at first gate failure.
 * Enable: localStorage AUDIO_ROOT_CAUSE_TRACE=1 or ?audioTrace=1
 * Do not use for fixes; read WebView / browser console on device.
 */
import { lookupStaticAudioUrl, type StaticAudioMode } from "@/lib/static-audio";

export type AudioTraceModule = "Phonics" | "Spelling" | "Speech Coach" | "Abacus";

let activeModule: AudioTraceModule | null = null;
let audioManagerPlayCalled = false;

export function isAudioRootCauseTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("AUDIO_ROOT_CAUSE_TRACE") === "1") return true;
    if (new URLSearchParams(window.location.search).has("audioTrace")) return true;
  } catch {
    /* private mode */
  }
  return Boolean(import.meta.env.DEV);
}

export function setAudioTraceModule(module: AudioTraceModule | null): void {
  activeModule = module;
}

export function getAudioTraceModule(): AudioTraceModule | null {
  return activeModule;
}

export function resetAudioTracePlayFlag(): void {
  audioManagerPlayCalled = false;
}

export function noteAudioManagerPlayCalled(): void {
  if (!isAudioRootCauseTraceEnabled()) return;
  audioManagerPlayCalled = true;
}

function fmt(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return JSON.stringify(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function emitStop(module: AudioTraceModule, reason: string, lines: string[]): void {
  const block = [module, ...lines, `STOP`, reason].join("\n");
  console.warn(`[AUDIO_ROOT_CAUSE_TRACE]\n${block}`);
  try {
    (window as unknown as { __AUDIO_ROOT_CAUSE_LAST__?: string }).__AUDIO_ROOT_CAUSE_LAST__ =
      block;
  } catch {
    /* ignore */
  }
}

export type AudioTracePreflightContext = {
  audioIdentity?: unknown;
  resolvedText?: string;
  staticCatalogTexts?: string[] | undefined;
  catalogId?: string | undefined;
  catalogPlayback?: boolean;
};

/** Synchronous gates before async speak/play. Returns false if trace stopped early. */
export function traceBrokenModulePreflight(
  module: AudioTraceModule,
  ctx: AudioTracePreflightContext,
): boolean {
  if (!isAudioRootCauseTraceEnabled()) return true;

  resetAudioTracePlayFlag();
  setAudioTraceModule(module);

  const lines: string[] = [];
  const identity = ctx.audioIdentity;
  lines.push(`audioIdentity = ${fmt(identity)}`);

  const requiresIdentity =
    !ctx.catalogPlayback &&
    (identity === undefined || identity === null);
  if (requiresIdentity) {
    emitStop(module, "audioIdentity missing", lines);
    return false;
  }

  const resolvedText = (ctx.resolvedText ?? "").trim();
  lines.push(`resolvedText = ${fmt(resolvedText)}`);
  if (!resolvedText) {
    emitStop(module, "resolvedText empty", lines);
    return false;
  }

  lines.push(`staticCatalogTexts = ${fmt(ctx.staticCatalogTexts)}`);
  if (ctx.catalogPlayback && (!ctx.staticCatalogTexts || ctx.staticCatalogTexts.length === 0)) {
    emitStop(module, "staticCatalogTexts missing for catalogPlayback", lines);
    return false;
  }

  lines.push(`catalogId = ${fmt(ctx.catalogId)}`);

  const lookupPhrase =
    ctx.staticCatalogTexts?.[0]?.trim() || resolvedText;
  let lookupResult: string | null = null;
  for (const mode of ["phonics", "default"] as StaticAudioMode[]) {
    const hit = lookupStaticAudioUrl(lookupPhrase, mode);
    lines.push(`lookupStaticAudioUrl(${mode}, ${fmt(lookupPhrase)}) = ${fmt(hit)}`);
    if (hit && !lookupResult) lookupResult = hit;
  }
  lines.push(`lookupStaticAudioUrl = ${fmt(lookupResult)}`);
  if (!lookupResult) {
    emitStop(module, "lookupStaticAudioUrl null", lines);
    return false;
  }

  return true;
}

export function tracePlayPreparedUrlInput(
  module: AudioTraceModule,
  url: string | null | undefined,
): boolean {
  if (!isAudioRootCauseTraceEnabled()) return true;
  const lines = [`playPreparedUrl input = ${fmt(url ?? null)}`];
  const trimmed = (url ?? "").trim();
  if (!trimmed || trimmed.includes("undefined")) {
    emitStop(module, "playPreparedUrl input invalid", lines);
    return false;
  }
  console.warn(`[AUDIO_ROOT_CAUSE_TRACE]\n${module}\n${lines.join("\n")}`);
  return true;
}

export function traceAudioManagerPlayResult(
  module: AudioTraceModule,
  called: boolean,
): void {
  if (!isAudioRootCauseTraceEnabled()) return;
  const lines = [
    `audioManager.play() called = ${called || audioManagerPlayCalled ? "YES" : "NO"}`,
  ];
  if (!called && !audioManagerPlayCalled) {
    emitStop(module, "audioManager.play not called", lines);
    return;
  }
  console.warn(
    `[AUDIO_ROOT_CAUSE_TRACE]\n${module}\n${lines.join("\n")}\nPASS (reached audioManager.play)`,
  );
}
