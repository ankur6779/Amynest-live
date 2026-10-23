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
    const unregisterIdx = src.indexOf("unregisterCurrentPushTokens");
    const releaseIdx = src.indexOf("releaseCurrentDeviceSession");
    const signOutIdx = src.indexOf("await fbSignOut");
    expect(unregisterIdx).toBeGreaterThan(0);
    expect(releaseIdx).toBeGreaterThan(unregisterIdx);
    expect(signOutIdx).toBeGreaterThan(releaseIdx);
    expect(src).toMatch(/resetNativeBillingIdentity/);
    expect(src).toMatch(/clearUserSessionCaches/);
  });

  it("clears device-global push registration markers on session cache wipe", () => {
    const src = read("./user-session-cache.ts");
    expect(src).toMatch(/notify_device_registered_at/);
    expect(src).toMatch(/notify_nudge_dismissed_until/);
  });

  it("auto-rebinds web FCM tokens when a signed-in user already granted permission", () => {
    const src = read("../hooks/use-push-registration.ts");
    expect(src).toMatch(/getBrowserNotificationPermission\(\) !== "granted"/);
    expect(src).toMatch(/platform: "web"/);
    expect(src).toMatch(/getWebPushToken/);
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
