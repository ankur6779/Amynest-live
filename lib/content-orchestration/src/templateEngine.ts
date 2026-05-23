import type { DifficultyLevel, ModuleId, PoolContentItem } from "./types.js";
import type { ContentTemplate, GeneratedTemplateVariant } from "./types-v2.js";
import { dateSeed } from "./utils/seededShuffle.js";

export const DEFAULT_TEMPLATES: ContentTemplate[] = [
  {
    id: "phonics_letter_identification",
    moduleId: "phonics",
    variables: {
      letter: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      voice: ["default", "alt"],
      speed: ["slow", "normal"],
    },
  },
  {
    id: "motor_trace_shape",
    moduleId: "motor_skills",
    variables: {
      shape: ["circle", "square", "triangle", "star"],
      speed: ["slow", "normal", "fast"],
    },
  },
  {
    id: "social_emotion_match",
    moduleId: "social_emotional",
    variables: {
      emotion: ["happy", "sad", "excited", "calm"],
      voice: ["default", "alt"],
    },
  },
];

function pickFrom<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length]!;
}

export function generateTemplateVariant(
  template: ContentTemplate,
  seed: number,
  difficultyLevel: DifficultyLevel = "medium",
): GeneratedTemplateVariant {
  const params: Record<string, string> = {};
  let s = seed;
  for (const [key, values] of Object.entries(template.variables)) {
    params[key] = pickFrom(values, s);
    s += 17;
  }
  const paramKey = Object.entries(params)
    .map(([k, v]) => `${k}_${v}`)
    .join("_");
  return {
    contentId: `tpl_${template.id}_${paramKey}`,
    templateId: template.id,
    params,
    difficultyLevel,
  };
}

export function expandPoolWithTemplates(
  items: PoolContentItem[],
  templates: ContentTemplate[],
  moduleId: ModuleId,
  count: number,
  seed: number,
): PoolContentItem[] {
  const moduleTemplates = templates.filter((t) => t.moduleId === moduleId);
  if (moduleTemplates.length === 0) return items;

  const generated: PoolContentItem[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = moduleTemplates[i % moduleTemplates.length]!;
    const variant = generateTemplateVariant(tpl, seed + i, "medium");
    generated.push({
      contentId: variant.contentId,
      title: `${tpl.id} (${Object.values(variant.params).join(", ")})`,
      templateId: variant.templateId,
      difficultyLevel: variant.difficultyLevel,
      engagementWeight: 55,
      variants: [
        {
          variantId: `${variant.contentId}_v1`,
          speed: (variant.params.speed as "slow" | "normal") ?? "normal",
          voiceId: variant.params.voice === "alt" ? "amy_alt" : "amy_default",
        },
      ],
    });
  }
  return [...items, ...generated];
}

export function enrichPoolsFromTemplates(
  pools: { contentVariants: PoolContentItem[]; moduleId: ModuleId }[],
  childId: string,
  dateIso: string,
  perModule = 5,
): typeof pools {
  const seed = dateSeed(dateIso, childId);
  return pools.map((pool, idx) => ({
    ...pool,
    contentVariants: expandPoolWithTemplates(
      pool.contentVariants,
      DEFAULT_TEMPLATES,
      pool.moduleId,
      perModule,
      seed + idx * 31,
    ),
  }));
}
