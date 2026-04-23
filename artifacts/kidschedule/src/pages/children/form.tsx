import { useState, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateChild, useUpdateChild, useGetChild, getGetChildQueryKey, useDeleteChild, getListChildrenQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Trash2, Loader2, Baby, Camera, X, GraduationCap, School } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Babysitter {
  id: number;
  name: string;
  mobileNumber?: string | null;
}

const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

const childSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  isSchoolGoing: z.boolean().optional(),
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
  babysitterId: z.coerce.number().optional(),
});

type ChildFormValues = z.infer<typeof childSchema>;

function calculateAge(dob: string): { years: number; months: number } {
  if (!dob) return { years: 0, months: 0 };
  const today = new Date();
  const birth = new Date(dob + "T00:00:00");
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return { years: Math.max(0, years), months: Math.max(0, months) };
}

function formatAge(years: number, months: number): string {
  if (years === 0 && months === 0) return "Newborn";
  if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
  if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""} ${months} month${months !== 1 ? "s" : ""}`;
}

function getAgeGroupInfo(totalMonths: number) {
  if (totalMonths < 12) return { label: "Infant", emoji: "👶", color: "bg-pink-100 text-pink-800 border-pink-200" };
  if (totalMonths < 36) return { label: "Toddler", emoji: "🍼", color: "bg-purple-100 text-purple-800 border-purple-200" };
  if (totalMonths < 60) return { label: "Preschool", emoji: "🎨", color: "bg-blue-100 text-blue-800 border-blue-200" };
  if (totalMonths < 120) return { label: "School Age", emoji: "📚", color: "bg-green-100 text-green-800 border-green-200" };
  return { label: "Pre-Teen", emoji: "🎯", color: "bg-orange-100 text-orange-800 border-orange-200" };
}

const todayStr = new Date().toISOString().slice(0, 10);

const inputClass = "rounded-xl h-12 bg-muted/50 border-transparent focus-visible:bg-background";

export default function ChildForm() {
  const [_, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const authFetch = useAuthFetch();
  const [babysitters, setBabysitters] = useState<Babysitter[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!params.id && params.id !== "new";
  const childId = isEditing ? parseInt(params.id as string) : 0;

  const { data: child, isLoading: isLoadingChild } = useGetChild(childId, {
    query: { enabled: isEditing, queryKey: getGetChildQueryKey(childId) }
  });

  const createMutation = useCreateChild();
  const updateMutation = useUpdateChild();
  const deleteMutation = useDeleteChild();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      name: "",
      dob: "",
      isSchoolGoing: undefined,
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
      babysitterId: undefined,
    },
  });

  const watchDob = form.watch("dob");
  const watchIsSchoolGoing = form.watch("isSchoolGoing");
  const travelMode = form.watch("travelMode");

  const calculatedAge = watchDob ? calculateAge(watchDob) : null;
  const totalMonths = calculatedAge ? calculatedAge.years * 12 + calculatedAge.months : 0;
  const isInfant = totalMonths < 12;
  const ageGroupInfo = calculatedAge ? getAgeGroupInfo(totalMonths) : null;

  useEffect(() => {
    authFetch("/api/babysitters")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Babysitter[]) => setBabysitters(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (child && isEditing) {
      const dobValue = (child as any).dob ?? "";
      const isSchoolGoingValue = (child as any).isSchoolGoing;
      form.reset({
        name: child.name,
        dob: dobValue,
        isSchoolGoing: isSchoolGoingValue ?? undefined,
        childClass: child.childClass ?? "",
        wakeUpTime: child.wakeUpTime ?? "07:00",
        sleepTime: child.sleepTime ?? "21:00",
        schoolStartTime: child.schoolStartTime ?? "08:00",
        schoolEndTime: child.schoolEndTime ?? "15:00",
        schoolDays: ((child as any).schoolDays as number[] | null | undefined) ?? [1, 2, 3, 4, 5],
        travelMode: (child.travelMode as "van" | "car" | "walk" | "other") ?? "car",
        travelModeOther: child.travelModeOther ?? "",
        foodType: (child.foodType as "veg" | "non_veg") ?? "veg",
        goals: child.goals ?? "",
        babysitterId: child.babysitterId ?? undefined,
      });
      if ((child as any).photoUrl) setPhotoPreview((child as any).photoUrl);
    }
  }, [child, form, isEditing]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Photo too large", description: "Please choose an image under 5MB.", variant: "destructive" });
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
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: ChildFormValues) => {
    const age = calculatedAge ?? { years: 0, months: 0 };
    const schoolGoing = isInfant ? false : (data.isSchoolGoing ?? false);

    const payload = {
      name: data.name,
      dob: data.dob,
      age: age.years,
      ageMonths: age.months,
      isSchoolGoing: schoolGoing,
      childClass: data.childClass?.trim() || undefined,
      wakeUpTime: data.wakeUpTime,
      sleepTime: data.sleepTime,
      schoolStartTime: schoolGoing ? (data.schoolStartTime ?? "08:00") : "08:00",
      schoolEndTime: schoolGoing ? (data.schoolEndTime ?? "15:00") : "15:00",
      // schoolDays: only meaningful when school-going. null = "not applicable".
      schoolDays: schoolGoing
        ? (data.schoolDays && data.schoolDays.length > 0 ? data.schoolDays : [1, 2, 3, 4, 5])
        : null,
      travelMode: schoolGoing ? (data.travelMode ?? "car") : "car",
      travelModeOther: schoolGoing && data.travelMode === "other" ? data.travelModeOther : undefined,
      foodType: data.foodType,
      goals: data.goals?.trim() || "General daily routine",
      babysitterId: data.babysitterId || undefined,
      photoUrl: photoPreview || undefined,
    };

    if (isEditing) {
      updateMutation.mutate(
        { id: childId, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Profile updated successfully" });
            queryClient.invalidateQueries({ queryKey: getGetChildQueryKey(childId) });
            queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
            setLocation("/children");
          },
          onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
        }
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast({ title: "Child added successfully — taking you to your dashboard" });
            // Hard refresh so subscription/entitlements/onboarding-gate all reload
            // and the user can immediately use everything.
            window.location.href = "/dashboard";
          },
          onError: () => toast({ title: "Failed to add child", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { id: childId },
      {
        onSuccess: () => {
          toast({ title: "Profile deleted" });
          queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() });
          setLocation("/children");
        },
        onError: () => toast({ title: "Failed to delete profile", variant: "destructive" }),
      }
    );
  };

  if (isEditing && isLoadingChild) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-2xl mx-auto">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/children"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="font-quicksand text-3xl font-bold text-foreground">
            {isEditing ? "Edit Profile" : "Add Child"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? "Update your child's details" : "Tell us about your child to get personalized routines"}
          </p>
        </div>
      </header>

      <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-card">
        <CardContent className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Photo Upload */}
              <div>
                <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">Child's Photo</p>
                <div className="flex items-center gap-5">
                  <div
                    className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {photoPreview ? (
                      <>
                        <img src={photoPreview} alt="Child photo" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="h-6 w-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Camera className="h-7 w-7" />
                        <span className="text-[10px] font-bold">Add Photo</span>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground text-sm">Upload a photo of your child</p>
                    <p className="text-xs text-muted-foreground mt-1">Shown alongside daily routines. Max 2MB.</p>
                    <div className="flex gap-2 mt-2">
                      <Button type="button" size="sm" variant="outline" className="rounded-full h-8 text-xs" onClick={() => fileInputRef.current?.click()}>
                        <Camera className="h-3 w-3 mr-1.5" />Choose Photo
                      </Button>
                      {photoPreview && (
                        <Button type="button" size="sm" variant="ghost" className="rounded-full h-8 text-xs text-muted-foreground" onClick={() => { setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                          <X className="h-3 w-3 mr-1" />Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── STEP 1: Name ── */}
              <div>
                <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">Step 1 — Child Info</p>
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Child's Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your child's name" className={inputClass} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* ── STEP 2: DOB ── */}
              <div>
                <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">Step 2 — Date of Birth</p>
                <FormField control={form.control} name="dob" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">📅 Date of Birth</FormLabel>
                    <FormDescription>We use this to auto-detect the age group and customize the routine.</FormDescription>
                    <FormControl>
                      <Input
                        type="date"
                        max={todayStr}
                        className={inputClass}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Auto-calculated age display */}
                {calculatedAge && watchDob && (
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <div className="bg-muted/50 border border-border rounded-2xl px-4 py-2.5 flex items-center gap-2.5">
                      <span className="text-xl">{ageGroupInfo?.emoji}</span>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Calculated Age</p>
                        <p className="font-bold text-foreground text-sm">
                          {formatAge(calculatedAge.years, calculatedAge.months)}
                        </p>
                      </div>
                    </div>
                    {ageGroupInfo && (
                      <Badge className={`text-sm font-bold border px-3 py-1.5 ${ageGroupInfo.color}`}>
                        {ageGroupInfo.emoji} {ageGroupInfo.label} Mode
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* ── INFANT BANNER ── */}
              {calculatedAge && isInfant && (
                <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-2xl">👶</span>
                  <div>
                    <p className="font-bold text-pink-800">Infant Mode will be used</p>
                    <p className="text-xs text-pink-700 mt-1">
                      For babies under 1 year, AmyNest shows parenting guidance cards, feeding schedules, vaccination reminders, and soothing tips. School and travel questions are skipped.
                    </p>
                  </div>
                </div>
              )}

              {/* ── STEP 3: School Question (non-infant only) ── */}
              {calculatedAge && !isInfant && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                    <School className="h-3.5 w-3.5" />
                    Step 3 — School
                  </p>
                  <p className="font-bold text-foreground mb-3">Does {form.watch("name") || "your child"} go to school?</p>
                  <div className="flex gap-3">
                    {[
                      { value: true, label: "🏫 Yes, goes to school" },
                      { value: false, label: "🏠 Not yet / Homeschool" },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => form.setValue("isSchoolGoing", opt.value, { shouldValidate: true })}
                        className={`flex-1 py-3 px-4 rounded-2xl font-bold border-2 transition-all text-sm ${
                          watchIsSchoolGoing === opt.value
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-muted/50 text-foreground border-transparent hover:border-primary/40"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {watchIsSchoolGoing === undefined && (
                    <p className="text-xs text-amber-600 mt-2 font-medium">Please select an option to continue</p>
                  )}
                </div>
              )}

              {/* ── SCHOOL DETAILS (only if school = YES) ── */}
              {calculatedAge && !isInfant && watchIsSchoolGoing === true && (
                <>
                  {/* Class */}
                  <div>
                    <FormField control={form.control} name="childClass" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          Class / Grade <span className="font-normal text-muted-foreground">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Grade 5, UKG, Class 3" className={inputClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {/* School Hours */}
                  <div>
                    <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">School Hours</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="schoolStartTime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">🎒 School Starts</FormLabel>
                          <FormControl>
                            <Input type="time" className={inputClass} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="schoolEndTime" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">🏠 School Ends</FormLabel>
                          <FormControl>
                            <Input type="time" className={inputClass} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>

                  {/* School Days */}
                  <div>
                    <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">School Days</p>
                    <FormField control={form.control} name="schoolDays" render={({ field }) => {
                      const selected = (field.value ?? []) as number[];
                      const days: { iso: number; short: string }[] = [
                        { iso: 1, short: "Mon" }, { iso: 2, short: "Tue" }, { iso: 3, short: "Wed" },
                        { iso: 4, short: "Thu" }, { iso: 5, short: "Fri" }, { iso: 6, short: "Sat" },
                        { iso: 7, short: "Sun" },
                      ];
                      const toggle = (iso: number) => {
                        const next = selected.includes(iso) ? selected.filter((d) => d !== iso) : [...selected, iso].sort();
                        field.onChange(next);
                      };
                      return (
                        <FormItem>
                          <FormLabel className="font-bold">📅 Which days does your child go to school?</FormLabel>
                          <FormDescription>
                            On non-school days, the AI will plan a relaxed weekend / holiday routine instead.
                          </FormDescription>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {days.map((d) => {
                              const on = selected.includes(d.iso);
                              return (
                                <button
                                  key={d.iso}
                                  type="button"
                                  onClick={() => toggle(d.iso)}
                                  className={`px-4 py-2 rounded-full font-bold text-sm border-2 transition-all ${
                                    on
                                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                      : "bg-muted/50 text-muted-foreground border-transparent hover:border-primary/30"
                                  }`}
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

                  {/* Travel Mode */}
                  <div>
                    <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">School Travel</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="travelMode" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">🚌 Travel Mode</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value ?? "car"}>
                            <FormControl>
                              <SelectTrigger className={inputClass}>
                                <SelectValue placeholder="Select travel mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="van">🚐 School Van / Bus</SelectItem>
                              <SelectItem value="car">🚗 Car (Parent Drop-off)</SelectItem>
                              <SelectItem value="walk">🚶 Walking</SelectItem>
                              <SelectItem value="other">✏️ Other (specify)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {travelMode === "other" && (
                        <FormField control={form.control} name="travelModeOther" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">Specify Travel Mode</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Bicycle, Rickshaw..." className={inputClass} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ── WAKE / SLEEP ── */}
              <div>
                <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">Daily Schedule</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="wakeUpTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">⏰ Wake-up Time</FormLabel>
                      <FormControl><Input type="time" className={inputClass} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="sleepTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">🌙 Bedtime</FormLabel>
                      <FormControl><Input type="time" className={inputClass} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── FOOD PREFERENCE ── */}
              <div>
                <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">Food Preference</p>
                <FormField control={form.control} name="foodType" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">🍽️ Diet Type</FormLabel>
                    <FormDescription>Used for smart tiffin and meal suggestions.</FormDescription>
                    <div className="flex gap-3 mt-1">
                      {[
                        { value: "veg", label: "🥦 Vegetarian", desc: "No meat/fish/eggs" },
                        { value: "non_veg", label: "🍗 Non-Vegetarian", desc: "Includes eggs, meat, fish" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={`flex-1 py-3 px-4 rounded-2xl font-bold border-2 transition-all text-sm text-left ${
                            field.value === opt.value
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-muted/50 text-foreground border-transparent hover:border-primary/40"
                          }`}
                        >
                          <div>{opt.label}</div>
                          <div className={`text-xs font-normal mt-0.5 ${field.value === opt.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* ── BABYSITTER ── */}
              {babysitters.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wide">
                    <Baby className="h-3.5 w-3.5 inline mr-1" />Babysitter
                  </p>
                  <FormField control={form.control} name="babysitterId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold">Assign a Babysitter <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                      <FormDescription>Routines will be tailored when a babysitter is on duty.</FormDescription>
                      <Select
                        onValueChange={(v) => field.onChange(v === "none" ? undefined : parseInt(v))}
                        value={field.value ? String(field.value) : "none"}
                      >
                        <FormControl>
                          <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="No babysitter assigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No babysitter</SelectItem>
                          {babysitters.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}{s.mobileNumber ? ` — ${s.mobileNumber}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              )}

              {/* ── GOALS ── */}
              <FormField control={form.control} name="goals" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">🎯 Daily Goals & Focus <span className="font-normal text-muted-foreground">(optional)</span></FormLabel>
                  <FormDescription>
                    What are you working on? (e.g., "Math practice, swimming on Tuesdays, reduce screen time")
                  </FormDescription>
                  <FormControl>
                    <Textarea
                      placeholder={isInfant
                        ? "e.g. Tummy time, sensory play, sleep training"
                        : `${form.watch("name") || "Your child"} is working on... (leave blank for default routine)`}
                      className="min-h-[90px] rounded-xl bg-muted/50 border-transparent focus-visible:bg-background resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* ── ACTION BUTTONS ── */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSaving || !watchDob || (!isInfant && watchIsSchoolGoing === undefined)}
                  className="flex-1 rounded-full h-12 font-bold"
                >
                  {isSaving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />{isEditing ? "Update Profile" : "Add Child"}</>
                  )}
                </Button>

                {isEditing && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="rounded-full h-12 w-12 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this profile?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete {child?.name}'s profile and all their routine data. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Yes, delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {!watchDob && (
                <p className="text-center text-xs text-muted-foreground">Enter your child's date of birth to continue</p>
              )}
              {!isInfant && watchDob && watchIsSchoolGoing === undefined && (
                <p className="text-center text-xs text-amber-600 font-medium">Please answer the school question above</p>
              )}

            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
