/** Kill-switch: AMYNEST_CONTENT_INTELLIGENCE=0 disables the pre-script gate. */
export function isContentIntelligenceEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.AMYNEST_CONTENT_INTELLIGENCE !== "0";
}
