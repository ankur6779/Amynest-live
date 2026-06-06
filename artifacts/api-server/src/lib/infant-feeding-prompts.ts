export type InfantFeedingPlanContext = {
  childName: string;
  ageMonths: number;
  dietType?: string;
  allergies?: string;
  parentAllergies?: string;
  careLogs14d: Array<{ logType: string; loggedAt: string }>;
};

export type AllergyIntroEntry = {
  week: number;
  food: string;
  method: string;
};

export type InfantFeedingDayPlan = {
  day: string;
  meals: Record<string, { name: string; texture: string; portion: string }>;
};

export type InfantFeedingPlan = {
  roadmapSummary: string;
  allergyIntroTimeline: string[];
  /** Structured AAP-aligned allergen schedule for ages 6–12 months. */
  allergyIntroductionRoadmap: AllergyIntroEntry[];
  portionGuidance: string;
  days: InfantFeedingDayPlan[];
};

export const ALLERGY_INTRO_GUIDANCE_BLOCK = `
ALLERGY INTRODUCTION (AAP-aligned, ages 6–12 months):
- Introduce common allergens early (around 6 months when solids begin), one at a time, while continuing breast milk or formula.
- Priority allergens: peanut, egg, dairy (yogurt/cheese), wheat, soy, tree nuts (as nut butter/thinned paste), fish, sesame.
- Offer a small amount at home when baby is well; watch for hives, vomiting, or breathing changes for 2 hours after.
- Do NOT delay allergen introduction without clinician advice — early exposure reduces allergy risk for most foods.
- For peanut/egg: start with age-appropriate forms (smooth peanut butter thinned with breast milk or puree; well-cooked egg).
- Space new allergens ~3–7 days apart when possible so parents can identify triggers.
- Include allergyIntroductionRoadmap as { week, food, method }[] covering weeks 1–8 of solids (relative to starting solids).
- Also populate allergyIntroTimeline as short human-readable strings derived from the roadmap.
`.trim();

const SAFETY_GUARDRAILS = `
SAFETY (mandatory):
- Parenting/nutrition guidance only — not medical advice. Never diagnose allergies or feeding disorders.
- No honey before 12 months. No choking hazards (whole nuts, grapes, popcorn).
- If known severe allergy in family, suggest clinician guidance before introducing that allergen.
- Respect listed child/parent allergies — never recommend those foods.
`.trim();

export function buildInfantFeedingPlanPrompt(ctx: InfantFeedingPlanContext): string {
  const logsBlock =
    ctx.careLogs14d.length === 0
      ? "No feed logs in the past 14 days."
      : ctx.careLogs14d
          .slice(0, 40)
          .map((l) => `- ${l.logType} @ ${l.loggedAt}`)
          .join("\n");

  const includeAllergy = ctx.ageMonths >= 6 && ctx.ageMonths <= 12;

  return `You are AmyNest Infant Feeding Coach — practical solids guidance for parents.

${SAFETY_GUARDRAILS}

${includeAllergy ? ALLERGY_INTRO_GUIDANCE_BLOCK : "Child is outside 6–12 month allergy-intro window — set allergyIntroductionRoadmap to [] and allergyIntroTimeline to []."}

Child: ${ctx.childName}, ${ctx.ageMonths} months.
Diet type: ${ctx.dietType ?? "not specified"}
Child allergies: ${ctx.allergies || "none noted"}
Parent allergies: ${ctx.parentAllergies || "none noted"}

Recent care logs (14 days):
${logsBlock}

Output ONLY valid JSON:
{
  "roadmapSummary": "string — 2–3 sentence overview of the 7-day feeding approach",
  "allergyIntroTimeline": ["string — ordered intro steps as short bullets"],
  "allergyIntroductionRoadmap": [{ "week": number, "food": string, "method": string }],
  "portionGuidance": "string — age-appropriate portion/texture guidance",
  "days": [
    {
      "day": "Day 1" through "Day 7",
      "meals": {
        "breakfast": { "name": string, "texture": string, "portion": string },
        "lunch": { "name": string, "texture": string, "portion": string },
        "dinner": { "name": string, "texture": string, "portion": string },
        "snack": { "name": string, "texture": string, "portion": string }
      }
    }
  ]
}

Provide exactly 7 days. Keep meal names simple and culturally neutral.`;
}

export function sanitizeInfantFeedingPlan(raw: unknown): InfantFeedingPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const days = (Array.isArray(o.days) ? o.days : [])
    .slice(0, 7)
    .map((d, i) => {
      if (!d || typeof d !== "object") return null;
      const day = d as Record<string, unknown>;
      const mealsRaw = day.meals;
      if (!mealsRaw || typeof mealsRaw !== "object") return null;
      const meals: InfantFeedingDayPlan["meals"] = {};
      for (const [slot, meal] of Object.entries(mealsRaw as Record<string, unknown>)) {
        if (!meal || typeof meal !== "object") continue;
        const m = meal as Record<string, unknown>;
        meals[slot] = {
          name: String(m.name ?? "").slice(0, 120) || "Meal",
          texture: String(m.texture ?? "").slice(0, 80) || "mashed",
          portion: String(m.portion ?? "").slice(0, 80) || "small spoonfuls",
        };
      }
      if (Object.keys(meals).length === 0) return null;
      return {
        day: String(day.day ?? `Day ${i + 1}`).slice(0, 40),
        meals,
      };
    })
    .filter((d): d is InfantFeedingDayPlan => d != null);

  if (days.length === 0) return null;

  const allergyIntroductionRoadmap = (Array.isArray(o.allergyIntroductionRoadmap)
    ? o.allergyIntroductionRoadmap
    : []
  )
    .slice(0, 12)
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const food = String(e.food ?? "").slice(0, 80);
      const method = String(e.method ?? "").slice(0, 200);
      const week = Number(e.week);
      if (!food || !Number.isFinite(week)) return null;
      return { week, food, method: method || "Small taste at home when well." };
    })
    .filter((e): e is AllergyIntroEntry => e != null);

  const allergyIntroTimeline = (Array.isArray(o.allergyIntroTimeline) ? o.allergyIntroTimeline : [])
    .slice(0, 12)
    .map((s) => String(s).slice(0, 200))
    .filter(Boolean);

  return {
    roadmapSummary:
      String(o.roadmapSummary ?? "").slice(0, 600) ||
      "A gentle 7-day solids roadmap tailored to your baby's age.",
    allergyIntroTimeline:
      allergyIntroTimeline.length > 0
        ? allergyIntroTimeline
        : allergyIntroductionRoadmap.map(
            (e) => `Week ${e.week}: ${e.food} — ${e.method}`,
          ),
    allergyIntroductionRoadmap,
    portionGuidance:
      String(o.portionGuidance ?? "").slice(0, 400) ||
      "Offer small portions; let baby lead appetite.",
    days,
  };
}
