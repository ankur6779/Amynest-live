import type { ContentPackage } from "../../types/content-package.js";
import { buildOptimizedDescription } from "../metadata/description-template.js";
import { clampTitle } from "../metadata/title-utils.js";
import { resolveStoreLinks } from "../metadata/store-links.js";
import { buildDescriptionVariants } from "./description-variants.js";
import { buildHashtagPack } from "./hashtags.js";
import { buildLocalizations } from "./localizations.js";
import { buildPinnedComment } from "./pinned-comment.js";
import { buildScorecard } from "./scorecard.js";
import { scorePublishSeo } from "./seo-score.js";
import { buildThumbnailTitle } from "./thumbnail-title.js";
import { buildTitleVariants } from "./title-variants.js";
import type { PublishingPolish } from "./types.js";
import { recommendBestUploadTime } from "./upload-timing.js";

/** Assemble full YouTube publishing polish package. */
export function buildPublishingPolish(input: {
  content: ContentPackage;
  title?: string;
  description?: string;
  tags?: string[];
  learnedHours?: number[];
  learnedWeekdays?: string[];
}): PublishingPolish {
  const links = resolveStoreLinks();
  const titleVariants = buildTitleVariants(input.content);
  const title = clampTitle(input.title ?? titleVariants[0] ?? input.content.title);
  const hashtags = buildHashtagPack(input.content);
  const descriptionVariants = buildDescriptionVariants({
    content: input.content,
    hashtags,
    links,
  });
  const description =
    input.description ?? descriptionVariants.long ?? buildOptimizedDescription(links);
  const tags = input.tags ?? [];
  const thumbnailTitle = buildThumbnailTitle(input.content);
  const pinnedComment = buildPinnedComment(links);
  const localizations = buildLocalizations({
    content: input.content,
    englishTitle: title,
    englishDescription: description,
    links,
  });
  const bestUploadTime = recommendBestUploadTime({
    content: input.content,
    learnedHours: input.learnedHours,
    learnedWeekdays: input.learnedWeekdays,
  });
  const seo = scorePublishSeo({
    content: input.content,
    title,
    description,
    tags,
    thumbnailTitle,
    hashtagCount: hashtags.all.length,
  });

  const partial = {
    pinnedComment,
    localizations,
    titleVariants,
    descriptionVariants,
    hashtags,
    bestUploadTime,
    thumbnailTitle,
    seo,
  };

  return {
    ...partial,
    scorecard: buildScorecard(partial),
  };
}
