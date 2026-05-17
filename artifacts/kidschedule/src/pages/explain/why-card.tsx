import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ExplanationResponse } from "@workspace/api-zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  HelpCircle, ChevronDown, ChevronRight, Sparkles,
  Moon, Zap, CloudRain, User, Star, BookOpen,
  CheckCircle, Layers, Calendar, AlertTriangle, Cpu, TrendingDown,
  ShieldAlert, MapPin, Package, Clock, Leaf,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  moon: <Moon className="h-3.5 w-3.5" />,
  clock: <Clock className="h-3.5 w-3.5" />,
  smile: <Star className="h-3.5 w-3.5" />,
  zap: <Zap className="h-3.5 w-3.5" />,
  "cloud-rain": <CloudRain className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  "book-open": <BookOpen className="h-3.5 w-3.5" />,
  "check-circle": <CheckCircle className="h-3.5 w-3.5" />,
  star: <Star className="h-3.5 w-3.5" />,
  "trending-down": <TrendingDown className="h-3.5 w-3.5" />,
  layers: <Layers className="h-3.5 w-3.5" />,
  calendar: <Calendar className="h-3.5 w-3.5" />,
  "alert-triangle": <AlertTriangle className="h-3.5 w-3.5" />,
  shield: <ShieldAlert className="h-3.5 w-3.5" />,
  "map-pin": <MapPin className="h-3.5 w-3.5" />,
  package: <Package className="h-3.5 w-3.5" />,
  cpu: <Cpu className="h-3.5 w-3.5" />,
  leaf: <Leaf className="h-3.5 w-3.5" />,
};

function FactorIcon({ icon }: { icon?: string }) {
  if (!icon) return <HelpCircle className="h-3.5 w-3.5" />;
  return <>{iconMap[icon] ?? <HelpCircle className="h-3.5 w-3.5" />}</>;
}

function influenceClass(inf: string) {
  if (inf === "positive") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200";
  if (inf === "negative") return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
}

function ConfidenceBar({ value, tier }: { value: number; tier: string }) {
  const { t } = useTranslation();
  const color =
    tier === "high" ? "bg-emerald-500" : tier === "medium" ? "bg-amber-400" : "bg-slate-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{t("explain.confidence")}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function WhyCard({
  data,
  loading,
  defaultOpen = false,
}: {
  data?: ExplanationResponse;
  loading?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20">
        <CardContent className="pt-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-t-lg transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />
                <div>
                  <CardTitle className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                    {t("explain.technical_details")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{data.summary}</p>
                </div>
              </div>
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <ConfidenceBar value={data.confidence.value} tier={data.confidence.tier} />
            <p className="text-xs text-muted-foreground">{data.confidence.rationale}</p>

            {data.factors.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">{t("explain.factors_heading")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.factors.map((f, i) => (
                    <span
                      key={i}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${influenceClass(f.influence)}`}
                      title={f.detail}
                    >
                      <FactorIcon icon={f.icon ?? undefined} />
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.trace.steps.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">{t("explain.trace_heading")}</p>
                <ol className="space-y-2">
                  {data.trace.steps.map((step) => (
                    <li key={step.order} className="flex gap-3 text-xs">
                      <span className="flex-none w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center font-semibold text-[10px]">
                        {step.order}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{step.title}</p>
                        <p className="text-muted-foreground">{step.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {data.aiNarrative && (
              <div className="rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-3 border border-violet-100 dark:border-violet-800">
                <p className="text-xs text-muted-foreground italic">{data.aiNarrative}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
