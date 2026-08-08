import { useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { configureHealthLabSync, hydrateHealthLabProfile } from "../health-lab-sync";
import { ArrowLeft } from "lucide-react";
import { trackSessionStart, trackSessionAbandon } from "../health-lab-analytics";
import { useHealthLabState } from "../hooks/use-health-lab-state";
import { useHealthLabAudio } from "../hooks/use-health-lab-audio";
import { isMotionGame, pickNextPlayableGame } from "../play-path";
import { getWorldIdentity } from "../world-identity";
import { useReducedMotion } from "@/lib/reduced-motion";
import type { HealthGameId, SessionCompleteOptions } from "../types";
import { HealthLabShell } from "./health-lab-shell";
import { HealthLabHome } from "./health-lab-home";
import { HealthLabProgress } from "./health-lab-progress";
import { HealthLabDashboard } from "./health-lab-dashboard";
import { HealthLabShop } from "./health-lab-shop";
import { HealthLabSessionRewards } from "./health-lab-session-rewards";
import { HealthLabCelebration } from "./health-lab-celebration";
import { HealthLabImmersiveHost } from "./health-lab-immersive-host";
import { HealthLabMotionPrep } from "./health-lab-motion-prep";
import { BreathControlGame } from "./games/breath-control-game";
import { FlamingoBalanceGame } from "./games/flamingo-balance-game";
import { ReactionTimeGame } from "./games/reaction-time-game";
import { FreezeStatueGame } from "./games/freeze-statue-game";
import { FingerStabilityGame } from "./games/finger-stability-game";
import { CalmnessMeterGame } from "./games/calmness-meter-game";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAppNavigate } from "@/components/app-link";
import { isHealthLabLivingV1Enabled } from "@/lib/health-lab/living-room";
import { cn } from "@/lib/utils";
import { GAMES_HEADER_SHELL, GAMES_ICON_BUTTON } from "@/lib/game-theme";

interface Props {
  childId: number;
  childName: string;
  /** Playwright / embedded hosts without HubModulePageShell. */
  standalone?: boolean;
}

