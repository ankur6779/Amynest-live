import { playStaticAudio } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";

/** Dev-only control to verify static GCS → API proxy → HTMLAudio playback. */
export function StaticAudioTestButton() {
  if (!import.meta.env.DEV) return null;

  return (
    <button
      type="button"
      onClick={() => {
        recordTtsUserGesture();
        void playStaticAudio("good job!");
      }}
      className="fixed bottom-4 right-4 z-[9999] rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-violet-500"
      data-testid="static-audio-test"
    >
      Test Audio
    </button>
  );
}
