// i18n-ignore-start — debug/dev tool: English-only by design
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Download, Trash2 } from "lucide-react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useToast } from "@/hooks/use-toast";

interface FeatureComparison {
  web: boolean | null;
  mobile: boolean | null;
  match: boolean;
}
interface ApiComparison {
  onlyOnWeb: string[];
  onlyOnMobile: string[];
}
interface ScreenSnapshot {
  capturedAt: string;
  userContext: Record<string, unknown> | null;
  features: Record<string, boolean>;
  apiCalls: Array<{ endpoint?: string; method?: string; status?: number; responseTime?: number }> | null;
}
interface ScreenReport {
  screen: string;
  featureMatch: boolean;
  apiMatch: boolean;
  overallMatch: boolean;
  web: ScreenSnapshot | null;
  mobile: ScreenSnapshot | null;
  featureComparison: Record<string, FeatureComparison>;
  apiComparison: ApiComparison;
}
interface ParityReport {
  report: { totalScreens: number; matched: number; issues: number; generatedAt: string };
  screens: ScreenReport[];
}

const PHASES = [
  { phase: 1, label: "Onboarding", keywords: ["onboarding", "sign in", "sign up", "home", "welcome", "children"] },
  { phase: 2, label: "Routine Generation", keywords: ["routine", "dashboard", "generate", "morning"] },
  { phase: 3, label: "Meal + Tiffin", keywords: ["meal", "nutrition", "recipe", "tiffin"] },
  { phase: 4, label: "Phonics", keywords: ["phonics", "audio", "lesson", "spelling"] },
  { phase: 5, label: "AI Suggestions", keywords: ["ai", "coach", "tutor", "assistant", "insight"] },
];

function phaseForScreen(screen: string): number {
  const s = screen.toLowerCase();
  for (const phase of PHASES) {
    if (phase.keywords.some((k) => s.includes(k))) return phase.phase;
  }
  return 0;
}

