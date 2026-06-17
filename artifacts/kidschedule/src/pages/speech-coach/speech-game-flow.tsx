import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getAuth } from "firebase/auth";
import {
  useGetSpeechProgress,
  useLogSpeechPracticeAttempt,
} from "@workspace/api-client-react";
import {
  SPEECH_GAMES,
  buildGamePromptSession,
  compareTranscript,
  getArticulationCue,
  getPromptSpeakText,
  type SpeechGameId,
  type TranscriptFeedback,
} from "@workspace/speech-coach";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import {
  setAudioTraceModule,
  traceBrokenModulePreflight,
} from "@/lib/audio-root-cause-trace";
import { handleSubscriptionMutationGateError } from "@/lib/subscription-mutation-gate";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import {
  PronunciationCompanion,
  type PromptPhase,
  type SessionPhase,
} from "./pronunciation-companion";
import {
  clampClarityScore,
  playSpeechCue,
  speechCoachSttOptions,
  weakSoundsToHistory,
  type SpeechViewMode,
} from "./speech-coach-utils";
import {
  applyGameSessionRewards,
  coinsForFeedback,
  loadSpeechGameRewards,
} from "./speech-game-rewards";
import {
  emojiForGameWord,
  SPEECH_GAME_THEMES,
} from "./speech-game-theme";
import { Coins, Star, Trophy } from "lucide-react";

type Child = { id: number; name: string; age: number; ageMonths?: number | null };

function totalMonths(c: Child): number {
  return (c.age ?? 0) * 12 + (c.ageMonths ?? 0);
}

