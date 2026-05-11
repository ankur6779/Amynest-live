import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { useUser } from "@/lib/firebase-auth-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  getNativePushBridge,
  requestNativePushPermission,
  registerNativePushToken,
} from "@/lib/native-push-bridge";

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
  country: string;
}

interface ChatMessage {
  role: "amy" | "user";
  text: string;
}

type Step =
  | "intro"
  | "country-confirm"
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
  { label: "🌱 Vegan",             value: "vegan",      foodType: "veg",     note: "Vegan — strictly no animal products including dairy and eggs" },
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

// ─── Country data ────────────────────────────────────────────────────────────
const TOP_COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", name: "Canada",         flag: "🇨🇦" },
  { code: "AU", name: "Australia",      flag: "🇦🇺" },
  { code: "AE", name: "UAE",            flag: "🇦🇪" },
  { code: "IN", name: "India",          flag: "🇮🇳" },
];

const ALL_COUNTRIES = [
  ...TOP_COUNTRIES,
  { code: "NZ", name: "New Zealand",   flag: "🇳🇿" },
  { code: "SG", name: "Singapore",     flag: "🇸🇬" },
  { code: "MY", name: "Malaysia",      flag: "🇲🇾" },
  { code: "PK", name: "Pakistan",      flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh",    flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka",     flag: "🇱🇰" },
  { code: "NP", name: "Nepal",         flag: "🇳🇵" },
  { code: "PH", name: "Philippines",   flag: "🇵🇭" },
  { code: "ID", name: "Indonesia",     flag: "🇮🇩" },
  { code: "TH", name: "Thailand",      flag: "🇹🇭" },
  { code: "VN", name: "Vietnam",       flag: "🇻🇳" },
  { code: "JP", name: "Japan",         flag: "🇯🇵" },
  { code: "KR", name: "South Korea",   flag: "🇰🇷" },
  { code: "CN", name: "China",         flag: "🇨🇳" },
  { code: "HK", name: "Hong Kong",     flag: "🇭🇰" },
  { code: "DE", name: "Germany",       flag: "🇩🇪" },
  { code: "FR", name: "France",        flag: "🇫🇷" },
  { code: "IT", name: "Italy",         flag: "🇮🇹" },
  { code: "ES", name: "Spain",         flag: "🇪🇸" },
  { code: "NL", name: "Netherlands",   flag: "🇳🇱" },
  { code: "BE", name: "Belgium",       flag: "🇧🇪" },
  { code: "SE", name: "Sweden",        flag: "🇸🇪" },
  { code: "NO", name: "Norway",        flag: "🇳🇴" },
  { code: "DK", name: "Denmark",       flag: "🇩🇰" },
  { code: "FI", name: "Finland",       flag: "🇫🇮" },
  { code: "CH", name: "Switzerland",   flag: "🇨🇭" },
  { code: "AT", name: "Austria",       flag: "🇦🇹" },
  { code: "PT", name: "Portugal",      flag: "🇵🇹" },
  { code: "IE", name: "Ireland",       flag: "🇮🇪" },
  { code: "PL", name: "Poland",        flag: "🇵🇱" },
  { code: "SA", name: "Saudi Arabia",  flag: "🇸🇦" },
  { code: "QA", name: "Qatar",         flag: "🇶🇦" },
  { code: "KW", name: "Kuwait",        flag: "🇰🇼" },
  { code: "BH", name: "Bahrain",       flag: "🇧🇭" },
  { code: "OM", name: "Oman",          flag: "🇴🇲" },
  { code: "EG", name: "Egypt",         flag: "🇪🇬" },
  { code: "TR", name: "Turkey",        flag: "🇹🇷" },
  { code: "IL", name: "Israel",        flag: "🇮🇱" },
  { code: "JO", name: "Jordan",        flag: "🇯🇴" },
  { code: "LB", name: "Lebanon",       flag: "🇱🇧" },
  { code: "ZA", name: "South Africa",  flag: "🇿🇦" },
  { code: "KE", name: "Kenya",         flag: "🇰🇪" },
  { code: "NG", name: "Nigeria",       flag: "🇳🇬" },
  { code: "GH", name: "Ghana",         flag: "🇬🇭" },
  { code: "MX", name: "Mexico",        flag: "🇲🇽" },
  { code: "BR", name: "Brazil",        flag: "🇧🇷" },
  { code: "AR", name: "Argentina",     flag: "🇦🇷" },
  { code: "CO", name: "Colombia",      flag: "🇨🇴" },
  { code: "RU", name: "Russia",        flag: "🇷🇺" },
  { code: "MV", name: "Maldives",      flag: "🇲🇻" },
  { code: "MM", name: "Myanmar",       flag: "🇲🇲" },
];

