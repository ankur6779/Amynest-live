import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import colors, { brand, brandAlpha, gradients, ACCENT_PINK } from "@/constants/colors";


type ColorMode = "light" | "dark";

const USAGE_HINTS: Record<string, string> = {
  background: "App background",
  foreground: "Body text",
  card: "Card surface",
  cardForeground: "Card text",
  primary: "Buttons, links",
  primaryForeground: "Text on primary",
  secondary: "Secondary buttons",
  secondaryForeground: "Text on secondary",
  muted: "Subtle backgrounds",
  mutedForeground: "Placeholder text",
  accent: "Highlights, badges",
  accentForeground: "Text on accent",
  destructive: "Errors, delete actions",
  destructiveForeground: "Text on destructive",
  border: "Dividers, borders",
  input: "Input fields",
  amyGradientStart: "Amy gradient start",
  amyGradientEnd: "Amy gradient end",
  glass: "Glass morphism surface",
  glassBorder: "Glass morphism border",
  glow: "Primary glow",
  glowAccent: "Accent glow",
  surface: "Flat surface",
  surfaceElevated: "Elevated surface",
  highlight: "Info highlights",
  textMuted: "Secondary text",
  textDim: "Tertiary / disabled text",
  text: "Primary text",
  tint: "App tint / icon tint",
};

function hexToRgb(hex: string): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return "";
  const n = parseInt(m[1], 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function isLightColor(color: string): boolean {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) {
    const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
    return (r * 0.299 + g * 0.587 + b * 0.114) > 160;
  }
  const hm = color.match(/^#([0-9a-f]{6})$/i);
  if (hm) {
    const n = parseInt(hm[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (r * 0.299 + g * 0.587 + b * 0.114) > 160;
  }
  return false;
}

interface SwatchProps {
  tokenName: string;
  value: string;
  usage?: string;
}

function Swatch({ tokenName, value, usage }: SwatchProps) {
  const textColor = isLightColor(value) ? "#111111" : "#FFFFFF";
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatchBox, { backgroundColor: value }]}>
        <Text style={[styles.swatchTokenInBox, { color: textColor }]} numberOfLines={1}>
          {tokenName}
        </Text>
      </View>
      <View style={styles.swatchMeta}>
        <Text style={styles.swatchToken}>{tokenName}</Text>
        <Text style={styles.swatchValue}>{value}</Text>
        {usage ? <Text style={styles.swatchUsage}>{usage}</Text> : null}
      </View>
    </View>
  );
}

interface GradientSwatchProps {
  name: string;
  stops: readonly string[];
}

function GradientSwatch({ name, stops }: GradientSwatchProps) {
  return (
    <View style={styles.swatchRow}>
      <LinearGradient
        colors={stops as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.swatchBox}
      >
        <Text style={[styles.swatchTokenInBox, { color: "#FFFFFF" }]} numberOfLines={1}>
          {name}
        </Text>
      </LinearGradient>
      <View style={styles.swatchMeta}>
        <Text style={styles.swatchToken}>{name}</Text>
        <Text style={styles.swatchValue}>{stops.join(" → ")}</Text>
        <Text style={styles.swatchUsage}>Gradient pair</Text>
      </View>
    </View>
  );
}

export default function ThemePreviewScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<ColorMode>("dark");

  if (!__DEV__) return null;
  const palette = colors[mode];

  const semanticEntries = Object.entries(palette) as [string, string][];

  const brandEntries = Object.entries(brand) as [string, string][];
  const brandAlphaEntries = Object.entries(brandAlpha) as [string, string][];
  const gradientEntries = Object.entries(gradients) as [string, readonly string[]][];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theme Preview</Text>
        <View style={styles.modeToggleGroup}>
          {(["light", "dark"] as ColorMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Semantic Tokens — {mode} mode</Text>
          <Text style={styles.sectionDesc}>
            These tokens live in <Text style={styles.code}>constants/colors.ts</Text> under{" "}
            <Text style={styles.code}>colors.{mode}</Text>.
          </Text>
          {semanticEntries.map(([key, val]) => (
            <Swatch
              key={key}
              tokenName={key}
              value={val}
              usage={USAGE_HINTS[key]}
            />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand Palette</Text>
          <Text style={styles.sectionDesc}>
            Exported as <Text style={styles.code}>brand</Text> from{" "}
            <Text style={styles.code}>constants/colors.ts</Text>.
          </Text>
          {brandEntries.map(([key, val]) => (
            <Swatch key={key} tokenName={key} value={val} usage="Brand color scale" />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand Alpha</Text>
          <Text style={styles.sectionDesc}>
            Exported as <Text style={styles.code}>brandAlpha</Text>. Semi-transparent overlays.
          </Text>
          {brandAlphaEntries.map(([key, val]) => (
            <Swatch key={key} tokenName={key} value={val} usage="Translucent overlay" />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gradients</Text>
          <Text style={styles.sectionDesc}>
            Exported as <Text style={styles.code}>gradients</Text>. Two-stop linear gradient pairs.
          </Text>
          {gradientEntries.map(([key, stops]) => (
            <GradientSwatch key={key} name={key} stops={stops} />
          ))}
        </View>

        <View style={styles.devBadgeContainer}>
          <Text style={styles.devBadge}>DEV ONLY — not visible in production builds</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F0F1A",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#14142B",
    gap: 8,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backBtnText: {
    color: "#A78BFA",
    fontSize: 15,
    fontWeight: "600",
  },
  headerTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  modeToggleGroup: {
    flexDirection: "row",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "transparent",
  },
  modeBtnActive: {
    backgroundColor: "#7B3FF2",
  },
  modeBtnText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    fontWeight: "600",
  },
  modeBtnTextActive: {
    color: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 18,
  },
  code: {
    color: ACCENT_PINK,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  swatchBox: {
    width: 80,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    paddingHorizontal: 4,
  },
  swatchTokenInBox: {
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  swatchMeta: {
    flex: 1,
    gap: 2,
  },
  swatchToken: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  swatchValue: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  swatchUsage: {
    color: "#A78BFA",
    fontSize: 11,
  },
  devBadgeContainer: {
    marginTop: 32,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  devBadge: {
    color: "#FF5C7A",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#FF5C7A",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
