import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { parseApiJson } from "@/lib/safe-json-response";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GrowthOsExperiment } from "./gos-types";
import { ActionHistoryPanel } from "./action-history-panel";

const STATUS_STYLE: Record<GrowthOsExperiment["status"], string> = {
  running: "text-emerald-400",
  completed: "text-violet-400",
  paused: "text-amber-400",
  cancelled: "text-muted-foreground",
};

export function ExperimentCenterPanel({
  experiments,
  actionHistory,
}: {
  experiments: GrowthOsExperiment[];
  actionHistory: Array<{ at: string; userId: string; action: string; reason: string | null; outcome: string | null }>;
}) {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    feature: "",
    startDate: new Date().toISOString().slice(0, 10),
    variantA: "Control",
    variantB: "Variant",
    status: "running" as GrowthOsExperiment["status"],
  });

  const mutation = useMutation({
    mutationFn: async (body: typeof form) => {
      const res = await authFetch("/api/admin/growth/experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, usersA: 0, usersB: 0 }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return parseApiJson(res);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gos"] });
      setShowForm(false);
      setForm({ name: "", feature: "", startDate: new Date().toISOString().slice(0, 10), variantA: "Control", variantB: "Variant", status: "running" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <p className="text-xs text-muted-foreground">
          Experiment architecture ready for future A/B assignment.
        </p>
        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-3 w-3" />
          New Experiment
        </Button>
      </div>

      {showForm && (
        <form
          className="grid sm:grid-cols-2 gap-2 rounded-xl border border-white/10 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" required />
          <Input placeholder="Feature" value={form.feature} onChange={(e) => setForm({ ...form, feature: e.target.value })} className="h-8 text-xs" required />
          <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Variant A" value={form.variantA} onChange={(e) => setForm({ ...form, variantA: e.target.value })} className="h-8 text-xs" />
          <Input placeholder="Variant B" value={form.variantB} onChange={(e) => setForm({ ...form, variantB: e.target.value })} className="h-8 text-xs" />
          <Button type="submit" size="sm" disabled={mutation.isPending} className="h-8 text-xs">
            Save Experiment
          </Button>
        </form>
      )}

      {experiments.length === 0 ? (
        <p className="text-xs text-muted-foreground">No experiments registered yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground text-left">
                <th className="p-2 font-medium">Name</th>
                <th className="p-2 font-medium">Feature</th>
                <th className="p-2 font-medium">Variants</th>
                <th className="p-2 font-medium">Users</th>
                <th className="p-2 font-medium">Winner</th>
                <th className="p-2 font-medium">Confidence</th>
                <th className="p-2 font-medium">Impact</th>
                <th className="p-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {experiments.map((exp) => (
                <tr key={exp.id} className="border-b border-white/5">
                  <td className="p-2 font-medium">{exp.name}</td>
                  <td className="p-2">{exp.feature}</td>
                  <td className="p-2">{exp.variantA} vs {exp.variantB}</td>
                  <td className="p-2">{exp.usersA} / {exp.usersB}</td>
                  <td className="p-2">{exp.winner ?? "—"}</td>
                  <td className="p-2">{exp.confidence != null ? `${exp.confidence}%` : "—"}</td>
                  <td className="p-2">{exp.businessImpact ?? "—"}</td>
                  <td className={cn("p-2 font-semibold capitalize", STATUS_STYLE[exp.status])}>{exp.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ActionHistoryPanel title="Experiment Action History" entries={actionHistory} />
    </div>
  );
}
