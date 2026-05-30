import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { HUB_PROGRESS_FILL, HUB_PROGRESS_TRACK } from "@/lib/parent-hub-premium";

interface ProgressionBarProps {
  label: string;
  value: number;
  max?: number;
  className?: string;
  showPercent?: boolean;
  parentHub?: boolean;
}

export function ProgressionBar({
  label,
  value,
  max = 100,
  className,
  showPercent = true,
  parentHub = false,
}: ProgressionBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("space-y-1", className)} data-testid="progression-bar">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className={parentHub ? "opacity-75" : undefined}>{label}</span>
        {showPercent && <span className={parentHub ? "font-medium text-foreground/80" : undefined}>{pct}%</span>}
      </div>
      {parentHub ? (
        <div className={HUB_PROGRESS_TRACK} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={HUB_PROGRESS_FILL} style={{ width: `${pct}%` }} />
        </div>
      ) : (
        <Progress value={pct} className="h-2" />
      )}
    </div>
  );
}
