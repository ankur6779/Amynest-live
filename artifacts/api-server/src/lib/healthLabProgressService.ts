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
    const merged = { ...server, ...client };
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
    merged.totalXp = Math.max(Number(server.totalXp ?? 0), Number(client.totalXp ?? 0));
    merged.coins = Math.max(Number(server.coins ?? 0), Number(client.coins ?? 0));
    merged.streakDays = Math.max(Number(server.streakDays ?? 0), Number(client.streakDays ?? 0));
    return { profile: merged, winner: "merge" };
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
