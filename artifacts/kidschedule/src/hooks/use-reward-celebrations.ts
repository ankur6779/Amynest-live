import { useCallback, useEffect, useState } from "react";
import type { RewardEvent } from "@workspace/learning-progress-engine";
import { rewardIntensity, REWARD_REVEAL_DELAY_MS } from "@/lib/experience-system";
import { subscribeRewardEvents } from "@/lib/learning-reward-bus";

/**
 * Reward pacing — only opens the modal for medium/major moments. Small wins
 * are surfaced inline by the calling component (subtle glow, no modal).
 */
export function useRewardCelebrations() {
  const [events, setEvents] = useState<RewardEvent[]>([]);
  const [open, setOpen] = useState(false);

  const celebrate = useCallback((incoming: RewardEvent[]) => {
    if (incoming.length === 0) return;
    const intensity = rewardIntensity({
      rewardEventCount: incoming.length,
      hasLevelUp: incoming.some((e) => e.type === "level_up"),
      sessionComplete: incoming.some(
        (e) => e.badgeId === "session_complete" || e.type === "surprise",
      ),
    });
    setEvents(incoming);
    if (intensity === "full") {
      window.setTimeout(() => setOpen(true), REWARD_REVEAL_DELAY_MS);
    } else if (intensity === "card") {
      window.setTimeout(() => setOpen(true), REWARD_REVEAL_DELAY_MS);
    }
    // intensity === "subtle" → no modal, events still exposed for inline UI.
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setEvents([]);
  }, []);

  // Auto-subscribe to the global reward bus so rewards triggered from the
  // sync engine reach this hook without explicit prop wiring.
  useEffect(() => subscribeRewardEvents(celebrate), [celebrate]);

  return { events, open, celebrate, close };
}
