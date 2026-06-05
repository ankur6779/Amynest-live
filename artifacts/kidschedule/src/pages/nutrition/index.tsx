import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AGE_GROUPS, NUTRIENTS, getMealPlan,
  MEDICAL_DISCLAIMER, REFERENCES, AgeGroupId, Nutrient, DailyNeed, AgeGroup,
} from "@/lib/nutrition-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PARENT_HUB_PAGE,
  NUTRITION_HUB_ACCENT,
  NUTRITION_HUB_CHIP_ACTIVE,
  NUTRITION_HUB_CHIP_INACTIVE,
  HUB_AGE_BADGE,
  HUB_SECTION_TITLE,
  HUB_BODY,
  HUB_INFO_BANNER,
  HUB_TILE,
  HUB_GLASS_SURFACE,
  hubSectionCardClasses,
  hubAccentBarClasses,
} from "@/lib/parent-hub-premium";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { NutritionLibrarySection } from "@/components/nutrition-library/nutrition-library-section";
import {
  Apple, Salad, CalendarDays, Users, Trophy, Brain,
  ChevronRight, ChevronDown, AlertTriangle, BookOpen, Library,
  Leaf, Drumstick, CheckCircle2, AlertCircle, Activity,
  RefreshCw, Zap, Flame, Sun, CloudSnow, Wind, Loader2,
  Globe, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  useNutritionRegion, RegionConfig, RegionalFoodSource,
} from "@/lib/nutrition-region";
import { LockedBlock } from "@/components/locked-block";
import { TryFreeBadge } from "@/components/try-free-badge";
import { useFeatureUsage } from "@/hooks/use-feature-usage";
import { usePaywall } from "@/contexts/paywall-context";

const NUTRITION_WEEK_PLAN_FEATURE = "nutrition_week_plan";
const NUTRITION_FAMILY_AI_FEATURE = "nutrition_family_ai";

const PRIORITY_NUTRIENT_IDS = ["protein", "iron", "calcium", "vitamin_a"] as const;

