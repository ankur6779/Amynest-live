/**
 * PremiumSplash — cinematic animated splash screen matching the AmyNest AI design.
 *
 * Design: Cute bird mascot in neon gradient ring, rainbow "AmyNest AI" wordmark,
 *         tagline, neon dots progress, cosmic background.
 *
 * NO i18n — mounts before i18next initialises. All text intentionally hardcoded.
 * Animations: React Native Animated + Reanimated 3 + react-native-svg.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from "react-native-svg";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing as REasing,
} from "react-native-reanimated";

const { width: W, height: H } = Dimensions.get("window");

const RING_SIZE   = Math.min(W * 0.72, 280);
const RING_STROKE = RING_SIZE * 0.055;
const RING_R      = (RING_SIZE - RING_STROKE) / 2;
const MASCOT_SIZE = RING_SIZE * 0.72;

const VISIBLE_MS  = 3800;
const FADE_OUT_MS = 700;

// Per-letter colors for "AmyNest"
const LETTER_COLORS = [
  "#FF6B6B", // audit-ok: rainbow wordmark — A coral red
  "#FF9F43", // audit-ok: rainbow wordmark — m orange
  "#F9CA24", // audit-ok: rainbow wordmark — y yellow
  "#6AB04C", // audit-ok: rainbow wordmark — N green
  "#48DBFB", // audit-ok: rainbow wordmark — e cyan
  "#A29BFE", // audit-ok: rainbow wordmark — s lavender
  "#FD79A8", // audit-ok: rainbow wordmark — t pink
];

// Deterministic star field
const STARS = Array.from({ length: 24 }, (_, i) => ({
  x:   ((i * 137.508) % 100) / 100 * W,
  y:   ((i * 91.3 + 7) % 100) / 100 * H * 0.9,
  r:   ([1, 1, 1.5, 1, 2] as const)[i % 5],
  dur: 2000 + (i * 680) % 2500,
  del: (i * 420) % 3000,
}));

// ─── Star ─────────────────────────────────────────────────────────────────────
function Star({ x, y, r, dur, del }: typeof STARS[0]) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(del),
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: dur * 0.45,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.05,
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
        top:  y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: "#FFFFFF", // audit-ok: white star particle
        opacity,
        shadowColor: "#A78BFA", // audit-ok: violet star glow
        shadowOpacity: 0.9,
        shadowRadius: r * 4,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

// ─── Neon Gradient Ring (SVG) ──────────────────────────────────────────────────
function NeonRing({ spinAnim }: { spinAnim: Animated.Value }) {
  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  return (
    <View style={[styles.ringContainer, { width: RING_SIZE + 24, height: RING_SIZE + 24 }]}>
      {/* Outer glow bloom */}
      <View style={[styles.ringGlow, {
        width: RING_SIZE + 32,
        height: RING_SIZE + 32,
        borderRadius: (RING_SIZE + 32) / 2,
        top: -16,
        left: -16,
      }]} />

      {/* Rotating gradient ring via SVG */}
      <Animated.View
        style={{
          position: "absolute",
          width: RING_SIZE,
          height: RING_SIZE,
          top: 12,
          left: 12,
          transform: [{ rotate }],
        }}
      >
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Defs>
            <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%"   stopColor="#9333EA" /> {/* audit-ok: neon ring gradient purple */}
              <Stop offset="30%"  stopColor="#EC4899" /> {/* audit-ok: neon ring gradient pink */}
              <Stop offset="65%"  stopColor="#06B6D4" /> {/* audit-ok: neon ring gradient cyan */}
              <Stop offset="100%" stopColor="#9333EA" /> {/* audit-ok: neon ring gradient purple end */}
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            stroke="url(#ringGrad)"
            strokeWidth={RING_STROKE}
            fill="transparent"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Rainbow Wordmark ──────────────────────────────────────────────────────────
