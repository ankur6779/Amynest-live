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
    expect(src).toMatch(/signOutNativeGoogleAuth/);
    expect(src).toMatch(/signOutNativeFacebookAuth/);
  });

  it("exports Capacitor Google/Facebook native sign-out helpers for shared-device switches", () => {
    const google = read("./google-auth.ts");
    expect(google).toMatch(/export async function signOutNativeGoogleAuth/);
    expect(google).toMatch(/GoogleAuth\.signOut/);
    const facebook = read("./facebook-auth.ts");
    expect(facebook).toMatch(/export async function signOutNativeFacebookAuth/);
    expect(facebook).toMatch(/FacebookLogin\.logout/);
  });

  it("iOS GoogleAuth patch never silent-restores the previous Google account on signIn", () => {
    const swift = readFileSync(
      join(
        dir,
        "../../../amynest-capacitor/ios-config/patches/GoogleAuthPlugin.swift",
      ),
      "utf8",
    );
    // Comment may mention the API; the call itself must be gone.
    expect(swift).not.toMatch(/\.restorePreviousSignIn\s*\{/);
    expect(swift).not.toMatch(/hasPreviousSignIn\s*\(/);
    expect(swift).toMatch(/Always present the account picker for interactive signIn/);
    expect(swift).toMatch(/googleSignIn\.signIn\(/);
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

  it("binds Firebase Analytics to the signed-in user id for purchase attribution", () => {
    const auth = read("./firebase-auth.tsx");
    expect(auth).toMatch(/setFirebaseAnalyticsUserId/);
    const purchase = read("./firebase-subscription-attribution.ts");
    expect(purchase).toMatch(/currentAuthUserId/);
    expect(purchase).toMatch(/setFirebaseAnalyticsUserId\(uid\)/);
    const funnel = read("./subscription-analytics.ts");
    expect(funnel).toMatch(/upgrade_completed/);
  });
});
