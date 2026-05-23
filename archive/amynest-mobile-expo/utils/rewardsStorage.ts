// Rewards / redemption storage — AsyncStorage parity with web src/lib/rewards.ts.
// Note: KEY_POINTS is shared with gamesStorage.ts so points earned from games and
// from routines/behaviour all spend from the same balance.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_POINTS = "amynest_points";
const KEY_LEDGER = "amynest_ledger";
const KEY_BADGES = "amynest_badges";
const KEY_REWARDS = "amynest_rewards";
const KEY_REDEMPTIONS = "amynest_redemptions";

export interface LedgerEntry {
  date: string;
  childName: string;
  activity: string;
  points: number;
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  earnedAt: string;
}

export interface Reward {
  id: string;
  label: string;
  emoji: string;
  cost: number;
}

export interface Redemption {
  rewardId: string;
  rewardLabel: string;
  childName: string;
  date: string;
  cost: number;
}

const DEFAULT_REWARDS: Reward[] = [
  { id: "cartoon", label: "Cartoon Time (30min)", emoji: "📺", cost: 50 },
  { id: "chocolate", label: "Chocolate Treat", emoji: "🍫", cost: 30 },
  { id: "game", label: "Game Time (1hr)", emoji: "🎮", cost: 80 },
  { id: "park", label: "Park Visit", emoji: "🌳", cost: 100 },
  { id: "sticker", label: "Sticker Pack", emoji: "⭐", cost: 20 },
];

// Serialize all reads/writes to KEY_POINTS, KEY_REDEMPTIONS, and the games
// module's KEY_UNLOCKED so concurrent earn/redeem/unlock paths don't lose
// updates via read→modify→write races.
let pointsLock: Promise<unknown> = Promise.resolve();
export function withPointsLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = pointsLock.then(fn, fn);
  pointsLock = next.catch(() => undefined);
  return next;
}

/**
 * Atomically mutate the shared points balance. The mutator receives the current
 * balance and returns the next one. The whole read-modify-write executes inside
 * a module-level lock that is also used by `redeemReward` and the games module.
 */
export async function mutatePoints(
  mutator: (current: number) => number | Promise<number>,
): Promise<number> {
  return withPointsLock(async () => {
    const cur = await getTotalPointsRaw();
    const next = Math.max(0, Math.floor(await mutator(cur)));
    await AsyncStorage.setItem(KEY_POINTS, String(next));
    return next;
  });
}

async function getTotalPointsRaw(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY_POINTS);
  return parseInt(raw ?? "0", 10) || 0;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {/* ignore */}
}

export async function getTotalPoints(): Promise<number> {
  return getTotalPointsRaw();
}

export async function addPoints(childName: string, activity: string, amount = 10): Promise<void> {
  await withPointsLock(async () => {
    const cur = await getTotalPointsRaw();
    await AsyncStorage.setItem(KEY_POINTS, String(cur + amount));
    const ledger = await readJson<LedgerEntry[]>(KEY_LEDGER, []);
    ledger.unshift({ date: new Date().toISOString(), childName, activity, points: amount });
    await writeJson(KEY_LEDGER, ledger.slice(0, 50));
  });
}

export async function getLedger(): Promise<LedgerEntry[]> {
  return readJson<LedgerEntry[]>(KEY_LEDGER, []);
}

export async function getBadges(): Promise<Badge[]> {
  return readJson<Badge[]>(KEY_BADGES, []);
}

async function awardBadge(id: string, label: string, emoji: string): Promise<void> {
  const badges = await getBadges();
  if (!badges.find((b) => b.id === id)) {
    badges.push({ id, label, emoji, earnedAt: new Date().toISOString() });
    await writeJson(KEY_BADGES, badges);
  }
}

export async function checkAndAwardBadges(completedTodayCount: number, streakDays: number): Promise<Badge[]> {
  const before = (await getBadges()).length;
  if (completedTodayCount >= 1) await awardBadge("first_day", "First Day Completed", "🌟");
  if (completedTodayCount >= 8) await awardBadge("perfect_day", "Perfect Day", "🏆");
  if (streakDays >= 5) await awardBadge("streak_5", "5 Day Streak", "🔥");
  if (streakDays >= 10) await awardBadge("streak_10", "10 Day Streak", "💎");
  const after = await getBadges();
  return after.slice(before);
}

export async function getRewards(): Promise<Reward[]> {
  const raw = await AsyncStorage.getItem(KEY_REWARDS);
  if (raw) {
    try { return JSON.parse(raw) as Reward[]; } catch {/* fallthrough */}
  }
  await writeJson(KEY_REWARDS, DEFAULT_REWARDS);
  return [...DEFAULT_REWARDS];
}

export async function saveRewards(rewards: Reward[]): Promise<void> {
  await writeJson(KEY_REWARDS, rewards);
}

export async function redeemReward(reward: Reward, childName: string): Promise<{ ok: boolean; pointsAfter: number }> {
  return withPointsLock(async () => {
    const points = await getTotalPointsRaw();
    if (points < reward.cost) return { ok: false, pointsAfter: points };
    const after = points - reward.cost;
    await AsyncStorage.setItem(KEY_POINTS, String(after));
    const redemptions = await readJson<Redemption[]>(KEY_REDEMPTIONS, []);
    redemptions.unshift({
      rewardId: reward.id,
      rewardLabel: reward.label,
      childName,
      date: new Date().toISOString(),
      cost: reward.cost,
    });
    await writeJson(KEY_REDEMPTIONS, redemptions.slice(0, 20));
    return { ok: true, pointsAfter: after };
  });
}

export async function getRedemptions(): Promise<Redemption[]> {
  return readJson<Redemption[]>(KEY_REDEMPTIONS, []);
}
