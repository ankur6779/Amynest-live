import type { RealtimeDiagnostics } from "../hooks/use-speech-coach-v2-realtime";

function stepLabel(
  value: RealtimeDiagnostics[keyof Pick<RealtimeDiagnostics, "mic" | "token" | "sdp" | "audio">],
): string {
  if (value === "ok") return "PASS";
  if (value === "fail") return "FAIL";
  return "…";
}

export function RealtimeDiagnosticsPanel(props: { diagnostics: RealtimeDiagnostics }) {
  const { diagnostics } = props;

  return (
    <div className="mt-3 w-full max-w-sm rounded-xl bg-black/40 p-3 text-left text-[11px] text-white/80">
      <p className="font-semibold text-white/90">Realtime Diagnostics</p>
      {diagnostics.model && (
        <p className="text-white/70">Model: {diagnostics.model}</p>
      )}
      <p>
        Mic: {stepLabel(diagnostics.mic)} · Token: {stepLabel(diagnostics.token)} · SDP:{" "}
        {stepLabel(diagnostics.sdp)} · Audio: {stepLabel(diagnostics.audio)}
      </p>
      {diagnostics.lastError && (
        <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-red-300">
          Last Error: {diagnostics.lastError.slice(0, 400)}
        </pre>
      )}
    </div>
  );
}
