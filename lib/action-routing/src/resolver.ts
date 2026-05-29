import type { ActionTarget, ResolvedRoute, RoutedAction } from "./types.js";
import { ACTION_ROUTE_REGISTRY } from "./registry.js";
import { resolvePathFromDefinition, appendQueryToPath } from "./path-builder.js";
import { routedActionFromPayload } from "./categories.js";

export function resolveRoutedAction(action: RoutedAction): ResolvedRoute {
  const def = ACTION_ROUTE_REGISTRY[action.actionTarget];
  const params = {
    ...action.params,
    ...(action.entityId != null && !action.params?.routineId && action.actionTarget === "routine_task"
      ? { routineId: action.entityId }
      : {}),
    ...(action.entityId != null && action.actionTarget === "goal"
      ? { goalId: action.entityId }
      : {}),
    ...(action.entityId != null && action.actionTarget === "learning_lesson"
      ? { lessonId: action.entityId }
      : {}),
    ...(action.entityId != null && action.actionTarget === "campaign"
      ? { campaignId: action.entityId }
      : {}),
  };

  let path = resolvePathFromDefinition(def, params);
  let usedFallback = false;
  let resolvedTarget: ActionTarget = action.actionTarget;

  const required = def.requiredParams ?? [];
  const missingRequired = required.some((k) => {
    const v = params[k as keyof typeof params];
    return v == null || v === "";
  });

  if (missingRequired && action.fallbackTarget) {
    const fallbackDef = ACTION_ROUTE_REGISTRY[action.fallbackTarget];
    path = resolvePathFromDefinition(fallbackDef, {
      ...params,
      ...(action.fallbackParams as typeof params),
    });
    resolvedTarget = action.fallbackTarget;
    usedFallback = true;
  }

  if (action.actionTarget === "amy_chat" && params?.q) {
    path = appendQueryToPath(path, { q: params.q });
  }

  if (action.actionTarget === "goal" && action.entityId) {
    path = appendQueryToPath(path, {
      goalId: action.entityId,
      q: `How are we doing on goal ${action.entityId}?`,
    });
  }

  return {
    path: path || "/parenting-hub",
    actionTarget: resolvedTarget,
    usedFallback,
    entityId: action.entityId,
  };
}

/** Resolve legacy deepLink + category to a canonical SPA path. */
export function resolveDeepLinkPath(
  rawPath: string | null | undefined,
  category?: string | null,
  data?: Record<string, unknown>,
): ResolvedRoute {
  const action = routedActionFromPayload({
    deepLink: rawPath ?? undefined,
    category: category ?? undefined,
    data,
  });
  return resolveRoutedAction(action);
}
