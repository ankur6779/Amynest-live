/**
 * Disabled for Lighthouse/mobile startup: route chunks must load only after
 * explicit navigation or feature open, not from global tab-bar prediction.
 */
export function PostDashboardPrefetch() {
  return null;
}
