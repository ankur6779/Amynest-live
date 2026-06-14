import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import type { GroupedGroceryList } from "@/features/nutrition/lib/grocery-generator";

interface GroceryListProps {
  groups: GroupedGroceryList[];
  className?: string;
  premiumLocked?: boolean;
}

export function GroceryList({ groups, className, premiumLocked }: GroceryListProps) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const locked = premiumLocked ?? !isPremium;

  const totalItems = useMemo(
    () => groups.reduce((sum, g) => sum + g.items.length, 0),
    [groups],
  );

  if (totalItems === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("nutrition_hub.operations.grocery_empty")}</p>
    );
  }

  return (
    <div className={cn("relative space-y-4", className)}>
      {locked && (
        <button
          type="button"
          className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] rounded-lg flex items-center justify-center p-4"
          onClick={() => openPaywall("hub_nutrition")}
        >
          <span className="text-sm font-medium text-foreground">
            {t("nutrition_hub.operations.grocery_premium")}
          </span>
        </button>
      )}
      <div className={cn("space-y-4", locked && "blur-[2px] select-none pointer-events-none")}>
        {groups.map((group) => (
          <div key={group.category}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              {group.label}
            </p>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground"
                >
                  {item.display}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
