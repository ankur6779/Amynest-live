import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
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
import { InfantNotificationPrefs } from "@/components/infant/infant-notification-prefs";
import { formatAge } from "@/lib/age-groups";
import { INFANT_HUB_OPEN_SECTION_EVENT } from "@/lib/hub-activity-cross-link";
import { trackInfantHubOpened } from "@/lib/infant-hub-analytics";
import { useToast } from "@/hooks/use-toast";
import { HubCollapsibleSubTile } from "@/components/hub-collapsible-sub-tile";
import { InfantAskAmyCta } from "@/components/infant/infant-ask-amy-cta";
import { InfantSleepCoachingPanel } from "@/components/infant/infant-sleep-coaching-panel";
import { InfantFeedingPlanPanel } from "@/components/infant/infant-feeding-plan-panel";
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
  icon,
  title,
  badge,
  defaultOpen = false,
  open,
  onOpenChange,
  accentClass = "bg-gradient-to-br from-primary to-primary",
  cardColor,
  tintRgb,
  children
}: {
  sectionId?: string;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  accentClass?: string;
  cardColor?: string;
  tintRgb?: string;
  children: React.ReactNode;
}) {
  const tile = (
    <HubCollapsibleSubTile
      icon={icon}
      title={title}
      badge={badge}
      accentClass={accentClass}
      tintRgb={tintRgb}
      cardClass={cardColor}
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
    >
      {children}
    </HubCollapsibleSubTile>
  );
  if (!sectionId) return tile;
  return (
    <section id={sectionId} className="scroll-mt-24">
      {tile}
    </section>
  );
}

