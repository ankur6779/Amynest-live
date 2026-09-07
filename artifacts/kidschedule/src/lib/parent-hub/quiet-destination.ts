import { useParentHubQuietModule } from "@/lib/parent-hub/quiet-module-context";

/**
 * Rooms already chose this destination. Do not hide the body behind a
 * second collapsed Hub tile click.
 */
export function useQuietDestinationDefaultOpen(defaultOpen: boolean): boolean {
  const quietRoom = useParentHubQuietModule();
  return defaultOpen || quietRoom;
}
