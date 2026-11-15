import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import {
  noteGameCompleted,
  noteGameStarted,
  scheduleGameAbandonment,
} from "@/lib/game-abandonment";
import type { PuzzlePayload } from "@workspace/math-playground";
import { isMiniGameTemplate } from "@workspace/math-playground";
import { trackPlaygroundEvent } from "../lib/playground-analytics";
import type { MiniGameProps } from "./mini-game-shared";
import { PopCorrectAnswer } from "./PopCorrectAnswer";
import { RocketCounting } from "./RocketCounting";
import { BalloonBurst } from "./BalloonBurst";
import { FeedTheMonkey } from "./FeedTheMonkey";
import { NumberTrain } from "./NumberTrain";
import { CastleBuilder } from "./CastleBuilder";

export function MiniGameRouter(props: MiniGameProps) {
  const { payload, childId = 0 } = props;
  const completedRef = useRef(false);
  const sessionKey = `mini:${payload.template}:${childId}:${payload.correctAnswer ?? payload.fuelTarget ?? payload.targetQuantity ?? "play"}`;

  useEffect(() => {
    completedRef.current = false;
  }, [payload.template, payload.correctAnswer, payload.fuelTarget, payload.targetQuantity]);

  useEffect(() => {
    if (!isMiniGameTemplate(payload.template)) return;
    noteGameStarted({
      sessionKey,
      gameId: payload.template,
      surface: "mini_game",
      authState: childId > 0 ? "authenticated" : "guest",
      childId: childId > 0 ? childId : null,
    });
    if (childId > 0) {
      trackPlaygroundEvent("mini_game_start", childId, { template: payload.template });
    }
    return () => {
      scheduleGameAbandonment(sessionKey, (event) => {
        track("game_abandoned", event);
      });
    };
  }, [childId, payload.template, sessionKey]);

  const wrapCorrect = () => {
    if (completedRef.current || props.locked) return;
    completedRef.current = true;
    noteGameCompleted(sessionKey);
    if (childId > 0 && isMiniGameTemplate(payload.template)) {
      trackPlaygroundEvent("mini_game_complete", childId, { template: payload.template });
    }
    props.onCorrect();
  };

  const wrapWrong = () => {
    if (completedRef.current || props.locked) return;
    props.onWrong();
  };

  const gameProps: MiniGameProps = {
    ...props,
    onCorrect: wrapCorrect,
    onWrong: wrapWrong,
  };

  const game = (() => {
  switch (payload.template) {
    case "pop_correct_answer":
      return <PopCorrectAnswer {...gameProps} />;
    case "rocket_counting":
      return <RocketCounting {...gameProps} />;
    case "balloon_burst":
      return <BalloonBurst {...gameProps} />;
    case "feed_the_monkey":
      return <FeedTheMonkey {...gameProps} />;
    case "number_train":
      return <NumberTrain {...gameProps} />;
    case "castle_builder":
      return <CastleBuilder {...gameProps} />;
    default:
      return null;
  }
  })();

  return <div data-testid="mp-mini-game">{game}</div>;
}
