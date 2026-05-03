import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { AmyIcon } from "@/components/amy-icon";
import { Utensils, X, Volume2, VolumeX, ChefHat, Flame, Clock, Loader2, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
interface AiMeal {
  id: string;
  title: string;
  emoji: string;
  bgGradient: [string, string];
  region: string;
  category: string;
  ingredients: string[];
  steps: string[];
  calories: number;
  tags: string[];
  prepMinutes: number;
  audioText: string;
  isVeg: boolean;
  matchedIngredients: string[];
  missingIngredients: string[];
}
interface AiGenerateResult {
  meals: AiMeal[];
  amyMessage: string;
}
type Audience = "kids_tiffin" | "parent_healthy";

// ElevenLabs Indian voice IDs.
// Both work well for the "Amy" persona narrating in English.
const VOICE_FEMALE_ID = "QbQKfe9vgx5OsbZUvlFv"; // Ananya K — Indian English Female
const VOICE_MALE_ID = "oaz5NvoRIhcJystOASAA"; // Karthik — Indian English Male
const STORAGE_VOICE = "amynest.tts_voice.v1";
function loadVoicePref(): "female" | "male" {
  try {
    const v = localStorage.getItem(STORAGE_VOICE);
    return v === "male" ? "male" : "female";
  } catch {
    return "female";
  }
}
const PLACEHOLDER_QUERIES: Record<Audience, string[]> = {
  kids_tiffin: ["Quick tiffin for school morning using paneer", "Healthy snack for 6-year-old with egg and bread", "Veg lunch ideas for toddler under 20 minutes", "High-protein breakfast for kids without milk"],
  parent_healthy: ["High-protein breakfast under 300 calories", "Light dinner for weight loss with vegetables", "Quick healthy lunch with leftover rice and dal", "Low-carb snack ideas for evening"]
};
export function SmartMealSuggestions() {
  const {
    t
  } = useTranslation();
  const authFetch = useAuthFetch();
  const [audience, setAudience] = useState<Audience>("kids_tiffin");
  const [region, setRegion] = useState<string>("pan_indian");
  const [isVeg, setIsVeg] = useState<boolean | undefined>(undefined);
  const [childAge, setChildAge] = useState<number | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [meals, setMeals] = useState<AiMeal[]>([]);
  const [amyMessage, setAmyMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [openMeal, setOpenMeal] = useState<AiMeal | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholders = PLACEHOLDER_QUERIES[audience];
  const placeholder = placeholders[0];
  useEffect(() => {
    let cancelled = false;
    Promise.all([authFetch("/api/parent-profile").then(r => r.ok ? r.json() : null).catch(() => null), authFetch("/api/children").then(r => r.ok ? r.json() : null).catch(() => null)]).then(([profile, children]) => {
      if (cancelled) return;
      if (profile?.region) setRegion(profile.region);
      if (profile?.foodType === "veg") setIsVeg(true);
      if (Array.isArray(children) && children[0]?.age != null) {
        setChildAge(Number(children[0].age));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleGenerate = async () => {
    const effectiveQuery = query.trim() || placeholder;
    setLoading(true);
    setFetchError(null);
    setMeals([]);
    setAmyMessage("");
    try {
      const {
        default: i18nInstance
      } = await import("@/i18n");
      const res = await authFetch("/api/meals/ai-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: effectiveQuery,
          region,
          audience,
          childAge: audience === "kids_tiffin" ? childAge : undefined,
          isVeg,
          language: i18nInstance.language || "en"
        })
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
      const data = (await res.json()) as AiGenerateResult;
      setMeals(data.meals ?? []);
      setAmyMessage(data.amyMessage ?? "");
      setHasGenerated(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      }), 120);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Something went wrong. Please retry.");
    } finally {
      setLoading(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleGenerate();
    }
  };
  const handleSuggestionClick = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };
  return <div className="rounded-2xl border border-border dark:border-border bg-gradient-to-br from-muted via-white to-muted dark:from-primary dark:via-muted dark:to-primary overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-border dark:border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-muted dark:bg-primary flex items-center justify-center text-lg shrink-0">
            🍱
          </div>
          <div className="min-w-0">
            <p className="font-quicksand font-bold text-[15px] text-foreground truncate">
              {t("components.smart_meal_suggestions.amy_ai_meal_generator")}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {t("components.smart_meal_suggestions.describe_what_you_want_amy_generates_recipes_instantly")}
            </p>
          </div>
        </div>
        {/* Audience toggle */}
        <div className="flex bg-white/70 dark:bg-card border border-border rounded-full p-0.5 shrink-0">
          <button onClick={() => {
          setAudience("kids_tiffin");
          setMeals([]);
          setHasGenerated(false);
        }} className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${audience === "kids_tiffin" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`} data-testid="meals-tab-kids">
            {t("components.smart_meal_suggestions.kids")}
          </button>
          <button onClick={() => {
          setAudience("parent_healthy");
          setMeals([]);
          setHasGenerated(false);
        }} className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${audience === "parent_healthy" ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`} data-testid="meals-tab-parent">
            {t("components.smart_meal_suggestions.parent")}
          </button>
        </div>
      </div>

      {/* Query input area */}
      <div className="px-4 pt-4 pb-3">
        <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          {t("components.smart_meal_suggestions.what_would_you_like_to_cook_today")}
        </label>
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} maxLength={300} className="w-full h-11 px-3.5 rounded-xl border border-border bg-white dark:bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-border transition-all" data-testid="meals-query-input" />

        {/* Quick suggestion chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {placeholders.slice(1).map(q => <button key={q} type="button" onClick={() => handleSuggestionClick(q)} className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-border dark:border-border hover:border-border hover:bg-muted dark:hover:bg-primary text-muted-foreground hover:text-foreground transition-all">
              {q}
            </button>)}
        </div>

        {/* Generate button */}
        <button type="button" onClick={() => void handleGenerate()} disabled={loading} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98]" data-testid="meals-generate-btn">
          {loading ? <>
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              {t("components.smart_meal_suggestions.amy_is_cooking_up_recipes")}
            </> : <>
              <Sparkles className="h-4 w-4" />
              {t("components.smart_meal_suggestions.generate_with_amy_ai")}
            </>}
        </button>
      </div>

      {/* Amy message */}
      {amyMessage && !loading && <div className="px-4 pb-2">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-card border border-border dark:border-border">
            <AmyIcon size={18} bounce />
            <p className="text-[12.5px] leading-snug text-foreground/90">{amyMessage}</p>
          </div>
        </div>}

      {/* Results */}
      <div ref={resultsRef} className="pb-4">
        {loading ? <div className="flex gap-3 px-4 overflow-hidden">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="shrink-0 w-[160px] h-[200px] rounded-2xl bg-muted animate-pulse" />)}
          </div> : fetchError ? <div className="mx-4 p-4 rounded-xl bg-muted dark:bg-primary border border-border dark:border-border text-center">
            <p className="text-sm text-primary dark:text-primary font-medium">{fetchError}</p>
            <button type="button" onClick={() => void handleGenerate()} className="mt-2 text-xs text-primary dark:text-primary underline font-bold">
              {t("components.smart_meal_suggestions.try_again")}
            </button>
          </div> : meals.length > 0 ? <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-2 scroll-smooth" style={{
        scrollbarWidth: "thin"
      }}>
            {meals.map((m, i) => <MealCard key={m.id} meal={m} showCalories={audience === "parent_healthy"} onOpen={() => setOpenMeal(m)} style={{
          animationDelay: `${i * 60}ms`
        }} />)}
          </div> : !hasGenerated ? <div className="px-4 py-5 text-center">
            <div className="text-3xl mb-2">🍱</div>
            <p className="text-sm text-muted-foreground">
              {t("components.smart_meal_suggestions.type_what_you_want_to_cook_above_and_hit")}{" "}
              <span className="font-bold text-primary">{t("components.smart_meal_suggestions.generate")}</span> {t("components.smart_meal_suggestions.amy_will_create_personalised_recipes_just_for_you")}
            </p>
          </div> : <div className="px-4 py-4 text-center text-sm text-muted-foreground">
            {t("components.smart_meal_suggestions.no_meals_found_try_a_different_description")}
          </div>}
      </div>

      {openMeal && createPortal(<RecipeModal meal={openMeal} showCalories={audience === "parent_healthy"} onClose={() => setOpenMeal(null)} />, document.body)}
    </div>;
}

