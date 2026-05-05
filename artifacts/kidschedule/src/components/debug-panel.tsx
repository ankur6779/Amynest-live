// i18n-ignore-start — debug/dev tool: English-only by design
// audit-block-ignore-start — debug panel uses intentional semantic status colors (red=error, green=success, amber=warning, violet=debug branding)
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Bug, X, Send, Trash2, ChevronRight, ChevronDown, ExternalLink } from "lucide-react";
import { apiLogger, type ApiLogEntry } from "@/lib/api-logger";
import { useDebugMode } from "@/contexts/debug-context";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useToast } from "@/hooks/use-toast";

const SCREEN_NAMES: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/children": "Children",
  "/children/new": "Add Child",
  "/routines": "Routines",
  "/routines/generate": "Generate Routine",
  "/behavior": "Behavior Tracker",
  "/parenting-hub": "Parenting Hub",
  "/parent-profile": "Parent Profile",
  "/life-skills": "Life Skills",
  "/kids-control-center": "Kids Control Center",
  "/study": "Study",
  "/games": "Games",
  "/assistant": "Assistant",
  "/amy-ai-tutor": "Amy AI Tutor",
  "/ai-coach": "AI Coach",
  "/ai-coach/progress": "AI Coach Progress",
  "/recipes": "Recipes",
  "/nutrition": "Nutrition Hub",
  "/audio-lessons": "Audio Lessons",
  "/notification-settings": "Notification Settings",
  "/notification-diagnostics": "Notification Diagnostics",
  "/insights": "Insights",
  "/rewards": "Rewards",
  "/referrals": "Referrals",
  "/onboarding": "Onboarding",
  "/sign-in": "Sign In",
  "/sign-up": "Sign Up",
  "/debug-parity": "Debug Parity",
};

function getScreenName(path: string): string {
  if (SCREEN_NAMES[path]) return SCREEN_NAMES[path];
  const base = path.replace(/\/[^/]+$/, "");
  if (SCREEN_NAMES[base]) return `${SCREEN_NAMES[base]} Detail`;
  return path;
}

function computeFeatureFlags(entries: ReadonlyArray<ApiLogEntry>): Record<string, boolean> {
  const has = (kw: string) => entries.some((e) => e.endpoint.includes(kw));
  return {
    routine_generation: has("/routines"),
    meal_suggestions: has("/meals"),
    phonics: has("/phonics"),
    ai_coach: has("/ai-coach") || has("/ai-tutor"),
    behavior_tracker: has("/behaviors"),
    notifications: has("/push") || has("/notifications"),
    life_skills: has("/life-skills"),
    smart_study: has("/smart-study"),
    abacus: has("/abacus"),
    spelling: has("/spelling"),
    recipes: has("/recipes"),
  };
}

function statusBadge(status: number | null) {
  if (status === null) return <span className="text-red-400 font-mono text-[10px]">ERR</span>; // audit-ok: HTTP error status indicator — red is universal
  const color = status < 300 ? "text-emerald-400" : status < 500 ? "text-amber-400" : "text-red-400"; // audit-ok: HTTP status semantic colors (2xx=green, 4xx=amber, 5xx=red) — intentional
  return <span className={`font-mono text-[10px] ${color}`}>{status}</span>;
}

function ApiCallRow({ entry }: { entry: ApiLogEntry }) {
  const [open, setOpen] = useState(false);
  const shortUrl = entry.endpoint.replace(/^https?:\/\/[^/]+/, "").slice(0, 60);

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-left"
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-[10px] font-mono text-violet-300 w-8 shrink-0">
          {entry.method}
        </span>
        {statusBadge(entry.status)}
        <span className="text-[10px] text-white/70 flex-1 truncate">{shortUrl}</span>
        {entry.responseTime !== null && (
          <span className="text-[10px] text-muted-foreground shrink-0">{entry.responseTime}ms</span>
        )}
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-1">
          {entry.error && (
            <p className="text-[10px] text-red-400 font-mono bg-red-950/30 rounded p-1">
              {entry.error}
            </p>
          )}
          {entry.requestPayload !== null && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Request</p>
              <pre className="text-[10px] text-white/60 font-mono bg-black/30 rounded p-1.5 overflow-auto max-h-24">
                {JSON.stringify(entry.requestPayload, null, 2)}
              </pre>
            </div>
          )}
          {entry.responsePayload !== null && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Response</p>
              <pre className="text-[10px] text-white/60 font-mono bg-black/30 rounded p-1.5 overflow-auto max-h-32">
                {JSON.stringify(entry.responsePayload, null, 2)}
              </pre>
            </div>
          )}
          <p className="text-[9px] text-muted-foreground">
            Screen: {entry.screen} · {new Date(entry.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}
    </div>
  );
}

