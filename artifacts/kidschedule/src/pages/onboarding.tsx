import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { ChatThread, type InteractionEvent } from "@/components/chat-thread";
import { OnboardingCountryModal } from "@/components/onboarding-country-modal";
import {
  buildOnboardingThreadMessages,
  ONBOARDING_COMPOSER_STEPS,
  onboardingComposerPlaceholder,
} from "@/hooks/use-onboarding-thread";
import {
  chatMessage,
  type ChatMessage,
  type OnboardingStep,
} from "@/lib/onboarding-chat-types";
import {
  clearOnboardingChatSession,
  loadOnboardingChatSession,
  saveOnboardingChatSession,
} from "@/lib/onboarding-chat-session";
import { useAuth, useUser } from "@/lib/firebase-auth-hooks";
import { ensureAuthContextSynced } from "@/lib/auth-session-sync";
import {
  forceSyncAuthFromCurrentUser,
  hasUsableAuthSession,
} from "@/lib/firebase-auth-listener";
import { waitForIdToken } from "@/lib/auth-token";
import { isNativeAmyNestAndroidWrapper } from "@/lib/device-lite";
import { navigateAfterOnboardingComplete } from "@/lib/onboarding-navigation";
import {
  readFirebaseUserId,
  readOAuthParentNameHint,
} from "@/lib/oauth-profile-hints";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { useTrialState } from "@/hooks/use-trial-state";
import {
  FF_POST_ONBOARDING_TRIAL,
} from "@/lib/subscription-feature-flags";
import {
  wasOnboardingTrialSeen,
} from "@/lib/subscription-funnel-storage";
import { logOnboardingState } from "@/lib/onboarding-debug";
import { logOnboardingPipelineSnapshot } from "@/lib/onboarding-pipeline-log";
import {
  OnboardingFinishError,
  runOnboardingFinishTransaction,
} from "@/lib/onboarding-completion";
import {
  createOnboardingRunId,
  clearOnboardingRunId,
} from "@/lib/onboarding-telemetry";
import {
  applySetupStatusUpdate,
  isSetupComplete,
  persistOnboardingCache,
  readOnboardingCache,
  resolveSetupStatus,
} from "@/lib/setup-status";
import {
  getNativePushBridge,
  getBrowserNotificationPermission,
  requestNativePushPermission,
  registerNativePushToken,
} from "@/lib/native-push-bridge";
import {
  checkGeoPermission,
  fetchGrantedLocation,
  requestLocationWithUserGesture,
  resolveLocationFallback,
  type GeoCoords,
  type LocationSource,
  type ResolvedLocation,
} from "@/lib/onboarding-location";

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
  dietType?: string;
  latitude?: number;
  longitude?: number;
  locationSource?: LocationSource;
}

type LocationDetectionState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "needs-permission" }
  | { status: "fetching" }
  | { status: "detected" }
  | { status: "fallback" }
  | { status: "denied" }

type ParentGoalCode =
  | "improve_sleep"
  | "reduce_tantrums"
  | "improve_focus"
  | "reduce_screen_time"
  | "increase_independence";

type Step = OnboardingStep;

const ONBOARDING_CHAT_STEPS = new Set<Step>([
  "intro",
  "country-confirm",
  "child-name",
  "child-dob",
  "infant-feeding",
  "infant-sleep",
  "child-school",
  "child-class",
  "child-school-start",
  "child-school-end",
  "child-school-days",
  "child-wake",
  "child-sleep",
  "add-more",
  "parent-name",
  "parent-role",
  "parent-work",
  "parent-region",
  "parent-diet",
  "parent-goals",
  "parent-mobile",
  "parent-allergies",
]);

const ONBOARDING_TEXT_INPUT_STEPS = new Set<Step>([
  "country-confirm",
  "child-name",
  "child-dob",
  "parent-name",
  "parent-mobile",
  "parent-allergies",
]);

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
const PARENT_GOAL_CODES: ParentGoalCode[] = [
  "improve_sleep",
  "reduce_tantrums",
  "improve_focus",
  "reduce_screen_time",
  "increase_independence",
];

/** Diet types aligned with parent-profile + child form + meals API. */
const ONBOARDING_DIET_OPTIONS = [
  { value: "vegetarian", emoji: "🥦", labelKey: "diet_vegetarian" },
  { value: "vegan", emoji: "🌱", labelKey: "diet_vegan" },
  { value: "eggetarian", emoji: "🥚", labelKey: "diet_eggetarian" },
  { value: "non_veg", emoji: "🍗", labelKey: "diet_non_veg" },
  { value: "jain", emoji: "🙏", labelKey: "diet_jain" },
  { value: "halal", emoji: "☪️", labelKey: "diet_halal" },
  { value: "kosher", emoji: "✡️", labelKey: "diet_kosher" },
  { value: "sattvik", emoji: "🕉️", labelKey: "diet_sattvik" },
] as const;

function deriveFoodTypeFromDiet(dietType: string): "veg" | "non_veg" {
  return ["vegetarian", "vegan", "eggetarian", "jain", "sattvik"].includes(dietType) ? "veg" : "non_veg";
}

