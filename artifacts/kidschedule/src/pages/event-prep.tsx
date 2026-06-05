import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { useAppNavigate } from "@/components/app-link";
import { usePageBackHandler } from "@/hooks/use-page-back-handler";
import {
  EVENT_CATEGORIES, EVENT_CHARACTERS,
  charactersByCategory, applyFilters, speechForAge,
  detectEventPrepCountry, countryConfig,
  getUpcomingEvents, getNextEvent, findSchoolEvent, searchSchoolEvents,
  type EventCategoryId, type EventFilter,
  type EventPrepCountry,
} from "@workspace/event-prep";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  EVENT_PREP_ACCENT,
  EVENT_PREP_AGE_BADGE,
  EVENT_PREP_BACK_BTN,
  EVENT_PREP_CHIP_ACTIVE,
  EVENT_PREP_CHIP_INACTIVE,
  EVENT_PREP_ICON_SHELL,
  EVENT_PREP_MAIN,
  EVENT_PREP_PAGE,
  EVENT_PREP_HEADER,
  eventPrepGlassCard,
  eventPrepPanelCard,
} from "@/lib/event-prep-zone-theme";
import {
  ArrowLeft, PartyPopper, Volume2, VolumeX, Clock, Filter, ChevronRight,
} from "lucide-react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { EventPrepGenerator } from "@/components/event-prep-generator";
import { EventPrepHomeView, EventDetailView, CharacterCardView } from "@/components/event-prep-views";
import { EventPrepChildAvatar } from "@/components/event-prep/event-prep-child-avatar";
import { EventPrepPhotoMoment } from "@/components/event-prep/event-prep-photo-moment";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useEventPrepQuickAction } from "@/hooks/use-event-prep-ai";
import type { QuickActionType } from "@workspace/event-prep";
import { HubModuleGateWrap } from "@/components/hub-module-gate-wrap";
import type { ReactNode } from "react";

type Child = { id: number; name: string; age: number; ageMonths?: number; photoUrl?: string | null };

type View =
  | { kind: "child-pick" }
  | { kind: "home"; childId: number }
  | { kind: "category"; childId: number; categoryId: EventCategoryId }
  | { kind: "generator"; childId: number }
  | { kind: "event-detail"; childId: number; eventId: string }
  | { kind: "detail"; childId: number; characterId: string };

const COUNTRY_STORAGE_KEY = "eventPrepCountry";
const COUNTRY_OPTIONS: EventPrepCountry[] = [
  "IN", "US", "GB", "AU", "CA", "NZ", "AE", "EU", "global",
];

function loadCountryOverride(): EventPrepCountry | null {
  try {
    const v = localStorage.getItem(COUNTRY_STORAGE_KEY);
    if (v && COUNTRY_OPTIONS.includes(v as EventPrepCountry)) return v as EventPrepCountry;
  } catch { /* ignore */ }
  return null;
}

function checklistKey(eventId: string, childId: number) {
  return `eventPrepChecklist:${eventId}:${childId}`;
}

