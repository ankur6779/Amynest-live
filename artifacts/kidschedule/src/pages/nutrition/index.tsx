import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AGE_GROUPS, NUTRIENTS, getMealPlan,
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
  ChevronRight, AlertTriangle, BookOpen,
  Leaf, Drumstick, CheckCircle2, AlertCircle, Activity,
  RefreshCw, Zap, Flame, Sun, CloudSnow, Wind, Loader2,
  Globe, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  useNutritionRegion, RegionConfig, RegionalFoodSource,
} from "@/lib/nutrition-region";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "nutrients" | "meals" | "family" | "score";

// ─── Score Colors ─────────────────────────────────────────────────────────────
function scoreColor(_s: number) { return "text-foreground"; }
function scoreBarColor(_s: number) { return "bg-primary"; }

// ─── NutrientDetailDialog ────────────────────────────────────────────────────
function NutrientDetailDialog({
  nutrient, ageGroupId, open, onClose, regionConfig, regionalSources, localizeNote,
}: {
  nutrient: Nutrient | null;
  ageGroupId: AgeGroupId;
  open: boolean;
  onClose: () => void;
  regionConfig: RegionConfig;
  regionalSources: RegionalFoodSource[] | null;
  localizeNote: (note?: string) => string | undefined;
}) {
  const { t } = useTranslation();
  if (!nutrient) return null;
  const need = nutrient.dailyNeeds[ageGroupId];
  const ageGroup = AGE_GROUPS.find(a => a.id === ageGroupId)!;
  const displaySources = regionalSources ?? nutrient.sources;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">{nutrient.emoji}</span>
            {nutrient.name}
          </DialogTitle>
        </DialogHeader>

        <div className={cn("rounded-xl p-4 flex items-start gap-3", nutrient.colorClass, nutrient.borderClass, "border")}>
          <Activity className={cn("h-5 w-5 mt-0.5 shrink-0", nutrient.textClass)} />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
              {t("nutrition_hub.dialog.daily_need", { age: ageGroup.label })}
            </p>
            <p className={cn("text-2xl font-bold", nutrient.textClass)}>
              {need.amount} <span className="text-base font-medium">{need.unit}</span>
            </p>
            {need.note && <p className="text-xs text-muted-foreground mt-1">{localizeNote(need.note)}</p>}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-foreground" />
            {t("nutrition_hub.dialog.benefits")}
          </h3>
          <ul className="space-y-1.5">
            {nutrient.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-foreground mt-0.5">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Salad className="h-4 w-4 text-foreground" />
            {regionConfig.foodSourceTitle}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {displaySources.map((src, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <span className="text-xl">{src.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{src.name}</span>
                    {src.type === "veg"
                      ? <Leaf className="h-3 w-3 text-foreground shrink-0" />
                      : <Drumstick className="h-3 w-3 text-foreground shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{src.serving} → <strong>{src.amount}</strong></p>
                  {"trustTag" in src && (src as RegionalFoodSource).trustTag && (
                    <p className="text-xs text-primary font-medium mt-0.5">{(src as RegionalFoodSource).trustTag}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Globe className="h-3 w-3" />
            {regionConfig.flag} {regionConfig.trustLabel}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-foreground" />
            {t("nutrition_hub.dialog.deficiency_signs")}
          </h3>
          <div className="rounded-xl bg-muted border border-border p-3 space-y-1.5">
            {nutrient.deficiencySymptoms.map((d, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <BookOpen className="h-3 w-3" />
          {regionConfig.sourceRef}
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
  const { t } = useTranslation();
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
      <p className="text-xs text-muted-foreground/70 italic mb-2">{nutrient.tagline}</p>
      <div className="rounded-lg px-2 py-1 text-xs font-semibold bg-background/60">
        <span className={nutrient.textClass}>{need.amount} {need.unit}</span>
        <span className="text-muted-foreground"> / {t("nutrition_hub.day")}</span>
      </div>
    </button>
  );
}

// ─── AI Meal Plan Section ─────────────────────────────────────────────────────
type MealEntry = { name: string; protein_g: number; carbs_g: number; fiber_g: number; calories: number };
type DayPlan = {
  day: string;
  meals: {
    breakfast: MealEntry; mid_morning: MealEntry;
    lunch: MealEntry; snack: MealEntry; dinner: MealEntry;
  }
};
type WeatherType = "hot" | "cold" | "moderate";

const MEAL_TIME_KEYS: { key: keyof DayPlan["meals"]; labelKey: string; emoji: string }[] = [
  { key: "breakfast",   labelKey: "nutrition_hub.meals.breakfast",   emoji: "🌅" },
  { key: "mid_morning", labelKey: "nutrition_hub.meals.mid_morning", emoji: "🍎" },
  { key: "lunch",       labelKey: "nutrition_hub.meals.lunch",       emoji: "🌞" },
  { key: "snack",       labelKey: "nutrition_hub.meals.snack",       emoji: "🍪" },
  { key: "dinner",      labelKey: "nutrition_hub.meals.dinner",      emoji: "🌙" },
];

function NutritionPill({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold", color)}>
      {icon}{value}{label}
    </span>
  );
}

function MealCard({ entry, emoji, label }: { entry: MealEntry; emoji: string; label: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{emoji}</span>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground leading-snug">{entry.name}</p>
      <div className="flex flex-wrap gap-1.5 mt-auto">
        <NutritionPill icon={<Flame className="w-3 h-3" />} value={entry.calories} label=" kcal" color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" /> {/* audit-ok: calorie indicator */}
        <NutritionPill icon={<Zap className="w-3 h-3" />} value={entry.protein_g} label="g prot" color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" /> {/* audit-ok: protein indicator */}
        <NutritionPill icon={<Activity className="w-3 h-3" />} value={entry.carbs_g} label="g carbs" color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" /> {/* audit-ok: carbs indicator */}
        <NutritionPill icon={<Leaf className="w-3 h-3" />} value={entry.fiber_g} label="g fiber" color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" /> {/* audit-ok: fiber indicator */}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-2">{[...Array(7)].map((_, i) => <div key={i} className="h-7 w-10 rounded-full bg-muted" />)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[...Array(5)].map((_, i) => <div key={i} className="rounded-xl border bg-muted/30 p-3 h-28" />)}
      </div>
    </div>
  );
}

function AIMealPlanSection({ onMealChange }: { onMealChange?: (mealName: string) => void }) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const [weather, setWeather] = useState<WeatherType>("moderate");
  const [dayIdx, setDayIdx] = useState(0);
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent when lunch changes (for Family Mode pre-fill)
  useEffect(() => {
    if (plan && plan[dayIdx]) {
      onMealChange?.(plan[dayIdx].meals.lunch.name);
    }
  }, [plan, dayIdx, onMealChange]);

  const generate = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/meals/week-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather, forceRefresh }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? `Server error ${res.status}`);
      }
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const data = await readResolvedApiJson<{ plan: DayPlan[]; generatedAt: string }>(res, authFetch);
      setPlan(data?.plan ?? []);
      setGeneratedAt(data?.generatedAt ?? "");
      setDayIdx(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [authFetch, weather]);

  const day = plan?.[dayIdx];

  const WEATHER_OPTIONS: { val: WeatherType; label: string; icon: React.ReactNode }[] = [
    { val: "hot",      label: t("nutrition_hub.ai_plan.weather_hot"),      icon: <Sun className="w-3.5 h-3.5" /> },
    { val: "moderate", label: t("nutrition_hub.ai_plan.weather_moderate"), icon: <Wind className="w-3.5 h-3.5" /> },
    { val: "cold",     label: t("nutrition_hub.ai_plan.weather_cold"),     icon: <CloudSnow className="w-3.5 h-3.5" /> },
  ];

  const dayShorts = t("nutrition_hub.days", { returnObjects: true }) as string[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t("nutrition_hub.ai_plan.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("nutrition_hub.ai_plan.subtitle")}</p>
        </div>
        {generatedAt && (
          <span className="text-xs text-muted-foreground self-end">
            {t("nutrition_hub.ai_plan.generated", { date: new Date(generatedAt).toLocaleDateString() })}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">{t("nutrition_hub.ai_plan.weather_label")}</span>
        <div className="flex rounded-full border overflow-hidden">
          {WEATHER_OPTIONS.map(({ val, label, icon }) => (
            <button
              key={val}
              onClick={() => setWeather(val)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                weather === val ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {!plan && !loading && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center space-y-3">
          <span className="text-4xl block">🤖</span>
          <p className="font-semibold text-foreground">{t("nutrition_hub.ai_plan.generate_cta")}</p>
          <p className="text-sm text-muted-foreground">{t("nutrition_hub.ai_plan.generate_desc")}</p>
          <Button onClick={() => generate(false)} className="gap-2">
            <Zap className="w-4 h-4" /> {t("nutrition_hub.ai_plan.generate_btn")}
          </Button>
        </div>
      )}

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{t("nutrition_hub.ai_plan.error_title")}</p>
            <p className="mt-0.5">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => generate(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t("nutrition_hub.ai_plan.retry")}
            </Button>
          </div>
        </div>
      )}

      {plan && !loading && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {plan.map((_, i) => (
              <button
                key={i}
                onClick={() => setDayIdx(i)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
                  dayIdx === i ? "bg-primary text-primary-foreground border-transparent" : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                )}
              >
                {Array.isArray(dayShorts) ? dayShorts[i] : ""}
              </button>
            ))}
          </div>

          {day && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MEAL_TIME_KEYS.map(mt => (
                <MealCard key={mt.key} entry={day.meals[mt.key]} emoji={mt.emoji} label={t(mt.labelKey)} />
              ))}
            </div>
          )}

          {day && (() => {
            const totals = MEAL_TIME_KEYS.reduce(
              (acc, mt) => ({
                calories: acc.calories + day.meals[mt.key].calories,
                protein_g: acc.protein_g + day.meals[mt.key].protein_g,
                carbs_g: acc.carbs_g + day.meals[mt.key].carbs_g,
                fiber_g: acc.fiber_g + day.meals[mt.key].fiber_g,
              }),
              { calories: 0, protein_g: 0, carbs_g: 0, fiber_g: 0 }
            );
            return (
              <div className="rounded-xl border bg-card p-3 flex flex-wrap gap-3 items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {t("nutrition_hub.ai_plan.daily_total")}
                </span>
                <div className="flex flex-wrap gap-2">
                  <NutritionPill icon={<Flame className="w-3 h-3" />} value={totals.calories} label=" kcal" color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" /> {/* audit-ok: calorie indicator */}
                  <NutritionPill icon={<Zap className="w-3 h-3" />} value={totals.protein_g} label="g protein" color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" /> {/* audit-ok: protein indicator */}
                  <NutritionPill icon={<Activity className="w-3 h-3" />} value={totals.carbs_g} label="g carbs" color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" /> {/* audit-ok: carbs indicator */}
                  <NutritionPill icon={<Leaf className="w-3 h-3" />} value={totals.fiber_g} label="g fiber" color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" /> {/* audit-ok: fiber indicator */}
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => generate(true)} disabled={loading}>
              <RefreshCw className="w-3.5 h-3.5" /> {t("nutrition_hub.ai_plan.regenerate")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Meal Plan Section — cuisine-aware static weekly plans ────────────────────
function MealPlanSection({ ageGroupId, foodStyle }: { ageGroupId: AgeGroupId; foodStyle?: string }) {
  const { t } = useTranslation();
  const plan = getMealPlan(ageGroupId, foodStyle);
  const [dayIdx, setDayIdx] = useState(0);
  const [isVeg, setIsVeg] = useState(true);

  if (!plan) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <span className="text-4xl block mb-2">🍼</span>
        <p className="font-medium">{t("nutrition_hub.breastfeeding.title")}</p>
        <p className="text-sm">{t("nutrition_hub.breastfeeding.desc")}</p>
      </div>
    );
  }

  const day = plan.days[dayIdx];
  const meal = isVeg ? day.veg : day.nonVeg;

  const mealTimes = [
    { time: `🌅 ${t("nutrition_hub.meals.breakfast")}`,   key: "breakfast",  color: "bg-muted border-border text-foreground" },
    meal.midMorning
      ? { time: `🍎 ${t("nutrition_hub.meals.mid_morning")}`, key: "midMorning", color: "bg-muted border-border text-foreground" }
      : null,
    { time: `🌞 ${t("nutrition_hub.meals.lunch")}`,        key: "lunch",      color: "bg-muted border-border text-foreground" },
    { time: `🍪 ${t("nutrition_hub.meals.snack")}`,        key: "snack",      color: "bg-muted border-border text-foreground" },
    { time: `🌙 ${t("nutrition_hub.meals.dinner")}`,       key: "dinner",     color: "bg-muted border-border text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-lg">{plan.ageCategory}</h3>
        <div className="flex rounded-full border overflow-hidden">
          <button
            onClick={() => setIsVeg(true)}
            className={cn("flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              isVeg ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
          >
            <Leaf className="h-3.5 w-3.5" /> {t("nutrition_hub.veg")}
          </button>
          <button
            onClick={() => setIsVeg(false)}
            className={cn("flex items-center gap-1 px-4 py-1.5 text-sm font-medium transition-colors",
              !isVeg ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
          >
            <Drumstick className="h-3.5 w-3.5" /> {t("nutrition_hub.non_veg")}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-muted border border-border p-3 text-sm">
        <p className="text-foreground">
          📏 <strong>{t("nutrition_hub.portions_label")}</strong>{" "}{plan.portionNote}
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {plan.days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDayIdx(i)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors",
              dayIdx === i ? "bg-primary text-primary-foreground border-transparent" : "bg-muted/60 text-muted-foreground border-border hover:bg-muted"
            )}
          >
            {d.day.slice(0, 3)}
          </button>
        ))}
      </div>

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

// ─── Family Mode — Dynamic AI Portion Generator ───────────────────────────────
type PortionEntry = { amount: string; texture: string | null };
type FamilyPortionResult = {
  meal: string;
  portions: { "6_12m": PortionEntry; "1_3y": PortionEntry; "4_8y": PortionEntry; "adult": PortionEntry };
  feeding_tip: string | null;
  allergy_note: string | null;
};

const AGE_SLOT_CONFIG: { key: keyof FamilyPortionResult["portions"]; icon: string; labelKey: string }[] = [
  { key: "6_12m", icon: "👶", labelKey: "nutrition_hub.family.age_6_12m" },
  { key: "1_3y",  icon: "🧒", labelKey: "nutrition_hub.family.age_1_3y" },
  { key: "4_8y",  icon: "👦", labelKey: "nutrition_hub.family.age_4_8y" },
  { key: "adult", icon: "👨", labelKey: "nutrition_hub.family.age_adult" },
];

function FamilyModeSection({ suggestedMeal }: { suggestedMeal?: string }) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();
  const [dishInput, setDishInput] = useState("");
  const [result, setResult] = useState<FamilyPortionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from meal planner when it becomes available
  useEffect(() => {
    if (suggestedMeal && !dishInput) setDishInput(suggestedMeal);
  }, [suggestedMeal]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = useCallback(async (forceRefresh = false) => {
    const dish = dishInput.trim();
    if (!dish) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/meals/family-portions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_name: dish, forceRefresh }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? `Server error ${res.status}`);
      }
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const data = await readResolvedApiJson<FamilyPortionResult>(res, authFetch);
      setResult(data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [authFetch, dishInput]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl bg-muted border border-border p-4">
        <Users className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-foreground">{t("nutrition_hub.family.section_title")}</p>
          <p className="text-sm text-foreground">{t("nutrition_hub.family.section_desc")}</p>
        </div>
      </div>

      {/* Dish Input */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">{t("nutrition_hub.family.enter_dish")}</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={dishInput}
              onChange={e => setDishInput(e.target.value)}
              placeholder={t("nutrition_hub.family.dish_placeholder")}
              onKeyDown={e => e.key === "Enter" && generate()}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>
          <Button
            onClick={() => generate()}
            disabled={loading || !dishInput.trim()}
            className="gap-2 shrink-0"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Zap className="w-4 h-4" />}
            {t("nutrition_hub.family.generate_btn")}
          </Button>
        </div>

        {/* Meal planner suggestion chip */}
        {suggestedMeal && dishInput !== suggestedMeal && (
          <button
            onClick={() => setDishInput(suggestedMeal)}
            className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10 transition"
          >
            <Globe className="w-3 h-3" />
            {t("nutrition_hub.family.use_from_planner", { meal: suggestedMeal })}
          </button>
        )}
      </div>

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
          <span className="text-4xl block">🍽️</span>
          <p className="text-sm text-muted-foreground">{t("nutrition_hub.family.empty_hint")}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-6 w-1/3 rounded-full bg-muted" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl border bg-muted/30" />)}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span>{error}</span>
            <Button variant="outline" size="sm" className="mt-2 ml-0 gap-1" onClick={() => generate(true)}>
              <RefreshCw className="w-3 h-3" /> {t("nutrition_hub.family.error_retry")}
            </Button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Dish name row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-xl">{result.meal}</h3>
            {result.allergy_note && (
              <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                {t("nutrition_hub.family.allergy_modified")}
              </Badge>
            )}
          </div>

          {/* Portion cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AGE_SLOT_CONFIG.map(ag => {
              const p = result.portions[ag.key];
              return (
                <div
                  key={ag.key}
                  className="rounded-xl border bg-card p-4 flex items-start gap-3 hover:shadow-sm transition-shadow"
                >
                  <span className="text-3xl shrink-0 leading-none mt-0.5">{ag.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                      {t(ag.labelKey)}
                    </p>
                    <p className="text-lg font-bold text-foreground leading-snug">{p.amount}</p>
                    {p.texture && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">{p.texture}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feeding tip */}
          {result.feeding_tip && (
            <div className="rounded-xl bg-muted border border-border p-3 flex items-start gap-2">
              <Brain className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                  {t("nutrition_hub.family.feeding_tip_label")}
                </p>
                <p className="text-sm text-foreground">{result.feeding_tip}</p>
              </div>
            </div>
          )}

          {/* Allergy note */}
          {result.allergy_note && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">{result.allergy_note}</p>
            </div>
          )}

          {/* Smart text + regenerate */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">{t("nutrition_hub.family.smart_text")}</p>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => generate(true)}>
              <RefreshCw className="w-3.5 h-3.5" /> {t("nutrition_hub.family.regenerate")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nutrition Score Section ──────────────────────────────────────────────────
function NutritionScoreSection({ ageGroupId }: { ageGroupId: AgeGroupId }) {
  const { t } = useTranslation();
  const ageGroup = AGE_GROUPS.find(a => a.id === ageGroupId)!;

  const [checkList, setCheckList] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCheckList(prev => ({ ...prev, [key]: !prev[key] }));

  const scoreChecklist = [
    { id: "breakfast",   labelKey: "nutrition_hub.score.checklist.breakfast" },
    { id: "protein",     labelKey: "nutrition_hub.score.checklist.protein" },
    { id: "dairy",       labelKey: "nutrition_hub.score.checklist.dairy" },
    { id: "greens",      labelKey: "nutrition_hub.score.checklist.greens" },
    { id: "fruit",       labelKey: "nutrition_hub.score.checklist.fruit" },
    { id: "water",       labelKey: "nutrition_hub.score.checklist.water" },
    { id: "noJunk",      labelKey: "nutrition_hub.score.checklist.no_junk" },
    { id: "wholegrains", labelKey: "nutrition_hub.score.checklist.wholegrains" },
  ];

  const checked = Object.values(checkList).filter(Boolean).length;
  const score = Math.round((checked / scoreChecklist.length) * 100);

  const scoreLabel =
    score >= 80 ? t("nutrition_hub.score.excellent") :
    score >= 60 ? t("nutrition_hub.score.good") :
    score >= 40 ? t("nutrition_hub.score.needs_attention") :
    t("nutrition_hub.score.critical");

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl bg-muted border border-border p-4">
        <Trophy className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-foreground">
            {t("nutrition_hub.score.checklist_title", { age: ageGroup.label })}
          </p>
          <p className="text-sm text-foreground">{t("nutrition_hub.score.checklist_subtitle")}</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 flex items-center gap-5">
        <div className={cn("text-6xl font-black tabular-nums", scoreColor(score))}>{score}</div>
        <div className="flex-1 space-y-2">
          <p className={cn("font-semibold text-lg", scoreColor(score))}>{scoreLabel}</p>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-500", scoreBarColor(score))} style={{ width: `${score}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("nutrition_hub.score.goals_met", { checked, total: scoreChecklist.length })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {scoreChecklist.map(item => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-all text-left",
              checkList[item.id] ? "bg-muted border-border" : "bg-card border-border hover:bg-muted/50",
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
              checkList[item.id] ? "bg-primary border-primary" : "border-muted-foreground/40",
            )}>
              {checkList[item.id] && <span className="text-primary-foreground text-xs">✓</span>}
            </div>
            <p className={cn("text-sm font-medium", checkList[item.id] && "line-through text-muted-foreground")}>
              {t(item.labelKey)}
            </p>
          </button>
        ))}
      </div>

      {score < 80 && (
        <div className="rounded-xl bg-muted border border-border p-4">
          <p className="flex items-center gap-2 font-semibold text-foreground text-sm mb-1">
            <Brain className="h-4 w-4" /> {t("nutrition_hub.score.ai_tip_title")}
          </p>
          <p className="text-sm text-foreground">
            {score < 40
              ? t("nutrition_hub.score.ai_tip_low")
              : score < 60
              ? t("nutrition_hub.score.ai_tip_mid")
              : t("nutrition_hub.score.ai_tip_high")}
          </p>
        </div>
      )}
      {score >= 80 && (
        <div className="rounded-xl bg-muted border border-border p-4 text-center">
          <p className="text-2xl mb-1">🌟</p>
          <p className="font-bold text-foreground">{t("nutrition_hub.score.outstanding")}</p>
          <p className="text-sm text-foreground">{t("nutrition_hub.score.keep_it_up")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NutritionHubPage() {
  const { t } = useTranslation();
  const { config: regionConfig, getRegional, localizeNote } = useNutritionRegion();
  const authFetch = useAuthFetch();
  const [activeAgeGroupId, setActiveAgeGroupId] = useState<AgeGroupId>("toddler_1_3");
  const [activeTab, setActiveTab] = useState<Tab>("nutrients");
  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showRefs, setShowRefs] = useState(false);
  // Shared state: last lunch meal name from AI meal planner → pre-fills Family Mode
  const [suggestedMeal, setSuggestedMeal] = useState("");

  // Parent's food style — used to pick the right cuisine meal plan
  const { data: parentProfile } = useQuery({
    queryKey: ["parent-profile-nutrition"],
    queryFn: async () => {
      const res = await authFetch("/api/parent-profile");
      if (!res.ok) return null;
      return res.json() as Promise<{ foodStyle?: string | null; region?: string | null }>;
    },
    staleTime: 5 * 60 * 1000,
  });
  // Prefer foodStyle (set during onboarding), fall back to region, then "mixed"
  const foodStyle = parentProfile?.foodStyle ?? parentProfile?.region ?? "mixed";

  const activeAgeGroup = AGE_GROUPS.find(a => a.id === activeAgeGroupId)!;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "nutrients", label: t("nutrition_hub.tabs.nutrients"), icon: <Apple className="h-4 w-4" /> },
    { id: "meals",     label: t("nutrition_hub.tabs.meals"),    icon: <CalendarDays className="h-4 w-4" /> },
    { id: "family",    label: t("nutrition_hub.tabs.family"),   icon: <Users className="h-4 w-4" /> },
    { id: "score",     label: t("nutrition_hub.tabs.score"),    icon: <Trophy className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Hero Header ── */}
      <div data-on-dark className="relative overflow-hidden bg-card text-primary-foreground px-4 pt-8 pb-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">🥗</span>
            <Badge className="bg-card text-primary-foreground border-border text-xs">
              {regionConfig.guidelineBadge}
            </Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight mt-2">{t("nutrition_hub.title")}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t("nutrition_hub.subtitle")}</p>
          <p className="text-primary-foreground text-sm mt-2 max-w-xl">{t("nutrition_hub.description")}</p>
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
              <p className="text-sm mt-2">{activeAgeGroup.description}</p>
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
                  ? "bg-primary text-primary-foreground border-transparent shadow"
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
            {activeTab === "nutrients" && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg">{t("nutrition_hub.nutrients.title")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t("nutrition_hub.nutrients.subtitle", { age: activeAgeGroup.label })}
                  </p>
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

            {activeTab === "meals" && (
              <AIMealPlanSection onMealChange={setSuggestedMeal} />
            )}

            {activeTab === "family" && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-bold text-lg">{t("nutrition_hub.family.page_title")}</h2>
                  <p className="text-sm text-muted-foreground">{t("nutrition_hub.family.page_subtitle")}</p>
                </div>
                <FamilyModeSection suggestedMeal={suggestedMeal} />
              </div>
            )}

            {activeTab === "score" && (
              <NutritionScoreSection ageGroupId={activeAgeGroupId} />
            )}
          </CardContent>
        </Card>

        {/* ── Medical Disclaimer ── */}
        <div className="rounded-2xl border border-border bg-muted p-4">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
            <p className="font-semibold text-foreground text-sm">{t("nutrition_hub.disclaimer.title")}</p>
          </div>
          <p className="text-sm text-foreground">{MEDICAL_DISCLAIMER.en}</p>
          <button
            onClick={() => setShowRefs(!showRefs)}
            className="mt-3 flex items-center gap-1 text-xs text-foreground hover:underline"
          >
            <BookOpen className="h-3 w-3" />
            {showRefs ? t("nutrition_hub.disclaimer.hide_refs") : t("nutrition_hub.disclaimer.show_refs")}
          </button>
          {showRefs && (
            <ol className="mt-2 space-y-1">
              {REFERENCES.map((ref, i) => (
                <li key={i} className="text-xs text-foreground">{i + 1}. {ref}</li>
              ))}
            </ol>
          )}
        </div>

        {/* ── Growth Tracking Link ── */}
        <div className="rounded-2xl border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📈</span>
            <div>
              <p className="font-semibold">{t("nutrition_hub.growth.title")}</p>
              <p className="text-sm text-muted-foreground">{t("nutrition_hub.growth.subtitle")}</p>
            </div>
          </div>
          <a href="/progress">
            <Button variant="outline" size="sm" className="shrink-0">
              {t("nutrition_hub.growth.cta")}
              <ChevronRight className="h-4 w-4 ml-1" />
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
        regionConfig={regionConfig}
        regionalSources={selectedNutrient ? getRegional(selectedNutrient.id) : null}
        localizeNote={localizeNote}
      />
    </div>
  );
}
