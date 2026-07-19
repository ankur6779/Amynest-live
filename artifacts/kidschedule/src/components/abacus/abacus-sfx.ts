import { playProceduralTone } from "@/lib/procedural-sfx";

function playTone(freq: number, durationMs: number, type: OscillatorType = "sine", gain = 0.06) {
  playProceduralTone(freq, durationMs, type, gain);
}

export const abacusSfx = {
  bead: () => playTone(900, 60, "triangle", 0.04),
  correct: () => {
    playTone(660, 90, "sine", 0.06);
    setTimeout(() => playTone(990, 140, "sine", 0.06), 70);
  },
  wrong: () => playTone(220, 200, "sawtooth", 0.05),
  unlock: () => {
    playTone(523, 100);
    setTimeout(() => playTone(659, 100), 90);
    setTimeout(() => playTone(784, 180), 180);
  },
  celebrate: () => {
    playTone(523, 80);
    setTimeout(() => playTone(659, 80), 70);
    setTimeout(() => playTone(784, 80), 140);
    setTimeout(() => playTone(1046, 160), 210);
  },
};
