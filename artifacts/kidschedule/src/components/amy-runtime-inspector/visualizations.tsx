// i18n-ignore-start — debug/dev tool: English-only by design
import type { RuntimeTraceFrame } from "@workspace/learning-runtime";
import { DEFAULT_RUNTIME_RULES } from "@workspace/learning-runtime";

export function RuleGraphViz({ frame }: { frame: RuntimeTraceFrame | null }) {
  const rules = DEFAULT_RUNTIME_RULES;
  const matched = new Set(frame?.matchedRules.map((m) => m.ruleId) ?? []);
  const skipped = new Set(frame?.skippedRules.map((s) => s.ruleId) ?? []);

  return (
    <div className="space-y-1 max-h-48 overflow-auto">
      {rules.map((r) => {
        const tone = matched.has(r.id)
          ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-200"
          : skipped.has(r.id)
            ? "border-amber-500/40 bg-amber-950/20 text-amber-100/80"
            : "border-white/10 bg-black/20 text-white/50";
        return (
          <div
            key={r.id}
            className={`rounded border px-2 py-1 text-[10px] font-mono ${tone}`}
          >
            <div className="flex justify-between gap-2">
              <span>{r.id}</span>
              <span className="opacity-70">p{r.priority}</span>
            </div>
            {(r.dependsOn?.length ?? 0) > 0 && (
              <div className="opacity-60 mt-0.5">
                depends → {(r.dependsOn ?? []).join(", ")}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function KnowledgeDiffViz({ frame }: { frame: RuntimeTraceFrame | null }) {
  if (!frame) return <EmptyViz label="No knowledge delta" />;
  const d = frame.knowledgeDelta;
  return (
    <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
      <DeltaCol title="+ struggling" items={d.strugglingAdded} tone="text-amber-300" />
      <DeltaCol title="+ forgotten" items={d.forgottenAdded} tone="text-red-300" />
      <DeltaCol title="+ mastered" items={d.masteredAdded} tone="text-emerald-300" />
    </div>
  );
}

function DeltaCol({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div className="rounded border border-white/10 bg-black/20 p-1.5 min-h-[48px]">
      <div className="text-[9px] uppercase tracking-wider text-white/40 mb-1">{title}</div>
      {items.length === 0 ? (
        <div className="text-white/30">—</div>
      ) : (
        items.map((id) => (
          <div key={id} className={`truncate ${tone}`}>
            {id}
          </div>
        ))
      )}
    </div>
  );
}

export function DecisionTimelineViz({ frames }: { frames: readonly RuntimeTraceFrame[] }) {
  const slice = frames.slice(-40);
  if (!slice.length) return <EmptyViz label="No decisions yet" />;
  return (
    <div className="flex items-end gap-0.5 h-16 overflow-x-auto">
      {slice.map((f) => {
        const h = Math.max(8, Math.min(56, (f.decision.confidence / 100) * 56));
        const color =
          f.decision.breakSuggestion
            ? "bg-amber-400"
            : f.decision.celebrationLevel >= 2
              ? "bg-emerald-400"
              : "bg-violet-400";
        return (
          <div
            key={f.id}
            title={`${f.decision.ruleId} · ${f.latencyMs.toFixed(2)}ms`}
            className={`w-2 rounded-t ${color} opacity-80`}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

export function AttentionTimelineViz({ frames }: { frames: readonly RuntimeTraceFrame[] }) {
  const slice = frames.slice(-40);
  if (!slice.length) return <EmptyViz label="No attention samples" />;
  return (
    <div className="flex items-end gap-0.5 h-16 overflow-x-auto">
      {slice.map((f) => {
        const score = f.attentionState.score ?? 0;
        const h = Math.max(6, Math.min(56, (score / 100) * 56));
        const color =
          f.attentionState.classification === "fatigued"
            ? "bg-red-400"
            : f.attentionState.classification === "distracted"
              ? "bg-amber-400"
              : f.attentionState.classification === "highly_focused"
                ? "bg-emerald-400"
                : "bg-sky-400";
        return (
          <div
            key={f.id}
            title={`${f.attentionState.classification ?? "?"} · ${score}`}
            className={`w-2 rounded-t ${color} opacity-80`}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}

export function SkillChangesViz({ frame }: { frame: RuntimeTraceFrame | null }) {
  const skills = frame?.snapshots?.skills ?? [];
  if (!skills.length) return <EmptyViz label="No skill snapshot on this frame" />;
  const sorted = [...skills].sort((a, b) => a.mastery - b.mastery).slice(0, 8);
  return (
    <div className="space-y-1">
      {sorted.map((s) => (
        <div key={s.skillId} className="flex items-center gap-2 text-[10px] font-mono">
          <span className="w-36 truncate text-white/70">{s.skillId}</span>
          <div className="flex-1 h-1.5 rounded bg-white/10 overflow-hidden">
            <div
              className="h-full bg-violet-400"
              style={{ width: `${Math.max(0, Math.min(100, s.mastery))}%` }}
            />
          </div>
          <span className="w-8 text-right text-white/50">{Math.round(s.mastery)}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyViz({ label }: { label: string }) {
  return <div className="text-[10px] text-white/40 py-2">{label}</div>;
}
// i18n-ignore-end
