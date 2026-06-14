import { cn } from "@/lib/utils";

export function NutritionPill({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      {icon}
      {value}
      {label}
    </span>
  );
}
