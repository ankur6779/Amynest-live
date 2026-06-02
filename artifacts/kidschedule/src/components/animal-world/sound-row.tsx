import { Volume2 } from "lucide-react";
import type { AnimalSound } from "@workspace/animal-world";
import { cn } from "@/lib/utils";

type SoundWaveformProps = {
  waveform: number[];
  active?: boolean;
};

export function SoundWaveform({ waveform, active }: SoundWaveformProps) {
  return (
    <div className="flex h-8 items-end gap-[3px]" aria-hidden>
      {waveform.map((amp, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-primary/70 transition-all duration-200",
            active && "animate-pulse bg-primary",
          )}
          style={{ height: `${Math.max(18, amp * 100)}%` }}
        />
      ))}
    </div>
  );
}

type SoundRowProps = {
  sound: AnimalSound;
  playing?: boolean;
  onPlay: () => void;
};

export function SoundRow({ sound, playing, onPlay }: SoundRowProps) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.07] active:scale-[0.99]",
        playing && "border-primary/40 bg-primary/10",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
        <Volume2 className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{sound.label}</p>
        <p className="text-xs text-muted-foreground">{sound.durationSec.toFixed(1)}s</p>
      </div>
      <SoundWaveform waveform={sound.waveform} active={playing} />
    </button>
  );
}
