import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import {
  EVENT_CATEGORIES, EVENT_CHARACTERS,
  charactersByCategory, applyFilters, recommendForChild, speechForAge,
  type EventCategory, type EventCharacter, type EventCategoryId, type EventFilter,
} from "@workspace/event-prep";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Volume2, VolumeX, Clock, Sparkles, Zap, Filter, ChevronRight, Wand2,
} from "lucide-react";
import { speak, stopSpeaking, ttsAvailable } from "@/lib/study-tts";
import { EventPrepGenerator } from "@/components/event-prep-generator";

type Child = { id: number; name: string; age: number; ageMonths?: number };

type View =
  | { kind: "child-pick" }
  | { kind: "home"; childId: number }
  | { kind: "category"; childId: number; categoryId: EventCategoryId }
  | { kind: "generator"; childId: number }
  | { kind: "detail"; childId: number; characterId: string };

export default function EventPrepPage() {
  const { t } = useTranslation();
  const { data: children, isLoading } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const list = (children ?? []) as Child[];
  const [view, setView] = useState<View>({ kind: "child-pick" });
  const [filter, setFilter] = useState<EventFilter>({});
  const [speaking, setSpeaking] = useState<string | null>(null);

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

  const handleSpeak = (id: string, text: string) => {
    if (!ttsAvailable()) return;
    if (speaking === id) {
      stopSpeaking();
      setSpeaking(null);
      return;
    }
    speak(text, { lang: "en-IN" });
    setSpeaking(id);
    // Best-effort timeout — speech ends silently if user navigates away.
    setTimeout(() => setSpeaking((s) => (s === id ? null : s)), 12000);
  };

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
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Header title={t("screens.event_prep.header_title")} subtitle={t("screens.event_prep.pick_child")} />
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
      </div>
    );
  }

  // ─── home (categories + AI picks + last-minute) ───────────────────────────
  if (view.kind === "home" && child) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <BackBar onBack={() => list.length > 1 && setView({ kind: "child-pick" })} canBack={list.length > 1}>
          <Header
            title={t("screens.event_prep.home_title")}
            subtitle={t("screens.event_prep.home_subtitle", { name: child.name })}
          />
        </BackBar>

        {/* ✨ Amy AI Generator entry */}
        <Card
          onClick={() => setView({ kind: "generator", childId: child.id })}
          className="cursor-pointer mt-4 border-border bg-card hover:border-primary transition"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
              <Wand2 className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{t("screens.event_prep.amy_generator_title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("screens.event_prep.amy_generator_sub")}
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-foreground" />
          </CardContent>
        </Card>

        {/* Last-minute hero */}
        <Card
          onClick={() => {
            setFilter({ lastMinute: true });
            setView({ kind: "category", childId: child.id, categoryId: "fancy-dress" });
          }}
          className="cursor-pointer mt-4 border-border bg-card hover:border-primary transition"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
              <Zap className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{t("screens.event_prep.last_minute_title")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("screens.event_prep.last_minute_sub")}
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-foreground" />
          </CardContent>
        </Card>

        {/* Amy AI quick picks */}
        <h2 className="font-bold mt-6 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-foreground" /> {t("screens.event_prep.amy_picks", { name: child.name })}
        </h2>
        <AmyRecommendations child={child} onOpen={(id) => setView({ kind: "detail", childId: child.id, characterId: id })} />

        {/* Browse by event */}
        <h2 className="font-bold mt-8 mb-3">{t("screens.event_prep.browse_by_event")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {EVENT_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              count={charactersByCategory(cat.id).length}
              onOpen={() => { setFilter({}); setView({ kind: "category", childId: child.id, categoryId: cat.id }); }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ─── generator ─────────────────────────────────────────────────────────────
  if (view.kind === "generator" && child) {
    return (
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
      </div>
    );
  }

  // ─── category (Netflix-style horizontal cards) ────────────────────────────
  if (view.kind === "category" && child) {
    const cat = EVENT_CATEGORIES.find((c) => c.id === view.categoryId)!;
    const allInCat = filter.lastMinute
      ? EVENT_CHARACTERS  // last-minute pulls from every category
      : charactersByCategory(view.categoryId);
    const filtered = applyFilters(allInCat, filter);

    return (
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
              <CharacterCard
                key={ch.id}
                ch={ch}
                onOpen={() => setView({ kind: "detail", childId: child.id, characterId: ch.id })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── detail ────────────────────────────────────────────────────────────────
  if (view.kind === "detail" && child) {
    const ch = EVENT_CHARACTERS.find((c) => c.id === view.characterId);
    if (!ch) {
      return (
        <div className="container mx-auto p-6">
          <Card><CardContent className="p-6">{t("screens.event_prep.character_not_found")}</CardContent></Card>
        </div>
      );
    }
    const speech = speechForAge(ch, child.age);
    return (
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
              {ttsAvailable() && (
                <Button
                  size="sm"
                  variant={speaking === ch.id ? "default" : "outline"}
                  onClick={() => handleSpeak(ch.id, speech)}
                  className="rounded-full"
                >
                  {speaking === ch.id ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
                  {speaking === ch.id ? t("screens.event_prep.stop") : t("screens.event_prep.read_aloud")}
                </Button>
              )}
            </div>
            <p className="text-base italic leading-relaxed">"{speech}"</p>
            {ch.speechShort && ch.speechShort !== speech && (
              <p className="text-xs text-muted-foreground mt-3">
                {t("screens.event_prep.speech_short_tip")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
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

function CategoryCard({ category, count, onOpen }: { category: EventCategory; count: number; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <Card
      onClick={onOpen}
      className="cursor-pointer overflow-hidden hover:shadow-lg transition border-2 border-transparent hover:border-border"
    >
      <div
        className="p-5 text-primary-foreground"
        style={{ background: `linear-gradient(135deg, ${category.accent[0]}, ${category.accent[1]})` }}
      >
        <div className="text-4xl mb-1">{category.emoji}</div>
        <div className="font-bold text-lg">{category.title}</div>
      </div>
      <CardContent className="p-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{category.blurb}</span>
        <span className="text-xs font-semibold text-foreground">{t("screens.event_prep.ideas_count", { count })}</span>
      </CardContent>
    </Card>
  );
}

function CharacterCard({ ch, onOpen }: { ch: EventCharacter; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <Card
      onClick={onOpen}
      className="cursor-pointer overflow-hidden hover:shadow-lg transition border-2 border-transparent hover:border-border"
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
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-card text-[10px] font-bold">
            💸
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <div className="font-bold leading-tight">{ch.character}</div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">{ch.tagline}</div>
      </CardContent>
    </Card>
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

function AmyRecommendations({ child, onOpen }: { child: Child; onOpen: (id: string) => void }) {
  const { t } = useTranslation();
  // Pick the most relevant category for "today" — defaults to fancy-dress
  // unless we're within ~3 weeks of a national event.
  const category: EventCategoryId = pickTimelyCategory();
  const recs = recommendForChild(category, child.age);
  const cat = EVENT_CATEGORIES.find((c) => c.id === category)!;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-3">
          {t("screens.event_prep.best_matches_prefix")}<strong>{cat.title}</strong>{t("screens.event_prep.best_matches_suffix", { name: child.name, age: child.age })}
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {recs.map((ch) => (
            <button
              key={ch.id}
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

/** Pick the most relevant event for "right now" based on month proximity. */
function pickTimelyCategory(): EventCategoryId {
  const m = new Date().getMonth(); // 0-Jan ... 11-Dec
  if (m === 0)  return "republic-day";       // January
  if (m === 7)  return "independence-day";   // August
  if (m === 8)  return "independence-day";   // early September fallout
  if (m === 9)  return "gandhi-jayanti";     // October
  if (m === 11 || m === 1) return "annual-day"; // December / February — annual day season
  return "fancy-dress";
}
