import { listFeaturePageSlugs } from "@/lib/marketing/feature-pages";
import { listAsOLandingPaths } from "@/lib/marketing/aso-landing-pages";
import { listGuideSlugs } from "@/lib/marketing/guides-content";
import {
  listFeedingPlanSlugs,
  listRoutineByAgeSlugs,
} from "@/lib/marketing/programmatic-pages";

/** Public marketing routes eligible for prerender, sitemap, and SEO validation. */
export type SeoRouteEntry = {
  path: string;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
  prerender?: boolean;
};

const STATIC_MARKETING_ROUTES: SeoRouteEntry[] = [
  { path: "/", changefreq: "weekly", priority: 1.0, prerender: true },
  { path: "/get-app", changefreq: "weekly", priority: 0.95, prerender: true },
  { path: "/guides", changefreq: "weekly", priority: 0.8, prerender: true },
  { path: "/sign-up", changefreq: "monthly", priority: 0.8, prerender: true },
  { path: "/sign-in", changefreq: "monthly", priority: 0.5, prerender: true },
  { path: "/privacy", changefreq: "yearly", priority: 0.4, prerender: true },
  { path: "/terms", changefreq: "yearly", priority: 0.4, prerender: true },
  { path: "/about", changefreq: "yearly", priority: 0.5, prerender: true },
  { path: "/support", changefreq: "monthly", priority: 0.5, prerender: true },
];

export function listAllSeoRoutes(): SeoRouteEntry[] {
  const featureRoutes: SeoRouteEntry[] = listFeaturePageSlugs().map((slug) => ({
    path: `/features/${slug}`,
    changefreq: "monthly" as const,
    priority: 0.85,
    prerender: true,
  }));

  const guideRoutes: SeoRouteEntry[] = listGuideSlugs().map((slug) => ({
    path: `/guides/${slug}`,
    changefreq: "monthly" as const,
    priority: 0.75,
    prerender: true,
  }));

  const routineRoutes: SeoRouteEntry[] = listRoutineByAgeSlugs().map((slug) => ({
    path: `/routine-by-age/${slug}`,
    changefreq: "monthly" as const,
    priority: 0.7,
    prerender: true,
  }));

  const feedingRoutes: SeoRouteEntry[] = listFeedingPlanSlugs().map((slug) => ({
    path: `/feeding-plan/${slug}`,
    changefreq: "monthly" as const,
    priority: 0.7,
    prerender: true,
  }));

  const asoRoutes: SeoRouteEntry[] = listAsOLandingPaths().map((path) => ({
    path,
    changefreq: "weekly" as const,
    priority: 0.9,
    prerender: true,
  }));

  return [
    ...STATIC_MARKETING_ROUTES,
    ...asoRoutes,
    ...featureRoutes,
    ...guideRoutes,
    ...routineRoutes,
    ...feedingRoutes,
  ];
}

export function listPrerenderPaths(): string[] {
  return listAllSeoRoutes()
    .filter((route) => route.prerender !== false)
    .map((route) => route.path);
}
