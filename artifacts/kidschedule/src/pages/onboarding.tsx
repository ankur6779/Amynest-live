import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useWebPush } from "@/hooks/use-web-push";

// ─── Types ─────────────────────────────────────────────────────────────────
type AgeGroup = "infant" | "toddler" | "kid";

interface ChildData {
  name: string;
  dob: string;
  age: number;
  ageMonths: number;
  ageGroup: AgeGroup;
  isSchoolGoing: boolean;
  childClass: string;
  schoolStartTime: string;
  schoolEndTime: string;
  schoolDays: number[] | null; // ISO weekdays (1=Mon..7=Sun); null when not school-going
  wakeUpTime: string;
  sleepTime: string;
  foodType: string;
  dietNote: string;
  feedingType?: string;   // infants only
  sleepPattern?: string;  // infants only
}

interface ParentData {
  name: string;
  role: string;
  workType: string;
  region: string;
  mobileNumber: string;
  allergies: string;
}

interface ChatMessage {
  role: "amy" | "user";
  text: string;
}

type Step =
  | "intro"
  | "child-name" | "child-dob"
  | "infant-feeding" | "infant-sleep"               // infant path (age < 2)
  | "child-school" | "child-class"                  // standard path (age >= 2)
  | "child-school-start" | "child-school-end" | "child-school-days"
  | "child-wake" | "child-sleep"
  | "add-more"
  | "parent-name" | "parent-role" | "parent-work"
  | "parent-region" | "parent-mobile" | "parent-allergies"
  | "saving" | "done" | "notifications";

// ─── Helpers ────────────────────────────────────────────────────────────────
function dobToAge(dob: string): { years: number; months: number } {
  const born = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  let months = now.getMonth() - born.getMonth();
  if (months < 0) { years--; months += 12; }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}