function MatchBadge({ match, label }: { match: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${match ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"}`}>
      {match ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label ?? (match ? "Match" : "Mismatch")}
    </span>
  );
}

function ScreenCard({ s }: { s: ScreenReport }) {
  const [expanded, setExpanded] = useState(!s.overallMatch);

  return (
    <div className={`rounded-lg border ${s.overallMatch ? "border-white/10 bg-white/[0.02]" : "border-red-800/40 bg-red-950/10"}`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {s.overallMatch ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium text-white">{s.screen}</span>
        </div>
        <div className="flex items-center gap-2">
          <MatchBadge match={s.featureMatch} label="Features" />
          <MatchBadge match={s.apiMatch} label="APIs" />
          <span className="text-[10px] text-muted-foreground ml-1">
            {s.web ? "W✓" : "W✗"} {s.mobile ? "M✓" : "M✗"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5">
          {/* Snapshot timestamps */}
          <div className="grid grid-cols-2 gap-2 pt-3">
            {(["web", "mobile"] as const).map((p) => {
              const snap = s[p];
              return (
                <div key={p} className="bg-black/20 rounded p-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{p}</p>
                  {snap ? (
                    <>
                      <p className="text-[10px] text-white/60 font-mono">
                        {new Date(snap.capturedAt).toLocaleString()}
                      </p>
                      {snap.userContext && (
                        <div className="mt-1 space-y-0.5">
                          {Object.entries(snap.userContext).filter(([, v]) => v != null).map(([k, v]) => (
                            <p key={k} className="text-[10px] text-white/50">
                              <span className="text-muted-foreground">{k}:</span> {String(v)}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[10px] text-muted-foreground italic">No snapshot</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Feature comparison */}
          {Object.keys(s.featureComparison).length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Feature Comparison</p>
              <div className="rounded-md border border-white/5 overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="text-left px-3 py-1.5 text-muted-foreground font-medium">Feature</th>
                      <th className="px-3 py-1.5 text-muted-foreground font-medium text-center">Web</th>
                      <th className="px-3 py-1.5 text-muted-foreground font-medium text-center">Mobile</th>
                      <th className="px-3 py-1.5 text-muted-foreground font-medium text-center">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {Object.entries(s.featureComparison).map(([feat, fc]) => (
                      <tr key={feat} className={fc.match ? "" : "bg-red-950/20"}>
                        <td className="px-3 py-1.5 text-white/70">{feat.replace(/_/g, " ")}</td>
                        <td className="px-3 py-1.5 text-center">
                          {fc.web === null ? <span className="text-muted-foreground">—</span> : fc.web ? <span className="text-emerald-400">✓</span> : <span className="text-white/20">✗</span>}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {fc.mobile === null ? <span className="text-muted-foreground">—</span> : fc.mobile ? <span className="text-emerald-400">✓</span> : <span className="text-white/20">✗</span>}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {fc.match ? <span className="text-emerald-400">✓</span> : <span className="text-red-400">⚠ Mismatch</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* API comparison */}
          {(!s.apiMatch) && (
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">API Differences</p>
              {s.apiComparison.onlyOnWeb.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] text-amber-400 mb-1">Only on Web:</p>
                  {s.apiComparison.onlyOnWeb.map((e) => (
                    <p key={e} className="text-[10px] font-mono text-white/60 pl-2">{e}</p>
                  ))}
                </div>
              )}
              {s.apiComparison.onlyOnMobile.length > 0 && (
                <div>
                  <p className="text-[10px] text-blue-400 mb-1">Only on Mobile:</p>
                  {s.apiComparison.onlyOnMobile.map((e) => (
                    <p key={e} className="text-[10px] font-mono text-white/60 pl-2">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DebugParityPage() {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<ParityReport>({
    queryKey: ["debug-parity"],
    queryFn: async () => {
      const r = await authFetch("/api/debug/parity");
      if (!r.ok) throw new Error("Failed to load parity report");
      return r.json();
    },
    staleTime: 0,
  });

  const clearMut = useMutation({
    mutationFn: async () => {
      const r = await authFetch("/api/debug/logs", { method: "DELETE" });
      if (!r.ok) throw new Error("Failed to clear");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debug-parity"] });
      toast({ title: "Debug logs cleared" });
    },
    onError: () => toast({ title: "Clear failed", variant: "destructive" }),
  });

  const handleDownload = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parity-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const grouped = data ? PHASES.map((phase) => ({
    ...phase,
    screens: data.screens.filter((s) => phaseForScreen(s.screen) === phase.phase),
  })) : [];
  const ungrouped = data ? data.screens.filter((s) => phaseForScreen(s.screen) === 0) : [];

  return (
    <div className="min-h-screen bg-[#0a061a] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Debug Parity Report</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compares Mobile App vs Web App — features, logic, API calls
            </p>
            {data?.report.generatedAt && (
              <p className="text-[11px] text-muted-foreground font-mono mt-1">
                Generated: {new Date(data.report.generatedAt).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs rounded-lg px-3 py-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              onClick={handleDownload}
              disabled={!data}
              className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white text-xs rounded-lg px-3 py-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button
              onClick={() => clearMut.mutate()}
              disabled={clearMut.isPending}
              className="flex items-center gap-1.5 bg-red-900/40 hover:bg-red-900/70 border border-red-800/40 text-red-400 text-xs rounded-lg px-3 py-2 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Logs
            </button>
          </div>
        </div>

        {/* Instructions banner */}
        <div className="rounded-lg border border-violet-800/40 bg-violet-950/20 p-4">
          <p className="text-sm font-semibold text-violet-300 mb-2">How to use this report</p>
          <ol className="text-xs text-white/60 space-y-1 list-decimal list-inside">
            <li>Enable debug mode on the Web app: append <code className="bg-black/30 px-1 rounded">?debug=1</code> to any URL</li>
            <li>Open the 🐛 Debug tab (right edge of screen) and navigate through screens</li>
            <li>Click <strong className="text-white">"Push to Server"</strong> to submit your web snapshot</li>
            <li>Do the same on the Mobile app — open Debug Panel → push snapshot</li>
            <li>Come back here and click <strong className="text-white">Refresh</strong> to see the comparison</li>
          </ol>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">Loading parity data…</div>
        )}
        {error && (
          <div className="text-center py-12 text-red-400">Failed to load: {String(error)}</div>
        )}

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="Total Screens" value={data.report.totalScreens} color="text-white" />
              <SummaryCard label="Matched" value={data.report.matched} color="text-emerald-400" />
              <SummaryCard label="Issues" value={data.report.issues} color={data.report.issues > 0 ? "text-red-400" : "text-emerald-400"} />
            </div>

            {/* Report JSON for copy */}
            <details className="rounded-lg border border-white/5 bg-black/20">
              <summary className="px-4 py-2 text-xs text-muted-foreground cursor-pointer hover:text-white">
                Raw JSON Report (click to expand)
              </summary>
              <pre className="px-4 pb-4 text-[10px] font-mono text-white/50 overflow-auto max-h-48">
                {JSON.stringify(data.report, null, 2)}
              </pre>
            </details>

            {/* Phase-wise breakdown */}
            {grouped.map((phase) => (
              <div key={phase.phase} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-violet-800/60 border border-violet-600/40 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-violet-300">{phase.phase}</span>
                  </div>
                  <h2 className="text-base font-semibold text-white">{phase.label}</h2>
                  {phase.screens.length === 0 && (
                    <span className="text-[10px] text-muted-foreground italic">No data yet — push a snapshot from this screen</span>
                  )}
                  {phase.screens.length > 0 && (
                    <span className={`text-[10px] font-medium ${phase.screens.every(s => s.overallMatch) ? "text-emerald-400" : "text-red-400"}`}>
                      {phase.screens.filter(s => s.overallMatch).length}/{phase.screens.length} matched
                    </span>
                  )}
                </div>
                {phase.screens.map((s) => <ScreenCard key={s.screen} s={s} />)}
              </div>
            ))}

            {ungrouped.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-base font-semibold text-muted-foreground">Other Screens</h2>
                {ungrouped.map((s) => <ScreenCard key={s.screen} s={s} />)}
              </div>
            )}

            {data.screens.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-amber-500" />
                <p className="text-sm">No debug snapshots yet.</p>
                <p className="text-xs mt-1">Follow the instructions above to push your first snapshot.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
// i18n-ignore-end
