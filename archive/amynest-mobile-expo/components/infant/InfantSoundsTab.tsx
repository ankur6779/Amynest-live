import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import InfantPoemsTab from "@/components/infant/InfantPoemsTab";
import {
  NOISE_TYPES,
  LULLABIES,
  getNoiseAgeTip,
  pickLang,
  type Lang,
  type NoiseType,
  type Lullaby,
} from "@workspace/infant-hub";
import { useNoisePlayer, type WavSource } from "@/hooks/useNoisePlayer";
import { useFeatureUsage } from "@/hooks/useFeatureUsage";
import { brand, palette } from "@/constants/colors";
import { langOf } from "@/utils/lang";
import VolumeSlider from "@/components/infant/VolumeSlider";

type Props = { ageMonths: number };
type SoundsTab = "noise" | "poems";

/**
 * Server-tracked feature id for Try-Free gating. Mirrors the InfantHub tile
 * gating; the first non-premium play OR download marks the feature used,
 * after which every subsequent play/download routes to /paywall.
 */
const SOUNDS_FEATURE_ID = "hub_infant_sounds";

/**
 * Mobile twin of the web Sounds sub-card. Plays the white-noise catalogue
 * via a pure-JS WAV synth and the lullabies via a sine-wave melody synth
 * (see lib/infant-hub/src/audioSynth.ts) — no audio assets bundled.
 *
 * Adds a visible volume slider while audio is active and a per-row download
 * button that persists the synthesised WAV into the app's documents folder.
 */
