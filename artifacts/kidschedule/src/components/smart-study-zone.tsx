import { Link } from "wouter";
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
  return (
    <Card className="rounded-2xl overflow-hidden border-indigo-200/60 dark:border-indigo-400/20 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950/40 dark:via-zinc-900 dark:to-purple-950/40 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-quicksand text-lg font-bold text-foreground">Smart Study Zone</h3>
              <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-0.5">
                <Sparkles className="h-3 w-3" />
                New
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Adaptive learning from <strong>Nursery to Class 10</strong>. Tap-and-listen for the little ones,
              short notes plus practice for older kids — Amy explains in easy language.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Badge label="👶 Play & Learn" />
              <Badge label="📘 Class 1–5" />
              <Badge label="📊 Class 6–10" />
            </div>
            <SubItemGate sectionId="hub_smart_study" subItemId="open_smart_study">
              <Button asChild className="mt-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white">
                <Link href="/study">
                  Open Smart Study Zone
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
    <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-white/10 border border-indigo-200/60 dark:border-indigo-400/20 text-foreground/80">
      {label}
    </span>
  );
}
