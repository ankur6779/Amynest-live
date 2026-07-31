// i18n-ignore-start — debug/dev tool: English-only by design
// audit-block-ignore-start — developer console uses intentional status colors
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trash2,
  X,
} from "lucide-react";
import {
  clearInspectorFrames,
  exportRuleEvaluation,
  exportRuntimeSession,
  exportRuntimeTrace,
  getInspectorActiveFrame,
  getInspectorBufferedCount,
  getInspectorFrames,
  getInspectorTransportStatus,
  getTimeTravelPosition,
  inspectorPause,
  inspectorResume,
  inspectorStepBackward,
  inspectorStepForward,
  isInspectorPaused,
  replayTraceFrames,
  setInspectorCursor,
  subscribeInspectorStore,
} from "@/lib/amy-runtime-inspector";
import { getLearningEventBus } from "@/lib/learning-events-bridge";
import {
  AttentionTimelineViz,
  DecisionTimelineViz,
  KnowledgeDiffViz,
  RuleGraphViz,
  SkillChangesViz,
} from "./visualizations";

type Tab =
  | "overview"
  | "events"
  | "rules"
  | "decision"
  | "graphs"
  | "export";

export function RuntimeInspectorConsole({
  onClose,
  embedded,
}: {
  onClose?: () => void;
  embedded?: boolean;
}) {
  const [, bump] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const [replayNote, setReplayNote] = useState<string | null>(null);

  useEffect(() => subscribeInspectorStore(() => bump((n) => n + 1)), []);

  const frames = getInspectorFrames();
  const frame = getInspectorActiveFrame();
  const pos = getTimeTravelPosition();
  const paused = isInspectorPaused();
  const buffered = getInspectorBufferedCount();
  const transport = useMemo(() => {
    let offline = 0;
    try {
      offline = getLearningEventBus().getOfflineQueue().length;
    } catch {
      offline = 0;
    }
    return getInspectorTransportStatus(offline);
  }, [frames.length, buffered, paused, pos.index]);

  const shell = embedded
    ? "rounded-xl border border-violet-500/30 bg-[#0b0a12] text-white shadow-xl"
    : "fixed bottom-4 right-4 z-[200] w-[min(100vw-1rem,420px)] max-h-[min(85vh,720px)] overflow-hidden rounded-xl border border-violet-500/40 bg-[#0b0a12] text-white shadow-2xl";

  return (
    <div className={shell} data-testid="amy-runtime-inspector">
      <header className="flex items-center gap-2 border-b border-white/10 px-3 py-2 bg-violet-950/40">
        <span className="text-[11px] font-semibold tracking-wide text-violet-200">
          Amy Runtime Inspector
        </span>
        <span className="text-[9px] font-mono text-white/40">
          DEV · {transport.framesCaptured} frames
        </span>
        <div className="flex-1" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Close inspector"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </header>

      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/10 bg-black/30">
        <IconBtn
          label="Step back"
          onClick={() => inspectorStepBackward()}
          icon={<SkipBack className="w-3 h-3" />}
        />
        <IconBtn
          label="Step forward"
          onClick={() => inspectorStepForward()}
          icon={<SkipForward className="w-3 h-3" />}
        />
        <IconBtn
          label={paused ? "Resume" : "Pause"}
          onClick={() => (paused ? inspectorResume() : inspectorPause())}
          icon={paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        />
        <IconBtn
          label="Clear"
          onClick={() => clearInspectorFrames()}
          icon={<Trash2 className="w-3 h-3" />}
        />
        <span className="ml-auto text-[9px] font-mono text-white/50">
          {pos.total ? `${pos.index + 1}/${pos.total}` : "0/0"}
          {paused ? ` · paused(+${buffered})` : ""}
        </span>
      </div>

      <div className="px-2 py-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, pos.total - 1)}
          value={Math.max(0, pos.index)}
          disabled={!pos.total}
          onChange={(e) => setInspectorCursor(Number(e.target.value))}
          className="w-full accent-violet-400"
        />
      </div>

      <nav className="flex flex-wrap gap-1 px-2 pb-2 border-b border-white/10">
        {(
          [
            ["overview", "Overview"],
            ["events", "Events"],
            ["rules", "Rules"],
            ["decision", "Decision"],
            ["graphs", "Graphs"],
            ["export", "Export"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`text-[9px] px-2 py-1 rounded border ${
              tab === id
                ? "border-violet-400/60 bg-violet-500/20 text-violet-100"
                : "border-white/10 text-white/50 hover:bg-white/5"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="overflow-y-auto max-h-[min(55vh,480px)] p-3 space-y-3 text-[11px]">
        {tab === "overview" && (
          <>
            <KV label="Transport" value={transport.online ? "online" : "offline"} />
            <KV label="Offline queue" value={String(transport.offlineQueueDepth)} />
            <KV label="Snapshot version" value={String(frame?.snapshotVersion ?? "—")} />
            <KV label="Latency" value={frame ? `${frame.latencyMs.toFixed(3)} ms` : "—"} />
            <KV label="Difficulty" value={frame?.decision.difficulty ?? "—"} />
            <KV
              label="Attention"
              value={
                frame
                  ? `${frame.attentionState.classification ?? "?"} (${frame.attentionState.score ?? "—"})`
                  : "—"
              }
            />
            <KV
              label="Break"
              value={frame?.decision.breakSuggestion ? "suggested" : "no"}
            />
            <Section title="Decision timeline">
              <DecisionTimelineViz frames={frames} />
            </Section>
            <Section title="Attention timeline">
              <AttentionTimelineViz frames={frames} />
            </Section>
          </>
        )}

        {tab === "events" && (
          <>
            <Section title="Incoming event">
              <Json
                value={
                  frame
                    ? {
                        id: frame.event.id,
                        type: frame.event.type,
                        seq: frame.event.seq,
                        module: frame.event.payload.module,
                        entityId: frame.event.payload.entityId,
                        conceptId: frame.event.payload.conceptId,
                        confidence: frame.event.payload.confidence,
                        metadata: frame.event.payload.metadata,
                      }
                    : null
                }
              />
            </Section>
            <Section title="Normalized">
              <Json value={frame?.normalized ?? null} />
            </Section>
            <Section title="Knowledge deltas">
              <KnowledgeDiffViz frame={frame} />
            </Section>
          </>
        )}

        {tab === "rules" && (
          <>
            <Section title="Matched rules">
              <Json value={frame?.matchedRules ?? []} />
            </Section>
            <Section title="Skipped rules">
              <Json value={frame?.skippedRules ?? []} />
            </Section>
            <Section title="Rule dependencies / graph">
              <RuleGraphViz frame={frame} />
            </Section>
            <Section title="Feature flags">
              <Json value={frame?.featureFlags ?? {}} />
            </Section>
          </>
        )}

        {tab === "decision" && (
          <>
            <KV label="Rule" value={frame?.decision.ruleId ?? "—"} />
            <KV label="Reason" value={frame?.decision.reason ?? "—"} />
            <KV label="Confidence" value={String(frame?.decision.confidence ?? "—")} />
            <Section title="Recommendation">
              <Json value={frame?.decision.recommendation ?? null} />
            </Section>
            <Section title="Review queue">
              <Json value={frame?.decision.reviewQueue ?? []} />
            </Section>
            <Section title="Full decision">
              <Json value={frame?.decision ?? null} />
            </Section>
            <Section title="Evidence">
              <Json value={frame?.decision.evidence ?? []} />
            </Section>
          </>
        )}

        {tab === "graphs" && (
          <>
            <Section title="Rule graph">
              <RuleGraphViz frame={frame} />
            </Section>
            <Section title="Knowledge graph diff">
              <KnowledgeDiffViz frame={frame} />
            </Section>
            <Section title="Skill changes">
              <SkillChangesViz frame={frame} />
            </Section>
            <Section title="Decision timeline">
              <DecisionTimelineViz frames={frames} />
            </Section>
            <Section title="Attention timeline">
              <AttentionTimelineViz frames={frames} />
            </Section>
          </>
        )}

        {tab === "export" && (
          <>
            <div className="flex flex-wrap gap-2">
              <ExportBtn
                label="Export session"
                onClick={() => exportRuntimeSession()}
              />
              <ExportBtn
                label="Export trace"
                onClick={() => exportRuntimeTrace()}
              />
              <ExportBtn
                label="Export rule eval"
                onClick={() => exportRuleEvaluation()}
              />
            </div>
            <Section title="Time travel replay">
              <div className="flex flex-wrap gap-2">
                <ExportBtn
                  label="Replay event"
                  icon={<RotateCcw className="w-3 h-3" />}
                  onClick={() => {
                    const r = replayTraceFrames("event");
                    setReplayNote(
                      `event → ${r.decisions.length} decision(s) · ${r.decisions[0]?.ruleId ?? "none"}`,
                    );
                  }}
                />
                <ExportBtn
                  label="Replay session"
                  icon={<ChevronRight className="w-3 h-3" />}
                  onClick={() => {
                    const r = replayTraceFrames("session");
                    setReplayNote(
                      `session → ${r.frames.length} frames · ${r.decisions.length} decisions`,
                    );
                  }}
                />
                <ExportBtn
                  label="Replay child history"
                  icon={<ChevronLeft className="w-3 h-3" />}
                  onClick={() => {
                    const r = replayTraceFrames("child");
                    setReplayNote(
                      `child → ${r.frames.length} frames · ${r.decisions.length} decisions`,
                    );
                  }}
                />
              </div>
              {replayNote && (
                <p className="mt-2 text-[10px] font-mono text-violet-200/80">{replayNote}</p>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-[9px] uppercase tracking-wider text-white/40 mb-1">{title}</h4>
      {children}
    </section>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[10px]">
      <span className="text-white/40 w-28 shrink-0">{label}</span>
      <span className="font-mono text-white/80 break-all">{value}</span>
    </div>
  );
}

function Json({ value }: { value: unknown }) {
  let text = "null";
  try {
    text = JSON.stringify(value, null, 2) ?? "null";
  } catch {
    text = String(value);
  }
  return (
    <pre className="text-[10px] leading-relaxed overflow-auto max-h-40 rounded bg-black/40 p-2 text-white/70 font-mono">
      {text}
    </pre>
  );
}

function IconBtn({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="p-1.5 rounded border border-white/10 hover:bg-white/10"
    >
      {icon}
    </button>
  );
}

function ExportBtn({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[10px] px-2 py-1.5 rounded border border-violet-400/40 bg-violet-500/10 hover:bg-violet-500/20"
    >
      {icon ?? <Download className="w-3 h-3" />}
      {label}
    </button>
  );
}
// audit-block-ignore-end
// i18n-ignore-end
