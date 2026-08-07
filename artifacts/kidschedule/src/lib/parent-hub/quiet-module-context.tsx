import { createContext, useContext, type ReactNode } from "react";

/**
 * Pack 5 — Destination Experience Unification.
 * When true, Hub module chrome must continue the room (sanctuary),
 * never a product shelf / unlock theatre.
 */
const ParentHubQuietModuleContext = createContext(false);

export function ParentHubQuietModuleProvider({
  children,
  active = true,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <ParentHubQuietModuleContext.Provider value={active}>
      {children}
    </ParentHubQuietModuleContext.Provider>
  );
}

export function useParentHubQuietModule(): boolean {
  return useContext(ParentHubQuietModuleContext);
}
