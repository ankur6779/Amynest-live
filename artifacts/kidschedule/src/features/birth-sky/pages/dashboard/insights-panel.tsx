/**
 * Premium storybook chapters — luxury keepsake pacing, pull quotes, airy typography.
 */

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildDeepInsightSections,
  DEEP_INSIGHTS_CONTENT_VERSION,
  type InsightSectionId,
} from "../../constants/deep-insights-content";
import { AMY_ASTRO_DISCLAIMER } from "../../lib/branding";
import "../../design/amy-astro.css";

type Props = {
  childName: string;
  sunSign: string;
  moonSign: string;
  risingSign: string | null;
  moonPhaseLabel: string;
  daySky: boolean;
  reducedMotion?: boolean;
  onChapterOpen?: (chapterId: InsightSectionId) => void;
  /** Open a specific chapter when discovery guidance requests it. */
  focusChapterId?: string | null;
};

const CHAPTER_MARK: Record<string, string> = {
  personality: "01",
  strengths: "02",
  emotional: "03",
  learning: "04",
  parenting: "05",
  life_themes: "06",
  communication: "07",
  creativity: "08",
  relationships: "09",
};

const PRIORITY: InsightSectionId[] = [
  "personality",
  "strengths",
  "learning",
  "emotional",
  "parenting",
  "hidden_talents",
  "communication",
  "creativity",
  "life_themes",
];

function pullQuoteFrom(body: string): string {
  const first = body.split("\n\n")[0]?.trim() ?? "";
  const sentence = first.split(/(?<=[.!?])\s+/)[0] ?? first;
  return sentence.length > 160 ? `${sentence.slice(0, 157)}…` : sentence;
}

export function AmyAstroInsightsPanel({
  childName,
  sunSign,
  moonSign,
  risingSign,
  moonPhaseLabel,
  daySky,
  reducedMotion = false,
  onChapterOpen,
  focusChapterId,
}: Props) {
  const sections = useMemo(
    () =>
      buildDeepInsightSections({
        childName,
        sunSign,
        moonSign,
        risingSign,
        moonPhaseLabel,
        daySky,
      }),
    [childName, sunSign, moonSign, risingSign, moonPhaseLabel, daySky],
  );

  const ordered = useMemo(() => {
    const rank = new Map(PRIORITY.map((id, i) => [id, i]));
    return [...sections].sort(
      (a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99),
    );
  }, [sections]);

  const [openId, setOpenId] = useState<InsightSectionId | null>("personality");

  useEffect(() => {
    if (!focusChapterId) return;
    const match = ordered.find((s) => s.id === focusChapterId);
    if (match) setOpenId(match.id);
  }, [focusChapterId, ordered]);

  return (
    <section
      className="space-y-4"
      data-testid="amy-astro-insights-panel"
      data-content-version={DEEP_INSIGHTS_CONTENT_VERSION}
    >
      <header className="amy-astro-enter px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(42_60%_70%/0.75)]">
          Premium storybook
        </p>
        <h3 className="amy-astro-display mt-1 text-2xl text-[hsl(42_70%_78%)]">
          Chapters of {childName}
        </h3>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-[hsl(40_20%_96%/0.55)]">
          A keepsake of noticing — spacious pages, never a dense report.{" "}
          {AMY_ASTRO_DISCLAIMER}
        </p>
      </header>

      <div className="space-y-3">
        {ordered.map((section, idx) => {
          const open = openId === section.id;
          const quote = pullQuoteFrom(section.body);
          const paras = section.body.split("\n\n");
          return (
            <article
              key={section.id}
              className={cn(
                "amy-astro-storybook overflow-hidden rounded-[1.5rem]",
                !reducedMotion && "amy-astro-enter",
                !reducedMotion && idx === 1 && "amy-astro-enter-delay-1",
                !reducedMotion && idx === 2 && "amy-astro-enter-delay-2",
              )}
              data-testid={`amy-astro-insight-${section.id}`}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 px-5 py-4 text-left"
                aria-expanded={open}
                onClick={() => {
                  const next = open ? null : section.id;
                  setOpenId(next);
                  if (next) onChapterOpen?.(next);
                }}
              >
                <span
                  className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[hsl(42_50%_60%/0.35)] bg-gradient-to-br from-[hsl(275_40%_22%/0.7)] to-[hsl(42_40%_20%/0.4)] amy-astro-display text-sm text-[hsl(42_80%_78%)]"
                  aria-hidden
                >
                  {CHAPTER_MARK[section.id] ?? String(idx + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(42_50%_70%/0.65)]">
                    Chapter · {section.eyebrow}
                  </span>
                  <span className="amy-astro-display mt-1 block text-xl leading-snug text-[hsl(40_22%_96%)]">
                    {section.title}
                  </span>
                </span>
                <span className="text-[hsl(42_60%_70%)]" aria-hidden>
                  {open ? "−" : "+"}
                </span>
              </button>
              {open ? (
                <div className="border-t border-[hsl(42_50%_60%/0.15)] px-5 pb-6 pt-4">
                  <blockquote className="amy-astro-display mb-5 border-l-2 border-[hsl(42_60%_60%/0.4)] pl-4 text-lg leading-relaxed text-[hsl(42_70%_82%/0.95)]">
                    {quote}
                  </blockquote>
                  <div
                    className="mb-5 h-24 rounded-2xl bg-gradient-to-br from-[hsl(275_50%_30%/0.45)] via-[hsl(230_40%_18%/0.5)] to-[hsl(42_40%_22%/0.35)]"
                    aria-hidden
                  />
                  {paras.map((para, i) => (
                    <p
                      key={i}
                      className="mb-4 text-[15px] leading-[1.75] text-[hsl(40_18%_94%/0.86)] last:mb-0"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
