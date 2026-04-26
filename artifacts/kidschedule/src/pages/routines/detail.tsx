import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useGetRoutine, getGetRoutineQueryKey, useDeleteRoutine, getListRoutinesQueryKey, useGetChild, getGetChildQueryKey } from "@workspace/api-client-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { getActivityImage } from "@/lib/activity-images";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar as CalendarIcon, User, Trash2, Sparkles, Check, SkipForward, Clock, Bell, BellOff, Share2, Copy, ChefHat, Timer, Users, Pencil, Plus, RotateCcw, Moon, X, Save, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getApiUrl } from "@/lib/api";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { addPoints, checkAndAwardBadges, getTotalPoints } from "@/lib/rewards";
import { MealRecipeCard } from "@/components/MealRecipeCard";
import { announceCurrentTask, isVoiceEnabled, getVoiceSettings } from "@/lib/voice";
import { VoiceSettingsPanel } from "@/components/voice-settings";
import {
  runAdaptiveEngine,
  type AdaptiveMood,
  type AdaptiveSleepQuality,
} from "@workspace/family-routine";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
  morning:    "bg-amber-100 text-amber-800 border-amber-200",
  meal:       "bg-orange-100 text-orange-800 border-orange-200",
  school:     "bg-blue-100 text-blue-800 border-blue-200",
  travel:     "bg-indigo-100 text-indigo-800 border-indigo-200",
  homework:   "bg-purple-100 text-purple-800 border-purple-200",
  play:       "bg-green-100 text-green-800 border-green-200",
  exercise:   "bg-lime-100 text-lime-800 border-lime-200",
  screen:     "bg-cyan-100 text-cyan-800 border-cyan-200",
  hygiene:    "bg-pink-100 text-pink-800 border-pink-200",
  sleep:      "bg-slate-100 text-slate-600 border-slate-200",
  "wind-down":"bg-violet-100 text-violet-700 border-violet-200",
  bonding:    "bg-rose-100 text-rose-800 border-rose-200",
  tiffin:     "bg-amber-100 text-amber-800 border-amber-200",
};

const STATUS_STYLES: Record<ItemStatus, string> = {
  pending:   "",
  completed: "border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-700/60",
  skipped:   "border-dashed border-muted-foreground/30 opacity-60",
  delayed:   "border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700/60",
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
  sleep:       "high",
  "wind-down": "high",
  hygiene:     "high",
  meal:        "high",
  tiffin:      "high",
  school:      "high",
  morning:     "medium",
  homework:    "medium",
  exercise:    "medium",
  bonding:     "medium",
  travel:      "medium",
  reading:     "medium",
  snack:       "medium",
  play:        "low",
  screen:      "low",
};

function getPriority(category: string, activity = ""): "high" | "medium" | "low" {
  const key = Object.keys(CATEGORY_PRIORITY).find((k) => category?.toLowerCase().includes(k));
  if (key) return CATEGORY_PRIORITY[key];
  if (/sleep|bedtime|bath|brush|toilet|shower/i.test(activity)) return "high";
  if (/breakfast|lunch|dinner|meal|eat|tiffin/i.test(activity)) return "high";
  return "medium";
}

// ── Smart Cascade (shift + auto-skip) ─────────────────────────────
// Shifts all pending tasks from `fromIndex` by `delayMinutes`.
// If a task would end past the sleep anchor, auto-skips it if it's low or medium priority.
// HIGH priority tasks (hygiene, meals, sleep) are NEVER auto-skipped.
function smartCascade(
  items: RoutineItem[],
  fromIndex: number,
  delayMinutes: number
): { items: RoutineItem[]; autoSkipped: number } {
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
        updated[i] = { ...item, status: "skipped", skipReason: "⏭️ Skipped — not enough time" };
        autoSkipped++;
        continue;
      }
      // HIGH priority task that doesn't fit: keep it shifted (may push past sleep — unavoidable)
    }

    // If task was previously auto-skipped and now fits again, restore it
    const wasAutoSkipped = item.skipReason === "⏭️ Skipped — not enough time";
    const nowFits = isSleepAnchor || sleepAnchorMins < 0 || newStartMins + dur <= sleepAnchorMins;
    if (wasAutoSkipped && nowFits && item.status === "skipped") {
      updated[i] = { ...item, status: "pending", time: minutesToTime(newStartMins), skipReason: undefined };
      continue;
    }

    // Normal shift
    updated[i] = { ...item, time: minutesToTime(newStartMins), skipReason: undefined };
  }

  return { items: updated, autoSkipped };
}

// Keep backward-compat shim (used only for notifications scheduling)
function shiftScheduleFromIndex(items: RoutineItem[], fromIndex: number, delayMinutes: number): RoutineItem[] {
  return smartCascade(items, fromIndex, delayMinutes).items;
}

// ─── Slide-to-Complete ────────────────────────────────────────────────────────
function SlideToComplete({ onComplete, disabled = false }: { onComplete(): void; disabled?: boolean }) {
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

  return (
    <div
      ref={trackRef}
      className="relative h-11 rounded-full overflow-hidden select-none border border-border"
      style={{ background: "linear-gradient(to right, #f1f5f9, #e2e8f0)", touchAction: "none" }}
    >
      {/* Green fill as knob moves */}
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-none"
        style={{
          width: `${4 + knobX + KNOB / 2}px`,
          background: `rgba(34,197,94,${0.12 + progress * 0.55})`,
          transition: dragging ? "none" : "width 0.3s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
      {/* Track label */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ opacity: Math.max(0, 1 - progress * 2.2) }}
      >
        <span className="text-xs font-bold text-slate-500 tracking-wide">
          {done ? "✅ Completed!" : "Slide to complete  →"}
        </span>
      </div>
      {/* Success label */}
      {progress > 0.5 && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity: Math.max(0, progress * 2 - 1) }}
        >
          <span className="text-xs font-black text-green-700 tracking-wide">✅ Release to complete!</span>
        </div>
      )}
      {/* Knob */}
      <div
        className="absolute top-1 rounded-full bg-white shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing"
        style={{
          left: `${4 + knobX}px`,
          width: KNOB,
          height: KNOB,
          transition: dragging ? "none" : "left 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          touchAction: "none",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <Check className={`h-4 w-4 transition-colors ${done ? "text-green-600" : "text-slate-400"}`} />
      </div>
    </div>
  );
}

