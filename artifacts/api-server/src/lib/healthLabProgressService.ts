import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  childrenTable,
  db,
  healthLabProgressTable,
  type HealthLabProgressRow,
} from "@workspace/db";

const sessionSchema = z.object({
  gameId: z.string(),
  timestamp: z.number(),
  durationMs: z.number(),
  xpEarned: z.number(),
  xpTier: z.string(),
  score: z.number(),
  metrics: z.record(z.string(), z.number()).optional(),
  personalBest: z.boolean().optional(),
  simulated: z.boolean().optional(),
  cheatFlags: z.array(z.string()).optional(),
});

const profileSchema = z
  .object({
    version: z.literal(2),
    childId: z.number(),
    totalXp: z.number(),
    coins: z.number(),
    level: z.number(),
    prestige: z.number().optional(),
    streakDays: z.number(),
    questStreakDays: z.number().optional(),
    badges: z.array(z.object({ id: z.string(), unlockedAt: z.number() })),
    avatarId: z.string(),
    unlockedAvatarItems: z.array(z.string()),
    equippedItems: z.record(z.string(), z.string()).optional(),
    gameHistory: z.array(sessionSchema).optional(),
    personalBests: z.record(z.string(), z.number()).optional(),
    wellnessScores: z.record(z.string(), z.number()).optional(),
    gamesCompletedToday: z.array(z.string()).optional(),
    totalSessions: z.number().optional(),
    calmnessRewardedToday: z.boolean().optional(),
    avatarEvolutionHistory: z
      .array(z.object({ level: z.number(), avatarId: z.string(), timestamp: z.number() }))
      .optional(),
  })
  .passthrough();

export const syncBodySchema = z.object({
  childId: z.number().int().positive(),
  profile: profileSchema,
  clientUpdatedAt: z.number().int().positive(),
});

export const sessionBodySchema = z.object({
  childId: z.number().int().positive(),
  session: sessionSchema,
  clientUpdatedAt: z.number().int().positive(),
});

export const questBodySchema = z.object({
  childId: z.number().int().positive(),
  questId: z.string(),
  completedAt: z.number(),
  clientUpdatedAt: z.number().int().positive(),
});

export const badgeBodySchema = z.object({
  childId: z.number().int().positive(),
  badgeId: z.string(),
  unlockedAt: z.number(),
  clientUpdatedAt: z.number().int().positive(),
});

export const streakBodySchema = z.object({
  childId: z.number().int().positive(),
  streakDays: z.number(),
  lastPlayDateKey: z.string().nullable(),
  clientUpdatedAt: z.number().int().positive(),
});

export const shopBodySchema = z.object({
  childId: z.number().int().positive(),
  coins: z.number(),
  unlockedAvatarItems: z.array(z.string()),
  equippedItems: z.record(z.string(), z.string()).optional(),
  clientUpdatedAt: z.number().int().positive(),
});

function maxNum(...vals: unknown[]): number {
  let best = 0;
  for (const v of vals) {
    const n = Number(v ?? 0);
    if (Number.isFinite(n) && n > best) best = n;
  }
  return best;
}

function unionStringIds(...lists: unknown[]): string[] {
  const out = new Set<string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === "string" && item.length > 0) out.add(item);
    }
  }
  return [...out];
}

function maxRecord(
  a: Record<string, number> | null | undefined,
  b: Record<string, number> | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b ?? {})) {
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out[k] = Math.max(Number(out[k] ?? 0), n);
  }
  return out;
}

function preferRicherAvatar(
  server: Record<string, unknown>,
  client: Record<string, unknown>,
): { avatarId: unknown; equippedItems: unknown } {
  const serverLevel = maxNum(server.level, 1);
  const clientLevel = maxNum(client.level, 1);
  const serverPrestige = maxNum(server.prestige);
  const clientPrestige = maxNum(client.prestige);
  const serverRank = serverPrestige * 1000 + serverLevel;
  const clientRank = clientPrestige * 1000 + clientLevel;
  if (clientRank > serverRank) {
    return { avatarId: client.avatarId ?? server.avatarId, equippedItems: client.equippedItems ?? server.equippedItems };
  }
  return { avatarId: server.avatarId ?? client.avatarId, equippedItems: server.equippedItems ?? client.equippedItems };
}

