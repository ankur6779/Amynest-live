import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Compass,
  Baby,
  HelpCircle,
  BarChart3,
  Ear,
  Trophy,
  Sticker,
} from "lucide-react";
import type { WorldManifestItem } from "@workspace/world-engine";
import {
  buildPlatformDiscoverySequence,
  buildPlatformHearFindQuestion,
  DISCOVERY_PHASE_ORDER,
  discoveryPhaseDurationMs,
  gradePlatformHearFind,
} from "@workspace/world-engine";
import { cn } from "@/lib/utils";
import { SCREEN_SPACING, TRANSITION } from "@/lib/experience-system";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { discoveryWorldAudioManager } from "@/lib/discovery-world-audio-manager";
import { trackDiscoveryWorldsEvent } from "@/lib/discovery-worlds-telemetry";
import {
  grantDiscoveryWorldXp,
  loadDiscoveryWorldProgress,
  recordHearFindAttempt,
} from "@/lib/discovery-worlds-progress";
import { VirtualizedGrid, useResponsiveGridColumns } from "@/components/animal-world/virtualized-grid";
import { WorldItemCard } from "./world-item-card";
import { motion, AnimatePresence } from "framer-motion";

type ModeId =
  | "explore"
  | "toddler"
  | "quiz"
  | "hear_find"
  | "discovery"
  | "achievements"
  | "stickers"
  | "parent";

const MODES: Array<{ id: ModeId; label: string; icon: typeof Sparkles }> = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "toddler", label: "Toddler", icon: Baby },
  { id: "quiz", label: "Quiz", icon: HelpCircle },
  { id: "hear_find", label: "Hear", icon: Ear },
  { id: "discovery", label: "Discovery", icon: Sparkles },
  { id: "achievements", label: "Stars", icon: Trophy },
  { id: "stickers", label: "Stickers", icon: Sticker },
  { id: "parent", label: "Parent", icon: BarChart3 },
];

type DiscoveryWorldExperienceProps = {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  onEngage?: () => void;
};

