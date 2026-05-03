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

interface FunsheetFile {
  id: string;
  name: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloaded: boolean;
}
interface DailyQuota { limit: number; used: number; remaining: number; }
interface Pagination {
  page: number; pageSize: number; total: number; totalPages: number;
  hasNext: boolean; hasPrev: boolean;
}
interface ListResponse {
  ok: boolean; files: FunsheetFile[]; pagination: Pagination; dailyQuota: DailyQuota;
}
interface DownloadResponse {
  ok?: boolean; downloadUrl?: string; dailyQuota?: DailyQuota; error?: string;
}

export function FunSheets({
  childId,
  childName,
}: {
  childId: number;
  childName: string;
}) {
  const { t } = useTranslation();
  const c = useColors();
  const { mode } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const authFetch = useAuthFetch();

  const [page, setPage] = useState(0);
  const [files, setFiles] = useState<FunsheetFile[]>([]);
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
      const res = await authFetch(`/api/funsheets/list?childId=${childId}&page=${targetPage}`, { signal });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === "google_api_key_missing") {
          setListError("Fun Sheets are temporarily unavailable. Please check back soon.");
        } else {
          setListError("Couldn't load Fun Sheets. Please try again.");
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
    return () => ctrl.abort();
  }, [fetchPage, page]);

  const handlePreview = useCallback(async (file: FunsheetFile) => {
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

  const handleDownload = useCallback(async (file: FunsheetFile) => {
    if (downloadingId !== null) return;
    setDownloadingId(file.id);
    setRowError(null);
    try {
      const res = await authFetch("/api/funsheets/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, fileId: file.id }),
      });
      const body = (await res.json().catch(() => ({}))) as DownloadResponse;

      if (!res.ok) {
        if (body.error === "daily_limit_reached") {
          if (body.dailyQuota) setQuota(body.dailyQuota);
          setRowError({ id: file.id, message: `Daily limit reached (${quota?.limit ?? 2}/day)` });
        } else if (body.error === "already_downloaded") {
          const url = `https://drive.google.com/uc?export=download&id=${file.id}`;
          try { await Linking.openURL(url); } catch { await WebBrowser.openBrowserAsync(url); }
        } else {
          setRowError({ id: file.id, message: "Download failed. Please try again." });
        }
        return;
      }

      if (body.downloadUrl) {
        try { await Linking.openURL(body.downloadUrl); }
        catch { await WebBrowser.openBrowserAsync(body.downloadUrl); }
      }
      if (body.dailyQuota) setQuota(body.dailyQuota);
      setFiles(prev => prev.map(f => (f.id === file.id ? { ...f, downloaded: true } : f)));
    } catch {
      setRowError({ id: file.id, message: "Network error. Please try again." });
    } finally {
      setDownloadingId(null);
    }
  }, [authFetch, childId, downloadingId, quota]);

  const quotaExhausted = quota !== null && quota.remaining <= 0;

  return (
    <View style={{ gap: 10 }}>
      {quota && (
        <View style={[styles.quotaBar, quotaExhausted ? styles.quotaBarLocked : styles.quotaBarOk]}>
          <MaterialCommunityIcons name="file-download-outline" size={14} color={quotaExhausted ? c.statusErrorText : c.statusSuccessText} />
          <Text style={[styles.quotaText, { color: quotaExhausted ? c.statusErrorText : c.statusSuccessText }]}>
            {quotaExhausted
              ? `Daily limit reached for ${childName}`
              : `${quota.remaining} of ${quota.limit} downloads left today`}
          </Text>
        </View>
      )}

      {loading && files.length === 0 && (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      )}

      {!loading && listError && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={c.statusErrorText} />
          <Text style={styles.errorText}>{listError}</Text>
          <Pressable onPress={() => fetchPage(page)} style={styles.retryBtn}>
            <Ionicons name="refresh" size={12} color={c.foreground} />
            <Text style={styles.retryText}>{t("components.fun_sheets.try_again")}</Text>
          </Pressable>
        </View>
      )}

      {!loading && !listError && pagination !== null && pagination.total === 0 && (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle" size={36} color={palette.emerald500} />
          <Text style={styles.emptyTitle}>{t("components.fun_sheets.all_caught_up")}</Text>
          <Text style={styles.emptyDesc}>{childName} has downloaded every Fun Sheet in the library. We add new ones regularly — check back soon!</Text>
        </View>
      )}

      {!loading && !listError && files.length > 0 && (
        <>
          <View style={styles.grid}>
            {files.map(file => {
              const isDownloading = downloadingId === file.id;
              const showRowError = rowError?.id === file.id;
              const canDownload = !quotaExhausted || file.downloaded;
              return (
                <View key={file.id} style={[styles.card, file.downloaded && styles.cardDone]}>
                  <Pressable onPress={() => handlePreview(file)} style={styles.thumbWrap}>
                    <ThumbnailWithFallback src={file.thumbnailUrl} alt={file.name} c={c} />
                    {file.downloaded && (
                      <View style={styles.doneOverlay}>
                        <Ionicons name="checkmark-circle" size={28} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                  <Text numberOfLines={2} style={styles.cardTitle}>{file.name}</Text>
                  {showRowError && (
                    <Text style={styles.rowErr}>{rowError!.message}</Text>
                  )}
                  <View style={styles.cardActions}>
                    <Pressable onPress={() => handlePreview(file)} style={[styles.btnSecondary, { flex: 1 }]}>
                      <Ionicons name="eye" size={11} color={c.foreground} />
                      <Text style={styles.btnSecondaryText}>{t("components.fun_sheets.view")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDownload(file)}
                      disabled={isDownloading || (!canDownload && !file.downloaded)}
                      style={[
                        styles.btnPrimary,
                        { flex: 1 },
                        file.downloaded && styles.btnDone,
                        (isDownloading || (!canDownload && !file.downloaded)) && { opacity: 0.6 },
                      ]}
                    >
                      {isDownloading ? (
                        <ActivityIndicator color={file.downloaded ? palette.teal600 : "#fff"} size="small" />
                      ) : (
                        <Ionicons name="download" size={11} color={file.downloaded ? palette.teal600 : "#fff"} />
                      )}
                      <Text style={[styles.btnPrimaryText, file.downloaded && { color: palette.teal600 }]}>
                        {file.downloaded ? "Again" : "Get"}
                      </Text>
                    </Pressable>
                  </View>
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
                <Text style={styles.pagerBtnText}>{t("components.fun_sheets.prev")}</Text>
              </Pressable>
              <Text style={styles.pagerInfo}>
                Page {pagination.page + 1} of {pagination.totalPages} · {pagination.total} sheets
              </Text>
              <Pressable
                onPress={() => pagination.hasNext && setPage(p => p + 1)}
                disabled={!pagination.hasNext || loading}
                style={[styles.pagerBtn, (!pagination.hasNext || loading) && { opacity: 0.4 }]}
              >
                <Text style={styles.pagerBtnText}>{t("components.fun_sheets.next")}</Text>
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
  const { t } = useTranslation();
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <View style={{ alignItems: "center", justifyContent: "center", padding: 12 }}>
        <MaterialCommunityIcons name="file-pdf-box" size={32} color={palette.teal600} />
        <Text style={{ color: c.textDim, fontWeight: "700", fontSize: 9, marginTop: 4 }}>{t("components.fun_sheets.pdf")}</Text>
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
      borderRadius: 14, overflow: "hidden",
    },
    cardDone: { opacity: 0.75, borderColor: palette.teal500 },
    thumbWrap: {
      aspectRatio: 3 / 4,
      backgroundColor: c.surfaceElevated,
      alignItems: "center", justifyContent: "center",
      position: "relative",
    },
    doneOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.3)",
    },
    cardTitle: { color: c.foreground, fontWeight: "700", fontSize: 11.5, lineHeight: 14, paddingHorizontal: 8, paddingTop: 6 },
    cardActions: { flexDirection: "row", gap: 4, padding: 8 },
    btnSecondary: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3,
      paddingVertical: 6, borderRadius: 10,
      backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.glassBorder,
    },
    btnSecondaryText: { color: c.foreground, fontWeight: "700", fontSize: 10 },
    btnPrimary: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3,
      paddingVertical: 6, borderRadius: 10, backgroundColor: palette.teal600,
    },
    btnDone: { backgroundColor: "rgba(20,184,166,0.18)", borderWidth: 1, borderColor: palette.teal500 },
    btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 10 },
    rowErr: { color: c.statusErrorText, fontSize: 10, paddingHorizontal: 8, marginTop: 2 },

    empty: { alignItems: "center", paddingVertical: 30, gap: 8 },
    emptyTitle: { color: c.foreground, fontWeight: "800", fontSize: 14 },
    emptyDesc: { color: c.textMuted, fontSize: 12, textAlign: "center", maxWidth: 260 },

    pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 },
    pagerBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: c.surfaceElevated, borderWidth: 1, borderColor: c.glassBorder },
    pagerBtnText: { color: c.foreground, fontWeight: "700", fontSize: 11 },
    pagerInfo: { color: c.textMuted, fontSize: 10.5, flex: 1, textAlign: "center" },
  });
}