function dietNoteForType(dietType: string): string {
  const notes: Record<string, string> = {
    vegan: "Vegan — strictly no animal products including dairy and eggs",
    eggetarian: "Eggetarian — eggs are OK, no meat or fish",
    jain: "Jain diet — strictly no onion, garlic, root vegetables (potato, carrot, radish, beetroot)",
    halal: "Halal only — no pork, meat must be halal-certified",
    kosher: "Kosher only — no pork or shellfish, never mix meat & dairy",
    sattvik: "Sattvik — pure vegetarian, no onion or garlic, freshly cooked",
  };
  return notes[dietType] ?? "";
}

function deriveFoodStyleFromRegions(regions: string[]): { foodStyle: string; subCuisine: string } {
  const indianSubs = ["north_indian", "south_indian", "gujarati", "maharashtrian", "punjabi", "bengali", "pan_indian"];
  const sub = regions.find((r) => indianSubs.includes(r));
  if (sub) return { foodStyle: "indian", subCuisine: sub === "pan_indian" ? "" : sub };
  if (regions.includes("indian")) return { foodStyle: "indian", subCuisine: "" };
  if (regions.includes("western")) return { foodStyle: "western", subCuisine: "" };
  if (regions.includes("asian")) return { foodStyle: "asian", subCuisine: "" };
  if (regions.includes("middle_eastern")) return { foodStyle: "middle_eastern", subCuisine: "" };
  return { foodStyle: "mixed", subCuisine: "" };
}

/** Canonical allergy codes — aligned with meals API + child form. */
const ONBOARDING_ALLERGY_CHIPS = [
  { value: "dairy", emoji: "🥛", labelKey: "allergy_dairy" },
  { value: "gluten", emoji: "🌾", labelKey: "allergy_gluten" },
  { value: "eggs", emoji: "🥚", labelKey: "allergy_eggs" },
  { value: "nuts", emoji: "🥜", labelKey: "allergy_nuts" },
  { value: "peanuts", emoji: "🥜", labelKey: "allergy_peanuts" },
  { value: "soy", emoji: "🫘", labelKey: "allergy_soy" },
  { value: "shellfish", emoji: "🦐", labelKey: "allergy_shellfish" },
  { value: "sesame", emoji: "🌰", labelKey: "allergy_sesame" },
] as const;

const ALLERGY_CHIP_VALUES = ONBOARDING_ALLERGY_CHIPS.map((c) => c.value);

function buildAllergiesString(chips: string[], otherText: string): string {
  const extra = otherText
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .filter((s) => !ALLERGY_CHIP_VALUES.includes(s as typeof ALLERGY_CHIP_VALUES[number]));
  const unique = [...new Set([...chips.map((c) => c.toLowerCase()), ...extra])];
  return unique.join(", ");
}
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

// ─── Sub-components ──────────────────────────────────────────────────────────
function AmyAvatar({ size = 8 }: { size?: number }) {
  return <AmyMascotLogo size={size * 4} />;
}

