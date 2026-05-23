import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  gamingWalletTable,
  childrenTable,
  routinesTable,
  type GamingWallet,
} from "@workspace/db";
import {
  FREE_STARTER_GAME_IDS,
  MAX_ROUTINE_EARN_PER_EVENT,
  STREAK_UNLOCK_DAYS,
  computePointsEarned,
  dailyLimit,
  dailyLimitReached,
  gamesPlayedToday,
  unlockGameId,
  type LedgerEntry,
  type PlayLogEntry,
  type SkillRecord,
  getGameById,
} from "@workspace/gaming-rewards";
import { getEntitlements } from "./subscriptionService";

function ensureStarters(unlocked: string[]): string[] {
  const set = new Set(unlocked);
  for (const id of FREE_STARTER_GAME_IDS) set.add(id);
  return Array.from(set);
}

function capLedger(ledger: LedgerEntry[]): LedgerEntry[] {
  return ledger.slice(0, 50);
}

function capPlayLog(log: PlayLogEntry[]): PlayLogEntry[] {
  return log.slice(0, 200);
}

/** Consecutive calendar days (UTC) with at least one routine row. */
export async function computeRoutineStreakDays(userId: string): Promise<number> {
  const childRows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(eq(childrenTable.userId, userId));
  if (childRows.length === 0) return 0;

  const childIds = childRows.map((c) => c.id);
  const routineRows = await db
    .select({ date: routinesTable.date })
    .from(routinesTable)
    .where(inArray(routinesTable.childId, childIds));

  const dateSet = new Set(
    routineRows.map((r) => (r.date ?? "").slice(0, 10)).filter(Boolean),
  );
  if (dateSet.size === 0) return 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let streak = 0;
  while (true) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - streak);
    const key = d.toISOString().slice(0, 10);
    if (dateSet.has(key)) streak++;
    else break;
  }
  return streak;
}

export async function loadOrInitWallet(userId: string): Promise<GamingWallet> {
  const rows = await db
    .select()
    .from(gamingWalletTable)
    .where(eq(gamingWalletTable.userId, userId))
    .limit(1);
  if (rows[0]) return rows[0];

  const starters = [...FREE_STARTER_GAME_IDS];
  const [created] = await db
    .insert(gamingWalletTable)
    .values({
      userId,
      pointsBalance: 0,
      unlockedGames: starters,
      skills: {},
      playLog: [],
      ledger: [],
    })
    .returning();
  return created;
}

export interface WalletSnapshot {
  pointsBalance: number;
  unlockedGames: string[];
  skills: SkillRecord;
  playLog: PlayLogEntry[];
  ledger: LedgerEntry[];
  gamesPlayedToday: number;
  dailyLimit: number;
  routineStreakDays: number;
  isPremium: boolean;
}

export async function getWalletSnapshot(userId: string): Promise<WalletSnapshot> {
  const [wallet, ent, routineStreakDays] = await Promise.all([
    loadOrInitWallet(userId),
    getEntitlements(userId),
    computeRoutineStreakDays(userId),
  ]);

  const unlockedGames = ensureStarters(
    Array.isArray(wallet.unlockedGames) ? wallet.unlockedGames : [],
  );

  return {
    pointsBalance: wallet.pointsBalance,
    unlockedGames,
    skills: (wallet.skills as SkillRecord) ?? {},
    playLog: Array.isArray(wallet.playLog) ? wallet.playLog : [],
    ledger: Array.isArray(wallet.ledger) ? wallet.ledger : [],
    gamesPlayedToday: gamesPlayedToday(
      Array.isArray(wallet.playLog) ? wallet.playLog : [],
    ),
    dailyLimit: dailyLimit(ent.isPremium),
    routineStreakDays,
    isPremium: ent.isPremium,
  };
}

export interface LocalWalletPayload {
  pointsBalance?: number;
  unlockedGames?: string[];
  skills?: SkillRecord;
  playLog?: PlayLogEntry[];
  ledger?: LedgerEntry[];
}

/** Merge offline local state into server wallet (max points, union unlocks). */
export async function syncWalletFromClient(
  userId: string,
  local: LocalWalletPayload,
): Promise<WalletSnapshot> {
  const wallet = await loadOrInitWallet(userId);
  const serverUnlocked = ensureStarters(wallet.unlockedGames ?? []);
  const localUnlocked = ensureStarters(local.unlockedGames ?? []);
  const mergedUnlocked = Array.from(new Set([...serverUnlocked, ...localUnlocked]));

  const serverLog = Array.isArray(wallet.playLog) ? wallet.playLog : [];
  const localLog = Array.isArray(local.playLog) ? local.playLog : [];
  const playLog = capPlayLog(
    [...localLog, ...serverLog].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
  );

  const serverLedger = Array.isArray(wallet.ledger) ? wallet.ledger : [];
  const localLedger = Array.isArray(local.ledger) ? local.ledger : [];
  const ledger = capLedger(
    [...localLedger, ...serverLedger].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
  );

  const pointsBalance = Math.max(
    wallet.pointsBalance,
    Math.max(0, Math.floor(local.pointsBalance ?? 0)),
  );

  const skills: SkillRecord = {
    ...(wallet.skills as SkillRecord),
    ...(local.skills ?? {}),
  };

  await db
    .update(gamingWalletTable)
    .set({
      pointsBalance,
      unlockedGames: mergedUnlocked,
      skills,
      playLog,
      ledger,
      updatedAt: new Date(),
    })
    .where(eq(gamingWalletTable.userId, userId));

  return getWalletSnapshot(userId);
}

