import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sunrise, ArrowRight } from "lucide-react";

/**
 * Hub card shown inside Parenting Hub. The full experience lives at
 * /school-morning-flow.
 */
import { useTranslation } from "react-i18next";
export function SchoolMorningFlowCard() {
  const {
    t
  } = useTranslation();
  return <Card className="rounded-2xl overflow-hidden border-border dark:border-border bg-gradient-to-br from-muted via-white to-muted dark:from-card dark:via-muted dark:to-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary text-primary dark:text-muted-foreground flex items-center justify-center shrink-0">
            <Sunrise className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand text-lg font-bold text-foreground">{t("components.school_morning_flow_card.school_morning_flow")}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {t("components.school_morning_flow_card.wake_up_get_ready_breakfast_leave_plus_a_night_prep_checklis")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Badge label="🌙 Night prep" />
              <Badge label="⚡ Step flow" />
              <Badge label="🧠 Smart delay" />
            </div>
            <Button asChild className="mt-4 rounded-full bg-primary hover:bg-primary text-white">
              <Link href="/school-morning-flow">
                {t("components.school_morning_flow_card.open_morning_flow")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>;
}
function Badge({
  label
}: {
  label: string;
}) {
  return <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-white/10 border border-border dark:border-border text-foreground/80">
      {label}
    </span>;
}