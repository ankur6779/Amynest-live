/**
 * Sleep Experience Pack — Phase 1.1 Experience Definition.
 * Speech is the golden reference. No UI. No Template Engine changes.
 */

import type { ResolvedExperience } from "@/v2/experience-resolver/types";
import type {
  SleepContentContract,
  SleepJourneyContract,
  SleepSurfaceBinding,
  SleepSurfaceId,
  SleepSurfaceMap,
} from "./contracts";
import {
  SLEEP_EXPERIENCE_ID,
  SLEEP_EXPERIENCE_VERSION,
  SLEEP_PACK_VERSION,
  SLEEP_SHARED_EXPERIENCE_ID,
} from "./contracts";

export type SleepExperiencePack = Readonly<{
  experienceId: typeof SLEEP_EXPERIENCE_ID;
  experienceVersion: typeof SLEEP_EXPERIENCE_VERSION;
  sharedExperienceId: typeof SLEEP_SHARED_EXPERIENCE_ID;
  experienceType: "sleep";
  packVersion: typeof SLEEP_PACK_VERSION;
  premiumState: "supported";
  capabilities: ReadonlyArray<string>;
  content: SleepContentContract;
  journey: SleepJourneyContract;
  surfaces: SleepSurfaceMap;
  resolved: ResolvedExperience;
  metadata: Readonly<Record<string, string>>;
  generatedAt: string;
}>;

export type ResolveSleepExperienceOptions = Readonly<{
  now?: Date;
  priority?: number;
  recordHealth?: boolean;
}>;

export type SleepExperienceValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type SleepExperienceValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<SleepExperienceValidationIssue>;
}>;

export type SleepExperienceDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type SleepExperienceHealth = Readonly<{
  packResolves: number;
  surfaceBindings: number;
  unknownContentLookups: number;
  packVersion: typeof SLEEP_PACK_VERSION;
}>;

export type {
  SleepContentContract,
  SleepJourneyContract,
  SleepSurfaceBinding,
  SleepSurfaceId,
  SleepSurfaceMap,
};
