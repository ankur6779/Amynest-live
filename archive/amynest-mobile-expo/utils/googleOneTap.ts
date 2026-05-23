import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (
            momentListener?: (notification: {
              isNotDisplayed: () => boolean;
              isSkippedMoment: () => boolean;
              getNotDisplayedReason: () => string;
            }) => void,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}

function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }
    const existing = document.getElementById("gsi-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GIS script failed")));
      return;
    }
    const script = document.createElement("script");
    script.id = "gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

export async function signInWithGoogleOneTap(
  clientId: string,
  onLoading: (v: boolean) => void,
  onError: (msg: string) => void,
): Promise<void> {
  await loadGISScript();

  return new Promise((resolve) => {
    window.google!.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        onLoading(true);
        try {
          const cred = GoogleAuthProvider.credential(response.credential);
          await signInWithCredential(firebaseAuth, cred);
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Google sign-in failed. Please try again.";
          onError(msg);
          onLoading(false);
        }
        resolve();
      },
    });

    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const reason = notification.getNotDisplayedReason?.() ?? "unknown";
        console.warn("[OneTap] not displayed:", reason);
        onError(
          "Google sign-in overlay could not be shown. Please try email & password.",
        );
        onLoading(false);
        resolve();
      }
    });
  });
}
