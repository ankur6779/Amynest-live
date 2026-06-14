import { describe, expect, it } from "vitest";
import { generateGroceryList, mergeGroceryLists } from "@/features/nutrition/lib/grocery-generator";
import { extractIngredientsFromMeal, extractIngredientsFromWeek } from "@/features/nutrition/lib/grocery-ingredients";

describe("grocery-ingredients", () => {
  it("extracts tomato and onion from meal text", () => {
    const items = extractIngredientsFromMeal("Tomato onion sabzi with roti");
    const names = items.map((i) => i.item);
    expect(names).toContain("Tomato");
    expect(names).toContain("Onion");
    expect(names).toContain("Whole wheat flour (atta)");
  });

  it("aggregates duplicate ingredients across week", () => {
    const week = ["Palak dal + rice", "Dal khichdi", "Tomato onion sabzi"];
    const items = extractIngredientsFromWeek(week);
    const dal = items.find((i) => i.item === "Dal / Pulses");
    const tomato = items.find((i) => i.item === "Tomato");
    expect(dal!.qty).toBeGreaterThanOrEqual(2);
    expect(tomato!.qty).toBeGreaterThanOrEqual(2);
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

  it("formats display strings with quantities", () => {
    const groups = generateGroceryList({ weekMeals, familySize: 1 });
    const all = groups.flatMap((g) => g.items);
    expect(all.some((i) => i.display.includes("×"))).toBe(true);
  });

  it("scales quantities by family size", () => {
    const small = generateGroceryList({ weekMeals, familySize: 1 });
    const large = generateGroceryList({ weekMeals, familySize: 4 });
    const smallTomato = small.flatMap((g) => g.items).find((i) => i.name === "Tomato");
    const largeTomato = large.flatMap((g) => g.items).find((i) => i.name === "Tomato");
    expect(largeTomato!.quantity).toBeGreaterThan(smallTomato!.quantity);
  });

  it("mergeGroceryLists aggregates duplicate ids", () => {
    const listA = generateGroceryList({ weekMeals: ["Tomato sabzi"], familySize: 2 });
    const listB = generateGroceryList({ weekMeals: ["Tomato onion curry"], familySize: 2 });
    const merged = mergeGroceryLists([listA, listB]);
    const tomato = merged.flatMap((g) => g.items).find((i) => i.name === "Tomato");
    expect(tomato!.quantity).toBeGreaterThan(2);
  });
});
