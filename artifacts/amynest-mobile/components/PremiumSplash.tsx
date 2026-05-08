/**
 * PremiumSplash — clean professional splash screen.
 *
 * Design: AmyNest logo + wordmark + tagline on deep-dark bg.
 * Intentionally uses NO i18n — this component mounts before i18next
 * initialises (it renders outside the provider tree in RootLayout),
 * so useTranslation() would return raw key strings. All copy is hardcoded.
 *
 * Animations: plain RN Animated (no Reanimated dependency needed here).
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
import { brand } from "@/constants/colors";

const { width: W, height: H } = Dimensions.get("window");

const VISIBLE_MS  = 2600;
const FADE_OUT_MS = 700;
const BAR_MAX_W   = W * 0.52;

// ─── Star field (seeded, deterministic) ───────────────────────────────────────
const STARS = Array.from({ length: 22 }, (_, i) => ({
  x:   ((i * 137.508) % 100) / 100 * W,
  y:   ((i * 91.3 + 7) % 100) / 100 * H * 0.88,
  r:   ([1, 1, 1.5, 1, 2] as const)[i % 5],
  dur: 2000 + (i * 680) % 2500,
  del: (i * 420) % 3000,
}));

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
          toValue: 0.08,
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
        backgroundColor: "#FFFFFF", // audit-ok: pure white star dots
        opacity,
        shadowColor: brand.purple400,
        shadowOpacity: 0.9,
        shadowRadius: r * 4,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PremiumSplash({ onFinish }: { onFinish: () => void }) {
  const containerOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity      = useRef(new Animated.Value(0)).current;
  const logoScale        = useRef(new Animated.Value(0.78)).current;
  const logoFloat        = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity  = useRef(new Animated.Value(0)).current;
  const taglineOpacity   = useRef(new Animated.Value(0)).current;
  const dotsOpacity      = useRef(new Animated.Value(0)).current;
  const progressW        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Container fade in
    Animated.timing(containerOpacity, {
      toValue: 1, duration: 380, useNativeDriver: true,
    }).start();

    // Logo spring entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1, useNativeDriver: true,
        damping: 16, stiffness: 155, mass: 1,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 680,
        easing: Easing.out(Easing.ease), useNativeDriver: true,
      }),
    ]).start();

    // Logo gentle float loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: -9, duration: 2600,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(logoFloat, {
          toValue: 0, duration: 2600,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ]),
    ).start();

    // Text entrance (staggered)
    Animated.timing(wordmarkOpacity, {
      toValue: 1, duration: 680, delay: 420,
      easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();

    Animated.timing(taglineOpacity, {
      toValue: 1, duration: 680, delay: 700,
      easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();

    Animated.timing(dotsOpacity, {
      toValue: 1, duration: 680, delay: 900,
      easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();

    // Progress bar
    Animated.timing(progressW, {
      toValue: BAR_MAX_W, duration: VISIBLE_MS - 350, delay: 220,
      easing: Easing.inOut(Easing.ease), useNativeDriver: false,
    }).start();

    // Dismiss
    const fadeTimer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true,
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
        backgroundColor="#060018" // audit-ok: void-dark splash status bar
        translucent={Platform.OS === "android"}
      />

      {/* Background gradient */}
      <LinearGradient
        colors={["#060018", "#0d0330", "#080022"]} // audit-ok: deep-void purple splash bg
        locations={[0, 0.52, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Atmospheric purple blooms */}
      <View style={styles.bloom1} />
      <View style={styles.bloom2} />
      <View style={styles.bloom3} />

      {/* Stars */}
      {STARS.map((s, i) => <Star key={i} {...s} />)}

      {/* ── Main stage ──────────────────────────────────── */}
      {/* i18n-ignore-start — PremiumSplash mounts before i18next initialises; all text is intentionally hardcoded */}
      <View style={styles.stage}>

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }, { translateY: logoFloat }],
            },
          ]}
        >
          <View style={styles.logoGlow} />
          <Image
            source={require("../assets/images/amynest-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Wordmark: Amy·Nest·AI */}
        <Animated.View style={[styles.wordmarkRow, { opacity: wordmarkOpacity }]}>
          <Text style={styles.wordAmy}>Amy</Text>
          <Text style={styles.wordNest}>Nest</Text>
          <View style={styles.aiBadge}>
            <Text style={styles.wordAi}>AI</Text>
          </View>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineWrap, { opacity: taglineOpacity }]}>
          <View style={styles.taglineLine} />
          <Text style={styles.tagline}>Where Smart Parenting Starts</Text>
          <View style={styles.taglineLine} />
        </Animated.View>

        {/* Feature dots */}
        <Animated.View style={[styles.featureRow, { opacity: dotsOpacity }]}>
          {["✨ AI-Powered", "💛 Caring", "📈 Science-Backed"].map((label) => (
            <View key={label} style={styles.featureDot}>
              <Text style={styles.featureLabel}>{label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, { width: progressW }]}>
          <LinearGradient
            colors={[brand.violet500, brand.pink500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
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

  // Atmospheric blooms
  bloom1: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    top: H * 0.17,
    left: W / 2 - 180,
    backgroundColor: "rgba(109,28,209,0.18)", // audit-ok: outer radial bloom
  },
  bloom2: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    top: H * 0.26,
    left: W / 2 - 105,
    backgroundColor: "rgba(168,85,247,0.13)", // audit-ok: inner radial bloom
  },
  bloom3: {
    position: "absolute",
    width: 280,
    height: 140,
    borderRadius: 70,
    bottom: H * 0.12,
    left: W / 2 - 140,
    backgroundColor: "rgba(124,58,237,0.10)", // audit-ok: lower accent bloom
  },

  // Stage
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: H * 0.07,
    gap: 0,
  },

  // Logo
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(139,92,246,0.22)", // audit-ok: logo glow halo
  },
  logo: {
    width: 140,
    height: 140,
  },

  // Wordmark
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    marginBottom: 12,
  },
  wordAmy: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    color: "#FFFFFF", // audit-ok: brand wordmark white
    letterSpacing: -0.8,
  },
  wordNest: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    color: brand.purple400,
    letterSpacing: -0.8,
  },
  aiBadge: {
    marginLeft: 6,
    marginBottom: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "rgba(168,85,247,0.22)", // audit-ok: AI badge glass bg
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.38)", // audit-ok: AI badge glass border
  },
  wordAi: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    color: brand.pink400,
    letterSpacing: 1.5,
  },

  // Tagline
  taglineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 28,
    paddingHorizontal: 28,
  },
  taglineLine: {
    width: 28,
    height: 1,
    backgroundColor: "rgba(168,85,247,0.40)", // audit-ok: tagline divider line
    borderRadius: 1,
  },
  tagline: {
    fontSize: 12.5,
    fontFamily: "Inter_400Regular",
    color: "rgba(200,170,255,0.72)", // audit-ok: tagline muted purple text
    letterSpacing: 0.6,
    textAlign: "center",
  },

  // Feature dots row
  featureRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  featureDot: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(139,92,246,0.14)", // audit-ok: feature pill bg
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.28)", // audit-ok: feature pill border
  },
  featureLabel: {
    fontSize: 11.5,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(220,200,255,0.82)", // audit-ok: feature pill text
  },

  // Progress bar
  progressTrack: {
    position: "absolute",
    bottom: 38,
    left: W / 2 - BAR_MAX_W / 2,
    width: BAR_MAX_W,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(139,92,246,0.18)", // audit-ok: progress track bg
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 2,
    overflow: "hidden",
  },
});
