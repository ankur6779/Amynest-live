/** Warm, premium copy — avoid failure-heavy or corporate analytics tone. */

export function encouragementForAccuracy(correct: boolean): string {
  return correct
    ? "Wonderful try! Your brain is growing."
    : "Good effort! Let's try once more together.";
}

export function sessionCompleteHeadline(childName: string): string {
  return `${childName} finished today's learning adventure!`;
}

export function recoveryMessage(daysAway: number): string {
  if (daysAway >= 7) return "We saved something special for your comeback — no pressure, just fun.";
  return "A quick 5-minute win is waiting — you've got this.";
}

export function learningTrendLabel(trend: "up" | "steady" | "needs_support"): string {
  if (trend === "up") return "Strong progress";
  if (trend === "needs_support") return "Growing with gentle support";
  return "Steady learning momentum";
}

export function consistencyLabel(score: number): string {
  if (score >= 80) return "Beautiful rhythm this week";
  if (score >= 50) return "Building a lovely habit";
  return "Every small session counts";
}

export function skillStageLabel(stage: string): string {
  const map: Record<string, string> = {
    not_started: "Ready to explore",
    practicing: "Growing confidence",
    emerging: "Getting stronger",
    mastered: "Shining bright",
  };
  return map[stage] ?? "On the path";
}

export function tomorrowUnlockHeadline(): string {
  return "Tomorrow unlocks";
}

export function tomorrowUnlockSubline(childName?: string): string {
  const who = childName ?? "your child";
  return `Something lovely is waiting for ${who} — come back for a gentle surprise.`;
}

export function greatJobMoment(): string {
  return "Great job!";
}

export function emptyStreakCopy(): string {
  return "Your first streak starts with one cozy session today.";
}

export function emptyRewardsCopy(): string {
  return "Stars and coins appear as your child plays — celebrate each small win.";
}

export function emptySessionCopy(childName: string): string {
  return `${childName}'s daily adventure is ready — five short steps, lots of smiles.`;
}

export function parentStrongestSkillsTitle(): string {
  return "Growing confidence";
}

export function parentImprovementTitle(): string {
  return "Needs a little practice";
}

export function parentStreakCalendarTitle(): string {
  return "Learning rhythm";
}

export function teaserForUnlock(title: string, section?: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("story") || section === "stories") return "A new story adventure awaits";
  if (lower.includes("math") || section === "math") return "A fresh math adventure";
  if (lower.includes("phonics") || section === "phonics") return "New sounds to discover";
  if (lower.includes("puzzle") || section === "puzzles") return "A surprise puzzle challenge";
  if (lower.includes("speech") || section === "speech") return "A confidence-building moment";
  return "A gentle surprise is on the way";
}