function StarsBurst({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="absolute h-5 w-5 animate-ping fill-amber-400 text-amber-400"
          style={{
            left: `${12 + i * 14}%`,
            top: `${10 + (i % 3) * 22}%`,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </div>
  );
}

function BreathingBubble({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex justify-center py-2" aria-hidden>
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 animate-pulse rounded-full bg-cyan-300/30" />
        <div className="absolute inset-2 animate-[ping_2s_ease-in-out_infinite] rounded-full bg-cyan-400/40" />
        <div className="absolute inset-4 rounded-full bg-cyan-200/60 blur-sm" />
      </div>
    </div>
  );
}

function GameCompletion({
  gameId,
  gameTitle,
  coinsEarned,
  sessionScore,
  badgeUnlocked,
  isNewBest,
  totalCoins,
  onPlayAgain,
  onClose,
}: {
  gameId: SpeechGameId;
  gameTitle: string;
  coinsEarned: number;
  sessionScore: number;
  badgeUnlocked: boolean;
  isNewBest: boolean;
  totalCoins: number;
  onPlayAgain: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const theme = SPEECH_GAME_THEMES[gameId];
  const gameMeta = SPEECH_GAMES.find((g) => g.id === gameId);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-4 text-center dark:from-violet-950/50 dark:to-fuchsia-950/40">
      <StarsBurst show />
      <div className="text-4xl">{theme.emoji}</div>
      <Trophy className="mx-auto mt-2 h-10 w-10 fill-amber-400 text-amber-500" />
      <p className="mt-2 font-bold text-lg text-foreground">
        {t("screens.speech_coach.games.complete_title", { game: gameTitle })}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("screens.speech_coach.games.complete_score", { score: sessionScore })}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Badge className="gap-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Coins className="h-3.5 w-3.5" />
          {t("screens.speech_coach.games.coins_earned", { count: coinsEarned })}
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          {t("screens.speech_coach.games.total_coins", { count: totalCoins })}
        </Badge>
        {isNewBest ? (
          <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            {t("screens.speech_coach.games.new_best")}
          </Badge>
        ) : null}
        {badgeUnlocked && gameMeta ? (
          <Badge className="rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
            {t("screens.speech_coach.games.badge_unlocked")}
          </Badge>
        ) : null}
      </div>
      <div className="mt-4 flex justify-center gap-2">
        <Button type="button" className="rounded-full" onClick={onPlayAgain}>
          {t("screens.speech_coach.games.play_again")}
        </Button>
        <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
          {t("screens.speech_coach.games.exit")}
        </Button>
      </div>
    </div>
  );
}

export function SpeechGameFlow({
  child,
  gameId,
  gameTitle,
  viewMode,
  onClose,
  onAction,
  onRewardsChange,
}: {
  child: Child;
  gameId: SpeechGameId;
  gameTitle: string;
  viewMode: SpeechViewMode;
  onClose: () => void;
  onAction: () => void;
  onRewardsChange?: () => void;
}) {
  const { t } = useTranslation();
  const ageMonths = totalMonths(child);
  const progress = useGetSpeechProgress({ childId: child.id, range: "week" });
  const log = useLogSpeechPracticeAttempt();
  const voice = useAmyVoice();
  const theme = SPEECH_GAME_THEMES[gameId];
  const gameMeta = SPEECH_GAMES.find((g) => g.id === gameId)!;

  const getAuthToken = useCallback(async () => {
    try {
      return (await getAuth().currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);
  const stt = useSpeechRecognition("en-US", speechCoachSttOptions({ getAuthToken }));

  const [sessionPhase, setSessionPhase] = useState<SessionPhase>("setup");
  const [promptPhase, setPromptPhase] = useState<PromptPhase>("idle");
  const [sessionItems, setSessionItems] = useState<
    ReturnType<typeof buildGamePromptSession>
  >([]);
  const [sessionIdx, setSessionIdx] = useState(0);
  const [sessionResults, setSessionResults] = useState<
    Array<{ id: string; feedback: TranscriptFeedback; score: number }>
  >([]);
  const [currentResult, setCurrentResult] = useState<{
    feedback: TranscriptFeedback;
    score: number;
    transcript: string;
  } | null>(null);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [successFlash, setSuccessFlash] = useState(false);
  const [completion, setCompletion] = useState<{
    coinsEarned: number;
    sessionScore: number;
    badgeUnlocked: boolean;
    isNewBest: boolean;
    totalCoins: number;
  } | null>(null);

  const currentItem = sessionItems[sessionIdx] ?? null;
  const isLastItem = sessionIdx >= sessionItems.length - 1;
  const progressPct =
    sessionItems.length > 0
      ? ((sessionIdx + (promptPhase === "result" ? 1 : 0)) / sessionItems.length) *
        100
      : 0;
  const wordEmoji = useMemo(
    () =>
      currentItem
        ? emojiForGameWord(gameId, currentItem.text)
        : null,
    [currentItem, gameId],
  );

  const promptPhaseRef = useRef(promptPhase);
  const currentItemRef = useRef(currentItem);
  useEffect(() => {
    promptPhaseRef.current = promptPhase;
  }, [promptPhase]);
  useEffect(() => {
    currentItemRef.current = currentItem;
  }, [currentItem]);

  useEffect(() => {
    const phase = promptPhaseRef.current;
    if (phase !== "recording" && phase !== "analyzing") return;
    if (stt.listening || stt.transcribing) return;
    if (stt.error) {
      setPromptPhase("heard");
      return;
    }
    const item = currentItemRef.current;
    const final = stt.transcript.trim();
    const r = item
      ? compareTranscript(item.text, final || "", {
          kind: item.kind,
          ageMonths,
        })
      : null;
    const feedback: TranscriptFeedback =
      final && r ? r.feedback : "try_again";
    const score = final && r ? r.score : 0;
    setCurrentResult({
      feedback,
      score,
      transcript: final,
    });
    setPromptPhase("result");
    if (feedback === "great") {
      playSpeechCue("success");
      setSuccessFlash(true);
      window.setTimeout(() => setSuccessFlash(false), 900);
      setSessionCoins(
        (n) => n + coinsForFeedback(feedback, gameMeta.rewardStars),
      );
    } else if (feedback === "close") {
      playSpeechCue("success");
      setSessionCoins(
        (n) => n + coinsForFeedback(feedback, gameMeta.rewardStars),
      );
    } else {
      playSpeechCue("retry");
      setSessionCoins(
        (n) => n + coinsForFeedback(feedback, gameMeta.rewardStars),
      );
    }
  }, [ageMonths, gameMeta.rewardStars, stt.error, stt.listening, stt.transcribing, stt.transcript]);

  const resetSession = () => {
    setSessionPhase("setup");
    setSessionItems([]);
    setSessionIdx(0);
    setSessionResults([]);
    setCurrentResult(null);
    setSessionCoins(0);
    setCompletion(null);
    stt.reset();
    voice.pause();
  };

  const startSession = () => {
    onAction();
    const history = weakSoundsToHistory(progress.data?.weakSounds ?? []);
    const items = buildGamePromptSession(
      gameId,
      ageMonths,
      Date.now(),
      history,
    );
    setSessionItems(items);
    setSessionIdx(0);
    setSessionResults([]);
    setCurrentResult(null);
    setSessionCoins(0);
    setCompletion(null);
    setPromptPhase("idle");
    setSessionPhase(items.length > 0 ? "practice" : "setup");
    stt.reset();
    voice.pause();
  };

  const finishSession = (
    results: Array<{ id: string; feedback: TranscriptFeedback; score: number }>,
  ) => {
    const reward = applyGameSessionRewards({
      childId: child.id,
      gameId,
      badgeId: gameMeta.badgeId,
      rewardStars: gameMeta.rewardStars,
      results,
    });
    setCompletion({
      coinsEarned: reward.coinsEarned,
      sessionScore: reward.sessionScore,
      badgeUnlocked: reward.badgeUnlocked,
      isNewBest: reward.isNewBest,
      totalCoins: reward.state.coins,
    });
    onRewardsChange?.();
    setSessionPhase("done");
  };

  const handleHear = () => {
    if (!currentItem) return;
    const mode =
      currentItem.kind === "phonic" || currentItem.kind === "letter"
        ? "phonics"
        : "default";
    const spoken = getPromptSpeakText(currentItem);
    voice.primeSpeakGesture(spoken, { mode: mode as "phonics" | "default" });
    void (async () => {
      const speakOpts = {
        mode: mode as "phonics" | "default",
        catalogPlayback: true as const,
        staticCatalogTexts: [spoken],
        waitUntilEnd: true,
      };
      setAudioTraceModule("Speech Coach");
      traceBrokenModulePreflight("Speech Coach", {
        audioIdentity: undefined,
        resolvedText: spoken,
        staticCatalogTexts: speakOpts.staticCatalogTexts,
        catalogPlayback: speakOpts.catalogPlayback,
      });
      await voice.speak(spoken, speakOpts);
      setAudioTraceModule(null);
      if (promptPhase === "idle") setPromptPhase("heard");
    })();
  };

  const handleRecord = async () => {
    if (!currentItem) return;
    (document.activeElement as HTMLElement | null)?.blur?.();
    voice.pause();
    stt.reset();
    setCurrentResult(null);
    setPromptPhase("recording");
    const ok = await stt.start();
    if (!ok) setPromptPhase("heard");
  };

  const handleStop = () => {
    stt.stop();
    setPromptPhase("analyzing");
  };

  const handleNext = () => {
    if (!currentItem || !currentResult) return;
    log.mutate(
      {
        data: {
          childId: child.id,
          promptId: currentItem.id,
          clarityScore: clampClarityScore(currentResult.score),
        },
      },
      { onError: (err) => handleSubscriptionMutationGateError(err, "speech_coach_game_log") },
    );
    const updated = [
      ...sessionResults,
      {
        id: currentItem.id,
        feedback: currentResult.feedback,
        score: currentResult.score,
      },
    ];
    setSessionResults(updated);
    if (isLastItem) {
      finishSession(updated);
    } else {
      setSessionIdx((i) => i + 1);
      setPromptPhase("idle");
      setCurrentResult(null);
      stt.reset();
      voice.pause();
    }
  };

  const articulationCue = currentItem
    ? getArticulationCue(currentItem.text, currentItem.kind)
    : null;

  if (completion && sessionPhase === "done") {
    return (
      <GameCompletion
        gameId={gameId}
        gameTitle={gameTitle}
        coinsEarned={completion.coinsEarned}
        sessionScore={completion.sessionScore}
        badgeUnlocked={completion.badgeUnlocked}
        isNewBest={completion.isNewBest}
        totalCoins={completion.totalCoins}
        onPlayAgain={startSession}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className={`relative rounded-2xl border p-3 space-y-3 ${theme.cardClass}`}
      data-testid={`speech-game-flow-${gameId}`}
    >
      <StarsBurst show={successFlash} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{theme.emoji}</span>
          <p className="font-bold text-sm text-foreground truncate">
            {t("screens.speech_coach.games.session_title", { game: gameTitle })}
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          {t("screens.speech_coach.games.exit")}
        </Button>
      </div>

      {sessionPhase !== "setup" ? (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span>
                {t("screens.speech_coach.games.round_progress", {
                  current: Math.min(sessionIdx + 1, sessionItems.length),
                  total: sessionItems.length,
                })}
              </span>
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Coins className="h-3.5 w-3.5" />
                {sessionCoins}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${theme.accentClass} transition-all duration-500`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {gameId === "breathing" && sessionPhase === "practice" ? (
            <BreathingBubble active={promptPhase === "recording"} />
          ) : null}

          {currentItem && wordEmoji ? (
            <div className="flex items-center justify-center gap-3 rounded-xl bg-white/50 px-3 py-2 dark:bg-black/20">
              <span className="text-4xl" aria-hidden>
                {wordEmoji}
              </span>
              <span className="font-bold text-xl text-foreground capitalize">
                {currentItem.text}
              </span>
            </div>
          ) : null}
        </>
      ) : null}

      {sessionPhase === "setup" ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t(gameMeta.i18nKeyDescription)}
          </p>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            {Array.from({ length: gameMeta.rewardStars }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
            <span className="text-[11px] text-muted-foreground">
              {t("screens.speech_coach.games.earn_up_to", {
                count: 10 * gameMeta.rewardStars,
              })}
            </span>
          </div>
          <Button
            type="button"
            className={`w-full rounded-full bg-gradient-to-r ${theme.accentClass} text-white border-0`}
            onClick={startSession}
            data-testid="speech-game-play-now"
          >
            {t("screens.speech_coach.games.play_now")}
          </Button>
        </div>
      ) : (
        <PronunciationCompanion
          kind={currentItem?.kind ?? "word"}
          difficulty={currentItem?.difficulty ?? "easy"}
          sessionPhase={sessionPhase}
          promptPhase={promptPhase}
          currentItem={currentItem}
          currentResult={currentResult}
          sessionIdx={sessionIdx}
          sessionItems={sessionItems}
          sessionResults={sessionResults}
          sessionSize={sessionItems.length}
          stt={stt}
          voice={voice}
          onKindChange={() => undefined}
          onDifficultyChange={() => undefined}
          onStartSession={startSession}
          onHear={handleHear}
          onRecord={handleRecord}
          onStop={handleStop}
          onNext={handleNext}
          onTryAgain={() => {
            setCurrentResult(null);
            setPromptPhase("idle");
            stt.reset();
          }}
          onNewSession={resetSession}
          onAction={onAction}
          viewMode={viewMode}
          compactMode
          articulationCue={articulationCue}
        />
      )}
    </div>
  );
}

export function SpeechGameRewardsBar({ childId }: { childId: number }) {
  const { t } = useTranslation();
  const [rewards, setRewards] = useState(() => loadSpeechGameRewards(childId));

  useEffect(() => {
    setRewards(loadSpeechGameRewards(childId));
  }, [childId]);

  if (rewards.coins === 0 && rewards.badges.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/40 bg-amber-50/80 px-3 py-2 dark:bg-amber-950/30"
      data-testid="speech-game-rewards-bar"
    >
      <Badge className="gap-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200">
        <Coins className="h-3.5 w-3.5" />
        {t("screens.speech_coach.games.total_coins", { count: rewards.coins })}
      </Badge>
      {rewards.badges.length > 0 ? (
        <Badge variant="secondary" className="rounded-full">
          {t("screens.speech_coach.games.badges_count", {
            count: rewards.badges.length,
          })}
        </Badge>
      ) : null}
    </div>
  );
}
