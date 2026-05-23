import type { ModuleConfig } from "../types.js";

/**
 * Module eligibility definitions — filter by age, country, and development stage.
 * Remotely editable via Firebase/CMS.
 */
export const MODULE_CONFIGS: readonly ModuleConfig[] = [
  {
    moduleId: "phonics",
    minAgeMonths: 20,
    maxAgeMonths: 72,
    countriesAllowed: "*",
    priorityScore: 100,
    developmentStages: ["toddler", "preschooler"],
    freemiumPreviewCount: 2,
  },
  {
    moduleId: "motor_skills",
    minAgeMonths: 4,
    maxAgeMonths: 72,
    countriesAllowed: "*",
    priorityScore: 90,
    developmentStages: ["infant", "toddler", "preschooler"],
    freemiumPreviewCount: 3,
  },
  {
    moduleId: "social_emotional",
    minAgeMonths: 12,
    maxAgeMonths: 72,
    countriesAllowed: "*",
    priorityScore: 85,
    freemiumPreviewCount: 2,
  },
  {
    moduleId: "language",
    minAgeMonths: 6,
    maxAgeMonths: 72,
    countriesAllowed: "*",
    priorityScore: 88,
    freemiumPreviewCount: 2,
  },
  {
    moduleId: "cognitive",
    minAgeMonths: 24,
    maxAgeMonths: 72,
    countriesAllowed: "*",
    priorityScore: 80,
    developmentStages: ["toddler", "preschooler"],
    freemiumPreviewCount: 2,
  },
  {
    moduleId: "creativity",
    minAgeMonths: 18,
    maxAgeMonths: 72,
    countriesAllowed: "*",
    priorityScore: 75,
    freemiumPreviewCount: 2,
  },
  {
    moduleId: "stories",
    minAgeMonths: 12,
    maxAgeMonths: 72,
    countriesAllowed: "*",
    priorityScore: 70,
    freemiumPreviewCount: 1,
  },
  {
    moduleId: "puzzles",
    minAgeMonths: 36,
    maxAgeMonths: 72,
    countriesAllowed: "*",
    priorityScore: 65,
    developmentStages: ["preschooler"],
    freemiumPreviewCount: 1,
  },
];

export function mergeModuleConfigs(remote: ModuleConfig[] | null | undefined): ModuleConfig[] {
  if (!remote?.length) return [...MODULE_CONFIGS];
  const byId = new Map(MODULE_CONFIGS.map((m) => [m.moduleId, { ...m }]));
  for (const r of remote) {
    byId.set(r.moduleId, { ...byId.get(r.moduleId), ...r });
  }
  return [...byId.values()];
}
