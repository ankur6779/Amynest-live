import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Wind } from "lucide-react";
import { submitWellbeingCheckin } from "@/lib/infant-care-api";
import { trackInfantHubEvent } from "@/lib/infant-hub-analytics";
import { Button } from "@/components/ui/button";

type ParentWellbeingProps = {
  childId: number;
};

export function ParentWellbeing({ childId }: ParentWellbeingProps) {
  const { t } = useTranslation();
  const [energy, setEnergy] = useState(3);
  const [stress, setStress] = useState(3);
  const [amyMessage, setAmyMessage] = useState<string | null>(null);
  const [breathing, setBreathing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleCheckin() {
    setBusy(true);
    try {
      const res = await submitWellbeingCheckin(childId, energy, stress);
      trackInfantHubEvent("wellbeing_checkin", { childId, energy, stress });
      setAmyMessage(res.amyMessage);
    } catch {
      setAmyMessage(t("components.wellbeing.error", "Could not save — try again later."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="parent-wellbeing" id="infant-wellbeing">
      <p className="text-sm text-muted-foreground">
        {t("components.wellbeing.lead", "You matter too. This is not medical advice — just gentle support.")}
      </p>

      <div className="space-y-3">
        <label className="block text-xs font-bold text-foreground">
          {t("components.wellbeing.energy", "Energy level")}: {energy}/5
        </label>
        <input type="range" min={1} max={5} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="w-full" />
        <label className="block text-xs font-bold text-foreground">
          {t("components.wellbeing.stress", "Stress level")}: {stress}/5
        </label>
        <input type="range" min={1} max={5} value={stress} onChange={(e) => setStress(Number(e.target.value))} className="w-full" />
      </div>

      <div className="flex gap-2">
        <Button type="button" disabled={busy} onClick={handleCheckin} className="flex-1 rounded-xl gap-2">
          <Heart className="h-4 w-4" />
          {t("components.wellbeing.checkin", "Check in")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setBreathing((b) => !b)}
          className="rounded-xl gap-2"
        >
          <Wind className="h-4 w-4" />
          {t("components.wellbeing.breathe", "Breathe")}
        </Button>
      </div>

      {breathing && (
        <div className="rounded-2xl border border-teal-400/30 bg-teal-500/10 p-4 text-center animate-pulse">
          <p className="text-sm font-semibold text-foreground">
            {t("components.wellbeing.breathing_copy", "Breathe in… 4… hold… 4… out… 6…")}
          </p>
        </div>
      )}

      {amyMessage && (
        <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4">
          <p className="text-sm text-foreground leading-relaxed">{amyMessage}</p>
        </div>
      )}
    </div>
  );
}
