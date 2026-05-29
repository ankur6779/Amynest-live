import { ChevronRight, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import type { HubPrimaryAction } from "./types";

interface PrimaryActionCardProps {
  action: HubPrimaryAction;
  onAction: (action: HubPrimaryAction) => void;
}

export function PrimaryActionCard({ action, onAction }: PrimaryActionCardProps) {
  const { t } = useTranslation();

  return (
    <section
      className="rounded-xl border border-primary/40 bg-primary/10 p-3"
      aria-labelledby="hub-primary-action-title"
    >
      <div className="flex items-start gap-2 mb-2">
        <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p
          id="hub-primary-action-label"
          className="text-[10px] font-bold uppercase tracking-wide text-primary"
        >
          {t("parent_hub.executive.top_priority", { defaultValue: "Top priority" })}
        </p>
      </div>
      <h3 id="hub-primary-action-title" className="text-sm font-bold text-foreground leading-snug">
        {action.title}
      </h3>
      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
        <span className="font-semibold text-foreground/80">
          {t("parent_hub.executive.why", { defaultValue: "Why:" })}{" "}
        </span>
        {action.why}
      </p>
      <Button
        type="button"
        size="sm"
        className="mt-3 w-full justify-between"
        onClick={() => onAction(action)}
      >
        {t("parent_hub.executive.do_this_now", { defaultValue: "Do this now" })}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </section>
  );
}
