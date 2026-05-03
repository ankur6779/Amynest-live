import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppStore } from "@/store/useAppStore";
import { useNetworkStore, selectIsOnline } from "@/store/useNetworkStore";
import { brand } from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "react-i18next";

function formatRelative(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Updated just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${Math.floor(hrs / 24)}d ago`;
}

export default function AppDataStatusBanner() {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const lastUpdated = useAppStore((s) => s.lastUpdated);
  const fromCache = useAppStore((s) => s.fromCache);
  const hasData = useAppStore((s) => !!s.data);
  const refresh = useAppStore((s) => s.refresh);
  const queueLength = useAppStore((s) => s.queueLength);
  const syncing = useAppStore((s) => s.syncing);
  const isOnline = useNetworkStore(selectIsOnline);
  const c = useColors();

  if (!isOnline) {
    const { t } = useTranslation();
    return (
      <View style={[styles.banner, { backgroundColor: c.statusWarningBg, borderColor: c.statusWarningBorder }]}>
        <Ionicons name="cloud-offline" size={14} color={c.statusWarningText} />
        <Text style={[styles.offlineText, { color: c.statusWarningText }]}>
          Offline Mode{queueLength > 0 ? ` · ${queueLength} pending` : ""}
        </Text>
        {hasData && lastUpdated ? (
          <Text style={[styles.offlineSub, { color: c.statusWarningText }]}>{formatRelative(lastUpdated)}</Text>
        ) : null}
      </View>
    );
  }

  if (syncing) {
    return (
      <View style={[styles.banner, { backgroundColor: c.statusInfoBg, borderColor: c.statusInfoBorder }]}>
        <ActivityIndicator size="small" color={c.statusInfoText} />
        <Text style={[styles.syncingText, { color: c.statusInfoText }]}>
          Syncing{queueLength > 0 ? ` ${queueLength}` : ""}…
        </Text>
      </View>
    );
  }

  if (!hasData && status === "error" && error) {
    return (
      <View style={[styles.banner, { backgroundColor: c.statusErrorBg, borderColor: c.statusErrorBorder }]}>
        <Ionicons name="cloud-offline-outline" size={16} color={c.statusErrorText} />
        <Text style={[styles.errorText, { color: c.statusErrorText }]} numberOfLines={2}>
          Unable to load data. Tap retry.
        </Text>
        <Pressable onPress={() => void refresh()} hitSlop={8} style={[styles.retryBtn, { backgroundColor: c.destructive }]}>
          <Text style={styles.retryText}>{t("components.app_data_status_banner.retry")}</Text>
        </Pressable>
      </View>
    );
  }

  if (status === "refreshing" && hasData) {
    return (
      <View style={[styles.banner, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
        <ActivityIndicator size="small" color={brand.violet600} />
        <Text style={[styles.mutedText, { color: c.textSubtle }]}>{t("components.app_data_status_banner.refreshing")}</Text>
      </View>
    );
  }

  if (hasData && lastUpdated) {
    return (
      <View style={[styles.banner, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
        <Ionicons
          name={fromCache ? "save-outline" : "checkmark-circle-outline"}
          size={14}
          color={c.textSubtle}
        />
        <Text style={[styles.mutedText, { color: c.textSubtle }]}>{formatRelative(lastUpdated)}</Text>
        {error ? <Text style={[styles.softErr, { color: c.statusErrorText }]}>{t("components.app_data_status_banner.offline")}</Text> : null}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  mutedText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  softErr: {
    fontSize: 11.5,
    fontWeight: "600",
    marginLeft: 4,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: "800",
  },
  offlineSub: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: "auto",
    opacity: 0.75,
  },
  syncingText: {
    fontSize: 12,
    fontWeight: "800",
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
  },
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  retryText: {
    color: "#fff",
    fontSize: 11.5,
    fontWeight: "800",
  },
});
