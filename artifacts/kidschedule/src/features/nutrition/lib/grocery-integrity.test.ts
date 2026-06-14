import { describe, expect, it } from "vitest";
import { generateGroceryList } from "@/features/nutrition/lib/grocery-generator";
import {
  buildHouseholdGrocery,
  collectHouseholdWeekMeals,
  collectWeekMeals,
} from "@/features/nutrition/lib/household-grocery";
import { countIngredientMentions } from "@/features/nutrition/lib/grocery-ingredients";
import {
  weeklyEggCount,
  weeklyMilkLiters,
} from "@/features/nutrition/lib/grocery-quantity-engine";
import { resolveHouseholdSize } from "@/features/nutrition/lib/grocery-household-size";

function findItem(groups: ReturnType<typeof generateGroceryList>, name: string) {
  return groups.flatMap((g) => g.items).find((i) => i.name === name);
}

describe("grocery integrity — critical & high fixes", () => {
  const preschoolVeg = collectWeekMeals("preschool_3_6", "south_indian", true);
  const preschoolNonVeg = collectWeekMeals("preschool_3_6", "south_indian", false);

  describe("C1 egg weekly household calibration", () => {
    it("non-veg week produces realistic egg count (not 288)", () => {
      const list = generateGroceryList({ weekMeals: preschoolNonVeg, familySize: 4 });
      const eggs = findItem(list, "Eggs");
      expect(eggs).toBeDefined();
      expect(eggs!.quantity).toBeLessThanOrEqual(36);
      expect(eggs!.quantity).toBeGreaterThanOrEqual(6);
      expect(eggs!.quantity).toBeLessThan(50);
      expect(eggs!.display).toMatch(/× \d+$/);
    });

    it("veg week omits eggs when plan has no egg meals", () => {
      const list = generateGroceryList({ weekMeals: preschoolVeg, familySize: 4 });
      expect(findItem(list, "Eggs")).toBeUndefined();
    });
  });

  describe("C2 milk liters", () => {
    it("displays milk in liters not unitless count", () => {
      const list = generateGroceryList({ weekMeals: preschoolVeg, familySize: 4 });
      const milk = findItem(list, "Milk");
      expect(milk).toBeDefined();
      expect(milk!.unit).toBe("L");
      expect(milk!.display).toMatch(/× [\d.]+ L$/);
      expect(milk!.quantity).toBeLessThanOrEqual(14);
      expect(milk!.quantity).toBeGreaterThanOrEqual(2);
    });
  });

  describe("C3 household single-pass aggregation", () => {
    const childA = {
      childId: 1,
      name: "A",
      ageGroupId: "preschool_3_6" as const,
      foodStyle: "south_indian",
      memoryEntries: [],
    };
    const childB = {
      childId: 2,
      name: "B",
      ageGroupId: "preschool_3_6" as const,
      foodStyle: "south_indian",
      memoryEntries: [],
    };
    const childC = {
      childId: 3,
      name: "C",
      ageGroupId: "preschool_3_6" as const,
      foodStyle: "south_indian",
      memoryEntries: [],
    };

    it("3 identical children do not inflate milk vs single child same familySize", () => {
      const single = generateGroceryList({ weekMeals: preschoolVeg, familySize: 5 });
      const household = buildHouseholdGrocery([childA, childB, childC], 5, true);
      const milkSingle = findItem(single, "Milk")!.quantity;
      const milkHouse = findItem(household, "Milk")!.quantity;
      expect(milkHouse).toBe(milkSingle);
    });

    it("collectHouseholdWeekMeals dedupes identical meal strings", () => {
      const union = collectHouseholdWeekMeals([childA, childB], true);
      expect(union.length).toBe(preschoolVeg.length);
    });
  });

  describe("C4 veg / non-veg integrity", () => {
    it("veg and non-veg weeks produce different grocery signals", () => {
      const vegList = generateGroceryList({ weekMeals: preschoolVeg, familySize: 4 });
      const nonVegList = generateGroceryList({ weekMeals: preschoolNonVeg, familySize: 4 });
      expect(findItem(vegList, "Eggs")).toBeUndefined();
      expect(findItem(nonVegList, "Eggs")).toBeDefined();
      const vegProtein = findItem(vegList, "Protein (chicken / fish / meat)");
      const nonVegProtein = findItem(nonVegList, "Protein (chicken / fish / meat)");
      expect(vegProtein?.quantity ?? 0).toBeLessThan(nonVegProtein?.quantity ?? 1);
    });
  });

  describe("H1 paneer deduplication", () => {
    it("palak paneer meal yields single paneer line not protein duplicate", () => {
      const { mentionCounts } = countIngredientMentions(["Palak paneer + roti + rice + dal"]);
      expect(mentionCounts.has("Paneer")).toBe(true);
      expect(mentionCounts.has("Protein (paneer / egg / meat)")).toBe(false);
    });
  });

  describe("H2 household size model", () => {
    it("resolveHouseholdSize uses adults + children not children+2", () => {
      expect(resolveHouseholdSize(1)).toBe(3);
      expect(resolveHouseholdSize(2)).toBe(4);
      expect(resolveHouseholdSize(0)).toBe(2);
      expect(resolveHouseholdSize(8)).toBe(8);
    });
  });

  describe("H3 unit normalization", () => {
    it("rice and dal display in kg without arbitrary divide-by-3", () => {
      const list = generateGroceryList({ weekMeals: preschoolVeg, familySize: 4 });
      const rice = findItem(list, "Rice");
      const dal = findItem(list, "Dal / Pulses");
      expect(rice!.unit).toBe("kg");
      expect(rice!.display).toMatch(/× [\d.]+ kg$/);
      expect(dal!.unit).toBe("kg");
      expect(dal!.display).toMatch(/× [\d.]+ kg$/);
      expect(rice!.quantity).toBeLessThanOrEqual(8);
      expect(dal!.quantity).toBeLessThanOrEqual(8);
    });
  });

  describe("H4 keyword inflation reduction", () => {
    it("generic sabzi alone does not add mixed vegetables", () => {
      const { mentionCounts } = countIngredientMentions(["Tomato onion sabzi with roti"]);
      expect(mentionCounts.has("Mixed vegetables")).toBe(false);
      expect(mentionCounts.has("Tomato")).toBe(true);
    });

    it("seasonal fruit requires explicit phrase not lone fruit word", () => {
      const fruitSalad = countIngredientMentions(["Fruit salad smoothie"]);
      const seasonal = countIngredientMentions(["Banana seasonal fruit snack"]);
      expect(fruitSalad.mentionCounts.has("Seasonal fruit")).toBe(false);
      expect(seasonal.mentionCounts.has("Seasonal fruit")).toBe(true);
      expect(seasonal.mentionCounts.has("Banana")).toBe(true);
    });
  });
});

