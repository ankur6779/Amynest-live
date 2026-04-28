import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type Props = {
  onFinish: () => void;
};

export default function PremiumSplash({ onFinish }: Props) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(14)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslate = useRef(new Animated.Value(10)).current;
  const sparkle1 = useRef(new Animated.Value(0)).current;
  const sparkle2 = useRef(new Animated.Value(0)).current;
  const sparkle3 = useRef(new Animated.Value(0)).current;
  const dotProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 6,
        tension: 70,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const ringPulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.55,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(ringScale, {
              toValue: 1.55,
              duration: 1800,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0,
              duration: 1800,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(ringScale, {
            toValue: 0.8,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    const ringPulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(ring2Opacity, {
          toValue: 0.4,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(ring2Scale, {
            toValue: 1.7,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ring2Opacity, {
            toValue: 0,
            duration: 1800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ring2Scale, {
          toValue: 0.8,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const titleIn = Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslate, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const subtitleIn = Animated.parallel([
      Animated.timing(subtitleOpacity, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(subtitleTranslate, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const sparkleAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const dotsAnim = Animated.loop(
      Animated.timing(dotProgress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    const sparkle1Loop = sparkleAnim(sparkle1, 0);
    const sparkle2Loop = sparkleAnim(sparkle2, 400);
    const sparkle3Loop = sparkleAnim(sparkle3, 800);

    let exitAnim: Animated.CompositeAnimation | null = null;

    intro.start();
    ringPulse.start();
    ringPulse2.start();
    sparkle1Loop.start();
    sparkle2Loop.start();
    sparkle3Loop.start();
    dotsAnim.start();

    const t1 = setTimeout(() => titleIn.start(), 380);
    const t2 = setTimeout(() => subtitleIn.start(), 720);

    const finishT = setTimeout(() => {
      exitAnim = Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      exitAnim.start(({ finished }) => {
        if (finished) onFinish();
      });
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(finishT);
      intro.stop();
      ringPulse.stop();
      ringPulse2.stop();
      sparkle1Loop.stop();
      sparkle2Loop.stop();
      sparkle3Loop.stop();
      dotsAnim.stop();
      titleIn.stop();
      subtitleIn.stop();
      exitAnim?.stop();
    };
  }, [
    containerOpacity,
    logoScale,
    logoOpacity,
    ringScale,
    ringOpacity,
    ring2Scale,
    ring2Opacity,
    titleOpacity,
    titleTranslate,
    subtitleOpacity,
    subtitleTranslate,
    sparkle1,
    sparkle2,
    sparkle3,
    dotProgress,
    onFinish,
  ]);

  const dot1Opacity = dotProgress.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.35, 1, 0.35, 0.35],
  });
  const dot2Opacity = dotProgress.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.35, 0.35, 1, 0.35],
  });
  const dot3Opacity = dotProgress.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [0.35, 0.35, 0.35, 1],
  });

  const sparkleStyle = (val: Animated.Value) => ({
    opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.95] }),
    transform: [
      { scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) },
    ],
  });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { opacity: containerOpacity, zIndex: 9999, elevation: 9999 },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" translucent={Platform.OS === "android"} />

      {/* Background: dark deep-purple matching web palette */}
      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Soft radial-ish overlay */}
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0)"]}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 0.9 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating sparkles */}
      <Animated.View style={[styles.sparkle, { top: SCREEN_H * 0.18, left: SCREEN_W * 0.18 }, sparkleStyle(sparkle1)]}>
        <Text style={styles.sparkleText}>✦</Text>
      </Animated.View>
      <Animated.View style={[styles.sparkle, { top: SCREEN_H * 0.22, right: SCREEN_W * 0.16 }, sparkleStyle(sparkle2)]}>
        <Text style={styles.sparkleTextSm}>✦</Text>
      </Animated.View>
      <Animated.View style={[styles.sparkle, { bottom: SCREEN_H * 0.30, left: SCREEN_W * 0.22 }, sparkleStyle(sparkle3)]}>
        <Text style={styles.sparkleTextSm}>✦</Text>
      </Animated.View>
      <Animated.View style={[styles.sparkle, { bottom: SCREEN_H * 0.34, right: SCREEN_W * 0.20 }, sparkleStyle(sparkle1)]}>
        <Text style={styles.sparkleText}>✦</Text>
      </Animated.View>

      <View style={styles.center}>
        {/* Pulsing rings */}
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ring2Opacity,
              transform: [{ scale: ring2Scale }],
            },
          ]}
        />

        {/* Logo halo */}
        <View style={styles.halo} />

        {/* "MEET AMY" branding label above logo */}
        <Animated.View
          style={[
            styles.meetAmyWrapper,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <Text style={styles.meetLabel}>MEET</Text>
          <Text style={styles.amyLabel}>AMY</Text>
        </Animated.View>

        {/* Logo inside gradient ring border */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}
        >
          {/* Cross-platform colored glow — background-based so it renders on Android
              (Android ignores shadowColor, only honouring elevation with a black shadow) */}
          <View style={styles.logoGlowOuter} />
          <View style={styles.logoGlowInner} />
          <LinearGradient
            colors={["#7B3FF2", "#FF4ECD", "#4FC3F7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoRingGradient}
          >
            <View style={styles.logoRingInner}>
              <Image
                source={require("../assets/images/amynest-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          style={[
            styles.title,
            { opacity: titleOpacity, transform: [{ translateY: titleTranslate }] },
          ]}
        >
          AmyNest <Text style={styles.titleAccent}>AI</Text>
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslate }] },
          ]}
        >
          Where Smart Parenting Begins
        </Animated.Text>

        {/* Loading dots */}
        <View style={styles.dotsRow}>
          <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
          <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
          <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
        </View>
      </View>

      {/* Bottom brand mark */}
      <View style={styles.bottom}>
        <Text style={styles.bottomText}>Powered by AmyNest AI</Text>
      </View>
    </Animated.View>
  );
}

