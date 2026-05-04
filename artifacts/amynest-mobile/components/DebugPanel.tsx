// i18n-ignore-start — debug/dev tool: English-only by design
import React, { useState, useEffect, useCallback, useRef } from "react";
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
} from "react-native";
import { useSegments } from "expo-router";
import { useDebugMode } from "@/contexts/DebugContext";
import { apiLogger, type ApiLogEntry } from "@/lib/apiLogger";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useQueryClient } from "@tanstack/react-query";

function computeFeatureFlags(entries: ReadonlyArray<ApiLogEntry>): Record<string, boolean> {
  const has = (kw: string) => entries.some((e) => e.endpoint.includes(kw));
  return {
    routine_generation: has("/routines"),
    meal_suggestions: has("/meals"),
    phonics: has("/phonics"),
    ai_coach: has("/ai-coach") || has("/ai-tutor"),
    behavior_tracker: has("/behaviors"),
    notifications: has("/push"),
    life_skills: has("/life-skills"),
    smart_study: has("/smart-study"),
    abacus: has("/abacus"),
    spelling: has("/spelling"),
  };
}

function formatScreenName(segments: string[]): string {
  if (!segments.length) return "Home";
  const last = segments[segments.length - 1];
  return last.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusChip({ status }: { status: number | null }) {
  const color =
    status === null ? "#f87171" : status < 300 ? "#34d399" : status < 500 ? "#fbbf24" : "#f87171";
  return (
    <Text style={[styles.chip, { color, borderColor: color + "40" }]}>
      {status ?? "ERR"}
    </Text>
  );
}

function ApiRow({ entry }: { entry: ApiLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const shortUrl = entry.endpoint.replace(/^https?:\/\/[^/]+/, "").slice(0, 55);
  return (
    <View style={styles.apiRow}>
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.apiRowHeader}>
        <Text style={styles.methodText}>{entry.method}</Text>
        <StatusChip status={entry.status} />
        <Text style={styles.endpointText} numberOfLines={1}>{shortUrl}</Text>
        {entry.responseTime != null && (
          <Text style={styles.rtText}>{entry.responseTime}ms</Text>
        )}
      </TouchableOpacity>
      {expanded && (
        <View style={styles.apiRowBody}>
          {entry.error ? (
            <Text style={styles.errorText}>{entry.error}</Text>
          ) : null}
          {entry.requestPayload ? (
            <View style={styles.payloadBlock}>
              <Text style={styles.payloadLabel}>Request</Text>
              <Text style={styles.payloadText}>
                {JSON.stringify(entry.requestPayload, null, 2)}
              </Text>
            </View>
          ) : null}
          {entry.responsePayload ? (
            <View style={styles.payloadBlock}>
              <Text style={styles.payloadLabel}>Response</Text>
              <Text style={styles.payloadText} numberOfLines={20}>
                {JSON.stringify(entry.responsePayload, null, 2)}
              </Text>
            </View>
          ) : null}
          <Text style={styles.metaText}>
            Screen: {entry.screen} · {new Date(entry.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );
}

export function DebugPanel() {
  const { debugMode, disable } = useDebugMode();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "context">("logs");
  const [entries, setEntries] = useState<ApiLogEntry[]>([]);
  const [pushing, setPushing] = useState(false);
  const segments = useSegments();
  const screenName = formatScreenName(segments as string[]);
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const sessionId = useRef(Math.random().toString(36).slice(2, 10));

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
      const profile = qc.getQueryData<{ country?: string; cuisine?: string; dietType?: string }>(["parent-profile"]);
      await authFetch("/api/debug/log", {
        method: "POST",
        body: JSON.stringify({
          platform: "mobile",
          screen: screenName,
          appVersion: process.env.EXPO_PUBLIC_APP_VERSION ?? "dev",
          sessionId: sessionId.current,
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
      Alert.alert("Debug Snapshot Pushed ✓", "Open /debug-parity on the web to see the comparison.");
    } catch (err) {
      Alert.alert("Push Failed", String(err));
    } finally {
      setPushing(false);
    }
  }, [authFetch, entries, qc, screenName]);

  if (!debugMode) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <TouchableOpacity
          onPress={() => setOpen(true)}
          style={styles.fab}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.fabText}>🐛</Text>
        </TouchableOpacity>
      )}

      <Modal visible={open} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.overlay}>
          <View style={styles.panel}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>🐛 Debug Panel</Text>
              <View style={styles.headerActions}>
                <TouchableOpacity onPress={disable} style={styles.offBtn}>
                  <Text style={styles.offBtnText}>OFF</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Screen info */}
            <View style={styles.infoBar}>
              <Text style={styles.screenName}>📍 {screenName}</Text>
              <Text style={styles.platformText}>Platform: mobile · {Platform.OS}</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              {(["logs", "context"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, activeTab === tab && styles.tabActive]}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab === "logs" ? `API Log (${entries.length})` : "Context"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content */}
            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
              {activeTab === "logs" && (
                <>
                  {entries.length === 0 ? (
                    <Text style={styles.emptyText}>No API calls logged yet.</Text>
                  ) : (
                    entries.map((e) => <ApiRow key={e.id} entry={e} />)
                  )}
                </>
              )}

              {activeTab === "context" && (
                <View style={styles.contextSection}>
                  <Text style={styles.sectionTitle}>FEATURES DETECTED</Text>
                  {Object.entries(computeFeatureFlags(entries)).map(([feat, active]) => (
                    <View key={feat} style={styles.featureRow}>
                      <Text style={styles.featureName}>{feat.replace(/_/g, " ")}</Text>
                      <Text style={[styles.featureStatus, { color: active ? "#34d399" : "#ffffff30" }]}>
                        {active ? "✓ used" : "—"}
                      </Text>
                    </View>
                  ))}

                  <Text style={[styles.sectionTitle, { marginTop: 16 }]}>SESSION INFO</Text>
                  <InfoRow label="Screen" value={screenName} />
                  <InfoRow label="Segments" value={segments.join(" / ") || "root"} />
                  <InfoRow label="API calls" value={String(entries.length)} />
                  <InfoRow label="Session ID" value={sessionId.current} />
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handlePush}
                disabled={pushing}
                style={[styles.pushBtn, pushing && styles.pushBtnDisabled]}
              >
                {pushing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.pushBtnText}>▶ Push Snapshot to Server</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { apiLogger.clear(); }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>🗑 Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 8,
    bottom: 120,
    zIndex: 9000,
    backgroundColor: "#3b1f7a",
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
    backgroundColor: "#0e0b1f",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    borderTopWidth: 1,
    borderColor: "#7c3aed50",
  },
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
  headerTitle: { color: "#a78bfa", fontWeight: "700", fontSize: 14 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  offBtn: { backgroundColor: "#1f1f1f", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  offBtnText: { color: "#f87171", fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  closeBtn: { padding: 4 },
  closeBtnText: { color: "#9ca3af", fontSize: 16 },
  infoBar: { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#ffffff08", backgroundColor: "#00000020" },
  screenName: { color: "#c4b5fd", fontSize: 11, fontWeight: "600" },
  platformText: { color: "#6b7280", fontSize: 10, marginTop: 2 },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ffffff08" },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#7c3aed" },
  tabText: { fontSize: 11, color: "#6b7280" },
  tabTextActive: { color: "#a78bfa", fontWeight: "600" },
  content: { flex: 1, maxHeight: 400 },
  emptyText: { color: "#6b7280", fontSize: 12, textAlign: "center", paddingVertical: 32 },
  apiRow: { borderBottomWidth: 1, borderBottomColor: "#ffffff08" },
  apiRowHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  methodText: { color: "#c4b5fd", fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", width: 32 },
  endpointText: { flex: 1, color: "#ffffff80", fontSize: 10 },
  rtText: { color: "#6b7280", fontSize: 10 },
  chip: { fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  apiRowBody: { paddingHorizontal: 12, paddingBottom: 8 },
  errorText: { color: "#f87171", fontSize: 10, marginBottom: 4 },
  payloadBlock: { marginBottom: 6 },
  payloadLabel: { color: "#6b7280", fontSize: 9, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  payloadText: { color: "#ffffff50", fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", backgroundColor: "#00000030", borderRadius: 4, padding: 6 },
  metaText: { color: "#4b5563", fontSize: 9, marginTop: 4 },
  contextSection: { padding: 12 },
  sectionTitle: { color: "#6b7280", fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 },
  featureRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#ffffff05" },
  featureName: { color: "#9ca3af", fontSize: 11 },
  featureStatus: { fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  infoLabel: { color: "#6b7280", fontSize: 10 },
  infoValue: { color: "#d1d5db", fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", flex: 1, textAlign: "right" },
  footer: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "#ffffff08" },
  pushBtn: { flex: 1, backgroundColor: "#6d28d9", borderRadius: 8, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  pushBtnDisabled: { opacity: 0.5 },
  pushBtnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  clearBtn: { backgroundColor: "#1f1f1f", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  clearBtnText: { color: "#f87171", fontSize: 12 },
});
// i18n-ignore-end
