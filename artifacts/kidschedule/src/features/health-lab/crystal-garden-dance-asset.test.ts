/** @vitest-environment node */
import { readFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { CRYSTAL_GARDEN_DANCE_URL } from "./components/games/crystal-garden/crystal-garden-audio";

const KIDSCHEDULE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const DANCE_FILE = join(KIDSCHEDULE_ROOT, "public/health-lab-audio/crystal-garden-dance.mp3");

function isMpegAudio(bytes: Buffer): boolean {
  if (bytes.length < 4) return false;
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return true;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const size = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
    const frame = 10 + size;
    return bytes.length > frame + 1 && bytes[frame] === 0xff && (bytes[frame + 1] & 0xe0) === 0xe0;
  }
  return false;
}

describe("Crystal Garden dance MP3", () => {
  it("is a Vite public static asset at the freeze-game URL", () => {
    expect(CRYSTAL_GARDEN_DANCE_URL).toBe("/health-lab-audio/crystal-garden-dance.mp3");
    const stat = statSync(DANCE_FILE);
    expect(stat.size).toBeGreaterThan(4_000);
    const bytes = readFileSync(DANCE_FILE);
    expect(isMpegAudio(bytes)).toBe(true);
  });
});
