import type {
  AntiRepetitionConfig,
  CountryAgeConfig,
  ModuleConfig,
  RemoteConfigProvider,
} from "../types.js";
import { mergeCountryAgeConfig } from "./country-age-config.js";
import { mergeModuleConfigs, MODULE_CONFIGS } from "./module-config.js";
import { DEFAULT_ANTI_REPETITION } from "./global-defaults.js";

/**
 * Firebase / CMS remote config adapter stub.
 * Replace `fetchRemoteJson` with Firestore or Remote Config SDK calls.
 */
export type RemoteConfigSource = {
  fetchCountryAgeConfig?: () => Promise<Partial<CountryAgeConfig> | null>;
  fetchModuleConfigs?: () => Promise<ModuleConfig[] | null>;
  fetchAntiRepetition?: () => Promise<AntiRepetitionConfig | null>;
};

export function createRemoteConfigProvider(
  source: RemoteConfigSource = {},
): RemoteConfigProvider {
  return {
    async getCountryAgeConfig() {
      const remote = await source.fetchCountryAgeConfig?.();
      return mergeCountryAgeConfig(remote);
    },
    async getModuleConfigs() {
      const remote = await source.fetchModuleConfigs?.();
      return mergeModuleConfigs(remote);
    },
    async getAntiRepetitionConfig() {
      return (await source.fetchAntiRepetition?.()) ?? DEFAULT_ANTI_REPETITION;
    },
  };
}

/** Static defaults when remote is unavailable (offline / boot). */
export function getStaticRemoteDefaults(): {
  countryAge: CountryAgeConfig;
  modules: ModuleConfig[];
  antiRepetition: AntiRepetitionConfig;
} {
  return {
    countryAge: mergeCountryAgeConfig(null),
    modules: mergeModuleConfigs(null),
    antiRepetition: DEFAULT_ANTI_REPETITION,
  };
}
