/** Kill-switch: AMYNEST_LAUNCH_VALIDATOR=0 skips the pre-upload gate. */
export function isLaunchValidatorEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_LAUNCH_VALIDATOR !== "0";
}
