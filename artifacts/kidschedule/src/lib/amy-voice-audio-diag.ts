/**
 * Runtime Amy voice diagnostics — enable with ?audioDebug=1 or
 * localStorage.setItem('amynest_audio_debug', '1').
 */

import { getAppApiBaseOrigin, getApiUrl } from "@/lib/api";
import { isAndroidAmyNestAudioClient, isStandalonePwa } from "@/lib/device-lite";
import { IS_PROD, isStaticAudioDebugEnabled } from "@/lib/is-dev";
import { lookupStaticAudioUrl } from "@/lib/static-audio";
import { isClientStaticAudioCircuitOpen } from "@/lib/static-audio-telemetry";
import { isAudioUnlocked } from "@/lib/tts-guard";

export function isAmyVoiceAudioDebugEnabled(): boolean {
  if (IS_PROD) return false;
  if (isStaticAudioDebugEnabled()) return true;
  if (typeof window === "undefined") return false;
  try {
    if (/[?&]audioDebug=1/.test(window.location.search || "")) return true;
    return window.localStorage.getItem("amynest_audio_debug") === "1";
  } catch {
    return false;
  }
}

export function logAmyVoiceDiag(step: string, detail: Record<string, unknown> = {}): void {
  if (!isAmyVoiceAudioDebugEnabled()) return;
  console.info("[AmyVoiceDiag]", step, {
    ...detail,
    ts: Date.now(),
  });
}

export function installAmyVoiceAudioDiagnostics(): void {
  if (typeof window === "undefined" || !isAmyVoiceAudioDebugEnabled()) return;

  const w = window as Window & {
    __amynestAudioDiag?: {
      lookup: (text: string, mode?: "default" | "phonics") => string | null;
      probe: (text: string) => Promise<Record<string, unknown>>;
      context: () => Record<string, unknown>;
    };
  };

  w.__amynestAudioDiag = {
    lookup: (text, mode = "default") => lookupStaticAudioUrl(text, mode),
    context: () => ({
      apiOrigin: getAppApiBaseOrigin(),
      androidAudioClient: isAndroidAmyNestAudioClient(),
      standalonePwa: isStandalonePwa(),
      audioUnlocked: isAudioUnlocked(),
      staticCircuitOpen: isClientStaticAudioCircuitOpen(),
      online: navigator.onLine,
      ua: navigator.userAgent,
      href: location.href,
    }),
    probe: async (text) => {
      const trimmed = text.trim();
      const url = lookupStaticAudioUrl(trimmed, "default");
      const out: Record<string, unknown> = {
        text: trimmed,
        lookupUrl: url,
        apiOrigin: getAppApiBaseOrigin(),
      };
      if (!url) return { ...out, error: "lookup_miss" };
      try {
        const res = await fetch(url, { credentials: "omit", cache: "no-store", mode: "cors" });
        const blob = await res.blob();
        out.fetchStatus = res.status;
        out.blobBytes = blob.size;
        out.contentType = res.headers.get("content-type");
        const audio = new Audio();
        audio.src = URL.createObjectURL(blob);
        await audio.play();
        await new Promise<void>((r) => setTimeout(r, 400));
        out.playPaused = audio.paused;
        out.currentTime = audio.currentTime;
        out.readyState = audio.readyState;
        audio.pause();
        URL.revokeObjectURL(audio.src);
      } catch (e) {
        out.playError = e instanceof Error ? e.message : String(e);
      }
      return out;
    },
  };

  logAmyVoiceDiag("installed", w.__amynestAudioDiag.context());
}
