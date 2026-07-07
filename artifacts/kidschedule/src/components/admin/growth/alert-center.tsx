import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GrowthAlert } from "./types";

const ALERT_ICONS = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

const ALERT_STYLES = {
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
} as const;

export function AlertCenter({ alerts }: { alerts: GrowthAlert[] }) {
  if (alerts.length === 0) {
    return <p className="text-xs text-muted-foreground">No active alerts.</p>;
  }
  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const Icon = ALERT_ICONS[alert.category];
        return (
          <li
            key={alert.id}
            className={cn("flex items-start gap-2 rounded-xl border px-3 py-2", ALERT_STYLES[alert.category])}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-xs opacity-90 mt-0.5">{alert.message}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
