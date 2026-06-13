import { createContext, useContext } from "react";

export type HubRenderSurface = "main" | "previous" | "early";

export const HubRenderContext = createContext<{
  surface: HubRenderSurface;
  isInfant: boolean;
  /** Health Lab preview on the main hub for children under 23 months. */
  healthLabPreview?: boolean;
}>({ surface: "main", isInfant: false });

/** Infant parent browsing Section 2 ("Explore What's Next") — preview-only UX. */
export function useInfantDiscoveryPreview(): boolean {
  const { surface, isInfant, healthLabPreview } = useContext(HubRenderContext);
  return (isInfant && surface === "early") || !!healthLabPreview;
}

/**
 * Awards gaming-reward points the first time (per day) a parent engages with a
 * parent-hub section. The implementation is provided by the hub page; default
 * is a no-op so the hub tiles work in isolation (tests, storybook).
 */
export const HubSectionPointsContext = createContext<(sectionId: string) => void>(
  () => {},
);

export function useHubSectionPoints(): (sectionId: string) => void {
  return useContext(HubSectionPointsContext);
}
