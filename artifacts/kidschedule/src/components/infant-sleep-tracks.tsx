/**
 * Shared track list + immersive player for lullabies and sleep stories.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Star, Cloud, Sparkles, Music, Heart, Bird, Sprout, BookOpen, Waves,
  Play, Pause, ChevronDown, Repeat, Volume2, Clock, Loader2, Heart as HeartIcon,
  Download, Check, type LucideIcon,
} from "lucide-react";
import {
  type SleepLibraryItem,
  getItemsForCategory,
  resolveSleepItemAudioUrl,
  type SleepCategory,
} from "@/data/infant-sleep-catalog";
import { getSleepStorySpeakText } from "@/data/infant-sleep-stories";
import { useInfantPoemPlayer, type PoemPlayer } from "@/hooks/use-poem-player";
import {
  recordSleepPlay,
  toggleSleepFavorite,
  isSleepFavorite,
  isSleepPackDownloaded,
  getSleepPreferences,
  setSleepPreference,
} from "@/lib/infant-sleep-library-state";
import type { SoundEngine } from "@/hooks/use-sound-engine";
import {
  SleepLoadMoreButton,
  SleepSectionHeader,
  sleepMediaGradient,
} from "@/components/infant-sleep-ui";

const ICONS: Record<string, LucideIcon> = {
  Moon, Star, Cloud, Sparkles, Music, HeartIcon, Bird, Sprout, BookOpen, Waves,
};

const TIMER_OPTIONS: { label: string; ms: number | null }[] = [
  { label: "Off", ms: null },
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "30m", ms: 30 * 60 * 1000 },
  { label: "1h", ms: 60 * 60 * 1000 },
];

const PAGE_SIZE = 6;
const INITIAL_VISIBLE = 4;

function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

function defaultLoopForItem(item: SleepLibraryItem): boolean {
  return item.loopRecommendation === "always" || item.loopRecommendation === "recommended";
}

export function InfantSleepTracks({
  category,
  childId,
  noiseEngine,
  headerTitle,
  headerBlurb,
  tileTestIdPrefix = "sleep-track-tile",
}: {
  category: Extract<SleepCategory, "lullaby" | "story">;
  childId?: string;
  noiseEngine?: SoundEngine;
  headerTitle: string;
  headerBlurb: string;
  /** Override tile test id prefix (e.g. rhyme-tile for /rhymes). */
  tileTestIdPrefix?: string;
}) {
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [openTrack, setOpenTrack] = useState<SleepLibraryItem | null>(null);
  const [favTick, setFavTick] = useState(0);
  const player = useInfantPoemPlayer();
  const prefs = useMemo(() => getSleepPreferences(childId), [childId, favTick]);

  const allTracks = useMemo(() => getItemsForCategory(category), [category]);
  const visibleTracks = useMemo(() => allTracks.slice(0, visible), [allTracks, visible]);
  const hasMore = visible < allTracks.length;

  const handleContinuousAfterEnd = useCallback(() => {
    if (!prefs.continuousMode || !noiseEngine) return;
    const map: Record<string, Parameters<SoundEngine["play"]>[0]> = {
      "wn-shush": "shush",
      "wn-womb": "womb",
      "wn-heartbeat": "heartbeat",
      "wn-pink": "pink",
      "wn-white": "white",
      "wn-brown": "brown",
      "wn-fan": "fan",
      "wn-hvac": "hvac",
      "wn-rain": "rain",
    };
    const soundId = map[prefs.continuousNoiseId] ?? "pink";
    noiseEngine.play(soundId);
  }, [prefs.continuousMode, prefs.continuousNoiseId, noiseEngine]);

  function handleTilePress(track: SleepLibraryItem) {
    const isStory = category === "story";
    const isLullaby = category === "lullaby";
    const packId = track.packId === "none" ? "core-v1" : track.packId;
    if (!isStory && !isLullaby && !isSleepPackDownloaded(packId, childId)) return;
    setOpenTrack(track);
    const defaultLoop = defaultLoopForItem(track);
    player.setLoop(defaultLoop);
    recordSleepPlay(track.id, childId);

    const speakText = isStory
      ? getSleepStorySpeakText(track.id, track.title)
      : track.title;

    void player.play({
      text: speakText,
      audioUrl: isLullaby || isStory ? undefined : resolveSleepItemAudioUrl(track),
      trackId: track.id,
      gcsAudioId: isLullaby ? (track.gcsAudioId ?? track.id) : undefined,
      contentType: category,
      onEnded: category === "story" || !defaultLoop ? handleContinuousAfterEnd : undefined,
    });
  }

  function handleClose() {
    setOpenTrack(null);
    player.stop();
  }

  return (
    <div className="space-y-3" data-testid={`infant-sleep-${category}-section`}>
      <SleepSectionHeader
        icon={
          category === "lullaby" ? (
            <Music className="h-4 w-4" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )
        }
        title={headerTitle}
        blurb={headerBlurb}
        accent={category === "lullaby" ? "lullaby" : "story"}
      />

      {category === "lullaby" && noiseEngine && (
        <ContinuousModeToggle
          childId={childId}
          onChange={() => setFavTick((n) => n + 1)}
        />
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {visibleTracks.map((track) => {
          const isActive = openTrack?.id === track.id;
          const downloaded = isSleepPackDownloaded(
            track.packId === "none" ? "core-v1" : track.packId,
            childId,
          );
          const playable = category === "lullaby" || category === "story" || downloaded;
          const isFav = isSleepFavorite(track.id, childId);
          return (
            <SleepTrackTile
              key={track.id}
              track={track}
              tileTestId={`${tileTestIdPrefix}-${track.id}`}
              isActive={isActive}
              isPlaying={isActive && player.isPlaying}
              isLoading={isActive && player.isLoading}
              isFavorite={isFav}
              downloaded={playable}
              onPress={() => handleTilePress(track)}
              onToggleFavorite={() => {
                toggleSleepFavorite(track.id, childId);
                setFavTick((n) => n + 1);
              }}
            />
          );
        })}
      </div>

      {hasMore && (
        <SleepLoadMoreButton
          onClick={() => setVisible((v) => Math.min(allTracks.length, v + PAGE_SIZE))}
          label="Load more"
          testId="sleep-load-more"
        />
      )}

      <SleepTrackFullscreenPlayer
        open={openTrack !== null}
        track={openTrack}
        player={player}
        onClose={handleClose}
        childId={childId}
        onFavoriteChange={() => setFavTick((n) => n + 1)}
      />
    </div>
  );
}

function ContinuousModeToggle({
  childId,
  onChange,
}: {
  childId?: string;
  onChange: () => void;
}) {
  const prefs = getSleepPreferences(childId);
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-white/40 dark:bg-white/5 px-3 py-2 text-[11px] text-muted-foreground cursor-pointer">
      <input
        type="checkbox"
        checked={prefs.continuousMode}
        onChange={(e) => {
          setSleepPreference("continuousMode", e.target.checked, childId);
          onChange();
        }}
        className="rounded"
        data-testid="continuous-mode-toggle"
      />
      <span>After lullaby ends, fade into soft white noise</span>
    </label>
  );
}

function SleepTrackTile({
  track,
  tileTestId,
  isActive,
  isPlaying,
  isLoading,
  isFavorite,
  downloaded,
  onPress,
  onToggleFavorite,
}: {
  track: SleepLibraryItem;
  tileTestId: string;
  isActive: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  isFavorite: boolean;
  downloaded: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const Icon = ICONS[track.icon] ?? Moon;
  const gradient = sleepMediaGradient(track.category as "lullaby" | "story", track.id);
  return (
    <div className={`sleep-media-tile aspect-[4/5] bg-gradient-to-br ${gradient}`}>
      <button
        onClick={onPress}
        disabled={!downloaded}
        data-testid={tileTestId}
        aria-label={`Play ${track.title}`}
        className="relative w-full h-full p-3 text-left text-white transition-transform active:scale-[0.97] disabled:opacity-50"
      >
        {isPlaying && (
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-white/10"
            animate={{ opacity: [0.05, 0.18, 0.05] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="sleep-media-tile-icon">
              <Icon className="h-6 w-6" />
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/80" />
            ) : downloaded ? (
              <Check className="h-4 w-4 text-white/70" aria-label="Ready to play" />
            ) : (
              <Download className="h-4 w-4 text-white/70" aria-label="Download required" />
            )}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{track.title}</p>
            <p className="text-[11px] text-white/80 mt-0.5">
              {track.durationSec ? `${Math.round(track.durationSec / 60)} min` : "Loop"}
            </p>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/20 flex items-center justify-center"
      >
        <HeartIcon className={`h-3.5 w-3.5 ${isFavorite ? "fill-red-400 text-red-400" : "text-white/80"}`} />
      </button>
    </div>
  );
}

function SleepTrackFullscreenPlayer({
  open,
  track,
  player,
  onClose,
  childId,
  onFavoriteChange,
}: {
  open: boolean;
  track: SleepLibraryItem | null;
  player: PoemPlayer;
  onClose: () => void;
  childId?: string;
  onFavoriteChange: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const isFav = track ? isSleepFavorite(track.id, childId) : false;

  return createPortal(
    <AnimatePresence>
      {open && track && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-stretch justify-center"
          role="dialog"
          aria-modal="true"
          data-testid="sleep-track-fullscreen-player"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/90 via-violet-950/95 to-black" />
          <div className="relative w-full max-w-md mx-auto flex flex-col px-5 py-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close player"
                className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  toggleSleepFavorite(track.id, childId);
                  onFavoriteChange();
                }}
                aria-label="Toggle favorite"
                className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center"
              >
                <HeartIcon className={`h-5 w-5 ${isFav ? "fill-red-400 text-red-400" : ""}`} />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center min-h-[180px]">
              <p className="text-2xl font-bold text-center">{track.title}</p>
              <p className="text-[12px] text-white/70 mt-1 capitalize">{track.category.replace("_", " ")}</p>
            </div>

            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => player.setLoop(!player.loop)}
                aria-pressed={player.loop}
                className={`h-12 w-12 rounded-full flex items-center justify-center ${player.loop ? "bg-white text-foreground" : "bg-white/15"}`}
              >
                <Repeat className="h-5 w-5" />
              </button>
              <button
                onClick={() => {
                  if (player.isLoading) return;
                  if (!player.isPlaying) {
                    const isStory = track.category === "story";
                    const isLullaby = track.category === "lullaby";
                    void player.play({
                      text: isStory
                        ? getSleepStorySpeakText(track.id, track.title)
                        : track.title,
                      audioUrl: isLullaby || isStory ? undefined : resolveSleepItemAudioUrl(track),
                      trackId: track.id,
                      gcsAudioId: isLullaby ? (track.gcsAudioId ?? track.id) : undefined,
                      contentType: track.category as "lullaby" | "story",
                    });
                  } else if (player.isPaused) player.resume();
                  else player.pause();
                }}
                className="h-16 w-16 rounded-full bg-white text-foreground flex items-center justify-center shadow-2xl"
              >
                {player.isLoading ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : player.isPlaying && !player.isPaused ? (
                  <Pause className="h-7 w-7" fill="currentColor" />
                ) : (
                  <Play className="h-7 w-7 ml-0.5" fill="currentColor" />
                )}
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Sleep timer</p>
              <div className="grid grid-cols-4 gap-1.5">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => player.setTimer(opt.ms)}
                    className={`py-2 rounded-lg text-[11px] font-bold ${
                      player.timerMs === opt.ms ? "bg-white text-foreground" : "bg-white/15 text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Volume2 className="h-4 w-4 text-white/70" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={player.volume}
                  onChange={(e) => player.setVolume(parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-white"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export { formatRemaining };
