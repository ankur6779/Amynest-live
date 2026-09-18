/** @vitest-environment node */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const kidscheduleRoot = join(here, "../../..");

describe("Health Lab immersive host CSS", () => {
  it("keeps the living deep host position:fixed so it cannot un-fix the overlay", () => {
    const index = readFileSync(join(kidscheduleRoot, "src/index.css"), "utf8");
    const living = readFileSync(
      join(kidscheduleRoot, "src/components/health-lab/health-lab-living-deep.css"),
      "utf8",
    );

    expect(index).toMatch(/\.health-lab-game-viewport\s*\{[\s\S]*?position:\s*fixed/);
    expect(index).toMatch(
      /html\.health-lab-immersive-living\s+\.health-lab-game-viewport\s*\{[\s\S]*?position:\s*fixed/,
    );
    expect(living).toMatch(/\.hl-living-deep\s*\{[\s\S]*?position:\s*relative/);
    expect(living).toMatch(
      /\.health-lab-game-viewport\.hl-living-deep\s*\{[\s\S]*?position:\s*fixed/,
    );
  });

  it("standalone living home does not bleed hub header negative margins", () => {
    const zone = readFileSync(
      join(kidscheduleRoot, "src/features/health-lab/components/health-lab-zone.tsx"),
      "utf8",
    );
    expect(zone).toMatch(/view === "home" && standalone && !living/);
    expect(zone).toMatch(/standalone && "!mx-0"/);
  });
});