export function DebugPanel() {
  const { debugMode, disable } = useDebugMode();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"context" | "logs">("logs");
  const [entries, setEntries] = useState<ApiLogEntry[]>([]);
  const [pushing, setPushing] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth() as unknown as { user: { uid: string } | null };
  const qc = useQueryClient();
  const authFetch = useAuthFetch();
  const { toast } = useToast();

  const screenName = getScreenName(location);

  useEffect(() => {
    apiLogger.setScreen(screenName);
  }, [screenName]);

  useEffect(() => {
    setEntries([...apiLogger.getEntries()]);
    return apiLogger.subscribe((e) => setEntries([...e]));
  }, []);

  const handlePush = useCallback(async () => {
    setPushing(true);
    try {
      const profile = qc.getQueryData<{
        country?: string;
        cuisine?: string;
        dietType?: string;
      }>(["parent-profile"]);

      await authFetch("/api/debug/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "web",
          screen: screenName,
          appVersion: import.meta.env.VITE_APP_VERSION ?? "dev",
          sessionId: sessionStorage.getItem("debug_sid") ?? (() => {
            const id = Math.random().toString(36).slice(2, 10);
            sessionStorage.setItem("debug_sid", id);
            return id;
          })(),
          userContext: {
            country: profile?.country ?? null,
            cuisine: profile?.cuisine ?? null,
            dietType: profile?.dietType ?? null,
          },
          apiCalls: entries.slice(0, 40).map((e) => ({
            endpoint: e.endpoint,
            method: e.method,
            status: e.status,
            responseTime: e.responseTime,
            requestPayload: e.requestPayload,
            error: e.error,
            timestamp: e.timestamp,
            screen: e.screen,
          })),
          features: computeFeatureFlags(entries),
        }),
      });
      toast({ title: "Debug snapshot pushed ✓", description: "Check /debug-parity for comparison." });
    } catch (err) {
      toast({ title: "Push failed", description: String(err), variant: "destructive" });
    } finally {
      setPushing(false);
    }
  }, [authFetch, entries, qc, screenName, toast]);

  if (!debugMode) return null;

  return (
    <>
      {/* Floating tab */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-0 z-[9000] bg-violet-900/90 border border-violet-500/50 border-r-0 rounded-l-lg px-2 py-3 flex flex-col items-center gap-1 text-violet-300 hover:bg-violet-800 transition-colors shadow-xl"
          title="Open Debug Panel"
        >
          <Bug className="w-4 h-4" />
          <span className="text-[9px] font-mono uppercase tracking-widest" style={{ writingMode: "vertical-rl" }}>
            Debug
          </span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed right-0 top-0 bottom-0 z-[9001] w-80 flex flex-col bg-[#0e0b1f]/95 border-l border-violet-500/30 shadow-2xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-violet-900/40 border-b border-violet-500/20 shrink-0">
            <div className="flex items-center gap-2">
              <Bug className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">Debug Panel</span>
            </div>
            <div className="flex items-center gap-1">
              <a
                href="/debug-parity"
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                title="Open Parity Report"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={disable}
                className="p-1 rounded hover:bg-red-900/40 text-muted-foreground hover:text-red-400 transition-colors text-[10px] font-mono"
                title="Disable debug mode"
              >
                OFF
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Screen + User info bar */}
          <div className="px-3 py-1.5 bg-black/20 border-b border-white/5 shrink-0 space-y-0.5">
            <p className="text-[10px] text-violet-300 font-semibold truncate">📍 {screenName}</p>
            <p className="text-[10px] text-muted-foreground font-mono truncate">
              uid: {(user as any)?.uid ?? "—"}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5 shrink-0">
            {(["logs", "context"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                  activeTab === tab
                    ? "text-violet-300 border-b-2 border-violet-400"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {tab === "logs" ? `API Log (${entries.length})` : "Context"}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === "logs" && (
              <div>
                {entries.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-8">
                    No API calls yet. Navigate to a screen to log calls.
                  </p>
                ) : (
                  entries.map((entry) => <ApiCallRow key={entry.id} entry={entry} />)
                )}
              </div>
            )}

            {activeTab === "context" && (
              <div className="p-3 space-y-3">
                <Section title="Features Detected">
                  {Object.entries(computeFeatureFlags(entries)).map(([feat, active]) => (
                    <div key={feat} className="flex items-center justify-between py-0.5">
                      <span className="text-[11px] text-white/70">{feat.replace(/_/g, " ")}</span>
                      <span className={`text-[10px] font-mono ${active ? "text-emerald-400" : "text-white/20"}`}>
                        {active ? "✓ used" : "—"}
                      </span>
                    </div>
                  ))}
                </Section>

                <Section title="Route Info">
                  <InfoRow label="Path" value={location} />
                  <InfoRow label="Screen" value={screenName} />
                  <InfoRow label="Platform" value="web" />
                  <InfoRow label="Total API calls" value={String(entries.length)} />
                </Section>

                <Section title="Quick Links">
                  <a href="/debug-parity" className="block text-[11px] text-violet-400 hover:text-violet-300 underline py-0.5">
                    → Parity Report (/debug-parity)
                  </a>
                  <button
                    onClick={() => { apiLogger.clear(); }}
                    className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 py-0.5"
                  >
                    <Trash2 className="w-3 h-3" /> Clear API log
                  </button>
                </Section>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-3 py-2 border-t border-white/5 shrink-0 flex gap-2">
            <button
              onClick={handlePush}
              disabled={pushing}
              className="flex-1 flex items-center justify-center gap-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-[11px] font-medium rounded-md py-1.5 transition-colors"
            >
              <Send className="w-3 h-3" />
              {pushing ? "Pushing…" : "Push to Server"}
            </button>
            <button
              onClick={() => { apiLogger.clear(); }}
              className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-colors"
              title="Clear log"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
      <div className="bg-black/20 rounded-md divide-y divide-white/5 px-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 gap-2">
      <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[10px] text-white/80 font-mono truncate text-right">{value}</span>
    </div>
  );
}
// audit-block-ignore-end
// i18n-ignore-end
