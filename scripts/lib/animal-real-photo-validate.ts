/**
 * Validate source images before writing hero-real.webp.
 */
import sharp from "sharp";

const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const MIN_BYTES = 18_000;

export type ValidationFailure =
  | "invalid_image"
  | "conversion_failed";

export type SourceValidation = {
  ok: boolean;
  width: number;
  height: number;
  bytes: number;
  failureReason?: ValidationFailure;
  detail?: string;
};

export async function validateSourceImageBuffer(buf: Buffer): Promise<SourceValidation> {
  const bytes = buf.length;
  if (bytes < MIN_BYTES) {
    return { ok: false, width: 0, height: 0, bytes, failureReason: "invalid_image", detail: "too_small_file" };
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(buf).metadata();
  } catch (e) {
    return {
      ok: false,
      width: 0,
      height: 0,
      bytes,
      failureReason: "conversion_failed",
      detail: e instanceof Error ? e.message : "metadata_failed",
    };
  }

  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    return {
      ok: false,
      width,
      height,
      bytes,
      failureReason: "invalid_image",
      detail: `dimensions_${width}x${height}`,
    };
  }

  try {
    const stats = await sharp(buf).stats();
    const spread =
      stats.channels.reduce((sum, ch) => sum + (ch.stdev ?? 0), 0) / Math.max(stats.channels.length, 1);
    if (spread < 4) {
      return {
        ok: false,
        width,
        height,
        bytes,
        failureReason: "invalid_image",
        detail: "blank_or_flat",
      };
    }
  } catch (e) {
    return {
      ok: false,
      width,
      height,
      bytes,
      failureReason: "conversion_failed",
      detail: e instanceof Error ? e.message : "stats_failed",
    };
  }

  return { ok: true, width, height, bytes };
}

export async function validateHeroRealWebp(buf: Buffer): Promise<SourceValidation> {
  if (buf.length < 8_000) {
    return { ok: false, width: 0, height: 0, bytes: buf.length, failureReason: "invalid_image", detail: "webp_too_small" };
  }
  try {
    const meta = await sharp(buf).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 300 || height < 300) {
      return { ok: false, width, height, bytes: buf.length, failureReason: "invalid_image", detail: "output_too_small" };
    }
    return { ok: true, width, height, bytes: buf.length };
  } catch (e) {
    return {
      ok: false,
      width: 0,
      height: 0,
      bytes: buf.length,
      failureReason: "conversion_failed",
      detail: e instanceof Error ? e.message : "webp_invalid",
    };
  }
}
