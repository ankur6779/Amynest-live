import type { ActionTarget, RoutedAction } from "./types.js";
import { resolveDeepLinkPath, resolveRoutedAction } from "./resolver.js";
import { routedActionFromPayload, categoryToDefaultAction } from "./categories.js";

export interface NotificationActionPayload {
  actionTarget: ActionTarget;
  entityId: string;
  deepLink: string;
  fallbackTarget: ActionTarget;
  usedFallback: boolean;
  /** Serialized for FCM data payload (all string values). */
  data: Record<string, string>;
}

/** Build canonical FCM/web payload — every notification must include actionTarget. */
export function buildNotificationActionPayload(input: {
  category: string;
  deepLink?: string | null;
  data?: Record<string, unknown>;
}): NotificationActionPayload {
  const action = routedActionFromPayload({
    category: input.category,
    deepLink: input.deepLink ?? undefined,
    data: input.data,
  });
  const resolved = resolveRoutedAction(action);

  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.data ?? {})) {
    if (v != null) data[k] = String(v);
  }
  data.actionTarget = resolved.actionTarget;
  data.fallbackTarget = action.fallbackTarget ?? categoryToDefaultAction(input.category).fallbackTarget ?? "parent_hub";
  if (resolved.entityId != null) data.entityId = String(resolved.entityId);
  if (resolved.usedFallback) data.usedFallback = "true";

  return {
    actionTarget: resolved.actionTarget,
    entityId: resolved.entityId != null ? String(resolved.entityId) : "",
    deepLink: resolved.path,
    fallbackTarget: (action.fallbackTarget ?? "parent_hub") as ActionTarget,
    usedFallback: resolved.usedFallback,
    data,
  };
}

export function buildRoutedActionHref(action: RoutedAction): string {
  return resolveRoutedAction(action).path;
}
