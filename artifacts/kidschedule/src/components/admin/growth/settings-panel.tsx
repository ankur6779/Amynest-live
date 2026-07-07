import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseApiJson } from "@/lib/safe-json-response";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { GrowthOsSettings } from "./gos-types";

export function SettingsPanel({ settings }: { settings: GrowthOsSettings }) {
  const authFetch = useAuthFetch();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (body: Partial<GrowthOsSettings>) => {
      const res = await authFetch("/api/admin/growth/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      return parseApiJson<{ settings: GrowthOsSettings }>(res);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["gos"] }),
  });

  const save = (patch: Partial<GrowthOsSettings>) => mutation.mutate(patch);

  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
      <div className="space-y-1">
        <Label className="text-xs">Crash Threshold %</Label>
        <Input
          type="number"
          defaultValue={settings.crashThresholdPct}
          className="h-8 text-xs"
          onBlur={(e) => save({ crashThresholdPct: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Growth Score Warning</Label>
        <Input
          type="number"
          defaultValue={settings.growthScoreWarning}
          className="h-8 text-xs"
          onBlur={(e) => save({ growthScoreWarning: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Retention D1 Target %</Label>
        <Input
          type="number"
          defaultValue={settings.retentionD1TargetPct}
          className="h-8 text-xs"
          onBlur={(e) => save({ retentionD1TargetPct: Number(e.target.value) })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Prediction Momentum Days</Label>
        <Input
          type="number"
          defaultValue={settings.predictionMomentumDays}
          className="h-8 text-xs"
          onBlur={(e) => save({ predictionMomentumDays: Number(e.target.value) })}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-white/10 p-3 sm:col-span-2">
        <div>
          <Label className="text-xs">Alert Rules Enabled</Label>
          <p className="text-[10px] text-muted-foreground">Trigger alerts from threshold breaches</p>
        </div>
        <Switch
          checked={settings.alertRulesEnabled}
          onCheckedChange={(v) => save({ alertRulesEnabled: v })}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-white/10 p-3 sm:col-span-2">
        <div>
          <Label className="text-xs">Future Automation</Label>
          <p className="text-[10px] text-muted-foreground">Auto-execute approved decisions (disabled)</p>
        </div>
        <Switch
          checked={settings.futureAutomationEnabled}
          onCheckedChange={(v) => save({ futureAutomationEnabled: v })}
        />
      </div>
      {mutation.isSuccess && (
        <p className="text-xs text-emerald-400 sm:col-span-2">Settings saved.</p>
      )}
      <Button
        variant="outline"
        size="sm"
        className="sm:col-span-2 w-fit"
        onClick={() => save(settings)}
        disabled={mutation.isPending}
      >
        Save All
      </Button>
    </div>
  );
}
