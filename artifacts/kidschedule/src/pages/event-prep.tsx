import { useEffect, useMemo, useState, useCallback } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Volume2, VolumeX, Clock, Filter, ChevronRight,
} from "lucide-react";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { EventPrepGenerator } from "@/components/event-prep-generator";
import { EventPrepHomeView, EventDetailView, CharacterCardView } from "@/components/event-prep-views";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useEventPrepQuickAction } from "@/hooks/use-event-prep-ai";
import type { QuickActionType } from "@workspace/event-prep";
import { HubModuleGateWrap } from "@/components/hub-module-gate-wrap";
import type { ReactNode } from "react";

type Child = { id: number; name: string; age: number; ageMonths?: number };

type View =
  | { kind: "child-pick" }
  | { kind: "home"; childId: number }
  | { kind: "category"; childId: number; categoryId: EventCategoryId }
  | { kind: "generator"; childId: number }
  | { kind: "event-detail"; childId: number; eventId: string }
  | { kind: "detail"; childId: number; characterId: string };

const COUNTRY_STORAGE_KEY = "eventPrepCountry";
const COUNTRY_OPTIONS: EventPrepCountry[] = ["IN", "US", "GB", "AU", "CA", "NZ", "global"];

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
  const { navigate } = useAppNavigate();
  const authFetch = useAuthFetch();
  const { run: runQuickAction, loading: quickActionLoading, result: quickActionResult, clear: clearQuickAction } =
    useEventPrepQuickAction(authFetch);
  const { data: children, isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const list = (children ?? []) as Child[];
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
  const upcoming = useMemo(() => getUpcomingEvents(country, 5), [country]);
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

  // Auto-pick when only one child (effect, not render-time state mutation).
  const single = list.length === 1 ? list[0] : null;
  useEffect(() => {
    if (view.kind === "child-pick" && single) {
      setView({ kind: "home", childId: single.id });
    }
  }, [view.kind, single?.id]);

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
    navigate("/parenting-hub", { replace: true, source: "event-prep-back" });
  }, [navigate]);

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-3">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-6 text-center">
          <h2 className="text-xl font-bold mb-2">{t("screens.event_prep.no_child_title")}</h2>
          <p className="text-muted-foreground">
            {t("screens.event_prep.no_child_desc")}
          </p>
        </CardContent></Card>
      </div>
    );
  }

  // ─── child-pick ───────────────────────────────────────────────────────────
  if (view.kind === "child-pick") {
    return withGate(
      <div className="container mx-auto p-6 max-w-3xl">
        <BackBar onBack={exitToParentHub} canBack>
          <Header title={t("screens.event_prep.header_title")} subtitle={t("screens.event_prep.pick_child")} />
        </BackBar>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {list.map((c) => (
            <Card
              key={c.id}
              onClick={() => setView({ kind: "home", childId: c.id })}
              className="cursor-pointer hover:border-primary transition"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-2xl">👧</div>
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{t("screens.event_prep.age_label", { age: c.age })}</div>
                </div>
                <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>,
    );
  }

  // ─── home ───────────────────────────────────────────────────────────────────
  if (view.kind === "home" && child) {
    return withGate(
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
        onBack={() => {
          if (list.length > 1) setView({ kind: "child-pick" });
          else exitToParentHub();
        }}
        canBack
        t={t}
      />,
    );
  }

  // ─── event detail ─────────────────────────────────────────────────────────
  if (view.kind === "event-detail" && child) {
    const ev = findSchoolEvent(view.eventId);
    if (!ev) {
      return withGate(
        <div className="container mx-auto p-6">
          <Card><CardContent className="p-6">{t("screens.event_prep.event_not_found")}</CardContent></Card>
        </div>,
      );
    }
    return withGate(
      <EventDetailView
        ev={ev}
        child={child}
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
      />,
    );
  }

  // ─── generator ─────────────────────────────────────────────────────────────
  if (view.kind === "generator" && child) {
    return withGate(
      <div className="container mx-auto p-6 max-w-2xl">
        <BackBar onBack={() => setView({ kind: "home", childId: child.id })} canBack>
          <Header
            title={t("screens.event_prep.generator_screen_title")}
            subtitle={t("screens.event_prep.generator_screen_sub", { name: child.name })}
          />
        </BackBar>
        <div className="mt-4">
          <EventPrepGenerator
            onOpenCharacter={(id) => setView({ kind: "detail", childId: child.id, characterId: id })}
          />
        </div>
      </div>,
    );
  }

  // ─── category (Netflix-style horizontal cards) ────────────────────────────
  if (view.kind === "category" && child) {
    const cat = EVENT_CATEGORIES.find((c) => c.id === view.categoryId)!;
    const allInCat = filter.lastMinute
      ? EVENT_CHARACTERS  // last-minute pulls from every category
      : charactersByCategory(view.categoryId);
    const filtered = applyFilters(allInCat, filter);

    return withGate(
      <div className="container mx-auto p-6 max-w-5xl">
        <BackBar onBack={() => setView({ kind: "home", childId: child.id })} canBack>
          <Header
            title={filter.lastMinute ? t("screens.event_prep.last_minute_picks_title") : `${cat.emoji} ${cat.title}`}
            subtitle={filter.lastMinute ? t("screens.event_prep.last_minute_picks_sub") : cat.blurb}
          />
        </BackBar>

        <FilterBar filter={filter} setFilter={setFilter} />

        {filtered.length === 0 ? (
          <Card className="mt-4"><CardContent className="p-8 text-center text-muted-foreground">
            {t("screens.event_prep.no_matches")}
          </CardContent></Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
      </div>,
    );
  }

  // ─── detail ────────────────────────────────────────────────────────────────
  if (view.kind === "detail" && child) {
    const ch = EVENT_CHARACTERS.find((c) => c.id === view.characterId);
    if (!ch) {
      return withGate(
        <div className="container mx-auto p-6">
          <Card><CardContent className="p-6">{t("screens.event_prep.character_not_found")}</CardContent></Card>
        </div>,
      );
    }
    const speech = speechForAge(ch, child.age);
    return withGate(
      <div className="container mx-auto p-6 max-w-3xl">
        <BackBar onBack={() => setView({ kind: "home", childId: child.id })} canBack>
          <Header title={`${ch.emoji} ${ch.character}`} subtitle={ch.tagline} />
        </BackBar>

        {/* Hero */}
        <div
          className="rounded-2xl mt-4 p-8 text-primary-foreground shadow-lg"
          style={{ background: `linear-gradient(135deg, ${ch.accent[0]}, ${ch.accent[1]})` }}
        >
          <div className="text-7xl text-center mb-3">{ch.emoji}</div>
          <div className="flex flex-wrap gap-2 justify-center text-xs">
            <Pill><Clock className="h-3 w-3" /> {ch.timeMinutes} {t("screens.event_prep.minutes_short")}</Pill>
            <Pill>{ch.difficulty}</Pill>
            {ch.lowCost && <Pill>{t("screens.event_prep.low_cost_pill")}</Pill>}
          </div>
        </div>

        {/* Materials */}
        <Card className="mt-4">
          <CardContent className="p-5">
            <h3 className="font-bold mb-2">{t("screens.event_prep.materials")}</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {ch.materials.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="mt-3">
          <CardContent className="p-5">
            <h3 className="font-bold mb-2">{t("screens.event_prep.steps")}</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
              {ch.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </CardContent>
        </Card>

        {/* Speech */}
        <Card className="mt-3 border-border bg-muted">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">{t("screens.event_prep.your_speech")}</h3>
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
            <p className="text-base italic leading-relaxed">"{speech}"</p>
            {ch.speechShort && ch.speechShort !== speech && (
              <p className="text-xs text-muted-foreground mt-3">
                {t("screens.event_prep.speech_short_tip")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>,
    );
  }

  return <div>Loading...</div>;
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Header({ title, subtitle }: { title: string; subtitle: string }) {
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
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-foreground/80 border-border hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-card border border-border inline-flex items-center gap-1 font-semibold">
      {children}
    </span>
  );
}

