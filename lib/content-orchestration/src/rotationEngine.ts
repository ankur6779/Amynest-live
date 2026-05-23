import { DEFAULT_ANTI_REPETITION } from "./config/global-defaults.js";
import { selectContent } from "./contentEngine.js";
import { filterEligibleModules, getModuleConfig } from "./moduleEngine.js";
import { dateSeed } from "./utils/seededShuffle.js";
import type {
  AgeEngineOutput,
  AntiRepetitionConfig,
  ContentHistoryEntry,
  ContentPool,
  CountryCode,
  DailyPlan,
  DailyPlanModule,
  ModuleId,
} from "./types.js";

export type RotationInput = {
  childId: string;
  dateIso: string;
  age: AgeEngineOutput;
  countryCode: CountryCode;
  poolsByModule: Partial<Record<ModuleId, ContentPool[]>>;
  history: ContentHistoryEntry[];
  unlockedModules?: ModuleId[];
  itemsPerModule?: number;
  antiRepetition?: AntiRepetitionConfig;
  referenceDate?: Date;
};

const DEFAULT_ITEMS_PER_MODULE = 4;
const PREVIEW_ITEMS = 2;

function splitNewVsFamiliar<T extends { isNew: boolean }>(
  items: T[],
  config: AntiRepetitionConfig,
): { newItems: T[]; familiarItems: T[] } {
  const newItems = items.filter((i) => i.isNew);
  const familiarItems = items.filter((i) => !i.isNew);
  const total = items.length;
  const newCount = Math.round(total * config.newContentRatio);
  const familiarCount = total - newCount;
  return {
    newItems: newItems.slice(0, newCount),
    familiarItems: familiarItems.slice(0, familiarCount),
  };
}

export function buildDailyPlanModules(input: RotationInput): DailyPlanModule[] {
  const config = input.antiRepetition ?? DEFAULT_ANTI_REPETITION;
  const ref = input.referenceDate ?? new Date(input.dateIso);
  const itemsPerModule = input.itemsPerModule ?? DEFAULT_ITEMS_PER_MODULE;

  const eligible = filterEligibleModules({
    age: input.age,
    countryCode: input.countryCode,
    unlockedModules: input.unlockedModules,
  });

  const modules: DailyPlanModule[] = [];

  for (const mod of eligible) {
    const pools = input.poolsByModule[mod.moduleId] ?? [];
    const count = mod.previewOnly
      ? (getModuleConfig(mod.moduleId)?.freemiumPreviewCount ?? PREVIEW_ITEMS)
      : itemsPerModule;

    const selected = selectContent({
      childId: input.childId,
      moduleId: mod.moduleId,
      ageBand: input.age.ageBand,
      countryCode: input.countryCode,
      count,
      history: input.history.filter((h) => h.moduleId === mod.moduleId),
      pool: pools,
      antiRepetition: config,
      referenceDate: ref,
      allowReuseWithVariation: true,
    });

    const { newItems, familiarItems } = splitNewVsFamiliar(selected, config);
    const merged = [...newItems, ...familiarItems];
    const final = merged.length > 0 ? merged : selected;

    modules.push({
      moduleId: mod.moduleId,
      eligible: mod.eligible,
      locked: mod.locked,
      previewOnly: mod.previewOnly,
      contentIds: final.map((c) => c.contentId),
      variationFlags: final.flatMap((c) => c.variationFlags),
    });
  }

  return modules;
}

export function dailyPlanCacheKey(childId: string, dateIso: string, countryCode: CountryCode): string {
  return `daily_plan:${childId}:${dateIso}:${countryCode}`;
}

export function assembleDailyPlan(
  input: RotationInput & { generatedAt?: string },
): DailyPlan {
  const modules = buildDailyPlanModules(input);
  const contentIds = modules.flatMap((m) => m.contentIds);
  const seed = dateSeed(input.dateIso, input.childId);

  return {
    childId: input.childId,
    date: input.dateIso,
    countryCode: input.countryCode,
    ageInMonths: input.age.ageInMonths,
    ageBand: input.age.ageBand,
    developmentStage: input.age.developmentStage,
    modules,
    contentIds,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    cacheKey: dailyPlanCacheKey(input.childId, input.dateIso, input.countryCode),
    offlineFallback: contentIds.length === 0 ? true : undefined,
  };
}

/** Low-content fallback: reuse with variation when pool is thin. */
export function buildLowContentFallback(
  input: RotationInput,
  minItems = 3,
): DailyPlanModule[] {
  const plan = buildDailyPlanModules(input);
  return plan.map((m) => {
    if (m.contentIds.length >= minItems) return m;
    const pools = input.poolsByModule[m.moduleId] ?? [];
    const allIds = pools.flatMap((p) => p.contentVariants.map((v) => v.contentId));
    const extra = allIds.filter((id) => !m.contentIds.includes(id)).slice(0, minItems - m.contentIds.length);
    return {
      ...m,
      contentIds: [...m.contentIds, ...extra],
      variationFlags: [...(m.variationFlags ?? []), "order_shuffled" as const],
    };
  });
}

export { dateSeed };
