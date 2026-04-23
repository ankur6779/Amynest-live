import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link, useSearch } from "wouter";
import { useListChildren, getListChildrenQueryKey, useGenerateRoutine, useCreateRoutine, getListRoutinesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Calendar, User, Clock, GraduationCap, Car, Refrigerator, School, Briefcase, Heart, Star, Users, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle, ExternalLink, RefreshCw, Home, Building2, UserCheck, Zap, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { format } from "date-fns";
import { getAgeGroup, getAgeGroupInfo, formatAge } from "@/lib/age-groups";
import {
  HANDLER_TYPES,
  type HandlerKey,
  getHandlerInfo,
  simplifyForHandler,
  buildSyncSuggestions,
  computeFamilyPoints,
  pickSharedActivities,
  appendHandlerToPlans,
  type FRFamilyResult,
} from "@workspace/family-routine";

type MoodOption = { value: "happy" | "angry" | "lazy" | "normal"; label: string; emoji: string; hint: string; color: string };
const MOOD_OPTIONS: MoodOption[] = [
  { value: "happy",  label: "Happy",  emoji: "😊", hint: "Productive & energetic", color: "border-green-300 bg-green-50 text-green-800" },
  { value: "normal", label: "Normal", emoji: "😐", hint: "Balanced routine",       color: "border-blue-200  bg-blue-50  text-blue-800"  },
  { value: "lazy",   label: "Lazy",   emoji: "😴", hint: "Easier tasks + breaks",  color: "border-amber-300 bg-amber-50 text-amber-800" },
  { value: "angry",  label: "Upset",  emoji: "😡", hint: "Calming activities",     color: "border-rose-300  bg-rose-50  text-rose-800"  },
];

const TRAVEL_MODE_LABELS: Record<string, string> = {
  van: "🚐 Van / Bus",
  car: "🚗 Car",
  walk: "🚶 Walking",
  other: "✏️ Custom",
};

type RoutineItem = {
  time: string;
  activity: string;
  duration: number;
  category: string;
  notes?: string;
  status?: string;
};

type GeneratedRoutine = {
  title: string;
  items: RoutineItem[];
};

type ChildType = {
  id: number;
  name: string;
  age: number;
  childClass?: string | null;
  foodType?: string;
  schoolStartTime: string;
  schoolEndTime: string;
  wakeUpTime: string;
  sleepTime: string;
  travelMode: string;
  travelModeOther?: string | null;
  goals: string;
};

type FamilyResult = {
  child: ChildType;
  routine: GeneratedRoutine;
};

// ---- Parent Availability Types ----
type WorkType = "work_from_home" | "work_from_office" | "homemaker";

type ParentAvailEntry = {
  role: string;
  workType: WorkType | null;
  isWorking: boolean | null;
  workHours: string;
};

type ParentAvailData = {
  p1: ParentAvailEntry;
  p2: ParentAvailEntry | null;
  hasSecondParent: boolean;
};

const DEFAULT_P1: ParentAvailEntry = { role: "Mother", workType: null, isWorking: null, workHours: "" };
const DEFAULT_P2: ParentAvailEntry = { role: "Father", workType: null, isWorking: null, workHours: "" };

const AVAIL_KEY = (date: string) => `amynest_parent_avail_${date}`;

function loadAvailability(date: string): ParentAvailData {
  try {
    const raw = localStorage.getItem(AVAIL_KEY(date));
    if (raw) return JSON.parse(raw) as ParentAvailData;
  } catch {}
  return { p1: { ...DEFAULT_P1 }, p2: null, hasSecondParent: false };
}

function saveAvailability(date: string, data: ParentAvailData): void {
  try { localStorage.setItem(AVAIL_KEY(date), JSON.stringify(data)); } catch {}
}

// ─── Wake-time helpers (localStorage, no backend) ─────────────────────────────
const WAKE_KEY = (childId: number, date: string) => `amynest_wake_${childId}_${date}`;
function getStoredWakeTime(childId: number, date: string): string | null {
  try { return localStorage.getItem(WAKE_KEY(childId, date)); } catch { return null; }
}
function storeWakeTime(childId: number, date: string, t: string): void {
  try { localStorage.setItem(WAKE_KEY(childId, date), t); } catch {}
}

// Parse "7:00 AM" → total minutes
function parseDisplayTime(t: string): number {
  const m = t.replace(/\s+/g, " ").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return -1;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

// Total minutes → "H:MM AM/PM"
function minsToDisplay(total: number): string {
  const w = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(w / 60);
  const m = w % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const dh = h % 12 === 0 ? 12 : h % 12;
  return `${dh}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// input[type=time] "HH:MM" → "H:MM AM/PM"
function inputToDisplay(hm: string): string {
  const parts = hm.split(":");
  if (parts.length < 2) return "";
  let h = parseInt(parts[0]);
  const m = parseInt(parts[1]);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// "H:MM AM/PM" → input[type=time] "HH:MM"
function displayToInput(t: string): string {
  const m = t.replace(/\s+/g, " ").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return "07:00";
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

// Shift all non-sleep items by the delta between default and actual wake time
function shiftRoutineItems(items: RoutineItem[], defaultWake: string, actualWake: string): RoutineItem[] {
  const defMins = parseDisplayTime(defaultWake);
  const actMins = parseDisplayTime(actualWake);
  if (defMins < 0 || actMins < 0 || defMins === actMins) return items;
  const diff = actMins - defMins;
  return items.map((item) => {
    if (item.category === "sleep" || /sleep|bedtime|good night/i.test(item.activity)) return item;
    const newMins = parseDisplayTime(item.time) + diff;
    if (newMins < 0) return item;
    return { ...item, time: minsToDisplay(newMins) };
  });
}

// Detect essential tasks (brushing, meals, hygiene, sleep)
function isEssentialTask(activity: string, category: string): boolean {
  return /brush|breakfast|lunch|dinner|snack|meal|eat|morning|wake|bath|hygiene|toilet|tiffin/i.test(activity) ||
    ["meal", "hygiene", "tiffin", "morning"].includes((category ?? "").toLowerCase());
}

function parentStatusLabel(entry: ParentAvailEntry): string {
  if (!entry.workType) return "Not set";
  if (entry.workType === "homemaker") return "Free all day 🏠";
  if (entry.isWorking === true) return entry.workHours ? `Busy (${entry.workHours}) 💼` : "Busy today 💼";
  if (entry.isWorking === false) return "Holiday — free all day 🎉";
  return "Work schedule not answered";
}

function isParentAvailComplete(entry: ParentAvailEntry): boolean {
  if (!entry.workType) return false;
  if (entry.workType === "homemaker") return true;
  return entry.isWorking !== null;
}

// ---- ParentAvailSection Component ----
const WORK_TYPE_OPTIONS: { value: WorkType; label: string; icon: React.ReactNode; hint: string }[] = [
  { value: "work_from_home",   label: "Work from Home",   icon: <Home className="h-4 w-4" />,      hint: "Remote worker" },
  { value: "work_from_office", label: "Work from Office", icon: <Building2 className="h-4 w-4" />, hint: "Office commute" },
  { value: "homemaker",        label: "Homemaker",        icon: <Heart className="h-4 w-4" />,     hint: "At home all day" },
];

function ParentEntryForm({
  entry,
  onChange,
  label,
}: {
  entry: ParentAvailEntry;
  onChange: (e: ParentAvailEntry) => void;
  label: string;
}) {
  const needsWorkingDayQ = entry.workType === "work_from_home" || entry.workType === "work_from_office";

  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
      {/* Work type */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Work Type</p>
        <div className="grid grid-cols-3 gap-2">
          {WORK_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...entry, workType: opt.value, isWorking: opt.value === "homemaker" ? null : entry.isWorking, workHours: "" })}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-xs font-bold transition-all ${
                entry.workType === opt.value
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-card border-border hover:border-primary/30 text-foreground"
              }`}
            >
              {opt.icon}
              <span className="text-center leading-tight">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conditional: is today a working day? */}
      {needsWorkingDayQ && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Is today a working day?</p>
          <div className="flex gap-2">
            {([
              { label: "💼 Yes, working", val: true },
              { label: "🎉 Holiday / Off", val: false },
            ] as const).map(({ label: l, val }) => (
              <button
                key={String(val)}
                onClick={() => onChange({ ...entry, isWorking: val })}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold border-2 transition-all text-xs ${
                  entry.isWorking === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-primary/40"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {entry.isWorking === true && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
              Amy AI will assign independent or babysitter tasks during work hours.
            </div>
          )}
          {entry.isWorking === false && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
              Great — the AI will add plenty of parent-child activities today!
            </div>
          )}
        </div>
      )}

      {/* Conditional: working hours input */}
      {needsWorkingDayQ && entry.isWorking === true && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Working Hours <span className="font-normal">(optional)</span></p>
          <div className="flex items-center bg-card border-2 border-border rounded-xl px-3 py-2 focus-within:border-primary transition-all gap-2">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={entry.workHours}
              onChange={(e) => onChange({ ...entry, workHours: e.target.value })}
              placeholder="e.g. 9:00 AM – 6:00 PM"
              className="bg-transparent border-none outline-none text-sm text-foreground w-full"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Amy AI will use these exact hours to plan tasks correctly.</p>
        </div>
      )}

      {/* Homemaker info */}
      {entry.workType === "homemaker" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
          🏠 As a homemaker, you're free all day — Amy AI will include more parent-child bonding activities!
        </div>
      )}
    </div>
  );
}

