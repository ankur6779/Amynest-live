import type { RouteDefinition } from "./types.js";
import { ACTION_ROUTE_REGISTRY } from "./registry.js";

export function fillPathTemplate(
  template: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  let path = template;
  const safe = params ?? {};
  path = path.replace(/:([a-zA-Z]+)/g, (_, key: string) => {
    const val = safe[key];
    return val != null ? encodeURIComponent(String(val)) : "";
  });
  if (path.includes("//") || /\/:$/.test(path)) {
    return "";
  }
  return path;
}

function appendQuery(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
  excludeKeys?: Set<string>,
): string {
  if (!params) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (excludeKeys?.has(k)) continue;
    if (v == null || v === "") continue;
    if (path.includes(`:${k}`)) continue;
    qs.set(k, String(v));
  }
  const q = qs.toString();
  return q ? `${path}${path.includes("?") ? "&" : "?"}${q}` : path;
}

function applyHubTileHash(
  path: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  const tile = params?.hubTile;
  if (tile && path === "/parenting-hub") {
    return `/parenting-hub#tile-${tile}`;
  }
  if (path.includes("#tile-:tileId") && tile) {
    return path.replace(":tileId", String(tile));
  }
  return path;
}

export function resolvePathFromDefinition(
  def: RouteDefinition,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  let path = fillPathTemplate(def.path, params);
  path = applyHubTileHash(path, params);

  const required = def.requiredParams ?? [];
  const missingRequired = required.some((k) => {
    const v = params?.[k];
    return v == null || v === "";
  });

  if (!path || missingRequired) {
    const fallbackDef = ACTION_ROUTE_REGISTRY[def.fallbackTarget];
    path = applyHubTileHash(fallbackDef.path, params);
    path = fillPathTemplate(path, params) || fallbackDef.path;
  }

  const paramKeys = new Set([
    ...(def.requiredParams ?? []),
    "routineId",
    "hubTile",
    "tileId",
  ]);
  return appendQuery(path, params, paramKeys);
}

export function appendQueryToPath(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  return appendQuery(path, params);
}
