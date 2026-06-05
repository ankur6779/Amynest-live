import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import {
  EVENT_CATEGORIES,
  charactersByCategory,
  recommendForChild,
  getTimelyCategory,
  COUNTRY_CONFIGS,
  getEventImages,
  type EventImages,
  type QuickActionType,
  type QuickActionResult,
  type EventCategory,
  type EventCategoryId,
  type EventCharacter,
  type EventPrepCountry,
  type CountryConfig,
  type SchoolEvent,
  type UpcomingEvent,
} from "@workspace/event-prep";
import { PremiumImage } from "@/components/premium-ux/premium-image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  EVENT_PREP_ACCENT,
  EVENT_PREP_ACTION_ICON,
  EVENT_PREP_ACTION_TILE,
  EVENT_PREP_CHIP_ACTIVE,
  EVENT_PREP_CHIP_INACTIVE,
  EVENT_PREP_SEARCH,
  EVENT_PREP_SECTION_LABEL,
  EVENT_PREP_SECTION_TITLE,
  eventPrepGlassCard,
  eventPrepPanelCard,
} from "@/lib/event-prep-zone-theme";
import {
  Volume2, VolumeX, Clock, Sparkles, Zap, ChevronRight, Wand2,
  Search, MapPin, Calendar, CheckCircle2, Circle, Loader2, ImageIcon, Share2,
} from "lucide-react";
import { EventPrepCountdownDisplay } from "@/components/event-prep/event-prep-countdown-display";
import { EventPrepPrepRing } from "@/components/event-prep/event-prep-prep-ring";
import {
  EventPrepSiblingCompare,
  type EventPrepChildWithPhoto,
} from "@/components/event-prep/event-prep-sibling-compare";
import { EventPrepPhotoMoment } from "@/components/event-prep/event-prep-photo-moment";
import {
  EventPrepReminderBanner,
  EventPrepSmartTools,
} from "@/components/event-prep/event-prep-smart-tools";
import { ConfettiBurst, playFx } from "@/components/study-engagement";
import { buildMaterialsList, shareTextList } from "@/lib/event-prep-share";

export type EventPrepChild = { id: number; name: string; age: number; ageMonths?: number; photoUrl?: string | null };

export function countdownLabel(daysUntil: number, t: TFunction): string {
  if (daysUntil === 0) return t("screens.event_prep.countdown_today");
  if (daysUntil === 1) return t("screens.event_prep.countdown_tomorrow");
  if (daysUntil <= 7) return t("screens.event_prep.countdown_days", { count: daysUntil });
  if (daysUntil <= 30) return t("screens.event_prep.countdown_weeks", { count: Math.ceil(daysUntil / 7) });
  const months = Math.max(1, Math.round(daysUntil / 30));
  return t("screens.event_prep.countdown_months", { count: months });
}