function flagEmoji(code: string): string {
  return code.toUpperCase().split("").map((c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397)
  ).join("");
}

/** Grade/class labels per country education system */
function getClassSystem(code: string): { labels: string[]; values: string[] } {
  if (code === "GB" || code === "IE") {
    const v = ["Reception", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8+"];
    return { labels: v, values: v };
  }
  if (code === "AU" || code === "NZ") {
    const v = ["Prep / Kinder", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7+"];
    return { labels: v, values: v };
  }
  if (["AE", "SA", "QA", "KW", "BH", "OM"].includes(code)) {
    const v = ["KG 1", "KG 2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6+"];
    return { labels: v, values: v };
  }
  // Default: US, CA, and all others
  const v = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8+"];
  return { labels: v, values: v };
}

/** Default cuisine region for parent-region step */
function getDefaultRegion(code: string): string {
  if (["IN", "PK", "BD", "LK", "NP"].includes(code))                                 return "north_indian";
  if (["AE", "SA", "QA", "KW", "BH", "OM", "EG", "TR", "JO", "LB"].includes(code)) return "middle_eastern";
  if (["JP", "KR", "CN", "HK", "SG", "TH", "ID", "MY", "PH", "VN"].includes(code)) return "asian";
  return "western";
}

// ─── Cuisine option types + constants ────────────────────────────────────────
interface CuisineOption {
  value: string;
  labelKey: string;
  subtextKey: string;
  emoji: string;
}

const GLOBAL_CUISINES: CuisineOption[] = [
  { value: "western",        labelKey: "region_western",        subtextKey: "region_western_sub",        emoji: "🥗" },
  { value: "asian",          labelKey: "region_asian",          subtextKey: "region_asian_sub",          emoji: "🍜" },
  { value: "middle_eastern", labelKey: "region_middle_eastern", subtextKey: "region_middle_eastern_sub", emoji: "🧆" },
  { value: "vegetarian",     labelKey: "region_plant_based",    subtextKey: "region_vegetarian_sub",     emoji: "🌱" },
  { value: "mixed",          labelKey: "region_mixed",          subtextKey: "region_mixed_sub",          emoji: "🌍" },
  { value: "indian",         labelKey: "region_indian_cuisine", subtextKey: "region_indian_sub",         emoji: "🍛" },
];

const INDIAN_SUBCUISINES: CuisineOption[] = [
  { value: "north_indian",  labelKey: "region_north",         subtextKey: "region_north_sub",         emoji: "🫕" },
  { value: "south_indian",  labelKey: "region_south",         subtextKey: "region_south_sub",         emoji: "🥘" },
  { value: "gujarati",      labelKey: "region_gujarati",      subtextKey: "region_gujarati_sub",      emoji: "🫙" },
  { value: "maharashtrian", labelKey: "region_maharashtrian", subtextKey: "region_maharashtrian_sub", emoji: "🍛" },
  { value: "punjabi",       labelKey: "region_punjabi",       subtextKey: "region_punjabi_sub",       emoji: "🍗" },
  { value: "bengali",       labelKey: "region_bengali",       subtextKey: "region_bengali_sub",       emoji: "🐟" },
  { value: "pan_indian",    labelKey: "region_mixed_indian",  subtextKey: "region_pan_indian_sub",    emoji: "🍱" },
];

const ALL_CUISINE_MAP: Record<string, CuisineOption> = Object.fromEntries(
  [...GLOBAL_CUISINES, ...INDIAN_SUBCUISINES].map((c) => [c.value, c])
);

function getRecommendedCuisines(code: string): string[] {
  if (["IN", "PK", "BD", "LK", "NP"].includes(code))                                return ["north_indian", "south_indian"];
  if (["AE", "SA", "QA", "KW", "BH", "OM"].includes(code))                         return ["middle_eastern", "indian"];
  if (["JP", "KR", "CN", "HK", "SG", "TH", "ID", "MY", "PH", "VN"].includes(code)) return ["asian", "mixed"];
  if (["US", "CA"].includes(code))                                                   return ["western", "mixed"];
  if (["GB", "AU", "NZ", "IE"].includes(code))                                       return ["western", "asian"];
  return ["western", "mixed"];
}

function getOrderedCuisines(code: string): CuisineOption[] {
  const isSouthAsian = ["IN", "PK", "BD", "LK", "NP"].includes(code);
  const recommended = getRecommendedCuisines(code);
  const allOptions = isSouthAsian
    ? [...INDIAN_SUBCUISINES, ...GLOBAL_CUISINES.filter((c) => c.value !== "indian")]
    : GLOBAL_CUISINES;
  return [
    ...allOptions.filter((c) => recommended.includes(c.value)),
    ...allOptions.filter((c) => !recommended.includes(c.value)),
  ];
}

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
const BG = "linear-gradient(160deg,#0f0a2e 0%,#1a0d40 55%,#0d0824 100%)"; // audit-ok: onboarding deep-space background gradient — brand-approved dark indigo, not in Tailwind palette
const GLASS_BG = "rgba(255,255,255,0.10)";
const GLASS_BORDER = "1px solid rgba(168,85,247,0.30)";
const BAR_BG = "rgba(15,10,46,0.92)";
const CHIP_DARK = { background: GLASS_BG, color: "#fff", border: "1px solid rgba(168,85,247,0.30)" } as const;
const INPUT_DARK = { background: "rgba(255,255,255,0.08)", color: "#fff", borderColor: "rgba(168,85,247,0.4)" } as const;

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
        style={{ background: GLASS_BG, backdropFilter: "blur(12px)", border: GLASS_BORDER }}
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
        className="max-w-xs px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed"
        style={{ background: GLASS_BG, backdropFilter: "blur(12px)", border: GLASS_BORDER, color: "#fff" }}
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
        ? { background: GRAD, color: "#fff", border: "transparent", boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }
        : { background: GLASS_BG, color: "#fff", border: "1px solid rgba(168,85,247,0.30)" }
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

/** Convert 24-h "HH:MM" → display "H:MM AM/PM" */
function from24h(v: string): string {
  const [h, m] = (v || "07:00").split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * TimeChipPicker — shows quick-select chips for common times + an
 * "⏰ Other time…" chip that reveals a native <input type="time"> so
 * users can pick any time they want (school at 10:30 AM, late sleepers, etc.)
 */
function TimeChipPicker({
  options,
  selected,
  onSelect,
  defaultValue = "07:00",
}: {
  options: string[];
  selected: string;
  onSelect: (displayStr: string) => void;
  defaultValue?: string;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customVal, setCustomVal] = useState(defaultValue);

  if (showCustom) {
    return (
      <div className="space-y-3">
        <input
          type="time"
          value={customVal}
          onChange={(e) => setCustomVal(e.target.value)}
          className="w-full rounded-2xl px-4 py-3.5 text-base outline-none border"
          style={INPUT_DARK}
        />
        <div className="flex gap-2">
          <button
            onClick={() => setShowCustom(false)}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold border active:scale-95 transition-all"
            style={CHIP_DARK}
          >
            ← Back
          </button>
          <button
            onClick={() => { onSelect(from24h(customVal)); setShowCustom(false); }}
            className="flex-1 py-3 rounded-2xl text-sm font-semibold active:scale-95 transition-all"
            style={{ background: GRAD, color: "#fff" }}
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o} label={o} selected={selected === o} onClick={() => onSelect(o)} />
      ))}
      <Chip label="⏰ Other time…" selected={false} onClick={() => setShowCustom(true)} />
    </div>
  );
}

