import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface FfmpegFilterCapabilities {
  drawtext: boolean;
  ass: boolean;
  checkedAt: string;
}

const cache = new Map<string, FfmpegFilterCapabilities>();

/** Probe which optional filters are present in the local ffmpeg build. */
export async function getFfmpegFilterCapabilities(
  binary = "ffmpeg",
): Promise<FfmpegFilterCapabilities> {
  const cached = cache.get(binary);
  if (cached) return cached;

  try {
    const { stdout, stderr } = await execFileAsync(binary, ["-hide_banner", "-filters"], {
      timeout: 8_000,
      maxBuffer: 2_000_000,
    });
    const text = `${stdout}\n${stderr}`;
    const caps: FfmpegFilterCapabilities = {
      drawtext: /\bdrawtext\b/.test(text),
      ass: /(^|\s)ass\s/.test(text) || /\bass\s+V->V\b/.test(text),
      checkedAt: new Date().toISOString(),
    };
    cache.set(binary, caps);
    return caps;
  } catch {
    const caps: FfmpegFilterCapabilities = {
      drawtext: false,
      ass: false,
      checkedAt: new Date().toISOString(),
    };
    cache.set(binary, caps);
    return caps;
  }
}

export function clearFfmpegCapabilitiesCache(): void {
  cache.clear();
}
