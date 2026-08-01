/**
 * Route Registry types (Phase 10 Routing Constitution · Phase 12 S0-T02).
 */

/** Owning V2 system for a route entry. */
export type RouteSystemOwner =
  | "front_door"
  | "today"
  | "ask_amy"
  | "for_child"
  | "account"
  | "premium"
  | "migration"
  | "feature"
  | "public"
  | "debug"
  | "shell";

export type RouteLifecycle =
  | "canonical"
  | "alias"
  | "redirect"
  | "deprecated"
  | "archived_experience";

export type RouteRegistryEntry = {
  /** Path pattern as registered (no query). */
  path: string;
  /** Owning system per Engineering Constitution. */
  owner: RouteSystemOwner;
  /** Feature Registry id, shell id, or null for pure public/debug. */
  featureId: string | null;
  lifecycle: RouteLifecycle;
  /** When lifecycle is redirect/alias/deprecated, where traffic should go. */
  redirectTo?: string;
  notes?: string;
};

export type RouteRedirect = {
  from: string;
  to: string;
  reason: string;
};
