/**
 * PremiumSplash v2 — cinematic "MEET AMY" entry screen.
 *
 * Design: large pink-purple neon ring with "MEET / AMY" text inside,
 *         breathing glow, glassmorphism patent badge, gradient CTA.
 *
 * NO i18n — mounts before i18next initialises. All text intentionally hardcoded.
 * Animations: React Native Animated + Reanimated 3.
 * audit-ok comments: required for every hardcoded hex/rgba colour.
 */
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import Reanimated, {
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

// ── Ring gradient colours (audit-ok comments required by color-audit script) ──
const RING_PINK   = "#FF4ECD"; // audit-ok: neon-pink ring gradient start/end
const RING_VIOLET = "#C084FC"; // audit-ok: violet-400 ring gradient mid
const RING_PURPLE = "#7B3FF2"; // audit-ok: brand-purple ring gradient mid2

// ── Ring dimensions ────────────────────────────────────────────────────────────
const RING_SIZE   = Math.min(W * 0.76, 300);
const RING_STROKE = Math.round(RING_SIZE * 0.065);
const RING_R      = (RING_SIZE - RING_STROKE) / 2;
const INNER_SIZE  = RING_SIZE - RING_STROKE * 2 - 6;

// ── Deterministic star field ───────────────────────────────────────────────────
const STARS = Array.from({ length: 30 }, (_, i) => ({
  x:   ((i * 137.508) % 100) / 100 * W,
  y:   ((i * 91.3 + 7) % 100) / 100 * H * 0.88,
  r:   ([1, 1, 1.5, 1, 2] as const)[i % 5],
  dur: 2000 + (i * 580) % 2800,
  del: (i * 370) % 3200,
}));

// ─── Star ──────────────────────────────────────────────────────────────────────
function Star({ x, y, r, dur, del }: typeof STARS[0]) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(del),
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: dur * 0.45,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.06,
          duration: dur * 0.55,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: "#FFFFFF", // audit-ok: white star particle
        opacity,
        shadowColor: "#C4B5FD", // audit-ok: violet-200 star glow
        shadowOpacity: 0.9,
        shadowRadius: r * 4,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

// ─── Neon Ring + "MEET AMY" core ───────────────────────────────────────────────
function NeonRing({ spinAnim }: { spinAnim: Animated.Value }) {
  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const amySize = Math.round(RING_SIZE * 0.21);

  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
      {/* Outer ambient glow bloom */}
      <View style={styles.ringOuterGlow} />

      {/* Rotating SVG gradient ring */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate }] }]}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <SvgLinearGradient id="ringG" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor={RING_PINK}   />
              <Stop offset="35%"  stopColor={RING_VIOLET} />
              <Stop offset="65%"  stopColor={RING_PURPLE} />
              <Stop offset="100%" stopColor={RING_PINK}   />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke="url(#ringG)"
            strokeWidth={RING_STROKE}
            fill="transparent"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* Inner dark core */}
      <View
        style={[
          styles.innerCore,
          { width: INNER_SIZE, height: INNER_SIZE, borderRadius: INNER_SIZE / 2 },
        ]}
      >
        {/* i18n-ignore-start */}
        <Text style={styles.meetText}>MEET</Text>
        <Text style={[styles.amyText, { fontSize: amySize }]}>AMY</Text>
        {/* i18n-ignore-end */}
      </View>
    </View>
  );
}

