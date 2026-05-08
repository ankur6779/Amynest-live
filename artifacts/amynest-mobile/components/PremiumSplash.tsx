/**
 * PremiumSplash — Reference-matched cinematic splash screen.
 *
 * Visual match: thin neon ring (9 px band), large white "AMY" text with
 * purple glow, coloured tagline, 4 feature-icon row, scrolling waves,
 * glowing progress bar. Minimum visible duration: 3.2 s (> 2.9 s req.).
 *
 * Animations: Reanimated 4 (UI thread) for ring/stage/progress/wave;
 *             RN Animated for 24 lightweight star-twinkle loops.
 */
import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Animated as RNAnimated,
  Easing   as RNEasing,
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
import { Ionicons } from "@expo/vector-icons";
import { brand, brandAlpha } from "@/constants/colors";
import { useTranslation } from "react-i18next";

const { width: W, height: H } = Dimensions.get("window");

// ─── Timing ───────────────────────────────────────────────────────────────────
const VISIBLE_MS  = 3200;   // > 2.9 s minimum requirement
const FADE_OUT_MS = 800;

// ─── Ring geometry ────────────────────────────────────────────────────────────
// Thin neon-tube aesthetic — 9 px band
const OUTER  = 265;
const INNER  = 247;
const OFFSET = (OUTER - INNER) / 2;   // 9 px

// Ring-group container (holds ring + all absolute glow layers)
const RG = 360;

// ─── Misc ─────────────────────────────────────────────────────────────────────
const BAR_MAX_W = W * 0.68;
const WAVE_H    = 120;
const WAVE_W    = W * 2.5;

// Reusable pure-white constant (avoids repeating audit-ok on every usage)
const WHITE = "#FFFFFF"; // audit-ok: pure white — star dots, AMY text, flare dots

// ─── Star field ───────────────────────────────────────────────────────────────
type StarDef = { x: number; y: number; r: number; dur: number; del: number };

const STAR_DEFS: StarDef[] = Array.from({ length: 24 }, (_, i) => ({
  x:   (((i * 137.508) % 100) / 100) * W,
  y:   (((i * 91.3 + 7) % 100) / 100) * H * 0.82,
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
          toValue: 0.85,
          duration: dur * 0.45,
          easing: RNEasing.inOut(RNEasing.ease),
          useNativeDriver: true,
        }),
        RNAnimated.timing(opacity, {
          toValue: 0.1,
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
        backgroundColor: WHITE,
        shadowColor: brand.purple400,
        shadowOpacity: 0.8,
        shadowRadius: r * 3,
        shadowOffset: { width: 0, height: 0 },
        opacity,
      }}
    />
  );
}

