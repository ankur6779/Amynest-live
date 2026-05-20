import { useEffect } from "react";
import {
  getIosNativeMicrophoneGateState,
  isCapacitorIosNative,
  requestIosMicrophoneAccess,
} from "@/lib/mic-permission-capacitor";

/** Proactively show the iOS mic dialog before Speech Coach recording. */
export function usePrimeIosMicrophone(): void {
  useEffect(() => {
    if (!isCapacitorIosNative()) return;
    let cancelled = false;
    void (async () => {
      const state = await getIosNativeMicrophoneGateState();
      if (cancelled || state === "granted") return;
      await requestIosMicrophoneAccess();
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
