/**
 * Speech Experience Pack — first complete Experience Pack.
 * Architecture Freeze v1.0 · Sprint A10.2.
 *
 * One experience. Multiple surfaces. IDs only.
 * No rendering. No routing. No execution.
 */

import type { ResolvedExperience } from "@/v2/experience-resolver/types";
import type {
  SpeechContentContract,
  SpeechJourneyContract,
  SpeechSurfaceBinding,
  SpeechSurfaceId,
  SpeechSurfaceMap,
} from "./contracts";
import {
  SPEECH_EXPERIENCE_ID,
  SPEECH_EXPERIENCE_VERSION,
  SPEECH_PACK_VERSION,
  SPEECH_SHARED_EXPERIENCE_ID,
} from "./contracts";

export type SpeechExperiencePack = Readonly<{
  experienceId: typeof SPEECH_EXPERIENCE_ID;
  experienceVersion: typeof SPEECH_EXPERIENCE_VERSION;
  sharedExperienceId: typeof SPEECH_SHARED_EXPERIENCE_ID;
  packVersion: typeof SPEECH_PACK_VERSION;
  content: SpeechContentContract;
  journey: SpeechJourneyContract;
  surfaces: SpeechSurfaceMap;
  /** Shared ResolvedExperience from Experience Resolver. */
  resolved: ResolvedExperience;
  generatedAt: string;
}>;

export type ResolveSpeechExperienceOptions = Readonly<{
  now?: Date;
  priority?: number;
  recordHealth?: boolean;
}>;

export type SpeechExperienceValidationIssue = Readonly<{
  path: string;
  message: string;
}>;

export type SpeechExperienceValidationResult = Readonly<{
  ok: boolean;
  issues: ReadonlyArray<SpeechExperienceValidationIssue>;
}>;

export type SpeechExperienceDiffEntry = Readonly<{
  path: string;
  before: unknown;
  after: unknown;
}>;

export type SpeechExperienceHealth = Readonly<{
  packResolves: number;
  surfaceBindings: number;
  unknownSurfaceLookups: number;
  packVersion: typeof SPEECH_PACK_VERSION;
}>;

export type {
  SpeechContentContract,
  SpeechJourneyContract,
  SpeechSurfaceBinding,
  SpeechSurfaceId,
  SpeechSurfaceMap,
};
