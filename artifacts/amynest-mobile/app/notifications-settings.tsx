import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { brand } from "@/constants/colors";

type Prefs = {
  routineEnabled: boolean;
  nutritionEnabled: boolean;
  insightsEnabled: boolean;
  weeklyEnabled: boolean;
  engagementEnabled: boolean;
  goodNightEnabled: boolean;
  timezone: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  dailyCap: number;
};

type Category = {
  key: keyof Prefs;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  testCategory:
    | "routine"
    | "nutrition"
    | "insights"
    | "weekly"
    | "engagement"
    | "good_night";
};

const CATEGORIES: Category[] = [
  {
    key: "routineEnabled",
    title: "Routine reminders",
    description: "Morning, evening and bedtime nudges to stay on track.",
    icon: "calendar-outline",
    testCategory: "routine",
  },
  {
    key: "nutritionEnabled",
    title: "Nutrition suggestions",
    description: "Snack ideas, dinner inspiration and meal tips.",
    icon: "nutrition-outline",
    testCategory: "nutrition",
  },
  {
    key: "insightsEnabled",
    title: "Amy AI insights",
    description: "Daily parenting tips tailored to your child's age.",
    icon: "bulb-outline",
    testCategory: "insights",
  },
  {
    key: "weeklyEnabled",
    title: "Weekly report",
    description: "Sunday recap of your child's week.",
    icon: "stats-chart-outline",
    testCategory: "weekly",
  },
  {
    key: "engagementEnabled",
    title: "Friendly nudges",
    description: "Re-engagement messages and streak rewards.",
    icon: "heart-outline",
    testCategory: "engagement",
  },
  {
    key: "goodNightEnabled",
    title: "Good night message",
    description: "Wind-down reminder at bedtime.",
    icon: "moon-outline",
    testCategory: "good_night",
  },
];

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const c = useColors();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  const { data, isLoading } = useQuery<Prefs>({
    queryKey: ["notification-prefs"],
    queryFn: async () => {
      const r = await authFetch("/api/notifications/categories");
      if (!r.ok) throw new Error("Failed to load notification preferences");
      return r.json();
    },
  });

  const [local, setLocal] = useState<Prefs | null>(null);
  useEffect(() => {
    if (data && !local) setLocal(data);
  }, [data, local]);

  const patch = useMutation({
    mutationFn: async (next: Partial<Prefs>) => {
      const r = await authFetch("/api/notifications/categories", {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      if (!r.ok) throw new Error("Failed to save");
      return r.json();
    },
    onSuccess: (saved: Prefs) => {
      setLocal(saved);
      qc.setQueryData(["notification-prefs"], saved);
    },
    onError: (err: Error) => {
      Alert.alert("Could not save", err.message);
    },
  });

  const test = useMutation({
    mutationFn: async (category: Category["testCategory"]) => {
      const r = await authFetch("/api/notifications/test", {
        method: "POST",
        body: JSON.stringify({ category }),
      });
      const j = (await r.json()) as { status?: string; reason?: string };
      return j;
    },
    onSuccess: (result) => {
      const status = result.status ?? "unknown";
      if (status === "sent") {
        Alert.alert("Sent", "Check your notification tray in a moment.");
      } else if (status === "no_tokens") {
        Alert.alert("No device registered", "Open the app on a real device with notifications enabled.");
      } else {
        Alert.alert("Not sent", `Status: ${status}${result.reason ? ` (${result.reason})` : ""}`);
      }
    },
    onError: (err: Error) => Alert.alert("Test failed", err.message),
  });

  if (isLoading || !local) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  const toggle = (key: keyof Prefs, value: boolean) => {
    const next = { ...local, [key]: value } as Prefs;
    setLocal(next);
    patch.mutate({ [key]: value } as Partial<Prefs>);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <Text style={styles.subtitle}>
        Choose which notifications you want from AmyNest. Maximum {local.dailyCap} per
        day, never during quiet hours.
      </Text>

      {CATEGORIES.map((cat) => {
        const enabled = Boolean(local[cat.key]);
        return (
          <View key={cat.key} style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name={cat.icon} size={22} color={brand.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{cat.title}</Text>
              <Text style={styles.rowDesc}>{cat.description}</Text>
              {enabled ? (
                <Pressable
                  onPress={() => test.mutate(cat.testCategory)}
                  disabled={test.isPending}
                  style={styles.testBtn}
                >
                  <Text style={styles.testBtnText}>
                    {test.isPending ? "Sending…" : "Send test"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => toggle(cat.key, v)}
              trackColor={{ true: brand.primary, false: "#444" }}
              thumbColor="#fff"
            />
          </View>
        );
      })}

      <View style={styles.quiet}>
        <Text style={styles.quietTitle}>Quiet hours</Text>
        <Text style={styles.quietValue}>
          {local.quietHoursStart} → {local.quietHoursEnd} ({local.timezone})
        </Text>
        <Text style={styles.quietHelp}>
          We never send notifications during this window.
        </Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { paddingHorizontal: 16 },
    center: { justifyContent: "center", alignItems: "center" },
    header: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
    back: { padding: 6, marginRight: 4 },
    title: { color: c.text, fontSize: 22, fontWeight: "700" },
    subtitle: { color: c.textMuted, fontSize: 14, marginBottom: 18, lineHeight: 20 },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: c.cardBackground,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      gap: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.background,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: { flex: 1 },
    rowTitle: { color: c.text, fontSize: 16, fontWeight: "600", marginBottom: 4 },
    rowDesc: { color: c.textMuted, fontSize: 13, lineHeight: 18 },
    testBtn: {
      alignSelf: "flex-start",
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: brand.primary + "22",
    },
    testBtnText: { color: brand.primary, fontSize: 12, fontWeight: "600" },
    quiet: {
      marginTop: 18,
      backgroundColor: c.cardBackground,
      borderRadius: 14,
      padding: 16,
    },
    quietTitle: { color: c.text, fontSize: 15, fontWeight: "600", marginBottom: 6 },
    quietValue: { color: brand.primary, fontSize: 16, fontWeight: "700", marginBottom: 6 },
    quietHelp: { color: c.textMuted, fontSize: 12 },
  });
}
