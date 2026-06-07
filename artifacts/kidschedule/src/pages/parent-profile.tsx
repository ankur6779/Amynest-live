import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Save, Plus, Trash2, Clock, Utensils, Camera, Loader2, Bell, Briefcase, MapPin } from "lucide-react";
import { ProfileSkeleton } from "@/components/route-skeletons/profile-skeleton";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/api";
import { PROFILE_COUNTRIES, getProfileCountryByCode } from "@workspace/phone-auth";

interface FreeSlot {
  start: string;
  end: string;
}

// ─── Food Preference Constants ─────────────────────────────────────────────

const DIET_OPTIONS = [
  { value: "vegetarian",    label: "Vegetarian",       emoji: "🥗" },
  { value: "vegan",         label: "Vegan",            emoji: "🌱" },
  { value: "eggetarian",    label: "Eggetarian",       emoji: "🥚" },
  { value: "non_veg",       label: "Non-vegetarian",   emoji: "🍗" },
  { value: "pescatarian",   label: "Pescatarian",      emoji: "🐟" },
  { value: "no_preference", label: "No preference",    emoji: "🍽️" },
];

const FOOD_STYLE_OPTIONS = [
  { value: "western",        label: "Western / Continental", emoji: "🥗" },
  { value: "asian",          label: "Asian",                 emoji: "🍜" },
  { value: "middle_eastern", label: "Middle Eastern",        emoji: "🧆" },
  { value: "indian",         label: "Indian",                emoji: "🍛" },
  { value: "mixed",          label: "Mixed / Flexible",      emoji: "🌍" },
];

const INDIAN_SUB_OPTIONS = [
  { value: "north_indian", label: "North Indian", emoji: "🫕" },
  { value: "south_indian", label: "South Indian", emoji: "🥘" },
  { value: "bengali",      label: "Bengali",      emoji: "🐟" },
  { value: "gujarati",     label: "Gujarati",     emoji: "🫙" },
  { value: "punjabi",      label: "Punjabi",      emoji: "🍗" },
];

const ALLERGY_CHIPS = [
  { value: "dairy",  label: "🥛 Dairy"  },
  { value: "gluten", label: "🌾 Gluten" },
  { value: "nuts",   label: "🥜 Nuts"   },
  { value: "eggs",   label: "🥚 Eggs"   },
  { value: "soy",    label: "🫘 Soy"    },
];
const ALLERGY_CHIP_VALUES = ALLERGY_CHIPS.map(c => c.value);
const inputClass = "rounded-xl h-12 bg-muted/50 border-transparent focus-visible:bg-background";
const sectionLabelClass = "text-xs font-bold uppercase tracking-widest text-muted-foreground";

// ─── Derivation helpers ────────────────────────────────────────────────────

function deriveFoodType(dietType: string): string {
  if (dietType === "non_veg" || dietType === "no_preference") return "non_veg";
  return "veg";
}

function deriveRegion(foodStyle: string, subCuisine: string): string {
  if (foodStyle === "indian") return subCuisine || "pan_indian";
  return foodStyle || "mixed";
}

