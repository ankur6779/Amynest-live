// i18n-ignore-start — developer diagnostics panel
import { useEffect, useState } from "react";
import { useDebugMode } from "@/contexts/debug-context";
import {
  getAudioPipelineEvents,
  getAudioPipelineSnapshot,
  isDebugAudioPipelineEnabled,
  subscribeAudioPipelineDebug,
} from "@/lib/debug-audio-pipeline";

const READY_LABELS: Record<number, string> = {
  0: "HAVE_NOTHING",
  1: "HAVE_METADATA",
  2: "HAVE_CURRENT_DATA",
  3: "HAVE_FUTURE_DATA",
  4: "HAVE_ENOUGH_DATA",
};

type AudioDiagnosticsPanelProps = {
  paragraphIdx: number;
  lessonId: string;
  intent: "idle" | "playing";
  playbackError: string | null;
};

export function AudioDiagnosticsPanel({
  paragraphIdx,
  lessonId,
  intent,
  playbackError,
}: AudioDiagnosticsPanelProps) {
  const { debugMode } = useDebugMode();
  const [open, setOpen] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    if (!isDebugAudioPipelineEnabled()) return;
    return subscribeAudioPipelineDebug(() => bump((n) => n + 1));
  }, []);

  if (!debugMode || !isDebugAudioPipelineEnabled()) return null;

  const snap = getAudioPipelineSnapshot();
  const events = getAudioPipelineEvents().slice(-12).reverse();
  const el = snap.element;

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{
        marginBottom: 12,
        borderRadius: 10,
        border: "1px solid rgba(139,92,246,0.35)",
        background: "rgba(0,0,0,0.35)",
        padding: "8px 10px",
        fontSize: 11,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        color: "#d4c8ff",
      }}
    >
      <summary style={{ cursor: "pointer", fontWeight: 700, color: "#c4b5fd" }}>
        Audio Diagnostics (DEBUG_AUDIO_PIPELINE)
      </summary>
      <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
        <Row label="State machine" value={snap.stateMachine} />
        <Row label="Intent" value={intent} />
        <Row label="Paragraph" value={`${paragraphIdx} (${lessonId})`} />
        <Row label="Audio URL" value={snap.audioUrl ?? "(none)"} />
        <Row label="Map ready" value={snap.mapReady ? "yes" : "NO — lookup will miss"} />
        <Row label="Watchdog" value={snap.watchdogStatus ?? "(n/a)"} />
        <Row label="Last play error" value={snap.lastError ?? "(none)"} />
        <Row label="playbackError" value={playbackError ?? "(none)"} />
        {el ? (
          <>
            <Row label="readyState" value={`${el.readyState} ${READY_LABELS[el.readyState] ?? ""}`} />
            <Row label="networkState" value={String(el.networkState)} />
            <Row label="currentTime" value={`${el.currentTime.toFixed(2)}s`} />
            <Row label="duration" value={Number.isFinite(el.duration) ? `${el.duration.toFixed(2)}s` : "NaN"} />
            <Row label="paused" value={String(el.paused)} />
            <Row label="ended" value={String(el.ended)} />
            <Row label="mediaError" value={el.mediaErrorCode != null ? String(el.mediaErrorCode) : "(none)"} />
            <Row label="src tail" value={el.srcTail} />
          </>
        ) : (
          <Row label="Element" value="(no active speech element)" />
        )}
        <div style={{ marginTop: 6, fontWeight: 700, color: "#a78bfa" }}>Recent events</div>
        {events.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No events yet — tap Play</div>
        ) : (
          events.map((ev, i) => (
            <div key={`${ev.ts}-${i}`} style={{ opacity: 0.9, lineHeight: 1.35 }}>
              {new Date(ev.ts).toISOString().slice(11, 23)} {ev.event}
              {ev.detail?.error ? ` err=${String(ev.detail.error)}` : ""}
            </div>
          ))
        )}
      </div>
    </details>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <span style={{ color: "#a99fd9", minWidth: 110 }}>{label}:</span>
      <span style={{ color: "#f3f0ff", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}
