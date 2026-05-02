import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  NOISE_TYPES,
  LULLABIES,
  getNoiseAgeTip,
  type NoiseType,
  type Lullaby,
} from "@workspace/infant-hub";
import { useNoisePlayer, type WavSource } from "@/hooks/useNoisePlayer";
import { brand, palette } from "@/constants/colors";

type Props = { ageMonths: number };

/**
 * Mobile twin of the web Sounds sub-card. Plays the white-noise catalogue
 * via a pure-JS WAV synth and the lullabies via a sine-wave melody synth
 * (see lib/infant-hub/src/audioSynth.ts) — no audio assets bundled.
 */
export default function InfantSoundsTab({ ageMonths }: Props) {
  const { t } = useTranslation();
  const ageTip = getNoiseAgeTip(ageMonths);
  const recommended = NOISE_TYPES.filter((n) => ageTip.recommended.includes(n.id));
  const others = NOISE_TYPES.filter((n) => !ageTip.recommended.includes(n.id));
  const { activeId, toggle, stop } = useNoisePlayer();

  const playLabel = t("infant_hub.sounds.play");
  const pauseLabel = t("infant_hub.sounds.pause");

  return (
    <View style={{ gap: 12 }}>
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
        <Text style={styles.ageTipHeadline}>{ageTip.headline}</Text>
        <Text style={styles.ageTipBody}>{ageTip.tip}</Text>
        <View style={styles.volumeRow}>
          <Ionicons name="volume-medium" size={12} color={palette.emerald400} />
          <Text style={styles.volumeText}>{ageTip.volume}</Text>
        </View>
      </View>

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
                highlight
                playing={activeId === n.id}
                onToggle={() => toggle(n.id, { type: "noise", kind: n.synthKind })}
                playLabel={playLabel}
                pauseLabel={pauseLabel}
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
              highlight={false}
              playing={activeId === n.id}
              onToggle={() => toggle(n.id, { type: "noise", kind: n.synthKind })}
              playLabel={playLabel}
              pauseLabel={pauseLabel}
            />
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>
          {t("infant_hub.sounds.lullaby_label")}
        </Text>
        <View style={{ gap: 6 }}>
          {LULLABIES.map((l) => (
            <LullabyCard
              key={l.id}
              lullaby={l}
              playing={activeId === l.id}
              onToggle={() => {
                const source: WavSource = {
                  type: "melody",
                  notes: l.melody.notes,
                  noiseBed: l.melody.noiseBed,
                  amplitude: l.melody.amplitude,
                };
                toggle(l.id, source);
              }}
              playLabel={playLabel}
              pauseLabel={pauseLabel}
              hint={t("infant_hub.sounds.sing_along_hint")}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function NoiseRow({
  noise,
  highlight,
  playing,
  onToggle,
  playLabel,
  pauseLabel,
}: {
  noise: NoiseType;
  highlight: boolean;
  playing: boolean;
  onToggle: () => void;
  playLabel: string;
  pauseLabel: string;
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
        <Text style={styles.noiseDesc}>{noise.desc}</Text>
        <Text style={styles.noiseBest}>👶 {noise.bestFor}</Text>
      </View>
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
    </View>
  );
}

function LullabyCard({
  lullaby,
  playing,
  onToggle,
  playLabel,
  pauseLabel,
  hint,
}: {
  lullaby: Lullaby;
  playing: boolean;
  onToggle: () => void;
  playLabel: string;
  pauseLabel: string;
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
});