function to24h(display: string): string {
  // "7:30 AM" → "07:30", "3:00 PM" → "15:00"
  const [time, period] = display.split(" ");
  const [h, m] = time.split(":").map(Number);
  const hour = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
  return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const WAKE_OPTS = ["5:30 AM", "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM"];
const SLEEP_OPTS = ["8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM", "10:30 PM", "11:00 PM"];
const SCHOOL_START_OPTS = ["7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM"];
const SCHOOL_END_OPTS = ["12:00 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "4:00 PM"];
const CLASS_KEYS = ["class_nursery", "class_lkg", "class_ukg", "class_1", "class_2", "class_3", "class_4", "class_5", "class_6plus"];
const CLASS_VALUES = ["Nursery", "LKG / KG", "UKG", "1st", "2nd", "3rd", "4th", "5th", "6th+"];
const ROLES = ["Mother", "Father", "Both", "Grandparent"];
const WORK_TYPES = [
  { label: "Work from Home", value: "work_from_home" },
  { label: "Office Job", value: "office" },
  { label: "Not Working", value: "not_working" },
];
const TRAVEL_OPTS = [
  { label: "🚐 School Van / Bus", value: "van" },
  { label: "🚗 Parent Drop-off (Car)", value: "car" },
  { label: "🚶 Walking", value: "walk" },
  { label: "✏️ Other", value: "other" },
];
// Religion / diet style options. Each maps to a backend foodType (veg/non_veg)
// plus a free-text dietNote that gets stored in child.goals so Amy AI knows
// the religious or cultural restriction when generating meals.
const FOOD_OPTIONS = [
  { label: "🥦 Vegetarian",        value: "veg",        foodType: "veg",     note: "" },
  { label: "🥚 Eggetarian",        value: "eggetarian", foodType: "veg",     note: "Eggetarian — eggs are OK, no meat or fish" },
  { label: "🍗 Non-Vegetarian",    value: "non_veg",    foodType: "non_veg", note: "" },
  { label: "🙏 Jain (Pure Veg)",   value: "jain",       foodType: "veg",     note: "Jain diet — strictly no onion, garlic, root vegetables (potato, carrot, radish, beetroot)" },
  { label: "☪️ Halal",              value: "halal",      foodType: "non_veg", note: "Halal only — no pork, meat must be halal-certified" },
  { label: "✡️ Kosher",             value: "kosher",     foodType: "non_veg", note: "Kosher only — no pork or shellfish, never mix meat & dairy" },
  { label: "🕉️ Sattvik / Pure Veg", value: "sattvik",    foodType: "veg",     note: "Sattvik — pure vegetarian, no onion or garlic, freshly cooked" },
];
const REGION_OPTS = [
  { label: "Pan-Indian (Mixed)", value: "pan_indian" },
  { label: "North Indian",       value: "north_indian" },
  { label: "South Indian",       value: "south_indian" },
  { label: "Bengali",            value: "bengali" },
  { label: "Gujarati",           value: "gujarati" },
  { label: "Maharashtrian",      value: "maharashtrian" },
  { label: "Punjabi",            value: "punjabi" },
  { label: "Global / Continental", value: "global" },
];

// ─── Infant-specific options ─────────────────────────────────────────────────
const FEEDING_OPTS = [
  "🤱 Breastfeeding",
  "🍼 Formula Fed",
  "🥣 Both / Starting Solids",
];
const SLEEP_PATTERN_OPTS = [
  "😴 Flexible (naps as needed)",
  "🌙 Irregular / Unpredictable",
  "💤 Short naps, frequent waking",
];

function getAgeGroup(years: number): AgeGroup {
  if (years < 2) return "infant";
  if (years < 4) return "toddler";
  return "kid";
}

const GRAD = "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))";
const BG = "linear-gradient(160deg,hsl(var(--brand-indigo-100)) 0%,hsl(var(--brand-violet-50)) 55%,hsl(var(--brand-pink-50)) 100%)";

// ─── Sub-components ──────────────────────────────────────────────────────────
// size prop is in Tailwind spacing units (×4px), matching the old convention.
function AmyAvatar({ size = 8 }: { size?: number }) {
  return <AmyMascotLogo size={size * 4} />;
}

function TypingBubble() {
  return (
    <div className="flex gap-2 items-end">
      <AmyAvatar size={8} />
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(99,102,241,0.15)" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: "hsl(var(--brand-indigo-500))", animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

function AmyBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-2 items-end" style={{ animation: "chat-pop 0.3s ease-out" }}>
      <AmyAvatar size={8} />
      <div
        className="max-w-xs px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed text-foreground"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(99,102,241,0.15)" }}
      >
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end" style={{ animation: "chat-pop 0.25s ease-out" }}>
      <div
        className="max-w-xs px-4 py-3 rounded-2xl rounded-br-sm text-sm text-primary-foreground leading-relaxed"
        style={{ background: GRAD }}
      >
        {text}
      </div>
    </div>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-2xl text-sm font-semibold border transition-all active:scale-95"
      style={selected
        ? { background: GRAD, color: "#fff", border: "transparent", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }
        : { background: "rgba(255,255,255,0.9)", color: "hsl(var(--brand-indigo-950))", border: "1px solid #c7d2fe" }
      }
    >
      {label}
    </button>
  );
}

function GridChips({ options, selected, onSelect }: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} label={o} selected={selected === o} onClick={() => onSelect(o)} />
      ))}
    </div>
  );
}