export function DiscoveryWorldExperience({
  config,
  childId,
  onEngage,
}: DiscoveryWorldExperienceProps) {
  const [mode, setMode] = useState<ModeId>("explore");
  const [category, setCategory] = useState<string | "all">("all");
  const [selected, setSelected] = useState<WorldManifestItem | null>(null);
  const [muted, setMuted] = useState(false);
  const columns = useResponsiveGridColumns();

  const items = useMemo(() => {
    if (category === "all") return config.manifest.items;
    return config.manifest.items.filter((i) => i.category === category);
  }, [category, config.manifest.items]);

  useEffect(() => {
    onEngage?.();
    discoveryWorldAudioManager.unlockFromGesture();
    const urls = config.manifest.items
      .slice(0, 6)
      .flatMap((item) => {
        const s = config.getPrimarySound(item);
        return s ? [config.resolveAssetUrl(s.gcsPath)] : [];
      });
    discoveryWorldAudioManager.preloadSmart({ current: urls });
    trackDiscoveryWorldsEvent(config.worldId, "world_opened", { childId });
    return () => discoveryWorldAudioManager.release();
  }, [childId, config, onEngage]);

  useEffect(() => {
    discoveryWorldAudioManager.setMuted(muted);
  }, [muted]);

  return (
    <div className={cn("min-h-screen bg-background pb-10", SCREEN_SPACING.pageX)}>
      <header className="sticky top-0 z-40 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md md:-mx-6 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {config.emoji} {config.title}
            </p>
            <h1 className="text-2xl font-bold text-foreground">{config.subtitle}</h1>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id);
                  setSelected(null);
                  trackDiscoveryWorldsEvent(config.worldId, "world_mode_changed", { childId, mode: id });
                }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                  mode === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/[0.05] text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl pt-5">
        {selected && mode === "explore" ? (
          <WorldItemDetail
            config={config}
            item={selected}
            childId={childId}
            muted={muted}
            onBack={() => setSelected(null)}
            onToggleMute={() => setMuted((m) => !m)}
          />
        ) : (
          <>
            {mode === "explore" && (
              <div className="space-y-5">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <CategoryChip active={category === "all"} label="All" emoji="🌍" onClick={() => setCategory("all")} />
                  {config.manifest.categories.map((cat) => (
                    <CategoryChip
                      key={cat.id}
                      active={category === cat.id}
                      label={cat.label}
                      emoji={cat.emoji}
                      onClick={() => setCategory(cat.id)}
                    />
                  ))}
                </div>
                <VirtualizedGrid
                  items={items}
                  columns={columns}
                  rowHeight={200}
                  className="h-[min(68vh,720px)]"
                  renderItem={(item) => (
                    <WorldItemCard item={item} onSelect={setSelected} />
                  )}
                />
              </div>
            )}
            {mode === "toddler" && (
              <ToddlerGrid items={config.manifest.items.slice(0, 8)} config={config} childId={childId} />
            )}
            {mode === "quiz" && <WorldQuiz config={config} childId={childId} />}
            {mode === "hear_find" && <WorldHearFind config={config} childId={childId} />}
            {mode === "discovery" && <WorldDiscovery config={config} childId={childId} />}
            {(mode === "achievements" || mode === "stickers" || mode === "parent") && (
              <ParentPlaceholder mode={mode} config={config} childId={childId} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

function CategoryChip({
  active,
  label,
  emoji,
  onClick,
}: {
  active: boolean;
  label: string;
  emoji: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
        active ? "border-primary/50 bg-primary/15" : "border-white/10 bg-white/[0.04] text-muted-foreground",
      )}
    >
      {emoji} {label}
    </button>
  );
}

function WorldItemDetail({
  config,
  item,
  childId,
  muted,
  onBack,
  onToggleMute,
}: {
  config: DiscoveryWorldRuntimeConfig;
  item: WorldManifestItem;
  childId: number;
  muted: boolean;
  onBack: () => void;
  onToggleMute: () => void;
}) {
  const primary = config.getPrimarySound(item);

  const play = async (soundId: string, url: string, label: string) => {
    discoveryWorldAudioManager.unlockFromGesture();
    await discoveryWorldAudioManager.play(url, {
      worldId: config.worldId,
      itemId: item.id,
      soundId,
      label,
    });
    grantDiscoveryWorldXp(config.worldId, childId, "soundPlayed");
    trackDiscoveryWorldsEvent(config.worldId, "world_sound_played", { childId, itemId: item.id, soundId });
  };

  return (
    <div className="space-y-4 px-2">
      <div className="flex justify-between">
        <button type="button" onClick={onBack} className="rounded-full bg-white/5 px-3 py-2 text-sm font-semibold">
          Back
        </button>
        <button type="button" onClick={onToggleMute} className="rounded-full bg-white/5 px-3 py-2 text-sm">
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>
      <div className="rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-8 text-center">
        <span className="text-7xl">{item.emoji}</span>
        <h2 className="mt-4 text-3xl font-bold">{item.name}</h2>
        {item.funFact && <p className="mt-2 text-sm text-muted-foreground">{item.funFact}</p>}
      </div>
      {primary && (
        <button
          type="button"
          className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground"
          onClick={() => void play(primary.id, config.resolveAssetUrl(primary.gcsPath), primary.label)}
        >
          Tap to hear {primary.label}
        </button>
      )}
      {item.sounds.map((sound) => (
        <button
          key={sound.id}
          type="button"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left font-semibold"
          onClick={() => void play(sound.id, config.resolveAssetUrl(sound.gcsPath), sound.label)}
        >
          🔊 {sound.label}
        </button>
      ))}
    </div>
  );
}

function ToddlerGrid({
  items,
  config,
  childId,
}: {
  items: WorldManifestItem[];
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 px-2">
      {items.map((item) => {
        const sound = config.getPrimarySound(item);
        return (
          <button
            key={item.id}
            type="button"
            className="flex aspect-square flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-5xl"
            onClick={() => {
              if (!sound) return;
              void discoveryWorldAudioManager.play(config.resolveAssetUrl(sound.gcsPath), {
                worldId: config.worldId,
                itemId: item.id,
                soundId: sound.id,
                label: sound.label,
              });
              trackDiscoveryWorldsEvent(config.worldId, "world_sound_played", { childId, itemId: item.id });
            }}
          >
            {item.emoji}
            <span className="mt-2 text-sm font-semibold">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function WorldQuiz({ config, childId }: { config: DiscoveryWorldRuntimeConfig; childId: number }) {
  const [q, setQ] = useState(() => buildPlatformHearFindQuestion(config.manifest.items, { optionCount: 3 }));
  const correctId = q?.correctItemId;

  useEffect(() => {
    if (!q || !correctId) return;
    const item = config.manifest.items.find((i) => i.id === correctId);
    const sound = item ? config.getPrimarySound(item) : undefined;
    if (!sound || !item) return;
    void discoveryWorldAudioManager.play(config.resolveAssetUrl(sound.gcsPath), {
      worldId: config.worldId,
      itemId: item.id,
      soundId: sound.id,
    });
  }, [q, correctId, config]);

  if (!q) return null;

  return (
    <div className="space-y-4 px-4">
      <p className="text-center text-lg font-semibold">Which one makes this sound?</p>
      <div className="grid grid-cols-3 gap-3">
        {q.options.map((opt) => (
          <button
            key={opt.itemId}
            type="button"
            className="aspect-square rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-5xl"
            onClick={() => {
              const ok = gradePlatformHearFind(q, opt.itemId).correct;
              if (ok) grantDiscoveryWorldXp(config.worldId, childId, "quizCorrect");
              trackDiscoveryWorldsEvent(config.worldId, "world_quiz_completed", { childId, correct: ok });
              setQ(buildPlatformHearFindQuestion(config.manifest.items));
            }}
          >
            {opt.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorldHearFind({ config, childId }: { config: DiscoveryWorldRuntimeConfig; childId: number }) {
  const [q, setQ] = useState(() => buildPlatformHearFindQuestion(config.manifest.items, { optionCount: 4 }));

  useEffect(() => {
    if (!q) return;
    trackDiscoveryWorldsEvent(config.worldId, "world_hear_find_started", { childId });
    const item = config.manifest.items.find((i) => i.id === q.correctItemId);
    const sound = item ? config.getPrimarySound(item) : undefined;
    if (sound && item) {
      void discoveryWorldAudioManager.play(config.resolveAssetUrl(sound.gcsPath), {
        worldId: config.worldId,
        itemId: item.id,
        soundId: sound.id,
      });
    }
  }, [q, config, childId]);

  if (!q) return null;

  return (
    <div className="space-y-4 px-4 text-center">
      <p className="text-3xl font-bold">{q.prompt}</p>
      <div className="grid grid-cols-2 gap-4">
        {q.options.map((opt) => (
          <button
            key={opt.itemId}
            type="button"
            className="aspect-square rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] text-6xl"
            onClick={() => {
              const ok = gradePlatformHearFind(q, opt.itemId).correct;
              recordHearFindAttempt(config.worldId, childId, q.correctItemId, ok);
              trackDiscoveryWorldsEvent(config.worldId, "world_hear_find_completed", { childId, correct: ok });
              setQ(buildPlatformHearFindQuestion(config.manifest.items, { optionCount: 4 }));
            }}
          >
            {opt.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorldDiscovery({ config, childId }: { config: DiscoveryWorldRuntimeConfig; childId: number }) {
  const sequence = useMemo(() => buildPlatformDiscoverySequence(config.manifest.items, 12), [config.manifest.items]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<(typeof DISCOVERY_PHASE_ORDER)[number]>("image");
  const item = sequence[index % sequence.length];

  useEffect(() => {
    if (!item) return;
    const phaseIndex = DISCOVERY_PHASE_ORDER.indexOf(phase);
    const ms = discoveryPhaseDurationMs(phase, 1);
    if (phase === "narration") {
      void discoveryWorldAudioManager.play(config.resolveAssetUrl(item.narration.introGcsPath), {
        worldId: config.worldId,
        itemId: item.id,
        soundId: "intro",
      });
    }
    if (phase === "sound") {
      const sound = config.getPrimarySound(item);
      if (sound) {
        void discoveryWorldAudioManager.play(config.resolveAssetUrl(sound.gcsPath), {
          worldId: config.worldId,
          itemId: item.id,
          soundId: sound.id,
        });
      }
    }
    const timer = window.setTimeout(() => {
      const next = DISCOVERY_PHASE_ORDER[phaseIndex + 1];
      if (next && next !== "advance") setPhase(next);
      else {
        setIndex((i) => i + 1);
        setPhase("image");
        grantDiscoveryWorldXp(config.worldId, childId, "discoverySession");
      }
    }, ms);
    return () => window.clearTimeout(timer);
  }, [item, phase, index, config, childId]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${item?.id}-${phase}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={TRANSITION.warm}
        className="mx-4 rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-10 text-center"
      >
        <span className="text-7xl">{item?.emoji}</span>
        {phase !== "image" && <p className="mt-4 text-2xl font-bold">{item?.name}</p>}
      </motion.div>
    </AnimatePresence>
  );
}

function ParentPlaceholder({
  mode,
  config,
  childId,
}: {
  mode: ModeId;
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
}) {
  const progress = loadDiscoveryWorldProgress(config.worldId, childId);
  return (
    <div className="mx-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
      <h3 className="font-bold capitalize">{mode.replace("_", " ")}</h3>
      <p className="mt-2 text-sm text-muted-foreground">XP: {progress.xp}</p>
      <p className="text-sm text-muted-foreground">Stickers: {progress.stickersEarned.length}</p>
      <p className="text-sm text-muted-foreground">Quiz correct: {progress.quizCorrectTotal}</p>
    </div>
  );
}