export default function InfantSoundsTab({ ageMonths }: Props) {
  const { t, i18n } = useTranslation();
  const [soundsTab, setSoundsTab] = useState<SoundsTab>("noise");
  const lang = langOf(i18n.language);
  const ageTip = getNoiseAgeTip(ageMonths);
  const recommended = NOISE_TYPES.filter((n) => ageTip.recommended.includes(n.id));
  const others = NOISE_TYPES.filter((n) => !ageTip.recommended.includes(n.id));
  const { activeId, toggle, stop, volume, setVolume, download } =
    useNoisePlayer();
  const { isPremium, hasUsedFeature, markFeatureUsed } = useFeatureUsage();
  const router = useRouter();

  const playLabel = t("infant_hub.sounds.play");
  const pauseLabel = t("infant_hub.sounds.pause");
  const downloadLabel = t("infant_hub.sounds.download");
  const savedLabel = t("infant_hub.sounds.download_saved");

  const [savedIds, setSavedIds] = useState<Record<string, true>>({});
  const [busyIds, setBusyIds] = useState<Record<string, true>>({});

  const goPaywall = useCallback(() => {
    router.push({ pathname: "/paywall", params: { reason: SOUNDS_FEATURE_ID } });
  }, [router]);

  /**
   * Single source of truth for whether the user is allowed to consume their
   * next play/download. Reuses the existing `useFeatureUsage` Try-Free
   * tracking so analytics + tile badge state stay consistent with the rest
   * of the hub. Returns true after marking the feature used; returns false
   * (and routes to /paywall) when the user has already burned their free
   * use. Premium users always pass through.
   */
  const consumeUse = useCallback((): boolean => {
    if (isPremium) return true;
    if (hasUsedFeature(SOUNDS_FEATURE_ID)) {
      goPaywall();
      return false;
    }
    markFeatureUsed(SOUNDS_FEATURE_ID);
    return true;
  }, [isPremium, hasUsedFeature, markFeatureUsed, goPaywall]);

  const handleToggle = useCallback(
    (id: string, source: WavSource) => {
      // Stopping the currently-active track is always free — it's the parent
      // ending playback, not starting a new one.
      if (activeId === id) {
        toggle(id, source);
        return;
      }
      if (!consumeUse()) return;
      void toggle(id, source);
    },
    [activeId, consumeUse, toggle],
  );

  const handleDownload = useCallback(
    async (id: string, source: WavSource, label: string) => {
      if (busyIds[id]) return;
      // Re-downloading something already saved this session shouldn't burn
      // another free use — it's idempotent from the parent's POV.
      if (!savedIds[id] && !consumeUse()) return;
      setBusyIds((s) => ({ ...s, [id]: true }));
      try {
        const result = await download(id, source, label);
        setSavedIds((s) => ({ ...s, [id]: true }));
        Alert.alert(
          savedLabel,
          t("infant_hub.sounds.download_saved_msg", { name: result.fileName }),
        );
      } catch {
        Alert.alert(t("infant_hub.sounds.download_failed"));
      } finally {
        setBusyIds((s) => {
          const { [id]: _omit, ...rest } = s;
          return rest;
        });
      }
    },
    [busyIds, savedIds, consumeUse, download, savedLabel, t],
  );

  return (
    <View style={{ gap: 12 }}>
      {/* Noise / Poems tab toggle */}
      <View style={styles.tabToggle}>
        <Pressable
          onPress={() => setSoundsTab("noise")}
          style={[styles.tabBtn, soundsTab === "noise" && styles.tabBtnActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: soundsTab === "noise" }}
        >
          <Text style={[styles.tabBtnText, soundsTab === "noise" && styles.tabBtnTextActive]}>
            {t("infant_hub.poems.tab_noise")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSoundsTab("poems")}
          style={[styles.tabBtn, soundsTab === "poems" && styles.tabBtnActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: soundsTab === "poems" }}
        >
          <Ionicons
            name="sparkles"
            size={12}
            color={soundsTab === "poems" ? "#fff" : "rgba(255,255,255,0.45)"}
          />
          <Text style={[styles.tabBtnText, soundsTab === "poems" && styles.tabBtnTextActive]}>
            {t("infant_hub.poems.tab_poems")}
          </Text>
        </Pressable>
      </View>

      {/* Poems tab */}
      {soundsTab === "poems" && <InfantPoemsTab ageMonths={ageMonths} />}

      {/* Noise + Lullabies tab */}
      {soundsTab === "noise" && <>
      <View style={styles.ageTipBlock}>
        <View style={styles.ageTipHead}>
          <Ionicons name="sparkles" size={14} color={brand.amber400} />
          <Text style={styles.ageTipBand}>{ageTip.band}</Text>
          {activeId !== null && (
            <Pressable
              onPress={stop}
              style={styles.stopAllPill}
              accessibilityRole="button"
              accessibilityLabel={t("infant_hub.sounds.stop_all")}
            >
              <Ionicons name="stop" size={10} color="#fff" />
              <Text style={styles.stopAllText}>{t("infant_hub.sounds.stop_all")}</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.ageTipHeadline}>{pickLang(ageTip.headline, lang)}</Text>
        <Text style={styles.ageTipBody}>{pickLang(ageTip.tip, lang)}</Text>
        <View style={styles.volumeRow}>
          <Ionicons name="volume-medium" size={12} color={palette.emerald400} />
          <Text style={styles.volumeText}>{pickLang(ageTip.volume, lang)}</Text>
        </View>
      </View>

      <VolumeSlider
        value={volume}
        onChange={setVolume}
        label={t("infant_hub.sounds.volume_label")}
        minLabel={t("infant_hub.sounds.volume_down")}
        maxLabel={t("infant_hub.sounds.volume_up")}
      />

      {recommended.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>
            {t("infant_hub.sounds.recommended_label")}
          </Text>
          <View style={{ gap: 6 }}>
            {recommended.map((n) => (
              <NoiseRow
                key={n.id}
                noise={n}
                lang={lang}
                highlight
                playing={activeId === n.id}
                onToggle={() => handleToggle(n.id, { type: "noise", kind: n.synthKind })}
                onDownload={() =>
                  handleDownload(
                    n.id,
                    { type: "noise", kind: n.synthKind },
                    n.label,
                  )
                }
                downloading={!!busyIds[n.id]}
                downloaded={!!savedIds[n.id]}
                playLabel={playLabel}
                pauseLabel={pauseLabel}
                downloadLabel={downloadLabel}
                savedLabel={savedLabel}
                downloadA11y={t("infant_hub.sounds.download_a11y", {
                  name: n.label,
                })}
              />
            ))}
          </View>
        </View>
      )}

      <View>
        <Text style={styles.sectionLabel}>{t("infant_hub.sounds.other_label")}</Text>
        <View style={{ gap: 6 }}>
          {others.map((n) => (
            <NoiseRow
              key={n.id}
              noise={n}
              lang={lang}
              highlight={false}
              playing={activeId === n.id}
              onToggle={() => handleToggle(n.id, { type: "noise", kind: n.synthKind })}
              onDownload={() =>
                handleDownload(
                  n.id,
                  { type: "noise", kind: n.synthKind },
                  n.label,
                )
              }
              downloading={!!busyIds[n.id]}
              downloaded={!!savedIds[n.id]}
              playLabel={playLabel}
              pauseLabel={pauseLabel}
              downloadLabel={downloadLabel}
              savedLabel={savedLabel}
              downloadA11y={t("infant_hub.sounds.download_a11y", {
                name: n.label,
              })}
            />
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>
          {t("infant_hub.sounds.lullaby_label")}
        </Text>
        <View style={{ gap: 6 }}>
          {LULLABIES.map((l) => {
            const source: WavSource = {
              type: "melody",
              notes: l.melody.notes,
              noiseBed: l.melody.noiseBed,
              amplitude: l.melody.amplitude,
            };
            return (
              <LullabyCard
                key={l.id}
                lullaby={l}
                playing={activeId === l.id}
                onToggle={() => handleToggle(l.id, source)}
                onDownload={() => handleDownload(l.id, source, l.title)}
                downloading={!!busyIds[l.id]}
                downloaded={!!savedIds[l.id]}
                playLabel={playLabel}
                pauseLabel={pauseLabel}
                downloadLabel={downloadLabel}
                savedLabel={savedLabel}
                downloadA11y={t("infant_hub.sounds.download_a11y", {
                  name: l.title,
                })}
                hint={t("infant_hub.sounds.sing_along_hint")}
              />
            );
          })}
        </View>
      </View>
      </>}
    </View>
  );
}

function DownloadButton({
  onPress,
  busy,
  done,
  a11y,
  doneLabel,
}: {
  onPress: () => void;
  busy: boolean;
  done: boolean;
  a11y: string;
  doneLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.downloadBtn, done && styles.downloadBtnDone]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: busy, selected: done }}
      hitSlop={6}
    >
      <Ionicons
        name={done ? "checkmark" : busy ? "hourglass" : "download"}
        size={14}
        color="#fff"
      />
      {done && <Text style={styles.downloadBtnText}>{doneLabel}</Text>}
    </Pressable>
  );
}

