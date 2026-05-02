import { useEffect, useMemo, useState } from "react";
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
    speak(text, { lang: /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN" });
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
          <h2 className="text-xl font-bold mb-2">Add a child to start</h2>
          <p className="text-muted-foreground">
            Event Prep needs to know your child's age to suggest the best ideas.
          </p>
        </CardContent></Card>
      </div>
    );
  }

  // ─── child-pick ───────────────────────────────────────────────────────────
  if (view.kind === "child-pick") {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <Header title="🎉 Event Prep" subtitle="Pick a child to begin" />
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          {list.map((c) => (
            <Card
              key={c.id}
              onClick={() => setView({ kind: "home", childId: c.id })}
              className="cursor-pointer hover:border-pink-400 transition"
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-pink-100 flex items-center justify-center text-2xl">👧</div>
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-muted-foreground">Age {c.age}</div>
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
            title="🎉 Event Prep — School Ready"
            subtitle={`Quick fancy dress, DIY guide & speeches for ${child.name}`}
          />
        </BackBar>

        {/* ✨ Amy AI Generator entry */}
        <Card
          onClick={() => setView({ kind: "generator", childId: child.id })}
          className="cursor-pointer mt-4 border-purple-300 bg-gradient-to-br from-purple-100 via-pink-100 to-fuchsia-100 dark:from-purple-950/40 dark:via-pink-950/40 dark:to-fuchsia-950/40 hover:border-purple-500 transition"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
              <Wand2 className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">✨ Amy AI Event Generator</h3>
              <p className="text-sm text-muted-foreground">
                Tell Amy your event, time & budget — get a perfect idea in seconds
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-purple-700" />
          </CardContent>
        </Card>

        {/* Last-minute hero */}
        <Card
          onClick={() => {
            setFilter({ lastMinute: true });
            setView({ kind: "category", childId: child.id, categoryId: "fancy-dress" });
          }}
          className="cursor-pointer mt-4 border-amber-300 bg-gradient-to-br from-amber-100 via-orange-100 to-pink-100 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-pink-950/40 hover:border-amber-500 transition"
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center">
              <Zap className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">⏱ Last-Minute Mode</h3>
              <p className="text-sm text-muted-foreground">
                30 min or less · easy ideas · stuff already at home
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-amber-700" />
          </CardContent>
        </Card>

        {/* Amy AI quick picks */}
        <h2 className="font-bold mt-6 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-pink-600" /> Amy AI picks for {child.name}
        </h2>
        <AmyRecommendations child={child} onOpen={(id) => setView({ kind: "detail", childId: child.id, characterId: id })} />

        {/* Browse by event */}
        <h2 className="font-bold mt-8 mb-3">Browse by event</h2>
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
            title="✨ Amy AI Event Generator"
            subtitle={`Personalised ideas for ${child.name}`}
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
            title={filter.lastMinute ? "⏱ Last-Minute Picks" : `${cat.emoji} ${cat.title}`}
            subtitle={filter.lastMinute ? "Easy · low-cost · 30 min or less" : cat.blurb}
          />
        </BackBar>

        <FilterBar filter={filter} setFilter={setFilter} />

        {filtered.length === 0 ? (
          <Card className="mt-4"><CardContent className="p-8 text-center text-muted-foreground">
            No ideas match these filters. Try removing a filter or another category.
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
          <Card><CardContent className="p-6">Character not found.</CardContent></Card>
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
          className="rounded-2xl mt-4 p-8 text-white shadow-lg"
          style={{ background: `linear-gradient(135deg, ${ch.accent[0]}, ${ch.accent[1]})` }}
        >
          <div className="text-7xl text-center mb-3">{ch.emoji}</div>
          <div className="flex flex-wrap gap-2 justify-center text-xs">
            <Pill><Clock className="h-3 w-3" /> {ch.timeMinutes} min</Pill>
            <Pill>{ch.difficulty}</Pill>
            {ch.lowCost && <Pill>💸 Low cost</Pill>}
          </div>
        </div>

        {/* Materials */}
        <Card className="mt-4">
          <CardContent className="p-5">
            <h3 className="font-bold mb-2">🧰 Materials Needed</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              {ch.materials.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card className="mt-3">
          <CardContent className="p-5">
            <h3 className="font-bold mb-2">📋 Step-by-step</h3>
            <ol className="list-decimal pl-5 space-y-2 text-sm leading-relaxed">
              {ch.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </CardContent>
        </Card>

        {/* Speech */}
        <Card className="mt-3 border-pink-200 bg-pink-50/50 dark:bg-pink-950/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">🎤 Your Speech</h3>
              {ttsAvailable() && (
                <Button
                  size="sm"
                  variant={speaking === ch.id ? "default" : "outline"}
                  onClick={() => handleSpeak(ch.id, speech)}
                  className="rounded-full"
                >
                  {speaking === ch.id ? <VolumeX className="h-4 w-4 mr-1" /> : <Volume2 className="h-4 w-4 mr-1" />}
                  {speaking === ch.id ? "Stop" : "Read aloud"}
                </Button>
              )}
            </div>
            <p className="text-base italic leading-relaxed">"{speech}"</p>
            {ch.speechShort && ch.speechShort !== speech && (
              <p className="text-xs text-muted-foreground mt-3">
                Tip: a shorter version is also available — Amy auto-picks based on age.
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
  return (
    <Card
      onClick={onOpen}
      className="cursor-pointer overflow-hidden hover:shadow-lg transition border-2 border-transparent hover:border-pink-300"
    >
      <div
        className="p-5 text-white"
        style={{ background: `linear-gradient(135deg, ${category.accent[0]}, ${category.accent[1]})` }}
      >
        <div className="text-4xl mb-1">{category.emoji}</div>
        <div className="font-bold text-lg">{category.title}</div>
      </div>
      <CardContent className="p-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{category.blurb}</span>
        <span className="text-xs font-semibold text-pink-600">{count} ideas</span>
      </CardContent>
    </Card>
  );
}

function CharacterCard({ ch, onOpen }: { ch: EventCharacter; onOpen: () => void }) {
  return (
    <Card
      onClick={onOpen}
      className="cursor-pointer overflow-hidden hover:shadow-lg transition border-2 border-transparent hover:border-pink-300"
    >
      <div
        data-on-dark
        className="p-6 relative h-32 flex items-center justify-center text-white"
        style={{ background: `linear-gradient(135deg, ${ch.accent[0]}, ${ch.accent[1]})` }}
      >
        <div className="text-6xl">{ch.emoji}</div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/30 text-[10px] font-bold flex items-center gap-1">
          <Clock className="h-3 w-3" /> {ch.timeMinutes} min
        </div>
        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-white/30 text-[10px] font-bold">
          {ch.difficulty}
        </div>
        {ch.lowCost && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-white/30 text-[10px] font-bold">
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
  const toggle = (key: keyof EventFilter) =>
    setFilter({ ...filter, [key]: !filter[key], lastMinute: false });
  const clearLM = () => setFilter({});
  return (
    <div className="flex flex-wrap gap-2 mt-4 items-center">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Filter className="h-3 w-3" /> Filters:
      </span>
      <FilterChip active={!!filter.easyOnly} onClick={() => toggle("easyOnly")}>Easy</FilterChip>
      <FilterChip active={!!filter.lowCostOnly} onClick={() => toggle("lowCostOnly")}>💸 Low cost</FilterChip>
      <FilterChip active={!!filter.quickOnly} onClick={() => toggle("quickOnly")}>⚡ ≤ 30 min</FilterChip>
      {filter.lastMinute && (
        <FilterChip active onClick={clearLM}>⏱ Last-Minute (clear)</FilterChip>
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
          ? "bg-pink-600 text-white border-pink-600"
          : "bg-white dark:bg-zinc-800 text-foreground/80 border-zinc-300 dark:border-zinc-600 hover:border-pink-400"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-white/25 border border-white/30 inline-flex items-center gap-1 font-semibold">
      {children}
    </span>
  );
}

function AmyRecommendations({ child, onOpen }: { child: Child; onOpen: (id: string) => void }) {
  // Pick the most relevant category for "today" — defaults to fancy-dress
  // unless we're within ~3 weeks of a national event.
  const category: EventCategoryId = pickTimelyCategory();
  const recs = recommendForChild(category, child.age);
  const cat = EVENT_CATEGORIES.find((c) => c.id === category)!;

  return (
    <Card className="border-pink-200 bg-gradient-to-br from-pink-50/50 to-purple-50/50 dark:from-pink-950/20 dark:to-purple-950/20">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground mb-3">
          Best matches for <strong>{cat.title}</strong> based on {child.name}'s age ({child.age} yrs).
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {recs.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onOpen(ch.id)}
              className="text-left rounded-xl p-3 bg-white dark:bg-zinc-900 border hover:border-pink-400 transition"
            >
              <div className="text-3xl">{ch.emoji}</div>
              <div className="font-bold text-sm mt-1">{ch.character}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {ch.timeMinutes} min · {ch.difficulty}
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
