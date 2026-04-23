import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MealRecipeCard } from "./MealRecipeCard";

const sampleRecipe = {
  prepTime: "10 mins",
  cookTime: "5 mins",
  servings: "1",
  ingredients: ["1 cup oats", "1 banana", "100 ml milk"],
  steps: ["Mash the banana.", "Mix with oats and milk.", "Cook 5 mins."],
  tip: "Add honey for sweetness",
};

const sampleNutrition = {
  calories: "320 kcal",
  protein: "8 g",
  carbs: "55 g",
  fat: "6 g",
  notes: "Good source of fibre",
};

describe("MealRecipeCard – rendering", () => {
  it("renders nothing when both recipe and nutrition are absent", () => {
    const { container } = render(<MealRecipeCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the collapsible card when recipe is present", () => {
    render(<MealRecipeCard meal="Oat Porridge" recipe={sampleRecipe} />);
    expect(screen.getByTestId("meal-recipe-card")).toBeInTheDocument();
  });

  it("renders the collapsible card when only nutrition is present", () => {
    render(<MealRecipeCard nutrition={sampleNutrition} />);
    expect(screen.getByTestId("meal-recipe-card")).toBeInTheDocument();
  });

  it("shows 'Recipe & Nutrition' as the summary label", () => {
    render(<MealRecipeCard recipe={sampleRecipe} nutrition={sampleNutrition} />);
    expect(screen.getByText(/Recipe & Nutrition/i)).toBeInTheDocument();
  });

  it("shows meal name in recipe section", () => {
    render(<MealRecipeCard meal="Oat Porridge" recipe={sampleRecipe} />);
    expect(screen.getByText("Oat Porridge")).toBeInTheDocument();
  });

  it("shows prep/cook time and servings in the recipe meta line", () => {
    render(<MealRecipeCard meal="Oat Porridge" recipe={sampleRecipe} />);
    const section = screen.getByTestId("recipe-section");
    expect(section).toHaveTextContent("Prep 10 mins");
    expect(section).toHaveTextContent("Cook 5 mins");
    expect(section).toHaveTextContent("Serves 1");
  });

  it("lists all ingredients", () => {
    render(<MealRecipeCard meal="Oat Porridge" recipe={sampleRecipe} />);
    expect(screen.getByText("1 cup oats")).toBeInTheDocument();
    expect(screen.getByText("1 banana")).toBeInTheDocument();
    expect(screen.getByText("100 ml milk")).toBeInTheDocument();
  });

  it("lists all steps", () => {
    render(<MealRecipeCard meal="Oat Porridge" recipe={sampleRecipe} />);
    expect(screen.getByText("Mash the banana.")).toBeInTheDocument();
    expect(screen.getByText("Mix with oats and milk.")).toBeInTheDocument();
    expect(screen.getByText("Cook 5 mins.")).toBeInTheDocument();
  });

  it("shows optional recipe tip", () => {
    render(<MealRecipeCard recipe={sampleRecipe} />);
    expect(screen.getByText(/Add honey for sweetness/)).toBeInTheDocument();
  });

  it("renders nutrition section with all four macros", () => {
    render(<MealRecipeCard nutrition={sampleNutrition} />);
    const section = screen.getByTestId("nutrition-section");
    expect(section).toBeInTheDocument();
    expect(section).toHaveTextContent("320 kcal");
    expect(section).toHaveTextContent("8 g");
    expect(section).toHaveTextContent("55 g");
    expect(section).toHaveTextContent("6 g");
  });

  it("shows nutrition notes when provided", () => {
    render(<MealRecipeCard nutrition={sampleNutrition} />);
    expect(screen.getByText("Good source of fibre")).toBeInTheDocument();
  });

  it("shows macro labels Calories, Protein, Carbs, Fat", () => {
    render(<MealRecipeCard nutrition={sampleNutrition} />);
    expect(screen.getByText("Calories")).toBeInTheDocument();
    expect(screen.getByText("Protein")).toBeInTheDocument();
    expect(screen.getByText("Carbs")).toBeInTheDocument();
    expect(screen.getByText("Fat")).toBeInTheDocument();
  });

  it("is closed by default (defaultOpen = false)", () => {
    render(<MealRecipeCard recipe={sampleRecipe} />);
    const details = screen.getByTestId("meal-recipe-card");
    expect(details).not.toHaveAttribute("open");
  });

  it("can be opened by default via defaultOpen prop", () => {
    render(<MealRecipeCard recipe={sampleRecipe} defaultOpen />);
    const details = screen.getByTestId("meal-recipe-card");
    expect(details).toHaveAttribute("open");
  });

  it("renders both recipe and nutrition sections together", () => {
    render(<MealRecipeCard meal="Oat Porridge" recipe={sampleRecipe} nutrition={sampleNutrition} />);
    expect(screen.getByTestId("recipe-section")).toBeInTheDocument();
    expect(screen.getByTestId("nutrition-section")).toBeInTheDocument();
  });

  it("falls back to 'Recipe' as meal name when meal is not provided", () => {
    render(<MealRecipeCard recipe={sampleRecipe} />);
    expect(screen.getByText("Recipe")).toBeInTheDocument();
  });
});

describe("MealRecipeCard – school-day meal slot representative samples", () => {
  const schoolMealSlots = [
    {
      label: "Quick Meal Before School",
      meal: "Banana Oat Smoothie",
      recipe: { prepTime: "5 mins", cookTime: "0 mins", servings: "1",
        ingredients: ["1 banana", "1 cup oats", "200ml milk"],
        steps: ["Blend all ingredients.", "Pour and serve."] },
      nutrition: { calories: "280 kcal", protein: "7 g", carbs: "50 g", fat: "4 g" },
    },
    {
      label: "Tiffin",
      meal: "Vegetable Paratha",
      recipe: { prepTime: "10 mins", cookTime: "10 mins", servings: "1",
        ingredients: ["1 cup wheat flour", "Mixed vegetables"],
        steps: ["Prepare dough.", "Stuff with veggies.", "Cook on pan."] },
      nutrition: { calories: "350 kcal", protein: "9 g", carbs: "60 g", fat: "7 g" },
    },
    {
      label: "Lunch",
      meal: "Rice and Dal",
      recipe: { prepTime: "5 mins", cookTime: "20 mins", servings: "1",
        ingredients: ["1 cup rice", "1/2 cup dal"],
        steps: ["Cook rice.", "Prepare dal.", "Serve together."] },
      nutrition: { calories: "500 kcal", protein: "15 g", carbs: "90 g", fat: "5 g" },
    },
    {
      label: "Drunch",
      meal: "Fruit Bowl",
      recipe: { prepTime: "5 mins", cookTime: "0 mins", servings: "1",
        ingredients: ["Seasonal fruits"], steps: ["Chop and serve."] },
      nutrition: { calories: "180 kcal", protein: "2 g", carbs: "40 g", fat: "1 g" },
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

  it("every school-day meal slot renders a recipe section and a nutrition section", () => {
    for (const slot of schoolMealSlots) {
      const { unmount } = render(
        <MealRecipeCard meal={slot.meal} recipe={slot.recipe} nutrition={slot.nutrition} />
      );
      expect(screen.getByTestId("meal-recipe-card")).toBeInTheDocument();
      expect(screen.getByTestId("recipe-section")).toBeInTheDocument();
      expect(screen.getByTestId("nutrition-section")).toBeInTheDocument();
      unmount();
    }
  });

  it("each slot's meal name appears in its recipe section heading", () => {
    for (const slot of schoolMealSlots) {
      const { unmount } = render(
        <MealRecipeCard meal={slot.meal} recipe={slot.recipe} nutrition={slot.nutrition} />
      );
      expect(screen.getByText(slot.meal)).toBeInTheDocument();
      unmount();
    }
  });
});

describe("MealRecipeCard – non-school day meal slot representative samples", () => {
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
        ingredients: ["1 cup poha", "1 potato", "Spices"],
        steps: ["Soak poha.", "Fry potato.", "Mix and cook."] },
      nutrition: { calories: "280 kcal", protein: "6 g", carbs: "50 g", fat: "5 g" },
    },
    {
      label: "Dinner",
      meal: "Khichdi",
      recipe: { prepTime: "10 mins", cookTime: "20 mins", servings: "2",
        ingredients: ["1 cup rice", "1/2 cup moong dal"],
        steps: ["Pressure cook rice and dal.", "Season with ghee."] },
      nutrition: { calories: "420 kcal", protein: "14 g", carbs: "75 g", fat: "6 g" },
    },
  ];

  it("every non-school-day meal slot renders a Recipe & Nutrition card", () => {
    for (const slot of nonSchoolSlots) {
      const { unmount } = render(
        <MealRecipeCard meal={slot.meal} recipe={slot.recipe} nutrition={slot.nutrition} />
      );
      expect(screen.getByTestId("meal-recipe-card")).toBeInTheDocument();
      unmount();
    }
  });

  it("Breakfast meal name is visible in its recipe card", () => {
    const slot = nonSchoolSlots[0];
    render(<MealRecipeCard meal={slot.meal} recipe={slot.recipe} nutrition={slot.nutrition} />);
    expect(screen.getByText(slot.meal)).toBeInTheDocument();
  });
});

describe("MealRecipeCard – interactive toggle", () => {
  it("opens when user clicks the summary", async () => {
    const user = userEvent.setup();
    render(<MealRecipeCard recipe={sampleRecipe} />);
    const details = screen.getByTestId("meal-recipe-card");
    const summary = screen.getByText(/Recipe & Nutrition/i);
    expect(details).not.toHaveAttribute("open");
    await user.click(summary);
    expect(details).toHaveAttribute("open");
  });
});
