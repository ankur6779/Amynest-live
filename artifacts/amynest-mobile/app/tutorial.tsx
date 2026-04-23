import React, { useRef, useState } from "react";
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
import { brand } from "@/constants/colors";
import { markTutorialSeen } from "@/utils/tutorialState";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type Slide = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  gradient: [string, string];
};

const SLIDES: Slide[] = [
  {
    icon: "sparkles",
    title: "Meet Amy",
    body: "Your AI co-parent for stress-free mornings, smoother evenings, and routines that actually stick.",
    gradient: [brand.purple500, "#EC4899"],
  },
  {
    icon: "calendar-outline",
    title: "Routines that adapt",
    body: "Tell Amy about your child once. She builds the right schedule each day — and shifts it when life happens.",
    gradient: ["#6366F1", "#8B5CF6"],
  },
  {
    icon: "notifications-outline",
    title: "Gentle reminders",
    body: "Optional nudges keep your family on track without feeling pushy. You stay in control.",
    gradient: ["#F59E0B", "#EF4444"],
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

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

      <TouchableOpacity
        onPress={finish}
        style={[styles.skip, { top: insets.top + 12 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.skipText}>Skip</Text>
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
            colors={[brand.purple500, "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaInner}
          >
            <Text style={styles.ctaText}>{isLast ? "Get Started" : "Next"}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0420" },
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
        shadowColor: "#EC4899",
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
    color: "#fff",
    textAlign: "center",
    marginBottom: 14,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
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
    fontWeight: "800",
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
  },
});
