import { useEffect, useState } from "react";
import { Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  stopPhonicsPlayback,
  subscribePhonicsPlayback,
} from "@/lib/phonics-player";
import { cn } from "@/lib/utils";

/**
 * Always-available phonics stop control. Appears only while a phonics sound is
 * playing and instantly stops + resets playback ownership when tapped.
 */
export function PhonicsStopButton({ className }: { className?: string }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return subscribePhonicsPlayback((state) => setPlaying(state.playing));
  }, []);

  if (!playing) return null;

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={() => stopPhonicsPlayback("stop_button")}
      aria-label="Stop sound"
      data-testid="phonics-stop-button"
      className={cn(
        "fixed bottom-20 right-4 z-50 rounded-full shadow-lg gap-1.5 font-bold animate-in fade-in",
        className,
      )}
    >
      <Square className="h-4 w-4 fill-current" />
      Stop
    </Button>
  );
}
