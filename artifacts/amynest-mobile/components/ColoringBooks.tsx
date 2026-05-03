import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, Pressable, ActivityIndicator, Image, StyleSheet, Linking,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

interface ColoringFile {
  id: string;
  name: string;
  thumbnailUrl: string;
  previewUrl: string;
}
interface DailyQuota { limit: number; used: number; remaining: number; }
interface Pagination {
  page: number; pageSize: number; total: number; totalPages: number;
  hasNext: boolean; hasPrev: boolean;
}
interface ListResponse {
  ok: boolean; files: ColoringFile[]; pagination: Pagination; dailyQuota: DailyQuota;
}
interface DownloadResponse {
  ok?: boolean; downloadUrl?: string; dailyQuota?: DailyQuota; error?: string;
}

export function ColoringBooks({
  childId,
  childName,
}: {
  childId: number;
  childName: string;
}) {
  const c = useColors();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const authFetch = useAuthFetch();

  const [page, setPage] = useState(0);
  const [files, setFiles] = useState<ColoringFile[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [quota, setQuota] = useState<DailyQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  const fetchPage = useCallback(async (targetPage: number, signal?: AbortSignal) => {
    setLoading(true);
    setListError(null);
    try {
      const res = await authFetch(`/api/coloring/list?childId=${childId}&page=${targetPage}`, { signal });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === "google_api_key_missing") {
          setListError("Coloring Books are temporarily unavailable. Please check back soon.");
        } else {
          setListError("Couldn't load coloring books. Please try again.");
        }
        setFiles([]); setPagination(null);
        return;
      }
      const data = (await res.json()) as ListResponse;
      setFiles(data.files);
      setPagination(data.pagination);
      setQuota(data.dailyQuota);
      if (data.pagination.page !== targetPage) setPage(data.pagination.page);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setListError("Network error — please check your connection.");
      setFiles([]); setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, childId]);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchPage(page, ctrl.signal);
    const { t } = useTranslation();
    return () => ctrl.abort();
  }, [fetchPage, page]);

  const handlePreview = useCallback(async (file: ColoringFile) => {
    try {
      await WebBrowser.openBrowserAsync(file.previewUrl, {
        toolbarColor: mode === "light" ? "#FFFFFF" : palette.slate800,
        controlsColor: mode === "light" ? palette.slate900 : "#fff",
        showTitle: true,
      });
    } catch {
      setRowError({ id: file.id, message: "Couldn't open preview." });
    }
  }, [mode]);

  const handleDownload = useCallback(async (file: ColoringFile) => {
    if (downloadingId !== null) return;
    if (quota && quota.remaining <= 0) {
      setRowError({ id: file.id, message: "Daily limit reached. Try again tomorrow." });
      return;
    }
    setDownloadingId(file.id);
    setRowError(null);
    try {
      const res = await authFetch("/api/coloring/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, fileId: file.id }),
      });
      const data = (await res.json().catch(() => ({}))) as DownloadResponse;

      if (!res.ok) {
        if (res.status === 429) {
          if (data.dailyQuota) setQuota(data.dailyQuota);
          setRowError({ id: file.id, message: "Daily limit reached. Try again tomorrow." });
        } else if (res.status === 409) {
          setRowError({ id: file.id, message: "Already downloaded — refreshing list." });
          await fetchPage(page);
        } else if (res.status === 401) {
          setRowError({ id: file.id, message: "Please sign in again to download." });
        } else {
          setRowError({ id: file.id, message: "Download failed. Please try again." });
        }
        return;
      }
      if (!data.downloadUrl) {
        setRowError({ id: file.id, message: "Server didn't return a download link." });
        return;
      }
      try {
        await Linking.openURL(data.downloadUrl);
      } catch {
        await WebBrowser.openBrowserAsync(data.downloadUrl);
      }
      if (data.dailyQuota) setQuota(data.dailyQuota);
      await fetchPage(page);
    } catch {
      setRowError({ id: file.id, message: "Network error — please check your connection." });
    } finally {
      setDownloadingId(null);
    }
  }, [authFetch, childId, downloadingId, quota, page, fetchPage]);

  if (loading && files.length === 0 && !listError) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.primary} />
        <Text style={styles.dim}>{t("components.coloring_books.loading_coloring_books")}</Text>
      </View>
    );
  }
  if (listError) {
    return (
      <View style={styles.errorBox}>
        <Ionicons name="alert-circle" size={18} color={c.statusErrorText} />
        <Text style={styles.errorText}>{listError}</Text>
        <Pressable onPress={() => fetchPage(page)} style={styles.retryBtn}>
          <Ionicons name="refresh" size={12} color={c.foreground} />
          <Text style={styles.retryText}>{t("components.coloring_books.try_again")}</Text>
        </Pressable>
      </View>
    );
  }

  const quotaExhausted = quota !== null && quota.remaining <= 0;
  const allDone = pagination !== null && pagination.total === 0;

  return (
    <View style={{ gap: 10 }}>
      {quota && (
        <View style={[styles.quotaBar, quotaExhausted ? styles.quotaBarLocked : styles.quotaBarOk]}>
          <MaterialCommunityIcons name="palette" size={14} color={quotaExhausted ? c.statusErrorText : c.statusSuccessText} />
          <Text style={[styles.quotaText, { color: quotaExhausted ? c.statusErrorText : c.statusSuccessText }]}>
            {quotaExhausted
              ? `Daily limit reached for ${childName}`
              : `${quota.remaining} of ${quota.limit} downloads left today`}
          </Text>
        </View>
      )}

      {allDone ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={36} color={palette.emerald500} />
          <Text style={styles.emptyTitle}>{t("components.coloring_books.all_caught_up")}</Text>
          <Text style={styles.emptyDesc}>{childName} has downloaded every coloring book in the library. We add new ones regularly — check back soon!</Text>
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {files.map(file => {
              const isDownloading = downloadingId === file.id;
              const showRowError = rowError?.id === file.id;
              return (
                <View key={file.id} style={styles.card}>
                  <Pressable onPress={() => handlePreview(file)} style={styles.thumbWrap}>
                    <ThumbnailWithFallback src={file.thumbnailUrl} alt={file.name} c={c} />
                  </Pressable>
                  <Text numberOfLines={2} style={styles.cardTitle}>{file.name}</Text>
                  <View style={styles.cardActions}>
                    <Pressable onPress={() => handlePreview(file)} style={[styles.btnSecondary, { flex: 1 }]}>
                      <Ionicons name="eye" size={11} color={c.foreground} />
                      <Text style={styles.btnSecondaryText}>{t("components.coloring_books.preview")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDownload(file)}
                      disabled={isDownloading || quotaExhausted}
                      style={[styles.btnPrimary, { flex: 1 }, (isDownloading || quotaExhausted) && { opacity: 0.6 }]}
                    >
                      {isDownloading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Ionicons name="download" size={11} color="#fff" />
                      )}
                      <Text style={styles.btnPrimaryText}>{isDownloading ? "Saving" : "Download"}</Text>
                    </Pressable>
                  </View>
                  {showRowError && (
                    <Text style={styles.rowErr}>⚠ {rowError!.message}</Text>
                  )}
                </View>
              );
            })}
          </View>

          {pagination && pagination.totalPages > 1 && (
            <View style={styles.pager}>
              <Pressable
                onPress={() => pagination.hasPrev && setPage(p => Math.max(0, p - 1))}
                disabled={!pagination.hasPrev || loading}
                style={[styles.pagerBtn, (!pagination.hasPrev || loading) && { opacity: 0.4 }]}
              >
                <Ionicons name="chevron-back" size={14} color={c.foreground} />
                <Text style={styles.pagerBtnText}>{t("components.coloring_books.prev")}</Text>
              </Pressable>
              <Text style={styles.pagerInfo}>
                Page {pagination.page + 1} of {pagination.totalPages} · {pagination.total} left
              </Text>
              <Pressable
                onPress={() => pagination.hasNext && setPage(p => p + 1)}
                disabled={!pagination.hasNext || loading}
                style={[styles.pagerBtn, (!pagination.hasNext || loading) && { opacity: 0.4 }]}
              >
                <Text style={styles.pagerBtnText}>{t("components.coloring_books.next")}</Text>
                <Ionicons name="chevron-forward" size={14} color={c.foreground} />
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function ThumbnailWithFallback({ src, alt, c }: { src: string; alt: string; c: ReturnType<typeof useColors> }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center", padding: 12 }}>
        <MaterialCommunityIcons name="palette" size={32} color={c.textDim} />
        <Text style={{ color: c.textDim, fontWeight: "700", fontSize: 9, marginTop: 4 }}>{t("components.coloring_books.pdf")}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      accessibilityLabel={alt}
      onError={() => setErrored(true)}
      style={{ width: "100%", height: "100%" }}
      resizeMode="contain"
    />
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { paddingVertical: 24, alignItems: "center", gap: 8 },
    dim: { color: c.textMuted, fontSize: 12 },
    errorBox: {
      flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: 12, borderRadius: 12,
      backgroundColor: c.statusErrorBg, borderWidth: 1, borderColor: c.statusErrorBorder,
    },
    errorText: { color: c.statusErrorText, flex: 1, fontSize: 12 },
    retryBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.surfaceElevated },
    retryText: { color: c.foreground, fontWeight: "700", fontSize: 11 },

    quotaBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    quotaBarOk: { backgroundColor: c.statusSuccessBg, borderColor: c.statusSuccessBorder },
    quotaBarLocked: { backgroundColor: c.statusErrorBg, borderColor: c.statusErrorBorder },
    quotaText: { fontSize: 12, fontWeight: "700", flex: 1 },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: {
      width: "48%",
      backgroundColor: c.calloutBg, borderWidth: 1, borderColor: c.glassBorder,
      borderRadius: 14, padding: 8, gap: 6,
    },
    thumbWrap: {
      aspectRatio: 3 / 4,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: c.surfaceElevated,
      alignItems: "center", justifyContent: "center",
    },
    cardTitle: { color: c.foreground, fontWeight: "700", fontSize: 12, lineHeight: 15, minHeight: 30 },
    cardActions: { flexDirection: "row", gap: 4 },
    btnSecondary: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3,
      paddingVertical: 6, borderRadius: 10,
      backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.glassBorder,
    },
    btnSecondaryText: { color: c.foreground, fontWeight: "700", fontSize: 10 },
    btnPrimary: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3,
      paddingVertical: 6, borderRadius: 10, backgroundColor: c.primary,
    },
    btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 10 },
    rowErr: { color: c.statusErrorText, fontSize: 10, marginTop: 2 },

    empty: { alignItems: "center", paddingVertical: 30, gap: 8 },
    emptyTitle: { color: c.foreground, fontWeight: "800", fontSize: 14 },
    emptyDesc: { color: c.textMuted, fontSize: 12, textAlign: "center", maxWidth: 260 },

    pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 },
    pagerBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.glassBorder },
    pagerBtnText: { color: c.foreground, fontWeight: "700", fontSize: 11 },
    pagerInfo: { color: c.textMuted, fontSize: 10.5, flex: 1, textAlign: "center" },
  });
}
