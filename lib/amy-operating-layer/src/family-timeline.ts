import type { FamilyIntelligenceSnapshot } from "@workspace/family-intelligence";
import type { TimelineEvent } from "./types.js";

export function buildFamilyTimeline(
  snapshot: FamilyIntelligenceSnapshot,
  historicalEvents: TimelineEvent[] = [],
): TimelineEvent[] {
  const events: TimelineEvent[] = [...historicalEvents];

  for (const m of snapshot.moments) {
    if (events.some((e) => e.title === m.title)) continue;
    events.push({
      id: `moment_${m.type}`,
      eventType: m.type.includes("breakthrough") ? "breakthrough" : "milestone",
      title: m.title,
      description: m.description,
      occurredAt: m.detectedAt,
    });
  }

  if (snapshot.risks.parentChurnRisk >= 0.5 && snapshot.health.trend7d < -5) {
    events.push({
      id: `challenge_${snapshot.computedAt.slice(0, 10)}`,
      eventType: "challenge",
      title: "Engagement dip detected",
      description: "Family health trended down — recovery playbook activated.",
      occurredAt: snapshot.computedAt,
    });
  }

  if (snapshot.health.trend7d >= 5 && snapshot.health.score >= 70) {
    events.push({
      id: `recovery_${snapshot.computedAt.slice(0, 10)}`,
      eventType: "recovery",
      title: "Momentum returning",
      description: "Health score improving — keep protecting what's working.",
      occurredAt: snapshot.computedAt,
    });
  }

  return events.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
