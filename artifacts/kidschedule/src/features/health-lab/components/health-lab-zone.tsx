import { useEffect } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { configureHealthLabSync, hydrateHealthLabProfile } from "../health-lab-sync";
import { ArrowLeft } from "lucide-react";
import { GAMES } from "../constants";
import { trackSessionStart, trackSessionAbandon } from "../health-lab-analytics";
import { useHealthLabState } from "../hooks/use-health-lab-state";
import { useHealthLabAudio } from "../hooks/use-health-lab-audio";
import type { HealthGameId, SessionCompleteOptions } from "../types";
import { HealthLabShell } from "./health-lab-shell";
import { HealthLabHome } from "./health-lab-home";
import { HealthLabProgress } from "./health-lab-progress";
import { HealthLabDashboard } from "./health-lab-dashboard";
import { HealthLabShop } from "./health-lab-shop";
import { HealthLabSessionRewards } from "./health-lab-session-rewards";
import { HealthLabCelebration } from "./health-lab-celebration";
import { BreathControlGame } from "./games/breath-control-game";
import { FlamingoBalanceGame } from "./games/flamingo-balance-game";
import { ReactionTimeGame } from "./games/reaction-time-game";
import { FreezeStatueGame } from "./games/freeze-statue-game";
import { FingerStabilityGame } from "./games/finger-stability-game";
import { CalmnessMeterGame } from "./games/calmness-meter-game";
import { useHealthLabI18n } from "../hooks/use-health-lab-i18n";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import { useAppNavigate } from "@/components/app-link";
import { cn } from "@/lib/utils";
import { GAMES_HEADER_SHELL, GAMES_ICON_BUTTON } from "@/lib/game-theme";

interface Props {
  childId: number;
  childName: string;
}

function pickNextUnplayed(state: ReturnType<typeof useHealthLabState>["state"]): HealthGameId | null {
  const unplayed = GAMES.find((g) => g.id !== "calmness-meter" && !state.gamesCompletedToday.includes(g.id));
  return unplayed?.id ?? GAMES[0].id;
}

export function HealthLabZone({ childId, childName }: Props) {
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

  useEffect(() => {
    configureHealthLabSync(authFetch);
    void hydrateHealthLabProfile(childId, authFetch).then(() => reload());
  }, [childId, authFetch, reload]);

  const audio = useHealthLabAudio();

  useEffect(() => {
    const c = pendingCelebrations[0];
    if (!c) return;
    if (c.type === "level-up") audio.playLevelUp();
    else if (c.type === "badge") audio.playAchievement();
    else if (c.type === "streak") audio.playCelebration();
    else if (c.type === "quest") audio.playQuestComplete();
    else if (c.type === "treasure" || c.type === "surprise") audio.playCelebration();
  }, [pendingCelebrations, audio]);

  useEffect(() => {
    if (typeof view !== "object" || view.kind !== "session-rewards") return;
    const { celebrations } = view;
    if (celebrations.some((c) => c.type === "level-up")) audio.playLevelUp();
    else if (celebrations.some((c) => c.type === "badge")) audio.playAchievement();
    else if (celebrations.some((c) => c.type === "streak")) audio.playCelebration();
    else if (celebrations.some((c) => c.type === "quest")) audio.playQuestComplete();
    else audio.playCelebration();
  }, [view, audio]);

  usePageBackHandler(() => {
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
  }, [view, pendingCelebrations, dismissCelebration, setView, back]);

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

  const showHeader =
    view === "home" ||
    view === "progress" ||
    view === "dashboard" ||
    view === "shop" ||
    (typeof view === "object" && view.kind === "game");

  const inGame = typeof view === "object" && view.kind === "game";

  return (
    <HealthLabShell showParticles={!inGame}>
      {showHeader && (
        <header className={cn(GAMES_HEADER_SHELL, "border-violet-500/20")}>
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
              <p className="truncate text-sm font-semibold text-white">{t("title")}</p>
              <p className="truncate text-xs text-violet-200/70">{childName}</p>
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
            const next = pickNextUnplayed(state);
            if (next) setView({ kind: "game", gameId: next });
          }}
          onViewProgress={() => setView("progress")}
          onOpenDashboard={() => setView("dashboard")}
          onOpenShop={() => setView("shop")}
          onClaimSurprise={() => claimDailySurprise()}
          onOpenTreasure={() => openTreasureChest()}
          onSelectGame={(gameId) => setView({ kind: "game", gameId })}
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

      {typeof view === "object" && view.kind === "game" && renderGame(view.gameId)}

      {typeof view === "object" && view.kind === "session-rewards" && (
        <HealthLabSessionRewards
          result={view.result}
          celebrations={view.celebrations}
          state={state}
          onContinue={() => setView("home")}
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
    </HealthLabShell>
  );
}
