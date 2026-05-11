import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { useColors } from "@/hooks/useColors";
import { useFeatureUsage } from "@/hooks/useFeatureUsage";
import { useAmyVoice } from "@/hooks/useAmyVoice";
import LockedBlock from "@/components/LockedBlock";
import { brand, palette } from "@/constants/colors";
import {
  PARENT_GUIDANCE_CARDS,
  PRONUNCIATION_PROMPTS,
  SPEECH_AFFIRMATIONS,
  SPEECH_GAMES,
  SPEECH_MILESTONES,
  monthsToBand,
  type PronouncePromptKind,
  type SpeechAgeBand,
} from "@workspace/speech-coach";

type Child = { id: number; name: string; age: number; ageMonths?: number };

const PRONOUNCE_TABS: readonly PronouncePromptKind[] = [
  "letter",
  "phonic",
  "word",
  "sentence",
] as const;

const MILESTONE_TABS: readonly SpeechAgeBand[] = [
  "1y",
  "2y",
  "3y",
  "4y_plus",
] as const;

function ageMonthsOf(child: Child | null): number {
  if (!child) return 0;
  const months = child.ageMonths ?? child.age * 12;
  return Math.max(0, Math.floor(months));
}

export default function SpeechCoachScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const c = useColors();
  const authFetch = useAuthFetch();
  const usage = useFeatureUsage();
  const voice = useAmyVoice();

  const { data: childrenData } = useQuery<Child[]>({
    queryKey: ["children-for-speech-coach"],
    queryFn: async () => {
      const r = await authFetch("/api/children");
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });
  const children = useMemo(
    () => (Array.isArray(childrenData) ? childrenData : []),
    [childrenData],
  );
  const child = children[0] ?? null;
  const childAgeMonths = ageMonthsOf(child);
  const childBand = monthsToBand(childAgeMonths) ?? "1y";

  const [milestoneTab, setMilestoneTab] = useState<SpeechAgeBand>(childBand);
  const [pronounceTab, setPronounceTab] = useState<PronouncePromptKind>("letter");

  const joinWaitlist = useMutation({
    mutationFn: async () => {
      const r = await authFetch("/api/speech/expert-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child?.id ?? null }),
      });
      if (!r.ok && r.status !== 409) throw new Error("waitlist_error");
    },
  });
  const waitlistJoined = joinWaitlist.isSuccess;

  // Per-mount dedupe so a section's first interaction (any touch within it)
  // marks the matching premium feature exactly once. Mounting the screen
  // alone must NOT mark anything used — only an actual user touch does.
  const markedRef = useRef<Set<string>>(new Set());
  const markOnce = useCallback(
    (key: string) => {
      if (markedRef.current.has(key)) return;
      markedRef.current.add(key);
      usage.markFeatureUsed(key);
    },
    [usage],
  );

  const milestones = useMemo(
    () => SPEECH_MILESTONES.filter((m) => m.ageBand === milestoneTab),
    [milestoneTab],
  );
  const prompts = useMemo(
    () => PRONUNCIATION_PROMPTS.filter((p) => p.kind === pronounceTab),
    [pronounceTab],
  );

  const handleSpeak = useCallback(
    (text: string, mode?: "phonics") => {
      if (voice.speaking || voice.loading) {
        voice.stop();
        return;
      }
      void voice.speak(text, mode ? { mode } : undefined);
    },
    [voice],
  );

  const storyTitle = t("screens.speech_coach.read_aloud.story_default_title");
  const storyBody = t("screens.speech_coach.read_aloud.story_default_body");

  return (
    <View style={[s.root, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[brand.violet600, brand.pink500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + 12 }]}
      >
        <View style={s.headerRow}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={s.backBtn}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />{/* audit-ok: header chevron on gradient */}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{t("screens.speech_coach.title")}</Text>
            <Text style={s.headerSub}>{t("screens.speech_coach.subtitle")}</Text>
          </View>
          <View style={s.headerEmoji}>
            <Text style={{ fontSize: 26 }}>🗣️</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. Dashboard ───────────────────────────────────────────── */}
        <DashboardCard
          c={c}
          childAgeMonths={childAgeMonths}
          band={childBand}
          t={t}
        />

        {/* ── 2. Milestone Checker ──────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_milestones")}
          reason="hub_speech_milestones"
          onInteract={() => markOnce("hub_speech_milestones")}
          title={t("screens.speech_coach.milestones.section_title")}
          icon="checkmark-done-circle"
        >
          <View style={s.tabsRow}>
            {MILESTONE_TABS.map((band) => {
              const active = band === milestoneTab;
              return (
                <Pressable
                  key={band}
                  onPress={() => setMilestoneTab(band)}
                  style={[
                    s.tabPill,
                    {
                      backgroundColor: active ? brand.violet500 : c.muted,
                      borderColor: active ? brand.violet500 : c.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? "#FFFFFF" /* audit-ok: pill foreground on filled brand */ : c.foreground,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {t(`screens.speech_coach.milestones.tab.${band}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ gap: 10 }}>
            {milestones.map((m) => (
              <View
                key={m.id}
                style={[s.row, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: c.foreground }]}>
                    {t(m.i18nKeyLabel)}
                  </Text>
                  <Text style={[s.rowHint, { color: c.mutedForeground }]}>
                    {t(m.i18nKeyHint)}
                  </Text>
                </View>
                <View style={[s.statusPill, { backgroundColor: `${palette.emerald500}22` }]}>
                  <Text style={{ color: palette.emerald700, fontWeight: "700", fontSize: 11 }}>
                    {t("screens.speech_coach.milestones.status.on_track")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SectionShell>

        {/* ── 3. AI Pronunciation Practice ─────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_pronounce")}
          reason="hub_speech_pronounce"
          onInteract={() => markOnce("hub_speech_pronounce")}
          title={t("screens.speech_coach.pronounce.section_title")}
          icon="mic-circle"
        >
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.pronounce.intro")}
          </Text>
          <View style={s.tabsRow}>
            {PRONOUNCE_TABS.map((kind) => {
              const active = kind === pronounceTab;
              return (
                <Pressable
                  key={kind}
                  onPress={() => setPronounceTab(kind)}
                  style={[
                    s.tabPill,
                    {
                      backgroundColor: active ? brand.violet500 : c.muted,
                      borderColor: active ? brand.violet500 : c.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active ? "#FFFFFF" /* audit-ok: pill foreground on filled brand */ : c.foreground,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {t(`screens.speech_coach.pronounce.tab.${kind}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ gap: 10 }}>
            {prompts.map((p) => {
              const isPhonic = p.kind === "phonic" || p.kind === "letter";
              const speaking = voice.speaking || voice.loading;
              return (
                <View
                  key={p.id}
                  style={[s.row, { backgroundColor: c.card, borderColor: c.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rowTitle, { color: c.foreground, fontSize: 16 }]}>
                      {p.text}
                    </Text>
                    <Text style={[s.rowHint, { color: c.mutedForeground }]}>
                      {t(p.i18nKeyHint)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleSpeak(p.text, isPhonic ? "phonics" : undefined)}
                    style={[s.miniBtn, { backgroundColor: brand.violet500 }]}
                  >
                    <Ionicons
                      name={speaking ? "stop" : "volume-high"}
                      size={14}
                      color="#FFFFFF"/* audit-ok: button glyph on filled brand */
                    />
                    <Text style={s.miniBtnText}>
                      {speaking
                        ? t("screens.speech_coach.pronounce.listening")
                        : t("screens.speech_coach.pronounce.play")}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable
              disabled
              style={[s.fullBtn, { backgroundColor: c.muted, opacity: 0.6 }]}
              accessibilityState={{ disabled: true }}
            >
              <Ionicons name="mic-outline" size={16} color={c.mutedForeground} />
              <Text style={[s.fullBtnText, { color: c.mutedForeground }]}>
                {t("screens.speech_coach.pronounce.start_recording")}
              </Text>
            </Pressable>
            <Text style={[s.note, { color: c.mutedForeground }]}>
              {t("screens.speech_coach.pronounce.placeholder_note")}
            </Text>
          </View>
        </SectionShell>

        {/* ── 4. Read Aloud & Repeat ────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_read_aloud")}
          reason="hub_speech_read_aloud"
          onInteract={() => markOnce("hub_speech_read_aloud")}
          title={t("screens.speech_coach.read_aloud.section_title")}
          icon="book"
        >
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.read_aloud.intro")}
          </Text>
          <View style={[s.storyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.storyTitle, { color: c.foreground }]}>{storyTitle}</Text>
            <Text style={[s.storyBody, { color: c.foreground }]}>{storyBody}</Text>
          </View>
          <Pressable
            onPress={() => handleSpeak(`${storyTitle}. ${storyBody}`)}
            style={[s.fullBtn, { backgroundColor: brand.violet500 }]}
          >
            <Ionicons
              name={voice.speaking || voice.loading ? "stop" : "play"}
              size={16}
              color="#FFFFFF"/* audit-ok: button glyph on filled brand */
            />
            <Text style={s.fullBtnText}>
              {voice.speaking || voice.loading
                ? t("screens.speech_coach.pronounce.stop_recording")
                : t("screens.speech_coach.read_aloud.play_story")}
            </Text>
          </Pressable>
        </SectionShell>

        {/* ── 5. Daily Speech Games ─────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_games")}
          reason="hub_speech_games"
          onInteract={() => markOnce("hub_speech_games")}
          title={t("screens.speech_coach.games.section_title")}
          icon="game-controller"
        >
          <View style={{ gap: 10 }}>
            {SPEECH_GAMES.map((g) => (
              <View
                key={g.id}
                style={[s.row, { backgroundColor: c.card, borderColor: c.border, alignItems: "flex-start" }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowTitle, { color: c.foreground }]}>
                    {t(g.i18nKeyTitle)}
                  </Text>
                  <Text style={[s.rowHint, { color: c.mutedForeground }]}>
                    {t(g.i18nKeyDescription)}
                  </Text>
                </View>
                <View style={[s.starsPill, { backgroundColor: `${palette.amber500}22` }]}>
                  <Text style={{ color: palette.amber700, fontWeight: "800", fontSize: 11 }}>
                    {t("screens.speech_coach.games.stars_other", { count: g.rewardStars })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SectionShell>

        {/* ── 6. Parent Guidance ────────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_guidance")}
          reason="hub_speech_guidance"
          onInteract={() => markOnce("hub_speech_guidance")}
          title={t("screens.speech_coach.guidance.section_title")}
          icon="bulb"
        >
          <View style={{ gap: 12 }}>
            {PARENT_GUIDANCE_CARDS.map((g) => (
              <View
                key={g.id}
                style={[s.guidanceCard, { backgroundColor: c.card, borderColor: c.border }]}
              >
                <Text style={[s.rowTitle, { color: c.foreground, fontSize: 15 }]}>
                  {t(g.i18nKeyTitle)}
                </Text>
                <Text style={[s.rowHint, { color: c.mutedForeground, marginTop: 4 }]}>
                  {t(g.i18nKeyBody)}
                </Text>
                <View style={[s.tipBox, { backgroundColor: `${brand.violet500}12` }]}>
                  <Text style={{ color: brand.violet700, fontWeight: "700", fontSize: 11 }}>
                    {t("screens.speech_coach.guidance.amy_tip_label")}
                  </Text>
                  <Text style={{ color: c.foreground, fontSize: 13, marginTop: 2 }}>
                    {t(g.i18nKeyTip)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </SectionShell>

        {/* ── 7. Emotion & Confidence Builder ─────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_affirmations")}
          reason="hub_speech_affirmations"
          onInteract={() => markOnce("hub_speech_affirmations")}
          title={t("screens.speech_coach.affirmations.section_title")}
          icon="heart"
        >
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.affirmations.intro")}
          </Text>
          <View style={s.affirmationsGrid}>
            {SPEECH_AFFIRMATIONS.map((a) => (
              <View
                key={a.id}
                style={[s.affirmation, { backgroundColor: `${brand.pink500}12`, borderColor: c.border }]}
              >
                <Text style={{ color: c.foreground, fontSize: 13, fontWeight: "600" }}>
                  {t(a.i18nKeyText)}
                </Text>
              </View>
            ))}
          </View>
        </SectionShell>

        {/* ── 8. Progress Reports ───────────────────────────────────── */}
        <SectionShell
          c={c}
          locked={usage.isFeatureLocked("hub_speech_reports")}
          reason="hub_speech_reports"
          onInteract={() => markOnce("hub_speech_reports")}
          title={t("screens.speech_coach.reports.section_title")}
          icon="bar-chart"
        >
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.reports.intro")}
          </Text>
          <View style={{ gap: 8 }}>
            <ReportRow
              c={c}
              label={t("screens.speech_coach.reports.improved_sounds")}
              value="m, p, b"
            />
            <ReportRow
              c={c}
              label={t("screens.speech_coach.reports.difficult_sounds")}
              value="r, th"
            />
            <ReportRow
              c={c}
              label={t("screens.speech_coach.reports.vocabulary_growth")}
              value="+12"
            />
            <ReportRow
              c={c}
              label={t("screens.speech_coach.reports.confidence_trend")}
              value="↗︎"
            />
          </View>
          <Pressable
            disabled
            style={[s.fullBtn, { backgroundColor: c.muted, opacity: 0.6 }]}
            accessibilityState={{ disabled: true }}
          >
            <Ionicons name="document-outline" size={16} color={c.mutedForeground} />
            <Text style={[s.fullBtnText, { color: c.mutedForeground }]}>
              {t("screens.speech_coach.reports.download_pdf")}
            </Text>
          </Pressable>
          <Text style={[s.note, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.reports.pdf_coming_soon")}
          </Text>
        </SectionShell>

        {/* ── 9. Expert Support placeholder ────────────────────────── */}
        {/* Free action — waitlist join is intentionally NOT premium-gated. */}
        <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionIcon, { backgroundColor: `${brand.violet500}18` }]}>
              <Ionicons name="people" size={18} color={brand.violet600} />
            </View>
            <Text style={[s.sectionTitle, { color: c.foreground }]}>
              {t("screens.speech_coach.expert.section_title")}
            </Text>
          </View>
          <View style={[s.comingSoonBadge, { backgroundColor: `${palette.amber500}22` }]}>
            <Text style={{ color: palette.amber700, fontWeight: "800", fontSize: 11 }}>
              {t("screens.speech_coach.expert.coming_soon_badge")}
            </Text>
          </View>
          <Text style={[s.intro, { color: c.mutedForeground }]}>
            {t("screens.speech_coach.expert.intro")}
          </Text>
          <Pressable
            onPress={() => { if (!waitlistJoined) joinWaitlist.mutate(); }}
            disabled={waitlistJoined || joinWaitlist.isPending}
            style={[
              s.fullBtn,
              { backgroundColor: waitlistJoined ? c.muted : brand.violet500 },
            ]}
          >
            <Ionicons
              name={waitlistJoined ? "checkmark" : "mail"}
              size={16}
              color={waitlistJoined ? c.mutedForeground : "#FFFFFF" /* audit-ok: button glyph on filled brand */}
            />
            <Text
              style={[
                s.fullBtnText,
                { color: waitlistJoined ? c.mutedForeground : "#FFFFFF" /* audit-ok: button text on filled brand */ },
              ]}
            >
              {joinWaitlist.isPending
                ? t("screens.speech_coach.expert.joining")
                : waitlistJoined
                ? t("screens.speech_coach.expert.joined")
                : t("screens.speech_coach.expert.join_waitlist")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────

type Colors = ReturnType<typeof useColors>;

function SectionShell({
  c,
  locked,
  reason,
  onInteract,
  title,
  icon,
  testID,
  children,
}: {
  c: Colors;
  locked: boolean;
  reason: string;
  /** Fired on the FIRST touch within the section content (any tap or scroll
   *  start). The screen wraps this in `markOnce` so a given premium feature
   *  is only consumed by an explicit interaction, never by initial render. */
  onInteract: () => void;
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  testID?: string;
  children: React.ReactNode;
}) {
  return (
    <LockedBlock locked={locked} reason={reason} radius={18}>
      <View
        testID={testID}
        onTouchStart={() => {
          if (!locked) onInteract();
        }}
        style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}
      >
        <View style={s.sectionHeader}>
          <View style={[s.sectionIcon, { backgroundColor: `${brand.violet500}18` }]}>
            <Ionicons name={icon} size={18} color={brand.violet600} />
          </View>
          <Text style={[s.sectionTitle, { color: c.foreground }]}>{title}</Text>
        </View>
        <View style={{ gap: 10 }}>{children}</View>
      </View>
    </LockedBlock>
  );
}

function DashboardCard({
  c,
  childAgeMonths,
  band,
  t,
}: {
  c: Colors;
  childAgeMonths: number;
  band: SpeechAgeBand;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const speechAgeLabel = childAgeMonths > 0
    ? t(`screens.speech_coach.milestones.tab.${band}`)
    : t("screens.speech_coach.milestones.tab.1y");
  return (
    <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionIcon, { backgroundColor: `${brand.pink500}18` }]}>
          <Ionicons name="stats-chart" size={18} color={brand.pink500} />
        </View>
        <Text style={[s.sectionTitle, { color: c.foreground }]}>
          {t("screens.speech_coach.dashboard.title")}
        </Text>
      </View>
      <View style={s.statsGrid}>
        <DashStat
          c={c}
          label={t("screens.speech_coach.dashboard.speech_age")}
          value={speechAgeLabel}
        />
        <DashStat
          c={c}
          label={t("screens.speech_coach.dashboard.weekly_score")}
          value="0%"
        />
        <DashStat
          c={c}
          label={t("screens.speech_coach.dashboard.daily_streak")}
          value={t("screens.speech_coach.dashboard.streak_days_other", { count: 0 })}
        />
        <DashStat
          c={c}
          label={t("screens.speech_coach.dashboard.confidence")}
          value={t("screens.speech_coach.dashboard.confidence_low")}
        />
      </View>
      <Text style={[s.note, { color: c.mutedForeground }]}>
        {t("screens.speech_coach.dashboard.milestones_completed", { done: 0, total: 4 })}
      </Text>
    </View>
  );
}

function DashStat({ c, label, value }: { c: Colors; label: string; value: string }) {
  return (
    <View style={[s.dashStat, { backgroundColor: c.muted }]}>
      <Text style={{ color: c.mutedForeground, fontSize: 11, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: c.foreground, fontSize: 16, fontWeight: "800", marginTop: 4 }}>
        {value}
      </Text>
    </View>
  );
}

function ReportRow({ c, label, value }: { c: Colors; label: string; value: string }) {
  return (
    <View style={[s.row, { backgroundColor: c.muted, borderColor: c.border }]}>
      <Text style={[s.rowTitle, { color: c.foreground, fontSize: 13 }]}>{label}</Text>
      <Text style={{ color: c.foreground, fontWeight: "800", fontSize: 13 }}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)", // audit-ok: translucent on gradient
  },
  headerTitle: {
    color: "#FFFFFF", // audit-ok: header title on gradient
    fontSize: 20,
    fontWeight: "800",
  },
  headerSub: {
    color: "rgba(255,255,255,0.86)", // audit-ok: header subtitle on gradient
    fontSize: 12,
    marginTop: 2,
  },
  headerEmoji: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)", // audit-ok: chip on gradient
  },
  section: {
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000", // audit-ok: shadow color
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", flex: 1 },
  intro: { fontSize: 13, lineHeight: 18 },
  tabsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { fontSize: 14, fontWeight: "700" },
  rowHint: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  starsPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  miniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  miniBtnText: {
    color: "#FFFFFF", // audit-ok: button text on filled brand
    fontWeight: "700",
    fontSize: 12,
  },
  fullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  fullBtnText: {
    color: "#FFFFFF", // audit-ok: button text on filled brand
    fontWeight: "800",
    fontSize: 14,
  },
  note: { fontSize: 12, lineHeight: 16, fontStyle: "italic" },
  storyCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  storyTitle: { fontSize: 15, fontWeight: "800" },
  storyBody: { fontSize: 13, lineHeight: 18 },
  guidanceCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tipBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  affirmationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  affirmation: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: "47%",
    flexGrow: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dashStat: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: 10,
    borderRadius: 12,
  },
  comingSoonBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
