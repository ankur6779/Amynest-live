import wakeUpPositive from "@/assets/activity-images/wake_up_positive.webp";
import brushingPositive from "@/assets/activity-images/brushing_positive.webp";
import brushingNegative from "@/assets/activity-images/brushing_negative.webp";
import breakfastPositive from "@/assets/activity-images/breakfast_positive.webp";
import schoolPositive from "@/assets/activity-images/school_positive.webp";
import studyPositive from "@/assets/activity-images/study_positive.webp";
import studyNegative from "@/assets/activity-images/study_negative.webp";
import playingPositive from "@/assets/activity-images/playing_positive.webp";
import sleepingPositive from "@/assets/activity-images/sleeping_positive.webp";
import sleepingNegative from "@/assets/activity-images/sleeping_negative.webp";
import exercisePositive from "@/assets/activity-images/exercise_positive.webp";
import exerciseNegative from "@/assets/activity-images/exercise_negative.webp";
import bathPositive from "@/assets/activity-images/bath_positive.webp";
import tiffinPositive from "@/assets/activity-images/tiffin_positive.webp";
import bondingPositive from "@/assets/activity-images/bonding_positive.webp";
import readingPositive from "@/assets/activity-images/reading_positive.webp";
import snackPositive from "@/assets/activity-images/snack_positive.webp";
import travelPositive from "@/assets/activity-images/travel_positive.webp";
import homeworkPositive from "@/assets/activity-images/homework_positive.webp";
import dinnerPositive from "@/assets/activity-images/dinner_positive.webp";

export type ActivityImageVariant = "positive" | "negative";

type ActivityImagePair = {
  positive: string;
  negative?: string;
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
  { keywords: ["brush", "teeth", "toothbrush", "dental"],  images: { positive: brushingPositive, negative: brushingNegative } },
  { keywords: ["bath", "shower"],                           images: { positive: bathPositive } },
  { keywords: ["breakfast", "morning meal"],                images: { positive: breakfastPositive } },
  { keywords: ["dinner", "supper", "evening meal"],         images: { positive: dinnerPositive } },
  { keywords: ["lunch", "meal"],                            images: { positive: breakfastPositive } },
  { keywords: ["snack", "fruits", "fruit"],                 images: { positive: snackPositive } },
  { keywords: ["tiffin", "lunchbox"],                       images: { positive: tiffinPositive } },
  { keywords: ["homework", "worksheet"],                    images: { positive: homeworkPositive, negative: studyNegative } },
  { keywords: ["study", "reading", "learn"],                images: { positive: studyPositive, negative: studyNegative } },
  { keywords: ["book", "story", "read"],                    images: { positive: readingPositive } },
  { keywords: ["sleep", "nap", "bedtime", "rest"],          images: { positive: sleepingPositive, negative: sleepingNegative } },
  { keywords: ["exercise", "yoga", "stretch", "jog", "run"], images: { positive: exercisePositive, negative: exerciseNegative } },
  { keywords: ["play", "game", "outdoor", "park"],           images: { positive: playingPositive } },
  { keywords: ["school", "class", "teacher"],               images: { positive: schoolPositive } },
  { keywords: ["travel", "bus", "van", "car", "transport", "commute"], images: { positive: travelPositive } },
  { keywords: ["family", "bonding", "together", "parent"],  images: { positive: bondingPositive } },
  { keywords: ["wake", "morning", "get up"],                images: { positive: wakeUpPositive } },
];

/**
 * Returns a stable positive/negative decision based on a seed.
 * 30% chance of negative for categories that have a negative variant.
 */
function isNegativeVariant(seed: number, hasNegative: boolean): boolean {
  if (!hasNegative) return false;
  return (seed % 10) < 3; // 30% chance
}

/**
 * Get the activity image for a routine item.
 * @param category The item category
 * @param activityName The activity name (for keyword matching)
 * @param seed A number for deterministic positive/negative selection (e.g., index + childId)
 */
export function getActivityImage(
  category: string,
  activityName: string,
  seed: number
): { src: string; variant: ActivityImageVariant } {
  const nameLower = activityName.toLowerCase();

  // Check keyword overrides first (more specific)
  for (const override of KEYWORD_OVERRIDES) {
    if (override.keywords.some((kw) => nameLower.includes(kw))) {
      const useNegative = isNegativeVariant(seed, !!override.images.negative);
      return {
        src: (useNegative && override.images.negative) ? override.images.negative : override.images.positive,
        variant: useNegative ? "negative" : "positive",
      };
    }
  }

  // Fall back to category
  const catKey = category?.toLowerCase();
  const catImages = CATEGORY_IMAGES[catKey];
  if (catImages) {
    const useNegative = isNegativeVariant(seed, !!catImages.negative);
    return {
      src: (useNegative && catImages.negative) ? catImages.negative : catImages.positive,
      variant: useNegative ? "negative" : "positive",
    };
  }

  // Ultimate fallback
  return { src: wakeUpPositive, variant: "positive" };
}

export { bondingPositive as defaultActivityImage };
