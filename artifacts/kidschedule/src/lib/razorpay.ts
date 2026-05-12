// Lazy loader for the Razorpay Checkout script. The script registers
// `window.Razorpay` (a constructor) when it finishes loading.
let scriptPromise: Promise<void> | null = null;

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("razorpay_script_failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("razorpay_script_failed"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (resp: RazorpayCheckoutResponse) => void;
  modal?: { ondismiss?: () => void; escape?: boolean };
  /** Pre-select a payment method (e.g. "upi" for Google Pay / UPI Autopay). */
  method?: string;
};

export async function openRazorpayCheckout(opts: RazorpayCheckoutOptions): Promise<void> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error("razorpay_unavailable");
  const rzp = new window.Razorpay(opts);
  rzp.open();
}
