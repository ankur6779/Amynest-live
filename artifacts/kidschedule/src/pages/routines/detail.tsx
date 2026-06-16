import { parseApiJson } from "@/lib/safe-json-response";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link, useParams, useSearch } from "wouter";
import { useGetRoutine, getGetRoutineQueryKey, useDeleteRoutine, getListRoutinesQueryKey, useGetChild, getGetChildQueryKey, useUpdateRoutineUiPrefs } from "@workspace/api-client-react";
import { RoutineFeedbackBar, feedbackActivityKey, type RoutineFeedbackSignal } from "@/components/routines/routine-feedback-bar";
import { track } from "@/lib/analytics";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getActivityImage } from "@/lib/activity-images";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar as CalendarIcon, User, Trash2, Sparkles, Check, SkipForward, Clock, Bell, BellOff, Share2, Copy, ChefHat, Timer, Users, Pencil, Plus, RotateCcw, Moon, X, Save, BookOpen, Lock, Crown, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { addPoints, checkAndAwardBadges, getTotalPoints } from "@/lib/rewards";
import { earnGamingPoints } from "@/lib/gaming-wallet-api";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { routineDateKey } from "@/lib/routines";
import { MealRecipeCard } from "@/components/MealRecipeCard";
import { isVoiceEnabled, getVoiceSettings, openAiVoiceForGender, ROUTINE_TASK_ANNOUNCE_MSGS, type VoiceSettings } from "@/lib/voice";
import { VoiceSettingsPanel } from "@/components/voice-settings";
import { useAmyVoice } from "@/hooks/use-amy-voice";
import { runAdaptiveEngine, type AdaptiveMood, type AdaptiveSleepQuality } from "@workspace/family-routine";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RoutineAdaptationsCard } from "@/components/intelligence/routine-adaptations-card";
import { RoutineDayPanel } from "@/components/routine-day-panel";
import { RoutineProgressRail } from "@/components/routine-progress-rail";
import { MealOptionPills } from "@/components/routines/meal-option-pills";
import { RoutineRevealOverlay } from "@/components/routines/routine-reveal-overlay";
import { RoutineNowHero } from "@/components/routines/routine-now-hero";
import { RoutineNowBar } from "@/components/routines/routine-now-bar";
import { RoutineCelebration } from "@/components/routines/routine-celebration";
import { RoutineShareCard } from "@/components/routines/routine-share-card";
import { RoutineTrustRibbon } from "@/components/routines/routine-trust-ribbon";
import {
  buildDayArcSegments,
  buildRevealHighlightChips,
  buildRoutineTrustRibbonSignals,
  buildShareCardMealSummary,
  buildShareCardTimeline,
  extractDinnerFoodChips,
  extractMealOptionPills,
  isBedtimeAnchorItem,
  isDinnerAnchorItem,
  isMealRoutineItem,
  resolveRoutineCategoryVisual,
} from "@/lib/routine-detail-premium";
import { buildTimelineRenderEntries } from "@/lib/routine-timeline-collapse";
import {
  HUB_GLASS_SURFACE,
  PARENT_HUB_PAGE,
  ROUTINES_HUB_ACCENT,
} from "@/lib/parent-hub-premium";
import { cn } from "@/lib/utils";
import { primaryLinkedModuleHref } from "@/lib/hub-activity-cross-link";
import {
  cleanRoutineNotes,
  formatCategoryLabel,
  formatMinutesUntil,
  formatRoutineDurationLong,
  formatRoutineDurationShort,
  formatRoutineTime,
  isSleepRoutineItem,
  linkedModuleLabel,
  parseRoutineTimeToMinutes,
  resolveTimelinePhase,
  type TimelineTaskPhase,
} from "@/lib/routine-timeline-ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
type ItemStatus = "pending" | "completed" | "skipped" | "delayed";
type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: ItemStatus;
  skipReason?: string;
  imageUrl?: string;
  /** Set by the Adaptive Engine when it auto-modifies a task. */
  adjusted?: boolean;
  meal?: string;
  recipe?: {
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: string[];
    steps: string[];
    tip?: string;
  };
  nutrition?: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    notes?: string;
  };
  ageBand?: "2-5" | "6-10" | "10+";
  parentHubTopic?: string;
  description?: string;
  linkedModules?: string[];
};
const STATUS_STYLES: Record<ItemStatus, string> = {
  pending: "",
  completed: "border-border bg-muted dark:bg-card dark:border-primary",
  skipped: "border-dashed border-muted-foreground/30 opacity-60",
  delayed: "border-border bg-muted dark:bg-card dark:border-primary"
};
function parse12hToMinutes(timeStr: string): number {
  return parseRoutineTimeToMinutes(timeStr);
}
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ── Priority System ────────────────────────────────────────────────
const CATEGORY_PRIORITY: Record<string, "high" | "medium" | "low"> = {
  sleep: "high",
  "wind-down": "high",
  hygiene: "high",
  meal: "high",
  tiffin: "high",
  school: "high",
  morning: "medium",
  homework: "medium",
  exercise: "medium",
  bonding: "medium",
  travel: "medium",
  reading: "medium",
  snack: "medium",
  play: "low",
  screen: "low"
};
function getPriority(category: string, activity = ""): "high" | "medium" | "low" {
  const key = Object.keys(CATEGORY_PRIORITY).find(k => category?.toLowerCase().includes(k));
  if (key) return CATEGORY_PRIORITY[key];
  if (/sleep|bedtime|bath|brush|toilet|shower/i.test(activity)) return "high";
  if (/breakfast|lunch|dinner|meal|eat|tiffin/i.test(activity)) return "high";
  return "medium";
}

// ── Smart Cascade (shift + auto-skip) ─────────────────────────────
// Shifts all pending tasks from `fromIndex` by `delayMinutes`.
// If a task would end past the sleep anchor, auto-skips it if it's low or medium priority.
// HIGH priority tasks (hygiene, meals, sleep) are NEVER auto-skipped.
function smartCascade(items: RoutineItem[], fromIndex: number, delayMinutes: number): {
  items: RoutineItem[];
  autoSkipped: number;
} {
  const updated = [...items];
  let autoSkipped = 0;

  // Find the first sleep/bedtime anchor after fromIndex to use as a hard deadline
  let sleepAnchorMins = -1;
  for (let i = fromIndex; i < items.length; i++) {
    const cat = items[i].category?.toLowerCase() ?? "";
    if (cat === "sleep" || /sleep|bedtime|good night/i.test(items[i].activity)) {
      sleepAnchorMins = parse12hToMinutes(items[i].time);
      break;
    }
  }
  for (let i = fromIndex; i < updated.length; i++) {
    const item = updated[i];
    if (item.status === "completed") continue; // never touch completed

    const currentMins = parse12hToMinutes(item.time);
    if (currentMins < 0) continue;
    const newStartMins = currentMins + delayMinutes;
    const dur = item.duration ?? 30;
    const priority = getPriority(item.category, item.activity);

    // Is this the sleep anchor itself? Keep it but shift it
    const isSleepAnchor = item.category === "sleep" || /sleep|bedtime|good night/i.test(item.activity);

    // If this non-anchor task would end past the sleep anchor, auto-skip it
    if (!isSleepAnchor && sleepAnchorMins > 0 && newStartMins + dur > sleepAnchorMins) {
      if (priority === "low" || priority === "medium") {
        updated[i] = {
          ...item,
          status: "skipped",
          skipReason: "⏭️ Skipped — not enough time"
        };
        autoSkipped++;
        continue;
      }
      // HIGH priority task that doesn't fit: keep it shifted (may push past sleep — unavoidable)
    }

    // If task was previously auto-skipped and now fits again, restore it
    const wasAutoSkipped = item.skipReason === "⏭️ Skipped — not enough time";
    const nowFits = isSleepAnchor || sleepAnchorMins < 0 || newStartMins + dur <= sleepAnchorMins;
    if (wasAutoSkipped && nowFits && item.status === "skipped") {
      updated[i] = {
        ...item,
        status: "pending",
        time: minutesToTime(newStartMins),
        skipReason: undefined
      };
      continue;
    }

    // Normal shift
    updated[i] = {
      ...item,
      time: minutesToTime(newStartMins),
      skipReason: undefined
    };
  }
  return {
    items: updated,
    autoSkipped
  };
}

// Keep backward-compat shim (used only for notifications scheduling)
function shiftScheduleFromIndex(items: RoutineItem[], fromIndex: number, delayMinutes: number): RoutineItem[] {
  return smartCascade(items, fromIndex, delayMinutes).items;
}

// ─── Slide-to-Complete ────────────────────────────────────────────────────────
function SlideToComplete({
  onComplete,
  disabled = false
}: {
  onComplete(): void;
  disabled?: boolean;
}) {
  const {
    t
  } = useTranslation();
  const trackRef = useRef<HTMLDivElement>(null);
  const [knobX, setKnobX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const startClientX = useRef(0);
  const startKnobX = useRef(0);
  const active = useRef(false);
  const KNOB = 40;
  const maxX = () => Math.max(0, (trackRef.current?.clientWidth ?? 200) - KNOB - 8);
  const progress = maxX() > 0 ? knobX / maxX() : 0;
  const onDown = (e: React.PointerEvent) => {
    if (disabled || done) return;
    e.stopPropagation();
    startClientX.current = e.clientX;
    startKnobX.current = knobX;
    active.current = true;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!active.current) return;
    const nx = Math.max(0, Math.min(startKnobX.current + e.clientX - startClientX.current, maxX()));
    setKnobX(nx);
  };
  const onUp = () => {
    if (!active.current) return;
    active.current = false;
    setDragging(false);
    if (progress >= 0.85) {
      setDone(true);
      setKnobX(maxX());
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
      setTimeout(onComplete, 260);
    } else {
      setKnobX(0);
    }
  };
  return <div ref={trackRef} className="relative h-11 rounded-full overflow-hidden select-none" style={{
    background: "rgba(99,102,241,0.10)",
    border: "1.5px solid rgba(99,102,241,0.30)",
    touchAction: "none"
  }}>
      {/* Green fill as knob moves */}
      <div className="absolute inset-y-0 left-0 rounded-full transition-none" style={{
      width: `${4 + knobX + KNOB / 2}px`,
      background: `rgba(34,197,94,${0.15 + progress * 0.55})`,
      transition: dragging ? "none" : "width 0.3s cubic-bezier(0.34,1.56,0.64,1)"
    }} />
      {/* Track label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
      opacity: Math.max(0, 1 - progress * 2.2)
    }}>
        <span className="text-xs font-bold tracking-wide" style={{ color: "rgba(99,102,241,0.85)" }}>
          {done ? "✅ Completed!" : "Slide to complete  →"}
        </span>
      </div>
      {/* Success label */}
      {progress > 0.5 && <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
      opacity: Math.max(0, progress * 2 - 1)
    }}>
          <span className="text-xs font-black text-primary tracking-wide">{t("pages.routines.detail.release_to_complete")}</span>
        </div>}
      {/* Knob */}
      <div className="absolute top-1 rounded-full shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing" style={{
      left: `${4 + knobX}px`,
      width: KNOB,
      height: KNOB,
      // audit-ok: #7B3FF2/#6366F1 are brand violet/indigo — SlideToComplete knob gradient
      background: "linear-gradient(135deg,#7B3FF2,#6366F1)",
      transition: dragging ? "none" : "left 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      touchAction: "none"
    }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {/* audit-ok: text-green-300 is semantic success color on the dark brand knob (done state) */}
        <Check className={`h-4 w-4 transition-colors ${done ? "text-green-300" : "text-white"}`} />
      </div>
    </div>;
}