const INFANT_HUB_DEFAULT_OPEN = new Set([
  "infant-cry",
  "infant-sleep",
  "infant-milestones",
]);

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

  // Load logs once per child
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(getApiUrl(`/api/vaccinations/${childId}`), {
          credentials: "include"
        });
        if (!r.ok) return;
        const j = (await r.json()) as {
          ok: boolean;
          logs: {
            ageLabel: string;
            status: VaxStatus;
          }[];
        };
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
  }, [childId]);
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
      const r = status === null ? await fetch(getApiUrl(path), {
        method: "DELETE",
        credentials: "include"
      }) : await fetch(getApiUrl(path), {
        method: "PUT",
        credentials: "include",
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
  }, [childId, logMap, toast]);
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
  const {
    toast
  } = useToast();
  const [active, setActive] = useState<InfantCategory>("sleep");
  const [tipIndex, setTipIndex] = useState(0);
  const tips = useMemo(() => getTipsForAge(ageMonths, active), [ageMonths, active]);
  const insight = useMemo(() => getAmyInsight(ageMonths, active), [ageMonths, active]);
  const currentTip = tips.length > 0 ? tips[tipIndex % tips.length] : null;
  const ageLabel = formatAge(Math.floor(ageMonths / 12), ageMonths % 12);
  const { data: activation, isLoading: activationLoading } = useInfantActivation(childId);
  const showActivationUi = shouldShowInfantActivationUi(activation, childId);
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(INFANT_HUB_DEFAULT_OPEN),
  );

  const setSectionOpen = useCallback((sectionId: string, isOpen: boolean) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (isOpen) next.add(sectionId);
      else next.delete(sectionId);
      return next;
    });
  }, []);

  const scrollToSection = useCallback(
    (sectionId: string) => {
      setSectionOpen(sectionId, true);
      requestAnimationFrame(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    [setSectionOpen],
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

  if (ageMonths < 0 || ageMonths >= 24) return null;

  return (
    <div className="space-y-4" data-section-id="infant-hub">
      <div className="px-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">👶 {t("infant_hub.title")}</p>
        <p className="text-xs text-muted-foreground">{t("infant_hub.subtitle", { name: childName, age: ageLabel })}</p>
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

      <IHSection
        sectionId="infant-cry"
        icon={<MessageCircle className="h-4 w-4" />}
        title={t("components.infant_hub.cry_insight")}
        accentClass="bg-gradient-to-br from-rose-400 to-pink-500"
        cardColor="linear-gradient(135deg,rgba(251,113,133,0.28)0%,rgba(236,72,153,0.13)100%)"
        badge={t("components.infant_hub.badge_smart")}
        open={openSections.has("infant-cry")}
        onOpenChange={(v) => setSectionOpen("infant-cry", v)}
      >
          <div className="rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-400/25 px-3 py-2.5 mb-3 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-foreground/90 leading-snug">
              {t("components.infant_hub.cry_insight_hero", "Not sure why baby is crying? Record 10 seconds and Amy will help identify likely causes.")}
            </p>
          </div>
          <DiaperBurpLogger childId={childId} ageMonths={ageMonths} compact />
          <div className="mt-3"><CryInsight childId={childId} childName={childName} ageMonths={ageMonths} /></div>
      </IHSection>

      <IHSection
        sectionId="infant-sleep"
        icon={<BedDouble className="h-4 w-4" />}
        title={t("components.infant_hub.sleep_system")}
        accentClass="bg-gradient-to-br from-blue-400 to-indigo-500"
        cardColor="linear-gradient(135deg,rgba(96,165,250,0.28)0%,rgba(99,102,241,0.13)100%)"
        badge="Live"
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
              label={t("components.infant_hub.ask_amy_sleep", "Ask Amy for tailored sleep guidance")}
              testId="infant-ask-amy-sleep"
            />
          </div>
      </IHSection>

      <IHSection
        sectionId="infant-milestones"
        icon={<Activity className="h-4 w-4" />}
        title={t("components.infant_hub.milestone_buddy")}
        accentClass="bg-gradient-to-br from-violet-400 to-purple-500"
        cardColor="linear-gradient(135deg,rgba(167,139,250,0.28)0%,rgba(168,85,247,0.13)100%)"
        badge={t("components.infant_hub.badge_track")}
        open={openSections.has("infant-milestones")}
        onOpenChange={(v) => setSectionOpen("infant-milestones", v)}
      >
          <BuddyMilestonePlanner childId={childId} childName={childName} ageMonths={ageMonths} />
      </IHSection>

      <IHSection
        sectionId="infant-feeding"
        icon={<Flame className="h-4 w-4" />}
        title={t("components.infant_hub.feeding_tracker")}
        accentClass="bg-gradient-to-br from-red-400 to-orange-500"
        cardColor="linear-gradient(135deg,rgba(248,113,113,0.28)0%,rgba(249,115,22,0.13)100%)"
        open={openSections.has("infant-feeding")}
        onOpenChange={(v) => setSectionOpen("infant-feeding", v)}
      >
          <InfantFeedingTracker childId={childId} ageMonths={ageMonths} lang={lang} />
          <InfantFeedingPlanPanel childId={childId} childName={childName} ageMonths={ageMonths} />
          <div className="mt-4 pt-4 border-t border-border/40"><DiaperBurpLogger childId={childId} ageMonths={ageMonths} /></div>
          {ageMonths >= 6 ? (
            <InfantAskAmyCta
              childName={childName}
              ageMonths={ageMonths}
              question={`My ${ageMonths}-month-old baby ${childName} is starting solids. What foods and schedule should I try this week?`}
              label={t("components.infant_hub.ask_amy_feeding", "Ask Amy for feeding guidance")}
              testId="infant-ask-amy-feeding"
            />
          ) : (
            <InfantAskAmyCta
              childName={childName}
              ageMonths={ageMonths}
              question={`My ${ageMonths}-month-old baby ${childName} — how often should I feed and what signs mean they're getting enough milk?`}
              label={t("components.infant_hub.ask_amy_feeding", "Ask Amy for feeding guidance")}
              testId="infant-ask-amy-feeding"
            />
          )}
      </IHSection>

      <IHSection
        sectionId="infant-growth"
        icon={<TrendingUp className="h-4 w-4" />}
        title={t("components.infant_hub.growth", "Growth tracking")}
        accentClass="bg-gradient-to-br from-emerald-400 to-teal-500"
        open={openSections.has("infant-growth")}
        onOpenChange={(v) => setSectionOpen("infant-growth", v)}
      >
        <GrowthTracker childId={childId} ageMonths={ageMonths} activation={activation} />
      </IHSection>

      <IHSection
        sectionId="infant-wellbeing"
        icon={<Heart className="h-4 w-4" />}
        title={t("components.infant_hub.wellbeing", "Parent wellbeing")}
        accentClass="bg-gradient-to-br from-pink-400 to-rose-500"
        open={openSections.has("infant-wellbeing")}
        onOpenChange={(v) => setSectionOpen("infant-wellbeing", v)}
      >
        <ParentWellbeing childId={childId} ageMonths={ageMonths} />
      </IHSection>

      <IHSection
        sectionId="infant-health"
        icon={<Syringe className="h-4 w-4" />}
        title={t("components.infant_hub.health_care")}
        accentClass="bg-gradient-to-br from-teal-400 to-cyan-500"
        open={openSections.has("infant-health")}
        onOpenChange={(v) => setSectionOpen("infant-health", v)}
      >
        <HealthCare childId={childId} ageMonths={ageMonths} />
      </IHSection>

      <IHSection
        sectionId="infant-doctor"
        icon={<FileDown className="h-4 w-4" />}
        title={t("components.infant_hub.doctor_report", "Doctor visit")}
        accentClass="bg-gradient-to-br from-cyan-400 to-blue-500"
        open={openSections.has("infant-doctor")}
        onOpenChange={(v) => setSectionOpen("infant-doctor", v)}
      >
        <DoctorVisitReport childId={childId} childName={childName} ageMonths={ageMonths} />
      </IHSection>

      <IHSection
        sectionId="infant-coparent"
        icon={<Users className="h-4 w-4" />}
        title={t("components.infant_hub.coparent", "Co-parent")}
        accentClass="bg-gradient-to-br from-indigo-400 to-violet-500"
        open={openSections.has("infant-coparent")}
        onOpenChange={(v) => setSectionOpen("infant-coparent", v)}
      >
        <CoParentPanel childId={childId} ageMonths={ageMonths} />
      </IHSection>

      <InfantNotificationPrefs childId={childId} ageMonths={ageMonths} />

      <IHSection
        icon={<Music2 className="h-4 w-4" />}
        title={t("components.infant_hub.white_noise_lullabies")}
        accentClass="bg-gradient-to-br from-cyan-400 to-teal-500"
        open={openSections.has("infant-sounds")}
        onOpenChange={(v) => setSectionOpen("infant-sounds", v)}
      >
        <WhiteNoiseLullaby ageMonths={ageMonths} />
      </IHSection>

      <IHSection
        icon={<Star className="h-4 w-4" />}
        title={t("components.infant_hub.weekly_focus")}
        accentClass="bg-gradient-to-br from-amber-400 to-yellow-500"
        open={openSections.has("infant-weekly-focus")}
        onOpenChange={(v) => setSectionOpen("infant-weekly-focus", v)}
      >
        <WeeklyFocus childId={childId} childName={childName} ageMonths={ageMonths} />
      </IHSection>

      <IHSection
        icon={<Brain className="h-4 w-4" />}
        title={t("infant_hub.amy_suggests")}
        accentClass="bg-gradient-to-br from-purple-400 to-indigo-500"
        open={openSections.has("infant-amy-suggests")}
        onOpenChange={(v) => setSectionOpen("infant-amy-suggests", v)}
      >
        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {INFANT_CATEGORIES.map((cat) => (
              <button key={cat.key} type="button" onClick={() => { setActive(cat.key); setTipIndex(0); }} className={["shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border", active === cat.key ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"].join(" ")}>
                {cat.emoji} {t(`infant_hub.tabs.${cat.key}`)}
              </button>
            ))}
          </div>
          <p className="text-sm"><span className="mr-1">{insight.emoji}</span>{pickLang(insight, lang)}</p>
          {currentTip && <p className="text-sm text-muted-foreground">{pickLang(currentTip.body, lang)}</p>}
        </div>
      </IHSection>

      <IHSection
        icon={<ListChecks className="h-4 w-4" />}
        title={t("components.infant_hub.parent_coaching")}
        accentClass="bg-gradient-to-br from-purple-400 to-indigo-500"
        open={openSections.has("infant-coaching")}
        onOpenChange={(v) => setSectionOpen("infant-coaching", v)}
      >
        <BabyCuesEngine childName={childName} ageMonths={ageMonths} />
        <div className="mt-4"><CommunicationCoaching ageMonths={ageMonths} /></div>
      </IHSection>

      {(INFANT_ACTIVITIES[getInfantAgeBand(ageMonths)] ?? []).length > 0 && (
        <IHSection
          icon={<Zap className="h-4 w-4" />}
          title={t("components.infant_hub.today_s_activities")}
          accentClass="bg-gradient-to-br from-emerald-400 to-green-500"
          open={openSections.has("infant-activities")}
          onOpenChange={(v) => setSectionOpen("infant-activities", v)}
        >
          <DailyActivities ageMonths={ageMonths} />
        </IHSection>
      )}

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground px-1">
        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
        <p>{t("infant_hub.safe_disclaimer")}</p>
      </div>
    </div>
  );
}