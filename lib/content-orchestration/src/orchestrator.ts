import { trackPoolExhausted } from "./analytics.js";
import { MemoryCacheAdapter } from "./cache/memoryCache.js";
import { computeAge } from "./ageEngine.js";
import { isPoolExhausted } from "./contentEngine.js";
import { DEFAULT_ANTI_REPETITION, DAILY_PLAN_CACHE_TTL_SECONDS } from "./config/global-defaults.js";
import { mergeCountryAgeConfig } from "./config/country-age-config.js";
import { getPoolsForModule, indexPoolsByModule, MOCK_CONTENT_POOLS } from "./mock/content-pools.js";
import {
  assembleDailyPlan,
  buildLowContentFallback,
  dailyPlanCacheKey,
} from "./rotationEngine.js";
import type {
  CacheAdapter,
  ContentHistoryEntry,
  ContentPool,
  CountryCode,
  DailyPlan,
  ModuleId,
  RemoteConfigProvider,
} from "./types.js";

export type GetDailyPlanInput = {
  childId: string;
  childDOB: string | Date;
  countryCode: CountryCode;
  dateIso?: string;
  history?: ContentHistoryEntry[];
  unlockedModules?: ModuleId[];
  poolsByModule?: Partial<Record<ModuleId, ContentPool[]>>;
  contentPoolsOverride?: ContentPool[];
  cache?: CacheAdapter;
  remoteConfig?: RemoteConfigProvider;
  bypassCache?: boolean;
};

const defaultCache = new MemoryCacheAdapter();

function todayIso(ref = new Date()): string {
  return ref.toISOString().slice(0, 10);
}

const ALL_MODULE_IDS: ModuleId[] = [
  "phonics",
  "motor_skills",
  "social_emotional",
  "language",
  "cognitive",
  "creativity",
  "stories",
  "puzzles",
];

function indexPoolsFromCatalog(
  catalog: ContentPool[],
  ageBand: import("./types.js").AgeBand,
  countryCode: CountryCode,
): Partial<Record<ModuleId, ContentPool[]>> {
  const result: Partial<Record<ModuleId, ContentPool[]>> = {};
  for (const moduleId of ALL_MODULE_IDS) {
    result[moduleId] = getPoolsForModule(moduleId, ageBand, countryCode, catalog);
  }
  return result;
}

/**
 * Primary API: returns a cached daily session plan for a child.
 * Mixes ~65% new and ~35% familiar content; avoids repetition via content history.
 */
export async function getDailyPlan(input: GetDailyPlanInput): Promise<DailyPlan> {
  const dateIso = input.dateIso ?? todayIso();
  const cache = input.cache ?? defaultCache;
  const cacheKey = dailyPlanCacheKey(input.childId, dateIso, input.countryCode);

  if (!input.bypassCache) {
    const cached = await cache.get<DailyPlan>(cacheKey);
    if (cached) return cached;
  }

  const remoteCountry = await input.remoteConfig?.getCountryAgeConfig();
  const remoteAnti = await input.remoteConfig?.getAntiRepetitionConfig();

  const age = computeAge(
    {
      childDOB: input.childDOB,
      countryCode: input.countryCode,
      referenceDate: new Date(dateIso),
    },
    remoteCountry ?? undefined,
  );

  const poolsByModule =
    input.poolsByModule ??
    (input.contentPoolsOverride
      ? indexPoolsFromCatalog(input.contentPoolsOverride, age.ageBand, input.countryCode)
      : indexPoolsByModule(age.ageBand, input.countryCode));

  const history = input.history ?? [];
  const antiRepetition = remoteAnti ?? DEFAULT_ANTI_REPETITION;

  for (const moduleId of Object.keys(poolsByModule) as ModuleId[]) {
    const pools = poolsByModule[moduleId] ?? [];
    if (
      isPoolExhausted(
        pools,
        history.filter((h) => h.moduleId === moduleId),
        new Date(dateIso),
        antiRepetition,
      )
    ) {
      trackPoolExhausted(input.childId, moduleId);
    }
  }

  let plan = assembleDailyPlan({
    childId: input.childId,
    dateIso,
    age,
    countryCode: input.countryCode,
    poolsByModule,
    history,
    unlockedModules: input.unlockedModules,
    antiRepetition,
    referenceDate: new Date(dateIso),
  });

  if (plan.contentIds.length === 0) {
    const fallbackModules = buildLowContentFallback({
      childId: input.childId,
      dateIso,
      age,
      countryCode: input.countryCode,
      poolsByModule,
      history,
      unlockedModules: input.unlockedModules,
      antiRepetition,
    });
    plan = {
      ...plan,
      modules: fallbackModules,
      contentIds: fallbackModules.flatMap((m) => m.contentIds),
      offlineFallback: true,
    };
  }

  await cache.set(cacheKey, plan, DAILY_PLAN_CACHE_TTL_SECONDS);
  return plan;
}

/** Offline fallback: return last cached plan or rebuild with relaxed anti-repetition. */
export async function getDailyPlanOffline(
  input: GetDailyPlanInput,
): Promise<DailyPlan> {
  const cache = input.cache ?? defaultCache;
  const dateIso = input.dateIso ?? todayIso();
  const cacheKey = dailyPlanCacheKey(input.childId, dateIso, input.countryCode);
  const cached = await cache.get<DailyPlan>(cacheKey);
  if (cached) return { ...cached, offlineFallback: true };

  return getDailyPlan({
    ...input,
    bypassCache: true,
    history: input.history ?? [],
  });
}

export type ContentOrchestrationServiceOptions = {
  cache?: CacheAdapter;
  remoteConfig?: RemoteConfigProvider;
  contentPools?: ContentPool[];
};

export function createContentOrchestrationService(
  options: ContentOrchestrationServiceOptions = {},
) {
  const cache = options.cache ?? defaultCache;
  const pools = options.contentPools;

  return {
    getDailyPlan: (
      input: Omit<
        GetDailyPlanInput,
        "cache" | "poolsByModule" | "remoteConfig" | "contentPoolsOverride"
      >,
    ) =>
      getDailyPlan({
        ...input,
        cache,
        remoteConfig: options.remoteConfig,
        contentPoolsOverride: pools ?? MOCK_CONTENT_POOLS,
      }),

    getAge: (childDOB: string | Date, countryCode: CountryCode, ref?: Date) =>
      computeAge({ childDOB, countryCode, referenceDate: ref }),

    getCountryConfig: () => mergeCountryAgeConfig(null),

    cache,
  };
}
