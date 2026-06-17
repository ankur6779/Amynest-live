/**
 * Speech Coach / Talk with Amy mic prep — mirrors the Talking Amy path that
 * works on iOS/Android WebView (stop playback → release session → record).
 */
import { amyVoiceController } from "@/lib/amy-voice-controller";
import {
  prepareForMicrophoneAcquisition,
  stopAllPlayback,
} from "@/lib/audio-session-coordinator";
import { stopTalkingAmyEcho } from "@/lib/talking-amy-echo";
import { recordTtsUserGesture } from "@/lib/tts-guard";

export async function prepareCoachMicCapture(): Promise<void> {
  recordTtsUserGesture();
  stopTalkingAmyEcho();
  amyVoiceController.pause();
  await stopAllPlayback();
  await prepareForMicrophoneAcquisition();
}
