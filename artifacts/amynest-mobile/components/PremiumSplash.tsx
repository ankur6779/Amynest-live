import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import NeonRingHero from "@/components/NeonRingHero";
import { useTranslation } from "react-i18next";

const { width: W, height: H } = Dimensions.get("window");

type Props = {
  onFinish: () => void;
};

// Floating particles — mirror the web's .splash-particle elements
const PARTICLES: {
  x: number; y: number; size: number; dur: number; delay: number;
}[] = [
  { x: 0.10, y: 0.78, size: 2, dur: 3200, delay: 0 },
  { x: 0.26, y: 0.86, size: 1, dur: 4200, delay: 600 },
  { x: 0.44, y: 0.72, size: 2, dur: 3600, delay: 200 },
  { x: 0.62, y: 0.90, size: 1, dur: 4600, delay: 1000 },
  { x: 0.78, y: 0.80, size: 2, dur: 3400, delay: 400 },
  { x: 0.90, y: 0.68, size: 1, dur: 4000, delay: 1200 },
];

function FloatingParticle({ x, y, size, dur, delay }: { x: number; y: number; size: number; dur: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.8, duration: dur * 0.1, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.45, duration: dur * 0.8, easing: Easing.linear, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: dur * 0.1, easing: Easing.linear, useNativeDriver: true }),
          ]),
          Animated.timing(translateY, { toValue: -(H * 0.45), duration: dur, easing: Easing.linear, useNativeDriver: true }),
        ]),
        Animated.timing(translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, translateY, dur, delay]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: W * x,
        top: H * y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(255,255,255,0.85)",
        shadowColor: "#a855f7", // audit-ok: web splash-particle glow colour
        shadowOpacity: 0.7,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 0 },
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

export default function PremiumSplash({ onFinish }: Props) {
  const { t } = useTranslation();
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const stageOpacity = useRef(new Animated.Value(0)).current;
  const stageTranslateY = useRef(new Animated.Value(18)).current;
  const waveScale = useRef(new Animated.Value(1)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    // Stage entrance — matches web stageIn: 0.9s, delay 0.15s
    const stageIn = Animated.parallel([
      Animated.timing(stageOpacity, {
        toValue: 1,
        duration: 900,
        delay: 150,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(stageTranslateY, {
        toValue: 0,
        duration: 900,
        delay: 150,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]);

    // Tagline fade-in — matches web tagIn: 0.9s, delay 1.2s
    const tagIn = Animated.parallel([
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 900,
        delay: 1200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
      Animated.timing(taglineTranslateY, {
        toValue: 0,
        duration: 900,
        delay: 1200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]);

    // Wave pulse — matches web wavePulse: scale 1→1.05→1, 7s total
    const wavePulse = Animated.loop(
      Animated.sequence([
        Animated.timing(waveScale, {
          toValue: 1.05,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveScale, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    stageIn.start();
    tagIn.start();
    wavePulse.start();

    // Auto-dismiss after 2.8s with 0.75s fade — mirrors web splash-hide transition
    const finishT = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 750,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, 2800);

    return () => {
      clearTimeout(finishT);
      stageIn.stop();
      tagIn.stop();
      wavePulse.stop();
    };
  }, [containerOpacity, stageOpacity, stageTranslateY, waveScale, taglineOpacity, taglineTranslateY, onFinish]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { opacity: containerOpacity, zIndex: 9999, elevation: 9999 },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#0a061a" // audit-ok: web splash bg #0a061a exact match
        translucent={Platform.OS === "android"}
      />

      {/* ── Background — matches web splash dark gradient (see kidschedule/index.html) */}
      <LinearGradient
        colors={["#0a061a", "#120a2e", "#050010"]} // audit-ok: web splash gradient colours #0a061a #120a2e #050010
        locations={[0, 0.55, 1]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.88, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* ── Radial centre light — web: radial-gradient rgba(120,50,220,0.22) at 50% 44% */}
      <View style={styles.radialCentre} />

      {/* ── Concentric wave rings — web: .splash-waves box-shadow rings, pulsing 7s */}
      <Animated.View style={[styles.waveAnchor, { transform: [{ scale: waveScale }] }]}>
        <View style={[styles.waveRing, { width: 160,  height: 160,  borderRadius: 80,  borderColor: "rgba(168,85,247,0.07)" }]} />
        <View style={[styles.waveRing, { width: 340,  height: 340,  borderRadius: 170, borderColor: "rgba(168,85,247,0.05)" }]} />
        <View style={[styles.waveRing, { width: 560,  height: 560,  borderRadius: 280, borderColor: "rgba(100,50,200,0.035)" }]} />
        <View style={[styles.waveRing, { width: 840,  height: 840,  borderRadius: 420, borderColor: "rgba(80,30,160,0.025)" }]} />
      </Animated.View>

      {/* ── Floating particles — web: .splash-particle float upward */}
      {PARTICLES.map((p, i) => (
        <FloatingParticle key={i} {...p} />
      ))}

      {/* ── Stage — centered column matching web .splash-stage */}
      <Animated.View
        style={[
          styles.stage,
          {
            opacity: stageOpacity,
            transform: [{ translateY: stageTranslateY }],
          },
        ]}
      >
        {/* Atmospheric glow behind ring — web .splash-glow-outer */}
        <View style={styles.atmosGlow} />

        {/* NeonRingHero — spinning gradient ring with MEET + AMY text (identical to web ring) */}
        <NeonRingHero />

        {/* Platform glow below ring — web .splash-platform blur(14px) */}
        <View style={styles.platform} />

        {/* Tagline — web .splash-tagline "Where Smart Parenting Starts" */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          {t("misc.footer_tagline")}
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  radialCentre: {
    position: "absolute",
    top: "38%",
    left: "50%",
    marginLeft: -170,
    marginTop: -170,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(120,50,220,0.15)", // audit-ok: web splash radial-gradient rgba(120,50,220,0.22)
  },
  waveAnchor: {
    position: "absolute",
    top: "44%",
    left: "50%",
    alignItems: "center",
    justifyContent: "center",
  },
  waveRing: {
    position: "absolute",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  atmosGlow: {
    position: "absolute",
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: "rgba(120,50,220,0.11)", // audit-ok: web splash-glow-outer atmospheric purple centre
  },
  platform: {
    width: 160,
    height: 20,
    marginTop: -4,
    borderRadius: 80,
    backgroundColor: "rgba(168,85,247,0.30)", // audit-ok: web splash-platform rgba(168,85,247,0.55) approximated
    opacity: 0.6,
  },
  tagline: {
    marginTop: 36,
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: 0.5,
    color: "rgba(210,200,255,0.70)",
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },
});
