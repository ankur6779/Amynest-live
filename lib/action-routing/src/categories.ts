import type { NotificationCategoryRoute, RoutedAction, ActionTarget } from "./types.js";
import {
  ACTION_ROUTE_REGISTRY,
  CAMPAIGN_TARGET_MAP,
  LEGACY_PATH_TO_TARGET,
  SURFACE_TO_TARGET,
} from "./registry.js";

/** Default ActionTarget per notification category. */
export const NOTIFICATION_CATEGORY_TARGETS: Record<NotificationCategoryRoute, ActionTarget> = {
  nutrition: "nutrition",
  parenting_tips: "parent_hub",
  learning_activity: "learning_subject",
  story_time: "story_time",
  routine: "routine",
  routine_item: "routine_task",
  engagement: "parent_hub",
  milestone: "milestone",
  weekly: "weekly_review",
  good_night: "routine",
  phonics: "phonics",
  insights: "amy_chat",
  campaigns: "campaign",
  streak_recovery: "routine",
  retention_intervention: "amy_chat",
};

export function categoryToDefaultAction(
  category: string,
  data?: Record<string, unknown>,
): RoutedAction {
  const key = category.toLowerCase().replace(/-/g, "_") as NotificationCategoryRoute;
  const actionTarget = NOTIFICATION_CATEGORY_TARGETS[key] ?? "parent_hub";

  const params: RoutedAction["params"] = {};
  if (data?.routineId != null) params.routineId = String(data.routineId);
  if (data?.itemIndex != null) params.itemIndex = Number(data.itemIndex);
  if (data?.campaignId != null) params.campaignId = String(data.campaignId);
  if (data?.campaignStep != null) params.campaignStep = Number(data.campaignStep);
  if (data?.lessonId != null) params.lessonId = String(data.lessonId);
  if (data?.goalId != null) params.goalId = String(data.goalId);
  if (data?.hubTile != null) params.hubTile = String(data.hubTile);

  const entityId =
    data?.routineId ??
    data?.campaignId ??
    data?.lessonId ??
    data?.goalId ??
    null;

  const def = ACTION_ROUTE_REGISTRY[actionTarget];
  return {
    actionTarget,
    entityId: entityId != null ? String(entityId) : null,
    params,
    fallbackTarget: def.fallbackTarget,
  };
}

export function surfaceToAction(
  surface: string,
  entityId?: string | number | null,
  params?: RoutedAction["params"],
): RoutedAction {
  const actionTarget = SURFACE_TO_TARGET[surface] ?? "parent_hub";
  const def = ACTION_ROUTE_REGISTRY[actionTarget];
  return {
    actionTarget,
    entityId: entityId ?? null,
    params,
    fallbackTarget: def.fallbackTarget,
  };
}

export function campaignStepToAction(
  campaignId: string,
  stepDay: number,
  legacyDeepLink?: string,
): RoutedAction {
  const actionTarget = CAMPAIGN_TARGET_MAP[campaignId] ?? "campaign";
  const def = ACTION_ROUTE_REGISTRY[actionTarget];
  const params: RoutedAction["params"] = {
    campaignId,
    campaignStep: stepDay,
  };

  if (legacyDeepLink) {
    const legacy = parseLegacyPathToAction(legacyDeepLink);
    if (legacy) {
      return {
        ...legacy,
        params: { ...legacy.params, campaignId, campaignStep: stepDay },
        fallbackTarget: def.fallbackTarget,
      };
    }
  }

  return {
    actionTarget,
    entityId: campaignId,
    params,
    fallbackTarget: def.fallbackTarget,
  };
}

export function parseLegacyPathToAction(rawPath: string): RoutedAction | null {
  const normalized = normalizeLegacyPath(rawPath);
  if (!normalized) return null;

  const [pathPart, hashPart] = normalized.split("#");
  const baseTarget = LEGACY_PATH_TO_TARGET[pathPart ?? ""];
  if (!baseTarget) return null;

  const params: RoutedAction["params"] = {};
  if (hashPart?.startsWith("tile-")) {
    params.hubTile = hashPart.replace(/^tile-/, "");
  }

  const def = ACTION_ROUTE_REGISTRY[baseTarget];
  return {
    actionTarget: baseTarget,
    params,
    fallbackTarget: def.fallbackTarget,
  };
}

export function normalizeLegacyPath(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : "";
      const path = url.pathname && url.pathname !== "/" ? url.pathname : "";
      return hash ? `${path}#${hash}` : path;
    } catch {
      return "";
    }
  }
  if (trimmed.startsWith("#/")) return `${trimmed.slice(1)}`;
  if (trimmed.startsWith("#")) {
    const inner = trimmed.slice(1);
    return inner.startsWith("/") ? inner : `/parenting-hub#${inner}`;
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function routedActionFromPayload(payload: {
  actionTarget?: string;
  entityId?: string | number | null;
  deepLink?: string;
  category?: string;
  params?: Record<string, unknown>;
  data?: Record<string, unknown>;
}): RoutedAction {
  const data = { ...payload.data, ...payload.params };

  if (payload.actionTarget && payload.actionTarget in ACTION_ROUTE_REGISTRY) {
    const actionTarget = payload.actionTarget as ActionTarget;
    const def = ACTION_ROUTE_REGISTRY[actionTarget];
    return {
      actionTarget,
      entityId: payload.entityId ?? data.routineId ?? data.campaignId ?? null,
      params: data as RoutedAction["params"],
      fallbackTarget: def.fallbackTarget,
    };
  }

  if (payload.deepLink) {
    const fromLegacy = parseLegacyPathToAction(payload.deepLink);
    if (fromLegacy) {
      const mergedParams = { ...fromLegacy.params, ...(data as RoutedAction["params"]) };
      if (
        (fromLegacy.actionTarget === "routine" || payload.category === "routine_item") &&
        mergedParams.routineId != null
      ) {
        fromLegacy.actionTarget = "routine_task";
      }
      return {
        ...fromLegacy,
        entityId: payload.entityId ?? mergedParams.routineId ?? fromLegacy.entityId,
        params: mergedParams,
      };
    }
  }

  if (payload.category) {
    return categoryToDefaultAction(payload.category, data);
  }

  return surfaceToAction("parent_hub");
}

