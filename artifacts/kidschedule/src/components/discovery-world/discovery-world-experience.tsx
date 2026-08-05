import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Compass,
  Baby,
  HelpCircle,
  BarChart3,
  Ear,
  Trophy,
  Sticker,
  Music,
} from "lucide-react";
import type { WorldManifestItem } from "@workspace/world-engine";
import { buildPlatformHearFindQuestion, gradePlatformHearFind } from "@workspace/world-engine";
import { worldItemVisualPaths } from "@/lib/world-visual-assets";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { SCREEN_SPACING } from "@/lib/experience-system";
import type { DiscoveryWorldRuntimeConfig } from "@/lib/discovery-world-config";
import { discoveryWorldAudioManager } from "@/lib/discovery-world-audio-manager";
import { trackDiscoveryWorldsEvent } from "@/lib/discovery-worlds-telemetry";
import { recordHearFindAttempt } from "@/lib/discovery-worlds-progress";
import {
  applyDiscoveryWorldEngagement,
  applyQuizEngagement,
  appendDiscoveryWorldSessionMs,
} from "@/lib/discovery-worlds-engagement";
import {
  needsDiscoveryOfflineRefresh,
  warmDiscoveryWorldOfflineCache,
} from "@/lib/discovery-world-offline-cache";
import { WorldItemCard, WorldVisualThumb } from "./world-item-card";
import { ExperienceProgressStrip } from "./experience-progress-strip";
import { PersonalizationBanner } from "./personalization-banner";
import { DiscoveryDailyAdventureCard, useDiscoveryDailyAdventure } from "./discovery-daily-adventure";
import { PlatformAchievementsPanel } from "./platform-achievements-panel";
import { PlatformStickerAlbum } from "./platform-sticker-album";
import { PlatformParentDashboard } from "./platform-parent-dashboard";
import { PlatformDiscoveryMode } from "./platform-discovery-mode";
import { WorldHeroImage } from "./world-hero-image";
import { DelightBurst } from "./delight-burst";
import { DiscoveryEmptyState } from "./discovery-world-polish";
import { PlayableInstrument } from "./playable-instrument";
import {
  AudioWaveBars,
  ModePanel,
  PressDepth,
  SoundWorldPage,
  XpFlyLayer,
  emitXpFly,
  useSoundWorldMotion,
} from "./sound-world-motion";
import { LivingEnvironmentLayer } from "./living-environment-layer";
import {
  AttentionCoachBanner,
  SoundWorldAttentionProvider,
  useSoundWorldAttention,
} from "./sound-world-attention";
import { worldAmbientAudio } from "@/lib/sound-world-ambient-audio";
import {
  primeWorldLibrarySoundUrl,
  resolveWorldLibraryPlaybackUrl,
} from "@/lib/world-library-audio-prewarm";

type ModeId =
  | "explore"
  | "play"
  | "toddler"
  | "quiz"
  | "hear_find"
  | "discovery"
  | "achievements"
  | "stickers"
  | "parent";

const MODES: Array<{ id: ModeId; label: string; icon: typeof Sparkles }> = [
  { id: "explore", label: "Explore", icon: Compass },
  { id: "play", label: "Play", icon: Music },
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
  return (
    <SoundWorldAttentionProvider childId={childId} worldId={config.worldId}>
      <DiscoveryWorldExperienceInner config={config} childId={childId} onEngage={onEngage} />
    </SoundWorldAttentionProvider>
  );
}

