/**
 * InfantPoems — "Poems for your baby" module (Spec 3).
 *
 * Replaces the old singing-guides list inside the Songs & Lullabies tab.
 * Pure local data + browser SpeechSynthesis playback — NO ElevenLabs,
 * NO external API calls, zero per-user cost.
 *
 * Composition:
 *   - Header strip with the "Poems for your baby" title
 *   - 3 age sub-tabs (0–6m, 6–12m, 12–24m) defaulting to the child's age
 *   - Tile grid (gradient cards with big icon + title + mood subtitle)
 *   - "Load More Poems" button paginating 5 at a time
 *   - Fullscreen player (portal) with floating stars, glowing orb,
 *     play/pause, loop toggle, sleep timer, volume slider
 */
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Star, Cloud, Sparkles, Sun, Heart, Sprout, Bird, Flower2,
  Play, Pause, ChevronDown, Repeat, Volume2, Clock, Plus,
  type LucideIcon,
} from "lucide-react";

import {
  ALL_POEMS,
  POEM_AGE_GROUPS,
  getDefaultAgeGroup,
  getPoemsForGroup,
  type InfantPoem,
  type PoemAgeGroup,
  type PoemIconName,
} from "@/data/infant-poems";
import { useInfantPoemPlayer, type PoemPlayer } from "@/hooks/use-poem-player";

// ─── Icon resolver ──────────────────────────────────────────────────────────
// Keeps the data file render-free — names map to lucide components here only.
const ICONS: Record<PoemIconName, LucideIcon> = {
  Moon, Star, Cloud, Sparkles, Sun, Heart, Sprout, Bird, Flower2,
};

const TIMER_OPTIONS: { label: string; ms: number | null }[] = [
  { label: "Off", ms: null },
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "30m", ms: 30 * 60 * 1000 },
  { label: "1h",  ms: 60 * 60 * 1000 },
];

const PAGE_SIZE = 5;
const INITIAL_VISIBLE = 3;

function formatRemaining(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const mm = Math.floor(totalSec / 60);
  const ss = totalSec % 60;
  return `${mm}:${ss.toString().padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function InfantPoems({ ageMonths }: { ageMonths: number }) {
  const [group, setGroup] = useState<PoemAgeGroup>(() => getDefaultAgeGroup(ageMonths));
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [openPoem, setOpenPoem] = useState<InfantPoem | null>(null);

  const player = useInfantPoemPlayer();

  const poemsInGroup = useMemo(() => getPoemsForGroup(group), [group]);
  const visiblePoems = useMemo(() => poemsInGroup.slice(0, visible), [poemsInGroup, visible]);
  const hasMore = visible < poemsInGroup.length;

  // Reset pagination + close fullscreen when the user switches age tab.
  useEffect(() => {
    setVisible(INITIAL_VISIBLE);
  }, [group]);

  function handleTilePress(poem: InfantPoem) {
    setOpenPoem(poem);
    // Spec: "Auto play on open" — fire immediately so the parent doesn't
    // have to tap twice. Browser autoplay rules treat the originating tap
    // as a user gesture, so SpeechSynthesis will be allowed to start.
    player.play({
      text: poem.lines.join(" "),
      audioUrl: poem.audioUrl,
    });
  }

  function handleClose() {
    setOpenPoem(null);
    player.stop();
  }

  return (
    <div className="space-y-3" data-testid="infant-poems-section">
      {/* Header strip */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-100/80 via-fuchsia-100/60 to-rose-100/80 dark:from-violet-900/30 dark:via-fuchsia-900/20 dark:to-rose-900/30 border border-violet-200/60 dark:border-violet-400/20 p-3 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          <p className="text-xs font-bold text-violet-900 dark:text-violet-100">
            Poems for your baby
          </p>
        </div>
        <p className="text-[12px] text-violet-800/80 dark:text-violet-100/70 leading-snug">
          Soft, age-appropriate verses with gentle audio playback. Tap any tile to open the immersive player — looping is on by default so it can soothe baby for as long as you need.
        </p>
      </div>

      {/* Age sub-tabs */}
      <div
        role="tablist"
        aria-label="Poem age groups"
        className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/10"
      >
        {POEM_AGE_GROUPS.map((g) => (
          <button
            key={g.id}
            role="tab"
            aria-selected={group === g.id}
            data-testid={`poem-age-tab-${g.id}`}
            onClick={() => setGroup(g.id)}
            className={`px-2 py-2 rounded-lg text-xs font-bold transition-all ${
              group === g.id
                ? "bg-violet-500 text-white shadow-[0_4px_12px_-2px_rgba(139,92,246,0.5)]"
                : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/10"
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Group blurb */}
      <p className="text-[11px] text-muted-foreground px-1">
        {POEM_AGE_GROUPS.find((g) => g.id === group)?.blurb}
      </p>

      {/* Tile grid */}
      <div className="grid grid-cols-2 gap-2.5" data-testid="poem-tile-grid">
        {visiblePoems.map((poem) => (
          <PoemTile
            key={poem.id}
            poem={poem}
            isPlaying={openPoem?.id === poem.id && player.isPlaying}
            onPress={() => handleTilePress(poem)}
          />
        ))}
      </div>

      {/* Empty-group fallback (should never trigger — every group has 4+) */}
      {visiblePoems.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border/60 px-3 py-6 text-center">
          <Sparkles className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[12px] text-muted-foreground">More poems coming soon for this age.</p>
        </div>
      )}

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setVisible((v) => Math.min(poemsInGroup.length, v + PAGE_SIZE))}
          data-testid="poem-load-more"
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-violet-300/60 dark:border-violet-400/30 bg-white/40 dark:bg-white/5 hover:bg-violet-50 dark:hover:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-bold transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Load More Poems
        </button>
      )}

      {/* Fullscreen immersive player */}
      <PoemFullscreenPlayer
        open={openPoem !== null}
        poem={openPoem}
        player={player}
        onClose={handleClose}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PoemTile — large rounded gradient card with big icon + title + mood