// ─── Routine Item Expand Modal ─────────────────────────────────────────────────
function RoutineItemModal({
  item, index, isOpen, onClose, isInteractive, onComplete, onDelay, onSkip, routineId, seed,
}: {
  item: RoutineItem | null; index: number; isOpen: boolean; onClose(): void;
  isInteractive: boolean; onComplete(): void; onDelay(): void; onSkip(): void;
  routineId: number; seed: number;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const img = getActivityImage(item.category, item.activity, seed);
  const status = item.status ?? "pending";
  const isPending = status === "pending";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="routine-modal-enter bg-card w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image */}
        <div className="relative h-52 overflow-hidden rounded-t-3xl sm:rounded-t-3xl bg-muted shrink-0">
          <img src={img.src} alt={item.activity} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <h2 className="text-xl font-black text-white leading-tight" style={{ wordBreak: "break-word" }}>
              {item.activity}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-white/80 text-xs font-medium">{item.time} · {item.duration}m</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">{item.category}</span>
              {status === "completed" && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/80 text-white">✓ Done</span>}
              {status === "skipped" && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-500/80 text-white">Skipped</span>}
              {status === "delayed" && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/80 text-white">⏱ Delayed</span>}
              {item.ageBand && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/30 backdrop-blur-sm inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Ages {item.ageBand.replace("-", "–")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Skip reason */}
          {item.skipReason && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <p className="text-sm text-amber-800 font-medium leading-relaxed" style={{ wordBreak: "break-word" }}>{item.skipReason}</p>
            </div>
          )}

          {/* Notes / meal options */}
          {item.notes && item.notes.startsWith("Options:") ? (
            <div className="space-y-2">
              <p className="text-sm font-bold text-foreground">🍽️ Meal options</p>
              <div className="flex flex-wrap gap-2">
                {item.notes.replace("Options:", "").split("|").map((opt, oi) => (
                  <span key={oi} className="text-sm font-medium px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                    {opt.trim()}
                  </span>
                ))}
              </div>
            </div>
          ) : item.notes ? (
            <div className="bg-muted/50 rounded-2xl p-4">
              <p className="text-sm font-bold text-foreground mb-1">📋 Instructions</p>
              <p className="text-sm text-muted-foreground leading-relaxed" style={{ wordBreak: "break-word", whiteSpace: "normal" }}>
                {item.notes}
              </p>
            </div>
          ) : null}

          {/* Actions */}
          {isInteractive && isPending && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => { onComplete(); onClose(); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 active:scale-95 transition-all"
              >
                <Check className="h-5 w-5" />
                <span className="text-xs font-bold">Complete</span>
              </button>
              <button
                onClick={() => { onDelay(); onClose(); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 active:scale-95 transition-all"
              >
                <Clock className="h-5 w-5" />
                <span className="text-xs font-bold">Delay +15m</span>
              </button>
              <button
                onClick={() => { onSkip(); onClose(); }}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-muted border border-border text-muted-foreground hover:bg-muted/80 active:scale-95 transition-all"
              >
                <SkipForward className="h-5 w-5" />
                <span className="text-xs font-bold">Skip</span>
              </button>
            </div>
          )}
          {isInteractive && !isPending && (
            <button
              onClick={() => { onComplete(); onClose(); }}
              className="w-full py-3 rounded-2xl bg-muted border border-border text-muted-foreground text-sm font-bold hover:bg-muted/80 transition-colors"
            >
              ↩ Mark as pending again
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-border text-foreground text-sm font-bold hover:bg-muted/50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RoutineDetail() {
  const [_, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const routineId = parseInt(params.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authFetch = useAuthFetch();

  const [localItems, setLocalItems] = useState<RoutineItem[] | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [voiceOn, setVoiceOn] = useState(() => isVoiceEnabled());
  const announcedTaskRef = useRef<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [babysitterInfo, setBabysitterInfo] = useState<{ name: string; mobileNumber?: string | null } | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [recipeData, setRecipeData] = useState<any>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const notifTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ activity: string; time: string; duration: string }>({ activity: "", time: "", duration: "" });

  // Add activity dialog
  const [addActivityOpen, setAddActivityOpen] = useState(false);
  const [addActivityForm, setAddActivityForm] = useState({ name: "", duration: "30" });

  // Next-day dialog
  const [nextDayDialogOpen, setNextDayDialogOpen] = useState(false);
  const [nextDayLoading, setNextDayLoading] = useState(false);
  const [pendingNextDayChildId, setPendingNextDayChildId] = useState<number | null>(null);

  // Partial regen
  const [partialRegenLoading, setPartialRegenLoading] = useState(false);
  const [addActivityLoading, setAddActivityLoading] = useState(false);

  // Expanded item modal
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Age-band filter — persisted per routine in localStorage. The stored value
  // is paired with a signature of the routine's activities so that when the
  // routine items change (e.g. after AI regeneration) the filter resets to
  // "All" instead of pointing at a stale band.
  const [ageBandFilter, setAgeBandFilterState] = useState<string | null>(null);
  const ageFilterHydratedRef = useRef<{ routineId: number; signature: string } | null>(null);

  // Parent prefs for inline meal suggestions
  const [mealPrefs, setMealPrefs] = useState<{ region: string; isVeg?: boolean; childAge?: number }>({ region: "pan_indian" });

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
    undoTimerRef.current = setTimeout(() => { setUndoSnapshot(null); setUndoLabel(""); }, 6000);
  };
  const handleUndo = () => {
    if (!undoSnapshot) return;
    setLocalItems(undoSnapshot);
    saveItemsMutation.mutate(undoSnapshot);
    clearUndo();
    toast({ title: "↩️ Action undone" });
  };

  const { data: routine, isLoading } = useGetRoutine(routineId, {
    query: { enabled: !!routineId, queryKey: getGetRoutineQueryKey(routineId) }
  });

  const childId = (routine as any)?.childId ?? 0;
  const { data: childData } = useGetChild(childId, {
    query: { enabled: !!childId, queryKey: getGetChildQueryKey(childId) }
  });
  const childPhotoUrl: string | null = (childData as any)?.photoUrl ?? null;

  // Fetch parent profile once for meal suggestion prefs
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      authFetch(getApiUrl("/api/parent-profile")).then(r => r.ok ? r.json() : null).catch(() => null),
      authFetch(getApiUrl("/api/children")).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([profile, children]) => {
      if (cancelled) return;
      const region = profile?.region ?? "pan_indian";
      const isVeg = profile?.foodType === "veg" ? true : undefined;
      const childAge = Array.isArray(children) && children[0]?.age != null ? Number(children[0].age) : undefined;
      setMealPrefs({ region, isVeg, childAge });
    });
    return () => { cancelled = true; };
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
    const next = items.map((it) => {
      const status = it.status ?? "pending";
      if (status !== "pending") return it;
      if (isPast) {
        changed = true;
        return { ...it, status: "completed" as ItemStatus };
      }
      const start = parse12hToMinutes(it.time);
      if (start < 0) return it;
      const end = start + (it.duration ?? 30);
      if (end <= nowMins) {
        changed = true;
        return { ...it, status: "completed" as ItemStatus };
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
      authFetch(`/api/children/${routine.childId}`)
        .then((r) => r.ok ? r.json() : null)
        .then((child: any) => {
          if (child?.babysitterId) {
            authFetch("/api/babysitters")
              .then((r) => r.json())
              .then((sitters: { id: number; name: string; mobileNumber?: string | null }[]) => {
                const sitter = sitters.find((s) => s.id === child.babysitterId);
                if (sitter) setBabysitterInfo(sitter);
              });
          }
        })
        .catch(() => {});
    }
  }, [routine]);



  // Voice announcement for current task
  useEffect(() => {
    if (!voiceOn) return;
    const items = localItems ?? (routine?.items as RoutineItem[]) ?? [];
    const childName = (childData as any)?.name ?? routine?.childName ?? "buddy";
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const currentTask = items.find((item) => {
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
    const lines = [
      `📅 ${routine.title}`,
      `👧 Child: ${routine.childName}`,
      `📆 Date: ${new Date(routine.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`,
      "",
      "📋 ROUTINE:",
      ...items.map((item) => `• ${item.time} — ${item.activity} (${item.duration} min)${item.notes ? `\n  💡 ${item.notes}` : ""}`),
      "",
      "— Sent via AmyNest",
    ];
    return lines.join("\n");
  };

  const copyShareMessage = () => {
    const msg = buildShareMessage();
    navigator.clipboard.writeText(msg).then(() => {
      toast({ title: "Copied!", description: "Routine copied. Paste it into WhatsApp or SMS." });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealName, childAge: routine?.childName ? undefined : undefined }),
      });
      if (!res.ok) throw new Error("Failed to fetch recipe");
      const data = await res.json();
      setRecipeData(data);
    } catch {
      toast({ title: "Could not load recipe", variant: "destructive" });
      setRecipeOpen(false);
    } finally {
      setRecipeLoading(false);
    }
  };

  // ── Inline Edit Handlers ──────────────────────────────────────────
  const handleEditStart = (index: number) => {
    const item = (localItems ?? [])[index];
    if (!item) return;
    setEditForm({ activity: item.activity, time: item.time, duration: String(item.duration) });
    setEditingIndex(index);
  };

  const handleEditSave = (index: number) => {
    setLocalItems((prev) => {
      if (!prev) return prev;
      const original = prev[index];
      const newTime = editForm.time.trim() || original.time;
      const newDuration = parseInt(editForm.duration) || original.duration;
      const newActivity = editForm.activity.trim() || original.activity;

      // Apply edits to this item
      const base = prev.map((item, i) =>
        i === index ? { ...item, activity: newActivity, time: newTime, duration: newDuration } : item
      );

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

      const { items: cascaded, autoSkipped } = smartCascade(base, index + 1, totalDelay);

      if (autoSkipped > 0) {
        toast({
          title: `⏭️ ${autoSkipped} task${autoSkipped > 1 ? "s" : ""} auto-skipped`,
          description: "Low-priority activities cleared to protect bedtime.",
        });
      } else if (totalDelay > 0) {
        toast({ title: `⏩ Shifted +${totalDelay} min`, description: "Upcoming tasks adjusted." });
      } else {
        toast({ title: `⏪ Shifted ${Math.abs(totalDelay)} min earlier`, description: "Upcoming tasks moved forward." });
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
      const res = await authFetch(getApiUrl(`/api/routines/${routineId}/partial-regenerate`), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.items) {
        setLocalItems(data.items);
        toast({ title: "🔄 Day regenerated!", description: "Remaining tasks have been updated by AI." });
      }
    } catch {
      toast({ title: "Could not regenerate", variant: "destructive" });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newActivity: { name: addActivityForm.name, duration: parseInt(addActivityForm.duration) || 30 } }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.items) {
        setLocalItems(data.items);
        toast({ title: "✅ Activity added!", description: `"${addActivityForm.name}" has been fit into your schedule.` });
      }
    } catch {
      toast({ title: "Could not add activity", variant: "destructive" });
    } finally {
      setAddActivityLoading(false);
      setAddActivityOpen(false);
      setAddActivityForm({ name: "", duration: "30" });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: pendingNextDayChildId, date: dateStr, hasSchool: !isWeekend }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast({
        title: `🌅 Tomorrow's routine ready!`,
        description: `${isWeekend ? "Weekend" : "School day"} routine generated for ${data.childName ?? "your child"}.`,
      });
      queryClient.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
    } catch {
      toast({ title: "Could not generate tomorrow's routine", variant: "destructive" });
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetRoutineQueryKey(routineId) });
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate(
      { id: routineId },
      {
        onSuccess: () => {
          toast({ title: "Routine deleted" });
          queryClient.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
          setLocation("/routines");
        },
        onError: () => toast({ title: "Failed to delete routine", variant: "destructive" }),
      }
    );
  };

  const updateItemStatus = useCallback((index: number, status: ItemStatus) => {
    setLocalItems((prev) => {
      if (!prev) return prev;
      // Save snapshot for undo
      const actionLabel = status === "completed" ? "✅ Marked complete" : status === "skipped" ? "⏭ Marked skipped" : "⏱ Delayed";
      showUndo([...prev], actionLabel);
      let updated = prev.map((item, i) => i === index ? { ...item, status } : item);

      // Smart delay: shift + auto-skip if needed
      if (status === "delayed") {
        const { items: cascaded, autoSkipped } = smartCascade(updated, index + 1, 15);
        updated = cascaded;
        if (autoSkipped > 0) {
          toast({
            title: `⏱ Delayed · ${autoSkipped} task${autoSkipped > 1 ? "s" : ""} auto-skipped`,
            description: "Low-priority activities removed to protect bedtime.",
          });
        } else {
          toast({ title: "⏱ Schedule shifted +15 min", description: "Remaining tasks adjusted." });
        }
      }

      // Detect sleep/bedtime completion → prompt next-day generation
      if (status === "completed") {
        const item = prev[index];
        // Award points for completing task — use per-task points if present
        const childName = (childData as any)?.name ?? routine?.childName ?? "Child";
        const earned = (item as any).rewardPoints ?? 10;
        addPoints(childName, item.activity, earned);
        toast({ title: `+${earned} points earned 🎉`, description: item.activity });
        const completedSoFar = updated.filter((i) => i.status === "completed").length;
        const newBadges = checkAndAwardBadges(completedSoFar, 0);
        if (newBadges.length > 0) {
          toast({ title: `🏆 Badge earned: ${newBadges[0].emoji} ${newBadges[0].label}!` });
        }

        const isSleep = ["sleep", "wind-down"].includes(item.category?.toLowerCase() ?? "") ||
          /sleep|bed\s*time|good night/i.test(item.activity);
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
          icon: "/amynest-logo.png",
          tag: `routine-${routineId}-${i}`,
        });
      }, msUntilTask);

      notifTimersRef.current.push(timerId);
    });
  }, [routineId]);

  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      toast({ title: "Notifications not supported", description: "Your browser does not support notifications.", variant: "destructive" });
      return;
    }
    if (notificationsEnabled) {
      notifTimersRef.current.forEach(clearTimeout);
      notifTimersRef.current = [];
      setNotificationsEnabled(false);
      toast({ title: "Notifications disabled" });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      const items = localItems ?? (routine?.items as RoutineItem[]) ?? [];
      scheduleNotifications(items);
      setNotificationsEnabled(true);
      toast({ title: "🔔 Notifications enabled!", description: "You'll be notified before each task." });
    } else {
      toast({ title: "Permission denied", description: "Enable notifications in your browser settings.", variant: "destructive" });
    }
  };

  useEffect(() => () => notifTimersRef.current.forEach(clearTimeout), []);

  const getCategoryStyle = (category: string) => {
    const key = Object.keys(CATEGORY_STYLES).find((k) => category.toLowerCase().includes(k));
    return key ? CATEGORY_STYLES[key] : "bg-muted text-foreground border-border";
  };

  const items = localItems ?? (routine?.items as RoutineItem[]) ?? [];

  // Unique age bands present in this routine's items (for the filter chips)
  const ageBands = useMemo(
    () => Array.from(new Set(items.filter((i) => i.ageBand).map((i) => i.ageBand!))),
    [items],
  );

  // How many activities each chip will show when tapped — mirrors the displayItems filter
  // so the badge accurately previews the count parents will see.
  const ageBandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const band of ageBands) {
      counts[band] = items.filter((i) => !i.ageBand || i.ageBand === band).length;
    }
    return counts;
  }, [items, ageBands]);

  // Signature that captures the structural shape of the activities (names + bands).
  // Status / time changes don't affect it, so completing or cascading tasks keeps
  // the saved filter; AI regenerations / add / remove / rename invalidate it.
  const itemsSignature = useMemo(
    () => items.map((i) => `${i.activity}|${i.ageBand ?? ""}`).join("\n"),
    [items],
  );

  // Hydrate from / reset against localStorage when the routine or its activity
  // signature changes. Keyed per routine id so each routine remembers its own
  // last filter selection.
  useEffect(() => {
    if (!routineId || items.length === 0) return;
    const storageKey = `kidschedule:ageBandFilter:${routineId}`;
    let stored: { signature: string; filter: string | null } | null = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.signature === "string") {
          stored = { signature: parsed.signature, filter: parsed.filter ?? null };
        }
      }
    } catch { /* ignore corrupt storage */ }

    if (stored && stored.signature === itemsSignature) {
      setAgeBandFilterState(stored.filter);
    } else {
      setAgeBandFilterState(null);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ signature: itemsSignature, filter: null }));
      } catch { /* storage full / unavailable */ }
    }
    ageFilterHydratedRef.current = { routineId, signature: itemsSignature };
  }, [routineId, itemsSignature, items.length]);

  // Wrapper that updates state and persists the user's selection.
  const setAgeBandFilter = useCallback((next: string | null) => {
    setAgeBandFilterState(next);
    const hydrated = ageFilterHydratedRef.current;
    if (!hydrated || hydrated.routineId !== routineId) return;
    try {
      window.localStorage.setItem(
        `kidschedule:ageBandFilter:${routineId}`,
        JSON.stringify({ signature: hydrated.signature, filter: next }),
      );
    } catch { /* storage full / unavailable */ }
  }, [routineId]);

  // Items paired with their original index so all actions still use the correct index
  const displayItems = useMemo(
    () =>
      items
        .map((item, origIdx) => ({ item, origIdx }))
        .filter(({ item }) => !ageBandFilter || !item.ageBand || item.ageBand === ageBandFilter),
    [items, ageBandFilter],
  );

  const completedCount = items.filter((i) => i.status === "completed").length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Date-awareness: compare routine date vs system date
  const routineDateStr = routine?.date?.slice(0, 10) ?? "";
  const todayStr = new Date().toISOString().slice(0, 10);
  const dateMode: "past" | "today" | "future" = !routineDateStr
    ? "today"
    : routineDateStr < todayStr
    ? "past"
    : routineDateStr > todayStr
    ? "future"
    : "today";

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
      liveAdjust: dateMode === "today",
    });
  })();
  const amyTip = adaptive.suggestion;
  const dailySummary = adaptive.summary;

  // ── Persist auto-adjustments back to backend (today only) ───────────
  const lastPersistedRef = useRef<string>("");
  useEffect(() => {
    if (dateMode !== "today" || !adaptive.changed || !routineId) return;
    const sig = JSON.stringify(
      adaptive.items.map((i) => [i.time, i.activity, i.status ?? "pending", i.adjusted ? 1 : 0]),
    );
    if (sig === lastPersistedRef.current) return;
    lastPersistedRef.current = sig;
    setLocalItems(adaptive.items as RoutineItem[]);
    saveItemsMutation.mutate(adaptive.items as RoutineItem[]);
    if (adaptive.simplified) {
      toast({
        title: "⚡ Amy AI simplified your day",
        description: `${adaptive.summary.adjusted} low-priority task${adaptive.summary.adjusted > 1 ? "s" : ""} cleared so you can focus on essentials.`,
      });
    }
  }, [adaptive.changed, dateMode, routineId]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
        <div className="h-12 w-3/4 bg-muted animate-pulse rounded-xl" />
        <div className="space-y-4 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!routine) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-2xl font-bold mb-2">Routine not found</h2>
        <Button asChild><Link href="/routines">Back to Routines</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-3xl mx-auto pb-10">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="rounded-full -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/routines">
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
            {dateMode !== "past" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePartialRegen}
                disabled={partialRegenLoading}
                className="rounded-full gap-2 bg-primary/5 border-primary/30 text-primary hover:bg-primary/10"
              >
                <RotateCcw className={`h-4 w-4 ${partialRegenLoading ? "animate-spin" : ""}`} />
                {partialRegenLoading ? "Updating…" : "Regen Rest"}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={toggleNotifications}
              className="rounded-full gap-2"
            >
              {notificationsEnabled ? (
                <><BellOff className="h-4 w-4" /> Notifications On</>
              ) : (
                <><Bell className="h-4 w-4" /> Notify Me</>
              )}
            </Button>

            <VoiceSettingsPanel onToggle={(enabled) => setVoiceOn(enabled)} />

            <Link href="/parenting-hub">
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <BookOpen className="h-4 w-4" />
                Hub
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareOpen(true)}
              className="rounded-full gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this routine?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this schedule. You can always generate a new one.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Delete Routine
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>

        <div>
          <div className="flex items-center gap-2 text-sm text-primary font-medium mb-2">
            <Sparkles className="h-4 w-4" />
            Amy AI Generated Schedule
          </div>
          <h1 className="font-quicksand text-3xl sm:text-4xl font-bold text-foreground">{routine.title}</h1>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-secondary/30 text-secondary-foreground border border-secondary/50 px-3 py-1 rounded-full text-sm font-medium">
              {childPhotoUrl ? (
                <img src={childPhotoUrl} alt={routine.childName} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <User className="h-3.5 w-3.5" />
              )}
              {routine.childName}
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              dateMode === "today" ? "bg-primary/10 text-primary border border-primary/30 font-bold" :
              dateMode === "future" ? "bg-blue-50 text-blue-700 border border-blue-200" :
              "bg-muted text-muted-foreground border border-border"
            }`}>
              <CalendarIcon className="h-3.5 w-3.5" />
              {new Date(routine.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              {dateMode === "today" && <span className="ml-1 text-[10px] font-black uppercase tracking-wide bg-primary text-white rounded-full px-1.5 py-0.5">Today</span>}
              {dateMode === "future" && <span className="ml-1 text-[10px] font-black uppercase tracking-wide bg-blue-600 text-white rounded-full px-1.5 py-0.5">Upcoming</span>}
              {dateMode === "past" && <span className="ml-1 text-[10px] font-black uppercase tracking-wide bg-muted-foreground text-white rounded-full px-1.5 py-0.5">Past</span>}
            </div>
            {/* Day starts at badge — shows the first activity time (= wake time) */}
            {routine.items && routine.items.length > 0 && (() => {
              const firstTime = routine.items.find(
                (it) => it.category !== "sleep" && !/sleep|bedtime/i.test(it.activity)
              )?.time;
              if (!firstTime) return null;
              return (
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-sm font-bold">
                  <Clock className="h-3.5 w-3.5" />
                  Day starts at {firstTime}
                </div>
              );
            })()}
          </div>

          {/* Date mode banners */}
          {dateMode === "future" && (
            <div className="mt-3 flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800">
              <span className="text-lg">📅</span>
              <span><strong>Future routine</strong> — all tasks are shown as scheduled. You can start interacting on the day itself.</span>
            </div>
          )}
          {dateMode === "past" && (
            <div className="mt-3 flex items-center gap-2.5 bg-muted/60 border border-border rounded-2xl px-4 py-3 text-sm text-muted-foreground">
              <span className="text-lg">🗂️</span>
              <span><strong>Past routine</strong> — this is a read-only record. Generate a new routine to plan upcoming days.</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="bg-muted rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2 text-sm font-medium">
              <span className="text-foreground">{completedCount} of {totalCount} tasks done</span>
              <span className="text-primary font-bold">{progress}%</span>
            </div>
            <div className="h-2.5 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Today's mood + sleep quick selectors — drive Amy AI adaptation */}
        {dateMode === "today" && totalCount > 0 && (
          <div className="rounded-2xl border border-border bg-card/60 p-3 space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              How is {routine?.childName ?? "your child"} today?
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Mood:</span>
                {(["low", "neutral", "active"] as AdaptiveMood[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => persistMood(m)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                      todayMood === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    }`}
                    aria-pressed={todayMood === m}
                  >
                    {m === "low" ? "😔 Low" : m === "active" ? "🤸 Active" : "🙂 Neutral"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">Sleep:</span>
                {(["poor", "ok", "good"] as AdaptiveSleepQuality[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => persistSleep(s)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors ${
                      todaySleep === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 text-foreground border-border hover:bg-muted"
                    }`}
                    aria-pressed={todaySleep === s}
                  >
                    {s === "poor" ? "😴 Poor" : s === "ok" ? "🌙 OK" : "✨ Good"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Amy AI suggests banner — driven by the Adaptive Engine */}
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 flex items-start gap-3">
          <div className="bg-emerald-500 text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-0.5">Amy AI suggests</p>
            <p className="text-sm text-emerald-900 font-medium leading-snug">{amyTip}</p>
            {dateMode === "today" && (dailySummary.delayed > 0 || dailySummary.adjusted > 0) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {dailySummary.delayed > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    ⏱ {dailySummary.delayed} delayed
                  </span>
                )}
                {dailySummary.adjusted > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                    ⚡ {dailySummary.adjusted} auto-adjusted
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>


      {/* Amy AI editing tip — guides parents to the Edit button on every task */}
      {dateMode !== "past" && items.some((i) => i.status !== "completed" && i.status !== "skipped") && (
        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-700/50 p-3 flex items-start gap-2.5">
          <div className="bg-violet-500 text-white w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <p className="text-xs text-violet-900 dark:text-violet-100 font-medium leading-snug">
            <strong className="text-violet-700 dark:text-violet-200">Tip from Amy AI:</strong>{" "}
            Tap the{" "}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-violet-300 bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-100 font-bold text-[10px] align-middle">
              <Pencil className="h-2.5 w-2.5" /> Edit
            </span>{" "}
            chip on any task to change its time, name, or duration. I'll keep the rest of the day in sync. ❤️
          </p>
        </div>
      )}

      {/* Age-band filter chips — only shown when at least one item has an ageBand */}
      {ageBands.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground">Filter by age:</span>
          <button
            type="button"
            onClick={() => setAgeBandFilter(null)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
              ageBandFilter === null
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 text-foreground border-border hover:bg-muted"
            }`}
            aria-pressed={ageBandFilter === null}
          >
            All ({items.length})
          </button>
          {ageBands.map((band) => (
            <button
              key={band}
              type="button"
              onClick={() => setAgeBandFilter(ageBandFilter === band ? null : band)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                ageBandFilter === band
                  ? "bg-sky-500 text-white border-sky-500"
                  : "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800"
              }`}
              aria-pressed={ageBandFilter === band}
            >
              Ages {band.replace("-", "–")} ({ageBandCounts[band] ?? 0})
            </button>
          ))}
        </div>
      )}

      <div className="relative mt-2">
        <div className="absolute left-[39px] sm:left-[55px] top-4 bottom-4 w-0.5 bg-border/60 z-0 rounded-full" />

        <div className="space-y-3 relative z-10">
          {displayItems.length === 0 && ageBandFilter && (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <span className="text-3xl">🔍</span>
              <p className="text-sm font-semibold text-muted-foreground">
                No activities for ages {ageBandFilter.replace("-", "–")} in this routine
              </p>
              <button
                type="button"
                onClick={() => setAgeBandFilter(null)}
                className="text-xs font-bold text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Clear filter
              </button>
            </div>
          )}
          {displayItems.map(({ item, origIdx: index }, displayIdx) => {
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

            return (
              <div className="flex gap-2 sm:gap-4 group items-start" key={index}>
                {/* Time column — fixed left */}
                <div className="flex flex-col items-end pt-3.5 w-[64px] sm:w-[96px] shrink-0">
                  <div className={`text-xs sm:text-sm font-bold text-right whitespace-nowrap ${isPastTask ? "text-muted-foreground line-through" : isCurrentTask ? "text-primary" : "text-foreground"}`}>{item.time}</div>
                  <div className="text-[11px] text-muted-foreground font-medium text-right">{item.duration}m</div>
                  {isCurrentTask && (
                    <div className="mt-1 text-[8px] font-black uppercase tracking-wide text-primary bg-primary/10 rounded-full px-1.5 py-0.5">NOW</div>
                  )}
                </div>

                {/* Activity Card — click to expand */}
                <Card
                  className={`flex-1 min-w-0 rounded-2xl shadow-sm border-2 overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer ${item.category === "school" ? "border-indigo-200 bg-indigo-50/40" : isCurrentTask ? "border-primary ring-2 ring-primary/20 shadow-md" : item.category === "bonding" && !statusStyle ? "border-rose-200" : statusStyle || "border-border"}`}
                  onClick={() => editingIndex === null && setExpandedIndex(index)}
                >
                  {item.category === "school" && (
                    <div className="bg-indigo-100/70 border-b border-indigo-200 px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-indigo-500 text-xs">🏫</span>
                      <span className="text-indigo-700 text-xs font-bold">In school — protected time</span>
                    </div>
                  )}
                  {item.category === "bonding" && (
                    <div className="bg-rose-50 border-b border-rose-100 px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-rose-500 text-xs">❤️</span>
                      <span className="text-rose-600 text-xs font-bold">Family Bonding Time</span>
                    </div>
                  )}
                  {item.category === "tiffin" && (
                    <div className="bg-amber-50 border-b border-amber-100 px-4 py-1.5 flex items-center gap-1.5">
                      <span className="text-amber-500 text-xs">🍱</span>
                      <span className="text-amber-700 text-xs font-bold">Tiffin / Lunchbox Prep</span>
                    </div>
                  )}
                  {isCurrentTask && (
                    <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      <span className="text-primary text-xs font-bold">Happening now</span>
                    </div>
                  )}
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start gap-2.5">
                        {/* Activity Illustration — static image library */}
                        <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-muted/50 shadow-sm">
                          {(() => {
                            const seed = (routineId ?? 0) * 100 + index;
                            const img = getActivityImage(item.category, item.activity, seed);
                            return (
                              <>
                                <img
                                  src={img.src}
                                  alt={item.activity}
                                  className={`w-full h-full object-cover ${status === "skipped" ? "grayscale opacity-50" : status === "completed" ? "opacity-80" : ""}`}
                                />
                                {status === "completed" && (
                                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                    <div className="bg-green-500 rounded-full w-5 h-5 flex items-center justify-center">
                                      <span className="text-white text-[10px] font-black">✓</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingIndex === index ? (
                            /* ── Inline Edit Form ── */
                            <div className="space-y-2 py-1">
                              <div>
                                <Label className="text-xs text-muted-foreground">Activity</Label>
                                <Input
                                  value={editForm.activity}
                                  onChange={(e) => setEditForm((f) => ({ ...f, activity: e.target.value }))}
                                  className="h-8 text-sm rounded-lg mt-0.5"
                                  autoFocus
                                />
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground">Time (e.g. 7:30 AM)</Label>
                                  <Input
                                    value={editForm.time}
                                    onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                                    className="h-8 text-sm rounded-lg mt-0.5"
                                    placeholder="7:30 AM"
                                  />
                                </div>
                                <div className="w-20">
                                  <Label className="text-xs text-muted-foreground">Min</Label>
                                  <Input
                                    type="number"
                                    value={editForm.duration}
                                    onChange={(e) => setEditForm((f) => ({ ...f, duration: e.target.value }))}
                                    className="h-8 text-sm rounded-lg mt-0.5"
                                    min={5}
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <Button size="sm" className="rounded-full h-7 text-xs gap-1" onClick={() => handleEditSave(index)}>
                                  <Save className="h-3 w-3" /> Save
                                </Button>
                                <Button size="sm" variant="ghost" className="rounded-full h-7 text-xs gap-1" onClick={() => setEditingIndex(null)}>
                                  <X className="h-3 w-3" /> Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                          <>
                          {/* Title row + always-visible Edit pencil (mobile-friendly) */}
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`font-bold text-sm sm:text-base text-foreground leading-snug flex-1 min-w-0 ${status === "skipped" ? "line-through text-muted-foreground" : status === "completed" ? "line-through opacity-60" : ""}`} style={{ wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "normal" }}>
                              {item.activity}
                            </h3>
                            {isInteractive && status !== "completed" && status !== "skipped" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditStart(index); }}
                                className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold border-2 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                title="Edit this task"
                              >
                                <Pencil className="h-3 w-3" />
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                            )}
                          </div>

                          {/* Status & category chips — wrap onto new line on small screens */}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {status === "completed" && <Badge className="bg-green-100 text-green-700 border-green-200 rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5">✓ Done</Badge>}
                            {status === "skipped" && item.skipReason && <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5">⏭️ Auto-skipped</Badge>}
                            {status === "skipped" && !item.skipReason && <Badge className="bg-muted text-muted-foreground border-border rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5">Skipped</Badge>}
                            {status === "delayed" && <Badge className="bg-amber-100 text-amber-700 border-amber-200 rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5">⏱ Delayed</Badge>}
                            {item.adjusted && status !== "completed" && (
                              <Badge className="bg-violet-100 text-violet-700 border-violet-200 rounded-full text-[10px] sm:text-xs font-bold px-2 py-0.5" title="Auto-adjusted by Amy AI">
                                ⚡ Adjusted
                              </Badge>
                            )}
                            <Badge className={`rounded-full text-[10px] sm:text-xs font-bold border px-2 py-0.5 ${catStyle}`}>
                              {item.category}
                            </Badge>
                            {priority === "high" && status === "pending" && !isCurrentTask && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-1.5 py-0.5">
                                ★ Essential
                              </span>
                            )}
                            {item.ageBand && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-1.5 py-0.5">
                                <Users className="h-2.5 w-2.5" />
                                Ages {item.ageBand.replace("-", "–")}
                              </span>
                            )}
                          </div>
                          {/* Auto-skip reason */}
                          {item.skipReason && (
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-1 font-medium">
                              {item.skipReason}
                            </p>
                          )}
                          {item.notes && item.notes.startsWith("Options:") ? (
                            <div className="mt-1.5 space-y-1.5">
                              <p className="text-xs text-muted-foreground font-medium">🍽️ Today's options:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {item.notes.replace("Options:", "").split("|").map((opt, oi) => {
                                  const meal = opt.trim();
                                  return (
                                    <button
                                      key={oi}
                                      onClick={() => fetchRecipe(meal)}
                                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors"
                                    >
                                      <ChefHat className="h-3 w-3" />
                                      {meal}
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-muted-foreground">Tap a meal to view its recipe</p>
                            </div>
                          ) : item.notes ? (
                            <p className="text-muted-foreground text-xs mt-1 leading-relaxed line-clamp-3 break-words" style={{ overflowWrap: "break-word" }}>{item.notes}</p>
                          ) : null}
                          {editingIndex !== index && (
                            <MealRecipeCard
                              meal={item.meal}
                              recipe={item.recipe}
                              nutrition={item.nutrition}
                              defaultOpen={
                                (item.category === "meal" || item.category === "tiffin") &&
                                items.slice(0, index).filter(
                                  it => it.category === "meal" || it.category === "tiffin"
                                ).length === 0
                              }
                            />
                          )}
                          </>
                          )}
                        </div>
                      </div>

                      {/* Slide-to-complete — only for pending interactive tasks */}
                      {isInteractive && editingIndex !== index && status !== "completed" && status !== "skipped" && status !== "delayed" && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <SlideToComplete
                            onComplete={() => updateItemStatus(index, "completed")}
                          />
                        </div>
                      )}
                      {/* Quick action row for delayed/non-pending */}
                      {isInteractive && editingIndex !== index && status === "delayed" && (
                        <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => updateItemStatus(index, "completed")}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors border border-green-200"
                          >
                            <Check className="h-3 w-3" /> Complete
                          </button>
                          <button
                            onClick={() => updateItemStatus(index, "skipped")}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors border border-border"
                          >
                            <SkipForward className="h-3 w-3" /> Skip
                          </button>
                        </div>
                      )}

                      {/* Undo for completed/skipped — only on non-past routines */}
                      {isInteractive && editingIndex !== index && (status === "completed" || status === "skipped") && (
                        <button
                          onClick={() => updateItemStatus(index, "pending")}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
                        >
                          ↩ Undo
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tap hint ───────────────────────────────────────────────── */}
      {dateMode !== "past" && items.some(i => !i.status || i.status === "pending") && (
        <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground">
          <span className="text-xs">👆 Tap any card to view details &amp; more actions</span>
        </div>
      )}

      {/* ── Item expand modal ───────────────────────────────────────── */}
      <RoutineItemModal
        item={expandedIndex !== null ? items[expandedIndex] : null}
        index={expandedIndex ?? 0}
        isOpen={expandedIndex !== null}
        onClose={() => setExpandedIndex(null)}
        isInteractive={expandedIndex !== null ? dateMode !== "past" : false}
        onComplete={() => { if (expandedIndex !== null) updateItemStatus(expandedIndex, (items[expandedIndex]?.status === "completed") ? "pending" : "completed"); }}
        onDelay={() => { if (expandedIndex !== null) updateItemStatus(expandedIndex, "delayed"); }}
        onSkip={() => { if (expandedIndex !== null) updateItemStatus(expandedIndex, "skipped"); }}
        routineId={routineId}
        seed={expandedIndex !== null ? (routineId ?? 0) * 100 + expandedIndex : 0}
      />

      {/* ── Global floating undo chip ───────────────────────────────── */}
      {undoSnapshot && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-sm font-medium">{undoLabel}</span>
          <button
            onClick={handleUndo}
            className="text-sm font-black text-amber-400 hover:text-amber-300 transition-colors"
          >
            UNDO
          </button>
          <button onClick={clearUndo} className="text-gray-400 hover:text-white text-xs ml-1">✕</button>
        </div>
      )}

      {/* ── Daily Summary (today + past) ────────────────────────────── */}
      {dateMode !== "future" && totalCount > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-violet-500/5 to-pink-500/5 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Daily Summary
            </h3>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {dailySummary.completionPct}% done
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-center">
              <div className="text-lg font-black text-green-700">{dailySummary.completed}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-green-700">✔️ Done</div>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-center">
              <div className="text-lg font-black text-amber-700">{dailySummary.delayed}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700">⏱ Delayed</div>
            </div>
            <div className="rounded-xl bg-violet-50 border border-violet-200 px-3 py-2 text-center">
              <div className="text-lg font-black text-violet-700">{dailySummary.adjusted}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-violet-700">⚡ Adjusted</div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-center">
              <div className="text-lg font-black text-slate-700">{dailySummary.skipped}</div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-700">⏭ Skipped</div>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border px-3 py-2">
            <span className="text-base shrink-0 mt-0.5">💡</span>
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">For tomorrow</p>
              <p className="text-sm text-foreground font-medium leading-snug">{dailySummary.tomorrowTip}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-3 pb-8 border-t border-border/50 pt-8">
        {dateMode !== "past" && (
          <Button
            variant="outline"
            className="rounded-full shadow-sm gap-2 border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => setAddActivityOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add Activity
          </Button>
        )}
        <Button asChild variant="outline" className="rounded-full shadow-sm">
          <Link href="/behavior">Log Today's Behavior</Link>
        </Button>
        {dateMode === "past" && (
          <Button asChild variant="outline" className="rounded-full shadow-sm gap-2 border-primary/30 text-primary hover:bg-primary/5">
            <Link href="/routines/generate">
              <Sparkles className="h-4 w-4" />
              Generate New Routine
            </Link>
          </Button>
        )}
      </div>

      {/* Recipe Dialog */}
      <Dialog open={recipeOpen} onOpenChange={setRecipeOpen}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-quicksand flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-orange-500" />
              {recipeLoading ? "Loading Recipe..." : (recipeData?.name ?? selectedMeal)}
            </DialogTitle>
          </DialogHeader>

          {recipeLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="bg-orange-50 text-orange-500 w-16 h-16 rounded-full flex items-center justify-center">
                <ChefHat className="h-8 w-8 animate-bounce" />
              </div>
              <p className="text-muted-foreground text-sm">Generating recipe...</p>
            </div>
          )}

          {recipeData && !recipeLoading && (
            <div className="space-y-5">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center bg-orange-50 rounded-xl p-2.5 text-center">
                  <Timer className="h-4 w-4 text-orange-500 mb-1" />
                  <p className="text-xs font-bold text-foreground">{recipeData.prepTime}</p>
                  <p className="text-xs text-muted-foreground">Prep</p>
                </div>
                <div className="flex flex-col items-center bg-red-50 rounded-xl p-2.5 text-center">
                  <Timer className="h-4 w-4 text-red-500 mb-1" />
                  <p className="text-xs font-bold text-foreground">{recipeData.cookTime}</p>
                  <p className="text-xs text-muted-foreground">Cook</p>
                </div>
                <div className="flex flex-col items-center bg-green-50 rounded-xl p-2.5 text-center">
                  <Users className="h-4 w-4 text-green-600 mb-1" />
                  <p className="text-xs font-bold text-foreground">{recipeData.servings}</p>
                  <p className="text-xs text-muted-foreground">Serves</p>
                </div>
              </div>

              <Separator />

              {/* Ingredients */}
              <div>
                <h4 className="font-bold text-sm mb-2 text-foreground">Ingredients</h4>
                <ul className="space-y-1.5">
                  {recipeData.ingredients?.map((ing: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span className="text-orange-400 font-bold mt-0.5">•</span>
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              <Separator />

              {/* Steps */}
              <div>
                <h4 className="font-bold text-sm mb-3 text-foreground">Instructions</h4>
                <ol className="space-y-3">
                  {recipeData.steps?.map((s: { step: number; instruction: string }) => (
                    <li key={s.step} className="flex gap-3">
                      <span className="bg-orange-100 text-orange-700 font-bold text-xs rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                      <p className="text-sm text-foreground/80 leading-relaxed">{s.instruction}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {recipeData.tips && (
                <>
                  <Separator />
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-bold text-amber-800 mb-1">💡 Parent Tip</p>
                    <p className="text-xs text-amber-700 leading-relaxed">{recipeData.tips}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Activity Dialog */}
      <Dialog open={addActivityOpen} onOpenChange={setAddActivityOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-quicksand flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Activity
            </DialogTitle>
            <DialogDescription className="text-sm">
              AI will fit this activity into the remaining schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">What activity?</Label>
              <Input
                className="mt-1.5 rounded-xl"
                placeholder="e.g. Piano practice, Park visit…"
                value={addActivityForm.name}
                onChange={(e) => setAddActivityForm((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Duration (minutes)</Label>
              <Input
                type="number"
                className="mt-1.5 rounded-xl"
                value={addActivityForm.duration}
                onChange={(e) => setAddActivityForm((f) => ({ ...f, duration: e.target.value }))}
                min={5}
                max={120}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              className="flex-1 rounded-full"
              onClick={handleAddActivity}
              disabled={addActivityLoading || !addActivityForm.name.trim()}
            >
              {addActivityLoading ? (
                <><RotateCcw className="h-4 w-4 mr-2 animate-spin" />Adding…</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Add to Schedule</>
              )}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setAddActivityOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Next Day Generation Dialog */}
      <Dialog open={nextDayDialogOpen} onOpenChange={setNextDayDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-quicksand flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-500" />
              Great job today! 🌙
            </DialogTitle>
            <DialogDescription className="text-sm">
              Bedtime is done! Should AI generate tomorrow's routine automatically?
            </DialogDescription>
          </DialogHeader>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-800">
            <p className="font-medium mb-0.5">Tomorrow's schedule will include:</p>
            <p className="text-xs text-indigo-600">• Weekend or school-day activities detected automatically<br />• Balanced meals, play, learning & rest<br />• Ready the moment you wake up</p>
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 rounded-full bg-indigo-600 hover:bg-indigo-700"
              onClick={handleNextDayGen}
              disabled={nextDayLoading}
            >
              {nextDayLoading ? (
                <><RotateCcw className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate Tomorrow</>
              )}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setNextDayDialogOpen(false)}>
              Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-quicksand flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              Share Routine
            </DialogTitle>
          </DialogHeader>

          {babysitterInfo && (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary">{babysitterInfo.name[0]?.toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-sm">{babysitterInfo.name}</p>
                {babysitterInfo.mobileNumber && (
                  <p className="text-xs text-muted-foreground">{babysitterInfo.mobileNumber}</p>
                )}
              </div>
            </div>
          )}

          <div className="bg-muted/50 rounded-xl p-3 text-sm font-mono whitespace-pre-wrap text-foreground/80 max-h-64 overflow-y-auto">
            {buildShareMessage()}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={copyShareMessage} className="rounded-xl w-full">
              <Copy className="h-4 w-4 mr-2" />
              Copy Routine Text
            </Button>
            {babysitterInfo?.mobileNumber && (
              <a
                href={`https://wa.me/${babysitterInfo.mobileNumber.replace(/\D/g, "")}?text=${encodeURIComponent(buildShareMessage())}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="rounded-xl w-full">
                  💬 Open in WhatsApp
                </Button>
              </a>
            )}
            <p className="text-xs text-center text-muted-foreground">
              Copy the text above and paste it into WhatsApp, SMS, or any messaging app.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
