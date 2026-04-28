import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { brand } from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

const PRIVACY_MD = `# Privacy Policy — AmyNest AI

_Last updated: April 21, 2026_

AmyNest ("the App") is operated by **AmyNest AI, Inc.** ("we", "us"). This policy explains what information we collect when you use the App and how we handle it.

## 1. Information we collect
- **Account information** you provide when you sign up: name, email address, and authentication identifiers from your sign-in provider.
- **Child profile information** you voluntarily enter (first name or nickname, age, interests, routine preferences). We never ask for a child's last name, address, or contact details.
- **Routine and task activity** you create or generate inside the App, used to display your dashboard and reward history.
- **Technical data** such as device type, OS version, app version, and crash diagnostics, used to keep the App stable.

## 2. How we use information
- To provide the core features of the App (generating routines, tracking tasks and rewards, syncing across your devices).
- To respond to support requests you send us.
- To improve the App's reliability and performance.

We do **not** sell your personal information. We do **not** show third-party advertising to children inside the App.

## 3. Children's privacy
AmyNest is designed to be used by parents and guardians. Child profiles inside the App are managed by a parent account. We collect only the minimum information needed to display a child's routine. Parents may delete a child profile at any time from the App.

## 4. Data sharing
We share data with service providers who help us operate the App (hosting, authentication, analytics, AI generation). These providers are bound by contracts to use your data only on our behalf. We may also disclose information if required by law.

## 5. Data retention and deletion
You can delete your account and all associated data at any time from inside the App, or by emailing **support@amynest.ai**. Backups are removed within 30 days.

## 6. Permissions used by the mobile app
- **Internet / Network state** — required to load the App.
- **Camera, Microphone, Photos** — only requested at the moment you use a feature that needs them (e.g. uploading a child's profile picture). Always optional.

## 7. Contact
Questions or requests: **support@amynest.ai**
`;

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
  const blocks = React.useMemo(() => parseMarkdown(PRIVACY_MD), []);

  return (
    <LinearGradient colors={theme.gradient} style={{ flex: 1 }}>
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </Pressable>
        <LinearGradient colors={[brand.purple500, "#06B6D4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerIcon}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.text }]}>Privacy Policy</Text>
          <Text style={[styles.headerSubtitle, { color: c.textMuted }]}>How we handle your data</Text>
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
          <Text style={[styles.contactBtnText, { color: c.text }]}>Email support@amynest.ai</Text>
        </Pressable>

        <Text style={[styles.footer, { color: c.textDim }]}>© 2026 AmyNest AI. All rights reserved.</Text>
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