// ─── Shimmer CTA Button ─────────────────────────────────────────────────────────
function ShimmerCTA({ onPress }: { onPress: () => void }) {
  const shimmerX = useRef(new Animated.Value(-W * 0.55)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(shimmerX, {
          toValue: W * 0.55,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]),
    ).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={styles.ctaOuter}
    >
      <View style={styles.ctaClip}>
        <LinearGradient
          colors={["#EC4899", "#9333EA", "#7B3FF2"]} // audit-ok: pink→purple CTA gradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaGradient}
        >
          {/* Shimmer streak */}
          <Animated.View
            style={[
              styles.shimmerStreak,
              { transform: [{ translateX: shimmerX }] },
            ]}
          />
          {/* i18n-ignore-start */}
          <Text style={styles.ctaText}>Start Parenting Smart →</Text>
          {/* i18n-ignore-end */}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PremiumSplash({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets();

  // RN Animated values
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const ringOpacity      = useRef(new Animated.Value(0)).current;
  const ringScale        = useRef(new Animated.Value(0.72)).current;
  const textBlockOpacity = useRef(new Animated.Value(0)).current;
  const textBlockY       = useRef(new Animated.Value(16)).current;
  const badgeOpacity     = useRef(new Animated.Value(0)).current;
  const badgeY           = useRef(new Animated.Value(22)).current;
  const ctaOpacity       = useRef(new Animated.Value(0)).current;
  const ctaY             = useRef(new Animated.Value(28)).current;
  const ringSpinAnim     = useRef(new Animated.Value(0)).current;

  // Reanimated — ring glow breathing pulse
  const glowScale   = useSharedValue(1);
  const glowOpacity = useSharedValue(0.45);
  const glowStyle   = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const handleStart = useCallback(() => {
    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 480,
      useNativeDriver: true,
    }).start(onFinish);
  }, [containerOpacity, onFinish]);

  useEffect(() => {
    // Container fade in
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();

    // Ring entrance
    Animated.parallel([
      Animated.timing(ringOpacity, {
        toValue: 1,
        duration: 950,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(ringScale, {
        toValue: 1,
        damping: 14,
        stiffness: 110,
        useNativeDriver: true,
      }),
    ]).start();

    // Ring continuous slow spin
    Animated.loop(
      Animated.timing(ringSpinAnim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Breathing glow pulse (Reanimated)
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 3000, easing: REasing.inOut(REasing.ease) }),
        withTiming(1.0,  { duration: 3000, easing: REasing.inOut(REasing.ease) }),
      ),
      -1,
      false,
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.72, { duration: 3000, easing: REasing.inOut(REasing.ease) }),
        withTiming(0.38, { duration: 3000, easing: REasing.inOut(REasing.ease) }),
      ),
      -1,
      false,
    );

    // Tagline fade + slide
    Animated.parallel([
      Animated.timing(textBlockOpacity, {
        toValue: 1,
        duration: 700,
        delay: 750,
        useNativeDriver: true,
      }),
      Animated.timing(textBlockY, {
        toValue: 0,
        duration: 700,
        delay: 750,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // Patent badge
    Animated.parallel([
      Animated.timing(badgeOpacity, {
        toValue: 1,
        duration: 700,
        delay: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(badgeY, {
        toValue: 0,
        duration: 700,
        delay: 1200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // CTA button
    Animated.parallel([
      Animated.timing(ctaOpacity, {
        toValue: 1,
        duration: 700,
        delay: 1600,
        useNativeDriver: true,
      }),
      Animated.timing(ctaY, {
        toValue: 0,
        duration: 700,
        delay: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ptop    = insets.top + 16;
  const pbottom = insets.bottom + 24;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.root, { opacity: containerOpacity }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0A0818" // audit-ok: deep navy status bar
        translucent={Platform.OS === "android"}
      />

      {/* Deep navy-violet background */}
      <LinearGradient
        colors={["#0A0818", "#120A2C", "#0E0720", "#0A0818"]} // audit-ok: deep navy-violet bg
        locations={[0, 0.35, 0.68, 1]}
        start={{ x: 0.35, y: 0 }}
        end={{ x: 0.65, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top ambient bloom — purple */}
      <View style={styles.topBloom} />
      {/* Bottom ambient bloom — pink */}
      <View style={styles.bottomBloom} />

      {/* Star field */}
      {STARS.map((s, i) => <Star key={i} {...s} />)}

      {/* ── Stage ───────────────────────────────── */}
      <View style={[styles.stage, { paddingTop: ptop, paddingBottom: pbottom }]}>

        {/* Ring with breathing glow */}
        <View style={styles.ringSection}>
          {/* Breathing glow behind ring */}
          <Reanimated.View style={[styles.ringBreathGlow, glowStyle]} />

          {/* Ring entrance animation */}
          <Animated.View
            style={{ opacity: ringOpacity, transform: [{ scale: ringScale }] }}
          >
            <NeonRing spinAnim={ringSpinAnim} />
          </Animated.View>
        </View>

        {/* "Where Smart Parenting Starts" tagline */}
        {/* i18n-ignore-start */}
        <Animated.View
          style={[
            styles.taglineWrap,
            { opacity: textBlockOpacity, transform: [{ translateY: textBlockY }] },
          ]}
        >
          <Text style={styles.tagline}>
            {"Where "}
            <Text style={styles.taglinePink}>Smart Parenting</Text>
            {" Starts"}
          </Text>
        </Animated.View>
        {/* i18n-ignore-end */}

        {/* Glassmorphism patent badge */}
        {/* i18n-ignore-start */}
        <Animated.View
          style={[
            styles.badgeWrap,
            { opacity: badgeOpacity, transform: [{ translateY: badgeY }] },
          ]}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              POWERED BY PATENT-PENDING ADAPTIVE AI TECHNOLOGY
            </Text>
          </View>
        </Animated.View>
        {/* i18n-ignore-end */}

        {/* CTA button */}
        <Animated.View
          style={[
            styles.ctaWrap,
            { opacity: ctaOpacity, transform: [{ translateY: ctaY }] },
          ]}
        >
          <ShimmerCTA onPress={handleStart} />
        </Animated.View>

      </View>
    </Animated.View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 9999,
  },

  /* Ambient blooms */
  topBloom: {
    position: "absolute",
    width: W * 1.2,
    height: W * 1.2,
    borderRadius: W * 0.6,
    top: -W * 0.35,
    left: -W * 0.1,
    backgroundColor: "rgba(123,63,242,0.16)", // audit-ok: purple top ambient bloom
  },
  bottomBloom: {
    position: "absolute",
    width: W,
    height: W * 0.75,
    borderRadius: W * 0.375,
    bottom: -W * 0.2,
    right: -W * 0.15,
    backgroundColor: "rgba(236,72,153,0.09)", // audit-ok: pink bottom ambient bloom
  },

  /* Stage */
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },

  /* Ring section */
  ringSection: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  ringBreathGlow: {
    position: "absolute",
    width: RING_SIZE + 70,
    height: RING_SIZE + 70,
    borderRadius: (RING_SIZE + 70) / 2,
    top: -35,
    left: -35,
    backgroundColor: "rgba(147,51,234,0.22)", // audit-ok: purple ring breathing glow
    shadowColor: "#9333EA", // audit-ok: purple ring shadow
    shadowOpacity: 0.65,
    shadowRadius: 44,
    shadowOffset: { width: 0, height: 0 },
  },

  /* Ring outer glow */
  ringOuterGlow: {
    position: "absolute",
    width: RING_SIZE + 28,
    height: RING_SIZE + 28,
    borderRadius: (RING_SIZE + 28) / 2,
    top: -14,
    left: -14,
    backgroundColor: "rgba(236,72,153,0.10)", // audit-ok: pink ring outer glow
    shadowColor: "#EC4899", // audit-ok: pink ring glow shadow
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },

  /* Inner core */
  innerCore: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D0B1F", // audit-ok: deep-dark inner core bg
    shadowColor: "#7B3FF2", // audit-ok: violet inner glow
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  meetText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(196,181,253,0.80)", // audit-ok: lavender-300 MEET label
    letterSpacing: 6,
    textTransform: "uppercase",
    marginBottom: 0,
  },
  amyText: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF", // audit-ok: white AMY text
    letterSpacing: -1,
    textShadowColor: "rgba(167,139,250,0.85)", // audit-ok: violet text shadow glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  /* Tagline */
  taglineWrap: {
    alignItems: "center",
    paddingHorizontal: 28,
  },
  tagline: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)", // audit-ok: muted white tagline
    textAlign: "center",
    letterSpacing: 0.2,
    lineHeight: 27,
  },
  taglinePink: {
    color: "#FF4ECD", // audit-ok: neon-pink tagline highlight
    fontFamily: "Inter_600SemiBold",
  },

  /* Patent Pending badge */
  badgeWrap: {
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  badge: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.32)", // audit-ok: violet-300 glassmorphism border
    backgroundColor: "rgba(255,255,255,0.05)", // audit-ok: glassy white badge bg
    shadowColor: "#7B3FF2", // audit-ok: violet badge shadow
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(196,181,253,0.88)", // audit-ok: lavender-300 badge text
    letterSpacing: 1.6,
    textAlign: "center",
    textTransform: "uppercase",
  },

  /* CTA */
  ctaWrap: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 28,
  },
  ctaOuter: {
    width: "100%",
    shadowColor: "#EC4899", // audit-ok: pink CTA glow shadow
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 14,
  },
  ctaClip: {
    borderRadius: 32,
    overflow: "hidden",
  },
  ctaGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
  },
  shimmerStreak: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: W * 0.22,
    backgroundColor: "rgba(255,255,255,0.18)", // audit-ok: white shimmer streak
  },
  ctaText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF", // audit-ok: white CTA text
    letterSpacing: 0.3,
  },
});