function DiscoveryWorldExperienceInner({
  config,
  childId,
  onEngage,
}: DiscoveryWorldExperienceProps) {
  const [mode, setMode] = useState<ModeId>("explore");
  const [category, setCategory] = useState<string | "all">("all");
  const [selected, setSelected] = useState<WorldManifestItem | null>(null);
  const [muted, setMuted] = useState(false);
  const [delight, setDelight] = useState(false);
  const sessionStart = useRef(Date.now());
  const daily = useDiscoveryDailyAdventure(config, childId);
  const { springGentle, reduced } = useSoundWorldMotion();
  const { track, adaptive } = useSoundWorldAttention();

  const items = useMemo(() => {
    if (category === "all") return config.manifest.items;
    return config.manifest.items.filter((i) => i.category === category);
  }, [category, config.manifest.items]);

  // The playable "Play" mode is only meaningful for Instrument World.
  const modes = useMemo(
    () => MODES.filter((m) => m.id !== "play" || config.worldId === "instrument_world"),
    [config.worldId],
  );

  useEffect(() => {
    onEngage?.();
    void discoveryWorldAudioManager.unlockFromGesture();
    const preloadItems = config.manifest.items.slice(0, 10);
    const soundUrls = preloadItems.flatMap((item) => {
      const s = config.getPrimarySound(item);
      return s ? [config.resolveAssetUrl(s.gcsPath)] : [];
    });
    discoveryWorldAudioManager.preloadSmart({ current: soundUrls });
    trackDiscoveryWorldsEvent(config.worldId, "world_opened", { childId });
    if (needsDiscoveryOfflineRefresh(config.worldId, childId)) {
      void warmDiscoveryWorldOfflineCache({
        worldId: config.worldId,
        childId,
        items: config.manifest.items,
        resolveSoundUrl: (p) => config.resolveAssetUrl(p),
        resolveImageUrl: (p) => config.resolveAssetUrl(p),
      });
    }
    sessionStart.current = Date.now();
    return () => {
      appendDiscoveryWorldSessionMs(
        config.worldId,
        childId,
        Date.now() - sessionStart.current,
      );
      discoveryWorldAudioManager.release();
    };
  }, [childId, config, onEngage]);

  useEffect(() => {
    if (!selected || mode !== "explore") return;
    const urls = selected.sounds.map((s) => config.resolveAssetUrl(s.gcsPath));
    const primary = config.getPrimarySound(selected);
    if (primary) urls.unshift(config.resolveAssetUrl(primary.gcsPath));
    discoveryWorldAudioManager.preloadSmart({ current: urls });
    void discoveryWorldAudioManager.preloadReady(urls, urls.length);
  }, [selected, mode, config]);

  useEffect(() => {
    discoveryWorldAudioManager.setMuted(muted);
    worldAmbientAudio.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    void worldAmbientAudio.unlock();
    return () => {
      worldAmbientAudio.release();
    };
  }, [config.worldId]);

  const panelKey = selected && mode === "explore" ? `detail-${selected.id}` : mode;

  return (
    <SoundWorldPage
      particles={false}
      className={cn("min-h-screen overflow-hidden bg-background pb-10", SCREEN_SPACING.pageX)}
    >
      <LivingEnvironmentLayer worldId={config.worldId} muted={muted} />
      <XpFlyLayer />
      <header className="relative z-10 sticky top-0 -mx-4 border-b border-border/60 bg-background px-4 py-3 md:-mx-6 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {config.emoji} {config.title}
            </p>
            <h1 className="text-2xl font-bold text-foreground">{config.subtitle}</h1>
          </div>
          <nav
            className="flex gap-2 overflow-x-auto pb-1"
            aria-label={`${config.title} learning modes`}
          >
            {modes.map(({ id, label, icon: Icon }) => (
              <motion.button
                key={id}
                type="button"
                aria-current={mode === id ? "page" : undefined}
                whileTap={reduced ? undefined : { scale: 0.95, y: 2 }}
                transition={springGentle}
                onClick={() => {
                  setMode(id);
                  setSelected(null);
                  track("navigate", { worldId: config.worldId });
                  trackDiscoveryWorldsEvent(config.worldId, "world_mode_changed", { childId, mode: id });
                }}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
                  mode === id
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/[0.05] text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </motion.button>
            ))}
          </nav>
        </div>
      </header>

      <main id="discovery-world-experience" className="relative z-10 mx-auto max-w-4xl space-y-4 pt-5">
        <DelightBurst active={delight} onDone={() => setDelight(false)} />
        <ExperienceProgressStrip config={config} childId={childId} />
        {mode === "explore" && !selected && (
          <>
            <DiscoveryDailyAdventureCard config={config} childId={childId} compact />
            <AttentionCoachBanner visible />
            <PersonalizationBanner
              config={config}
              childId={childId}
              onCategoryHint={(id) => setCategory(id)}
              offerExploration={adaptive.offerExploration}
              offerBonus={adaptive.offerBonusTask}
            />
          </>
        )}
        <ModePanel modeKey={panelKey}>
          {selected && mode === "explore" ? (
            <WorldItemDetail
              config={config}
              item={selected}
              childId={childId}
              muted={muted}
              onSoundPlayed={() => daily.record("listen_sounds")}
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
                  {items.length === 0 ? (
                    <DiscoveryEmptyState
                      variant={category === "all" ? "emptyExplore" : "emptyCategory"}
                      testId="discovery-explore-empty"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {items.map((item, index) => (
                        <WorldItemCard
                          key={item.id}
                          item={item}
                          idleIndex={index}
                          resolveAssetUrl={config.resolveAssetUrl}
                          onSelect={(next) => {
                            setSelected(next);
                            track("object_open", { itemId: next.id });
                            daily.record("open_items");
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {mode === "play" && (
                <PlayMode
                  config={config}
                  childId={childId}
                  onPlay={() => daily.record("listen_sounds")}
                />
              )}
              {mode === "toddler" && (
                <ToddlerGrid
                  items={config.manifest.items.slice(0, 8)}
                  config={config}
                  childId={childId}
                  onSoundPlayed={() => daily.record("listen_sounds")}
                />
              )}
              {mode === "quiz" && (
                <WorldQuiz
                  config={config}
                  childId={childId}
                  optionCount={
                    adaptive.quizOptionCount === 4 ? 3 : (adaptive.quizOptionCount as 2 | 3)
                  }
                  onCorrect={() => {
                    track("answer_correct");
                    daily.record("quiz_correct");
                    emitXpFly({ amount: 8 });
                  }}
                  onIncorrect={() => track("answer_incorrect")}
                  onDelight={() => setDelight(true)}
                />
              )}
              {mode === "hear_find" && (
                <WorldHearFind
                  config={config}
                  childId={childId}
                  optionCount={adaptive.quizOptionCount}
                  onCorrect={() => {
                    track("answer_correct");
                    daily.record("hear_find_correct");
                    emitXpFly({ amount: 10 });
                  }}
                  onIncorrect={() => track("answer_incorrect")}
                />
              )}
              {mode === "discovery" && (
                <PlatformDiscoveryMode
                  config={config}
                  childId={childId}
                  onSlide={() => daily.record("discovery_slides")}
                />
              )}
              {mode === "achievements" && (
                <PlatformAchievementsPanel config={config} childId={childId} />
              )}
              {mode === "stickers" && (
                <PlatformStickerAlbum config={config} childId={childId} />
              )}
              {mode === "parent" && (
                <PlatformParentDashboard config={config} childId={childId} />
              )}
            </>
          )}
        </ModePanel>
      </main>
    </SoundWorldPage>
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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold min-h-11",
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
  onSoundPlayed,
}: {
  config: DiscoveryWorldRuntimeConfig;
  item: WorldManifestItem;
  childId: number;
  muted: boolean;
  onBack: () => void;
  onToggleMute: () => void;
  onSoundPlayed?: () => void;
}) {
  const primary = config.getPrimarySound(item);
  const [playError, setPlayError] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { track } = useSoundWorldAttention();
  const playedOnce = useRef(false);

  const heroSrc = worldItemVisualPaths(item, config.resolveAssetUrl).hero;

  const play = async (soundId: string, url: string, label: string) => {
    discoveryWorldAudioManager.unlockFromGesture();
    primeWorldLibrarySoundUrl(url);
    setPlayError(false);
    setPlayingId(soundId);
    if (playedOnce.current) track("replay", { itemId: item.id });
    else playedOnce.current = true;
    try {
      const ok = await discoveryWorldAudioManager.play(url, {
        worldId: config.worldId,
        itemId: item.id,
        soundId,
        label,
      });
      if (!ok) setPlayError(true);
      applyDiscoveryWorldEngagement({
        worldId: config.worldId,
        childId,
        itemId: item.id,
        soundId,
        items: config.manifest.items,
      });
      trackDiscoveryWorldsEvent(config.worldId, "world_sound_played", {
        childId,
        itemId: item.id,
        soundId,
      });
      emitXpFly({ amount: 2 });
      onSoundPlayed?.();
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <article className="space-y-4 px-2" aria-labelledby="discovery-item-title">
      <div className="flex justify-between gap-2">
        <PressDepth
          type="button"
          onClick={onBack}
          aria-label="Back to explore grid"
          className="min-h-11 rounded-full bg-white/5 px-3 py-2 text-sm font-semibold"
        >
          Back
        </PressDepth>
        <PressDepth
          type="button"
          onClick={onToggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="min-h-11 rounded-full bg-white/5 px-3 py-2 text-sm"
        >
          {muted ? "Unmute" : "Mute"}
        </PressDepth>
      </div>
      {playError && (
        <p role="alert" className="text-center text-sm text-amber-200">
          Sound could not play — check volume or try again.
        </p>
      )}
      <WorldHeroImage src={heroSrc} emoji={item.emoji} alt={item.name} className="mx-auto max-w-sm" />
      <div className="rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-6 text-center">
        <h2 id="discovery-item-title" className="text-3xl font-bold">
          {item.name}
        </h2>
        {item.funFact && <p className="mt-2 text-sm text-muted-foreground">{item.funFact}</p>}
      </div>
      {primary && (
        <PressDepth
          type="button"
          depth={4}
          className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground"
          onPointerDown={() => primary && primeWorldLibrarySoundUrl(config.resolveAssetUrl(primary.gcsPath))}
          onClick={() => void play(primary.id, config.resolveAssetUrl(primary.gcsPath), primary.label)}
        >
          <span className="inline-flex items-center justify-center gap-3">
            Tap to hear {primary.label}
            <AudioWaveBars active={playingId === primary.id} bars={6} className="h-5" />
          </span>
        </PressDepth>
      )}
      {item.sounds.map((sound) => (
        <PressDepth
          key={sound.id}
          type="button"
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left font-semibold"
          onPointerDown={() => primeWorldLibrarySoundUrl(config.resolveAssetUrl(sound.gcsPath))}
          onClick={() => void play(sound.id, config.resolveAssetUrl(sound.gcsPath), sound.label)}
        >
          <span>🔊 {sound.label}</span>
          <AudioWaveBars
            active={playingId === sound.id}
            amplitudes={sound.waveform}
            bars={8}
            className="h-6"
          />
        </PressDepth>
      ))}
    </article>
  );
}

function ToddlerGrid({
  items,
  config,
  childId,
  onSoundPlayed,
}: {
  items: WorldManifestItem[];
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  onSoundPlayed?: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 px-2">
      {items.map((item) => {
        const sound = config.getPrimarySound(item);
        return (
          <button
            key={item.id}
            type="button"
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-3"
            onPointerDown={() => {
              if (!sound) return;
              primeWorldLibrarySoundUrl(config.resolveAssetUrl(sound.gcsPath));
            }}
            onClick={() => {
              if (!sound) return;
              discoveryWorldAudioManager.unlockFromGesture();
              void discoveryWorldAudioManager.play(config.resolveAssetUrl(sound.gcsPath), {
                worldId: config.worldId,
                itemId: item.id,
                soundId: sound.id,
                label: sound.label,
              });
              applyDiscoveryWorldEngagement({
                worldId: config.worldId,
                childId,
                itemId: item.id,
                soundId: sound.id,
                items: config.manifest.items,
              });
              trackDiscoveryWorldsEvent(config.worldId, "world_sound_played", { childId, itemId: item.id });
              onSoundPlayed?.();
            }}
          >
            <WorldVisualThumb item={item} resolveAssetUrl={config.resolveAssetUrl} size={80} />
            <span className="text-sm font-semibold">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function PlayMode({
  config,
  childId,
  onPlay,
}: {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  onPlay?: () => void;
}) {
  const [selected, setSelected] = useState<WorldManifestItem | null>(null);

  useEffect(() => {
    discoveryWorldAudioManager.unlockFromGesture();
  }, []);

  if (selected) {
    const primary = config.getPrimarySound(selected);
    const sampleUrl = primary
      ? resolveWorldLibraryPlaybackUrl(config.resolveAssetUrl(primary.gcsPath))
      : null;
    return (
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Back to instruments"
            className="min-h-11 rounded-full bg-white/5 px-3 py-2 text-sm font-semibold"
          >
            Back
          </button>
          <h2 className="text-xl font-bold">
            {selected.emoji} {selected.name}
          </h2>
          <span className="w-12" aria-hidden />
        </div>
        <PlayableInstrument
          item={selected}
          sampleUrl={sampleUrl}
          onPlay={() => {
            applyDiscoveryWorldEngagement({
              worldId: config.worldId,
              childId,
              itemId: selected.id,
              soundId: primary?.id ?? selected.id,
              items: config.manifest.items,
            });
            onPlay?.();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-2">
      <p className="text-center text-sm text-muted-foreground">
        Pick an instrument and play it yourself 🎶
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {config.manifest.items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSelected(item);
              trackDiscoveryWorldsEvent(config.worldId, "world_mode_changed", {
                itemId: item.id,
                mode: "play",
              });
            }}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[20px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-2"
          >
            <WorldVisualThumb item={item} resolveAssetUrl={config.resolveAssetUrl} size={56} />
            <span className="text-xs font-semibold">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WorldQuiz({
  config,
  childId,
  optionCount = 3,
  onCorrect,
  onIncorrect,
  onDelight,
}: {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  optionCount?: 2 | 3;
  onCorrect?: () => void;
  onIncorrect?: () => void;
  onDelight?: () => void;
}) {
  const { notePrompt } = useSoundWorldAttention();
  const [q, setQ] = useState(() =>
    buildPlatformHearFindQuestion(config.manifest.items, { optionCount }),
  );
  const correctId = q?.correctItemId;

  useEffect(() => {
    if (!q || !correctId) return;
    notePrompt();
    const item = config.manifest.items.find((i) => i.id === correctId);
    const sound = item ? config.getPrimarySound(item) : undefined;
    if (!sound || !item) return;
    void discoveryWorldAudioManager.play(config.resolveAssetUrl(sound.gcsPath), {
      worldId: config.worldId,
      itemId: item.id,
      soundId: sound.id,
    });
  }, [q, correctId, config, notePrompt]);

  if (!q) {
    return <DiscoveryEmptyState variant="emptyQuiz" className="mx-4" />;
  }

  const cols = optionCount <= 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="space-y-4 px-4" role="region" aria-label="Listening quiz">
      <p className="text-center text-lg font-semibold">Which one makes this sound?</p>
      <div className={cn("grid gap-3", cols)}>
        {q.options.map((opt) => {
          const item = config.manifest.items.find((i) => i.id === opt.itemId);
          return (
            <button
              key={opt.itemId}
              type="button"
              aria-label={item?.name ?? opt.itemId}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[24px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-2"
              onClick={() => {
                const ok = gradePlatformHearFind(q, opt.itemId).correct;
                if (ok) {
                  applyQuizEngagement(config.worldId, childId, q.correctItemId, config.manifest.items, true);
                  onCorrect?.();
                  onDelight?.();
                } else {
                  onIncorrect?.();
                }
                trackDiscoveryWorldsEvent(config.worldId, "world_quiz_completed", { childId, correct: ok });
                setQ(buildPlatformHearFindQuestion(config.manifest.items, { optionCount }));
              }}
            >
              {item ? (
                <WorldVisualThumb item={item} resolveAssetUrl={config.resolveAssetUrl} size={64} />
              ) : (
                <span className="text-4xl" aria-hidden>{opt.emoji}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WorldHearFind({
  config,
  childId,
  optionCount = 4,
  onCorrect,
  onIncorrect,
}: {
  config: DiscoveryWorldRuntimeConfig;
  childId: number;
  optionCount?: 2 | 3 | 4;
  onCorrect?: () => void;
  onIncorrect?: () => void;
}) {
  const { notePrompt, track } = useSoundWorldAttention();
  const [q, setQ] = useState(() =>
    buildPlatformHearFindQuestion(config.manifest.items, { optionCount }),
  );

  useEffect(() => {
    if (!q) return;
    notePrompt();
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
  }, [q, config, childId, notePrompt]);

  if (!q) {
    return <DiscoveryEmptyState variant="emptyHearFind" className="mx-4" />;
  }

  return (
    <div className="space-y-4 px-4 text-center" role="region" aria-label="Hear and find">
      <p className="text-3xl font-bold">{q.prompt}</p>
      <button
        type="button"
        className="text-sm font-semibold text-primary"
        onClick={() => {
          track("replay");
          const item = config.manifest.items.find((i) => i.id === q.correctItemId);
          const sound = item ? config.getPrimarySound(item) : undefined;
          if (sound && item) {
            void discoveryWorldAudioManager.play(config.resolveAssetUrl(sound.gcsPath), {
              worldId: config.worldId,
              itemId: item.id,
              soundId: sound.id,
            });
          }
        }}
      >
        Replay sound
      </button>
      <div className="grid grid-cols-2 gap-4">
        {q.options.map((opt) => {
          const item = config.manifest.items.find((i) => i.id === opt.itemId);
          return (
            <button
              key={opt.itemId}
              type="button"
              aria-label={item?.name ?? opt.itemId}
              className="flex aspect-square flex-col items-center justify-center rounded-[28px] border border-white/10 bg-[rgba(18,28,60,0.78)] p-3"
              onClick={() => {
                const ok = gradePlatformHearFind(q, opt.itemId).correct;
                recordHearFindAttempt(config.worldId, childId, q.correctItemId, ok, config.manifest.items);
                if (ok) onCorrect?.();
                else onIncorrect?.();
                trackDiscoveryWorldsEvent(config.worldId, "world_hear_find_completed", { childId, correct: ok });
                setQ(buildPlatformHearFindQuestion(config.manifest.items, { optionCount }));
              }}
            >
              {item ? (
                <WorldVisualThumb item={item} resolveAssetUrl={config.resolveAssetUrl} size={88} />
              ) : (
                <span className="text-5xl" aria-hidden>{opt.emoji}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

