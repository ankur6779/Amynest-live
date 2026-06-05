import type { ComponentType } from "react";
import { normalizeRoutePath } from "@/lib/route-chunk-preload";
import { DashboardSkeleton } from "@/components/route-skeletons/dashboard-skeleton";
import { ParentingHubSkeleton } from "@/components/route-skeletons/parenting-hub-skeleton";
import { NutritionHubSkeleton } from "@/components/route-skeletons/nutrition-hub-skeleton";
import { CreativityHubSkeleton } from "@/components/route-skeletons/creativity-hub-skeleton";
import { ProfileSkeleton } from "@/components/route-skeletons/profile-skeleton";
import { GenericRouteSkeleton } from "@/components/route-skeletons/generic-route-skeleton";

const ROUTE_SKELETONS: Record<string, ComponentType> = {
  "/dashboard": DashboardSkeleton,
  "/parenting-hub": ParentingHubSkeleton,
  "/nutrition": NutritionHubSkeleton,
  "/games": CreativityHubSkeleton,
  "/parent-profile": ProfileSkeleton,
};

export function resolveRouteSkeleton(pathname: string): ComponentType {
  const path = normalizeRoutePath(pathname);
  return ROUTE_SKELETONS[path] ?? GenericRouteSkeleton;
}
