import type {
  PublishMetadata,
  PublishVerificationReport,
  ThumbnailResolution,
  VideoVisibility,
} from "../../types/published-video.js";
import type { PublishingProvider } from "../youtube/types.js";

export async function verifyPublishedVideo(input: {
  provider: PublishingProvider;
  videoId: string;
  metadata: PublishMetadata;
  visibility: VideoVisibility;
  durationSeconds: number;
  width: number;
  height: number;
  thumbnail: ThumbnailResolution;
}): Promise<PublishVerificationReport> {
  return input.provider.verify({
    videoId: input.videoId,
    expected: {
      title: input.metadata.title,
      visibility: input.visibility,
      durationSeconds: input.durationSeconds,
      width: input.width,
      height: input.height,
      thumbnailPath:
        input.thumbnail.source === "branding-default" &&
        input.thumbnail.path.startsWith("brand://")
          ? null
          : input.thumbnail.path,
    },
  });
}
