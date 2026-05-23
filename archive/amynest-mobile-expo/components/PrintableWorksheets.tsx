import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, Image, Pressable, ActivityIndicator, StyleSheet, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  fetchWorksheets, type Worksheet,
  driveThumbnailUrl, drivePreviewUrl,
} from "@/services/hubApi";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/contexts/ThemeContext";
import { ACCENT_PINK, palette } from "@/constants/colors";
import { useTranslation } from "react-i18next";

const DAILY_LIMIT = 5;
const PAGE_SIZE = 8;
const KEY_DOWNLOADED = "ws_downloaded_ids";
const KEY_DAILY = "ws_daily";

interface DailyRecord { date: string; count: number; }
const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

async function getDownloadedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DOWNLOADED);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
async function saveDownloaded(id: string) {
  const ids = await getDownloadedIds();
  ids.add(id);
  await AsyncStorage.setItem(KEY_DOWNLOADED, JSON.stringify([...ids]));
}
async function getDaily(): Promise<DailyRecord> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DAILY);
    if (raw) {
      const r: DailyRecord = JSON.parse(raw);
      if (r.date === today()) return r;
    }
  } catch {}
  return { date: today(), count: 0 };
}
async function bumpDaily(): Promise<DailyRecord> {
  const r = await getDaily();
  const next = { date: today(), count: r.count + 1 };
  await AsyncStorage.setItem(KEY_DAILY, JSON.stringify(next));
  return next;
}

