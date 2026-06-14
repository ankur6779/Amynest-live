import { normalizeMealName } from "@/features/nutrition/lib/meal-nutrient-map";

export interface MealPrepTask {
  id: string;
  title: string;
  detail: string;
  dayHint: "Saturday" | "Sunday" | "Weekend";
}

export function generateMealPrepSuggestions(weekMeals: string[]): MealPrepTask[] {
  const tasks: MealPrepTask[] = [];
  const normalized = weekMeals.map(normalizeMealName).join(" ");

  const dalCount = (normalized.match(/\bdal\b|lentil|moong|toor|masoor|sambar|sambhar/g) ?? []).length;
  const vegCount = (normalized.match(/sabzi|vegetable|palak|spinach|gobi|carrot|beans/g) ?? []).length;
  const idliCount = (normalized.match(/idli|dosa|batter/g) ?? []).length;
  const parathaCount = (normalized.match(/paratha|roti|chapati|atta/g) ?? []).length;
  const soakGrains = (normalized.match(/rajma|chole|chickpea|kidney bean/g) ?? []).length;

  if (dalCount >= 2) {
    tasks.push({
      id: "soak-dal",
      title: "Soak dal on Sunday",
      detail: "Rinse and soak toor/moong dal for quicker weekday cooking.",
      dayHint: "Sunday",
    });
  }

  if (soakGrains >= 1) {
    tasks.push({
      id: "soak-rajma-chole",
      title: "Soak rajma or chole overnight",
      detail: "Long-soak pulses cook faster for mid-week meals.",
      dayHint: "Saturday",
    });
  }

  if (vegCount >= 3) {
    tasks.push({
      id: "prep-veg",
      title: "Prepare vegetable mix",
      detail: "Wash, peel, and chop carrots, beans, and potatoes for the week.",
      dayHint: "Sunday",
    });
  }

  if (idliCount >= 1) {
    tasks.push({
      id: "prep-batter",
      title: "Ferment idli/dosa batter",
      detail: "Start batter Saturday evening for fresh South Indian breakfasts.",
      dayHint: "Saturday",
    });
  }

  if (parathaCount >= 2) {
    tasks.push({
      id: "prep-dough",
      title: "Prep atta dough balls",
      detail: "Portion whole-wheat dough for quick weekday parathas.",
      dayHint: "Sunday",
    });
  }

  if (tasks.length === 0 && weekMeals.length > 0) {
    tasks.push({
      id: "review-plan",
      title: "Review the week’s meal plan",
      detail: "Check staples — rice, atta, milk, and fruit — before shopping.",
      dayHint: "Weekend",
    });
  }

  return tasks;
}
