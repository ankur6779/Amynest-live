import { IS_PROD } from "@/lib/is-dev";
import { playStaticAudio } from "@/lib/static-audio";
import { recordTtsUserGesture } from "@/lib/tts-guard";

/** Emergency control to verify static GCS → API proxy → HTMLAudio playback. */
export function StaticAudioTestButton() {
  if (IS_PROD) return null;

  return (
    <button
      type="button"
      onClick={() => {
        recordTtsUserGesture();
        void playStaticAudio("good job!");
      }}
      className="fixed bottom-4 right-4 z-[9999] rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-lg hover:bg-violet-500"
      data-testid="static-audio-test"
    >
      TEST AUDIO
    </button>
  );
}
