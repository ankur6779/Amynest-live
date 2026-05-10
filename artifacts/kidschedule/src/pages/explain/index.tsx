// ─────────────────────────────────────────────────────────────────────────────
// Module 3 — Explainability Engine — Web Page
//
// Route: /explain
// Surfaces the "Why did AmyNest recommend this?" interface:
//  • Context input form (mood, sleep, weather, caregiver…)
//  • Decision-factor chips with influence colour
//  • Animated confidence bar
//  • Ordered reasoning trace
//  • AI Explanation Timeline (audit history)
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useExplainRoutine, useGetExplainHistory } from "@workspace/api-client-react";
import type { ExplanationResponse, ExplanationAuditEntry } from "@workspace/api-zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  HelpCircle, ChevronDown, ChevronRight, Sparkles,
  Moon, Zap, CloudRain, User, Star, BookOpen,
  CheckCircle, Layers, Calendar, AlertTriangle, Cpu, TrendingDown,
  ShieldAlert, MapPin, Package, Clock, Leaf,
} from "lucide-react";

// ── Icon map ─────────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ReactNode> = {
  moon:          <Moon className="h-3.5 w-3.5" />,
  clock:         <Clock className="h-3.5 w-3.5" />,
  smile:         <Star className="h-3.5 w-3.5" />,
  zap:           <Zap className="h-3.5 w-3.5" />,
  "cloud-rain":  <CloudRain className="h-3.5 w-3.5" />,
  user:          <User className="h-3.5 w-3.5" />,
  "book-open":   <BookOpen className="h-3.5 w-3.5" />,
  "check-circle":<CheckCircle className="h-3.5 w-3.5" />,
  star:          <Star className="h-3.5 w-3.5" />,
  "trending-down":<TrendingDown className="h-3.5 w-3.5" />,
  layers:        <Layers className="h-3.5 w-3.5" />,
  calendar:      <Calendar className="h-3.5 w-3.5" />,
  "alert-triangle":<AlertTriangle className="h-3.5 w-3.5" />,
  shield:        <ShieldAlert className="h-3.5 w-3.5" />,
  "map-pin":     <MapPin className="h-3.5 w-3.5" />,
  package:       <Package className="h-3.5 w-3.5" />,
  cpu:           <Cpu className="h-3.5 w-3.5" />,
  leaf:          <Leaf className="h-3.5 w-3.5" />,
};

function FactorIcon({ icon }: { icon?: string }) {
  if (!icon) return <HelpCircle className="h-3.5 w-3.5" />;
  return <>{iconMap[icon] ?? <HelpCircle className="h-3.5 w-3.5" />}</>;
}

// ── Influence badge colour ────────────────────────────────────────────────────

