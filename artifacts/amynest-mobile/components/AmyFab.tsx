/**
 * AmyFab — Global floating Amy AI assistant button.
 *
 * Appears on every authenticated screen EXCEPT:
 *   sign-in, sign-up, welcome, onboarding, tutorial, amy-ai
 *
 * No i18n — uses hardcoded label (rendered outside providers in some paths).
 * Animations: React Native Animated + react-native-svg gradient ring.
 */
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from "react-native-svg";
import { useRouter, useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { brand } from "@/constants/colors";

// ─── Layout constants ──────────────────────────────────────────────────────────
const FAB_SIZE    = 58;
const RING_SIZE   = FAB_SIZE + 16;
const RING_STROKE = 3.5;
const RING_R      = (RING_SIZE - RING_STROKE) / 2;
// Tab bar sits at insets.bottom+20 and is ~72px tall → give 12px clearance
const TAB_CLEARANCE = 72 + 20 + 12; // px above the device bottom

// ─── Routes that hide the FAB ──────────────────────────────────────────────────
const HIDDEN_SEGMENTS = new Set([
  "sign-in",
  "sign-up",
  "welcome",
  "onboarding",
  "tutorial",
  "amy-ai",
]);

// ─── Neon ring (SVG) ──────────────────────────────────────────────────────────
function NeonRing({ spin }: { spin: Animated.Value }) {
  const rotate = spin.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  return (
    <View style={[styles.ringWrap, { width: RING_SIZE, height: RING_SIZE }]}>
      {/* glow bloom */}
      <View
        style={[
          styles.ringGlow,
          {
            width: RING_SIZE + 16,
            height: RING_SIZE + 16,
            borderRadius: (RING_SIZE + 16) / 2,
            top:  -8,
            left: -8,
          },
        ]}
      />
      {/* rotating gradient stroke */}
      <Animated.View
        style={{
          position: "absolute",
          width: RING_SIZE,
          height: RING_SIZE,
          transform: [{ rotate }],
        }}
      >
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <SvgLinearGradient id="fabRing" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor={brand.purple500} />
              <Stop offset="50%"  stopColor={brand.pink500} />
              <Stop offset="100%" stopColor={brand.purple500} />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke="url(#fabRing)"
            strokeWidth={RING_STROKE}
            fill="transparent"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AmyFab() {
  const router   = useRouter();
  const segments = useSegments();
  const insets   = useSafeAreaInsets();

  // Animated values
  const spin    = useRef(new Animated.Value(0)).current;
  const pulse   = useRef(new Animated.Value(1)).current;
  const pressAv = useRef(new Animated.Value(1)).current;
  const mountAv = useRef(new Animated.Value(0)).current;

  // ── Route-based visibility (computed before hooks so value is stable) ──
  const hidden = segments.some((s) => HIDDEN_SEGMENTS.has(s as string));

  // ── Start animations on mount ──────────────────────────────────────────
  useEffect(() => {
    // Fade in
    Animated.timing(mountAv, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Continuous slow ring rotation (18 s / rev)
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Breathing glow pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.09,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Early return AFTER all hooks (rules-of-hooks compliance)
  if (hidden) return null;

  const handlePressIn  = () =>
    Animated.spring(pressAv, { toValue: 0.88, useNativeDriver: true, friction: 5 }).start();
  const handlePressOut = () =>
    Animated.spring(pressAv, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/amy-ai" as never);
  };

  const bottom = insets.bottom + TAB_CLEARANCE;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.root,
        {
          bottom,
          opacity: mountAv,
          transform: [{ scale: pressAv }],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.hit}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Ask Amy AI" // i18n-ok: screen-reader label, not visible text
      >
        {/* Breathing glow halo */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width:        RING_SIZE + 20,
              height:       RING_SIZE + 20,
              borderRadius: (RING_SIZE + 20) / 2,
              transform: [{ scale: pulse }],
            },
          ]}
        />

        {/* Neon ring */}
        <NeonRing spin={spin} />

        {/* Mascot */}
        <View style={[styles.mascotWrap, { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 }]}>
          <Image
            source={require("../assets/images/mascot.png")}
            style={styles.mascotImg}
            resizeMode="contain"
          />
        </View>

        {/* "Ask AMY" badge */}
        {/* i18n-ignore-start */}
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText} numberOfLines={1}>Ask AMY</Text>
        </View>
        {/* i18n-ignore-end */}
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    position: "absolute",
    right: 16,
    zIndex: 9000,
    elevation: 20,
    alignItems: "center",
  },
  hit: {
    alignItems: "center",
    justifyContent: "center",
    width: RING_SIZE,
    height: RING_SIZE,
  },
  halo: {
    position: "absolute",
    backgroundColor: "rgba(147,51,234,0.18)", // audit-ok: Amy FAB purple breathing halo
    shadowColor: brand.purple500,
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  ringWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringGlow: {
    position: "absolute",
    backgroundColor: "rgba(168,85,247,0.15)", // audit-ok: ring outer glow
    shadowColor: brand.purple500,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  mascotWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#08081e", // audit-ok: mascot dark inner circle bg
    overflow: "hidden",
  },
  mascotImg: {
    width: FAB_SIZE - 4,
    height: FAB_SIZE - 4,
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -6,
    backgroundColor: "#FFFFFF", // audit-ok: badge white bg
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.3)", // audit-ok: badge purple border
    shadowColor: brand.purple500,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: brand.primary,
    letterSpacing: 0.3,
  },
});
