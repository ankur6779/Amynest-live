import { useCallback } from "react";
import { useLocation } from "wouter";
import type { ActionTarget, RoutedAction } from "@workspace/action-routing";
import { resolveRoutedAction } from "@workspace/action-routing";
import { normalizeRoutePath } from "@/lib/navigation-stack";
import { safeNavigate } from "@/lib/navigation-orchestrator";
import { trackDeepLinkEvent } from "@/lib/deep-link-analytics";

export interface HubRoutedActionLike {
  actionTarget: ActionTarget;
  entityId?: string | number | null;
  href: string;
  fallbackTarget?: ActionTarget;
  params?: RoutedAction["params"];
}

export interface NavigateActionOptions {
  source: "notification" | "amy_recommendation" | "hub_card" | "campaign";
  category?: string;
}

export function useActionNavigation() {
  const [location, navigate] = useLocation();

  const navigateAction = useCallback(
    (action: HubRoutedActionLike | RoutedAction, opts: NavigateActionOptions) => {
      const resolved =
        "href" in action && action.href
          ? {
              path: action.href,
              actionTarget: action.actionTarget as ActionTarget,
              usedFallback: false,
              entityId: action.entityId,
            }
          : resolveRoutedAction({
              actionTarget: action.actionTarget as ActionTarget,
              entityId: action.entityId,
              params: "params" in action ? action.params : undefined,
              fallbackTarget: "fallbackTarget" in action ? action.fallbackTarget : undefined,
            });

      trackDeepLinkEvent("deep_link_opened", {
        actionTarget: resolved.actionTarget,
        path: resolved.path,
        category: opts.category,
        entityId: resolved.entityId,
        usedFallback: resolved.usedFallback,
        source: opts.source,
      });

      const from = normalizeRoutePath(location || "/");
      const ok = safeNavigate(from, resolved.path, {
        source: `action-routing:${opts.source}`,
        trigger: "user",
      });
      if (!ok) navigate(resolved.path);

      trackDeepLinkEvent("destination_loaded", {
        actionTarget: resolved.actionTarget,
        path: resolved.path,
        category: opts.category,
        entityId: resolved.entityId,
        source: opts.source,
      });

      return resolved;
    },
    [location, navigate],
  );

  return { navigateAction };
}
