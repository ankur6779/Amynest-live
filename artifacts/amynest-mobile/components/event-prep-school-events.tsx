import { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Image, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TFunction } from "i18next";
import {
  EVENT_CATEGORIES,
  charactersByCategory,
  recommendForChild,
  getTimelyCategory,
  COUNTRY_CONFIGS,
  getEventImages,
  type QuickActionType,
  type QuickActionResult,
  type EventCategoryId,
  type EventPrepCountry,
  type CountryConfig,
  type SchoolEvent,
  type UpcomingEvent,
} from "@workspace/event-prep";
import { brand, palette } from "@/constants/colors";
import { countdownLabel } from "./event-prep-countdown";

export type EventPrepChild = { id: number; name: string; age: number; ageMonths?: number };

const COUNTRY_KEY = "eventPrepCountry";

export async function loadEventPrepCountry(): Promise<EventPrepCountry | null> {
  try {
    const v = await AsyncStorage.getItem(COUNTRY_KEY);
    if (v && v in COUNTRY_CONFIGS) return v as EventPrepCountry;
  } catch { /* ignore */ }
  return null;
}

export async function saveEventPrepCountry(c: EventPrepCountry) {
  try { await AsyncStorage.setItem(COUNTRY_KEY, c); } catch { /* ignore */ }
}

