import { Capacitor } from "@capacitor/core";

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.04): void {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = gain;
  osc.connect(amp);
  amp.connect(ctx.destination);
  const now = ctx.currentTime;
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

async function nativeImpact(style: "light" | "medium" = "light"): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: style === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
      return;
    }
  } catch {
    /* optional */
  }
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(style === "medium" ? 20 : 8);
    }
  } catch {
    /* ignore */
  }
}

async function nativeNotification(type: "success" | "warning" | "error"): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      const map = {
        success: NotificationType.Success,
        warning: NotificationType.Warning,
        error: NotificationType.Error,
      } as const;
      await Haptics.notification({ type: map[type] });
      return;
    }
  } catch {
    /* optional */
  }
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(type === "success" ? [12, 30, 12] : type === "error" ? [30, 40, 30] : 15);
    }
  } catch {
    /* ignore */
  }
}

export function setGameSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
}

export function isGameSoundEnabled(): boolean {
  return soundEnabled;
}

export async function feedbackMove(): Promise<void> {
  playTone(520, 45, "sine", 0.025);
  await nativeImpact("light");
}

export async function feedbackCorrect(): Promise<void> {
  playTone(660, 70, "sine", 0.045);
  setTimeout(() => playTone(880, 90, "sine", 0.04), 70);
  await nativeNotification("success");
}

export async function feedbackWrong(): Promise<void> {
  playTone(220, 120, "triangle", 0.05);
  await nativeNotification("error");
}

export async function feedbackTap(): Promise<void> {
  playTone(440, 35, "sine", 0.02);
  await nativeImpact("light");
}
