import { useTranslation } from "react-i18next";
import { adaptivityTierLabelKey, type AdaptivityTier } from "@workspace/math-playground";

interface AdaptivePaceBadgeProps {
  tier: AdaptivityTier;
}

const TIER_STYLE: Record<AdaptivityTier, { bg: string; color: string }> = {
  ease: { bg: "rgba(34,197,94,0.2)", color: "hsl(var(--brand-green-400))" },
  standard: { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.55)" },
  stretch: { bg: "rgba(245,158,11,0.2)", color: "hsl(var(--brand-amber-300))" },
};

export function AdaptivePaceBadge({ tier }: AdaptivePaceBadgeProps) {
  const { t } = useTranslation();
  const style = TIER_STYLE[tier];

  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: style.bg, color: style.color }}
    >
      {t(`components.math_playground.${adaptivityTierLabelKey(tier)}`)}
    </span>
  );
}
