import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface HubDashboardErrorProps {
  onRetry: () => void;
}

export function HubDashboardError({ onRetry }: HubDashboardErrorProps) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-center"
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" aria-hidden="true" />
      <p className="text-sm font-semibold text-foreground mb-1">
        {t("parent_hub.executive.error_title", { defaultValue: "Could not load your family dashboard" })}
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        {t("parent_hub.executive.error_body", { defaultValue: "Amy will retry when you're back online." })}
      </p>
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        {t("parent_hub.executive.retry", { defaultValue: "Try again" })}
      </Button>
    </div>
  );
}

export function HubDashboardEmpty() {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-6 text-center">
      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
      <p className="text-sm font-semibold">
        {t("parent_hub.executive.empty_title", { defaultValue: "Your family dashboard is warming up" })}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        {t("parent_hub.executive.empty_body", {
          defaultValue: "Complete a routine or learning session — Amy will surface insights here.",
        })}
      </p>
    </div>
  );
}
