export {
  initStartupFunnelTelemetry,
  trackStartupFunnel,
  trackStartupFunnelFailure,
  resetStartupFunnelTelemetryForTests,
} from "./tracker";
export {
  getStartupFunnelContext,
  elapsedMsFromLaunch,
  resetStartupFunnelContextForTests,
  getDeployVersion,
} from "./context";
export {
  flushStartupFunnelQueue,
  getStartupFunnelQueueSize,
  clearStartupFunnelQueueForTests,
} from "./queue";
export {
  getOrCreateInstallId,
  isFirstInstallOpen,
  getOrCreateFunnelSessionId,
  getLaunchTimestampMs,
  setLaunchTimestampMs,
  detectStartType,
} from "./install";
