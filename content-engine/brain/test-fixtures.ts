import { loadDefaultConfig } from "../config/index.js";
import { AnalyticsOrchestrator } from "../analytics/orchestrator.js";
import {
  makeContentPackage,
  makePublishedVideo,
} from "../analytics/test-fixtures.js";
import { getTopicById } from "../topics/index.js";
import type { AnalyticsReport } from "../types/analytics.js";

/** Build a realistic AnalyticsReport for brain tests. */
export async function makeAnalyticsReport(
  overrides: { minimumSampleSize?: number } = {},
): Promise<AnalyticsReport> {
  const parenting = getTopicById("parenting-001")!;
  const speech = getTopicById("speech-001");
  const astroId = "astro-001";

  const { report } = await new AnalyticsOrchestrator({
    config: {
      ...loadDefaultConfig(),
      minimumSampleSize: overrides.minimumSampleSize ?? 1,
      optimizationEnabled: true,
    },
  }).analyze({
    videos: [
      makePublishedVideo({ videoId: "brain_vid_a" }),
      makePublishedVideo({
        videoId: "brain_vid_b",
        metadata: {
          ...makePublishedVideo().metadata,
          title: "Amy Astro tip for calmer mornings",
        },
      }),
      makePublishedVideo({
        videoId: "brain_vid_c",
        metadata: {
          ...makePublishedVideo().metadata,
          title: "Speech tip parents need this week",
        },
      }),
    ],
    videoTopicIds: {
      brain_vid_a: parenting.id,
      brain_vid_b: astroId,
      brain_vid_c: speech?.id ?? parenting.id,
    },
    topicsById: {
      [parenting.id]: {
        title: parenting.title,
        category: parenting.category,
        videoStyle: parenting.videoStyle,
      },
      [astroId]: {
        title: "Amy Astro tip",
        category: "Amy Astro",
        videoStyle: "astro",
      },
      ...(speech
        ? {
            [speech.id]: {
              title: speech.title,
              category: speech.category,
              videoStyle: speech.videoStyle,
            },
          }
        : {}),
    },
    contentByTopicId: {
      [parenting.id]: makeContentPackage(),
      ...(speech ? { [speech.id]: makeContentPackage() } : {}),
    },
    schedule: "weekly",
  });

  return report;
}
