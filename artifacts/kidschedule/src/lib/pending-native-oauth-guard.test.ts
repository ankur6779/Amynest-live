import { describe, expect, it } from "vitest";
import { decidePendingNativeOAuthBootstrap } from "./pending-native-oauth-guard";

describe("decidePendingNativeOAuthBootstrap", () => {
  it("skips when no pending token", () => {
    expect(
      decidePendingNativeOAuthBootstrap({
        hasPendingToken: false,
        signInInFlight: false,
        currentUser: null,
      }),
    ).toBe("skip");
  });

  it("skips while an explicit native sign-in is in flight", () => {
    expect(
      decidePendingNativeOAuthBootstrap({
        hasPendingToken: true,
        signInInFlight: true,
        currentUser: null,
      }),
    ).toBe("skip");
  });

  it("bootstraps when signed out with a pending token", () => {
    expect(
      decidePendingNativeOAuthBootstrap({
        hasPendingToken: true,
        signInInFlight: false,
        currentUser: null,
      }),
    ).toBe("bootstrap");
  });

  it("bootstraps for anonymous guests (Try First → Google upgrade)", () => {
    expect(
      decidePendingNativeOAuthBootstrap({
        hasPendingToken: true,
        signInInFlight: false,
        currentUser: { isAnonymous: true },
      }),
    ).toBe("bootstrap");
  });

  it("clears stale pending instead of replacing a signed-in account", () => {
    expect(
      decidePendingNativeOAuthBootstrap({
        hasPendingToken: true,
        signInInFlight: false,
        currentUser: { isAnonymous: false },
      }),
    ).toBe("skip_clear_stale");
  });

  it("treats missing isAnonymous as an established session", () => {
    expect(
      decidePendingNativeOAuthBootstrap({
        hasPendingToken: true,
        signInInFlight: false,
        currentUser: {},
      }),
    ).toBe("skip_clear_stale");
  });
});
