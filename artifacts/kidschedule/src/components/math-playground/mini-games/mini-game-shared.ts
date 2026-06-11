import type { PuzzlePayload } from "@workspace/math-playground";
import type { PlaygroundEngagementApi } from "../hooks/usePlaygroundEngagement";

export interface MiniGameProps {
  payload: PuzzlePayload;
  accentColor: string;
  onCorrect: () => void;
  onWrong: () => void;
  engagement?: PlaygroundEngagementApi;
  childId?: number;
  locked?: boolean;
}

export const MINI_GAME_AMY_KEYS: Record<string, string> = {
  pop_correct_answer: "amy_mini_pop",
  rocket_counting: "amy_mini_rocket",
  balloon_burst: "amy_mini_balloon",
  feed_the_monkey: "amy_mini_monkey",
  number_train: "amy_mini_train",
  castle_builder: "amy_mini_castle",
};
