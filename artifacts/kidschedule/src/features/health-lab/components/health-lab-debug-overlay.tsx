import type { MotionSensorState } from "../types";

interface Props {
  sensor: Pick<
    MotionSensorState,
    "tiltX" | "tiltY" | "confidence" | "trackingQuality" | "sensorHealth" | "variance" | "stabilityPercent" | "simulated"
  >;
}

/** Dev-only motion debug overlay — visible when import.meta.env.DEV */
export function HealthLabMotionDebugOverlay({ sensor }: Props) {
  if (!import.meta.env.DEV) return null;

  const rows = [
    { label: "Tilt X", value: sensor.tiltX.toFixed(3) },
    { label: "Tilt Y", value: sensor.tiltY.toFixed(3) },
    { label: "Variance", value: sensor.variance.toFixed(4) },
    { label: "Stability", value: `${Math.round(sensor.stabilityPercent)}%` },
    { label: "Confidence", value: `${Math.round(sensor.confidence)}%` },
    { label: "Tracking", value: sensor.trackingQuality },
    { label: "Sensor", value: sensor.sensorHealth },
    { label: "Mode", value: sensor.simulated ? "simulated" : "live" },
  ];

  return (
    <div
      className="pointer-events-none fixed bottom-4 left-4 z-[9999] rounded-xl border border-emerald-500/30 bg-black/80 px-3 py-2 font-mono text-[10px] text-emerald-300 backdrop-blur-md"
      aria-hidden
    >
      <p className="mb-1 font-bold text-emerald-400">MOTION DEBUG</p>
      {rows.map((r) => (
        <div key={r.label} className="flex gap-2">
          <span className="w-16 text-emerald-500/70">{r.label}</span>
          <span>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
