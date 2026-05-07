import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link, useParams } from "wouter";
import { useGetRoutine, getGetRoutineQueryKey, useDeleteRoutine, getListRoutinesQueryKey, useGetChild, getGetChildQueryKey, useUpdateRoutineUiPrefs } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getActivityImage } from "@/lib/activity-images";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar as CalendarIcon, User, Trash2, Sparkles, Check, SkipForward, Clock, Bell, BellOff, Share2, Copy, ChefHat, Timer, Users, Pencil, Plus, RotateCcw, Moon, X, Save, BookOpen, Lock, Crown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { addPoints, checkAndAwardBadges, getTotalPoints } from "@/lib/rewards";
import { MealRecipeCard } from "@/components/MealRecipeCard";
import { announceCurrentTask, isVoiceEnabled, getVoiceSettings } from "@/lib/voice";
import { VoiceSettingsPanel } from "@/components/voice-settings";
import { runAdaptiveEngine, type AdaptiveMood, type AdaptiveSleepQuality } from "@workspace/family-routine";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
};
const CATEGORY_STYLES: Record<string, string> = {
  morning: "bg-muted text-primary border-border",
  meal: "bg-muted text-primary border-border",
  school: "bg-muted text-primary border-border",
  travel: "bg-muted text-primary border-border",
  homework: "bg-muted text-primary border-border",
  play: "bg-muted text-primary border-border",
  exercise: "bg-muted text-primary border-border",
  screen: "bg-muted text-primary border-border",
  hygiene: "bg-muted text-primary border-border",
  sleep: "bg-muted text-foreground border-border",
  "wind-down": "bg-muted text-primary border-border",
  bonding: "bg-muted text-primary border-border",
  tiffin: "bg-muted text-primary border-border"
};
const STATUS_STYLES: Record<ItemStatus, string> = {
  pending: "",
  completed: "border-border bg-muted dark:bg-card dark:border-primary",
  skipped: "border-dashed border-muted-foreground/30 opacity-60",
  delayed: "border-border bg-muted dark:bg-card dark:border-primary"
};
function parse12hToMinutes(timeStr: string): number {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return -1;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
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
  return <div ref={trackRef} className="relative h-11 rounded-full overflow-hidden select-none border border-border" style={{
    background: "linear-gradient(to right, #f1f5f9, #e2e8f0)",
    touchAction: "none"
  }}>
      {/* Green fill as knob moves */}
      <div className="absolute inset-y-0 left-0 rounded-full transition-none" style={{
      width: `${4 + knobX + KNOB / 2}px`,
      background: `rgba(34,197,94,${0.12 + progress * 0.55})`,
      transition: dragging ? "none" : "width 0.3s cubic-bezier(0.34,1.56,0.64,1)"
    }} />
      {/* Track label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{
      opacity: Math.max(0, 1 - progress * 2.2)
    }}>
        <span className="text-xs font-bold text-foreground tracking-wide">
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
      <div className="absolute top-1 rounded-full bg-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing" style={{
      left: `${4 + knobX}px`,
      width: KNOB,
      height: KNOB,
      transition: dragging ? "none" : "left 0.3s cubic-bezier(0.34,1.56,0.64,1)",
      touchAction: "none"
    }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <Check className={`h-4 w-4 transition-colors ${done ? "text-primary" : "text-muted-foreground"}`} />
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
  seed
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
              <span className="text-white/80 text-xs font-medium">{item.time} · {item.duration}m</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">{item.category}</span>
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
            </div> : item.notes ? <div className="bg-muted/50 rounded-2xl p-4">
              <p className="text-sm font-bold text-foreground mb-1">{t("pages.routines.detail.instructions")}</p>
              <p className="text-sm text-muted-foreground leading-relaxed" style={{
            wordBreak: "break-word",
            whiteSpace: "normal"
          }}>
                {item.notes}
              </p>
            </div> : null}

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
  const { isPremium, entitlements } = useSubscription();
  const isRoutineGenerateLocked = !isPremium && (entitlements?.usage.features?.routine_generate?.locked ?? false);
  const [localItems, setLocalItems] = useState<RoutineItem[] | null>(null);
  const notifSupported = typeof window !== "undefined" && "Notification" in window;
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => isVoiceEnabled());
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
  const notifTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

  // Expanded item modal
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

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
    isLoading
  } = useGetRoutine(routineId, {
    query: {
      enabled: !!routineId,
      queryKey: getGetRoutineQueryKey(routineId)
    }
  });
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
    Promise.all([authFetch(getApiUrl("/api/parent-profile")).then(r => r.ok ? r.json() : null).catch(() => null), authFetch(getApiUrl("/api/children")).then(r => r.ok ? r.json() : null).catch(() => null)]).then(([profile, children]) => {
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
      authFetch(`/api/children/${routine.childId}`).then(r => r.ok ? r.json() : null).then((child: any) => {
        if (child?.babysitterId) {
          authFetch("/api/babysitters").then(r => r.json()).then((sitters: {
            id: number;
            name: string;
            mobileNumber?: string | null;
          }[]) => {
            const sitter = sitters.find(s => s.id === child.babysitterId);
            if (sitter) setBabysitterInfo(sitter);
          });
        }
      }).catch(() => {});
    }
  }, [routine]);

  // Voice announcement for current task
  useEffect(() => {
    if (!voiceOn) return;
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
      announceCurrentTask(childName, currentTask.activity);
    }
  });
  const buildShareMessage = () => {
    if (!routine) return "";
    const lines = [`📅 ${routine.title}`, `👧 Child: ${routine.childName}`, `📆 Date: ${new Date(routine.date).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric"
    })}`, "", "📋 ROUTINE:", ...items.map(item => `• ${item.time} — ${item.activity} (${item.duration} min)${item.notes ? `\n  💡 ${item.notes}` : ""}`), "", "— Sent via AmyNest"];
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
      const data = await res.json();
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
      const data = await res.json();
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
      const data = await res.json();
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
      const data = await res.json();
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
      return res.json();
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
        addPoints(childName, item.activity, earned);
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
        const isSleep = ["sleep", "wind-down"].includes(item.category?.toLowerCase() ?? "") || /sleep|bed\s*time|good night/i.test(item.activity);
        if (isSleep && routine?.childId) {
          setPendingNextDayChildId(routine.childId);
          setTimeout(() => setNextDayDialogOpen(true), 600);
        }
      }
      saveItemsMutation.mutate(updated);
      return updated;
    });
  }, [saveItemsMutation, toast, routine]);

  // Notifications
  const scheduleNotifications = useCallback((items: RoutineItem[]) => {
    notifTimersRef.current.forEach(clearTimeout);
    notifTimersRef.current = [];
    const now = new Date();
    const todayBase = new Date(now);
    todayBase.setSeconds(0, 0);
    items.forEach((item, i) => {
      const mins = parse12hToMinutes(item.time);
      if (mins < 0) return;
      const taskDate = new Date(todayBase);
      taskDate.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
      const msUntilTask = taskDate.getTime() - Date.now();
      if (msUntilTask <= 0) return;
      const timerId = setTimeout(() => {
        new Notification(`⏰ Time for: ${item.activity}`, {
          body: item.notes || `${item.duration} min · ${item.category}`,
          icon: "/pwa-icon-192.png",
          tag: `routine-${routineId}-${i}`
        });
      }, msUntilTask);
      notifTimersRef.current.push(timerId);
    });
  }, [routineId]);
  const toggleNotifications = async () => {
    if (!notifSupported) return;
    if (notificationsEnabled) {
      notifTimersRef.current.forEach(clearTimeout);
      notifTimersRef.current = [];
      setNotificationsEnabled(false);
      toast({
        title: t("toasts.routines_detail.notifications_disabled")
      });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      const items = localItems ?? routine?.items as RoutineItem[] ?? [];
      scheduleNotifications(items);
      setNotificationsEnabled(true);
      toast({
        title: t("toasts.routines_detail.notifications_enabled_title"),
        description: t("toasts.routines_detail.notifications_enabled_body")
      });
    } else {
      toast({
        title: t("toasts.routines_detail.permission_denied_title"),
        description: t("toasts.routines_detail.permission_denied_body"),
        variant: "destructive"
      });
    }
  };
  useEffect(() => () => notifTimersRef.current.forEach(clearTimeout), []);
  const getCategoryStyle = (category: string) => {
    const key = Object.keys(CATEGORY_STYLES).find(k => category.toLowerCase().includes(k));
    return key ? CATEGORY_STYLES[key] : "bg-muted text-foreground border-border";
  };
  const items = localItems ?? routine?.items as RoutineItem[] ?? [];

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

  // Date-awareness: compare routine date vs system date
  const routineDateStr = routine?.date?.slice(0, 10) ?? "";
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateMode: "past" | "today" | "future" = !routineDateStr ? "today" : routineDateStr < todayStr ? "past" : routineDateStr > todayStr ? "future" : "today";

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
    return <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
        <div className="h-12 w-3/4 bg-muted animate-pulse rounded-xl" />
        <div className="space-y-4 mt-8">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />)}
        </div>
      </div>;
  }
  if (!routine) {
    return <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-2xl font-bold mb-2">{t("pages.routines.detail.routine_not_found")}</h2>
        <Button asChild><Link href="/routines">{t("pages.routines.detail.back_to_routines")}</Link></Button>
      </div>;
  }
  return <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-full -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/routines">
              <ArrowLeft className="h-4 w-4 mr-2" />{t("pages.routines.detail.back")}
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            {dateMode !== "past" && <Button variant="outline" size="sm" onClick={handlePartialRegen} disabled={partialRegenLoading} className="rounded-full gap-2 bg-primary/5 border-primary/30 text-primary hover:bg-primary/10">
                <RotateCcw className={`h-4 w-4 ${partialRegenLoading ? "animate-spin" : ""}`} />
                {partialRegenLoading ? "Updating…" : "Regen Rest"}
              </Button>}

            {notifSupported && <Button variant="outline" size="sm" onClick={toggleNotifications} className="rounded-full gap-2">
                {notificationsEnabled ? <><BellOff className="h-4 w-4" /> {t("pages.routines.detail.notifications_on")}</> : <><Bell className="h-4 w-4" /> {t("pages.routines.detail.notify_me")}</>}
              </Button>}

            <VoiceSettingsPanel onToggle={enabled => setVoiceOn(enabled)} />

            <Link href="/parenting-hub">
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-border text-primary hover:bg-muted">
                <BookOpen className="h-4 w-4" />
                {t("pages.routines.detail.hub")}
              </Button>
            </Link>

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
          <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
            <Sparkles className="h-4 w-4" />
            {t("pages.routines.detail.amy_ai_generated_schedule")}
          </div>
          <h1 className="font-quicksand text-3xl sm:text-4xl font-bold text-foreground">{routine.title}</h1>

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
                  {t("pages.routines.detail.day_starts_at")} {firstTime}
                </div>;
          })()}
          </div>

          {/* Date mode banners */}
          {dateMode === "future" && <div className="mt-3 flex items-center gap-2.5 bg-muted border border-border rounded-2xl px-4 py-3 text-sm text-primary">
              <span className="text-lg">📅</span>
              <span><strong>{t("pages.routines.detail.future_routine")}</strong> {t("pages.routines.detail.all_tasks_are_shown_as_scheduled_you_can_start_interacting_o")}</span>
            </div>}
          {dateMode === "past" && <div className="mt-3 flex items-center gap-2.5 bg-muted/60 border border-border rounded-2xl px-4 py-3 text-sm text-muted-foreground">
              <span className="text-lg">🗂️</span>
              <span><strong>{t("pages.routines.detail.past_routine")}</strong> {t("pages.routines.detail.this_is_a_read_only_record_generate_a_new_routine_to_plan_up")}</span>
            </div>}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && <div className="bg-muted rounded-2xl p-4">
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

        {/* Today's mood + sleep quick selectors — drive Amy AI adaptation */}
        {dateMode === "today" && totalCount > 0 && <div className="rounded-2xl border border-border bg-card/60 p-3 space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              {t("pages.routines.detail.how_is")} {routine?.childName ?? "your child"} {t("pages.routines.detail.today_2")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">{t("pages.routines.detail.mood")}</span>
                {(["low", "neutral", "active"] as AdaptiveMood[]).map(m => <button key={m} type="button" onClick={() => persistMood(m)} className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${todayMood === m ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-foreground border-border hover:bg-muted"}`} aria-pressed={todayMood === m}>
                    {m === "low" ? "😔 Low" : m === "active" ? "🤸 Active" : "🙂 Neutral"}
                  </button>)}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">{t("pages.routines.detail.sleep")}</span>
                {(["poor", "ok", "good"] as AdaptiveSleepQuality[]).map(s => <button key={s} type="button" onClick={() => persistSleep(s)} className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${todaySleep === s ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-foreground border-border hover:bg-muted"}`} aria-pressed={todaySleep === s}>
                    {s === "poor" ? "😴 Poor" : s === "ok" ? "🌙 OK" : "✨ Good"}
                  </button>)}
              </div>
            </div>
          </div>}

        {/* Amy AI suggests banner — driven by the Adaptive Engine */}
        <div className="rounded-2xl border-2 border-border bg-gradient-to-r from-muted to-muted p-4 flex items-start gap-3">
          <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-primary uppercase tracking-wide mb-0.5">{t("pages.routines.detail.amy_ai_suggests")}</p>
            <p className="text-sm text-primary font-medium leading-snug">{amyTip}</p>
            {dateMode === "today" && (dailySummary.delayed > 0 || dailySummary.adjusted > 0) && <div className="flex flex-wrap gap-1.5 mt-2">
                {dailySummary.delayed > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-primary border border-border">
                    ⏱ {dailySummary.delayed} {t("pages.routines.detail.delayed_2")}
                  </span>}
                {dailySummary.adjusted > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-primary border border-border">
                    ⚡ {dailySummary.adjusted} {t("pages.routines.detail.auto_adjusted")}
                  </span>}
              </div>}
          </div>
        </div>
      </header>


      {/* Amy AI editing tip — guides parents to the Edit button on every task */}
      {dateMode !== "past" && items.some(i => i.status !== "completed" && i.status !== "skipped") && <div className="rounded-2xl border-2 border-border bg-muted dark:bg-card dark:border-primary p-3 flex items-start gap-2.5">
          <div className="bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs text-primary dark:text-foreground font-medium leading-snug">
            <strong className="text-primary dark:text-foreground">{t("pages.routines.detail.tip_from_amy_ai")}</strong>{" "}
            {t("pages.routines.detail.tap_the")}{" "}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-border bg-muted text-primary dark:bg-card dark:text-muted-foreground font-bold text-[10px] align-middle">
              <Pencil className="h-2.5 w-2.5" /> {t("pages.routines.detail.edit")}
            </span>{" "}
            {t("pages.routines.detail.chip_on_any_task_to_change_its_time_name_or_duration_i_ll_ke")}
          </p>
        </div>}

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

      <div className="relative mt-2">
        <div className="absolute left-[39px] sm:left-[55px] top-4 bottom-4 w-0.5 bg-border/60 z-0 rounded-full" />

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
          {displayItems.map(({
          item,
          origIdx: index
        }, displayIdx) => {
          const status = item.status ?? "pending";
          const catStyle = getCategoryStyle(item.category);
          const statusStyle = STATUS_STYLES[status];
          const priority = getPriority(item.category, item.activity);

          // Real-time awareness — only applies to today's routines
          const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
          const taskStart = parse12hToMinutes(item.time);
          const taskEnd = taskStart + (item.duration ?? 30);
          const isCurrentTask = dateMode === "today" && status === "pending" && taskStart <= nowMins && nowMins < taskEnd;
          const isPastTask = dateMode === "today" && status === "pending" && taskEnd <= nowMins;
          // Past routines are read-only; today and future allow full interaction
          const isInteractive = dateMode !== "past";
          return <div className="flex gap-2 sm:gap-4 group items-start" key={index}>
                {/* Time column — fixed left */}
                <div className="flex flex-col items-end pt-3.5 w-[64px] sm:w-[96px] shrink-0">
                  <div className={`text-xs sm:text-sm font-bold text-right whitespace-nowrap ${isPastTask ? "text-muted-foreground line-through" : isCurrentTask ? "text-primary" : "text-foreground"}`}>{item.time}</div>
                  <div className="text-[11px] text-muted-foreground font-medium text-right">{item.duration}m</div>
                  {isCurrentTask && <div className="mt-1 text-[8px] font-black uppercase tracking-wide text-primary bg-primary/10 rounded-full px-1.5 py-0.5">{t("pages.routines.detail.now")}</div>}
                </div>

                {/* Activity Card — click to expand */}
                <Card className={`flex-1 min-w-0 rounded-2xl shadow-sm border-2 overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer ${item.category === "school" ? "border-border bg-muted" : isCurrentTask ? "border-primary ring-2 ring-primary/20 shadow-md" : item.category === "bonding" && !statusStyle ? "border-border" : statusStyle || "border-border"}`} onClick={() => editingIndex === null && setExpandedIndex(index)}>
                  {item.category === "school" && <div className="bg-muted border-b border-border px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-primary text-xs">🏫</span>
                      <span className="text-primary text-xs font-bold">{t("pages.routines.detail.in_school_protected_time")}</span>
                    </div>}
                  {item.category === "bonding" && <div className="bg-muted border-b border-border px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-primary text-xs">❤️</span>
                      <span className="text-primary text-xs font-bold">{t("pages.routines.detail.family_bonding_time")}</span>
                    </div>}
                  {item.category === "tiffin" && <div className="bg-muted border-b border-border px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-primary text-xs">🍱</span>
                      <span className="text-primary text-xs font-bold">{t("pages.routines.detail.tiffin_lunchbox_prep")}</span>
                    </div>}
                  {isCurrentTask && <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-primary text-xs font-bold">{t("pages.routines.detail.happening_now")}</span>
                    </div>}
                  <CardContent className="p-3 sm:p-4">
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
                            <h3 className={`font-bold text-sm sm:text-base text-foreground leading-snug flex-1 min-w-0 ${status === "skipped" ? "line-through text-muted-foreground" : status === "completed" ? "line-through opacity-60" : ""}`} style={{
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
                            <Badge className={`rounded-full text-[10px] sm:text-xs font-bold border px-2 py-0.5 ${catStyle}`}>
                              {item.category}
                            </Badge>
                            {priority === "high" && status === "pending" && !isCurrentTask && <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-primary bg-muted border border-border rounded-full px-1.5 py-0.5">
                                {t("pages.routines.detail.essential")}
                              </span>}
                            {item.ageBand && <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-primary bg-muted border border-border rounded-full px-1.5 py-0.5">
                                <Users className="h-2.5 w-2.5" />
                                {t("pages.routines.detail.ages_3")} {item.ageBand.replace("-", "–")}
                              </span>}
                          </div>
                          {/* Auto-skip reason */}
                          {item.skipReason && <p className="text-[11px] text-primary bg-muted border border-border rounded-lg px-2 py-1 mt-1 font-medium">
                              {item.skipReason}
                            </p>}
                          {item.notes && item.notes.startsWith("Options:") ? <div className="mt-1.5 space-y-1.5">
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
                            </div> : item.notes ? <p className="text-muted-foreground text-xs mt-1 leading-relaxed line-clamp-3 break-words" style={{
                          overflowWrap: "break-word"
                        }}>{item.notes}</p> : null}
                          {editingIndex !== index && <MealRecipeCard meal={item.meal} recipe={item.recipe} nutrition={item.nutrition} defaultOpen={(item.category === "meal" || item.category === "tiffin") && items.slice(0, index).filter(it => it.category === "meal" || it.category === "tiffin").length === 0} />}
                          </>}
                        </div>
                      </div>

                      {/* Slide-to-complete — only for pending interactive tasks */}
                      {isInteractive && editingIndex !== index && status !== "completed" && status !== "skipped" && status !== "delayed" && <div onClick={e => e.stopPropagation()}>
                          <SlideToComplete onComplete={() => updateItemStatus(index, "completed")} />
                        </div>}
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
    }} routineId={routineId} seed={expandedIndex !== null ? (routineId ?? 0) * 100 + expandedIndex : 0} />

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

          <div className="bg-muted/50 rounded-xl p-3 text-sm font-mono whitespace-pre-wrap text-foreground/80 max-h-64 overflow-y-auto">
            {buildShareMessage()}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={copyShareMessage} className="rounded-xl w-full">
              <Copy className="h-4 w-4 mr-2" />
              {t("pages.routines.detail.copy_routine_text")}
            </Button>
            {babysitterInfo?.mobileNumber && <a href={`https://wa.me/${babysitterInfo.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(buildShareMessage())}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-xl w-full">
                  {t("pages.routines.detail.open_in_whatsapp")}
                </Button>
              </a>}
            <p className="text-xs text-center text-muted-foreground">
              {t("pages.routines.detail.copy_the_text_above_and_paste_it_into_whatsapp_sms_or_any_me")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}