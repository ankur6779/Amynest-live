import { useMemo, useState } from "react";
import { ThumbsUp, RefreshCw, Sparkles } from "lucide-react";
import { PARENTING_TIPS, CATEGORY_META, type TipCategory, type TipEntry } from "@/lib/parenting-tips-data";
import type { AgeGroup } from "@/lib/age-groups";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { SubItemGate } from "@/components/sub-item-gate";
import { useTranslation } from "react-i18next";
const CATEGORIES: TipCategory[] = ["tip", "health", "activity", "guidance"];
const AI_DAILY_LIMIT = 2;
function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) as T : fallback;
  } catch {
    return fallback;
  }
}
function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i) | 0;
  return Math.abs(h);
}
function pickTip(pool: TipEntry[], ageGroup: AgeGroup, category: TipCategory, salt: number): TipEntry {
  if (pool.length === 0) return {
    id: "fallback",
    en: "Spend a quiet moment together."
  };
  const shownKey = `amynest_tips_shown_${ageGroup}_${category}`;
  let shown = lsGet<string[]>(shownKey, []);
  let avail = pool.filter(t => !shown.includes(t.id));
  if (avail.length === 0) {
    shown = [];
    avail = pool;
    lsSet(shownKey, shown);
  }
  const seed = hashStr(`${todayKey()}_${ageGroup}_${category}_${salt}`);
  return avail[seed % avail.length];
}
function markShown(ageGroup: AgeGroup, category: TipCategory, id: string) {
  const key = `amynest_tips_shown_${ageGroup}_${category}`;
  const shown = lsGet<string[]>(key, []);
  if (!shown.includes(id)) {
    shown.push(id);
    lsSet(key, shown);
  }
}
function getAICount(): number {
  return lsGet<number>(`amynest_tip_ai_${todayKey()}`, 0);
}
function bumpAICount() {
  lsSet(`amynest_tip_ai_${todayKey()}`, getAICount() + 1);
}
export function DailyTips({
  ageGroup,
  childName
}: {
  ageGroup: AgeGroup;
  childName: string;
}) {
  const {
    t
  } = useTranslation();
  const lang = "en" as const;
  const [salts, setSalts] = useState<Record<TipCategory, number>>({
    tip: 0,
    health: 0,
    activity: 0,
    guidance: 0
  });
  const [helpful, setHelpful] = useState<Record<string, boolean>>(() => lsGet<Record<string, boolean>>(`amynest_tips_helpful_${todayKey()}`, {}));
  const [aiCache, setAiCache] = useState<Record<string, string>>(() => lsGet<Record<string, string>>(`amynest_tip_ai_cache_${todayKey()}_en`, {}));
  const [aiUsed, setAiUsed] = useState<number>(getAICount());
  const [busyId, setBusyId] = useState<string | null>(null);
  const authFetch = useAuthFetch();
  const tips = useMemo(() => {
    const out: Record<TipCategory, TipEntry> = {} as any;
    for (const c of CATEGORIES) {
      const pool = PARENTING_TIPS[ageGroup]?.[c] ?? [];
      out[c] = pickTip(pool, ageGroup, c, salts[c]);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ageGroup, salts.tip, salts.health, salts.activity, salts.guidance]);
  const handleNext = (cat: TipCategory) => {
    markShown(ageGroup, cat, tips[cat].id);
    setSalts(s => ({
      ...s,
      [cat]: s[cat] + 1
    }));
  };
  const handleHelpful = (tipId: string) => {
    const next = {
      ...helpful,
      [tipId]: !helpful[tipId]
    };
    setHelpful(next);
    lsSet(`amynest_tips_helpful_${todayKey()}`, next);
  };
  const handlePersonalize = async (cat: TipCategory) => {
    const tip = tips[cat];
    const cacheKey = `${tip.id}_${lang}`;
    if (aiCache[cacheKey]) return; // already done
    if (aiUsed >= AI_DAILY_LIMIT) return;
    setBusyId(tip.id);
    try {
      const {
        default: i18nInstance
      } = await import("@/i18n");
      const res = await authFetch(getApiUrl("/api/ai/rewrite-tip"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: tip.en,
          childName,
          language: lang
        })
      });
      if (!res.ok) throw new Error("rewrite failed");
      const { readResolvedApiJson } = await import("@/lib/poll-result");
      const json = await readResolvedApiJson<{ rewritten?: string }>(res, authFetch);
      const rewritten = (json?.rewritten ?? "").trim();
      if (rewritten) {
        const next = {
          ...aiCache,
          [cacheKey]: rewritten
        };
        setAiCache(next);
        lsSet(`amynest_tip_ai_cache_${todayKey()}_en`, next);
        bumpAICount();
        setAiUsed(getAICount());
      }
    } catch {
      // silent fallback — keep predefined tip visible
    } finally {
      setBusyId(null);
    }
  };
  const ui = {
    title: "Today's Parenting Cards",
    subtitle: `Personalised for ${childName}`,
    helpful: "Helpful",
    next: "Next Tip",
    personalize: "Personalize",
    aiLeft: (n: number) => `Amy AI left: ${n}`,
  };
  return <section className="space-y-3">
      {/* Header */}
      <div className="flex items-end justify-between gap-2 px-1">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {ui.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{ui.subtitle}</p>
        </div>
      </div>

      {/* Cards grid — 1 col on mobile, 2 on tablet+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATEGORIES.map(cat => {
        const meta = CATEGORY_META[cat];
        const tip = tips[cat];
        const cacheKey = `${tip.id}_${lang}`;
        const text = aiCache[cacheKey] ?? tip.en;
        const isPersonalized = Boolean(aiCache[cacheKey]);
        const liked = Boolean(helpful[tip.id]);
        const isBusy = busyId === tip.id;
        const canPersonalize = !isPersonalized && aiUsed < AI_DAILY_LIMIT && !isBusy;
        return <SubItemGate key={cat} sectionId="hub_tips" subItemId={cat}>
            <div className={`relative rounded-3xl border-2 border-border bg-gradient-to-br ${meta.gradient} p-4 shadow-sm transition-all hover:shadow-md ${isPersonalized ? `ring-2 ${meta.ring}` : ""}`}>
              {/* Top row: emoji + label */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{meta.emoji}</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-foreground/70">
                    {meta.label[lang]}
                  </span>
                </div>
                {isPersonalized && <span className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-card px-2 py-0.5 text-[10px] font-bold text-primary dark:text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    {t("components.daily_tips.amy_ai")}
                  </span>}
              </div>

              {/* Tip text */}
              <p className="text-sm font-medium text-foreground leading-relaxed min-h-[60px]" style={{
              wordBreak: "break-word",
              whiteSpace: "normal"
            }}>
                {text}
              </p>

              {/* Action row */}
              <div className="mt-3 flex items-center justify-between gap-2">
                <button onClick={() => handleHelpful(tip.id)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${liked ? "bg-primary text-white shadow-sm" : "bg-white/70 dark:bg-white/10 text-foreground hover:bg-white dark:hover:bg-white/15"}`} aria-pressed={liked}>
                  <ThumbsUp className="h-3.5 w-3.5" />
                  {liked ? `${ui.helpful} ✓` : ui.helpful}
                </button>

                <div className="flex items-center gap-1.5">
                  {canPersonalize && <button onClick={() => handlePersonalize(cat)} className="inline-flex items-center gap-1 rounded-full bg-white/80 dark:bg-card px-2.5 py-1.5 text-[11px] font-bold text-primary dark:text-muted-foreground hover:bg-white dark:hover:bg-card transition-colors" title={ui.personalize}>
                      <Sparkles className="h-3.5 w-3.5" />
                      {ui.personalize}
                    </button>}
                  <button onClick={() => handleNext(cat)} className="inline-flex items-center gap-1 rounded-full bg-white/70 dark:bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-white dark:hover:bg-white/15 transition-colors" title={ui.next}>
                    <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? "animate-spin" : ""}`} />
                    {ui.next}
                  </button>
                </div>
              </div>
            </div>
            </SubItemGate>;
      })}
      </div>

      {/* AI usage indicator (subtle) */}
      <div className="text-[10px] text-muted-foreground text-right px-1">
        {ui.aiLeft(Math.max(0, AI_DAILY_LIMIT - aiUsed))}
      </div>
    </section>;
}