function NoiseRow({
  noise,
  lang,
  highlight,
  playing,
  onToggle,
  onDownload,
  downloading,
  downloaded,
  playLabel,
  pauseLabel,
  downloadLabel: _downloadLabel,
  savedLabel,
  downloadA11y,
}: {
  noise: NoiseType;
  lang: Lang;
  highlight: boolean;
  playing: boolean;
  onToggle: () => void;
  onDownload: () => void;
  downloading: boolean;
  downloaded: boolean;
  playLabel: string;
  pauseLabel: string;
  downloadLabel: string;
  savedLabel: string;
  downloadA11y: string;
}) {
  return (
    <View
      style={[
        styles.noiseRow,
        highlight && {
          backgroundColor: `${palette.emerald500}1F`,
          borderColor: `${palette.emerald500}55`,
        },
        playing && {
          backgroundColor: `${brand.purple500}26`,
          borderColor: `${brand.purple500}88`,
        },
      ]}
    >
      <Text style={styles.noiseEmoji}>{noise.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.noiseLabel}>{noise.label}</Text>
        <Text style={styles.noiseDesc}>{pickLang(noise.desc, lang)}</Text>
        <Text style={styles.noiseBest}>👶 {pickLang(noise.bestFor, lang)}</Text>
      </View>
      <View style={styles.rowActions}>
        <Pressable
          onPress={onToggle}
          style={[styles.playBtn, playing && styles.playBtnActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: playing }}
          accessibilityLabel={playing ? pauseLabel : `${playLabel} ${noise.label}`}
          hitSlop={6}
        >
          <Ionicons
            name={playing ? "pause" : "play"}
            size={16}
            color={playing ? "#fff" : brand.violet200}
          />
        </Pressable>
        <DownloadButton
          onPress={onDownload}
          busy={downloading}
          done={downloaded}
          a11y={downloadA11y}
          doneLabel={savedLabel}
        />
      </View>
    </View>
  );
}

