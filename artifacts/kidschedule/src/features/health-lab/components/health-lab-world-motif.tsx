import { cn } from "@/lib/utils";
import type { WorldIdentity } from "../world-identity";
import type { WorldStage } from "../world-evolution";

/** Lightweight CSS motifs — GPU transforms/opacity only; evolve with world stage. */
export function HealthLabWorldMotif({
  motif,
  className,
  alive = true,
  stage = 0,
  friendEmoji,
  celebrating = false,
}: {
  motif: WorldIdentity["motif"];
  className?: string;
  /** When false (reduced motion), motifs stay still. */
  alive?: boolean;
  /** 0 unrestored … 4 festival — from existing completion history. */
  stage?: WorldStage;
  friendEmoji?: string;
  /** Tiny reaction when child helped this world today. */
  celebrating?: boolean;
}) {
  const life = alive ? "health-lab-ambient-on" : "";
  const stageClass = `health-lab-world-stage-${stage}`;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        life,
        stageClass,
        celebrating && "health-lab-world-celebrating",
        className,
      )}
      aria-hidden
    >
      {motif === "balloon" && <BalloonStages stage={stage} />}
      {motif === "island" && <IslandStages stage={stage} />}
      {motif === "rocket" && <RocketStages stage={stage} />}
      {motif === "garden" && <GardenStages stage={stage} />}
      {motif === "crystal" && <CrystalStages stage={stage} />}
      {motif === "passport" && (
        <>
          <span className="health-lab-twinkle absolute right-4 top-4 h-10 w-8 rounded-sm border border-amber-200/30 bg-amber-300/15" />
          <span className="health-lab-drift-a absolute left-6 bottom-5 h-2 w-14 rounded-full bg-amber-200/25" />
        </>
      )}

      {friendEmoji && stage >= 1 && (
        <span
          className={cn(
            "absolute bottom-2 right-3 text-base drop-shadow-sm",
            celebrating ? "health-lab-friend-wave" : "health-lab-friend-idle",
          )}
        >
          {friendEmoji}
        </span>
      )}
    </div>
  );
}

function BalloonStages({ stage }: { stage: WorldStage }) {
  return (
    <>
      {/* Pale morning balloons */}
      <span
        className={cn(
          "health-lab-drift-a absolute left-[12%] top-[18%] h-8 w-8 rounded-full",
          stage === 0 ? "bg-white/10" : "bg-sky-300/35",
        )}
      />
      <span
        className={cn(
          "health-lab-drift-b absolute right-[18%] top-[28%] h-5 w-5 rounded-full",
          stage === 0 ? "bg-white/8" : "bg-rose-300/30",
        )}
      />
      <span className="health-lab-sway absolute bottom-[22%] left-[28%] h-3 w-16 rounded-full bg-white/10" />
      {stage >= 1 && (
        <span className="health-lab-sway-slow absolute left-[55%] top-[12%] text-lg opacity-70">🎈</span>
      )}
      {stage >= 2 && (
        <span className="health-lab-shimmer absolute left-[20%] top-[8%] text-sm opacity-80">🌈</span>
      )}
      {stage >= 3 && (
        <>
          <span className="health-lab-drift-slow absolute right-[30%] top-[14%] text-sm opacity-75">🐦</span>
          <span className="health-lab-drift-a absolute left-[40%] top-[22%] text-xs opacity-60">🐦</span>
        </>
      )}
      {stage >= 4 && (
        <>
          <span className="health-lab-sway absolute left-[8%] bottom-[12%] text-xs opacity-80">🎏</span>
          <span className="health-lab-sway-delay absolute right-[10%] bottom-[14%] text-xs opacity-75">🎀</span>
          <span className="health-lab-twinkle absolute left-1/2 top-[10%] text-sm">✨</span>
        </>
      )}
    </>
  );
}

function IslandStages({ stage }: { stage: WorldStage }) {
  return (
    <>
      <span
        className={cn(
          "health-lab-drift-slow absolute -right-4 top-2 h-16 w-16 rounded-full",
          stage === 0 ? "bg-slate-400/15" : "bg-orange-300/25",
        )}
      />
      <span
        className={cn(
          "health-lab-sway absolute bottom-3 left-4 h-4 w-20 rounded-full",
          stage < 2 ? "bg-emerald-300/15" : "bg-emerald-300/35",
        )}
      />
      {stage >= 1 && (
        <span className="health-lab-sway-delay absolute bottom-6 left-10 h-3 w-12 rounded-full bg-pink-200/25" />
      )}
      {stage >= 2 && (
        <span className="health-lab-blink absolute right-[22%] bottom-[28%] h-6 w-1.5 rounded-full bg-amber-200/40" />
      )}
      {stage >= 3 && (
        <span className="health-lab-drift-a absolute left-[45%] top-[16%] text-sm opacity-70">🕊️</span>
      )}
      {stage >= 4 && (
        <>
          <span className="health-lab-twinkle absolute left-[30%] top-[12%] text-sm">🎊</span>
          <span className="health-lab-sway-slow absolute right-[18%] bottom-[18%] text-xs opacity-80">🎐</span>
        </>
      )}
    </>
  );
}