export function HealthLabZone({ childId, childName, standalone = false }: Props) {
  const { back } = useAppNavigate();
  const {
    state,
    view,
    setView,
    todayScore,
    recordSession,
    pendingCelebrations,
    dismissCelebration,
    buyShopItem,
    equipShopItem,
    claimDailySurprise,
    openTreasureChest,
    reload,
    amyMessage,
  } = useHealthLabState(childId);

  const authFetch = useAuthFetch();
  const { t } = useHealthLabI18n();
  const reduced = useReducedMotion();
  const living = isHealthLabLivingV1Enabled();
  const [motionPrepGameId, setMotionPrepGameId] = useState<HealthGameId | null>(null);
  const [arrivalFlash, setArrivalFlash] = useState<{ gameId: HealthGameId; key: number } | null>(
    null,
  );

  useEffect(() => {
    configureHealthLabSync(authFetch);
    void hydrateHealthLabProfile(childId, authFetch).then(() => reload());
  }, [childId, authFetch, reload]);

  const audio = useHealthLabAudio();

  useEffect(() => {
    const c = pendingCelebrations[0];
    if (!c) return;
    /** Living Care practice — quiet completion; no XP/quest celebration theatre. */
    if (living) return;
    if (c.type === "level-up") audio.playLevelUp();
    else if (c.type === "badge") audio.playAchievement();
    else if (c.type === "streak") audio.playCelebration();
    else if (c.type === "quest") audio.playQuestComplete();
    else if (c.type === "treasure" || c.type === "surprise") audio.playCelebration();
  }, [pendingCelebrations, audio, living]);

  useEffect(() => {
    if (typeof view !== "object" || view.kind !== "session-rewards") return;
    if (living) return;
    const { celebrations } = view;
    if (celebrations.some((c) => c.type === "level-up")) audio.playLevelUp();
    else if (celebrations.some((c) => c.type === "badge")) audio.playAchievement();
    else if (celebrations.some((c) => c.type === "streak")) audio.playCelebration();
    else if (celebrations.some((c) => c.type === "quest")) audio.playQuestComplete();
    else audio.playCelebration();
  }, [view, audio, living]);

  const enterGame = (gameId: HealthGameId) => {
    audio.playTap();
    if (!living) audio.playMilestone();
    /** Living Care room — soft settle, no galaxy portal flash. */
    if (!reduced && !living) {
      setArrivalFlash({ gameId, key: Date.now() });
      window.setTimeout(() => setArrivalFlash(null), 420);
    }
    setView({ kind: "game", gameId });
  };

  const launchGame = (gameId: HealthGameId) => {
    if (isMotionGame(gameId)) {
      audio.playTap();
      setMotionPrepGameId(gameId);
      return;
    }
    setMotionPrepGameId(null);
    enterGame(gameId);
  };

  usePageBackHandler(() => {
    if (motionPrepGameId) {
      setMotionPrepGameId(null);
      return true;
    }
    if (pendingCelebrations.length > 0) {
      dismissCelebration();
      return true;
    }
    if (typeof view === "object") {
      if (view.kind === "session-rewards") {
        setView("home");
        return true;
      }
      if (view.kind === "game") {
        trackSessionAbandon(childId, view.gameId);
        setView("home");
        return true;
      }
    }
    if (view === "progress" || view === "dashboard" || view === "shop") {
      setView("home");
      return true;
    }
    if (view === "home") {
      back("health-lab-exit");
      return true;
    }
    return false;
  }, [view, pendingCelebrations, dismissCelebration, setView, back, motionPrepGameId]);

  const handleComplete =
    (gameId: HealthGameId) =>
    (score: number, durationMs: number, options?: SessionCompleteOptions) => {
      const result = recordSession(gameId, score, durationMs, options);
      if (result.personalBest) audio.playNewRecord();
    };

  const renderGame = (gameId: HealthGameId) => {
    trackSessionStart(childId, gameId);
    const common = {
      onExit: () => setView("home"),
      onComplete: handleComplete(gameId),
    };
    switch (gameId) {
      case "breath-control":
        return (
          <BreathControlGame
            {...common}
            previousBestScore={state.personalBests["breath-control"]}
          />
        );
      case "flamingo-balance":
        return <FlamingoBalanceGame {...common} childId={childId} />;
      case "reaction-time":
        return (
          <ReactionTimeGame
            {...common}
            ghostBestMs={state.personalBests["reaction-time"] ? undefined : undefined}
          />
        );
      case "freeze-statue":
        return <FreezeStatueGame {...common} childId={childId} />;
      case "finger-stability":
        return <FingerStabilityGame {...common} />;
      case "calmness-meter":
        return (
          <CalmnessMeterGame
            state={state}
            onExit={() => setView("home")}
            onComplete={handleComplete("calmness-meter")}
          />
        );
      default:
        return null;
    }
  };

  /** Home chrome comes from HubModulePageShell in-app; standalone hosts need a local bar.
   * Games use their own top bar inside a fixed viewport — never stack a second header. */
  const showHeader =
    (view === "home" && standalone) ||
    view === "progress" ||
    view === "dashboard" ||
    view === "shop";

  const inGame = typeof view === "object" && view.kind === "game";
  const inSessionRewards = typeof view === "object" && view.kind === "session-rewards";
  const immersiveActive =
    inGame || inSessionRewards || motionPrepGameId != null || pendingCelebrations.length > 0;

  return (
    <HealthLabShell showParticles={!inGame && !motionPrepGameId}>
      {showHeader && (
        <header
          className={cn(
            GAMES_HEADER_SHELL,
            living ? "border-[rgba(232,212,184,0.2)] bg-[rgba(8,6,12,0.72)]" : "border-violet-500/20",
          )}
        >
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <button
              type="button"
              className={GAMES_ICON_BUTTON}
              onClick={() => {
                if (view === "home") back("health-lab-exit");
                else setView("home");
              }}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {living ? "Care" : t("title")}
              </p>
              <p
                className={cn(
                  "truncate text-xs",
                  living ? "text-[rgba(232,212,184,0.72)]" : "text-violet-200/70",
                )}
              >
                {childName}
              </p>
            </div>
          </div>
        </header>
      )}

      {view === "home" && (
        <HealthLabHome
          state={state}
          todayScore={todayScore}
          childName={childName}
          amyMessage={amyMessage}
          onStartQuest={() => {
            const next = pickNextPlayableGame(state);
            launchGame(next);
          }}
          onViewProgress={() => setView("progress")}
          onOpenDashboard={() => setView("dashboard")}
          onOpenShop={() => setView("shop")}
          onClaimSurprise={() => claimDailySurprise()}
          onOpenTreasure={() => openTreasureChest()}
          onSelectGame={(gameId) => launchGame(gameId)}
        />
      )}

      {view === "progress" && (
        <HealthLabProgress state={state} onBack={() => setView("home")} />
      )}

      {view === "dashboard" && (
        <HealthLabDashboard
          state={state}
          childName={childName}
          childId={childId}
          onBack={() => setView("home")}
        />
      )}

      {view === "shop" && (
        <HealthLabShop
          state={state}
          onBack={() => setView("home")}
          onPurchase={(id) => buyShopItem(id)}
          onEquip={(id) => equipShopItem(id)}
        />
      )}


      <HealthLabImmersiveHost
        active={immersiveActive}
        className={!reduced && inGame ? "health-lab-world-arrive" : undefined}
      >
        {inGame && (
          <div className="health-lab-immersive-layer" key={view.gameId}>
            {renderGame(view.gameId)}
          </div>
        )}

        {inSessionRewards && (
          <div className="health-lab-immersive-layer" key="session-rewards">
            <HealthLabSessionRewards
              result={view.result}
              celebrations={view.celebrations}
              state={state}
              onContinue={() => setView("home")}
            />
          </div>
        )}

        {motionPrepGameId && (
          <HealthLabMotionPrep
            gameId={motionPrepGameId}
            onCancel={() => setMotionPrepGameId(null)}
            onReady={() => {
              const id = motionPrepGameId;
              setMotionPrepGameId(null);
              enterGame(id);
            }}
          />
        )}

        {pendingCelebrations[0] && (
          <HealthLabCelebration
            type={pendingCelebrations[0].type}
            payload={pendingCelebrations[0].payload}
            onDismiss={dismissCelebration}
            avatarId={state.avatarId}
            level={state.level}
            equippedItems={state.equippedItems}
          />
        )}

        {arrivalFlash && !reduced && (
          <div
            key={arrivalFlash.key}
            className="health-lab-immersive-flash health-lab-portal-flash"
            style={{
              background: `radial-gradient(circle at 50% 45%, ${getWorldIdentity(arrivalFlash.gameId).glow}, transparent 55%)`,
            }}
            aria-hidden
          />
        )}
      </HealthLabImmersiveHost>
    </HealthLabShell>
  );
}
