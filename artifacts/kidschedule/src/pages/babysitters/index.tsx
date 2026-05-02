import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Baby, Plus, Trash2, Phone, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Babysitter {
  id: number;
  name: string;
  mobileNumber?: string | null;
  notes?: string | null;
  createdAt: string;
}

export default function BabysittersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const authFetch = useAuthFetch();
  const [sitters, setSitters] = useState<Babysitter[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", mobileNumber: "", notes: "" });

  const fetchSitters = () => {
    authFetch("/api/babysitters")
      .then((r) => r.json())
      .then(setSitters)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSitters(); }, []);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      toast({ title: t("toasts.babysitters.name_required"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body: any = { name: form.name.trim() };
      if (form.mobileNumber.trim()) body.mobileNumber = form.mobileNumber.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();

      const res = await authFetch("/api/babysitters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      const newSitter = await res.json();
      setSitters((prev) => [...prev, newSitter]);
      setForm({ name: "", mobileNumber: "", notes: "" });
      setOpen(false);
      toast({ title: t("toasts.babysitters.added_title"), description: t("toasts.babysitters.added_body", { name: newSitter.name }) });
    } catch {
      toast({ title: t("toasts.babysitters.add_error_title"), description: t("toasts.babysitters.add_error_body"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      const res = await authFetch(`/api/babysitters/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setSitters((prev) => prev.filter((s) => s.id !== id));
      toast({ title: t("toasts.babysitters.removed_title"), description: t("toasts.babysitters.removed_body", { name }) });
    } catch {
      toast({ title: t("toasts.babysitters.remove_error_title"), description: t("toasts.babysitters.remove_error_body"), variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-quicksand text-3xl font-bold text-foreground flex items-center gap-2">
            <Baby className="h-8 w-8 text-primary" />
            Babysitters
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your babysitters and assign them to your children.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Babysitter
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-quicksand">Add Babysitter</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <Label>Full Name *</Label>
                <Input
                  placeholder="e.g. Aisha Malik"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Mobile Number</Label>
                <Input
                  placeholder="+92 300 1234567"
                  value={form.mobileNumber}
                  onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Any special instructions or notes..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={handleAdd}
                  disabled={saving}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {saving ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : sitters.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-2 border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Baby className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-foreground mb-1">No babysitters added yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add a babysitter and assign them to your child's profile. Amy AI will tailor routines for when they're on duty.
            </p>
            <Button onClick={() => setOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Babysitter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {sitters.map((sitter) => (
            <Card key={sitter.id} className="rounded-2xl shadow-sm border-border/50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="font-bold text-primary text-lg">
                      {sitter.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{sitter.name}</p>
                    {sitter.mobileNumber && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {sitter.mobileNumber}
                      </p>
                    )}
                    {sitter.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{sitter.notes}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0"
                  onClick={() => handleDelete(sitter.id, sitter.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {sitters.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          To assign a babysitter to a child, go to the child's profile and select their babysitter.
        </p>
      )}
    </div>
  );
}
