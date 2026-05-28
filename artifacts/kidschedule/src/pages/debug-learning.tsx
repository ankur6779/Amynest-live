/**
 * Phase 6 — internal Learning Inspector.
 *
 * Gated behind:
 *   ?debug=1  OR  import.meta.env.DEV  OR  ?dev=1
 *
 * Visualizes the LearningProgressEngine state for a child:
 *   - profile snapshot
 *   - skill graph entries
 *   - reward events history (from the current Phase 3 wallet)
 *   - adaptive recommendations + reasons
 *   - sync queue diagnostics
 *
 * No new data is persisted; this is a read-only inspector.
 */

import { useEffect, useMemo, useState } from "react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import {
  useLearningSyncDiagnostics,
  useLearningResilienceReport,
} from "@/hooks/use-learning-sync";
import { ScreenShell } from "@/components/screen-shell";
import { PremiumCard, EmptyStateCard } from "@/components/learning-progress";
import {
  detectPerformanceTier,
  visualBudget,
} from "@/lib/performance-tier";
import {
  getTelemetryBufferForDebug,
  telemetrySessionId,
} from "@/lib/telemetry-engine";
import {
  scorePlatformHealth,
  optimizeBehavior,
} from "@workspace/learning-progress-engine";

export default function DebugLearningPage() {
  const allowed = useDebugAllowed();
  const { data: children = [] } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const childList = children as { id: number; name: string }[];
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedId == null && childList[0]) setSelectedId(childList[0].id);
  }, [childList, selectedId]);

  const { profile, phase3, unlocks, isPremium } = useLearningProgress(selectedId);
  const diag = useLearningSyncDiagnostics();
  const resilience = useLearningResilienceReport();
  const tierProfile = useMemo(() => detectPerformanceTier(), []);
  const budget = useMemo(() => visualBudget(tierProfile.tier), [tierProfile]);
  const sessionId = useMemo(() => (typeof window !== "undefined" ? telemetrySessionId() : ""), []);
  const [telemetrySnapshot, setTelemetrySnapshot] = useState<ReturnType<typeof getTelemetryBufferForDebug>>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tick = () => setTelemetrySnapshot(getTelemetryBufferForDebug());
    tick();
    const id = window.setInterval(tick, 2000);
    return () => window.clearInterval(id);
  }, []);

  const healthScore = useMemo(() => {
    return scorePlatformHealth({
      syncSuccessRate: diag && diag.lastError == null ? 1 : 0.95,
      queueDepth: diag?.queueDepth ?? 0,
      renderFps: 60,
    });
  }, [diag]);

  const optimized = useMemo(() => {
    if (!profile || !phase3) return null;
    return optimizeBehavior({
      profile,
      memory: phase3.memory,
      signals: {
        sessionsLast7d: 1,
        activitiesLast24h: profile.completedActivities.length,
      },
    });
  }, [profile, phase3]);

  if (!allowed) {
    return (
      <ScreenShell title="Not available">
        <EmptyStateCard
          emoji="🔒"
          title="Inspector is dev-only"
          message="Append ?debug=1 to this URL to open the inspector."
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Learning inspector"
      subtitle="Read-only view of LearningProgressEngine state. No writes happen here."
    >
      {childList.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {childList.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
                selectedId === c.id
                  ? "bg-primary/15 border-primary/40 text-primary"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              {c.name} · #{c.id}
            </button>
          ))}
        </div>
      )}

      <Section title="Profile">
        <Json
          value={
            profile
              ? {
                  childId: profile.childId,
                  journeyDay: profile.journeyDay,
                  level: profile.learningLevel,
                  mastery: profile.masteryScore,
                  streakDays: profile.streakDays,
                  totalXP: profile.totalXP,
                  phase: profile.currentPhase,
                  isPremium,
                  completedCount: profile.completedActivities.length,
                  weakSkills: profile.weakSkills,
                  unlockedSkills: profile.unlockedSkills,
                }
              : null
          }
        />
      </Section>

      <Section title="Phase 3 wallet & memory">
        <Json
          value={
            phase3
              ? {
                  wallet: phase3.wallet,
                  memory: phase3.memory,
                  comeback: phase3.comeback,
                  difficulty: phase3.difficulty,
                  trend: phase3.parentDashboard.learningTrend,
                }
              : null
          }
        />
      </Section>

      <Section title="Recommendations (with reasoning)">
        {phase3?.recommendations.length ? (
          <ul className="space-y-2">
            {phase3.recommendations.map((r) => (
              <li
                key={r.id}
                className="text-xs rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span aria-hidden>{r.emoji}</span>
                  <span className="font-semibold">{r.title}</span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                    {r.priority}
                  </span>
                </div>
                <p className="text-muted-foreground">{r.reason}</p>
                <p className="text-[10px] text-primary/70 mt-1">→ {r.href}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No recommendations yet.</p>
        )}
      </Section>

      <Section title="Skill graph">
        {phase3 ? (
          <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {phase3.skillGraph.length === 0 && (
              <li className="text-xs text-muted-foreground">
                Skill graph is empty — complete a few activities to seed it.
              </li>
            )}
            {phase3.skillGraph.map((e) => (
              <li
                key={e.skillId}
                className="flex justify-between text-xs px-2 py-1 rounded border border-border/40"
              >
                <span className="truncate">{e.skillId}</span>
                <span className="text-muted-foreground">
                  {e.mastery}% · {e.progressionStage} · ×{e.attempts}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No phase 3 data.</p>
        )}
      </Section>

      <Section title="Today's unlocks">
        <Json
          value={
            unlocks
              ? {
                  numbersMax: unlocks.numbersMax,
                  numbersStage: unlocks.numbersStage,
                  alphabetRange: unlocks.alphabetRange,
                  alphabetsStage: unlocks.alphabetsStage,
                  phonicsLevel: unlocks.phonicsLevel,
                  speechLevel: unlocks.speechLevel,
                  storyLevel: unlocks.storyLevel,
                  puzzleDifficulty: unlocks.puzzleDifficulty,
                  isRevisionDay: unlocks.isRevisionDay,
                  todaysUnlocks: unlocks.todaysUnlocks.map((u) => u.id),
                  nextSessionUnlocks: unlocks.nextSessionUnlocks.map((u) => u.id),
                }
              : null
          }
        />
      </Section>

      <Section title="Sync queue diagnostics">
        <Json value={diag} />
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Queue items are persisted to localStorage and retried with exponential
          backoff. Duplicate taps inside the cooldown window are suppressed
          client-side; the server applies the authoritative anti-spam check.
        </p>
      </Section>

      <Section title="Resilience watcher">
        <Json value={resilience} />
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Detects corrupted local queue payloads, stale entries, duplicate
          retries, and reward desync — pruning silently so the sync engine can
          recover.
        </p>
      </Section>

      <Section title="Performance tier + visual budget">
        <Json value={{ ...tierProfile, budget }} />
      </Section>

      <Section title="Behavior optimizer (live)">
        <Json value={optimized} />
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          Tunes session size, recommendation cadence, and celebration intensity
          toward calm consistency. Burnout signals force a slower pace.
        </p>
      </Section>

      <Section title="Platform health (sampled)">
        <Json value={healthScore} />
      </Section>

      <Section title="Telemetry buffer">
        <p className="text-[11px] text-muted-foreground mb-2">
          Session: <code>{sessionId || "(pending)"}</code> · buffered events:{" "}
          {telemetrySnapshot.length}
        </p>
        <Json
          value={telemetrySnapshot.slice(-15).map((e) => ({
            kind: e.kind,
            at: e.at,
            value: e.value,
            tier: e.tier,
            details: e.details,
          }))}
        />
      </Section>
    </ScreenShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PremiumCard tier="flat">
      <div className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {title}
        </h3>
        {children}
      </div>
    </PremiumCard>
  );
}

function Json({ value }: { value: unknown }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre className="text-[11px] leading-relaxed overflow-x-auto max-h-72 rounded-lg bg-muted/40 p-2 text-foreground/80">
      {text}
    </pre>
  );
}

function useDebugAllowed(): boolean {
  return useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("debug") === "1" || params.get("dev") === "1") return true;
    } catch {
      /* ignore */
    }
    return Boolean(import.meta.env?.DEV);
  }, []);
}
