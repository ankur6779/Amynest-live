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

interface NoisePlayerState {
  /** id of the source currently playing, or null when idle. */
  activeId: string | null;
  /** First-touch failure (e.g. file write or audio engine refused). */
  error: string | null;
  /** Toggle behaviour: tap same id stops, tap a different id swaps. */
  toggle: (id: string, source: WavSource) => Promise<void>;
  /** Hard stop — releases the active loop. */
  stop: () => void;
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
        player.play();
        if (mountedRef.current) setActiveId(id);
      } catch (e) {
        if (mountedRef.current && myId === reqIdRef.current) {
          setError(e instanceof Error ? e.message : "audio_failed");
          setActiveId(null);
        }
      }
    },
    [activeId, ensureFile, player, stop],
  );

  return { activeId, toggle, stop, error };
}
