import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  subtitle?: string;
  icon?: LucideIcon;
  accentClassName?: string;
  action?: ReactNode;
  rightSlot?: ReactNode;
};

export function DashboardSectionHeader({
  label,
  subtitle,
  icon: Icon,
  accentClassName = "bg-primary",
  action,
  rightSlot,
}: Props) {
  return (
    <div className="flex items-start justify-between gap-3 mb-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`h-3.5 w-0.5 rounded-full shrink-0 ${accentClassName}`} />
          {Icon ? <Icon className="h-4 w-4 text-primary shrink-0" /> : null}
          <p className="font-quicksand font-bold text-sm text-foreground">{label}</p>
        </div>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground mt-1 ml-[18px]">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {rightSlot}
        {action}
      </div>
    </div>
  );
}
