import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AGE_GROUPS, NUTRIENTS, MEAL_PLANS, FAMILY_PORTIONS,
  MEDICAL_DISCLAIMER, REFERENCES, AgeGroupId, Nutrient,
} from "@/lib/nutrition-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Apple, Salad, CalendarDays, Users, Trophy, Brain,
  ChevronRight, Info, AlertTriangle, BookOpen, X,
  Leaf, Drumstick, CheckCircle2, AlertCircle, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "nutrients" | "meals" | "family" | "score";
type Lang = "en" | "hi" | "hinglish";

// ─── Language helper ─────────────────────────────────────────────────────────
function l(en: string, hi: string, hinglish?: string, lang: Lang = "en"): string {
  if (lang === "hi") return hi;
  if (lang === "hinglish") return hinglish ?? en;
  return en;
}

function lArr(en: string[], hi: string[], lang: Lang): string[] {
  if (lang === "hi") return hi.length ? hi : en;
  return en;
}

// ─── Score Colors ─────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (s >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
function scoreBarColor(s: number) {
  if (s >= 80) return "bg-emerald-500";
  if (s >= 50) return "bg-amber-500";
  return "bg-red-500";
}
function scoreLabel(s: number, lang: Lang) {
  if (lang === "hi") {
    if (s >= 80) return "शानदार 🌟";
    if (s >= 60) return "अच्छा 👍";
    if (s >= 40) return "ध्यान दें ⚠️";
    return "ध्यान जरूरी 🚨";
  }
  if (lang === "hinglish") {
    if (s >= 80) return "Shandar 🌟";
    if (s >= 60) return "Accha 👍";
    if (s >= 40) return "Dhyan Do ⚠️";
    return "Urgent Dhyan 🚨";
  }
  if (s >= 80) return "Excellent 🌟";
  if (s >= 60) return "Good 👍";
  if (s >= 40) return "Needs Attention ⚠️";
  return "Critical 🚨";
}

