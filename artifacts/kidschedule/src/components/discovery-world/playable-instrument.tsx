import { useEffect, useMemo, useRef, useState } from "react";
import type { WorldManifestItem } from "@workspace/world-engine";
import { cn } from "@/lib/utils";
import {
  loadInstrumentSample,
  playInstrumentNote,
  playInstrumentSample,
  unlockInstrumentAudio,
  type InstrumentTimbre,
} from "@/lib/instrument-synth";
import { ensureSampler, playSampledNote } from "@/lib/instrument-sampler";
import {
  getGmInstrument,
  getPlayableConfig,
  type PlayableConfig,
  type PlayablePadDef,
  type PlayableStringDef,
} from "@/lib/playable-instruments";

const BAR_COLORS = [
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

/** Plays a real sampled note when the soundfont is loaded, else the synth. */
type PlayNote = (note: string, options?: { durationMs?: number }) => void;

function makePlayNote(gmInstrument: string | null, timbre: InstrumentTimbre): PlayNote {
  return (note, options) => {
    const durationSec = options?.durationMs ? options.durationMs / 1000 : undefined;
    if (playSampledNote(gmInstrument, note, { durationSec })) return;
    playInstrumentNote(note, timbre, { durationMs: options?.durationMs });
  };
}

type PlayableInstrumentProps = {
  item: WorldManifestItem;
  /** Resolved, proxied URL of the recorded clip (used for percussion pads). */
  sampleUrl: string | null;
  onPlay?: () => void;
  className?: string;
};

export function PlayableInstrument({ item, sampleUrl, onPlay, className }: PlayableInstrumentProps) {
  const config = getPlayableConfig(item);
  const gmInstrument = useMemo(() => getGmInstrument(item), [item]);
  const play = useMemo(() => makePlayNote(gmInstrument, config.timbre), [gmInstrument, config.timbre]);

  useEffect(() => {
    unlockInstrumentAudio();
    ensureSampler(gmInstrument);
  }, [gmInstrument]);

  const handlePlay: PlayNote = (note, options) => {
    unlockInstrumentAudio();
    play(note, options);
    onPlay?.();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-center text-sm text-muted-foreground">{config.hint}</p>
      <div className="rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-4">
        {config.kind === "keyboard" && <Keyboard play={handlePlay} />}
        {config.kind === "bars" && <Bars config={config} play={handlePlay} />}
        {config.kind === "strings" && <Strings config={config} play={handlePlay} />}
        {config.kind === "wind" && <WindKeys config={config} play={handlePlay} />}
        {config.kind === "pads" && (
          <Pads config={config} sampleUrl={sampleUrl} onPlay={onPlay} />
        )}
      </div>
    </div>
  );
}

const WHITE_KEYS = ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"];
const BLACK_KEYS: Array<{ note: string; afterIndex: number }> = [
  { note: "C#4", afterIndex: 0 },
  { note: "D#4", afterIndex: 1 },
  { note: "F#4", afterIndex: 3 },
  { note: "G#4", afterIndex: 4 },
  { note: "A#4", afterIndex: 5 },
];

function Keyboard({ play }: { play: PlayNote }) {
  const [active, setActive] = useState<string | null>(null);
  const press = (note: string) => {
    play(note);
    setActive(note);
    window.setTimeout(() => setActive((a) => (a === note ? null : a)), 160);
  };
  return (
    <div className="relative mx-auto h-40 w-full max-w-md select-none">
      <div className="flex h-full w-full gap-1">
        {WHITE_KEYS.map((note) => (
          <button
            key={note}
            type="button"
            aria-label={`Play ${note}`}
            onPointerDown={() => press(note)}
            className={cn(
              "flex-1 rounded-b-xl border border-slate-300 bg-white shadow-md transition-transform active:translate-y-1",
              active === note && "translate-y-1 bg-amber-100",
            )}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {BLACK_KEYS.map(({ note, afterIndex }) => (
          <button
            key={note}
            type="button"
            aria-label={`Play ${note}`}
            onPointerDown={() => press(note)}
            style={{ left: `calc(${((afterIndex + 1) / WHITE_KEYS.length) * 100}% - 5%)` }}
            className={cn(
              "pointer-events-auto absolute top-0 h-24 w-[10%] rounded-b-lg bg-slate-900 shadow-lg transition-transform active:translate-y-1",
              active === note && "translate-y-1 bg-slate-700",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function Bars({ config, play }: { config: PlayableConfig; play: PlayNote }) {
  const notes = config.notes ?? [];
  const [active, setActive] = useState<string | null>(null);
  const press = (note: string) => {
    play(note);
    setActive(note);
    window.setTimeout(() => setActive((a) => (a === note ? null : a)), 160);
  };
  return (
    <div className="flex items-end justify-center gap-1.5 py-2" role="group" aria-label="Instrument bars">
      {notes.map((note, i) => {
        const height = notes.length > 1 ? 150 - (i / (notes.length - 1)) * 70 : 120;
        return (
          <button
            key={note}
            type="button"
            aria-label={`Play ${note}`}
            onPointerDown={() => press(note)}
            style={{ height, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
            className={cn(
              "w-9 rounded-lg shadow-md transition-transform active:scale-95 sm:w-11",
              active === note && "scale-95 brightness-125",
            )}
          />
        );
      })}
    </div>
  );
}

function Strings({ config, play }: { config: PlayableConfig; play: PlayNote }) {
  const strings = config.strings ?? [];
  const downRef = useRef(false);
  const [active, setActive] = useState<string | null>(null);

  const pluck = (s: PlayableStringDef) => {
    play(s.note);
    setActive(s.note);
    window.setTimeout(() => setActive((a) => (a === s.note ? null : a)), 200);
  };

  useEffect(() => {
    const up = () => {
      downRef.current = false;
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  return (
    <div
      className="space-y-2 py-2 select-none"
      role="group"
      aria-label="Instrument strings — strum to play"
    >
      {strings.map((s, i) => (
        <button
          key={`${s.note}-${i}`}
          type="button"
          aria-label={`Play string ${s.label}`}
          onPointerDown={() => {
            downRef.current = true;
            pluck(s);
          }}
          onPointerEnter={() => {
            if (downRef.current) pluck(s);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5"
        >
          <span className="w-6 shrink-0 text-xs font-bold text-muted-foreground">{s.label}</span>
          <span
            className={cn(
              "h-[3px] flex-1 rounded-full bg-gradient-to-r from-amber-200/40 via-amber-200 to-amber-200/40 transition-all",
              active === s.note && "animate-pulse from-amber-300 via-amber-100 to-amber-300",
            )}
            style={{ height: active === s.note ? 5 : Math.max(2, 5 - i * 0.4) }}
          />
        </button>
      ))}
    </div>
  );
}

function WindKeys({ config, play }: { config: PlayableConfig; play: PlayNote }) {
  const notes = config.notes ?? [];
  const [active, setActive] = useState<string | null>(null);
  const press = (note: string) => {
    play(note, { durationMs: 700 });
    setActive(note);
    window.setTimeout(() => setActive((a) => (a === note ? null : a)), 200);
  };
  return (
    <div className="grid grid-cols-4 gap-2" role="group" aria-label="Instrument keys">
      {notes.map((note, i) => (
        <button
          key={note}
          type="button"
          aria-label={`Play ${note}`}
          onPointerDown={() => press(note)}
          style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
          className={cn(
            "aspect-square rounded-2xl text-sm font-bold text-white/90 shadow-md transition-transform active:scale-95",
            active === note && "scale-95 brightness-125",
          )}
        >
          {note.replace(/\d/, "")}
        </button>
      ))}
    </div>
  );
}

function Pads({
  config,
  sampleUrl,
  onPlay,
}: {
  config: PlayableConfig;
  sampleUrl: string | null;
  onPlay?: () => void;
}) {
  const pads = config.pads ?? [{ label: "Tap", emoji: "🥁", playbackRate: 1 }];
  const bufferRef = useRef<AudioBuffer | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sampleUrl) return;
    void loadInstrumentSample(sampleUrl).then((buf) => {
      if (cancelled) return;
      bufferRef.current = buf;
      setReady(Boolean(buf));
    });
    return () => {
      cancelled = true;
    };
  }, [sampleUrl]);

  const hit = (pad: PlayablePadDef, index: number) => {
    unlockInstrumentAudio();
    if (bufferRef.current) {
      playInstrumentSample(bufferRef.current, { playbackRate: pad.playbackRate });
    } else {
      // Fallback to a synth thump if the sample failed to load.
      playInstrumentNote(110 * pad.playbackRate, config.timbre, { durationMs: 220 });
    }
    setActive(index);
    window.setTimeout(() => setActive((a) => (a === index ? null : a)), 140);
    onPlay?.();
  };

  return (
    <div className="space-y-2">
      <div
        className={cn("grid gap-3", pads.length >= 3 ? "grid-cols-3" : "grid-cols-2")}
        role="group"
        aria-label="Percussion pads"
      >
        {pads.map((pad, i) => (
          <button
            key={pad.label}
            type="button"
            aria-label={`Play ${pad.label}`}
            onPointerDown={() => hit(pad, i)}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1 rounded-full border-4 border-white/10 bg-gradient-to-br from-indigo-500/30 to-purple-600/30 text-2xl shadow-inner transition-transform active:scale-95",
              active === i && "scale-95 from-indigo-400/60 to-purple-500/60",
            )}
          >
            <span aria-hidden>{pad.emoji}</span>
            <span className="text-xs font-semibold text-muted-foreground">{pad.label}</span>
          </button>
        ))}
      </div>
      {!ready && sampleUrl && (
        <p className="text-center text-xs text-muted-foreground">Loading sound…</p>
      )}
    </div>
  );
}
