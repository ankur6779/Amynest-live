import { useEffect } from "react";
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

  useEffect(() => {
    if (childId > 0 && isMiniGameTemplate(payload.template)) {
      trackPlaygroundEvent("mini_game_start", childId, { template: payload.template });
    }
  }, [childId, payload.template]);

  const wrapCorrect = () => {
    if (childId > 0 && isMiniGameTemplate(payload.template)) {
      trackPlaygroundEvent("mini_game_complete", childId, { template: payload.template });
    }
    props.onCorrect();
  };

  const gameProps: MiniGameProps = { ...props, onCorrect: wrapCorrect };

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
}
