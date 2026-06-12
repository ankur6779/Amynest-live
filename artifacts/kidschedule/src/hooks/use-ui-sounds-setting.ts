import { useCallback, useEffect, useState } from "react";
import {
  isUiSoundsMuted,
  playUiSound,
  setUiSoundsMuted,
  subscribeUiSoundsMuted,
} from "@/lib/ui-sounds";

export function useUiSoundsSetting() {
  const [muted, setMuted] = useState(() => isUiSoundsMuted());

  useEffect(() => subscribeUiSoundsMuted(setMuted), []);

  const toggleMuted = useCallback((next: boolean) => {
    setUiSoundsMuted(next);
    setMuted(next);
  }, []);

  const previewSound = useCallback(() => {
    void playUiSound("celebration");
  }, []);

  return { muted, setMuted: toggleMuted, previewSound };
}
