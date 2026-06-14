import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GroupedGroceryList } from "@/features/nutrition/lib/grocery-generator";
import {
  flattenGroceryItems,
  loadCheckedIds,
  saveCheckedIds,
  shoppingProgress,
} from "@/features/nutrition/lib/shopping-storage";

interface ShoppingModeProps {
  groups: GroupedGroceryList[];
  householdId?: string;
  className?: string;
}

export function ShoppingMode({ groups, householdId = "default", className }: ShoppingModeProps) {
  const { t } = useTranslation();
  const items = useMemo(() => flattenGroceryItems(groups), [groups]);
  const [checked, setChecked] = useState<Set<string>>(() => loadCheckedIds(householdId));

  const progress = useMemo(() => shoppingProgress(items, checked), [items, checked]);

  const toggle = useCallback(
    (id: string) => {
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        saveCheckedIds(next, householdId);
        return next;
      });
    },
    [householdId],
  );

  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("nutrition_hub.operations.shopping_mode")}
        </p>
        <span className="text-xs text-muted-foreground">
          {t("nutrition_hub.operations.shopping_progress", {
            done: progress.done,
            total: progress.total,
          })}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const isChecked = checked.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  isChecked
                    ? "border-primary/30 bg-primary/10 text-muted-foreground line-through"
                    : "border-white/[0.08] bg-white/[0.03] text-foreground hover:bg-white/[0.06]",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    isChecked ? "border-primary bg-primary text-primary-foreground" : "border-white/20",
                  )}
                >
                  {isChecked && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">{item.display}</span>
                <span className="text-[10px] uppercase text-muted-foreground">{item.category}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
