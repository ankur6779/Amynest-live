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
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, brandExtended } from "@/constants/colors";

const HISTORY_OK_COLOR = brand.primary;
const HISTORY_WARN_COLOR = brandExtended.errorSoft;

type Prefs = {
  routineEnabled: boolean;
  routineItemEnabled: boolean;
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
    | "routine_item"
    | "nutrition"
    | "insights"
    | "weekly"
    | "engagement"
    | "good_night";
};

type HistoryRow = {
  id: number;
  category: string;
  title: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
};

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const c = useColors();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  const CATEGORIES: Category[] = [
    { key: "routineEnabled", title: t("screens.notif_settings.cat_routine_title"), description: t("screens.notif_settings.cat_routine_desc"), icon: "calendar-outline", testCategory: "routine" },
    { key: "routineItemEnabled", title: "Per-task reminders", description: "A heads-up about 5 minutes before each routine item.", icon: "time-outline", testCategory: "routine_item" },
    { key: "nutritionEnabled", title: t("screens.notif_settings.cat_nutrition_title"), description: t("screens.notif_settings.cat_nutrition_desc"), icon: "nutrition-outline", testCategory: "nutrition" },
    { key: "insightsEnabled", title: t("screens.notif_settings.cat_insights_title"), description: t("screens.notif_settings.cat_insights_desc"), icon: "bulb-outline", testCategory: "insights" },
    { key: "weeklyEnabled", title: t("screens.notif_settings.cat_weekly_title"), description: t("screens.notif_settings.cat_weekly_desc"), icon: "stats-chart-outline", testCategory: "weekly" },
    { key: "engagementEnabled", title: t("screens.notif_settings.cat_engagement_title"), description: t("screens.notif_settings.cat_engagement_desc"), icon: "heart-outline", testCategory: "engagement" },
    { key: "goodNightEnabled", title: t("screens.notif_settings.cat_goodnight_title"), description: t("screens.notif_settings.cat_goodnight_desc"), icon: "moon-outline", testCategory: "good_night" },
  ];

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
      Alert.alert(t("alerts.notifications.save_failed_title"), err.message);
    },
  });

  const history = useQuery<{ items: HistoryRow[] }>({
    queryKey: ["notification-history"],
    queryFn: async () => {
      const r = await authFetch("/api/notifications/history?limit=20");
      if (!r.ok) throw new Error("Failed to load history");
      return r.json();
    },
  });

  const openSystemSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

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
        Alert.alert(t("alerts.notifications.sent_title"), t("alerts.notifications.sent_msg"));
      } else if (status === "no_tokens") {
        Alert.alert(t("alerts.notifications.no_device_title"), t("alerts.notifications.no_device_msg"));
      } else {
        Alert.alert(
          t("alerts.notifications.not_sent_title"),
          t("alerts.notifications.not_sent_status", {
            status,
            reason: result.reason ? ` (${result.reason})` : "",
          })
        );
      }
    },
    onError: (err: Error) => Alert.alert(t("alerts.notifications.test_failed_title"), err.message),
  });

  if (isLoading || !local) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
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
    <View style={styles.container}>
      <LinearGradient colors={theme.gradient} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <Text style={styles.title}>{t("screens.notif_settings.title")}</Text>
      </View>

      <Text style={styles.subtitle}>
        {t("screens.notif_settings.subtitle", { cap: local.dailyCap })}
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
                    {test.isPending ? t("screens.notif_settings.sending") : t("screens.notif_settings.send_test")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <Switch
              value={enabled}
              onValueChange={(v) => toggle(cat.key, v)}
              trackColor={{ true: brand.primary, false: "#444" /* audit-ok: switch off-state track */ }}
              thumbColor="#fff"
            />
          </View>
        );
      })}

      <View style={styles.quiet}>
        <Text style={styles.quietTitle}>{t("screens.notif_settings.quiet_hours")}</Text>
        <Text style={styles.quietValue}>
          {local.quietHoursStart} → {local.quietHoursEnd} ({local.timezone})
        </Text>
        <Text style={styles.quietHelp}>
          {t("screens.notif_settings.quiet_help")}
        </Text>
      </View>

      <Pressable onPress={openSystemSettings} style={styles.systemBtn}>
        <Ionicons name="settings-outline" size={18} color={brand.primary} />
        <Text style={styles.systemBtnText}>Open system notification settings</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Recent deliveries</Text>
      <View style={styles.historyCard}>
        {history.isLoading ? (
          <Text style={styles.historyEmpty}>Loading…</Text>
        ) : !history.data || history.data.items.length === 0 ? (
          <Text style={styles.historyEmpty}>
            Nothing has been delivered yet. Send a test from any category above to confirm your device is receiving notifications.
          </Text>
        ) : (
          history.data.items.slice(0, 10).map((row) => {
            const ok = row.status === "sent";
            return (
              <View key={row.id} style={styles.historyRow}>
                <Ionicons
                  name={ok ? "checkmark-circle" : "alert-circle"}
                  size={18}
                  color={ok ? HISTORY_OK_COLOR : HISTORY_WARN_COLOR}
                  style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{row.title}</Text>
                  <Text style={styles.historyMeta} numberOfLines={1}>
                    {row.category} · {row.status}
                    {row.errorMessage ? ` · ${row.errorMessage}` : ""}
                  </Text>
                </View>
                <Text style={styles.historyTime}>
                  {new Date(row.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            );
          })
        )}
      </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
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
    systemBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      marginTop: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: brand.primary + "1A",
    },
    systemBtnText: { color: brand.primary, fontSize: 14, fontWeight: "600" },
    sectionLabel: {
      color: c.textMuted,
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginTop: 24,
      marginBottom: 10,
    },
    historyCard: {
      backgroundColor: c.cardBackground,
      borderRadius: 14,
      paddingVertical: 4,
    },
    historyEmpty: { color: c.textMuted, fontSize: 13, padding: 16, lineHeight: 18 },
    historyRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    historyTitle: { color: c.text, fontSize: 14 },
    historyMeta: { color: c.textMuted, fontSize: 12, marginTop: 2 },
    historyTime: { color: c.textMuted, fontSize: 11, marginLeft: 4 },
  });
}
