import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseApiJson } from "@/lib/safe-json-response";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { GrowthOsAlertWorkflow } from "./gos-types";
import { ActionHistoryPanel } from "./action-history-panel";

const STATUS_STYLE: Record<GrowthOsAlertWorkflow["status"], string> = {
  open: "text-rose-400",
  acknowledged: "text-amber-400",
  resolved: "text-emerald-400",
  ignored: "text-muted-foreground",
};

export function AlertsWorkflowPanel({
  workflows,
  actionHistory,
}: {
  workflows: GrowthOsAlertWorkflow[];
  actionHistory: Array<{ at: string; userId: string; action: string; reason: string | null; outcome: string | null }>;
}) {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { id: string; status: GrowthOsAlertWorkflow["status"]; owner?: string }) => {
      const res = await authFetch(`/api/admin/growth/alerts/${input.id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status, owner: input.owner }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return parseApiJson(res);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["gos"] }),
  });

  if (workflows.length === 0) {
    return <p className="text-xs text-muted-foreground">No active alerts for this period.</p>;
  }

  return (
    <div className="space-y-4">
      {workflows.map((w) => (
        <article key={w.id} className="rounded-xl border border-white/10 p-4 space-y-2">
          <div className="flex justify-between gap-2 flex-wrap">
            <div>
              <span className="text-[10px] uppercase text-muted-foreground">{w.priority}</span>
              <h3 className="font-semibold text-sm">{w.title}</h3>
              <p className="text-xs text-muted-foreground">{w.description}</p>
            </div>
            <span className={cn("text-xs font-semibold capitalize", STATUS_STYLE[w.status])}>{w.status}</span>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="text-muted-foreground">Root Cause</p>
              <p className="mt-0.5">{w.rootCause ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Suggested Fix</p>
              <p className="mt-0.5">{w.suggestedFix ?? "—"}</p>
            </div>
            <div>
              <label className="text-muted-foreground">Owner</label>
              <Input
                defaultValue={w.owner ?? ""}
                placeholder="Assign owner"
                className="h-7 text-xs mt-0.5"
                onBlur={(e) => {
                  if (e.target.value !== (w.owner ?? "")) {
                    mutation.mutate({ id: w.id, status: w.status, owner: e.target.value || undefined });
                  }
                }}
              />
            </div>
          </div>

          <div className="flex gap-1 flex-wrap print:hidden">
            {(["acknowledged", "resolved", "ignored"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                className="h-7 text-[10px] capitalize"
                disabled={mutation.isPending || w.status === s}
                onClick={() => mutation.mutate({ id: w.id, status: s })}
              >
                {s}
              </Button>
            ))}
          </div>

          {w.history.length > 0 && (
            <details className="text-[10px] text-muted-foreground">
              <summary className="cursor-pointer">History ({w.history.length})</summary>
              <ul className="mt-1 space-y-1">
                {w.history.slice(0, 5).map((h, i) => (
                  <li key={i}>
                    {new Date(h.at).toLocaleString()} — {h.action}
                    {h.note ? `: ${h.note}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </article>
      ))}
      <ActionHistoryPanel title="Alert Action History" entries={actionHistory} />
    </div>
  );
}
