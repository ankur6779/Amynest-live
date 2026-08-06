import { getFactoryHealthCounters } from "./health-state";
import {
  AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
  type ExperienceFactoryHealth,
} from "./types";

export function getExperienceFactoryHealth(): ExperienceFactoryHealth {
  const c = getFactoryHealthCounters();
  return Object.freeze({
    createdPackages: c.createdPackages,
    invalidDefinitions: c.invalidDefinitions,
    unknownDefinitions: c.unknownDefinitions,
    engineVersion: AMY_EXPERIENCE_TEMPLATE_ENGINE_VERSION,
  });
}
