/**
 * Hub playback freeze — when a game modal is open the catalog must not keep
 * painting, animating previews, or competing for the main thread.
 */

import { createContext, useContext } from "react";

export interface GameHubPlaybackValue {
  /** True while a play/result modal covers the hub. */
  hubFrozen: boolean;
}

export const GameHubPlaybackContext = createContext<GameHubPlaybackValue>({
  hubFrozen: false,
});

export function useGameHubPlayback(): GameHubPlaybackValue {
  return useContext(GameHubPlaybackContext);
}
