/**
 * Route Registry (Sprint 0 · S0-T02).
 * Authoritative path owners + migration redirect map.
 * Does not mount routes in AppCore (S0-T06 / later sprints).
 */

export { V2_ROUTE_REGISTRY, getRouteEntry } from "./catalog";
export { V2_ROUTE_REDIRECTS, getRedirectTarget } from "./redirects";
export { resolveRegisteredRoute, type ResolvedRoute } from "./resolve";
export {
  assertRouteRegistryValid,
  validateRouteRegistry,
  type RouteRegistryValidationIssue,
} from "./validate";
export type {
  RouteLifecycle,
  RouteRedirect,
  RouteRegistryEntry,
  RouteSystemOwner,
} from "./types";
