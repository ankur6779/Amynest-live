import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));

function read(relative: string): string {
  return readFileSync(join(dir, relative), "utf8");
}

describe("sign-out and account-switch device wiring", () => {
  it("releases the active device session before Firebase sign-out", () => {
    const src = read("./firebase-auth.tsx");
    const releaseIdx = src.indexOf("releaseCurrentDeviceSession");
    const signOutIdx = src.indexOf("await fbSignOut");
    expect(releaseIdx).toBeGreaterThan(0);
    expect(signOutIdx).toBeGreaterThan(releaseIdx);
    expect(src).toMatch(/resetNativeBillingIdentity/);
    expect(src).toMatch(/clearUserSessionCaches/);
  });

  it("re-registers the installation when the authenticated uid changes", () => {
    const src = read("../contexts/device-registration-context.tsx");
    expect(src).toMatch(/const \{ isSignedIn, userId \} = useAuth\(\)/);
    expect(src).toMatch(/\[isSignedIn, userId, runRegistration\]/);
    expect(src).toMatch(/lastUserRef\.current === userId/);
  });

  it("keeps the burger Sign Out confirmation above the drawer overlay", () => {
    const src = read("../components/nav/amynest-home-nav.tsx");
    expect(src).toMatch(/overlayClassName="z-\[300\]"/);
    expect(src).toMatch(/nav\.sign_out/);
    expect(src).toMatch(/AlertDialog/);
  });
});
