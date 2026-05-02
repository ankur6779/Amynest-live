import React from "react";
import {  View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { brand, palette } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "react-i18next";

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

function parseMarkdown(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") { i++; continue; }
    if (line.startsWith("# ")) { out.push({ kind: "h1", text: line.slice(2).trim() }); i++; continue; }
    if (line.startsWith("## ")) { out.push({ kind: "h2", text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith("### ")) { out.push({ kind: "h3", text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      out.push({ kind: "ul", items });
      continue;
    }
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("- ")) {
      buf.push(lines[i]);
      i++;
    }
    out.push({ kind: "p", text: buf.join(" ") });
  }
  return out;
}

function renderInline(text: string, color: string, accent: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|_([^_]+)_/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      parts.push(<Text key={idx++} style={{ fontWeight: "800", color }}>{m[1]}</Text>);
    } else if (m[2] !== undefined) {
      parts.push(<Text key={idx++} style={{ fontStyle: "italic", color }}>{m[2]}</Text>);
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function PrivacyScreen() {
  const c = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const blocks = React.useMemo(() => {
    const md = `# ${t("screens.privacy.md_title")}

_${t("screens.privacy.md_updated")}_

${t("screens.privacy.md_intro")}

## ${t("screens.privacy.md_h2_1")}
- ${t("screens.privacy.md_li_1_1")}
- ${t("screens.privacy.md_li_1_2")}
- ${t("screens.privacy.md_li_1_3")}
- ${t("screens.privacy.md_li_1_4")}

## ${t("screens.privacy.md_h2_2")}
- ${t("screens.privacy.md_li_2_1")}
- ${t("screens.privacy.md_li_2_2")}
- ${t("screens.privacy.md_li_2_3")}

${t("screens.privacy.md_p_2")}

## ${t("screens.privacy.md_h2_3")}
${t("screens.privacy.md_p_3")}

## ${t("screens.privacy.md_h2_4")}
${t("screens.privacy.md_p_4")}

## ${t("screens.privacy.md_h2_5")}
${t("screens.privacy.md_p_5")}

## ${t("screens.privacy.md_h2_6")}
- ${t("screens.privacy.md_li_6_1")}
- ${t("screens.privacy.md_li_6_2")}

## ${t("screens.privacy.md_h2_7")}
${t("screens.privacy.md_p_7")}
`;
    return parseMarkdown(md);
  }, [t]);

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <LinearGradient colors={[brand.purple500, palette.cyan500]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerIcon}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>{t("screens.privacy.header_title")}</Text>
          <Text style={[styles.headerSubtitle, { color: c.textMuted }]}>{t("screens.privacy.header_subtitle")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 6 }}>
        {blocks.map((b, i) => {
          if (b.kind === "h1") {
            return <Text key={i} style={[styles.h1, { color: c.text }]}>{b.text}</Text>;
          }
          if (b.kind === "h2") {
            return <Text key={i} style={[styles.h2, { color: c.text }]}>{b.text}</Text>;
          }
          if (b.kind === "h3") {
            return <Text key={i} style={[styles.h3, { color: c.text }]}>{b.text}</Text>;
          }
          if (b.kind === "ul") {
            return (
              <View key={i} style={{ marginTop: 4, marginBottom: 8, gap: 6 }}>
                {b.items.map((it, j) => (
                  <View key={j} style={styles.liRow}>
                    <Text style={[styles.bullet, { color: c.textMuted }]}>•</Text>
                    <Text style={[styles.li, { color: c.textMuted }]}>{renderInline(it, c.text, c.text)}</Text>
                  </View>
                ))}
              </View>
            );
          }
          return (
            <Text key={i} style={[styles.p, { color: c.textMuted }]}>
              {renderInline(b.text, c.text, c.text)}
            </Text>
          );
        })}

        <Pressable
          onPress={() => Linking.openURL("mailto:support@amynest.ai")}
          style={({ pressed }) => [styles.contactBtn, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="mail-outline" size={16} color={c.text} />
          <Text style={[styles.contactBtnText, { color: c.text }]}>{t("screens.privacy.contact_btn")}</Text>
        </Pressable>

        <Text style={[styles.footer, { color: c.textDim }]}>{t("screens.privacy.footer")}</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontWeight: "800", fontSize: 16 },
  headerSubtitle: { fontSize: 11 },
  h1: { fontSize: 24, fontWeight: "800", marginTop: 4, marginBottom: 8 },
  h2: { fontSize: 17, fontWeight: "700", marginTop: 18, marginBottom: 6 },
  h3: { fontSize: 15, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  p: { fontSize: 14, lineHeight: 22, marginVertical: 4 },
  liRow: { flexDirection: "row", gap: 8, paddingLeft: 4 },
  bullet: { fontSize: 14, lineHeight: 22 },
  li: { flex: 1, fontSize: 14, lineHeight: 22 },
  contactBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1,
    marginTop: 24,
  },
  contactBtnText: { fontSize: 14, fontWeight: "700" },
  footer: { fontSize: 11, textAlign: "center", marginTop: 24 },
});
