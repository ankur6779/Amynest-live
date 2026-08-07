import { parseApiJson } from "@/lib/safe-json-response";
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { Brain, CheckCircle2, ShieldAlert, ChevronDown, ChevronUp, Syringe, Zap, Activity, Star, AlertTriangle, Flame, MessageCircle, BedDouble, ListChecks, Music2, X, Loader2, Sparkles, TrendingUp, Heart, FileDown, Users } from "lucide-react";
import { getApiUrl } from "@/lib/api";
import { BabyCuesEngine, CommunicationCoaching } from "@/components/infant-baby-cues";
import { CryInsight } from "@/components/cry-insight";
import { SleepPredict } from "@/components/sleep-predict";
import { WakeWindowSystem, SleepIssueDetector, RoutineBuilder, SleepWeeklyInsights } from "@/components/infant-sleep-module";
import { InfantWeeklySleepReport } from "@/components/infant/infant-weekly-sleep-report";
import { BuddyMilestonePlanner } from "@/components/infant-milestones";
import { WhiteNoiseLullaby } from "@/components/infant-sounds";
import { InfantFeedingTracker } from "@/components/infant-feeding-tracker";
import { INFANT_CATEGORIES, type InfantCategory, type Lang, getTipsForAge, getAmyInsight, pickLang, VACCINATIONS, getUpcomingVaccinationsWithLog, getVaccinationSummary, type VaxStatus, type VaxLogMap, getIsoWeekKey, INFANT_ACTIVITIES, getInfantAgeBand } from "@workspace/infant-hub";
import { BabyTodayCard } from "@/components/infant/baby-today-card";
import {
  InfantActivationFlow,
  InfantActivationFlowSkeleton,
  shouldShowInfantActivationUi,
} from "@/components/infant/infant-activation-flow";
import { useInfantActivation } from "@/hooks/use-infant-activation";
import { DiaperBurpLogger } from "@/components/infant/diaper-burp-logger";
import { GrowthTracker } from "@/components/infant/growth-tracker";
import { ParentWellbeing } from "@/components/infant/parent-wellbeing";
import { DoctorVisitReport } from "@/components/infant/doctor-visit-report";
import { WeeklyProgressReport } from "@/components/infant/weekly-progress-report";
import { CoParentPanel } from "@/components/infant/co-parent-panel";
import { FF_CO_PARENT } from "@/lib/co-parent-feature-flags";
import { InfantNotificationPrefs } from "@/components/infant/infant-notification-prefs";
import { formatAge } from "@/lib/age-groups";
import { INFANT_HUB_OPEN_SECTION_EVENT } from "@/lib/hub-activity-cross-link";
import { trackInfantHubOpened } from "@/lib/infant-hub-analytics";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { InfantHubPremiumSection } from "@/components/infant-hub-premium-section";
import type { InfantHubCardId } from "@/lib/infant-hub-card-config";
import { InfantAskAmyCta } from "@/components/infant/infant-ask-amy-cta";
import { InfantSleepCoachingPanel } from "@/components/infant/infant-sleep-coaching-panel";
import { InfantFeedingPlanPanel } from "@/components/infant/infant-feeding-plan-panel";
import {
  isInfantCareLivingV1Enabled,
  recommendInfantCareAction,
} from "@/lib/infant-care/living-room";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import "@/pages/first-experience-material.css";
import "@/components/infant/infant-care-living-room.css";

/** Same Care FE photograph as Parent Hub Care room — continuity, not a new language. */
const INFANT_CARE_MEMORY = ROOM_HEROES.care;

interface InfantHubProps {
  childId: number;
  childName: string;
  ageMonths: number;
}
function langOf(_i18nLang: string | undefined): Lang {
  return "en";
}

// ─── Sub-band helper ─────────────────────────────────────────────────────────
function getBand(months: number): "0-3" | "3-6" | "6-9" | "9-12" | "12-18" | "18-24" {
  if (months < 3) return "0-3";
  if (months < 6) return "3-6";
  if (months < 9) return "6-9";
  if (months < 12) return "9-12";
  if (months < 18) return "12-18";
  return "18-24";
}

// ─── Common Issues ─────────────────────────────────────────────────────────────
const COMMON_ISSUES = [{
  id: "colic",
  emoji: "😭",
  title: "Colic / Excessive Crying",
  bands: ["0-3", "3-6"],
  content: "Rule of 3: crying >3 hrs/day, >3 days/week, >3 weeks in a healthy baby. Try: gentle tummy massage clockwise, bicycle legs, white noise, feeding position upright 30 min after feed, check for gas. Usually peaks at 6 weeks and resolves by 3–4 months. See doctor if baby has fever or isn't eating."
}, {
  id: "teething",
  emoji: "🦷",
  title: "Teething",
  bands: ["6-9", "9-12", "12-18"],
  content: "First tooth usually arrives 6–10 months. Signs: drooling, gum rubbing, fussiness, mild fever (under 38°C). Help: cold teething ring, gentle gum massage with clean finger. Do NOT use teething gels with benzocaine. Mild symptoms are normal — high fever, rash or diarrhoea are not teething symptoms."
}, {
  id: "fever",
  emoji: "🌡️",
  title: "Fever",
  bands: ["0-3", "3-6", "6-9", "9-12", "12-18", "18-24"],
  content: "Under 3 months: any temp ≥38°C → go to hospital immediately. 3–6 months: call doctor if ≥38°C or baby seems unwell. 6 months+: treat if uncomfortable with paracetamol (correct dose for weight). Keep hydrated. Go to ER if: temp ≥40°C, seizure, rash, stiff neck, won't stop crying, very lethargic."
}, {
  id: "cold",
  emoji: "🤧",
  title: "Cold / Stuffy Nose",
  bands: ["3-6", "6-9", "9-12", "12-18", "18-24"],
  content: "Babies can't blow their nose — use a nasal aspirator and saline drops before feeds. Keep room humidified. Slightly elevate head end of mattress (not pillow). Under 2 years: NO over-the-counter cough/cold medicine. Breastfeed frequently — milk transfers antibodies. See doctor if breathing is laboured or symptoms worsen after 10 days."
}];

