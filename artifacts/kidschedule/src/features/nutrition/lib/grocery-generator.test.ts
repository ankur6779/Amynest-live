import { describe, expect, it } from "vitest";
import { generateGroceryList, mergeGroceryLists } from "@/features/nutrition/lib/grocery-generator";
import { countIngredientMentions, extractIngredientsFromMeal } from "@/features/nutrition/lib/grocery-ingredients";

describe("grocery-ingredients", () => {
  it("extracts tomato and onion from meal text", () => {
    const items = extractIngredientsFromMeal("Tomato onion sabzi with roti");
    const names = items.map((i) => i.item);
    expect(names).toContain("Tomato");
    expect(names).toContain("Onion");
    expect(names).toContain("Whole wheat flour (atta)");
  });

  it("aggregates duplicate ingredients across week", () => {
    const week = ["Palak dal + rice", "Dal khichdi", "Tomato onion sabzi", "Tomato curry + roti"];
    const { mentionCounts } = countIngredientMentions(week);
    const dal = mentionCounts.get("Dal / Pulses");
    const tomato = mentionCounts.get("Tomato");
    expect(dal!.mentions).toBeGreaterThanOrEqual(2);
    expect(tomato!.mentions).toBeGreaterThanOrEqual(2);
  });
});

describe("grocery-generator", () => {
  const weekMeals = [
    "Tomato onion sabzi + roti",
    "Palak dal + rice",
    "Idli with chutney",
    "Curd rice + pickle",
    "Vegetable paratha",
  ];

  it("groups items by category", () => {
    const groups = generateGroceryList({ weekMeals, familySize: 3 });
    const categories = groups.map((g) => g.category);
    expect(categories).toContain("vegetables");
    expect(categories).toContain("grains");
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
  });

  it("formats display strings with explicit units", () => {
    const groups = generateGroceryList({ weekMeals, familySize: 1 });
    const all = groups.flatMap((g) => g.items);
    expect(all.every((i) => i.display.includes("×"))).toBe(true);
    expect(all.some((i) => i.unit === "kg" || i.unit === "L" || i.unit === "count")).toBe(true);
  });

  it("scales quantities by family size", () => {
    const tomatoWeek = ["Tomato onion sabzi + roti", "Tomato curry", "Tomato rice"];
    const small = generateGroceryList({ weekMeals: tomatoWeek, familySize: 1 });
    const large = generateGroceryList({ weekMeals: tomatoWeek, familySize: 8 });
    const smallTomato = small.flatMap((g) => g.items).find((i) => i.name === "Tomato");
    const largeTomato = large.flatMap((g) => g.items).find((i) => i.name === "Tomato");
    expect(largeTomato!.quantity).toBeGreaterThan(smallTomato!.quantity);
  });

  it("mergeGroceryLists aggregates duplicate ids", () => {
    const listA = generateGroceryList({ weekMeals: ["Tomato sabzi"], familySize: 2 });
    const listB = generateGroceryList({ weekMeals: ["Tomato onion curry"], familySize: 2 });
    const merged = mergeGroceryLists([listA, listB]);
    const tomato = merged.flatMap((g) => g.items).find((i) => i.name === "Tomato");
    expect(tomato!.quantity).toBeGreaterThan(1);
  });
});
