import type { RequestHandler } from "express";
import { Router } from "express";
import { asyncRoute } from "./async-route.js";

const WRAPPED = Symbol("asyncRouteWrapped");

type MaybeWrapped = RequestHandler & { [WRAPPED]?: true };

function isRouteHandler(fn: unknown): fn is RequestHandler {
  return typeof fn === "function";
}

function wrapIfNeeded(handler: RequestHandler): RequestHandler {
  const tagged = handler as MaybeWrapped;
  if (tagged[WRAPPED]) return handler;
  const wrapped = asyncRoute(handler as Parameters<typeof asyncRoute>[0]) as MaybeWrapped;
  wrapped[WRAPPED] = true;
  return wrapped;
}

/**
 * Patches Express Router so every async route handler is wrapped with asyncRoute().
 * Sync handlers (requireAuth, featureGate, etc.) pass through unchanged.
 */
export function installAsyncRouteGuard(): void {
  if ((Router as unknown as { __asyncGuardInstalled?: boolean }).__asyncGuardInstalled) return;
  (Router as unknown as { __asyncGuardInstalled?: boolean }).__asyncGuardInstalled = true;

  const methods = ["get", "post", "put", "patch", "delete", "all"] as const;

  for (const method of methods) {
    const original = Router.prototype[method] as (...args: unknown[]) => unknown;
    Router.prototype[method] = function patchedRouteMethod(...args: unknown[]) {
      const wrapped = args.map((arg) => {
        if (isRouteHandler(arg)) return wrapIfNeeded(arg);
        return arg;
      });
      return original.apply(this, wrapped);
    };
  }
}