interface HomeProps {
  child: EventPrepChild;
  country: EventPrepCountry;
  countryInfo: CountryConfig;
  nextEvent: UpcomingEvent | null;
  upcoming: UpcomingEvent[];
  visibleEvents: SchoolEvent[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onCountryChange: (c: EventPrepCountry) => void;
  onGenerator: () => void;
  onLastMinute: () => void;
  onEventOpen: (id: string) => void;
  onCharacterOpen: (id: string) => void;
  onCategoryOpen: (id: string) => void;
  t: TFunction;
}

export function MobileEventPrepHome({
  child, country, countryInfo, nextEvent, upcoming, visibleEvents,
  searchQuery, setSearchQuery, onCountryChange, onGenerator, onLastMinute,
  onEventOpen, onCharacterOpen, onCategoryOpen, t,
}: HomeProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const countryOptions = Object.keys(COUNTRY_CONFIGS) as EventPrepCountry[];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 64, gap: 10 }}>
      <Text style={S.h1}>{t("screens.event_prep.header_title")}</Text>
      <Text style={S.sub}>{t("screens.event_prep.home_subtitle", { name: child.name })}</Text>

      <Pressable onPress={() => setPickerOpen(!pickerOpen)} style={S.countryBtn}>
        <Ionicons name="location-outline" size={14} color={palette.gray600} />
        <Text style={S.countryText}>{countryInfo.flag} {countryInfo.label}</Text>
        <Text style={S.countryChange}>{t("screens.event_prep.change_country")}</Text>
      </Pressable>

      {pickerOpen && (
        <View style={S.chipWrap}>
          {countryOptions.map((code) => (
            <Pressable
              key={code}
              onPress={() => { onCountryChange(code); setPickerOpen(false); }}
              style={[S.chip, code === country && S.chipActive]}
            >
              <Text style={[S.chipText, code === country && S.chipTextActive]}>
                {COUNTRY_CONFIGS[code].flag} {COUNTRY_CONFIGS[code].label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={S.searchWrap}>
        <Ionicons name="search" size={16} color={palette.gray400} style={{ marginRight: 8 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t("screens.event_prep.search_placeholder")}
          placeholderTextColor={palette.gray400}
          style={S.searchInput}
        />
      </View>

      {nextEvent && !searchQuery && (
        <Pressable onPress={() => onEventOpen(nextEvent.event.id)}>
          <LinearGradient colors={nextEvent.event.accent} style={S.nextHero}>
            <Text style={S.nextLabel}>{t("screens.event_prep.upcoming_near_you")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
              <Text style={{ fontSize: 36 }}>{nextEvent.event.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.nextTitle}>{nextEvent.event.name}</Text>
                <Text style={S.nextDate}>{nextEvent.event.dateLabel}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={S.countdown}>{countdownLabel(nextEvent.daysUntil, t)}</Text>
                <Text style={S.nextSub}>{t("screens.event_prep.next_event")}</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      )}

      {!searchQuery && upcoming.length > 0 && (
        <>
          <Text style={S.h2}>{t("screens.event_prep.all_events")}</Text>
          {upcoming.map(({ event, daysUntil }) => (
            <Pressable key={event.id} onPress={() => onEventOpen(event.id)} style={S.eventRow}>
              <LinearGradient colors={event.accent} style={S.eventIcon}>
                <Text style={{ fontSize: 22 }}>{event.emoji}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={S.eventName}>{event.name}</Text>
                <Text style={S.eventMeta}>{event.dateLabel}</Text>
              </View>
              <Text style={S.eventBadge}>{countdownLabel(daysUntil, t)}</Text>
              <Ionicons name="chevron-forward" size={18} color={palette.gray400} />
            </Pressable>
          ))}
        </>
      )}

      {searchQuery && visibleEvents.map((event) => (
        <Pressable key={event.id} onPress={() => onEventOpen(event.id)} style={S.eventRow}>
          <LinearGradient colors={event.accent} style={S.eventIcon}>
            <Text style={{ fontSize: 22 }}>{event.emoji}</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={S.eventName}>{event.name}</Text>
            <Text style={S.eventMeta}>{event.category}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.gray400} />
        </Pressable>
      ))}

      <Pressable onPress={onGenerator} style={S.lastMinHero}>
        <LinearGradient colors={[brand.purple600, palette.pink600, palette.orange500]} style={S.heroGrad}>
          <View style={S.heroIcon}><Ionicons name="sparkles" size={26} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={S.heroTitle}>{t("screens.event_prep.amy_generator_title")}</Text>
            <Text style={S.heroSub}>{t("screens.event_prep.amy_generator_sub")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>

      <Pressable onPress={onLastMinute} style={S.lastMinHero}>
        <LinearGradient colors={[palette.amber400, palette.orange500, brand.pink500]} style={S.heroGrad}>
          <View style={S.heroIcon}><Ionicons name="flash" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={S.heroTitle}>{t("screens.event_prep.last_minute_title")}</Text>
            <Text style={S.heroSub}>{t("screens.event_prep.last_minute_sub")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </LinearGradient>
      </Pressable>

      <Text style={S.h2}>{t("screens.event_prep.amy_picks", { name: child.name })}</Text>
      <AmyRecs child={child} country={country} onOpen={onCharacterOpen} t={t} />

      <Text style={S.h2}>{t("screens.event_prep.browse_by_event")}</Text>
      {EVENT_CATEGORIES.map((cat) => (
        <Pressable key={cat.id} onPress={() => onCategoryOpen(cat.id)} style={S.catCard}>
          <LinearGradient colors={cat.accent} style={S.catGrad}>
            <Text style={S.catEmoji}>{cat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.catTitle}>{cat.title}</Text>
              <Text style={S.catBlurb}>{cat.blurb}</Text>
            </View>
            <Text style={S.catCount}>{charactersByCategory(cat.id).length}</Text>
          </LinearGradient>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function AmyRecs({
  child, country, onOpen, t,
}: { child: EventPrepChild; country: EventPrepCountry; onOpen: (id: string) => void; t: TFunction }) {
  const category = getTimelyCategory(country);
  const recs = recommendForChild(category, child.age);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      {recs.map((ch) => (
        <Pressable key={ch.id} onPress={() => onOpen(ch.id)} style={S.recCard}>
          <Text style={{ fontSize: 32 }}>{ch.emoji}</Text>
          <Text style={S.recName}>{ch.character}</Text>
          <Text style={S.recMeta}>{ch.timeMinutes} {t("screens.event_prep.minutes_short")} · {ch.difficulty}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function checklistKey(eventId: string, childId: number) {
  return `eventPrepChecklist:${eventId}:${childId}`;
}

interface DetailProps {
  ev: SchoolEvent;
  child: EventPrepChild;
  onBack: () => void;
  onOpenCostumes: (cat: EventCategoryId) => void;
  onSpeak: (id: string, text: string) => void;
  speakingId: string | null;
  t: TFunction;
  quickActionLoading?: QuickActionType | null;
  quickActionResult?: QuickActionResult | null;
  onQuickAction?: (type: QuickActionType) => void;
  onClearQuickAction?: () => void;
  customTheme?: string;
  onCustomThemeChange?: (v: string) => void;
}

export function MobileEventDetail({
  ev, child, onBack, onOpenCostumes, onSpeak, speakingId, t,
  quickActionLoading, quickActionResult, onQuickAction, onClearQuickAction,
  customTheme, onCustomThemeChange,
}: DetailProps) {
  const key = checklistKey(ev.id, child.id);
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(key).then((raw) => {
      if (raw) try { setChecked(JSON.parse(raw)); } catch { /* ignore */ }
    });
  }, [key]);

  useEffect(() => {
    AsyncStorage.setItem(key, JSON.stringify(checked)).catch(() => {});
  }, [checked, key]);

  const done = ev.checklist.filter((_, i) => checked[i]).length;
  const images = getEventImages(ev.id);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 64 }}>
      <Pressable onPress={onBack} style={S.backRow}>
        <Ionicons name="arrow-back" size={20} color={palette.gray700} />
        <Text style={S.backText}>{t("screens.event_prep.back")}</Text>
      </Pressable>

      {images?.banner && (
        <Image source={{ uri: images.banner }} style={S.bannerImg} resizeMode="cover" />
      )}

      <LinearGradient colors={ev.accent} style={S.detailHero}>
        <Text style={{ fontSize: 56 }}>{ev.emoji}</Text>
        <Text style={S.detailTitle}>{ev.name}</Text>
        <Text style={S.detailTag}>{ev.dateLabel} · {ev.category}</Text>
      </LinearGradient>

      <DetailCard title={t("screens.event_prep.event_overview")}>
        <Text style={S.body}>{ev.overview}</Text>
      </DetailCard>

      {onQuickAction && (
        <View style={S.quickCard}>
          <Text style={S.detailHead}>{t("screens.event_prep.quick_actions")}</Text>
          {onCustomThemeChange && (
            <TextInput
              value={customTheme ?? ""}
              onChangeText={onCustomThemeChange}
              placeholder={t("screens.event_prep.custom_theme_placeholder")}
              placeholderTextColor={palette.gray400}
              style={S.themeInput}
            />
          )}
          <View style={S.quickRow}>
            {(["speech", "costume", "checklist"] as QuickActionType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => onQuickAction(type)}
                disabled={!!quickActionLoading}
                style={[S.quickBtn, quickActionLoading === type && { opacity: 0.6 }]}
              >
                {quickActionLoading === type ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={S.quickBtnText}>
                    {type === "speech" ? t("screens.event_prep.quick_speech")
                      : type === "costume" ? t("screens.event_prep.quick_costume")
                      : t("screens.event_prep.quick_checklist")}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
          {quickActionResult && (
            <View style={S.quickResult}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={S.detailHead}>{quickActionResult.title}</Text>
                {quickActionResult.source === "ai" && (
                  <Text style={S.aiBadge}>{t("screens.event_prep.amy_ai_badge")}</Text>
                )}
                {onClearQuickAction && (
                  <Pressable onPress={onClearQuickAction} style={{ marginLeft: "auto" }}>
                    <Text style={{ color: palette.gray500 }}>✕</Text>
                  </Pressable>
                )}
              </View>
              <Text style={S.body}>{quickActionResult.intro}</Text>
              {quickActionResult.items.map((item, i) => (
                <Text key={i} style={S.bullet}>• {item}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {images && (images.costumes.length > 0 || images.activities.length > 0) && (
        <DetailCard title={t("screens.event_prep.visual_inspiration")}>
          {images.costumes.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {images.costumes.map((uri, i) => (
                <Image key={i} source={{ uri }} style={S.thumbImg} resizeMode="cover" />
              ))}
            </ScrollView>
          )}
          {images.activities.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
              {images.activities.map((uri, i) => (
                <Image key={i} source={{ uri }} style={S.thumbImg} resizeMode="cover" />
              ))}
            </ScrollView>
          )}
        </DetailCard>
      )}

      <DetailCard title={t("screens.event_prep.what_to_prepare")}>
        {ev.whatToPrepare.map((item, i) => (
          <Text key={i} style={S.bullet}>• {item}</Text>
        ))}
      </DetailCard>

      {ev.costumeCategory && (
        <Pressable onPress={() => onOpenCostumes(ev.costumeCategory!)} style={S.costumeCta}>
          <Text style={S.costumeCtaTitle}>{t("screens.event_prep.costume_ideas")}</Text>
          <Text style={S.costumeCtaSub}>{t("screens.event_prep.view_costumes")} →</Text>
        </Pressable>
      )}

      <DetailCard title={t("screens.event_prep.speech_lines")}>
        {ev.speechIdeas.map((line, i) => (
          <View key={i} style={S.speechBox}>
            <Text style={S.speechQuote}>&ldquo;{line}&rdquo;</Text>
            <Pressable onPress={() => onSpeak(`${ev.id}-s-${i}`, line)} style={S.speechBtn}>
              <Ionicons name={speakingId === `${ev.id}-s-${i}` ? "volume-mute" : "volume-high"} size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
      </DetailCard>

      <DetailCard title={t("screens.event_prep.activities")}>
        {ev.activities.map((a, i) => (
          <Text key={i} style={S.bullet}>{i + 1}. {a}</Text>
        ))}
      </DetailCard>

      <DetailCard title={t("screens.event_prep.prep_timeline")}>
        {ev.prepTimeline.map((step) => (
          <View key={step.daysBefore} style={S.timelineRow}>
            <View style={S.timelineBadge}>
              <Text style={S.timelineBadgeText}>
                {step.daysBefore === 0
                  ? t("screens.event_prep.timeline_event_day")
                  : t("screens.event_prep.timeline_day", { days: step.daysBefore })}
              </Text>
            </View>
            <Text style={[S.body, { flex: 1 }]}>{step.label}</Text>
          </View>
        ))}
      </DetailCard>

      <DetailCard
        title={t("screens.event_prep.checklist")}
        extra={t("screens.event_prep.checklist_progress", { done, total: ev.checklist.length })}
      >
        {ev.checklist.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => setChecked((p) => ({ ...p, [i]: !p[i] }))}
            style={[S.checkRow, checked[i] && S.checkRowDone]}
          >
            <Ionicons
              name={checked[i] ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={checked[i] ? palette.pink600 : palette.gray400}
            />
            <Text style={[S.body, checked[i] && S.checkDoneText]}>{item}</Text>
          </Pressable>
        ))}
      </DetailCard>
    </ScrollView>
  );
}

function DetailCard({
  title, children, extra,
}: { title: string; children: React.ReactNode; extra?: string }) {
  return (
    <View style={S.detailCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={S.detailHead}>{title}</Text>
        {extra ? <Text style={S.detailExtra}>{extra}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const S = {
  h1: { fontSize: 22, fontWeight: "800" as const, color: palette.pink900, marginTop: 4 },
  h2: { fontSize: 15, fontWeight: "800" as const, color: palette.pink900, marginTop: 16, marginBottom: 4 },
  sub: { fontSize: 13, color: palette.gray500, marginBottom: 6 },
  countryBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, alignSelf: "flex-start" as const, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: palette.pink200, backgroundColor: "#fff" },
  countryText: { fontSize: 13, fontWeight: "700" as const, color: palette.gray800 },
  countryChange: { fontSize: 11, color: palette.gray500 },
  chipWrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: palette.pink200, backgroundColor: "#fff" },
  chipActive: { backgroundColor: palette.pink600, borderColor: palette.pink600 },
  chipText: { fontSize: 12, fontWeight: "600" as const, color: palette.gray800 },
  chipTextActive: { color: "#fff" },
  searchWrap: { flexDirection: "row" as const, alignItems: "center" as const, backgroundColor: "#fff", borderRadius: 999, borderWidth: 1, borderColor: palette.pink200, paddingHorizontal: 14, paddingVertical: 10, marginTop: 4 },
  searchInput: { flex: 1, fontSize: 14, color: palette.gray800 },
  nextHero: { borderRadius: 18, padding: 16, marginTop: 8 },
  nextLabel: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "800" as const, textTransform: "uppercase" as const },
  nextTitle: { color: "#fff", fontSize: 18, fontWeight: "800" as const },
  nextDate: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  countdown: { color: "#fff", fontSize: 20, fontWeight: "900" as const },
  nextSub: { color: "rgba(255,255,255,0.85)", fontSize: 10 },
  eventRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, backgroundColor: "#fff", borderRadius: 14, padding: 12, marginTop: 8, borderWidth: 1, borderColor: palette.pink200 },
  eventIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center" as const, justifyContent: "center" as const },
  eventName: { fontSize: 14, fontWeight: "800" as const, color: palette.gray800 },
  eventMeta: { fontSize: 11, color: palette.gray500, marginTop: 2 },
  eventBadge: { fontSize: 10, fontWeight: "800" as const, color: palette.pink600, marginRight: 4 },
  lastMinHero: { borderRadius: 18, overflow: "hidden" as const, marginTop: 8 },
  heroGrad: { flexDirection: "row" as const, alignItems: "center" as const, gap: 14, padding: 16 },
  heroIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center" as const, justifyContent: "center" as const },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "800" as const },
  heroSub: { color: "rgba(255,255,255,0.95)", fontSize: 12, marginTop: 2 },
  catCard: { borderRadius: 16, overflow: "hidden" as const, marginTop: 8 },
  catGrad: { flexDirection: "row" as const, alignItems: "center" as const, gap: 14, padding: 16 },
  catEmoji: { fontSize: 30 },
  catTitle: { color: "#fff", fontSize: 16, fontWeight: "800" as const },
  catBlurb: { color: "rgba(255,255,255,0.92)", fontSize: 11.5, marginTop: 2 },
  catCount: { color: "#fff", fontSize: 14, fontWeight: "800" as const, backgroundColor: "rgba(0,0,0,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  recCard: { backgroundColor: "#fff", borderRadius: 14, padding: 12, width: 130, borderWidth: 1, borderColor: palette.pink200 },
  recName: { fontSize: 13, fontWeight: "800" as const, color: palette.gray800, marginTop: 4 },
  recMeta: { fontSize: 10, color: palette.gray500, marginTop: 2 },
  backRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginBottom: 4 },
  backText: { fontSize: 14, color: palette.gray700, fontWeight: "600" as const },
  bannerImg: { width: "100%", height: 160, borderRadius: 16, marginTop: 8 },
  thumbImg: { width: 120, height: 90, borderRadius: 12 },
  quickCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1, borderColor: palette.pink200, gap: 10 },
  quickRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  quickBtn: { backgroundColor: palette.pink600, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  quickBtnText: { color: "#fff", fontSize: 11, fontWeight: "800" as const },
  quickResult: { marginTop: 4, padding: 10, borderRadius: 12, backgroundColor: palette.pink50, borderWidth: 1, borderColor: palette.pink200 },
  aiBadge: { fontSize: 10, fontWeight: "800" as const, color: palette.pink600, backgroundColor: palette.pink100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  themeInput: { borderWidth: 1, borderColor: palette.pink200, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, fontSize: 13, color: palette.gray800, backgroundColor: "#fff" },
  detailHero: { borderRadius: 20, padding: 24, alignItems: "center" as const, marginTop: 8 },
  detailTitle: { color: "#fff", fontSize: 22, fontWeight: "800" as const, marginTop: 8 },
  detailTag: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 2 },
  detailCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginTop: 10, borderWidth: 1, borderColor: palette.gray200 },
  detailHead: { fontSize: 15, fontWeight: "800" as const, color: palette.gray800 },
  detailExtra: { fontSize: 11, color: palette.gray500 },
  body: { fontSize: 13.5, color: palette.gray700, lineHeight: 20 },
  bullet: { fontSize: 13.5, color: palette.gray700, lineHeight: 22, marginTop: 4 },
  costumeCta: { backgroundColor: palette.pink50, borderRadius: 14, padding: 14, marginTop: 10, borderWidth: 1, borderColor: palette.pink200 },
  costumeCtaTitle: { fontSize: 15, fontWeight: "800" as const, color: palette.pink800 },
  costumeCtaSub: { fontSize: 12, color: palette.pink600, marginTop: 4 },
  speechBox: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8, backgroundColor: palette.pink50, borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: palette.pink200 },
  speechQuote: { flex: 1, fontSize: 14, fontStyle: "italic" as const, color: palette.gray800 },
  speechBtn: { backgroundColor: palette.pink600, padding: 8, borderRadius: 999 },
  timelineRow: { flexDirection: "row" as const, gap: 10, marginTop: 8, alignItems: "flex-start" as const },
  timelineBadge: { backgroundColor: palette.pink600, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timelineBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" as const },
  checkRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: palette.gray200, marginTop: 8 },
  checkRowDone: { backgroundColor: palette.pink50, borderColor: palette.pink200 },
  checkDoneText: { textDecorationLine: "line-through" as const, color: palette.gray500 },
};
