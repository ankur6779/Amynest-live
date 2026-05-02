import { useCallback, useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import {
  buildNoiseWav,
  buildMelodyWav,
  bytesToBase64,
  type Note,
  type SynthKind,
} from "@workspace/infant-hub";

export type WavSource =
  | { type: "noise"; kind: SynthKind }
  | {
      type: "melody";
      notes: readonly Note[];
      noiseBed?: { kind: SynthKind; level: number };
      amplitude?: number;
    };

export type DownloadResult = { uri: string; fileName: string };

interface NoisePlayerState {
  /** id of the source currently playing, or null when idle. */
  activeId: string | null;
  /** First-touch failure (e.g. file write or audio engine refused). */
  error: string | null;
  /** Toggle behaviour: tap same id stops, tap a different id swaps. */
  toggle: (id: string, source: WavSource) => Promise<void>;
  /** Hard stop — releases the active loop. */
  stop: () => void;
  /** Current playback volume in [0, 1]. */
  volume: number;
  /** Set the player volume; clamped into [0, 1]. */
  setVolume: (v: number) => void;
  /**
   * Persist a synthesised WAV to the app's document directory and return
   * the saved URI + a friendly filename. Same id reuses the cached bytes.
   */
  download: (
    id: string,
    source: WavSource,
    label: string,
  ) => Promise<DownloadResult>;
}

function buildWavFor(source: WavSource): Uint8Array {
  if (source.type === "melody") {
    return buildMelodyWav(source.notes, {
      noiseBed: source.noiseBed,
      amplitude: source.amplitude,
    });
  }
  return buildNoiseWav(source.kind);
}

function clampVolume(v: number): number {
  if (Number.isNaN(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function safeFileName(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "sound";
}

const DEFAULT_VOLUME = 0.8;

/**
 * One audio player per host component, looping a synthesised WAV file.
 * The WAV bytes are generated lazily per source, written to the cache
 * directory once (keyed by id), and re-used on subsequent toggles. Works
 * for both white-noise colours and short lullaby melodies.
 */
export function useNoisePlayer(): NoisePlayerState {
  const player = useAudioPlayer(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolumeState] = useState<number>(DEFAULT_VOLUME);
  const filesRef = useRef<Record<string, string>>({});
  const inFlightRef = useRef<Set<string>>(new Set());
  const reqIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try { player.pause(); } catch {}
    };
  }, [player]);

  // Apply the desired volume to the underlying expo-audio player whenever
  // it changes. Wrapped in try/catch so a missing player surface in tests
  // never throws.
  useEffect(() => {
    try {
      (player as { volume: number }).volume = volume;
    } catch {
      /* noop in jsdom / non-native test envs */
    }
  }, [player, volume]);

  const ensureFile = useCallback(
    async (id: string, source: WavSource): Promise<string | null> => {
      if (filesRef.current[id]) return filesRef.current[id];
      if (inFlightRef.current.has(id)) return null;
      inFlightRef.current.add(id);
      try {
        const wav = buildWavFor(source);
        const base64 = bytesToBase64(wav);
        const dir = FileSystem.cacheDirectory;
        if (!dir) throw new Error("no_cache_dir");
        const uri = `${dir}amynest-sound-${id}.wav`;
        await FileSystem.writeAsStringAsync(uri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        filesRef.current[id] = uri;
        return uri;
      } finally {
        inFlightRef.current.delete(id);
      }
    },
    [],
  );

  const stop = useCallback(() => {
    reqIdRef.current += 1;
    try { player.pause(); } catch {}
    if (mountedRef.current) setActiveId(null);
  }, [player]);

  const toggle = useCallback(
    async (id: string, source: WavSource) => {
      if (activeId === id) {
        stop();
        return;
      }
      const myId = ++reqIdRef.current;
      setError(null);
      try {
        const uri = await ensureFile(id, source);
        if (myId !== reqIdRef.current || !mountedRef.current) return;
        if (!uri) return;
        try { player.pause(); } catch {}
        player.replace({ uri });
        try { (player as { loop: boolean }).loop = true; } catch {}
        try { (player as { volume: number }).volume = volume; } catch {}
        player.play();
        if (mountedRef.current) setActiveId(id);
      } catch (e) {
        if (mountedRef.current && myId === reqIdRef.current) {
          setError(e instanceof Error ? e.message : "audio_failed");
          setActiveId(null);
        }
      }
    },
    [activeId, ensureFile, player, stop, volume],
  );

  const setVolume = useCallback((v: number) => {
    const next = clampVolume(v);
    if (mountedRef.current) setVolumeState(next);
    try {
      (player as { volume: number }).volume = next;
    } catch {
      /* noop */
    }
  }, [player]);

  const download = useCallback(
    async (
      id: string,
      source: WavSource,
      label: string,
    ): Promise<DownloadResult> => {
      const cachedUri = await ensureFile(id, source);
      const docDir = FileSystem.documentDirectory;
      if (!docDir) throw new Error("no_document_dir");
      const fileName = `amynest-${safeFileName(label)}.wav`;
      const targetUri = `${docDir}${fileName}`;
      // Best-effort: replace any prior copy at that path so re-downloading
      // the same id doesn't fail with EEXIST on iOS.
      try {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      } catch {
        /* noop */
      }
      if (cachedUri) {
        await FileSystem.copyAsync({ from: cachedUri, to: targetUri });
      } else {
        // No cached file (in-flight collision) — synthesise inline as a
        // last-resort fallback so the user still gets a saved file.
        const wav = buildWavFor(source);
        const base64 = bytesToBase64(wav);
        await FileSystem.writeAsStringAsync(targetUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      return { uri: targetUri, fileName };
    },
    [ensureFile],
  );

  return { activeId, toggle, stop, error, volume, setVolume, download };
}
