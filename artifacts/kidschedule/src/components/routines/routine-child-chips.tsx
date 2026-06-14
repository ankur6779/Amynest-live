import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { HUB_PAGE_CHIP_ACTIVE, HUB_PAGE_CHIP_INACTIVE } from "@/lib/parent-hub-premium";

type RoutineChildChipsProps = {
  children: Array<{ id: number; name: string }>;
  activeChildId: number;
  onSelect: (childId: number) => void;
  /** Child IDs that have a routine for the selected day */
  childIdsWithRoutine?: Set<number>;
};

export function RoutineChildChips({
  children,
  activeChildId,
  onSelect,
  childIdsWithRoutine,
}: RoutineChildChipsProps) {
  const { t } = useTranslation();

  if (children.length <= 1) return null;

  return (
    <div className="space-y-1.5 hub-page-enter">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground px-0.5">
        {t("pages.routines.index.select_child", {
          defaultValue: "Select child",
        })}
      </p>
      <div className="flex flex-wrap gap-2">
        {children.map((child) => {
          const on = activeChildId === child.id;
          const hasRoutine = childIdsWithRoutine?.has(child.id) ?? false;
          return (
            <button
              key={child.id}
              type="button"
              onClick={() => onSelect(child.id)}
              aria-pressed={on}
              className={cn(
                on ? HUB_PAGE_CHIP_ACTIVE : HUB_PAGE_CHIP_INACTIVE,
                "text-xs py-1.5 inline-flex items-center gap-1.5",
              )}
            >
              {hasRoutine && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                  aria-hidden
                />
              )}
              {child.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
