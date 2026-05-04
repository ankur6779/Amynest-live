// i18n-ignore-start — debug/dev tool: English-only by design
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Share,
} from "react-native";
import { useSegments } from "expo-router";
import { useDebugMode } from "@/contexts/DebugContext";
import { apiLogger, type ApiLogEntry } from "@/lib/apiLogger";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useQueryClient } from "@tanstack/react-query";
import {
  compareState,
  MOBILE_SEMANTIC_COLORS,
  WEB_SEMANTIC_COLORS,
} from "@/lib/compareState";
import { brand } from "@/constants/colors";

// ── TYPES ─────────────────────────────────────────────────────────────────────

type Tab   = "logs" | "state" | "colors" | "parity";
type Phase = "all" | "onboarding" | "routine" | "amy" | "hub" | "profile" | "food";

interface ChildProfile {
  id?: string;
  name?: string;
  age?: number;
  ageMonths?: number;
  gender?: string;
}

interface ParentProfile {
  country?: string;
  cuisine?: string;
  dietType?: string;
  children?: ChildProfile[];
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<Phase, string> = {
  all:        "All",
  onboarding: "Onboarding",
  routine:    "Routine",
  amy:        "Amy",
  hub:        "Hub",
  profile:    "Profile",
  food:       "Food",
};

/** Mobile brand tokens shown in the Colors tab. */
const MOBILE_TOKENS = [
  { name: "brand.primary",   value: brand.primary,   note: "Purple — mobile brand" },
  { name: "brand.accent",    value: brand.accent,    note: "Pink accent" },
  { name: "brand.violet600", value: brand.violet600, note: "Deep violet" },
  { name: "brand.violet400", value: brand.violet400, note: "Light violet" },
  { name: "brand.pink500",   value: brand.pink500,   note: "Hot pink" },
  { name: "brand.sky300",    value: brand.sky300,    note: "Info / sky" },
  { name: "brand.amber400",  value: brand.amber400,  note: "Warning amber" },
  { name: "brand.rose400",   value: brand.rose400,   note: "Destructive rose" },
  { name: "brand.indigo500", value: brand.indigo500, note: "Indigo / dev" },
] as const;

/** Web CSS var resolved approximations (hsl → hex). */
const WEB_TOKEN_REF = {
  primary:    { hex: "#F07645", label: "--primary (warm orange)" },    // audit-ok: web CSS reference value for color audit comparison
  accent:     { hex: "#16B89A", label: "--accent (teal)" },            // audit-ok: web CSS reference value for color audit comparison
  background: { hex: "#FDFBF7", label: "--background (warm white)" }, // audit-ok: web CSS reference value for color audit comparison
  secondary:  { hex: "#F5C518", label: "--secondary (amber)" },        // audit-ok: web CSS reference value for color audit comparison
} as const;

/** Shared semantic colors compared between platforms. */
const SEMANTIC_COMPARISON = [
  { label: "Destructive", mobile: MOBILE_SEMANTIC_COLORS.destructive, web: WEB_SEMANTIC_COLORS.destructive },
  { label: "Success",     mobile: MOBILE_SEMANTIC_COLORS.success,     web: WEB_SEMANTIC_COLORS.success     },
  { label: "Warning text",mobile: MOBILE_SEMANTIC_COLORS.warning,     web: WEB_SEMANTIC_COLORS.warning     },
  { label: "Info text",   mobile: MOBILE_SEMANTIC_COLORS.info,        web: WEB_SEMANTIC_COLORS.info        },
] as const;

// ── HELPERS ───────────────────────────────────────────────────────────────────

function computeFeatureFlags(entries: ReadonlyArray<ApiLogEntry>): Record<string, boolean> {
  const has = (kw: string) => entries.some((e) => e.endpoint.includes(kw));
  return {
    routine_generation: has("/routines"),
    meal_suggestions:   has("/meals"),
    phonics:            has("/phonics"),
    ai_coach:           has("/ai-coach") || has("/ai-tutor"),
    behavior_tracker:   has("/behaviors"),
    notifications:      has("/push"),
    life_skills:        has("/life-skills"),
    smart_study:        has("/smart-study"),
    abacus:             has("/abacus"),
    spelling:           has("/spelling"),
  };
}

function formatScreenName(segments: string[]): string {
  if (!segments.length) return "Home";
  const last = segments[segments.length - 1];
  return last.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function phaseMatchesEntry(phase: Phase, entry: ApiLogEntry): boolean {
  if (phase === "all") return true;
  const scr = entry.screen.toLowerCase();
  const ep  = entry.endpoint.toLowerCase();
  switch (phase) {
    case "onboarding": return scr.includes("onboarding");
    case "routine":    return scr.includes("routine") || ep.includes("/routines");
    case "amy":        return scr.includes("amy") || scr.includes("audio") ||
                              scr.includes("spelling") || scr.includes("games") || ep.includes("/ai-");
    case "hub":        return scr.includes("hub") || ep.includes("/hub") || ep.includes("/app-data");
    case "profile":    return scr.includes("child") || scr.includes("profile") ||
                              scr.includes("referral") || ep.includes("/children");
    case "food":       return scr.includes("nutrition") || ep.includes("/meal") ||
                              ep.includes("/food") || ep.includes("/meals");
    default:           return true;
  }
}

/** Rough per-channel colour distance — treats difference < 60 as "close". */
function colorClose(a: string, b: string): boolean {
  const parse = (h: string): [number, number, number] => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  };
  try {
    const [ar, ag, ab] = parse(a);
    const [br, bg, bb] = parse(b);
    return Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb) < 60;
  } catch {
    return false;
  }
}