// ─── NutrientDetailDialog ────────────────────────────────────────────────────
function NutrientDetailDialog({
  nutrient, ageGroupId, open, onClose, lang,
}: {
  nutrient: Nutrient | null;
  ageGroupId: AgeGroupId;
  open: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  if (!nutrient) return null;
  const need = nutrient.dailyNeeds[ageGroupId];
  const ageGroup = AGE_GROUPS.find(a => a.id === ageGroupId)!;

  const benefitsText = lArr(nutrient.benefits, nutrient.benefitsHi, lang);
  const deficiencyText = lArr(nutrient.deficiencySymptoms, nutrient.deficiencyHi, lang);

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{nutrient.emoji}</span>
            {l(nutrient.name, nutrient.nameHi, nutrient.nameHinglish, lang)}
          </DialogTitle>
        </DialogHeader>

        {/* Daily Need Badge */}
        <div className={cn("rounded-xl p-4 flex items-start gap-3", nutrient.colorClass, nutrient.borderClass, "border")}>
          <Activity className={cn("h-5 w-5 mt-0.5 shrink-0", nutrient.textClass)} />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              {l(
                `Daily Need for ${ageGroup.label}`,
                `${ageGroup.labelHi} के लिए दैनिक आवश्यकता`,
                `Daily Need for ${ageGroup.labelHinglish}`,
                lang,
              )}
            </p>
            <p className={cn("text-2xl font-bold", nutrient.textClass)}>
              {need.amount} <span className="text-base font-medium">{need.unit}</span>
            </p>
            {need.note && <p className="text-xs text-muted-foreground mt-1">{need.note}</p>}
          </div>
        </div>

        {/* Benefits */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {l("Benefits", "फायदे", "Benefits", lang)}
          </h3>
          <ul className="space-y-1.5">
            {benefitsText.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Food Sources */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Salad className="h-4 w-4 text-green-500" />
            {l("Indian Food Sources", "भारतीय खाद्य स्रोत", "Indian Food Sources", lang)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nutrient.sources.map((src, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <span className="text-xl">{src.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">
                      {l(src.name, src.nameHi, src.name, lang)}
                    </span>
                    {src.type === "veg" ? (
                      <Leaf className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <Drumstick className="h-3 w-3 text-orange-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{src.serving} → <strong>{src.amount}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deficiency */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-500" />
            {l("Deficiency Signs", "कमी के लक्षण", "Deficiency Signs", lang)}
          </h3>
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 space-y-1.5">
            {deficiencyText.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ICMR Reference */}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {l(
            "Source: ICMR-NIN Nutrient Requirements for Indians (2020) & WHO Guidelines",
            "स्रोत: ICMR-NIN पोषक तत्व आवश्यकताएं (2020) एवं WHO दिशानिर्देश",
            "Source: ICMR-NIN (2020) & WHO Guidelines",
            lang,
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Nutrient Card ────────────────────────────────────────────────────────────
function NutrientCard({ nutrient, ageGroupId, onClick, lang }: {
  nutrient: Nutrient;
  ageGroupId: AgeGroupId;
  onClick: () => void;
  lang: Lang;
}) {
  const need = nutrient.dailyNeeds[ageGroupId];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group text-left rounded-2xl border p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 w-full",
        nutrient.colorClass, nutrient.borderClass,
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-3xl">{nutrient.emoji}</span>
        <ChevronRight className={cn("h-4 w-4 mt-1 opacity-50 group-hover:opacity-100 transition-opacity", nutrient.textClass)} />
      </div>
      <h3 className={cn("font-bold text-base", nutrient.textClass)}>
        {l(nutrient.name, nutrient.nameHi, nutrient.nameHinglish, lang)}
      </h3>
      <p className="text-xs text-muted-foreground/70 italic mb-2">
        {l(nutrient.tagline, nutrient.taglineHi, nutrient.tagline, lang)}
      </p>
      <div className={cn("rounded-lg px-2 py-1 text-xs font-semibold", "bg-background/60")}>
        <span className={nutrient.textClass}>{need.amount} {need.unit}</span>
        <span className="text-muted-foreground"> / {l("day", "दिन", "day", lang)}</span>
      </div>
    </button>
  );
}

// ─── Meal Plan Section ────────────────────────────────────────────────────────
function MealPlanSection({ ageGroupId, lang }: { ageGroupId: AgeGroupId; lang: Lang }) {
  const plan = MEAL_PLANS.find(p => p.applies.includes(ageGroupId));
  const [dayIdx, setDayIdx] = useState(0);
  const [isVeg, setIsVeg] = useState(true);

  if (!plan) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="text-4xl block mb-2">🍼</span>
        <p className="font-medium">
          {l(
            "Exclusive breastfeeding recommended (0–6 months)",
            "एकल स्तनपान की सलाह (0–6 महीने)",
            "Exclusive breastfeeding recommended (0–6 months)",
            lang,
          )}
        </p>
        <p className="text-sm">
          {l(
            "WHO recommends only breast milk for the first 6 months. No other food or water is needed.",
            "विश्व स्वास्थ्य संगठन 6 महीने तक केवल माँ के दूध की सलाह देता है।",
            "WHO recommends only breast milk for the first 6 months.",
            lang,
          )}
        </p>
      </div>
    );
  }

  const day = plan.days[dayIdx];
  const meal = isVeg ? day.veg : day.nonVeg;

  const mealTimes = [
    { time: `🌅 ${l("Breakfast", "नाश्ता", "Breakfast", lang)}`, key: "breakfast", color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200" },
    meal.midMorning
      ? { time: `🍎 ${l("Mid-Morning", "मध्य-सुबह", "Mid-Morning", lang)}`, key: "midMorning", color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" }
      : null,
    { time: `🌞 ${l("Lunch", "दोपहर का खाना", "Lunch", lang)}`, key: "lunch", color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200" },
    { time: `🍪 ${l("Snack", "स्नैक", "Snack", lang)}`, key: "snack", color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200" },
    { time: `🌙 ${l("Dinner", "रात का खाना", "Dinner", lang)}`, key: "dinner", color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200" },
  ];

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg">
            {l(plan.ageCategory, plan.ageCategoryHi, plan.ageCategory, lang)}
          </h3>
        </div>
        {/* Veg / Non-veg toggle */}
        <div className="flex rounded-full border overflow-hidden">
          <button
            onClick={() => setIsVeg(true)}
            className={cn("flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              isVeg ? "bg-green-500 text-white" : "hover:bg-muted text-muted-foreground")}
          >
            <Leaf className="h-3.5 w-3.5" /> {l("Veg", "शाकाहारी", "Veg", lang)}
          </button>
          <button
            onClick={() => setIsVeg(false)}
            className={cn("flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              !isVeg ? "bg-orange-500 text-white" : "hover:bg-muted text-muted-foreground")}
          >
            <Drumstick className="h-3.5 w-3.5" /> {l("Non-Veg", "मांसाहारी", "Non-Veg", lang)}
          </button>
        </div>
      </div>

      {/* Portion note */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm">
        <p className="text-blue-800 dark:text-blue-200">
          📏 <strong>{l("Portions:", "मात्रा:", "Portions:", lang)}</strong>{" "}
          {l(plan.portionNote, plan.portionNoteHi, plan.portionNote, lang)}
        </p>
      </div>

      {/* Day tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {plan.days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDayIdx(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
              dayIdx === i
                ? "bg-violet-600 text-white border-transparent"
                : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {d.day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Meal cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {mealTimes.filter(Boolean).map((item) => {
          const m = item as { time: string; key: string; color: string };
          return (
            <div key={m.key} className={cn("rounded-xl border p-3", m.color)}>
              <p className="text-xs font-bold mb-1.5">{m.time}</p>
              <p className="text-sm leading-snug">{(meal as Record<string, string | undefined>)[m.key] ?? "—"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Family Mode ──────────────────────────────────────────────────────────────
function FamilyModeSection({ lang }: { lang: Lang }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4">
        <Users className="h-5 w-5 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-violet-800 dark:text-violet-200">
            {l(
              "Family Mode — One Meal, Different Portions",
              "परिवार मोड — एक खाना, अलग-अलग हिस्से",
              "Family Mode — One Meal, Different Portions",
              lang,
            )}
          </p>
          <p className="text-sm text-violet-700 dark:text-violet-300">
            {l(
              "Cook one meal for the whole family and serve age-appropriate portions. No need for separate cooking!",
              "पूरे परिवार के लिए एक खाना बनाएं और उम्र के अनुसार हिस्से परोसें। अलग खाना बनाने की जरूरत नहीं!",
              "Cook one meal for the whole family and serve age-appropriate portions!",
              lang,
            )}
          </p>
        </div>
      </div>

      {/* Responsive table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b">
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground min-w-[140px]">
                {l("Food Item", "खाद्य पदार्थ", "Food Item", lang)}
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-pink-600 dark:text-pink-400">🍼<br /><span className="text-xs">6–12m</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-purple-600 dark:text-purple-400">🧒<br /><span className="text-xs">1–3y</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-blue-600 dark:text-blue-400">📚<br /><span className="text-xs">6–10y</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-cyan-600 dark:text-cyan-400">🌱<br /><span className="text-xs">10–15y</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-teal-600 dark:text-teal-400">👨‍👩<br /><span className="text-xs">{l("Adult", "वयस्क", "Adult", lang)}</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-violet-600 dark:text-violet-400">🤰<br /><span className="text-xs">{l("Pregnant", "गर्भवती", "Pregnant", lang)}</span></th>
            </tr>
          </thead>
          <tbody>
            {FAMILY_PORTIONS.map((row, i) => (
              <tr key={i} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", i % 2 === 0 ? "" : "bg-muted/20")}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{row.emoji}</span>
                    <p className="font-medium">{l(row.food, row.foodHi, row.food, lang)}</p>
                  </div>
                </td>
                <td className="px-3 py-2 text-center text-xs">{row.infant}</td>
                <td className="px-3 py-2 text-center text-xs">{row.toddler}</td>
                <td className="px-3 py-2 text-center text-xs">{row.schoolChild}</td>
                <td className="px-3 py-2 text-center text-xs">{row.teen}</td>
                <td className="px-3 py-2 text-center text-xs">{row.adult}</td>
                <td className="px-3 py-2 text-center text-xs">{row.pregnant}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        {l(
          "* Portions are approximate. Adjust based on child's appetite and hunger cues. 1 katori ≈ 150ml cup.",
          "* मात्राएं अनुमानित हैं। बच्चे की भूख के अनुसार बदलें। 1 कटोरी ≈ 150ml।",
          "* Portions are approximate. 1 katori ≈ 150ml cup.",
          lang,
        )}
      </p>
    </div>
  );
}

// ─── Nutrition Score Section ──────────────────────────────────────────────────
function NutritionScoreSection({ ageGroupId, lang }: { ageGroupId: AgeGroupId; lang: Lang }) {
  const ageGroup = AGE_GROUPS.find(a => a.id === ageGroupId)!;

  const [checkList, setCheckList] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setCheckList(prev => ({ ...prev, [key]: !prev[key] }));

  const scoreChecklist = [
    {
      id: "breakfast",
      label: "Had a wholesome breakfast today",
      labelHi: "आज पौष्टिक नाश्ता किया",
      labelHinglish: "Aaj wholesome breakfast liya",
    },
    {
      id: "protein",
      label: "Ate a protein source (dal / egg / paneer / meat)",
      labelHi: "प्रोटीन लिया (दाल/अंडा/पनीर/मांस)",
      labelHinglish: "Protein liya (dal/egg/paneer/meat)",
    },
    {
      id: "dairy",
      label: "Consumed dairy or calcium source",
      labelHi: "डेयरी या कैल्शियम स्रोत लिया",
      labelHinglish: "Dairy ya calcium source liya",
    },
    {
      id: "greens",
      label: "Ate green leafy vegetables (palak / methi / etc)",
      labelHi: "हरी पत्तेदार सब्जी खाई",
      labelHinglish: "Hari sabzi khai (palak/methi)",
    },
    {
      id: "fruit",
      label: "Had at least 1 fruit today",
      labelHi: "आज कम से कम 1 फल खाया",
      labelHinglish: "Aaj kam se kam 1 fruit khaya",
    },
    {
      id: "water",
      label: "Drank adequate water / fluids",
      labelHi: "पर्याप्त पानी पिया",
      labelHinglish: "Paryapt paani piya",
    },
    {
      id: "noJunk",
      label: "Avoided junk food / packaged snacks",
      labelHi: "जंक फूड से बचे",
      labelHinglish: "Junk food se bacha",
    },
    {
      id: "wholegrains",
      label: "Whole grains instead of refined (atta roti vs maida)",
      labelHi: "साबुत अनाज चुना (आटे की रोटी)",
      labelHinglish: "Whole grains choose kiye (atta roti)",
    },
  ];

  const checked = Object.values(checkList).filter(Boolean).length;
  const score = Math.round((checked / scoreChecklist.length) * 100);

  const ageLabelText = l(ageGroup.label, ageGroup.labelHi, ageGroup.labelHinglish, lang);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
        <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">
            {l(
              `Daily Nutrition Checklist for ${ageLabelText}`,
              `${ageLabelText} के लिए दैनिक पोषण चेकलिस्ट`,
              `Daily Nutrition Checklist for ${ageLabelText}`,
              lang,
            )}
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {l(
              "Check what was eaten today to get a quick nutrition score.",
              "आज के खाने का विवरण चेक करें — त्वरित पोषण स्कोर पाएं।",
              "Check aaj ka khaana — quick nutrition score pao.",
              lang,
            )}
          </p>
        </div>
      </div>

      {/* Score Display */}
      <div className="rounded-2xl border bg-card p-5 flex items-center gap-5">
        <div className={cn("text-6xl font-black tabular-nums", scoreColor(score))}>{score}</div>
        <div className="flex-1 space-y-2">
          <p className={cn("font-semibold text-lg", scoreColor(score))}>{scoreLabel(score, lang)}</p>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", scoreBarColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {l(
              `${checked} of ${scoreChecklist.length} daily nutrition goals met`,
              `${scoreChecklist.length} में से ${checked} पोषण लक्ष्य पूरे हुए`,
              `${checked} of ${scoreChecklist.length} goals met`,
              lang,
            )}
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {scoreChecklist.map(item => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left",
              checkList[item.id]
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700"
                : "bg-card border-border hover:bg-muted/50",
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
              checkList[item.id]
                ? "bg-emerald-500 border-emerald-500"
                : "border-muted-foreground/40",
            )}>
              {checkList[item.id] && <span className="text-white text-xs">✓</span>}
            </div>
            <p className={cn("text-sm font-medium", checkList[item.id] && "line-through text-muted-foreground")}>
              {l(item.label, item.labelHi, item.labelHinglish, lang)}
            </p>
          </button>
        ))}
      </div>

      {/* AI Tip */}
      {score < 80 && (
        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4">
          <p className="flex items-center gap-2 font-semibold text-violet-800 dark:text-violet-200 text-sm mb-1">
            <Brain className="h-4 w-4" /> {l("Amy AI Nutrition Tip", "Amy AI पोषण सुझाव", "Amy AI Nutrition Tip", lang)}
          </p>
          <p className="text-sm text-violet-700 dark:text-violet-300">
            {score < 40
              ? l(
                  "Today's nutrition needs a boost! Try adding dal at lunch, a fruit snack, and a glass of milk to quickly improve your score.",
                  "आज पोषण बेहतर करें — दाल, फल और दूध जरूर लें।",
                  "Aaj nutrition boost karo — dal, fruit aur milk lo!",
                  lang,
                )
              : score < 60
              ? l(
                  "You're on the right track! Make sure to include green leafy vegetables — palak, methi, or drumstick leaves are excellent.",
                  "सही रास्ते पर हैं! हरी पत्तेदार सब्जी जरूर लें — पालक, मेथी उत्तम है।",
                  "Sahi track par ho! Hari sabzi zaroor lo — palak, methi excellent hai.",
                  lang,
                )
              : l(
                  "Almost there! Swap refined snacks for a handful of roasted chana or nuts to get that final boost.",
                  "लगभग हो गया! भुने चने या मेवे से अंतिम स्कोर बढ़ाएं।",
                  "Almost done! Roasted chana ya nuts le lo — final boost milega.",
                  lang,
                )}
          </p>
        </div>
      )}
      {score >= 80 && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <p className="text-2xl mb-1">🌟</p>
          <p className="font-bold text-emerald-700 dark:text-emerald-300">
            {l("Outstanding nutrition day!", "शानदार पोषण दिन!", "Outstanding nutrition day!", lang)}
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {l(
              "Keep it up tomorrow too. Consistency is the key to health.",
              "हर दिन यही करें — यही स्वास्थ्य की कुंजी है।",
              "Kal bhi aisa karo. Consistency hi health ki kunji hai.",
              lang,
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NutritionHubPage() {
  const { i18n } = useTranslation();
  const lang = (["en", "hi", "hinglish"].includes(i18n.language) ? i18n.language : "en") as Lang;

  const [activeAgeGroupId, setActiveAgeGroupId] = useState<AgeGroupId>("toddler_1_3");
  const [activeTab, setActiveTab] = useState<Tab>("nutrients");
  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  const activeAgeGroup = AGE_GROUPS.find(a => a.id === activeAgeGroupId)!;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "nutrients", label: l("Nutrient Library", "पोषक तत्व", "Nutrient Library", lang), icon: <Apple className="h-4 w-4" /> },
    { id: "meals",    label: l("Meal Planner", "साप्ताहिक थाली", "Meal Planner", lang),    icon: <CalendarDays className="h-4 w-4" /> },
    { id: "family",   label: l("Family Mode", "परिवार मोड", "Family Mode", lang),           icon: <Users className="h-4 w-4" /> },
    { id: "score",    label: l("Daily Score", "दैनिक स्कोर", "Daily Score", lang),          icon: <Trophy className="h-4 w-4" /> },
  ];

  const ageLabelActive = l(activeAgeGroup.label, activeAgeGroup.labelHi, activeAgeGroup.labelHinglish, lang);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white px-4 pt-8 pb-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🥗</span>
            <Badge className="bg-white/20 text-white border-white/30 text-xs">
              {l("Science-backed · WHO / ICMR", "विज्ञान-आधारित · WHO / ICMR", "Science-backed · WHO / ICMR", lang)}
            </Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-2">
            {l("Nutrition Hub", "न्यूट्रिशन हब", "Nutrition Hub", lang)}
          </h1>
          <p className="text-violet-200 text-sm mt-0.5">
            {l("Poshan Ka Ghar", "पोषण का घर", "Poshan Ka Ghar", lang)}
          </p>
          <p className="text-white/80 text-sm mt-2 max-w-xl">
            {l(
              "Age-specific nutrition science for your whole family — backed by ICMR-NIN & WHO guidelines.",
              "आपके पूरे परिवार के लिए उम्र-विशिष्ट पोषण विज्ञान — ICMR-NIN और WHO दिशानिर्देशों पर आधारित।",
              "Age-specific nutrition science for your whole family — ICMR-NIN & WHO backed.",
              lang,
            )}
          </p>
        </div>
      </div>

      {/* ── Age Group Selector ── */}
      <div className="bg-card border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-2 py-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {AGE_GROUPS.map(ag => (
              <button
                key={ag.id}
                onClick={() => setActiveAgeGroupId(ag.id)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all",
                  activeAgeGroupId === ag.id
                    ? cn(ag.colorClass, ag.textClass, ag.borderClass, "shadow-sm scale-105")
                    : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted",
                )}
              >
                <span>{ag.emoji}</span>
                <span className="hidden sm:inline">
                  {l(ag.label, ag.labelHi, ag.labelHinglish, lang)}
                </span>
                <span className="sm:hidden">
                  {l(ag.label, ag.labelHi, ag.labelHinglish, lang).split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* ── Age Group Info Card ── */}
        <div className={cn("rounded-2xl border p-4", activeAgeGroup.colorClass, activeAgeGroup.borderClass)}>
          <div className="flex items-start gap-3">
            <span className="text-4xl">{activeAgeGroup.emoji}</span>
            <div className="flex-1 min-w-0">
              <h2 className={cn("font-bold text-xl", activeAgeGroup.textClass)}>{ageLabelActive}</h2>
              <p className="text-sm mt-2">
                {l(activeAgeGroup.description, activeAgeGroup.descriptionHi, activeAgeGroup.description, lang)}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {activeAgeGroup.keyFocus.map((f, i) => (
                  <Badge key={i} variant="outline" className={cn("text-xs", activeAgeGroup.textClass, activeAgeGroup.borderClass)}>
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border transition-all",
                activeTab === tab.id
                  ? "bg-violet-600 text-white border-transparent shadow"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            {/* Nutrients */}
            {activeTab === "nutrients" && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg">
                    {l("Nutrient Library", "पोषक तत्व पुस्तकालय", "Nutrient Library", lang)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {l(
                      `Tap any nutrient to see benefits, Indian food sources, and daily needs for ${ageLabelActive}.`,
                      `किसी भी पोषक तत्व पर टैप करें — फायदे, भारतीय खाद्य स्रोत और ${ageLabelActive} के लिए दैनिक जरूरत देखें।`,
                      `Kisi bhi nutrient par tap karo — ${ageLabelActive} ke liye details dekho.`,
                      lang,
                    )}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {NUTRIENTS.map(n => (
                    <NutrientCard
                      key={n.id}
                      nutrient={n}
                      ageGroupId={activeAgeGroupId}
                      lang={lang}
                      onClick={() => { setSelectedNutrient(n); setDialogOpen(true); }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Meal Plan */}
            {activeTab === "meals" && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg">
                    {l("Weekly Indian Meal Plan", "साप्ताहिक भारतीय भोजन योजना", "Weekly Indian Meal Plan", lang)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {l(
                      "Age-appropriate Indian meals for every day of the week. Toggle Veg / Non-Veg.",
                      "हर दिन के लिए उम्र-उपयुक्त भारतीय भोजन। शाकाहारी / मांसाहारी चुनें।",
                      "Har din ke liye age-appropriate Indian meals. Veg/Non-Veg toggle karo.",
                      lang,
                    )}
                  </p>
                </div>
                <MealPlanSection ageGroupId={activeAgeGroupId} lang={lang} />
              </div>
            )}

            {/* Family Mode */}
            {activeTab === "family" && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg">
                    {l("Family Mode", "परिवार मोड", "Family Mode", lang)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {l(
                      "Same Indian meal — different portions for each family member by age. Cook once, serve smart!",
                      "एक ही भारतीय खाना — हर परिवार के सदस्य के लिए उम्र के अनुसार अलग हिस्से। एक बार बनाएं, स्मार्ट तरीके से परोसें!",
                      "Same Indian meal — different portions by age. Cook once, serve smart!",
                      lang,
                    )}
                  </p>
                </div>
                <FamilyModeSection lang={lang} />
              </div>
            )}

            {/* Score */}
            {activeTab === "score" && (
              <NutritionScoreSection ageGroupId={activeAgeGroupId} lang={lang} />
            )}
          </CardContent>
        </Card>

        {/* ── Medical Disclaimer ── */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
              {l("Medical Disclaimer", "चिकित्सा अस्वीकरण", "Medical Disclaimer", lang)}
            </p>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {lang === "hi" ? MEDICAL_DISCLAIMER.hi : MEDICAL_DISCLAIMER.en}
          </p>

          <button
            onClick={() => setShowRefs(!showRefs)}
            className="mt-3 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
          >
            <BookOpen className="h-3 w-3" />
            {showRefs
              ? l("Hide References", "स्रोत छुपाएं", "Hide References", lang)
              : l("Show References", "स्रोत दिखाएं", "Show References", lang)}
          </button>
          {showRefs && (
            <ol className="mt-2 space-y-1">
              {REFERENCES.map((ref, i) => (
                <li key={i} className="text-xs text-amber-600 dark:text-amber-400">{i + 1}. {ref}</li>
              ))}
            </ol>
          )}
        </div>

        {/* ── Growth Tracking Link ── */}
        <div className="rounded-2xl border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <p className="font-semibold">
                {l("Track Growth Progress", "वृद्धि प्रगति ट्रैक करें", "Track Growth Progress", lang)}
              </p>
              <p className="text-sm text-muted-foreground">
                {l(
                  "See height, weight & BMI trends",
                  "ऊंचाई, वजन और BMI ट्रेंड देखें",
                  "Height, weight & BMI trends dekho",
                  lang,
                )}
              </p>
            </div>
          </div>
          <a href="/progress">
            <Button variant="outline" size="sm" className="shrink-0">
              {l("View Progress", "प्रगति देखें", "View Progress", lang)}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </a>
        </div>
      </div>

      {/* ── Nutrient Detail Dialog ── */}
      <NutrientDetailDialog
        nutrient={selectedNutrient}
        ageGroupId={activeAgeGroupId}
        lang={lang}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedNutrient(null); }}
      />
    </div>
  );
}
