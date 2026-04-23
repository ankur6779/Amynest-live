import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { AmyIcon } from "@/components/amy-icon";
import {
  Utensils,
  X,
  Volume2,
  VolumeX,
  ChefHat,
  Flame,
  Clock,
  Sparkles,
} from "lucide-react";

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
  kids_tiffin: [
    "Quick tiffin for school morning using paneer",
    "Healthy snack for 6-year-old with egg and bread",
    "Veg lunch ideas for toddler under 20 minutes",
    "High-protein breakfast for kids without milk",
  ],
  parent_healthy: [
    "High-protein breakfast under 300 calories",
    "Light dinner for weight loss with vegetables",
    "Quick healthy lunch with leftover rice and dal",
    "Low-carb snack ideas for evening",
  ],
};

export function SmartMealSuggestions() {
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
    Promise.all([
      authFetch("/api/parent-profile").then(r => r.ok ? r.json() : null).catch(() => null),
      authFetch("/api/children").then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([profile, children]) => {
      if (cancelled) return;
      if (profile?.region) setRegion(profile.region);
      if (profile?.foodType === "veg") setIsVeg(true);
      if (Array.isArray(children) && children[0]?.age != null) {
        setChildAge(Number(children[0].age));
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    const effectiveQuery = query.trim() || placeholder;
    setLoading(true);
    setFetchError(null);
    setMeals([]);
    setAmyMessage("");

    try {
      const res = await authFetch("/api/meals/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: effectiveQuery,
          region,
          audience,
          childAge: audience === "kids_tiffin" ? childAge : undefined,
          isVeg,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as AiGenerateResult;
      setMeals(data.meals ?? []);
      setAmyMessage(data.amyMessage ?? "");
      setHasGenerated(true);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Something went wrong. Please retry.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); void handleGenerate(); }
  };

  const handleSuggestionClick = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };

  return (
    <div className="rounded-2xl border border-violet-100 dark:border-violet-400/20 bg-gradient-to-br from-violet-50/60 via-white to-amber-50/40 dark:from-violet-500/8 dark:via-slate-900/30 dark:to-amber-500/8 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-violet-100 dark:border-violet-400/15 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-lg shrink-0">
            🍱
          </div>
          <div className="min-w-0">
            <p className="font-quicksand font-bold text-[15px] text-foreground truncate">
              Amy AI Meal Generator
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              Describe what you want — Amy generates recipes instantly
            </p>
          </div>
        </div>
        {/* Audience toggle */}
        <div className="flex bg-white/70 dark:bg-slate-900/40 border border-border rounded-full p-0.5 shrink-0">
          <button
            onClick={() => { setAudience("kids_tiffin"); setMeals([]); setHasGenerated(false); }}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${
              audience === "kids_tiffin"
                ? "bg-violet-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="meals-tab-kids"
          >
            Kids
          </button>
          <button
            onClick={() => { setAudience("parent_healthy"); setMeals([]); setHasGenerated(false); }}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${
              audience === "parent_healthy"
                ? "bg-violet-600 text-white shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="meals-tab-parent"
          >
            Parent
          </button>
        </div>
      </div>

      {/* Query input area */}
      <div className="px-4 pt-4 pb-3">
        <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          What would you like to cook today?
        </label>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={300}
          className="w-full h-11 px-3.5 rounded-xl border border-border bg-white dark:bg-slate-900/40 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition-all"
          data-testid="meals-query-input"
        />

        {/* Quick suggestion chips */}
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {placeholders.slice(1).map(q => (
            <button
              key={q}
              type="button"
              onClick={() => handleSuggestionClick(q)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-dashed border-violet-200 dark:border-violet-400/30 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 text-muted-foreground hover:text-foreground transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Generate button */}
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={loading}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 bg-gradient-to-r from-violet-600 to-pink-500 hover:from-violet-700 hover:to-pink-600 disabled:opacity-60 disabled:cursor-not-allowed text-white shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.98]"
          data-testid="meals-generate-btn"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Amy is cooking up recipes…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate with Amy AI
            </>
          )}
        </button>
      </div>

      {/* Amy message */}
      {amyMessage && !loading && (
        <div className="px-4 pb-2">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-violet-100 dark:border-violet-400/20">
            <AmyIcon size={18} bounce />
            <p className="text-[12.5px] leading-snug text-foreground/90">{amyMessage}</p>
          </div>
        </div>
      )}

      {/* Results */}
      <div ref={resultsRef} className="pb-4">
        {loading ? (
          <div className="flex gap-3 px-4 overflow-hidden">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="shrink-0 w-[160px] h-[200px] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="mx-4 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-400/20 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{fetchError}</p>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              className="mt-2 text-xs text-red-600 dark:text-red-400 underline font-bold"
            >
              Try again
            </button>
          </div>
        ) : meals.length > 0 ? (
          <div
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-2 scroll-smooth"
            style={{ scrollbarWidth: "thin" }}
          >
            {meals.map((m, i) => (
              <MealCard
                key={m.id}
                meal={m}
                showCalories={audience === "parent_healthy"}
                onOpen={() => setOpenMeal(m)}
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        ) : !hasGenerated ? (
          <div className="px-4 py-5 text-center">
            <div className="text-3xl mb-2">🍱</div>
            <p className="text-sm text-muted-foreground">
              Type what you want to cook above and hit{" "}
              <span className="font-bold text-violet-600">Generate</span> — Amy will create personalised recipes just for you.
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 text-center text-sm text-muted-foreground">
            No meals found. Try a different description.
          </div>
        )}
      </div>

      {openMeal && createPortal(
        <RecipeModal
          meal={openMeal}
          showCalories={audience === "parent_healthy"}
          onClose={() => setOpenMeal(null)}
        />,
        document.body,
      )}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────
function MealCard({
  meal, showCalories, onOpen, style,
}: {
  meal: AiMeal;
  showCalories: boolean;
  onOpen: () => void;
  style?: React.CSSProperties;
}) {
  const tag = meal.tags[0] ?? "Healthy";

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      style={style}
      className="group shrink-0 snap-start w-[165px] rounded-2xl overflow-hidden border border-border bg-card hover:border-violet-300 dark:hover:border-violet-500/50 hover:shadow-md active:scale-95 transition-all text-left animate-in fade-in"
      data-testid={`meal-card-${meal.id}`}
    >
      <div
        className="relative h-[100px] flex items-center justify-center text-[52px]"
        style={{ background: `linear-gradient(135deg, ${meal.bgGradient[0]}, ${meal.bgGradient[1]})` }}
      >
        <span className="drop-shadow-sm group-hover:scale-110 transition-transform">{meal.emoji}</span>
        <span className="absolute top-1.5 left-1.5 text-[9px] font-bold uppercase tracking-wide bg-white/85 text-foreground px-1.5 py-0.5 rounded-full shadow-sm">
          {tag}
        </span>
        {meal.isVeg && (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-sm">
            🌿 Veg
          </span>
        )}
      </div>
      <div className="p-2.5 space-y-1.5">
        <p className="font-bold text-[12.5px] text-foreground leading-tight line-clamp-2">{meal.title}</p>
        <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" /> {meal.prepMinutes}m</span>
          {showCalories && (
            <span className="inline-flex items-center gap-0.5"><Flame className="h-3 w-3 text-orange-500" /> {meal.calories}</span>
          )}
        </div>
        <p className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">Tap for recipe →</p>
      </div>
    </button>
  );
}

// ─── Recipe Modal ─────────────────────────────────────────────────────────────
function RecipeModal({
  meal, showCalories, onClose,
}: { meal: AiMeal; showCalories: boolean; onClose: () => void }) {
  const [speaking, setSpeaking] = useState(false);
  const [voicePref, setVoicePref] = useState<"female" | "male">(() => loadVoicePref());
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickVoice = (pref: "female" | "male"): SpeechSynthesisVoice | undefined => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
    const all = window.speechSynthesis.getVoices();
    if (all.length === 0) return undefined;
    const indian = all.filter(v => /en[-_]?IN/i.test(v.lang) || /india/i.test(v.name));
    const pool = indian.length > 0 ? indian : all.filter(v => v.lang.startsWith("en"));
    if (pool.length === 0) return undefined;
    const isMale = (v: SpeechSynthesisVoice) => /male|david|alex|fred|mark/i.test(v.name);
    const isFemale = (v: SpeechSynthesisVoice) => /female|samantha|victoria|karen|tessa|veena|kate|zira/i.test(v.name);
    const filtered = pref === "male" ? pool.find(isMale) : pool.find(isFemale);
    return filtered ?? pool[0];
  };

  const handleReadAloud = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Read Aloud is not supported in this browser.");
      return;
    }
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(meal.audioText);
    u.rate = 0.95;
    u.pitch = 1.0;
    const voice = pickVoice(voicePref);
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    synth.speak(u);
    setSpeaking(true);
  };

  const switchVoice = (pref: "female" | "male") => {
    setVoicePref(pref);
    try { localStorage.setItem(STORAGE_VOICE, pref); } catch {}
    if (speaking && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div
          className="relative h-[180px] flex items-center justify-center text-[96px] rounded-t-3xl"
          style={{ background: `linear-gradient(135deg, ${meal.bgGradient[0]}, ${meal.bgGradient[1]})` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/85 hover:bg-white text-foreground flex items-center justify-center shadow-md"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="drop-shadow-sm">{meal.emoji}</span>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-quicksand font-black text-xl text-foreground leading-tight">{meal.title}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meal.tags.map(t => (
                <span key={t} className="text-[10.5px] font-bold uppercase tracking-wide bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-200 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
              <span className="text-[10.5px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {meal.prepMinutes} min
              </span>
              {showCalories && (
                <span className="text-[10.5px] font-bold uppercase tracking-wide bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Flame className="h-2.5 w-2.5" /> {meal.calories} kcal
                </span>
              )}
            </div>
          </div>

          {/* Read Aloud */}
          <div className="rounded-2xl border border-violet-100 dark:border-violet-400/25 bg-violet-50/60 dark:bg-violet-500/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleReadAloud}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs px-3.5 py-2 rounded-full"
                data-testid="meal-read-aloud"
              >
                {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                {speaking ? "Stop" : "Read Aloud"}
              </button>
              <div className="flex bg-white/70 dark:bg-slate-900/40 border border-border rounded-full p-0.5">
                <button
                  onClick={() => switchVoice("female")}
                  className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${voicePref === "female" ? "bg-violet-600 text-white" : "text-muted-foreground"}`}
                >
                  ♀ Female
                </button>
                <button
                  onClick={() => switchVoice("male")}
                  className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${voicePref === "male" ? "bg-violet-600 text-white" : "text-muted-foreground"}`}
                >
                  ♂ Male
                </button>
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <p className="font-bold text-sm text-foreground mb-2 inline-flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 text-violet-500" /> Ingredients
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meal.ingredients.map(ing => (
                <span
                  key={ing}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-muted border-border text-foreground/70"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <p className="font-bold text-sm text-foreground mb-2 inline-flex items-center gap-1.5">
              <ChefHat className="h-3.5 w-3.5 text-violet-500" /> Steps
            </p>
            <ol className="space-y-2">
              {meal.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-snug">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-violet-600 text-white text-[11px] font-black flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-border text-foreground text-sm font-bold hover:bg-muted/50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