// ── SUBCOMPONENTS ─────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: number | null }) {
  const color =
    status === null ? "#f87171" : // audit-ok: debug status indicator colors
    status < 300    ? "#34d399" : // audit-ok: debug status indicator colors
    status < 500    ? "#fbbf24" : "#f87171"; // audit-ok: debug status indicator colors
  return (
    <Text style={[s.chip, { color, borderColor: color + "40" }]}>
      {status ?? "ERR"}
    </Text>
  );
}

function ApiRow({ entry }: { entry: ApiLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const shortUrl = entry.endpoint.replace(/^https?:\/\/[^/]+/, "").slice(0, 55);
  return (
    <View style={s.apiRow}>
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={s.apiRowHeader}>
        <Text style={s.methodText}>{entry.method}</Text>
        <StatusChip status={entry.status} />
        <Text style={s.endpointText} numberOfLines={1}>{shortUrl}</Text>
        {entry.responseTime != null && (
          <Text style={[s.rtText, entry.responseTime > 1000 && s.rtSlow]}>
            {entry.responseTime}ms
          </Text>
        )}
      </TouchableOpacity>
      {expanded && (
        <View style={s.apiRowBody}>
          {entry.error ? <Text style={s.errorText}>{entry.error}</Text> : null}
          {entry.requestPayload ? (
            <View style={s.payloadBlock}>
              <Text style={s.payloadLabel}>Request</Text>
              <Text style={s.payloadText}>
                {JSON.stringify(entry.requestPayload, null, 2)}
              </Text>
            </View>
          ) : null}
          {entry.responsePayload ? (
            <View style={s.payloadBlock}>
              <Text style={s.payloadLabel}>Response</Text>
              <Text style={s.payloadText} numberOfLines={20}>
                {JSON.stringify(entry.responsePayload, null, 2)}
              </Text>
            </View>
          ) : null}
          <Text style={s.metaText}>
            Screen: {entry.screen} · {new Date(entry.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "ok" | "warn" | "error";
}) {
  const valColor =
    status === "ok"    ? "#34d399" : // audit-ok: debug status indicator colors
    status === "warn"  ? "#fbbf24" : // audit-ok: debug status indicator colors
    status === "error" ? "#f87171" : "#d1d5db"; // audit-ok: debug status indicator colors
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={[s.infoValue, { color: valColor }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

function TrafficLight({
  ok,
  label,
  detail,
}: {
  ok: boolean | null;
  label: string;
  detail?: string;
}) {
  const color =
    ok === null ? "#fbbf24" : ok ? "#34d399" : "#f87171"; // audit-ok: debug status indicator colors
  const icon  = ok === null ? "⚠" : ok ? "✓" : "✕";
  return (
    <View style={s.tlRow}>
      <Text style={[s.tlIcon, { color }]}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.tlLabel}>{label}</Text>
        {detail ? <Text style={s.tlDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export function DebugPanel() {
  const { debugMode, disable } = useDebugMode();
  const [open,        setOpen]        = useState(false);
  const [activeTab,   setActiveTab]   = useState<Tab>("logs");
  const [activePhase, setActivePhase] = useState<Phase>("all");
  const [entries,     setEntries]     = useState<ApiLogEntry[]>([]);
  const [pushing,     setPushing]     = useState(false);

  const segments   = useSegments();
  const screenName = formatScreenName(segments as string[]);
  const authFetch  = useAuthFetch();
  const qc         = useQueryClient();
  const sessionId  = useRef(Math.random().toString(36).slice(2, 10));

  useEffect(() => { apiLogger.setScreen(screenName); }, [screenName]);

  useEffect(() => {
    setEntries([...apiLogger.getEntries()]);
    return apiLogger.subscribe((e) => setEntries([...e]));
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filteredEntries = useMemo(
    () =>
      activePhase === "all"
        ? entries
        : entries.filter((e) => phaseMatchesEntry(activePhase, e)),
    [entries, activePhase],
  );

  const perfStats = useMemo(() => {
    const timed  = entries.filter((e) => e.responseTime != null);
    const errors = entries.filter((e) => e.status === null || (e.status != null && e.status >= 500));
    const avg    = timed.length
      ? Math.round(timed.reduce((acc, e) => acc + (e.responseTime ?? 0), 0) / timed.length)
      : 0;
    const slow   = timed.filter((e) => (e.responseTime ?? 0) > 1000).length;
    return { avg, errors: errors.length, slow, total: entries.length };
  }, [entries]);

  const parentProfile = qc.getQueryData<ParentProfile>(["parent-profile"]);
  const children: ChildProfile[] =
    qc.getQueryData<ChildProfile[]>(["children"]) ??
    parentProfile?.children ??
    [];

  const parityResult = useMemo(
    () => compareState({ apiErrorCount: perfStats.errors, apiCallCount: perfStats.total }),
    [perfStats.errors, perfStats.total],
  );

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handlePush = useCallback(async () => {
    setPushing(true);
    try {
      await authFetch("/api/debug/log", {
        method: "POST",
        body: JSON.stringify({
          platform:   "mobile",
          screen:     screenName,
          appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? "dev",
          sessionId:  sessionId.current,
          userContext: {
            country:  parentProfile?.country  ?? null,
            cuisine:  parentProfile?.cuisine  ?? null,
            dietType: parentProfile?.dietType ?? null,
          },
          apiCalls: entries.slice(0, 40).map((e) => ({
            endpoint:        e.endpoint,
            method:          e.method,
            status:          e.status,
            responseTime:    e.responseTime,
            requestPayload:  e.requestPayload,
            error:           e.error,
            timestamp:       e.timestamp,
            screen:          e.screen,
          })),
          features: computeFeatureFlags(entries),
        }),
      });
      Alert.alert(
        "Debug Snapshot Pushed ✓",
        "Open /debug-parity on the web to see the comparison.",
      );
    } catch (err) {
      Alert.alert("Push Failed", String(err));
    } finally {
      setPushing(false);
    }
  }, [authFetch, entries, parentProfile, screenName]);

  const handleExport = useCallback(async () => {
    const lines = entries.slice(0, 30).map(
      (e) =>
        `[${e.method}] ${e.status ?? "ERR"} ${e.endpoint.replace(/^https?:\/\/[^/]+/, "").slice(0, 60)} ${e.responseTime ?? "?"}ms @${e.screen}`,
    );
    const text = [
      `AmyNest Debug Log — ${new Date().toISOString()}`,
      `Screen: ${screenName} | Session: ${sessionId.current}`,
      `Errors: ${perfStats.errors} | Avg: ${perfStats.avg}ms | Slow (>1s): ${perfStats.slow}`,
      "",
      ...lines,
    ].join("\n");
    try {
      await Share.share({ message: text, title: "AmyNest Debug Log" });
    } catch {
      /* user dismissed */
    }
  }, [entries, screenName, perfStats]);

  if (!debugMode) return null;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {!open && (
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={s.fab}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.fabText}>🔬</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        presentationStyle="overFullScreen"
      >
        <View style={s.overlay}>
          <View style={s.panel}>

            {/* ── Header ── */}
            <View style={s.header}>
              <Text style={s.headerTitle}>🔬 Amy Debug</Text>
              <View style={s.headerActions}>
                <TouchableOpacity onPress={disable} style={s.offBtn}>
                  <Text style={s.offBtnText}>OFF</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOpen(false)} style={s.closeBtn}>
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Info bar ── */}
            <View style={s.infoBar}>
              <Text style={s.screenName}>📍 {screenName}</Text>
              <Text style={s.platformText}>
                Platform: mobile · {Platform.OS} · Session: {sessionId.current}
              </Text>
            </View>

            {/* ── Phase filter ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.phaseBar}
              contentContainerStyle={s.phaseBarContent}
            >
              {(Object.keys(PHASE_LABELS) as Phase[]).map((phase) => (
                <TouchableOpacity
                  key={phase}
                  onPress={() => setActivePhase(phase)}
                  style={[s.phaseChip, activePhase === phase && s.phaseChipActive]}
                >
                  <Text
                    style={[
                      s.phaseChipText,
                      activePhase === phase && s.phaseChipTextActive,
                    ]}
                  >
                    {PHASE_LABELS[phase]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Tabs ── */}
            <View style={s.tabs}>
              {(
                [
                  ["logs",   `Logs ${filteredEntries.length}`],
                  ["state",  "State"],
                  ["colors", "Colors"],
                  ["parity", "Parity"],
                ] as [Tab, string][]
              ).map(([tab, label]) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[s.tab, activeTab === tab && s.tabActive]}
                >
                  <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Content ── */}
            <ScrollView style={s.content} keyboardShouldPersistTaps="handled">

              {/* ── LOGS TAB ── */}
              {activeTab === "logs" && (
                <>
                  {/* Performance summary bar */}
                  <View style={s.perfBar}>
                    <View style={s.perfItem}>
                      <Text style={s.perfValue}>{perfStats.total}</Text>
                      <Text style={s.perfLabel}>calls</Text>
                    </View>
                    <View style={s.perfDivider} />
                    <View style={s.perfItem}>
                      <Text style={[s.perfValue, perfStats.avg > 800 && s.perfWarn]}>
                        {perfStats.avg}ms
                      </Text>
                      <Text style={s.perfLabel}>avg</Text>
                    </View>
                    <View style={s.perfDivider} />
                    <View style={s.perfItem}>
                      <Text style={[s.perfValue, perfStats.errors > 0 && s.perfError]}>
                        {perfStats.errors}
                      </Text>
                      <Text style={s.perfLabel}>errors</Text>
                    </View>
                    <View style={s.perfDivider} />
                    <View style={s.perfItem}>
                      <Text style={[s.perfValue, perfStats.slow > 0 && s.perfWarn]}>
                        {perfStats.slow}
                      </Text>
                      <Text style={s.perfLabel}>slow (&gt;1s)</Text>
                    </View>
                  </View>

                  {filteredEntries.length === 0 ? (
                    <Text style={s.emptyText}>
                      {entries.length === 0
                        ? "No API calls logged yet."
                        : `No calls for phase "${PHASE_LABELS[activePhase]}".`}
                    </Text>
                  ) : (
                    filteredEntries.map((e) => <ApiRow key={e.id} entry={e} />)
                  )}
                </>
              )}

              {/* ── STATE TAB ── */}
              {activeTab === "state" && (
                <View style={s.section}>
                  <SectionHeader title="USER PROFILE" />
                  <InfoRow
                    label="Country"
                    value={parentProfile?.country ?? "—"}
                    status={parentProfile?.country ? "ok" : "warn"}
                  />
                  <InfoRow
                    label="Cuisine"
                    value={parentProfile?.cuisine ?? "—"}
                    status={parentProfile?.cuisine ? "ok" : "warn"}
                  />
                  <InfoRow
                    label="Diet Type"
                    value={parentProfile?.dietType ?? "—"}
                  />

                  <SectionHeader title="CHILDREN" />
                  {children.length === 0 ? (
                    <Text style={s.emptyText}>No children in cache.</Text>
                  ) : (
                    children.map((child, i) => (
                      <InfoRow
                        key={child.id ?? i}
                        label={child.name ?? `Child ${i + 1}`}
                        value={`${child.age ?? "?"}y ${child.ageMonths ?? 0}m · ${child.gender ?? "?"}`}
                        status="ok"
                      />
                    ))
                  )}

                  <SectionHeader title="FEATURES DETECTED" />
                  {Object.entries(computeFeatureFlags(entries)).map(([feat, active]) => (
                    <View key={feat} style={s.featureRow}>
                      <Text style={s.featureName}>{feat.replace(/_/g, " ")}</Text>
                      <Text
                        style={[
                          s.featureStatus,
                          { color: active ? "#34d399" : "#ffffff30" }, // audit-ok: debug status indicator colors
                        ]}
                      >
                        {active ? "✓ used" : "—"}
                      </Text>
                    </View>
                  ))}

                  <SectionHeader title="SESSION" />
                  <InfoRow label="Screen"     value={screenName} />
                  <InfoRow label="Segments"   value={segments.join(" / ") || "root"} />
                  <InfoRow label="API calls"  value={String(entries.length)} />
                  <InfoRow label="Session ID" value={sessionId.current} />
                </View>
              )}

              {/* ── COLORS TAB ── */}
              {activeTab === "colors" && (
                <View style={s.section}>
                  <SectionHeader title="MOBILE BRAND TOKENS" />
                  {MOBILE_TOKENS.map((tok) => (
                    <View key={tok.name} style={s.colorRow}>
                      <View style={[s.colorSwatch, { backgroundColor: tok.value }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.colorTokenName}>{tok.name}</Text>
                        <Text style={s.colorNote}>{tok.note}</Text>
                      </View>
                      <Text style={s.colorHex}>{tok.value}</Text>
                    </View>
                  ))}

                  <SectionHeader title="WEB REFERENCE TOKENS" />
                  <Text style={s.colorDisclaimer}>
                    AmyNest (mobile) uses a purple brand; KidSchedule (web) uses an orange brand.
                    Primary/accent divergence is intentional — not a bug.
                  </Text>
                  {Object.entries(WEB_TOKEN_REF).map(([key, { hex, label }]) => (
                    <View key={key} style={s.colorRow}>
                      <View style={[s.colorSwatch, { backgroundColor: hex }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.colorTokenName}>{label}</Text>
                      </View>
                      <Text style={s.colorHex}>{hex}</Text>
                    </View>
                  ))}

                  <SectionHeader title="SEMANTIC COLOR COMPARISON" />
                  <Text style={s.colorDisclaimer}>
                    Semantic colors (error, success, warning, info) should be close between
                    platforms — ✓ means within tolerance, ~ means slight deviation.
                  </Text>
                  {SEMANTIC_COMPARISON.map(({ label, mobile, web }) => {
                    const close = colorClose(mobile, web);
                    return (
                      <View key={label} style={s.colorRow}>
                        <View style={[s.colorSwatch, { backgroundColor: mobile }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.colorTokenName}>{label}</Text>
                          <Text style={s.colorNote}>
                            mobile {mobile} · web {web}
                          </Text>
                        </View>
                        <Text
                          style={[
                            s.colorHex,
                            { color: close ? "#34d399" : "#fbbf24" }, // audit-ok: debug status indicator colors
                          ]}
                        >
                          {close ? "✓" : "~"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* ── PARITY TAB ── */}
              {activeTab === "parity" && (
                <View style={s.section}>
                  <SectionHeader title="PARITY SCORE" />
                  <View style={s.scoreRow}>
                    <Text
                      style={[
                        s.scoreValue,
                        {
                          color:
                            parityResult.score >= 75 ? "#34d399" : // audit-ok: debug status indicator colors
                            parityResult.score >= 50 ? "#fbbf24" : "#f87171", // audit-ok: debug status indicator colors
                        },
                      ]}
                    >
                      {parityResult.score}%
                    </Text>
                    <Text style={s.scoreLabel}>overall match</Text>
                  </View>

                  <SectionHeader title="COMPARISON RESULT" />
                  <TrafficLight
                    ok={parityResult.logic_match}
                    label="Logic Match"
                    detail={
                      parityResult.logic_match
                        ? "No API errors detected"
                        : `${perfStats.errors} API error(s)`
                    }
                  />
                  <TrafficLight
                    ok={parityResult.ui_match}
                    label="UI Match"
                    detail="Component presence + order (Hub overlay for tile-level detail)"
                  />
                  <TrafficLight
                    ok={parityResult.color_match}
                    label="Color Match"
                    detail="Semantic tokens OK · brand palette intentionally different"
                  />
                  <TrafficLight
                    ok={parityResult.content_match}
                    label="Content Match"
                    detail={
                      parityResult.content_match
                        ? "Content counts match"
                        : "Content count mismatch detected"
                    }
                  />

                  {parityResult.issues.length > 0 && (
                    <>
                      <SectionHeader title="ISSUES" />
                      {parityResult.issues.map((issue, i) => (
                        <View key={i} style={s.issueRow}>
                          <Text style={s.issueIcon}>⚠</Text>
                          <Text style={s.issueText}>{issue}</Text>
                        </View>
                      ))}
                    </>
                  )}

                  <SectionHeader title="HUB TILE PARITY" />
                  <Text style={s.colorDisclaimer}>
                    The 🔩 overlay on the Hub screen provides tile-by-tile diff including
                    missing/extra tiles, order mismatches, and the UI Design checklist.
                  </Text>
                  <TrafficLight
                    ok={null}
                    label="Hub tile diff"
                    detail="Tap 🔩 on Hub screen for full details"
                  />

                  <SectionHeader title="compareState() OUTPUT" />
                  <View style={s.codeBlock}>
                    <Text style={s.codeText}>
                      {JSON.stringify(parityResult, null, 2)}
                    </Text>
                  </View>
                </View>
              )}

            </ScrollView>

            {/* ── Footer ── */}
            <View style={s.footer}>
              <TouchableOpacity
                onPress={handlePush}
                disabled={pushing}
                style={[s.pushBtn, pushing && s.pushBtnDisabled]}
              >
                {pushing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.pushBtnText}>▶ Push Snapshot</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleExport} style={s.exportBtn}>
                <Text style={s.exportBtnText}>↑ Export</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { apiLogger.clear(); }}
                style={s.clearBtn}
              >
                <Text style={s.clearBtnText}>🗑</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────

const mono = Platform.OS === "ios" ? "Courier" : "monospace";

const s = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 8,
    bottom: 120,
    zIndex: 9000,
    backgroundColor: "#3b1f7a", // audit-ok: debug-only dev overlay
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: { fontSize: 20 },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  panel: {
    backgroundColor: "#0e0b1f", // audit-ok: debug-only dev overlay
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "92%",
    borderTopWidth: 1,
    borderColor: "#7c3aed50",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff10",
    backgroundColor: "#1e0a4040",
  },
  headerTitle: { color: "#a78bfa", fontWeight: "700", fontSize: 14 }, // audit-ok: debug-only dev overlay
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  offBtn: {
    backgroundColor: "#1f1f1f", // audit-ok: debug-only dev overlay
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offBtnText: { color: "#f87171", fontSize: 11, fontFamily: mono }, // audit-ok: debug-only dev overlay
  closeBtn: { padding: 4 },
  closeBtnText: { color: "#9ca3af", fontSize: 16 }, // audit-ok: debug-only dev overlay

  // Info bar
  infoBar: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff08",
    backgroundColor: "#00000020",
  },
  screenName:   { color: "#c4b5fd", fontSize: 11, fontWeight: "600" }, // audit-ok: debug-only dev overlay
  platformText: { color: "#6b7280", fontSize: 9,  marginTop: 2 }, // audit-ok: debug-only dev overlay

  // Phase filter
  phaseBar: { borderBottomWidth: 1, borderBottomColor: "#ffffff08" },
  phaseBarContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    flexDirection: "row",
  },
  phaseChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#1f1f3a", // audit-ok: debug-only dev overlay
    borderWidth: 1,
    borderColor: "#ffffff10",
  },
  phaseChipActive: { backgroundColor: "#4c1d95", borderColor: "#7c3aed" }, // audit-ok: debug-only dev overlay
  phaseChipText:       { color: "#6b7280", fontSize: 10 }, // audit-ok: debug-only dev overlay
  phaseChipTextActive: { color: "#c4b5fd", fontWeight: "600" }, // audit-ok: debug-only dev overlay

  // Tabs
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ffffff08" },
  tab:       { flex: 1, paddingVertical: 8, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#7c3aed" }, // audit-ok: debug-only dev overlay
  tabText:       { fontSize: 10, color: "#6b7280" }, // audit-ok: debug-only dev overlay
  tabTextActive: { color: "#a78bfa", fontWeight: "600" }, // audit-ok: debug-only dev overlay

  content:   { flex: 1, maxHeight: 420 },
  section:   { padding: 12 },
  emptyText: {
    color: "#6b7280", // audit-ok: debug-only dev overlay
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 24,
  },

  // Performance bar
  perfBar: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#0a0818", // audit-ok: debug-only dev overlay
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff08",
  },
  perfItem:    { flex: 1, alignItems: "center" },
  perfDivider: { width: 1, backgroundColor: "#ffffff10", marginVertical: 2 },
  perfValue: {
    color: "#c4b5fd", // audit-ok: debug-only dev overlay
    fontSize: 14,
    fontWeight: "700",
    fontFamily: mono,
  },
  perfLabel: { color: "#6b7280", fontSize: 8, marginTop: 2 }, // audit-ok: debug-only dev overlay
  perfWarn:  { color: "#fbbf24" }, // audit-ok: debug-only dev overlay
  perfError: { color: "#f87171" }, // audit-ok: debug-only dev overlay

  // API log rows
  apiRow:       { borderBottomWidth: 1, borderBottomColor: "#ffffff08" },
  apiRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  methodText:   { color: "#c4b5fd", fontSize: 10, fontFamily: mono, width: 32 }, // audit-ok: debug-only dev overlay
  endpointText: { flex: 1, color: "#ffffff80", fontSize: 10 },
  rtText:       { color: "#6b7280", fontSize: 10 }, // audit-ok: debug-only dev overlay
  rtSlow:       { color: "#f87171" }, // audit-ok: debug-only dev overlay
  chip: {
    fontSize: 10,
    fontFamily: mono,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  apiRowBody:   { paddingHorizontal: 12, paddingBottom: 8 },
  errorText:    { color: "#f87171", fontSize: 10, marginBottom: 4 }, // audit-ok: debug-only dev overlay
  payloadBlock: { marginBottom: 6 },
  payloadLabel: {
    color: "#6b7280", // audit-ok: debug-only dev overlay
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  payloadText: {
    color: "#ffffff50", // audit-ok: debug-only dev overlay
    fontSize: 10,
    fontFamily: mono,
    backgroundColor: "#00000030",
    borderRadius: 4,
    padding: 6,
  },
  metaText: { color: "#4b5563", fontSize: 9, marginTop: 4 }, // audit-ok: debug-only dev overlay

  // State tab
  sectionTitle: {
    color: "#6b7280", // audit-ok: debug-only dev overlay
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 14,
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff05",
  },
  featureName:   { color: "#9ca3af", fontSize: 11 }, // audit-ok: debug-only dev overlay
  featureStatus: { fontSize: 10, fontFamily: mono },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoLabel: { color: "#6b7280", fontSize: 10 }, // audit-ok: debug-only dev overlay
  infoValue: {
    color: "#d1d5db", // audit-ok: debug-only dev overlay
    fontSize: 10,
    fontFamily: mono,
    flex: 1,
    textAlign: "right",
  },

  // Colors tab
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff05",
  },
  colorSwatch:     { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: "#ffffff20" },
  colorTokenName:  { color: "#c4b5fd", fontSize: 10, fontFamily: mono }, // audit-ok: debug-only dev overlay
  colorNote:       { color: "#6b7280", fontSize: 9 }, // audit-ok: debug-only dev overlay
  colorHex:        { color: "#9ca3af", fontSize: 10, fontFamily: mono }, // audit-ok: debug-only dev overlay
  colorDisclaimer: {
    color: "#6b7280", // audit-ok: debug-only dev overlay
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 8,
    fontStyle: "italic",
  },

  // Parity tab
  scoreRow: { alignItems: "center", paddingVertical: 12 },
  scoreValue: {
    fontSize: 48,
    fontWeight: "800",
    fontFamily: mono,
  },
  scoreLabel: { color: "#6b7280", fontSize: 11 }, // audit-ok: debug-only dev overlay
  tlRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff08",
    gap: 10,
  },
  tlIcon:   { fontSize: 14, width: 18 },
  tlLabel:  { color: "#d1d5db", fontSize: 11, fontWeight: "600" }, // audit-ok: debug-only dev overlay
  tlDetail: { color: "#6b7280", fontSize: 10, marginTop: 2 }, // audit-ok: debug-only dev overlay
  issueRow: { flexDirection: "row", gap: 8, paddingVertical: 6 },
  issueIcon: { color: "#fbbf24", fontSize: 12 }, // audit-ok: debug-only dev overlay
  issueText: { color: "#e5e7eb", fontSize: 11, flex: 1 }, // audit-ok: debug-only dev overlay
  codeBlock: {
    backgroundColor: "#00000040", // audit-ok: debug-only dev overlay
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  codeText: { color: "#ffffff60", fontSize: 9, fontFamily: mono }, // audit-ok: debug-only dev overlay

  // Footer
  footer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#ffffff08",
  },
  pushBtn: {
    flex: 1,
    backgroundColor: "#6d28d9", // audit-ok: debug-only dev overlay
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  pushBtnDisabled: { opacity: 0.5 },
  pushBtnText:     { color: "#fff", fontWeight: "600", fontSize: 12 },
  exportBtn: {
    backgroundColor: "#1c1a3a", // audit-ok: debug-only dev overlay
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7c3aed40",
  },
  exportBtnText: { color: "#a78bfa", fontSize: 12 }, // audit-ok: debug-only dev overlay
  clearBtn: {
    backgroundColor: "#1f1f1f", // audit-ok: debug-only dev overlay
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnText: { color: "#f87171", fontSize: 12 }, // audit-ok: debug-only dev overlay
});
// i18n-ignore-end
