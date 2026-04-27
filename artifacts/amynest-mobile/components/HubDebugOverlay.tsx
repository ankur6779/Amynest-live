import React, { useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  WEB_HUB_TILES,
  WEB_SECTION_2_TILES,
  bandIndexToWebLabel,
  computeWebSection1Tiles,
  computeWebShowsSection2,
  diffTiles,
} from "@/lib/hubWebReference";

interface HubDebugOverlayProps {
  /** Tile ids rendered in Section 1 of the mobile hub, in visual order. */
  mobileSection1Ids: readonly string[];
  /** Tile ids rendered in Section 2 of the mobile hub, in visual order. */
  mobileSection2Ids: readonly string[];
  /** Whether the mobile hub is currently rendering Section 2. */
  mobileShowsSection2: boolean;
  /** Active child band index (0 = 0–24 mo, 1 = 24–48 mo, …). */
  currentBand: number;
  /** Active child total age in months. */
  ageMonths: number;
  /** Active child name for display. */
  childName: string;
}

/**
 * Floating dev-only overlay that lists, for the active child:
 *  · which tiles the mobile hub is currently rendering
 *  · which tiles the website would render for the same child
 *  · the diff (extra on mobile / missing on mobile / order mismatches)
 *
 * Pure presentational — does NOT modify the hub render. Intended to make
 * hand-fixing one-tile-at-a-time differences fast and reliable.
 *
 * Mounted only when __DEV__ is true.
 */
