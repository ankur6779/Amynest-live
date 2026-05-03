import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { brand, brandExtended } from "@/constants/colors";

type DiagToken = {
  id: number;
  platform: string;
  deviceName: string | null;
  tokenPrefix: string;
  createdAt: string;
  lastSeenAt: string;
};

type DiagHistoryRow = {
  id: number;
  category: string;
  title: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
};

type Diagnostics = {
  userId: string;
  timezone: string;
  localTime: string;
  inQuietHours: boolean;
  dailyCap: number;
  nextScheduled: {
    category: string;
    localTime: string;
    minutesFromNow: number;
    activity?: string;
  } | null;
  tokens: DiagToken[];
  recent: DiagHistoryRow[];
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function formatMinutesUntil(min: number): string {
  if (min < 1) return "in less than a minute";
  if (min < 60) return `in ${min} minute${min === 1 ? "" : "s"}`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `in ${h} hour${h === 1 ? "" : "s"}`;
  return `in ${h}h ${m}m`;
}

function categoryLabel(cat: string): string {
  switch (cat) {
    case "routine": return "Routine reminders";
    case "routine_item": return "Per-task reminder";
    case "nutrition": return "Nutrition";
    case "insights": return "Amy AI insights";
    case "weekly": return "Weekly report";
    case "engagement": return "Friendly nudge";
    case "good_night": return "Good night";
    default: return cat;
  }
}

export default function NotificationDiagnosticsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authFetch = useAuthFetch();
  const c = useColors();
  const { theme } = useTheme();
  const styles = React.useMemo(() => makeStyles(c), [c]);

  const { data, isLoading, isError, refetch, isFetching } = useQuery<Diagnostics>({
    queryKey: ["notification-diagnostics"],
    queryFn: async () => {
      const r = await authFetch("/api/notifications/diagnostics");
      if (!r.ok) throw new Error("Failed to load diagnostics");
      return r.json();
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={theme.gradient}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradient}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching}
            onRefresh={() => refetch()}
            tintColor={brand.primary}
          />
        }
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </Pressable>
          <Text style={styles.title}>{t("screens.notif_settings.diagnostics_title")}</Text>
        </View>

        <Text style={styles.subtitle}>
          {t("screens.notif_settings.diagnostics_subtitle")}
        </Text>

        {isError || !data ? (
          <View style={styles.card}>
            <Text style={styles.bodyText}>
              {t("screens.notif_settings.diagnostics_load_error")}
            </Text>
            <Pressable onPress={() => refetch()} style={styles.retryBtn}>
              <Text style={styles.retryText}>{t("screens.notif_settings.diagnostics_try_again")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Devices */}
            <SectionTitle
              icon={data.tokens.length > 0 ? "checkmark-circle" : "alert-circle"}
              iconColor={data.tokens.length > 0 ? brand.primary : brandExtended.errorSoft}
              text="Your devices"
              styles={styles}
            />
            <View style={styles.card}>
              {data.tokens.length === 0 ? (
                <>
                  <Text style={styles.bodyText}>
                    No devices are registered for push notifications yet — that's
                    almost always why nothing arrives.
                  </Text>
                  <Text style={[styles.metaText, { marginTop: 8 }]}>
                    Open AmyNest and grant notification permission, or enable
                    browser notifications on the web.
                  </Text>
                </>
              ) : (
                data.tokens.map((tok, i) => {
                  const iconName: keyof typeof Ionicons.glyphMap =
                    tok.platform === "ios" || tok.platform === "android"
                      ? "phone-portrait-outline"
                      : "desktop-outline";
                  return (
                    <View
                      key={tok.id}
                      style={[
                        styles.deviceRow,
                        i > 0 && { borderTopWidth: 1, borderTopColor: c.border },
                      ]}
                    >
                      <Ionicons name={iconName} size={20} color={brand.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.deviceTitle}>
                          {tok.deviceName ?? tok.platform}
                          <Text style={styles.devicePlatform}>
                            {"  "}{tok.platform.toUpperCase()}
                          </Text>
                        </Text>
                        <Text style={styles.metaText}>
                          Last active {formatRelative(tok.lastSeenAt)} · added{" "}
                          {formatRelative(tok.createdAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Quiet hours / time */}
            <SectionTitle
              icon={data.inQuietHours ? "moon" : "time-outline"}
              iconColor={data.inQuietHours ? brandExtended.errorSoft : brand.primary}
              text="Quiet hours & timing"
              styles={styles}
            />
            <View style={styles.card}>
              <Text style={styles.bodyText}>
                Your local time:{" "}
                <Text style={styles.strong}>{data.localTime}</Text>{" "}
                <Text style={styles.metaText}>({data.timezone})</Text>
              </Text>
              <Text
                style={[
                  styles.bodyText,
                  { marginTop: 8, color: data.inQuietHours ? brandExtended.errorSoft : c.textMuted },
                ]}
              >
                {data.inQuietHours
                  ? "You're currently inside quiet hours, so AmyNest won't send any push notifications until quiet hours end."
                  : "You're outside quiet hours — notifications can be delivered now."}
              </Text>
              <Text style={[styles.metaText, { marginTop: 8 }]}>
                Daily cap: up to {data.dailyCap} notifications per day.
              </Text>
            </View>

            {/* Next scheduled */}
            <SectionTitle
              icon="calendar-outline"
              iconColor={brand.primary}
              text="Next scheduled notification"
              styles={styles}
            />
            <View style={styles.card}>
              {data.nextScheduled ? (
                <>
                  <Text style={styles.strong}>
                    {categoryLabel(data.nextScheduled.category)}
                    {data.nextScheduled.activity ? (
                      <Text style={styles.bodyText}>
                        {" "}— {data.nextScheduled.activity}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={[styles.metaText, { marginTop: 4 }]}>
                    At {data.nextScheduled.localTime} ·{" "}
                    {formatMinutesUntil(data.nextScheduled.minutesFromNow)}.
                  </Text>
                </>
              ) : (
                <Text style={styles.bodyText}>
                  Nothing more is scheduled for today. New notifications will be
                  queued tomorrow morning.
                </Text>
              )}
            </View>

            {/* Recent failures */}
            {(() => {
              const failures = data.recent.filter((r) => r.status !== "sent");
              return (
                <>
                  <SectionTitle
                    icon={failures.length === 0 ? "checkmark-circle" : "alert-circle"}
                    iconColor={failures.length === 0 ? brand.primary : brandExtended.errorSoft}
                    text="Recent issues"
                    styles={styles}
                  />
                  <View style={styles.card}>
                    {data.recent.length === 0 ? (
                      <Text style={styles.bodyText}>
                        {t("screens.notif_settings.diagnostics_recent_empty_prefix")}
                        <Text style={styles.strong}>{t("screens.notif_settings.send_test")}</Text>
                        {t("screens.notif_settings.diagnostics_recent_empty_suffix")}
                      </Text>
                    ) : failures.length === 0 ? (
                      <Text style={styles.bodyText}>
                        Your last {data.recent.length} notification
                        {data.recent.length === 1 ? "" : "s"} all delivered
                        successfully.
                      </Text>
                    ) : (
                      failures.map((row, i) => (
                        <View
                          key={row.id}
                          style={[
                            styles.failureRow,
                            i > 0 && { borderTopWidth: 1, borderTopColor: c.border },
                          ]}
                        >
                          <Ionicons
                            name="alert-circle"
                            size={18}
                            color={brandExtended.errorSoft}
                            style={{ marginTop: 2 }}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.deviceTitle} numberOfLines={1}>
                              {row.title || categoryLabel(row.category)}
                            </Text>
                            <Text style={styles.metaText} numberOfLines={2}>
                              {categoryLabel(row.category)} · {row.status}
                              {row.errorMessage ? ` · ${row.errorMessage}` : ""}
                            </Text>
                          </View>
                          <Text style={styles.metaText}>{formatRelative(row.sentAt)}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </>
              );
            })()}

            <Text style={styles.footnote}>
              Still missing notifications? Check your phone's system settings to
              make sure AmyNest is allowed to show notifications and isn't
              muted by Focus / Do Not Disturb.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionTitle({
  icon,
  iconColor,
  text,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  text: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <Text style={styles.sectionTitleText}>{text}</Text>
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
    title: { color: c.text, fontSize: 20, fontWeight: "700", flex: 1 },
    subtitle: { color: c.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 19 },
    sectionTitle: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      marginBottom: 8,
    },
    sectionTitleText: { color: c.text, fontSize: 15, fontWeight: "600" },
    card: {
      backgroundColor: c.cardBackground,
      borderRadius: 14,
      padding: 14,
    },
    bodyText: { color: c.text, fontSize: 14, lineHeight: 20 },
    metaText: { color: c.textMuted, fontSize: 12, lineHeight: 17 },
    strong: { color: c.text, fontSize: 14, fontWeight: "700" },
    deviceRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 10,
    },
    deviceTitle: { color: c.text, fontSize: 14, fontWeight: "600" },
    devicePlatform: { color: c.textMuted, fontSize: 11, fontWeight: "500" },
    failureRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 10,
    },
    retryBtn: {
      alignSelf: "flex-start",
      marginTop: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: brand.primary + "22",
    },
    retryText: { color: brand.primary, fontWeight: "600", fontSize: 13 },
    footnote: { color: c.textMuted, fontSize: 11, marginTop: 24, lineHeight: 16 },
  });
}
