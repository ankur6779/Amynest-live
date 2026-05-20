import { useEffect } from "react";
import { setupForegroundNotifications } from "@/lib/firebase";

/** Keeps Android/desktop PWA foreground FCM visible after reloads. */
export function FcmForegroundHandler() {
  useEffect(() => {
    void setupForegroundNotifications();
  }, []);

  return null;
}