export async function earnPoints(
  userId: string,
  input: {
    childName: string;
    activity: string;
    amount: number;
    source: "routine" | "bonus" | "dev";
    idempotencyKey?: string;
  },
): Promise<WalletSnapshot> {
  const amount = Math.min(
    MAX_ROUTINE_EARN_PER_EVENT,
    Math.max(0, Math.floor(input.amount)),
  );
  if (amount <= 0) return getWalletSnapshot(userId);

  const wallet = await loadOrInitWallet(userId);
  const ledger = Array.isArray(wallet.ledger) ? [...wallet.ledger] : [];

  if (input.idempotencyKey) {
    const dup = ledger.some((e) => e.idempotencyKey === input.idempotencyKey);
    if (dup) return getWalletSnapshot(userId);
  }

  ledger.unshift({
    date: new Date().toISOString(),
    childName: input.childName.slice(0, 80),
    activity: input.activity.slice(0, 200),
    points: amount,
    idempotencyKey: input.idempotencyKey,
  });

  await db
    .update(gamingWalletTable)
    .set({
      pointsBalance: wallet.pointsBalance + amount,
      ledger: capLedger(ledger),
      updatedAt: new Date(),
    })
    .where(eq(gamingWalletTable.userId, userId));

  return getWalletSnapshot(userId);
}

export async function unlockGameForUser(
  userId: string,
  gameId: string,
): Promise<{ snapshot: WalletSnapshot; result: ReturnType<typeof unlockGameId> }> {
  const [wallet, ent, routineStreakDays] = await Promise.all([
    loadOrInitWallet(userId),
    getEntitlements(userId),
    computeRoutineStreakDays(userId),
  ]);

  const result = unlockGameId(gameId, {
    pointsBalance: wallet.pointsBalance,
    unlocked: ensureStarters(wallet.unlockedGames ?? []),
    routineStreakDays,
    isPremium: ent.isPremium,
  });

  if (!result.ok) {
    return { snapshot: await getWalletSnapshot(userId), result };
  }

  if (result.unlocked) {
    const ledger = Array.isArray(wallet.ledger) ? [...wallet.ledger] : [];
    if (result.via === "points") {
      const game = getGameById(gameId);
      ledger.unshift({
        date: new Date().toISOString(),
        childName: "Game Unlock",
        activity: `Unlocked: ${game?.id ?? gameId}`,
        points: -(game?.unlockCost ?? 0),
      });
    } else if (result.via === "streak") {
      ledger.unshift({
        date: new Date().toISOString(),
        childName: "Game Unlock",
        activity: `Streak unlock (${STREAK_UNLOCK_DAYS} days): ${gameId}`,
        points: 0,
      });
    }

    await db
      .update(gamingWalletTable)
      .set({
        pointsBalance: result.pointsBalance ?? wallet.pointsBalance,
        unlockedGames: result.unlocked,
        ledger: capLedger(ledger),
        updatedAt: new Date(),
      })
      .where(eq(gamingWalletTable.userId, userId));
  }

  return { snapshot: await getWalletSnapshot(userId), result };
}

export async function recordGamePlay(
  userId: string,
  input: {
    gameId: string;
    score: number;
    total: number;
  },
): Promise<
  | { ok: true; snapshot: WalletSnapshot; pointsEarned: number; perfect: boolean }
  | { ok: false; error: string; snapshot: WalletSnapshot }
> {
  const game = getGameById(input.gameId);
  if (!game || game.status !== "ready") {
    const snapshot = await getWalletSnapshot(userId);
    return { ok: false, error: "Game not found.", snapshot };
  }

  const [wallet, ent] = await Promise.all([
    loadOrInitWallet(userId),
    getEntitlements(userId),
  ]);

  const playLog = Array.isArray(wallet.playLog) ? [...wallet.playLog] : [];
  if (dailyLimitReached(playLog, ent.isPremium)) {
    return {
      ok: false,
      error: `Daily limit reached (${dailyLimit(ent.isPremium)} games per day).`,
      snapshot: await getWalletSnapshot(userId),
    };
  }

  const unlocked = ensureStarters(wallet.unlockedGames ?? []);
  const { perfect, pointsEarned } = computePointsEarned(
    game,
    input.score,
    input.total,
  );

  playLog.unshift({
    id: input.gameId,
    date: new Date().toISOString(),
    pointsEarned,
    perfect,
    score: Math.max(0, Math.min(Math.floor(input.total), Math.floor(input.score))),
    total: Math.max(1, Math.floor(input.total)),
  });

  const skills: SkillRecord = { ...(wallet.skills as SkillRecord) };
  const cat = game.category;
  const s = skills[cat] ?? { attempts: 0, correct: 0, plays: 0 };
  const safeTotal = Math.max(1, Math.floor(input.total));
  const safeScore = Math.max(0, Math.min(safeTotal, Math.floor(input.score)));
  s.attempts += safeTotal;
  s.correct += safeScore;
  s.plays += 1;
  skills[cat] = s;

  const ledger = Array.isArray(wallet.ledger) ? [...wallet.ledger] : [];
  ledger.unshift({
    date: new Date().toISOString(),
    childName: "Game Play",
    activity: `${game.id}${perfect ? " — Perfect!" : ""}`,
    points: pointsEarned,
  });

  await db
    .update(gamingWalletTable)
    .set({
      pointsBalance: wallet.pointsBalance + pointsEarned,
      playLog: capPlayLog(playLog),
      skills,
      ledger: capLedger(ledger),
      unlockedGames: unlocked,
      updatedAt: new Date(),
    })
    .where(eq(gamingWalletTable.userId, userId));

  return {
    ok: true,
    snapshot: await getWalletSnapshot(userId),
    pointsEarned,
    perfect,
  };
}
