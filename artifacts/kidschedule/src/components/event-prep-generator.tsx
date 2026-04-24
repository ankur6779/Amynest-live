import { useState, useEffect } from "react";
import {
  EVENT_OCCASIONS, generateEventIdea,
  type AgeBand, type CostBudget, type EventOccasionId,
  type GeneratorInput, type GeneratorIdea, type GeneratorResult, type TimeBudget,
} from "@workspace/event-prep";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Volume2, VolumeX, Clock, Heart, RefreshCw, Wand2,
} from "lucide-react";
import { useAmyVoice } from "@/hooks/use-amy-voice";

interface Props {
  onOpenCharacter: (characterId: string) => void;
  defaultEvent?: EventOccasionId;
}

const AGE_BANDS: { id: AgeBand; label: string }[] = [
  { id: "2-5", label: "2–5 yrs" },
  { id: "6-10", label: "6–10 yrs" },
  { id: "10+", label: "10+ yrs" },
];
const TIMES: { id: TimeBudget; label: string }[] = [
  { id: 15, label: "15 min" },
  { id: 30, label: "30 min" },
  { id: 60, label: "1 hour" },
];
const BUDGETS: { id: CostBudget; label: string }[] = [
  { id: "low", label: "💸 Low" },
  { id: "medium", label: "💰 Medium" },
];

