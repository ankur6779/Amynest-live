import { MealRecipeCard } from "@/components/MealRecipeCard";

export type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes: string;
  status: string;
  rewardPoints?: number;
  meal?: string | null;
  recipe?: {
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: string[];
    steps: string[];
    tip?: string;
  } | null;
  nutrition?: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    notes?: string;
  } | null;
};

type Props = {
  items: RoutineItem[];
};

export function RoutineItemsPanel({ items }: Props) {
  return (
    <ul data-testid="routine-items-panel">
      {items.map((item, i) => (
        <li key={i} data-testid={`routine-item-${i}`} data-category={item.category}>
          <span data-testid="item-time">{item.time}</span>
          <span data-testid="item-activity">{item.activity}</span>
          <span data-testid="item-category">{item.category}</span>
          {(item.category === "meal" || item.category === "tiffin") && (
            <MealRecipeCard
              meal={item.meal}
              recipe={item.recipe}
              nutrition={item.nutrition}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
