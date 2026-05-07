/**
 * PremiumSplash — Cinematic, luxury-native animated splash screen.
 *
 * Design language: deep void + neon purple, Apple-level polish.
 *   · Dark void gradient background (void black → deep purple)
 *   · 26-star twinkling field (golden-angle spread, RN Animated)
 *   · Large breathing neon ring with rotating purple-pink-indigo gradient
 *   · SVG tri-colour gradient "AMY" text inside the ring
 *   · Three-layer scrolling sinusoidal bottom waves (SVG + Reanimated)
 *   · Thin glowing gradient progress bar
 *   · Slow cinematic fade-in entrance + smooth fade-out exit
 *
 * Performance: all main animations run on the UI thread via Reanimated 4.
 * Stars use RN Animated (26 separate loops, lightweight opacity/no layout).
 */
import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Animated as RNAnimated,
  Easing as RNEasing,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  cancelAnimation,
  type SharedValue,
} from "react-native-reanimated";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { brand, brandAlpha } from "@/constants/colors";
import { useTranslation } from "react-i18next";

const { width: W, height: H } = Dimensions.get("window");

// ─── Timing constants ─────────────────────────────────────────────────────────
const VISIBLE_MS  = 3800;   // how long the splash is fully visible
const FADE_OUT_MS = 900;    // duration of the final fade-out

// ─── Ring dimensions (larger than NeonRingHero's OUTER=170 for cinematic feel) ─
const OUTER  = 240;
const INNER  = 188;          // ~26 px ring band thickness
const OFFSET = (OUTER - INNER) / 2;   // 26 — position of inner circle

// ─── Progress bar ─────────────────────────────────────────────────────────────
const BAR_MAX_W = W * 0.72;

// ─── Wave layer ──────────────────────────────────────────────────────────────
const WAVE_H = 130;
const WAVE_W = W * 2.5;    // extra-wide for seamless horizontal loop

// ─── Star field ──────────────────────────────────────────────────────────────
type StarDef = { x: number; y: number; r: number; dur: number; del: number };

/**
 * 26 stars using golden-angle (137.508°) distribution for natural,
 * non-repeating spread across the full screen.
 */
const STAR_DEFS: StarDef[] = Array.from({ length: 26 }, (_, i) => ({
  x:   (((i * 137.508) % 100) / 100) * W,
  y:   (((i * 91.3 + 7) % 100) / 100) * H * 0.84,
  r:   [1, 1, 1.5, 1, 1, 2, 1, 1.5][i % 8],
  dur: 2100 + ((i * 673) % 2800),
  del: (i * 437) % 3400,
}));

function Star({ x, y, r, dur, del }: StarDef) {
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.delay(del),
        RNAnimated.timing(opacity, {
          toValue: 0.9,
          duration: dur * 0.45,
          easing: RNEasing.inOut(RNEasing.ease),
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: 0.12,
          duration: dur * 0.55,
          easing: RNEasing.inOut(RNEasing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [del, dur, opacity]);

  return (
    <RNAnimated.View
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        backgroundColor: "#FFFFFF", // audit-ok: star white dot
        shadowColor: brand.purple400,
        shadowOpacity: 0.85,
        shadowRadius: r * 3.5,
        shadowOffset: { width: 0, height: 0 },
        opacity,
      }}
    />
  );
}

