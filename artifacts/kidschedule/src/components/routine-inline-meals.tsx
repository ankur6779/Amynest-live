/**
 * RoutineInlineMeals
 *
 * Lightweight Amy AI meal strip shown inside meal / tiffin blocks on
 * the Routine detail page. Calls the AI endpoint with a default prompt
 * derived from the slot's audience and meal type so each block shows
 * freshly generated, context-appropriate recipes.
 */
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { AmyIcon } from "@/components/amy-icon";
import { X, Clock, Flame, Utensils, ChefHat } from "lucide-react";

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

interface Props {
  region?: string;
  audience?: "kids_tiffin" | "parent_healthy";
  childAge?: number;
  isVeg?: boolean;
  mealType?: string;
  /** Kept for API compatibility; no longer used for offsetting results */
  instanceIndex?: number;
}

function buildDefaultQuery(audience: "kids_tiffin" | "parent_healthy", mealType?: string, childAge?: number): string {
  if (audience === "parent_healthy") {
    const typeLabel = mealType ? ` for ${mealType}` : "";
    return `Healthy nutritious meal${typeLabel} for a parent`;
  }
  const typeLabel = mealType ? `${mealType} ` : "tiffin ";
  const ageLabel = childAge != null ? ` for a ${childAge}-year-old` : " for kids";
  return `Quick kid-friendly ${typeLabel}recipe${ageLabel}`;
}

export function RoutineInlineMeals({
  region = "pan_indian",
  audience = "kids_tiffin",
  childAge,
  isVeg,
  mealType,
}: Props) {
  const authFetch = useAuthFetch();
  const [meals, setMeals] = useState<AiMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [amyMsg, setAmyMsg] = useState("");
  const [openMeal, setOpenMeal] = useState<AiMeal | null>(null);

  const handleClose = useCallback(() => setOpenMeal(null), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const query = buildDefaultQuery(audience, mealType, childAge);

    authFetch("/api/meals/ai-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, region, audience, childAge, isVeg }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((r: AiGenerateResult | null) => {
        if (cancelled) return;
        if (r && r.meals?.length > 0) {
          setMeals(r.meals.slice(0, 4));
          setAmyMsg(r.amyMessage ?? "");
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, audience, childAge, isVeg, mealType]);

  return (
    <div className="mt-2.5 rounded-xl border border-orange-100 dark:border-orange-400/20 bg-orange-50/60 dark:bg-orange-500/5 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-orange-100 dark:border-orange-400/15">
        <AmyIcon size={15} bounce />
        <p className="text-[11.5px] font-bold text-orange-700 dark:text-orange-300">
          Amy AI Meal Suggestions
        </p>
        {amyMsg && (
          <p className="text-[10px] text-muted-foreground ml-auto truncate max-w-[180px] hidden sm:block">
            {amyMsg.replace(/\*\*/g, "").slice(0, 60)}
          </p>
        )}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex gap-2 px-3 py-2 overflow-hidden">
          {[0,1,2,3].map(i => (
            <div key={i} className="shrink-0 w-[130px] h-[130px] rounded-xl bg-orange-100/60 dark:bg-orange-500/10 animate-pulse" />
          ))}
        </div>
      ) : meals.length === 0 ? (
        <p className="text-[11px] text-muted-foreground px-3 py-3">No suggestions available right now.</p>
      ) : (
        <div
          className="flex gap-2 px-3 py-2.5 overflow-x-auto scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {meals.map(m => (
            <MiniMealCard
              key={m.id}
              meal={m}
              onOpen={(e) => {
                e.stopPropagation();
                setOpenMeal(m);
              }}
            />
          ))}
        </div>
      )}

      {openMeal && createPortal(
        <RecipeSheet meal={openMeal} onClose={handleClose} />,
        document.body,
      )}
    </div>
  );
}

// ─── Mini Card ────────────────────────────────────────────────────────────────
function MiniMealCard({ meal, onOpen }: { meal: AiMeal; onOpen: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onOpen}
      className="group shrink-0 w-[130px] rounded-xl overflow-hidden border border-border bg-card hover:border-orange-300 dark:hover:border-orange-500/50 hover:shadow-sm transition-all text-left"
    >
      <div
        className="relative h-[70px] flex items-center justify-center text-[38px]"
        style={{ background: `linear-gradient(135deg, ${meal.bgGradient[0]}, ${meal.bgGradient[1]})` }}
      >
        <span className="group-hover:scale-110 transition-transform drop-shadow">{meal.emoji}</span>
        {meal.tags[0] && (
          <span className="absolute bottom-1 left-1.5 text-[9px] font-bold bg-white/80 text-foreground px-1.5 py-0.5 rounded-full">
            {meal.tags[0]}
          </span>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="font-bold text-[11.5px] text-foreground leading-tight line-clamp-2 mb-0.5">
          {meal.title}
        </p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          <Clock className="h-2.5 w-2.5" /> {meal.prepMinutes}m
        </p>
      </div>
    </button>
  );
}

// ─── Recipe Sheet ─────────────────────────────────────────────────────────────
function RecipeSheet({ meal, onClose }: { meal: AiMeal; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="relative h-[160px] flex items-center justify-center text-[88px] rounded-t-3xl"
          style={{ background: `linear-gradient(135deg, ${meal.bgGradient[0]}, ${meal.bgGradient[1]})` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/85 hover:bg-white text-foreground flex items-center justify-center shadow"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="drop-shadow-sm">{meal.emoji}</span>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-quicksand font-black text-xl text-foreground">{meal.title}</h3>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {meal.tags.map(t => (
                <span key={t} className="text-[10px] font-bold uppercase bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-200 px-2 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
              <span className="text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {meal.prepMinutes} min
              </span>
              {meal.calories > 0 && (
                <span className="text-[10px] font-bold uppercase bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Flame className="h-2.5 w-2.5" /> {meal.calories} kcal
                </span>
              )}
            </div>
          </div>

          <div>
            <p className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
              <Utensils className="h-3.5 w-3.5 text-orange-500" /> Ingredients
            </p>
            <div className="flex flex-wrap gap-1.5">
              {meal.ingredients.map(ing => (
                <span key={ing} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-foreground/80">
                  {ing}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
              <ChefHat className="h-3.5 w-3.5 text-orange-500" /> Steps
            </p>
            <ol className="space-y-2">
              {meal.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-snug">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center mt-0.5">
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
