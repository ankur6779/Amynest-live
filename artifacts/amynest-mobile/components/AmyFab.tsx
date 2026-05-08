/**
 * AmyFab — Floating Amy AI assistant button.
 *
 * Rendered inside TabLayout (DrawerProvider siblings), positioned above the
 * floating tab bar. Tap opens /amy-ai chat screen.
 *
 * Animations: plain React Native Animated (no Reanimated) + react-native-svg ring.
 * All hex values use brand tokens or carry audit-ok exemptions.
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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { brand } from "@/constants/colors";

// ─── Layout constants ──────────────────────────────────────────────────────────
const FAB_SIZE    = 58;
const RING_SIZE   = FAB_SIZE + 16;
const RING_STROKE = 3.5;
const RING_R      = (RING_SIZE - RING_STROKE) / 2;
// Tab bar: sits at insets.bottom+20, height ~72 px → 12 px clearance above it
const TAB_BAR_H   = 72;
const TAB_OFFSET  = 20; // Math.max(insets.bottom, 12) + 8 min
const FAB_GAP     = 12;

// ─── Neon ring ────────────────────────────────────────────────────────────────
function NeonRing({ spin }: { spin: Animated.Value }) {
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={[styles.ringWrap, { width: RING_SIZE, height: RING_SIZE }]}>
      {/* soft glow bloom behind stroke */}
      <View
        style={[
          styles.ringGlow,
          {
            width:        RING_SIZE + 16,
            height:       RING_SIZE + 16,
            borderRadius: (RING_SIZE + 16) / 2,
            top:  -8,
            left: -8,
          },
        ]}
      />
      {/* rotating gradient stroke */}
      <Animated.View
        style={{ position: "absolute", width: RING_SIZE, height: RING_SIZE, transform: [{ rotate }] }}
      >
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <SvgLinearGradient id="fabRingGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor={brand.purple500} />
              <Stop offset="50%"  stopColor={brand.pink500} />
              <Stop offset="100%" stopColor={brand.purple500} />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke="url(#fabRingGrad)"
            strokeWidth={RING_STROKE}
            fill="transparent"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AmyFab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const spin    = useRef(new Animated.Value(0)).current;
  const pulse   = useRef(new Animated.Value(1)).current;
  const pressAv = useRef(new Animated.Value(1)).current;
  const mountAv = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in on first mount
    Animated.timing(mountAv, {
      toValue: 1, duration: 600, easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();

    // Slow ring rotation — 18 s / revolution
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1, duration: 18000, easing: Easing.linear, useNativeDriver: true,
      }),
    ).start();

    // Breathing pulse halo
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onPressIn  = () => Animated.spring(pressAv, { toValue: 0.88, useNativeDriver: true, friction: 5 }).start();
  const onPressOut = () => Animated.spring(pressAv, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  const onPress    = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/amy-ai" as never);
  };

  // Position FAB above tab bar regardless of safe-area depth
  const bottom = Math.max(insets.bottom, 12) + TAB_OFFSET + TAB_BAR_H + FAB_GAP;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.root, { bottom, opacity: mountAv, transform: [{ scale: pressAv }] }]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={styles.hit}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Ask Amy AI" // i18n-ok: screen-reader only, not visible text
      >
        {/* Breathing glow halo */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.halo,
            {
              width:        RING_SIZE + 24,
              height:       RING_SIZE + 24,
              borderRadius: (RING_SIZE + 24) / 2,
              transform:    [{ scale: pulse }],
            },
          ]}
        />

        {/* Rotating neon ring */}
        <NeonRing spin={spin} />

        {/* Mascot image */}
        <View style={[styles.mascotWrap, { width: FAB_SIZE, height: FAB_SIZE, borderRadius: FAB_SIZE / 2 }]}>
          <Image
            source={require("../assets/images/mascot.png")}
            style={styles.mascotImg}
            resizeMode="contain"
          />
        </View>

        {/* "Ask AMY" label badge */}
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
    position:  "absolute",
    right:     16,
    zIndex:    9999,
    elevation: 24,
    alignItems: "center",
  },
  hit: {
    alignItems:      "center",
    justifyContent:  "center",
    width:  RING_SIZE,
    height: RING_SIZE,
  },
  halo: {
    position:        "absolute",
    backgroundColor: "rgba(147,51,234,0.18)", // audit-ok: Amy FAB purple breathing halo
    shadowColor:     brand.purple500,
    shadowOpacity:   0.55,
    shadowRadius:    18,
    shadowOffset:    { width: 0, height: 0 },
  },
  ringWrap: {
    position:       "absolute",
    alignItems:     "center",
    justifyContent: "center",
  },
  ringGlow: {
    position:        "absolute",
    backgroundColor: "rgba(168,85,247,0.14)", // audit-ok: ring glow bg
    shadowColor:     brand.purple500,
    shadowOpacity:   0.65,
    shadowRadius:    14,
    shadowOffset:    { width: 0, height: 0 },
  },
  mascotWrap: {
    position:        "absolute",
    alignItems:      "center",
    justifyContent:  "center",
    backgroundColor: "#0a0820", // audit-ok: dark inner circle bg for mascot
    overflow:        "hidden",
  },
  mascotImg: {
    width:  FAB_SIZE - 4,
    height: FAB_SIZE - 4,
  },
  badge: {
    position:        "absolute",
    top:             -9,
    right:           -8,
    backgroundColor: "#FFFFFF",           // audit-ok: white badge bg
    borderColor:     "rgba(168,85,247,0.35)", // audit-ok: badge purple border
    borderWidth:     1,
    borderRadius:    8,
    paddingHorizontal: 5,
    paddingVertical:   2,
    shadowColor:     brand.purple500,
    shadowOpacity:   0.4,
    shadowRadius:    6,
    shadowOffset:    { width: 0, height: 1 },
    elevation:       5,
  },
  badgeText: {
    fontSize:    8,
    fontWeight:  "700",
    color:       brand.primary,
    letterSpacing: 0.3,
  },
});