// ─────────────────────────────────────────────────────────────────────────────
function PoemTile({
  poem, isPlaying, onPress,
}: { poem: InfantPoem; isPlaying: boolean; onPress: () => void }) {
  const Icon = ICONS[poem.icon];
  return (
    <button
      onClick={onPress}
      data-testid={`poem-tile-${poem.id}`}
      data-active={isPlaying ? "true" : "false"}
      aria-label={`Play poem: ${poem.title}`}
      className={`relative aspect-[4/5] rounded-2xl overflow-hidden p-3 text-left bg-gradient-to-br ${poem.gradient} text-white border border-white/20 shadow-lg transition-transform active:scale-[0.97] hover:scale-[1.02]`}
    >
      {/* Playing pulse */}
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
          <motion.div
            animate={isPlaying ? { y: [0, -3, 0] } : { y: 0 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="h-12 w-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center"
          >
            <Icon className="h-6 w-6 drop-shadow-sm" />
          </motion.div>
          {isPlaying && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-white/25 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              Playing
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-bold leading-tight drop-shadow-sm">{poem.title}</p>
          <p className="text-[11px] text-white/80 mt-0.5">{poem.mood}</p>
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PoemFullscreenPlayer — dark backdrop + floating stars + glowing orb
// ─────────────────────────────────────────────────────────────────────────────
function PoemFullscreenPlayer({
  open, poem, player, onClose,
}: {
  open: boolean;
  poem: InfantPoem | null;
  player: PoemPlayer;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef  = useRef<HTMLButtonElement | null>(null);

  // Body scroll lock + ESC dismissal + focus trap (mirrors the white-noise
  // immersive player's a11y treatment so behaviour is consistent).
  useEffect(() => {
    if (!open) return;
    const previousOverflow   = document.body.style.overflow;
    const previouslyFocused  = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";

    function getFocusable(): HTMLElement[] {
      const root = containerRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden"));
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const focusables = getFocusable();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);

    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focusTimer);
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        previouslyFocused.focus();
      }
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && poem && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-stretch justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Immersive player for ${poem.title}`}
          data-testid="poem-fullscreen-player"
        >
          {/* Dark backdrop with poem-specific tint */}
          <motion.div
            key={poem.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: player.fadeInProgress ? 0.65 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={`absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-black bg-gradient-to-br ${poem.gradient}`}
            style={{ backgroundBlendMode: "soft-light" }}
            aria-hidden
          />
          <FloatingStars />

          <div className="relative w-full max-w-md mx-auto flex flex-col px-5 py-6 text-white">
            {/* Top bar: close + timer pill */}
            <div className="flex items-center justify-between mb-4">
              <button
                ref={closeBtnRef}
                onClick={onClose}
                aria-label="Close immersive player"
                data-testid="poem-fullscreen-close"
                className="h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              {player.remainingMs !== null && player.remainingMs > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold">
                  <Clock className="h-3 w-3" />
                  {formatRemaining(player.remainingMs)}
                </div>
              )}
            </div>

            {/* Glowing orb + title */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[200px]">
              <GlowingOrb tint={poem.tint} active={player.isPlaying && !player.isPaused} />
              <p className="mt-6 text-2xl font-bold tracking-tight text-center">
                {poem.title}
              </p>
              <p className="text-[12px] text-white/70 mt-1">{poem.mood}</p>
            </div>

            {/* Lyrics — softly faded */}
            <div className="mb-5 rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/15">
              {poem.lines.map((line, i) => (
                <p key={i} className="text-[14px] leading-relaxed text-white/85 text-center">
                  {line}
                </p>
              ))}
            </div>

            {/* Controls row — play/pause + loop */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <ControlButton
                onClick={() => player.setLoop(!player.loop)}
                label={player.loop ? "Loop on" : "Loop off"}
                active={player.loop}
                testid="poem-loop-toggle"
              >
                <Repeat className="h-5 w-5" />
              </ControlButton>

              <button
                onClick={() => {
                  if (!player.isPlaying) {
                    player.play({ text: poem.lines.join(" "), audioUrl: poem.audioUrl });
                  } else if (player.isPaused) {
                    player.resume();
                  } else {
                    player.pause();
                  }
                }}
                aria-label={player.isPlaying && !player.isPaused ? "Pause poem" : "Play poem"}
                data-testid="poem-play-pause"
                className="h-16 w-16 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
              >
                {player.isPlaying && !player.isPaused
                  ? <Pause className="h-7 w-7" fill="currentColor" />
                  : <Play  className="h-7 w-7 ml-0.5" fill="currentColor" />}
              </button>

              <ControlButton
                onClick={() => {/* placeholder slot to keep visual symmetry */}}
                label="Volume"
                active={false}
                testid="poem-volume-icon"
                disabled
              >
                <Volume2 className="h-5 w-5" />
              </ControlButton>
            </div>

            {/* Volume slider */}
            <div className="mb-4">
              <label htmlFor="poem-volume" className="sr-only">Volume</label>
              <input
                id="poem-volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={player.volume}
                onChange={(e) => player.setVolume(Number(e.target.value))}
                data-testid="poem-volume-slider"
                className="w-full accent-white"
              />
            </div>

            {/* Sleep timer pills */}
            <div className="flex gap-2 mb-2">
              {TIMER_OPTIONS.map((t) => (
                <button
                  key={t.label}
                  onClick={() => player.setTimer(t.ms)}
                  data-testid={`poem-timer-${t.label.toLowerCase()}`}
                  aria-pressed={player.timerMs === t.ms}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold backdrop-blur-md transition-all ${
                    player.timerMs === t.ms
                      ? "bg-white text-slate-900"
                      : "bg-white/15 hover:bg-white/25 text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {!player.supported && (
              <p className="text-[11px] text-white/70 text-center mt-3">
                Audio playback isn't supported in this browser — the poem is shown for you to read aloud.
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function ControlButton({
  children, onClick, label, active, testid, disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active: boolean;
  testid: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      data-testid={testid}
      className={`h-12 w-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
        disabled
          ? "bg-white/5 text-white/30 cursor-default"
          : active
          ? "bg-white/30 text-white"
          : "bg-white/10 hover:bg-white/20 text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

function GlowingOrb({ tint, active }: { tint: string; active: boolean }) {
  return (
    <div className="relative h-44 w-44 flex items-center justify-center" aria-hidden>
      {/* Halo */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${tint}88, transparent 70%)`,
          filter: "blur(20px)",
        }}
        animate={active ? { scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] } : { scale: 1, opacity: 0.4 }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Outer ring */}
      <motion.div
        className="absolute h-40 w-40 rounded-full border-2 border-white/40"
        animate={active ? { scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] } : { scale: 1, opacity: 0.2 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Body */}
      <motion.div
        className="h-32 w-32 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, white, ${tint} 55%, ${tint}88 100%)`,
          boxShadow: `0 0 60px ${tint}, 0 0 120px ${tint}80`,
        }}
        animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Inner highlight */}
      <div
        className="absolute h-8 w-8 rounded-full bg-white/80"
        style={{ filter: "blur(6px)", top: "30%", left: "32%" }}
      />
    </div>
  );
}

// Floating stars in the backdrop. Pre-seeded so they don't reshuffle on
// every render — the parent is meant to feel calm and steady.
const StarSpec: ComponentType<{ tint?: string }> = ({ tint = "#ffffff" }) => {
  const seeds = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({
      left:     ((i * 41) % 100),
      top:      ((i * 17) % 90) + 5,
      duration: 6 + ((i * 11) % 8),
      delay:    (i * 0.4) % 5,
      size:     2 + ((i * 7) % 4),
    })),
    [],
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {seeds.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: tint,
            boxShadow: `0 0 ${s.size * 2}px ${tint}`,
          }}
          animate={{ opacity: [0.2, 0.9, 0.2], y: [0, -8, 0] }}
          transition={{ duration: s.duration, repeat: Infinity, ease: "easeInOut", delay: s.delay }}
        />
      ))}
    </div>
  );
};
const FloatingStars = StarSpec;
