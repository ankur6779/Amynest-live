import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Play, X } from "lucide-react";
import { parseApiJson } from "@/lib/safe-json-response";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GrowthOsDecision } from "./gos-types";
import { ActionHistoryPanel } from "./action-history-panel";

const STATUS_STYLES: Record<GrowthOsDecision["status"], string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  executed: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

const PRIORITY_COLORS: Record<GrowthOsDecision["priority"], string> = {
  critical: "text-rose-400",
  high: "text-orange-400",
  medium: "text-amber-400",
  low: "text-muted-foreground",
};

export function DecisionCenterPanel({
  decisions,
  actionHistory,
}: {
  decisions: GrowthOsDecision[];
  actionHistory: Array<{
    id: string;
    at: string;
    userId: string;
    action: string;
    reason: string | null;
    outcome: string | null;
  }>;
}) {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (input: { id: string; status: GrowthOsDecision["status"] }) => {
      const res = await authFetch(`/api/admin/growth/decisions/${input.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: input.status }),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return parseApiJson<{ decision: GrowthOsDecision }>(res);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gos"] });
    },
  });

  if (decisions.length === 0) {
    return <p className="text-xs text-muted-foreground">No decisions for this period.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {decisions.map((d) => (
          <article
            key={d.id}
            className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-[10px] font-bold uppercase", PRIORITY_COLORS[d.priority])}>
                    {d.priority}
                  </span>
                  <span className={cn("text-[10px] rounded-full px-2 py-0.5 border", STATUS_STYLES[d.status])}>
                    {d.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{d.category}</span>
                </div>
                <h3 className="font-semibold text-sm mt-1">{d.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
              </div>
              <div className="text-right text-[11px] shrink-0">
                <p className="text-emerald-400 font-bold">Impact {d.estimatedImpact}</p>
                <p className="text-muted-foreground">Confidence {d.confidence}%</p>
              </div>
            </div>

            <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
              <div>
                <dt className="text-muted-foreground">Reason</dt>
                <dd>{d.reason}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Affected Users</dt>
                <dd>{d.affectedUsers > 0 ? d.affectedUsers.toLocaleString() : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expected Revenue</dt>
                <dd>{d.expectedRevenueImpact != null ? `₹${d.expectedRevenueImpact}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Suggested Action</dt>
                <dd>{d.suggestedAction}</dd>
              </div>
            </dl>

            {d.status === "pending" && (
              <div className="flex gap-2 flex-wrap print:hidden">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-7 text-xs"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: d.id, status: "approved" })}
                >
                  <Check className="h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 h-7 text-xs"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ id: d.id, status: "rejected" })}
                >
                  <X className="h-3 w-3" />
                  Reject
                </Button>
              </div>
            )}
            {d.status === "approved" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 h-7 text-xs print:hidden"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: d.id, status: "executed" })}
              >
                <Play className="h-3 w-3" />
                Mark Executed
              </Button>
            )}
          </article>
        ))}
      </div>
      <ActionHistoryPanel title="Decision Action History" entries={actionHistory} />
    </div>
  );
}
