import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { PARENTING_TIPS, CATEGORY_META, type TipCategory } from "@/lib/parenting-tips-data";
import type { AgeGroup } from "@/lib/age-groups";
import { Button } from "@/components/ui/button";

const CATEGORIES: TipCategory[] = ["guidance", "tip", "health"];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
}

function pickInfantTip(ageGroup: AgeGroup, category: TipCategory, salt: number) {
  const pool = PARENTING_TIPS[ageGroup][category];
  if (pool.length === 0) return { id: "fallback", en: "Trust yourself — you're doing great." };
  const seed = hashStr(`${todayKey()}_${ageGroup}_${category}_${salt}`);
  return pool[seed % pool.length]!;
}

export function NewParentTipsSection({ ageGroup }: { ageGroup: AgeGroup }) {
  const { t } = useTranslation();
  const tips = useMemo(
    () => CATEGORIES.map((cat, i) => ({ cat, tip: pickInfantTip(ageGroup, cat, i) })),
    [ageGroup],
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {t("parent_hub.new_parent_tips.lead")}
      </p>
      <div className="space-y-2">
        {tips.map(({ cat, tip }) => {
          const meta = CATEGORY_META[cat];
          return (
            <div
              key={tip.id}
              className="rounded-2xl border border-rose-200/30 bg-rose-500/[0.06] dark:bg-rose-400/[0.05] px-4 py-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-rose-400/90">
                {meta.emoji} {meta.label.en}
              </p>
              <p className="mt-1 text-sm font-medium leading-snug text-foreground">{tip.en}</p>
            </div>
          );
        })}
      </div>
      <Link href="/assistant?q=I'm%20a%20new%20parent%20with%20a%20baby.%20What%20should%20I%20focus%20on%20this%20week%3F">
        <Button variant="outline" className="w-full rounded-xl gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("parent_hub.new_parent_tips.ask_amy")}
          <ArrowRight className="h-4 w-4 ml-auto" />
        </Button>
      </Link>
    </div>
  );
}