/**
 * Field-level CRDT merge when the newer timestamp wins.
 * Blind `{...server, ...client}` would let a virgin/partial NOW-stamp client
 * wipe level, avatar unlocks, personal bests, and wellness while only maxing XP.
 */
export function mergeProgressFields(
  server: Record<string, unknown>,
  client: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...server, ...client };

  const serverHistory = (server.gameHistory as unknown[]) ?? [];
  const clientHistory = (client.gameHistory as unknown[]) ?? [];
  const byTs = new Map<number, unknown>();
  for (const s of [...serverHistory, ...clientHistory]) {
    const ts = (s as { timestamp?: number }).timestamp ?? 0;
    byTs.set(ts, s);
  }
  merged.gameHistory = [...byTs.values()]
    .sort((a, b) => ((a as { timestamp: number }).timestamp - (b as { timestamp: number }).timestamp))
    .slice(-500);

  const serverBadges = (server.badges as { id: string; unlockedAt: number }[]) ?? [];
  const clientBadges = (client.badges as { id: string; unlockedAt: number }[]) ?? [];
  const badgeMap = new Map<string, { id: string; unlockedAt: number }>();
  for (const b of [...serverBadges, ...clientBadges]) badgeMap.set(b.id, b);
  merged.badges = [...badgeMap.values()];

  merged.totalXp = maxNum(server.totalXp, client.totalXp);
  merged.coins = maxNum(server.coins, client.coins);
  merged.streakDays = maxNum(server.streakDays, client.streakDays);
  merged.level = maxNum(server.level, client.level, 1);
  merged.prestige = maxNum(server.prestige, client.prestige);
  merged.questStreakDays = maxNum(server.questStreakDays, client.questStreakDays);
  merged.totalSessions = maxNum(server.totalSessions, client.totalSessions);
  merged.weeklyChallengeProgress = maxNum(
    server.weeklyChallengeProgress,
    client.weeklyChallengeProgress,
  );
  merged.calmnessSnapshotsToday = maxNum(
    server.calmnessSnapshotsToday,
    client.calmnessSnapshotsToday,
  );
  merged.sessionBurstCount = maxNum(server.sessionBurstCount, client.sessionBurstCount);

  merged.unlockedAvatarItems = unionStringIds(
    server.unlockedAvatarItems,
    client.unlockedAvatarItems,
  );
  merged.gamesCompletedToday = unionStringIds(
    server.gamesCompletedToday,
    client.gamesCompletedToday,
  );
  merged.streakMilestonesCelebrated = unionStringIds(
    server.streakMilestonesCelebrated,
    client.streakMilestonesCelebrated,
  );
  merged.completedQuests = unionStringIds(server.completedQuests, client.completedQuests);

  merged.personalBests = maxRecord(
    server.personalBests as Record<string, number> | undefined,
    client.personalBests as Record<string, number> | undefined,
  );
  merged.wellnessScores = maxRecord(
    server.wellnessScores as Record<string, number> | undefined,
    client.wellnessScores as Record<string, number> | undefined,
  );

  const evo = new Map<string, unknown>();
  for (const row of [
    ...((server.avatarEvolutionHistory as unknown[]) ?? []),
    ...((client.avatarEvolutionHistory as unknown[]) ?? []),
  ]) {
    const r = row as { level?: number; avatarId?: string; timestamp?: number };
    const key = `${r.level ?? 0}:${r.avatarId ?? ""}:${r.timestamp ?? 0}`;
    evo.set(key, row);
  }
  merged.avatarEvolutionHistory = [...evo.values()];

  // Avatar/equip from the pre-merge richer side (higher level/prestige).
  const richer = preferRicherAvatar(server, client);
  merged.avatarId = richer.avatarId;
  merged.equippedItems = richer.equippedItems;

  const serverPlay = typeof server.lastPlayDateKey === "string" ? server.lastPlayDateKey : null;
  const clientPlay = typeof client.lastPlayDateKey === "string" ? client.lastPlayDateKey : null;
  if (serverPlay && clientPlay) {
    merged.lastPlayDateKey = serverPlay >= clientPlay ? serverPlay : clientPlay;
  } else {
    merged.lastPlayDateKey = clientPlay ?? serverPlay;
  }

  return merged;
}