// ─── SVG gradient "AMY" text ─────────────────────────────────────────────────
function AmyGradientText({ glow }: { glow: SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  return (
    <Animated.View style={animStyle}>
      <Svg width={174} height={72} viewBox="0 0 174 72">
        <Defs>
          <SvgGradient id="amyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%"   stopColor={brand.purple500} />
            <Stop offset="48%"  stopColor={brand.pink500}   />
            <Stop offset="100%" stopColor={brand.indigo500} />
          </SvgGradient>
        </Defs>

        {/* Soft outer glow layer — same text, wider, low opacity */}
        <SvgText
          fill={brand.purple400}
          fontSize={50}
          fontWeight="700"
          letterSpacing={6}
          textAnchor="middle"
          x="87"
          y="62"
          opacity={0.28}
          fontFamily="Inter_700Bold"
        >
          AMY
        </SvgText>

        {/* Main tri-colour gradient text */}
        <SvgText
          fill="url(#amyGrad)"
          fontSize={50}
          fontWeight="700"
          letterSpacing={6}
          textAnchor="middle"
          x="87"
          y="62"
          fontFamily="Inter_700Bold"
        >
          AMY
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

// ─── Bottom sine-wave layers ──────────────────────────────────────────────────
function buildSinePath(
  totalW: number,
  totalH: number,
  amp: number,
  freq: number,
  yBase: number,
): string {
  const steps = 80;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const px = (i / steps) * totalW;
    const py = yBase + amp * Math.sin((i / steps) * Math.PI * freq);
    pts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)},${py.toFixed(1)}`);
  }
  pts.push(`L ${totalW.toFixed(1)},${totalH} L 0,${totalH} Z`);
  return pts.join(" ");
}

function BottomWave({ tx }: { tx: SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));

  // Pre-compute paths once (expensive string ops)
  const p1 = useMemo(() => buildSinePath(WAVE_W, WAVE_H, 30, 3.5, 38), []);
  const p2 = useMemo(() => buildSinePath(WAVE_W, WAVE_H, 20, 4.8, 60), []);
  const p3 = useMemo(() => buildSinePath(WAVE_W, WAVE_H, 13, 6.2, 78), []);

  return (
    <View style={styles.waveContainer} pointerEvents="none">
      <Animated.View style={[{ width: WAVE_W, height: WAVE_H }, animStyle]}>
        <Svg width={WAVE_W} height={WAVE_H}>
          <Defs>
            <SvgGradient id="wg1" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor={brand.purple500} stopOpacity={0.26} />
              <Stop offset="100%" stopColor={brand.indigo500} stopOpacity={0.04} />
            </SvgGradient>
            <SvgGradient id="wg2" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor={brand.pink500}   stopOpacity={0.16} />
              <Stop offset="100%" stopColor={brand.purple500} stopOpacity={0.02} />
            </SvgGradient>
          </Defs>
          <Path d={p1} fill="url(#wg1)" />
          <Path d={p2} fill="url(#wg2)" />
          <Path d={p3} fill={brand.indigo500} fillOpacity={0.07} />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PremiumSplash({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();

  // All on UI thread via Reanimated 4
  const containerOpacity = useSharedValue(0);
  const stageOpacity     = useSharedValue(0);
  const stageY           = useSharedValue(30);
  const ringPulse        = useSharedValue(1);
  const ringRot          = useSharedValue(0);
  const ringGlow         = useSharedValue(0.28);
  const amyGlow          = useSharedValue(0.60);
  const taglineOpacity   = useSharedValue(0);
  const progressW        = useSharedValue(0);
  const waveX            = useSharedValue(0);

  useEffect(() => {
    const dismiss = () => onFinish();

    // ── Entrance ────────────────────────────────────────────────────────────
    containerOpacity.value = withTiming(1, {
      duration: 550,
      easing: Easing.out(Easing.ease),
    });
    stageOpacity.value = withDelay(
      180,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.exp) }),
    );
    stageY.value = withDelay(
      180,
      withTiming(0, { duration: 1100, easing: Easing.out(Easing.exp) }),
    );
    taglineOpacity.value = withDelay(
      1050,
      withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
    );

    // ── Ring — slow rotation (13 s / revolution) ─────────────────────────────
    ringRot.value = withRepeat(
      withTiming(1, { duration: 13000, easing: Easing.linear }),
      -1,
      false,
    );

    // ── Ring — slow breathing pulse (~2.8 s cycle) ────────────────────────────
    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1.072, { duration: 2700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,     { duration: 2700, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // ── Atmospheric glow pulse (offset phase for organic feel) ────────────────
    ringGlow.value = withRepeat(
      withSequence(
        withTiming(0.9,  { duration: 2300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.28, { duration: 2300, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // ── "AMY" text glow pulse ─────────────────────────────────────────────────
    amyGlow.value = withRepeat(
      withSequence(
        withTiming(1,    { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.62, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    // ── Progress bar fills over VISIBLE_MS ───────────────────────────────────
    progressW.value = withDelay(
      320,
      withTiming(BAR_MAX_W, {
        duration: VISIBLE_MS - 520,
        easing: Easing.inOut(Easing.ease),
      }),
    );

    // ── Bottom wave scrolls left continuously ─────────────────────────────────
    waveX.value = withRepeat(
      withTiming(-W, { duration: 6200, easing: Easing.linear }),
      -1,
      false,
    );

    // ── Fade-out + dismiss ────────────────────────────────────────────────────
    const timer = setTimeout(() => {
      cancelAnimation(ringPulse);
      cancelAnimation(ringGlow);
      cancelAnimation(amyGlow);
      containerOpacity.value = withTiming(
        0,
        { duration: FADE_OUT_MS, easing: Easing.ease },
        (done) => { if (done) runOnJS(dismiss)(); },
      );
    }, VISIBLE_MS);

    return () => {
      clearTimeout(timer);
      cancelAnimation(containerOpacity);
      cancelAnimation(stageOpacity);
      cancelAnimation(stageY);
      cancelAnimation(ringPulse);
      cancelAnimation(ringRot);
      cancelAnimation(ringGlow);
      cancelAnimation(amyGlow);
      cancelAnimation(taglineOpacity);
      cancelAnimation(progressW);
      cancelAnimation(waveX);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animated styles (all UI-thread) ──────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));
  const stageStyle = useAnimatedStyle(() => ({
    opacity: stageOpacity.value,
    transform: [{ translateY: stageY.value }],
  }));
  const ringRotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRot.value * 360}deg` }],
  }));
  const ringPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringPulse.value }],
  }));
  const ringGlowStyle = useAnimatedStyle(() => ({
    opacity: ringGlow.value,
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));
  const progressStyle = useAnimatedStyle(() => ({
    width: progressW.value,
  }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { zIndex: 9999, elevation: 9999 },
        containerStyle,
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#05000f" // audit-ok: void-black splash status-bar bg
        translucent={Platform.OS === "android"}
      />

      {/* ── Deep void gradient background ────────────────────────────────── */}
      <LinearGradient
        colors={["#05000f", "#0d0520", "#070013"]} // audit-ok: cinematic void-black + deep-purple splash gradient
        locations={[0, 0.52, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Radial purple bloom — atmosphere behind the ring ─────────────── */}
      <View style={styles.radialBloom} />
      <View style={styles.radialBloomCore} />

      {/* ── Twinkling star field ──────────────────────────────────────────── */}
      {STAR_DEFS.map((s, i) => (
        <Star key={i} {...s} />
      ))}

      {/* ── Scrolling bottom sine waves ───────────────────────────────────── */}
      <BottomWave tx={waveX} />

      {/* ── Main stage — centred column ───────────────────────────────────── */}
      <Animated.View style={[styles.stage, stageStyle]}>

        {/* Ring group — 440×440 container centring all ring layers */}
        <View style={styles.ringGroup}>

          {/* Outer atmospheric glow disc */}
          <Animated.View style={[styles.atmosGlow, ringGlowStyle]} />

          {/* Inner tighter glow disc */}
          <Animated.View style={[styles.atmosGlowInner, ringGlowStyle]} />

          {/* Static orbit guide ring */}
          <View style={styles.orbitRing} />

          {/* ── Pulse + rotate group (centred by flex) ─────────────────────── */}
          <Animated.View style={ringPulseStyle}>

            {/* Rotating gradient fill clipped to circle */}
            <View style={styles.ringClip}>
              <Animated.View style={[StyleSheet.absoluteFill, ringRotStyle]}>
                <LinearGradient
                  colors={[
                    brand.purple500,
                    brand.pink500,
                    brand.indigo500,
                    brand.purple500,
                    brand.pink500,
                    brand.purple500,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientFill}
                />
              </Animated.View>
            </View>

            {/* Inner dark circle — "MEET" + gradient "AMY" */}
            <View style={styles.innerCircle}>
              <Text style={styles.meetText}>{t("premium_splash.meet")}</Text>
              <AmyGradientText glow={amyGlow} />
            </View>

            {/* Light flare — primary (top-right of ring) */}
            <View style={styles.flarePrimary} />
            {/* Light flare — secondary (bottom-left, dimmer) */}
            <View style={styles.flareSecondary} />
          </Animated.View>
        </View>

        {/* Glowing platform ellipse beneath ring */}
        <View style={styles.platform} />

        {/* Tagline — fades in 1 s after stage entrance */}
        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>{t("landing.footer_tagline")}</Text>
        </Animated.View>
      </Animated.View>

      {/* ── Thin glowing gradient progress bar ───────────────────────────── */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, progressStyle]}>
          <LinearGradient
            colors={[brand.purple500, brand.pink500]}
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
  // Background blooms
  radialBloom: {
    position: "absolute",
    top: H * 0.22,
    left: W / 2 - 200,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(120,50,220,0.20)", // audit-ok: outer radial bloom purple
  },
  radialBloomCore: {
    position: "absolute",
    top: H * 0.30,
    left: W / 2 - 115,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "rgba(168,85,247,0.16)", // audit-ok: inner radial bloom lighter purple
  },

  // Wave
  waveContainer: {
    position: "absolute",
    bottom: 64,
    left: 0,
    width: W,
    height: WAVE_H,
    overflow: "hidden",
  },

  // Main stage
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: H * 0.08, // shift content slightly upward — visually balances bottom waves
  },

  // Ring group container — absolute children position relative to this 440×440 box
  ringGroup: {
    width: 440,
    height: 440,
    alignItems: "center",
    justifyContent: "center",
  },

  atmosGlow: {
    position: "absolute",
    width: 440,
    height: 440,
    borderRadius: 220,
    top: 0,
    left: 0,
    backgroundColor: "rgba(120,50,220,0.17)", // audit-ok: atmospheric outer glow behind ring
  },

  atmosGlowInner: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: 80,  // (440 - 280) / 2
    left: 80,
    backgroundColor: "rgba(168,85,247,0.13)", // audit-ok: inner atmospheric glow
  },

  orbitRing: {
    position: "absolute",
    width: OUTER + 50,
    height: OUTER + 50,
    borderRadius: (OUTER + 50) / 2,
    top:  (440 - (OUTER + 50)) / 2,  // 75
    left: (440 - (OUTER + 50)) / 2,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.18)", // audit-ok: orbit guide ring — brand purple, very dim
    backgroundColor: "transparent",
  },

  // Ring
  ringClip: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    overflow: "hidden",
  },

  gradientFill: {
    width: OUTER * 1.85,
    height: OUTER * 1.85,
    position: "absolute",
    top:  -(OUTER * 0.425),
    left: -(OUTER * 0.425),
  },

  innerCircle: {
    position: "absolute",
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    top:  OFFSET,
    left: OFFSET,
    backgroundColor: "#06000e", // audit-ok: deep void black inner ring fill
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },

  meetText: {
    fontSize: 10,
    fontWeight: "300",
    letterSpacing: 5.5,
    color: "rgba(215,200,255,0.70)", // audit-ok: MEET text soft lavender on void black
    textTransform: "uppercase",
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    marginBottom: -6,
  },

  // Flare dots
  flarePrimary: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FFFFFF", // audit-ok: white light-flare on ring
    top: 12,
    right: 26,
    shadowColor: "#FFFFFF", // audit-ok: white glow for flare
    shadowOpacity: 0.95,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  flareSecondary: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: brand.pink500,
    bottom: 22,
    left: 18,
    opacity: 0.55,
    shadowColor: brand.pink500,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  // Below ring
  platform: {
    width: 150,
    height: 18,
    marginTop: 2,
    borderRadius: 75,
    backgroundColor: brandAlpha.purple500_30,
    opacity: 0.55,
  },

  tagline: {
    marginTop: 28,
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.55,
    color: "rgba(210,195,255,0.62)", // audit-ok: tagline soft lavender on void black
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },

  // Progress bar
  progressTrack: {
    position: "absolute",
    bottom: 30,
    left: (W - BAR_MAX_W) / 2,
    width: BAR_MAX_W,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(168,85,247,0.15)", // audit-ok: progress track subtle purple
    shadowColor: brand.purple500,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },

  progressBar: {
    height: 2,
    borderRadius: 1,
    shadowColor: brand.pink500,
    shadowOpacity: 0.85,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