function ProgressBar({ step }: { step: Step }) {
  const { t } = useTranslation();
  // Infant path is short; standard path is longer. Both share the parent section.
  const infantOrder: Step[] = [
    "country-confirm",
    "child-name", "child-dob", "infant-feeding", "infant-sleep",
    "add-more", "parent-name", "parent-role", "parent-work",
    "parent-region", "parent-diet", "parent-goals",
    "parent-mobile", "parent-allergies",
  ];
  const standardOrder: Step[] = [
    "country-confirm",
    "child-name", "child-dob", "child-school", "child-class",
    "child-school-start", "child-school-end", "child-school-days",
    "child-wake", "child-sleep",
    "add-more", "parent-name", "parent-role", "parent-work",
    "parent-region", "parent-diet", "parent-goals",
    "parent-mobile", "parent-allergies",
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
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth();
  const { entitlements } = useSubscription();
  const { canStartTrial } = useTrialState();
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const [navigatingToDashboard, setNavigatingToDashboard] = useState(false);
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

  const restoredSession = useMemo(() => {
    if (isSetupComplete(readOnboardingCache())) {
      clearOnboardingChatSession();
      return null;
    }
    return loadOnboardingChatSession();
  }, []);
  const restoredData = restoredSession?.data;
  const [sessionRestored] = useState(
    () => Boolean(restoredData?.messages?.length && restoredSession?.step !== "intro"),
  );
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const onboardingRunIdRef = useRef<string | null>(null);
  const completionOnceRef = useRef(false);
  const onboardingJustFinishedRef = useRef(false);

  const [step, setStep] = useState<Step>(() => restoredSession?.step ?? "intro");
  const [notifLoading, setNotifLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    (restoredData?.messages ?? []).map((m, i) => ({
      ...m,
      id: m.id ?? `legacy-${i}-${m.role}`,
    })),
  );
  const [textInput, setTextInput] = useState(() => restoredData?.textInput ?? "");
  const [selected, setSelected] = useState("");
  const [dobInput, setDobInput] = useState("");
  const [regionDrillDown, setRegionDrillDown] = useState(false);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedDietType, setSelectedDietType] = useState("");
  const [selectedParentGoals, setSelectedParentGoals] = useState<ParentGoalCode[]>([]);
  const [allergyChips, setAllergyChips] = useState<string[]>([]);
  const [allergyOtherOpen, setAllergyOtherOpen] = useState(false);
  const [allergyOtherText, setAllergyOtherText] = useState("");
  const [countryCode, setCountryCode] = useState(() => restoredData?.countryCode ?? "");
  const [countryName, setCountryName] = useState(() => restoredData?.countryName ?? "");
  const [locationState, setLocationState] = useState<LocationDetectionState>({ status: "idle" });
  const [detectedCoords, setDetectedCoords] = useState<GeoCoords | null>(null);
  const [locationSource, setLocationSource] = useState<LocationSource | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryPickerRequired, setCountryPickerRequired] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [locationRequesting, setLocationRequesting] = useState(false);

  const [children, setChildren] = useState<ChildData[]>(
    () => (restoredData?.children as ChildData[] | undefined) ?? [],
  );
  const [curr, setCurr] = useState<Partial<ChildData>>(
    () => (restoredData?.curr as Partial<ChildData> | undefined) ?? {},
  );
  const [parent, setParent] = useState<Partial<ParentData>>(
    () => (restoredData?.parent as Partial<ParentData> | undefined) ?? {},
  );

  // Facebook / Google / Apple often supply displayName — seed parent name for profile save.
  useEffect(() => {
    if (!authLoaded || !isSignedIn) return;
    const oauthName = readOAuthParentNameHint();
    if (!oauthName) return;
    setParent((p) => {
      if (typeof p.name === "string" && p.name.trim().length > 0) return p;
      return { ...p, name: oauthName };
    });
  }, [authLoaded, isSignedIn]);

  const pendingTimersRef = useRef<number[]>([]);

  const scheduleOnboardingTimeout = useCallback((fn: () => void, delayMs: number) => {
    const id = window.setTimeout(() => {
      pendingTimersRef.current = pendingTimersRef.current.filter((t) => t !== id);
      fn();
    }, delayMs);
    pendingTimersRef.current.push(id);
    return id;
  }, []);

  useEffect(
    () => () => {
      pendingTimersRef.current.forEach((id) => window.clearTimeout(id));
      pendingTimersRef.current = [];
    },
    [],
  );

  // Amy sends a message after a typing delay
  function amySays(text: string, delay = 700) {
    setTyping(true);
    scheduleOnboardingTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, chatMessage("amy", text)]);
    }, delay);
  }

  // User replies, adds to history, then advances
  function userReplies(text: string, nextStep: Step, nextAmyMsg?: string, delay = 900) {
    setMessages((m) => [...m, chatMessage("user", text)]);
    setSelected("");
    setTextInput("");
    if (nextAmyMsg) {
      scheduleOnboardingTimeout(() => amySays(nextAmyMsg, delay), 300);
    }
    scheduleOnboardingTimeout(() => {
      setStep(nextStep);
    }, nextAmyMsg ? delay + 700 : 400);
  }

  function formatAllergySummary(chips: string[], otherText: string): string {
    const chipLabels = chips.map((v) => {
      const chip = ONBOARDING_ALLERGY_CHIPS.find((c) => c.value === v);
      return chip ? `${chip.emoji} ${t(`screens.onboarding.${chip.labelKey}`)}` : v;
    });
    const otherParts = otherText
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !ALLERGY_CHIP_VALUES.includes(s.toLowerCase() as typeof ALLERGY_CHIP_VALUES[number]));
    const all = [...chipLabels, ...otherParts];
    return all.length > 0 ? all.join(", ") : t("screens.onboarding.no_allergies_reply");
  }

  function persistOnboardingSessionSnapshot(currentStep: Step = step) {
    if (isFinishing || !ONBOARDING_CHAT_STEPS.has(currentStep)) return;
    saveOnboardingChatSession({
      step: currentStep,
      messages,
      textInput,
      countryCode,
      countryName,
      curr: curr as Record<string, unknown>,
      parent: parent as Record<string, unknown>,
      children: children as unknown as Record<string, unknown>[],
    });
  }

  function finishAllergies(none: boolean) {
    if (isFinishing) return;
    setIsFinishing(true);
    onboardingRunIdRef.current = createOnboardingRunId();
    void logOnboardingPipelineSnapshot("finish-button-click", authFetch, {
      userId: user?.id ?? readFirebaseUserId(),
      onboardingRunId: onboardingRunIdRef.current,
      extra: { none, step: "parent-allergies" },
    });
    const allergiesStr = none ? "" : buildAllergiesString(allergyChips, allergyOtherText);
    setParent((p) => ({ ...p, allergies: allergiesStr }));
    const summary = none
      ? t("screens.onboarding.no_allergies_reply")
      : formatAllergySummary(allergyChips, allergyOtherText);
    userReplies(summary, "saving");
    scheduleOnboardingTimeout(() => void saveEverything(allergiesStr), 800);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as Window & { __amynestOnboardingStep?: string }).__amynestOnboardingStep = step;
  }, [step]);

  // If the server already has a complete profile (e.g. prior partial save), skip onboarding.
  useEffect(() => {
    if (!isSignedIn || isFinishing) return;
    let cancelled = false;
    void (async () => {
      await logOnboardingPipelineSnapshot("bootstrap-after-reload", authFetch, {
        userId: user?.id ?? readFirebaseUserId(),
        extra: { trigger: "onboarding-page-mount" },
      });
      const status = await resolveSetupStatus(authFetch);
      if (cancelled || !isSetupComplete(status)) return;
      persistOnboardingCache(status);
      queryClient.setQueryData(["onboarding-status"], status);
      clearOnboardingChatSession();
      setLocation("/dashboard");
    })();
    return () => {
      cancelled = true;
    };
  }, [authFetch, isFinishing, isSignedIn, queryClient, setLocation, user?.id]);

  // Persist chat transcript + step for resume after app restart (debounced).
  useEffect(() => {
    if (isFinishing || !ONBOARDING_CHAT_STEPS.has(step)) return;
    const persistTimer = window.setTimeout(() => {
      saveOnboardingChatSession({
        messages,
        step,
        textInput,
        countryCode,
        countryName,
        curr: curr as Record<string, unknown>,
        parent: parent as Record<string, unknown>,
        children: children as unknown as Record<string, unknown>[],
      });
    }, 400);
    return () => window.clearTimeout(persistTimer);
  }, [messages, step, textInput, countryCode, countryName, curr, parent, children]);

  // Boot: Amy intro (skip when restoring a saved session)
  useEffect(() => {
    if (sessionRestored) return;
    if (step !== "intro") return;
    const firstName = user?.firstName || t("screens.onboarding.intro_default_name");
    scheduleOnboardingTimeout(() => {
      setMessages([
        chatMessage("amy", t("screens.onboarding.intro_greeting", { name: firstName })),
      ]);
      scheduleOnboardingTimeout(
        () => amySays(t("screens.onboarding.country_transition_msg"), 800),
        900,
      );
      scheduleOnboardingTimeout(() => setStep("country-confirm"), 2600);
    }, 600);
  }, [scheduleOnboardingTimeout, sessionRestored, step, t, user?.firstName]);

  // Dismiss a lingering keyboard when moving to chip/button-only steps (Android WebView).
  useEffect(() => {
    if (ONBOARDING_TEXT_INPUT_STEPS.has(step)) return;
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      active.blur();
    }
  }, [step]);

  // ─── Save & finish ──────────────────────────────────────────────────────────
  async function saveEverything(allergiesOverride?: string) {
    if (completionOnceRef.current) return;
    completionOnceRef.current = true;
    setIsFinishing(true);
    if (!onboardingRunIdRef.current) {
      onboardingRunIdRef.current = createOnboardingRunId();
    }
    setFinishError(null);
    setStep("saving");
    setMessages((m) => [...m, chatMessage("amy", t("screens.onboarding.saving_message"))]);

    const dietType = selectedDietType || "vegetarian";
    const foodType = deriveFoodTypeFromDiet(dietType);
    const allRegions = selectedRegions.length > 0 ? selectedRegions : [parent.region ?? getDefaultRegion(countryCode)];
    const { foodStyle: derivedFoodStyle, subCuisine: derivedSubCuisine } = deriveFoodStyleFromRegions(allRegions);
    const dietNote = dietNoteForType(dietType);
    const allergies = allergiesOverride ?? parent.allergies ?? "";

    const parentBody: Record<string, unknown> = {
      name: parent.name?.trim() || readOAuthParentNameHint() || "",
      role: (parent.role || "mother").toLowerCase(),
      workType: parent.workType || "work_from_home",
      region: parent.region || allRegions.join(",") || getDefaultRegion(countryCode),
      country: parent.country || countryCode,
      dietType,
      foodType,
      foodStyle: derivedFoodStyle,
      subCuisine: derivedSubCuisine || null,
    };
    if (typeof parent.latitude === "number") parentBody.latitude = parent.latitude;
    if (typeof parent.longitude === "number") parentBody.longitude = parent.longitude;
    if (parent.locationSource) parentBody.locationSource = parent.locationSource;
    if (parent.mobileNumber) parentBody.mobileNumber = parent.mobileNumber;
    if (allergies) parentBody.allergies = allergies;

    const childPayloads = children.map((child) => {
      const goalsParts = ["balanced-routine"];
      if (dietNote) goalsParts.unshift(dietNote);
      return {
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
        foodType,
        dietType,
        foodStyle: derivedFoodStyle,
        subCuisine: derivedSubCuisine || null,
        allergies: allergies || null,
        foodPrefInherited: true,
        foodPrefCustomized: false,
        feedingType: child.feedingType || null,
        sleepPattern: child.sleepPattern || null,
        goals: goalsParts.join("|"),
      };
    });

    try {
      await logOnboardingPipelineSnapshot("save-everything-start", authFetch, {
        userId: user?.id ?? readFirebaseUserId(),
        onboardingRunId: onboardingRunIdRef.current ?? undefined,
      });
      await ensureAuthContextSynced();
      const token = await waitForIdToken(getToken, {
        skipCache: true,
        maxAttempts: isNativeAmyNestAndroidWrapper() ? 24 : 12,
        delayMs: 200,
      });
      if (!token) {
        throw new OnboardingFinishError(
          "auth-token",
          "Sign-in session is not ready yet. Wait a moment and tap finish again.",
        );
      }
      await runOnboardingFinishTransaction(authFetch, {
        parent: parentBody,
        children: childPayloads,
        selectedParentGoals,
        userId: user?.id ?? readFirebaseUserId(),
        onboardingRunId: onboardingRunIdRef.current ?? undefined,
        onboardingMeta: {
          children: children.map((c) => ({
            name: c.name,
            ageGroup: `${c.age}`,
            problems: selectedParentGoals,
          })),
          parent: {
            caregiver: parent.role,
            concern: "",
            routineLevel: "medium",
            dietType,
          },
          priorityGoal: selectedParentGoals[0] ?? "balanced-routine",
        },
      });

      await logOnboardingPipelineSnapshot("save-everything-after-transaction", authFetch, {
        userId: user?.id ?? readFirebaseUserId(),
        onboardingRunId: onboardingRunIdRef.current ?? undefined,
      });

      const completeStatus = { onboardingComplete: true, profileComplete: true };
      onboardingJustFinishedRef.current = true;
      persistOnboardingCache(completeStatus);
      queryClient.setQueryData(["onboarding-status"], completeStatus);

      await logOnboardingPipelineSnapshot("save-everything-after-cache", authFetch, {
        userId: user?.id ?? readFirebaseUserId(),
        onboardingRunId: onboardingRunIdRef.current ?? undefined,
        skipApiFetch: false,
      });
      clearOnboardingChatSession();
      clearOnboardingRunId();
      onboardingRunIdRef.current = null;

      logOnboardingState("save-complete", user, {
        entitlements,
        isLoaded: authLoaded,
        isSignedIn,
      });

      scheduleOnboardingTimeout(() => setStep("done"), 600);
    } catch (e) {
      const message =
        e instanceof OnboardingFinishError
          ? e.message
          : e instanceof Error
            ? e.message
            : t("screens.onboarding.save_failed");
      void logOnboardingPipelineSnapshot("save-everything-failed", authFetch, {
        userId: user?.id ?? readFirebaseUserId(),
        onboardingRunId: onboardingRunIdRef.current ?? undefined,
        error: message,
        extra: {
          code: e instanceof OnboardingFinishError ? e.step : undefined,
        },
      });
      console.error("[onboarding] finish transaction failed", e);
      setFinishError(message);
      setStep("parent-allergies");
      setMessages((m) => [
        ...m,
        chatMessage("amy", t("screens.onboarding.save_failed")),
      ]);
      persistOnboardingSessionSnapshot("parent-allergies");
      completionOnceRef.current = false;
    } finally {
      setIsFinishing(false);
    }
  }

  async function refreshBeforeDashboard(): Promise<void> {
    try {
      await queryClient.invalidateQueries({ queryKey: ["children"] });
      await queryClient.invalidateQueries({ queryKey: ["subscription"] });
      const cached = readOnboardingCache();
      const status = await resolveSetupStatus(authFetch);
      const merged = applySetupStatusUpdate(cached, status);
      if (isSetupComplete(merged)) {
        persistOnboardingCache(merged);
      }
      queryClient.setQueryData(["onboarding-status"], merged);
    } catch (e) {
      console.error("[onboarding] refresh before dashboard failed", e);
      const cached = readOnboardingCache();
      if (isSetupComplete(cached)) {
        queryClient.setQueryData(["onboarding-status"], cached);
      }
    }
  }

  async function goDashboard() {
    if (navigatingToDashboard) return;
    setNavigatingToDashboard(true);
    await logOnboardingPipelineSnapshot("go-dashboard-start", authFetch, {
      userId: user?.id ?? readFirebaseUserId(),
      extra: { onboardingJustFinished: onboardingJustFinishedRef.current },
    });
    logOnboardingState("go-dashboard", user, {
      entitlements,
      isLoaded: authLoaded,
      isSignedIn,
    });

    // When onboarding just succeeded, the completion status is already persisted.
    // Skip the long auth-sync wait — Firebase token restore can take > 20 s on
    // Android WebView, which previously caused a redirect to /sign-in instead of
    // /dashboard. Auth will self-heal once the dashboard mounts.
    if (onboardingJustFinishedRef.current) {
      const completeStatus = { onboardingComplete: true, profileComplete: true };
      persistOnboardingCache(completeStatus);
      queryClient.setQueryData(["onboarding-status"], completeStatus);
      onboardingJustFinishedRef.current = false;
      const trialPath =
        FF_POST_ONBOARDING_TRIAL && canStartTrial && !wasOnboardingTrialSeen()
          ? "/subscription-trial"
          : "/dashboard";
      navigateAfterOnboardingComplete(trialPath);
      // Use Wouter setLocation as a direct fallback in case PopStateEvent is ignored.
      setLocation(trialPath);
      await logOnboardingPipelineSnapshot("go-dashboard-end", authFetch, {
        userId: user?.id ?? readFirebaseUserId(),
        extra: { trialPath, fastPath: true },
      });
      setNavigatingToDashboard(false);
      return;
    }

    if (!authLoaded) {
      console.warn("[onboarding] auth not loaded yet, waiting…");
      await new Promise((r) => setTimeout(r, 400));
    }
    forceSyncAuthFromCurrentUser();
    await ensureAuthContextSynced(
      isNativeAmyNestAndroidWrapper() ? 20_000 : 12_000,
    ).catch(() => {
      forceSyncAuthFromCurrentUser();
    });
    const sessionOk = isSignedIn || hasUsableAuthSession();
    const cachedComplete = isSetupComplete(readOnboardingCache());
    // If the cache says onboarding is complete, never send the user to /sign-in.
    if (!sessionOk && !cachedComplete) {
      console.warn("[onboarding] user missing, redirecting to sign-in");
      setNavigatingToDashboard(false);
      setLocation("/sign-in");
      return;
    }
    if (!cachedComplete) {
      await refreshBeforeDashboard();
    }
    const status = applySetupStatusUpdate(
      readOnboardingCache(),
      queryClient.getQueryData<{
        onboardingComplete?: boolean;
        profileComplete?: boolean;
      }>(["onboarding-status"]),
    );
    const canEnterApp = cachedComplete || isSetupComplete(status);
    if (!canEnterApp) {
      console.warn("[onboarding] setup still incomplete after refresh — staying on onboarding");
      setNavigatingToDashboard(false);
      setFinishError(t("screens.onboarding.save_failed"));
      setStep("parent-allergies");
      return;
    }
    const trialPath =
      FF_POST_ONBOARDING_TRIAL && canStartTrial && !wasOnboardingTrialSeen()
        ? "/subscription-trial"
        : "/dashboard";
    navigateAfterOnboardingComplete(trialPath);
    // Direct Wouter navigation as a belt-and-suspenders fallback.
    setLocation(trialPath);
    await logOnboardingPipelineSnapshot("go-dashboard-end", authFetch, {
      userId: user?.id ?? readFirebaseUserId(),
      extra: { trialPath, fastPath: false },
    });
    setNavigatingToDashboard(false);
  }

  function applyResolvedLocation(resolved: ResolvedLocation) {
    const known = ALL_COUNTRIES.find((c) => c.code === resolved.country.countryCode);
    const name = known?.name ?? resolved.country.countryName;
    setCountryCode(resolved.country.countryCode);
    setCountryName(name);
    setDetectedCoords(resolved.coords);
    setLocationSource(resolved.source);
    setLocationState({ status: "detected" });
    setCountryPickerRequired(false);
    setShowCountryPicker(false);
  }

  async function handleLocationFallback() {
    setLocationState({ status: "fallback" });
    const fallback = await resolveLocationFallback();
    if (fallback) {
      applyResolvedLocation(fallback);
      return;
    }
    setLocationState({ status: "denied" });
    setCountryPickerRequired(true);
    setShowCountryPicker(true);
  }

  async function handleAllowLocation() {
    if (locationRequesting) return;
    setLocationRequesting(true);
    setLocationState({ status: "fetching" });
    try {
      const resolved = await requestLocationWithUserGesture();
      applyResolvedLocation(resolved);
    } catch {
      await handleLocationFallback();
    } finally {
      setLocationRequesting(false);
    }
  }

  useEffect(() => {
    if (step !== "country-confirm") return;

    let cancelled = false;
    setLocationState({ status: "needs-permission" });

    (async () => {
      const permission = await checkGeoPermission();
      if (cancelled) return;

      if (permission !== "granted") return;

      setLocationState({ status: "fetching" });
      try {
        const resolved = await fetchGrantedLocation();
        if (!cancelled) applyResolvedLocation(resolved);
      } catch {
        if (!cancelled) await handleLocationFallback();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  function confirmCountry(
    code: string,
    name: string,
    opts?: { coords?: GeoCoords | null; source?: LocationSource },
  ) {
    setCountryCode(code);
    setCountryName(name);
    setShowCountryPicker(false);
    setCountrySearch("");
    setCountryPickerRequired(false);
    setRegionDrillDown(false);
    const recs = getRecommendedCuisines(code);
    setSelectedRegions(recs.slice(0, 1));
    const source = opts?.source ?? "manual";
    setParent((p) => ({
      ...p,
      country: code,
      latitude: opts?.coords?.latitude,
      longitude: opts?.coords?.longitude,
      locationSource: source,
    }));
    amySays(t("screens.onboarding.child_name_after_country"), 300);
    scheduleOnboardingTimeout(() => setStep("child-name"), 1300);
  }

  const threadMessages = useMemo(
    () =>
      buildOnboardingThreadMessages({
        step,
        messages,
        typing,
        isFinishing,
        t,
        countryCode,
        countryName,
        locationState,
        locationSource,
        locationRequesting,
        regionDrillDown,
        countryCodeForRegion: countryCode,
        finishError,
        handlers: {
          onAllowLocation: () => void handleAllowLocation(),
          onPickCountryManually: () => {
            setCountryPickerRequired(true);
            setShowCountryPicker(true);
          },
          onConfirmDetectedCountry: () => {
            confirmCountry(countryCode, countryName, {
              coords: detectedCoords,
              source: locationSource ?? "manual",
            });
          },
          onChangeCountry: () => {
            setCountryPickerRequired(false);
            setShowCountryPicker(true);
          },
        },
      }),
    [
      step,
      messages,
      typing,
      isFinishing,
      t,
      countryCode,
      countryName,
      locationState,
      locationSource,
      locationRequesting,
      regionDrillDown,
      finishError,
      detectedCoords,
    ],
  );

  function handleOnboardingSend() {
    const text = textInput.trim();
    if (!text || isFinishing) return;
    switch (step) {
      case "child-name": {
        const name = text;
        setCurr((c) => ({ ...c, name }));
        userReplies(name, "child-dob", t("screens.onboarding.child_name_reply", { name }));
        break;
      }
      case "parent-name": {
        const name = text;
        setParent((p) => ({ ...p, name }));
        userReplies(name, "parent-role", t("screens.onboarding.parent_name_reply", { name }));
        break;
      }
      case "parent-mobile": {
        setParent((p) => ({ ...p, mobileNumber: text }));
        userReplies(text, "parent-allergies", t("screens.onboarding.allergies_question"));
        break;
      }
      default:
        break;
    }
  }

  function handleOnboardingInteraction(event: InteractionEvent) {
    if (isFinishing) return;

    if (event.type === "date" && event.dateValue && step === "child-dob") {
      const { years, months } = dobToAge(event.dateValue);
      const ageGroup = getAgeGroup(years);
      setCurr((c) => ({ ...c, dob: event.dateValue!, age: years, ageMonths: months, ageGroup }));
      const name = curr.name || t("screens.onboarding.default_child_name");
      if (ageGroup === "infant") {
        userReplies(event.dateValue, "infant-feeding", t("screens.onboarding.infant_dob_reply", { name }), 900);
      } else {
        userReplies(event.dateValue, "child-school", t("screens.onboarding.school_question", { name }), 900);
      }
      return;
    }

    if (event.type === "time-quick" && event.timeValue) {
      const v = event.timeValue;
      const name = curr.name || t("screens.onboarding.default_child_name");
      if (step === "child-school-start") {
        setCurr((c) => ({ ...c, schoolStartTime: to24h(v) }));
        userReplies(v, "child-school-end", t("screens.onboarding.school_end_question"));
      } else if (step === "child-school-end") {
        setCurr((c) => ({ ...c, schoolEndTime: to24h(v), schoolDays: c.schoolDays ?? [1, 2, 3, 4, 5] }));
        userReplies(v, "child-school-days", t("screens.onboarding.school_days_question", { name }));
      } else if (step === "child-wake") {
        setCurr((c) => ({ ...c, wakeUpTime: to24h(v) }));
        userReplies(v, "child-sleep", t("screens.onboarding.sleep_question", { name }));
      } else if (step === "child-sleep") {
        const finalChild = {
          ...curr,
          sleepTime: to24h(v),
          ageGroup: curr.ageGroup ?? getAgeGroup(curr.age ?? 3),
        } as ChildData;
        setChildren((prev) => [...prev, finalChild]);
        setCurr({});
        userReplies(v, "add-more", children.length + 1 === 1
          ? t("screens.onboarding.child_added_first_school")
          : t("screens.onboarding.child_added_more"));
      }
      return;
    }

    if (event.type === "single-select" && event.optionValue) {
      const label = event.optionLabel ?? event.optionValue;
      const value = event.optionValue;
      switch (step) {
        case "infant-feeding": {
          setCurr((c) => ({ ...c, feedingType: value as ChildData["feedingType"] }));
          const babyName = curr.name || t("screens.onboarding.default_baby_name");
          userReplies(label, "infant-sleep", t("screens.onboarding.feeding_reply", { name: babyName }));
          break;
        }
        case "infant-sleep": {
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
            sleepPattern: value,
          };
          setChildren((prev) => [...prev, finalChild]);
          setCurr({});
          userReplies(label, "add-more", children.length + 1 === 1
            ? t("screens.onboarding.child_added_first", { name })
            : t("screens.onboarding.child_added_more"));
          break;
        }
        case "child-school": {
          const isSchool = value === "yes";
          setCurr((c) => ({ ...c, isSchoolGoing: isSchool }));
          const name = curr.name || t("screens.onboarding.default_child_name");
          if (isSchool) {
            userReplies(t("screens.onboarding.yes_school"), "child-class", t("screens.onboarding.class_question", { name }));
          } else {
            setCurr((c) => ({ ...c, childClass: "", schoolStartTime: "09:00", schoolEndTime: "15:00", schoolDays: null }));
            userReplies(t("screens.onboarding.no_school"), "child-wake", t("screens.onboarding.wake_question", { name }));
          }
          break;
        }
        case "child-class": {
          setCurr((c) => ({ ...c, childClass: value }));
          const name = curr.name || t("screens.onboarding.default_child_name");
          userReplies(label, "child-school-start", t("screens.onboarding.school_start_question", { name }));
          break;
        }
        case "add-more":
          if (value === "yes") {
            userReplies(t("screens.onboarding.yes_add_another"), "child-name", t("screens.onboarding.next_child_name"));
          } else {
            userReplies(t("screens.onboarding.no_continue"), "parent-name", t("screens.onboarding.parent_intro"));
          }
          break;
        case "parent-role": {
          setParent((p) => ({ ...p, role: value }));
          userReplies(label, "parent-work", t("screens.onboarding.work_question"));
          break;
        }
        case "parent-work": {
          setParent((p) => ({ ...p, workType: value }));
          userReplies(label, "parent-region", t("screens.onboarding.region_question"));
          break;
        }
        case "parent-diet": {
          setSelectedDietType(value);
          setParent((p) => ({ ...p, dietType: value }));
          userReplies(label, "parent-goals", t("screens.onboarding.goals_question"));
          break;
        }
        default:
          break;
      }
      return;
    }

    if (event.type === "multi-select") {
      const ids = event.selectedIds ?? [];
      if (step === "child-school-days") {
        const dayNums = ids.map(Number).filter((n) => n >= 1 && n <= 7);
        setCurr((c) => ({ ...c, schoolDays: dayNums.length ? dayNums : [1, 2, 3, 4, 5] }));
        const labels = [
          t("screens.onboarding.day_mon"), t("screens.onboarding.day_tue"), t("screens.onboarding.day_wed"),
          t("screens.onboarding.day_thu"), t("screens.onboarding.day_fri"), t("screens.onboarding.day_sat"),
          t("screens.onboarding.day_sun"),
        ];
        const days = dayNums.length ? dayNums : [1, 2, 3, 4, 5];
        const summary = days.length === 5 && days.every((d) => d <= 5)
          ? t("screens.onboarding.all_school_days")
          : days.length === 0
            ? t("screens.onboarding.no_school_days")
            : days.map((d) => labels[d - 1]).join(",");
        const name = curr.name || t("screens.onboarding.default_child_name");
        userReplies(summary, "child-wake", t("screens.onboarding.wake_morning_question", { name }));
      } else if (step === "parent-region") {
        if (ids.includes("indian") && !regionDrillDown && !["IN", "PK", "BD", "LK", "NP"].includes(countryCode)) {
          setRegionDrillDown(true);
          setSelectedRegions([]);
          return;
        }
        setSelectedRegions(ids);
        setParent((p) => ({ ...p, region: ids.join(",") }));
        const summary = ids.map((id) => t(`screens.onboarding.region_${id}`, { defaultValue: id })).join(", ");
        userReplies(summary || ids.join(","), "parent-diet", t("screens.onboarding.diet_question"));
      } else if (step === "parent-goals") {
        setSelectedParentGoals(ids as ParentGoalCode[]);
        const summary = ids.length
          ? ids.map((g) => t(`intelligence.goals.options.${g}`)).join(", ")
          : t("screens.onboarding.goals_skip_summary");
        userReplies(summary, "parent-mobile", t("screens.onboarding.mobile_question"));
      } else if (step === "parent-allergies") {
        if (ids.length === 0) {
          finishAllergies(true);
        } else {
          setAllergyChips(ids.filter((id) => id !== "other"));
          if (ids.includes("other")) {
            setAllergyOtherOpen(true);
            return;
          }
          finishAllergies(false);
        }
      }
    }
  }

  const countrySearchResults = useMemo(() => {
    if (!countrySearch.trim()) return [];
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
        c.code.toLowerCase().includes(countrySearch.toLowerCase()),
    );
  }, [countrySearch]);

  const composerEnabled = ONBOARDING_COMPOSER_STEPS.has(step) && !isFinishing && !typing;

  return (
    <div className="relative h-full w-full">
      {isFinishing ? (
        <div
          className="absolute inset-0 z-20 flex items-end justify-center pb-8 pointer-events-auto"
          aria-live="polite"
        >
          <p
            className="px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}
          >
            {t("screens.onboarding.finalizing_setup")}
          </p>
        </div>
      ) : null}
      <ChatThread
        surface="onboarding"
        theme="onboarding"
        testId="onboarding-chat-thread"
        messages={threadMessages}
        draft={textInput}
        onDraftChange={setTextInput}
        onSend={handleOnboardingSend}
        onInteraction={handleOnboardingInteraction}
        composerDisabled={!composerEnabled}
        composerPlaceholder={onboardingComposerPlaceholder(step, t)}
        scrollDeps={[messages, typing, step, textInput, locationState.status]}
        style={{ background: BG }}
        messagesClassName="max-w-lg"
        footerClassName="border-t border-transparent"
        footerExtra={(
          <>
            {step === "parent-mobile" && composerEnabled ? (
              <button
                type="button"
                className="mb-2 w-full text-center text-xs"
                style={{ color: "rgba(255,255,255,0.55)" }}
                onClick={() =>
                  userReplies(
                    t("screens.onboarding.skip_for_now"),
                    "parent-allergies",
                    t("screens.onboarding.allergies_skip"),
                  )
                }
              >
                {t("screens.onboarding.skip_later")}
              </button>
            ) : null}
            <p className="mt-3 text-center text-[9px] font-bold uppercase tracking-widest" style={{ color: "rgba(168,85,247,0.35)" }}>
              {t("patent_pending.powered_by")}
            </p>
          </>
        )}
        header={(
          <div
            className="z-10"
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
              <span className="px-3 py-1.5 text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                {t("screens.onboarding.setup_required")}
              </span>
            </div>
            <ProgressBar step={step} />
          </div>
        )}
      />
      <OnboardingCountryModal
        open={showCountryPicker}
        onOpenChange={(open) => {
          if (!open && countryPickerRequired) return;
          setShowCountryPicker(open);
          if (!open) setCountrySearch("");
        }}
        title={
          countryPickerRequired
            ? t("screens.onboarding.country_manual_required_title")
            : t("screens.onboarding.country_pick_popular")
        }
        hint={
          locationState.status === "denied"
            ? t("screens.onboarding.country_permission_denied")
            : null
        }
        required={countryPickerRequired}
        search={countrySearch}
        onSearchChange={setCountrySearch}
        topCountries={TOP_COUNTRIES}
        searchResults={countrySearchResults}
        onSelect={(code, name) => confirmCountry(code, name)}
      />
    </div>
  );
}

