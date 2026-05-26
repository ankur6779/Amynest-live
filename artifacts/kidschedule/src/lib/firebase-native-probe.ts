import { firebaseConfig, getFirebaseAuth, initializeFirebase } from "@/lib/firebase";
import { isNativeAmyNestShell } from "@/lib/native-shell";

const PROBE_TAG = "[amynest:firebase-probe]";

export type FirebaseNativeProbeResult = {
  ok: boolean;
  projectId: string;
  authDomain: string;
  host: string;
  localStorage: boolean;
  identityToolkit: boolean;
  detail?: string;
};

/** Lightweight connectivity check for Capacitor shells (logs only). */
export async function probeFirebaseOnNativeShell(): Promise<FirebaseNativeProbeResult> {
  const host =
    typeof window !== "undefined" ? window.location.hostname : "(no-window)";
  const base: FirebaseNativeProbeResult = {
    ok: false,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    host,
    localStorage: false,
    identityToolkit: false,
  };

  if (!isNativeAmyNestShell()) {
    return { ...base, ok: true, detail: "not-native-shell" };
  }

  try {
    localStorage.setItem("__amynest_ls_probe", "1");
    localStorage.removeItem("__amynest_ls_probe");
    base.localStorage = true;
  } catch {
    base.detail = "localStorage-blocked";
    console.error(PROBE_TAG, base);
    return base;
  }

  const init = initializeFirebase();
  if (init.status !== "ok") {
    base.detail = init.status === "fail" ? init.error : "init-pending";
    console.error(PROBE_TAG, base);
    return base;
  }

  try {
    getFirebaseAuth();
  } catch (err) {
    base.detail = err instanceof Error ? err.message : String(err);
    console.error(PROBE_TAG, base, err);
    return base;
  }

  const apiKey = firebaseConfig.apiKey;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    );
    base.identityToolkit = res.status === 400 || res.status === 200;
    if (!base.identityToolkit) {
      base.detail = `identitytoolkit-http-${res.status}`;
      console.error(PROBE_TAG, base);
      return base;
    }
  } catch (err) {
    base.detail = err instanceof Error ? err.message : "identitytoolkit-fetch-failed";
    console.error(PROBE_TAG, base, err);
    return base;
  }

  base.ok = true;
  console.info(PROBE_TAG, "Firebase reachable from native shell", base);
  return base;
}
