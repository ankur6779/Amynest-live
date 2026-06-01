import { Capacitor } from "@capacitor/core";
import { playProceduralTone } from "@/lib/procedural-sfx";

let soundEnabled = true;

function playTone(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.04): void {
  if (!soundEnabled) return;
  playProceduralTone(freq, durationMs, type, gain);
}

async function nativeImpact(style: "light" | "medium" = "light"): Promise<void> {