export default function EventPrepPage() {
  const { t } = useTranslation();
  const { navigate, back } = useAppNavigate();
  const authFetch = useAuthFetch();
  const { run: runQuickAction, loading: quickActionLoading, result: quickActionResult, clear: clearQuickAction } =
    useEventPrepQuickAction(authFetch);
  const { data: children, isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const list = useMemo(
    () => (children ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      age: c.age,
      ageMonths: (c as Child).ageMonths,
      photoUrl: (c as Child).photoUrl ?? null,
    })),
    [children],
  );
  const [view, setView] = useState<View>({ kind: "child-pick" });
  const [filter, setFilter] = useState<EventFilter>({});
  const [speaking, setSpeaking] = useState<string | null>(null);
  const [countryOverride, setCountryOverride] = useState<EventPrepCountry | null>(loadCountryOverride);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [customTheme, setCustomTheme] = useState("");
  const {
    speak: amySpeak,
    pause: amyPause,
    speaking: amySpeaking,
  } = useAmyVoice();

  const country = useMemo(
    () => detectEventPrepCountry(countryOverride),
    [countryOverride],
  );
  const countryInfo = countryConfig(country);
  const upcoming = useMemo(() => getUpcomingEvents(country, 12), [country]);
  const nextEvent = useMemo(() => getNextEvent(country), [country]);
  const visibleEvents = useMemo(
    () => searchSchoolEvents(searchQuery, country),
    [searchQuery, country],
  );

  const setCountry = (c: EventPrepCountry) => {
    setCountryOverride(c);
    try { localStorage.setItem(COUNTRY_STORAGE_KEY, c); } catch { /* ignore */ }
    setCountryPickerOpen(false);
  };

  const welcomedChildRef = useRef<number | null>(null);

  const pickChild = useCallback((c: Child) => {
    setView({ kind: "home", childId: c.id });
    if (welcomedChildRef.current !== c.id) {
      welcomedChildRef.current = c.id;
      void amySpeak(
        t("screens.event_prep.amy_welcome", { name: c.name }),
        { narration: true },
      );
    }
  }, [amySpeak, t]);

  // Auto-pick when only one child (effect, not render-time state mutation).
  const single = list.length === 1 ? list[0] : null;
  useEffect(() => {
    if (view.kind === "child-pick" && single) {
      pickChild(single);
    }
  }, [view.kind, single?.id, pickChild, single]);

  const child = useMemo(() => {
    if (view.kind === "child-pick") return null;
    return list.find((c) => c.id === (view as { childId: number }).childId) ?? null;
  }, [view, list]);

  const gateChildId = view.kind === "child-pick" ? null : (view as { childId: number }).childId;
  const gateChildName = child?.name ?? list[0]?.name ?? "your child";
  const withGate = (node: ReactNode) => (
    <HubModuleGateWrap
      featureId="hub_event_prep"
      childId={gateChildId}
      childName={gateChildName}
    >
      {node}
    </HubModuleGateWrap>
  );

  const handleQuickAction = (type: QuickActionType) => {
    if (view.kind !== "event-detail" || !child) return;
    const ev = findSchoolEvent(view.eventId);
    if (!ev) return;
    void runQuickAction({
      type,
      event: ev,
      childAge: child.age,
      childName: child.name,
      country,
      customTheme: customTheme || undefined,
    });
  };

  const handleSpeak = (id: string, text: string) => {
    if (speaking === id && amySpeaking) {
      amyPause();
      setSpeaking(null);
      return;
    }
    setSpeaking(id);
    void amySpeak(text, { narration: true }).finally(() => {
      setSpeaking((s) => (s === id ? null : s));
    });
  };

  const exitToParentHub = useCallback(() => {
    back("event-prep-back");
  }, [back]);

  const handleStepBack = useCallback((): boolean => {
    if (view.kind === "child-pick") {
      exitToParentHub();
      return true;
    }
    if (view.kind === "home") {
      if (list.length > 1) {
        setView({ kind: "child-pick" });
        return true;
      }
      exitToParentHub();
      return true;
    }
    if (view.kind === "event-detail") {
      clearQuickAction();
      setView({ kind: "home", childId: view.childId });
      return true;
    }
    if (view.kind === "generator" || view.kind === "category" || view.kind === "detail") {
      setView({ kind: "home", childId: view.childId });
      return true;
    }
    exitToParentHub();
    return true;
  }, [view, list.length, exitToParentHub, clearQuickAction]);

  usePageBackHandler(handleStepBack, [view, list.length]);

  const headerTitle = useMemo(() => {
    if (list.length === 0) return t("screens.event_prep.no_child_title");
    if (view.kind === "child-pick") return t("screens.event_prep.header_title");
    if (view.kind === "home" && child) return t("screens.event_prep.home_title");
    if (view.kind === "generator" && child) return t("screens.event_prep.generator_screen_title");
    if (view.kind === "category" && child) {
      const cat = EVENT_CATEGORIES.find((c) => c.id === view.categoryId);
      if (filter.lastMinute) return t("screens.event_prep.last_minute_picks_title");
      return cat ? `${cat.emoji} ${cat.title}` : t("screens.event_prep.header_title");
    }
    if (view.kind === "event-detail" && child) {
      const ev = findSchoolEvent(view.eventId);
      return ev ? `${ev.emoji} ${ev.name}` : t("screens.event_prep.header_title");
    }
    if (view.kind === "detail" && child) {
      const ch = EVENT_CHARACTERS.find((c) => c.id === view.characterId);
      return ch ? `${ch.emoji} ${ch.character}` : t("screens.event_prep.header_title");
    }
    return t("screens.event_prep.header_title");
  }, [view, child, list.length, filter.lastMinute, t]);

  const headerSubtitle = useMemo(() => {
    if (list.length === 0) return t("screens.event_prep.no_child_desc");
    if (view.kind === "child-pick") return t("screens.event_prep.pick_child");
    if (view.kind === "home" && child) return t("screens.event_prep.home_subtitle", { name: child.name });
    if (view.kind === "generator" && child) return t("screens.event_prep.generator_screen_sub", { name: child.name });
    if (view.kind === "category" && child) {
      const cat = EVENT_CATEGORIES.find((c) => c.id === view.categoryId);
      if (filter.lastMinute) return t("screens.event_prep.last_minute_picks_sub");
      return cat?.blurb ?? "";
    }
    if (view.kind === "event-detail" && child) {
      const ev = findSchoolEvent(view.eventId);
      return ev?.dateLabel ?? "";
    }
    if (view.kind === "detail" && child) {
      const ch = EVENT_CHARACTERS.find((c) => c.id === view.characterId);
      return ch?.tagline ?? "";
    }
    return "";
  }, [view, child, list.length, filter.lastMinute, t]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-1/2 rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-[24px]" />
          <Skeleton className="h-32 w-full rounded-[24px]" />
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className={cn(eventPrepPanelCard(), "p-6 text-center")}>
          <p className="text-muted-foreground">{t("screens.event_prep.no_child_desc")}</p>
        </div>
      );
    }

    if (view.kind === "child-pick") {
      return (
        <div className="grid gap-3 sm:grid-cols-2 event-prep-stagger">
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickChild(c)}
              className={cn(eventPrepGlassCard(EVENT_PREP_ACCENT), "w-full text-left")}
            >
              <div className="flex items-center gap-4 p-5">
                <EventPrepChildAvatar
                  name={c.name}
                  age={c.age}
                  photoUrl={c.photoUrl}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-quicksand font-bold text-foreground">{c.name}</div>
                  <div className="mt-1">
                    <span className={EVENT_PREP_AGE_BADGE}>
                      {t("screens.event_prep.age_label", { age: c.age })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (view.kind === "home" && child) {
      return (
        <EventPrepHomeView
          child={child}
          country={country}
          countryInfo={countryInfo}
          countryPickerOpen={countryPickerOpen}
          setCountryPickerOpen={setCountryPickerOpen}
          setCountry={setCountry}
          nextEvent={nextEvent}
          upcoming={upcoming}
          visibleEvents={visibleEvents}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onGenerator={() => setView({ kind: "generator", childId: child.id })}
          onLastMinute={() => {
            setFilter({ lastMinute: true });
            setView({ kind: "category", childId: child.id, categoryId: "fancy-dress" });
          }}
          onEventOpen={(eventId) => setView({ kind: "event-detail", childId: child.id, eventId })}
          onCharacterOpen={(id) => setView({ kind: "detail", childId: child.id, characterId: id })}
          onCategoryOpen={(categoryId) => {
            setFilter({});
            setView({ kind: "category", childId: child.id, categoryId });
          }}
          allChildren={list}
          onSiblingCharacterOpen={(childId, characterId) => {
            setView({ kind: "detail", childId, characterId });
          }}
          t={t}
        />
      );
    }

    if (view.kind === "event-detail" && child) {
      const ev = findSchoolEvent(view.eventId);
      if (!ev) {
        return (
          <div className={cn(eventPrepPanelCard(), "p-6")}>
            {t("screens.event_prep.event_not_found")}
          </div>
        );
      }
      return (
        <EventDetailView
          ev={ev}
          child={child}
          upcoming={getUpcomingEvents(country, 50).find((u) => u.event.id === ev.id) ?? null}
          country={country}
          onBack={() => { clearQuickAction(); setView({ kind: "home", childId: child.id }); }}
          onOpenCostumes={(catId) => {
            setFilter({});
            setView({ kind: "category", childId: child.id, categoryId: catId });
          }}
          onSpeak={handleSpeak}
          speaking={speaking}
          t={t}
          quickActionLoading={quickActionLoading}
          quickActionResult={quickActionResult}
          onQuickAction={handleQuickAction}
          onClearQuickAction={clearQuickAction}
          customTheme={customTheme}
          onCustomThemeChange={setCustomTheme}
        />
      );
    }

    if (view.kind === "generator" && child) {
      return (
        <EventPrepGenerator
          onOpenCharacter={(id) => setView({ kind: "detail", childId: child.id, characterId: id })}
        />
      );
    }

    if (view.kind === "category" && child) {
      const allInCat = filter.lastMinute
        ? EVENT_CHARACTERS
        : charactersByCategory(view.categoryId);
      const filtered = applyFilters(allInCat, filter);

      return (
        <div className="space-y-4">
          <FilterBar filter={filter} setFilter={setFilter} />
          {filtered.length === 0 ? (
            <div className={cn(eventPrepPanelCard(), "p-8 text-center text-muted-foreground")}>
              {t("screens.event_prep.no_matches")}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 event-prep-stagger">
              {filtered.map((ch) => (
                <CharacterCardView
                  key={ch.id}
                  ch={ch}
                  onOpen={() => setView({ kind: "detail", childId: child.id, characterId: ch.id })}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (view.kind === "detail" && child) {
      const ch = EVENT_CHARACTERS.find((c) => c.id === view.characterId);
      if (!ch) {
        return (
          <div className={cn(eventPrepPanelCard(), "p-6")}>
            {t("screens.event_prep.character_not_found")}
          </div>
        );
      }
      const speech = speechForAge(ch, child.age);
      return (
        <div className="space-y-4">
          <EventPrepPhotoMoment
            eventId={`char-${ch.id}`}
            childId={child.id}
            childName={child.name}
            childPhotoUrl={child.photoUrl}
            characterId={ch.id}
            characterName={ch.character}
            costumeEmoji={ch.emoji}
            accent={ch.accent}
            materials={ch.materials}
            t={t}
          />
          <div
            className="rounded-2xl p-8 text-primary-foreground shadow-lg"
            style={{ background: `linear-gradient(135deg, ${ch.accent[0]}, ${ch.accent[1]})` }}
          >
            <div className="text-7xl text-center mb-3">{ch.emoji}</div>
            <div className="flex flex-wrap gap-2 justify-center text-xs">
              <Pill><Clock className="h-3 w-3" /> {ch.timeMinutes} {t("screens.event_prep.minutes_short")}</Pill>
              <Pill>{ch.difficulty}</Pill>
              {ch.lowCost && <Pill>{t("screens.event_prep.low_cost_pill")}</Pill>}
            </div>
          </div>

          <div className={cn(eventPrepPanelCard(), "p-5")}>
            <h3 className="font-quicksand font-bold mb-2 text-foreground">{t("screens.event_prep.materials")}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {ch.materials.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>

          <div className={cn(eventPrepPanelCard(), "p-5")}>
            <h3 className="font-quicksand font-bold mb-2 text-foreground">{t("screens.event_prep.steps")}</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
              {ch.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>

          <div className={cn(eventPrepPanelCard(), "p-5")}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-quicksand font-bold text-foreground">{t("screens.event_prep.your_speech")}</h3>
              <Button
                size="sm"
                variant={speaking === ch.id ? "default" : "outline"}
                onClick={() => handleSpeak(ch.id, speech)}
                className="rounded-full"
              >
                {speaking === ch.id ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
                {speaking === ch.id ? t("screens.event_prep.stop") : t("screens.event_prep.read_aloud")}
              </Button>
            </div>
            <p className="text-base italic leading-relaxed">&ldquo;{speech}&rdquo;</p>
            {ch.speechShort && ch.speechShort !== speech && (
              <p className="text-xs text-muted-foreground mt-3">
                {t("screens.event_prep.speech_short_tip")}
              </p>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={EVENT_PREP_PAGE}>
      <header className={EVENT_PREP_HEADER}>
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            className={EVENT_PREP_BACK_BTN}
            onClick={handleStepBack}
            aria-label={t("screens.event_prep.back", { defaultValue: "Back" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className={EVENT_PREP_ICON_SHELL}>
            <PartyPopper className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-quicksand text-xl font-black leading-tight text-foreground truncate">
              {headerTitle}
            </h1>
            <p className="truncate text-xs text-muted-foreground">{headerSubtitle}</p>
          </div>
        </div>
      </header>

      <main className={cn(EVENT_PREP_MAIN, "event-prep-page-enter")}>
        {withGate(renderContent())}
      </main>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function FilterBar({ filter, setFilter }: { filter: EventFilter; setFilter: (f: EventFilter) => void }) {
  const { t } = useTranslation();
  const toggle = (key: keyof EventFilter) =>
    setFilter({ ...filter, [key]: !filter[key], lastMinute: false });
  const clearLM = () => setFilter({});
  return (
    <div className="flex flex-wrap gap-2 mt-4 items-center">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Filter className="h-3 w-3" /> {t("screens.event_prep.filters_label")}
      </span>
      <FilterChip active={!!filter.easyOnly} onClick={() => toggle("easyOnly")}>{t("screens.event_prep.chip_easy")}</FilterChip>
      <FilterChip active={!!filter.lowCostOnly} onClick={() => toggle("lowCostOnly")}>{t("screens.event_prep.chip_low_cost")}</FilterChip>
      <FilterChip active={!!filter.quickOnly} onClick={() => toggle("quickOnly")}>{t("screens.event_prep.chip_quick")}</FilterChip>
      {filter.lastMinute && (
        <FilterChip active onClick={clearLM}>{t("screens.event_prep.chip_clear_last_minute")}</FilterChip>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? EVENT_PREP_CHIP_ACTIVE : EVENT_PREP_CHIP_INACTIVE}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 font-semibold backdrop-blur-sm">
      {children}
    </span>
  );
}

