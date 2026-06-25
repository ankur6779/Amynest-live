import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthFetchFn } from "@/lib/poll-result";
import {
  buildAmyRealtimeInstructions,
  currentExercise,
  DAILY_LIMIT_MESSAGE,
  getCurrentExercise,
  isSessionCompleteMastery,
  phaseLabel,
  SPEECH_COACH_V2_SESSION_SECONDS,
  toFullSessionState,
  type PersistedSessionState,
  type SpeechCoachV2SessionState,
} from "@workspace/speech-coach-v2";
import {
  completeSpeechCoachV2Session,
  evaluateSpeechCoachV2Turn,
  fetchActiveSpeechCoachV2Session,
  fetchSpeechCoachV2Usage,
  heartbeatSpeechCoachV2Session,
  SpeechCoachV2ApiError,
  startSpeechCoachV2Session,
} from "../lib/api";
import {
  clearLocalSnapshot,
  loadLocalSnapshot,
  saveLocalSnapshot,
} from "../lib/storage";
import {
  trackSpeechCoachPaidUsage,
  trackSpeechCoachTrialStarted,
  trackSpeechCoachV2LimitReached,
  trackSpeechCoachV2SessionComplete,
  trackSpeechCoachV2SessionStart,
} from "../lib/analytics";

export type SessionUiState =
  | "loading"
  | "resume_prompt"
  | "ready"
  | "live"
  | "limit_reached"
  | "celebrating"
  | "error";

function isSpeechCoachLimitError(err: unknown): boolean {
  return (
    err instanceof SpeechCoachV2ApiError
    && (
      err.code === "daily_limit_reached"
      || err.code === "monthly_limit_reached"
      || err.code === "session_limit_reached"
    )
  );
}