function LullabyCard({
  lullaby,
  playing,
  onToggle,
  onDownload,
  downloading,
  downloaded,
  playLabel,
  pauseLabel,
  downloadLabel: _downloadLabel,
  savedLabel,
  downloadA11y,
  hint,
}: {
  lullaby: Lullaby;
  playing: boolean;
  onToggle: () => void;
  onDownload: () => void;
  downloading: boolean;
  downloaded: boolean;
  playLabel: string;
  pauseLabel: string;
  downloadLabel: string;
  savedLabel: string;
  downloadA11y: string;
  hint: string;
}) {
  return (
    <View
      style={[
        styles.lullabyCard,
        playing && {
          backgroundColor: `${brand.purple500}26`,
          borderColor: `${brand.purple500}88`,
        },
      ]}
    >
      <View style={styles.lullabyHead}>
        <Text style={styles.lullabyEmoji}>{lullaby.emoji}</Text>
        <Text style={styles.lullabyTitle}>{lullaby.title}</Text>
        <View style={styles.langPill}>
          <Text style={styles.langPillText}>{lullaby.lang.toUpperCase()}</Text>
        </View>
        <Pressable
          onPress={onToggle}
          style={[styles.playBtn, playing && styles.playBtnActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: playing }}
          accessibilityLabel={playing ? pauseLabel : `${playLabel} ${lullaby.title}`}
          hitSlop={6}
        >
          <Ionicons
            name={playing ? "pause" : "play"}
            size={16}
            color={playing ? "#fff" : brand.violet200}
          />
        </Pressable>
        <DownloadButton
          onPress={onDownload}
          busy={downloading}
          done={downloaded}
          a11y={downloadA11y}
          doneLabel={savedLabel}
        />
      </View>
      <Text style={styles.lyric}>{lullaby.lyric}</Text>
      <Text style={styles.lullabyHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ageTipBlock: {
    backgroundColor: `${brand.purple500}1F`,
    borderColor: `${brand.purple500}55`,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  ageTipHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  ageTipBand: {
    color: brand.amber400,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    flex: 1,
  },
  stopAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: `${brand.purple500}88`,
    borderWidth: 1,
    borderColor: brand.purple500,
  },
  stopAllText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  ageTipHeadline: { color: "#fff", fontWeight: "800", fontSize: 13.5 },
  ageTipBody: { color: "rgba(255,255,255,0.80)", fontSize: 12, lineHeight: 17 },
  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  volumeText: { color: palette.emerald400, fontSize: 11, fontWeight: "700" },

  sectionLabel: {
    color: brand.violet200,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.6,
    marginBottom: 6,
  },

  noiseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  noiseEmoji: { fontSize: 22 },
  noiseLabel: { color: "#fff", fontWeight: "800", fontSize: 12.5 },
  noiseDesc: { color: "rgba(255,255,255,0.75)", fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  noiseBest: { color: brand.amber400, fontSize: 10.5, fontWeight: "700", marginTop: 4 },
  rowActions: { flexDirection: "column", alignItems: "center", gap: 6 },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  playBtnActive: {
    backgroundColor: brand.purple500,
    borderColor: brand.purple500,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 32,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  downloadBtnDone: {
    backgroundColor: `${palette.emerald500}55`,
    borderColor: palette.emerald500,
  },
  downloadBtnText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  lullabyCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  lullabyHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  lullabyEmoji: { fontSize: 18 },
  lullabyTitle: { color: "#fff", fontWeight: "800", fontSize: 12.5, flex: 1 },
  langPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  langPillText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  lyric: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11.5,
    lineHeight: 17,
    fontStyle: "italic",
  },
  lullabyHint: {
    color: "rgba(255,255,255,0.50)",
    fontSize: 10,
    fontStyle: "italic",
  },

  // ── Noise / Poems tab toggle ──────────────────────────────────────────────
  tabToggle: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabBtnActive: { backgroundColor: brand.primary },
  tabBtnText: {
    // audit-ok: muted white on dark tab toggle background
    color: "rgba(255,255,255,0.50)",
    fontSize: 12,
    fontWeight: "800",
  },
  tabBtnTextActive: {
    // audit-ok: static white on active brand-primary pill
    color: "#fff",
  },
});