function influenceClass(inf: string) {
  // audit-ok: semantic influence colours — positive=emerald, negative=rose, neutral=slate
  if (inf === "positive") return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200";
  if (inf === "negative") return "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-200"; // audit-ok: influence-negative rose
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"; // audit-ok: influence-neutral slate
}

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfidenceBar({ value, tier }: { value: number; tier: string }) {
  const { t } = useTranslation();
  // audit-ok: semantic confidence tier colours — high=emerald, medium=amber, low=slate
  const color =
    tier === "high"   ? "bg-emerald-500" : // audit-ok: confidence-high emerald
    tier === "medium" ? "bg-amber-400"   : "bg-slate-400"; // audit-ok: confidence-medium amber, low slate
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

// ── WhyCard — reusable embedded card ─────────────────────────────────────────

export function WhyCard({ data, loading }: { data?: ExplanationResponse; loading?: boolean }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20">{/* audit-ok: brand violet card border/bg */}
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
      {/* audit-ok: brand violet card border/bg/hover */}
      <Card className="border border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-t-lg transition-colors">{/* audit-ok: brand violet hover */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />{/* audit-ok: brand violet icon */}
                <div>
                  <CardTitle className="text-sm font-semibold text-violet-700 dark:text-violet-300">{/* audit-ok: brand violet title */}
                    {t("explain.why_title")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {data.summary}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-xs ${influenceClass(data.confidence.tier === "high" ? "positive" : data.confidence.tier === "low" ? "negative" : "neutral")}`}>
                  {data.confidence.tier}
                </Badge>
                {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Confidence bar */}
            <ConfidenceBar value={data.confidence.value} tier={data.confidence.tier} />
            <p className="text-xs text-muted-foreground">{data.confidence.rationale}</p>

            {/* Factor chips */}
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

            {/* Reasoning trace */}
            {data.trace.steps.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">{t("explain.trace_heading")}</p>
                <ol className="space-y-2">
                  {data.trace.steps.map((step) => (
                    <li key={step.order} className="flex gap-3 text-xs">
                      {/* audit-ok: brand violet trace step number */}
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

            {/* AI narrative */}
            {data.aiNarrative && (
              <div className="rounded-lg bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-950/30 dark:to-fuchsia-950/30 p-3 border border-violet-100 dark:border-violet-800">{/* audit-ok: brand violet/fuchsia AI narrative gradient */}
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />{/* audit-ok: brand violet icon */}
                  <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">{/* audit-ok: brand violet label */}{t("explain.ai_says")}</p>
                </div>
                <p className="text-xs text-muted-foreground italic">{data.aiNarrative}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ── Context builder form ──────────────────────────────────────────────────────

interface ContextForm {
  mood: string;
  sleepQuality: string;
  energyLevel: string;
  weatherOutdoor: string;
  caregiver: string;
  withNarrative: boolean;
}

function defaultForm(): ContextForm {
  return {
    mood: "",
    sleepQuality: "",
    energyLevel: "",
    weatherOutdoor: "",
    caregiver: "",
    withNarrative: false,
  };
}

// ── Audit entry row ───────────────────────────────────────────────────────────

function AuditRow({ entry }: { entry: ExplanationAuditEntry }) {
  const tierColor =
    // audit-ok: semantic confidence tier text colours — high=emerald, medium=amber, low=slate
    entry.confidenceTier === "high"   ? "text-emerald-600" :
    entry.confidenceTier === "medium" ? "text-amber-500"   : "text-slate-500"; // audit-ok: confidence-medium amber, low slate

  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0 text-sm">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground line-clamp-2">{entry.summary}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{entry.recommendationType}</Badge>
          <span className="text-[10px] text-muted-foreground">{new Date(entry.generatedAt).toLocaleTimeString()}</span>
        </div>
      </div>
      <span className={`text-xs font-semibold shrink-0 ${tierColor}`}>
        {entry.confidenceValue}%
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExplainPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<ContextForm>(defaultForm());
  const [result, setResult] = useState<ExplanationResponse | undefined>();

  const explainMutation = useExplainRoutine();
  const historyQuery = useGetExplainHistory({ limit: 20 });

  const handleExplain = () => {
    const context: Record<string, unknown> = {};
    if (form.mood)          context["mood"]           = form.mood;
    if (form.sleepQuality)  context["sleepQuality"]   = form.sleepQuality;
    if (form.energyLevel)   context["energyLevel"]    = form.energyLevel;
    if (form.weatherOutdoor) context["weatherOutdoor"] = form.weatherOutdoor;
    if (form.caregiver)     context["caregiver"]      = form.caregiver;

    explainMutation.mutate(
      { data: { context, sourceEngine: "hybrid", withNarrative: form.withNarrative } },
      {
        onSuccess: (data) => {
          setResult(data as ExplanationResponse);
          historyQuery.refetch();
        },
      },
    );
  };

  const set = (key: keyof ContextForm) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-violet-500" />{/* audit-ok: brand violet header icon */}
          {t("explain.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("explain.subtitle")}</p>
      </div>

      {/* Context Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("explain.context_heading")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("explain.field_mood")}</label>
              <Select onValueChange={set("mood")} value={form.mood}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  {["happy", "excited", "tired", "grumpy", "sad", "sick"].map((m) => (
                    <SelectItem key={m} value={m} className="text-xs capitalize">{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("explain.field_sleep")}</label>
              <Select onValueChange={set("sleepQuality")} value={form.sleepQuality}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  {["good", "average", "poor"].map((s) => (
                    <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("explain.field_energy")}</label>
              <Select onValueChange={set("energyLevel")} value={form.energyLevel}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  {["high", "medium", "low"].map((e) => (
                    <SelectItem key={e} value={e} className="text-xs capitalize">{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("explain.field_weather")}</label>
              <Select onValueChange={set("weatherOutdoor")} value={form.weatherOutdoor}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes" className="text-xs">{t("explain.outdoor_yes")}</SelectItem>
                  <SelectItem value="limited" className="text-xs">{t("explain.outdoor_limited")}</SelectItem>
                  <SelectItem value="no" className="text-xs">{t("explain.outdoor_no")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{t("explain.field_caregiver")}</label>
              <Select onValueChange={set("caregiver")} value={form.caregiver}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t("common.select")} />
                </SelectTrigger>
                <SelectContent>
                  {["mom", "dad", "grandparent", "babysitter", "nanny"].map((c) => (
                    <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="rounded"
                checked={form.withNarrative}
                onChange={(e) => setForm((f) => ({ ...f, withNarrative: e.target.checked }))}
              />
              {t("explain.with_narrative")}
              <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 text-violet-600 border-violet-300">{/* audit-ok: brand violet AI badge */}AI</Badge>
            </label>
          </div>

          <Button
            onClick={handleExplain}
            disabled={explainMutation.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white" // audit-ok: brand violet CTA button
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {explainMutation.isPending ? t("common.loading") : t("explain.generate_btn")}
          </Button>
        </CardContent>
      </Card>

      {/* Explanation result */}
      {explainMutation.isPending && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </CardContent>
        </Card>
      )}
      {result && <WhyCard data={result} />}

      {/* AI Explanation Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-violet-500" />{/* audit-ok: brand violet icon */}
            {t("explain.history_heading")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !historyQuery.data || historyQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("explain.no_history")}</p>
          ) : (
            <div>
              {(historyQuery.data as ExplanationAuditEntry[]).map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
