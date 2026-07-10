import { useEffect, useState } from "react";
import { AmyTalkingHead } from "@/components/amy-3d/amy-talking-head";
import { setQaFaceOverride } from "@/components/amy-3d/avatar/qa-face-override";

function readFaceHoldFromUrl(): "none" | "blink" | "talk" {
  try {
    const hold = new URLSearchParams(window.location.search).get("faceHold");
    if (hold === "blink" || hold === "talk") return hold;
  } catch {
    /* ignore */
  }
  return "none";
}

// TEMP dev-only QA harness for verifying Amy front-facing + framing + talk anim.
export default function AmyAvatarQaPage() {
  const [mode, setMode] = useState<"waiting" | "speaking" | "listening" | "idle">(
    "waiting",
  );
  const [vo, setVo] = useState(-0.8);
  const [ms, setMs] = useState(1);
  const [faceHold, setFaceHold] = useState<"none" | "blink" | "talk">(() =>
    typeof window !== "undefined" ? readFaceHoldFromUrl() : "none",
  );

  const applyFaceHold = (next: "none" | "blink" | "talk") => {
    setFaceHold(next);
    if (next === "blink") setQaFaceOverride({ blink: 0.9, mouthOpen: 0 });
    else if (next === "talk") setQaFaceOverride({ blink: 0, mouthOpen: 0.65 });
    else setQaFaceOverride(null);
    const url = new URL(window.location.href);
    if (next === "none") url.searchParams.delete("faceHold");
    else url.searchParams.set("faceHold", next);
    window.history.replaceState({}, "", url.toString());
  };

  useEffect(() => {
    const initial = readFaceHoldFromUrl();
    if (initial !== "none") applyFaceHold(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount sync from URL only
  }, []);

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
        {(["none", "blink", "talk"] as const).map((h) => (
          <button
            key={h}
            onClick={() => applyFaceHold(h)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: faceHold === h ? "2px solid #22d3ee" : "1px solid #555",
              background: faceHold === h ? "#0e3a45" : "transparent",
              color: "#fff",
            }}
          >
            face:{h}
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
