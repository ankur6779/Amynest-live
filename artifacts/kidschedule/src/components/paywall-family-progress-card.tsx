import { Check } from "lucide-react";
import type { FamilyProgressItem } from "@/lib/paywall-family-progress";

type Props = {
  items: FamilyProgressItem[];
  winbackLine?: string | null;
};

export function PaywallFamilyProgressCard({ items, winbackLine }: Props) {
  if (items.length === 0 && !winbackLine) return null;

  return (
    <div
      className="mb-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
      data-testid="paywall-family-progress"
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45">
        Your family today
      </p>
      {items.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 text-xs font-semibold text-white/85"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-white/65 leading-relaxed">
        {winbackLine ?? "Premium helps you continue growing together."}
      </p>
    </div>
  );
}
