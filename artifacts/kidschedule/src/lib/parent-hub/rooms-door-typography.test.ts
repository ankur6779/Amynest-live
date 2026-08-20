import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = resolve(
  import.meta.dirname,
  "../../components/parent-hub/parent-hub-living-room.css",
);
const shellPath = resolve(
  import.meta.dirname,
  "../../components/parent-hub/parent-hub-rooms-shell.tsx",
);

describe("Rooms V1 door title / subtitle hierarchy", () => {
  it("stacks title above feeling with a block column gap (not inline one-liner)", () => {
    const css = readFileSync(cssPath, "utf8");
    const copyStart = css.indexOf(".ph-room-door-copy {");
    const titleStart = css.indexOf(".ph-room-door-title {");
    const feelingStart = css.indexOf(".ph-room-door-feeling {");
    expect(copyStart).toBeGreaterThan(-1);
    expect(titleStart).toBeGreaterThan(-1);
    expect(feelingStart).toBeGreaterThan(-1);

    const copyBlock = css.slice(copyStart, css.indexOf("}", copyStart) + 1);
    const titleBlock = css.slice(titleStart, css.indexOf("}", titleStart) + 1);
    const feelingBlock = css.slice(feelingStart, css.indexOf("}", feelingStart) + 1);

    expect(copyBlock).toContain("flex-direction: column");
    expect(copyBlock).toMatch(/gap:\s*0\.5rem/);
    expect(titleBlock).toContain("display: block");
    expect(feelingBlock).toContain("display: block");
    expect(feelingBlock).toMatch(/margin-top:\s*0/);
  });

  it("keeps title and feeling as separate DOM nodes (no combined copy string)", () => {
    const shell = readFileSync(shellPath, "utf8");
    expect(shell).toContain('className="ph-room-door-title"');
    expect(shell).toContain('className="ph-room-door-feeling"');
    expect(shell).toContain("{doorTitle}");
    expect(shell).toContain("{feeling}");
    expect(shell).not.toMatch(/\{doorTitle\}\s*\{\s*feeling\s*\}/);
    expect(shell).not.toContain("<br");
  });
});
