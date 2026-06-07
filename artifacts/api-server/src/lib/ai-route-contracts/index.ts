import type { AiRouteContract } from "./types.js";
import type { RegistryRouteName } from "./types.js";
import { assistantAiContract, speechTranscribeContract } from "./wave1.js";
import { infantFeedingPlanContract, infantSleepCoachContract } from "./wave2.js";
import { routineGenerateAiContract } from "./wave3.js";

const REGISTRY = new Map<RegistryRouteName, AiRouteContract>([
  [speechTranscribeContract.routeName as RegistryRouteName, speechTranscribeContract],
  [assistantAiContract.routeName as RegistryRouteName, assistantAiContract],
  [infantSleepCoachContract.routeName as RegistryRouteName, infantSleepCoachContract],
  [infantFeedingPlanContract.routeName as RegistryRouteName, infantFeedingPlanContract],
  [routineGenerateAiContract.routeName as RegistryRouteName, routineGenerateAiContract],
]);

export function getAiRouteContract(routeName: string): AiRouteContract | undefined {
  return REGISTRY.get(routeName as RegistryRouteName);
}

export function listMigratedRouteNames(): RegistryRouteName[] {
  return [...REGISTRY.keys()];
}

export function listRoutesByWave(wave: 1 | 2 | 3): RegistryRouteName[] {
  return [...REGISTRY.entries()]
    .filter(([, c]) => c.wave === wave)
    .map(([name]) => name);
}

export {
  speechTranscribeContract,
  assistantAiContract,
  infantSleepCoachContract,
  infantFeedingPlanContract,
  routineGenerateAiContract,
};
export type { RegistryRouteName, AiRouteContract } from "./types.js";
