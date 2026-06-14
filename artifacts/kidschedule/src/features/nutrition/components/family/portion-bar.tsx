import { cn } from "@/lib/utils";

export function PortionBar({ percent, className }: { percent: number; className?: string }) {
  const width = Math.max(8, Math.min(100, percent));

  return (
    <div className={cn("h-2 w-full rounded-full bg-white/10 overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-teal-400/90 transition-all duration-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