function RainbowWordmark({ opacity }: { opacity: Animated.Value }) {
  return (
    <Animated.View style={[styles.wordmarkRow, { opacity }]}>
      {"AmyNest".split("").map((char, i) => (
        <Text
          key={i}
          style={[
            styles.wordmarkLetter,
            { color: LETTER_COLORS[i] },
            // audit-ok: per-letter rainbow colors for AmyNest wordmark
          ]}
        >
          {char}
        </Text>
      ))}
      {/* Sparkle */}
      <Text style={styles.sparkle}>✦</Text>
      {/* AI Badge */}
      <View style={styles.aiBadge}>
        <Text style={styles.aiBadgeText}>AI</Text>
      </View>
    </Animated.View>
  );
}

// ─── Neon Loading Dots ─────────────────────────────────────────────────────────
const DOT_COLORS = [
  "#9333EA", // audit-ok: purple neon dot
  "#EC4899", // audit-ok: pink neon dot
  "#A855F7", // audit-ok: violet neon dot
  "#06B6D4", // audit-ok: cyan neon dot
];

function LoadingDots({ opacity }: { opacity: Animated.Value }) {
  const anims = [
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(0.4)).current,
  ];

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 180),
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[styles.dotsSection, { opacity }]}>
      <View style={styles.dotsRow}>
        {DOT_COLORS.map((color, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: color,
                opacity: anims[i],
                shadowColor: color,
              },
            ]}
          />
        ))}
      </View>
      {/* i18n-ignore-start */}
      <Text style={styles.loadingText}>Personalizing your parenting experience...</Text>
      {/* i18n-ignore-end */}
    </Animated.View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PremiumSplash({ onFinish }: { onFinish: () => void }) {
  // Animated values (RN Animated)
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const ringOpacity      = useRef(new Animated.Value(0)).current;
  const ringScale        = useRef(new Animated.Value(0.7)).current;
  const mascotOpacity    = useRef(new Animated.Value(0)).current;
  const mascotScale      = useRef(new Animated.Value(0.72)).current;
  const wordmarkOpacity  = useRef(new Animated.Value(0)).current;
  const taglineOpacity   = useRef(new Animated.Value(0)).current;
  const dotsOpacity      = useRef(new Animated.Value(0)).current;
  const ringSpinAnim     = useRef(new Animated.Value(0)).current;

  // Reanimated for mascot float
  const mascotY = useSharedValue(0);
  const mascotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotY.value }],
  }));

  useEffect(() => {
    // Fade in container
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Ring entrance
    Animated.parallel([
      Animated.timing(ringOpacity, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(ringScale, {
        toValue: 1,
        damping: 14,
        stiffness: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Ring continuous spin
    Animated.loop(
      Animated.timing(ringSpinAnim, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Mascot entrance (delayed slightly after ring)
    Animated.parallel([
      Animated.timing(mascotOpacity, {
        toValue: 1,
        duration: 800,
        delay: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(mascotScale, {
        toValue: 1,
        damping: 13,
        stiffness: 110,
        mass: 1,
        useNativeDriver: true,
      }),
    ]).start();

    // Mascot float loop (Reanimated)
    mascotY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2200, easing: REasing.inOut(REasing.ease) }),
        withTiming(0,   { duration: 2200, easing: REasing.inOut(REasing.ease) }),
      ),
      -1,
      false,
    );

    // Wordmark
    Animated.timing(wordmarkOpacity, {
      toValue: 1,
      duration: 700,
      delay: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Tagline
    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 700,
      delay: 900,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Loading dots
    Animated.timing(dotsOpacity, {
      toValue: 1,
      duration: 700,
      delay: 1300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Dismiss sequence
    const fadeTimer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start();
    }, VISIBLE_MS);

    const dismissTimer = setTimeout(onFinish, VISIBLE_MS + FADE_OUT_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(dismissTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.root, { opacity: containerOpacity }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#06061C" // audit-ok: deep-dark cosmic splash status bar
        translucent={Platform.OS === "android"}
      />

      {/* Background */}
      <LinearGradient
        colors={["#06061C", "#0A0428", "#07062A", "#060016"]} // audit-ok: deep navy-purple cosmic bg
        locations={[0, 0.35, 0.65, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Ambient purple radial center bloom */}
      <View style={styles.centerBloom} />
      <View style={styles.centerBloom2} />

      {/* Bottom neon wave glow */}
      <View style={styles.bottomWave1} />
      <View style={styles.bottomWave2} />

      {/* Stars */}
      {STARS.map((s, i) => <Star key={i} {...s} />)}

      {/* ── Stage ──────────────────────────────────────────── */}
      <View style={styles.stage}>

        {/* Ring + Mascot stacked */}
        <Animated.View
          style={[
            styles.ringMascotWrap,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        >
          {/* SVG Neon Ring — absolutely behind mascot */}
          <View style={styles.ringAbsolute}>
            <NeonRing spinAnim={ringSpinAnim} />
          </View>

          {/* Mascot — flex centered, floats on top */}
          <Animated.View
            style={{
              opacity: mascotOpacity,
              transform: [{ scale: mascotScale }],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Reanimated.View style={mascotAnimStyle}>
              <Image
                source={require("../assets/images/mascot.png")}
                style={{ width: MASCOT_SIZE, height: MASCOT_SIZE }}
                resizeMode="contain"
              />
            </Reanimated.View>
          </Animated.View>
        </Animated.View>

        {/* Rainbow "AmyNest ✦ AI" wordmark */}
        <RainbowWordmark opacity={wordmarkOpacity} />

        {/* Tagline */}
        {/* i18n-ignore-start */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          WHERE SMART PARENTING STARTS
        </Animated.Text>
        {/* i18n-ignore-end */}

        {/* Loading dots + text */}
        <LoadingDots opacity={dotsOpacity} />
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    elevation: 9999,
  },

  centerBloom: {
    position: "absolute",
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    top: H * 0.08,
    left: W * 0.05,
    backgroundColor: "rgba(100,30,200,0.18)", // audit-ok: outer center radial bloom
  },
  centerBloom2: {
    position: "absolute",
    width: W * 0.55,
    height: W * 0.55,
    borderRadius: W * 0.275,
    top: H * 0.16,
    left: W * 0.225,
    backgroundColor: "rgba(147,51,234,0.12)", // audit-ok: inner center bloom
  },

  bottomWave1: {
    position: "absolute",
    width: W * 1.6,
    height: 130,
    borderRadius: 65,
    bottom: H * 0.08,
    left: -W * 0.3,
    backgroundColor: "rgba(147,51,234,0.14)", // audit-ok: bottom neon wave 1
  },
  bottomWave2: {
    position: "absolute",
    width: W * 1.4,
    height: 80,
    borderRadius: 40,
    bottom: H * 0.05,
    left: -W * 0.2,
    backgroundColor: "rgba(6,182,212,0.08)", // audit-ok: bottom neon wave 2 cyan
  },

  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: H * 0.04,
    gap: 18,
  },

  // Ring & mascot
  ringMascotWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: RING_SIZE + 24,
    height: RING_SIZE + 24,
    marginBottom: 8,
  },
  ringAbsolute: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  ringGlow: {
    position: "absolute",
    backgroundColor: "rgba(147,51,234,0.22)", // audit-ok: ring outer glow bloom
    shadowColor: "#9333EA", // audit-ok: ring glow shadow
    shadowOpacity: 0.8,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },

  // Wordmark
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 0,
  },
  wordmarkLetter: {
    fontSize: 38,
    fontFamily: "Inter_900Black",
    fontWeight: "900",
    letterSpacing: -0.5,
    // color set inline per letter
  },
  sparkle: {
    fontSize: 16,
    color: "#48DBFB", // audit-ok: cyan sparkle star
    marginBottom: 10,
    marginLeft: 2,
  },
  aiBadge: {
    marginLeft: 7,
    marginBottom: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#3A0CA3", // audit-ok: AI badge deep blue bg
    shadowColor: "#4361EE", // audit-ok: AI badge glow
    shadowOpacity: 0.7,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  aiBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_900Black",
    fontWeight: "900",
    color: "#FFFFFF", // audit-ok: AI badge white text
    letterSpacing: 1,
  },

  // Tagline
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)", // audit-ok: tagline muted white text
    letterSpacing: 2.5,
    textAlign: "center",
  },

  // Loading dots
  dotsSection: {
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.45)", // audit-ok: loading text muted white
    letterSpacing: 0.2,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
