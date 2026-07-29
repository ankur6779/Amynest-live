/** Kill-switch: AMYNEST_CONTINUOUS_LEARNING=0 disables learning ingest. */
export function isContinuousLearningEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_CONTINUOUS_LEARNING !== "0";
}
