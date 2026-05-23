import type { ImageSourcePropType } from "react-native";

const wakeUpPositive = require("@/assets/images/activity-images/wake_up_positive.png");
const brushingPositive = require("@/assets/images/activity-images/brushing_positive.png");
const brushingNegative = require("@/assets/images/activity-images/brushing_negative.png");
const breakfastPositive = require("@/assets/images/activity-images/breakfast_positive.png");
const schoolPositive = require("@/assets/images/activity-images/school_positive.png");
const studyPositive = require("@/assets/images/activity-images/study_positive.png");
const studyNegative = require("@/assets/images/activity-images/study_negative.png");
const playingPositive = require("@/assets/images/activity-images/playing_positive.png");
const sleepingPositive = require("@/assets/images/activity-images/sleeping_positive.png");
const sleepingNegative = require("@/assets/images/activity-images/sleeping_negative.png");
const exercisePositive = require("@/assets/images/activity-images/exercise_positive.png");
const exerciseNegative = require("@/assets/images/activity-images/exercise_negative.png");
const bathPositive = require("@/assets/images/activity-images/bath_positive.png");
const tiffinPositive = require("@/assets/images/activity-images/tiffin_positive.png");
const bondingPositive = require("@/assets/images/activity-images/bonding_positive.png");
const readingPositive = require("@/assets/images/activity-images/reading_positive.png");
const snackPositive = require("@/assets/images/activity-images/snack_positive.png");
const travelPositive = require("@/assets/images/activity-images/travel_positive.png");
const homeworkPositive = require("@/assets/images/activity-images/homework_positive.png");
const dinnerPositive = require("@/assets/images/activity-images/dinner_positive.png");

export type ActivityImageVariant = "positive" | "negative";

type ActivityImagePair = {
  positive: ImageSourcePropType;
  negative?: ImageSourcePropType;
};

const CATEGORY_IMAGES: Record<string, ActivityImagePair> = {
  morning:    { positive: wakeUpPositive },
  hygiene:    { positive: brushingPositive, negative: brushingNegative },
  meal:       { positive: breakfastPositive },
  school:     { positive: schoolPositive },
  homework:   { positive: homeworkPositive, negative: studyNegative },
  study:      { positive: studyPositive,    negative: studyNegative },
  play:       { positive: playingPositive },
  exercise:   { positive: exercisePositive, negative: exerciseNegative },
  sleep:      { positive: sleepingPositive, negative: sleepingNegative },
  "wind-down":{ positive: sleepingPositive, negative: sleepingNegative },
  tiffin:     { positive: tiffinPositive },
  bonding:    { positive: bondingPositive },
  travel:     { positive: travelPositive },
  screen:     { positive: readingPositive },
  snack:      { positive: snackPositive },
  bath:       { positive: bathPositive },
  reading:    { positive: readingPositive },
  dinner:     { positive: dinnerPositive },
};

const KEYWORD_OVERRIDES: { keywords: string[]; images: ActivityImagePair }[] = [
  { keywords: ["brush", "teeth", "toothbrush", "dental"],   images: { positive: brushingPositive, negative: brushingNegative } },
  { keywords: ["bath", "shower"],                            images: { positive: bathPositive } },
  { keywords: ["breakfast", "morning meal"],                 images: { positive: breakfastPositive } },
  { keywords: ["dinner", "supper", "evening meal"],          images: { positive: dinnerPositive } },
  { keywords: ["lunch", "meal"],                             images: { positive: breakfastPositive } },
  { keywords: ["snack", "fruits", "fruit"],                  images: { positive: snackPositive } },
  { keywords: ["tiffin", "lunchbox"],                        images: { positive: tiffinPositive } },
  { keywords: ["homework", "worksheet"],                     images: { positive: homeworkPositive, negative: studyNegative } },
  { keywords: ["study", "reading", "learn"],                 images: { positive: studyPositive, negative: studyNegative } },
  { keywords: ["book", "story", "read"],                     images: { positive: readingPositive } },
  { keywords: ["sleep", "nap", "bedtime", "rest"],           images: { positive: sleepingPositive, negative: sleepingNegative } },
  { keywords: ["exercise", "yoga", "stretch", "jog", "run"], images: { positive: exercisePositive, negative: exerciseNegative } },
  { keywords: ["play", "game", "outdoor", "park"],           images: { positive: playingPositive } },
  { keywords: ["school", "class", "teacher"],                images: { positive: schoolPositive } },
  { keywords: ["travel", "bus", "van", "car", "transport", "commute"], images: { positive: travelPositive } },
  { keywords: ["family", "bonding", "together", "parent"],   images: { positive: bondingPositive } },
  { keywords: ["wake", "morning", "get up"],                 images: { positive: wakeUpPositive } },
];

function isNegativeVariant(seed: number, hasNegative: boolean): boolean {
  if (!hasNegative) return false;
  return (Math.abs(seed) % 10) < 3;
}

export function getActivityImage(
  category: string,
  activityName: string,
  seed: number,
): { src: ImageSourcePropType; variant: ActivityImageVariant } {
  const nameLower = (activityName ?? "").toLowerCase();

  for (const override of KEYWORD_OVERRIDES) {
    if (override.keywords.some((kw) => nameLower.includes(kw))) {
      const useNegative = isNegativeVariant(seed, !!override.images.negative);
      return {
        src: (useNegative && override.images.negative) ? override.images.negative : override.images.positive,
        variant: useNegative ? "negative" : "positive",
      };
    }
  }

  const catKey = (category ?? "").toLowerCase();
  const catImages = CATEGORY_IMAGES[catKey];
  if (catImages) {
    const useNegative = isNegativeVariant(seed, !!catImages.negative);
    return {
      src: (useNegative && catImages.negative) ? catImages.negative : catImages.positive,
      variant: useNegative ? "negative" : "positive",
    };
  }

  return { src: wakeUpPositive, variant: "positive" };
}

export const defaultActivityImage = bondingPositive;