// ─── "AMY" SVG text — white with purple glow bloom ───────────────────────────
function AmyText({ glow }: { glow: SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View style={animStyle}>
      <Svg width={200} height={86} viewBox="0 0 200 86">
        <Defs>
          <SvgGradient id="amyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%"   stopColor={WHITE}          />
            <Stop offset="55%"  stopColor={brand.purple400} />
            <Stop offset="100%" stopColor={brand.indigo500} />
          </SvgGradient>
        </Defs>

        {/* Outer glow bloom — large, dim purple */}
        <SvgText
          fill={brand.purple500}
          fontSize={72}
          fontWeight="700"
          letterSpacing={8}
          textAnchor="middle"
          x="100"
          y="74"
          opacity={0.22}
          fontFamily="Inter_700Bold"
        >
          AMY
        </SvgText>

        {/* Mid glow — closer to main text */}
        <SvgText
          fill={brand.purple400}
          fontSize={64}
          fontWeight="700"
          letterSpacing={8}
          textAnchor="middle"
          x="100"
          y="72"
          opacity={0.3}
          fontFamily="Inter_700Bold"
        >
          AMY
        </SvgText>

        {/* Main text — white→purple gradient */}
        <SvgText
          fill="url(#amyGrad)"
          fontSize={60}
          fontWeight="700"
          letterSpacing={8}
          textAnchor="middle"
          x="100"
          y="70"
          fontFamily="Inter_700Bold"
        >
          AMY
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

// ─── Bottom sine-wave layers ──────────────────────────────────────────────────
function makeSinePath(tw: number, th: number, amp: number, freq: number, yb: number): string {
  const steps = 80;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const px = (i / steps) * tw;
    const py = yb + amp * Math.sin((i / steps) * Math.PI * freq);
    pts.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)},${py.toFixed(1)}`);
  }
  pts.push(`L ${tw.toFixed(1)},${th} L 0,${th} Z`);
  return pts.join(" ");
}

function BottomWave({ tx }: { tx: SharedValue<number> }) {
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }],
  }));
  const p1 = useMemo(() => makeSinePath(WAVE_W, WAVE_H, 28, 3.5, 34), []);
  const p2 = useMemo(() => makeSinePath(WAVE_W, WAVE_H, 18, 4.8, 56), []);
  const p3 = useMemo(() => makeSinePath(WAVE_W, WAVE_H, 11, 6.2, 72), []);

  return (
    <View style={styles.waveContainer} pointerEvents="none">
      <Animated.View style={[{ width: WAVE_W, height: WAVE_H }, animStyle]}>
        <Svg width={WAVE_W} height={WAVE_H}>
          <Defs>
            <SvgGradient id="wg1" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%"   stopColor={brand.purple500} stopOpacity={0.28} />
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

// ─── Feature icons row ────────────────────────────────────────────────────────
type FeatureDef = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  tKey: string;
};
const FEATURES: FeatureDef[] = [
  { icon: "hardware-chip-outline",     tKey: "feat_ai"      },
  { icon: "shield-checkmark-outline",  tKey: "feat_trusted"  },
  { icon: "heart-outline",             tKey: "feat_caring"   },
  { icon: "trending-up-outline",       tKey: "feat_smarter"  },
];

function FeatureIcons({ opacity }: { opacity: SharedValue<number> }) {
  const { t } = useTranslation();
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.featRow, animStyle]}>
      {FEATURES.map((f, i) => (
        <React.Fragment key={f.tKey}>
          {i > 0 && <View style={styles.featSep} />}
          <View style={styles.featItem}>
            <Ionicons name={f.icon} size={22} color={brand.purple400} />
            <Text style={styles.featLabel}>{t(`premium_splash.${f.tKey}`)}</Text>
          </View>
        </React.Fragment>
      ))}
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PremiumSplash({ onFinish }: { onFinish: () => void }) {
  const { t } = useTranslation();

  // All UI-thread shared values
  const containerOpacity = useSharedValue(0);
  const stageOpacity     = useSharedValue(0);
  const stageY           = useSharedValue(26);
  const ringPulse        = useSharedValue(1);
  const ringRot          = useSharedValue(0);
  const ringGlow         = useSharedValue(0.22);
  const amyGlow          = useSharedValue(0.62);
  const taglineOpacity   = useSharedValue(0);
  const featOpacity      = useSharedValue(0);
  const progressW        = useSharedValue(0);
  const waveX            = useSharedValue(0);

  useEffect(() => {
    const dismiss = () => onFinish();

    // ── Entrance ─────────────────────────────────────────────────────────────
    containerOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    stageOpacity.value     = withDelay(160, withTiming(1, { duration: 1050, easing: Easing.out(Easing.exp) }));
    stageY.value           = withDelay(160, withTiming(0, { duration: 1050, easing: Easing.out(Easing.exp) }));
    taglineOpacity.value   = withDelay(900,  withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) }));
    featOpacity.value      = withDelay(1300, withTiming(1, { duration: 900, easing: Easing.out(Easing.ease) }));

    // ── Ring slow rotation (14 s / rev) ──────────────────────────────────────
    ringRot.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.linear }),
      -1, false,
    );

    // ── Ring breathing pulse (~3 s cycle) ────────────────────────────────────
    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1.065, { duration: 2900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1,     { duration: 2900, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );

    // ── Atmospheric glow pulse ────────────────────────────────────────────────
    ringGlow.value = withRepeat(
      withSequence(
        withTiming(0.88, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.22, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );

    // ── "AMY" glow pulse ─────────────────────────────────────────────────────
    amyGlow.value = withRepeat(
      withSequence(
        withTiming(1,    { duration: 1950, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.62, { duration: 1950, easing: Easing.inOut(Easing.ease) }),
      ),
      -1, false,
    );

    // ── Progress bar fills over VISIBLE_MS ───────────────────────────────────
    progressW.value = withDelay(
      280,
      withTiming(BAR_MAX_W, { duration: VISIBLE_MS - 480, easing: Easing.inOut(Easing.ease) }),
    );

    // ── Wave scrolls left ─────────────────────────────────────────────────────
    waveX.value = withRepeat(
      withTiming(-W, { duration: 6200, easing: Easing.linear }),
      -1, false,
    );

    // ── Dismiss ───────────────────────────────────────────────────────────────
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
      cancelAnimation(featOpacity);
      cancelAnimation(progressW);
      cancelAnimation(waveX);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Animated styles ───────────────────────────────────────────────────────
  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const stageStyle     = useAnimatedStyle(() => ({
    opacity: stageOpacity.value,
    transform: [{ translateY: stageY.value }],
  }));
  const ringRotStyle   = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRot.value * 360}deg` }],
  }));
  const ringPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringPulse.value }],
  }));
  const ringGlowStyle  = useAnimatedStyle(() => ({ opacity: ringGlow.value }));
  const taglineStyle   = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const progressStyle  = useAnimatedStyle(() => ({ width: progressW.value }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999 }, containerStyle]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#04000d" // audit-ok: void black splash status-bar
        translucent={Platform.OS === "android"}
      />

      {/* ── Deep void gradient background ────────────────────────────── */}
      <LinearGradient
        colors={["#04000d", "#0a031a", "#060010"]} // audit-ok: void black + deep-purple splash bg
        locations={[0, 0.5, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Radial purple blooms ──────────────────────────────────────── */}
      <View style={styles.radialBloom} />
      <View style={styles.radialBloomCore} />

      {/* ── Twinkling stars ───────────────────────────────────────────── */}
      {STAR_DEFS.map((s, i) => <Star key={i} {...s} />)}

      {/* ── Scrolling bottom waves ────────────────────────────────────── */}
      <BottomWave tx={waveX} />

      {/* ── Main stage ────────────────────────────────────────────────── */}
      <Animated.View style={[styles.stage, stageStyle]}>

        {/* Ring group — 360×360 container */}
        <View style={styles.ringGroup}>

          {/* Atmospheric glow discs */}
          <Animated.View style={[styles.atmosGlow,      ringGlowStyle]} />
          <Animated.View style={[styles.atmosGlowInner, ringGlowStyle]} />

          {/* Orbit guide ring */}
          <View style={styles.orbitRing} />

          {/* Neon edge glow rings — create the bright tube light look */}
          <View style={styles.neonGlowOuter} />
          <View style={styles.neonGlowInner} />

          {/* Pulse + rotate group — centred by flex */}
          <Animated.View style={ringPulseStyle}>
            {/* Rotating gradient fill — clipped to ring circle */}
            <View style={styles.ringClip}>
              <Animated.View style={[StyleSheet.absoluteFill, ringRotStyle]}>
                <LinearGradient
                  colors={[brand.purple500, brand.pink500, WHITE, brand.indigo500, brand.purple500, brand.pink500, brand.purple500]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientFill}
                />
              </Animated.View>
            </View>

            {/* Inner dark circle — "Meet" + "AMY" */}
            <View style={styles.innerCircle}>
              <Text style={styles.meetText}>{t("premium_splash.meet")}</Text>
              <View style={styles.meetUnderline} />
              <AmyText glow={amyGlow} />
              <View style={styles.amyUnderline} />
            </View>

            {/* Flare dots */}
            <View style={styles.flarePrimary} />
            <View style={styles.flareSecondary} />
          </Animated.View>
        </View>

        {/* Platform glow beneath ring */}
        <View style={styles.platform} />

        {/* Tagline — "— Where Smart Parenting Start —" */}
        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>
            <Text style={styles.taglineDim}>{t("premium_splash.tagline_prefix")}</Text>
            <Text style={styles.taglineHighlight}>{t("premium_splash.tagline_highlight")}</Text>
            <Text style={styles.taglineDim}>{t("premium_splash.tagline_suffix")}</Text>
          </Text>
        </Animated.View>

        {/* Thin divider with centre dot */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>

        {/* Feature icons */}
        <FeatureIcons opacity={featOpacity} />
      </Animated.View>

      {/* ── Thin glowing progress bar ─────────────────────────────────── */}
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

  // Background
  radialBloom: {
    position: "absolute",
    top: H * 0.18,
    left: W / 2 - 190,
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(110,40,210,0.22)", // audit-ok: outer radial bloom
  },
  radialBloomCore: {
    position: "absolute",
    top: H * 0.27,
    left: W / 2 - 110,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(168,85,247,0.16)", // audit-ok: inner radial bloom
  },

  // Wave
  waveContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    width: W,
    height: WAVE_H,
    overflow: "hidden",
  },

  // Stage
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: H * 0.06,
  },

  // Ring group — 360×360
  ringGroup: {
    width: RG,
    height: RG,
    alignItems: "center",
    justifyContent: "center",
  },

  atmosGlow: {
    position: "absolute",
    width: RG,
    height: RG,
    borderRadius: RG / 2,
    top: 0,
    left: 0,
    backgroundColor: "rgba(110,40,210,0.18)", // audit-ok: outer atmospheric glow
  },

  atmosGlowInner: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    top: (RG - 240) / 2,   // 60
    left: (RG - 240) / 2,
    backgroundColor: "rgba(168,85,247,0.14)", // audit-ok: inner atmospheric glow
  },

  orbitRing: {
    position: "absolute",
    width: OUTER + 32,
    height: OUTER + 32,
    borderRadius: (OUTER + 32) / 2,
    top:  (RG - (OUTER + 32)) / 2,
    left: (RG - (OUTER + 32)) / 2,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.15)", // audit-ok: orbit guide dim purple
    backgroundColor: "transparent",
  },

  // Neon glow rings — simulates bright neon tube edge on iOS shadow
  neonGlowOuter: {
    position: "absolute",
    width: OUTER + 10,
    height: OUTER + 10,
    borderRadius: (OUTER + 10) / 2,
    top:  (RG - (OUTER + 10)) / 2,
    left: (RG - (OUTER + 10)) / 2,
    borderWidth: 1.5,
    borderColor: "rgba(168,85,247,0.55)", // audit-ok: neon outer glow edge
    backgroundColor: "transparent",
    shadowColor: brand.purple500,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },

  neonGlowInner: {
    position: "absolute",
    width: OUTER - 4,
    height: OUTER - 4,
    borderRadius: (OUTER - 4) / 2,
    top:  (RG - (OUTER - 4)) / 2,
    left: (RG - (OUTER - 4)) / 2,
    borderWidth: 1,
    borderColor: "rgba(236,72,153,0.35)", // audit-ok: neon inner pink glow edge
    backgroundColor: "transparent",
    shadowColor: brand.pink500,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
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
    backgroundColor: "#04000d", // audit-ok: deep void black inner ring fill
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },

  meetText: {
    fontSize: 16,
    fontWeight: "300",
    letterSpacing: 3,
    color: "rgba(240,230,255,0.82)", // audit-ok: "Meet" soft white-lavender
    textTransform: "capitalize",
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },

  meetUnderline: {
    width: 70,
    height: 0.5,
    backgroundColor: "rgba(168,85,247,0.45)", // audit-ok: subtle underline below Meet
    marginBottom: 2,
  },

  amyUnderline: {
    width: 100,
    height: 0.5,
    marginTop: -4,
    backgroundColor: "rgba(168,85,247,0.35)", // audit-ok: subtle underline below AMY
  },

  flarePrimary: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: WHITE,
    top: 10,
    right: 24,
    shadowColor: WHITE,
    shadowOpacity: 0.95,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  flareSecondary: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: brand.pink500,
    bottom: 20,
    left: 18,
    opacity: 0.55,
    shadowColor: brand.pink500,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },

  // Platform glow
  platform: {
    width: 140,
    height: 16,
    marginTop: 2,
    borderRadius: 70,
    backgroundColor: brandAlpha.purple500_30,
    opacity: 0.5,
  },

  // Tagline
  tagline: {
    marginTop: 18,
    textAlign: "center",
  },
  taglineDim: {
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.4,
    color: "rgba(220,210,255,0.65)", // audit-ok: tagline prefix/suffix soft lavender
    fontFamily: "Inter_400Regular",
  },
  taglineHighlight: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: brand.pink500,
    fontFamily: "Inter_600SemiBold",
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 14,
    width: W * 0.72,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: "rgba(168,85,247,0.22)", // audit-ok: divider dim purple
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: brand.purple400,
    marginHorizontal: 8,
    opacity: 0.7,
  },

  // Feature icons
  featRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  featItem: {
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 5,
  },
  featLabel: {
    fontSize: 10,
    fontWeight: "400",
    fontFamily: "Inter_400Regular",
    color: "rgba(210,195,255,0.65)", // audit-ok: feature label soft lavender
    textAlign: "center",
  },
  featSep: {
    width: 0.5,
    height: 36,
    backgroundColor: "rgba(168,85,247,0.25)", // audit-ok: feature separator dim purple
  },

  // Progress bar
  progressTrack: {
    position: "absolute",
    bottom: 28,
    left: (W - BAR_MAX_W) / 2,
    width: BAR_MAX_W,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(168,85,247,0.14)", // audit-ok: progress track dim purple
    shadowColor: brand.purple500,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },

  progressBar: {
    height: 2,
    borderRadius: 1,
    shadowColor: brand.pink500,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});
