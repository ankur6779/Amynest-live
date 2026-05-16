import { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Geolocation } from "@capacitor/geolocation";
import { PushNotifications } from "@capacitor/push-notifications";
import { Bell, MapPin, Mic, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getIosNativeMicrophoneGateState, MicPermissionCapacitor } from "@/lib/mic-permission-capacitor";
import { syncCapacitorPushRegistrationWithOs } from "@/lib/native-push-bridge";

const SESSION_SKIP_KEY = "amynest_native_perm_gate_skip_v1";

type TriState = "unknown" | "granted" | "denied" | "prompt";

function mapLoc(v: string | undefined): TriState {
  if (v === "granted" || v === "limited") return "granted";
  if (v === "denied") return "denied";
  if (v === "prompt") return "prompt";
  return "unknown";
}

function mapPush(v: string | undefined): TriState {
  if (v === "granted") return "granted";
  if (v === "denied") return "denied";
  if (v === "prompt") return "prompt";
  return "unknown";
}

async function micQueryState(): Promise<TriState> {
  try {
    const perm = navigator.permissions as
      | { query(desc: { name: PermissionName }): Promise<PermissionStatus> }
      | undefined;
    if (!perm?.query) return "prompt";
    const st = await perm.query({ name: "microphone" as PermissionName });
    if (st.state === "granted") return "granted";
    if (st.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "prompt";
  }
}

async function requestMic(): Promise<TriState> {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
      try {
        const { status } = await MicPermissionCapacitor.requestMicrophonePermission();
        if (status === "granted") return "granted";
        if (status === "denied") return "denied";
        return "denied";
      } catch {
        return "denied";
      }
    }
    if (!navigator.mediaDevices?.getUserMedia) return "denied";
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

/** After native/Web mic request, sync pill state from AVAudioSession on iOS. */
async function requestMicWithIosFallback(): Promise<TriState> {
  if (Capacitor.getPlatform() === "ios") {
    try {
      const { status } = await MicPermissionCapacitor.requestMicrophonePermission();
      if (status === "granted") return "granted";
      if (status === "denied") return "denied";
    } catch {
      /* plugin missing — fall through */
    }
    const native = await getIosNativeMicrophoneGateState();
    if (native === "granted") return "granted";
  }
  const next = await requestMic();
  if (next === "granted") return "granted";
  if (Capacitor.getPlatform() === "ios") {
    const native = await getIosNativeMicrophoneGateState();
    if (native === "granted") return "granted";
  }
  return next;
}

async function openNativeSettings(): Promise<void> {
  try {
    const platform = Capacitor.getPlatform();
    if (platform === "ios") {
      window.location.assign("app-settings:");
      return;
    }
    if (platform === "android") {
      window.location.assign(
        "intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;data=package:com.amynest.app;end",
      );
    }
  } catch {
    /* best-effort */
  }
}

function Pill({ state }: { state: TriState }) {
  const label =
    state === "granted" ? "Allowed"
      : state === "denied" ? "Blocked"
        : state === "prompt" ? "Not set"
          : "…";
  const cls =
    state === "granted" ? "bg-emerald-600/20 text-emerald-200 border-emerald-500/40"
      : state === "denied" ? "bg-rose-600/20 text-rose-200 border-rose-500/40"
        : "bg-amber-600/15 text-amber-100 border-amber-500/35";
  return (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", cls)}>
      {label}
    </span>
  );
}

/**
 * On Capacitor iOS/Android, prompts for location, microphone, and notification
 * permission shortly after app start. If the OS has denied a permission, the
 * user is guided to Settings and can tap "Check again" after returning.
 * "Continue" without all permissions is allowed once per app session (sessionStorage).
 */
export function NativeStartupPermissionsGate() {
  const isCap = useMemo(
    () => typeof window !== "undefined" && Capacitor.isNativePlatform(),
    [],
  );

  const [skipSession, setSkipSession] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_SKIP_KEY) === "1";
    } catch {
      return false;
    }
  });

  const [loc, setLoc] = useState<TriState>("unknown");
  const [mic, setMic] = useState<TriState>("unknown");
  const [push, setPush] = useState<TriState>("unknown");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!isCap) return;
    try {
      const [g, p] = await Promise.all([
        Geolocation.checkPermissions(),
        PushNotifications.checkPermissions(),
      ]);
      setLoc(mapLoc(g.location));
      setPush(mapPush(p.receive));
      // iOS WKWebView: `navigator.permissions.query({ name: "microphone" })` often stays
      // "prompt" even when Settings → AmyNest → Microphone is On — use AVAudioSession via
      // MicPermissionPlugin instead so the gate matches the real OS state.
      if (Capacitor.getPlatform() === "ios") {
        const nativeMic = await getIosNativeMicrophoneGateState();
        setMic(nativeMic === "unknown" ? await micQueryState() : nativeMic);
      } else {
        setMic(await micQueryState());
      }
    } catch {
      setLoc("unknown");
      setMic("unknown");
      setPush("unknown");
    } finally {
      setReady(true);
    }
  }, [isCap]);

  useEffect(() => {
    if (!isCap) return undefined;
    void refresh();

    const listenerPromise = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void refresh();
    });

    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      void listenerPromise.then((h) => {
        try {
          void h.remove();
        } catch { /* ignore */ }
      });
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isCap, refresh]);

  const allGranted = loc === "granted" && mic === "granted" && push === "granted";

  const requestLocation = async () => {
    setBusy(true);
    try {
      const r = await Geolocation.requestPermissions();
      setLoc(mapLoc(r.location));
    } catch {
      setLoc("denied");
    } finally {
      setBusy(false);
    }
  };

  const requestPush = async () => {
    setBusy(true);
    try {
      const r = await PushNotifications.requestPermissions();
      setPush(mapPush(r.receive));
      if (r.receive === "granted") {
        await syncCapacitorPushRegistrationWithOs();
      }
    } catch {
      setPush("denied");
    } finally {
      setBusy(false);
    }
  };

  const requestMicPerm = async () => {
    setBusy(true);
    try {
      const next = await requestMicWithIosFallback();
      if (Capacitor.getPlatform() === "ios") {
        const nativeMic = await getIosNativeMicrophoneGateState();
        setMic(nativeMic !== "unknown" ? nativeMic : next);
      } else {
        setMic(next === "granted" ? "granted" : "denied");
      }
    } finally {
      setBusy(false);
    }
  };

  const allowAll = async () => {
    setBusy(true);
    try {
      try {
        const r = await Geolocation.requestPermissions();
        setLoc(mapLoc(r.location));
      } catch {
        setLoc("denied");
      }
      try {
        const next = await requestMicWithIosFallback();
        setMic(next === "granted" ? "granted" : "denied");
      } catch {
        setMic("denied");
      }
      try {
        const r = await PushNotifications.requestPermissions();
        setPush(mapPush(r.receive));
        if (r.receive === "granted") {
          await syncCapacitorPushRegistrationWithOs();
        }
      } catch {
        setPush("denied");
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onContinue = () => {
    try {
      sessionStorage.setItem(SESSION_SKIP_KEY, "1");
    } catch { /* ignore */ }
    setSkipSession(true);
  };

  if (!isCap || skipSession) return null;
  if (allGranted && ready) return null;
  if (!ready) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a061a]/90" aria-busy="true" aria-label="Loading permissions" />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a061a]/95 p-4 text-slate-100 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="native-perm-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#120b28] p-5 shadow-2xl">
        <h2 id="native-perm-title" className="text-lg font-semibold tracking-tight">
          Allow AmyNest to work fully
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          We use location, the microphone, and notifications for reminders and Speech Coach.
          If you turned something off before, use{" "}
          <span className="font-medium text-white">Open settings</span>
          {" "}then <span className="font-medium text-white">Check again</span>.
        </p>

        <ul className="mt-5 space-y-4">
          <li className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Location</span>
                <Pill state={loc} />
              </div>
              <p className="mt-1 text-xs text-slate-400">While using the app — routines and local tips.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void requestLocation()}>
                  Allow location
                </Button>
                {loc === "denied" ? (
                  <>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void openNativeSettings()}>
                      <Settings className="mr-1 h-3.5 w-3.5" />
                      Open settings
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void refresh()}>
                      Check again
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </li>

          <li className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <Mic className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Microphone</span>
                <Pill state={mic} />
              </div>
              <p className="mt-1 text-xs text-slate-400">Speech Coach and read-aloud features.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void requestMicPerm()}>
                  Allow microphone
                </Button>
                {mic === "denied" ? (
                  <>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void openNativeSettings()}>
                      <Settings className="mr-1 h-3.5 w-3.5" />
                      Open settings
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void refresh()}>
                      Check again
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </li>

          <li className="flex gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Notifications</span>
                <Pill state={push} />
              </div>
              <p className="mt-1 text-xs text-slate-400">Routines, school flow, and Amy reminders.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={busy} onClick={() => void requestPush()}>
                  Allow notifications
                </Button>
                {push === "denied" ? (
                  <>
                    <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void openNativeSettings()}>
                      <Settings className="mr-1 h-3.5 w-3.5" />
                      Open settings
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void refresh()}>
                      Check again
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4">
          <Button type="button" className="w-full" disabled={busy} onClick={() => void allowAll()}>
            Allow all (recommended)
          </Button>
          <Button type="button" variant="ghost" className="w-full text-slate-400" disabled={busy} onClick={onContinue}>
            Not now — ask again next app launch
          </Button>
        </div>
      </div>
    </div>
  );
}
