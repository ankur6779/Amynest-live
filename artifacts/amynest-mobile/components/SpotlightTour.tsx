/**
 * SpotlightTour — Premium interactive guided walkthrough for mobile.
 *
 * Shows automatically on first launch (AsyncStorage key amynest-tour-v1 !== "done").
 * Uses 4-rect overlay technique to punch a transparent hole over the target element,
 * with an Animated glow ring and glassmorphism tooltip card.
 *
 * Spotlight positions are computed mathematically from screen dimensions and
 * safe-area insets — no DOM measurement or ref drilling needed.
 *
 * Steps: Dashboard → Routine → Coach → Hub → Amy FAB
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { brand } from "@/constants/colors";

const TOUR_KEY    = "amynest-tour-v1";
const TOTAL_STEPS = 5;

// ─── Tab-bar & FAB layout constants (must mirror _layout.tsx + AmyFab.tsx) ──
const PILL_PADDING_V = 10;
const PILL_ITEM_H    = 52;
const TAB_BAR_H      = PILL_PADDING_V * 2 + PILL_ITEM_H; // 72
const PILL_PAD_H     = 6; // barInner paddingHorizontal
const COACH_DISC     = 50;
const COACH_LIFT     = 6;
const FAB_RING_SIZE  = 74; // FAB_SIZE(58) + 16 — visual hit area
const FAB_TAB_OFFSET = 20; // TAB_OFFSET in AmyFab.tsx
const FAB_GAP        = 12; // clearance above tab bar

// ─── Types ───────────────────────────────────────────────────────────────────
interface SpotRect { x: number; y: number; w: number; h: number; r: number }

interface StepMeta {
  titleKey: string;
  bodyKey:  string;
  badge?:   string;
}

const STEP_META: StepMeta[] = [
  { titleKey: "tour.step1_title", bodyKey: "tour.step1_body" },
  { titleKey: "tour.step2_title", bodyKey: "tour.step2_body", badge: "✨ Patent Pending" },
  { titleKey: "tour.step3_title", bodyKey: "tour.step3_body" },
  { titleKey: "tour.step4_title", bodyKey: "tour.step4_body" },
  { titleKey: "tour.step5_title", bodyKey: "tour.step5_body" },
];

// ─── Position helpers ─────────────────────────────────────────────────────────
function buildSpots(W: number, H: number, safeBot: number): SpotRect[] {
  const tabBarBottomOffset = safeBot + 8; // bottomOffset in FloatingTabBar
  const tabBarTopY  = H - tabBarBottomOffset - TAB_BAR_H;
  const tabBarW     = W - 32; // left:16, right:16
  const tabItemW    = (tabBarW - PILL_PAD_H * 2) / 4;

  // Regular tab spotlight (idx 0,1,3 → dashboard, routines, hub)
  function tabRect(tabIdx: number, pad = 10): SpotRect {
    const cx = 16 + PILL_PAD_H + (tabIdx + 0.5) * tabItemW;
    const cy = tabBarTopY + PILL_PADDING_V + PILL_ITEM_H / 2;
    return {
      x: cx - 22 - pad,
      y: cy - 22 - pad,
      w: 44 + pad * 2,
      h: 44 + pad * 2,
      r: 22 + pad,
    };
  }

  // Coach tab (idx 2) — disc is lifted COACH_LIFT px above center
  const coachCX = 16 + PILL_PAD_H + (2 + 0.5) * tabItemW;
  const coachCY = tabBarTopY + PILL_PADDING_V + PILL_ITEM_H / 2 - COACH_LIFT;
  const coachPad = 10;
  const coachRect: SpotRect = {
    x: coachCX - COACH_DISC / 2 - coachPad,
    y: coachCY - COACH_DISC / 2 - coachPad,
    w: COACH_DISC + coachPad * 2,
    h: COACH_DISC + coachPad * 2,
    r: COACH_DISC / 2 + coachPad,
  };

  // Amy FAB — right:16, bottom = safeBot + FAB_TAB_OFFSET + TAB_BAR_H + FAB_GAP
  const fabBottom = safeBot + FAB_TAB_OFFSET + TAB_BAR_H + FAB_GAP;
  const fabTopY   = H - fabBottom - FAB_RING_SIZE;
  const fabPad    = 8;
  const fabRect: SpotRect = {
    x: W - 16 - FAB_RING_SIZE - fabPad,
    y: fabTopY - fabPad,
    w: FAB_RING_SIZE + fabPad * 2,
    h: FAB_RING_SIZE + fabPad * 2,
    r: FAB_RING_SIZE / 2 + fabPad,
  };

  // Step order: Dashboard(0) → Routines(1) → Coach(2) → Hub(3) → FAB
  return [tabRect(0), tabRect(1), coachRect, tabRect(3), fabRect];
}

// ─── Tooltip component ────────────────────────────────────────────────────────
function Tooltip({
  meta, idx, spot, onNext, onSkip, W, H,
}: {
  meta:   StepMeta;
  idx:    number;
  spot:   SpotRect | null;
  onNext: () => void;
  onSkip: () => void;
  W:      number;
  H:      number;
}) {
  const { t } = useTranslation();
  const TOOLTIP_W = Math.min(310, W - 32);
  const TOOLTIP_H = 240;

  let left = (W - TOOLTIP_W) / 2;
  let top: number;

  if (spot) {
    const spotCY = spot.y + spot.h / 2;
    if (spotCY > H * 0.52) {
      // Spotlight in bottom half → tooltip above
      top = Math.max(80, spot.y - TOOLTIP_H - 20);
    } else {
      // Spotlight in top half → tooltip below
      top = Math.min(H - TOOLTIP_H - 40, spot.y + spot.h + 20);
    }
  } else {
    top = (H - TOOLTIP_H) / 2;
  }

  const isLast = idx === TOTAL_STEPS - 1;

  return (
    <View style={[styles.tooltip, { left, top, width: TOOLTIP_W }]}>
      {/* Patent-pending badge */}
      {meta.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{meta.badge}</Text>
        </View>
      )}

      {/* Title + counter */}
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={2}>
          {t(meta.titleKey)}
        </Text>
        <Text style={styles.counter}>
          {idx + 1} / {TOTAL_STEPS}
        </Text>
      </View>

      {/* Body */}
      <Text style={styles.body}>{t(meta.bodyKey)}</Text>

      {/* Progress dots */}
      <View style={styles.dots}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === idx ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        <Pressable onPress={onNext} style={{ flex: 1 }}>
          <LinearGradient
            colors={[brand.primary, brand.purple500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>
              {isLast ? t("tour.done") : t("tour.next")}
            </Text>
          </LinearGradient>
        </Pressable>

        {!isLast && (
          <Pressable onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t("tour.skip")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function SpotlightTour() {
  const { width: W, height: H } = Dimensions.get("window");
  const insets   = useSafeAreaInsets();
  const safeBot  = Math.max(insets.bottom, 12);

  const [show, setShow] = useState(false);
  const [idx, setIdx]   = useState(0);

  const opacity  = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);

  const spots = buildSpots(W, H, safeBot);
  const spot  = spots[idx] ?? null;

  // ── Check AsyncStorage on mount ──────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(TOUR_KEY).then(val => {
      if (val !== "done") {
        const tid = setTimeout(() => setShow(true), 1500);
        return () => clearTimeout(tid);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fade in + start glow loop when visible ───────────────────────────────
  useEffect(() => {
    if (!show) return;
    Animated.timing(opacity, {
      toValue: 1, duration: 420, easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();
    glowLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    glowLoop.current.start();
    return () => glowLoop.current?.stop();
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback(() => {
    glowLoop.current?.stop();
    Animated.timing(opacity, {
      toValue: 0, duration: 320, useNativeDriver: true,
    }).start(() => {
      setShow(false);
      AsyncStorage.setItem(TOUR_KEY, "done");
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    if (idx < TOTAL_STEPS - 1) setIdx(i => i + 1);
    else finish();
  }, [idx, finish]);

  if (!show) return null;

  const glowBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(168,85,247,0.55)", "rgba(168,85,247,0.95)"],
  });
  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.85],
  });

  return (
    <Modal
      transparent
      animationType="none"
      visible={show}
      statusBarTranslucent
      onRequestClose={finish}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity }]}>

        {spot ? (
          <>
            {/* ── 4-rect dark overlay (creates the transparent hole) ── */}
            {/* Top strip */}
            <View style={[styles.dark, { top: 0, left: 0, right: 0, height: spot.y }]} />
            {/* Left strip */}
            <View style={[styles.dark, { top: spot.y, left: 0, width: Math.max(0, spot.x), height: spot.h }]} />
            {/* Right strip */}
            <View style={[styles.dark, { top: spot.y, left: spot.x + spot.w, right: 0, height: spot.h }]} />
            {/* Bottom strip */}
            <View style={[styles.dark, { top: spot.y + spot.h, left: 0, right: 0, bottom: 0 }]} />

            {/* ── Animated glow ring ── */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glowRing,
                {
                  left:         spot.x - 6,
                  top:          spot.y - 6,
                  width:        spot.w + 12,
                  height:       spot.h + 12,
                  borderRadius: spot.r + 6,
                  borderColor:  glowBorderColor,
                  shadowColor:  brand.purple500,
                  shadowOpacity: glowShadowOpacity,
                },
              ]}
            />
          </>
        ) : (
          // Fallback: full-screen dark if spot unavailable
          <View style={[styles.dark, StyleSheet.absoluteFill]} />
        )}

        {/* ── Tooltip ── */}
        <Tooltip
          meta={STEP_META[idx]}
          idx={idx}
          spot={spot}
          onNext={next}
          onSkip={finish}
          W={W}
          H={H}
        />

      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const OVERLAY_COLOR = "rgba(5,3,25,0.87)";

const styles = StyleSheet.create({
  dark: {
    position:        "absolute",
    backgroundColor: OVERLAY_COLOR,
  },
  glowRing: {
    position:    "absolute",
    borderWidth: 2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation:   12,
    // backgroundColor transparent is implicit
  },
  tooltip: {
    position:        "absolute",
    backgroundColor: "rgba(9,6,32,0.97)",
    borderRadius:    22,
    borderWidth:     1,
    borderColor:     "rgba(168,85,247,0.35)",
    padding:         20,
    shadowColor:     "#000",
    shadowOpacity:   0.65,
    shadowRadius:    32,
    shadowOffset:    { width: 0, height: 16 },
    elevation:       24,
  },
  badge: {
    alignSelf:       "flex-start",
    marginBottom:    10,
    paddingHorizontal: 10,
    paddingVertical:   3,
    borderRadius:    99,
    backgroundColor: brand.primary,
  },
  badgeText: {
    fontSize:     10,
    fontWeight:   "800",
    color:        "#fff",
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    marginBottom:   8,
    gap:            12,
  },
  title: {
    flex:       1,
    fontSize:   16,
    fontWeight: "700",
    color:      "#fff",
    lineHeight: 22,
  },
  counter: {
    fontSize:   11,
    fontWeight: "600",
    color:      "rgba(255,255,255,0.35)",
    marginTop:  2,
    flexShrink: 0,
  },
  body: {
    fontSize:    13.5,
    lineHeight:  20,
    color:       "rgba(255,255,255,0.66)",
    marginBottom: 16,
  },
  dots: {
    flexDirection:  "row",
    justifyContent: "center",
    gap:            6,
    marginBottom:   16,
  },
  dot: {
    height:       6,
    borderRadius: 3,
  },
  dotActive: {
    width:           22,
    backgroundColor: brand.primary,
  },
  dotInactive: {
    width:           6,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  btnRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },
  nextBtn: {
    paddingVertical: 13,
    borderRadius:    13,
    alignItems:      "center",
  },
  nextBtnText: {
    fontSize:   14,
    fontWeight: "700",
    color:      "#fff",
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical:   4,
  },
  skipText: {
    fontSize: 12.5,
    color:    "rgba(255,255,255,0.38)",
  },
});
