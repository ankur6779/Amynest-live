import { useId, useState } from "react";
import { ChefHat, ChevronDown } from "lucide-react";

export type MealRecipe = {
  prepTime: string;
  cookTime: string;
  servings: string;
  ingredients: string[];
  steps: string[];
  tip?: string;
};

export type MealNutrition = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes?: string;
};

export type MealRecipeCardProps = {
  meal?: string | null;
  recipe?: MealRecipe | null;
  nutrition?: MealNutrition | null;
  defaultOpen?: boolean;
};

export function MealRecipeCard({ meal, recipe, nutrition, defaultOpen = false }: MealRecipeCardProps) {
  if (!recipe && !nutrition) return null;
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div
      className="mt-2 rounded-xl border border-orange-200 bg-orange-50/60 p-2.5"
      data-testid="meal-recipe-card"
      data-state={open ? "open" : "closed"}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="cursor-pointer text-xs font-bold text-orange-800 flex items-center gap-1.5 w-full text-left"
      >
        <ChefHat className="h-3 w-3" /> Recipe &amp; Nutrition
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-orange-500 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={contentId}
        className="grid transition-[grid-template-rows,opacity] duration-[240ms] ease-out motion-reduce:transition-none"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
        }}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div className="pt-2 space-y-2 text-[11px] text-orange-900">
            {recipe && (
              <div data-testid="recipe-section">
                <p className="font-bold mb-1">{meal ?? "Recipe"}</p>
                <p className="text-[10px] uppercase tracking-wide text-orange-600">
                  Prep {recipe.prepTime} · Cook {recipe.cookTime} · Serves {recipe.servings}
                </p>
                <p className="font-semibold mt-1.5">Ingredients</p>
                <ul className="list-disc list-inside leading-snug">
                  {(recipe.ingredients ?? []).map((ing, i) => <li key={i}>{ing}</li>)}
                </ul>
                <p className="font-semibold mt-1.5">Steps</p>
                <ol className="list-decimal list-inside leading-snug">
                  {(recipe.steps ?? []).map((s, i) => <li key={i}>{s}</li>)}
                </ol>
                {recipe.tip && (
                  <p className="mt-1.5 italic text-orange-700">💡 {recipe.tip}</p>
                )}
              </div>
            )}
            {nutrition && (
              <div className="pt-2 border-t border-orange-200" data-testid="nutrition-section">
                <p className="font-bold mb-1">Nutrition (approx.)</p>
                <div className="grid grid-cols-4 gap-1 text-center">
                  <div className="bg-white rounded-md py-1">
                    <p className="font-bold text-[10px]">{nutrition.calories}</p>
                    <p className="text-[9px] text-orange-600">Calories</p>
                  </div>
                  <div className="bg-white rounded-md py-1">
                    <p className="font-bold text-[10px]">{nutrition.protein}</p>
                    <p className="text-[9px] text-orange-600">Protein</p>
                  </div>
                  <div className="bg-white rounded-md py-1">
                    <p className="font-bold text-[10px]">{nutrition.carbs}</p>
                    <p className="text-[9px] text-orange-600">Carbs</p>
                  </div>
                  <div className="bg-white rounded-md py-1">
                    <p className="font-bold text-[10px]">{nutrition.fat}</p>
                    <p className="text-[9px] text-orange-600">Fat</p>
                  </div>
                </div>
                {nutrition.notes && (
                  <p className="mt-1.5 italic text-orange-700">{nutrition.notes}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
