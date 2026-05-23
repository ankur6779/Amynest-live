import { mergeModuleConfigs, MODULE_CONFIGS } from "./config/module-config.js";
import { getCountryLearningThreshold } from "./ageEngine.js";
import type {
  AgeEngineOutput,
  CountryCode,
  ModuleConfig,
  ModuleId,
} from "./types.js";

export type ModuleEligibilityInput = {
  age: AgeEngineOutput;
  countryCode: CountryCode;
  /** Module IDs the subscription grants full access to. */
  unlockedModules?: ModuleId[];
  remoteModuleConfigs?: ModuleConfig[];
};

export type EligibleModule = {
  moduleId: ModuleId;
  eligible: boolean;
  locked: boolean;
  previewOnly: boolean;
  priorityScore: number;
  reason?: string;
};

function countryAllowed(config: ModuleConfig, countryCode: CountryCode): boolean {
  if (config.countriesAllowed === "*") return true;
  return config.countriesAllowed.includes(countryCode);
}

function stageAllowed(
  config: ModuleConfig,
  stage: AgeEngineOutput["developmentStage"],
): boolean {
  if (!config.developmentStages?.length) return true;
  return config.developmentStages.includes(stage);
}

function meetsCountryPhonicsThreshold(
  moduleId: ModuleId,
  age: AgeEngineOutput,
  countryCode: CountryCode,
): boolean {
  if (moduleId !== "phonics") return true;
  const start = getCountryLearningThreshold(countryCode, "phonicsStart");
  return age.ageInMonths >= start;
}

export function filterEligibleModules(input: ModuleEligibilityInput): EligibleModule[] {
  const configs = mergeModuleConfigs(input.remoteModuleConfigs);
  const unlocked = new Set(input.unlockedModules ?? []);

  return configs
    .map((config): EligibleModule => {
      const { age, countryCode } = input;

      if (!countryAllowed(config, countryCode)) {
        return {
          moduleId: config.moduleId,
          eligible: false,
          locked: true,
          previewOnly: false,
          priorityScore: config.priorityScore,
          reason: "country_not_allowed",
        };
      }

      if (age.ageInMonths < config.minAgeMonths || age.ageInMonths > config.maxAgeMonths) {
        return {
          moduleId: config.moduleId,
          eligible: false,
          locked: true,
          previewOnly: false,
          priorityScore: config.priorityScore,
          reason: "age_out_of_range",
        };
      }

      if (!stageAllowed(config, age.developmentStage)) {
        return {
          moduleId: config.moduleId,
          eligible: false,
          locked: true,
          previewOnly: false,
          priorityScore: config.priorityScore,
          reason: "development_stage_mismatch",
        };
      }

      if (!meetsCountryPhonicsThreshold(config.moduleId, age, countryCode)) {
        return {
          moduleId: config.moduleId,
          eligible: false,
          locked: true,
          previewOnly: true,
          priorityScore: config.priorityScore,
          reason: "country_phonics_threshold",
        };
      }

      const isUnlocked = unlocked.has(config.moduleId) || unlocked.size === 0;
      return {
        moduleId: config.moduleId,
        eligible: true,
        locked: !isUnlocked,
        previewOnly: !isUnlocked,
        priorityScore: config.priorityScore,
      };
    })
    .filter((m) => m.eligible || m.previewOnly)
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function getModuleConfig(
  moduleId: ModuleId,
  remote?: ModuleConfig[],
): ModuleConfig | undefined {
  const configs = mergeModuleConfigs(remote);
  return configs.find((c) => c.moduleId === moduleId);
}

export function getDefaultModuleConfigs(): ModuleConfig[] {
  return [...MODULE_CONFIGS];
}
