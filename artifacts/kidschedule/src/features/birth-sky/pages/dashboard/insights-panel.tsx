/**
 * Premium storybook chapters — unique art, previews, structured keepsake pages.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  buildDeepInsightSections,
  DEEP_INSIGHTS_CONTENT_VERSION,
  type InsightSectionId,
} from "../../constants/deep-insights-content";
import { getChapterMeta } from "../../lib/chapter-meta";
import { AMY_ASTRO_DISCLAIMER } from "../../lib/branding";
import { AmyAstroChapterIllustrationFromMeta } from "../../components/chapter-illustration";
import { estimateReadingMinutes } from "../../lib/sky-copy";
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

function Beat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[hsl(42_50%_60%/0.18)] bg-[hsl(248_40%_12%/0.45)] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_60%_70%/0.75)]">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-[hsl(40_18%_94%/0.88)]">{children}</p>
    </div>
  );
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
          A keepsake of noticing — each chapter opens with art, a clear preview, and gentle structure.{" "}
          {AMY_ASTRO_DISCLAIMER}
        </p>
      </header>

      <div className="space-y-3">
        {ordered.map((section, idx) => {
          const open = openId === section.id;
          const meta = getChapterMeta(section.id);
          const readingMinutes = estimateReadingMinutes(section.body);
          const quote = pullQuoteFrom(section.body);
          const paras = section.body.split("\n\n").filter(Boolean);
          const intro = paras[0] ?? "";
          const main = paras.slice(1, -1);
          const ending = paras.length > 1 ? paras[paras.length - 1] : "";
          const related = ordered.find((s) => s.id === meta.relatedId);
          const mark = String(idx + 1).padStart(2, "0");

          return (
            <article
              key={section.id}
              className={cn(
                "amy-astro-storybook amy-astro-chapter-card overflow-hidden rounded-[1.5rem]",
                !reducedMotion && "amy-astro-enter",
                !reducedMotion && idx === 1 && "amy-astro-enter-delay-1",
                !reducedMotion && idx === 2 && "amy-astro-enter-delay-2",
              )}
              data-testid={`amy-astro-insight-${section.id}`}
            >
              <button
                type="button"
                className="flex w-full flex-col gap-3 px-4 py-4 text-left sm:px-5"
                aria-expanded={open}
                onClick={() => {
                  const next = open ? null : section.id;
                  setOpenId(next);
                  if (next) onChapterOpen?.(next);
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[hsl(42_50%_60%/0.35)] bg-gradient-to-br from-[hsl(275_40%_22%/0.7)] to-[hsl(42_40%_20%/0.4)] amy-astro-display text-sm text-[hsl(42_80%_78%)]"
                    aria-hidden
                    style={{
                      backgroundImage: `linear-gradient(135deg, hsl(${meta.accentFrom} / 0.75), hsl(${meta.accentTo} / 0.55))`,
                    }}
                  >
                    {mark}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(42_50%_70%/0.75)]">
                      {meta.category}
                    </span>
                    <span className="amy-astro-display mt-1 block text-xl leading-snug text-[hsl(40_22%_96%)]">
                      {section.title}
                    </span>
                  </span>
                  <span className="text-[hsl(42_60%_70%)]" aria-hidden>
                    {open ? "−" : "+"}
                  </span>
                </div>

                {!open ? (
                  <>
                    <AmyAstroChapterIllustrationFromMeta
                      meta={meta}
                      size="card"
                      title={section.title}
                    />
                    <p className="line-clamp-2 text-sm leading-relaxed text-[hsl(40_18%_94%/0.72)]">
                      {meta.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[hsl(42_50%_60%/0.35)] bg-[hsl(248_40%_14%/0.65)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(42_70%_78%)]">
                        {meta.planetBadge}
                      </span>
                      <span className="text-[11px] text-[hsl(40_20%_96%/0.5)]">
                        ~{readingMinutes} min read
                      </span>
                    </div>
                  </>
                ) : null}
              </button>

              {open ? (
                <div
                  className={cn(
                    "border-t border-[hsl(42_50%_60%/0.15)] px-4 pb-6 pt-4 sm:px-5",
                    !reducedMotion && "amy-astro-chapter-expand",
                  )}
                >
                  <AmyAstroChapterIllustrationFromMeta
                    meta={meta}
                    size="hero"
                    title={section.title}
                    className="mb-5"
                  />

                  <header className="mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[hsl(42_55%_72%/0.7)]">
                      {meta.category} · {meta.planetBadge}
                    </p>
                    <h4 className="amy-astro-display mt-1 text-2xl text-[hsl(42_70%_82%)]">
                      {section.title}
                    </h4>
                    <p className="mt-1 text-xs text-[hsl(40_20%_96%/0.5)]">
                      ~{readingMinutes} min · {meta.summary}
                    </p>
                  </header>

                  <blockquote className="amy-astro-display mb-5 border-l-2 border-[hsl(42_60%_60%/0.4)] pl-4 text-lg leading-relaxed text-[hsl(42_70%_82%/0.95)]">
                    {quote}
                  </blockquote>

                  {intro ? (
                    <p className="mb-4 text-[15px] leading-[1.75] text-[hsl(40_18%_94%/0.9)]">
                      {intro}
                    </p>
                  ) : null}

                  {main.map((para, i) => (
                    <p
                      key={i}
                      className="mb-4 text-[15px] leading-[1.75] text-[hsl(40_18%_94%/0.86)]"
                    >
                      {para}
                    </p>
                  ))}

                  <div className="mt-5 space-y-3">
                    <Beat label="What parents may notice">{meta.notice}</Beat>
                    <Beat label="What parents can try">{meta.try}</Beat>
                    <Beat label="Reflection question">{meta.reflect}</Beat>
                  </div>

                  {ending ? (
                    <p className="amy-astro-display mt-6 text-base leading-relaxed text-[hsl(42_65%_78%/0.92)]">
                      {ending}
                    </p>
                  ) : null}

                  {related ? (
                    <button
                      type="button"
                      className="amy-astro-btn-premium mt-5 w-full rounded-2xl border border-[hsl(42_50%_60%/0.3)] bg-[hsl(248_40%_14%/0.55)] px-4 py-3 text-left"
                      onClick={() => {
                        setOpenId(related.id);
                        onChapterOpen?.(related.id);
                      }}
                    >
                      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[hsl(42_55%_70%/0.7)]">
                        Related chapter
                      </span>
                      <span className="amy-astro-display mt-0.5 block text-lg text-[hsl(42_70%_82%)]">
                        {related.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-[hsl(40_20%_96%/0.5)]">
                        {getChapterMeta(related.id).category}
                      </span>
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
