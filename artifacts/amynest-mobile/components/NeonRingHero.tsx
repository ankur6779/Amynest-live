import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { brand } from "@/constants/colors";
import { useTranslation } from "react-i18next";

interface NeonRingHeroProps {
  /** "large" → bigger ring (220px) for splash/welcome hero; default "normal" (170px) */
  size?: "normal" | "large";
  /** slow → 3× slower animations for a cinematic splash feel */
  slow?: boolean;
}

export default function NeonRingHero({ size = "normal", slow = false }: NeonRingHeroProps) {
  const { t } = useTranslation();
  const isLarge = size === "large";

  const OUTER  = isLarge ? 220 : 170;
  const INNER  = isLarge ? 176 : 136;
  const OFFSET = (OUTER - INNER) / 2;

  // Animation durations — 3× slower in slow mode
  const SPIN_DUR      = slow ? 33000 : 11000;
  const PULSE_HALF    = slow ? 4200  : 1400;
  const GLOW_HALF     = slow ? 5250  : 1750;
  const AMY_GLOW_HALF = slow ? 4800  : 1600;

  const spinAnim    = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(1)).current;
  const glowAnim    = useRef(new Animated.Value(1)).current;
  const amyGlowAnim = useRef(new Animated.Value(0.72)).current;

  useEffect(() => {
    spinAnim.setValue(0);
    pulseAnim.setValue(1);
    glowAnim.setValue(1);
    amyGlowAnim.setValue(0.72);

    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: SPIN_DUR,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: PULSE_HALF, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: PULSE_HALF, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.1, duration: GLOW_HALF, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1,   duration: GLOW_HALF, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const amyGlowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(amyGlowAnim, { toValue: 1,    duration: AMY_GLOW_HALF, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(amyGlowAnim, { toValue: 0.72, duration: AMY_GLOW_HALF, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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

  const atmosSize   = isLarge ? 330 : 250;
  const atmosOffset = isLarge ? -55  : -40;
  const orbitSize   = OUTER + (isLarge ? 44 : 34);
  const orbitOffset = -(isLarge ? 22 : 17);

  const svgW  = isLarge ? 116 : 90;
  const svgH  = isLarge ? 52  : 40;
  const svgFs = isLarge ? 42  : 32;
  const svgY  = isLarge ? 44  : 33;
  const svgX  = isLarge ? 5   : 4;

  const meetFontSize = isLarge ? 14 : 12;

  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: OUTER, height: OUTER }}>
      {/* Atmospheric outer glow */}
      <Animated.View
        style={[
          {
            position: "absolute",
            width: atmosSize,
            height: atmosSize,
            borderRadius: atmosSize / 2,
            backgroundColor: "rgba(168,85,247,0.18)",
            top: atmosOffset,
            left: atmosOffset,
          },
          { transform: [{ scale: glowAnim }] },
        ]}
      />

      {/* Secondary orbit line */}
      <View
        style={{
          position: "absolute",
          width: orbitSize,
          height: orbitSize,
          borderRadius: orbitSize / 2,
          borderWidth: 1,
          borderColor: "rgba(168,85,247,0.16)",
          top: orbitOffset,
          left: orbitOffset,
        }}
      />

      {/* Pulse wrapper */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        {/* Ring: rotating LinearGradient clipped to circle */}
        <View
          style={{
            width: OUTER,
            height: OUTER,
            borderRadius: OUTER / 2,
            overflow: "hidden",
          }}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}>
            <LinearGradient
              colors={[brand.purple500, brand.pink500, brand.purple500, brand.pink500, brand.purple500]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: OUTER * 1.6,
                height: OUTER * 1.6,
                position: "absolute",
                top: -(OUTER * 0.3),
                left: -(OUTER * 0.3),
              }}
            />
          </Animated.View>
        </View>

        {/* Inner dark circle */}
        <View
          style={{
            position: "absolute",
            width: INNER,
            height: INNER,
            borderRadius: INNER / 2,
            top: OFFSET,
            left: OFFSET,
            backgroundColor: "#080316", // audit-ok: deep void black for NeonRing inner circle
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: meetFontSize,
              fontWeight: "300",
              letterSpacing: 4,
              color: "rgba(255,255,255,0.80)",
              textTransform: "uppercase",
              lineHeight: meetFontSize + 4,
              fontFamily: "Inter_400Regular",
            }}
          >
            {t("components.neon_ring_hero.meet")}
          </Text>

          {/* Gradient "AMY" using SVG */}
          <Animated.View style={{ opacity: amyGlowAnim, transform: [{ scale: amyScale }] }}>
            <Svg width={svgW} height={svgH}>
              <Defs>
                <SvgLinearGradient id="amyGrad" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={brand.purple500} />
                  <Stop offset="1" stopColor={brand.pink500} />
                </SvgLinearGradient>
              </Defs>
              <SvgText
                fill="url(#amyGrad)"
                fontSize={svgFs}
                fontWeight="700"
                letterSpacing="4"
                x={svgX}
                y={svgY}
                textAnchor="start"
              >
                AMY
              </SvgText>
            </Svg>
          </Animated.View>
        </View>

        {/* Light flare dot */}
        <View
          style={{
            position: "absolute",
            width: isLarge ? 10 : 8,
            height: isLarge ? 10 : 8,
            borderRadius: isLarge ? 5 : 4,
            backgroundColor: "#FFFFFF",
            top: isLarge ? 12 : 10,
            right: isLarge ? 28 : 22,
            shadowColor: "#FFFFFF",
            shadowOpacity: 0.9,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
          }}
        />
      </Animated.View>
    </View>
  );
}