export function useSpeechCoachV2Session(input: {
  authFetch: AuthFetchFn;
  childId: number;
  childName: string;
  ageMonths: number;
  enabled: boolean;
  realtimeConnected?: boolean;
}) {
  const { authFetch, childId, enabled, realtimeConnected = false } = input;

  const [uiState, setUiState] = useState<SessionUiState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SpeechCoachV2SessionState | null>(null);
  const [tabLockToken, setTabLockToken] = useState("");
  const [instructions, setInstructions] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [dailyLimitSeconds, setDailyLimitSeconds] = useState(0);
  const [isTrial, setIsTrial] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [lastUserTranscript, setLastUserTranscript] = useState("");
  const [pendingResume, setPendingResume] = useState<{
    sessionId: string;
    tabLockToken: string;
    sessionState: PersistedSessionState;
    instructions: string;
  } | null>(null);
  const [celebration, setCelebration] = useState<{
    stars: number;
    points: number;
    badges: string[];
    streakDays: number;
  } | null>(null);

  const responseStartedAtRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const persistSnapshot = useCallback(
    (state: PersistedSessionState, token: string) => {
      saveLocalSnapshot({
        childId,
        sessionId: state.sessionId,
        tabLockToken: token,
        sessionState: state,
        updatedAt: new Date().toISOString(),
      });
    },
    [childId],
  );

  const applySession = useCallback(
    (state: PersistedSessionState, token: string, instr: string) => {
      const full = toFullSessionState(state);
      setSessionState(full);
      setTabLockToken(token);
      setInstructions(instr);
      persistSnapshot(state, token);
    },
    [persistSnapshot],
  );

  const applyUsage = useCallback((usage: Awaited<ReturnType<typeof fetchSpeechCoachV2Usage>>) => {
    setDailyLimitSeconds(usage.dailyLimitSeconds);
    setIsTrial(usage.isTrial);
    setIsPaid(usage.isPaid);
    setRemainingSeconds(usage.remainingSeconds);
  }, []);

  const startFreshSession = useCallback(async () => {
    const started = await startSpeechCoachV2Session(authFetch, { childId });
    applySession(started.sessionState, started.tabLockToken, started.instructions);
    setRemainingSeconds(started.remainingSeconds);
    if (started.isTrial) {
      trackSpeechCoachTrialStarted({ childId });
    } else if (started.isPaid) {
      trackSpeechCoachPaidUsage({ childId });
    }
    setUiState("ready");
    trackSpeechCoachV2SessionStart({
      childId,
      sessionId: started.sessionId,
      ageBand: started.ageBand,
    });
  }, [applySession, authFetch, childId]);

  const bootstrap = useCallback(async () => {
    if (!enabled || !childId) return;
    setUiState("loading");
    setErrorMessage(null);
    setPendingResume(null);

    try {
      const usage = await fetchSpeechCoachV2Usage(authFetch, childId);
      applyUsage(usage);
      if (usage.limitReached) {
        setUiState("limit_reached");
        trackSpeechCoachV2LimitReached({ childId, isTrial: usage.isTrial });
        return;
      }

      const [active, local] = await Promise.all([
        fetchActiveSpeechCoachV2Session(authFetch, childId),
        Promise.resolve(loadLocalSnapshot(childId)),
      ]);

      if (active.hasActiveSession && active.sessionState && active.sessionId && active.tabLockToken) {
        setPendingResume({
          sessionId: active.sessionId,
          tabLockToken: active.tabLockToken,
          sessionState: active.sessionState,
          instructions: active.instructions ?? buildAmyRealtimeInstructions(active.sessionState),
        });
        setUiState("resume_prompt");
        return;
      }

      if (local?.sessionState && local.tabLockToken) {
        setPendingResume({
          sessionId: local.sessionId,
          tabLockToken: local.tabLockToken,
          sessionState: local.sessionState,
          instructions: buildAmyRealtimeInstructions(local.sessionState),
        });
        setUiState("resume_prompt");
        return;
      }

      await startFreshSession();
    } catch (err) {
      if (isSpeechCoachLimitError(err)) {
        setUiState("limit_reached");
        trackSpeechCoachV2LimitReached({ childId, isTrial });
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Could not start session");
      setUiState("error");
    }
  }, [applyUsage, authFetch, childId, enabled, isTrial, startFreshSession]);

  const resumeSession = useCallback(async () => {
    if (!pendingResume) return;
    setUiState("loading");
    try {
      const started = await startSpeechCoachV2Session(authFetch, {
        childId,
        resume: true,
        sessionId: pendingResume.sessionId,
        tabLockToken: pendingResume.tabLockToken,
      });
      applySession(started.sessionState, started.tabLockToken, started.instructions);
      setRemainingSeconds(started.remainingSeconds);
      if (started.isTrial) {
        trackSpeechCoachTrialStarted({ childId });
      } else if (started.isPaid) {
        trackSpeechCoachPaidUsage({ childId });
      }
      setUiState("ready");
      trackSpeechCoachV2SessionStart({
        childId,
        sessionId: started.sessionId,
        ageBand: started.ageBand,
      });
    } catch (err) {
      if (isSpeechCoachLimitError(err)) {
        setUiState("limit_reached");
        trackSpeechCoachV2LimitReached({ childId, isTrial });
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Could not resume session");
      setUiState("error");
    }
  }, [applySession, authFetch, childId, isTrial, pendingResume]);

  const discardAndStartNew = useCallback(async () => {
    clearLocalSnapshot(childId);
    setPendingResume(null);
    setUiState("loading");
    try {
      await startFreshSession();
    } catch (err) {
      if (isSpeechCoachLimitError(err)) {
        setUiState("limit_reached");
        trackSpeechCoachV2LimitReached({ childId, isTrial });
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Could not start session");
      setUiState("error");
    }
  }, [childId, isTrial, startFreshSession]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const handleUserTranscript = useCallback(
    async (transcript: string, rawTranscript?: string) => {
      if (!sessionState || !tabLockToken) return;
      setLastUserTranscript(transcript);
      const exercise = currentExercise(sessionState) ?? getCurrentExercise(sessionState);
      if (!exercise) return;

      const responseSeconds = responseStartedAtRef.current
        ? (Date.now() - responseStartedAtRef.current) / 1000
        : undefined;
      responseStartedAtRef.current = null;

      try {
        const result = await evaluateSpeechCoachV2Turn(authFetch, {
          childId,
          sessionId: sessionState.sessionId,
          tabLockToken,
          exerciseId: exercise.id,
          expected: exercise.expected,
          transcript,
          rawTranscript: rawTranscript ?? transcript,
          responseSeconds,
        });

        applySession(result.sessionState, tabLockToken, result.instructions);
      } catch {
        // evaluation failures should not break the voice session
      }
    },
    [applySession, authFetch, childId, sessionState, tabLockToken],
  );

  const handleAssistantTranscript = useCallback(() => {
    responseStartedAtRef.current = Date.now();
  }, []);

  const beginLive = useCallback(() => {
    setUiState("live");
  }, []);

  const stopLive = useCallback(() => {
    stopHeartbeat();
    setUiState((state) => (state === "live" ? "ready" : state));
  }, [stopHeartbeat]);

  useEffect(() => {
    if (uiState !== "live" || !sessionState || !tabLockToken || !realtimeConnected) return;

    const runHeartbeat = () => {
      void heartbeatSpeechCoachV2Session(authFetch, {
        childId,
        sessionId: sessionState.sessionId,
        tabLockToken,
      })
        .then((hb) => {
          setRemainingSeconds(hb.remainingSeconds);
        })
        .catch((err: unknown) => {
          if (isSpeechCoachLimitError(err)) {
            setUiState("limit_reached");
            trackSpeechCoachV2LimitReached({ childId, isTrial });
          }
        });
    };

    runHeartbeat();
    heartbeatRef.current = setInterval(runHeartbeat, 15_000);

    return stopHeartbeat;
  }, [uiState, sessionState?.sessionId, tabLockToken, authFetch, childId, realtimeConnected, isTrial, stopHeartbeat]);

  const finishSession = useCallback(async () => {
    if (!sessionState || !tabLockToken) return;
    setUiState("celebrating");

    try {
      const result = await completeSpeechCoachV2Session(authFetch, {
        childId,
        sessionId: sessionState.sessionId,
        tabLockToken,
      });

      clearLocalSnapshot(childId);
      setCelebration({
        stars: result.starsEarned,
        points: result.pointsEarned,
        badges: result.badgesEarned,
        streakDays: result.dailyStreak,
      });

      trackSpeechCoachV2SessionComplete({
        childId,
        sessionId: sessionState.sessionId,
        durationSeconds: result.durationSeconds,
        starsEarned: result.starsEarned,
        phaseReached: sessionState.phase,
      });
    } catch {
      setCelebration({
        stars: sessionState.starsEarned,
        points: sessionState.pointsEarned,
        badges: [],
        streakDays: 0,
      });
    }
  }, [authFetch, childId, sessionState, tabLockToken]);

  const checkSessionComplete = useCallback(
    (elapsedSeconds: number) => {
      if (!sessionState) return false;
      return (
        isSessionCompleteMastery(sessionState, elapsedSeconds, SPEECH_COACH_V2_SESSION_SECONDS)
        || elapsedSeconds >= dailyLimitSeconds
        || sessionState.phase === "celebration"
      );
    },
    [sessionState, dailyLimitSeconds],
  );

  return {
    uiState,
    errorMessage,
    sessionState,
    tabLockToken,
    instructions,
    remainingSeconds,
    dailyLimitSeconds,
    isTrial,
    isPaid,
    lastUserTranscript,
    celebration,
    pendingResume,
    phaseLabel: sessionState ? phaseLabel(sessionState.phase) : "",
    dailyLimitMessage: DAILY_LIMIT_MESSAGE,
    bootstrap,
    resumeSession,
    discardAndStartNew,
    beginLive,
    stopLive,
    handleUserTranscript,
    handleAssistantTranscript,
    finishSession,
    checkSessionComplete,
    buildInstructions: () =>
      sessionState ? buildAmyRealtimeInstructions(sessionState) : instructions,
  };
}
