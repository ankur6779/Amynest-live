import { useState } from "react";
import { AmyTalkingHead } from "@/components/amy-3d/amy-talking-head";

// TEMP dev-only QA harness for verifying Amy front-facing + framing + talk anim.
export default function AmyAvatarQaPage() {
  const [mode, setMode] = useState<"waiting" | "speaking" | "listening" | "idle">(
    "waiting",
  );
  const [vo, setVo] = useState(-0.8);
  const [ms, setMs] = useState(1);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1a2e", color: "#fff", padding: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {(["waiting", "speaking", "listening", "idle"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: mode === m ? "2px solid #a855f7" : "1px solid #555",
              background: mode === m ? "#3b1d6e" : "transparent",
              color: "#fff",
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 13 }}>
        <label>
          vOffset {vo.toFixed(2)}
          <input type="range" min={-1.2} max={0.3} step={0.05} value={vo}
            onChange={(e) => setVo(Number(e.target.value))} />
        </label>
        <label>
          scale {ms.toFixed(2)}
          <input type="range" min={0.5} max={1.4} step={0.05} value={ms}
            onChange={(e) => setMs(Number(e.target.value))} />
        </label>
      </div>
      {/* phone-like column to judge real framing */}
      <div style={{ width: 360, margin: "0 auto", border: "1px dashed #444", minHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AmyTalkingHead
            size={320}
            waitingForSession={mode === "waiting"}
            speaking={mode === "speaking"}
            listening={mode === "listening"}
            modelScale={ms}
            verticalOffset={vo}
          />
        </div>
        <div style={{ padding: 16, textAlign: "center", opacity: 0.6 }}>[start button area]</div>
      </div>
    </div>
  );
}