function ProgressBar({ step }: { step: Step }) {
  const { t } = useTranslation();
  // Infant path is short; standard path is longer. Both share the parent section.
  const infantOrder: Step[] = [
    "country-confirm",
    "child-name", "child-dob", "infant-feeding", "infant-sleep",
    "add-more", "parent-name", "parent-role", "parent-work",
    "parent-region", "parent-mobile", "parent-allergies",
  ];
  const standardOrder: Step[] = [
    "country-confirm",
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
        <span className="font-semibold" style={{ color: "#fff" }}>{t("screens.onboarding.amy_setup")}</span>
        <span style={{ color: "rgba(255,255,255,0.6)" }}>{Math.min(pct, 100)}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
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
  const enableNotif = async () => {
    try {
      const native = getNativePushBridge();
      if (native) {
        const perm = await requestNativePushPermission(native);
        if (perm === "granted") {
          await registerNativePushToken(authFetch, "/api/push/register");
        }
      }
      // Non-wrapper browsers: web push is disabled — proceed silently.
    } catch {
      // best-effort, never block onboarding
    }
  };

  const [step, setStep] = useState<Step>("intro");
  const [notifLoading, setNotifLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [selected, setSelected] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [regionDrillDown, setRegionDrillDown] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [countryCode, setCountryCode] = useState("");
  const [countryName, setCountryName] = useState("");
  const [detectedCountry, setDetectedCountry] = useState<{ code: string; name: string } | "loading" | null>("loading");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

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
        setTimeout(() => amySays(t("screens.onboarding.country_transition_msg"), 800), 900);
        setTimeout(() => setStep("country-confirm"), 2600);
      }, 600);
    }
  }, []);

  // ─── Save & finish ──────────────────────────────────────────────────────────
  async function saveEverything() {
    setStep("saving");
    setMessages((m) => [...m, { role: "amy", text: t("screens.onboarding.saving_message") }]);

    // ── Step 1: Save each child independently — failures are logged, never abort ──
    for (const child of children) {
      const goalsParts = ["balanced-routine"];
      if (child.dietNote) goalsParts.unshift(child.dietNote);
      try {
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
      } catch (e) {
        console.error(`Network error saving child "${child.name}":`, e);
      }
    }

    // ── Step 2: Save parent profile independently — failure doesn't abort ──
    try {
      // Derive structured food style + sub-cuisine from selectedRegions for
      // the unified food-preference system (spec §1).
      function deriveFoodStyleFromRegions(regions: string[]): { foodStyle: string; subCuisine: string } {
        const indianSubs = ["north_indian", "south_indian", "gujarati", "maharashtrian", "punjabi", "bengali", "pan_indian"];
        const sub = regions.find(r => indianSubs.includes(r));
        if (sub) return { foodStyle: "indian", subCuisine: sub === "pan_indian" ? "" : sub };
        if (regions.includes("indian")) return { foodStyle: "indian", subCuisine: "" };
        if (regions.includes("western")) return { foodStyle: "western", subCuisine: "" };
        if (regions.includes("asian")) return { foodStyle: "asian", subCuisine: "" };
        if (regions.includes("middle_eastern")) return { foodStyle: "middle_eastern", subCuisine: "" };
        return { foodStyle: "mixed", subCuisine: "" };
      }
      const allRegions = selectedRegions.length > 0 ? selectedRegions : [parent.region ?? getDefaultRegion(countryCode)];
      const { foodStyle: derivedFoodStyle, subCuisine: derivedSubCuisine } = deriveFoodStyleFromRegions(allRegions);

      const parentBody: Record<string, unknown> = {
        name: parent.name || "",
        role: (parent.role || "mother").toLowerCase(),
        workType: parent.workType || "work_from_home",
        region: parent.region || selectedRegions.join(",") || getDefaultRegion(countryCode),
        country: parent.country || countryCode,
        foodStyle: derivedFoodStyle,
        subCuisine: derivedSubCuisine || null,
      };
      if (parent.mobileNumber) parentBody.mobileNumber = parent.mobileNumber;
      if (parent.allergies) parentBody.allergies = parent.allergies;
      await authFetch("/api/parent-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentBody),
      });
    } catch (e) {
      console.error("Failed to save parent profile:", e);
    }

    // ── Step 3: Mark onboarding complete — ALWAYS runs, ALWAYS sets local state ──
    try {
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
    } catch (e) {
      console.error("Failed to post onboarding completion:", e);
    }

    // Always mark complete locally — regardless of any individual API failure.
    // AppCore also uses this cache entry so the redirect guard sees it immediately.
    localStorage.setItem("onboardingComplete", "true");
    queryClient.setQueryData(["onboarding-status"], { onboardingComplete: true, profileComplete: true });

    setTimeout(() => setStep("done"), 600);
  }

  function goDashboard() {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    window.location.assign(`${base}/dashboard`);
  }

  // ─── Country detection ───────────────────────────────────────────────────────
  useEffect(() => {
    async function detect() {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 4000);
        const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const data = await res.json() as { country_code?: string; country_name?: string };
          if (data.country_code && data.country_name) {
            setCountryCode(data.country_code);
            setCountryName(data.country_name);
            setDetectedCountry({ code: data.country_code, name: data.country_name });
            return;
          }
        }
      } catch { /* network or timeout */ }
      // Fallback: browser locale e.g. "en-IN" → "IN"
      const lang = navigator.language || (navigator.languages?.[0] ?? "");
      const parts = lang.split("-");
      if (parts.length === 2 && parts[1].length === 2) {
        const code = parts[1].toUpperCase();
        const found = ALL_COUNTRIES.find((c) => c.code === code);
        if (found) {
          setCountryCode(found.code);
          setCountryName(found.name);
          setDetectedCountry({ code: found.code, name: found.name });
          return;
        }
      }
      // Detection failed — show picker directly
      setDetectedCountry(null);
      setShowCountryPicker(true);
    }
    detect();
  }, []);

  function confirmCountry(code: string, name: string) {
    setCountryCode(code);
    setCountryName(name);
    setShowCountryPicker(false);
    setCountrySearch("");
    setRegionDrillDown(false);
    // Pre-seed recommended cuisines so user sees them highlighted (but not locked in)
    const recs = getRecommendedCuisines(code);
    setSelectedRegions(recs.slice(0, 1));
    setParent((p) => ({ ...p, country: code }));
    amySays(t("screens.onboarding.child_name_after_country"), 300);
    setTimeout(() => setStep("child-name"), 1300);
  }

  // ─── Country-confirm step ────────────────────────────────────────────────────
  if (step === "country-confirm") {
    const isDetecting = detectedCountry === "loading";
    const flag = flagEmoji(countryCode);
    const searchResults = countrySearch.trim().length > 0
      ? ALL_COUNTRIES.filter((c) =>
          c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
          c.code.toLowerCase().includes(countrySearch.toLowerCase())
        )
      : [];

    if (showCountryPicker) {
      return (
        <div className="min-h-dvh flex flex-col" style={{ background: BG }}>
          {/* Header */}
          <div
            className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
            style={{ background: BAR_BG, backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(168,85,247,0.15)" }}
          >
            <button
              onClick={() => { setShowCountryPicker(false); setCountrySearch(""); }}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: GLASS_BG, color: "#fff" }}
            >
              ←
            </button>
            <h2 className="text-base font-bold" style={{ color: "#fff" }}>
              {t("screens.onboarding.country_pick_popular")}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
            {/* Top 6 grid */}
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>
              {t("screens.onboarding.country_pick_popular")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TOP_COUNTRIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => confirmCountry(c.code, c.name)}
                  className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all text-left"
                  style={CHIP_DARK}
                >
                  <span style={{ fontSize: 22 }}>{c.flag}</span>
                  <span style={{ color: "#fff" }}>{c.name}</span>
                </button>
              ))}
            </div>

            {/* Search bar */}
            <div className="relative">
              <input
                type="text"
                placeholder={t("screens.onboarding.country_search_placeholder")}
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                autoFocus
                className="w-full rounded-2xl px-4 py-3.5 text-sm outline-none border"
                style={{ ...INPUT_DARK, paddingLeft: "2.75rem" }}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>🔍</span>
            </div>

            {/* Search results */}
            {countrySearch.trim().length > 0 && (
              searchResults.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {t("screens.onboarding.country_not_found")}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {searchResults.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => confirmCountry(c.code, c.name)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold border active:scale-95 transition-all text-left"
                      style={CHIP_DARK}
                    >
                      <span style={{ fontSize: 22 }}>{c.flag}</span>
                      <span style={{ color: "#fff" }}>{c.name}</span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center gap-6 px-5"
        style={{ background: BG }}
      >
        <AmyMascotLogo size={56} />

        {isDetecting ? (
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-10 h-10 rounded-full border-2"
              style={{
                borderColor: "rgba(255,255,255,0.15)",
                borderTopColor: "hsl(var(--brand-indigo-500))",
                animation: "spin 0.9s linear infinite",
              }}
            />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
              {t("screens.onboarding.country_detecting")}
            </p>
          </div>
        ) : (
          <>
            {/* Detected card */}
            <div
              className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-3"
              style={{ background: GLASS_BG, border: GLASS_BORDER }}
            >
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                {t("screens.onboarding.country_detected_in")}
              </p>
              <span style={{ fontSize: 56, lineHeight: 1 }}>{flag}</span>
              <h2 className="text-2xl font-extrabold text-center" style={{ color: "#fff" }}>
                {countryName}
              </h2>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full max-w-sm">
              <button
                onClick={() => confirmCountry(countryCode, countryName)}
                className="w-full py-4 rounded-2xl font-bold text-base active:scale-95 transition-all"
                style={{ background: GRAD, color: "#fff", boxShadow: "0 6px 24px rgba(99,102,241,0.4)" }}
              >
                {t("screens.onboarding.country_confirm_yes")}
              </button>
              <button
                onClick={() => setShowCountryPicker(true)}
                className="w-full py-3 text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.65)", background: "none", border: "none" }}
              >
                {t("screens.onboarding.country_change")}
              </button>
            </div>
          </>
        )}
      </div>
    );
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
          <h2 className="text-xl font-extrabold mb-2" style={{ color: "#fff" }}>
            {t("screens.onboarding.notif_title")}
          </h2>
          <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: "rgba(255,255,255,0.75)" }}>
            {t("screens.onboarding.notif_subtitle")}
          </p>
        </div>

        <div
          className="w-full max-w-sm rounded-2xl p-4"
          style={{ background: GLASS_BG, border: GLASS_BORDER }}
        >
          {[
            { emoji: "⏰", text: t("screens.onboarding.notif_benefit_routines") },
            { emoji: "🌙", text: t("screens.onboarding.notif_benefit_bedtime") },
            { emoji: "🍎", text: t("screens.onboarding.notif_benefit_meals") },
          ].map(({ emoji, text }) => (
            <div key={text} className="flex items-center gap-3 py-2">
              <span style={{ fontSize: 18 }}>{emoji}</span>
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{text}</p>
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
              <p className="text-xl font-bold" style={{ color: "#fff" }}>{t("screens.onboarding.saving_title")}</p>
              <p className="font-bold text-2xl mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>{t("screens.onboarding.saving_subtitle")}</p>
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
              <h2 className="text-2xl font-bold" style={{ color: "#fff" }}>{t("screens.onboarding.done_title")}</h2>
              <p className="mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>{t("screens.onboarding.done_subtitle", { name: childName })}</p>
            </div>
            <div
              className="w-full rounded-3xl p-5 shadow-xl"
              style={{ background: GLASS_BG, backdropFilter: "blur(12px)", border: GLASS_BORDER }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">✏️</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: "#fff" }}>{t("screens.onboarding.edit_anytime_title")}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
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
              style={INPUT_DARK}
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
              style={INPUT_DARK}
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
                  style={CHIP_DARK}
                >
                  {opt}
                </button>
              ))}
            </div>
            <button
              onClick={() => userReplies(t("screens.onboarding.skip_for_now"), "infant-sleep", t("screens.onboarding.skip_sleep_reply", { name: babyName }))}
              className="text-xs self-center mt-1" style={{ color: "rgba(255,255,255,0.55)" }}
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
                style={CHIP_DARK}
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
                style={CHIP_DARK}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );
      }

      case "child-class": {
        const useSouthAsianSystem = ["IN", "PK", "BD", "LK", "NP"].includes(countryCode);
        const classLabels = useSouthAsianSystem
          ? CLASS_KEYS.map((k) => t(`screens.onboarding.${k}`))
          : getClassSystem(countryCode).labels;
        const classValues = useSouthAsianSystem ? CLASS_VALUES : getClassSystem(countryCode).values;
        const selectedIdx = classValues.indexOf(selected);
        const selectedLabel = selectedIdx >= 0 ? classLabels[selectedIdx] : selected;
        return (
          <GridChips
            options={classLabels}
            selected={selectedLabel}
            onSelect={(label) => {
              const idx = classLabels.indexOf(label);
              const canonical = idx >= 0 ? classValues[idx] : label;
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
          <TimeChipPicker
            options={SCHOOL_START_OPTS}
            selected={selected}
            defaultValue={curr.schoolStartTime || "08:00"}
            onSelect={(v) => {
              setSelected(v);
              setCurr((c) => ({ ...c, schoolStartTime: to24h(v) }));
              userReplies(v, "child-school-end", t("screens.onboarding.school_end_question"));
            }}
          />
        );

      case "child-school-end":
        return (
          <TimeChipPicker
            options={SCHOOL_END_OPTS}
            selected={selected}
            defaultValue={curr.schoolEndTime || "15:00"}
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
                      background: on ? GRAD : GLASS_BG,
                      color: "#fff",
                      border: on ? "1px solid transparent" : "1px solid rgba(168,85,247,0.30)",
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
          <TimeChipPicker
            options={WAKE_OPTS}
            selected={selected}
            defaultValue={curr.wakeUpTime || "07:00"}
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
          <TimeChipPicker
            options={SLEEP_OPTS}
            selected={selected}
            defaultValue={curr.sleepTime || "21:00"}
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
                  : CHIP_DARK
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
              style={INPUT_DARK}
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
                style={CHIP_DARK}
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
                style={CHIP_DARK}
              >
                {label}
              </button>
            ))}
          </div>
        );
      }

      case "parent-region": {
        // South Asian users (IN, PK, BD, LK, NP) skip the top-level "Indian" tile
        // and land directly on the regional sub-cuisine list.  Everyone else sees
        // GLOBAL_CUISINES first; tapping "Indian Cuisine" drills into the sub-list.
        const isSouthAsianUser = ["IN", "PK", "BD", "LK", "NP"].includes(countryCode);
        const showingIndianSubs = isSouthAsianUser || regionDrillDown;
        const cuisines = showingIndianSubs ? INDIAN_SUBCUISINES : GLOBAL_CUISINES;
        const recommended = getRecommendedCuisines(countryCode);
        const maxReached = selectedRegions.length >= 3;
        const toggleRegion = (value: string) => {
          setSelectedRegions((prev) => {
            if (prev.includes(value)) return prev.filter((v) => v !== value);
            if (prev.length >= 3) return prev;
            return [...prev, value];
          });
        };
        return (
          <div className="flex flex-col gap-3">
            {/* Back link — only for non-South-Asian users who drilled in */}
            {regionDrillDown && !isSouthAsianUser && (
              <button
                onClick={() => {
                  setRegionDrillDown(false);
                  setSelectedRegions([]);
                }}
                className="flex items-center gap-1 text-xs self-start mb-0.5 active:opacity-70"
                style={{ color: "rgba(255,255,255,0.60)" }}
              >
                ← {t("screens.onboarding.region_back_to_cuisines")}
              </button>
            )}
            {/* Sub-list heading */}
            {showingIndianSubs && (
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.65)" }}>
                {t("screens.onboarding.region_indian_drilldown")}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              {cuisines.map((c) => {
                const isSelected = selectedRegions.includes(c.value);
                const isRec = recommended.includes(c.value);
                const isIndianEntry = c.value === "indian";
                return (
                  <button
                    key={c.value}
                    onClick={() => {
                      if (isIndianEntry) {
                        // Drill into the Indian regional sub-cuisine list
                        setRegionDrillDown(true);
                        // Pre-seed the first recommended Indian sub-cuisine so
                        // the user arrives with a sensible default highlighted.
                        const indRecs = recommended.filter((v) =>
                          INDIAN_SUBCUISINES.some((s) => s.value === v),
                        );
                        setSelectedRegions(indRecs.slice(0, 1));
                        return;
                      }
                      toggleRegion(c.value);
                    }}
                    disabled={!isIndianEntry && maxReached && !isSelected}
                    className="relative flex flex-col items-start p-3.5 rounded-2xl text-left border active:scale-95"
                    style={{
                      background: isSelected ? GRAD : "rgba(255,255,255,0.06)",
                      border: isSelected
                        ? "1.5px solid transparent"
                        : isRec
                        ? "1.5px solid rgba(168,85,247,0.50)"
                        : "1.5px solid rgba(255,255,255,0.12)",
                      opacity: !isIndianEntry && maxReached && !isSelected ? 0.45 : 1,
                      boxShadow: isSelected ? "0 0 18px rgba(168,85,247,0.35)" : undefined,
                      transition: "background 0.18s, box-shadow 0.18s, opacity 0.18s, transform 0.1s",
                    }}
                  >
                    {isRec && (
                      <span
                        className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight"
                        style={{
                          background: isSelected ? "rgba(255,255,255,0.22)" : "rgba(168,85,247,0.18)",
                          color: isSelected ? "#fff" : "#c084fc", // audit-ok: cuisine chip selected-state accent — matches brand-purple-400 inline style, not expressible via Tailwind class
                          border: "1px solid rgba(168,85,247,0.38)",
                        }}
                      >
                        ★ {t("screens.onboarding.region_recommended")}
                      </span>
                    )}
                    {/* "Indian Cuisine" tile gets a drill-down indicator */}
                    {isIndianEntry && (
                      <span
                        className="absolute top-2 right-2 text-base leading-none"
                        style={{ color: "rgba(255,255,255,0.55)" }}
                      >›</span>
                    )}
                    <span className="text-xl mb-1 leading-none">{c.emoji}</span>
                    <span className="text-sm font-semibold text-white leading-tight pr-4">
                      {t(`screens.onboarding.${c.labelKey}`)}
                    </span>
                    <span
                      className="text-[11px] mt-0.5 leading-tight"
                      style={{ color: "rgba(255,255,255,0.58)" }}
                    >
                      {t(`screens.onboarding.${c.subtextKey}`)}
                    </span>
                    {isSelected && (
                      <span
                        className="absolute bottom-2 right-2 text-xs font-bold"
                        style={{ color: "rgba(255,255,255,0.85)" }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {maxReached && (
              <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.48)" }}>
                {t("screens.onboarding.region_max_reached")}
              </p>
            )}
            <button
              onClick={() => {
                const regionStr =
                  selectedRegions.length > 0
                    ? selectedRegions.join(",")
                    : getDefaultRegion(countryCode);
                setParent((p) => ({ ...p, region: regionStr }));
                const labels = selectedRegions
                  .map((v) => {
                    const found = ALL_CUISINE_MAP[v];
                    return found ? t(`screens.onboarding.${found.labelKey}`) : v;
                  })
                  .join(", ");
                userReplies(
                  labels || regionStr,
                  "parent-mobile",
                  t("screens.onboarding.mobile_question"),
                );
              }}
              disabled={selectedRegions.length === 0}
              className="w-full py-3 rounded-2xl font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: selectedRegions.length > 0 ? GRAD : "rgba(255,255,255,0.10)",
                color: "#fff",
                opacity: selectedRegions.length > 0 ? 1 : 0.5,
              }}
            >
              {t("screens.onboarding.continue")}
            </button>
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
                style={INPUT_DARK}
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
              className="text-xs self-center mt-1" style={{ color: "rgba(255,255,255,0.55)" }}
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
                style={INPUT_DARK}
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
              className="text-xs self-center mt-1" style={{ color: "rgba(255,255,255,0.55)" }}
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
        style={{ background: BAR_BG, backdropFilter: "blur(8px)", borderBottom: "1px solid rgba(168,85,247,0.15)" }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2.5">
            <AmyAvatar size={8} />
            <div>
              <p className="text-xs font-bold" style={{ color: "#fff" }}>{t("screens.onboarding.amy_coach")}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{t("screens.onboarding.setting_up")}</p>
            </div>
          </div>
          <span className="text-[11px] font-semibold px-3 py-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>
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
          style={{ background: BAR_BG, backdropFilter: "blur(8px)", borderTop: "1px solid rgba(168,85,247,0.15)" }}
        >
          {renderInput()}
          <p className="text-center text-[9px] font-bold tracking-widest uppercase mt-3" style={{ color: "rgba(168,85,247,0.35)" }}>
            {t("patent_pending.powered_by")}
          </p>
        </div>
      )}
    </div>
  );
}