const LOGO_SIZE = 120;
const HALO_SIZE = 200;
const RING_BORDER = 3;
const RING_OUTER = LOGO_SIZE + 32;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: "rgba(123,63,242,0.12)",
    shadowColor: "#7B3FF2",
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  ring: {
    position: "absolute",
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
  },
  meetAmyWrapper: {
    alignItems: "center",
    marginBottom: 14,
  },
  meetLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.70)",
  },
  amyLabel: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 6,
    textTransform: "uppercase",
    color: "#FFFFFF",
    textShadowColor: "rgba(123,63,242,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  logoGlowOuter: {
    position: "absolute",
    width: RING_OUTER + 60,
    height: RING_OUTER + 60,
    borderRadius: (RING_OUTER + 60) / 2,
    top: -30,
    left: -30,
    backgroundColor: "rgba(255,78,205,0.16)",
  },
  logoGlowInner: {
    position: "absolute",
    width: RING_OUTER + 30,
    height: RING_OUTER + 30,
    borderRadius: (RING_OUTER + 30) / 2,
    top: -15,
    left: -15,
    backgroundColor: "rgba(123,63,242,0.20)",
  },
  logoRingGradient: {
    width: RING_OUTER,
    height: RING_OUTER,
    borderRadius: RING_OUTER / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF4ECD",
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  logoRingInner: {
    width: RING_OUTER - RING_BORDER * 2,
    height: RING_OUTER - RING_BORDER * 2,
    borderRadius: (RING_OUTER - RING_BORDER * 2) / 2,
    backgroundColor: "#1a1535",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  title: {
    marginTop: 28,
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleAccent: {
    color: "#FFE9F7",
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255,255,255,0.88)",
    letterSpacing: 0.3,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  sparkle: {
    position: "absolute",
  },
  sparkleText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 22,
  },
  sparkleTextSm: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  bottom: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  bottomText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "600",
  },
});
