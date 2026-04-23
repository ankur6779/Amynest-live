import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/lib/firebase-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Save, Plus, Trash2, Clock, Utensils, Camera, Loader2 } from "lucide-react";

interface FreeSlot {
  start: string;
  end: string;
}

interface ParentProfile {
  name: string;
  role: string;
  gender: string;
  mobileNumber: string;
  workType: string;
  workStartTime: string;
  workEndTime: string;
  freeSlots: FreeSlot[];
  foodType: string;
  allergies: string;
  region: string;
}

const REGION_OPTIONS = [
  { value: "pan_indian", label: "Pan-Indian (Mixed)" },
  { value: "north_indian", label: "North Indian" },
  { value: "south_indian", label: "South Indian" },
  { value: "bengali", label: "Bengali" },
  { value: "gujarati", label: "Gujarati" },
  { value: "maharashtrian", label: "Maharashtrian" },
  { value: "punjabi", label: "Punjabi" },
  { value: "global", label: "Global / Continental" },
];

export default function ParentProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ParentProfile>({
    name: "",
    role: "mother",
    gender: "",
    mobileNumber: "",
    workType: "work_from_home",
    workStartTime: "",
    workEndTime: "",
    freeSlots: [],
    foodType: "non_veg",
    allergies: "",
    region: "pan_indian",
  });

  useEffect(() => {
    getToken().then((token) => {
      fetch("/api/parent-profile", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => {
          if (r.ok) return r.json();
          return null;
        })
        .then((data) => {
          if (data) {
            setProfile({
              name: data.name ?? "",
              role: data.role ?? "mother",
              gender: data.gender ?? "",
              mobileNumber: data.mobileNumber ?? "",
              workType: data.workType ?? "work_from_home",
              workStartTime: data.workStartTime ?? "",
              workEndTime: data.workEndTime ?? "",
              freeSlots: data.freeSlots ?? [],
              foodType: data.foodType ?? "non_veg",
              allergies: data.allergies ?? "",
              region: data.region ?? "pan_indian",
            });
          }
        })
        .finally(() => setLoading(false));
    });
  }, []);

  const addFreeSlot = () => {
    setProfile((p) => ({ ...p, freeSlots: [...p.freeSlots, { start: "12:00", end: "13:00" }] }));
  };

  const removeFreeSlot = (i: number) => {
    setProfile((p) => ({ ...p, freeSlots: p.freeSlots.filter((_, idx) => idx !== i) }));
  };

  const updateFreeSlot = (i: number, field: "start" | "end", value: string) => {
    setProfile((p) => {
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
      toast({ title: "Profile picture updated!" });
    } catch {
      toast({ title: "Failed to update picture", variant: "destructive" });
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const body: any = {
        name: profile.name || undefined,
        role: profile.role,
        workType: profile.workType,
        foodType: profile.foodType,
        region: profile.region,
      };
      if (profile.gender) body.gender = profile.gender;
      if (profile.mobileNumber) body.mobileNumber = profile.mobileNumber;
      if (profile.workStartTime) body.workStartTime = profile.workStartTime;
      if (profile.workEndTime) body.workEndTime = profile.workEndTime;
      if (profile.freeSlots.length > 0) body.freeSlots = profile.freeSlots;
      if (profile.allergies) body.allergies = profile.allergies;

      const res = await fetch("/api/parent-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Profile saved!", description: "Your schedule will now inform Amy AI's routine generation." });
    } catch {
      toast({ title: "Error", description: "Could not save profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 max-w-2xl">
      <header>
        <h1 className="font-quicksand text-3xl font-bold text-foreground flex items-center gap-2">
          <UserCircle className="h-8 w-8 text-primary" />
          {t("profile.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("profile.subtitle")}
        </p>
      </header>

      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="font-quicksand text-lg">Personal Info</CardTitle>
          <CardDescription>Basic details about you and your role in the family</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Profile Picture */}
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage src={user?.imageUrl ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {profile.name ? profile.name[0]?.toUpperCase() : (user?.firstName?.[0] ?? "U")}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPic}
                className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {uploadingPic ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
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
            <div>
              <p className="font-semibold text-foreground">{profile.name || user?.firstName || "Your Name"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click the camera icon to change your profile picture
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Your Name</Label>
              <Input
                placeholder="e.g. Ayesha, Sarah, Ahmed..."
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                This name will appear in your dashboard greeting.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("profile.role")}</Label>
              <Select value={profile.role} onValueChange={(v) => setProfile((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">{t("profile.mother")}</SelectItem>
                  <SelectItem value="father">{t("profile.father")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("profile.gender")}</Label>
              <Select value={profile.gender || "prefer_not"} onValueChange={(v) => setProfile((p) => ({ ...p, gender: v === "prefer_not" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>{t("profile.mobile")}</Label>
              <Input
                placeholder="+92 300 1234567"
                value={profile.mobileNumber}
                onChange={(e) => setProfile((p) => ({ ...p, mobileNumber: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="font-quicksand text-lg">Work Schedule</CardTitle>
          <CardDescription>Amy AI uses this to assign tasks when you're busy or available</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("profile.work_type")}</Label>
            <Select value={profile.workType} onValueChange={(v) => setProfile((p) => ({ ...p, workType: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Work Start</Label>
                <Input
                  type="time"
                  value={profile.workStartTime}
                  onChange={(e) => setProfile((p) => ({ ...p, workStartTime: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Work End</Label>
                <Input
                  type="time"
                  value={profile.workEndTime}
                  onChange={(e) => setProfile((p) => ({ ...p, workEndTime: e.target.value }))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-quicksand text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Free / Available Slots
            </CardTitle>
            <CardDescription>Times during the day you're free to spend with your child</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addFreeSlot} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" /> Add Slot
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {profile.freeSlots.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No free slots added. Click "Add Slot" to specify when you're available.
            </p>
          )}
          {profile.freeSlots.map((slot, i) => (
            <div key={i} className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={slot.start}
                  onChange={(e) => updateFreeSlot(i, "start", e.target.value)}
                  className="h-8 text-sm"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="time"
                  value={slot.end}
                  onChange={(e) => updateFreeSlot(i, "end", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                onClick={() => removeFreeSlot(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm border-border/50">
        <CardHeader>
          <CardTitle className="font-quicksand text-lg flex items-center gap-2">
            <Utensils className="h-5 w-5 text-primary" />
            Food Preferences
          </CardTitle>
          <CardDescription>
            Used by Amy AI to suggest appropriate meals in routines
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Diet Type</Label>
            <Select
              value={profile.foodType}
              onValueChange={(v) => setProfile((p) => ({ ...p, foodType: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select diet type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non_veg">Non-Vegetarian (includes meat, eggs, fish)</SelectItem>
                <SelectItem value="veg">Vegetarian (no meat or fish)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Regional Cuisine</Label>
            <Select
              value={profile.region}
              onValueChange={(v) => setProfile((p) => ({ ...p, region: v }))}
            >
              <SelectTrigger data-testid="select-region">
                <SelectValue placeholder="Select cuisine region" />
              </SelectTrigger>
              <SelectContent>
                {REGION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Amy AI will tailor breakfast, lunch, dinner, snack and tiffin suggestions to this regional cuisine.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Allergies / Foods to Avoid</Label>
            <Textarea
              placeholder="e.g. peanuts, shellfish, dairy, gluten..."
              value={profile.allergies}
              onChange={(e) => setProfile((p) => ({ ...p, allergies: e.target.value }))}
              className="resize-none"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              List any food allergies or ingredients to avoid in Amy AI-generated meal suggestions.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl h-11">
        <Save className="h-4 w-4 mr-2" />
        {saving ? t("common.saving") : t("profile.save")}
      </Button>
    </div>
  );
}
