/**
 * ProductiveNudgesCard — Phase 4 of the Adaptive Family Intelligence Engine.
 *
 * Surfaces ranked nudges synthesized from Phase 2 risk windows + Phase 3
 * learning weights + weekly goal deltas. Hidden when the API returns no
 * nudges. Mirrors the mobile component at
 * `components/intelligence/ProductiveNudgesCard.tsx`.
 */

import { useTranslation } from "react-i18next";
import {
  useGetChildNudges,
  getGetChildNudgesQueryKey,
  useListChildren,
  getListChildrenQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  Flame,
  Target,
} from "lucide-react";
import type { ComponentType } from "react";

const MAX_VISIBLE = 3;

type NudgeKind =
  | "risk_window"
  | "goal_slipping"
  | "demote"
  | "weak_slot"
  | "boost"
  | "streak"
  | "goal_up";

const KIND_ICON: Record<NudgeKind, ComponentType<{ className?: string }>> = {
  risk_window: AlertTriangle,
  goal_slipping: TrendingDown,
  demote: TrendingDown,
  weak_slot: Clock,
  boost: TrendingUp,
  streak: Flame,
  goal_up: Target,
};

const KIND_TONE: Record<NudgeKind, { chip: string; icon: string }> = {
  risk_window: { chip: "bg-destructive/10 text-destructive border-destructive/20", icon: "text-destructive" },
  goal_slipping: { chip: "bg-destructive/10 text-destructive border-destructive/20", icon: "text-destructive" },
  demote: { chip: "bg-secondary text-secondary-foreground border-border", icon: "text-secondary-foreground" },
  weak_slot: { chip: "bg-secondary text-secondary-foreground border-border", icon: "text-secondary-foreground" },
  boost: { chip: "bg-primary/10 text-primary border-primary/20", icon: "text-primary" },
  streak: { chip: "bg-primary/10 text-primary border-primary/20", icon: "text-primary" },
  goal_up: { chip: "bg-primary/10 text-primary border-primary/20", icon: "text-primary" },
};

type Nudge = {
  id: string;
  kind: NudgeKind;
  priority: number;
  suggestionCode: string;
  category?: string | null;
  hour?: number | null;
  goal?: string | null;
  value?: number | null;
};

export function ProductiveNudgesCard({ childId }: { childId?: number } = {}) {
  const { t } = useTranslation();

  const { data: children } = useListChildren({
    query: { queryKey: getListChildrenQueryKey(), enabled: childId === undefined },
  });
  const list = (children ?? []) as Array<{ id: number; name: string }>;
  const activeId = childId ?? list[0]?.id ?? 0;

  const { data, isLoading } = useGetChildNudges(activeId, {
    query: {
      enabled: activeId > 0,
      queryKey: getGetChildNudgesQueryKey(activeId),
    },
  });

  if (activeId <= 0) return null;

  const nudges = ((data?.nudges ?? []) as Nudge[]).slice(0, MAX_VISIBLE);
  if (!isLoading && nudges.length === 0) return null;

  return (
    <Card className="rounded-3xl border-none shadow-sm bg-card">
      <CardContent className="p-5 sm:p-6 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-quicksand text-base font-bold text-foreground">
            {t("intelligence.nudges.title")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("intelligence.nudges.subtitle")}
        </p>

        <ul className="flex flex-col gap-2.5">
          {nudges.map((n) => {
            const Icon = KIND_ICON[n.kind];
            const tone = KIND_TONE[n.kind];
            const params = {
              hour: n.hour != null ? String(n.hour).padStart(2, "0") : "",
              category: n.category ?? "",
              goal: n.goal ?? "",
              value: n.value ?? 0,
            };
            const body = t(
              [
                `intelligence.nudges.suggestion.${n.suggestionCode}`,
                `intelligence.nudges.fallback.${n.kind}`,
              ],
              params,
            );
            return (
              <li
                key={n.id}
                className="flex gap-3 items-start p-3 rounded-2xl border border-border/60 bg-background/60"
              >
                <span
                  className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border ${tone.chip}`}
                >
                  <Icon className={`h-4 w-4 ${tone.icon}`} />
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full self-start border ${tone.chip}`}
                  >
                    {t(`intelligence.nudges.kind.${n.kind}`)}
                  </span>
                  <p className="text-sm text-foreground leading-snug">{body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