interface HomeProps {
  child: EventPrepChild;
  country: EventPrepCountry;
  countryInfo: CountryConfig;
  countryPickerOpen: boolean;
  setCountryPickerOpen: (v: boolean) => void;
  setCountry: (c: EventPrepCountry) => void;
  nextEvent: UpcomingEvent | null;
  upcoming: UpcomingEvent[];
  visibleEvents: SchoolEvent[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onGenerator: () => void;
  onLastMinute: () => void;
  onEventOpen: (eventId: string) => void;
  onCharacterOpen: (characterId: string) => void;
  onCategoryOpen: (categoryId: EventCategoryId) => void;
  allChildren?: EventPrepChildWithPhoto[];
  onSiblingCharacterOpen?: (childId: number, characterId: string) => void;
  t: TFunction;
}

export function EventPrepHomeView({
  child, country, countryInfo, countryPickerOpen, setCountryPickerOpen,
  setCountry, nextEvent, upcoming, visibleEvents, searchQuery, setSearchQuery,
  onGenerator, onLastMinute, onEventOpen, onCharacterOpen, onCategoryOpen,
  allChildren, onSiblingCharacterOpen,
  t,
}: HomeProps) {
  const countryOptions = Object.keys(COUNTRY_CONFIGS) as EventPrepCountry[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCountryPickerOpen(!countryPickerOpen)}
          className={cn(
            EVENT_PREP_CHIP_INACTIVE,
            "text-sm font-semibold",
            countryPickerOpen && "border-amber-400/40",
          )}
        >
          <MapPin className="h-3.5 w-3.5" />
          {countryInfo.flag} {countryInfo.label}
          <span className="text-xs text-muted-foreground">· {t("screens.event_prep.change_country")}</span>
        </button>
      </div>

      {countryPickerOpen && (
        <div className="flex flex-wrap gap-2">
          {countryOptions.map((code) => {
            const cfg = COUNTRY_CONFIGS[code];
            return (
              <button
                key={code}
                type="button"
                onClick={() => setCountry(code)}
                className={code === country ? EVENT_PREP_CHIP_ACTIVE : EVENT_PREP_CHIP_INACTIVE}
              >
                {cfg.flag} {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("screens.event_prep.search_placeholder")}
          className={EVENT_PREP_SEARCH}
        />
      </div>

      {nextEvent && !searchQuery && (
        <NextEventHeroCard
          nextEvent={nextEvent}
          onOpen={() => onEventOpen(nextEvent.event.id)}
          t={t}
        />
      )}

      {!searchQuery && upcoming.length > 0 && (
        <>
          <h2 className={cn(EVENT_PREP_SECTION_TITLE, "mt-2")}>{t("screens.event_prep.all_events")}</h2>
          <div className="grid sm:grid-cols-2 gap-3 event-prep-stagger">
            {upcoming.map(({ event, daysUntil, nextDate }) => (
              <SchoolEventCard
                key={event.id}
                event={event}
                nextDate={nextDate}
                daysUntil={daysUntil}
                t={t}
                onOpen={() => onEventOpen(event.id)}
              />
            ))}
          </div>
        </>
      )}

      {searchQuery && (
        <>
          <h2 className={cn(EVENT_PREP_SECTION_TITLE, "mt-2")}>
            {t("screens.event_prep.country_events_for", { country: countryInfo.label })}
          </h2>
          {visibleEvents.length === 0 ? (
            <div className={cn(eventPrepPanelCard(), "p-6 text-center text-muted-foreground")}>
              {t("screens.event_prep.no_matches")}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {visibleEvents.map((event) => (
                <SchoolEventCard key={event.id} event={event} onOpen={() => onEventOpen(event.id)} />
              ))}
            </div>
          )}
        </>
      )}

      <button type="button" onClick={onGenerator} className={cn(EVENT_PREP_ACTION_TILE, "mt-2 w-full text-left")}>
        <div className="flex items-center gap-4 p-5">
          <div className={EVENT_PREP_ACTION_ICON}>
            <Wand2 className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand font-bold text-lg text-foreground">{t("screens.event_prep.amy_generator_title")}</h3>
            <p className="text-sm text-muted-foreground/85">{t("screens.event_prep.amy_generator_sub")}</p>
          </div>
          <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" />
        </div>
      </button>

      <button type="button" onClick={onLastMinute} className={cn(EVENT_PREP_ACTION_TILE, "w-full text-left")}>
        <div className="flex items-center gap-4 p-5">
          <div className={EVENT_PREP_ACTION_ICON}>
            <Zap className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand font-bold text-lg text-foreground">{t("screens.event_prep.last_minute_title")}</h3>
            <p className="text-sm text-muted-foreground/85">{t("screens.event_prep.last_minute_sub")}</p>
          </div>
          <ChevronRight className="h-6 w-6 shrink-0 text-muted-foreground" />
        </div>
      </button>

      <h2 className={cn(EVENT_PREP_SECTION_TITLE, "mt-2 flex items-center gap-2")}>
        <Sparkles className="h-4 w-4 text-amber-300 hub-sparkle-glow" />
        {t("screens.event_prep.amy_picks", { name: child.name })}
      </h2>
      <AmyRecs child={child} country={country} onOpen={onCharacterOpen} t={t} />

      {allChildren && allChildren.length > 1 && onSiblingCharacterOpen && (
        <EventPrepSiblingCompare
          children={allChildren}
          country={country}
          onOpenCharacter={onSiblingCharacterOpen}
          t={t}
        />
      )}

      <h2 className={cn(EVENT_PREP_SECTION_TITLE, "mt-4")}>{t("screens.event_prep.browse_by_event")}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 event-prep-stagger">
        {EVENT_CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            count={charactersByCategory(cat.id).length}
            onOpen={() => onCategoryOpen(cat.id)}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function NextEventHeroCard({
  nextEvent,
  onOpen,
  t,
}: {
  nextEvent: UpcomingEvent;
  onOpen: () => void;
  t: TFunction;
}) {
  const images = getEventImages(nextEvent.event.id);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={cn(
        eventPrepGlassCard(EVENT_PREP_ACCENT),
        "mt-2 overflow-hidden event-prep-card-lift",
      )}
    >
      {images?.banner && (
        <div className="relative h-28 w-full overflow-hidden">
          <LazyEventImage src={images.banner} alt="" className="h-full w-full object-cover" />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${nextEvent.event.accent[0]}cc, ${nextEvent.event.accent[1]}99)`,
            }}
          />
        </div>
      )}
      <div
        className="p-5 text-primary-foreground"
        style={
          images?.banner
            ? undefined
            : { background: `linear-gradient(135deg, ${nextEvent.event.accent[0]}, ${nextEvent.event.accent[1]})` }
        }
      >
        <div className="text-xs font-bold uppercase tracking-wide opacity-90 flex items-center gap-1 mb-3">
          <Calendar className="h-3 w-3" /> {t("screens.event_prep.upcoming_near_you")}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{nextEvent.event.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="font-quicksand font-bold text-xl">{nextEvent.event.name}</div>
            <div className="text-sm opacity-90">{nextEvent.event.dateLabel}</div>
          </div>
          <EventPrepCountdownDisplay
            nextDate={nextEvent.nextDate}
            daysUntil={nextEvent.daysUntil}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}

function SchoolEventCard({
  event, nextDate, daysUntil, t, onOpen,
}: { event: SchoolEvent; nextDate: string; daysUntil: number; t: TFunction; onOpen: () => void }) {
  const thumb = getEventImages(event.id)?.banner;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={cn(eventPrepGlassCard(EVENT_PREP_ACCENT), "overflow-hidden event-prep-card-lift")}
    >
      {thumb && (
        <LazyEventImage src={thumb} alt="" className="h-16 w-full object-cover opacity-90" />
      )}
      <div className="flex items-center gap-3 p-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: `linear-gradient(135deg, ${event.accent[0]}, ${event.accent[1]})` }}
        >
          {event.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-quicksand font-bold text-sm text-foreground">{event.name}</div>
          <div className="text-xs text-muted-foreground truncate">{event.dateLabel} · {event.category}</div>
        </div>
        <EventPrepCountdownDisplay
          nextDate={nextDate}
          daysUntil={daysUntil}
          t={t}
          variant="compact"
        />
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}

function CategoryCard({
  category, count, onOpen, t,
}: { category: EventCategory; count: number; onOpen: () => void; t: TFunction }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={cn(eventPrepGlassCard(EVENT_PREP_ACCENT), "overflow-hidden")}
    >
      <div
        className="p-5 text-primary-foreground"
        style={{ background: `linear-gradient(135deg, ${category.accent[0]}, ${category.accent[1]})` }}
      >
        <div className="text-4xl mb-1">{category.emoji}</div>
        <div className="font-quicksand font-bold text-lg">{category.title}</div>
      </div>
      <div className="flex items-center justify-between p-3">
        <span className="text-xs text-muted-foreground/85">{category.blurb}</span>
        <span className="text-xs font-semibold text-amber-200/90">{t("screens.event_prep.ideas_count", { count })}</span>
      </div>
    </div>
  );
}

function AmyRecs({
  child, country, onOpen, t,
}: { child: EventPrepChild; country: EventPrepCountry; onOpen: (id: string) => void; t: TFunction }) {
  const category = getTimelyCategory(country);
  const recs = recommendForChild(category, child.age);
  const cat = EVENT_CATEGORIES.find((c) => c.id === category)!;
  return (
    <div className={cn(eventPrepPanelCard(), "p-4")}>
      <p className={cn(EVENT_PREP_SECTION_LABEL, "mb-3 normal-case tracking-normal text-muted-foreground/90")}>
        {t("screens.event_prep.best_matches_prefix")}<strong className="text-foreground">{cat.title}</strong>
        {t("screens.event_prep.best_matches_suffix", { name: child.name, age: child.age })}
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        {recs.map((ch) => (
          <button
            key={ch.id}
            type="button"
            onClick={() => onOpen(ch.id)}
            className={cn(
              "text-left rounded-xl border border-white/[0.08] p-3",
              "bg-gradient-to-br from-white/[0.05] to-white/[0.02]",
              "transition-all duration-[220ms] hover:border-amber-400/35 hover:-translate-y-0.5 active:scale-[0.985]",
            )}
          >
            <div className="text-3xl">{ch.emoji}</div>
            <div className="font-quicksand font-bold text-sm mt-1 text-foreground">{ch.character}</div>
            <div className="text-[11px] text-muted-foreground/85 mt-0.5">
              {ch.timeMinutes} {t("screens.event_prep.minutes_short")} · {ch.difficulty}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function checklistStorageKey(eventId: string, childId: number) {
  return `eventPrepChecklist:${eventId}:${childId}`;
}

interface EventDetailProps {
  ev: SchoolEvent;
  child: EventPrepChild;
  upcoming?: UpcomingEvent | null;
  onBack: () => void;
  onOpenCostumes: (categoryId: EventCategoryId) => void;
  onSpeak: (id: string, text: string) => void;
  speaking: string | null;
  t: TFunction;
  country?: EventPrepCountry;
  quickActionLoading?: QuickActionType | null;
  quickActionResult?: QuickActionResult | null;
  onQuickAction?: (type: QuickActionType) => void;
  onClearQuickAction?: () => void;
  customTheme?: string;
  onCustomThemeChange?: (v: string) => void;
}

export function EventDetailView({
  ev, child, upcoming, onBack, onOpenCostumes, onSpeak, speaking, t,
  country,
  quickActionLoading,
  quickActionResult,
  onQuickAction,
  onClearQuickAction,
  customTheme,
  onCustomThemeChange,
}: EventDetailProps) {
  const storageKey = checklistStorageKey(ev.id, child.id);
  const [checked, setChecked] = useState<Record<number, boolean>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) as Record<number, boolean> : {};
    } catch {
      return {};
    }
  });
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const prevDoneRef = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch { /* ignore */ }
  }, [checked, storageKey]);

  const doneCount = ev.checklist.filter((_, i) => checked[i]).length;
  const totalCount = ev.checklist.length;
  const images = getEventImages(ev.id);
  const nextDate = upcoming?.nextDate ?? "";

  useEffect(() => {
    if (totalCount > 0 && doneCount === totalCount && prevDoneRef.current < totalCount) {
      setConfettiTrigger((n) => n + 1);
      playFx.perfect();
    }
    prevDoneRef.current = doneCount;
  }, [doneCount, totalCount]);

  return (
    <div className="relative space-y-4 pb-16">
      <ConfettiBurst trigger={confettiTrigger} />

      {upcoming && nextDate && (
        <EventPrepReminderBanner
          ev={ev}
          childId={child.id}
          childName={child.name}
          nextDate={nextDate}
          t={t}
        />
      )}

      <EventPrepSmartTools
        ev={ev}
        upcoming={upcoming}
        childId={child.id}
        childName={child.name}
        t={t}
      />

      {images?.banner ? (
        <div className="relative rounded-2xl overflow-hidden shadow-md">
          <LazyEventImage src={images.banner} alt={ev.name} className="w-full h-44 object-cover" />
          <div
            className="absolute inset-0 flex flex-col items-center justify-end pb-4 text-primary-foreground"
            style={{
              background: `linear-gradient(180deg, transparent 20%, ${ev.accent[1]}dd 100%)`,
            }}
          >
            <span className="text-5xl mb-1">{ev.emoji}</span>
            <span className="text-sm font-semibold opacity-95">{ev.category}</span>
            {upcoming && (
              <div className="mt-2">
                <EventPrepCountdownDisplay
                  nextDate={upcoming.nextDate}
                  daysUntil={upcoming.daysUntil}
                  t={t}
                  variant="compact"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-6 text-primary-foreground shadow-lg"
          style={{ background: `linear-gradient(135deg, ${ev.accent[0]}, ${ev.accent[1]})` }}
        >
          <div className="flex items-center justify-center gap-4">
            <div className="text-6xl">{ev.emoji}</div>
            {upcoming && (
              <EventPrepCountdownDisplay
                nextDate={upcoming.nextDate}
                daysUntil={upcoming.daysUntil}
                t={t}
              />
            )}
          </div>
          <div className="text-center text-sm opacity-90 mt-2">{ev.category}</div>
        </div>
      )}

      <EventPrepPhotoMoment
        eventId={ev.id}
        childId={child.id}
        childName={child.name}
        childPhotoUrl={child.photoUrl}
        characterName={ev.name}
        costumeEmoji={ev.emoji}
        accent={ev.accent}
        costumeImageUrl={images?.costumes[0]}
        materials={ev.whatToPrepare}
        t={t}
      />

      <Section title={t("screens.event_prep.event_overview")}>
        <p className="text-sm leading-relaxed">{ev.overview}</p>
      </Section>

      {onQuickAction && (
        <div className={cn(eventPrepPanelCard(), "p-4 space-y-3")}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm">{t("screens.event_prep.quick_actions")}</h3>
            </div>
            {onCustomThemeChange && (
              <Input
                value={customTheme ?? ""}
                onChange={(e) => onCustomThemeChange(e.target.value)}
                placeholder={t("screens.event_prep.custom_theme_placeholder")}
                className={cn(EVENT_PREP_SEARCH, "text-sm")}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {(["speech", "costume", "checklist"] as QuickActionType[]).map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={!!quickActionLoading}
                  onClick={() => onQuickAction(type)}
                >
                  {quickActionLoading === type ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  {type === "speech" && t("screens.event_prep.quick_speech")}
                  {type === "costume" && t("screens.event_prep.quick_costume")}
                  {type === "checklist" && t("screens.event_prep.quick_checklist")}
                </Button>
              ))}
            </div>
            {quickActionResult && (
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{quickActionResult.title}</span>
                  {quickActionResult.source === "ai" && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      {t("screens.event_prep.amy_ai_badge")}
                    </span>
                  )}
                  {onClearQuickAction && (
                    <button type="button" onClick={onClearQuickAction} className="text-xs text-muted-foreground ml-auto">
                      ✕
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{quickActionResult.intro}</p>
                <ul className="text-sm space-y-1 list-disc pl-4">
                  {quickActionResult.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      )}

      {images && (images.costumes.length > 0 || images.activities.length > 0) && (
        <Section title={t("screens.event_prep.visual_inspiration")}>
          {images.costumes.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> {t("screens.event_prep.costume_photos")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {images.costumes.map((src, i) => (
                  <LazyEventImage key={i} src={src} alt="" className="w-full h-24 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}
          {images.activities.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" /> {t("screens.event_prep.activity_photos")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {images.activities.map((src, i) => (
                  <LazyEventImage key={i} src={src} alt="" className="w-full h-24 object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      <Section
        title={t("screens.event_prep.what_to_prepare")}
        extra={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full text-xs"
            onClick={() => void shareTextList(buildMaterialsList(ev.name, child.name, ev.whatToPrepare))}
          >
            <Share2 className="h-3 w-3 mr-1" />
            {t("screens.event_prep.share_shopping_list")}
          </Button>
        }
      >
        <BulletList items={ev.whatToPrepare} />
      </Section>

      {ev.costumeCategory && (
        <Card className="mt-3 border-primary/30">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">{t("screens.event_prep.costume_ideas")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {charactersByCategory(ev.costumeCategory).length} DIY ideas ready
              </p>
            </div>
            <Button size="sm" className="rounded-full" onClick={() => onOpenCostumes(ev.costumeCategory!)}>
              {t("screens.event_prep.view_costumes")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Section title={t("screens.event_prep.speech_lines")}>
        {ev.speechIdeas.map((line, i) => (
          <div key={i} className="mt-3 p-3 rounded-xl bg-muted border border-border">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm italic flex-1">&ldquo;{line}&rdquo;</p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full shrink-0"
                onClick={() => onSpeak(`${ev.id}-speech-${i}`, line)}
              >
                {speaking === `${ev.id}-speech-${i}` ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        ))}
      </Section>

      <Section title={t("screens.event_prep.activities")}>
        <BulletList items={ev.activities} ordered />
      </Section>

      <Section title={t("screens.event_prep.prep_timeline")}>
        <div className="space-y-3 mt-1">
          {ev.prepTimeline.map((step) => (
            <div key={step.daysBefore} className="flex gap-3 items-start">
              <span className="shrink-0 text-[10px] font-black px-2 py-1 rounded-md bg-primary text-primary-foreground">
                {step.daysBefore === 0
                  ? t("screens.event_prep.timeline_event_day")
                  : t("screens.event_prep.timeline_day", { days: step.daysBefore })}
              </span>
              <p className="text-sm pt-0.5">{step.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={t("screens.event_prep.checklist")}
        extra={
          <div className="flex items-center gap-2">
            <EventPrepPrepRing done={doneCount} total={totalCount} size={48} />
            <span className="text-xs text-muted-foreground">
              {t("screens.event_prep.checklist_progress", { done: doneCount, total: totalCount })}
            </span>
            {doneCount === totalCount && totalCount > 0 && (
              <span className="text-xs font-bold text-amber-300">
                {t("screens.event_prep.checklist_complete")}
              </span>
            )}
          </div>
        }
      >
        <div className="space-y-2">
          {ev.checklist.map((item, i) => {
            const isDone = !!checked[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setChecked((prev) => ({ ...prev, [i]: !prev[i] }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                  isDone ? "bg-primary/5 border-primary/30" : "bg-card border-border hover:border-primary/40"
                }`}
              >
                {isDone
                  ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
                <span className={`text-sm ${isDone ? "line-through text-muted-foreground" : ""}`}>{item}</span>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title, children, extra,
}: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className={cn(eventPrepPanelCard(), "p-5 space-y-3")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-quicksand font-bold text-foreground">{title}</h3>
        {extra}
      </div>
      {children}
    </div>
  );
}

function LazyEventImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <PremiumImage
      src={src}
      alt={alt}
      className={className}
    />
  );
}

function BulletList({ items, ordered }: { items: string[]; ordered?: boolean }) {
  if (ordered) {
    return (
      <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    );
  }
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm">
      {items.map((m, i) => <li key={i}>{m}</li>)}
    </ul>
  );
}

export function CharacterCardView({
  ch, onOpen, t,
}: { ch: EventCharacter; onOpen: () => void; t: TFunction }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={cn(eventPrepGlassCard(EVENT_PREP_ACCENT), "overflow-hidden")}
    >
      <div
        data-on-dark
        className="p-6 relative h-32 flex items-center justify-center text-primary-foreground"
        style={{ background: `linear-gradient(135deg, ${ch.accent[0]}, ${ch.accent[1]})` }}
      >
        <div className="text-6xl">{ch.emoji}</div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-foreground text-[10px] font-bold flex items-center gap-1">
          <Clock className="h-3 w-3" /> {ch.timeMinutes} {t("screens.event_prep.minutes_short")}
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-card text-[10px] font-bold">
          {ch.difficulty}
        </div>
        {ch.lowCost && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-card text-[10px] font-bold">💸</div>
        )}
      </div>
      <div className="p-3">
        <div className="font-quicksand font-bold leading-tight text-foreground">{ch.character}</div>
        <div className="text-xs text-muted-foreground/85 mt-0.5 truncate">{ch.tagline}</div>
      </div>
    </div>
  );
}
