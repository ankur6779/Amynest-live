/**
 * OfflineScreen — premium AmyNest branded offline experience.
 *
 * Shown as a full-screen overlay when the device has no internet.
 * Features:
 *  - Dark navy/purple gradient background matching AmyNest theme
 *  - Amy AI character (bird logo) with floating + glow-pulse animation
 *  - Neon gradient ring that slowly spins around the icon
 *  - Premium gradient "Reconnect" button with press spring
 *  - Ambient glow bloom behind the icon
 *  - Auto-reconnect via NetInfo listener in useNetworkStore (overlay
 *    disappears the moment connectivity is restored — no user action needed)
 *
 * All hex values use brand tokens or carry audit-ok exemptions.
 */
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGrad,
  Stop,
} from "react-native-svg";
import { useTranslation } from "react-i18next";
import { brand } from "@/constants/colors";

const RING_SIZE   = 128;
const RING_STROKE = 3;
const RING_R      = (RING_SIZE - RING_STROKE) / 2;

interface Props {
  onRetry?: () => void;
}

export function OfflineScreen({ onRetry }: Props) {
  const fadeIn   = useRef(new Animated.Value(0)).current;
  const floatY   = useRef(new Animated.Value(0)).current;
  const glow     = useRef(new Animated.Value(0)).current;
  const ringRot  = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1, duration: 700, useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -9, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue:  9, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(ringRot, { toValue: 1, duration: 5500, easing: Easing.linear, useNativeDriver: true }),
    ).start();
  }, []);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] });
  const ringRotate  = ringRot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const handlePressIn  = () => Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(btnScale, { toValue: 1.00, useNativeDriver: true }).start();

  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={["#0C0A1E", "#0F0C29", "#1A0840"]} // audit-ok: dark navy offline gradient — no brand token equivalent
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    >
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.content, { opacity: fadeIn }]}>

          {/* ── Ambient glow bloom ── */}
          <Animated.View
            style={[styles.ambientGlow, { opacity: glowOpacity }]}
            pointerEvents="none"
          />

          {/* ── Amy icon + spinning ring ── */}
          <Animated.View style={[styles.iconWrap, { transform: [{ translateY: floatY }] }]}>
            <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: ringRotate }] }]}>
              <Svg
                width={RING_SIZE + 20}
                height={RING_SIZE + 20}
                style={{ position: "absolute", top: -10, left: -10 }}
              >
                <Defs>
                  <SvgGrad id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%"   stopColor={brand.purple500} />
                    <Stop offset="50%"  stopColor={brand.pink500} />
                    <Stop offset="100%" stopColor={brand.purple500} stopOpacity={0} />
                  </SvgGrad>
                </Defs>
                <Circle
                  cx={(RING_SIZE + 20) / 2}
                  cy={(RING_SIZE + 20) / 2}
                  r={(RING_SIZE + 20) / 2 - RING_STROKE}
                  stroke="url(#ringGrad)"
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                />
              </Svg>
            </Animated.View>

            <View style={styles.iconCircle}>
              <Image
                source={require("@/assets/images/amynest-logo-face.png")}
                style={styles.amyImg}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* ── Copy ── */}
          <Text style={styles.headline}>{t("screens.offline.title")}</Text>
          <Text style={styles.body}>{t("screens.offline.body")}</Text>

          {/* ── Reconnect button ── */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={onRetry}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              accessibilityRole="button"
              accessibilityLabel={t("screens.offline.accessibility_reconnect")}
            >
              <LinearGradient
                colors={[brand.primary, brand.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                <Text style={styles.btnText}>{t("screens.offline.reconnect")}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* ── Footer ── */}
          <Text style={styles.footer}>{t("screens.offline.footer")}</Text>

        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  ambientGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    // audit-ok: brand purple glow for Amy icon ambient light
    backgroundColor: "#7B3FF2",
  },
  iconWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  iconCircle: {
    width: RING_SIZE - 20,
    height: RING_SIZE - 20,
    borderRadius: (RING_SIZE - 20) / 2,
    alignItems: "center",
    justifyContent: "center",
    // audit-ok: deep purple background for Amy icon circle
    backgroundColor: "#1A0D40",
    overflow: "hidden",
  },
  amyImg: {
    width: RING_SIZE - 36,
    height: RING_SIZE - 36,
  },
  headline: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    // audit-ok: off-white on dark for offline headline
    color: "#F0ECFF",
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    // audit-ok: muted lavender for offline body text
    color: "#9A8FCB",
    lineHeight: 22,
    marginBottom: 36,
  },
  btn: {
    paddingHorizontal: 44,
    paddingVertical: 15,
    borderRadius: 32,
    alignItems: "center",
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 20,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    // audit-ok: dimmed lavender for offline footer
    color: "#5E5490",
  },
});
