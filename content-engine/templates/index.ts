import type { VideoStyle, VideoTemplate } from "../types/index.js";
import { VIDEO_TEMPLATES } from "./video-templates.js";

export { VIDEO_TEMPLATES };

export function getVideoTemplate(id: string): VideoTemplate | undefined {
  return VIDEO_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByStyle(videoStyle: VideoStyle): VideoTemplate[] {
  return VIDEO_TEMPLATES.filter((t) => t.videoStyle === videoStyle);
}
