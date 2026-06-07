import { createContext, useContext } from "react";

export type HubRenderSurface = "main" | "previous" | "early";

export const HubRenderContext = createContext<{
  surface: HubRenderSurface;
  isInfant: boolean;
}>({ surface: "main", isInfant: false });

/** Infant parent browsing Section 2 ("Explore What's Next") — preview-only UX. */
export function useInfantDiscoveryPreview(): boolean {
  const { surface, isInfant } = useContext(HubRenderContext);
  return isInfant && surface === "early";
}
