import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildDayWhatsAppText,
  buildWeekPlanLines,
  generateMealPlanPdf,
  shareMealPlanText,
} from "@/features/nutrition/lib/plan-meal-export";

const sampleDay = {
  dayLabel: "Sunday",
  meals: {
    breakfast: "Pancakes + milk",
    lunch: "Puri + aloo sabzi",
    snack: "Fruit salad",
    dinner: "Khichdi + ghee",
  },
};

const sampleMeta = {
  ageCategory: "Toddlers & Preschool (1–6 years)",
  dietLabel: "Veg",
};

describe("plan-meal-export", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds WhatsApp text with day and meal slots", () => {
    const text = buildDayWhatsAppText(sampleDay, sampleMeta);

    expect(text).toContain("Day: Sunday");
    expect(text).toContain("Breakfast: Pancakes + milk");
    expect(text).toContain("Lunch: Puri + aloo sabzi");
    expect(text).toContain("Snack: Fruit salad");
    expect(text).toContain("Dinner: Khichdi + ghee");
    expect(text).toContain("Diet: Veg");
  });

  it("includes mid-morning when present", () => {
    const text = buildDayWhatsAppText(
      {
        ...sampleDay,
        meals: { ...sampleDay.meals, midMorning: "Banana" },
      },
      sampleMeta,
    );

    expect(text).toContain("Mid-Morning: Banana");
  });

  it("builds weekly plan lines for PDF content", () => {
    const lines = buildWeekPlanLines([sampleDay], sampleMeta);

    expect(lines[0]).toBe("AmyNest Weekly Meal Plan");
    expect(lines).toContain("— Sunday —");
    expect(lines).toContain("Breakfast: Pancakes + milk");
  });

  it("generates a non-empty PDF byte array", async () => {
    const bytes = await generateMealPlanPdf([sampleDay], sampleMeta);

    expect(bytes.byteLength).toBeGreaterThan(500);
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe("%PDF");
  });

  it("opens WhatsApp deep link when share API is unavailable", async () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    vi.stubGlobal("navigator", {});

    const result = await shareMealPlanText("Hello plan", "Title");

    expect(result).toBe("whatsapp");
    expect(open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/?text="),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("uses navigator.share when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });

    const result = await shareMealPlanText("Hello plan", "Title");

    expect(result).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "Title", text: "Hello plan" });
  });
});
