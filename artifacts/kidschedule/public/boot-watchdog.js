/**
 * Boot watchdog (ES5). Logic must match src/lib/boot-watchdog.ts — see boot-watchdog.test.ts
 */
(function (global) {
  var PROGRESS_WINDOW_MS = 6000;
  var EXTEND_MS = 16000;

  function evaluateBootWatchdog(input) {
    var phases = input.phases || [];
    var startup = input.startup;
    var now = input.now;
    var progressWindowMs =
      typeof input.progressWindowMs === "number"
        ? input.progressWindowMs
        : PROGRESS_WINDOW_MS;

    if (phases.indexOf("react-rendered") !== -1) {
      return { action: "ok" };
    }
    if (startup && startup.reactRendered) {
      return { action: "ok" };
    }

    var hasBundle = phases.indexOf("bundle-loaded") !== -1;
    var hasBundleLoading = phases.indexOf("bundle-loading") !== -1;
    var recentProgress =
      startup &&
      startup.lastProgressAt &&
      now - startup.lastProgressAt < progressWindowMs;

    var extendCount =
      typeof input.bootWatchdogExtendCount === "number"
        ? input.bootWatchdogExtendCount
        : input.bootWatchdogExtended
          ? 1
          : 0;
    var maxExtend = hasBundleLoading && !hasBundle ? 2 : 1;

    if ((hasBundle || hasBundleLoading || recentProgress) && extendCount < maxExtend) {
      return { action: "extend", extendMs: EXTEND_MS };
    }

    return { action: "fail", reason: "no_react_render" };
  }

  global.__amynestEvaluateBootWatchdog = evaluateBootWatchdog;
})(typeof window !== "undefined" ? window : globalThis);
