import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import { SubItemGate } from "@/components/sub-item-gate";

/**
 * Hub card shown inside Parenting Hub. The full experience lives at /study.
 * Sits alongside the existing OlympiadZone — they're complementary, not
 * a replacement.
 */
export function SmartStudyZone() {
  const { t } = useTranslation();
  return (
    <Card className="rounded-2xl overflow-hidden border-border bg-card via-white shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary text-foreground flex items-center justify-center shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-quicksand text-lg font-bold text-foreground">{t("parent_hub.smart_study.title")}</h3>
              <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-primary text-foreground inline-flex items-center gap-0.5">
                <Sparkles className="h-3 w-3" />
                {t("parent_hub.badges.new")}
              </span>
            </div>
            <p
              className="text-sm text-muted-foreground mt-1 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t("parent_hub.smart_study.desc_html") }}
            />
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Badge label={t("parent_hub.smart_study.badges.play")} />
              <Badge label={t("parent_hub.smart_study.badges.junior")} />
              <Badge label={t("parent_hub.smart_study.badges.senior")} />
            </div>
            <SubItemGate sectionId="hub_smart_study" subItemId="open_smart_study">
              <Button asChild className="mt-4 rounded-full bg-primary hover:bg-primary text-primary-foreground">
                <Link href="/study">
                  {t("parent_hub.smart_study.cta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SubItemGate>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-card border border-border text-foreground/80">
      {label}
    </span>
  );
}