function ProgressBar({ step }: { step: Step }) {
  const { t } = useTranslation();
  // Infant path is short; standard path is longer. Both share the parent section.
  const infantOrder: Step[] = [
    "child-name", "child-dob", "infant-feeding", "infant-sleep",
    "add-more", "parent-name", "parent-role", "parent-work",
    "parent-region", "parent-mobile", "parent-allergies",
  ];
  const standardOrder: Step[] = [
    "child-name", "child-dob", "child-school", "child-class",
    "child-school-start", "child-school-end", "child-school-days",
    "child-wake", "child-sleep",
    "add-more", "parent-name", "parent-role", "parent-work",
    "parent-region", "parent-mobile", "parent-allergies",
  ];
  const isInfant = (infantOrder as string[]).includes(step) && !(standardOrder.slice(2) as string[]).includes(step);
  const order = isInfant ? infantOrder : standardOrder;
  const idx = order.indexOf(step as any);
  const pct = idx < 0 ? 100 : Math.round(((idx + 1) / order.length) * 100);
  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-semibold text-foreground">{t("screens.onboarding.amy_setup")}</span>
        <span className="text-muted-foreground">{Math.min(pct, 100)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(99,102,241,0.12)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: GRAD }} />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { user } = useUser();
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const { enable: enableNotif } = useWebPush();

  const [step, setStep] = useState<Step>("intro");
  const [notifLoading, setNotifLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [selected, setSelected] = useState("");
  const [dobInput, setDobInput] = useState("");

  const [children, setChildren] = useState<ChildData[]>([]);
  const [curr, setCurr] = useState<Partial<ChildData>>({});
  const [parent, setParent] = useState<Partial<ParentData>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, step]);

  // Amy sends a message after a typing delay
  function amySays(text: string, delay = 700) {
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { role: "amy", text }]);
    }, delay);
  }

  // User replies, adds to history, then advances
  function userReplies(text: string, nextStep: Step, nextAmyMsg?: string, delay = 900) {
    setMessages((m) => [...m, { role: "user", text }]);
    setSelected("");
    setTextInput("");
    if (nextAmyMsg) {
      setTimeout(() => amySays(nextAmyMsg, delay), 300);
    }
    setTimeout(() => {
      setStep(nextStep);
    }, nextAmyMsg ? delay + 700 : 400);
  }

  // Boot: Amy intro
  useEffect(() => {
    if (step === "intro") {
      const firstName = user?.firstName || t("screens.onboarding.intro_default_name");
      setTimeout(() => {
        setMessages([{
          role: "amy",
          text: t("screens.onboarding.intro_greeting", { name: firstName }),
        }]);
        setTimeout(() => amySays(t("screens.onboarding.intro_start"), 800), 900);
        setTimeout(() => setStep("child-name"), 2400);
      }, 600);
    }
  }, []);

  // ─── Save & finish ──────────────────────────────────────────────────────────
  async function saveEverything() {
    setStep("saving");
    setMessages((m) => [...m, { role: "amy", text: t("screens.onboarding.saving_message") }]);

    try {
      // Save all children sequentially. isOnboarding=true bypasses the
      // free-tier 1-child cap so every child entered here gets stored.
      for (const child of children) {
        const goalsParts = ["balanced-routine"];
        if (child.dietNote) goalsParts.unshift(child.dietNote);
        const res = await authFetch("/api/children", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isOnboarding: true,
            name: child.name,
            dob: child.dob || "",
            age: child.age || 0,
            ageMonths: child.ageMonths || 0,
            isSchoolGoing: child.isSchoolGoing ?? false,
            childClass: child.childClass || "",
            schoolStartTime: child.schoolStartTime || "09:00",
            schoolEndTime: child.schoolEndTime || "15:00",
            schoolDays: child.isSchoolGoing ? (child.schoolDays ?? [1, 2, 3, 4, 5]) : null,
            wakeUpTime: child.wakeUpTime || "07:00",
            sleepTime: child.sleepTime || "21:00",
            foodType: child.foodType || "veg",
            goals: goalsParts.join("|"),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error(`Failed to save child "${child.name}":`, err);
        }
      }

      const parentBody: any = {
        name: parent.name || "",
        role: (parent.role || "mother").toLowerCase(),
        workType: parent.workType || "work_from_home",
        region: parent.region || "pan_indian",
      };
      if (parent.mobileNumber) parentBody.mobileNumber = parent.mobileNumber;
      if (parent.allergies) parentBody.allergies = parent.allergies;

      await authFetch("/api/parent-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentBody),
      });

      await authFetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          children: children.map((c) => ({ name: c.name, ageGroup: `${c.age}`, problems: [] })),
          parent: { caregiver: parent.role, concern: "", routineLevel: "medium" },
          priorityGoal: "balanced-routine",
          onboardingComplete: true,
        }),
      });

      localStorage.setItem("onboardingComplete", "true");
      queryClient.setQueryData(["onboarding-status"], { onboardingComplete: true, profileComplete: true });
    } catch (err) {
      console.error("Onboarding save error:", err);
    }

    setTimeout(() => setStep("done"), 600);
  }

  function goDashboard() {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.location.assign(`${base}/dashboard`);
  }

  // ─── Notifications step ─────────────────────────────────────────────────────
  if (step === "notifications") {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-5 px-5"
        style={{ background: BG }}
      >
        <AmyMascotLogo size={64} />

        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: GRAD }}
        >
          <span style={{ fontSize: 30 }}>🔔</span>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-extrabold text-foreground mb-2">
            {t("screens.onboarding.notif_title")}
          </h2>
          <p className="text-sm text-foreground leading-relaxed max-w-xs mx-auto">
            {t("screens.onboarding.notif_subtitle")}
          </p>
        </div>

        <div
          className="w-full max-w-sm rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(99,102,241,0.15)" }}
        >
          {[
            { emoji: "⏰", text: t("screens.onboarding.notif_benefit_routines") },
            { emoji: "🌙", text: t("screens.onboarding.notif_benefit_bedtime") },
            { emoji: "🍎", text: t("screens.onboarding.notif_benefit_meals") },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-3 py-2">
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <p className="text-sm font-medium text-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            disabled={notifLoading}
            onClick={async () => {
              setNotifLoading(true);
              await enableNotif();
              goDashboard();
            }}
            className="w-full py-4 rounded-2xl text-primary-foreground font-bold text-base active:scale-95 transition-all"
            style={{
              background: GRAD,
              boxShadow: "0 6px 24px rgba(99,102,241,0.4)",
              opacity: notifLoading ? 0.7 : 1,
            }}
          >
            {notifLoading ? t("screens.onboarding.notif_enabling") : t("screens.onboarding.notif_allow")}
          </button>

          <button
            onClick={goDashboard}
            className="w-full py-3 text-sm font-semibold"
            style={{ color: "hsl(var(--brand-indigo-500))", background: "none", border: "none", cursor: "pointer" }}
          >
            {t("screens.onboarding.notif_skip")}
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (step === "saving" || step === "done") {
    const childName = children[0]?.name || t("screens.onboarding.default_child_name");
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-6 px-5" style={{ background: BG }}>
        {step === "saving" ? (
          <>
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-xl"
              style={{ background: GRAD, animation: "pulse-glow 1.5s ease-in-out infinite" }}
            >
              <span className="text-4xl">🧠</span>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-foreground">{t("screens.onboarding.saving_title")}</p>
              <p className="text-foreground font-bold text-2xl mt-1">{t("screens.onboarding.saving_subtitle")}</p>
            </div>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-3 h-3 rounded-full" style={{ background: "hsl(var(--brand-indigo-500))", display: "inline-block", animation: `typing-dot 1.2s ease-in-out ${i * 0.25}s infinite` }} />
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-5 w-full max-w-sm" style={{ animation: "splash-in 0.5s ease-out" }}>
            <div className="text-6xl">🎉</div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-foreground">{t("screens.onboarding.done_title")}</h2>
              <p className="text-foreground mt-1">{t("screens.onboarding.done_subtitle", { name: childName })}</p>
            </div>
            <div
              className="w-full rounded-3xl p-5 shadow-xl"
              style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", border: "1px solid rgba(99,102,241,0.15)" }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">✏️</span>
                <div>
                  <p className="font-bold text-foreground text-sm">{t("screens.onboarding.edit_anytime_title")}</p>
                  <p className="text-foreground text-xs mt-1 leading-relaxed">
                    {t("screens.onboarding.edit_anytime_body_before")}<strong>{t("screens.onboarding.edit_profile")}</strong>{t("screens.onboarding.edit_anytime_or")}<strong>{t("screens.onboarding.edit_children")}</strong>{t("screens.onboarding.edit_anytime_body_after")}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  "Notification" in window &&
                  Notification.permission === "default"
                ) {
                  setStep("notifications");
                } else {
                  goDashboard();
                }
              }}
              className="w-full py-4 rounded-2xl text-primary-foreground font-bold text-base active:scale-95 transition-all"
              style={{ background: GRAD, boxShadow: "0 6px 24px rgba(99,102,241,0.4)" }}
            >
              {t("screens.onboarding.go_dashboard")}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Current input component based on step ──────────────────────────────────
  function renderInput() {
    switch (step) {
      case "intro":
        return null;

      case "child-name":
        return (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-2xl px-4 py-3.5 text-sm outline-none border border-border focus:border-primary transition-colors"
              style={{ background: "rgba(255,255,255,0.95)", color: "hsl(var(--brand-indigo-950))" }}
              placeholder={t("screens.onboarding.child_name_placeholder")}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textInput.trim()) {
                  const name = textInput.trim();
                  setCurr((c) => ({ ...c, name }));
                  userReplies(name, "child-dob", t("screens.onboarding.child_name_reply", { name }));
                }
              }}
              autoFocus
            />
            <button
              onClick={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setCurr((c) => ({ ...c, name }));
                userReplies(name, "child-dob", t("screens.onboarding.child_name_reply", { name }));
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground shrink-0"
              style={{ background: GRAD }}
            >→</button>
          </div>
        );

      case "child-dob":
        return (
          <div className="flex flex-col gap-3">
            <input
              type="date"
              className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none border border-border focus:border-primary transition-colors"
              style={{ background: "rgba(255,255,255,0.95)", color: "hsl(var(--brand-indigo-950))" }}
              value={dobInput}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDobInput(e.target.value)}
            />
            <button
              disabled={!dobInput}
              onClick={() => {
                const { years, months } = dobToAge(dobInput);
                const ageGroup = getAgeGroup(years);
                setCurr((c) => ({ ...c, dob: dobInput, age: years, ageMonths: months, ageGroup }));
                const name = curr.name || t("screens.onboarding.default_child_name");
                if (ageGroup === "infant") {
                  userReplies(
                    dobInput,
                    "infant-feeding",
                    t("screens.onboarding.infant_dob_reply", { name }),
                    900,
                  );
                } else {
                  userReplies(dobInput, "child-school", t("screens.onboarding.school_question", { name }), 900);
                }
                setDobInput("");
              }}
              className="w-full py-3.5 rounded-2xl text-primary-foreground font-semibold active:scale-95 transition-all disabled:opacity-40"
              style={{ background: GRAD }}
            >
              {t("screens.onboarding.confirm_dob")}
            </button>
          </div>
        );

      // ── Infant path (age < 2) ──────────────────────────────────────────────
      case "infant-feeding": {
        const feedingOpts = [
          t("screens.onboarding.feeding_breast"),
          t("screens.onboarding.feeding_formula"),
          t("screens.onboarding.feeding_both"),
        ];
        const babyName = curr.name || t("screens.onboarding.default_baby_name");
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {feedingOpts.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setCurr((c) => ({ ...c, feedingType: opt }));
                    userReplies(opt, "infant-sleep", t("screens.onboarding.feeding_reply", { name: babyName }));
                  }}
                  className="px-4 py-2.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all"
                  style={{ background: "rgba(255,255,255,0.9)", color: "hsl(var(--brand-indigo-950))", border: "1px solid #c7d2fe" }}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={() => userReplies(t("screens.onboarding.skip_for_now"), "infant-sleep", t("screens.onboarding.skip_sleep_reply", { name: babyName }))}
              className="text-xs text-foreground hover:text-foreground self-center mt-1"
            >
              {t("screens.onboarding.skip_later")}
            </button>
          </div>
        );
      }

      case "infant-sleep": {
        const sleepOpts = [
          t("screens.onboarding.sleep_flexible"),
          t("screens.onboarding.sleep_irregular"),
          t("screens.onboarding.sleep_short"),
        ];
        return (
          <div className="flex flex-col gap-2">
            {sleepOpts.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  const name = curr.name || t("screens.onboarding.default_baby_name");
                  const finalChild: ChildData = {
                    name: curr.name || "",
                    dob: curr.dob || "",
                    age: curr.age || 0,
                    ageMonths: curr.ageMonths || 0,
                    ageGroup: curr.ageGroup || "infant",
                    isSchoolGoing: false,
                    childClass: "",
                    schoolStartTime: "09:00",
                    schoolEndTime: "15:00",
                    schoolDays: null,
                    wakeUpTime: "07:00",
                    sleepTime: "19:30",
                    foodType: "veg",
                    dietNote: "",
                    feedingType: curr.feedingType,
                    sleepPattern: opt,
                  };
                  setChildren((prev) => [...prev, finalChild]);
                  setCurr({});
                  const childCount = children.length + 1;
                  userReplies(
                    opt,
                    "add-more",
                    childCount === 1
                      ? t("screens.onboarding.child_added_first", { name })
                      : t("screens.onboarding.child_added_more"),
                  );
                }}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all text-left px-4"
                style={{ background: "rgba(255,255,255,0.9)", color: "hsl(var(--brand-indigo-950))", border: "1px solid #c7d2fe" }}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      }

      // ── Standard path (age >= 2) ───────────────────────────────────────────
      case "child-school": {
        const schoolOpts = [
          { label: t("screens.onboarding.yes_school"), isYes: true },
          { label: t("screens.onboarding.no_school"), isYes: false },
        ];
        return (
          <div className="flex gap-3">
            {schoolOpts.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  const isSchool = opt.isYes;
                  setCurr((c) => ({ ...c, isSchoolGoing: isSchool }));
                  const name = curr.name || t("screens.onboarding.default_child_name");
                  if (isSchool) {
                    userReplies(opt.label, "child-class", t("screens.onboarding.class_question", { name }));
                  } else {
                    setCurr((c) => ({ ...c, childClass: "", schoolStartTime: "09:00", schoolEndTime: "15:00", schoolDays: null }));
                    userReplies(opt.label, "child-wake", t("screens.onboarding.wake_question", { name }));
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all"
                style={{ background: "rgba(255,255,255,0.9)", color: "hsl(var(--brand-indigo-950))", border: "1px solid #c7d2fe" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }

      case "child-class": {
        const classLabels = CLASS_KEYS.map((k) => t(`screens.onboarding.${k}`));
        const selectedIdx = CLASS_VALUES.indexOf(selected);
        const selectedLabel = selectedIdx >= 0 ? classLabels[selectedIdx] : selected;
        return (
          <GridChips
            options={classLabels}
            selected={selectedLabel}
            onSelect={(label) => {
              const idx = classLabels.indexOf(label);
              const canonical = idx >= 0 ? CLASS_VALUES[idx] : label;
              setSelected(canonical);
              setCurr((c) => ({ ...c, childClass: canonical }));
              const name = curr.name || t("screens.onboarding.default_child_name");
              userReplies(canonical, "child-school-start", t("screens.onboarding.school_start_question", { name }));
            }}
          />
        );
      }

      case "child-school-start":
        return (
          <GridChips
            options={SCHOOL_START_OPTS}
            selected={selected}
            onSelect={(v) => {
              setSelected(v);
              setCurr((c) => ({ ...c, schoolStartTime: to24h(v) }));
              userReplies(v, "child-school-end", t("screens.onboarding.school_end_question"));
            }}
          />
        );

      case "child-school-end":
        return (
          <GridChips
            options={SCHOOL_END_OPTS}
            selected={selected}
            onSelect={(v) => {
              setSelected(v);
              setCurr((c) => ({ ...c, schoolEndTime: to24h(v), schoolDays: c.schoolDays ?? [1, 2, 3, 4, 5] }));
              const name = curr.name || t("screens.onboarding.default_child_name");
              userReplies(v, "child-school-days", t("screens.onboarding.school_days_question", { name }));
            }}
          />
        );

      case "child-school-days": {
        const labels = [
          t("screens.onboarding.day_mon"),
          t("screens.onboarding.day_tue"),
          t("screens.onboarding.day_wed"),
          t("screens.onboarding.day_thu"),
          t("screens.onboarding.day_fri"),
          t("screens.onboarding.day_sat"),
          t("screens.onboarding.day_sun"),
        ];
        const current = curr.schoolDays ?? [1, 2, 3, 4, 5];
        const toggle = (d: number) => {
          setCurr((c) => {
            const cur = c.schoolDays ?? [1, 2, 3, 4, 5];
            const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b);
            return { ...c, schoolDays: next };
          });
        };
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {labels.map((label, i) => {
                const day = i + 1;
                const on = current.includes(day);
                return (
                  <button
                    key={day}
                    onClick={() => toggle(day)}
                    className="px-4 py-2.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all"
                    style={{
                      background: on ? GRAD : "rgba(255,255,255,0.9)",
                      color: on ? "#fff" : "hsl(var(--brand-indigo-950))",
                      border: on ? "1px solid transparent" : "1px solid #c7d2fe",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                const days = curr.schoolDays ?? [1, 2, 3, 4, 5];
                const summary = days.length === 5 && days.every((d) => d <= 5) ? t("screens.onboarding.all_school_days")
                  : days.length === 0 ? t("screens.onboarding.no_school_days")
                  : days.map((d) => labels[d - 1]).join(",");
                const name = curr.name || t("screens.onboarding.default_child_name");
                userReplies(summary, "child-wake", t("screens.onboarding.wake_morning_question", { name }));
              }}
              className="w-full py-3 rounded-2xl text-primary-foreground font-semibold active:scale-95 transition-all"
              style={{ background: GRAD }}
            >
              {t("screens.onboarding.continue")}
            </button>
          </div>
        );
      }


      case "child-wake":
        return (
          <GridChips
            options={WAKE_OPTS}
            selected={selected}
            onSelect={(v) => {
              setSelected(v);
              setCurr((c) => ({ ...c, wakeUpTime: to24h(v) }));
              const name = curr.name || t("screens.onboarding.default_child_name");
              userReplies(v, "child-sleep", t("screens.onboarding.sleep_question", { name }));
            }}
          />
        );

      case "child-sleep":
        return (
          <GridChips
            options={SLEEP_OPTS}
            selected={selected}
            onSelect={(v) => {
              setSelected(v);
              const finalChild = {
                ...curr,
                sleepTime: to24h(v),
                foodType: "veg",
                dietNote: "",
                ageGroup: curr.ageGroup ?? getAgeGroup(curr.age ?? 3),
              } as ChildData;
              setChildren((prev) => [...prev, finalChild]);
              setCurr({});
              const childCount = children.length + 1;
              userReplies(v, "add-more",
                childCount === 1
                  ? t("screens.onboarding.child_added_first_school")
                  : t("screens.onboarding.child_added_more"),
              );
            }}
          />
        );

      case "add-more": {
        const addMoreOpts = [
          { label: t("screens.onboarding.yes_add_another"), isYes: true },
          { label: t("screens.onboarding.no_continue"), isYes: false },
        ];
        return (
          <div className="flex gap-3">
            {addMoreOpts.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  if (opt.isYes) {
                    userReplies(opt.label, "child-name", t("screens.onboarding.next_child_name"));
                  } else {
                    userReplies(opt.label, "parent-name", t("screens.onboarding.parent_intro"));
                  }
                }}
                className="flex-1 py-3.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all"
                style={!opt.isYes
                  ? { background: GRAD, color: "#fff", border: "transparent" }
                  : { background: "rgba(255,255,255,0.9)", color: "hsl(var(--brand-indigo-950))", border: "1px solid #c7d2fe" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }

      case "parent-name":
        return (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-2xl px-4 py-3.5 text-sm outline-none border border-border focus:border-primary transition-colors"
              style={{ background: "rgba(255,255,255,0.95)", color: "hsl(var(--brand-indigo-950))" }}
              placeholder={t("screens.onboarding.parent_name_placeholder")}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textInput.trim()) {
                  const name = textInput.trim();
                  setParent((p) => ({ ...p, name }));
                  userReplies(name, "parent-role", t("screens.onboarding.parent_name_reply", { name }));
                }
              }}
              autoFocus
            />
            <button
              onClick={() => {
                if (!textInput.trim()) return;
                const name = textInput.trim();
                setParent((p) => ({ ...p, name }));
                userReplies(name, "parent-role", t("screens.onboarding.parent_name_reply", { name }));
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground shrink-0"
              style={{ background: GRAD }}
            >→</button>
          </div>
        );

      case "parent-role": {
        const roleOpts = [
          { label: t("screens.onboarding.role_mother"), value: "Mother" },
          { label: t("screens.onboarding.role_father"), value: "Father" },
          { label: t("screens.onboarding.role_both"), value: "Both" },
          { label: t("screens.onboarding.role_grandparent"), value: "Grandparent" },
        ];
        return (
          <div className="grid grid-cols-2 gap-2">
            {roleOpts.map((r) => (
              <button
                key={r.value}
                onClick={() => {
                  setParent((p) => ({ ...p, role: r.value }));
                  userReplies(r.label, "parent-work", t("screens.onboarding.work_question"));
                }}
                className="py-3.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all"
                style={{ background: "rgba(255,255,255,0.9)", color: "hsl(var(--brand-indigo-950))", border: "1px solid #c7d2fe" }}
              >
                {r.label}
              </button>
            ))}
          </div>
        );
      }

      case "parent-work": {
        const workOpts = [
          { label: t("screens.onboarding.work_home"), value: "work_from_home" },
          { label: t("screens.onboarding.work_office"), value: "office" },
          { label: t("screens.onboarding.work_not_working"), value: "not_working" },
        ];
        return (
          <div className="flex flex-col gap-2">
            {workOpts.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => {
                  setParent((p) => ({ ...p, workType: value }));
                  userReplies(label, "parent-region", t("screens.onboarding.region_question"));
                }}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all"
                style={{ background: "rgba(255,255,255,0.9)", color: "hsl(var(--brand-indigo-950))", border: "1px solid #c7d2fe" }}
              >
                {label}
              </button>
            ))}
          </div>
        );
      }

      case "parent-region": {
        const regionOpts = [
          { label: t("screens.onboarding.region_pan_indian"), value: "pan_indian" },
          { label: t("screens.onboarding.region_north"), value: "north_indian" },
          { label: t("screens.onboarding.region_south"), value: "south_indian" },
          { label: t("screens.onboarding.region_bengali"), value: "bengali" },
          { label: t("screens.onboarding.region_gujarati"), value: "gujarati" },
          { label: t("screens.onboarding.region_maharashtrian"), value: "maharashtrian" },
          { label: t("screens.onboarding.region_punjabi"), value: "punjabi" },
          { label: t("screens.onboarding.region_global"), value: "global" },
        ];
        return (
          <div className="grid grid-cols-2 gap-2">
            {regionOpts.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setParent((p) => ({ ...p, region: opt.value }));
                  userReplies(opt.label, "parent-mobile", t("screens.onboarding.mobile_question"));
                }}
                className="py-3.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all"
                style={{ background: "rgba(255,255,255,0.9)", color: "hsl(var(--brand-indigo-950))", border: "1px solid #c7d2fe" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }

      case "parent-mobile":
        return (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="tel"
                inputMode="tel"
                className="flex-1 rounded-2xl px-4 py-3.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                style={{ background: "rgba(255,255,255,0.95)", color: "hsl(var(--brand-indigo-950))" }}
                placeholder={t("screens.onboarding.mobile_placeholder")}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && textInput.trim()) {
                    const m = textInput.trim();
                    setParent((p) => ({ ...p, mobileNumber: m }));
                    userReplies(m, "parent-allergies", t("screens.onboarding.allergies_question"));
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  if (!textInput.trim()) return;
                  const m = textInput.trim();
                  setParent((p) => ({ ...p, mobileNumber: m }));
                  userReplies(m, "parent-allergies", t("screens.onboarding.allergies_question"));
                }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground shrink-0"
                style={{ background: GRAD }}
              >→</button>
            </div>
            <button
              onClick={() => userReplies(t("screens.onboarding.skip_for_now"), "parent-allergies", t("screens.onboarding.allergies_skip"))}
              className="text-xs text-foreground hover:text-foreground self-center mt-1"
            >
              {t("screens.onboarding.skip_later")}
            </button>
          </div>
        );

      case "parent-allergies":
        return (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-2xl px-4 py-3.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                style={{ background: "rgba(255,255,255,0.95)", color: "hsl(var(--brand-indigo-950))" }}
                placeholder={t("screens.onboarding.allergies_placeholder")}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && textInput.trim()) {
                    const a = textInput.trim();
                    setParent((p) => ({ ...p, allergies: a }));
                    userReplies(a, "saving");
                    setTimeout(() => saveEverything(), 800);
                  }
                }}
                autoFocus
              />
              <button
                onClick={() => {
                  if (!textInput.trim()) return;
                  const a = textInput.trim();
                  setParent((p) => ({ ...p, allergies: a }));
                  userReplies(a, "saving");
                  setTimeout(() => saveEverything(), 800);
                }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-primary-foreground shrink-0"
                style={{ background: GRAD }}
              >→</button>
            </div>
            <button
              onClick={() => {
                userReplies(t("screens.onboarding.no_allergies_reply"), "saving");
                setTimeout(() => saveEverything(), 800);
              }}
              className="text-xs text-foreground hover:text-foreground self-center mt-1"
            >
              {t("screens.onboarding.no_allergies_button")}
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: BG }}>
      <div
        className="sticky top-0 z-10"
        style={{ background: "rgba(238,242,255,0.85)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2.5">
            <AmyAvatar size={8} />
            <div>
              <p className="text-xs font-bold text-foreground">{t("screens.onboarding.amy_coach")}</p>
              <p className="text-xs text-foreground">{t("screens.onboarding.setting_up")}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-foreground px-3 py-1.5">
            {t("screens.onboarding.setup_required")}
          </span>
        </div>
        <ProgressBar step={step} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3 max-w-lg mx-auto w-full">
        {messages.map((msg, i) =>
          msg.role === "amy"
            ? <AmyBubble key={i} text={msg.text} />
            : <UserBubble key={i} text={msg.text} />
        )}
        {typing && <TypingBubble />}
        <div ref={chatEndRef} />
      </div>

      {!typing && step !== "intro" && (
        <div
          className="sticky bottom-0 px-4 py-4 max-w-lg mx-auto w-full"
          style={{ background: "rgba(238,242,255,0.9)", backdropFilter: "blur(8px)" }}
        >
          {renderInput()}
        </div>
      )}
    </div>
  );
}
