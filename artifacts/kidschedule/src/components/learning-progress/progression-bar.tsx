import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressionBarProps {
  label: string;
  value: number;
  max?: number;
  className?: string;
  showPercent?: boolean;
}

export function ProgressionBar({
  label,
  value,
  max = 100,
  className,
  showPercent = true,
}: ProgressionBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("space-y-1", className)} data-testid="progression-bar">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {showPercent && <span>{pct}%</span>}
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}
