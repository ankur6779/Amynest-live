import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";

export function ViewDetailsCollapsible({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-center gap-2 py-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {label ??
          t("schedule.view_detailed_data", { defaultValue: "View detailed data" })}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
