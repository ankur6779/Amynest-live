/**
 * Boot-time native shell marker — runs before React so Capacitor iOS CSS applies on first paint.
 */
(function () {
  try {
    var cap = window.Capacitor;
    if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
      document.documentElement.classList.add("amynest-native-shell", "dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.style.colorScheme = "dark";
    }
  } catch (_e) {
    /* ignore */
  }
})();
