import { CelebrationLayer } from "@/components/math-animation/CelebrationLayer";
import { useVisualBudget } from "@/lib/performance-tier";
import { useReducedMotion } from "@/lib/reduced-motion";

interface ConfettiCelebrationProps {
  active: boolean;
  color?: string;
}

export function ConfettiCelebration({ active, color }: ConfettiCelebrationProps) {
  const reduced = useReducedMotion();
  const budget = useVisualBudget();
  return (
    <CelebrationLayer
      active={active}
      particles={budget.particles}
      reduced={reduced}
      color={color}
    />
  );
}