function ParentAvailSection({
  stepNum,
  avail,
  onChange,
  date,
}: {
  stepNum: number;
  avail: ParentAvailData;
  onChange: (a: ParentAvailData) => void;
  date: string;
}) {
  const p1Complete = isParentAvailComplete(avail.p1);

  // Status badge for summary
  const p1Status = avail.p1.workType
    ? (avail.p1.workType === "homemaker" ? "free" : avail.p1.isWorking === true ? "busy" : avail.p1.isWorking === false ? "free" : "pending")
    : "pending";

  const statusColor = {
    busy: "bg-amber-100 text-amber-800 border-amber-300",
    free: "bg-green-100 text-green-800 border-green-300",
    pending: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">{stepNum}</div>
          <Label className="text-base sm:text-lg font-bold flex items-center gap-2 flex-wrap">
            <UserCheck className="h-5 w-5 text-primary" />
            Your Schedule for{" "}
            <span className="text-primary font-bold">
              {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </Label>
        </div>
        {/* Status summary */}
        {p1Complete && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusColor[p1Status as "busy" | "free" | "pending"]}`}>
              {p1Status === "busy" ? "Busy" : "Free"}
            </span>
          </div>
        )}
      </div>

      {/* Single caregiver schedule (role / second-parent removed — handler card above
          already says who is taking care, so we only need work-availability here). */}
      <ParentEntryForm
        entry={avail.p1}
        label="Today"
        onChange={(e) => onChange({ ...avail, p1: e })}
      />
    </div>
  );
}

function ToggleGroup({
  value,
  onChange,
  options,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  options: [string, boolean, string][];
}) {
  return (
    <div className="flex gap-3">
      {options.map(([label, val, emoji]) => (
        <button
          key={String(val)}
          onClick={() => onChange(val)}
          className={`flex-1 py-3 px-4 rounded-2xl font-bold border-2 transition-all text-sm flex items-center justify-center gap-2 ${
            value === val
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted"
          }`}
        >
          {emoji} {label}
        </button>
      ))}
    </div>
  );
}

function parseTimeToMinutes(t: string): number {
  const [timePart, period] = t.split(" ");
  const [hours, minutes] = timePart.split(":").map(Number);
  let h = hours;
  if (period === "PM" && hours !== 12) h += 12;
  if (period === "AM" && hours === 12) h = 0;
  return h * 60 + (minutes || 0);
}

function TiffinSummaryCard({ familyResults }: { familyResults: FamilyResult[] }) {
  const tiffinData = familyResults
    .map(({ child, routine }) => {
      const item = routine.items.find((i) => i.category === "tiffin");
      if (!item) return null;
      const options = item.notes?.startsWith("Options:")
        ? item.notes.replace("Options:", "").split("|").map((o) => o.trim()).filter(Boolean)
        : [];
      return { child, time: item.time, options };
    })
    .filter(Boolean) as { child: ChildType; time: string; options: string[] }[];

  if (tiffinData.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🍱</span>
        <div>
          <h3 className="font-quicksand font-bold text-amber-900 text-lg">Tiffin Box Suggestions</h3>
          <p className="text-amber-700 text-xs">For school-going kids — choose one per child</p>
        </div>
      </div>
      <div className="space-y-4">
        {tiffinData.map(({ child, time, options }) => (
          <div key={child.id} className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-amber-100 dark:border-amber-400/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-amber-100 text-amber-700 rounded-full px-3 py-0.5 text-xs font-bold flex items-center gap-1">
                <User className="h-3 w-3" />
                {child.name}
              </div>
              <span className="text-xs text-amber-600">Pack by {time}</span>
              <span className="text-xs text-amber-500 ml-1">
                {child.foodType === "non_veg" ? "🍗 Non-veg" : "🥦 Veg"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium"
                >
                  <span className="text-amber-500">🥘</span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CombinedTimeline({ familyResults }: { familyResults: FamilyResult[] }) {
  const childColors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-rose-500", "bg-orange-500"];

  const allItems = familyResults
    .flatMap(({ child, routine }, ci) =>
      routine.items.map((item) => ({ ...item, childName: child.name, childId: child.id, colorClass: childColors[ci % childColors.length] }))
    )
    .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

  return (
    <div className="space-y-2">
      {allItems.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 hover:border-primary/20 transition-all">
          <div className="text-xs font-bold text-muted-foreground w-16 shrink-0 text-right">{item.time}</div>
          <div className={`w-2 h-2 rounded-full shrink-0 ${item.colorClass}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground truncate">{item.activity}</span>
              <Badge variant="outline" className={`text-xs px-1.5 py-0 ${item.colorClass.replace("bg-", "text-").replace("-500", "-700")} border-current/30`}>
                {item.childName}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">{item.duration}m · {item.category}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function IndividualRoutineSection({ result }: { result: FamilyResult }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary rounded-full p-1.5">
            <User className="h-4 w-4" />
          </div>
          <div className="text-left">
            <div className="font-bold text-foreground">{result.child.name}</div>
            <div className="text-xs text-muted-foreground">{result.routine.title} · {result.routine.items.length} activities</div>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {result.routine.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-muted/30">
              <div className="text-xs font-bold text-muted-foreground w-14 shrink-0 text-right pt-0.5">{item.time}</div>
              <div className="flex-1">
                <div className="text-sm font-medium">{item.activity}</div>
                <div className="text-xs text-muted-foreground">{item.duration}m</div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">{item.category}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoutineGenerate() {
  const { t } = useTranslation();
  const [_, setLocation] = useLocation();
  const [mode, setMode] = useState<"single" | "family">("single");

  // Single mode
  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  // Read ?date= from URL so links from the calendar (Tomorrow / specific day)
  // open the generator pre-filled to the requested date instead of always today.
  const search = useSearch();
  const initialDate = (() => {
    try {
      const sp = new URLSearchParams(search);
      const q = sp.get("date");
      if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    } catch {}
    return format(new Date(), "yyyy-MM-dd");
  })();
  const [date, setDate] = useState(initialDate);
  const [hasSchool, setHasSchool] = useState<boolean | null>(null);
  const [specialPlans, setSpecialPlans] = useState("");
  const [fridgeItems, setFridgeItems] = useState("");
  const [mood, setMood] = useState<"happy" | "angry" | "lazy" | "normal">("normal");

  // Per-date parent availability
  const [parentAvail, setParentAvail] = useState<ParentAvailData>(() => loadAvailability(format(new Date(), "yyyy-MM-dd")));

  // Handler type — who is taking care of the kids today
  const [handlerType, setHandlerType] = useState<HandlerKey>("mom");

  // Family mode
  const [familyChildSettings, setFamilyChildSettings] = useState<Record<number, { hasSchool: boolean | null; selected: boolean }>>({});
  const [familyDate, setFamilyDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [familyParentAvail, setFamilyParentAvail] = useState<ParentAvailData>(() => loadAvailability(format(new Date(), "yyyy-MM-dd")));
  const [familySpecialPlans, setFamilySpecialPlans] = useState("");
  const [familyFridgeItems, setFamilyFridgeItems] = useState("");
  const [familyProgress, setFamilyProgress] = useState<{ current: number; total: number; currentName: string } | null>(null);
  const [familyResults, setFamilyResults] = useState<FamilyResult[] | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Existing routine check
  const [existingRoutine, setExistingRoutine] = useState<{ exists: boolean; routineId?: number } | null>(null);
  const [overrideMode, setOverrideMode] = useState(false);
  const checkDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wake-up confirmation system
  const [showWakeConfirm, setShowWakeConfirm] = useState(false);
  const [wakeAnswer, setWakeAnswer] = useState<"yes" | "no" | null>(null);
  const [wakeInputValue, setWakeInputValue] = useState("07:00");
  const [confirmedWakeTime, setConfirmedWakeTime] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: "standard" | "ai"; forceOverride: boolean } | null>(null);

  // Past essential task check (after routine generated for today)
  type PendingRoutineSave = { generatedData: GeneratedRoutine; shouldOverride: boolean | undefined };
  const [showTaskCheck, setShowTaskCheck] = useState(false);
  const [pendingRoutineSave, setPendingRoutineSave] = useState<PendingRoutineSave | null>(null);
  const [pastEssentialTasks, setPastEssentialTasks] = useState<{ idx: number; item: RoutineItem }[]>([]);
  const [taskCheckMap, setTaskCheckMap] = useState<Record<number, boolean>>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authFetch = useAuthFetch();

  const { data: children, isLoading: loadingChildren } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() }
  });

  // Parent profile region — sent in generation payload so the server doesn't
  // have to guess. Falls back to undefined when the profile hasn't loaded yet.
  const [parentRegion, setParentRegion] = React.useState<string | undefined>(undefined);
  React.useEffect(() => {
    let cancelled = false;
    authFetch("/api/parent-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => { if (!cancelled && p?.region) setParentRegion(p.region); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [authFetch]);

  const generateMutation = useGenerateRoutine();
  const createMutation = useCreateRoutine();
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Load/save single-mode parent availability per date
  useEffect(() => { setParentAvail(loadAvailability(date)); }, [date]);
  useEffect(() => { saveAvailability(date, parentAvail); }, [date, parentAvail]);

  // Load/save family-mode parent availability per date
  useEffect(() => { setFamilyParentAvail(loadAvailability(familyDate)); }, [familyDate]);
  useEffect(() => { saveAvailability(familyDate, familyParentAvail); }, [familyDate, familyParentAvail]);

  // Auto-detect weekends for single mode
  useEffect(() => {
    // Auto-pre-fill hasSchool based on child's schoolDays + selected date weekday.
    // Replaces the prior weekend-only heuristic so it respects custom school weeks
    // (e.g. some kids go Sat too, some only Mon/Wed/Fri).
    if (!selectedChild || !children) return;
    const data = children.find((c) => c.id === selectedChild);
    if (!data) return;
    if (!(data as any).isSchoolGoing) {
      setHasSchool(false);
      return;
    }
    const isoWeekday = (() => {
      // ISO 1=Mon..7=Sun (matches stored schoolDays)
      const day = new Date(date + "T00:00:00").getDay(); // 0=Sun..6=Sat
      return day === 0 ? 7 : day;
    })();
    const days = (data as any).schoolDays as number[] | null | undefined;
    const effectiveDays = Array.isArray(days) ? days : [1, 2, 3, 4, 5]; // legacy fallback
    setHasSchool(effectiveDays.includes(isoWeekday));
  }, [date, selectedChild, children]);

  // Auto-set hasSchool=false for infants, toddlers, and non-school preschoolers
  useEffect(() => {
    if (!selectedChild || !children) return;
    const data = children.find((c) => c.id === selectedChild);
    if (!data) return;
    const group = getAgeGroup(data.age, (data as any).ageMonths ?? 0);
    if (group === "infant" || group === "toddler") {
      setHasSchool(false);
    } else if (group === "preschool" && !(data as any).isSchoolGoing) {
      setHasSchool(false);
    }
  }, [selectedChild, children]);

  // Check for existing routine when child + date both selected
  useEffect(() => {
    if (!selectedChild || !date) {
      setExistingRoutine(null);
      setOverrideMode(false);
      return;
    }
    if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
    checkDebounceRef.current = setTimeout(() => {
      authFetch(getApiUrl(`/api/routines/check?childId=${selectedChild}&date=${date}`))
        .then((r) => r.ok ? r.json() : null)
        .then((data: any) => {
          setExistingRoutine(data ?? null);
          if (data?.exists) setOverrideMode(false);
        })
        .catch(() => setExistingRoutine(null));
    }, 400);
    return () => { if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current); };
  }, [selectedChild, date]);

  // Auto-pre-fill family-mode hasSchool per child based on their schoolDays
  // and the selected familyDate. Each child can have its own schoolDays array,
  // so we evaluate per-child instead of a blanket weekend rule.
  useEffect(() => {
    if (!children || children.length === 0) return;
    const day = new Date(familyDate + "T00:00:00").getDay(); // 0=Sun..6=Sat
    const isoWeekday = day === 0 ? 7 : day; // ISO 1=Mon..7=Sun
    setFamilyChildSettings((prev) => {
      const next = { ...prev };
      children.forEach((c) => {
        if (!next[c.id]) return;
        if (!(c as any).isSchoolGoing) {
          next[c.id] = { ...next[c.id], hasSchool: false };
          return;
        }
        const days = (c as any).schoolDays as number[] | null | undefined;
        const effectiveDays = Array.isArray(days) ? days : [1, 2, 3, 4, 5];
        next[c.id] = { ...next[c.id], hasSchool: effectiveDays.includes(isoWeekday) };
      });
      return next;
    });
  }, [familyDate, children]);

  // Initialize family child settings when children load
  useEffect(() => {
    if (children && children.length > 0) {
      setFamilyChildSettings((prev) => {
        const next = { ...prev };
        children.forEach((c) => {
          const group = getAgeGroup(c.age, (c as any).ageMonths ?? 0);
          const notSchoolApplicable =
            group === "infant" ||
            group === "toddler" ||
            (group === "preschool" && !(c as any).isSchoolGoing);
          if (!(c.id in next)) {
            next[c.id] = { hasSchool: notSchoolApplicable ? false : null, selected: true };
          } else if (notSchoolApplicable && next[c.id].hasSchool === null) {
            next[c.id] = { ...next[c.id], hasSchool: false };
          }
        });
        return next;
      });
    }
  }, [children]);

  // Build parent avail payload for mutation
  function buildParentAvailPayload(avail: ParentAvailData) {
    const p1 = avail.p1;
    const p2 = avail.hasSecondParent ? avail.p2 : null;
    return {
      parent1Role: p1.role || undefined,
      parent1WorkType: p1.workType || undefined,
      parent1IsWorking: p1.workType !== "homemaker" && p1.isWorking !== null ? p1.isWorking : undefined,
      parent1WorkHours: p1.workType !== "homemaker" && p1.isWorking ? (p1.workHours || undefined) : undefined,
      parent2Role: p2?.role || undefined,
      parent2WorkType: p2?.workType || undefined,
      parent2IsWorking: p2 && p2.workType !== "homemaker" && p2.isWorking !== null ? p2.isWorking : undefined,
      parent2WorkHours: p2 && p2.workType !== "homemaker" && p2.isWorking ? (p2.workHours || undefined) : undefined,
    };
  }

  const isGenerating = generateMutation.isPending || createMutation.isPending;

  const selectedChildData = children?.find((c) => c.id === selectedChild) as ChildType | undefined;

  // ── Core save helper ───────────────────────────────────────────────────────
  const saveGeneratedRoutine = React.useCallback((data: GeneratedRoutine, shouldOverride: boolean | undefined) => {
    createMutation.mutate(
      { data: { childId: selectedChild!, date, title: data.title, items: data.items as never, override: shouldOverride } },
      {
        onSuccess: (savedRoutine) => {
          toast({ title: shouldOverride ? "🔄 Routine replaced!" : "✨ Routine generated!" });
          queryClient.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
          setLocation(`/routines/${savedRoutine.id}`);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "";
          const isLimit = msg.toLowerCase().includes("limit") || msg.includes("402");
          if (isLimit) {
            // Hit the routinesMax cap → surface the universal premium paywall
            // instead of a passive toast.
            window.dispatchEvent(
              new CustomEvent("amynest:open-paywall", { detail: { reason: "routines_limit" } }),
            );
            return;
          }
          toast({
            title: "Could not save routine",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        },
      }
    );
  }, [createMutation, selectedChild, date, toast, queryClient, setLocation]);

  // ── Post-generate: adjust for today (past tasks + wake shift) ─────────────
  const handlePostGenerate = React.useCallback((
    generatedData: { title: string; items: RoutineItem[] },
    shouldOverride: boolean | undefined,
    wakeTime: string | null
  ) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const isToday = date === today;
    const childDefaultWake = selectedChildData?.wakeUpTime ?? "7:00 AM";

    let adjustedItems = [...generatedData.items] as RoutineItem[];

    // 1. Shift by actual wake time if different from default
    if (isToday && wakeTime && wakeTime !== childDefaultWake) {
      adjustedItems = shiftRoutineItems(adjustedItems, childDefaultWake, wakeTime);
    }

    // 2. For today: identify past tasks; auto-complete non-essentials; queue essentials
    if (isToday) {
      const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
      const essentials: { idx: number; item: RoutineItem }[] = [];

      adjustedItems = adjustedItems.map((item, idx) => {
        const itemMins = parseDisplayTime(item.time);
        if (itemMins < 0 || itemMins >= nowMins) return item; // future item
        if (item.category === "sleep") return item; // never auto-touch sleep
        if (isEssentialTask(item.activity, item.category)) {
          essentials.push({ idx, item: { ...item } });
          return item; // will be resolved by task check dialog
        }
        return { ...item, status: "completed" }; // auto-complete minor past tasks
      });

      const adjustedData = { title: generatedData.title, items: adjustedItems };

      if (essentials.length > 0) {
        setPastEssentialTasks(essentials);
        setTaskCheckMap(Object.fromEntries(essentials.map(({ idx }) => [idx, true])));
        setPendingRoutineSave({ generatedData: adjustedData, shouldOverride });
        setShowTaskCheck(true);
        return;
      }

      saveGeneratedRoutine(adjustedData, shouldOverride);
    } else {
      saveGeneratedRoutine({ title: generatedData.title, items: adjustedItems }, shouldOverride);
    }
  }, [date, selectedChildData, saveGeneratedRoutine]);

  // ── Core generate (rule-based) ─────────────────────────────────────────────
  const proceedGenerate = React.useCallback((forceOverride: boolean, wakeTime: string | null) => {
    const shouldOverride = forceOverride || overrideMode || !!existingRoutine?.exists;
    generateMutation.mutate(
      {
        data: {
          childId: selectedChild!,
          date,
          hasSchool: hasSchool ?? undefined,
          specialPlans: appendHandlerToPlans(specialPlans, handlerType),
          fridgeItems: fridgeItems.trim() || undefined,
          mood: mood !== "normal" ? mood : undefined,
          // School-aware generation context (server falls back to child profile when omitted).
          age: selectedChildData?.age,
          wakeTime: wakeTime ?? selectedChildData?.wakeUpTime,
          schoolStart: selectedChildData?.schoolStartTime,
          schoolEnd: selectedChildData?.schoolEndTime,
          region: parentRegion,
          ...buildParentAvailPayload(parentAvail),
        }
      },
      {
        onSuccess: (generatedData) => {
          const data = generatedData as { title: string; items: RoutineItem[] };
          const items = simplifyForHandler(data.items as any, handlerType) as RoutineItem[];
          handlePostGenerate({ ...data, items }, shouldOverride, wakeTime);
        },
        onError: (err: unknown) => {
          // Global Paywall: HTTP 402 { error: "feature_locked", feature: "routine_generate" }
          // OR legacy 403 { reason: "routine_limit_exceeded" }. Surface the paywall.
          const status = (err as { status?: number })?.status;
          const data = (err as { data?: { reason?: string; error?: string; feature?: string } })?.data;
          const isFeatureLocked = status === 402 && (data?.error === "feature_locked" || data?.feature === "routine_generate");
          const isLegacyLimit = status === 403 && data?.reason === "routine_limit_exceeded";
          if (isFeatureLocked || isLegacyLimit) {
            window.dispatchEvent(
              new CustomEvent("amynest:open-paywall", { detail: { reason: "routines_limit" } }),
            );
            return;
          }
          toast({ title: "Failed to generate routine", variant: "destructive" });
        },
      }
    );
  }, [generateMutation, overrideMode, existingRoutine, selectedChild, selectedChildData, date, hasSchool, specialPlans, fridgeItems, mood, parentAvail, parentRegion, handlePostGenerate, toast]);

  // ── Core generate (AI) ─────────────────────────────────────────────────────
  const proceedAiGenerate = React.useCallback(async (forceOverride: boolean, wakeTime: string | null) => {
    const shouldOverride = forceOverride || overrideMode || !!existingRoutine?.exists;
    setIsAiGenerating(true);
    try {
      const payload = {
        childId: selectedChild!,
        date,
        hasSchool: hasSchool ?? undefined,
        specialPlans: appendHandlerToPlans(specialPlans, handlerType),
        fridgeItems: fridgeItems.trim() || undefined,
        mood: mood !== "normal" ? mood : undefined,
        age: selectedChildData?.age,
        wakeTime: wakeTime ?? selectedChildData?.wakeUpTime,
        schoolStart: selectedChildData?.schoolStartTime,
        schoolEnd: selectedChildData?.schoolEndTime,
        region: parentRegion,
        ...buildParentAvailPayload(parentAvail),
      };
      const res = await authFetch("/api/routines/generate-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 402 || res.status === 403) {
        const body = await res.json().catch(() => null) as { reason?: string; error?: string; feature?: string } | null;
        const isFeatureLocked = res.status === 402 && (body?.error === "feature_locked" || body?.feature === "routine_generate");
        const isLegacyLimit = res.status === 403 && body?.reason === "routine_limit_exceeded";
        if (isFeatureLocked || isLegacyLimit) {
          window.dispatchEvent(
            new CustomEvent("amynest:open-paywall", { detail: { reason: "routines_limit" } }),
          );
          return;
        }
      }
      if (!res.ok) throw new Error("Amy AI generation failed");
      const generatedData = await res.json() as { title: string; items: RoutineItem[] };
      const simplified = simplifyForHandler(generatedData.items as any, handlerType) as RoutineItem[];
      handlePostGenerate({ ...generatedData, items: simplified }, shouldOverride, wakeTime);
    } catch {
      toast({ title: "Amy couldn't generate right now — try the standard routine instead.", variant: "destructive" });
    } finally {
      setIsAiGenerating(false);
    }
  }, [overrideMode, existingRoutine, selectedChild, selectedChildData, date, hasSchool, specialPlans, fridgeItems, mood, parentAvail, parentRegion, authFetch, handlePostGenerate, toast]);

  // ── Wake-up confirmation gate ──────────────────────────────────────────────
  const triggerWithWakeCheck = React.useCallback((type: "standard" | "ai", forceOverride: boolean) => {
    const today = format(new Date(), "yyyy-MM-dd");
    if (date !== today) {
      // Not today — no wake check needed, use default
      if (type === "standard") proceedGenerate(forceOverride, null);
      else proceedAiGenerate(forceOverride, null);
      return;
    }
    // Today — check stored or confirmed wake time
    const stored = getStoredWakeTime(selectedChild!, date);
    const wakeTime = confirmedWakeTime ?? stored;
    if (wakeTime) {
      if (type === "standard") proceedGenerate(forceOverride, wakeTime);
      else proceedAiGenerate(forceOverride, wakeTime);
      return;
    }
    // No wake time yet — show confirmation dialog
    setPendingAction({ type, forceOverride });
    setWakeAnswer(null);
    setWakeInputValue(displayToInput(selectedChildData?.wakeUpTime ?? "7:00 AM"));
    setShowWakeConfirm(true);
  }, [date, selectedChild, confirmedWakeTime, selectedChildData, proceedGenerate, proceedAiGenerate]);

  // ── Wake confirm submit ────────────────────────────────────────────────────
  const handleWakeConfirmSubmit = () => {
    const childDefaultWake = selectedChildData?.wakeUpTime ?? "7:00 AM";
    const finalWakeTime = wakeAnswer === "yes"
      ? childDefaultWake
      : (inputToDisplay(wakeInputValue) || childDefaultWake);
    storeWakeTime(selectedChild!, date, finalWakeTime);
    setConfirmedWakeTime(finalWakeTime);
    setShowWakeConfirm(false);
    if (pendingAction?.type === "standard") proceedGenerate(pendingAction.forceOverride, finalWakeTime);
    else if (pendingAction?.type === "ai") proceedAiGenerate(pendingAction.forceOverride, finalWakeTime);
    setPendingAction(null);
  };

  // ── Task check submit ──────────────────────────────────────────────────────
  const handleTaskCheckDone = () => {
    if (!pendingRoutineSave) return;
    const updatedItems = pendingRoutineSave.generatedData.items.map((item, idx) => {
      const checked = taskCheckMap[idx];
      if (checked === undefined) return item;
      return { ...item, status: checked ? "completed" as const : "skipped" as const };
    });
    setShowTaskCheck(false);
    setPendingRoutineSave(null);
    saveGeneratedRoutine({ ...pendingRoutineSave.generatedData, items: updatedItems }, pendingRoutineSave.shouldOverride);
  };

  // Compute age group for selected child
  const selectedChildAgeGroup = selectedChildData
    ? getAgeGroup(selectedChildData.age, (selectedChildData as any).ageMonths ?? 0)
    : null;
  const selectedChildAgeGroupInfo = selectedChildAgeGroup ? getAgeGroupInfo(selectedChildAgeGroup) : null;
  // School question is only required for preschoolers who go to school, and school-age+
  const schoolQuestionRequired = (() => {
    if (!selectedChildAgeGroup) return true;
    if (selectedChildAgeGroup === "infant" || selectedChildAgeGroup === "toddler") return false;
    if (selectedChildAgeGroup === "preschool" && !(selectedChildData as any)?.isSchoolGoing) return false;
    return true;
  })();
  const isFormValid = selectedChild && date && (!schoolQuestionRequired || hasSchool !== null);

  // Single mode generate — now goes through wake-time gate
  const handleGenerate = (forceOverride = false) => {
    if (!isFormValid) return;
    if (existingRoutine?.exists && !forceOverride && !overrideMode) return;
    triggerWithWakeCheck("standard", forceOverride);
  };

  // AI generate — also goes through wake-time gate
  const handleAiGenerate = (forceOverride = false) => {
    if (!isFormValid || isAiGenerating) return;
    if (existingRoutine?.exists && !forceOverride && !overrideMode) return;
    triggerWithWakeCheck("ai", forceOverride);
  };

  // Family mode generate — sequential
  const handleFamilyGenerate = async () => {
    if (!children) return;
    const selectedChildren = children.filter(
      (c) => familyChildSettings[c.id]?.selected && familyChildSettings[c.id]?.hasSchool !== null
    ) as ChildType[];

    if (selectedChildren.length === 0) {
      toast({ title: "Please select at least one child and set their school status.", variant: "destructive" });
      return;
    }

    setFamilyResults(null);
    const results: FamilyResult[] = [];

    for (let i = 0; i < selectedChildren.length; i++) {
      const child = selectedChildren[i];
      setFamilyProgress({ current: i + 1, total: selectedChildren.length, currentName: child.name });

      try {
        const generated = await new Promise<GeneratedRoutine>((resolve, reject) => {
          generateMutation.mutate(
            {
              data: {
                childId: child.id,
                date: familyDate,
                hasSchool: familyChildSettings[child.id]?.hasSchool ?? undefined,
                specialPlans: appendHandlerToPlans(familySpecialPlans, handlerType),
                fridgeItems: familyFridgeItems.trim() || undefined,
                ...buildParentAvailPayload(familyParentAvail),
              }
            },
            {
              onSuccess: (data) => resolve(data as GeneratedRoutine),
              onError: reject,
            }
          );
        });

        // Apply handler-based simplification (grandparent / babysitter)
        const simplifiedItems = simplifyForHandler(generated.items as any, handlerType);
        results.push({ child, routine: { ...generated, items: simplifiedItems as RoutineItem[] } });
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        const data = (err as { data?: { reason?: string; error?: string; feature?: string } })?.data;
        const isFeatureLocked = status === 402 && (data?.error === "feature_locked" || data?.feature === "routine_generate");
        const isLegacyLimit = status === 403 && data?.reason === "routine_limit_exceeded";
        if (isFeatureLocked || isLegacyLimit) {
          window.dispatchEvent(
            new CustomEvent("amynest:open-paywall", { detail: { reason: "routines_limit" } }),
          );
          break;
        }
        toast({ title: `Failed to generate routine for ${child.name}`, variant: "destructive" });
      }
    }

    setFamilyProgress(null);
    setFamilyResults(results);
  };

  // Save all family routines
  const handleSaveAll = async () => {
    if (!familyResults) return;
    setIsSavingAll(true);
    let saved = 0;

    for (const { child, routine } of familyResults) {
      try {
        await new Promise<void>((resolve, reject) => {
          createMutation.mutate(
            {
              data: {
                childId: child.id,
                date: familyDate,
                title: routine.title,
                items: routine.items as never,
              }
            },
            {
              onSuccess: () => { saved++; resolve(); },
              onError: reject,
            }
          );
        });
      } catch {
        toast({ title: `Failed to save routine for ${child.name}`, variant: "destructive" });
      }
    }

    setIsSavingAll(false);
    if (saved > 0) {
      queryClient.invalidateQueries({ queryKey: getListRoutinesQueryKey() });
      toast({ title: `✨ Saved ${saved} routine${saved > 1 ? "s" : ""}!` });
      setLocation("/routines");
    }
  };

  const isGeneratingFamily = !!familyProgress;

  const familySelectedCount = Object.values(familyChildSettings).filter((s) => s.selected).length;
  const familyReadyCount = Object.entries(familyChildSettings)
    .filter(([, s]) => s.selected && s.hasSchool !== null).length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/routines"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="font-quicksand text-3xl font-bold text-foreground">Generate Routine</h1>
          <p className="text-muted-foreground mt-1">Amy builds a smart daily plan around your schedule ❤️</p>
        </div>
      </header>

      {/* Handler Selector — applies to both modes */}
      <Card className="rounded-3xl border-none shadow-sm bg-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <UserCheck className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold text-foreground">{t("family_routine.handler_title")}</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {HANDLER_TYPES.map((h) => {
              const active = handlerType === h.key;
              return (
                <button
                  key={h.key}
                  onClick={() => setHandlerType(h.key)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl border-2 transition-all ${
                    active ? "shadow-sm" : "border-border bg-card hover:border-primary/40"
                  }`}
                  style={active ? { backgroundColor: h.bg, borderColor: h.border } : {}}
                >
                  <span className="text-xl leading-none">{h.emoji}</span>
                  <span
                    className="text-xs font-bold leading-tight"
                    style={active ? { color: h.fg } : { color: "inherit" }}
                  >
                    {t(`family_routine.handler_${h.key}`, { defaultValue: h.label })}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2.5">{getHandlerInfo(handlerType).note}</p>
        </CardContent>
      </Card>

      {/* Mode Selector */}
      <div className="flex gap-2 p-1 bg-muted rounded-2xl">
        <button
          onClick={() => setMode("single")}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            mode === "single" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          Single Child
        </button>
        <button
          onClick={() => setMode("family")}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            mode === "family" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Family Routine
        </button>
      </div>

      {/* ==================== SINGLE MODE ==================== */}
      {mode === "single" && (
        <>
          {isGenerating || isAiGenerating ? (
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card mt-4">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                  <div className={`absolute inset-0 rounded-full animate-ping ${isAiGenerating ? "bg-violet-400/20" : "bg-primary/20"}`} />
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ${isAiGenerating ? "bg-violet-100 text-violet-600" : "bg-primary/10 text-primary"}`}>
                    {isAiGenerating ? <Brain className="h-10 w-10 animate-pulse" /> : <Sparkles className="h-10 w-10 animate-pulse" />}
                  </div>
                </div>
                <div>
                  <h3 className="font-quicksand text-2xl font-bold mb-2">
                    {isAiGenerating ? "Amy is crafting your routine…" : "Crafting the perfect day…"}
                  </h3>
                  <p className="text-muted-foreground">
                    {isAiGenerating
                      ? "Amy AI is analyzing your child's profile, school schedule, mood, and parent availability to create a truly personalized routine."
                      : "Analyzing school schedule, parent availability, special plans, and behavior history to build a smart routine with family bonding time."}
                  </p>
                </div>
                <div className="w-full max-w-xs bg-muted rounded-full h-2 mt-4 overflow-hidden">
                  <div className={`h-full rounded-full w-1/2 animate-[pulse_2s_ease-in-out_infinite] ${isAiGenerating ? "bg-violet-500" : "bg-primary"}`} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card mt-4">
              <CardContent className="p-6 sm:p-8 space-y-8">

                {/* Step 1 — Select Child */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                    <Label className="text-lg font-bold">Who is this schedule for?</Label>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {loadingChildren ? (
                      <div className="animate-pulse bg-muted h-12 w-32 rounded-xl" />
                    ) : children?.length === 0 ? (
                      <p className="text-sm text-destructive p-3 bg-destructive/10 rounded-xl w-full border border-destructive/20">
                        Please add a child profile first to generate routines.
                      </p>
                    ) : (
                      children?.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => setSelectedChild(child.id)}
                          className={`px-4 py-3 rounded-2xl font-bold transition-all border-2 flex items-center gap-2 ${
                            selectedChild === child.id
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted"
                          }`}
                        >
                          <User className="h-4 w-4" />
                          {child.name}
                          <span className="text-xs opacity-70">age {child.age}</span>
                          {(child as ChildType).childClass && (
                            <span className="text-xs opacity-70">· {(child as ChildType).childClass}</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>

                  {selectedChildData && (
                    <>
                      <div className="bg-muted/50 rounded-2xl p-4 space-y-2 border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Profile Summary</p>
                          {selectedChildAgeGroupInfo && (
                            <Badge className={`text-xs font-bold border ${selectedChildAgeGroupInfo.bgColor} ${selectedChildAgeGroupInfo.color}`}>
                              {selectedChildAgeGroupInfo.emoji} {selectedChildAgeGroupInfo.label}
                              {" · "}
                              {formatAge(selectedChildData.age, (selectedChildData as any).ageMonths ?? 0)}
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2 text-foreground/80">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            Wake: <strong>{selectedChildData.wakeUpTime}</strong>
                          </div>
                          <div className="flex items-center gap-2 text-foreground/80">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            Sleep: <strong>{selectedChildData.sleepTime}</strong>
                          </div>
                          <div className="flex items-center gap-2 text-foreground/80">
                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                            School: <strong>{selectedChildData.schoolStartTime}–{selectedChildData.schoolEndTime}</strong>
                          </div>
                          <div className="flex items-center gap-2 text-foreground/80">
                            <Car className="h-3.5 w-3.5 text-muted-foreground" />
                            Travel: <strong>
                              {selectedChildData.travelMode === "other"
                                ? selectedChildData.travelModeOther || "Other"
                                : TRAVEL_MODE_LABELS[selectedChildData.travelMode] ?? selectedChildData.travelMode}
                            </strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm mt-1">
                          <span className="text-muted-foreground text-xs">Diet:</span>
                          <span className="text-xs font-medium">{selectedChildData.foodType === "non_veg" ? "🍗 Non-Vegetarian" : "🥦 Vegetarian"}</span>
                        </div>
                        {selectedChildData.goals && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs text-muted-foreground">🎯 {selectedChildData.goals}</p>
                          </div>
                        )}
                      </div>

                    </>
                  )}
                </div>

                {/* Parenting Hub promo — shown after child is selected */}
                {selectedChildData && (
                  <Link href="/parenting-hub">
                    <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 flex items-center gap-4 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer">
                      <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-xl">📚</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-emerald-900 text-sm leading-tight">
                          Parenting Hub — Tips, Stories &amp; Activities
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Age-based content for {selectedChildData.name} →
                        </p>
                      </div>
                      <Brain className="h-5 w-5 text-emerald-500 shrink-0" />
                    </div>
                  </Link>
                )}

                <div className="space-y-8">
                {/* Step 2 — Date */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">2</div>
                    <Label className="text-lg font-bold">Which day?</Label>
                  </div>
                  <div className="flex gap-3 max-w-sm">
                    {([
                      { label: "Today", value: format(new Date(), "yyyy-MM-dd") },
                      { label: "Tomorrow", value: format(new Date(Date.now() + 86400000), "yyyy-MM-dd") },
                    ] as const).map((opt) => {
                      const active = date === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setDate(opt.value); setExistingRoutine(null); setOverrideMode(false); }}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 border-2 font-bold transition-all ${active ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card text-foreground border-border hover:border-primary/40"}`}
                        >
                          <Calendar className="h-4 w-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} · 1 routine per child per day
                  </p>

                  {/* Existing routine warning */}
                  {existingRoutine?.exists && !overrideMode && (
                    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900 text-sm">Routine already exists for this date!</p>
                          <p className="text-amber-700 text-xs mt-0.5">
                            {selectedChildData?.name ?? "This child"} already has a routine on{" "}
                            {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/routines/${existingRoutine.routineId}`}>
                          <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Existing Routine
                          </button>
                        </Link>
                        <button
                          onClick={() => setOverrideMode(true)}
                          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Override & Regenerate
                        </button>
                      </div>
                    </div>
                  )}

                  {overrideMode && (
                    <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-3 flex items-center gap-3">
                      <RefreshCw className="h-4 w-4 text-orange-600 shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-900">Override mode active</p>
                        <p className="text-xs text-orange-700">The existing routine will be replaced when you generate.</p>
                      </div>
                      <button onClick={() => setOverrideMode(false)} className="text-xs text-orange-600 underline font-medium">Cancel</button>
                    </div>
                  )}
                </div>

                {/* Step 3 — School today? (age-aware) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">3</div>
                    <Label className="text-lg font-bold flex items-center gap-2">
                      <School className="h-5 w-5 text-primary" />
                      {selectedChildAgeGroup === "infant" ? "Care Mode" :
                       selectedChildAgeGroup === "toddler" ? "Learning Mode" :
                       "Is there school on this day?"}
                    </Label>
                    {(() => {
                      const d = new Date(date + "T00:00:00");
                      const day = d.getDay();
                      return (day === 0 || day === 6) && schoolQuestionRequired ? (
                        <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">🏖️ Weekend auto-detected</span>
                      ) : null;
                    })()}
                  </div>

                  {/* INFANT — no school, just info */}
                  {selectedChildAgeGroup === "infant" && (
                    <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-4 flex items-center gap-3">
                      <span className="text-3xl">👶</span>
                      <div>
                        <p className="font-bold text-pink-900 text-sm">Infant Care Mode — School Not Applicable</p>
                        <p className="text-xs text-pink-700 mt-0.5">The routine will focus on feeding, sleep, sensory activities, and parent bonding. No school logic used.</p>
                      </div>
                    </div>
                  )}

                  {/* TODDLER — no school, play mode */}
                  {selectedChildAgeGroup === "toddler" && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 flex items-center gap-3">
                      <span className="text-3xl">🧸</span>
                      <div>
                        <p className="font-bold text-purple-900 text-sm">Learning & Play Mode Active</p>
                        <p className="text-xs text-purple-700 mt-0.5">The routine will include age-appropriate play, sensory activities, nap times, and parent interaction blocks — no school scheduling.</p>
                      </div>
                    </div>
                  )}

                  {/* PRESCHOOL, no school enrolled */}
                  {selectedChildAgeGroup === "preschool" && !(selectedChildData as any)?.isSchoolGoing && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-3">
                      <span className="text-3xl">🎨</span>
                      <div>
                        <p className="font-bold text-blue-900 text-sm">Home Learning Mode — Play-Based Routine</p>
                        <p className="text-xs text-blue-700 mt-0.5">Your child isn't in school yet. The routine will include creative play, story time, arts & crafts, and outdoor exploration.</p>
                      </div>
                    </div>
                  )}

                  {/* PRESCHOOL with school, or SCHOOL-AGE+ — show full toggle */}
                  {schoolQuestionRequired && (
                    <>
                      <ToggleGroup
                        value={hasSchool}
                        onChange={setHasSchool}
                        options={[
                          ["Yes, school day", true, "🏫"],
                          ["No, day off", false, "🏖️"],
                        ]}
                      />
                      {hasSchool === true && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-sm text-amber-800">
                          🍱 Amy AI will suggest a tiffin lunchbox for your child and plan school-day blocks.
                        </div>
                      )}
                      {hasSchool === false && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-sm text-amber-800">
                          Amy AI will skip school blocks and add outdoor play, hobby activities, and family time instead.
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Step 4 — Parent availability for this date */}
                <ParentAvailSection
                  stepNum={4}
                  avail={parentAvail}
                  onChange={setParentAvail}
                  date={date}
                />

                {/* Step 5 — Special plans */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">5</div>
                    <Label className="text-lg font-bold flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      Any special plans today? <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                    </Label>
                  </div>
                  <Input
                    placeholder="e.g. birthday party at 4pm, doctor's appointment at 11am, outing to the park..."
                    value={specialPlans}
                    onChange={(e) => setSpecialPlans(e.target.value)}
                    className="rounded-2xl h-12 pl-4"
                  />
                  <p className="text-xs text-muted-foreground">Amy AI will adjust the entire routine around your special plans.</p>
                </div>

                {/* Step 6 — Fridge Items */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">6</div>
                    <Label className="text-lg font-bold">What's in your fridge? <span className="text-sm font-normal text-muted-foreground">(optional)</span></Label>
                  </div>
                  <div className="relative">
                    <Refrigerator className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      placeholder="e.g. eggs, spinach, chicken, rice, tomatoes, milk, apples..."
                      value={fridgeItems}
                      onChange={(e) => setFridgeItems(e.target.value)}
                      className="pl-9 resize-none rounded-2xl min-h-[80px]"
                      rows={2}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Amy AI will suggest meals and tiffin using only what you have.</p>
                </div>

                {/* Mood Selector */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">7</div>
                    <Label className="text-lg font-bold">How is your child feeling today?</Label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {MOOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMood(opt.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${
                          mood === opt.value
                            ? `${opt.color} border-2 shadow-sm scale-105`
                            : "bg-card border-border hover:border-primary/40 hover:bg-muted"
                        }`}
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <span className="font-bold text-sm">{opt.label}</span>
                        <span className="text-[10px] text-center opacity-70 leading-tight">{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                  {mood !== "normal" && (
                    <div className="bg-muted/60 border border-border rounded-xl px-3 py-2 text-xs text-foreground/70">
                      🎯 Amy AI will adapt the routine for a <strong>{mood}</strong> mood day — {MOOD_OPTIONS.find(o => o.value === mood)?.hint?.toLowerCase()}.
                    </div>
                  )}
                </div>

                {/* What the AI uses */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-foreground/70 space-y-1">
                  <p className="font-bold text-foreground text-sm mb-2">✨ What Amy AI considers:</p>
                  <ul className="space-y-1 list-none">
                    <li>🏫 School status — includes or skips school blocks</li>
                    <li>🍱 Tiffin suggestion — 3 options for school-going kids</li>
                    <li>👩‍💼 Parent work type — homemaker, WFH, or office schedule</li>
                    <li>💼 Working day check — busy vs. free affects task assignment</li>
                    <li>🕘 Work hours — tasks planned around exact busy windows</li>
                    <li>👨‍👩‍👧 Co-parent coordination — smart role assignment when both parents added</li>
                    <li>🌟 Special plans — adjusts the whole day around them</li>
                    <li>❤️ Family bonding — always adds 2–3 quality moments</li>
                    <li>⏰ Wake-up & bedtime for accurate time slots</li>
                    <li>🥦 Child's food preference — veg or non-veg</li>
                    <li>🍽️ Fridge ingredients for meal suggestions</li>
                    <li>😊 Child's mood — adjusts tone & activity intensity</li>
                  </ul>
                </div>

                <div className="pt-2 space-y-3">
                  {existingRoutine?.exists && !overrideMode ? (
                    <p className="text-center text-sm text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded-2xl py-3 px-4">
                      ⚠️ Choose <strong>View Existing Routine</strong> or <strong>Override & Regenerate</strong> above to continue.
                    </p>
                  ) : (
                    <>
                      {/* Standard rule-based routine */}
                      <Button
                        onClick={() => handleGenerate(false)}
                        disabled={!isFormValid || isGenerating || isAiGenerating}
                        size="lg"
                        className={`w-full rounded-full h-14 text-lg font-bold shadow-sm transition-all ${overrideMode ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                      >
                        {isGenerating ? (
                          <><Sparkles className="h-5 w-5 mr-2 animate-spin" />Generating...</>
                        ) : overrideMode ? (
                          <><RefreshCw className="h-5 w-5 mr-2" />Regenerate & Override</>
                        ) : (
                          <><Sparkles className="h-5 w-5 mr-2" />Generate Smart Routine</>
                        )}
                      </Button>

                      {/* Smart AI Routine button */}
                      <div className="relative">
                        <Button
                          onClick={() => handleAiGenerate(false)}
                          disabled={!isFormValid || isGenerating || isAiGenerating || createMutation.isPending}
                          size="lg"
                          variant="outline"
                          className="w-full rounded-full h-12 text-base font-bold border-2 border-violet-300 text-violet-700 hover:bg-violet-50 hover:border-violet-400 transition-all"
                        >
                          {isAiGenerating ? (
                            <><Brain className="h-5 w-5 mr-2 animate-pulse" />Amy is thinking…</>
                          ) : (
                            <><Zap className="h-5 w-5 mr-2" />Smart Amy AI Routine</>
                          )}
                        </Button>
                        <Badge className="absolute -top-2 -right-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[10px] font-bold border-0 px-1.5 py-0.5">
                          Amy AI
                        </Badge>
                      </div>

                      <p className="text-center text-xs text-muted-foreground">
                        Standard routine is instant &amp; free · Amy AI routine is smarter but takes ~10s
                      </p>

                      {!isFormValid && (
                        <p className="text-center text-xs text-destructive">
                          Please select a child and answer the school question to continue.
                        </p>
                      )}
                    </>
                  )}
                </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ==================== FAMILY MODE ==================== */}
      {mode === "family" && (
        <>
          {/* Generating state */}
          {isGeneratingFamily && (
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card mt-4">
              <CardContent className="p-12 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="relative bg-primary/10 text-primary w-20 h-20 rounded-full flex items-center justify-center">
                    <Users className="h-10 w-10 animate-pulse" />
                  </div>
                </div>
                <div>
                  <h3 className="font-quicksand text-2xl font-bold mb-2">
                    Building {familyProgress?.currentName}'s routine...
                  </h3>
                  <p className="text-muted-foreground">
                    {familyProgress?.current} of {familyProgress?.total} children
                  </p>
                </div>
                <div className="w-full max-w-xs bg-muted rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${((familyProgress?.current ?? 0) / (familyProgress?.total ?? 1)) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Family results */}
          {!isGeneratingFamily && familyResults && (
            <div className="space-y-6">
              {/* Success banner */}
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="font-bold text-green-800">Family routine ready!</p>
                  <p className="text-xs text-green-700">{familyResults.length} routine{familyResults.length > 1 ? "s" : ""} generated for {familyDate}</p>
                </div>
              </div>

              {/* Amy AI Suggestions */}
              {(() => {
                const suggestions = buildSyncSuggestions(familyResults as unknown as FRFamilyResult[]);
                if (suggestions.length === 0) return null;
                return (
                  <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-5 w-5 text-violet-600" />
                        <h3 className="font-quicksand font-bold text-violet-900 dark:text-violet-200 text-lg">{t("family_routine.amy_suggests")}</h3>
                      </div>
                      <div className="space-y-2">
                        {suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-3 bg-white/70 dark:bg-white/5 rounded-2xl p-3 border border-violet-100 dark:border-violet-400/20">
                            <span className="text-xl shrink-0">{s.icon}</span>
                            <div>
                              <p className="font-bold text-sm text-violet-900 dark:text-violet-100">{s.title}</p>
                              <p className="text-xs text-violet-700 dark:text-violet-300 mt-0.5 leading-relaxed">{s.body}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Family Points */}
              {(() => {
                const fp = computeFamilyPoints(familyResults as unknown as FRFamilyResult[]);
                const totalPossible = familyResults.reduce(
                  (s, r) => s + r.routine.items.reduce((ss, i) => ss + ((i as any).rewardPoints ?? 5), 0),
                  0
                );
                return (
                  <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-amber-600" />
                          <h3 className="font-quicksand font-bold text-amber-900 dark:text-amber-100 text-lg">{t("family_routine.family_points")}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black text-amber-700 dark:text-amber-200 leading-none">{totalPossible + 20}</p>
                          <p className="text-[10px] text-amber-600 dark:text-amber-300 font-bold uppercase tracking-wide">{t("family_routine.possible_today")}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {fp.perChild.map((p) => (
                          <div key={p.name} className="flex items-center justify-between text-sm bg-white/60 dark:bg-white/5 rounded-xl px-3 py-2">
                            <span className="font-bold text-amber-900 dark:text-amber-100">{p.name}</span>
                            <span className="text-amber-700 dark:text-amber-300 font-bold">{t("family_routine.earns_pts", { pts: Math.round(totalPossible / familyResults.length) })}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm bg-amber-200/60 dark:bg-amber-400/10 rounded-xl px-3 py-2 mt-2 border border-amber-300/60">
                          <span className="font-bold text-amber-900 dark:text-amber-100">{t("family_routine.family_bonus")}</span>
                          <span className="text-amber-700 dark:text-amber-300 font-black">+20 pts</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Shared Family Activities */}
              {(() => {
                const shared = pickSharedActivities(
                  familyResults.map((r) => ({ id: r.child.id, name: r.child.name, age: r.child.age })),
                  3
                );
                return (
                  <Card className="rounded-3xl border-none shadow-sm bg-card">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-5 w-5 text-primary" />
                        <h3 className="font-quicksand font-bold text-foreground text-lg">{t("family_routine.shared_activities")}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{t("family_routine.shared_subtitle")}</p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {shared.map((a, i) => (
                          <div key={i} className="bg-muted/40 hover:bg-primary/5 rounded-2xl p-3 border border-border/50 transition-all">
                            <div className="text-2xl mb-1">{a.emoji}</div>
                            <p className="font-bold text-sm text-foreground leading-tight">{a.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{t("family_routine.minutes_short", { n: a.duration })}</p>
                            <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{a.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              {/* SECTION 3: Tiffin Suggestions */}
              <TiffinSummaryCard familyResults={familyResults} />

              {/* SECTION 2: Combined Timeline */}
              <Card className="rounded-3xl border-none shadow-sm bg-card">
                <CardContent className="p-5">
                  <h3 className="font-quicksand font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Combined Family Timeline
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {familyResults.map(({ child }, i) => {
                      const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-rose-500", "bg-orange-500"];
                      return (
                        <div key={child.id} className="flex items-center gap-1.5 text-xs font-medium">
                          <div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                          {child.name}
                        </div>
                      );
                    })}
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-1">
                    <CombinedTimeline familyResults={familyResults} />
                  </div>
                </CardContent>
              </Card>

              {/* SECTION 1: Individual routines */}
              <Card className="rounded-3xl border-none shadow-sm bg-card">
                <CardContent className="p-5">
                  <h3 className="font-quicksand font-bold text-foreground text-lg mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Individual Routines
                  </h3>
                  <div className="space-y-3">
                    {familyResults.map((result) => (
                      <IndividualRoutineSection key={result.child.id} result={result} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="rounded-full flex-1"
                  onClick={() => setFamilyResults(null)}
                >
                  Regenerate
                </Button>
                <Button
                  onClick={handleSaveAll}
                  disabled={isSavingAll}
                  size="lg"
                  className="rounded-full flex-1 font-bold"
                >
                  {isSavingAll ? (
                    <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 animate-spin" /> Saving...</span>
                  ) : (
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Save All Routines</span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Family form */}
          {!isGeneratingFamily && !familyResults && (
            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card mt-4">
              <CardContent className="p-6 sm:p-8 space-y-8">

                {/* Step 1 — Select children */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                    <Label className="text-lg font-bold">Which children to include?</Label>
                  </div>

                  {loadingChildren ? (
                    <div className="space-y-3">
                      <div className="animate-pulse bg-muted h-24 rounded-2xl" />
                      <div className="animate-pulse bg-muted h-24 rounded-2xl" />
                    </div>
                  ) : children?.length === 0 ? (
                    <p className="text-sm text-destructive p-3 bg-destructive/10 rounded-xl w-full border border-destructive/20">
                      Please add child profiles first. <Link href="/children/new" className="underline font-bold">Add a child →</Link>
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {children?.map((child) => {
                        const settings = familyChildSettings[child.id] ?? { hasSchool: null, selected: true };
                        return (
                          <div
                            key={child.id}
                            className={`rounded-2xl border-2 overflow-hidden transition-all ${
                              settings.selected ? "border-primary/40 bg-primary/5" : "border-border bg-card opacity-60"
                            }`}
                          >
                            {/* Child header */}
                            <div className="flex items-center gap-3 p-4">
                              <button
                                onClick={() => setFamilyChildSettings((prev) => ({
                                  ...prev,
                                  [child.id]: { ...settings, selected: !settings.selected }
                                }))}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                  settings.selected ? "bg-primary border-primary text-primary-foreground" : "border-border"
                                }`}
                              >
                                {settings.selected && <CheckCircle2 className="h-3 w-3" />}
                              </button>
                              <div className="flex-1">
                                <div className="font-bold text-foreground flex items-center gap-2">
                                  {child.name}
                                  <span className="text-xs text-muted-foreground font-normal">age {child.age}</span>
                                  {(child as ChildType).childClass && (
                                    <span className="text-xs bg-muted px-2 py-0.5 rounded-md font-medium">{(child as ChildType).childClass}</span>
                                  )}
                                  <span className="text-xs text-muted-foreground font-normal">
                                    {(child as ChildType).foodType === "non_veg" ? "🍗" : "🥦"}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  School: {child.schoolStartTime}–{child.schoolEndTime} · Wake: {child.wakeUpTime}
                                </div>
                              </div>
                            </div>

                            {/* School toggle — age-aware per child */}
                            {settings.selected && (() => {
                              const childGroup = getAgeGroup(child.age, (child as any).ageMonths ?? 0);
                              const notSchoolApplicable =
                                childGroup === "infant" ||
                                childGroup === "toddler" ||
                                (childGroup === "preschool" && !(child as any).isSchoolGoing);

                              if (childGroup === "infant") return (
                                <div className="px-4 pb-3">
                                  <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-xl px-3 py-2">
                                    <span className="text-lg">👶</span>
                                    <p className="text-xs font-bold text-pink-800">Infant Care Mode — No school scheduling</p>
                                  </div>
                                </div>
                              );

                              if (childGroup === "toddler") return (
                                <div className="px-4 pb-3">
                                  <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                                    <span className="text-lg">🧸</span>
                                    <p className="text-xs font-bold text-purple-800">Learning & Play Mode — No school scheduling</p>
                                  </div>
                                </div>
                              );

                              if (childGroup === "preschool" && !(child as any).isSchoolGoing) return (
                                <div className="px-4 pb-3">
                                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                                    <span className="text-lg">🎨</span>
                                    <p className="text-xs font-bold text-blue-800">Home Learning Mode — Play-based routine</p>
                                  </div>
                                </div>
                              );

                              // School-applicable: preschool (going to school) or school-age+
                              return (
                                <div className="px-4 pb-4">
                                  <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                                    <School className="h-3 w-3" />
                                    School today for {child.name}?
                                  </p>
                                  <div className="flex gap-2">
                                    {[
                                      { label: "🏫 Yes, school", val: true },
                                      { label: "🏖️ Day off", val: false },
                                    ].map(({ label, val }) => (
                                      <button
                                        key={String(val)}
                                        onClick={() => setFamilyChildSettings((prev) => ({
                                          ...prev,
                                          [child.id]: { ...settings, hasSchool: val }
                                        }))}
                                        className={`flex-1 py-2 px-3 rounded-xl font-bold border-2 transition-all text-xs ${
                                          settings.hasSchool === val
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-card text-foreground border-border hover:border-primary/40"
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 2 — Date */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">2</div>
                    <Label className="text-lg font-bold">Which day?</Label>
                  </div>
                  <div className="flex gap-3 max-w-sm">
                    {([
                      { label: "Today", value: format(new Date(), "yyyy-MM-dd") },
                      { label: "Tomorrow", value: format(new Date(Date.now() + 86400000), "yyyy-MM-dd") },
                    ] as const).map((opt) => {
                      const active = familyDate === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFamilyDate(opt.value)}
                          className={`flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 border-2 font-bold transition-all ${active ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card text-foreground border-border hover:border-primary/40"}`}
                        >
                          <Calendar className="h-4 w-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3 — Parent availability for this date */}
                <ParentAvailSection
                  stepNum={3}
                  avail={familyParentAvail}
                  onChange={setFamilyParentAvail}
                  date={familyDate}
                />

                {/* Step 4 — Special plans */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">4</div>
                    <Label className="text-lg font-bold flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary" />
                      Any special family plans? <span className="text-sm font-normal text-muted-foreground">(optional)</span>
                    </Label>
                  </div>
                  <Input
                    placeholder="e.g. family outing, cousin's birthday party, sports day..."
                    value={familySpecialPlans}
                    onChange={(e) => setFamilySpecialPlans(e.target.value)}
                    className="rounded-2xl h-12 pl-4"
                  />
                </div>

                {/* Step 5 — Fridge */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary/20 text-primary w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">5</div>
                    <Label className="text-lg font-bold">What's in your fridge? <span className="text-sm font-normal text-muted-foreground">(optional)</span></Label>
                  </div>
                  <div className="relative">
                    <Refrigerator className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      placeholder="e.g. eggs, paneer, spinach, chicken, rice, tomatoes..."
                      value={familyFridgeItems}
                      onChange={(e) => setFamilyFridgeItems(e.target.value)}
                      className="pl-9 resize-none rounded-2xl min-h-[80px]"
                      rows={2}
                    />
                  </div>
                </div>

                {/* Tiffin info */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                  <p className="font-bold mb-1">🍱 Smart Tiffin Planning</p>
                  <p>For each school-going child, the AI will suggest 3 tiffin/lunchbox options respecting their food preference (veg/non-veg). A combined tiffin summary will be shown at the top of the results.</p>
                </div>

                <Button
                  onClick={handleFamilyGenerate}
                  disabled={isGeneratingFamily || familySelectedCount === 0}
                  size="lg"
                  className="w-full rounded-full h-14 text-lg font-bold shadow-sm"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Generate Family Routine
                  {familyReadyCount > 0 && familySelectedCount > 0 && (
                    <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                      {familyReadyCount}/{familySelectedCount} ready
                    </span>
                  )}
                </Button>
                {familySelectedCount > 0 && familyReadyCount < familySelectedCount && (
                  <p className="text-center text-xs text-muted-foreground -mt-4">
                    Set school status for all selected children to continue.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ── Wake-up Confirmation Dialog ──────────────────────────────────────── */}
      {showWakeConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-3xl p-5 text-white">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-3xl">⏰</span>
                <div>
                  <p className="font-quicksand font-bold text-lg leading-tight">Good morning!</p>
                  <p className="text-amber-100 text-xs">Let's personalise today's routine</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <p className="font-bold text-foreground text-base">
                  Did {selectedChildData?.name ?? "your child"} wake up at their usual time?
                </p>
                <p className="text-2xl font-black text-primary mt-1">
                  {selectedChildData?.wakeUpTime ?? "7:00 AM"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setWakeAnswer("yes")}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 font-bold transition-all ${
                    wakeAnswer === "yes"
                      ? "bg-green-500 border-green-500 text-white"
                      : "bg-card border-border text-foreground hover:border-green-400"
                  }`}
                >
                  <span className="text-2xl">✅</span>
                  <span className="text-sm">Yes, on time</span>
                </button>
                <button
                  onClick={() => setWakeAnswer("no")}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 font-bold transition-all ${
                    wakeAnswer === "no"
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "bg-card border-border text-foreground hover:border-orange-400"
                  }`}
                >
                  <span className="text-2xl">⏱️</span>
                  <span className="text-sm">No, different time</span>
                </button>
              </div>

              {wakeAnswer === "no" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-sm font-bold text-muted-foreground">Enter today's actual wake-up time:</p>
                  <div className="flex items-center bg-muted/30 border-2 border-primary rounded-2xl px-4 py-3 gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <input
                      type="time"
                      value={wakeInputValue}
                      onChange={(e) => setWakeInputValue(e.target.value)}
                      className="bg-transparent border-none outline-none text-foreground font-bold text-lg flex-1"
                    />
                    {wakeInputValue && (
                      <span className="text-xs font-bold text-primary">{inputToDisplay(wakeInputValue)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The routine will shift to start from this time.
                  </p>
                </div>
              )}

              <Button
                onClick={handleWakeConfirmSubmit}
                disabled={wakeAnswer === null || (wakeAnswer === "no" && !wakeInputValue)}
                className="w-full rounded-full h-12 font-bold"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {wakeAnswer === "yes" ? "Great! Generate Routine" : "Adjust & Generate"}
              </Button>

              <button
                onClick={() => { setShowWakeConfirm(false); setPendingAction(null); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Past Essential Task Check Dialog ─────────────────────────────────── */}
      {showTaskCheck && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-3xl p-5 text-white shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="font-quicksand font-bold text-lg leading-tight">Morning Check-in</p>
                  <p className="text-blue-100 text-xs">Mark what's already been done</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm text-muted-foreground">
                These activities should have happened before now. Did {selectedChildData?.name ?? "your child"} complete them?
              </p>

              <div className="space-y-2">
                {pastEssentialTasks.map(({ idx, item }) => (
                  <button
                    key={idx}
                    onClick={() => setTaskCheckMap((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                      taskCheckMap[idx]
                        ? "bg-green-50 border-green-400 text-green-900"
                        : "bg-rose-50 border-rose-300 text-rose-900"
                    }`}
                  >
                    <span className="text-xl">{taskCheckMap[idx] ? "✅" : "❌"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.activity}</p>
                      <p className="text-xs opacity-70">{item.time} · {item.duration}m</p>
                    </div>
                    <span className="text-xs font-bold shrink-0">
                      {taskCheckMap[idx] ? "Done" : "Missed"}
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Tap to toggle. Missed tasks will be marked as skipped.
              </p>
            </div>

            <div className="p-5 pt-0 shrink-0 space-y-2">
              <Button onClick={handleTaskCheckDone} className="w-full rounded-full h-12 font-bold">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save & View Routine
              </Button>
              <button
                onClick={() => {
                  setShowTaskCheck(false);
                  if (pendingRoutineSave) saveGeneratedRoutine(pendingRoutineSave.generatedData, pendingRoutineSave.shouldOverride);
                  setPendingRoutineSave(null);
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Skip check-in — save as-is
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
