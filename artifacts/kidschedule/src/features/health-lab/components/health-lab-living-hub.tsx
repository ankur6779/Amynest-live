import { cn } from "@/lib/utils";
import type { WorldStage } from "../world-evolution";

/**
 * Soft life that grows on Home as more worlds are restored.
 * Presentation only — driven by hub vitality from existing history.
 */
export function HealthLabLivingHub({
  vitality,
  alive,
}: {
  vitality: WorldStage;
  alive: boolean;
}) {
  if (vitality <= 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        alive && "health-lab-ambient-on",
        `health-lab-hub-vitality-${vitality}`,
      )}
      aria-hidden
    >
      {vitality >= 1 && (
        <span className="health-lab-drift-a absolute left-[8%] top-[12%] text-sm opacity-50">🎈</span>
      )}
      {vitality >= 2 && (
        <>
          <span className="health-lab-sway absolute right-[10%] bottom-[18%] text-sm opacity-45">🌸</span>
          <span className="health-lab-drift-b absolute left-[18%] bottom-[22%] text-xs opacity-40">🌿</span>
        </>
      )}
      {vitality >= 3 && (
        <>
          <span className="health-lab-drift-slow absolute right-[22%] top-[16%] text-sm opacity-55">🐦</span>
          <span className="health-lab-twinkle absolute left-[48%] top-[10%] text-xs opacity-60">✨</span>
        </>
      )}
      {vitality >= 4 && (
        <>
          <span className="health-lab-twinkle absolute right-[40%] top-[8%] text-sm opacity-70">⭐</span>
          <span className="health-lab-sway-delay absolute left-[40%] bottom-[12%] text-xs opacity-55">🌈</span>
          <span className="health-lab-friend-idle absolute right-[14%] top-[28%] text-sm opacity-60">☁️</span>
        </>
      )}
    </div>
  );
}
