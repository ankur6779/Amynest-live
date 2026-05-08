import React, {  useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Image,
} from "react-native";

const LOGO_IMG = require("../assets/images/amynest-logo.png");
import { useRouter, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { brand, palette } from "@/constants/colors";
import { markTutorialSeen } from "@/utils/tutorialState";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  gradient: [string, string];
};

export default function TutorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  // Tutorial permanently disabled — auto-skip to welcome on mount.
  // tutorialState.ts already prevents routing here; this is a belt-and-suspenders
  // guard in case someone navigates to /tutorial directly (deep link, etc.).
  useEffect(() => {
    markTutorialSeen().catch(() => {});
    router.replace("/welcome");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const SLIDES: Slide[] = [
    {
      icon: "sparkles",
      title: t("screens.tutorial.slide1_title"),
      body: t("screens.tutorial.slide1_body"),
      gradient: [brand.purple500, brand.pink500],
    },
    {
      icon: "calendar-outline",
      title: t("screens.tutorial.slide2_title"),
      body: t("screens.tutorial.slide2_body"),
      gradient: [palette.indigo500, brand.violet500],
    },
    {
      icon: "notifications-outline",
      title: t("screens.tutorial.slide3_title"),
      body: t("screens.tutorial.slide3_body"),
      gradient: [palette.amber500, palette.red500],
    },
    {
      icon: "calculator-outline",
      title: t("screens.tutorial.slide4_title"),
      body: t("screens.tutorial.slide4_body"),
      gradient: [palette.amber500, palette.orange500],
    },
    {
      icon: "heart-outline",
      title: t("screens.tutorial.slide5_title"),
      body: t("screens.tutorial.slide5_body"),
      gradient: [palette.rose500, brand.pink500],
    },
    {
      icon: "document-text-outline",
      title: t("screens.tutorial.slide6_title"),
      body: t("screens.tutorial.slide6_body"),
      gradient: [palette.emerald500, palette.teal500],
    },
    {
      icon: "color-palette-outline",
      title: t("screens.tutorial.slide7_title"),
      body: t("screens.tutorial.slide7_body"),
      gradient: [palette.indigo500, brand.violet500],
    },
  ];

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Update the in-memory gate FIRST so AuthGate doesn't bounce back to /tutorial.
    await markTutorialSeen();
    router.replace("/welcome");
  };

  const next = () => {
    if (page >= SLIDES.length - 1) {
      finish();
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    const nextPage = page + 1;
    scrollRef.current?.scrollTo({ x: nextPage * SCREEN_WIDTH, animated: true });
    setPage(nextPage);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const newPage = Math.round(x / SCREEN_WIDTH);
    if (newPage !== page) setPage(newPage);
  };

  const isLast = page === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#0a061a", "#120a2e", "#050010"]} // audit-ok: intentional dark bg / custom color
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity
        onPress={finish}
        style={[styles.skip, { top: insets.top + 12 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.skipText}>{t("screens.tutorial.skip")}</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {SLIDES.map((slide, idx) => (
          <View key={idx} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {idx === 0 ? (
              <Image source={LOGO_IMG} style={styles.heroLogo} resizeMode="contain" />
            ) : (
              <LinearGradient
                colors={slide.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconWrap}
              >
                <Ionicons name={slide.icon} size={56} color="#fff" />
              </LinearGradient>
            )}
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === page && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={next} activeOpacity={0.9} style={styles.cta}>
          <LinearGradient
            colors={[brand.purple500, brand.pink500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaInner}
          >
            <Text style={styles.ctaText}>{isLast ? t("screens.tutorial.get_started") : t("screens.tutorial.next")}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  heroLogo: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
    ...Platform.select({
      ios: {
        shadowColor: brand.pink500,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    maxWidth: 320,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: brand.purple500,
  },
  cta: {
    borderRadius: 16,
    overflow: "hidden",
  },
  ctaInner: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.1,
  },
  skip: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
