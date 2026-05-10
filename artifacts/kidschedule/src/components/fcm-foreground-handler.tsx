/**
 * FCM foreground handler — no-op on the website.
 *
 * Notifications are delivered exclusively through the native FCM layer in the
 * KidSchedule Android WebView wrapper. The browser never registers a push
 * token, so no FCM foreground messages will arrive here.
 *
 * The component is kept as a placeholder so import sites do not need changes;
 * it simply renders null.
 */
export function FcmForegroundHandler() {
  return null;
}
