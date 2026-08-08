import { useRef } from "react";
import { Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isHealthLabLivingV1Enabled,
  livingPracticeReadyCta,
} from "@/lib/health-lab/living-room";
import { useHealthLabDialogEscape } from "../hooks/use-health-lab-dialog-escape";
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
  const readyRef = useRef<HTMLButtonElement>(null);
  useHealthLabDialogEscape(true, onCancel, readyRef);
  const game = getGameDef(gameId);
  const world = getWorldIdentity(gameId);
  const living = isHealthLabLivingV1Enabled();

  return (
    <div
      className={cn(
        "health-lab-immersive-overlay",
        living ? "hl-living-deep bg-[rgba(18,14,24,0.94)]" : "bg-[#0a0f2e]/92",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="motion-prep-title"
      data-hl-living={living ? "1" : undefined}
    >
      <div
        className={cn(
          "w-full max-w-sm p-6 text-center",
          living ? "hl-living-deep-panel" : HEALTH_LAB_THEME.cardSolid,
        )}
      >
        <div
          className={cn(
            "mx-auto flex h-20 w-20 items-center justify-center rounded-full border",
            living
              ? "border-[rgba(232,212,184,0.28)] bg-[rgba(232,212,184,0.12)]"
              : cn("border-white/25 bg-gradient-to-br", world.sky),
          )}
        >
          <span className="text-4xl" aria-hidden>
            {game.emoji}
          </span>
        </div>
        <p
          className={cn(
            "mt-3 text-sm font-bold",
            living ? "hl-living-deep-eyebrow" : "text-cyan-200/90",
          )}
        >
          {living ? "Care practice" : world.worldName}
        </p>
        <h2
          id="motion-prep-title"
          className={cn(
            "mt-1 text-2xl font-bold",
            living ? "hl-living-deep-title" : "font-black text-white",
          )}
        >
          {living
            ? t("living_motion_prep_title", "Get ready gently")
            : t("motion_prep_title", "Get ready!")}
        </h2>
        <p
          className={cn(
            "mt-2 text-base font-semibold",
            living ? "text-[rgba(255,252,248,0.92)]" : "text-violet-50",
          )}
        >
          {living ? game.title : world.kidAction}
        </p>
        <p
          className={cn(
            "mt-2 flex items-center justify-center gap-2 text-sm leading-relaxed",
            living ? "text-[rgba(232,212,184,0.82)]" : "text-violet-100/75",
          )}
        >
          <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
          {t("motion_prep_body", "Hold your phone safely. Find some space. Ready?")}
        </p>
        <ul
          className={cn(
            "mt-4 space-y-2 text-left text-sm",
            living ? "text-[rgba(232,212,184,0.85)]" : "text-violet-100/80",
          )}
        >
          <li
            className={cn(
              "rounded-xl px-3 py-2",
              living ? "bg-[rgba(232,212,184,0.08)]" : "bg-white/[0.06]",
            )}
          >
            {t("motion_prep_tip_1", "Hold the phone with both hands")}
          </li>
          <li
            className={cn(
              "rounded-xl px-3 py-2",
              living ? "bg-[rgba(232,212,184,0.08)]" : "bg-white/[0.06]",
            )}
          >
            {t("motion_prep_tip_2", "Stand where you have room to move")}
          </li>
          <li
            className={cn(
              "rounded-xl px-3 py-2",
              living ? "bg-[rgba(232,212,184,0.08)]" : "bg-white/[0.06]",
            )}
          >
            {t("motion_prep_tip_3", "Ask a grown-up if you need help")}
          </li>
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <button
            ref={readyRef}
            type="button"
            onClick={onReady}
            className={cn(
              "health-lab-pressable w-full min-h-[56px] rounded-2xl py-3.5 text-sm font-bold",
              living ? "hl-living-deep-primary-btn" : cn("font-black", world.ctaClass),
            )}
          >
            {living ? livingPracticeReadyCta() : t("motion_prep_ready", "I'm Ready!")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "health-lab-pressable w-full min-h-[48px] rounded-2xl py-3 text-sm",
              living ? "hl-living-deep-ghost-btn" : HEALTH_LAB_THEME.ctaSecondary,
            )}
          >
            {t("back", "Back")}
          </button>
        </div>
      </div>
    </div>
  );
}
