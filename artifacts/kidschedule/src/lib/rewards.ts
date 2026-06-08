const POINTS_KEY = "amynest_points";
const LEDGER_KEY = "amynest_ledger";
const BADGES_KEY = "amynest_badges";
const REWARDS_KEY = "amynest_rewards";
const REDEMPTIONS_KEY = "amynest_redemptions";

export type LedgerEntry = {
  date: string;
  childName: string;
  activity: string;
  points: number;
};

export type Badge = {
  id: string;
  label: string;
  emoji: string;
  earnedAt: string;
};

export type Reward = {
  id: string;
  label: string;
  emoji: string;
  cost: number;
};

export type Redemption = {
  rewardId: string;
  rewardLabel: string;
  childName: string;
  date: string;
  cost: number;
};

export function getTotalPoints(): number {
  return parseInt(localStorage.getItem(POINTS_KEY) ?? "0", 10);
}

export function addPoints(childName: string, activity: string, amount = 10): void {
  const current = getTotalPoints();
  localStorage.setItem(POINTS_KEY, String(current + amount));
  const ledger: LedgerEntry[] = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "[]");
  ledger.unshift({ date: new Date().toISOString(), childName, activity, points: amount });
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger.slice(0, 50)));
}

export function getLedger(): LedgerEntry[] {
  return JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "[]");
}

export function getBadges(): Badge[] {
  return JSON.parse(localStorage.getItem(BADGES_KEY) ?? "[]");
}

function awardBadge(id: string, label: string, emoji: string): void {
  const badges = getBadges();
  if (!badges.find((b) => b.id === id)) {
    badges.push({ id, label, emoji, earnedAt: new Date().toISOString() });
    localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
  }
}

export function checkAndAwardBadges(completedTodayCount: number, streakDays: number): Badge[] {
  const before = getBadges().length;
  if (completedTodayCount >= 1) awardBadge("first_day", "First Day Completed", "🌟");
  if (completedTodayCount >= 8) awardBadge("perfect_day", "Perfect Day", "🏆");
  if (streakDays >= 5) awardBadge("streak_5", "5 Day Streak", "🔥");
  if (streakDays >= 10) awardBadge("streak_10", "10 Day Streak", "💎");
  const after = getBadges();
  return after.slice(before);
}

export function getRewards(): Reward[] {
  const stored = localStorage.getItem(REWARDS_KEY);
  if (stored) return JSON.parse(stored);
  const defaults: Reward[] = [
    { id: "cartoon", label: "Cartoon Time (30min)", emoji: "📺", cost: 50 },
    { id: "chocolate", label: "Chocolate Treat", emoji: "🍫", cost: 30 },
    { id: "game", label: "Game Time (1hr)", emoji: "🎮", cost: 80 },
    { id: "park", label: "Park Visit", emoji: "🌳", cost: 100 },
    { id: "sticker", label: "Sticker Pack", emoji: "⭐", cost: 20 },
  ];
  localStorage.setItem(REWARDS_KEY, JSON.stringify(defaults));
  return defaults;
}

export function getNextAffordableReward(points: number): { reward: Reward; remaining: number } | null {
  const next = getRewards()
    .filter((r) => r.cost > points)
    .sort((a, b) => a.cost - b.cost)[0];
  if (!next) return null;
  return { reward: next, remaining: next.cost - points };
}

export function saveRewards(rewards: Reward[]): void {
  localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
}

export function redeemReward(reward: Reward, childName: string): boolean {
  const points = getTotalPoints();
  if (points < reward.cost) return false;
  localStorage.setItem(POINTS_KEY, String(points - reward.cost));
  const redemptions: Redemption[] = JSON.parse(localStorage.getItem(REDEMPTIONS_KEY) ?? "[]");
  redemptions.unshift({ rewardId: reward.id, rewardLabel: reward.label, childName, date: new Date().toISOString(), cost: reward.cost });
  localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(redemptions.slice(0, 20)));
  return true;
}

export function getRedemptions(): Redemption[] {
  return JSON.parse(localStorage.getItem(REDEMPTIONS_KEY) ?? "[]");
}
