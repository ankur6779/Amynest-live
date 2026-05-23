import { useEffect, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Volume2, VolumeX, Clock, Sparkles, Zap, ChevronRight, Wand2,
  Search, MapPin, Calendar, CheckCircle2, Circle, Loader2, ImageIcon,
} from "lucide-react";

export type EventPrepChild = { id: number; name: string; age: number; ageMonths?: number };

export function countdownLabel(daysUntil: number, t: TFunction): string {
  if (daysUntil === 0) return t("screens.event_prep.countdown_today");
  if (daysUntil === 1) return t("screens.event_prep.countdown_tomorrow");
  if (daysUntil <= 7) return t("screens.event_prep.countdown_days", { count: daysUntil });
  if (daysUntil <= 30) return t("screens.event_prep.countdown_weeks", { count: Math.ceil(daysUntil / 7) });
  const months = Math.max(1, Math.round(daysUntil / 30));
  return t("screens.event_prep.countdown_months", { count: months });
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function BackBar({ onBack, canBack, children }: { onBack: () => void; canBack: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {canBack && (
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-1 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
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
  onBack?: () => void;
  canBack?: boolean;
  t: TFunction;
}

export function EventPrepHomeView({
  child, country, countryInfo, countryPickerOpen, setCountryPickerOpen,
  setCountry, nextEvent, upcoming, visibleEvents, searchQuery, setSearchQuery,
  onGenerator, onLastMinute, onEventOpen, onCharacterOpen, onCategoryOpen,
  onBack, canBack = false, t,
}: HomeProps) {
  const countryOptions = Object.keys(COUNTRY_CONFIGS) as EventPrepCountry[];

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <BackBar onBack={onBack ?? (() => {})} canBack={canBack}>
        <PageHeader
          title={t("screens.event_prep.home_title")}
          subtitle={t("screens.event_prep.home_subtitle", { name: child.name })}
        />
      </BackBar>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCountryPickerOpen(!countryPickerOpen)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-sm font-semibold hover:border-primary transition"
        >
          <MapPin className="h-3.5 w-3.5" />
          {countryInfo.flag} {countryInfo.label}
          <span className="text-xs text-muted-foreground">· {t("screens.event_prep.change_country")}</span>
        </button>
      </div>

      {countryPickerOpen && (
        <div className="mt-2 flex flex-wrap gap-2">
          {countryOptions.map((code) => {
            const cfg = COUNTRY_CONFIGS[code];
            return (
              <button
                key={code}
                type="button"
                onClick={() => setCountry(code)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  code === country
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary"
                }`}
              >
                {cfg.flag} {cfg.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative mt-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("screens.event_prep.search_placeholder")}
          className="pl-9 rounded-full"
        />
      </div>

      {nextEvent && !searchQuery && (
        <Card
          onClick={() => onEventOpen(nextEvent.event.id)}
          className="cursor-pointer mt-4 overflow-hidden border-2 border-primary/30 hover:border-primary transition shadow-md event-prep-card-lift"
        >
          <div
            className="p-5 text-primary-foreground"
            style={{ background: `linear-gradient(135deg, ${nextEvent.event.accent[0]}, ${nextEvent.event.accent[1]})` }}
          >
            <div className="text-xs font-bold uppercase tracking-wide opacity-90 flex items-center gap-1 mb-3">
              <Calendar className="h-3 w-3" /> {t("screens.event_prep.upcoming_near_you")}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{nextEvent.event.emoji}</span>
              <div className="flex-1">
                <div className="font-bold text-xl">{nextEvent.event.name}</div>
                <div className="text-sm opacity-90">{nextEvent.event.dateLabel}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black event-prep-countdown-pulse">{countdownLabel(nextEvent.daysUntil, t)}</div>
                <div className="text-xs opacity-80">{t("screens.event_prep.next_event")}</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {!searchQuery && upcoming.length > 0 && (
        <>
          <h2 className="font-bold mt-6 mb-3">{t("screens.event_prep.all_events")}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {upcoming.map(({ event, daysUntil }) => (
              <SchoolEventCard
                key={event.id}
                event={event}
                badge={countdownLabel(daysUntil, t)}
                onOpen={() => onEventOpen(event.id)}
              />
            ))}
          </div>
        </>
      )}

      {searchQuery && (
        <>
          <h2 className="font-bold mt-6 mb-3">
            {t("screens.event_prep.country_events_for", { country: countryInfo.label })}
          </h2>
          {visibleEvents.length === 0 ? (
            <Card className="mt-2"><CardContent className="p-6 text-center text-muted-foreground">
              {t("screens.event_prep.no_matches")}
            </CardContent></Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {visibleEvents.map((event) => (
                <SchoolEventCard key={event.id} event={event} onOpen={() => onEventOpen(event.id)} />
              ))}
            </div>
          )}
        </>
      )}

      <Card onClick={onGenerator} className="cursor-pointer mt-6 border-border bg-card hover:border-primary transition">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <Wand2 className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{t("screens.event_prep.amy_generator_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("screens.event_prep.amy_generator_sub")}</p>
          </div>
          <ChevronRight className="h-6 w-6 text-foreground" />
        </CardContent>
      </Card>

      <Card onClick={onLastMinute} className="cursor-pointer mt-4 border-border bg-card hover:border-primary transition">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
            <Zap className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{t("screens.event_prep.last_minute_title")}</h3>
            <p className="text-sm text-muted-foreground">{t("screens.event_prep.last_minute_sub")}</p>
          </div>
          <ChevronRight className="h-6 w-6 text-foreground" />
        </CardContent>
      </Card>

      <h2 className="font-bold mt-6 mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> {t("screens.event_prep.amy_picks", { name: child.name })}
      </h2>
      <AmyRecs child={child} country={country} onOpen={onCharacterOpen} t={t} />

      <h2 className="font-bold mt-8 mb-3">{t("screens.event_prep.browse_by_event")}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

function SchoolEventCard({
  event, badge, onOpen,
}: { event: SchoolEvent; badge?: string; onOpen: () => void }) {
  return (
    <Card onClick={onOpen} className="cursor-pointer overflow-hidden hover:shadow-md transition border hover:border-primary event-prep-card-lift">
      <div className="flex items-center gap-3 p-4">
        <div
          className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: `linear-gradient(135deg, ${event.accent[0]}, ${event.accent[1]})` }}
        >
          {event.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{event.name}</div>
          <div className="text-xs text-muted-foreground truncate">{event.dateLabel} · {event.category}</div>
        </div>
        {badge && (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary shrink-0">
            {badge}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </Card>
  );
}

function CategoryCard({
  category, count, onOpen, t,
}: { category: EventCategory; count: number; onOpen: () => void; t: TFunction }) {
  return (
    <Card onClick={onOpen} className="cursor-pointer overflow-hidden hover:shadow-lg transition border-2 border-transparent hover:border-border">
      <div
        className="p-5 text-primary-foreground"
        style={{ background: `linear-gradient(135deg, ${category.accent[0]}, ${category.accent[1]})` }}
      >
        <div className="text-4xl mb-1">{category.emoji}</div>
        <div className="font-bold text-lg">{category.title}</div>
      </div>
      <CardContent className="p-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{category.blurb}</span>
        <span className="text-xs font-semibold">{t("screens.event_prep.ideas_count", { count })}</span>
      </CardContent>
    </Card>
  );
}

function AmyRecs({
  child, country, onOpen, t,
}: { child: EventPrepChild; country: EventPrepCountry; onOpen: (id: string) => void; t: TFunction }) {
  const category = getTimelyCategory(country);
  const recs = recommendForChild(category, child.age);
  const cat = EVENT_CATEGORIES.find((c) => c.id === category)!;
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-3">
          {t("screens.event_prep.best_matches_prefix")}<strong>{cat.title}</strong>
          {t("screens.event_prep.best_matches_suffix", { name: child.name, age: child.age })}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {recs.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => onOpen(ch.id)}
              className="text-left rounded-xl p-3 bg-card border hover:border-primary transition"
            >
              <div className="text-3xl">{ch.emoji}</div>
              <div className="font-bold text-sm mt-1">{ch.character}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {ch.timeMinutes} {t("screens.event_prep.minutes_short")} · {ch.difficulty}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function checklistStorageKey(eventId: string, childId: number) {
  return `eventPrepChecklist:${eventId}:${childId}`;
}

interface EventDetailProps {
  ev: SchoolEvent;
  child: EventPrepChild;
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
  ev, child, onBack, onOpenCostumes, onSpeak, speaking, t,
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

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch { /* ignore */ }
  }, [checked, storageKey]);

  const doneCount = ev.checklist.filter((_, i) => checked[i]).length;
  const images = getEventImages(ev.id);

  return (
    <div className="container mx-auto p-6 max-w-3xl pb-16">
      <BackBar onBack={onBack} canBack>
        <PageHeader title={`${ev.emoji} ${ev.name}`} subtitle={ev.dateLabel} />
      </BackBar>

      {images?.banner && (
        <div className="mt-4 rounded-2xl overflow-hidden shadow-md">
          <LazyEventImage src={images.banner} alt={ev.name} className="w-full h-44 object-cover" />
        </div>
      )}

      <div
        className="rounded-2xl mt-4 p-6 text-primary-foreground shadow-lg"
        style={{ background: `linear-gradient(135deg, ${ev.accent[0]}, ${ev.accent[1]})` }}
      >
        <div className="text-6xl text-center mb-2">{ev.emoji}</div>
        <div className="text-center text-sm opacity-90">{ev.category}</div>
      </div>

      <Section title={t("screens.event_prep.event_overview")}>
        <p className="text-sm leading-relaxed">{ev.overview}</p>
      </Section>

      {onQuickAction && (
        <Card className="mt-3 border-primary/20 bg-gradient-to-br from-muted/50 to-card">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm">{t("screens.event_prep.quick_actions")}</h3>
            </div>
            {onCustomThemeChange && (
              <Input
                value={customTheme ?? ""}
                onChange={(e) => onCustomThemeChange(e.target.value)}
                placeholder={t("screens.event_prep.custom_theme_placeholder")}
                className="rounded-full text-sm"
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
          </CardContent>
        </Card>
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

      <Section title={t("screens.event_prep.what_to_prepare")}>
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
          <span className="text-xs text-muted-foreground">
            {t("screens.event_prep.checklist_progress", { done: doneCount, total: ev.checklist.length })}
          </span>
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
    <Card className="mt-3">
        <CardContent className="p-5">
        <div>
          <h3 className="font-bold">{title}</h3>
          {extra}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function LazyEventImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
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
    <Card onClick={onOpen} className="cursor-pointer overflow-hidden hover:shadow-lg transition border-2 border-transparent hover:border-border">
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
      <CardContent className="p-3">
        <div className="font-bold leading-tight">{ch.character}</div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">{ch.tagline}</div>
      </CardContent>
    </Card>
  );
}
