// Razorpay Checkout — Android alternative billing under Google Play UCB.
// Google Play User Choice Billing (UCB) allows apps in supported markets
// (e.g. India) to offer an alternative billing system ALONGSIDE Google Play
// Billing. Google Play Billing (RevenueCat) must be the PRIMARY option;
// Razorpay is the SECONDARY / alternative that the user may choose.
// iOS does NOT use Razorpay
// (Apple's IAP policy forbids third-party billing for digital subs).
// react-native-razorpay is a native module — it only works in dev /
// production builds, NOT in Expo Go. We require it lazily so the
// import doesn't crash the JS bundle when the native module is missing.
import { Platform } from "react-native";
import { brand } from "@/constants/colors";

export type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

export type CheckoutOpts = {
  keyId: string;
  subscriptionId: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
};

export type CheckoutResult =
  | { ok: true; response: RazorpaySuccess }
  | { ok: false; userCancelled: boolean; reason: string };

export function razorpayAvailable(): boolean {
  if (Platform.OS !== "android") return false;
  try {
    require("react-native-razorpay");
    return true;
  } catch {
    return false;
  }
}

export async function openCheckout(opts: CheckoutOpts): Promise<CheckoutResult> {
  if (Platform.OS !== "android") {
    return { ok: false, userCancelled: false, reason: "Razorpay is Android-only on mobile." };
  }
  let RazorpayCheckout: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    RazorpayCheckout = require("react-native-razorpay").default;
  } catch {
    return {
      ok: false,
      userCancelled: false,
      reason: "Razorpay SDK is not bundled in this build (use a dev/production build).",
    };
  }
  try {
    const data: RazorpaySuccess = await RazorpayCheckout.open({
      key: opts.keyId,
      subscription_id: opts.subscriptionId,
      name: "AmyNest AI",
      description: "AmyNest Premium",
      theme: { color: brand.primary },
      prefill: opts.prefill,
      notes: opts.notes,
    });
    return { ok: true, response: data };
  } catch (e: any) {
    // react-native-razorpay rejects with { code, description } on cancel/error.
    const description: string = e?.description ?? e?.message ?? "Payment failed";
    const userCancelled =
      /cancelled|canceled|dismiss|user.*close/i.test(description) || e?.code === 0;
    return {
      ok: false,
      userCancelled,
      reason: userCancelled ? "Payment cancelled" : description,
    };
  }
}
