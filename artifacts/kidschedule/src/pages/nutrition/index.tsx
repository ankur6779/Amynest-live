import { useState } from "react";
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
function scoreLabel(s: number) {
  if (s >= 80) return "Excellent · शानदार 🌟";
  if (s >= 60) return "Good · अच्छा 👍";
  if (s >= 40) return "Needs Attention · ध्यान दें ⚠️";
  return "Critical · ध्यान जरूरी 🚨";
}

// ─── NutrientDetailDialog ────────────────────────────────────────────────────
function NutrientDetailDialog({
  nutrient, ageGroupId, open, onClose,
}: {
  nutrient: Nutrient | null;
  ageGroupId: AgeGroupId;
  open: boolean;
  onClose: () => void;
}) {
  if (!nutrient) return null;
  const need = nutrient.dailyNeeds[ageGroupId];
  const ageGroup = AGE_GROUPS.find(a => a.id === ageGroupId)!;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{nutrient.emoji}</span>
            {nutrient.name}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              — {nutrient.nameHi}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Daily Need Badge */}
        <div className={cn("rounded-xl p-4 flex items-start gap-3", nutrient.colorClass, nutrient.borderClass, "border")}>
          <Activity className={cn("h-5 w-5 mt-0.5 shrink-0", nutrient.textClass)} />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              Daily Need for {ageGroup.label} ({ageGroup.labelHi})
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
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Benefits (फायदे)
          </h3>
          <ul className="space-y-1.5">
            {nutrient.benefits.map((b, i) => (
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
            <Salad className="h-4 w-4 text-green-500" /> Indian Food Sources (भारतीय स्रोत)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nutrient.sources.map((src, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <span className="text-xl">{src.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{src.name}</span>
                    {src.type === "veg" ? (
                      <Leaf className="h-3 w-3 text-green-500 shrink-0" />
                    ) : (
                      <Drumstick className="h-3 w-3 text-orange-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{src.nameHi} · {src.serving} → <strong>{src.amount}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deficiency */}
        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-red-500" /> Deficiency Signs (कमी के लक्षण)
          </h3>
          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 space-y-1.5">
            {nutrient.deficiencySymptoms.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hindi deficiency */}
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">हिंदी में लक्षण:</p>
          {nutrient.deficiencyHi.map((d, i) => (
            <p key={i} className="text-sm text-amber-800 dark:text-amber-200">• {d}</p>
          ))}
        </div>

        {/* ICMR Reference */}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          Source: ICMR-NIN Nutrient Requirements for Indians (2020) & WHO Guidelines
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Nutrient Card ────────────────────────────────────────────────────────────
function NutrientCard({ nutrient, ageGroupId, onClick }: {
  nutrient: Nutrient;
  ageGroupId: AgeGroupId;
  onClick: () => void;
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
      <h3 className={cn("font-bold text-base", nutrient.textClass)}>{nutrient.name}</h3>
      <p className="text-xs text-muted-foreground mb-1">{nutrient.nameHi}</p>
      <p className="text-xs text-muted-foreground/70 italic mb-2">{nutrient.tagline}</p>
      <div className={cn("rounded-lg px-2 py-1 text-xs font-semibold", "bg-background/60")}>
        <span className={nutrient.textClass}>{need.amount} {need.unit}</span>
        <span className="text-muted-foreground"> / day</span>
      </div>
    </button>
  );
}

// ─── Meal Plan Section ────────────────────────────────────────────────────────
function MealPlanSection({ ageGroupId }: { ageGroupId: AgeGroupId }) {
  const plan = MEAL_PLANS.find(p => p.applies.includes(ageGroupId));
  const [dayIdx, setDayIdx] = useState(0);
  const [isVeg, setIsVeg] = useState(true);

  if (!plan) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="text-4xl block mb-2">🍼</span>
        <p className="font-medium">Exclusive breastfeeding recommended (0–6 months)</p>
        <p className="text-sm">WHO recommends only breast milk for the first 6 months. No other food or water is needed.</p>
        <p className="mt-2 text-sm text-violet-600 dark:text-violet-400">विश्व स्वास्थ्य संगठन 6 महीने तक केवल माँ के दूध की सलाह देता है।</p>
      </div>
    );
  }

  const day = plan.days[dayIdx];
  const meal = isVeg ? day.veg : day.nonVeg;

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg">{plan.ageCategory}</h3>
          <p className="text-sm text-muted-foreground">{plan.ageCategoryHi}</p>
        </div>
        {/* Veg / Non-veg toggle */}
        <div className="flex rounded-full border overflow-hidden">
          <button
            onClick={() => setIsVeg(true)}
            className={cn("flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              isVeg ? "bg-green-500 text-white" : "hover:bg-muted text-muted-foreground")}
          >
            <Leaf className="h-3.5 w-3.5" /> Veg
          </button>
          <button
            onClick={() => setIsVeg(false)}
            className={cn("flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              !isVeg ? "bg-orange-500 text-white" : "hover:bg-muted text-muted-foreground")}
          >
            <Drumstick className="h-3.5 w-3.5" /> Non-Veg
          </button>
        </div>
      </div>

      {/* Portion note */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm">
        <p className="text-blue-800 dark:text-blue-200">📏 <strong>Portions:</strong> {plan.portionNote}</p>
        <p className="text-blue-700 dark:text-blue-300 mt-1">{plan.portionNoteHi}</p>
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
        {[
          { time: "🌅 Breakfast", key: "breakfast", color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200" },
          meal.midMorning
            ? { time: "🍎 Mid-Morning", key: "midMorning", color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200" }
            : null,
          { time: "🌞 Lunch", key: "lunch", color: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200" },
          { time: "🍪 Snack", key: "snack", color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200" },
          { time: "🌙 Dinner", key: "dinner", color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200" },
        ].filter(Boolean).map((item) => {
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
function FamilyModeSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4">
        <Users className="h-5 w-5 text-violet-600 dark:text-violet-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-violet-800 dark:text-violet-200">Family Mode — एक खाना, अलग-अलग हिस्से</p>
          <p className="text-sm text-violet-700 dark:text-violet-300">
            Cook one meal for the whole family and serve age-appropriate portions. No need for separate cooking!
          </p>
        </div>
      </div>

      {/* Responsive table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b">
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground min-w-[140px]">Food Item</th>
              <th className="text-center px-3 py-2.5 font-semibold text-pink-600 dark:text-pink-400">🍼<br /><span className="text-xs">6–12m</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-purple-600 dark:text-purple-400">🧒<br /><span className="text-xs">1–3y</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-blue-600 dark:text-blue-400">📚<br /><span className="text-xs">6–10y</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-cyan-600 dark:text-cyan-400">🌱<br /><span className="text-xs">10–15y</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-teal-600 dark:text-teal-400">👨‍👩<br /><span className="text-xs">Adult</span></th>
              <th className="text-center px-3 py-2.5 font-semibold text-violet-600 dark:text-violet-400">🤰<br /><span className="text-xs">Pregnant</span></th>
            </tr>
          </thead>
          <tbody>
            {FAMILY_PORTIONS.map((row, i) => (
              <tr key={i} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", i % 2 === 0 ? "" : "bg-muted/20")}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{row.emoji}</span>
                    <div>
                      <p className="font-medium">{row.food}</p>
                      <p className="text-xs text-muted-foreground">{row.foodHi}</p>
                    </div>
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
      <p className="text-xs text-muted-foreground">* Portions are approximate. Adjust based on child's appetite and hunger cues. 1 katori ≈ 150ml cup.</p>
    </div>
  );
}

// ─── Nutrition Score Section ──────────────────────────────────────────────────
function NutritionScoreSection({ ageGroupId }: { ageGroupId: AgeGroupId }) {
  const ageGroup = AGE_GROUPS.find(a => a.id === ageGroupId)!;

  const [checkList, setCheckList] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setCheckList(prev => ({ ...prev, [key]: !prev[key] }));

  const scoreChecklist = [
    { id: "breakfast", label: "Had a wholesome breakfast today", labelHi: "आज पौष्टिक नाश्ता किया" },
    { id: "protein", label: "Ate a protein source (dal / egg / paneer / meat)", labelHi: "प्रोटीन लिया (दाल/अंडा/पनीर/मांस)" },
    { id: "dairy", label: "Consumed dairy or calcium source", labelHi: "डेयरी या कैल्शियम स्रोत लिया" },
    { id: "greens", label: "Ate green leafy vegetables (palak / methi / etc)", labelHi: "हरी पत्तेदार सब्जी खाई" },
    { id: "fruit", label: "Had at least 1 fruit today", labelHi: "आज कम से कम 1 फल खाया" },
    { id: "water", label: "Drank adequate water / fluids", labelHi: "पर्याप्त पानी पिया" },
    { id: "noJunk", label: "Avoided junk food / packaged snacks", labelHi: "जंक फूड से बचे" },
    { id: "wholegrains", label: "Whole grains instead of refined (atta roti vs maida)", labelHi: "साबुत अनाज चुना (आटे की रोटी)" },
  ];

  const checked = Object.values(checkList).filter(Boolean).length;
  const score = Math.round((checked / scoreChecklist.length) * 100);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
        <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">Daily Nutrition Checklist for {ageGroup.label}</p>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Check what was eaten today to get a quick nutrition score · आज के खाने का विवरण चेक करें</p>
        </div>
      </div>

      {/* Score Display */}
      <div className="rounded-2xl border bg-card p-5 flex items-center gap-5">
        <div className={cn("text-6xl font-black tabular-nums", scoreColor(score))}>{score}</div>
        <div className="flex-1 space-y-2">
          <p className={cn("font-semibold text-lg", scoreColor(score))}>{scoreLabel(score)}</p>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", scoreBarColor(score))}
              style={{ width: `${score}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{checked} of {scoreChecklist.length} daily nutrition goals met</p>
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
            <div>
              <p className={cn("text-sm font-medium", checkList[item.id] && "line-through text-muted-foreground")}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{item.labelHi}</p>
            </div>
          </button>
        ))}
      </div>

      {/* AI Tip */}
      {score < 80 && (
        <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 p-4">
          <p className="flex items-center gap-2 font-semibold text-violet-800 dark:text-violet-200 text-sm mb-1">
            <Brain className="h-4 w-4" /> Amy AI Nutrition Tip
          </p>
          <p className="text-sm text-violet-700 dark:text-violet-300">
            {score < 40
              ? "Today's nutrition needs a boost! Try adding dal at lunch, a fruit snack, and a glass of milk to quickly improve your score. · आज पोषण बेहतर करें — दाल, फल और दूध जरूर लें।"
              : score < 60
              ? "You're on the right track! Make sure to include green leafy vegetables — palak, methi, or drumstick leaves are excellent. · हरी पत्तेदार सब्जी जरूर लें।"
              : "Almost there! Swap refined snacks for a handful of roasted chana or nuts to get that final boost. · भुने चने या मेवे से स्कोर बढ़ाएं।"}
          </p>
        </div>
      )}
      {score >= 80 && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <p className="text-2xl mb-1">🌟</p>
          <p className="font-bold text-emerald-700 dark:text-emerald-300">Outstanding nutrition day! · शानदार पोषण दिन!</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Keep it up tomorrow too. Consistency is the key to health. · हर दिन यही करें — यही स्वास्थ्य की कुंजी है।</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NutritionHubPage() {
  const [activeAgeGroupId, setActiveAgeGroupId] = useState<AgeGroupId>("toddler_1_3");
  const [activeTab, setActiveTab] = useState<Tab>("nutrients");
  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showRefs, setShowRefs] = useState(false);

  const activeAgeGroup = AGE_GROUPS.find(a => a.id === activeAgeGroupId)!;

  const tabs: { id: Tab; label: string; labelHi: string; icon: React.ReactNode }[] = [
    { id: "nutrients", label: "Nutrient Library", labelHi: "पोषक तत्व", icon: <Apple className="h-4 w-4" /> },
    { id: "meals", label: "Meal Planner", labelHi: "साप्ताहिक थाली", icon: <CalendarDays className="h-4 w-4" /> },
    { id: "family", label: "Family Mode", labelHi: "परिवार मोड", icon: <Users className="h-4 w-4" /> },
    { id: "score", label: "Daily Score", labelHi: "दैनिक स्कोर", icon: <Trophy className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white px-4 pt-8 pb-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🥗</span>
            <Badge className="bg-white/20 text-white border-white/30 text-xs">Science-backed · WHO / ICMR</Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-2">Nutrition Hub</h1>
          <p className="text-violet-200 text-sm mt-0.5">न्यूट्रिशन हब · Poshan Ka Ghar</p>
          <p className="text-white/80 text-sm mt-2 max-w-xl">
            Age-specific nutrition science for your whole family — backed by ICMR-NIN & WHO guidelines.
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
                <span className="hidden sm:inline">{ag.label}</span>
                <span className="sm:hidden">{ag.label.split(" ")[0]}</span>
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
              <h2 className={cn("font-bold text-xl", activeAgeGroup.textClass)}>{activeAgeGroup.label}</h2>
              <p className="text-sm text-muted-foreground">{activeAgeGroup.labelHi} · {activeAgeGroup.labelHinglish}</p>
              <p className="text-sm mt-2">{activeAgeGroup.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeAgeGroup.descriptionHi}</p>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">Nutrient Library · पोषक तत्व पुस्तकालय</h2>
                    <p className="text-sm text-muted-foreground">Tap any nutrient to see benefits, Indian food sources, and daily needs for {activeAgeGroup.label}.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {NUTRIENTS.map(n => (
                    <NutrientCard
                      key={n.id}
                      nutrient={n}
                      ageGroupId={activeAgeGroupId}
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
                  <h2 className="font-bold text-lg">Weekly Indian Meal Plan · साप्ताहिक भोजन योजना</h2>
                  <p className="text-sm text-muted-foreground">Age-appropriate Indian meals for every day of the week. Toggle Veg / Non-Veg.</p>
                </div>
                <MealPlanSection ageGroupId={activeAgeGroupId} />
              </div>
            )}

            {/* Family Mode */}
            {activeTab === "family" && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg">Family Mode · परिवार मोड</h2>
                  <p className="text-sm text-muted-foreground">Same Indian meal — different portions for each family member by age. Cook once, serve smart!</p>
                </div>
                <FamilyModeSection />
              </div>
            )}

            {/* Score */}
            {activeTab === "score" && (
              <NutritionScoreSection ageGroupId={activeAgeGroupId} />
            )}
          </CardContent>
        </Card>

        {/* ── Medical Disclaimer ── */}
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Medical Disclaimer · चिकित्सा अस्वीकरण</p>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">{MEDICAL_DISCLAIMER.en}</p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">{MEDICAL_DISCLAIMER.hi}</p>

          <button
            onClick={() => setShowRefs(!showRefs)}
            className="mt-3 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
          >
            <BookOpen className="h-3 w-3" />
            {showRefs ? "Hide" : "Show"} References / स्रोत
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
              <p className="font-semibold">Track Growth Progress</p>
              <p className="text-sm text-muted-foreground">बच्चे की वृद्धि ट्रैक करें · See height, weight &amp; BMI trends</p>
            </div>
          </div>
          <a href="/progress">
            <Button variant="outline" size="sm" className="shrink-0">
              View Progress <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </a>
        </div>
      </div>

      {/* ── Nutrient Detail Dialog ── */}
      <NutrientDetailDialog
        nutrient={selectedNutrient}
        ageGroupId={activeAgeGroupId}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedNutrient(null); }}
      />
    </div>
  );
}