function deriveStyleFromRegion(region: string): { foodStyle: string; subCuisine: string } {
  const indianSubs = ["north_indian", "south_indian", "bengali", "gujarati", "punjabi", "maharashtrian", "pan_indian"];
  if (indianSubs.includes(region)) {
    return { foodStyle: "indian", subCuisine: region === "pan_indian" ? "" : region };
  }
  if (region === "global") return { foodStyle: "western", subCuisine: "" };
  const validStyles = ["western", "asian", "middle_eastern", "mixed"];
  if (validStyles.includes(region)) return { foodStyle: region, subCuisine: "" };
  return { foodStyle: "mixed", subCuisine: "" };
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface ParentProfile {
  name: string;
  role: string;
  gender: string;
  country: string;
  workType: string;
  workStartTime: string;
  workEndTime: string;
  freeSlots: FreeSlot[];
  foodType: string;   // legacy — kept in sync with dietType
  region: string;     // legacy — kept in sync with foodStyle + subCuisine
  dietType: string;
  foodStyle: string;
  subCuisine: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ParentProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const { getToken, signOut } = useAuth();
  const authFetch = useAuthFetch();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [allergyChips, setAllergyChips] = useState<string[]>([]);
  const [allergyText, setAllergyText] = useState("");

  const [profile, setProfile] = useState<ParentProfile>({
    name: "",
    role: "mother",
    gender: "",
    country: "",
    workType: "work_from_home",
    workStartTime: "",
    workEndTime: "",
    freeSlots: [],
    foodType: "veg",
    region: "mixed",
    dietType: "vegetarian",
    foodStyle: "mixed",
    subCuisine: "",
  });

  useEffect(() => {
    getToken().then(token => {
      fetch(getApiUrl("/api/parent-profile"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data) {
            const dietType: string =
              data.dietType ??
              (data.foodType === "non_veg" ? "non_veg" : "vegetarian");
            const { foodStyle, subCuisine } = deriveStyleFromRegion(
              data.region ?? "mixed",
            );
            const allergyList: string[] = (data.allergies ?? "")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
            const chips = allergyList
              .filter(a => ALLERGY_CHIP_VALUES.includes(a.toLowerCase()))
              .map(a => a.toLowerCase());
            const otherText = allergyList
              .filter(a => !ALLERGY_CHIP_VALUES.includes(a.toLowerCase()))
              .join(", ");
            setAllergyChips(chips);
            setAllergyText(otherText);
            setProfile({
              name: data.name ?? "",
              role: data.role ?? "mother",
              gender: data.gender ?? "",
              country: data.country ?? "",
              workType: data.workType ?? "work_from_home",
              workStartTime: data.workStartTime ?? "",
              workEndTime: data.workEndTime ?? "",
              freeSlots: data.freeSlots ?? [],
              foodType: data.foodType ?? "veg",
              region: data.region ?? "mixed",
              dietType: data.dietType ?? dietType,
              foodStyle: data.foodStyle ?? foodStyle,
              subCuisine: data.subCuisine ?? subCuisine,
            });
          }
        })
        .finally(() => setLoading(false));
    });
  }, []);

  const toggleAllergyChip = (value: string) => {
    setAllergyChips(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value],
    );
  };

  const addFreeSlot = () => {
    setProfile(p => ({
      ...p,
      freeSlots: [...p.freeSlots, { start: "12:00", end: "13:00" }],
    }));
  };

  const removeFreeSlot = (i: number) => {
    setProfile(p => ({ ...p, freeSlots: p.freeSlots.filter((_, idx) => idx !== i) }));
  };

  const updateFreeSlot = (i: number, field: "start" | "end", value: string) => {
    setProfile(p => {
      const slots = [...p.freeSlots];
      slots[i] = { ...slots[i], [field]: value };
      return { ...p, freeSlots: slots };
    });
  };

  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPic(true);
    try {
      await user.setProfileImage({ file });
      toast({ title: t("toasts.parent_profile.pic_updated") });
    } catch {
      toast({ title: t("toasts.parent_profile.pic_failed"), variant: "destructive" });
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const combinedAllergies = [
        ...allergyChips,
        ...(allergyText.trim() ? [allergyText.trim()] : []),
      ]
        .filter(Boolean)
        .join(", ");

      const body: Record<string, unknown> = {
        name: profile.name || undefined,
        role: profile.role,
        workType: profile.workType,
        dietType: profile.dietType,
        foodStyle: profile.foodStyle,
        subCuisine: profile.subCuisine || null,
        foodType: deriveFoodType(profile.dietType),
        region: deriveRegion(profile.foodStyle, profile.subCuisine),
      };
      if (profile.gender) body.gender = profile.gender;
      if (profile.country) {
        body.country = profile.country;
        body.locationSource = "manual";
      }
      if (profile.workStartTime) body.workStartTime = profile.workStartTime;
      if (profile.workEndTime) body.workEndTime = profile.workEndTime;
      if (profile.freeSlots.length > 0) body.freeSlots = profile.freeSlots;
      if (combinedAllergies) body.allergies = combinedAllergies;

      const res = await fetch(getApiUrl("/api/parent-profile"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({
        title: t("toasts.parent_profile.profile_saved_title"),
        description: t("toasts.parent_profile.profile_saved_body"),
      });
    } catch {
      toast({
        title: t("toasts.parent_profile.save_error_title"),
        description: t("toasts.parent_profile.save_error_body"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetDeleteDialog = () => {
    setDeleteStep(0);
    setDeleteDialogOpen(false);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await authFetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      const { clearUserSessionCaches } = await import("@/lib/user-session-cache");
      clearUserSessionCaches();
      qc.clear();
      await signOut({ redirectUrl: "/" });
    } catch {
      setDeleting(false);
      resetDeleteDialog();
      toast({
        title: t("toasts.parent_profile.delete_error_title"),
        description: t("toasts.parent_profile.delete_error_body"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  const displayName = profile.name || user?.firstName || t("profile.title");
  const roleLabel = profile.role === "father" ? t("profile.father") : t("profile.mother");

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500 max-w-2xl mx-auto pb-8">
      {/* Hero */}
      <div
        data-on-dark
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/90 p-6 sm:p-8 text-white shadow-xl"
      >
        <div className="absolute top-0 right-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-white/10 blur-sm" />
        <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-8 translate-y-8 rounded-full bg-white/10 blur-sm" />
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="relative shrink-0 mb-4">
            <Avatar className="h-24 w-24 ring-4 ring-white/30 shadow-lg">
              <AvatarImage src={user?.imageUrl ?? undefined} />
              <AvatarFallback className="bg-white/20 text-white text-3xl font-bold">
                {profile.name ? profile.name[0]?.toUpperCase() : (user?.firstName?.[0] ?? "U")}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPic}
              className="absolute -bottom-1 -right-1 rounded-full bg-white p-2 text-primary shadow-md transition-colors hover:bg-white/90 disabled:opacity-60"
              aria-label={t("pages.parent_profile.click_the_camera_icon_to_change_your_profile_picture")}
            >
              {uploadingPic ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfilePicUpload}
            />
          </div>
          <h1 className="font-quicksand text-2xl sm:text-3xl font-bold">{displayName}</h1>
          <p className="mt-1 text-sm text-white/80">{t("profile.subtitle")}</p>
          <span className="mt-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ── Personal Info ─────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-3">
          <p className={sectionLabelClass}>{t("pages.parent_profile.personal_info")}</p>
          <CardTitle className="font-quicksand text-lg mt-1">
            {t("pages.parent_profile.basic_details_about_you_and_your_role_in_the_family")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>{t("pages.parent_profile.your_name")}</Label>
              <Input
                placeholder={t("pages.parent_profile.e_g_ayesha_sarah_ahmed")}
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground">
                {t("pages.parent_profile.this_name_will_appear_in_your_dashboard_greeting")}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("profile.role")}</Label>
              <Select
                value={profile.role}
                onValueChange={v => setProfile(p => ({ ...p, role: v }))}
              >
                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">{t("profile.mother")}</SelectItem>
                  <SelectItem value="father">{t("profile.father")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("profile.gender")}</Label>
              <Select
                value={profile.gender || "prefer_not"}
                onValueChange={v => setProfile(p => ({ ...p, gender: v === "prefer_not" ? "" : v }))}
              >
                <SelectTrigger className={inputClass}><SelectValue placeholder={t("pages.parent_profile.select_gender")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">{t("pages.parent_profile.female")}</SelectItem>
                  <SelectItem value="male">{t("pages.parent_profile.male")}</SelectItem>
                  <SelectItem value="prefer_not">{t("pages.parent_profile.prefer_not_to_say")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                {t("pages.parent_profile.country")}
              </Label>
              <Select
                value={profile.country || undefined}
                onValueChange={v => setProfile(p => ({ ...p, country: v }))}
              >
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder={t("pages.parent_profile.select_country")} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {PROFILE_COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {profile.country
                  ? t("pages.parent_profile.country_selected_hint", {
                      country: getProfileCountryByCode(profile.country)?.name ?? profile.country,
                    })
                  : t("pages.parent_profile.country_hint")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Work Schedule ──────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-3">
          <p className={cn(sectionLabelClass, "flex items-center gap-1.5")}>
            <Briefcase className="h-3.5 w-3.5" />
            {t("pages.parent_profile.work_schedule")}
          </p>
          <CardDescription className="mt-1">
            {t("pages.parent_profile.amy_ai_uses_this_to_assign_tasks_when_you_re_busy_or_availab")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("profile.work_type")}</Label>
            <Select
              value={profile.workType}
              onValueChange={v => setProfile(p => ({ ...p, workType: v }))}
            >
              <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="work_from_home">{t("profile.work_from_home")}</SelectItem>
                <SelectItem value="work_from_office">{t("profile.work_from_office")}</SelectItem>
                <SelectItem value="homemaker">{t("profile.stay_at_home")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {profile.workType !== "homemaker" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("pages.parent_profile.work_start")}</Label>
                <Input
                  type="time"
                  value={profile.workStartTime}
                  onChange={e => setProfile(p => ({ ...p, workStartTime: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("pages.parent_profile.work_end")}</Label>
                <Input
                  type="time"
                  value={profile.workEndTime}
                  onChange={e => setProfile(p => ({ ...p, workEndTime: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Free Slots ─────────────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <p className={cn(sectionLabelClass, "flex items-center gap-1.5")}>
              <Clock className="h-3.5 w-3.5 text-primary" />
              {t("pages.parent_profile.free_available_slots")}
            </p>
            <CardDescription className="mt-1">
              {t("pages.parent_profile.times_during_the_day_you_re_free_to_spend_with_your_child")}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addFreeSlot} className="shrink-0 rounded-full">
            <Plus className="h-4 w-4 mr-1" /> {t("pages.parent_profile.add_slot")}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {profile.freeSlots.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 py-8 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground px-4">
                {t("pages.parent_profile.no_free_slots_added_click_add_slot_to_specify_when_you_re_av")}
              </p>
            </div>
          )}
          {profile.freeSlots.map((slot, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/30 p-3">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={slot.start}
                  onChange={e => updateFreeSlot(i, "start", e.target.value)}
                  className="h-10 text-sm rounded-xl bg-background/80 border-transparent"
                />
                <span className="text-muted-foreground text-sm">{t("common.to")}</span>
                <Input
                  type="time"
                  value={slot.end}
                  onChange={e => updateFreeSlot(i, "end", e.target.value)}
                  className="h-10 text-sm rounded-xl bg-background/80 border-transparent"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive shrink-0 rounded-full"
                onClick={() => removeFreeSlot(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Food Preferences ─────────────────────────────────────────── */}
      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-3">
          <p className={cn(sectionLabelClass, "flex items-center gap-1.5")}>
            <Utensils className="h-3.5 w-3.5 text-primary" />
            {t("pages.parent_profile.food_preferences")}
          </p>
          <CardDescription className="mt-1">
            {t("pages.parent_profile.food_preferences_description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">
              {t("pages.parent_profile.diet_type")}
            </Label>
            <div className="flex flex-wrap gap-2">
              {DIET_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfile(p => ({ ...p, dietType: opt.value }))}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm border font-medium flex items-center gap-1.5 transition-all",
                    profile.dietType === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                      : "border-border/60 text-foreground hover:border-primary/50 bg-background/80",
                  )}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">{t("pages.parent_profile.food_style")}</Label>
            <div className="flex flex-wrap gap-2">
              {FOOD_STYLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setProfile(p => ({
                      ...p,
                      foodStyle: opt.value,
                      subCuisine: opt.value !== "indian" ? "" : p.subCuisine,
                    }))
                  }
                  className={cn(
                    "px-3 py-2 rounded-full text-sm border font-medium flex items-center gap-1.5 transition-all",
                    profile.foodStyle === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]"
                      : "border-border/60 text-foreground hover:border-primary/50 bg-background/80",
                  )}
                >
                  <span>{opt.emoji}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {profile.foodStyle === "indian" && (
            <div className="flex flex-col gap-2 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <Label className="text-sm font-semibold text-foreground/80">
                {t("pages.parent_profile.indian_sub_cuisine")}
                <span className="text-muted-foreground font-normal ml-1">
                  ({t("pages.children.form.optional_label")})
                </span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {INDIAN_SUB_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setProfile(p => ({
                        ...p,
                        subCuisine: p.subCuisine === opt.value ? "" : opt.value,
                      }))
                    }
                    className={cn(
                      "px-3 py-2 rounded-full text-sm border font-medium flex items-center gap-1.5 transition-all",
                      profile.subCuisine === opt.value
                        ? "bg-primary/15 text-primary border-primary"
                        : "border-border/60 text-foreground hover:border-primary/50 bg-background/80",
                    )}
                  >
                    <span>{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-sm font-semibold">{t("pages.parent_profile.food_restrictions_allergies")}</Label>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_CHIPS.map(chip => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => toggleAllergyChip(chip.value)}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm border font-medium transition-all",
                    allergyChips.includes(chip.value)
                      ? "bg-primary/15 text-primary border-primary"
                      : "border-border/60 text-foreground hover:border-primary/50 bg-background/80",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <Textarea
              placeholder={t("pages.parent_profile.other_restrictions_placeholder")}
              value={allergyText}
              onChange={e => setAllergyText(e.target.value)}
              className="resize-none mt-1 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {t("pages.parent_profile.list_any_food_allergies_or_ingredients_to_avoid_in_amy_ai_ge")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-primary/20 bg-primary/5 shadow-sm">
        <CardContent className="pt-5 pb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60 mb-2">
            {t("patent_pending.settings_note")}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("patent_pending.about_tech")}
          </p>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-3xl border border-border/50 bg-background/95 p-3 shadow-lg backdrop-blur-md">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full h-12 font-bold shadow-md"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? t("common.saving") : t("profile.save")}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/notification-settings")}
          className="w-full rounded-full h-11 border-border/60"
        >
          <Bell className="h-4 w-4 mr-2" />
          {t("pages.parent_profile.notification_settings")}
        </Button>
      </div>

      <Card className="rounded-3xl border-destructive/20 bg-destructive/[0.03] shadow-sm">
        <CardHeader>
          <CardTitle className="font-quicksand text-lg text-destructive">
            {t("profile.delete_account_section_title")}
          </CardTitle>
          <CardDescription>{t("profile.delete_account_section_body")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog
            open={deleteDialogOpen}
            onOpenChange={(open) => {
              if (!open) resetDeleteDialog();
              else setDeleteDialogOpen(true);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                data-testid="delete-account-button"
                className="w-full rounded-full h-11 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("profile.delete_account_deleting")}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t("profile.delete_account")}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {deleteStep === 0
                    ? t("profile.delete_account_title")
                    : t("profile.delete_account_confirm_title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteStep === 0
                    ? t("profile.delete_account_body")
                    : t("profile.delete_account_confirm_body")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting} className="rounded-full">
                  {t("pages.children.form.cancel")}
                </AlertDialogCancel>
                {deleteStep === 0 ? (
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteStep(1);
                    }}
                    className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("profile.delete_account")}
                  </AlertDialogAction>
                ) : (
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDeleteAccount();
                    }}
                    disabled={deleting}
                    className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting
                      ? t("profile.delete_account_deleting")
                      : t("profile.delete_account_confirm_button")}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
