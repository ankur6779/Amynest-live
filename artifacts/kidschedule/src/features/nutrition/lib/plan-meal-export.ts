/** Client-side meal plan export — WhatsApp share text and weekly PDF. No API. */

export type MealPlanDayExport = {
  dayLabel: string;
  meals: {
    breakfast?: string;
    midMorning?: string;
    lunch?: string;
    snack?: string;
    dinner?: string;
  };
};

export type MealPlanExportMeta = {
  ageCategory: string;
  dietLabel: string;
};

const SLOT_ORDER: Array<{ key: keyof MealPlanDayExport["meals"]; label: string }> = [
  { key: "breakfast", label: "Breakfast" },
  { key: "midMorning", label: "Mid-Morning" },
  { key: "lunch", label: "Lunch" },
  { key: "snack", label: "Snack" },
  { key: "dinner", label: "Dinner" },
];

export function buildDayWhatsAppText(day: MealPlanDayExport, meta: MealPlanExportMeta): string {
  const lines = [
    `AmyNest Meal Plan — ${meta.ageCategory}`,
    `Day: ${day.dayLabel}`,
    `Diet: ${meta.dietLabel}`,
    "",
  ];

  for (const { key, label } of SLOT_ORDER) {
    const meal = day.meals[key];
    if (meal?.trim()) lines.push(`${label}: ${meal.trim()}`);
  }

  return lines.join("\n");
}

export function buildWeekPlanLines(days: MealPlanDayExport[], meta: MealPlanExportMeta): string[] {
  const lines = [
    "AmyNest Weekly Meal Plan",
    meta.ageCategory,
    meta.dietLabel,
    "",
  ];

  for (const day of days) {
    lines.push(`— ${day.dayLabel} —`);
    for (const { key, label } of SLOT_ORDER) {
      const meal = day.meals[key];
      if (meal?.trim()) lines.push(`${label}: ${meal.trim()}`);
    }
    lines.push("");
  }

  return lines;
}

export type MealPlanShareResult = "shared" | "whatsapp" | "cancelled";

export async function shareMealPlanText(text: string, title: string): Promise<MealPlanShareResult> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }

  if (typeof window !== "undefined") {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    return "whatsapp";
  }

  return "cancelled";
}

export async function generateMealPlanPdf(
  days: MealPlanDayExport[],
  meta: MealPlanExportMeta,
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const lineHeight = 14;
  const maxWidth = pageWidth - margin * 2;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const wrapLine = (text: string, size: number, useBold: boolean): string[] => {
    const activeFont = useBold ? bold : font;
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (activeFont.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  const draw = (text: string, size: number, useBold = false) => {
    for (const line of wrapLine(text, size, useBold)) {
      if (y < margin + lineHeight) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: useBold ? bold : font,
      });
      y -= lineHeight + 2;
    }
  };

  draw("AmyNest Weekly Meal Plan", 16, true);
  draw(meta.ageCategory, 12, true);
  draw(meta.dietLabel, 11);
  y -= 6;

  for (const day of days) {
    draw(day.dayLabel, 12, true);
    for (const { key, label } of SLOT_ORDER) {
      const meal = day.meals[key];
      if (!meal?.trim()) continue;
      draw(`${label}: ${meal.trim()}`, 10);
    }
    y -= 4;
  }

  return doc.save();
}

export function downloadMealPlanPdf(bytes: Uint8Array, filename: string): void {
  const part = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([part], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}