describe("grocery integrity — family size 1–8 matrix", () => {
  const week = collectWeekMeals("preschool_3_6", "south_indian", true);
  const { milkMealDays, eggMealDays } = countIngredientMentions(week);

  for (const familySize of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`familySize ${familySize} — expected vs actual key staples`, () => {
      const list = generateGroceryList({ weekMeals: week, familySize });
      const milk = findItem(list, "Milk");
      const rice = findItem(list, "Rice");
      const dal = findItem(list, "Dal / Pulses");
      const banana = findItem(list, "Banana");

      const expectedMilk = weeklyMilkLiters(familySize, milkMealDays);
      const expectedEggs = weeklyEggCount(familySize, eggMealDays);

      expect(milk!.quantity).toBe(expectedMilk);
      expect(milk!.quantity).toBeLessThanOrEqual(14);
      expect(milk!.unit).toBe("L");
      expect(rice!.quantity).toBeLessThanOrEqual(10);
      expect(rice!.unit).toBe("kg");
      expect(dal!.quantity).toBeLessThanOrEqual(10);
      expect(dal!.unit).toBe("kg");
      if (banana) {
        expect(banana.quantity).toBeLessThan(25);
      }
      if (eggMealDays > 0) {
        const eggs = findItem(list, "Eggs");
        expect(eggs!.quantity).toBe(expectedEggs);
        expect(eggs!.quantity).toBeLessThanOrEqual(36);
      }
    });
  }
});

describe("grocery integrity — before/after reference (preschool veg fs4)", () => {
  it("documents expected vs actual key staples", () => {
    const list = generateGroceryList({
      weekMeals: collectWeekMeals("preschool_3_6", "south_indian", true),
      familySize: 4,
    });

    const staples = {
      milk: findItem(list, "Milk"),
      rice: findItem(list, "Rice"),
      dal: findItem(list, "Dal / Pulses"),
      banana: findItem(list, "Banana"),
    };

    // Before audit (FAIL): Milk × 64, Dal × 15 kg, Rice × 7 kg, Banana × 36
    expect(staples.milk!.display).not.toBe("Milk × 64");
    expect(staples.milk!.quantity).toBeLessThan(20);
    expect(staples.rice!.quantity).toBeLessThan(10);
    expect(staples.dal!.quantity).toBeLessThan(10);
    expect(staples.banana!.quantity).toBeLessThan(20);
  });

  it("documents non-veg egg before/after", () => {
    const list = generateGroceryList({
      weekMeals: collectWeekMeals("preschool_3_6", "south_indian", false),
      familySize: 4,
    });
    const eggs = findItem(list, "Eggs")!;
    // Before: × 288
    expect(eggs.quantity).toBeLessThan(40);
    expect(eggs.quantity).toBe(weeklyEggCount(4, 12));
  });
});
