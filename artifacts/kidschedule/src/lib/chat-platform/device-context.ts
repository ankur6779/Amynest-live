import { isAndroidUa, isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";

export interface ChatPlatformDeviceContext {
  deviceManufacturer: string;
  androidVersion: string;
  osSkin: string;
  keyboardApp: string;
  appVersion: string;
}

let cachedKeyboardApp = "unknown";

const KEYBOARD_PACKAGE_LABELS: Record<string, string> = {
  "com.google.android.inputmethod.latin": "Gboard",
  "com.samsung.android.honeyboard": "Samsung Keyboard",
  "com.samsung.android.inputmethod": "Samsung Keyboard",
  "com.android.inputmethod.latin": "AOSP Keyboard",
  "com.baidu.input": "Baidu Keyboard",
  "com.sohu.inputmethod.sogou": "Sogou Keyboard",
  "com.iflytek.inputmethod": "iFlytek Keyboard",
  "com.miui.securityinputmethod": "Xiaomi Keyboard",
  "com.oplus.inputmethod": "Oppo Keyboard",
  "com.coloros.inputmethod": "ColorOS Keyboard",
  "com.vivo.inputmethod": "Vivo Keyboard",
  "com.huawei.inputmethod": "Huawei Keyboard",
};

function parseAndroidVersion(ua: string): string {
  const match = ua.match(/Android\s+([\d.]+)/i);
  return match?.[1]?.split(".")[0] ?? "unknown";
}

function detectManufacturer(ua: string): string {
  if (/Samsung|SM-|SAMSUNG/i.test(ua)) return "Samsung";
  if (/Redmi|POCO|XiaoMi|MiuiBrowser|Mi\s/i.test(ua)) return "Xiaomi";
  if (/OPPO|ColorOS/i.test(ua)) return "Oppo";
  if (/vivo|Funtouch/i.test(ua)) return "Vivo";
  if (/OnePlus/i.test(ua)) return "OnePlus";
  if (/Pixel|Google/i.test(ua)) return "Google";
  if (/Huawei|Honor|HarmonyOS/i.test(ua)) return "Huawei";
  if (/Realme/i.test(ua)) return "Realme";
  if (/Motorola|Moto/i.test(ua)) return "Motorola";
  return "unknown";
}

function detectOsSkin(manufacturer: string, ua: string): string {
  if (manufacturer === "Xiaomi" || /HyperOS|MIUI/i.test(ua)) return "HyperOS";
  if (manufacturer === "Oppo" || /ColorOS/i.test(ua)) return "ColorOS";
  if (manufacturer === "Vivo" || /Funtouch/i.test(ua)) return "FuntouchOS";
  if (manufacturer === "Samsung" || /OneUI/i.test(ua)) return "One UI";
  if (/HarmonyOS/i.test(ua)) return "HarmonyOS";
  return "Stock Android";
}

function mapKeyboardPackage(pkg: string): string {
  const trimmed = pkg.trim();
  if (!trimmed) return "unknown";
  if (KEYBOARD_PACKAGE_LABELS[trimmed]) return KEYBOARD_PACKAGE_LABELS[trimmed]!;
  const partial = Object.entries(KEYBOARD_PACKAGE_LABELS).find(([key]) => trimmed.startsWith(key));
  if (partial) return partial[1];
  const short = trimmed.split(".").pop() ?? trimmed;
  return short.replace(/IME$/i, "").replace(/([a-z])([A-Z])/g, "$1 $2") || trimmed;
}

/** Called from native keyboard inset events (MainActivity reports active IME package). */
export function setChatPlatformKeyboardAppFromNative(keyboardPackage: string | undefined): void {
  if (!keyboardPackage?.trim()) return;
  cachedKeyboardApp = mapKeyboardPackage(keyboardPackage);
}

export function getChatPlatformDeviceContext(): ChatPlatformDeviceContext {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const deviceManufacturer = isAndroidUa() ? detectManufacturer(ua) : "non-android";
  const androidVersion = isAndroidUa() ? parseAndroidVersion(ua) : "n/a";
  const osSkin = isAndroidUa() ? detectOsSkin(deviceManufacturer, ua) : "n/a";
  const appVersion =
    (import.meta.env.VITE_APP_VERSION as string | undefined)?.trim() ||
    (isNativeAmyNestAndroidWrapper() ? "android-webview" : "web");

  return {
    deviceManufacturer,
    androidVersion,
    osSkin,
    keyboardApp: cachedKeyboardApp,
    appVersion,
  };
}
