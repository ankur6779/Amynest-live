import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Mic, RotateCcw, Sparkles } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useListChildren } from "@workspace/api-client-react";
import { runSafeNavAction, smartBack } from "@/lib/safe-navigation";
import { useSpeechCoachV2Session } from "./hooks/use-speech-coach-v2-session";
import { useSpeechCoachV2Realtime } from "./hooks/use-speech-coach-v2-realtime";
import { SpeechCoachV2SessionUi } from "./components/session-ui";
import { SpeechCoachV2CelebrationOverlay } from "./components/celebration-overlay";
import { SpeechCoachV2LimitReached } from "./components/limit-reached";
import {
  isSpeechCoachV2Enabled,
  startSpeechCoachV2RemoteConfigPolling,
} from "./lib/remote-config";

export default function SpeechCoachV2SessionPage() {
  const authFetch = useAuthFetch();
  const [location, setLocation] = useLocation();
  const { data: children = [] } = useListChildren();
  const child = children[0];
  const [live, setLive] = useState(false);
  const [v2Enabled, setV2Enabled] = useState(isSpeechCoachV2Enabled());

  useEffect(() => {
    const stop = startSpeechCoachV2RemoteConfigPolling();
    const interval = setInterval(() => setV2Enabled(isSpeechCoachV2Enabled()), 30_000);
    return () => {
      stop();
      clearInterval(interval);
    };
  }, []);

  const ageMonths = useMemo(
    () => (child?.age ?? 0) * 12 + (child?.ageMonths ?? 0),
    [child?.age, child?.ageMonths],
  );

  const session = useSpeechCoachV2Session({
    authFetch,
    childId: child?.id ?? 0,
    childName: child?.name ?? "friend",
    ageMonths,
    enabled: v2Enabled && Boolean(child?.id),
  });

  const realtime = useSpeechCoachV2Realtime({
    authFetch,
    childId: child?.id ?? 0,
    sessionId: session.sessionState?.sessionId ?? "",
    tabLockToken: session.tabLockToken,
    instructions: session.instructions,
    enabled: live && Boolean(session.sessionState?.sessionId) && Boolean(session.tabLockToken),
    onUserTranscript: session.handleUserTranscript,
    onAssistantTranscript: session.handleAssistantTranscript,
    onLimitReached: () => setLive(false),
  });

  const handleEnd = useCallback(async () => {
    setLive(false);
    realtime.disconnect();
    await session.finishSession();
  }, [realtime, session]);

  const handleEndRef = useRef(handleEnd);
  handleEndRef.current = handleEnd;

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      const elapsed = realtime.sessionElapsedSeconds();
      if (session.checkSessionComplete(elapsed)) {
        void handleEndRef.current();
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [live, realtime, session]);

  const handleStart = useCallback(() => {
    session.beginLive();
    setLive(true);
  }, [session]);

  if (!v2Enabled) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">Speech Coach V2 is not available yet.</p>
        <AppLink href="/speech-coach" className="mt-4">
          <Button variant="outline">Go to Speech Coach</Button>
        </AppLink>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-muted-foreground">
        Add a child profile to start Speech Coach V2.
      </div>
    );
  }

  if (session.uiState === "limit_reached") {
    return <SpeechCoachV2LimitReached message={session.dailyLimitMessage} />;
  }

  if (session.uiState === "resume_prompt" && session.pendingResume) {
    const resume = session.pendingResume;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-6">
        <Sparkles className="h-10 w-10 text-sky-500" />
        <h1 className="text-xl font-bold">Resume your session?</h1>
        <p className="text-center text-sm text-muted-foreground">
          You have an unfinished practice session. Pick up where you left off or start fresh.
        </p>
        <Card className="w-full">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            <p>Phase: {resume.sessionState.phase.replace(/_/g, " ")}</p>
            <p>Stars earned: {resume.sessionState.starsEarned}</p>
          </CardContent>
        </Card>
        <div className="flex w-full flex-col gap-3">
          <Button size="lg" onClick={() => void session.resumeSession()}>
            <Mic className="mr-2 h-4 w-4" />
            Resume Session
          </Button>
          <Button variant="outline" size="lg" onClick={() => void session.discardAndStartNew()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Start New Session
          </Button>
        </div>
      </div>
    );
  }

  if (session.uiState === "error") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">{session.errorMessage}</p>
        <Button onClick={() => void session.bootstrap()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-4 z-10">
        <button
          type="button"
          onClick={() => runSafeNavAction("speech-coach-v2-session-back", () => smartBack(setLocation, location, "speech-coach-v2-session-back"))}
          className="rounded-full bg-black/30 p-2 text-white backdrop-blur"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <SpeechCoachV2SessionUi
        childName={child.name ?? "friend"}
        phaseLabel={session.phaseLabel}
        connectionState={realtime.connectionState}
        starsEarned={session.sessionState?.starsEarned ?? 0}
        pointsEarned={session.sessionState?.pointsEarned ?? 0}
        remainingSeconds={session.remainingSeconds}
        lastTranscript={session.lastUserTranscript}
        onStart={handleStart}
        onEnd={() => void handleEnd()}
        live={live}
        loading={session.uiState === "loading"}
      />

      {session.celebration && (
        <SpeechCoachV2CelebrationOverlay
          stars={session.celebration.stars}
          points={session.celebration.points}
          badges={session.celebration.badges}
          streakDays={session.celebration.streakDays}
          onDone={() => setLocation("/speech-coach-v2")}
        />
      )}
    </div>
  );
}
