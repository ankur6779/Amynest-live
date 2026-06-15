import { describe, expect, it } from "vitest";
import {
  friendlyDeliveryStatus,
  friendlyDeviceLabel,
  friendlyPlatformLabel,
} from "@/lib/notification-display-labels";

describe("notification-display-labels", () => {
  it("maps internal platform ids to friendly labels", () => {
    expect(friendlyPlatformLabel("ios-capacitor")).toBe("iPhone app");
    expect(friendlyPlatformLabel("android")).toBe("Android app");
    expect(friendlyPlatformLabel("web")).toBe("Web browser");
  });

  it("normalizes legacy device names", () => {
    expect(friendlyDeviceLabel("KidSchedule Android", "android")).toBe("AmyNest on Android");
    expect(friendlyDeviceLabel("AmyNest iOS", "ios-capacitor")).toBe("AmyNest on iPhone");
  });

  it("maps delivery status for parents", () => {
    expect(friendlyDeliveryStatus("sent")).toBe("Delivered");
    expect(friendlyDeliveryStatus("no_tokens")).toBe("No device registered");
  });
});
