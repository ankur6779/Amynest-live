import type { NotificationCategory } from "@workspace/db";
import type { AgeGroup, ContentContext, PoolContentItem, Season, TimeOfDay } from "../types.js";
import { interpolate, slugify } from "../personalization/context.js";
import {
  FOOD_ITEMS,
  NUTRITION_BODY_TEMPLATES,
  NUTRITION_INSIGHT_BODIES,
  NUTRITION_TITLE_TEMPLATES,
} from "./lexicons/nutrition.js";
import { expandParentingTips } from "./lexicons/parenting.js";
import {
  ACTIVITY_MODIFIER_PREFIXES,
  ACTIVITY_SEEDS,
  EXTRA_ACTIVITY_VERBS,
  MOTIVATION_OPENERS,
  MOTIVATION_SEEDS,
  STORY_PROMPTS,
  STORY_THEME_TEMPLATES,
  STORY_THEMES,
} from "./lexicons/activities.js";
import { REGIONAL_FOOD_ITEMS } from "../global/nutrition-regional.js";
import type { CulturalRegion } from "../global/locales.js";

function matchesDiet(foodDiet: "veg" | "egg" | "any", childFoodType: string): boolean {
  if (foodDiet === "any") return true;
  if (childFoodType === "veg") return foodDiet === "veg";
  if (childFoodType === "egg") return foodDiet === "veg" || foodDiet === "egg";
  return true;
}

function buildNutritionPool(): PoolContentItem[] {
  const items: PoolContentItem[] = [];
  for (const food of FOOD_ITEMS) {
    for (const bodyTpl of NUTRITION_BODY_TEMPLATES) {
      for (const titleTpl of NUTRITION_TITLE_TEMPLATES) {
        items.push({
          recommendationKey: `food_${food.slug}_${slugify(bodyTpl).slice(0, 12)}`,
          topicKey: food.topic,
          theme: `food_${food.slug}`,
          contentType: "action_challenge",
          title: titleTpl,
          body: bodyTpl.replace("{item}", food.label),
          deepLink: "/meals",
          ageGroups: ["toddler", "preschool", "child", "tween"],
          highValue: false,
          diet: food.diet,
          regions: ["south_asia"],
        });
      }
    }
  }
  for (const food of REGIONAL_FOOD_ITEMS) {
    for (const bodyTpl of NUTRITION_BODY_TEMPLATES) {
      for (const titleTpl of NUTRITION_TITLE_TEMPLATES) {
        items.push({
          recommendationKey: `food_${food.slug}_${slugify(bodyTpl).slice(0, 12)}`,
          topicKey: food.topic,
          theme: `food_${food.slug}`,
          contentType: "action_challenge",
          title: titleTpl,
          body: bodyTpl.replace("{item}", food.label),
          deepLink: "/meals",
          ageGroups: ["toddler", "preschool", "child", "tween"],
          highValue: false,
          diet: food.diet,
          regions: food.regions,
        });
      }
    }
  }
  for (const insight of NUTRITION_INSIGHT_BODIES) {
    items.push({
      recommendationKey: `nutrition_insight_${insight.topic}`,
      topicKey: insight.topic,
      theme: insight.theme,
      contentType: "parent_insight",
      title: "Nutrition tip 🥗",
      body: insight.body,
      deepLink: "/meals",
      ageGroups: ["toddler", "preschool", "child", "tween"],
      highValue: true,
    });
  }
  return items;
}

function buildParentingPool(): PoolContentItem[] {
  return expandParentingTips().map((t) => ({
    recommendationKey: t.recommendationKey,
    topicKey: t.topicKey,
    theme: t.theme,
    contentType: "parent_insight" as const,
    title: "Parenting tip of the day 🌱",
    body: t.body,
    deepLink: "/hub",
    ageGroups: t.ageGroups as AgeGroup[],
    highValue: true,
  }));
}

function buildLearningPool(): PoolContentItem[] {
  const items: PoolContentItem[] = [];
  let idx = 0;
  for (const seed of ACTIVITY_SEEDS) {
    for (const prefix of ACTIVITY_MODIFIER_PREFIXES) {
      for (const tpl of seed.templates) {
        items.push({
          recommendationKey: `activity_${seed.slug}_${idx++}`,
          topicKey: seed.topic,
          theme: seed.theme,
          contentType: "educational",
          title: seed.weekendOnly ? "Weekend activity idea 🌟" : "Learning activity idea 🧠",
          body: prefix + tpl,
          deepLink: "/hub",
          ageGroups: seed.ageGroups,
          weekendOnly: seed.weekendOnly,
          weekdayOnly: seed.weekdayOnly,
        });
      }
    }
  }
  for (const verb of EXTRA_ACTIVITY_VERBS) {
    for (const ag of ["toddler", "preschool", "child", "tween"] as AgeGroup[]) {
      for (const prefix of ACTIVITY_MODIFIER_PREFIXES.slice(0, 6)) {
        items.push({
          recommendationKey: `activity_extra_${slugify(verb)}_${ag}_${idx++}`,
          topicKey: slugify(verb).slice(0, 20),
          theme: "general_activity",
          contentType: "action_challenge",
          title: "Learning activity idea 🧠",
          body: `${prefix}Try ${verb}.`,
          deepLink: "/hub",
          ageGroups: [ag],
        });
      }
    }
  }
  return items;
}