// ─── Routine Item Expand Modal ─────────────────────────────────────────────────
function RoutineItemModal({
  item,
  index,
  isOpen,
  onClose,
  isInteractive,
  onComplete,
  onDelay,
  onSkip,
  routineId,
  seed,
  feedbackContext = null
}: {
  item: RoutineItem | null;
  index: number;
  isOpen: boolean;
  onClose(): void;
  isInteractive: boolean;
  onComplete(): void;
  onDelay(): void;
  onSkip(): void;
  routineId: number;
  seed: number;
  feedbackContext?: { childId: number; routineDate: string } | null;
}) {
  const {
    t
  } = useTranslation();
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);
  if (!isOpen || !item) return null;
  const img = getActivityImage(item.category, item.activity, seed);
  const status = item.status ?? "pending";
  const isPending = status === "pending";
  const moduleHref = primaryLinkedModuleHref(item.linkedModules);
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="routine-modal-enter bg-card w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Hero image — intentionally dark in both themes (image + dark
            gradient overlay). data-on-dark keeps the white title /
            chips / close button readable in light mode by exempting
            this region from the safety net rewrite. */}
        <div data-on-dark className="relative h-52 overflow-hidden rounded-t-3xl sm:rounded-t-3xl bg-muted shrink-0">
          <img src={img.src} alt={item.activity} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors">
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-xl font-black text-white leading-tight" style={{
            wordBreak: "break-word"
          }}>
              {item.activity}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-white/80 text-xs font-medium">{formatRoutineTime(item.time)}{formatRoutineDurationShort(item) ? ` · ${formatRoutineDurationShort(item)}` : ""}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">{formatCategoryLabel(item.category)}</span>
              {status === "completed" && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-white">{t("pages.routines.detail.done")}</span>}
              {status === "skipped" && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-card text-white">{t("pages.routines.detail.skipped")}</span>}
              {status === "delayed" && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-white">{t("pages.routines.detail.delayed")}</span>}
              {item.ageBand && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30 backdrop-blur-sm inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {t("pages.routines.detail.ages")} {item.ageBand.replace("-", "–")}
                </span>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Skip reason */}
          {item.skipReason && <div className="flex items-start gap-2 bg-muted border border-border rounded-2xl p-3">
              <span className="text-primary mt-0.5">⚠️</span>
              <p className="text-sm text-primary font-medium leading-relaxed" style={{
            wordBreak: "break-word"
          }}>{item.skipReason}</p>
            </div>}

          {/* Notes / meal options */}
          {item.notes && item.notes.startsWith("Options:") ? <div className="space-y-2">
              <p className="text-sm font-bold text-foreground">{t("pages.routines.detail.meal_options")}</p>
              <div className="flex flex-wrap gap-2">
                {item.notes.replace("Options:", "").split("|").map((opt, oi) => <span key={oi} className="text-sm font-medium px-3 py-1.5 rounded-full bg-muted text-primary border border-border">
                    {opt.trim()}
                  </span>)}
              </div>
            </div> : cleanRoutineNotes(item.notes) ? <div className="bg-muted/50 rounded-2xl p-4">
              <p className="text-sm font-bold text-foreground mb-1">{t("pages.routines.detail.instructions")}</p>
              <p className="text-sm text-muted-foreground leading-relaxed" style={{
            wordBreak: "break-word",
            whiteSpace: "normal"
          }}>
                {cleanRoutineNotes(item.notes)}
              </p>
            </div> : null}

          {item.description && !item.notes?.startsWith("Options:") ? <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
              <p className="text-sm text-foreground leading-relaxed" style={{
            wordBreak: "break-word",
            whiteSpace: "normal"
          }}>
                {item.description}
              </p>
            </div> : null}

          {moduleHref ? <Link href={moduleHref} className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline w-fit">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span>{t("pages.routines.detail.explore_parent_hub", { defaultValue: "Explore in Parent Hub" })}</span>
            </Link> : null}

          {/* Actions */}
          {isInteractive && isPending && <div className="grid grid-cols-3 gap-2 pt-1">
              <button onClick={() => {
            onComplete();
            onClose();
          }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-muted border border-border text-primary hover:bg-muted active:scale-95 transition-all">
                <Check className="h-5 w-5" />
                <span className="text-xs font-bold">{t("pages.routines.detail.complete")}</span>
              </button>
              <button onClick={() => {
            onDelay();
            onClose();
          }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-muted border border-border text-primary hover:bg-muted active:scale-95 transition-all">
                <Clock className="h-5 w-5" />
                <span className="text-xs font-bold">{t("pages.routines.detail.delay_15m")}</span>
              </button>
              <button onClick={() => {
            onSkip();
            onClose();
          }} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-muted border border-border text-muted-foreground hover:bg-muted/80 active:scale-95 transition-all">
                <SkipForward className="h-5 w-5" />
                <span className="text-xs font-bold">{t("pages.routines.detail.skip")}</span>
              </button>
            </div>}
          {isInteractive && !isPending && <button onClick={() => {
          onComplete();
          onClose();
        }} className="w-full py-3 rounded-2xl bg-muted border border-border text-muted-foreground text-sm font-bold hover:bg-muted/80 transition-colors">
              {t("pages.routines.detail.mark_as_pending_again")}
            </button>}

          {feedbackContext && (
            <RoutineFeedbackBar
              className="rounded-2xl border border-border bg-muted/40 px-4 py-3"
              childId={feedbackContext.childId}
              routineId={routineId}
              routineDate={feedbackContext.routineDate}
              activityKey={feedbackActivityKey(item.activity)}
              title={t("components.routine_feedback.activity_title", { defaultValue: "How was this activity?" })}
              signals={["loved_this", "too_tiring"]}
            />
          )}

          <button onClick={onClose} className="w-full py-3 rounded-2xl border border-border text-foreground text-sm font-bold hover:bg-muted/50 transition-colors">
            {t("pages.routines.detail.close")}
          </button>
        </div>
      </div>
    </div>;
}
export default function RoutineDetail() {
  const {
    t
  } = useTranslation();
  const [_, setLocation] = useLocation();
  const params = useParams<{
    id: string;
  }>();
  const routineId = parseInt(params.id || "0");
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const authFetch = useAuthFetch();
  const { isSignedIn } = useAuth();
  const { isPremium, entitlements } = useSubscription();
  const isRoutineGenerateLocked = !isPremium && (entitlements?.usage.features?.routine_generate?.locked ?? false);
  const [localItems, setLocalItems] = useState<RoutineItem[] | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const pushRemindersHydratedRef = useRef<number | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => getVoiceSettings());
  const [voiceOn, setVoiceOn] = useState(() => isVoiceEnabled());
  const { speak, pause } = useAmyVoice({ voiceId: openAiVoiceForGender(voiceSettings.gender) });
  const announcedTaskRef = useRef<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [babysitterInfo, setBabysitterInfo] = useState<{
    name: string;
    mobileNumber?: string | null;
  } | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [recipeData, setRecipeData] = useState<any>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
    activity: string;
    time: string;
    duration: string;
  }>({
    activity: "",
    time: "",
    duration: ""
  });

  // Add activity dialog
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [addActivityForm, setAddActivityForm] = useState({
    name: "",
    duration: "30"
  });

  // Next-day dialog
  const [nextDayDialogOpen, setNextDayDialogOpen] = useState(false);
  const [nextDayLoading, setNextDayLoading] = useState(false);
  const [pendingNextDayChildId, setPendingNextDayChildId] = useState<number | null>(null);

  // Partial regen
  const [partialRegenLoading, setPartialRegenLoading] = useState(false);
  const [addActivityLoading, setAddActivityLoading] = useState(false);

  // Day-complete celebration (fires once per completion, on user action only)
  const [celebrateOpen, setCelebrateOpen] = useState(false);
  const [completingNow, setCompletingNow] = useState(false);

  // Expanded item modal
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const search = useSearch();
  const [revealActive, setRevealActive] = useState(
    () => new URLSearchParams(search).get("reveal") === "1",
  );
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  // Age-band filter — synced per routine across web + mobile via the
  // `routines/:id/ui-prefs` endpoint, with localStorage acting as a fast-path
  // cache. The stored cache value is paired with a signature of the routine's
  // activities so that when the routine items change (e.g. after AI
  // regeneration) the filter resets to "All" instead of pointing at a stale
  // band. Once the routine query returns, its `uiPrefs.ageBandFilter` becomes
  // the source of truth and overrides any cached value.
  const [ageBandFilter, setAgeBandFilterState] = useState<string | null>(null);
  const ageFilterHydratedRef = useRef<{
    routineId: number;
    signature: string;
  } | null>(null);
  const serverAgeFilterAppliedRef = useRef<number | null>(null);
  const updateUiPrefsMutation = useUpdateRoutineUiPrefs();

  // Parent prefs for inline meal suggestions
  const [mealPrefs, setMealPrefs] = useState<{
    region: string;
    isVeg?: boolean;
    childAge?: number;
  }>({
    region: "pan_indian"
  });

  // Undo state
  const [undoSnapshot, setUndoSnapshot] = useState<RoutineItem[] | null>(null);
  const [undoLabel, setUndoLabel] = useState<string>("");
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoSnapshot(null);
    setUndoLabel("");
  };
  const showUndo = (snapshot: RoutineItem[], label: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoSnapshot(snapshot);
    setUndoLabel(label);
    undoTimerRef.current = setTimeout(() => {
      setUndoSnapshot(null);
      setUndoLabel("");
    }, 6000);
  };
  const handleUndo = () => {
    if (!undoSnapshot) return;
    setLocalItems(undoSnapshot);
    saveItemsMutation.mutate(undoSnapshot);
    clearUndo();
    toast({
      title: t("toasts.routines_detail.undone")
    });
  };
  const {
    data: routine,
    isLoading,
    isError,
    error,
    refetch
  } = useGetRoutine(routineId, {
    query: {
      enabled: !!routineId,
      queryKey: getGetRoutineQueryKey(routineId)
    }
  });
  // A genuine 404 (server responded "not found") is shown differently from a
  // network/connection failure (fetch rejected → no status, or a 5xx), so a
  // first-time parent on flaky wifi never sees a misleading "not found".
  const routineNotFound = (error as { status?: number } | null)?.status === 404;
  const routineLoadFailed = isError && !routineNotFound;
  const childId = (routine as any)?.childId ?? 0;
  const {
    data: childData
  } = useGetChild(childId, {
    query: {
      enabled: !!childId,
      queryKey: getGetChildQueryKey(childId)
    }
  });
  const childPhotoUrl: string | null = (childData as any)?.photoUrl ?? null;

  // Fetch parent profile once for meal suggestion prefs
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      authFetch(getApiUrl("/api/parent-profile")).then(async (r) => {
        if (!r.ok) return null;
        return parseApiJson<{ region?: string; foodType?: string }>(r);
      }).catch(() => null),
      authFetch(getApiUrl("/api/children")).then(async (r) => {
        if (!r.ok) return null;
        return parseApiJson<Array<{ age?: number | null }>>(r);
      }).catch(() => null),
    ]).then(([profile, children]) => {
      if (cancelled) return;
      const region = profile?.region ?? "pan_indian";
      const isVeg = profile?.foodType === "veg" ? true : undefined;
      const childAge = Array.isArray(children) && children[0]?.age != null ? Number(children[0].age) : undefined;
      setMealPrefs({
        region,
        isVeg,
        childAge
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-complete past items: runs once per routine load.
  // For routines whose date is before today, all pending items are marked completed.
  // For today's routine, items whose end time (start + duration) has already passed
  // are auto-marked completed. Persists via the same PATCH endpoint as manual ticks.
  const autoCompletedRef = useRef<number | null>(null);
  const initializedItemsRef = useRef<boolean>(false);
  useEffect(() => {
    if (!routine?.items || !routineId) return;
    if (autoCompletedRef.current === routineId) return; // already processed
    autoCompletedRef.current = routineId;
    const items = routine.items as RoutineItem[];
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayKey = `${y}-${m}-${d}`;
    const routineDate = (routine.date ?? "").slice(0, 10);
    const isPast = routineDate && routineDate < todayKey;
    const isToday = routineDate === todayKey;
    if (!isPast && !isToday) return;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    let changed = false;
    const next = items.map(it => {
      const status = it.status ?? "pending";
      if (status !== "pending") return it;
      if (isPast) {
        changed = true;
        return {
          ...it,
          status: "completed" as ItemStatus
        };
      }
      const start = parse12hToMinutes(it.time);
      if (start < 0) return it;
      const end = start + (it.duration ?? 30);
      if (end <= nowMins) {
        changed = true;
        return {
          ...it,
          status: "completed" as ItemStatus
        };
      }
      return it;
    });
    if (changed) {
      setLocalItems(next);
      saveItemsMutation.mutate(next);
    } else if (!localItems) {
      setLocalItems(items);
    }
    // Mark localItems as initialized so the babysitter-fetch effect below
    // does NOT race and overwrite our auto-completed `next` with the original
    // server items (both effects run in the same commit; React batches
    // setState, so without this guard the later setLocalItems wins).
    initializedItemsRef.current = true;
  }, [routine, routineId]);
  useEffect(() => {
    if (routine?.items && !localItems && !initializedItemsRef.current) {
      setLocalItems(routine.items as RoutineItem[]);
    }
    // Fetch babysitter assigned to this child
    if (routine?.childId) {
      authFetch(`/api/children/${routine.childId}`).then(async (r) => {
        if (!r.ok) return null;
        return parseApiJson<{ babysitterId?: number }>(r);
      }).then((child) => {
        if (child?.babysitterId) {
          authFetch("/api/babysitters").then(async (r) => {
            if (!r.ok) return;
            const sitters = await parseApiJson<Array<{
              id: number;
              name: string;
              mobileNumber?: string | null;
            }>>(r);
            const sitter = sitters.find(s => s.id === child.babysitterId);
            if (sitter) setBabysitterInfo(sitter);
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  }, [routine]);

  // Voice announcement for current task (OpenAI TTS via shared Amy voice pipeline)
  useEffect(() => {
    if (!voiceOn) {
      pause();
      return;
    }
    const items = localItems ?? routine?.items as RoutineItem[] ?? [];
    const childName = (childData as any)?.name ?? routine?.childName ?? "buddy";
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const currentTask = items.find(item => {
      if ((item.status ?? "pending") !== "pending") return false;
      const start = parse12hToMinutes(item.time);
      const end = start + (item.duration ?? 30);
      return start <= nowMins && nowMins < end;
    });
    if (currentTask && announcedTaskRef.current !== currentTask.activity) {
      announcedTaskRef.current = currentTask.activity;
      const msg = ROUTINE_TASK_ANNOUNCE_MSGS[
        Math.floor(Math.random() * ROUTINE_TASK_ANNOUNCE_MSGS.length)
      ](childName, currentTask.activity);
      void speak(msg, { narration: true });
    }
  }, [voiceOn, localItems, routine, childData, speak, pause]);
  // Returns only activities that haven't started yet (for today's routine).
  // Past/future date routines show the full schedule unchanged.
  const getRemainingItems = () => {
    if (!routine) return items;
    const today = new Date().toISOString().slice(0, 10);
    const routineDay = (routine.date ?? "").slice(0, 10);
    if (routineDay !== today) return items;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return items.filter(item => {
      const mins = parseRoutineTimeToMinutes(item.time);
      if (mins < 0) return true;
      return mins >= nowMins;
    });
  };

  const buildShareMessage = () => {
    if (!routine) return "";
    const remaining = getRemainingItems();
    const isFiltered = remaining.length < items.length;
    const lines = [`📅 ${routine.title}`, `👧 Child: ${routine.childName}`, `📆 Date: ${new Date(routine.date).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric"
    })}`, "", isFiltered ? "⏰ REMAINING ACTIVITIES:" : "📋 ROUTINE:", ...remaining.map(item => {
      const dur = formatRoutineDurationLong(item);
      const note = cleanRoutineNotes(item.notes);
      return `• ${formatRoutineTime(item.time)} — ${item.activity}${dur ? ` (${dur})` : ""}${note ? `\n  💡 ${note}` : ""}`;
    }), "", "— Sent via AmyNest"];
    return lines.join("\n");
  };
  const copyShareMessage = () => {
    const msg = buildShareMessage();
    navigator.clipboard.writeText(msg).then(() => {
      toast({
        title: t("toasts.routines_detail.copied_title"),
        description: t("toasts.routines_detail.copied_body")
      });
    });
  };
  const fetchRecipe = async (mealName: string) => {
    setSelectedMeal(mealName);
    setRecipeData(null);
    setRecipeOpen(true);
    setRecipeLoading(true);
    try {
      const res = await authFetch(getApiUrl("/api/ai/recipe"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mealName,
          foodType: mealPrefs.region ?? null,
        })
      });
      if (!res.ok) throw new Error("Failed to fetch recipe");
      const data = await parseApiJson<{ items?: RoutineItem[] }>(res);
      setRecipeData(data);
    } catch {
      toast({
        title: t("toasts.routines_detail.recipe_load_failed"),
        variant: "destructive"
      });
      setRecipeOpen(false);
    } finally {
      setRecipeLoading(false);
    }
  };

  // ── Inline Edit Handlers ──────────────────────────────────────────
  const handleEditStart = (index: number) => {
    const item = (localItems ?? [])[index];
    if (!item) return;
    setEditForm({
      activity: item.activity,
      time: item.time,
      duration: String(item.duration)
    });
    setEditingIndex(index);
  };
  const handleEditSave = (index: number) => {
    setLocalItems(prev => {
      if (!prev) return prev;
      const original = prev[index];
      const newTime = editForm.time.trim() || original.time;
      const newDuration = parseInt(editForm.duration) || original.duration;
      const newActivity = editForm.activity.trim() || original.activity;

      // Apply edits to this item
      const base = prev.map((item, i) => i === index ? {
        ...item,
        activity: newActivity,
        time: newTime,
        duration: newDuration
      } : item);

      // Calculate how much downstream tasks need to shift:
      // timeDiff = how much the START moved, plus any extra duration added
      const origStartMins = parse12hToMinutes(original.time);
      const newStartMins = parse12hToMinutes(newTime);
      const timeDiff = newStartMins >= 0 ? newStartMins - origStartMins : 0;
      const durDiff = newDuration - (original.duration ?? 30);
      const totalDelay = timeDiff + durDiff; // positive = tasks pushed later, negative = earlier

      if (totalDelay === 0) {
        saveItemsMutation.mutate(base);
        return base;
      }
      const {
        items: cascaded,
        autoSkipped
      } = smartCascade(base, index + 1, totalDelay);
      if (autoSkipped > 0) {
        toast({
          title: `⏭️ ${autoSkipped} task${autoSkipped > 1 ? "s" : ""} auto-skipped`,
          description: "Low-priority activities cleared to protect bedtime."
        });
      } else if (totalDelay > 0) {
        toast({
          title: `⏩ Shifted +${totalDelay} min`,
          description: "Upcoming tasks adjusted."
        });
      } else {
        toast({
          title: `⏪ Shifted ${Math.abs(totalDelay)} min earlier`,
          description: "Upcoming tasks moved forward."
        });
      }
      saveItemsMutation.mutate(cascaded);
      return cascaded;
    });
    setEditingIndex(null);
  };

  // ── Partial Regenerate ───────────────────────────────────────────
  const handlePartialRegen = async () => {
    setPartialRegenLoading(true);
    try {
      const res = await authFetch(getApiUrl(`/api/routines/${routineId}/partial-regenerate`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      if (!res.ok) throw new Error("Failed");
      const data = await parseApiJson<{ items?: RoutineItem[] }>(res);
      if (data.items) {
        setLocalItems(data.items);
        toast({
          title: t("toasts.routines_detail.day_regenerated_title"),
          description: t("toasts.routines_detail.day_regenerated_body")
        });
      }
    } catch {
      toast({
        title: t("toasts.routines_detail.regenerate_failed"),
        variant: "destructive"
      });
    } finally {
      setPartialRegenLoading(false);
    }
  };

  // ── Add Activity ────────────────────────────────────────────────
  const handleAddActivity = async () => {
    if (!addActivityForm.name.trim()) return;
    setAddActivityLoading(true);
    try {
      const res = await authFetch(getApiUrl(`/api/routines/${routineId}/partial-regenerate`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          newActivity: {
            name: addActivityForm.name,
            duration: parseInt(addActivityForm.duration) || 30
          }
        })
      });
      if (!res.ok) throw new Error("Failed");
      const data = await parseApiJson<{ items?: RoutineItem[] }>(res);
      if (data.items) {
        setLocalItems(data.items);
        toast({
          title: t("toasts.routines_detail.activity_added_title"),
          description: t("toasts.routines_detail.activity_added_body", {
            name: addActivityForm.name
          })
        });
      }
    } catch {
      toast({
        title: t("toasts.routines_detail.activity_add_failed"),
        variant: "destructive"
      });
    } finally {
      setAddActivityLoading(false);
      setAddActivityOpen(false);
      setAddActivityForm({
        name: "",
        duration: "30"
      });
    }
  };

  // ── Next-Day Generation ─────────────────────────────────────────
  const handleNextDayGen = async () => {
    if (!pendingNextDayChildId) return;
    setNextDayLoading(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayOfWeek = tomorrow.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const dateStr = tomorrow.toISOString().split("T")[0];
      const res = await authFetch(getApiUrl("/api/routines/generate"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          childId: pendingNextDayChildId,
          date: dateStr,
          hasSchool: !isWeekend
        })
      });
      if (res.status === 402 || res.status === 403) {
        setNextDayDialogOpen(false);
        window.dispatchEvent(new CustomEvent("amynest:open-paywall", {
          detail: { reason: "routines_limit" }
        }));
        return;
      }
      if (!res.ok) throw new Error("Failed");
      const data = await parseApiJson<{ childName?: string; items?: RoutineItem[] }>(res);
      toast({
        title: `🌅 Tomorrow's routine ready!`,
        description: `${isWeekend ? "Weekend" : "School day"} routine generated for ${data.childName ?? "your child"}.`
      });
      queryClient.invalidateQueries({
        queryKey: getListRoutinesQueryKey()
      });
    } catch {
      toast({
        title: t("toasts.routines_detail.tomorrow_failed"),
        variant: "destructive"
      });
    } finally {
      setNextDayLoading(false);
      setNextDayDialogOpen(false);
    }
  };
  const deleteMutation = useDeleteRoutine();

  // Save items to backend
  const saveItemsMutation = useMutation({
    mutationFn: async (items: RoutineItem[]) => {
      const res = await authFetch(getApiUrl(`/api/routines/${routineId}/items`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items
        })
      });
      if (!res.ok) throw new Error("Failed to save");
      return parseApiJson(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getGetRoutineQueryKey(routineId)
      });
    }
  });
  const handleDelete = () => {
    deleteMutation.mutate({
      id: routineId
    }, {
      onSuccess: () => {
        toast({
          title: t("toasts.routines_detail.deleted")
        });
        queryClient.invalidateQueries({
          queryKey: getListRoutinesQueryKey()
        });
        setLocation("/routines");
      },
      onError: () => {
        return toast({
          title: t("toasts.routines_detail.delete_failed"),
          variant: "destructive"
        });
      }
    });
  };
  const updateItemStatus = useCallback((index: number, status: ItemStatus) => {
    setLocalItems(prev => {
      if (!prev) return prev;
      // Save snapshot for undo
      const actionLabel = status === "completed" ? "✅ Marked complete" : status === "skipped" ? "⏭ Marked skipped" : "⏱ Delayed";
      showUndo([...prev], actionLabel);
      if (status === "completed" || status === "skipped") {
        const trackedItem = prev[index];
        track(status === "completed" ? "routine_item_completed" : "routine_item_skipped", {
          routineId: routine?.id,
          childId: routine?.childId,
          activityKey: feedbackActivityKey(trackedItem?.activity) ?? undefined,
          category: trackedItem?.category ?? undefined,
        });
        if (status === "completed") {
          const nextItems = prev.map((item, i) => (i === index ? { ...item, status } : item));
          const allDone = nextItems.every((item) => item.status === "completed" || item.status === "skipped");
          if (allDone && nextItems.some((item) => item.status === "completed")) {
            import("@/lib/review-service").then(({ notifyReviewTrigger }) => {
              notifyReviewTrigger("routine_completed", { routineId: routine?.id ?? 0 });
            });
            import("@/lib/retention-engine").then(({ trackOnboardingMilestone }) => {
              trackOnboardingMilestone("first_routine_created", { routineId: routine?.id ?? 0 });
            });
          }
        }
      }
      let updated = prev.map((item, i) => i === index ? {
        ...item,
        status
      } : item);

      // Smart delay: shift + auto-skip if needed
      if (status === "delayed") {
        const {
          items: cascaded,
          autoSkipped
        } = smartCascade(updated, index + 1, 15);
        updated = cascaded;
        if (autoSkipped > 0) {
          toast({
            title: `⏱ Delayed · ${autoSkipped} task${autoSkipped > 1 ? "s" : ""} auto-skipped`,
            description: "Low-priority activities removed to protect bedtime."
          });
        } else {
          toast({
            title: t("toasts.routines_detail.schedule_shifted_title"),
            description: t("toasts.routines_detail.schedule_shifted_body")
          });
        }
      }

      // Detect sleep/bedtime completion → prompt next-day generation
      if (status === "completed") {
        const item = prev[index];
        // Award points for completing task — use per-task points if present
        const childName = (childData as any)?.name ?? routine?.childName ?? "Child";
        const earned = (item as any).rewardPoints ?? 10;
        if (isSignedIn && routine?.id != null) {
          const day = routineDateKey(routine as { date?: string }) || new Date().toISOString().slice(0, 10);
          void earnGamingPoints(authFetch, {
            childName,
            activity: item.activity,
            amount: earned,
            source: "routine",
            idempotencyKey: `routine-${routine.id}-${index}-${day}`,
          }).catch(() => {
            addPoints(childName, item.activity, earned);
          });
        } else {
          addPoints(childName, item.activity, earned);
        }
        toast({
          title: `+${earned} points earned 🎉`,
          description: item.activity
        });
        const completedSoFar = updated.filter(i => i.status === "completed").length;
        const newBadges = checkAndAwardBadges(completedSoFar, 0);
        if (newBadges.length > 0) {
          toast({
            title: `🏆 Badge earned: ${newBadges[0].emoji} ${newBadges[0].label}!`
          });
        }
        // Day fully wrapped up (nothing pending left) → celebrate. Suppress the
        // next-day prompt in this case so the two overlays don't collide.
        const noPendingLeft = updated.every(i => (i.status ?? "pending") !== "pending");
        if (noPendingLeft && completedSoFar > 0) {
          setTimeout(() => setCelebrateOpen(true), 450);
        }
        const isSleep = ["sleep", "wind-down"].includes(item.category?.toLowerCase() ?? "") || /sleep|bed\s*time|good night/i.test(item.activity);
        if (isSleep && routine?.childId && !noPendingLeft) {
          setPendingNextDayChildId(routine.childId);
          setTimeout(() => setNextDayDialogOpen(true), 600);
        }
      }
      saveItemsMutation.mutate(updated);
      return updated;
    });
  }, [saveItemsMutation, toast, routine, childData, isSignedIn, authFetch]);

  // Server-pushed routine reminders (claim → guard → rate limit → send).
  // No client-side Notification() timers — single delivery authority on the API.
  const hasPushRegistered = useCallback((): boolean => {
    try {
      return !!localStorage.getItem("notify_device_registered_at");
    } catch {
      return false;
    }
  }, []);

  const serverPushReminders = routine?.uiPrefs?.pushReminders === true;
  useEffect(() => {
    if (!routineId || !routine) return;
    if (pushRemindersHydratedRef.current === routineId) return;
    pushRemindersHydratedRef.current = routineId;
    setNotificationsEnabled(serverPushReminders);
  }, [routineId, routine, serverPushReminders]);

  const toggleNotifications = useCallback(() => {
    if (!routineId) return;
    if (notificationsEnabled) {
      updateUiPrefsMutation.mutate(
        { id: routineId, data: { pushReminders: false } },
        {
          onSuccess: () => {
            setNotificationsEnabled(false);
            pushRemindersHydratedRef.current = routineId;
            queryClient.invalidateQueries({ queryKey: getGetRoutineQueryKey(routineId) });
            toast({ title: t("toasts.routines_detail.notifications_disabled") });
          },
        },
      );
      return;
    }
    if (!hasPushRegistered()) {
      toast({
        title: t("toasts.routines_detail.permission_denied_title"),
        description: t("toasts.routines_detail.permission_denied_body"),
        variant: "destructive",
      });
      return;
    }
    updateUiPrefsMutation.mutate(
      { id: routineId, data: { pushReminders: true } },
      {
        onSuccess: () => {
          setNotificationsEnabled(true);
          pushRemindersHydratedRef.current = routineId;
          queryClient.invalidateQueries({ queryKey: getGetRoutineQueryKey(routineId) });
          toast({
            title: t("toasts.routines_detail.notifications_enabled_title"),
            description: t("toasts.routines_detail.notifications_enabled_body"),
          });
        },
      },
    );
  }, [
    routineId,
    notificationsEnabled,
    updateUiPrefsMutation,
    queryClient,
    toast,
    t,
    hasPushRegistered,
  ]);
  const items = localItems ?? routine?.items as RoutineItem[] ?? [];

  const trustRibbonSignals = useMemo(
    () =>
      buildRoutineTrustRibbonSignals({
        items,
        adaptations: (routine as { adaptations?: string[] | null })?.adaptations,
      }),
    [items, routine],
  );

  // Unique age bands present in this routine's items (for the filter chips)
  const ageBands = useMemo(() => Array.from(new Set(items.filter(i => i.ageBand).map(i => i.ageBand!))), [items]);

  // How many activities each chip will show when tapped — mirrors the displayItems filter
  // so the badge accurately previews the count parents will see.
  const ageBandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const band of ageBands) {
      counts[band] = items.filter(i => !i.ageBand || i.ageBand === band).length;
    }
    return counts;
  }, [items, ageBands]);

  // Signature that captures the structural shape of the activities (names + bands).
  // Status / time changes don't affect it, so completing or cascading tasks keeps
  // the saved filter; AI regenerations / add / remove / rename invalidate it.
  const itemsSignature = useMemo(() => items.map(i => `${i.activity}|${i.ageBand ?? ""}`).join("\n"), [items]);

  // Hydrate from localStorage when the routine or its activity signature
  // changes. Keyed per routine id so each routine remembers its own last
  // filter selection. This runs immediately so the chips render with the last
  // known value before the network round-trip resolves.
  useEffect(() => {
    if (!routineId || items.length === 0) return;
    const storageKey = `kidschedule:ageBandFilter:${routineId}`;
    let stored: {
      signature: string;
      filter: string | null;
    } | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.signature === "string") {
          stored = {
            signature: parsed.signature,
            filter: parsed.filter ?? null
          };
        }
      }
    } catch {/* ignore corrupt storage */}
    if (stored && stored.signature === itemsSignature) {
      setAgeBandFilterState(stored.filter);
    } else {
      setAgeBandFilterState(null);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({
          signature: itemsSignature,
          filter: null
        }));
      } catch {/* storage full / unavailable */}
    }
    ageFilterHydratedRef.current = {
      routineId,
      signature: itemsSignature
    };
  }, [routineId, itemsSignature, items.length]);

  // Server-side preference is the source of truth — once the routine query
  // returns, reconcile the cached value with `routine.uiPrefs.ageBandFilter`
  // and update the local cache to match. Runs once per routine load (the ref
  // gates re-runs when the user later toggles the filter, which would
  // otherwise feed our own write back into state).
  const serverAgeBandFilter = routine?.uiPrefs?.ageBandFilter ?? null;
  useEffect(() => {
    if (!routineId || !routine) return;
    if (serverAgeFilterAppliedRef.current === routineId) return;
    serverAgeFilterAppliedRef.current = routineId;
    const next: string | null = typeof serverAgeBandFilter === "string" ? serverAgeBandFilter : null;
    setAgeBandFilterState(next);
    const hydrated = ageFilterHydratedRef.current;
    if (hydrated && hydrated.routineId === routineId) {
      try {
        window.localStorage.setItem(`kidschedule:ageBandFilter:${routineId}`, JSON.stringify({
          signature: hydrated.signature,
          filter: next
        }));
      } catch {/* storage full / unavailable */}
    }
  }, [routineId, routine, serverAgeBandFilter]);

  // Wrapper that updates state, refreshes the local cache, and persists the
  // user's selection to the server so the same value follows the parent to
  // every other device they sign into.
  const setAgeBandFilter = useCallback((next: string | null) => {
    setAgeBandFilterState(next);
    const hydrated = ageFilterHydratedRef.current;
    if (hydrated && hydrated.routineId === routineId) {
      try {
        window.localStorage.setItem(`kidschedule:ageBandFilter:${routineId}`, JSON.stringify({
          signature: hydrated.signature,
          filter: next
        }));
      } catch {/* storage full / unavailable */}
    }
    if (!routineId) return;
    updateUiPrefsMutation.mutate({
      id: routineId,
      data: {
        ageBandFilter: next
      }
    }, {
      onSuccess: () => {
        // Mark this routine as already reconciled with the server so the
        // hydration effect doesn't clobber the user's just-applied choice
        // when the routine query auto-refetches.
        serverAgeFilterAppliedRef.current = routineId;
        queryClient.invalidateQueries({
          queryKey: getGetRoutineQueryKey(routineId)
        });
      }
    });
  }, [routineId, updateUiPrefsMutation, queryClient]);

  // Items paired with their original index so all actions still use the correct index
  const displayItems = useMemo(() => items.map((item, origIdx) => ({
    item,
    origIdx
  })).filter(({
    item
  }) => !ageBandFilter || !item.ageBand || item.ageBand === ageBandFilter), [items, ageBandFilter]);
  const completedCount = items.filter(i => i.status === "completed").length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0;
  const todayPoints = items.reduce(
    (sum, i) => (i.status === "completed" ? sum + ((i as any).rewardPoints ?? 10) : sum),
    0,
  );

  // Date-awareness: compare routine date vs system date
  const routineDateStr = routine?.date?.slice(0, 10) ?? "";
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateMode: "past" | "today" | "future" = !routineDateStr ? "today" : routineDateStr < todayStr ? "past" : routineDateStr > todayStr ? "future" : "today";

  // Analytics: fire routine_viewed once per loaded routine.
  const viewedTrackedRef = useRef<number | null>(null);
  useEffect(() => {
    if (routine?.id == null) return;
    if (viewedTrackedRef.current === routine.id) return;
    viewedTrackedRef.current = routine.id;
    track("routine_viewed", {
      routineId: routine.id,
      childId: routine.childId ?? undefined,
      dateMode,
      itemCount: totalCount,
    });
  }, [routine?.id, routine?.childId, dateMode, totalCount]);

  // ── Adaptive Engine: today's mood + sleep stored locally per child/day ──
  const moodKey = `amynest:adaptive:mood:${childId}:${routineDateStr || todayStr}`;
  const sleepKey = `amynest:adaptive:sleep:${childId}:${routineDateStr || todayStr}`;
  const [todayMood, setTodayMood] = useState<AdaptiveMood>("neutral");
  const [todaySleep, setTodaySleep] = useState<AdaptiveSleepQuality>("good");
  useEffect(() => {
    if (typeof window === "undefined" || !childId) return;
    const m = window.localStorage.getItem(moodKey) as AdaptiveMood | null;
    const s = window.localStorage.getItem(sleepKey) as AdaptiveSleepQuality | null;
    if (m === "low" || m === "neutral" || m === "active") setTodayMood(m);
    if (s === "poor" || s === "ok" || s === "good") setTodaySleep(s);
  }, [moodKey, sleepKey, childId]);
  const persistMood = (m: AdaptiveMood) => {
    setTodayMood(m);
    if (typeof window !== "undefined") window.localStorage.setItem(moodKey, m);
  };
  const persistSleep = (s: AdaptiveSleepQuality) => {
    setTodaySleep(s);
    if (typeof window !== "undefined") window.localStorage.setItem(sleepKey, s);
  };

  // ── Live tick — re-run engine every 60s on today's routine ──────────
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (dateMode !== "today") return;
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [dateMode]);

  // ── Run the engine ───────────────────────────────────────────────────
  const adaptive = (() => {
    const now = new Date(nowTick);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return runAdaptiveEngine(items as any, {
      nowMins,
      mood: todayMood,
      sleepQuality: todaySleep,
      liveAdjust: dateMode === "today"
    });
  })();
  const amyTip = adaptive.suggestion;
  const dailySummary = adaptive.summary;

  const timelineFocus = useMemo(() => {
    const nowMins =
      dateMode === "today"
        ? new Date(nowTick).getHours() * 60 + new Date(nowTick).getMinutes()
        : -1;
    let currentIndex = -1;
    let nextUpIndex = -1;

    if (dateMode === "today" && nowMins >= 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;
        if ((item.status ?? "pending") !== "pending") continue;
        const start = parseRoutineTimeToMinutes(item.time);
        if (start < 0) continue;
        const end = start + (item.duration ?? 30);
        if (start <= nowMins && nowMins < end) {
          currentIndex = i;
          break;
        }
      }
      if (currentIndex >= 0) {
        for (let j = currentIndex + 1; j < items.length; j++) {
          if ((items[j]?.status ?? "pending") === "pending") {
            nextUpIndex = j;
            break;
          }
        }
      } else {
        for (let j = 0; j < items.length; j++) {
          const item = items[j]!;
          if ((item.status ?? "pending") !== "pending") continue;
          const start = parseRoutineTimeToMinutes(item.time);
          if (start < 0 || start > nowMins) {
            nextUpIndex = j;
            break;
          }
        }
      }
    }

    return {
      currentIndex,
      nextUpIndex,
      nowMins,
      nextItem: nextUpIndex >= 0 ? items[nextUpIndex] : undefined,
    };
  }, [items, dateMode, nowTick]);

  const dayArcSegments = useMemo(
    () =>
      buildDayArcSegments({
        items,
        nowMins: timelineFocus.nowMins,
        dateMode,
        currentActivity:
          timelineFocus.currentIndex >= 0
            ? items[timelineFocus.currentIndex]?.activity
            : undefined,
      }),
    [items, timelineFocus.nowMins, timelineFocus.currentIndex, dateMode],
  );

  const timelineRenderEntries = useMemo(
    () =>
      buildTimelineRenderEntries({
        allItems: items,
        displayItems,
        currentIndex: timelineFocus.currentIndex,
        nextUpIndex: timelineFocus.nextUpIndex,
        fullyExpanded: timelineExpanded,
      }),
    [
      items,
      displayItems,
      timelineFocus.currentIndex,
      timelineFocus.nextUpIndex,
      timelineExpanded,
    ],
  );

  const revealHighlightChips = useMemo(
    () =>
      buildRevealHighlightChips(
        (routine as { adaptations?: string[] | null })?.adaptations,
      ),
    [routine],
  );

  const shareCardTimeline = useMemo(
    () => buildShareCardTimeline(getRemainingItems()),
    [items, routine, dateMode],
  );

  const shareCardMeals = useMemo(
    () => buildShareCardMealSummary(items),
    [items],
  );

  const clearRevealParam = useCallback(() => {
    setRevealActive(false);
    if (routineId) {
      setLocation(`/routines/${routineId}`);
    }
  }, [routineId, setLocation]);

  useEffect(() => {
    setTimelineExpanded(false);
  }, [routineId]);

  // ── Persist auto-adjustments back to backend (today only) ───────────
  const lastPersistedRef = useRef<string>("");
  useEffect(() => {
    if (dateMode !== "today" || !adaptive.changed || !routineId) return;
    const sig = JSON.stringify(adaptive.items.map(i => [i.time, i.activity, i.status ?? "pending", i.adjusted ? 1 : 0]));
    if (sig === lastPersistedRef.current) return;
    lastPersistedRef.current = sig;
    setLocalItems(adaptive.items as RoutineItem[]);
    saveItemsMutation.mutate(adaptive.items as RoutineItem[]);
    if (adaptive.simplified) {
      toast({
        title: "⚡ Amy AI simplified your day",
        description: `${adaptive.summary.adjusted} low-priority task${adaptive.summary.adjusted > 1 ? "s" : ""} cleared so you can focus on essentials.`
      });
    }
  }, [adaptive.changed, dateMode, routineId]);
  if (isLoading) {
    return <div className={cn(PARENT_HUB_PAGE, "flex flex-col gap-6 max-w-3xl mx-auto")}>
        <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
        <div className="h-12 w-3/4 bg-muted animate-pulse rounded-xl" />
        <div className="space-y-4 mt-8">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />)}
        </div>
      </div>;
  }
  if (routineLoadFailed) {
    return <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
        <h2 className="text-2xl font-bold mb-1">{t("pages.routines.detail.load_failed_title", { defaultValue: "Couldn't load this routine" })}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{t("pages.routines.detail.load_failed_body", { defaultValue: "Check your connection and try again — your routine is safe." })}</p>
        <div className="flex items-center gap-2">
          <Button onClick={() => refetch()}>{t("pages.routines.detail.retry", { defaultValue: "Try again" })}</Button>
          <Button variant="outline" asChild><Link href="/routines">{t("pages.routines.detail.back_to_routines")}</Link></Button>
        </div>
      </div>;
  }
  if (!routine) {
    return <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-2xl font-bold mb-2">{t("pages.routines.detail.routine_not_found")}</h2>
        <Button asChild><Link href="/routines">{t("pages.routines.detail.back_to_routines")}</Link></Button>
      </div>;
  }
  return <div className={cn(PARENT_HUB_PAGE, "flex flex-col gap-6 max-w-3xl mx-auto", dateMode === "today" ? "pb-28 sm:pb-10" : "pb-10")}>
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-full -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/routines">
              <ArrowLeft className="h-4 w-4 mr-2" />{t("pages.routines.detail.back")}
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            {dateMode !== "past" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={partialRegenLoading} className="rounded-full gap-2 bg-primary/5 border-primary/30 text-primary hover:bg-primary/10">
                    <RotateCcw className={`h-4 w-4 ${partialRegenLoading ? "animate-spin" : ""}`} />
                    {partialRegenLoading
                      ? t("pages.routines.detail.regen_updating", { defaultValue: "Updating…" })
                      : t("pages.routines.detail.regenerate", { defaultValue: "Regenerate" })}
                    <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 rounded-2xl">
                  <DropdownMenuLabel>
                    {t("pages.routines.detail.regenerate_menu_label", { defaultValue: "Regenerate routine" })}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handlePartialRegen}
                    disabled={partialRegenLoading}
                    className="rounded-xl gap-3 py-2.5 cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">
                        {t("pages.routines.detail.regen_rest_title", { defaultValue: "Regenerate rest of day" })}
                      </span>
                      <span className="text-xs text-muted-foreground leading-snug">
                        {t("pages.routines.detail.regen_rest_desc", {
                          defaultValue: "Keeps finished tasks, redoes only the remaining plan",
                        })}
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setLocation(`/routines/generate?childId=${childId}&date=${routineDateStr}&override=1`)
                    }
                    className="rounded-xl gap-3 py-2.5 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">
                        {t("pages.routines.detail.regen_full_title", { defaultValue: "Regenerate full day" })}
                      </span>
                      <span className="text-xs text-muted-foreground leading-snug">
                        {t("pages.routines.detail.regen_full_desc", {
                          defaultValue: "Start fresh with new inputs and replace the whole routine",
                        })}
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {isSignedIn && <Button variant="outline" size="sm" onClick={toggleNotifications} className="rounded-full gap-2">
                {notificationsEnabled ? <><BellOff className="h-4 w-4" /> {t("pages.routines.detail.notifications_on")}</> : <><Bell className="h-4 w-4" /> {t("pages.routines.detail.notify_me")}</>}
              </Button>}

            <VoiceSettingsPanel
              onToggle={enabled => setVoiceOn(enabled)}
              onSettingsChange={setVoiceSettings}
            />

            <Link href="/parenting-hub">
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-border text-primary hover:bg-muted">
                <BookOpen className="h-4 w-4" />
                {t("pages.routines.detail.hub")}
              </Button>
            </Link>

            {/* audit-ok: #25D366 is WhatsApp brand green — third-party product color, not a UI token */}
            {/* i18n-ok: WhatsApp is a product/brand name — not localizable */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(buildShareMessage())}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {/* audit-ok: border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 — WhatsApp brand green */}
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.553 4.103 1.518 5.829L.057 23.63a.75.75 0 0 0 .92.92l5.703-1.461A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 0 1-5.044-1.393l-.361-.214-3.737.958.992-3.629-.235-.374A9.818 9.818 0 1 1 12 21.818z"/></svg>
                WhatsApp
              </Button>
            </a>

            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="rounded-full gap-2">
              <Share2 className="h-4 w-4" />
              {t("pages.routines.detail.share")}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("pages.routines.detail.delete_this_routine")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("pages.routines.detail.this_will_permanently_delete_this_schedule_you_can_always_ge")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">{t("pages.routines.detail.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    {t("pages.routines.detail.delete_routine")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/90 mb-2">
            <Sparkles className="h-4 w-4 text-amber-300/80" />
            {t("pages.routines.detail.amy_ai_generated_schedule")}
          </div>
          <h1 className="font-quicksand text-3xl sm:text-4xl font-bold text-foreground leading-snug">{routine.title}</h1>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-secondary/30 text-secondary-foreground border border-secondary/50 px-3 py-1 rounded-full text-sm font-medium">
              {childPhotoUrl ? <img src={childPhotoUrl} alt={routine.childName} className="w-5 h-5 rounded-full object-cover" /> : <User className="h-3.5 w-3.5" />}
              {routine.childName}
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${dateMode === "today" ? "bg-primary/10 text-primary border border-primary/30 font-bold" : dateMode === "future" ? "bg-muted text-primary border border-border" : "bg-muted text-muted-foreground border border-border"}`}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {new Date(routine.date + "T00:00:00").toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric"
            })}
              {dateMode === "today" && <span className="ml-1 text-[10px] font-black uppercase tracking-wide bg-primary text-white rounded-full px-1.5 py-0.5">{t("pages.routines.detail.today")}</span>}
              {dateMode === "future" && <span className="ml-1 text-[10px] font-black uppercase tracking-wide bg-primary text-white rounded-full px-1.5 py-0.5">{t("pages.routines.detail.upcoming")}</span>}
              {dateMode === "past" && <span className="ml-1 text-[10px] font-black uppercase tracking-wide bg-muted-foreground text-white rounded-full px-1.5 py-0.5">{t("pages.routines.detail.past")}</span>}
            </div>
            {/* Day starts at badge — shows the first activity time (= wake time) */}
            {routine.items && routine.items.length > 0 && (() => {
            const firstTime = routine.items.find(it => it.category !== "sleep" && !/sleep|bedtime/i.test(it.activity))?.time;
            if (!firstTime) return null;
            return <div className="flex items-center gap-1.5 bg-muted text-primary border border-border px-3 py-1 rounded-full text-sm font-bold">
                  <Clock className="h-3.5 w-3.5" />
                  {t("pages.routines.detail.day_starts_at")} {formatRoutineTime(firstTime)}
                </div>;
          })()}
          </div>

          {/* Date mode banners */}
          {dateMode === "future" && <div className={cn(HUB_GLASS_SURFACE, ROUTINES_HUB_ACCENT.border, "mt-3 flex items-center gap-2.5 rounded-[20px] px-4 py-3 text-sm text-foreground/90")}>
              <span className="text-lg">📅</span>
              <span><strong>{t("pages.routines.detail.future_routine")}</strong> {t("pages.routines.detail.all_tasks_are_shown_as_scheduled_you_can_start_interacting_o")}</span>
            </div>}
          {dateMode === "past" && <div className={cn(HUB_GLASS_SURFACE, "mt-3 flex items-center gap-2.5 rounded-[20px] border border-white/[0.08] px-4 py-3 text-sm text-muted-foreground")}>
              <span className="text-lg">🗂️</span>
              <span><strong>{t("pages.routines.detail.past_routine")}</strong> {t("pages.routines.detail.this_is_a_read_only_record_generate_a_new_routine_to_plan_up")}</span>
            </div>}
        </div>

        {/* Why this routine? — adaptive intelligence */}
        <RoutineAdaptationsCard
          adaptations={(routine as any)?.adaptations as string[] | undefined}
          isWeekendDay={
            routine?.date
              ? (() => {
                  const d = new Date(`${routine.date}T12:00:00`);
                  const dow = d.getDay();
                  return dow === 0 || dow === 6;
                })()
              : undefined
          }
          mood={todayMood}
        />

        {/* Premium "day at a glance" hero — today only */}
        {dateMode === "today" && totalCount > 0 && (
          <RoutineNowHero
            childName={routine?.childName}
            childPhotoUrl={childPhotoUrl}
            completed={completedCount}
            total={totalCount}
            currentActivity={
              timelineFocus.currentIndex >= 0
                ? items[timelineFocus.currentIndex]?.activity
                : undefined
            }
            currentTime={
              timelineFocus.currentIndex >= 0
                ? formatRoutineTime(items[timelineFocus.currentIndex]?.time)
                : undefined
            }
            nextActivity={timelineFocus.nextItem?.activity}
            nextTime={formatRoutineTime(timelineFocus.nextItem?.time)}
          />
        )}

        {/* Progress bar — past/future (today shows the hero ring instead) */}
        {totalCount > 0 && dateMode !== "today" && <div className={cn(HUB_GLASS_SURFACE, ROUTINES_HUB_ACCENT.border, "rounded-[20px] p-4")}>
            <div className="flex items-center justify-between mb-2 text-sm font-medium">
              <span className="text-foreground">{completedCount} of {totalCount} {t("pages.routines.detail.tasks_done")}</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <div className="h-2.5 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{
            width: `${progress}%`
          }} />
            </div>
          </div>}

        <RoutineDayPanel
          dateMode={dateMode}
          childName={routine?.childName}
          amyTip={amyTip}
          items={items}
          todayMood={todayMood}
          todaySleep={todaySleep}
          onMoodChange={persistMood}
          onSleepChange={persistSleep}
          delayedCount={dailySummary.delayed}
          adjustedCount={dailySummary.adjusted}
        />
      </header>

      {dateMode === "today" && totalCount > 0 && (
        <RoutineProgressRail
          completed={completedCount}
          total={totalCount}
          dayArcSegments={dayArcSegments}
          arcOnly
        />
      )}

      <RoutineTrustRibbon signals={trustRibbonSignals} />

      {/* Age-band filter chips — only shown when at least one item has an ageBand */}
      {ageBands.length > 0 && <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground">{t("pages.routines.detail.filter_by_age")}</span>
          <button type="button" onClick={() => setAgeBandFilter(null)} className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${ageBandFilter === null ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-foreground border-border hover:bg-muted"}`} aria-pressed={ageBandFilter === null}>
            {t("pages.routines.detail.all")}{items.length})
          </button>
          {ageBands.map(band => {
        return <button key={band} type="button" onClick={() => setAgeBandFilter(ageBandFilter === band ? null : band)} className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${ageBandFilter === band ? "bg-primary text-white border-primary" : "bg-muted text-primary border-border hover:bg-muted dark:bg-card dark:text-muted-foreground dark:border-primary"}`} aria-pressed={ageBandFilter === band}>
              {t("pages.routines.detail.ages_2")} {band.replace("-", "–")} ({ageBandCounts[band] ?? 0})
            </button>;
      })}
        </div>}

      <div className="relative mt-2 pl-1">
        <div className="absolute left-[4.65rem] sm:left-[6.35rem] top-4 bottom-10 w-0.5 z-0 rounded-full bg-gradient-to-b from-border/70 via-border/40 to-transparent" />
        <div className="absolute left-[4.52rem] sm:left-[6.22rem] bottom-2 w-2.5 h-2.5 rounded-full bg-border/60 z-0 ring-4 ring-background" aria-hidden />

        <div className="space-y-3 relative z-10">
          {displayItems.length === 0 && ageBandFilter && <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <span className="text-3xl">🔍</span>
              <p className="text-sm font-semibold text-muted-foreground">
                {t("pages.routines.detail.no_activities_for_ages")} {ageBandFilter.replace("-", "–")} {t("pages.routines.detail.in_this_routine")}
              </p>
              <button type="button" onClick={() => setAgeBandFilter(null)} className="text-xs font-bold text-primary underline underline-offset-2 hover:text-primary/80">
                {t("pages.routines.detail.clear_filter")}
              </button>
            </div>}
          {timelineRenderEntries.map((entry) => {
          if (entry.kind === "collapse") {
            return (
              <div key={entry.group.id} className="flex gap-1.5 sm:gap-3 items-center py-1">
                <div className="w-[58px] sm:w-[88px] shrink-0" />
                <div className="w-3 shrink-0" />
                <button
                  type="button"
                  onClick={() => setTimelineExpanded(true)}
                  className={cn(
                    HUB_GLASS_SURFACE,
                    "flex-1 flex items-center justify-center gap-2 rounded-2xl border border-white/[0.10] py-2.5 px-4 text-xs font-bold text-foreground/80 hover:text-amber-200/90 transition-colors",
                  )}
                >
                  <ChevronDown className="h-4 w-4 shrink-0" />
                  {entry.group.label}
                </button>
              </div>
            );
          }

          const index = entry.origIdx;
          const item = items[index]!;
          const status = item.status ?? "pending";
          const catVisual = resolveRoutineCategoryVisual(item.category, item.activity);
          const statusStyle = STATUS_STYLES[status];
          const priority = getPriority(item.category, item.activity);
          const isSleepItem = isSleepRoutineItem(item.category, item.activity);
          const isDinnerAnchor = isDinnerAnchorItem(item.category, item.activity);
          const isBedtimeAnchor = isBedtimeAnchorItem(item.category, item.activity);
          const isMealItem = isMealRoutineItem(item.category);
          const dinnerFoodChips = isDinnerAnchor ? extractDinnerFoodChips(item) : [];
          const mealOptionPills = isMealItem ? extractMealOptionPills(item) : [];
          const moduleHref = primaryLinkedModuleHref(item.linkedModules);
          const primaryModule = item.linkedModules?.[0];

          const nowMins = timelineFocus.nowMins;
          const taskStart = parseRoutineTimeToMinutes(item.time);
          const taskEnd = taskStart >= 0 ? taskStart + (item.duration ?? 30) : -1;
          const isCurrentTask =
            dateMode === "today" &&
            status === "pending" &&
            (index === timelineFocus.currentIndex ||
              (taskStart >= 0 && taskStart <= nowMins && nowMins < taskEnd));
          const phase: TimelineTaskPhase = resolveTimelinePhase({
            dateMode,
            status,
            taskStart,
            taskEnd,
            nowMins,
            isCurrentIndex: index === timelineFocus.currentIndex,
          });
          const isPastTask = phase === "past";
          const isUpcomingTask = phase === "upcoming";
          const isNextUp = index === timelineFocus.nextUpIndex;
          const minsUntilStart =
            taskStart >= 0 && nowMins >= 0 ? Math.max(0, taskStart - nowMins) : -1;

          const isInteractive = dateMode !== "past";

          const cardSurface = cn(
            HUB_GLASS_SURFACE,
            "rounded-2xl border-2 border-l-[3px]",
            catVisual.accentBorder,
            isDinnerAnchor && catVisual.surface,
            isBedtimeAnchor && catVisual.surface,
            isDinnerAnchor && "ring-1 ring-amber-500/15",
            isBedtimeAnchor && "ring-1 ring-indigo-500/15",
            isCurrentTask
              ? "border-primary ring-2 ring-primary/20 shadow-md"
              : isPastTask && status === "pending"
                ? "border-amber-500/20"
                : isUpcomingTask
                  ? "border-white/[0.08]"
                  : statusStyle || "border-white/[0.08]",
          );

          return <div className="flex gap-1.5 sm:gap-3 group items-start" key={index}>
                {/* Time column */}
                <div className="flex flex-col items-end pt-3.5 w-[58px] sm:w-[88px] shrink-0">
                  <div
                    className={`text-xs sm:text-sm font-bold text-right whitespace-nowrap ${
                      isPastTask
                        ? "text-muted-foreground line-through"
                        : isCurrentTask
                          ? "text-primary"
                          : isUpcomingTask
                            ? "text-muted-foreground"
                            : "text-foreground"
                    }`}
                  >
                    {formatRoutineTime(item.time)}
                  </div>
                  {formatRoutineDurationShort(item) ? (
                    <div className={`text-[11px] font-medium text-right ${isUpcomingTask ? "text-muted-foreground/80" : "text-muted-foreground"}`}>
                      {formatRoutineDurationShort(item)}
                    </div>
                  ) : null}
                  {isCurrentTask && (
                    <div className="mt-1 text-[8px] font-black uppercase tracking-wide text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                      {t("pages.routines.detail.now")}
                    </div>
                  )}
                  {isUpcomingTask && !isCurrentTask && (
                    <div className="mt-1 text-[8px] font-bold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 max-w-[72px] text-center leading-tight">
                      {isNextUp
                        ? t("pages.routines.detail.next_up_chip", { defaultValue: "Next up" })
                        : minsUntilStart > 0
                          ? t("pages.routines.detail.starts_in", {
                              defaultValue: "In {{time}}",
                              time: formatMinutesUntil(minsUntilStart),
                            })
                          : t("pages.routines.detail.later_chip", { defaultValue: "Later" })}
                    </div>
                  )}
                </div>

                {/* Spine dot — live "now" cursor on the current task */}
                <div className="flex flex-col items-center pt-[1.125rem] w-3 shrink-0">
                  {status !== "completed" && isCurrentTask ? (
                    <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
                      <span className="absolute inline-flex h-full w-full rounded-full bg-primary/50 animate-ping" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-primary ring-4 ring-primary/25 shadow-[0_0_10px_rgba(255,184,0,0.55)]" />
                    </span>
                  ) : (
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full shrink-0",
                        status === "completed" && "bg-amber-400/90",
                        status !== "completed" && isUpcomingTask && "bg-background border-2 border-white/20",
                        status !== "completed" && !isUpcomingTask && "bg-white/20",
                      )}
                      aria-hidden
                    />
                  )}
                </div>

                {/* Activity Card — click to expand */}
                <Card
                  className={cn(
                    "flex-1 min-w-0 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer",
                    cardSurface,
                  )}
                  onClick={() => editingIndex === null && setExpandedIndex(index)}
                >
                  {isDinnerAnchor && <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ChefHat className="h-4 w-4 text-amber-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-amber-200 text-xs font-bold block">{t("pages.routines.detail.dinner_anchor", { defaultValue: "Dinner anchor" })}</span>
                          <span className="text-amber-300/75 text-[10px] font-medium">{t("pages.routines.detail.protected_dinner_anchor", { defaultValue: "Protected dinner anchor" })}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                        {t("pages.routines.detail.anchor_badge", { defaultValue: "Anchor" })}
                      </span>
                    </div>}
                  {item.category === "school" && <div className="bg-sky-500/8 border-b border-sky-500/20 px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-sky-300 text-xs">🏫</span>
                      <span className="text-sky-200 text-xs font-bold">{t("pages.routines.detail.in_school_protected_time")}</span>
                    </div>}
                  {item.category === "bonding" && <div className="bg-muted border-b border-border px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-primary text-xs">❤️</span>
                      <span className="text-primary text-xs font-bold">{t("pages.routines.detail.family_bonding_time")}</span>
                    </div>}
                  {item.category === "tiffin" && <div className="bg-amber-500/8 border-b border-amber-500/20 px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-amber-300 text-xs">🍱</span>
                      <span className="text-amber-200 text-xs font-bold">{t("pages.routines.detail.tiffin_lunchbox_prep")}</span>
                    </div>}
                  {isBedtimeAnchor && <div className="bg-indigo-500/10 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Moon className="h-4 w-4 text-indigo-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-indigo-200 text-xs font-bold block">{t("pages.routines.detail.sleep_anchor", { defaultValue: "Bedtime anchor" })}</span>
                          <span className="text-indigo-300/70 text-[10px] font-medium">{t("pages.routines.detail.protected_bedtime_anchor", { defaultValue: "Protected bedtime anchor" })}</span>
                        </div>
                      </div>
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded-full px-2 py-0.5">
                        {t("pages.routines.detail.anchor_badge", { defaultValue: "Anchor" })}
                      </span>
                    </div>}
                  {isCurrentTask && <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-primary text-xs font-bold">{t("pages.routines.detail.happening_now")}</span>
                    </div>}
                  <CardContent className={cn("p-3 sm:p-4", isDinnerAnchor && "sm:p-5")}>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start gap-2.5">
                        {/* Activity Illustration — static image library */}
                        <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-muted/50 shadow-sm">
                          {(() => {
                        const seed = (routineId ?? 0) * 100 + index;
                        const img = getActivityImage(item.category, item.activity, seed);
                        return <>
                                <img src={img.src} alt={item.activity} className={`w-full h-full object-cover ${status === "skipped" ? "grayscale opacity-50" : status === "completed" ? "opacity-80" : ""}`} />
                                {status === "completed" && <div className="absolute inset-0 bg-primary flex items-center justify-center">
                                    <div className="bg-primary rounded-full w-5 h-5 flex items-center justify-center">
                                      <span className="text-white text-[10px] font-black">✓</span>
                                    </div>
                                  </div>}
                              </>;
                      })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingIndex === index ? (/* ── Inline Edit Form ── */
                      <div className="space-y-2 py-1">
                              <div>
                                <Label className="text-xs text-muted-foreground">{t("pages.routines.detail.activity")}</Label>
                                <Input value={editForm.activity} onChange={e => setEditForm(f => ({
                            ...f,
                            activity: e.target.value
                          }))} className="h-8 text-sm rounded-lg mt-0.5" autoFocus />
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground">{t("pages.routines.detail.time_e_g_7_30_am")}</Label>
                                  <Input value={editForm.time} onChange={e => setEditForm(f => ({
                              ...f,
                              time: e.target.value
                            }))} className="h-8 text-sm rounded-lg mt-0.5" placeholder="7:30 AM" />
                                </div>
                                <div className="w-20">
                                  <Label className="text-xs text-muted-foreground">{t("pages.routines.detail.min")}</Label>
                                  <Input type="number" value={editForm.duration} onChange={e => setEditForm(f => ({
                              ...f,
                              duration: e.target.value
                            }))} className="h-8 text-sm rounded-lg mt-0.5" min={5} />
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <Button size="sm" className="rounded-full h-7 text-xs gap-1" onClick={() => handleEditSave(index)}>
                                  <Save className="h-3 w-3" /> {t("pages.routines.detail.save")}
                                </Button>
                                <Button size="sm" variant="ghost" className="rounded-full h-7 text-xs gap-1" onClick={() => setEditingIndex(null)}>
                                  <X className="h-3 w-3" /> {t("pages.routines.detail.cancel_2")}
                                </Button>
                              </div>
                            </div>) : <>
                          {/* Title row + always-visible Edit pencil (mobile-friendly) */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={cn(
                              "font-bold text-foreground leading-snug flex-1 min-w-0",
                              isDinnerAnchor ? "text-base sm:text-lg" : "text-sm sm:text-base",
                              status === "skipped" && "line-through text-muted-foreground",
                              status === "completed" && "line-through opacity-60",
                            )} style={{
                            wordBreak: "break-word",
                            overflowWrap: "break-word",
                            whiteSpace: "normal"
                          }}>
                              {item.activity}
                            </h3>
                            {isInteractive && status !== "completed" && status !== "skipped" && <button onClick={e => {
                            e.stopPropagation();
                            handleEditStart(index);
                          }} className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors" title={t("pages.routines.detail.edit_this_task")}>
                                <Pencil className="h-3 w-3" />
                                <span className="hidden sm:inline">{t("pages.routines.detail.edit_2")}</span>
                              </button>}
                          </div>

                          {/* Status & category chips — wrap onto new line on small screens */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {status === "completed" && <Badge className="bg-muted text-primary border-border rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5">{t("pages.routines.detail.done_2")}</Badge>}
                            {status === "skipped" && item.skipReason && <Badge className="bg-muted text-primary border-border rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5">{t("pages.routines.detail.auto_skipped")}</Badge>}
                            {status === "skipped" && !item.skipReason && <Badge className="bg-muted text-muted-foreground border-border rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5">{t("pages.routines.detail.skipped_2")}</Badge>}
                            {status === "delayed" && <Badge className="bg-muted text-primary border-border rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5">{t("pages.routines.detail.delayed_3")}</Badge>}
                            {item.adjusted && status !== "completed" && <Badge className="bg-muted text-primary border-border rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5" title={t("pages.routines.detail.auto_adjusted_by_amy_ai")}>
                                {t("pages.routines.detail.adjusted")}
                              </Badge>}
                            <Badge className={cn("rounded-full text-[10px] sm:text-xs font-bold border px-2 py-0.5", catVisual.badge)}>
                              {formatCategoryLabel(item.category)}
                            </Badge>
                            {isDinnerAnchor && <span className="text-[10px] font-medium text-amber-300/80">
                              {t("pages.routines.detail.main_meal", { defaultValue: "Main meal" })}
                            </span>}
                            {priority === "high" && status === "pending" && (isSleepItem || (!isUpcomingTask && !isCurrentTask)) && (
                              <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 ${
                                isSleepItem
                                  ? "text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
                                  : "text-primary bg-muted border border-border"
                              }`}>
                                {t("pages.routines.detail.essential")}
                              </span>
                            )}
                            {item.ageBand && <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-primary bg-muted border border-border rounded-full px-1.5 py-0.5">
                                <Users className="h-2.5 w-2.5" />
                                {t("pages.routines.detail.ages_3")} {item.ageBand.replace("-", "–")}
                              </span>}
                          </div>
                          {/* Auto-skip reason */}
                          {item.skipReason && <p className="text-[11px] text-primary bg-muted border border-border rounded-lg px-2 py-1 mt-1 font-medium">
                              {item.skipReason}
                            </p>}
                          {isDinnerAnchor && dinnerFoodChips.length > 0 ? (
                            <MealOptionPills
                              pills={dinnerFoodChips}
                              onSelect={fetchRecipe}
                              compact
                              className="mt-1.5"
                            />
                          ) : isMealItem && !isDinnerAnchor && mealOptionPills.length > 0 ? (
                            <MealOptionPills
                              pills={mealOptionPills}
                              onSelect={fetchRecipe}
                              compact
                              className="mt-1.5"
                            />
                          ) : null}
                          {item.description && !item.notes?.startsWith("Options:") ? (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2 break-words">
                              {item.description}
                            </p>
                          ) : null}
                          {moduleHref && primaryModule ? (
                            <Link
                              href={moduleHref}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-primary hover:underline w-fit"
                            >
                              <BookOpen className="h-3 w-3 shrink-0" />
                              {linkedModuleLabel(primaryModule)}
                            </Link>
                          ) : null}
                          {item.notes && item.notes.startsWith("Options:") && !isMealItem ? <div className="mt-1.5 space-y-1.5">
                              <p className="text-xs text-muted-foreground font-medium">{t("pages.routines.detail.today_s_options")}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {item.notes.replace("Options:", "").split("|").map((opt, oi) => {
                              const meal = opt.trim();
                              return <button key={oi} onClick={() => fetchRecipe(meal)} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-primary border border-border hover:bg-muted transition-colors">
                                      <ChefHat className="h-3 w-3" />
                                      {meal}
                                    </button>;
                            })}
                              </div>
                              <p className="text-xs text-muted-foreground">{t("pages.routines.detail.tap_a_meal_to_view_its_recipe")}</p>
                            </div> : item.notes && !item.notes.startsWith("Options:") && cleanRoutineNotes(item.notes) ? <p className="text-muted-foreground text-xs mt-1 leading-relaxed line-clamp-3 break-words" style={{
                          overflowWrap: "break-word"
                        }}>{cleanRoutineNotes(item.notes)}</p> : null}
                          {editingIndex !== index && <MealRecipeCard meal={item.meal} recipe={item.recipe} nutrition={item.nutrition} defaultOpen={(item.category === "meal" || item.category === "tiffin") && items.slice(0, index).filter(it => it.category === "meal" || it.category === "tiffin").length === 0} />}
                          </>}
                        </div>
                      </div>

                      {/* Actions — purple slide ONLY on the current task */}
                      {isInteractive && editingIndex !== index && status === "pending" && (
                        isCurrentTask ? (
                          isSleepItem ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => updateItemStatus(index, "completed")}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-sm font-bold text-indigo-200 hover:bg-indigo-500/15 transition-colors"
                              >
                                <Moon className="h-4 w-4" />
                                {t("pages.routines.detail.mark_bedtime_done", { defaultValue: "Mark bedtime done" })}
                              </button>
                            </div>
                          ) : (
                            <div onClick={(e) => e.stopPropagation()}>
                              <SlideToComplete onComplete={() => updateItemStatus(index, "completed")} />
                            </div>
                          )
                        ) : isPastTask ? (
                          <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => updateItemStatus(index, "completed")}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-primary hover:bg-muted transition-colors border border-border"
                            >
                              <Check className="h-3 w-3" /> {t("pages.routines.detail.complete_2")}
                            </button>
                            <button
                              type="button"
                              onClick={() => updateItemStatus(index, "skipped")}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors border border-border"
                            >
                              <SkipForward className="h-3 w-3" /> {t("pages.routines.detail.skip_2")}
                            </button>
                          </div>
                        ) : isUpcomingTask ? (
                          <p className="text-[11px] text-muted-foreground pt-0.5" onClick={(e) => e.stopPropagation()}>
                            {t("pages.routines.detail.upcoming_hint", {
                              defaultValue: "Starts at {{time}} · Tap card for details",
                              time: item.time,
                            })}
                          </p>
                        ) : dateMode === "future" ? (
                          <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => updateItemStatus(index, "completed")}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-primary hover:bg-muted transition-colors border border-border"
                            >
                              <Check className="h-3 w-3" /> {t("pages.routines.detail.complete_2")}
                            </button>
                          </div>
                        ) : null
                      )}
                      {/* Quick action row for delayed/non-pending */}
                      {isInteractive && editingIndex !== index && status === "delayed" && <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                          <button onClick={() => updateItemStatus(index, "completed")} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-primary hover:bg-muted transition-colors border border-border">
                            <Check className="h-3 w-3" /> {t("pages.routines.detail.complete_2")}
                          </button>
                          <button onClick={() => updateItemStatus(index, "skipped")} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors border border-border">
                            <SkipForward className="h-3 w-3" /> {t("pages.routines.detail.skip_2")}
                          </button>
                        </div>}

                      {/* Undo for completed/skipped — only on non-past routines */}
                      {isInteractive && editingIndex !== index && (status === "completed" || status === "skipped") && <button onClick={() => updateItemStatus(index, "pending")} className="text-xs text-muted-foreground hover:text-foreground transition-colors self-start">
                          {t("pages.routines.detail.undo")}
                        </button>}
                    </div>
                  </CardContent>
                </Card>
              </div>;
        })}
        </div>
      </div>

      {/* ── Tap hint ───────────────────────────────────────────────── */}
      {dateMode !== "past" && items.some(i => !i.status || i.status === "pending") && <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
          <span className="text-xs">{t("pages.routines.detail.tap_any_card_to_view_details_more_actions")}</span>
        </div>}

      {/* ── Item expand modal ───────────────────────────────────────── */}
      <RoutineItemModal item={expandedIndex !== null ? items[expandedIndex] : null} index={expandedIndex ?? 0} isOpen={expandedIndex !== null} onClose={() => setExpandedIndex(null)} isInteractive={expandedIndex !== null ? dateMode !== "past" : false} onComplete={() => {
      if (expandedIndex !== null) updateItemStatus(expandedIndex, items[expandedIndex]?.status === "completed" ? "pending" : "completed");
    }} onDelay={() => {
      if (expandedIndex !== null) updateItemStatus(expandedIndex, "delayed");
    }} onSkip={() => {
      if (expandedIndex !== null) updateItemStatus(expandedIndex, "skipped");
    }} routineId={routineId} seed={expandedIndex !== null ? (routineId ?? 0) * 100 + expandedIndex : 0} feedbackContext={dateMode !== "future" && routine?.childId != null && routineDateStr ? { childId: routine.childId, routineDate: routineDateStr } : null} />

      {/* ── Global floating undo chip ───────────────────────────────── */}
      {undoSnapshot && <div data-on-dark className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card text-white px-4 py-2.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-medium">{undoLabel}</span>
          <button onClick={handleUndo} className="text-sm font-black text-primary hover:text-muted-foreground transition-colors">
            {t("pages.routines.detail.undo_2")}
          </button>
          <button onClick={clearUndo} className="text-muted-foreground hover:text-white text-xs ml-1">✕</button>
        </div>}

      {/* ── Daily Summary (today + past) ────────────────────────────── */}
      {dateMode !== "future" && totalCount > 0 && <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary to-primary p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t("pages.routines.detail.daily_summary")}
            </h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {dailySummary.completionPct}{t("pages.routines.detail.done_3")}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl bg-muted border border-border px-3 py-2 text-center">
              <div className="text-lg font-black text-primary">{dailySummary.completed}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-primary">{t("pages.routines.detail.done_4")}</div>
            </div>
            <div className="rounded-xl bg-muted border border-border px-3 py-2 text-center">
              <div className="text-lg font-black text-primary">{dailySummary.delayed}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-primary">{t("pages.routines.detail.delayed_4")}</div>
            </div>
            <div className="rounded-xl bg-muted border border-border px-3 py-2 text-center">
              <div className="text-lg font-black text-primary">{dailySummary.adjusted}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-primary">{t("pages.routines.detail.adjusted_2")}</div>
            </div>
            <div className="rounded-xl bg-muted border border-border px-3 py-2 text-center">
              <div className="text-lg font-black text-foreground">{dailySummary.skipped}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-foreground">{t("pages.routines.detail.skipped_3")}</div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border px-3 py-2">
            <span className="text-base shrink-0 mt-0.5">💡</span>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{t("pages.routines.detail.for_tomorrow")}</p>
              <p className="text-sm text-foreground font-medium leading-snug">{dailySummary.tomorrowTip}</p>
            </div>
          </div>
          {dateMode === "today" && routine?.childId != null && routineDateStr && (
            <RoutineFeedbackBar
              className="rounded-xl bg-card border border-border px-3 py-2.5"
              childId={routine.childId}
              routineId={routineId}
              routineDate={routineDateStr}
              title={t("components.routine_feedback.routine_title", { defaultValue: "How did today go?" })}
              signals={[
                "worked_well",
                "too_tiring",
                ...(items.some(i => ["sleep", "wind-down"].includes((i.category ?? "").toLowerCase()) || /sleep|bed\s*time|good night/i.test(i.activity)) ? (["bedtime_smooth"] as RoutineFeedbackSignal[]) : []),
              ]}
            />
          )}
        </div>}

      <div className="mt-6 flex items-center justify-center gap-3 pb-8 border-t border-border/50 pt-8">
        {dateMode !== "past" && <Button variant="outline" className="rounded-full shadow-sm gap-2 border-primary/30 text-primary hover:bg-primary/5" onClick={() => setAddActivityOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("pages.routines.detail.add_activity")}
          </Button>}
        <Button asChild variant="outline" className="rounded-full shadow-sm">
          <Link href="/behavior">{t("pages.routines.detail.log_today_s_behavior")}</Link>
        </Button>
        {dateMode === "past" && <Button asChild variant="outline" className="rounded-full shadow-sm gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <Link href="/routines/generate">
              <Sparkles className="h-4 w-4" />
              {t("pages.routines.detail.generate_new_routine")}
            </Link>
          </Button>}
      </div>

      {/* Recipe Dialog */}
      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-quicksand flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              {recipeLoading ? "Loading Recipe..." : recipeData?.name ?? selectedMeal}
            </DialogTitle>
          </DialogHeader>

          {recipeLoading && <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="bg-muted text-primary w-16 h-16 rounded-full flex items-center justify-center">
                <ChefHat className="h-8 w-8 animate-bounce" />
              </div>
              <p className="text-muted-foreground text-sm">{t("pages.routines.detail.generating_recipe")}</p>
            </div>}

          {recipeData && !recipeLoading && <div className="space-y-5">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center bg-muted rounded-xl p-2.5 text-center">
                  <Timer className="h-4 w-4 text-primary mb-1" />
                  <p className="text-xs font-bold text-foreground">{recipeData.prepTime}</p>
                  <p className="text-xs text-muted-foreground">{t("pages.routines.detail.prep")}</p>
                </div>
                <div className="flex flex-col items-center bg-muted rounded-xl p-2.5 text-center">
                  <Timer className="h-4 w-4 text-primary mb-1" />
                  <p className="text-xs font-bold text-foreground">{recipeData.cookTime}</p>
                  <p className="text-xs text-muted-foreground">{t("pages.routines.detail.cook")}</p>
                </div>
                <div className="flex flex-col items-center bg-muted rounded-xl p-2.5 text-center">
                  <Users className="h-4 w-4 text-primary mb-1" />
                  <p className="text-xs font-bold text-foreground">{recipeData.servings}</p>
                  <p className="text-xs text-muted-foreground">{t("pages.routines.detail.serves")}</p>
                </div>
              </div>

              <Separator />

              {/* Ingredients */}
              <div>
                <h4 className="font-bold text-sm mb-2 text-foreground">{t("pages.routines.detail.ingredients")}</h4>
                <ul className="space-y-1.5">
                  {recipeData.ingredients?.map((ing: string, i: number) => <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      {ing}
                    </li>)}
                </ul>
              </div>

              <Separator />

              {/* Steps */}
              <div>
                <h4 className="font-bold text-sm mb-3 text-foreground">{t("pages.routines.detail.instructions_2")}</h4>
                <ol className="space-y-3">
                  {recipeData.steps?.map((s: {
                step: number;
                instruction: string;
              }) => <li key={s.step} className="flex gap-3">
                      <span className="bg-muted text-primary font-bold text-xs rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                      <p className="text-sm text-foreground/80 leading-relaxed">{s.instruction}</p>
                    </li>)}
                </ol>
              </div>

              {recipeData.tips && <>
                  <Separator />
                  <div className="bg-muted border border-border rounded-xl p-3">
                    <p className="text-xs font-bold text-primary mb-1">{t("pages.routines.detail.parent_tip")}</p>
                    <p className="text-xs text-primary leading-relaxed">{recipeData.tips}</p>
                  </div>
                </>}
            </div>}
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={addActivityOpen} onOpenChange={setAddActivityOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-quicksand flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              {t("pages.routines.detail.add_activity_2")}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {t("pages.routines.detail.ai_will_fit_this_activity_into_the_remaining_schedule")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">{t("pages.routines.detail.what_activity")}</Label>
              <Input className="mt-1.5 rounded-xl" placeholder={t("pages.routines.detail.e_g_piano_practice_park_visit")} value={addActivityForm.name} onChange={e => setAddActivityForm(f => ({
              ...f,
              name: e.target.value
            }))} onKeyDown={e => e.key === "Enter" && handleAddActivity()} autoFocus />
            </div>
            <div>
              <Label className="text-sm font-medium">{t("pages.routines.detail.duration_minutes")}</Label>
              <Input type="number" className="mt-1.5 rounded-xl" value={addActivityForm.duration} onChange={e => setAddActivityForm(f => ({
              ...f,
              duration: e.target.value
            }))} min={5} max={120} />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button className="flex-1 rounded-full" onClick={handleAddActivity} disabled={addActivityLoading || !addActivityForm.name.trim()}>
              {addActivityLoading ? <><RotateCcw className="h-4 w-4 mr-2 animate-spin" />{t("pages.routines.detail.adding")}</> : <><Plus className="h-4 w-4 mr-2" />{t("pages.routines.detail.add_to_schedule")}</>}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setAddActivityOpen(false)}>
              {t("pages.routines.detail.cancel_3")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Next Day Generation Dialog */}
      <Dialog open={nextDayDialogOpen} onOpenChange={setNextDayDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          {isRoutineGenerateLocked ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-quicksand flex items-center gap-2">
                  <Lock className="h-5 w-5" style={{ color: "hsl(var(--brand-amber-500))" }} />
                  {t("pages.routines.detail.next_day_premium_title")}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {t("pages.routines.detail.next_day_premium_desc")}
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted border border-border rounded-xl p-3 text-sm">
                <p className="font-medium mb-1 flex items-center gap-1.5">
                  <Crown className="h-4 w-4" style={{ color: "hsl(var(--brand-amber-500))" }} />
                  {t("pages.routines.detail.next_day_premium_perks_title")}
                </p>
                <p className="text-xs text-muted-foreground">{t("pages.routines.detail.next_day_premium_perks_body")}</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 rounded-full bg-primary hover:bg-primary" onClick={() => {
                  setNextDayDialogOpen(false);
                  window.dispatchEvent(new CustomEvent("amynest:open-paywall", { detail: { reason: "routines_limit" } }));
                }}>
                  <Crown className="h-4 w-4 mr-2" />
                  {t("pages.routines.detail.next_day_upgrade_btn")}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => setNextDayDialogOpen(false)}>
                  {t("pages.routines.detail.later")}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-quicksand flex items-center gap-2">
                  <Moon className="h-5 w-5 text-primary" />
                  {t("pages.routines.detail.great_job_today")}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  {t("pages.routines.detail.bedtime_is_done_should_ai_generate_tomorrow_s_routine_automa")}
                </DialogDescription>
              </DialogHeader>
              <div className="bg-muted border border-border rounded-xl p-3 text-sm text-primary">
                <p className="font-medium mb-0.5">{t("pages.routines.detail.tomorrow_s_schedule_will_include")}</p>
                <p className="text-xs text-primary">{t("pages.routines.detail.weekend_or_school_day_activities_detected_automatically")}<br />{t("pages.routines.detail.balanced_meals_play_learning_rest")}<br />{t("pages.routines.detail.ready_the_moment_you_wake_up")}</p>
              </div>
              {!isPremium && (
                <p className="text-xs text-center" style={{ color: "hsl(var(--brand-amber-600))" }}>
                  {t("pages.routines.detail.next_day_free_one_time_hint")}
                </p>
              )}
              <div className="flex gap-2">
                <Button className="flex-1 rounded-full bg-primary hover:bg-primary" onClick={handleNextDayGen} disabled={nextDayLoading}>
                  {nextDayLoading ? <><RotateCcw className="h-4 w-4 mr-2 animate-spin" />{t("pages.routines.detail.generating")}</> : <><Sparkles className="h-4 w-4 mr-2" />{t("pages.routines.detail.generate_tomorrow")}</>}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => setNextDayDialogOpen(false)}>
                  {t("pages.routines.detail.later")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RoutineRevealOverlay
        active={revealActive && !!routine}
        title={routine?.title ?? ""}
        childName={routine?.childName ?? ""}
        highlightChips={revealHighlightChips}
        onComplete={clearRevealParam}
      />

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-quicksand flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              {t("pages.routines.detail.share_routine")}
            </DialogTitle>
          </DialogHeader>

          {babysitterInfo && <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary">{babysitterInfo.name[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-sm">{babysitterInfo.name}</p>
                {babysitterInfo.mobileNumber && <p className="text-xs text-muted-foreground">{babysitterInfo.mobileNumber}</p>}
              </div>
            </div>}

          {routine ? (
            <RoutineShareCard
              childName={routine.childName}
              childPhotoUrl={childPhotoUrl}
              title={routine.title}
              dateLabel={new Date(routine.date + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
              timeline={shareCardTimeline}
              mealSummary={shareCardMeals}
            />
          ) : null}

          <details className="group">
            <summary className="text-xs font-semibold text-muted-foreground cursor-pointer list-none flex items-center gap-1">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              {t("pages.routines.detail.copy_plain_text", { defaultValue: "Plain text version" })}
            </summary>
            <div className="bg-muted/50 rounded-xl p-3 mt-2 text-sm font-mono whitespace-pre-wrap text-foreground/80 max-h-40 overflow-y-auto">
              {buildShareMessage()}
            </div>
          </details>

          <div className="flex flex-col gap-2">
            {/* Direct WhatsApp — always visible */}
            <a
              href={babysitterInfo?.mobileNumber
                ? `https://wa.me/${babysitterInfo.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(buildShareMessage())}`
                : `https://wa.me/?text=${encodeURIComponent(buildShareMessage())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full"
            >
              {/* audit-ok: #25D366 is WhatsApp brand green — third-party brand color */}
              <button className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white" style={{ background: "#25D366" }}>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.553 4.103 1.518 5.829L.057 23.63a.75.75 0 0 0 .92.92l5.703-1.461A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 0 1-5.044-1.393l-.361-.214-3.737.958.992-3.629-.235-.374A9.818 9.818 0 1 1 12 21.818z"/></svg>
                {t("pages.routines.detail.open_in_whatsapp")}
              </button>
            </a>
            <Button onClick={copyShareMessage} variant="outline" className="rounded-xl w-full">
              <Copy className="h-4 w-4 mr-2" />
              {t("pages.routines.detail.copy_routine_text")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile sticky "now" bar — today only, while tasks remain */}
      {dateMode === "today" &&
        totalCount > 0 &&
        completedCount < totalCount &&
        (timelineFocus.currentIndex >= 0 || timelineFocus.nextUpIndex >= 0) &&
        (() => {
          const isNow = timelineFocus.currentIndex >= 0;
          const idx = isNow ? timelineFocus.currentIndex : timelineFocus.nextUpIndex;
          const it = items[idx];
          if (!it) return null;
          const nextStart = parseRoutineTimeToMinutes(it.time);
          const minsUntil =
            !isNow && nextStart >= 0 && timelineFocus.nowMins >= 0
              ? Math.max(0, nextStart - timelineFocus.nowMins)
              : undefined;
          return (
            <RoutineNowBar
              kind={isNow ? "now" : "next"}
              activity={it.activity}
              time={formatRoutineTime(it.time)}
              minsUntil={minsUntil}
              completing={completingNow}
              onComplete={
                isNow
                  ? () => {
                      setCompletingNow(true);
                      updateItemStatus(idx, "completed");
                      window.setTimeout(() => setCompletingNow(false), 800);
                    }
                  : undefined
              }
            />
          );
        })()}

      <RoutineCelebration
        open={celebrateOpen}
        onClose={() => setCelebrateOpen(false)}
        childName={routine?.childName}
        total={totalCount}
        points={todayPoints}
      />
    </div>;
}