export function mergeProfiles(
  server: Record<string, unknown> | null,
  client: Record<string, unknown>,
  serverTs: number,
  clientTs: number,
): { profile: Record<string, unknown>; winner: "client" | "server" | "merge" } {
  if (!server || Object.keys(server).length === 0) {
    return { profile: client, winner: "client" };
  }
  if (clientTs >= serverTs) {
    return { profile: mergeProgressFields(server, client), winner: "merge" };
  }
  return { profile: server, winner: "server" };
}

async function loadRow(childId: number): Promise<HealthLabProgressRow | null> {
  const rows = await db
    .select()
    .from(healthLabProgressTable)
    .where(eq(healthLabProgressTable.childId, childId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getHealthLabProfile(childId: number, userId: string) {
  const row = await loadRow(childId);
  if (!row || row.userId !== userId) return null;
  return {
    profile: row.profile as Record<string, unknown>,
    clientUpdatedAt: row.clientUpdatedAt.getTime(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function syncHealthLabProfile(
  childId: number,
  userId: string,
  clientProfile: Record<string, unknown>,
  clientUpdatedAt: number,
) {
  const existing = await loadRow(childId);
  const serverProfile = (existing?.profile as Record<string, unknown>) ?? null;
  const serverTs = existing?.clientUpdatedAt.getTime() ?? 0;
  const { profile } = mergeProfiles(serverProfile, clientProfile, serverTs, clientUpdatedAt);

  const clientDate = new Date(clientUpdatedAt);

  if (existing) {
    const [updated] = await db
      .update(healthLabProgressTable)
      .set({
        profile,
        clientUpdatedAt: clientDate,
        updatedAt: new Date(),
      })
      .where(eq(healthLabProgressTable.childId, childId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(healthLabProgressTable)
    .values({
      childId,
      userId,
      profile,
      clientUpdatedAt: clientDate,
    })
    .returning();
  return created;
}

export async function appendHealthLabSession(
  childId: number,
  userId: string,
  session: z.infer<typeof sessionSchema>,
  clientUpdatedAt: number,
) {
  const existing = await loadRow(childId);
  const profile = (existing?.profile as Record<string, unknown>) ?? { version: 2, childId };
  const history = (profile.gameHistory as unknown[]) ?? [];
  const byTs = new Map<number, unknown>();
  for (const s of history) {
    const ts = (s as { timestamp?: number }).timestamp ?? 0;
    byTs.set(ts, s);
  }
  byTs.set(session.timestamp, session);
  profile.gameHistory = [...byTs.values()].slice(-500);
  profile.totalSessions = Number(profile.totalSessions ?? 0) + 1;
  return syncHealthLabProfile(childId, userId, profile, clientUpdatedAt);
}

export async function verifyChildOwner(childId: number, userId: string) {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export function buildDashboardFromProfile(profile: Record<string, unknown>) {
  const history = (profile.gameHistory as { score: number; xpEarned: number; metrics?: Record<string, number> }[]) ?? [];
  const wellnessScores = (profile.wellnessScores as Record<string, number>) ?? {};
  const streakDays = Number(profile.streakDays ?? 0);
  const level = Number(profile.level ?? 1);
  const totalXp = Number(profile.totalXp ?? 0);
  return {
    sessions: history.length,
    streakDays,
    level,
    totalXp,
    wellnessScores,
    recentSessions: history.slice(-10),
  };
}
