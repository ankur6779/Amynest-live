import { parseApiJson } from "@/lib/safe-json-response";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateChild, useUpdateChild, useGetChild, getGetChildQueryKey, useDeleteChild, getListChildrenQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Trash2, Loader2, Baby, Camera, GraduationCap, School, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useAddChildGate } from "@/hooks/use-add-child-gate";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ChildDobPicker } from "@/components/child-dob-picker";
import { ChildGoalsCard } from "@/components/intelligence/child-goals-card";
import { InsightsCard } from "@/components/intelligence/insights-card";
import { FixedActivitiesEditor } from "@/components/routines/fixed-activities-editor";
import { FixedActivitiesWeeklyInsights } from "@/components/routines/fixed-activities-weekly-insights";
import { normalizeFixedActivities } from "@/lib/fixed-activities";
import type { FixedActivityDraft } from "@/lib/fixed-activities";
import {
  approxDobFromAge,
  deriveSchoolFieldsFromStage,
  getClassOptionsForCountry,
  getEducationStagesForChild,
  getTotalMonths,
  type EducationStageCode,
} from "@workspace/education-stages";
import {
  formatEducationStageLabel,
  hydrateChildEducationFormValues,
  profileFormStageFlags,
} from "@/lib/education-stage-display";
import { countChildFormRender, logChildFormEffect } from "@/lib/child-form-debug";
import { isFeatureMitigated } from "@/lib/self-healing/feature-mitigation";
import { recordSelfHealingAction } from "@/lib/self-healing/action-log";
import {
  buildChildEducationPatchKey,
  buildChildHydrationKey,
  childFormResetValuesEqual,
  educationFieldsEqual,
  infantFormNormalizationPatches,
  type ChildFormResetSlice,
} from "@/lib/child-form-hydration";
interface Babysitter {
  id: number;
  name: string;
  mobileNumber?: string | null;
}
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
const childSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dob: z.string().optional(),
  educationStage: z.string().optional(),
  scheduleKnown: z.boolean().optional(),
  childClass: z.string().optional(),
  wakeUpTime: z.string().regex(timeRegex, "Must be in HH:MM format"),
  sleepTime: z.string().regex(timeRegex, "Must be in HH:MM format"),
  schoolStartTime: z.string().optional(),
  schoolEndTime: z.string().optional(),
  schoolDays: z.array(z.number().int().min(1).max(7)).optional(),
  travelMode: z.enum(["van", "car", "walk", "other"]).optional(),
  travelModeOther: z.string().optional(),
  foodType: z.enum(["veg", "non_veg"]),
  goals: z.string().optional(),
  babysitterId: z.coerce.number().optional()
});
type ChildFormValues = z.infer<typeof childSchema>;
function calculateAge(dob: string): {
  years: number;
  months: number;
} {
  if (!dob) return {
    years: 0,
    months: 0
  };
  const today = new Date();
  const birth = new Date(dob + "T00:00:00");
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  return {
    years: Math.max(0, years),
    months: Math.max(0, months)
  };
}
function formatAge(years: number, months: number): string {
  if (years === 0 && months === 0) return "Newborn";
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""}`;
}
function getAgeGroupInfo(totalMonths: number) {
  if (totalMonths < 12) return {
    label: "Infant",
    emoji: "👶",
    color: "bg-muted text-primary border-border"
  };
  if (totalMonths < 36) return {
    label: "Toddler",
    emoji: "🍼",
    color: "bg-muted text-primary border-border"
  };
  if (totalMonths < 60) return {
    label: "Preschool",
    emoji: "🎨",
    color: "bg-muted text-primary border-border"
  };
  if (totalMonths < 120) return {
    label: "School Age",
    emoji: "📚",
    color: "bg-muted text-primary border-border"
  };
  return {
    label: "Pre-Teen",
    emoji: "🎯",
    color: "bg-muted text-primary border-border"
  };
}
const todayStr = new Date().toISOString().slice(0, 10);
const inputClass = "rounded-xl h-12 bg-muted/50 border-transparent focus-visible:bg-background";
const sectionLabelClass = "text-xs font-bold uppercase tracking-widest text-muted-foreground";

const DIET_OPTIONS = [
  { value: "vegetarian", label: "Vegetarian", emoji: "🥦" },
  { value: "vegan", label: "Vegan", emoji: "🌱" },
  { value: "eggetarian", label: "Eggetarian", emoji: "🥚" },
  { value: "non_veg", label: "Non-Vegetarian", emoji: "🍗" },
  { value: "pescatarian", label: "Pescatarian", emoji: "🐟" },
  { value: "no_preference", label: "No preference", emoji: "🍽️" },
];
const FOOD_STYLE_OPTIONS = [
  { value: "indian", label: "Indian", emoji: "🪔" },
  { value: "western", label: "Western", emoji: "🍕" },
  { value: "asian", label: "Asian", emoji: "🍜" },
  { value: "middle_eastern", label: "Middle Eastern", emoji: "🧆" },
  { value: "mixed", label: "Mixed", emoji: "🌍" },
];
const INDIAN_SUB_OPTIONS = [
  { value: "north_indian", label: "North Indian", emoji: "🫓" },
  { value: "south_indian", label: "South Indian", emoji: "🥘" },
  { value: "gujarati", label: "Gujarati", emoji: "🫙" },
  { value: "maharashtrian", label: "Maharashtrian", emoji: "🥜" },
  { value: "punjabi", label: "Punjabi", emoji: "🧅" },
  { value: "bengali", label: "Bengali", emoji: "🐟" },
  { value: "pan_indian", label: "Pan Indian", emoji: "🇮🇳" },
];
const ALLERGY_CHIPS = [
  { value: "gluten", label: "Gluten" },
  { value: "dairy", label: "Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "nuts", label: "Nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "soy", label: "Soy" },
  { value: "shellfish", label: "Shellfish" },
  { value: "sesame", label: "Sesame" },
];
const FEEDING_TYPES = [
  { value: "breastfeeding", label: "Breastfeeding", emoji: "🤱" },
  { value: "formula", label: "Formula", emoji: "🍼" },
  { value: "mixed", label: "Both breast & formula", emoji: "🤱🍼" },
];
const INFANT_SLEEP_PATTERNS = [
  { value: "flexible", label: "Flexible naps", emoji: "😴" },
  { value: "irregular", label: "Irregular sleep", emoji: "🌙" },
  { value: "short_naps", label: "Short cat-naps", emoji: "💤" },
];
function deriveFoodType(dt: string): "veg" | "non_veg" {
  return ["vegetarian", "vegan", "eggetarian", "jain", "sattvik"].includes(dt) ? "veg" : "non_veg";
}
function ChildForm() {
  const {
    t
  } = useTranslation();
  const [_, setLocation] = useLocation();
  const params = useParams<{
    id: string;
  }>();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const authFetch = useAuthFetch();
  const [babysitters, setBabysitters] = useState<Babysitter[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [dietType, setDietType] = useState("vegetarian");
  const [foodStyle, setFoodStyle] = useState("indian");
  const [subCuisine, setSubCuisine] = useState("");
  const [allergyChips, setAllergyChips] = useState<string[]>([]);
  const [allergyText, setAllergyText] = useState("");
  const [foodPrefInherited, setFoodPrefInherited] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [fixedActivities, setFixedActivities] = useState<FixedActivityDraft[]>([]);
  const [feedingType, setFeedingType] = useState<string | null>(null);
  const [sleepPattern, setSleepPattern] = useState<string | null>(null);
  const [photoDirty, setPhotoDirty] = useState(false);
  const [foodPrefsDirty, setFoodPrefsDirty] = useState(false);
  const [infantPrefsDirty, setInfantPrefsDirty] = useState(false);
  const [fixedActivitiesDirty, setFixedActivitiesDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const childHydrationKeyRef = useRef<string | null>(null);
  const childEducationPatchKeyRef = useRef<string | null>(null);
  const legacyAgeRef = useRef<{ years: number; months: number } | null>(null);
  const isEditing = !!params.id && params.id !== "new";
  const childId = isEditing ? parseInt(params.id as string) : 0;
  const {
    data: child,
    isLoading: isLoadingChild
  } = useGetChild(childId, {
    query: {
      enabled: isEditing,
      queryKey: getGetChildQueryKey(childId)
    }
  });

  const { blocked, existingCount, isPremium, isLoading: addChildGateLoading, tryAddChild } = useAddChildGate();
  const isAtChildLimit = !isEditing && blocked;

  useEffect(() => {
    if (!isEditing && !addChildGateLoading && blocked) {
      tryAddChild("child-form-direct");
      setLocation("/children");
    }
  }, [isEditing, addChildGateLoading, blocked, tryAddChild, setLocation]);
  const createMutation = useCreateChild();
  const updateMutation = useUpdateChild();
  const deleteMutation = useDeleteChild();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const form = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: "",
      dob: "",
      educationStage: undefined,
      scheduleKnown: false,
      childClass: "",
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      schoolStartTime: "08:00",
      schoolEndTime: "15:00",
      schoolDays: [1, 2, 3, 4, 5],
      travelMode: "car",
      travelModeOther: "",
      foodType: "veg",
      goals: "",
      babysitterId: undefined
    }
  });
  const [parentCountry, setParentCountry] = useState("IN");
  const [watchDob, watchEducationStage, watchScheduleKnown, travelMode, watchName, watchChildClass] =
    useWatch({
      control: form.control,
      name: ["dob", "educationStage", "scheduleKnown", "travelMode", "name", "childClass"],
    }) as [
      string,
      EducationStageCode | undefined,
      boolean | undefined,
      string | undefined,
      string,
      string | undefined,
    ];
  countChildFormRender("ChildForm render");
  const hasDob = Boolean(watchDob?.trim());
  const calculatedAge = hasDob ? calculateAge(watchDob) : null;
  const effectiveAge = calculatedAge ?? legacyAgeRef.current;
  const hasAgeContext = hasDob || legacyAgeRef.current != null;
  const ageYears = effectiveAge?.years ?? 0;
  const ageMonthsPart = effectiveAge?.months ?? 0;
  const totalMonths = effectiveAge ? getTotalMonths(ageYears, ageMonthsPart) : 0;
  const isInfant = hasAgeContext && totalMonths < 12;
  const ageGroupInfo = effectiveAge ? getAgeGroupInfo(totalMonths) : null;
  const stageOptions = useMemo(() => {
    if (!hasAgeContext || isInfant || !effectiveAge) return [];
    const options = getEducationStagesForChild(
      parentCountry,
      ageYears,
      ageMonthsPart,
    );
    const current = watchEducationStage;
    if (current && !options.some((o) => o.code === current)) {
      return [
        {
          code: current,
          labelKey: `stage_${current}`,
          emoji: "📌",
        },
        ...options,
      ];
    }
    return options;
  }, [hasAgeContext, isInfant, parentCountry, ageYears, ageMonthsPart, watchEducationStage, effectiveAge]);
  const stageFlags = profileFormStageFlags(watchEducationStage, totalMonths);
  const showScheduleFields = stageFlags.showScheduleSection && watchScheduleKnown === true;

  const handleEducationStageSelect = useCallback(
    (stage: EducationStageCode) => {
      form.setValue("educationStage", stage, { shouldValidate: true, shouldDirty: true });
      const derived = deriveSchoolFieldsFromStage({
        educationStage: stage,
        childClass: form.getValues("childClass"),
        scheduleKnown: form.getValues("scheduleKnown"),
        schoolStartTime: form.getValues("schoolStartTime"),
        schoolEndTime: form.getValues("schoolEndTime"),
        schoolDays: form.getValues("schoolDays"),
        country: parentCountry,
        years: effectiveAge?.years ?? 0,
        months: effectiveAge?.months ?? 0,
      });
      form.setValue("childClass", derived.childClass ?? "", { shouldDirty: true });
      if (stage !== "school") {
        form.setValue("scheduleKnown", false, { shouldDirty: true });
      }
    },
    [effectiveAge, form, parentCountry],
  );

  useEffect(() => {
    logChildFormEffect("infant-normalize", { isInfant, watchDob });
    if (isFeatureMitigated("child-form-infant-normalize")) {
      recordSelfHealingAction("child-form:stable-hydration-only");
      return;
    }
    if (!isInfant) return;
    const patches = infantFormNormalizationPatches(isInfant, {
      educationStage: form.getValues("educationStage"),
      scheduleKnown: form.getValues("scheduleKnown"),
    });
    if (patches?.educationStage) {
      form.setValue("educationStage", patches.educationStage, { shouldDirty: false });
    }
    if (patches?.scheduleKnown === false) {
      form.setValue("scheduleKnown", false, { shouldDirty: false });
    }
    setFixedActivities((prev) => (prev.length === 0 ? prev : []));
  }, [isInfant, watchDob, form]);
  useEffect(() => {
    authFetch("/api/babysitters").then(async (r) => {
      if (!r.ok) return [];
      return parseApiJson<Babysitter[]>(r);
    }).then((data) => setBabysitters(data)).catch(() => {});
    authFetch("/api/parent-profile")
      .then(async (r) => {
        if (!r.ok) return null;
        return parseApiJson<{ country?: string | null }>(r);
      })
      .then((profile: { country?: string | null } | null) => {
        const country = profile?.country?.trim();
        if (!country) return;
        setParentCountry((prev) => (prev === country ? prev : country));
      })
      .catch(() => {});
  }, [authFetch]);
  useEffect(() => {
    if (!child || !isEditing) return;

    const dobValue = child.dob?.trim() ?? "";
    if (!dobValue && (child.age > 0 || (child.ageMonths ?? 0) > 0)) {
      legacyAgeRef.current = { years: child.age, months: child.ageMonths ?? 0 };
    } else {
      legacyAgeRef.current = null;
    }
    const hydrationKey = buildChildHydrationKey(child.id, dobValue, parentCountry);
    const educationPatchKey = buildChildEducationPatchKey(child.id, dobValue);

    logChildFormEffect("child-hydrate", {
      hydrationKey,
      educationPatchKey,
      prevHydrationKey: childHydrationKeyRef.current,
    });

    if (childHydrationKeyRef.current === hydrationKey) return;

    const edu = hydrateChildEducationFormValues(
      {
        educationStage: child.educationStage,
        isSchoolGoing: child.isSchoolGoing,
        childClass: child.childClass,
        age: child.age,
        ageMonths: child.ageMonths,
        scheduleKnown: child.scheduleKnown,
      },
      parentCountry,
    );

    const nextValues: ChildFormResetSlice = {
      name: child.name,
      dob: dobValue,
      educationStage: edu.educationStage,
      scheduleKnown: edu.scheduleKnown,
      childClass: edu.childClass,
      wakeUpTime: child.wakeUpTime ?? "07:00",
      sleepTime: child.sleepTime ?? "21:00",
      schoolStartTime: child.schoolStartTime ?? "08:00",
      schoolEndTime: child.schoolEndTime ?? "15:00",
      schoolDays: (child as { schoolDays?: number[] | null }).schoolDays ?? [1, 2, 3, 4, 5],
      travelMode: (child.travelMode as ChildFormResetSlice["travelMode"]) ?? "car",
      travelModeOther: child.travelModeOther ?? "",
      foodType: (child.foodType as ChildFormResetSlice["foodType"]) ?? "veg",
      goals: child.goals ?? "",
      babysitterId: child.babysitterId ?? undefined,
    };

    const countryOnlyPatch =
      childEducationPatchKeyRef.current === educationPatchKey &&
      childHydrationKeyRef.current !== null &&
      childHydrationKeyRef.current !== hydrationKey;

    childHydrationKeyRef.current = hydrationKey;
    childEducationPatchKeyRef.current = educationPatchKey;

    if (countryOnlyPatch) {
      const currentEdu = {
        educationStage: form.getValues("educationStage"),
        scheduleKnown: form.getValues("scheduleKnown"),
        childClass: form.getValues("childClass"),
      };
      if (!educationFieldsEqual(currentEdu, nextValues)) {
        if (currentEdu.educationStage !== nextValues.educationStage) {
          form.setValue("educationStage", nextValues.educationStage, { shouldDirty: false });
        }
        if (currentEdu.scheduleKnown !== nextValues.scheduleKnown) {
          form.setValue("scheduleKnown", nextValues.scheduleKnown, { shouldDirty: false });
        }
        if ((currentEdu.childClass ?? "") !== (nextValues.childClass ?? "")) {
          form.setValue("childClass", nextValues.childClass, { shouldDirty: false });
        }
      }
      return;
    }

    const currentValues = form.getValues();
    if (!childFormResetValuesEqual(currentValues as ChildFormResetSlice, nextValues)) {
      form.reset(nextValues as Parameters<typeof form.reset>[0]);
    }

    if ((child as { photoUrl?: string }).photoUrl) {
      setPhotoPreview((child as { photoUrl?: string }).photoUrl ?? null);
    }
    const dt = (child as { dietType?: string }).dietType ?? "vegetarian";
    const fs = (child as { foodStyle?: string }).foodStyle ?? "indian";
    const sc = (child as { subCuisine?: string }).subCuisine ?? "";
    const rawAllergies: string = (child as { allergies?: string }).allergies ?? "";
    const chips = ALLERGY_CHIPS.map((c) => c.value).filter((v) =>
      rawAllergies.split(",").map((s: string) => s.trim()).includes(v),
    );
    const textPart = rawAllergies
      .split(",")
      .map((s: string) => s.trim())
      .filter((s) => s && !ALLERGY_CHIPS.some((c) => c.value === s))
      .join(", ");
    setDietType(dt);
    setFoodStyle(fs);
    setSubCuisine(sc);
    setAllergyChips(chips);
    setAllergyText(textPart);
    setFoodPrefInherited(!!(child as { foodPrefInherited?: boolean }).foodPrefInherited);
    setCustomizeOpen(!!(child as { foodPrefCustomized?: boolean }).foodPrefCustomized);
    setFixedActivities(normalizeFixedActivities((child as { fixedActivities?: unknown }).fixedActivities));
    setFeedingType((child as { feedingType?: string | null }).feedingType ?? null);
    setSleepPattern((child as { sleepPattern?: string | null }).sleepPattern ?? null);
    setPhotoDirty(false);
    setFoodPrefsDirty(false);
    setInfantPrefsDirty(false);
    setFixedActivitiesDirty(false);
  }, [child, form, isEditing, parentCountry]);
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("toasts.children.photo_too_large_title"),
        description: t("toasts.children.photo_too_large_body"),
        variant: "destructive"
      });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setPhotoPreview(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result as string;
    };
    setPhotoDirty(true);
    reader.readAsDataURL(file);
  };
  const onSubmit = (data: ChildFormValues) => {
    const age = effectiveAge ?? {
      years: 0,
      months: 0,
    };
    if (!hasAgeContext || (age.years === 0 && age.months === 0)) {
      toast({
        title: t("toasts.children.profile_add_failed"),
        description: t("pages.children.form.date_of_birth"),
        variant: "destructive",
      });
      return;
    }
    let dob = data.dob?.trim() ?? "";
    let dobIsEstimated = false;
    if (!dob) {
      dob = approxDobFromAge(age.years, age.months);
      dobIsEstimated = true;
    }
    const submitIsInfant = getTotalMonths(age.years, age.months) < 12;
    const educationStage = (
      submitIsInfant
        ? "at_home"
        : (data.educationStage as EducationStageCode | undefined)
    ) as EducationStageCode;
    const derived = deriveSchoolFieldsFromStage({
      educationStage,
      childClass: data.childClass,
      scheduleKnown: data.scheduleKnown,
      schoolStartTime: data.schoolStartTime,
      schoolEndTime: data.schoolEndTime,
      schoolDays: data.schoolDays,
      country: parentCountry,
      years: age.years,
      months: age.months,
    });
    const validFixedActivities = fixedActivities.filter(
      (e) => e.activity.trim() && e.days.length > 0 && e.start && e.end,
    );
    const payload = {
      name: data.name.trim(),
      dob,
      dobIsEstimated,
      age: age.years,
      ageMonths: age.months,
      educationStage: derived.educationStage,
      learningEnvironment: derived.learningEnvironment,
      scheduleKnown: derived.scheduleKnown,
      isSchoolGoing: derived.isSchoolGoing,
      childClass: derived.childClass || undefined,
      wakeUpTime: data.wakeUpTime,
      sleepTime: data.sleepTime,
      schoolStartTime: derived.schoolStartTime,
      schoolEndTime: derived.schoolEndTime,
      schoolDays: derived.schoolDays,
      travelMode: derived.isSchoolGoing ? data.travelMode ?? "car" : "car",
      travelModeOther: derived.isSchoolGoing && data.travelMode === "other" ? data.travelModeOther : undefined,
      foodType: submitIsInfant ? "veg" : deriveFoodType(dietType),
      dietType: submitIsInfant ? null : dietType || null,
      foodStyle: submitIsInfant ? null : foodStyle || null,
      subCuisine: submitIsInfant ? null : subCuisine || null,
      allergies: submitIsInfant ? null : [...allergyChips, allergyText].filter(Boolean).join(", ") || null,
      foodPrefInherited: submitIsInfant ? false : !customizeOpen && foodPrefInherited,
      foodPrefCustomized: submitIsInfant ? false : customizeOpen,
      feedingType: submitIsInfant ? feedingType : null,
      sleepPattern: submitIsInfant ? sleepPattern : null,
      goals: data.goals?.trim() || (submitIsInfant ? "Infant care & development" : "General daily routine"),
      babysitterId: data.babysitterId || undefined,
      photoUrl: photoPreview || null,
      fixedActivities: !submitIsInfant && validFixedActivities.length > 0 ? validFixedActivities : null,
    };
    if (isEditing) {
      const dirty = form.formState.dirtyFields;
      const updatePayload: Partial<typeof payload> = {};
      const assignIfDirty = <K extends keyof typeof payload>(field: K, dirtyFlag?: boolean) => {
        if (dirtyFlag) updatePayload[field] = payload[field];
      };
      const educationDirty =
        !!dirty.dob ||
        !!dirty.educationStage ||
        !!dirty.scheduleKnown ||
        !!dirty.childClass ||
        !!dirty.schoolStartTime ||
        !!dirty.schoolEndTime ||
        !!dirty.schoolDays ||
        !!dirty.travelMode ||
        !!dirty.travelModeOther;

      assignIfDirty("name", !!dirty.name);
      assignIfDirty("wakeUpTime", !!dirty.wakeUpTime);
      assignIfDirty("sleepTime", !!dirty.sleepTime);
      assignIfDirty("goals", !!dirty.goals);
      assignIfDirty("babysitterId", !!dirty.babysitterId);

      if (dirty.dob) {
        updatePayload.dob = payload.dob;
        updatePayload.dobIsEstimated = payload.dobIsEstimated;
        updatePayload.age = payload.age;
        updatePayload.ageMonths = payload.ageMonths;
      }

      if (educationDirty) {
        updatePayload.educationStage = payload.educationStage;
        updatePayload.learningEnvironment = payload.learningEnvironment;
        updatePayload.scheduleKnown = payload.scheduleKnown;
        updatePayload.isSchoolGoing = payload.isSchoolGoing;
        updatePayload.childClass = payload.childClass;
        updatePayload.schoolStartTime = payload.schoolStartTime;
        updatePayload.schoolEndTime = payload.schoolEndTime;
        updatePayload.schoolDays = payload.schoolDays;
        updatePayload.travelMode = payload.travelMode;
        updatePayload.travelModeOther = payload.travelModeOther;
      }

      if (photoDirty) {
        updatePayload.photoUrl = payload.photoUrl;
      }
      if (fixedActivitiesDirty) {
        updatePayload.fixedActivities = payload.fixedActivities;
      }
      if (foodPrefsDirty) {
        updatePayload.dietType = payload.dietType;
        updatePayload.foodStyle = payload.foodStyle;
        updatePayload.subCuisine = payload.subCuisine;
        updatePayload.allergies = payload.allergies;
        updatePayload.foodPrefInherited = payload.foodPrefInherited;
        updatePayload.foodPrefCustomized = payload.foodPrefCustomized;
        updatePayload.foodType = payload.foodType;
      }
      if (infantPrefsDirty) {
        updatePayload.feedingType = payload.feedingType;
        updatePayload.sleepPattern = payload.sleepPattern;
      }

      if (Object.keys(updatePayload).length === 0) {
        toast({
          title: t("toasts.children.profile_updated")
        });
        setLocation("/children");
        return;
      }
      updateMutation.mutate({
        id: childId,
        data: updatePayload
      }, {
        onSuccess: () => {
          toast({
            title: t("toasts.children.profile_updated")
          });
          queryClient.invalidateQueries({
            queryKey: getGetChildQueryKey(childId)
          });
          queryClient.invalidateQueries({
            queryKey: getListChildrenQueryKey()
          });
          setLocation("/children");
        },
        onError: () => {
          return toast({
            title: t("toasts.children.profile_update_failed"),
            variant: "destructive"
          });
        }
      });
    } else {
      createMutation.mutate({
        data: payload
      }, {
        onSuccess: (created) => {
          toast({
            title: t("toasts.children.profile_added")
          });
          queryClient.setQueryData(getListChildrenQueryKey(), (old) => {
            const prev = Array.isArray(old) ? old : [];
            if (created?.id && !prev.some((child) => child.id === created.id)) {
              return [...prev, created];
            }
            return prev;
          });
          void queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
          void queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setLocation("/dashboard");
        },
        onError: (err: unknown) => {
          const apiErr = err as { status?: number; data?: { error?: string }; message?: string };
          if (apiErr?.status === 402 && apiErr?.data?.error === "child_limit_reached") {
            setShowUpgradePrompt(true);
            return;
          }
          toast({
            title: t("toasts.children.profile_add_failed"),
            description:
              typeof apiErr?.message === "string" && apiErr.message.length > 0
                ? apiErr.message
                : undefined,
            variant: "destructive"
          });
        }
      });
    }
  };
  const handleDelete = () => {
    deleteMutation.mutate({
      id: childId
    }, {
      onSuccess: () => {
        toast({
          title: t("toasts.children.profile_deleted")
        });
        queryClient.invalidateQueries({
          queryKey: getListChildrenQueryKey()
        });
        setLocation("/children");
      },
      onError: () => {
        return toast({
          title: t("toasts.children.profile_delete_failed"),
          variant: "destructive"
        });
      }
    });
  };
  if (isEditing && isLoadingChild) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  return <div className="flex flex-col gap-5 animate-in fade-in duration-500 max-w-2xl mx-auto pb-8">

      {/* Upgrade prompt dialog — shown when 402 is returned */}
      <AlertDialog open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
        <AlertDialogContent className="rounded-3xl max-w-sm mx-auto">
          <AlertDialogHeader>
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Crown className="h-7 w-7 text-primary" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              {isPremium
                ? t("toasts.children.child_limit_reached_title")
                : t("pages.children.form.upgrade_to_premium")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {isPremium ? (
                t("toasts.children.child_limit_reached_premium")
              ) : (
                <>
                  {t("pages.children.form.the_free_plan_supports")}{" "}
                  <strong>{t("pages.children.form.1_child")}</strong>
                  {t("pages.children.form.upgrade_to_premium_to_add_unlimited_children_and_unlock_all_")}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {!isPremium && (
              <Link href="/pricing">
                <AlertDialogAction className="w-full bg-gradient-to-r from-primary to-primary hover:from-primary hover:to-primary text-white rounded-2xl h-12 font-bold text-base">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {t("pages.children.form.see_upgrade_plans")}
                </AlertDialogAction>
              </Link>
            )}
            <AlertDialogCancel className="w-full rounded-2xl">{t("pages.children.form.maybe_later")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        data-on-dark
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/90 p-6 sm:p-8 text-white shadow-xl"
      >
        <div className="absolute top-0 right-0 h-36 w-36 translate-x-8 -translate-y-8 rounded-full bg-white/10 blur-sm" />
        <div className="absolute bottom-0 left-0 h-28 w-28 -translate-x-6 translate-y-6 rounded-full bg-white/10 blur-sm" />
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="mb-4 rounded-full bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Link href="/children"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-4">
            <div
              className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-full border-4 border-white/30 bg-white/10 shadow-lg transition-all hover:border-white/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <img src={photoPreview} alt={t("pages.children.form.child_photo")} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-white/80">
                  <Camera className="h-6 w-6" />
                  <span className="text-[9px] font-bold uppercase tracking-wide">{t("pages.children.form.add_photo")}</span>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
                {isEditing ? t("pages.children.form.edit_profile_label") : t("pages.children.form.new_profile_label")}
              </p>
              <h1 className="font-quicksand text-2xl sm:text-3xl font-bold truncate">
                {isEditing ? (watchName || child?.name || t("pages.children.form.edit_profile")) : t("pages.children.form.add_child_title")}
              </h1>
              <p className="mt-1 text-sm text-white/80 line-clamp-2">
                {isEditing
                  ? t("pages.children.form.edit_subtitle")
                  : t("pages.children.form.add_subtitle")}
              </p>
              {effectiveAge && ageGroupInfo && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">
                  {ageGroupInfo.emoji} {ageGroupInfo.label}
                </span>
              )}
              {photoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoDirty(true);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-2 text-xs font-semibold text-white/80 underline underline-offset-2 hover:text-white"
                >
                  {t("pages.children.form.remove")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upfront banner when user is already at the child limit */}
      {isAtChildLimit && <div className="rounded-2xl bg-gradient-to-r from-muted to-muted border border-border p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
            <Crown className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {isPremium ? (
              <p className="font-bold text-primary text-sm">
                {t("toasts.children.child_limit_reached_premium")}
              </p>
            ) : (
              <>
                <p className="font-bold text-primary text-sm">
                  {t("pages.children.form.free_plan_1_child_only")}
                </p>
                <p className="text-primary text-xs mt-1">
                  {t("pages.children.form.you_already_have")} {existingCount}{" "}
                  {t("pages.children.form.child_profile_upgrade_to_premium_to_add_more_children_and_un")}
                </p>
              </>
            )}
            {!isPremium && (
              <Link href="/pricing">
                <button className="mt-2 text-xs font-bold text-primary underline underline-offset-2 hover:text-primary">
                  {t("pages.children.form.view_upgrade_plans")}
                </button>
              </Link>
            )}
          </div>
        </div>}

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card">
        <CardContent className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              {/* ── STEP 1: Name ── */}
              <div>
                <p className={`${sectionLabelClass} mb-3`}>{t("pages.children.form.step_1_child_info")}</p>
                <FormField control={form.control} name="name" render={({
                field
              }) => {
                return <FormItem>
                    <FormLabel className="font-bold">{t("pages.children.form.child_s_name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("pages.children.form.enter_your_child_s_name")} className={inputClass} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>;
              }} />
              </div>

              {/* ── STEP 2: DOB ── */}
              <div className="border-t border-border/40 pt-8">
                <p className={`${sectionLabelClass} mb-3`}>{t("pages.children.form.step_2_date_of_birth")}</p>
                <FormField control={form.control} name="dob" render={({
                field
              }) => {
                return <FormItem>
                    <FormLabel className="font-bold">{t("pages.children.form.date_of_birth")}</FormLabel>
                    <FormDescription>{t("pages.children.form.we_use_this_to_auto_detect_the_age_group_and_customize_the_r")}</FormDescription>
                    <FormControl>
                      <ChildDobPicker
                        value={field.value ?? ""}
                        max={todayStr}
                        onChange={field.onChange}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>;
              }} />

                {/* Auto-calculated age display */}
                {effectiveAge && <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <div className="bg-muted/50 border border-border rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
                      <span className="text-xl">{ageGroupInfo?.emoji}</span>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">
                          {hasDob
                            ? t("pages.children.form.calculated_age")
                            : t("pages.children.index.age_years_estimated", { years: String(effectiveAge.years) })}
                        </p>
                        <p className="font-bold text-foreground text-sm">
                          {formatAge(effectiveAge.years, effectiveAge.months)}
                        </p>
                      </div>
                    </div>
                    {ageGroupInfo && <Badge className={`text-sm font-bold border px-3 py-1.5 ${ageGroupInfo.color}`}>
                        {ageGroupInfo.emoji} {ageGroupInfo.label} {t("pages.children.form.mode")}
                      </Badge>}
                  </div>}
              </div>

              {/* ── INFANT BANNER ── */}
              {calculatedAge && isInfant && <div className="bg-muted border border-border rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-2xl">👶</span>
                  <div>
                    <p className="font-bold text-primary">{t("pages.children.form.infant_mode_will_be_used")}</p>
                    <p className="text-xs text-primary mt-1">
                      {t("pages.children.form.for_babies_under_1_year_amynest_shows_parenting_guidance_car")}
                    </p>
                  </div>
                </div>}

              {/* ── Education stage (non-infant only) ── */}
              {hasAgeContext && !isInfant && <div className="border-t border-border/40 pt-8">
                  <p className={`${sectionLabelClass} mb-3 flex items-center gap-2`}>
                    <School className="h-3.5 w-3.5" />
                    {t("pages.children.form.step_3_education_stage")}
                  </p>
                  <p className="font-bold text-foreground mb-3">
                    {t("pages.children.form.education_stage_question", {
                      name: watchName || t("pages.children.form.your_child"),
                    })}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {stageOptions.map((opt) => (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => handleEducationStageSelect(opt.code)}
                        className={cn(
                          "py-3 px-3 rounded-2xl font-bold border-2 transition-all text-sm text-left",
                          watchEducationStage === opt.code
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/50 text-foreground border-transparent hover:border-primary/40",
                        )}
                      >
                        {opt.emoji} {formatEducationStageLabel(opt.code, t)}
                      </button>
                    ))}
                  </div>
                  {!watchEducationStage && (
                    <p className="text-xs text-primary mt-2 font-medium">
                      {t("pages.children.form.please_select_education_stage")}
                    </p>
                  )}
                </div>}

              {/* ── Class / grade (formal school only) ── */}
              {hasAgeContext && !isInfant && stageFlags.showClass && (
                <div className="border-t border-border/40 pt-8">
                  <p className={`${sectionLabelClass} mb-3 flex items-center gap-2`}>
                    <GraduationCap className="h-3.5 w-3.5" />
                    {t("pages.children.form.class_grade")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {getClassOptionsForCountry(parentCountry).map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => form.setValue("childClass", grade, { shouldDirty: true })}
                        className={cn(
                          "py-2.5 px-3 rounded-xl font-bold border-2 text-sm transition-all",
                          watchChildClass === grade
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 border-transparent hover:border-primary/40",
                        )}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── School schedule (formal school, age 6+) ── */}
              {hasAgeContext && !isInfant && stageFlags.showScheduleSection && (
                <div className="space-y-4 border-t border-border/40 pt-8">
                  <p className={sectionLabelClass}>
                    {t("pages.children.form.school_schedule_section")}
                  </p>
                  <p className="font-bold text-foreground">
                    {t("pages.children.form.schedule_known_question")}
                  </p>
                  <div className="flex gap-3">
                    {[
                      { value: true, label: t("screens.onboarding.schedule_yes") },
                      { value: false, label: t("screens.onboarding.schedule_later") },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => form.setValue("scheduleKnown", opt.value, { shouldDirty: true })}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-2xl font-bold border-2 transition-all text-sm",
                          watchScheduleKnown === opt.value
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/50 text-foreground border-transparent hover:border-primary/40",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasAgeContext && !isInfant && showScheduleFields && (
                <>
                  <div>
                    <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">
                      {t("pages.children.form.school_hours")}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="schoolStartTime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">{t("pages.children.form.school_starts")}</FormLabel>
                          <FormControl>
                            <Input type="time" className={inputClass} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="schoolEndTime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">{t("pages.children.form.school_ends")}</FormLabel>
                          <FormControl>
                            <Input type="time" className={inputClass} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">
                      {t("pages.children.form.school_days")}
                    </p>
                    <FormField control={form.control} name="schoolDays" render={({ field }) => {
                      const selected = (field.value ?? []) as number[];
                      const days = [
                        { iso: 1, short: "Mon" },
                        { iso: 2, short: "Tue" },
                        { iso: 3, short: "Wed" },
                        { iso: 4, short: "Thu" },
                        { iso: 5, short: "Fri" },
                        { iso: 6, short: "Sat" },
                        { iso: 7, short: "Sun" },
                      ];
                      const toggle = (iso: number) => {
                        const next = selected.includes(iso)
                          ? selected.filter((d) => d !== iso)
                          : [...selected, iso].sort();
                        field.onChange(next);
                      };
                      return (
                        <FormItem>
                          <FormLabel className="font-bold">
                            {t("pages.children.form.which_days_does_your_child_go_to_school")}
                          </FormLabel>
                          <FormDescription>
                            {t("pages.children.form.on_non_school_days_the_ai_will_plan_a_relaxed_weekend_holida")}
                          </FormDescription>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {days.map((d) => {
                              const on = selected.includes(d.iso);
                              return (
                                <button
                                  key={d.iso}
                                  type="button"
                                  onClick={() => toggle(d.iso)}
                                  className={cn(
                                    "px-4 py-2 rounded-full font-bold text-sm border-2 transition-all",
                                    on
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30",
                                  )}
                                >
                                  {d.short}
                                </button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      );
                    }} />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">
                      {t("pages.children.form.school_travel")}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="travelMode" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">{t("pages.children.form.travel_mode")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? "car"}>
                            <FormControl>
                              <SelectTrigger className={inputClass}>
                                <SelectValue placeholder={t("pages.children.form.select_travel_mode")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="van">{t("pages.children.form.school_van_bus")}</SelectItem>
                              <SelectItem value="car">{t("pages.children.form.car_parent_drop_off")}</SelectItem>
                              <SelectItem value="walk">{t("pages.children.form.walking")}</SelectItem>
                              <SelectItem value="other">{t("pages.children.form.other_specify")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {travelMode === "other" && (
                        <FormField control={form.control} name="travelModeOther" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">{t("pages.children.form.specify_travel_mode")}</FormLabel>
                            <FormControl>
                              <Input placeholder={t("pages.children.form.e_g_bicycle_rickshaw")} className={inputClass} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── INFANT CARE (infants only) ── */}
              {hasAgeContext && isInfant && <div className="space-y-5 border-t border-border/40 pt-8">
                  <div>
                    <p className={`${sectionLabelClass} mb-3`}>{t("pages.children.form.infant_feeding")}</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("pages.children.form.infant_feeding_hint")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {FEEDING_TYPES.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setInfantPrefsDirty(true);
                            setFeedingType((prev) => (prev === opt.value ? null : opt.value));
                          }}
                          className={cn(
                            "px-3 py-2 rounded-full text-sm border font-medium flex items-center gap-1.5 transition-all",
                            feedingType === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "border-border text-foreground hover:border-primary/50 bg-background",
                          )}
                        >
                          <span>{opt.emoji}</span>{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={`${sectionLabelClass} mb-3`}>{t("pages.children.form.infant_sleep_pattern")}</p>
                    <div className="flex flex-wrap gap-2">
                      {INFANT_SLEEP_PATTERNS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setInfantPrefsDirty(true);
                            setSleepPattern((prev) => (prev === opt.value ? null : opt.value));
                          }}
                          className={cn(
                            "px-3 py-2 rounded-full text-sm border font-medium flex items-center gap-1.5 transition-all",
                            sleepPattern === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "border-border text-foreground hover:border-primary/50 bg-background",
                          )}
                        >
                          <span>{opt.emoji}</span>{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>}

              {/* ── WAKE / SLEEP ── */}
              {hasAgeContext && <div className="border-t border-border/40 pt-8">
                <p className={`${sectionLabelClass} mb-3`}>{t("pages.children.form.daily_schedule")}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="wakeUpTime" render={({
                  field
                }) => {
                  return <FormItem>
                      <FormLabel className="font-bold">{t("pages.children.form.wake_up_time")}</FormLabel>
                      <FormControl><Input type="time" className={inputClass} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>;
                }} />
                  <FormField control={form.control} name="sleepTime" render={({
                  field
                }) => {
                  return <FormItem>
                      <FormLabel className="font-bold">{t("pages.children.form.bedtime")}</FormLabel>
                      <FormControl><Input type="time" className={inputClass} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>;
                }} />
                </div>
              </div>}

              {/* ── FOOD PREFERENCE (non-infant only) ── */}
              {hasAgeContext && !isInfant && <div className="border-t border-border/40 pt-8">
                <p className={`${sectionLabelClass} mb-3`}>{t("pages.children.form.food_preference")}</p>
                {foodPrefInherited && !customizeOpen ? (
                  <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-3 gap-3">
                    <div>
                      <p className="text-sm font-semibold">🌍 {t("pages.children.form.using_family_preferences")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {DIET_OPTIONS.find(d => d.value === dietType)?.emoji} {DIET_OPTIONS.find(d => d.value === dietType)?.label}
                        {foodStyle ? ` · ${FOOD_STYLE_OPTIONS.find(s => s.value === foodStyle)?.label ?? foodStyle}` : ""}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => {
                      setFoodPrefsDirty(true);
                      setCustomizeOpen(true);
                    }}>
                      {t("pages.children.form.customize_for_child")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customizeOpen && (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs text-primary font-medium">{t("pages.children.form.personalized_for_child", { name: watchName || "this child" })}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{t("pages.children.form.diet_type")}</p>
                      <div className="flex flex-wrap gap-2">
                        {DIET_OPTIONS.map(opt => (
                          <button key={opt.value} type="button"
                            onClick={() => {
                              setFoodPrefsDirty(true);
                              setDietType(opt.value);
                              form.setValue("foodType", deriveFoodType(opt.value), { shouldDirty: true });
                            }}
                            className={cn("px-3 py-1.5 rounded-full text-sm border font-medium flex items-center gap-1.5 transition-all",
                              dietType === opt.value ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border text-foreground hover:border-primary/50 bg-background")}>
                            <span>{opt.emoji}</span>{opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{t("pages.children.form.food_style")}</p>
                      <div className="flex flex-wrap gap-2">
                        {FOOD_STYLE_OPTIONS.map(opt => (
                          <button key={opt.value} type="button"
                            onClick={() => {
                              setFoodPrefsDirty(true);
                              setFoodStyle(opt.value);
                              if (opt.value !== "indian") setSubCuisine("");
                            }}
                            className={cn("px-3 py-1.5 rounded-full text-sm border font-medium flex items-center gap-1.5 transition-all",
                              foodStyle === opt.value ? "bg-primary text-primary-foreground border-primary shadow-sm" : "border-border text-foreground hover:border-primary/50 bg-background")}>
                            <span>{opt.emoji}</span>{opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {foodStyle === "indian" && (
                      <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                        <p className="text-sm font-semibold">{t("pages.children.form.indian_sub_cuisine")} <span className="font-normal text-muted-foreground text-xs">{t("pages.children.form.optional_label")}</span></p>
                        <div className="flex flex-wrap gap-2">
                          {INDIAN_SUB_OPTIONS.map(opt => (
                            <button key={opt.value} type="button"
                              onClick={() => {
                                setFoodPrefsDirty(true);
                                setSubCuisine(prev => prev === opt.value ? "" : opt.value);
                              }}
                              className={cn("px-3 py-1.5 rounded-full text-sm border font-medium flex items-center gap-1.5 transition-all",
                                subCuisine === opt.value ? "bg-primary/15 text-primary border-primary" : "border-border text-foreground hover:border-primary/50 bg-background")}>
                              <span>{opt.emoji}</span>{opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">{t("pages.children.form.food_restrictions")}</p>
                      <div className="flex flex-wrap gap-2">
                        {ALLERGY_CHIPS.map(chip => (
                          <button key={chip.value} type="button"
                            onClick={() => {
                              setFoodPrefsDirty(true);
                              setAllergyChips(prev => prev.includes(chip.value) ? prev.filter(c => c !== chip.value) : [...prev, chip.value]);
                            }}
                            className={cn("px-3 py-1.5 rounded-full text-sm border font-medium transition-all",
                              allergyChips.includes(chip.value) ? "bg-primary/15 text-primary border-primary" : "border-border text-foreground hover:border-primary/50 bg-background")}>
                            {chip.label}
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder={t("pages.children.form.other_restrictions_placeholder")}
                        value={allergyText}
                        onChange={e => {
                          setFoodPrefsDirty(true);
                          setAllergyText(e.target.value);
                        }}
                        className="h-9 text-sm rounded-xl bg-muted/50 border-transparent focus-visible:bg-background"
                      />
                    </div>
                    {customizeOpen && (
                      <button type="button"
                        onClick={() => {
                          setFoodPrefsDirty(true);
                          setCustomizeOpen(false);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        ← {t("pages.children.form.use_family_preferences_instead")}
                      </button>
                    )}
                  </div>
                )}
              </div>}

              {/* ── BABYSITTER ── */}
              {hasAgeContext && babysitters.length > 0 && <div className="border-t border-border/40 pt-8">
                  <p className={`${sectionLabelClass} mb-3`}>
                    <Baby className="h-3.5 w-3.5 inline mr-1" />{t("pages.children.form.babysitter")}
                  </p>
                  <FormField control={form.control} name="babysitterId" render={({
                field
              }) => {
                return <FormItem>
                      <FormLabel className="font-bold">{t("pages.children.form.assign_a_babysitter")} <span className="font-normal text-muted-foreground">{t("pages.children.form.optional_2")}</span></FormLabel>
                      <FormDescription>{t("pages.children.form.routines_will_be_tailored_when_a_babysitter_is_on_duty")}</FormDescription>
                      <Select onValueChange={v => field.onChange(v === "none" ? undefined : parseInt(v))} value={field.value ? String(field.value) : "none"}>
                        <FormControl>
                          <SelectTrigger className={inputClass}>
                            <SelectValue placeholder={t("pages.children.form.no_babysitter_assigned")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t("pages.children.form.no_babysitter")}</SelectItem>
                          {babysitters.map(s => <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}{s.mobileNumber ? ` — ${s.mobileNumber}` : ""}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>;
              }} />
                </div>}

              {/* ── RECURRING ACTIVITIES (non-infant only) ── */}
              {hasAgeContext && !isInfant && <div className="space-y-3 border-t border-border/40 pt-8">
                <p className={sectionLabelClass}>
                  {t("pages.routines.fixed.profile_section")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("pages.routines.fixed.profile_hint")}
                </p>
                {fixedActivities.filter((e) => e.activity && e.days.length).length > 0 && (
                  <FixedActivitiesWeeklyInsights
                    activities={fixedActivities.filter(
                      (e) => e.activity && e.days.length > 0 && e.start && e.end,
                    )}
                    childName={watchName}
                  />
                )}
                <FixedActivitiesEditor
                  value={fixedActivities}
                  onChange={(next) => {
                    setFixedActivitiesDirty(true);
                    setFixedActivities(next);
                  }}
                />
              </div>}

              {/* ── GOALS ── */}
              {hasAgeContext && <div className="border-t border-border/40 pt-8">
              <FormField control={form.control} name="goals" render={({
              field
            }) => {
              return <FormItem>
                  <FormLabel className="font-bold">{t("pages.children.form.daily_goals_focus")} <span className="font-normal text-muted-foreground">{t("pages.children.form.optional_3")}</span></FormLabel>
                  <FormDescription>
                    {t("pages.children.form.what_are_you_working_on_e_g_math_practice_swimming_on_tuesda")}
                  </FormDescription>
                  <FormControl>
                    <Textarea placeholder={isInfant ? "e.g. Tummy time, sensory play, sleep training" : `${watchName || "Your child"} is working on... (leave blank for default routine)`} className="min-h-[90px] rounded-xl bg-muted/50 border-transparent focus-visible:bg-background resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>;
            }} />
              </div>}

              {/* ── ACTION BUTTONS ── */}
              <div className="sticky bottom-3 z-10 flex gap-3 rounded-3xl border border-border/50 bg-background/95 p-3 pt-4 shadow-lg backdrop-blur-md">
                <Button type="submit" disabled={isSaving || !hasAgeContext || (!isInfant && !watchEducationStage)} className="flex-1 rounded-full h-12 font-bold shadow-md">
                  {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("pages.children.form.saving")}</> : <><Save className="h-4 w-4 mr-2" />{isEditing ? t("pages.children.form.update_profile") : t("pages.children.form.add_child_cta")}</>}
                </Button>

                {isEditing && <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="rounded-full h-12 w-12 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("pages.children.form.delete_this_profile")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("pages.children.form.this_will_permanently_delete")} {child?.name}{t("pages.children.form.s_profile_and_all_their_routine_data_this_action_cannot_be_u")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("pages.children.form.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {t("pages.children.form.yes_delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>}
              </div>

              {!watchDob && <p className="text-center text-xs text-muted-foreground">{t("pages.children.form.enter_your_child_s_date_of_birth_to_continue")}</p>}
              {!isInfant && hasAgeContext && !watchEducationStage && (
                <p className="text-center text-xs text-primary font-medium">
                  {t("pages.children.form.please_select_education_stage")}
                </p>
              )}

            </form>
          </Form>
        </CardContent>
      </Card>

      {isEditing && childId > 0 && <ChildGoalsCard childId={childId} />}
      {isEditing && childId > 0 && <InsightsCard childId={childId} />}
    </div>;
}

ChildForm.displayName = "ChildForm";
export default ChildForm;