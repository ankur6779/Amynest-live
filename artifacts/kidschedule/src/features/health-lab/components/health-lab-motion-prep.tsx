import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import { getGameDef } from "../play-path";
import { getWorldIdentity } from "../world-identity";
import type { HealthGameId } from "../types";
import { HEALTH_LAB_THEME } from "../theme";

interface Props {
  gameId: HealthGameId;
  onReady: () => void;
  onCancel: () => void;
}

/** Friendly pre-launch coach for motion games — UI only; games keep their own calibration. */
export function HealthLabMotionPrep({ gameId, onReady, onCancel }: Props) {
  const { t } = useHealthLabI18n();
  const game = getGameDef(gameId);
  const world = getWorldIdentity(gameId);

  return (
    <div
      className="health-lab-immersive-overlay bg-[#0a0f2e]/92"
      role="dialog"
      aria-modal="true"
      aria-labelledby="motion-prep-title"
    >
      <div className={cn(HEALTH_LAB_THEME.cardSolid, "w-full max-w-sm p-6 text-center")}>
        <div
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-gradient-to-br",
            world.sky,
          )}
        >
          <span className="text-4xl" aria-hidden>
            {game.emoji}
          </span>
        </div>
        <p className="mt-3 text-sm font-bold text-cyan-200/90">{world.worldName}</p>
        <h2 id="motion-prep-title" className="mt-1 text-2xl font-black text-white">
          {t("motion_prep_title", "Get ready!")}
        </h2>
        <p className="mt-2 text-base font-semibold text-violet-50">{world.kidAction}</p>
        <p className="mt-2 flex items-center justify-center gap-2 text-sm leading-relaxed text-violet-100/75">
          <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
          {t("motion_prep_body", "Hold your phone safely. Find some space. Ready?")}
        </p>
        <ul className="mt-4 space-y-2 text-left text-sm text-violet-100/80">
          <li className="rounded-xl bg-white/[0.06] px-3 py-2">
            {t("motion_prep_tip_1", "Hold the phone with both hands")}
          </li>
          <li className="rounded-xl bg-white/[0.06] px-3 py-2">
            {t("motion_prep_tip_2", "Stand where you have room to move")}
          </li>
          <li className="rounded-xl bg-white/[0.06] px-3 py-2">
            {t("motion_prep_tip_3", "Ask a grown-up if you need help")}
          </li>
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onReady}
            className={cn(
              "health-lab-pressable w-full min-h-[56px] rounded-2xl py-3.5 text-sm font-black",
              world.ctaClass,
            )}
          >
            {t("motion_prep_ready", "I'm Ready!")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "health-lab-pressable w-full min-h-[48px] rounded-2xl py-3 text-sm",
              HEALTH_LAB_THEME.ctaSecondary,
            )}
          >
            {t("back", "Back")}
          </button>
        </div>
      </div>
    </div>
  );
}