// ─── Card ────────────────────────────────────────────────────────────────
function MealCard({
  meal,
  showCalories,
  onOpen,
  style
}: {
  meal: AiMeal;
  showCalories: boolean;
  onOpen: () => void;
  style?: React.CSSProperties;
}) {
  const {
    t
  } = useTranslation();
  const tag = meal.tags[0] ?? "Healthy";
  return <button type="button" onClick={e => {
    e.stopPropagation();
    onOpen();
  }} style={style} className="group shrink-0 snap-start w-[165px] rounded-2xl overflow-hidden border border-border bg-card hover:border-border dark:hover:border-primary hover:shadow-md active:scale-95 transition-all text-left animate-in fade-in" data-testid={`meal-card-${meal.id}`}>
      <div className="relative h-[100px] flex items-center justify-center text-[52px]" style={{
      background: `linear-gradient(135deg, ${meal.bgGradient[0]}, ${meal.bgGradient[1]})`
    }}>
        <span className="drop-shadow-sm group-hover:scale-110 transition-transform">{meal.emoji}</span>
        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide bg-white/85 text-foreground px-1.5 py-0.5 rounded-full shadow-sm">
          {tag}
        </span>
        {meal.isVeg && <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full shadow-sm">
            {t("components.smart_meal_suggestions.veg")}
          </span>}
      </div>
      <div className="p-2.5 space-y-1.5">
        <p className="font-bold text-[12.5px] text-foreground leading-tight line-clamp-2">{meal.title}</p>
        <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" /> {meal.prepMinutes}m</span>
          {showCalories && <span className="inline-flex items-center gap-0.5"><Flame className="h-3 w-3 text-primary" /> {meal.calories}</span>}
        </div>
        <p className="text-[10px] text-primary dark:text-primary font-semibold">{t("components.smart_meal_suggestions.tap_for_recipe")}</p>
      </div>
    </button>;
}