export function EventPrepGenerator({ onOpenCharacter, defaultEvent }: Props) {
  const [event, setEvent] = useState<EventOccasionId | "any">(defaultEvent ?? "any");
  const [age, setAge] = useState<AgeBand>("6-10");
  const [time, setTime] = useState<TimeBudget>(30);
  const [budget, setBudget] = useState<CostBudget>("low");
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const { speak: amySpeak, stop: amyStop, speaking: amySpeaking } = useAmyVoice();

  // Sync speakingId when Amy finishes
  useEffect(() => {
    if (!amySpeaking) setSpeakingId(null);
  }, [amySpeaking]);

  const onGenerate = () => {
    const input: GeneratorInput = {
      event: event === "any" ? undefined : event,
      ageBand: age,
      timeMinutes: time,
      budget,
    };
    amyStop();
    setSpeakingId(null);
    setResult(generateEventIdea(input));
  };

  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id && amySpeaking) {
      amyStop();
      setSpeakingId(null);
      return;
    }
    amyStop();
    setSpeakingId(id);
    amySpeak(text);
  };

  return (
    <div className="space-y-4">
      {/* Form */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-950/30 dark:via-zinc-900 dark:to-pink-950/30">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-500/15 text-purple-600 flex items-center justify-center">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Amy AI Event Generator</h3>
              <p className="text-xs text-muted-foreground">Tell me a few things — I'll suggest the perfect idea ❤️</p>
            </div>
          </div>

          <Field label="Event">
            <ChipRow>
              <Chip active={event === "any"} onClick={() => setEvent("any")}>Any / Surprise me</Chip>
              {EVENT_OCCASIONS.map((c) => (
                <Chip key={c.id} active={event === c.id} onClick={() => setEvent(c.id)}>
                  {c.emoji} {c.title}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label="Child age">
            <ChipRow>
              {AGE_BANDS.map((b) => (
                <Chip key={b.id} active={age === b.id} onClick={() => setAge(b.id)}>{b.label}</Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label="Time available">
            <ChipRow>
              {TIMES.map((t) => (
                <Chip key={t.id} active={time === t.id} onClick={() => setTime(t.id)}>{t.label}</Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label="Budget">
            <ChipRow>
              {BUDGETS.map((b) => (
                <Chip key={b.id} active={budget === b.id} onClick={() => setBudget(b.id)}>{b.label}</Chip>
              ))}
            </ChipRow>
          </Field>

          <Button
            onClick={onGenerate}
            className="w-full rounded-full bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 text-white font-bold"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {result ? "Generate again" : "Generate idea"}
          </Button>
        </CardContent>
      </Card>

      {result && result.ideas.length > 0 && (
        <div className="space-y-3">
          {/* Amy intro */}
          <div className="flex items-start gap-2 px-2">
            <Heart className="h-4 w-4 text-pink-500 mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/90 italic">{result.intro}</p>
          </div>

          {/* Best idea */}
          <IdeaCard
            idea={result.ideas[0]}
            highlight
            speakingId={speakingId}
            onSpeak={handleSpeak}
            onOpenFull={() => onOpenCharacter(result.ideas[0].character.id)}
          />

          {/* Alternates */}
          {result.ideas.length > 1 && (
            <>
              <div className="text-xs uppercase tracking-wide font-bold text-muted-foreground px-1 mt-2 flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Other ideas
              </div>
              {result.ideas.slice(1).map((alt) => (
                <IdeaCard
                  key={alt.character.id}
                  idea={alt}
                  speakingId={speakingId}
                  onSpeak={handleSpeak}
                  onOpenFull={() => onOpenCharacter(alt.character.id)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── small helpers ──────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-foreground/80 mb-1.5">{label}</div>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition ${
        active
          ? "bg-purple-600 border-purple-600 text-white"
          : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-foreground/80 hover:border-purple-400"
      }`}
    >
      {children}
    </button>
  );
}

function IdeaCard({
  idea, highlight, speakingId, onSpeak, onOpenFull,
}: {
  idea: GeneratorIdea;
  highlight?: boolean;
  speakingId: string | null;
  onSpeak: (id: string, text: string) => void;
  onOpenFull: () => void;
}) {
  const c = idea.character;
  return (
    <Card
      className={
        highlight
          ? "border-2 border-pink-400 shadow-lg overflow-hidden"
          : "border overflow-hidden"
      }
    >
      <div
        className="p-5 text-white relative"
        style={{ background: `linear-gradient(135deg, ${c.accent[0]}, ${c.accent[1]})` }}
      >
        <div className="flex items-center gap-3">
          <div className="text-5xl">{c.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg leading-tight">{c.character}</div>
            <div className="text-xs opacity-90">{c.tagline}</div>
          </div>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap text-[11px] font-semibold">
          <span className="px-2 py-0.5 rounded-full bg-white/25 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> {c.timeMinutes} min
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/25">{c.difficulty}</span>
          {c.lowCost && <span className="px-2 py-0.5 rounded-full bg-white/25">💸 Low cost</span>}
          <span className="px-2 py-0.5 rounded-full bg-black/25">{idea.template}</span>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="text-xs text-muted-foreground italic">{idea.reason}</div>

        <div>
          <div className="text-xs font-bold mb-1">🧰 Materials</div>
          <ul className="text-sm list-disc pl-5 space-y-0.5">
            {c.materials.slice(0, 4).map((m, i) => <li key={i}>{m}</li>)}
            {c.materials.length > 4 && (
              <li className="text-muted-foreground">+ {c.materials.length - 4} more…</li>
            )}
          </ul>
        </div>

        <div>
          <div className="text-xs font-bold mb-1">📋 Quick steps</div>
          <ol className="text-sm list-decimal pl-5 space-y-0.5">
            {c.steps.slice(0, 3).map((s, i) => <li key={i}>{s}</li>)}
            {c.steps.length > 3 && (
              <li className="text-muted-foreground">+ {c.steps.length - 3} more in full guide…</li>
            )}
          </ol>
        </div>

        <div className="rounded-xl bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-400/30 p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-bold">🎤 Speech</div>
            <Button
              size="sm"
              variant={speakingId === c.id ? "default" : "outline"}
              onClick={() => onSpeak(c.id, idea.speech)}
              className="rounded-full h-7 px-3 text-xs"
            >
              {speakingId === c.id ? <VolumeX className="h-3.5 w-3.5 mr-1" /> : <Volume2 className="h-3.5 w-3.5 mr-1" />}
              {speakingId === c.id ? "Stop" : "Play"}
            </Button>
          </div>
          <p className="text-sm italic">"{idea.speech}"</p>
        </div>

        <Button variant="outline" onClick={onOpenFull} className="w-full rounded-full">
          Open full guide
        </Button>
      </CardContent>
    </Card>
  );
}