export function PrintableWorksheets() {
  const { t } = useTranslation();
  const c = useColors();
  const { mode } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [all, setAll] = useState<Worksheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [daily, setDaily] = useState<DailyRecord>({ date: today(), count: 0 });
  const [openErr, setOpenErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchWorksheets();
      setAll(list);
    } catch (e) {
      setError((e as Error).message || "Failed to load worksheets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setDownloadedIds(await getDownloadedIds());
      setDaily(await getDaily());
      load();
    })();
  }, [load]);

  const limitReached = daily.count >= DAILY_LIMIT;
  const remaining = Math.max(0, DAILY_LIMIT - daily.count);

  const filtered = all
    .filter(w => !downloadedIds.has(w.id))
    .filter(w => !query || w.name.toLowerCase().includes(query.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const paginated = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const onOpen = useCallback(async (ws: Worksheet) => {
    if (limitReached) return;
    setOpenErr(null);
    let result: WebBrowser.WebBrowserResult;
    try {
      result = await WebBrowser.openBrowserAsync(drivePreviewUrl(ws.id), {
        toolbarColor: mode === "light" ? "#FFFFFF" : palette.slate800,
        controlsColor: mode === "light" ? palette.slate900 : "#fff",
        showTitle: true,
      });
    } catch (e) {
      setOpenErr("Could not open the browser. Please try again.");
      return;
    }
    if (result?.type === "opened" || result?.type === "dismiss") {
      await saveDownloaded(ws.id);
      const next = await bumpDaily();
      setDownloadedIds(await getDownloadedIds());
      setDaily(next);
    }
  }, [limitReached, mode]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={ACCENT_PINK} />
        <Text style={s.dim}>{t("components.printable_worksheets.loading_worksheets")}</Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errText}>⚠ {error}</Text>
        <Pressable onPress={load} style={s.retryBtn}>
          <Text style={s.retryText}>{t("components.printable_worksheets.try_again")}</Text>
        </Pressable>
      </View>
    );
  }

  const allDownloaded = all.length > 0 && all.every(w => downloadedIds.has(w.id));

  return (
    <View style={{ gap: 12 }}>
      {/* Daily counter */}
      <View style={[s.dailyBar, {
        backgroundColor: limitReached ? c.statusErrorBg : c.statusSuccessBg,
        borderColor: limitReached ? c.statusErrorBorder : c.statusSuccessBorder,
      }]}>
        <Text style={{ fontSize: 18 }}>{limitReached ? "🚫" : "✅"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[s.dailyTitle, { color: limitReached ? c.statusErrorText : c.statusSuccessText }]}>
            {limitReached ? "Daily limit reached" : `${remaining} download${remaining !== 1 ? "s" : ""} left today`}
          </Text>
          <Text style={s.dailySub}>
            {limitReached ? "Resets tomorrow at midnight" : `${daily.count} of ${DAILY_LIMIT} used`}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Ionicons name="search" size={14} color={c.textDim} />
        <TextInput
          value={query}
          onChangeText={(t) => { setQuery(t); setPage(1); }}
          placeholder={t("components.printable_worksheets.search_worksheets")}
          placeholderTextColor={c.textDim}
          style={s.searchInput}
        />
        {query ? (
          <Pressable onPress={() => { setQuery(""); setPage(1); }}>
            <Ionicons name="close-circle" size={16} color={c.textDim} />
          </Pressable>
        ) : null}
      </View>

      <Text style={s.countText}>
        {filtered.length} worksheet{filtered.length !== 1 ? "s" : ""}
        {downloadedIds.size > 0 ? ` · ${downloadedIds.size} viewed` : ""}
      </Text>

      {openErr && (
        <Text style={s.errText}>⚠ {openErr}</Text>
      )}

      {allDownloaded ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 36 }}>🎉</Text>
          <Text style={s.emptyTitle}>{t("components.printable_worksheets.all_worksheets_viewed")}</Text>
          <Text style={s.emptyDesc}>{t("components.printable_worksheets.you_ve_gone_through_the_whole_collection")}</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyDesc}>{query ? `No results for "${query}"` : "No worksheets available."}</Text>
        </View>
      ) : (
        <>
          <View style={s.grid}>
            {paginated.map(ws => (
              <WorksheetCard key={ws.id} worksheet={ws} disabled={limitReached} onOpen={() => onOpen(ws)} styles={s} />
            ))}
          </View>

          {totalPages > 1 && (
            <View style={s.pager}>
              <Pressable
                disabled={cur === 1}
                onPress={() => setPage(cur - 1)}
                style={[s.pageBtn, cur === 1 && s.pageBtnDisabled]}
              >
                <Text style={s.pageBtnText}>{t("components.printable_worksheets.prev")}</Text>
              </Pressable>
              <Text style={s.pageInfo}>{cur} / {totalPages}</Text>
              <Pressable
                disabled={cur === totalPages}
                onPress={() => setPage(cur + 1)}
                style={[s.pageBtn, cur === totalPages && s.pageBtnDisabled]}
              >
                <Text style={s.pageBtnText}>{t("components.printable_worksheets.next")}</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function WorksheetCard({
  worksheet, disabled, onOpen, styles: s,
}: { worksheet: Worksheet; disabled: boolean; onOpen: () => void; styles: ReturnType<typeof makeStyles> }) {
  const displayName = worksheet.name.replace(/\.[^.]+$/, "").replace(/_/g, " ");
  const isPdf = worksheet.fileType === "pdf";
  const ext = isPdf ? "PDF" : worksheet.mimeType === "image/png" ? "PNG" : "JPG";
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Pressable
      onPress={onOpen}
      disabled={disabled}
      style={({ pressed }) => [s.card, pressed && !disabled && { opacity: 0.85 }]}
    >
      <View style={s.thumbWrap}>
        {imgFailed ? (
          <View style={[s.thumb, { alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 32 }}>{isPdf ? "📄" : "🖼️"}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: driveThumbnailUrl(worksheet.id, 320) }}
            style={s.thumb}
            onError={() => setImgFailed(true)}
            resizeMode="cover"
          />
        )}
        <View style={[s.badge, { backgroundColor: isPdf ? "rgba(220,38,38,0.92)" : "rgba(37,99,235,0.92)" }]}>
          <Text style={s.badgeText}>{ext}</Text>
        </View>
      </View>
      <View style={s.cardBody}>
        <Text numberOfLines={2} style={s.cardTitle}>{displayName}</Text>
        <View style={[s.openBtn, disabled && { backgroundColor: "rgba(148,163,184,0.4)" }]}>
          <Ionicons name={disabled ? "lock-closed" : "download"} size={12} color="#fff" />
          <Text style={s.openBtnText}>{disabled ? "Limit reached" : "View / Download"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    center: { paddingVertical: 24, alignItems: "center", gap: 8 },
    dim: { color: c.textMuted, fontSize: 13 },
    errText: { color: c.statusErrorText, fontSize: 13 },
    retryBtn: { backgroundColor: c.surfaceElevated, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, marginTop: 6 },
    retryText: { color: c.foreground, fontWeight: "700", fontSize: 12 },

    dailyBar: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1, borderRadius: 12, padding: 10,
    },
    dailyTitle: { fontSize: 12.5, fontWeight: "700" },
    dailySub: { fontSize: 11, color: c.textMuted, marginTop: 1 },

    searchWrap: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
      backgroundColor: c.calloutBg, borderWidth: 1, borderColor: c.glassBorder,
    },
    searchInput: { flex: 1, color: c.foreground, fontSize: 13, padding: 0 },

    countText: { color: c.textDim, fontSize: 11 },

    grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    card: {
      width: "48%", borderRadius: 14, overflow: "hidden",
      backgroundColor: c.calloutBg, borderWidth: 1, borderColor: c.glassBorder,
    },
    thumbWrap: { height: 110, backgroundColor: c.surfaceElevated, position: "relative" },
    thumb: { width: "100%", height: "100%", backgroundColor: c.surfaceElevated },
    badge: { position: "absolute", top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    badgeText: { color: "#fff", fontWeight: "800", fontSize: 9, letterSpacing: 0.3 },
    cardBody: { padding: 8, gap: 8 },
    cardTitle: { color: c.foreground, fontSize: 12, fontWeight: "600", lineHeight: 16, minHeight: 32 },
    openBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
      backgroundColor: c.primary, borderRadius: 8, paddingVertical: 7,
    },
    openBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

    empty: { alignItems: "center", paddingVertical: 30, gap: 6 },
    emptyTitle: { color: c.foreground, fontWeight: "700", fontSize: 14 },
    emptyDesc: { color: c.textMuted, fontSize: 12, textAlign: "center", maxWidth: 240 },

    pager: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 },
    pageBtn: { backgroundColor: c.surfaceElevated, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { color: c.foreground, fontWeight: "700", fontSize: 12 },
    pageInfo: { color: c.textMuted, fontSize: 12, minWidth: 48, textAlign: "center" },
  });
}