// ─── Weekly Focus (rotates by calendar week) ─────────────────────────────────
type WeeklyFocusVariant = {
  headline: string;
  body: string;
  next: string;
};

function getWeeklyFocusVariants(name: string, months: number): WeeklyFocusVariant[] {
  const band = getBand(months);
  const maps: Record<string, WeeklyFocusVariant[]> = {
    "0-3": [{
      headline: `${name} is building the brain's first 'trust map'`,
      body: "Every time you respond to crying, you're literally growing neural connections. The brain grows faster in the first 3 months than at any other time in life.",
      next: "Watch for the first social smile this week — it's the beginning of intentional communication."
    }, {
      headline: `${name}'s senses are waking up`,
      body: "High-contrast visuals, your voice, and skin-to-skin contact are the richest inputs right now. Short, calm sessions beat long overstimulating ones.",
      next: "Try 5 minutes of face-to-face talk after each feed when baby is alert but calm."
    }, {
      headline: `Tiny routines help ${name} feel safe`,
      body: "Predictable sequences — nappy, feed, burp, cuddle — teach the nervous system what comes next. Safety is the foundation for every later skill.",
      next: "Pick one small bedtime cue (same song or phrase) and use it every night this week."
    }],
    "3-6": [{
      headline: `${name}'s brain is craving new sensations`,
      body: "This is the prime window for varied textures, sounds, faces, and environments. Safe novelty builds rich neural networks.",
      next: "Start tummy time daily and notice how head control improves week by week."
    }, {
      headline: `${name} is learning that people respond back`,
      body: "Serve-and-return — you coo, they coo, you smile, they smile — is the #1 language builder before words appear.",
      next: "Copy one sound baby makes today and wait 5 seconds. See if they try again."
    }],
    "6-9": [{
      headline: `${name} is entering solids & big emotions`,
      body: "Stranger anxiety peaking now is a healthy sign — attachment is forming perfectly. Clinginess at 6–9 months is normal, not a problem.",
      next: "Try one new solid food this week. Wait 3 days before introducing the next to watch for reactions."
    }, {
      headline: `${name} is becoming a little explorer`,
      body: "Rolling, reaching, and mouthing objects are how the brain maps the world. Messy play is productive play.",
      next: "Create a small 'yes space' on the floor with 3 safe objects to explore freely."
    }],
    "9-12": [{
      headline: `${name}'s first word is closer than you think`,
      body: "Babbling is shadow speech — the brain is rehearsing. Treating babble as meaningful accelerates real words.",
      next: "Point and name everything this week: door, shoe, spoon, ball."
    }, {
      headline: `${name} understands more than they can say`,
      body: "Receptive language runs ahead of speech. Simple gestures (wave, clap) often appear before clear words.",
      next: "Play 'where is the…?' and give them a moment to look or point before you answer."
    }],
    "12-18": [{
      headline: `${name} is moving from baby to toddler at speed`,
      body: "The switch from 2 naps to 1 often happens between 14–18 months and causes a rough patch. Consistent timing usually settles it within 2–3 weeks.",
      next: "Introduce a simple 2-step routine: 'First shoes, then outside.'"
    }, {
      headline: `${name} wants to do things themselves`,
      body: "Autonomy bursts ('me do it!') are healthy — they're building executive function, not being defiant.",
      next: "Offer two acceptable choices at mealtime: banana or apple? Both win for you."
    }],
    "18-24": [{
      headline: `${name}'s language is about to explode`,
      body: "Between 18–24 months, many toddlers jump from ~20 words to 50+. The 'word spurt' often follows a quiet patch — keep narrating.",
      next: "Ask 'where is the…?' questions and wait for a point before helping."
    }, {
      headline: `${name} is practicing social rules`,
      body: "Turn-taking in play, early pretend (feeding a doll), and mimicking chores are signs of advanced cognitive growth.",
      next: "Include them in one real household task this week — wiping table, sorting socks."
    }]
  };
  return maps[band] ?? maps["0-3"];
}

function getWeeklyFocus(name: string, months: number): WeeklyFocusVariant {
  const variants = getWeeklyFocusVariants(name, months);
  const wk = getIsoWeekKey();
  return variants[wk % variants.length]!;
}

function weeklyFocusDoneKey(childId: number): string {
  return `amynest:weekly-focus-done:${childId}:${getIsoWeekKey()}`;
}

// ─── Collapsible Section ──────────────────────────────────────────────────────
function IHSection({
  sectionId,
  cardId,
  icon,
  title,
  badge,
  open,
  onOpenChange,
  children,
}: {
  sectionId?: string;
  cardId?: InfantHubCardId;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <InfantHubPremiumSection
      sectionId={sectionId}
      cardId={cardId}
      icon={icon}
      title={title}
      badge={badge}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </InfantHubPremiumSection>
  );
}

const INFANT_HUB_DEFAULT_OPEN = new Set<string>();