export function HubDebugOverlay({
  mobileSection1Ids,
  mobileSection2Ids,
  mobileShowsSection2,
  currentBand,
  ageMonths,
  childName,
}: HubDebugOverlayProps) {
  const [open, setOpen] = useState(false);

  const webBand = useMemo(() => bandIndexToWebLabel(currentBand), [currentBand]);
  const webTiles = useMemo(
    () => computeWebSection1Tiles(webBand, ageMonths),
    [webBand, ageMonths],
  );
  const webTileIds = useMemo(() => webTiles.map((t) => t.id), [webTiles]);
  const webShowsSection2 = useMemo(() => computeWebShowsSection2(webBand), [webBand]);

  const section1Diff = useMemo(
    () => diffTiles(mobileSection1Ids, webTileIds),
    [mobileSection1Ids, webTileIds],
  );

  const webSection2Ids = useMemo(() => WEB_SECTION_2_TILES.map((t) => t.id), []);
  const section2Diff = useMemo(
    () => diffTiles(mobileSection2Ids, webShowsSection2 ? webSection2Ids : []),
    [mobileSection2Ids, webShowsSection2, webSection2Ids],
  );

  const totalIssues =
    section1Diff.extraOnMobile.length +
    section1Diff.missingOnMobile.length +
    section1Diff.orderMismatches.length +
    (mobileShowsSection2 !== webShowsSection2 ? 1 : 0) +
    section2Diff.extraOnMobile.length +
    section2Diff.missingOnMobile.length;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.fab}
        testID="hub-debug-fab"
        accessibilityLabel="Open Hub debug overlay"
      >
        <Ionicons name="bug" size={20} color="#fff" />
        {totalIssues > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalIssues > 99 ? "99+" : String(totalIssues)}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>🐞 Hub Debug — Mobile vs Web</Text>
              <Pressable onPress={() => setOpen(false)} testID="hub-debug-close">
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 14, gap: 14 }}>
              <Block label="Active child">
                <Row k="Name" v={childName} />
                <Row k="Age" v={`${ageMonths} months`} />
                <Row k="Band" v={`${currentBand} (${webBand})`} />
              </Block>

              <Block label="Section 2 visibility">
                <Row k="Web rule" v={webShowsSection2 ? "SHOW" : "HIDE"} good={webShowsSection2 === mobileShowsSection2} />
                <Row k="Mobile" v={mobileShowsSection2 ? "SHOW" : "HIDE"} good={webShowsSection2 === mobileShowsSection2} />
              </Block>

              <Block label={`Section 1 — mobile renders ${mobileSection1Ids.length}, web renders ${webTileIds.length}`}>
                {section1Diff.missingOnMobile.length === 0 &&
                 section1Diff.extraOnMobile.length === 0 &&
                 section1Diff.orderMismatches.length === 0 ? (
                  <Text style={styles.ok}>✓ Section 1 matches web exactly.</Text>
                ) : (
                  <>
                    {section1Diff.missingOnMobile.length > 0 && (
                      <DiffList title="Missing on mobile (web has, mobile doesn't)" tone="warn" ids={section1Diff.missingOnMobile} />
                    )}
                    {section1Diff.extraOnMobile.length > 0 && (
                      <DiffList title="Extra on mobile (mobile has, web doesn't)" tone="bad" ids={section1Diff.extraOnMobile} />
                    )}
                    {section1Diff.orderMismatches.length > 0 && (
                      <View style={{ gap: 4 }}>
                        <Text style={styles.diffTitleBad}>Order mismatches:</Text>
                        {section1Diff.orderMismatches.map((m) => (
                          <Text key={m.id} style={styles.diffItem}>
                            • <Text style={styles.bold}>{m.id}</Text> — web idx {m.webIndex}, mobile idx {m.mobileIndex}
                          </Text>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </Block>

              <Block label="Section 1 — render order">
                <SideBySide
                  leftTitle="Mobile (current)"
                  leftItems={mobileSection1Ids}
                  rightTitle="Web (reference)"
                  rightItems={webTileIds}
                />
              </Block>

              {(mobileShowsSection2 || webShowsSection2) && (
                <Block label={`Section 2 — mobile renders ${mobileSection2Ids.length}, web renders ${webShowsSection2 ? webSection2Ids.length : 0}`}>
                  {section2Diff.missingOnMobile.length === 0 &&
                   section2Diff.extraOnMobile.length === 0 ? (
                    <Text style={styles.ok}>✓ Section 2 contents match.</Text>
                  ) : (
                    <>
                      {section2Diff.missingOnMobile.length > 0 && (
                        <DiffList title="Missing on mobile" tone="warn" ids={section2Diff.missingOnMobile} />
                      )}
                      {section2Diff.extraOnMobile.length > 0 && (
                        <DiffList title="Extra on mobile" tone="bad" ids={section2Diff.extraOnMobile} />
                      )}
                    </>
                  )}
                </Block>
              )}

              <Text style={styles.footnote}>
                Reference: lib/hubWebReference.ts — keep in sync with
                artifacts/kidschedule/src/pages/parenting-hub.tsx when web changes.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockLabel}>{label}</Text>
      <View style={{ gap: 6 }}>{children}</View>
    </View>
  );
}

function Row({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={[styles.rowVal, good === true && styles.rowGood, good === false && styles.rowBad]}>{v}</Text>
    </View>
  );
}

function DiffList({ title, tone, ids }: { title: string; tone: "warn" | "bad"; ids: string[] }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={tone === "warn" ? styles.diffTitleWarn : styles.diffTitleBad}>{title}:</Text>
      {ids.map((id) => (
        <Text key={id} style={styles.diffItem}>• {id}</Text>
      ))}
    </View>
  );
}

function SideBySide({
  leftTitle, leftItems, rightTitle, rightItems,
}: {
  leftTitle: string; leftItems: readonly string[];
  rightTitle: string; rightItems: readonly string[];
}) {
  const max = Math.max(leftItems.length, rightItems.length);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.sideHeaderRow}>
        <Text style={styles.sideHeader}>{leftTitle}</Text>
        <Text style={styles.sideHeader}>{rightTitle}</Text>
      </View>
      {Array.from({ length: max }).map((_, i) => {
        const l = leftItems[i] ?? "—";
        const r = rightItems[i] ?? "—";
        const match = l === r && l !== "—";
        return (
          <View key={i} style={styles.sideRow}>
            <Text style={[styles.sideCell, match && styles.sideCellMatch]} numberOfLines={1}>
              {String(i + 1).padStart(2, "0")}. {l}
            </Text>
            <Text style={[styles.sideCell, match && styles.sideCellMatch]} numberOfLines={1}>
              {String(i + 1).padStart(2, "0")}. {r}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 14,
    bottom: 100,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: "#7C3AED",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.35, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
  badge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", backgroundColor: "#0F172A", borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },

  block: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, gap: 8 },
  blockLabel: { color: "#A78BFA", fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },

  row: { flexDirection: "row", justifyContent: "space-between" },
  rowKey: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  rowVal: { color: "#fff", fontSize: 12, fontWeight: "600" },
  rowGood: { color: "#34D399" },
  rowBad: { color: "#F87171" },

  ok: { color: "#34D399", fontSize: 12, fontWeight: "600" },

  diffTitleWarn: { color: "#FBBF24", fontSize: 11, fontWeight: "700" },
  diffTitleBad: { color: "#F87171", fontSize: 11, fontWeight: "700" },
  diffItem: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginLeft: 4, fontFamily: "Menlo" },
  bold: { fontWeight: "700" },

  sideHeaderRow: { flexDirection: "row", gap: 8 },
  sideHeader: { flex: 1, color: "#A78BFA", fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  sideRow: { flexDirection: "row", gap: 8 },
  sideCell: { flex: 1, color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Menlo" },
  sideCellMatch: { color: "#34D399" },

  footnote: { color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 4 },
});

export default HubDebugOverlay;
