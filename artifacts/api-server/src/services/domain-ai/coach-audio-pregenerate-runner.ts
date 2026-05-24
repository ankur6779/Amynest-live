import { pregenerateCoachPlanAudio } from "../coachAudioCacheService.js";
import type { CoachWinListenFields } from "../coachPlanCacheKey.js";

export async function runCoachAudioPregenerate(input: {
  planCacheKey: string;
  wins: CoachWinListenFields[];
}): Promise<{
  ok: true;
  total: number;
  succeeded: number;
  failed: number;
  cached: number;
  skipped: number;
}> {
  return pregenerateCoachPlanAudio(input);
}

export async function runInfantCoachAudioPregenerate(): Promise<{
  ok: true;
  problems: number;
  total: number;
  succeeded: number;
  failed: number;
  cached: number;
}> {
  const { pregenerateAllInfantCoachAudio } = await import("../coachAudioCacheService.js");
  return pregenerateAllInfantCoachAudio();
}
