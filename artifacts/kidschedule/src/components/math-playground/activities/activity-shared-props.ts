import type { PlaygroundEngagementApi } from "../hooks/usePlaygroundEngagement";
import type { usePlaygroundAmy } from "../hooks/usePlaygroundAmy";

export interface ActivitySharedProps {
  amy: ReturnType<typeof usePlaygroundAmy>;
  accentColor: string;
  onComplete: (hintsUsed: number) => void;
  engagement?: PlaygroundEngagementApi;
  childId?: number;
}