function formatDailyNeed(need: DailyNeed): string {
  return `${need.amount} ${need.unit}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "nutrients" | "meals" | "family" | "library" | "score";

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
function NutrientCard({ nutrient, ageGroupId, onClick, compact = false }: {
  nutrient: Nutrient;
  ageGroupId: AgeGroupId;
  onClick: () => void;
  compact?: boolean;
}) {
  const need = nutrient.dailyNeeds[ageGroupId];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group w-full min-w-0 rounded-xl sm:rounded-2xl border border-white/[0.08]",
        "bg-gradient-to-br from-white/[0.04] to-white/[0.02]",
        "text-left flex flex-col items-stretch transition-all duration-[220ms] ease-[ease]",
        "hover:-translate-y-0.5 hover:border-emerald-400/25 hover:shadow-[0_0_16px_rgba(52,211,153,0.12)]",
        "active:scale-[0.985]",
        compact ? "p-3 min-h-[104px] sm:min-h-0 sm:p-4" : "p-4",
      )}
    >
      <div className={cn("flex items-start justify-between", compact ? "mb-1.5" : "mb-2")}>
        <span className={compact ? "text-2xl sm:text-3xl" : "text-3xl"}>{nutrient.emoji}</span>
        <ChevronRight className="hidden sm:block h-4 w-4 mt-1 opacity-50 group-hover:opacity-100 transition-opacity text-emerald-300/80 shrink-0" />
      </div>
      <h3 className={cn("font-bold text-foreground truncate w-full", compact ? "text-sm sm:text-base" : "text-base")}>
        {nutrient.name}
      </h3>
      <p className={cn(
        "text-xs text-muted-foreground/70 italic",
        compact ? "hidden sm:block mb-2" : "mb-2",
      )}>
        {nutrient.tagline}
      </p>
      <div className={cn(
        "rounded-lg font-semibold bg-white/[0.06] border border-white/[0.08] mt-auto",
        compact ? "px-2 py-1 text-[11px] sm:text-xs" : "px-2 py-1 text-xs",
      )}>
        <span className="text-emerald-200/90 line-clamp-2 sm:line-clamp-none">{formatDailyNeed(need)}</span>
      </div>
    </button>
  );
}

// ─── Nutrients Section (priority grid + show more) ───────────────────────────
function NutrientsSection({
  ageGroupId,
  activeAgeGroup,
  onSelectNutrient,
}: {
  ageGroupId: AgeGroupId;
  activeAgeGroup: AgeGroup;
  onSelectNutrient: (nutrient: Nutrient) => void;
}) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const priorityNutrients = NUTRIENTS.filter(n =>
    (PRIORITY_NUTRIENT_IDS as readonly string[]).includes(n.id),
  );
  const secondaryNutrients = NUTRIENTS.filter(n =>
    !(PRIORITY_NUTRIENT_IDS as readonly string[]).includes(n.id),
  );
  const visibleNutrients = showAll ? NUTRIENTS : priorityNutrients;

  return (
    <div className="space-y-3 min-w-0">
      <div>
        <h2 className="font-quicksand text-lg sm:text-[22px] font-bold tracking-tight text-foreground">
          {t("nutrition_hub.nutrients.title")}
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground mt-1">
          {t("nutrition_hub.nutrients.subtitle", { age: activeAgeGroup.label })}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 min-w-0">
        {visibleNutrients.map(n => (
          <NutrientCard
            key={n.id}
            nutrient={n}
            ageGroupId={ageGroupId}
            compact
            onClick={() => onSelectNutrient(n)}
          />
        ))}
      </div>

      {!showAll && secondaryNutrients.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-white/15 bg-white/[0.04] hover:bg-white/[0.08]"
          onClick={() => setShowAll(true)}
        >
          {t("nutrition_hub.nutrients.show_more", { count: secondaryNutrients.length })}
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      )}

      {showAll && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowAll(false)}
        >
          {t("nutrition_hub.nutrients.show_less")}
        </Button>
      )}
    </div>
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
    <div className={cn(HUB_TILE, "rounded-xl p-3 flex flex-col gap-2")}>
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
  const usage = useFeatureUsage();
  const { openPaywall } = usePaywall();
  const mealLocked = usage.isFeatureLocked(NUTRITION_WEEK_PLAN_FEATURE);
  const mealTryFree = !usage.isPremium && !usage.hasUsedFeature(NUTRITION_WEEK_PLAN_FEATURE);
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
    if (!usage.isPremium && (mealLocked || (forceRefresh && usage.hasUsedFeature(NUTRITION_WEEK_PLAN_FEATURE)))) {
      openPaywall("hub_nutrition");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/meals/week-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weather, forceRefresh }),
      });
      if (res.status === 402) {
        const j = await res.json().catch(() => ({})) as { error?: string; feature?: string };
        if (j.error === "feature_locked" || j.feature === NUTRITION_WEEK_PLAN_FEATURE) {
          openPaywall("hub_nutrition");
          return;
        }
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? `Server error ${res.status}`);
      }
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const data = await readResolvedApiJson<{ plan: DayPlan[]; generatedAt: string }>(res, authFetch);
      setPlan(data?.plan ?? []);
      setGeneratedAt(data?.generatedAt ?? "");
      setDayIdx(0);
      if (mealTryFree) {
        usage.markFeatureUsed(NUTRITION_WEEK_PLAN_FEATURE);
        usage.markFeatureUsed("hub_nutrition");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [authFetch, weather, usage, mealLocked, mealTryFree, openPaywall]);

  const day = plan?.[dayIdx];

  const WEATHER_OPTIONS: { val: WeatherType; label: string; icon: React.ReactNode }[] = [
    { val: "hot",      label: t("nutrition_hub.ai_plan.weather_hot"),      icon: <Sun className="w-3.5 h-3.5" /> },
    { val: "moderate", label: t("nutrition_hub.ai_plan.weather_moderate"), icon: <Wind className="w-3.5 h-3.5" /> },
    { val: "cold",     label: t("nutrition_hub.ai_plan.weather_cold"),     icon: <CloudSnow className="w-3.5 h-3.5" /> },
  ];

  const dayShorts = t("nutrition_hub.days", { returnObjects: true }) as string[];

  return (
    <LockedBlock locked={mealLocked && !plan}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            {t("nutrition_hub.ai_plan.title")}
            {mealTryFree && <TryFreeBadge />}
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
        <div className="flex rounded-full border border-white/[0.1] overflow-hidden bg-[rgba(18,28,60,0.72)]">
          {WEATHER_OPTIONS.map(({ val, label, icon }) => (
            <button
              key={val}
              onClick={() => setWeather(val)}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors",
                weather === val
                  ? "bg-[rgba(255,184,0,0.18)] text-foreground"
                  : "hover:bg-white/[0.05] text-muted-foreground",
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {!plan && !loading && (
        <div className={cn(HUB_GLASS_SURFACE, "border border-dashed border-emerald-400/35 p-6 text-center space-y-3")}>
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
                  dayIdx === i
                    ? "border-[rgba(255,184,0,0.55)] bg-[rgba(255,184,0,0.14)] text-foreground"
                    : "border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]",
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
              <div className={cn(HUB_TILE, "rounded-xl p-3 flex flex-wrap gap-3 items-center justify-between")}>
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
    </LockedBlock>
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
              dayIdx === i
                ? "border-[rgba(255,184,0,0.55)] bg-[rgba(255,184,0,0.14)] text-foreground"
                : "border-white/[0.08] bg-white/[0.04] text-muted-foreground hover:bg-white/[0.06]",
            )}
          >
            {d.day.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
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
  const usage = useFeatureUsage();
  const { openPaywall } = usePaywall();
  const familyLocked = usage.isFeatureLocked(NUTRITION_FAMILY_AI_FEATURE);
  const familyTryFree = !usage.isPremium && !usage.hasUsedFeature(NUTRITION_FAMILY_AI_FEATURE);
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
    if (!usage.isPremium && (familyLocked || (forceRefresh && usage.hasUsedFeature(NUTRITION_FAMILY_AI_FEATURE)))) {
      openPaywall("hub_nutrition");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/meals/family-portions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_name: dish, forceRefresh }),
      });
      if (res.status === 402) {
        const j = await res.json().catch(() => ({})) as { error?: string; feature?: string };
        if (j.error === "feature_locked" || j.feature === NUTRITION_FAMILY_AI_FEATURE) {
          openPaywall("hub_nutrition");
          return;
        }
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? `Server error ${res.status}`);
      }
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const data = await readResolvedApiJson<FamilyPortionResult>(res, authFetch);
      setResult(data ?? null);
      if (familyTryFree) {
        usage.markFeatureUsed(NUTRITION_FAMILY_AI_FEATURE);
        usage.markFeatureUsed("hub_nutrition");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [authFetch, dishInput, usage, familyLocked, familyTryFree, openPaywall]);

  return (
    <LockedBlock locked={familyLocked && !result}>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl bg-muted border border-border p-4">
        <Users className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
            {t("nutrition_hub.family.section_title")}
            {familyTryFree && <TryFreeBadge />}
          </p>
          <p className="text-sm text-foreground">{t("nutrition_hub.family.section_desc")}</p>
        </div>
      </div>

      {/* Dish Input */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">{t("nutrition_hub.family.enter_dish")}</label>
        <div className="flex gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
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
    </LockedBlock>
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
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [ageInfoExpanded, setAgeInfoExpanded] = useState(false);
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

  const tabs: { id: Tab; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: "nutrients", label: t("nutrition_hub.tabs.nutrients"),       shortLabel: t("nutrition_hub.tabs_short.nutrients"), icon: <Apple className="h-4 w-4" /> },
    { id: "meals",     label: t("nutrition_hub.tabs.meals"),          shortLabel: t("nutrition_hub.tabs_short.meals"),     icon: <CalendarDays className="h-4 w-4" /> },
    { id: "family",    label: t("nutrition_hub.tabs.family"),         shortLabel: t("nutrition_hub.tabs_short.family"),    icon: <Users className="h-4 w-4" /> },
    { id: "library",   label: t("nutrition_hub.tabs.library"),        shortLabel: t("nutrition_hub.tabs_short.library"),   icon: <Library className="h-4 w-4" /> },
    { id: "score",     label: t("nutrition_hub.tabs.score"),           shortLabel: t("nutrition_hub.tabs_short.score"),     icon: <Trophy className="h-4 w-4" /> },
  ];

  const handleSelectNutrient = (nutrient: Nutrient) => {
    setSelectedNutrient(nutrient);
    setDialogOpen(true);
  };

  return (
    <div className={cn(PARENT_HUB_PAGE, "w-full min-w-0 max-w-4xl mx-auto space-y-3 sm:space-y-4 pb-24 overflow-x-clip")}>
      {/* ── Hero Header (compact on mobile) ── */}
      <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "hub-page-enter overflow-hidden")}>
        <div className="flex">
          <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
          <div className="relative flex-1 min-w-0 px-3 py-3 sm:px-4 sm:py-6">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className={cn(NUTRITION_HUB_ACCENT.emojiShell, "w-10 h-10 sm:w-12 sm:h-12 text-xl sm:text-2xl")}>🥗</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-quicksand text-lg sm:text-[22px] font-bold tracking-tight text-foreground">
                      {t("nutrition_hub.title")}
                    </h1>
                    <span className={HUB_AGE_BADGE}>{regionConfig.guidelineBadge}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{t("nutrition_hub.subtitle")}</p>
                </div>
              </div>
              <p className={cn(
                HUB_BODY,
                "mt-2 max-w-xl text-foreground/80 opacity-100",
                heroExpanded ? "block" : "hidden sm:block",
              )}>
                {t("nutrition_hub.description")}
              </p>
              <button
                type="button"
                onClick={() => setHeroExpanded(v => !v)}
                className="mt-1.5 flex items-center gap-1 text-xs text-emerald-200/80 hover:underline sm:hidden"
              >
                {heroExpanded ? t("nutrition_hub.hero.show_less") : t("nutrition_hub.hero.learn_more")}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", heroExpanded && "rotate-180")} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky: Age chips + tabs ── */}
      <div className="sticky top-0 z-20 py-2 space-y-2 backdrop-blur-md bg-[#0b1730]/85">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0">
          {AGE_GROUPS.map(ag => (
            <button
              key={ag.id}
              onClick={() => {
                setActiveAgeGroupId(ag.id);
                setAgeInfoExpanded(false);
              }}
              className={cn(
                activeAgeGroupId === ag.id ? NUTRITION_HUB_CHIP_ACTIVE : NUTRITION_HUB_CHIP_INACTIVE,
                "flex shrink-0 items-center gap-1.5",
              )}
            >
              <span>{ag.emoji}</span>
              <span className="hidden sm:inline">{ag.label}</span>
              <span className="sm:hidden">{ag.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Mobile: equal-width 5-column grid so every tab is fully visible */}
        <div className="grid grid-cols-5 gap-1 w-full sm:hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                activeTab === tab.id ? NUTRITION_HUB_CHIP_ACTIVE : NUTRITION_HUB_CHIP_INACTIVE,
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2",
                "text-[10px] font-bold leading-tight text-center",
              )}
            >
              <span className="[&_svg]:h-3.5 [&_svg]:w-3.5 shrink-0">{tab.icon}</span>
              <span className="w-full truncate px-0.5">{tab.shortLabel}</span>
            </button>
          ))}
        </div>

        {/* Desktop: horizontal chips with full labels */}
        <div className="hidden sm:flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                activeTab === tab.id ? NUTRITION_HUB_CHIP_ACTIVE : NUTRITION_HUB_CHIP_INACTIVE,
                "flex shrink-0 items-center gap-1.5 text-sm",
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {/* ── Age Group Info Card (collapsed on mobile by default) ── */}
        <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "hub-page-enter overflow-hidden")}>
          <div className="flex">
            <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
            <div className="flex flex-1 min-w-0 items-center sm:items-start gap-2 sm:gap-3 p-2.5 sm:p-4">
              <span className="text-2xl sm:text-4xl shrink-0">{activeAgeGroup.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center sm:items-start justify-between gap-2">
                  <h2 className="font-quicksand font-bold text-sm sm:text-xl text-foreground truncate">
                    {activeAgeGroup.label}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAgeInfoExpanded(v => !v)}
                    className="sm:hidden shrink-0 flex items-center gap-0.5 text-xs text-emerald-200/80 hover:underline"
                  >
                    {ageInfoExpanded ? t("nutrition_hub.age_info.show_less") : t("nutrition_hub.age_info.show_more")}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", ageInfoExpanded && "rotate-180")} />
                  </button>
                </div>
                <p className={cn(
                  HUB_BODY,
                  "mt-1 sm:mt-2 opacity-100 sm:line-clamp-none",
                  ageInfoExpanded ? "block" : "hidden sm:block",
                )}>
                  {activeAgeGroup.description}
                </p>
                <div className={cn(
                  "flex flex-wrap gap-1.5 mt-2",
                  ageInfoExpanded ? "flex" : "hidden sm:flex",
                )}>
                  {activeAgeGroup.keyFocus.map((f, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs border-white/15 bg-white/[0.06] text-foreground/90"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "nutrients" ? (
          <div className="hub-page-enter min-w-0">
            <NutrientsSection
              ageGroupId={activeAgeGroupId}
              activeAgeGroup={activeAgeGroup}
              onSelectNutrient={handleSelectNutrient}
            />
          </div>
        ) : (
          <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "hub-page-enter overflow-hidden")}>
            <div className="flex">
              <div className={hubAccentBarClasses(NUTRITION_HUB_ACCENT)} />
              <div className="min-w-0 flex-1 p-4 sm:p-6">
                {activeTab === "meals" && (
                  <AIMealPlanSection onMealChange={setSuggestedMeal} />
                )}

                {activeTab === "family" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className={HUB_SECTION_TITLE}>{t("nutrition_hub.family.page_title")}</h2>
                      <p className={HUB_BODY}>{t("nutrition_hub.family.page_subtitle")}</p>
                    </div>
                    <FamilyModeSection suggestedMeal={suggestedMeal} />
                  </div>
                )}

                {activeTab === "library" && <NutritionLibrarySection />}

                {activeTab === "score" && (
                  <NutritionScoreSection ageGroupId={activeAgeGroupId} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Medical Disclaimer ── */}
        <div className={cn(HUB_INFO_BANNER, "flex-col items-stretch gap-0")}>
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-300/90 mt-0.5 shrink-0" />
            <p className="font-semibold text-foreground text-sm">{t("nutrition_hub.disclaimer.title")}</p>
          </div>
          <p className="text-sm text-muted-foreground">{MEDICAL_DISCLAIMER.en}</p>
          <button
            onClick={() => setShowRefs(!showRefs)}
            className="mt-3 flex items-center gap-1 text-xs text-emerald-200/80 hover:underline"
          >
            <BookOpen className="h-3 w-3" />
            {showRefs ? t("nutrition_hub.disclaimer.hide_refs") : t("nutrition_hub.disclaimer.show_refs")}
          </button>
          {showRefs && (
            <ol className="mt-2 space-y-1">
              {REFERENCES.map((ref, i) => (
                <li key={i} className="text-xs text-muted-foreground">{i + 1}. {ref}</li>
              ))}
            </ol>
          )}
        </div>

        {/* ── Growth Tracking Link ── */}
        <div className={cn(hubSectionCardClasses(NUTRITION_HUB_ACCENT), "overflow-hidden")}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 min-w-0">
            <div className="flex items-center gap-3">
              <div className={cn(NUTRITION_HUB_ACCENT.emojiShell, "w-10 h-10 text-xl")}>📈</div>
              <div>
                <p className="font-semibold text-foreground">{t("nutrition_hub.growth.title")}</p>
                <p className={HUB_BODY}>{t("nutrition_hub.growth.subtitle")}</p>
              </div>
            </div>
            <a href="/progress">
              <Button variant="outline" size="sm" className="shrink-0 border-white/15 bg-white/[0.05] hover:bg-white/[0.08]">
                {t("nutrition_hub.growth.cta")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </a>
          </div>
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