function buildStoryPool(): PoolContentItem[] {
  const items: PoolContentItem[] = [];
  let idx = 0;
  for (const prompt of STORY_PROMPTS) {
    for (const ag of prompt.ageGroups) {
      items.push({
        recommendationKey: `story_${prompt.slug}_${ag}_${idx++}`,
        topicKey: prompt.topic,
        theme: prompt.theme,
        contentType: "curiosity",
        title: "Story time tonight 📚",
        body: prompt.template,
        deepLink: "/hub",
        ageGroups: [ag],
        timeOfDay: ["evening", "night"],
      });
    }
  }
  const storyFormats = [
    "Read aloud", "Listen together to", "Act out", "Draw after", "Retell",
  ];
  for (const theme of STORY_THEMES) {
    for (const tpl of STORY_THEME_TEMPLATES) {
      for (const ag of ["toddler", "preschool", "child", "tween"] as AgeGroup[]) {
        for (const fmt of storyFormats) {
          items.push({
            recommendationKey: `story_theme_${theme}_${ag}_${fmt}_${idx++}`,
            topicKey: `story_${theme}`,
            theme: `story_${theme}`,
            contentType: "curiosity",
            title: "Story time tonight 📚",
            body: `${fmt}: ${tpl.replace("{theme}", theme)}`,
            deepLink: "/hub",
            ageGroups: [ag],
            timeOfDay: ["evening", "night"],
          });
        }
      }
    }
  }
  return items;
}

function buildMotivationPool(): PoolContentItem[] {
  const items: PoolContentItem[] = [];
  let idx = 0;
  const closers = [
    "",
    " You matter.",
    " One step at a time.",
    " {name} feels it when you show up.",
    " Rest counts too.",
  ];
  for (const seed of MOTIVATION_SEEDS) {
    for (const opener of MOTIVATION_OPENERS) {
      for (const closer of closers) {
        items.push({
          recommendationKey: `motivation_${seed.topic}_${idx++}`,
          topicKey: seed.topic,
          theme: seed.theme,
          contentType: "motivational",
          title: opener,
          body: seed.template + closer,
          deepLink: "/hub",
          ageGroups: ["toddler", "preschool", "child", "tween"],
          highValue: false,
        });
      }
    }
  }
  return items;
}

let cachedPools: Partial<Record<NotificationCategory, PoolContentItem[]>> | null = null;

export function getContentPool(category: NotificationCategory): PoolContentItem[] {
  if (!cachedPools) {
    cachedPools = {
      nutrition: buildNutritionPool(),
      parenting_tips: buildParentingPool(),
      learning_activity: buildLearningPool(),
      story_time: buildStoryPool(),
      engagement: buildMotivationPool(),
    };
  }
  return cachedPools[category] ?? [];
}

export function getPoolSize(category: NotificationCategory): number {
  return getContentPool(category).length;
}

/** Filter pool items for current context (age, weekend, diet for nutrition). */
export function filterPoolForContext(
  pool: PoolContentItem[],
  ctx: ContentContext,
): PoolContentItem[] {
  return pool.filter((item) => {
    if (item.ageGroups && !item.ageGroups.includes(ctx.ageGroup)) return false;
    if (item.weekendOnly && !ctx.isWeekend) return false;
    if (item.weekdayOnly && ctx.isWeekend) return false;
    if (item.timeOfDay && !item.timeOfDay.includes(ctx.timeOfDay)) return false;
    if (item.seasons && !item.seasons.includes(ctx.season)) return false;
    if (item.minEngagement != null && ctx.engagementScore < item.minEngagement) return false;
    if (ctx.category === "nutrition" && item.diet && !matchesDiet(item.diet, ctx.foodType)) {
      return false;
    }
    if (item.regions && item.regions.length > 0 && !item.regions.includes(ctx.culturalRegion)) {
      return false;
    }
    if (ctx.allergies?.length) {
      const text = `${item.title} ${item.body}`.toLowerCase();
      for (const a of ctx.allergies) {
        if (a && text.includes(a.toLowerCase())) return false;
      }
    }
    if (ctx.category === "learning_activity" && ctx.calendar.isSummerBreak && item.weekdayOnly) {
      return false;
    }
    if (ctx.category === "phonics" && ctx.calendar.schoolTerm === "break") {
      return false;
    }
    return true;
  });
}

export function renderPoolItem(item: PoolContentItem, ctx: ContentContext): {
  title: string;
  body: string;
} {
  return {
    title: interpolate(item.title, ctx),
    body: interpolate(item.body, ctx),
  };
}

/** Warm module cache at boot. */
export function warmContentPools(): void {
  getContentPool("nutrition");
  getContentPool("parenting_tips");
  getContentPool("learning_activity");
  getContentPool("story_time");
  getContentPool("engagement");
}

export function clearPoolCacheForTests(): void {
  cachedPools = null;
}
