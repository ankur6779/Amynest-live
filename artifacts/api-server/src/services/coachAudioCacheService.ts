import { db, coachAudioCacheTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { isPregenerationPaused } from "./admin-ops-store.js";
import { getAmyTtsModelId, getAmyTtsVoiceId } from "../lib/amy-tts-config.js";
import { readCachedAudio, trySynthesizeFromCache } from "./ttsCacheService.js";
import { generateOpenAiTts } from "./ttsGenerate.js";
import { isValidTtsPublicUrl, resolveTtsPlaybackUrl } from "./ttsAudioStore.js";
import {
  buildCoachWinListenText,
  hashCoachListenText,
  buildInfantCoachPlanCacheKey,
  type CoachWinListenFields,
} from "./coachPlanCacheKey.js";
import { INFANT_PROBLEMS } from "@workspace/infant-problems";

export {
  buildCoachPlanCacheKey,
  buildInfantCoachPlanCacheKey,
  buildCoachWinListenText,
  hashCoachListenText,
  type CoachPlanCacheInput,
  type CoachWinListenFields,
} from "./coachPlanCacheKey.js";

export type CoachWinAudioInput = {
  planCacheKey: string;
  winIndex: number;
  text?: string;
  win?: CoachWinListenFields;
};

export type CoachWinAudioResult = {
  planCacheKey: string;
  winIndex: number;
  textHash: string;
  ttsCacheKey: string;
  audioUrl: string;
  cached: boolean;
};

function resolveListenText(input: CoachWinAudioInput): string | null {
  const fromWin = input.win ? buildCoachWinListenText(input.win) : "";
  const text = (input.text ?? fromWin).trim();
  return text.length > 0 ? text : null;
}

async function lookupCoachAudioRow(planCacheKey: string, winIndex: number) {
  const rows = await db
    .select()
    .from(coachAudioCacheTable)
    .where(
      and(
        eq(coachAudioCacheTable.planCacheKey, planCacheKey),
        eq(coachAudioCacheTable.winIndex, winIndex),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Fast path — coach layer metadata + shared TTS bytes. */
export async function tryCoachWinAudioFromCache(
  input: CoachWinAudioInput,
): Promise<CoachWinAudioResult | null> {
  const text = resolveListenText(input);
  if (!text) return null;

  const textHash = hashCoachListenText(text);
  const row = await lookupCoachAudioRow(input.planCacheKey, input.winIndex);
  if (!row || row.textHash !== textHash) return null;

  const voiceId = getAmyTtsVoiceId();
  const modelId = getAmyTtsModelId();

  if (row.ttsCacheKey) {
    const bytes = await readCachedAudio(row.ttsCacheKey).catch(() => null);
    if (bytes?.buffer?.byteLength) {
      const audioUrl = resolveTtsPlaybackUrl(row.ttsCacheKey) ?? row.audioUrl;
      if (isValidTtsPublicUrl(audioUrl)) {
        void db
          .update(coachAudioCacheTable)
          .set({
            hitCount: sql`${coachAudioCacheTable.hitCount} + 1`,
            lastAccessedAt: sql`now()`,
          })
          .where(eq(coachAudioCacheTable.id, row.id))
          .catch(() => {});
        return {
          planCacheKey: input.planCacheKey,
          winIndex: input.winIndex,
          textHash,
          ttsCacheKey: row.ttsCacheKey,
          audioUrl,
          cached: true,
        };
      }
    }
  }

  const cached = await trySynthesizeFromCache(text, {
    voiceId,
    modelId,
    mode: "default",
  });
  if (!cached || !isValidTtsPublicUrl(cached.audioUrl)) return null;

  void db
    .update(coachAudioCacheTable)
    .set({
      hitCount: sql`${coachAudioCacheTable.hitCount} + 1`,
      lastAccessedAt: sql`now()`,
    })
    .where(eq(coachAudioCacheTable.id, row.id))
    .catch(() => {});

  const audioUrl = resolveTtsPlaybackUrl(cached.cacheKey) ?? cached.audioUrl;
  return {
    planCacheKey: input.planCacheKey,
    winIndex: input.winIndex,
    textHash,
    ttsCacheKey: cached.cacheKey,
    audioUrl,
    cached: true,
  };
}

/** Generate OpenAI TTS once, persist in tts_cache + coach_audio_cache for all users. */
export async function generateAndCacheCoachWinAudio(
  input: CoachWinAudioInput,
): Promise<CoachWinAudioResult | null> {
  const text = resolveListenText(input);
  if (!text) return null;

  const hit = await tryCoachWinAudioFromCache(input);
  if (hit) return hit;

  const textHash = hashCoachListenText(text);
  const voiceId = getAmyTtsVoiceId();

  const generated = await generateOpenAiTts({
    text,
    voice: voiceId,
    mode: "default",
    category: "sentences",
  });
  if (!generated || !isValidTtsPublicUrl(generated.url)) return null;

  const audioUrl = resolveTtsPlaybackUrl(generated.cacheKey) ?? generated.url;
  const playbackPath = `/api/tts/audio/${generated.cacheKey}.mp3`;

  try {
    await db
      .insert(coachAudioCacheTable)
      .values({
        planCacheKey: input.planCacheKey,
        winIndex: input.winIndex,
        text,
        textHash,
        ttsCacheKey: generated.cacheKey,
        audioUrl: playbackPath,
        charCount: text.length,
        hitCount: 0,
      })
      .onConflictDoUpdate({
        target: [coachAudioCacheTable.planCacheKey, coachAudioCacheTable.winIndex],
        set: {
          text,
          textHash,
          ttsCacheKey: generated.cacheKey,
          audioUrl: playbackPath,
          charCount: text.length,
          lastAccessedAt: sql`now()`,
        },
      });
  } catch (err) {
    logger.warn(
      {
        evt: "coach_audio.db_persist_failed",
        planCacheKey: input.planCacheKey.slice(0, 8),
        winIndex: input.winIndex,
        message: err instanceof Error ? err.message : String(err),
      },
      "coach audio metadata persist failed",
    );
  }

  logger.info(
    {
      evt: "coach_audio.generated",
      planCacheKey: input.planCacheKey.slice(0, 8),
      winIndex: input.winIndex,
      ttsCacheKey: generated.cacheKey.slice(0, 12),
      cached: generated.cached,
      chars: text.length,
    },
    "coach win audio cached for reuse",
  );

  return {
    planCacheKey: input.planCacheKey,
    winIndex: input.winIndex,
    textHash,
    ttsCacheKey: generated.cacheKey,
    audioUrl,
    cached: generated.cached,
  };
}

export async function pregenerateCoachPlanAudio(input: {
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
  if (isPregenerationPaused()) {
    return { ok: true, total: 0, succeeded: 0, failed: 0, cached: 0, skipped: 0 };
  }

  const wins = input.wins.filter((w) => w.win >= 1).slice(0, 20);
  const results = await Promise.allSettled(
    wins.map((win) =>
      generateAndCacheCoachWinAudio({
        planCacheKey: input.planCacheKey,
        winIndex: win.win,
        win,
      }),
    ),
  );

  const succeeded = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const failed = results.filter(
    (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value),
  ).length;
  const cached = results.filter(
    (r) => r.status === "fulfilled" && r.value?.cached,
  ).length;

  return {
    ok: true,
    total: wins.length,
    succeeded,
    failed,
    cached,
    skipped: 0,
  };
}

/** Pre-warm listen-aloud audio for all static infant (0–2 yr) problem plans. */
export async function pregenerateAllInfantCoachAudio(): Promise<{
  ok: true;
  problems: number;
  total: number;
  succeeded: number;
  failed: number;
  cached: number;
}> {
  if (isPregenerationPaused()) {
    return { ok: true, problems: 0, total: 0, succeeded: 0, failed: 0, cached: 0 };
  }

  let total = 0;
  let succeeded = 0;
  let failed = 0;
  let cached = 0;
  let problems = 0;

  for (const problem of INFANT_PROBLEMS) {
    if (!problem.wins?.length) continue;
    problems++;
    const planCacheKey = buildInfantCoachPlanCacheKey(problem.id);
    const batch = await pregenerateCoachPlanAudio({
      planCacheKey,
      wins: problem.wins as CoachWinListenFields[],
    });
    total += batch.total;
    succeeded += batch.succeeded;
    failed += batch.failed;
    cached += batch.cached;
  }

  logger.info(
    { evt: "coach_audio.infant_pregenerate", problems, total, succeeded, failed, cached },
    "infant coach audio pregenerate complete",
  );

  return { ok: true, problems, total, succeeded, failed, cached };
}
