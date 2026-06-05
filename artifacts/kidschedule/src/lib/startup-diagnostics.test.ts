import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectStartupDiagnostics,
  diagnosticsToTelemetry,
} from "@/lib/startup-diagnostics";

function stubUa(userAgent: string, extra?: Partial<Navigator>): void {
  vi.stubGlobal("navigator", {
    userAgent,
    onLine: true,
    maxTouchPoints: 0,
    ...extra,
  });
}

const ONEPLUS_WEBVIEW_UA =
  "Mozilla/5.0 (Linux; Android 13; CPH2451 Build/TP1A.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.43 Mobile Safari/537.36";
const XIAOMI_CHROME_UA =
  "Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36";
const PIXEL_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

describe("startup-diagnostics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a OnePlus Android System WebView UA (the stuck-boot case)", () => {
    stubUa(ONEPLUS_WEBVIEW_UA);
    const d = collectStartupDiagnostics();
    expect(d.platform).toBe("android");
    expect(d.deviceModel).toBe("CPH2451");
    expect(d.osVersion).toBe("Android 13");
    expect(d.webViewVersion).toBe("120");
    expect(d.isWebView).toBe(true);
  });

  it("parses a Xiaomi Chrome UA (not a WebView)", () => {
    stubUa(XIAOMI_CHROME_UA);
    const d = collectStartupDiagnostics();
    expect(d.platform).toBe("android");
    expect(d.deviceModel).toBe("M2101K6G");
    expect(d.osVersion).toBe("Android 12");
    expect(d.isWebView).toBe(false);
    expect(d.browser).toBe("chrome");
  });

  it("parses a Pixel UA with a spaced model name", () => {
    stubUa(PIXEL_UA);
    const d = collectStartupDiagnostics();
    expect(d.deviceModel).toBe("Pixel 7");
    expect(d.osVersion).toBe("Android 14");
  });

  it("parses an iPhone UA", () => {
    stubUa(IPHONE_UA);
    const d = collectStartupDiagnostics();
    expect(d.platform).toBe("ios");
    expect(d.deviceModel).toBe("iPhone");
    expect(d.osVersion).toBe("iOS 17.4");
  });

  it("reports offline network status", () => {
    stubUa(PIXEL_UA, { onLine: false });
    const d = collectStartupDiagnostics();
    expect(d.online).toBe(false);
  });

  it("never throws and returns telemetry primitives", () => {
    stubUa(ONEPLUS_WEBVIEW_UA);
    const telemetry = diagnosticsToTelemetry(collectStartupDiagnostics());
    for (const value of Object.values(telemetry)) {
      expect(["string", "number", "boolean"]).toContain(typeof value);
    }
  });
});
