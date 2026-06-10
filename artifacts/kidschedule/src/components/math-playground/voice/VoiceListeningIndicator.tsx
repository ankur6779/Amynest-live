import { motion } from "framer-motion";

interface VoiceListeningIndicatorProps {
  listening: boolean;
  transcribing: boolean;
  transcript: string;
  interimTranscript: string;
  accentColor: string;
}

export function VoiceListeningIndicator({
  listening,
  transcribing,
  transcript,
  interimTranscript,
  accentColor,
}: VoiceListeningIndicatorProps) {
  const display = transcript || interimTranscript;
  const active = listening || transcribing;

  return (
    <div
      className="rounded-xl px-3 py-3 mb-3 text-center"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: `1px solid ${active ? `${accentColor}66` : "rgba(255,255,255,0.1)"}`,
      }}
    >
      <motion.div
        className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-2"
        style={{ background: active ? `${accentColor}33` : "rgba(255,255,255,0.08)" }}
        animate={listening ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ repeat: listening ? Infinity : 0, duration: 1 }}
      >
        <span className="text-2xl">{transcribing ? "✨" : listening ? "🎤" : "👂"}</span>
      </motion.div>
      <p className="text-[10px] font-bold text-white/50 uppercase tracking-wide">
        {transcribing ? "Thinking..." : listening ? "Listening..." : "Ready"}
      </p>
      {display && (
        <p className="text-sm font-bold text-white/90 mt-2 min-h-[1.25rem]">{display}</p>
      )}
    </div>
  );
}
