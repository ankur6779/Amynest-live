import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeIdleMs,
  type AmyPresenceOutput,
} from "@workspace/math-playground-engagement";
import { usePlaygroundAmyPresence } from "./usePlaygroundAmyPresence";
import type { PlaygroundStateApi } from "./usePlaygroundState";
import type { usePlaygroundAmy } from "./usePlaygroundAmy";
import { trackPlaygroundEvent } from "../lib/playground-analytics";
import { isMpAmyAvatarEnabled } from "../lib/feature-flags";

export interface PlaygroundEngagementApi {
  recordSuccess: () => void;
  recordFailure: () => void;
  recordInteraction: () => void;
  presence: AmyPresenceOutput;
  amy3dState: ReturnType<typeof usePlaygroundAmyPresence>["amy3dState"];
  reactionKey: number;
  flushReactionCue: (queueCue: (key: string) => void) => void;
}

export function usePlaygroundEngagement(
  childId: number,
  playground: Pick<
    PlaygroundStateApi,
    "engagement" | "recordEngagement" | "saveEngagement"
  >,
  amy: Pick<ReturnType<typeof usePlaygroundAmy>, "speaking" | "queueCue">,
): PlaygroundEngagementApi {
  const [lastOutcome, setLastOutcome] = useState<"success" | "failure" | null>(null);
  const [reactionKey, setReactionKey] = useState(0);
  const idleFiredRef = useRef(false);

  useEffect(() => {
    if (!playground.engagement) {
      playground.saveEngagement({
        consecutiveSuccesses: 0,
        consecutiveFailures: 0,
        lastInteractionAt: Date.now(),
        sessionStartedAt: Date.now(),
      });
    }
  }, [playground.engagement, playground.saveEngagement]);

  useEffect(() => {
    if (!lastOutcome) return;
    const t = window.setTimeout(() => setLastOutcome(null), 1_800);
    return () => clearTimeout(t);
  }, [lastOutcome, reactionKey]);

  useEffect(() => {
    if (!isMpAmyAvatarEnabled() || !playground.engagement) return;

    const interval = setInterval(() => {
      const idleMs = computeIdleMs(playground.engagement!, Date.now());
      if (idleMs >= 8_000 && !idleFiredRef.current && !amy.speaking) {
        idleFiredRef.current = true;
        setReactionKey((k) => k + 1);
        trackPlaygroundEvent("engagement_idle_reengage", childId, { idleMs });
      }
      if (idleMs < 4_000) idleFiredRef.current = false;
    }, 2_000);

    return () => clearInterval(interval);
  }, [childId, playground.engagement, amy.speaking]);

  const bumpOutcome = useCallback((outcome: "success" | "failure") => {
    setLastOutcome(outcome);
    setReactionKey((k) => k + 1);
  }, []);

  const recordSuccess = useCallback(() => {
    playground.recordEngagement("success");
    bumpOutcome("success");
  }, [playground, bumpOutcome]);

  const recordFailure = useCallback(() => {
    playground.recordEngagement("failure");
    bumpOutcome("failure");
  }, [playground, bumpOutcome]);

  const recordInteraction = useCallback(() => {
    playground.recordEngagement("interaction");
    idleFiredRef.current = false;
  }, [playground]);

  const { presence, amy3dState } = usePlaygroundAmyPresence({
    engagement: playground.engagement,
    amySpeaking: amy.speaking,
    justSucceeded: lastOutcome === "success",
    justFailed: lastOutcome === "failure",
    reactionSeed: reactionKey,
  });

  const flushReactionCue = useCallback(
    (queueCue: (key: string) => void) => {
      const cueKey = presence.reaction?.cueKey;
      if (cueKey) queueCue(cueKey);
      if (presence.reaction && childId > 0) {
        trackPlaygroundEvent("amy_reaction_triggered", childId, {
          kind: presence.reaction.kind,
          mood: presence.reaction.mood,
        });
      }
    },
    [presence.reaction, childId],
  );

  useEffect(() => {
    if (presence.reaction?.cueKey && isMpAmyAvatarEnabled()) {
      amy.queueCue(presence.reaction.cueKey);
    }
  }, [reactionKey, presence.reaction?.cueKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    recordSuccess,
    recordFailure,
    recordInteraction,
    presence,
    amy3dState,
    reactionKey,
    flushReactionCue,
  };
}
