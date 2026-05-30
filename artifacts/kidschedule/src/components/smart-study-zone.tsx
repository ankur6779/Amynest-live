import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { GraduationCap, Sparkles, ArrowRight } from "lucide-react";
import { SubItemGate } from "@/components/sub-item-gate";
import { cn } from "@/lib/utils";

/**
 * Hub card shown inside Parenting Hub. The full experience lives at /study.
 * Sits alongside the existing OlympiadZone — they're complementary, not
 * a replacement.
 */
export function SmartStudyZone() {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden border border-indigo-400/25 p-5",
        "bg-gradient-to-br from-indigo-500/20 via-violet-600/10 to-blue-600/15",
        "shadow-[inset_0_1px_rgba(255,255,255,0.06),0_0_20px_rgba(129,140,248,0.15)]",
      )}
    >
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(129,140,248,0.4)] ring-1 ring-white/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-quicksand text-lg font-bold text-foreground">{t("parent_hub.smart_study.title")}</h3>
              <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-100 border border-indigo-400/30 inline-flex items-center gap-0.5">
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
              <Button asChild className="mt-4 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-400 hover:to-blue-400 text-white shadow-[0_0_16px_rgba(99,102,241,0.35)]">
                <Link href="/study">
                  {t("parent_hub.smart_study.cta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SubItemGate>
          </div>
        </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-indigo-400/20 text-indigo-100/90">
      {label}
    </span>
  );
}