// ─── Recipe Modal ─────────────────────────────────────────────────────────────
function RecipeModal({
  meal,
  showCalories,
  onClose
}: {
  meal: AiMeal;
  showCalories: boolean;
  onClose: () => void;
}) {
  const {
    t
  } = useTranslation();
  const [voicePref, setVoicePref] = useState<"female" | "male">(() => loadVoicePref());
  const voiceId = voicePref === "male" ? VOICE_MALE_ID : VOICE_FEMALE_ID;
  const {
    speaking,
    loading,
    error,
    speak,
    stop
  } = useAmyVoice({
    voiceId
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleReadAloud = () => {
    // Toggle: tap while loading/playing stops, otherwise starts fresh.
    if (speaking || loading) stop();else void speak(meal.audioText);
  };
  const switchVoice = (pref: "female" | "male") => {
    setVoicePref(pref);
    try {
      localStorage.setItem(STORAGE_VOICE, pref);
    } catch {}
    // Stop any in-flight playback so the next tap uses the new voice.
    stop();
  };
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
        {/* Hero */}
        <div className="relative h-[180px] flex items-center justify-center text-[96px] rounded-t-3xl" style={{
        background: `linear-gradient(135deg, ${meal.bgGradient[0]}, ${meal.bgGradient[1]})`
      }}>
          <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/85 hover:bg-white text-foreground flex items-center justify-center shadow-md" aria-label={t("components.smart_meal_suggestions.close")}>
            <X className="h-4 w-4" />
          </button>
          <span className="drop-shadow-sm">{meal.emoji}</span>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-quicksand font-black text-xl text-foreground leading-tight">{meal.title}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meal.tags.map(t => <span key={t} className="text-[10.5px] font-bold uppercase tracking-wide bg-muted dark:bg-primary text-primary dark:text-muted-foreground px-2 py-0.5 rounded-full">
                  {t}
                </span>)}
              <span className="text-[10.5px] font-bold uppercase tracking-wide bg-muted dark:bg-primary text-primary dark:text-muted-foreground px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {meal.prepMinutes} {t("components.smart_meal_suggestions.min")}
              </span>
              {showCalories && <span className="text-[10.5px] font-bold uppercase tracking-wide bg-muted dark:bg-primary text-primary dark:text-muted-foreground px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Flame className="h-2.5 w-2.5" /> {meal.calories} {t("components.smart_meal_suggestions.kcal")}
                </span>}
            </div>
          </div>

          {/* Read Aloud */}
          <div className="rounded-2xl border border-border dark:border-border bg-muted dark:bg-primary p-3">
            <div className="flex items-center justify-between gap-2">
              <button onClick={handleReadAloud} disabled={loading} className="inline-flex items-center gap-2 bg-primary hover:bg-primary disabled:opacity-70 disabled:cursor-wait text-white font-bold text-xs px-3.5 py-2 rounded-full" data-testid="meal-read-aloud">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {loading ? "Loading…" : speaking ? "Stop" : "Read Aloud"}
              </button>
              <div className="flex bg-white/70 dark:bg-card border border-border rounded-full p-0.5">
                <button onClick={() => switchVoice("female")} className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${voicePref === "female" ? "bg-primary text-white" : "text-muted-foreground"}`}>
                  {t("components.smart_meal_suggestions.female")}
                </button>
                <button onClick={() => switchVoice("male")} className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${voicePref === "male" ? "bg-primary text-white" : "text-muted-foreground"}`}>
                  {t("components.smart_meal_suggestions.male")}
                </button>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <p className="font-bold text-sm text-foreground mb-2 inline-flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 text-primary" /> {t("components.smart_meal_suggestions.ingredients")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meal.ingredients.map(ing => <span key={ing} className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-muted border-border text-foreground/70">
                  {ing}
                </span>)}
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="font-bold text-sm text-foreground mb-2 inline-flex items-center gap-1.5">
              <ChefHat className="h-3.5 w-3.5 text-primary" /> {t("components.smart_meal_suggestions.steps")}
            </p>
            <ol className="space-y-2">
              {meal.steps.map((step, i) => <li key={i} className="flex gap-2.5 text-sm leading-snug">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90">{step}</span>
                </li>)}
            </ol>
          </div>

          <button onClick={onClose} className="w-full py-3 rounded-2xl border border-border text-foreground text-sm font-bold hover:bg-muted/50 transition-colors">
            {t("components.smart_meal_suggestions.close_2")}
          </button>
        </div>
      </div>
    </div>;
}