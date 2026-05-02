import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  ToastAndroid,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  VACCINATIONS,
  getUpcomingVaccinationsWithLog,
  getVaccinationSummary,
  getCommonIssuesForAge,
  type VaxLogMap,
  type VaxStatus,
} from "@workspace/infant-hub";
import { brand, palette } from "@/constants/colors";
import { useAuthFetch } from "@/hooks/useAuthFetch";

type Props = { ageMonths: number; childId?: number };

type ServerLog = {
  childId: number;
  ageLabel: string;
  status: VaxStatus;
  doneAt: string | null;
  updatedAt: string;
};

function flashToast(msg: string) {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
}

/** Mobile twin of the web Health sub-card: India NIS / IAP vaccinations
 *  with per-dose tracking + the common-issue references. */
export default function InfantHealthTab({ ageMonths, childId }: Props) {
  const { t } = useTranslation();
  const authFetch = useAuthFetch();

  const [logMap, setLogMap] = useState<VaxLogMap>({});
  const [loading, setLoading] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  // ─── Load existing logs ─────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const r = await authFetch(`/api/vaccinations/${childId}`);
      if (!r.ok) return;
      const j = (await r.json()) as { ok: boolean; logs: ServerLog[] };
      if (j.ok) {
        const map: Record<string, VaxStatus> = {};
        for (const l of j.logs) map[l.ageLabel] = l.status;
        setLogMap(map);
      }
    } catch {
      // swallow — header banner just shows defaults
    } finally {
      setLoading(false);
    }
  }, [authFetch, childId]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  // ─── Mutate ─────────────────────────────────────────────────────────────
  const setStatus = useCallback(
    async (ageLabel: string, status: VaxStatus | null) => {
      if (!childId) return;
      const previous = logMap[ageLabel];
      // Optimistic update
      setLogMap((prev) => {
        const next = { ...prev };
        if (status === null) delete next[ageLabel];
        else next[ageLabel] = status;
        return next;
      });
      setPendingLabel(ageLabel);
      try {
        const path = `/api/vaccinations/${childId}/${encodeURIComponent(ageLabel)}`;
        const r =
          status === null
            ? await authFetch(path, { method: "DELETE" })
            : await authFetch(path, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
              });
        if (!r.ok) throw new Error(`status ${r.status}`);
      } catch {
        // Roll back
        setLogMap((prev) => {
          const next = { ...prev };
          if (previous) next[ageLabel] = previous;
          else delete next[ageLabel];
          return next;
        });
        flashToast("Couldn't save — try again");
      } finally {
        setPendingLabel(null);
      }
    },
    [authFetch, childId, logMap],
  );

  // ─── Derived data ───────────────────────────────────────────────────────
  const upcoming = useMemo(
    () => getUpcomingVaccinationsWithLog(ageMonths, logMap),
    [ageMonths, logMap],
  );
  const summary = useMemo(
    () => getVaccinationSummary(ageMonths, logMap),
    [ageMonths, logMap],
  );
  const issues = getCommonIssuesForAge(ageMonths);

  const trackingEnabled = !!childId;

  return (
    <View style={{ gap: 12 }}>
      {/* ── Summary banner ─────────────────────────────────────────────── */}
      {trackingEnabled && (
        <View style={styles.summaryBlock} testID="vax-summary">
          <View style={styles.summaryHead}>
            <MaterialCommunityIcons
              name="clipboard-check-outline"
              size={14}
              color={palette.emerald400}
            />
            <Text style={styles.summaryTitle}>Vaccination tracker</Text>
            {loading && <ActivityIndicator size="small" color={brand.violet200} />}
          </View>
          <Text style={styles.summaryLine}>
            <Text style={styles.summaryStrong}>{summary.done}</Text>
            <Text> done · </Text>
            <Text style={[styles.summaryStrong, { color: palette.amber400 }]}>
              {summary.pending}
            </Text>
            <Text> pending of {summary.total} total</Text>
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(
                    (summary.done / Math.max(1, summary.total)) * 100,
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* ── Upcoming list (excludes done) ──────────────────────────────── */}
      <View style={styles.block}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="needle" size={14} color={palette.emerald400} />
          <Text style={styles.headerText}>
            {t("infant_hub.health.upcoming_title")}
          </Text>
        </View>
        {upcoming.length === 0 ? (
          <Text style={styles.empty}>{t("infant_hub.health.no_upcoming")}</Text>
        ) : (
          upcoming.map((v) => {
            const status = logMap[v.ageLabel];
            const busy = pendingLabel === v.ageLabel;
            return (
              <View
                key={v.ageLabel}
                style={styles.row}
                testID={`vax-row-${v.ageLabel}`}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.rowAge}>{v.ageLabel}</Text>
                  <Text style={styles.rowVax}>{v.vaccines.join(" · ")}</Text>
                  {trackingEnabled && (
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() =>
                          setStatus(v.ageLabel, status === "done" ? null : "done")
                        }
                        disabled={busy}
                        style={[
                          styles.actionBtn,
                          status === "done" && styles.actionBtnDone,
                          busy && { opacity: 0.4 },
                        ]}
                        testID={`vax-done-${v.ageLabel}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: status === "done" }}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color={
                            status === "done" ? "#fff" : palette.emerald400
                          }
                        />
                        <Text
                          style={[
                            styles.actionTxt,
                            { color: palette.emerald400 },
                            status === "done" && { color: "#fff" },
                          ]}
                        >
                          Done
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() =>
                          setStatus(
                            v.ageLabel,
                            status === "missed" ? null : "missed",
                          )
                        }
                        disabled={busy}
                        style={[
                          styles.actionBtn,
                          status === "missed" && styles.actionBtnMissed,
                          busy && { opacity: 0.4 },
                        ]}
                        testID={`vax-missed-${v.ageLabel}`}
                        accessibilityRole="button"
                        accessibilityState={{ selected: status === "missed" }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={12}
                          color={status === "missed" ? "#fff" : palette.amber400}
                        />
                        <Text
                          style={[
                            styles.actionTxt,
                            { color: palette.amber400 },
                            status === "missed" && { color: "#fff" },
                          ]}
                        >
                          Missed
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── Pending (missed / overdue) ─────────────────────────────────── */}
      {trackingEnabled && summary.pending > 0 && (
        <View style={styles.block}>
          <View style={styles.header}>
            <Ionicons name="alert-circle" size={14} color={palette.amber400} />
            <Text style={styles.headerText}>
              Pending — past doses to confirm
            </Text>
          </View>
          {VACCINATIONS.filter(
            (v) => v.ageMonths < ageMonths && logMap[v.ageLabel] !== "done",
          ).map((v) => {
            const status = logMap[v.ageLabel];
            const busy = pendingLabel === v.ageLabel;
            return (
              <View
                key={v.ageLabel}
                style={styles.row}
                testID={`vax-pending-${v.ageLabel}`}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.rowAge}>{v.ageLabel}</Text>
                    {status === "missed" && (
                      <Text style={styles.missedTag}>missed</Text>
                    )}
                  </View>
                  <Text style={styles.rowVax}>{v.vaccines.join(" · ")}</Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() =>
                        setStatus(v.ageLabel, status === "done" ? null : "done")
                      }
                      disabled={busy}
                      style={[
                        styles.actionBtn,
                        status === "done" && styles.actionBtnDone,
                        busy && { opacity: 0.4 },
                      ]}
                      testID={`vax-done-${v.ageLabel}`}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={status === "done" ? "#fff" : palette.emerald400}
                      />
                      <Text
                        style={[
                          styles.actionTxt,
                          { color: palette.emerald400 },
                          status === "done" && { color: "#fff" },
                        ]}
                      >
                        Mark done
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setStatus(
                          v.ageLabel,
                          status === "missed" ? null : "missed",
                        )
                      }
                      disabled={busy}
                      style={[
                        styles.actionBtn,
                        status === "missed" && styles.actionBtnMissed,
                        busy && { opacity: 0.4 },
                      ]}
                      testID={`vax-missed-${v.ageLabel}`}
                    >
                      <Ionicons
                        name="close-circle"
                        size={12}
                        color={status === "missed" ? "#fff" : palette.amber400}
                      />
                      <Text
                        style={[
                          styles.actionTxt,
                          { color: palette.amber400 },
                          status === "missed" && { color: "#fff" },
                        ]}
                      >
                        Missed
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
          <Text style={styles.hint}>
            Tap “Mark done” for any dose you've already given to clear it from
            this list.
          </Text>
        </View>
      )}

      {!trackingEnabled && summary.done === 0 && getUpcomingVaccinationsWithLog(ageMonths, {}).length < VACCINATIONS.length && (
        // Read-only fallback when no childId is provided (legacy callers).
        <View style={styles.completedBlock}>
          <View style={styles.header}>
            <Ionicons
              name="checkmark-done"
              size={14}
              color="rgba(255,255,255,0.65)"
            />
            <Text style={styles.completedHeader}>
              {t("infant_hub.health.completed", {
                count: VACCINATIONS.filter((v) => v.ageMonths < ageMonths).length,
              })}
            </Text>
          </View>
          <Text style={styles.completedHint}>
            {t("infant_hub.health.source_note")}
          </Text>
        </View>
      )}

      {/* ── Common issues (unchanged) ──────────────────────────────────── */}
      <View style={styles.block}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={14}
            color={palette.amber400}
          />
          <Text style={styles.headerText}>
            {t("infant_hub.health.common_issues_title")}
          </Text>
        </View>
        {issues.length === 0 ? (
          <Text style={styles.empty}>{t("infant_hub.health.no_issues")}</Text>
        ) : (
          issues.map((i) => (
            <View key={i.id} style={styles.issueCard}>
              <View style={styles.issueHead}>
                <Text style={styles.issueEmoji}>{i.emoji}</Text>
                <Text style={styles.issueTitle}>{i.title}</Text>
              </View>
              <Text style={styles.issueBody}>{i.content}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  summaryBlock: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(16,185,129,0.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
    flex: 1,
  },
  summaryLine: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  summaryStrong: {
    color: palette.emerald400,
    fontWeight: "800",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: palette.emerald400,
  },
  completedBlock: {
    backgroundColor: "rgba(16,185,129,0.10)",
    borderColor: "rgba(16,185,129,0.30)",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 4,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  completedHeader: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
    fontSize: 12,
  },
  completedHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10.5,
    lineHeight: 14,
  },
  empty: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontStyle: "italic",
  },
  hint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10.5,
    lineHeight: 14,
    fontStyle: "italic",
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.10)",
  },
  rowAge: {
    color: brand.amber400,
    fontWeight: "800",
    fontSize: 11,
  },
  rowVax: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    flexWrap: "wrap",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  actionBtnDone: {
    backgroundColor: "rgba(16,185,129,0.55)",
    borderColor: palette.emerald400,
  },
  actionBtnMissed: {
    backgroundColor: "rgba(245,158,11,0.55)",
    borderColor: palette.amber400,
  },
  actionTxt: { fontSize: 11, fontWeight: "800" },
  missedTag: {
    color: palette.amber400,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: "rgba(245,158,11,0.16)",
    borderRadius: 4,
  },
  issueCard: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  issueHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  issueEmoji: { fontSize: 16 },
  issueTitle: { color: "#fff", fontWeight: "800", fontSize: 12.5 },
  issueBody: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 12,
    lineHeight: 17,
  },
});
