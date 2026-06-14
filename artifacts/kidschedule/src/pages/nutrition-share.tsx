import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { getApiUrl } from "@/lib/api";

interface SharePayload {
  foodStyle: string;
  children: Array<{
    childId: number;
    name: string;
    tonightMeal: string | null;
    dayLabel: string | null;
    mealPlanSlots: Array<{ slot: string; meal: string }>;
    familyPortionMeal: string | null;
  }>;
}

export default function NutritionSharePage() {
  const [, params] = useRoute("/nutrition/share/:token");
  const token = params?.token ?? "";
  const [data, setData] = useState<{
    readOnly: boolean;
    expiresAt: string;
    payload: SharePayload;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void fetch(getApiUrl(`/api/nutrition/share/${token}`))
      .then(async (res) => {
        if (!res.ok) {
          setError(res.status === 410 ? "expired" : "not_found");
          return;
        }
        const json = (await res.json()) as {
          readOnly: boolean;
          expiresAt: string;
          payload: SharePayload;
        };
        setData(json);
      })
      .catch(() => setError("not_found"));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <p className="text-muted-foreground">
          {error === "expired" ? "This share link has expired." : "Share link not found."}
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 max-w-2xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">AmyNest Nutrition — read only</p>
        <h1 className="text-2xl font-bold">Household meal plan</h1>
        <p className="text-sm text-muted-foreground">Valid until {new Date(data.expiresAt).toLocaleString()}</p>
      </header>

      {data.payload.children.map((child) => (
        <section key={child.childId} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-lg">{child.name}</h2>
          {child.dayLabel && <p className="text-xs text-muted-foreground">{child.dayLabel}</p>}
          {child.tonightMeal && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Tonight&apos;s meal</p>
              <p className="text-base font-medium">{child.tonightMeal}</p>
            </div>
          )}
          {child.familyPortionMeal && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Family portions</p>
              <p className="text-sm">{child.familyPortionMeal}</p>
            </div>
          )}
          {child.mealPlanSlots.length > 0 && (
            <ul className="space-y-1 text-sm">
              {child.mealPlanSlots.map((s) => (
                <li key={s.slot}>
                  <span className="capitalize text-muted-foreground">{s.slot}: </span>
                  {s.meal}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