// ─── Daily Activities ─────────────────────────────────────────────────────────
function DailyActivities({ ageMonths }: { ageMonths: number }) {
  const band = getInfantAgeBand(ageMonths);
  const activities = INFANT_ACTIVITIES[band] ?? [];
  return <div className="space-y-2.5">
      {activities.map(a => <div key={a.title} className="rounded-xl bg-muted dark:bg-card border border-border dark:border-border p-3 flex gap-3">
          <span className="text-2xl leading-none shrink-0">{a.emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-sm text-primary dark:text-foreground">{a.title}</p>
              <span className="text-[10px] font-bold text-primary ml-auto shrink-0">{a.duration}</span>
            </div>
            <p className="text-[12px] text-primary dark:text-muted-foreground leading-snug">{a.desc}</p>
          </div>
        </div>)}
    </div>;
}

// ─── Health & Care ────────────────────────────────────────────────────────────

type VaxRowProps = {
  v: {
    ageLabel: string;
    vaccines: readonly string[];
  };
  status: VaxStatus | undefined;
  busy: boolean;
  onSet: (ageLabel: string, status: VaxStatus | null) => void;
  tone: "amber" | "rose";
};
function VaxRow({
  v,
  status,
  busy,
  onSet,
  tone
}: VaxRowProps) {
  const {
    t
  } = useTranslation();
  const containerCls = "rounded-lg bg-muted dark:bg-card border border-border dark:border-border px-2 py-1.5";
  const labelCls = "text-[11px] font-bold text-primary dark:text-foreground";
  const subCls = "text-[11px] text-primary dark:text-muted-foreground";
  return <div className={`${containerCls} mb-1`} data-testid={`vax-row-${v.ageLabel}`}>
      <div className="flex items-start gap-2">
        {tone === "amber" ? <AlertTriangle className="h-3 w-3 text-primary shrink-0 mt-0.5" /> : <X className="h-3 w-3 text-primary shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0">
          <p className={labelCls}>
            {v.ageLabel}
            {status === "missed" && <span className="ml-2 inline-block px-1 py-px rounded text-[9px] font-bold uppercase tracking-wider bg-muted text-primary dark:bg-muted dark:text-foreground">
                {t("components.infant_hub.missed")}
              </span>}
          </p>
          <p className={subCls}>{v.vaccines.join(", ")}</p>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5 pl-5">
        <button type="button" disabled={busy} onClick={() => onSet(v.ageLabel, status === "done" ? null : "done")} aria-pressed={status === "done"} data-testid={`vax-done-${v.ageLabel}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition disabled:opacity-50 ${status === "done" ? "bg-primary border-primary text-white" : "bg-white/60 dark:bg-white/5 border-border dark:border-border text-primary dark:text-foreground hover:bg-muted dark:hover:bg-white/10"}`}>
          {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
          {t("components.infant_hub.done")}
        </button>
        <button type="button" disabled={busy} onClick={() => onSet(v.ageLabel, status === "missed" ? null : "missed")} aria-pressed={status === "missed"} data-testid={`vax-missed-${v.ageLabel}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold transition disabled:opacity-50 ${status === "missed" ? "bg-primary border-primary text-white" : "bg-white/60 dark:bg-white/5 border-border dark:border-border text-primary dark:text-foreground hover:bg-muted dark:hover:bg-white/10"}`}>
          {busy ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <X className="h-2.5 w-2.5" />}
          {t("components.infant_hub.missed_2")}
        </button>
      </div>
    </div>;
}
function HealthCare({
  childId,
  ageMonths
}: {
  childId: number;
  ageMonths: number;
}) {
  const {
    t
  } = useTranslation();
  const band = getBand(ageMonths);
  const [openIssue, setOpenIssue] = useState<string | null>(null);
  const [logMap, setLogMap] = useState<VaxLogMap>({});
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const authFetch = useAuthFetch();

  // Load logs once per child
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await authFetch(getApiUrl(`/api/vaccinations/${childId}`));
        if (!r.ok) return;
        const j = (await parseApiJson<{
          ok: boolean;
          logs: {
            ageLabel: string;
            status: VaxStatus;
          }[];
      }>(r));
        if (cancelled || !j.ok) return;
        const next: Record<string, VaxStatus> = {};
        for (const l of j.logs) next[l.ageLabel] = l.status;
        setLogMap(next);
      } catch {
        // Soft-fail; UI still works as read-only schedule
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, childId]);
  const setStatus = useCallback(async (ageLabel: string, status: VaxStatus | null) => {
    const previous = logMap[ageLabel];
    setLogMap(prev => {
      const next = {
        ...prev
      };
      if (status === null) delete next[ageLabel];else next[ageLabel] = status;
      return next;
    });
    setPendingLabel(ageLabel);
    try {
      const path = `/api/vaccinations/${childId}/${encodeURIComponent(ageLabel)}`;
      const r = status === null ? await authFetch(getApiUrl(path), {
        method: "DELETE",
      }) : await authFetch(getApiUrl(path), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status
        })
      });
      if (!r.ok) throw new Error(`status ${r.status}`);
    } catch {
      // Roll back
      setLogMap(prev => {
        const next = {
          ...prev
        };
        if (previous) next[ageLabel] = previous;else delete next[ageLabel];
        return next;
      });
      toast({
        title: "Couldn't save",
        description: "Please try again in a moment.",
        variant: "destructive"
      });
    } finally {
      setPendingLabel(null);
    }
  }, [authFetch, childId, logMap, toast]);
  const upcoming = useMemo(() => getUpcomingVaccinationsWithLog(ageMonths, logMap), [ageMonths, logMap]);
  const overdue = useMemo(() => VACCINATIONS.filter(v => v.ageMonths < ageMonths && logMap[v.ageLabel] !== "done"), [ageMonths, logMap]);
  const summary = useMemo(() => getVaccinationSummary(ageMonths, logMap), [ageMonths, logMap]);
  const relevantIssues = COMMON_ISSUES.filter(i => i.bands.includes(band));
  const completedPct = Math.round(summary.done / Math.max(1, summary.total) * 100);
  return <div className="space-y-3">
      {/* Vaccination status */}
      <div className="rounded-xl bg-muted dark:bg-card border border-border dark:border-border p-3" data-testid="vax-summary">
        <div className="flex items-center gap-2 mb-2">
          <Syringe className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-primary dark:text-foreground">
            {t("components.infant_hub.vaccination_tracker")}
          </p>
        </div>

        <p className="text-[11px] text-primary dark:text-muted-foreground mb-1">
          <span className="font-bold text-primary">
            {summary.done}
          </span>{" "}
          {t("components.infant_hub.completed")}{" "}
          <span className="font-bold text-primary">
            {summary.pending}
          </span>{" "}
          {t("components.infant_hub.pending_of")} {summary.total} {t("components.infant_hub.total")}
        </p>
        <div className="h-1.5 rounded-full bg-muted dark:bg-muted overflow-hidden mb-2">
          <div className="h-full rounded-full bg-primary transition-all" style={{
          width: `${completedPct}%`
        }} />
        </div>

        {upcoming.length > 0 && <div className="mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1">
              {t("components.infant_hub.upcoming_due_now")}
            </p>
            {upcoming.map(v => <VaxRow key={v.ageLabel} v={v} status={logMap[v.ageLabel]} busy={pendingLabel === v.ageLabel} onSet={setStatus} tone="amber" />)}
          </div>}

        {overdue.length > 0 && <div className="mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-1">
              {t("components.infant_hub.pending_past_doses_to_confirm")}
            </p>
            {overdue.map(v => <VaxRow key={v.ageLabel} v={v} status={logMap[v.ageLabel]} busy={pendingLabel === v.ageLabel} onSet={setStatus} tone="rose" />)}
          </div>}

        <p className="text-[10px] text-primary dark:text-muted-foreground leading-snug">
          {t("components.infant_hub.always_confirm_schedule_with_your_paediatrician_some_states_")}
        </p>
      </div>

      {/* Common Issues */}
      {relevantIssues.length > 0 && <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{t("components.infant_hub.common_issues_at_this_age")}</p>
          {relevantIssues.map(issue => <div key={issue.id} className="rounded-xl border border-border bg-white/50 dark:bg-white/[0.03] overflow-hidden">
              <button onClick={() => setOpenIssue(openIssue === issue.id ? null : issue.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
                <span className="text-lg">{issue.emoji}</span>
                <span className="font-semibold text-sm text-foreground flex-1">{issue.title}</span>
                {openIssue === issue.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {openIssue === issue.id && <div className="px-3 pb-3 text-[12px] text-foreground/80 leading-relaxed border-t border-border/40">
                  <div className="pt-2">{issue.content}</div>
                </div>}
            </div>)}
        </div>}
    </div>;
}

// ─── This Week's Focus ────────────────────────────────────────────────────────
function WeeklyFocus({
  childId,
  childName,
  ageMonths
}: {
  childId: number;
  childName: string;
  ageMonths: number;
}) {
  const {
    t
  } = useTranslation();
  const focus = getWeeklyFocus(childName, ageMonths);
  const doneKey = weeklyFocusDoneKey(childId);
  const [tryDone, setTryDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(doneKey) === "1";
  });
  const toggleTryDone = () => {
    const next = !tryDone;
    setTryDone(next);
    try {
      if (next) window.localStorage.setItem(doneKey, "1");
      else window.localStorage.removeItem(doneKey);
    } catch (e) { console.error("REAL ERROR:", e); }
  };
  return <div className="space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-muted to-muted dark:from-card dark:to-card border border-border dark:border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-4 w-4 text-primary fill-primary" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-foreground">{t("components.infant_hub.this_week_s_insight")}</p>
        </div>
        <p className="font-bold text-sm text-primary dark:text-foreground leading-snug mb-2">
          {focus.headline}
        </p>
        <p className="text-[12px] text-primary dark:text-muted-foreground leading-relaxed">
          {focus.body}
        </p>
      </div>
      <button
        type="button"
        onClick={toggleTryDone}
        className={["w-full rounded-xl border p-3 flex gap-2.5 text-left transition-colors",
          tryDone
            ? "bg-primary/10 border-primary/40"
            : "bg-muted dark:bg-card border-border dark:border-border hover:border-primary/30",
        ].join(" ")}
      >
        <span className={["mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          tryDone ? "bg-primary border-primary text-white" : "border-border",
        ].join(" ")}>
          {tryDone && <CheckCircle2 className="h-3 w-3" />}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-primary mb-0.5">{t("components.infant_hub.try_this_week")}</p>
          <p className={`text-[12px] leading-snug ${tryDone ? "text-muted-foreground line-through" : "text-primary dark:text-muted-foreground"}`}>
            {focus.next}
          </p>
        </div>
      </button>
    </div>;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function InfantHub({
  childId,
  childName,
  ageMonths
}: InfantHubProps) {
  const {
    t,
    i18n
  } = useTranslation();
  const lang = langOf(i18n.language);
  const [active, setActive] = useState<InfantCategory>("sleep");
  const [tipIndex, setTipIndex] = useState(0);
  const tips = useMemo(() => getTipsForAge(ageMonths, active), [ageMonths, active]);
  const insight = useMemo(() => getAmyInsight(ageMonths, active), [ageMonths, active]);
  const currentTip = tips.length > 0 ? tips[tipIndex % tips.length] : null;
  const ageLabel = formatAge(Math.floor(ageMonths / 12), ageMonths % 12);
  const {
    data: activation,
    isPending: activationPending,
    isFetching: activationFetching,
    isError: activationError,
  } = useInfantActivation(childId);
  const activationLoading =
    activationPending && activationFetching && !activationError;
  const showActivationUi = shouldShowInfantActivationUi(activation, childId);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(INFANT_HUB_DEFAULT_OPEN),
  );
  const [moreOpen, setMoreOpen] = useState(false);

  const setSectionOpen = useCallback((sectionId: string, isOpen: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(sectionId);
      else next.delete(sectionId);
      return next;
    });
  }, []);

  const MORE_SECTION_IDS = useMemo(
    () =>
      new Set([
        "infant-wellbeing",
        "infant-doctor",
        "infant-coparent",
        "infant-sounds",
        "infant-weekly-focus",
        "infant-amy-suggests",
        "infant-coaching",
        "infant-activities",
      ]),
    [],
  );

  const scrollToSection = useCallback(
    (sectionId: string) => {
      if (isInfantCareLivingV1Enabled() && MORE_SECTION_IDS.has(sectionId)) {
        setMoreOpen(true);
      }
      // Cry may live under More when not the recommended primary.
      if (
        isInfantCareLivingV1Enabled() &&
        sectionId === "infant-cry" &&
        recommendInfantCareAction(ageMonths).sectionId !== "infant-cry"
      ) {
        setMoreOpen(true);
      }
      setSectionOpen(sectionId, true);
      requestAnimationFrame(() => {
        document
          .getElementById(sectionId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [MORE_SECTION_IDS, ageMonths, setSectionOpen],
  );

  useEffect(() => {
    if (ageMonths < 0 || ageMonths >= 24) return;
    trackInfantHubOpened(childId, ageMonths);

    const resolveSectionFromHash = (): string | null => {
      const raw =
        typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      if (raw.startsWith("infant-")) return raw;
      return raw.split("#").find((part) => part.startsWith("infant-")) ?? null;
    };

    const handleHash = () => {
      const section = resolveSectionFromHash();
      if (section) scrollToSection(section);
    };

    const handleOpenSection = (event: Event) => {
      const sectionId = (event as CustomEvent<{ sectionId?: string }>).detail?.sectionId;
      if (sectionId?.startsWith("infant-")) scrollToSection(sectionId);
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    window.addEventListener(INFANT_HUB_OPEN_SECTION_EVENT, handleOpenSection);
    return () => {
      window.removeEventListener("hashchange", handleHash);
      window.removeEventListener(INFANT_HUB_OPEN_SECTION_EVENT, handleOpenSection);
    };
  }, [ageMonths, childId, scrollToSection]);

  const living = isInfantCareLivingV1Enabled();
  const careRecommend = useMemo(
    () => recommendInfantCareAction(ageMonths),
    [ageMonths],
  );

  if (ageMonths < 0 || ageMonths >= 24) return null;

  const crySection = (
    <IHSection
      sectionId="infant-cry"
      icon={<MessageCircle className="h-4 w-4" />}
      title={t("components.infant_hub.cry_insight")}
      badge={living ? undefined : t("components.infant_hub.badge_smart")}
      open={openSections.has("infant-cry")}
      onOpenChange={(v) => setSectionOpen("infant-cry", v)}
    >
      <div className="rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-400/25 px-3 py-2.5 mb-3 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
        <p className="text-[12px] text-foreground/90 leading-snug">
          {t(
            "components.infant_hub.cry_insight_hero",
            "Not sure why baby is crying? Record 10 seconds and Amy will help identify likely causes.",
          )}
        </p>
      </div>
      <DiaperBurpLogger childId={childId} ageMonths={ageMonths} compact />
      <div className="mt-3">
        <CryInsight childId={childId} childName={childName} ageMonths={ageMonths} />
      </div>
    </IHSection>
  );

  const sleepSection = (
    <IHSection
      sectionId="infant-sleep"
      icon={<BedDouble className="h-4 w-4" />}
      title={t("components.infant_hub.sleep_system")}
      badge={living ? undefined : "Live"}
      open={openSections.has("infant-sleep")}
      onOpenChange={(v) => setSectionOpen("infant-sleep", v)}
    >
      <div className="space-y-5">
        <SleepPredict childId={childId} childName={childName} ageMonths={ageMonths} />
        <WakeWindowSystem childId={childId} childName={childName} ageMonths={ageMonths} />
        <SleepIssueDetector childId={childId} childName={childName} ageMonths={ageMonths} />
        <RoutineBuilder childName={childName} ageMonths={ageMonths} />
        <SleepWeeklyInsights childId={childId} childName={childName} ageMonths={ageMonths} />
        <InfantSleepCoachingPanel childId={childId} childName={childName} ageMonths={ageMonths} />
        <InfantWeeklySleepReport childId={childId} childName={childName} ageMonths={ageMonths} />
        <InfantAskAmyCta
          childName={childName}
          ageMonths={ageMonths}
          question={`My ${ageMonths}-month-old baby ${childName} is having sleep trouble. Based on typical wake windows at this age, what should I try tonight?`}
          label={t(
            "components.infant_hub.ask_amy_sleep",
            "Ask Amy for tailored sleep guidance",
          )}
          testId="infant-ask-amy-sleep"
        />
      </div>
    </IHSection>
  );

  const feedingSection = (
    <IHSection
      sectionId="infant-feeding"
      icon={<Flame className="h-4 w-4" />}
      title={t("components.infant_hub.feeding_tracker")}
      open={openSections.has("infant-feeding")}
      onOpenChange={(v) => setSectionOpen("infant-feeding", v)}
    >
      <InfantFeedingTracker childId={childId} ageMonths={ageMonths} lang={lang} />
      <InfantFeedingPlanPanel childId={childId} childName={childName} ageMonths={ageMonths} />
      <div className="mt-4 pt-4 border-t border-border/40">
        <DiaperBurpLogger childId={childId} ageMonths={ageMonths} />
      </div>
      <InfantAskAmyCta
        childName={childName}
        ageMonths={ageMonths}
        question={
          ageMonths >= 6
            ? `My ${ageMonths}-month-old baby ${childName} is starting solids. What foods and schedule should I try this week?`
            : `My ${ageMonths}-month-old baby ${childName} — how often should I feed and what signs mean they're getting enough milk?`
        }
        label={t(
          "components.infant_hub.ask_amy_feeding",
          "Ask Amy for feeding guidance",
        )}
        testId="infant-ask-amy-feeding"
      />
    </IHSection>
  );

  const growthSection = (
    <IHSection
      sectionId="infant-growth"
      icon={<TrendingUp className="h-4 w-4" />}
      title={t("components.infant_hub.growth", "Growth tracking")}
      open={openSections.has("infant-growth")}
      onOpenChange={(v) => setSectionOpen("infant-growth", v)}
    >
      <GrowthTracker childId={childId} ageMonths={ageMonths} activation={activation} />
    </IHSection>
  );

  const healthSection = (
    <IHSection
      sectionId="infant-health"
      icon={<Syringe className="h-4 w-4" />}
      title={t("components.infant_hub.health_care")}
      open={openSections.has("infant-health")}
      onOpenChange={(v) => setSectionOpen("infant-health", v)}
    >
      <HealthCare childId={childId} ageMonths={ageMonths} />
    </IHSection>
  );

  const milestonesSection = (
    <IHSection
      sectionId="infant-milestones"
      icon={<Activity className="h-4 w-4" />}
      title={t("components.infant_hub.milestone_buddy")}
      badge={living ? undefined : t("components.infant_hub.badge_track")}
      open={openSections.has("infant-milestones")}
      onOpenChange={(v) => setSectionOpen("infant-milestones", v)}
    >
      <BuddyMilestonePlanner childId={childId} childName={childName} ageMonths={ageMonths} />
    </IHSection>
  );

  const moreSections = (
    <>
      {careRecommend.sectionId !== "infant-cry" ? crySection : null}
      <IHSection
        sectionId="infant-wellbeing"
        icon={<Heart className="h-4 w-4" />}
        title={t("components.infant_hub.wellbeing", "Parent wellbeing")}
        open={openSections.has("infant-wellbeing")}
        onOpenChange={(v) => setSectionOpen("infant-wellbeing", v)}
      >
        <ParentWellbeing childId={childId} ageMonths={ageMonths} />
      </IHSection>
      <IHSection
        sectionId="infant-doctor"
        icon={<FileDown className="h-4 w-4" />}
        title={t("components.infant_hub.doctor_report", "Doctor visit")}
        open={openSections.has("infant-doctor")}
        onOpenChange={(v) => setSectionOpen("infant-doctor", v)}
      >
        <DoctorVisitReport
          childId={childId}
          childName={childName}
          ageMonths={ageMonths}
        />
      </IHSection>
      {FF_CO_PARENT ? (
        <IHSection
          sectionId="infant-coparent"
          icon={<Users className="h-4 w-4" />}
          title={t("components.infant_hub.coparent", "Co-parent")}
          open={openSections.has("infant-coparent")}
          onOpenChange={(v) => setSectionOpen("infant-coparent", v)}
        >
          <CoParentPanel childId={childId} ageMonths={ageMonths} />
        </IHSection>
      ) : null}
      <InfantNotificationPrefs childId={childId} ageMonths={ageMonths} />
      <IHSection
        sectionId="infant-sounds"
        cardId="sounds"
        icon={<Music2 className="h-4 w-4" />}
        title={t("components.infant_hub.white_noise_lullabies")}
        open={openSections.has("infant-sounds")}
        onOpenChange={(v) => setSectionOpen("infant-sounds", v)}
      >
        <WhiteNoiseLullaby ageMonths={ageMonths} childId={String(childId)} />
      </IHSection>
      <IHSection
        sectionId="infant-weekly-focus"
        cardId="weekly-focus"
        icon={<Star className="h-4 w-4" />}
        title={t("components.infant_hub.weekly_focus")}
        open={openSections.has("infant-weekly-focus")}
        onOpenChange={(v) => setSectionOpen("infant-weekly-focus", v)}
      >
        <WeeklyFocus childId={childId} childName={childName} ageMonths={ageMonths} />
      </IHSection>
      <IHSection
        sectionId="infant-amy-suggests"
        cardId="amy-suggests"
        icon={<Brain className="h-4 w-4" />}
        title={t("infant_hub.amy_suggests")}
        open={openSections.has("infant-amy-suggests")}
        onOpenChange={(v) => setSectionOpen("infant-amy-suggests", v)}
      >
        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {INFANT_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setActive(cat.key);
                  setTipIndex(0);
                }}
                className={[
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border",
                  active === cat.key
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground",
                ].join(" ")}
              >
                {cat.emoji} {t(`infant_hub.tabs.${cat.key}`)}
              </button>
            ))}
          </div>
          <p className="text-sm">
            <span className="mr-1">{insight.emoji}</span>
            {pickLang(insight, lang)}
          </p>
          {currentTip ? (
            <p className="text-sm text-muted-foreground">{pickLang(currentTip.body, lang)}</p>
          ) : null}
        </div>
      </IHSection>
      <IHSection
        sectionId="infant-coaching"
        cardId="coaching"
        icon={<ListChecks className="h-4 w-4" />}
        title={t("components.infant_hub.parent_coaching")}
        open={openSections.has("infant-coaching")}
        onOpenChange={(v) => setSectionOpen("infant-coaching", v)}
      >
        <BabyCuesEngine childName={childName} ageMonths={ageMonths} />
        <div className="mt-4">
          <CommunicationCoaching ageMonths={ageMonths} />
        </div>
      </IHSection>
      {(INFANT_ACTIVITIES[getInfantAgeBand(ageMonths)] ?? []).length > 0 ? (
        <IHSection
          sectionId="infant-activities"
          cardId="activities"
          icon={<Zap className="h-4 w-4" />}
          title={t("components.infant_hub.today_s_activities")}
          open={openSections.has("infant-activities")}
          onOpenChange={(v) => setSectionOpen("infant-activities", v)}
        >
          <DailyActivities ageMonths={ageMonths} />
        </IHSection>
      ) : null}
      {/* Progress supports — never leads Today's Care */}
      {!showActivationUi ? (
        <BabyTodayCard
          childId={childId}
          childName={childName}
          activation={activation}
          onViewFullPlan={() => scrollToSection("infant-sleep")}
        />
      ) : null}
      <WeeklyProgressReport
        childId={childId}
        childName={childName}
        ageMonths={ageMonths}
        activation={activation}
      />
    </>
  );

  if (living) {
    const quietPrimary: Record<string, ReactNode> = {
      "infant-sleep": sleepSection,
      "infant-feeding": feedingSection,
      "infant-growth": growthSection,
      "infant-health": healthSection,
      "infant-milestones": milestonesSection,
    };
    if (careRecommend.sectionId === "infant-cry") {
      quietPrimary["infant-cry"] = crySection;
    }
    const quietOrder =
      careRecommend.sectionId === "infant-cry"
        ? [
            "infant-cry",
            "infant-sleep",
            "infant-feeding",
            "infant-growth",
            "infant-health",
            "infant-milestones",
          ]
        : [
            careRecommend.sectionId,
            ...["infant-sleep", "infant-feeding", "infant-growth", "infant-health", "infant-milestones"].filter(
              (id) => id !== careRecommend.sectionId,
            ),
          ];

    return (
      <div
        className="infant-care-living"
        data-section-id="infant-hub"
        data-ph-pack="infant-2"
        data-ph-visual="regression-fix"
        data-fe-shot={INFANT_CARE_MEMORY.shot}
        data-testid="infant-care-living"
      >
        <div className="ic-living-surface" data-testid="infant-care-living-surface">
          <header className="ic-today-hero" data-testid="infant-care-today-hero">
            <div
              className="fe-memory-mount ic-today-memory"
              data-testid="infant-care-visual-memory"
              data-fe-shot={INFANT_CARE_MEMORY.shot}
            >
              <div className="fe-memory-spill" aria-hidden="true" />
              <div className="fe-memory">
                <img
                  src={INFANT_CARE_MEMORY.src}
                  alt={INFANT_CARE_MEMORY.alt}
                  draggable={false}
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="fe-memory-veil" aria-hidden="true" />
                <div className="fe-memory-glass" aria-hidden="true" />
                <div className="fe-memory-grain" aria-hidden="true" />
                <div className="ic-today-readability" aria-hidden="true" />
                <div className="ic-today-copy">
                  <p className="ic-today-eyebrow">
                    {t("infant_care.living.eyebrow", "Today's Care")}
                  </p>
                  <h2 className="ic-today-title">
                    {t("infant_care.living.title", {
                      name: childName,
                      defaultValue: `What should I care for with ${childName}?`,
                    })}
                  </h2>
                  <p className="ic-today-purpose">
                    {t("infant_care.living.purpose", {
                      age: ageLabel,
                      defaultValue: "One calm next step — sleep, feed, comfort, growth.",
                    })}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="ic-recommend-btn"
              data-testid="infant-care-recommend"
              onClick={() => scrollToSection(careRecommend.sectionId)}
            >
              <span className="ic-recommend-cue">{careRecommend.label}</span>
              <span className="ic-recommend-title">{careRecommend.title}</span>
              <span className="ic-recommend-purpose">{careRecommend.purpose}</span>
            </button>
          </header>

          {activationLoading ? (
            <div className="px-3 pb-2">
              <InfantActivationFlowSkeleton />
            </div>
          ) : showActivationUi && activation ? (
            <div className="px-3 pb-2">
              <InfantActivationFlow
                childId={childId}
                childName={childName}
                ageMonths={ageMonths}
                activation={activation}
                onNavigate={scrollToSection}
              />
            </div>
          ) : null}

          <div className="ic-quiet-band">
            <p className="ic-quiet-label">
              {t("infant_care.living.quiet_paths", "Quiet care paths")}
            </p>
            <div className="ic-quiet-list" data-testid="infant-care-quiet-paths">
              {quietOrder.map((id) => (
                <div key={id}>{quietPrimary[id]}</div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <button
            type="button"
            className="ic-more-toggle"
            data-testid="infant-care-more-toggle"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            {moreOpen
              ? t("infant_care.living.more_hide", "Hide more care")
              : t("infant_care.living.more_show", "More care")}
          </button>
          {moreOpen ? (
            <div className="ic-more-body" data-testid="infant-care-more-body">
              {moreSections}
            </div>
          ) : null}
        </div>

        <p className="ic-support-note">
          {t(
            "infant_care.living.continuity",
            "We'll continue helping as your child grows.",
          )}
        </p>

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground px-1">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
          <p>{t("infant_hub.safe_disclaimer")}</p>
        </div>
      </div>
    );
  }

  // Legacy catalogue layout (VITE_FF_INFANT_CARE_LIVING_V1=0)
  return (
    <div className="space-y-4" data-section-id="infant-hub">
      <div className="px-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
          👶 {t("infant_hub.title")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("infant_hub.subtitle", { name: childName, age: ageLabel })}
        </p>
      </div>

      {activationLoading ? (
        <InfantActivationFlowSkeleton />
      ) : showActivationUi && activation ? (
        <InfantActivationFlow
          childId={childId}
          childName={childName}
          ageMonths={ageMonths}
          activation={activation}
          onNavigate={scrollToSection}
        />
      ) : (
        <BabyTodayCard
          childId={childId}
          childName={childName}
          activation={activation}
          onViewFullPlan={() => scrollToSection("infant-sleep")}
        />
      )}
      <WeeklyProgressReport
        childId={childId}
        childName={childName}
        ageMonths={ageMonths}
        activation={activation}
      />

      {crySection}
      {sleepSection}
      {milestonesSection}
      {feedingSection}
      {growthSection}

      <IHSection
        sectionId="infant-wellbeing"
        icon={<Heart className="h-4 w-4" />}
        title={t("components.infant_hub.wellbeing", "Parent wellbeing")}
        open={openSections.has("infant-wellbeing")}
        onOpenChange={(v) => setSectionOpen("infant-wellbeing", v)}
      >
        <ParentWellbeing childId={childId} ageMonths={ageMonths} />
      </IHSection>

      {healthSection}

      <IHSection
        sectionId="infant-doctor"
        icon={<FileDown className="h-4 w-4" />}
        title={t("components.infant_hub.doctor_report", "Doctor visit")}
        open={openSections.has("infant-doctor")}
        onOpenChange={(v) => setSectionOpen("infant-doctor", v)}
      >
        <DoctorVisitReport
          childId={childId}
          childName={childName}
          ageMonths={ageMonths}
        />
      </IHSection>

      {FF_CO_PARENT ? (
        <IHSection
          sectionId="infant-coparent"
          icon={<Users className="h-4 w-4" />}
          title={t("components.infant_hub.coparent", "Co-parent")}
          open={openSections.has("infant-coparent")}
          onOpenChange={(v) => setSectionOpen("infant-coparent", v)}
        >
          <CoParentPanel childId={childId} ageMonths={ageMonths} />
        </IHSection>
      ) : null}

      <InfantNotificationPrefs childId={childId} ageMonths={ageMonths} />

      <IHSection
        sectionId="infant-sounds"
        cardId="sounds"
        icon={<Music2 className="h-4 w-4" />}
        title={t("components.infant_hub.white_noise_lullabies")}
        open={openSections.has("infant-sounds")}
        onOpenChange={(v) => setSectionOpen("infant-sounds", v)}
      >
        <WhiteNoiseLullaby ageMonths={ageMonths} childId={String(childId)} />
      </IHSection>

      <IHSection
        sectionId="infant-weekly-focus"
        cardId="weekly-focus"
        icon={<Star className="h-4 w-4" />}
        title={t("components.infant_hub.weekly_focus")}
        open={openSections.has("infant-weekly-focus")}
        onOpenChange={(v) => setSectionOpen("infant-weekly-focus", v)}
      >
        <WeeklyFocus childId={childId} childName={childName} ageMonths={ageMonths} />
      </IHSection>

      <IHSection
        sectionId="infant-amy-suggests"
        cardId="amy-suggests"
        icon={<Brain className="h-4 w-4" />}
        title={t("infant_hub.amy_suggests")}
        open={openSections.has("infant-amy-suggests")}
        onOpenChange={(v) => setSectionOpen("infant-amy-suggests", v)}
      >
        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {INFANT_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => {
                  setActive(cat.key);
                  setTipIndex(0);
                }}
                className={[
                  "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border",
                  active === cat.key
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground",
                ].join(" ")}
              >
                {cat.emoji} {t(`infant_hub.tabs.${cat.key}`)}
              </button>
            ))}
          </div>
          <p className="text-sm">
            <span className="mr-1">{insight.emoji}</span>
            {pickLang(insight, lang)}
          </p>
          {currentTip ? (
            <p className="text-sm text-muted-foreground">{pickLang(currentTip.body, lang)}</p>
          ) : null}
        </div>
      </IHSection>

      <IHSection
        sectionId="infant-coaching"
        cardId="coaching"
        icon={<ListChecks className="h-4 w-4" />}
        title={t("components.infant_hub.parent_coaching")}
        open={openSections.has("infant-coaching")}
        onOpenChange={(v) => setSectionOpen("infant-coaching", v)}
      >
        <BabyCuesEngine childName={childName} ageMonths={ageMonths} />
        <div className="mt-4">
          <CommunicationCoaching ageMonths={ageMonths} />
        </div>
      </IHSection>

      {(INFANT_ACTIVITIES[getInfantAgeBand(ageMonths)] ?? []).length > 0 ? (
        <IHSection
          sectionId="infant-activities"
          cardId="activities"
          icon={<Zap className="h-4 w-4" />}
          title={t("components.infant_hub.today_s_activities")}
          open={openSections.has("infant-activities")}
          onOpenChange={(v) => setSectionOpen("infant-activities", v)}
        >
          <DailyActivities ageMonths={ageMonths} />
        </IHSection>
      ) : null}

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground px-1">
        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <p>{t("infant_hub.safe_disclaimer")}</p>
      </div>
    </div>
  );
}