function RocketStages({ stage }: { stage: WorldStage }) {
  const stars = stage === 0 ? 3 : stage >= 3 ? 8 : 5;
  return (
    <>
      {Array.from({ length: stars }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "health-lab-twinkle absolute h-1 w-1 rounded-full",
            stage === 0 ? "bg-slate-300/40" : "bg-amber-100/70",
          )}
          style={{
            left: `${10 + i * 11}%`,
            top: `${12 + (i % 4) * 18}%`,
            animationDelay: `${i * 0.35}s`,
          }}
        />
      ))}
      {stage >= 1 && (
        <span className="health-lab-blink absolute bottom-2 right-6 h-10 w-2 rounded-full bg-amber-300/45" />
      )}
      {stage >= 2 && (
        <span className="health-lab-shimmer absolute left-[18%] bottom-[20%] h-8 w-5 rounded-sm bg-orange-400/30" />
      )}
      {stage >= 3 && (
        <span className="health-lab-friend-idle absolute left-[12%] bottom-[10%] text-sm opacity-80">👩‍🚀</span>
      )}
      {stage >= 4 && (
        <span className="health-lab-twinkle absolute left-1/2 top-[18%] -translate-x-1/2 text-xs font-black text-amber-200/90">
          3…2…1
        </span>
      )}
    </>
  );
}

function GardenStages({ stage }: { stage: WorldStage }) {
  return (
    <>
      {stage === 0 && (
        <span className="absolute left-3 bottom-4 text-sm opacity-25">🌱</span>
      )}
      {stage >= 1 && (
        <span className="health-lab-sway absolute left-3 bottom-4 text-lg opacity-55">🌸</span>
      )}
      {stage >= 2 && (
        <>
          <span className="health-lab-sway-delay absolute right-8 bottom-6 text-base opacity-55">🌿</span>
          <span className="health-lab-sway absolute left-[40%] bottom-5 text-base opacity-50">🌺</span>
        </>
      )}
      {stage >= 3 && (
        <>
          <span className="health-lab-drift-a absolute left-[30%] top-[20%] text-sm opacity-70">🦋</span>
          <span className="health-lab-drift-b absolute right-[28%] top-[28%] text-xs opacity-60">🦋</span>
        </>
      )}
      {stage >= 4 && (
        <>
          <span className="health-lab-twinkle absolute left-[40%] top-3 text-sm opacity-80">✨</span>
          <span className="health-lab-sway-slow absolute right-4 bottom-4 text-base opacity-75">🌻</span>
        </>
      )}
    </>
  );
}

function CrystalStages({ stage }: { stage: WorldStage }) {
  return (
    <>
      <span
        className={cn(
          "health-lab-shimmer absolute left-[20%] top-[20%] h-10 w-6 rotate-12 [clip-path:polygon(50%_0,100%_40%,80%_100%,20%_100%,0_40%)]",
          stage === 0 ? "bg-slate-400/15" : "bg-fuchsia-300/30",
        )}
      />
      {stage >= 1 && (
        <span className="health-lab-shimmer-delay absolute right-[16%] bottom-[18%] h-8 w-5 -rotate-6 bg-violet-200/30 [clip-path:polygon(50%_0,100%_40%,80%_100%,20%_100%,0_40%)]" />
      )}
      {stage >= 2 && (
        <span className="health-lab-blink absolute inset-0 bg-gradient-to-t from-fuchsia-400/10 to-transparent" />
      )}
      {stage >= 3 && (
        <>
          <span className="health-lab-twinkle absolute left-[45%] top-[30%] text-xs opacity-80">✨</span>
          <span className="health-lab-twinkle absolute right-[35%] top-[40%] text-[10px] opacity-70">✦</span>
        </>
      )}
      {stage >= 4 && (
        <span className="health-lab-shimmer absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-300/15 blur-md" />
      )}
    </>
  );
}
