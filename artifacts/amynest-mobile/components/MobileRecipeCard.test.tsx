/**
 * Mobile recipe card UI tests
 *
 * Verifies that the MobileRecipeCard component (used inside RoutineItemModal)
 * renders the correct elements for school-day and non-school-day meal slots.
 * React Native components are replaced with DOM equivalents via vitest aliases
 * so assertions run in jsdom without a native bridge.
 *
 * @api-lib is resolved via vitest.config.ts alias → artifacts/api-server/src/lib
 * and declared as a TS path in tsconfig.test.json.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MobileRecipeCard } from "./MobileRecipeCard";
import { generateRuleBasedRoutine } from "@api-lib/routine-templates";

const sampleRecipe = {
  prepTime: "10 mins",
  cookTime: "5 mins",
  servings: "1",
  ingredients: ["1 banana", "1 cup oats", "200ml milk"],
  steps: ["Blend ingredients.", "Pour and serve."],
  tip: "Add honey for sweetness",
};

const sampleNutrition = {
  calories: "280 kcal",
  protein: "7 g",
  carbs: "50 g",
  fat: "4 g",
  notes: "Good source of fibre",
};

describe("MobileRecipeCard – rendering", () => {
  it("renders nothing when both recipe and nutrition are absent", () => {
    const { container } = render(<MobileRecipeCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the card when recipe is present", () => {
    render(<MobileRecipeCard meal="Banana Oat Smoothie" recipe={sampleRecipe} />);
    expect(screen.getByTestId("mobile-recipe-card")).toBeInTheDocument();
  });

  it("renders the card when only nutrition is present", () => {
    render(<MobileRecipeCard nutrition={sampleNutrition} />);
    expect(screen.getByTestId("mobile-recipe-card")).toBeInTheDocument();
  });

  it("shows the meal name in the header", () => {
    render(<MobileRecipeCard meal="Quick Meal Before School" recipe={sampleRecipe} />);
    expect(screen.getByTestId("mobile-recipe-header")).toHaveTextContent("Quick Meal Before School");
  });

  it("shows 'Recipe & Nutrition' in the header even without a meal name", () => {
    render(<MobileRecipeCard recipe={sampleRecipe} />);
    expect(screen.getByTestId("mobile-recipe-header")).toHaveTextContent("Recipe & Nutrition");
  });

  it("renders the recipe section for a recipe item", () => {
    render(<MobileRecipeCard recipe={sampleRecipe} />);
    expect(screen.getByTestId("mobile-recipe-section")).toBeInTheDocument();
  });

  it("shows prep, cook and serving meta text", () => {
    render(<MobileRecipeCard recipe={sampleRecipe} />);
    const section = screen.getByTestId("mobile-recipe-section");
    expect(section).toHaveTextContent("Prep 10 mins");
    expect(section).toHaveTextContent("Cook 5 mins");
    expect(section).toHaveTextContent("Serves 1");
  });

  it("lists all ingredients", () => {
    render(<MobileRecipeCard recipe={sampleRecipe} />);
    expect(screen.getByText("• 1 banana")).toBeInTheDocument();
    expect(screen.getByText("• 1 cup oats")).toBeInTheDocument();
    expect(screen.getByText("• 200ml milk")).toBeInTheDocument();
  });

  it("lists all steps", () => {
    render(<MobileRecipeCard recipe={sampleRecipe} />);
    expect(screen.getByText("1. Blend ingredients.")).toBeInTheDocument();
    expect(screen.getByText("2. Pour and serve.")).toBeInTheDocument();
  });

  it("shows the optional recipe tip", () => {
    render(<MobileRecipeCard recipe={sampleRecipe} />);
    expect(screen.getByText("💡 Add honey for sweetness")).toBeInTheDocument();
  });

  it("renders the nutrition section with all four macros", () => {
    render(<MobileRecipeCard nutrition={sampleNutrition} />);
    const section = screen.getByTestId("mobile-nutrition-section");
    expect(section).toBeInTheDocument();
    expect(screen.getByTestId("macro-calories")).toHaveTextContent("280 kcal");
    expect(screen.getByTestId("macro-protein")).toHaveTextContent("7 g");
    expect(screen.getByTestId("macro-carbs")).toHaveTextContent("50 g");
    expect(screen.getByTestId("macro-fat")).toHaveTextContent("4 g");
  });

  it("shows macro labels Cal, Protein, Carbs, Fat", () => {
    render(<MobileRecipeCard nutrition={sampleNutrition} />);
    expect(screen.getByText("Cal")).toBeInTheDocument();
    expect(screen.getByText("Protein")).toBeInTheDocument();
    expect(screen.getByText("Carbs")).toBeInTheDocument();
    expect(screen.getByText("Fat")).toBeInTheDocument();
  });

  it("shows optional nutrition notes", () => {
    render(<MobileRecipeCard nutrition={sampleNutrition} />);
    expect(screen.getByText("Good source of fibre")).toBeInTheDocument();
  });
});

describe("MobileRecipeCard – school-day meal slots", () => {
  const schoolSlots = [
    {
      label: "Quick Meal Before School",
      meal: "Banana Oat Smoothie",
      recipe: { prepTime: "5 mins", cookTime: "0 mins", servings: "1",
        ingredients: ["1 banana", "1 cup oats"], steps: ["Blend and serve."] },
      nutrition: { calories: "280 kcal", protein: "7 g", carbs: "50 g", fat: "4 g" },
    },
    {
      label: "Tiffin",
      meal: "Vegetable Paratha",
      recipe: { prepTime: "10 mins", cookTime: "10 mins", servings: "1",
        ingredients: ["1 cup flour", "Mixed veg"], steps: ["Prepare dough.", "Cook."] },
      nutrition: { calories: "350 kcal", protein: "9 g", carbs: "60 g", fat: "7 g" },
    },
    {
      label: "Lunch",
      meal: "Rice and Dal",
      recipe: { prepTime: "5 mins", cookTime: "20 mins", servings: "1",
        ingredients: ["1 cup rice", "1/2 cup dal"], steps: ["Cook rice.", "Prepare dal."] },
      nutrition: { calories: "500 kcal", protein: "15 g", carbs: "90 g", fat: "5 g" },
    },
    {
      label: "Dinner",
      meal: "Chapati and Sabji",
      recipe: { prepTime: "15 mins", cookTime: "20 mins", servings: "2",
        ingredients: ["2 cups flour", "Mixed vegetables"],
        steps: ["Make dough.", "Roll chapatis.", "Prepare sabji."] },
      nutrition: { calories: "450 kcal", protein: "12 g", carbs: "80 g", fat: "8 g" },
    },
  ];

  it("every school-day slot renders a mobile recipe card", () => {
    for (const slot of schoolSlots) {
      const { unmount } = render(
        <MobileRecipeCard meal={slot.meal} recipe={slot.recipe} nutrition={slot.nutrition} />
      );
      expect(screen.getByTestId("mobile-recipe-card")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-recipe-section")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-nutrition-section")).toBeInTheDocument();
      unmount();
    }
  });

  it("each slot's meal name appears in its card header", () => {
    for (const slot of schoolSlots) {
      const { unmount } = render(
        <MobileRecipeCard meal={slot.meal} recipe={slot.recipe} nutrition={slot.nutrition} />
      );
      expect(screen.getByTestId("mobile-recipe-header")).toHaveTextContent(slot.meal);
      unmount();
    }
  });
});

describe("MobileRecipeCard – non-school day meal slots", () => {
  const nonSchoolSlots = [
    {
      label: "Breakfast",
      meal: "Idli Sambar",
      recipe: { prepTime: "10 mins", cookTime: "15 mins", servings: "2",
        ingredients: ["4 idlis", "1 cup sambar"], steps: ["Heat idlis.", "Serve with sambar."] },
      nutrition: { calories: "300 kcal", protein: "10 g", carbs: "55 g", fat: "3 g" },
    },
    {
      label: "Drunch",
      meal: "Poha",
      recipe: { prepTime: "5 mins", cookTime: "10 mins", servings: "1",
        ingredients: ["1 cup poha"], steps: ["Soak and cook."] },
      nutrition: { calories: "280 kcal", protein: "6 g", carbs: "50 g", fat: "5 g" },
    },
    {
      label: "Dinner",
      meal: "Khichdi",
      recipe: { prepTime: "10 mins", cookTime: "20 mins", servings: "2",
        ingredients: ["1 cup rice", "1/2 cup dal"], steps: ["Pressure cook.", "Season."] },
      nutrition: { calories: "420 kcal", protein: "14 g", carbs: "75 g", fat: "6 g" },
    },
  ];

  it("every non-school-day slot renders a mobile recipe card", () => {
    for (const slot of nonSchoolSlots) {
      const { unmount } = render(
        <MobileRecipeCard meal={slot.meal} recipe={slot.recipe} nutrition={slot.nutrition} />
      );
      expect(screen.getByTestId("mobile-recipe-card")).toBeInTheDocument();
      unmount();
    }
  });

  it("Breakfast meal name appears in card header", () => {
    const slot = nonSchoolSlots[0];
    render(<MobileRecipeCard meal={slot.meal} recipe={slot.recipe} nutrition={slot.nutrition} />);
    expect(screen.getByTestId("mobile-recipe-header")).toHaveTextContent(slot.meal);
  });
});

// ---------------------------------------------------------------------------
// Integration tests — real generateRuleBasedRoutine output
// These mirror the web RoutineItemsPanel integration tests, but apply to
// the mobile MobileRecipeCard component rendered from generated meal items.
// ---------------------------------------------------------------------------

describe("MobileRecipeCard — integration with generateRuleBasedRoutine", () => {
  const SCHOOL_START_TIME = "09:00 AM";
  const SCHOOL_END_TIME   = "03:00 PM";
  const SCHOOL_START_MINS = 9 * 60;
  const SCHOOL_END_MINS   = 15 * 60;

  type GenItem = ReturnType<typeof generateRuleBasedRoutine>["items"][number];

  let schoolItems: GenItem[];
  let nonSchoolItems: GenItem[];

  beforeAll(() => {
    schoolItems = generateRuleBasedRoutine({
      childName: "TestChild",
      ageGroup: "early_school",
      wakeUpTime: "07:00 AM",
      sleepTime: "09:00 PM",
      schoolStartTime: SCHOOL_START_TIME,
      schoolEndTime: SCHOOL_END_TIME,
      hasSchool: true,
      mood: "balanced",
      foodType: "veg",
      region: "pan_indian",
      date: "Monday",
    }).items;

    nonSchoolItems = generateRuleBasedRoutine({
      childName: "TestChild",
      ageGroup: "early_school",
      wakeUpTime: "07:00 AM",
      sleepTime: "09:00 PM",
      hasSchool: false,
      mood: "balanced",
      foodType: "veg",
      region: "pan_indian",
      date: "Saturday",
    }).items;
  });

  const mealCategories = new Set(["meal", "tiffin"]);
  const toMins = (t: string): number => {
    const [h, rest] = t.split(":");
    const [m] = rest.split(" ");
    const isPM = t.toUpperCase().includes("PM");
    const isAM = t.toUpperCase().includes("AM");
    let hours = parseInt(h, 10);
    if (isPM && hours !== 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + parseInt(m, 10);
  };

  it("school day: every meal/tiffin item has recipe + nutrition attached", () => {
    const meals = schoolItems.filter((i) => mealCategories.has(i.category));
    expect(meals.length).toBeGreaterThanOrEqual(4);
    for (const m of meals) {
      expect(m.recipe, `${m.activity} missing recipe`).toBeTruthy();
      expect(m.nutrition, `${m.activity} missing nutrition`).toBeTruthy();
    }
  });

  it("school day: MobileRecipeCard renders for all meal/tiffin items without crashing", () => {
    const meals = schoolItems.filter((i) => mealCategories.has(i.category));
    for (const item of meals) {
      const { unmount } = render(
        <MobileRecipeCard meal={item.activity} recipe={item.recipe} nutrition={item.nutrition} />
      );
      expect(screen.getByTestId("mobile-recipe-card")).toBeInTheDocument();
      unmount();
    }
  });

  it("school day: Tiffin eating block renders card with correct meal name", () => {
    const tiffin = schoolItems.find(
      (i) => i.category === "tiffin" && i.activity === "Tiffin"
    );
    expect(tiffin).toBeTruthy();
    const { unmount } = render(
      <MobileRecipeCard meal={tiffin!.activity} recipe={tiffin!.recipe} nutrition={tiffin!.nutrition} />
    );
    expect(screen.getByTestId("mobile-recipe-header")).toHaveTextContent(tiffin!.activity);
    unmount();
  });

  it("school day: Quick Meal Before School renders at schoolStart − 15 min (08:45)", () => {
    const quickMeal = schoolItems.find(
      (i) => i.category === "meal" && i.activity.toLowerCase().includes("quick meal")
    );
    expect(quickMeal, "Quick Meal Before School not found").toBeTruthy();
    expect(toMins(quickMeal!.time)).toBe(SCHOOL_START_MINS - 15);
  });

  it("school day: Tiffin eating block is anchored at schoolStart + 60 min (10:00)", () => {
    const tiffin = schoolItems.find(
      (i) => i.category === "tiffin" && i.activity === "Tiffin"
    );
    expect(tiffin, "Tiffin eating block not found").toBeTruthy();
    expect(toMins(tiffin!.time)).toBe(SCHOOL_START_MINS + 60);
  });

  it("school day: Lunch renders at schoolEnd + 30 min (15:30)", () => {
    const lunch = schoolItems.find(
      (i) => i.category === "meal" && i.activity.toLowerCase().includes("lunch")
    );
    expect(lunch, "Post-school Lunch not found").toBeTruthy();
    expect(toMins(lunch!.time)).toBe(SCHOOL_END_MINS + 30);
  });

  it("school day: no duplicate meal activity names", () => {
    const meals = schoolItems.filter((i) => mealCategories.has(i.category));
    const names = meals.map((m) => m.activity);
    expect(new Set(names).size).toBe(names.length);
  });

  it("non-school day: no Tiffin block", () => {
    const tiffin = nonSchoolItems.find((i) => i.category === "tiffin");
    expect(tiffin).toBeUndefined();
  });

  it("non-school day: no Quick Meal Before School item", () => {
    const quickMeal = nonSchoolItems.find(
      (i) => i.activity.toLowerCase().includes("quick meal")
    );
    expect(quickMeal).toBeUndefined();
  });

  it("non-school day: Breakfast renders in 08:00–09:00 window", () => {
    const breakfast = nonSchoolItems.find(
      (i) => i.category === "meal" && i.activity.toLowerCase().includes("breakfast")
    );
    expect(breakfast, "Breakfast not found on non-school day").toBeTruthy();
    const mins = toMins(breakfast!.time);
    expect(mins).toBeGreaterThanOrEqual(8 * 60);
    expect(mins).toBeLessThan(9 * 60);
  });

  it("non-school day: no duplicate meal activity names", () => {
    const meals = nonSchoolItems.filter((i) => mealCategories.has(i.category));
    const names = meals.map((m) => m.activity);
    expect(new Set(names).size).toBe(names.length);
  });

  it("non-school day: every meal item renders MobileRecipeCard without crashing", () => {
    const meals = nonSchoolItems.filter((i) => mealCategories.has(i.category));
    expect(meals.length).toBeGreaterThanOrEqual(3);
    for (const item of meals) {
      const { unmount } = render(
        <MobileRecipeCard meal={item.activity} recipe={item.recipe} nutrition={item.nutrition} />
      );
      expect(screen.getByTestId("mobile-recipe-card")).toBeInTheDocument();
      unmount();
    }
  });
});
