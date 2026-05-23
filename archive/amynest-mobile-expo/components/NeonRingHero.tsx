import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { brand } from "@/constants/colors";
import { useTranslation } from "react-i18next";

const OUTER = 170;
const INNER = 136;
const OFFSET = (OUTER - INNER) / 2;

export default function NeonRingHero() {
  const { t } = useTranslation();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;
  const amyGlowAnim = useRef(new Animated.Value(0.72)).current;

  useEffect(() => {
    // Reset all Animated.Values to their initial positions on every mount so
    // nothing jumps on re-entry if the component unmounted mid-cycle.
    spinAnim.setValue(0);
    pulseAnim.setValue(1);
    glowAnim.setValue(1);
    amyGlowAnim.setValue(0.72);

    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 11000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.1,
          duration: 1750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const amyGlowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(amyGlowAnim, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(amyGlowAnim, {
          toValue: 0.72,
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    spinLoop.start();
    pulseLoop.start();
    glowLoop.start();
    amyGlowLoop.start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
      glowLoop.stop();
      amyGlowLoop.stop();
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const amyScale = amyGlowAnim.interpolate({
    inputRange: [0.72, 1],
    outputRange: [1, 1.05],
  });

  return (
    <View style={styles.wrapper} pointerEvents="none" aria-hidden>
      {/* Atmospheric outer glow */}
      <Animated.View
        style={[
          styles.atmosGlow,
          { transform: [{ scale: glowAnim }] },
        ]}
      />

      {/* Secondary orbit line */}
      <View style={styles.orbitLine} />

      {/* Pulse wrapper */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        {/* Ring: rotating LinearGradient clipped to circle */}
        <View style={styles.ringClip}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}
          >
            <LinearGradient
              colors={[brand.purple500, brand.pink500, brand.purple500, brand.pink500, brand.purple500]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientFill}
            />
          </Animated.View>
        </View>

        {/* Inner dark circle */}
        <View style={styles.innerCircle}>
          <Text style={styles.meetText}>{t("components.neon_ring_hero.meet")}</Text>

          {/* "AMY" — pink colour, opacity + subtle scale pulse on ~3.2s loop */}
          <Animated.View style={{ opacity: amyGlowAnim, transform: [{ scale: amyScale }] }}>
            <Text style={styles.amyText}>{t("components.neon_ring_hero.amy")}</Text>
          </Animated.View>
        </View>

        {/* Light flare dot */}
        <View style={styles.flareDot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: OUTER,
    height: OUTER,
  },

  atmosGlow: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(168,85,247,0.18)",
    top: -40,
    left: -40,
  },

  orbitLine: {
    position: "absolute",
    width: OUTER + 34,
    height: OUTER + 34,
    borderRadius: (OUTER + 34) / 2,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.16)",
    top: -17,
    left: -17,
  },

  ringClip: {
    width: OUTER,
    height: OUTER,
    borderRadius: OUTER / 2,
    overflow: "hidden",
  },

  gradientFill: {
    width: OUTER * 1.6,
    height: OUTER * 1.6,
    position: "absolute",
    top: -(OUTER * 0.3),
    left: -(OUTER * 0.3),
  },

  innerCircle: {
    position: "absolute",
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    top: OFFSET,
    left: OFFSET,
    backgroundColor: "#080316", // audit-ok: deep void black for NeonRing inner circle
    alignItems: "center",
    justifyContent: "center",
  },

  meetText: {
    fontSize: 12,
    fontWeight: "300",
    letterSpacing: 4,
    color: "rgba(255,255,255,0.80)",
    textTransform: "uppercase",
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },

  amyText: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 4,
    color: brand.pink500,
    textTransform: "uppercase",
    fontFamily: "Inter_700Bold",
  },

  flareDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    top: 10,
    right: 22,
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
