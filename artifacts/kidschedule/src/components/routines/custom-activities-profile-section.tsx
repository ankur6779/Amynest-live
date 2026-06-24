import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch, parseApiJson } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { WEEKDAY_LABELS } from "@/lib/fixed-activities";

type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

type SavedActivity = {
  id: number;
  childId: number | null;
  title: string;
  category: string;
  daysOfWeek: Weekday[];
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  isActive: boolean;
};

type ActivityForm = Omit<SavedActivity, "id">;

const DAY_MAP: Record<(typeof WEEKDAY_LABELS)[number], Weekday> = {
  Mon: "MON",
  Tue: "TUE",
  Wed: "WED",
  Thu: "THU",
  Fri: "FRI",
  Sat: "SAT",
  Sun: "SUN",
};

const DAY_LABEL: Record<Weekday, string> = {
  MON: "Mon",
  TUE: "Tue",
  WED: "Wed",
  THU: "Thu",
  FRI: "Fri",
  SAT: "Sat",
  SUN: "Sun",
};

const emptyForm: ActivityForm = {
  childId: null,
  title: "",
  category: "activity",
  daysOfWeek: ["MON", "WED", "FRI"],
  startTime: "17:00",
  endTime: "18:00",
  location: "",
  notes: "",
  isActive: true,
};

function cleanForm(form: ActivityForm) {
  return {
    ...form,
    title: form.title.trim(),
    category: form.category.trim() || "activity",
    childId: form.childId ?? null,
    location: form.location?.trim() || null,
    notes: form.notes?.trim() || null,
  };
}

export function CustomActivitiesProfileSection() {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: children = [] } = useListChildren();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ActivityForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const activitiesQuery = useQuery({
    queryKey: ["custom-activities"],
    queryFn: async () => {
      const res = await authFetch(getApiUrl("/api/custom-activities"));
      if (!res.ok) throw new Error(`Failed to load activities (${res.status})`);
      const data = await parseApiJson<{ activities: SavedActivity[] }>(res);
      return data.activities;
    },
  });

  const childNameById = useMemo(() => {
    return new Map(children.map((child) => [child.id, child.name]));
  }, [children]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(false);
  };

  const refreshAfterChange = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["custom-activities"] }),
      queryClient.invalidateQueries({ queryKey: getListChildrenQueryKey() }),
    ]);
  };

  const submit = async () => {
    const payload = cleanForm(form);
    if (!payload.title || payload.daysOfWeek.length === 0 || payload.endTime <= payload.startTime) {
      toast({
        title: "Check activity details",
        description: "Add a title, at least one day, and a valid time range.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? getApiUrl(`/api/custom-activities/${editingId}`)
        : getApiUrl("/api/custom-activities");
      const res = await authFetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data: { error?: string } = await parseApiJson<{ error?: string }>(res).catch(() => ({}));
        throw new Error(data.error || "Could not save activity");
      }
      await refreshAfterChange();
      resetForm();
      toast({
        title: editingId ? "Activity updated" : "Activity saved",
        description: "Future routines will use this schedule automatically.",
      });
    } catch (err) {
      toast({
        title: "Could not save activity",
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const edit = (activity: SavedActivity) => {
    setEditingId(activity.id);
    setForm({
      childId: activity.childId,
      title: activity.title,
      category: activity.category || "activity",
      daysOfWeek: activity.daysOfWeek,
      startTime: activity.startTime,
      endTime: activity.endTime,
      location: activity.location ?? "",
      notes: activity.notes ?? "",
      isActive: activity.isActive,
    });
    setFormOpen(true);
  };

  const patchActivity = async (activity: SavedActivity, patch: Partial<ActivityForm>) => {
    const res = await authFetch(getApiUrl(`/api/custom-activities/${activity.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Could not update activity");
    await refreshAfterChange();
  };

  const deleteActivity = async (activity: SavedActivity) => {
    if (!window.confirm(`Delete ${activity.title}? Future routines will stop using it.`)) return;
    const res = await authFetch(getApiUrl(`/api/custom-activities/${activity.id}`), {
      method: "DELETE",
    });
    if (!res.ok) {
      toast({ title: "Could not delete activity", variant: "destructive" });
      return;
    }
    await refreshAfterChange();
    toast({ title: "Activity deleted" });
  };

  const toggleDay = (day: Weekday) => {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const activities = activitiesQuery.data ?? [];

  return (
    <Card className="rounded-3xl border-border/60">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Profile Activities
            </CardTitle>
            <CardDescription>
              Save tuition, sports, therapy, and classes once. Amy will lock them into future routines.
            </CardDescription>
          </div>
          <Button
            type="button"
            className="rounded-full shrink-0"
            onClick={() => {
              setEditingId(null);
              setForm(emptyForm);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {formOpen && (
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Activity</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Dance, Swimming, Speech Therapy"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label>Child</Label>
                <Select
                  value={form.childId == null ? "all" : String(form.childId)}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      childId: value === "all" ? null : Number(value),
                    }))
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All children</SelectItem>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={String(child.id)}>
                        {child.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Days</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label) => {
                  const day = DAY_MAP[label];
                  const active = form.daysOfWeek.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={[
                        "rounded-lg border px-3 py-1.5 text-xs font-bold",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="therapy, sports, class"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input
                  value={form.location ?? ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Studio, school, online"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Anything Amy should know"
                className="rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="button" className="rounded-full" disabled={saving} onClick={submit}>
                {saving ? "Saving..." : editingId ? "Update Activity" : "Save Activity"}
              </Button>
            </div>
          </div>
        )}

        {activitiesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activities...</p>
        ) : activities.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
            No saved activities yet. Add Dance, Karate, Tuition, Music Class, Speech Therapy, or any weekly commitment.
          </p>
        ) : (
          <div className="grid gap-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={[
                  "rounded-2xl border bg-card p-4",
                  activity.isActive ? "border-border" : "border-border/60 opacity-70",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{activity.title}</p>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                        Saved Activity
                      </span>
                      {!activity.isActive && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.daysOfWeek.map((day) => DAY_LABEL[day]).join(" ")} · {activity.startTime} - {activity.endTime}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.childId ? childNameById.get(activity.childId) ?? "Child-specific" : "All children"}
                      {activity.location ? ` · ${activity.location}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => edit(activity)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        patchActivity(activity, { isActive: !activity.isActive }).catch(() =>
                          toast({ title: "Could not update activity", variant: "destructive" }),
                        )
                      }
                    >
                      {activity.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive" onClick={() => deleteActivity(activity)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
