import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getLessonById,
  getLessonText,
  getSeriesProgress,
  type Lesson,
  type LessonSeries,
  type LessonTier,
} from "@/lib/audio-lessons";
import {
  AGE_TILE_META,
  lessonsForNavGroup,
  seriesForNavGroup,
  type AgeNavGroup,
} from "@/lib/audio-lessons-nav";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import {
  trackAudioCategoryOpened,
  trackAudioLockedClick,
  trackAudioPremiumItemViewed,
} from "@/lib/content-gating-analytics";
import { LessonCard, type LessonAccess } from "@/components/audio-lessons/lesson-card";
import { SeriesCard } from "@/components/audio-lessons/series-card";
import { LessonsSkeleton } from "@/components/audio-lessons/lessons-skeleton";

type AgeDetailScreenProps = {
  ageGroup: AgeNavGroup;
  loading?: boolean;
  isPremium: boolean;
  recommendedLessonIds: string[];
  recommendationReason?: string;
  completedIds: Set<string>;
  resumeMap: Record<string, number>;
  activeLessonId: string | null;
  unlocking: boolean;
  getLessonAccess: (lesson: Lesson) => LessonAccess;
  tierLabel: (tier: LessonTier) => string;
  onPickLesson: (lesson: Lesson, opts?: { series?: LessonSeries | null; autoPlay?: boolean }) => void;
  onStartSeries: (series: LessonSeries) => void;
  onUnlock: () => void;
};

function lessonProgressPercent(lesson: Lesson, resumeMap: Record<string, number>, completed: boolean): number {
  if (completed) return 100;
  const text = getLessonText(lesson);
  const total = text.paragraphs.length;
  if (total <= 0) return 0;
  const idx = resumeMap[lesson.id] ?? 0;
  return Math.min(100, Math.round((idx / total) * 100));
}

function lessonCta(
  lesson: Lesson,
  resumeMap: Record<string, number>,
  completed: boolean,
): "play" | "continue" | "completed" {
  if (completed) return "completed";
  const idx = resumeMap[lesson.id] ?? 0;
  return idx > 0 ? "continue" : "play";
}

export function AgeDetailScreen({
  ageGroup,
  loading = false,
  isPremium,
  recommendedLessonIds,
  recommendationReason,
  completedIds,
  resumeMap,
  activeLessonId,
  unlocking,
  getLessonAccess,
  tierLabel,
  onPickLesson,
  onStartSeries,
  onUnlock,
}: AgeDetailScreenProps) {
  const { t } = useTranslation();
  const lang = "en";
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const meta = AGE_TILE_META.find((m) => m.group === ageGroup)!;
  const lessons = useMemo(() => lessonsForNavGroup(ageGroup), [ageGroup]);
  const ageSeries = useMemo(() => seriesForNavGroup(ageGroup), [ageGroup]);

  const recommendedLessons = useMemo(() => {
    const fromAmy = recommendedLessonIds
      .map((id) => getLessonById(id))
      .filter((l): l is Lesson => l != null && lessons.some((x) => x.id === l.id));
    if (fromAmy.length >= 2) return fromAmy.slice(0, 3);
    const extras = lessons.filter((l) => !fromAmy.some((f) => f.id === l.id)).slice(0, 3 - fromAmy.length);
    return [...fromAmy, ...extras].slice(0, 3);
  }, [recommendedLessonIds, lessons]);

  const recommendedIds = useMemo(() => new Set(recommendedLessons.map((l) => l.id)), [recommendedLessons]);

  const quickLessons = useMemo(
    () => lessons.filter((l) => l.tier === "quick" && !recommendedIds.has(l.id)),
    [lessons, recommendedIds],
  );

  const deepLessons = useMemo(
    () => lessons.filter((l) => l.tier === "deep" && !recommendedIds.has(l.id)),
    [lessons, recommendedIds],
  );

  const standardLessons = useMemo(
    () =>
      lessons.filter(
        (l) =>
          l.tier === "standard" &&
          !recommendedIds.has(l.id) &&
          !ageSeries.some((s) => s.lessonIds.includes(l.id)),
      ),
    [lessons, recommendedIds, ageSeries],
  );

  const catalogLessons = useMemo(
    () => [...quickLessons, ...standardLessons, ...deepLessons],
    [quickLessons, standardLessons, deepLessons],
  );

  const paginatedCatalog = usePaginatedList(catalogLessons, 12);

  useEffect(() => {
    trackAudioCategoryOpened(ageGroup, lessons.length, isPremium);
  }, [ageGroup, lessons.length, isPremium]);

  useEffect(() => {
    if (isPremium) return;
    paginatedCatalog.visible.forEach((lesson, index) => {
      if (getLessonAccess(lesson) !== "locked") return;
      trackAudioPremiumItemViewed(ageGroup, lesson.id, index, false);
    });
  }, [paginatedCatalog.visible, ageGroup, isPremium, getLessonAccess]);

  const paginatedQuick = useMemo(
    () => paginatedCatalog.visible.filter((l) => l.tier === "quick"),
    [paginatedCatalog.visible],
  );
  const paginatedStandard = useMemo(
    () => paginatedCatalog.visible.filter((l) => l.tier === "standard"),
    [paginatedCatalog.visible],
  );
  const paginatedDeep = useMemo(
    () => paginatedCatalog.visible.filter((l) => l.tier === "deep"),
    [paginatedCatalog.visible],
  );

  useEffect(() => {
    if (!activeLessonId) return;
    const timer = window.setTimeout(() => {
      activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [activeLessonId, ageGroup]);

  const renderLesson = (lesson: Lesson, highlight?: boolean, itemIndex = 0) => {
    const completed = completedIds.has(lesson.id);
    const isActive = activeLessonId === lesson.id;
    const access = getLessonAccess(lesson);
    return (
      <LessonCard
        key={lesson.id}
        lesson={lesson}
        lang={lang}
        access={access}
        tierLabel={tierLabel}
        progressPercent={lessonProgressPercent(lesson, resumeMap, completed)}
        isCompleted={completed}
        highlight={highlight}
        disabled={unlocking}
        cta={lessonCta(lesson, resumeMap, completed)}
        onPress={() => {
          if (access === "locked") {
            trackAudioLockedClick(ageGroup, lesson.id, itemIndex);
            onUnlock();
            return;
          }
          void onPickLesson(lesson);
        }}
        cardRef={isActive ? activeRef : undefined}
      />
    );
  };

  const sectionTitle = (key: string) => (
    <h2
      style={{
        fontFamily: "Quicksand, sans-serif",
        fontSize: 14,
        fontWeight: 800,
        margin: "0 0 4px",
        color: "#c7c0e8",
      }}
    >
      {t(key)}
    </h2>
  );

  return (
    <motion.div
      key={ageGroup}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="amynest-page-inset w-full min-w-0 overflow-x-clip box-border"
      style={{ paddingTop: 8, paddingBottom: 100 }}
      data-testid={`age-detail-${ageGroup}`}
    >
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            fontFamily: "Quicksand, sans-serif",
            fontSize: 20,
            fontWeight: 800,
            margin: "0 0 6px",
          }}
        >
          {t(meta.labelKey)}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: "#c7c0e8", lineHeight: 1.5 }}>{t(meta.subtitleKey)}</p>
      </div>

      {!isPremium && (
        <button
          type="button"
          onClick={onUnlock}
          style={{
            width: "100%",
            marginBottom: 16,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid rgba(251,191,36,0.45)",
            background: "rgba(251,191,36,0.1)",
            color: "hsl(var(--brand-amber-200))",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <Lock size={16} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>{t("pages.audio_lessons.unlock_banner")}</span>
        </button>
      )}

      {loading ? (
        <LessonsSkeleton rows={5} />
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {recommendedLessons.length > 0 && (
            <section>
              {sectionTitle("pages.audio_lessons.recommended_for_you")}
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#a99fd9" }}>
                {recommendationReason
                  ? t(`pages.audio_lessons.amy_reason_${recommendationReason}`, {
                      defaultValue: t("pages.audio_lessons.recommended_for_you_subtitle"),
                    })
                  : t("pages.audio_lessons.recommended_for_you_subtitle")}
              </p>
              <div style={{ display: "grid", gap: 10 }}>{recommendedLessons.map((l) => renderLesson(l, true))}</div>
            </section>
          )}

          {ageSeries.length > 0 && (
            <section>
              {sectionTitle("pages.audio_lessons.series_title")}
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "#a99fd9" }}>
                {t("pages.audio_lessons.series_subtitle")}
              </p>
              <div style={{ display: "grid", gap: 10 }}>
                {ageSeries.map((series) => {
                  const progress = getSeriesProgress(series, completedIds);
                  const seriesLocked =
                    !isPremium &&
                    series.lessonIds.every((id) => {
                      const lesson = lessons.find((l) => l.id === id);
                      return lesson ? getLessonAccess(lesson) === "locked" : true;
                    });
                  return (
                    <SeriesCard
                      key={series.id}
                      series={series}
                      progress={progress}
                      locked={seriesLocked}
                      disabled={unlocking}
                      onStart={() => onStartSeries(series)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {paginatedQuick.length > 0 && (
            <section>
              {sectionTitle("pages.audio_lessons.quick_lessons")}
              <div style={{ display: "grid", gap: 10 }}>
                {paginatedQuick.map((l, i) => renderLesson(l, false, i))}
              </div>
            </section>
          )}

          {paginatedStandard.length > 0 && (
            <section>
              {sectionTitle("pages.audio_lessons.all_lessons")}
              <div style={{ display: "grid", gap: 10 }}>
                {paginatedStandard.map((l, i) => renderLesson(l, false, i))}
              </div>
            </section>
          )}

          {paginatedDeep.length > 0 && (
            <section>
              {sectionTitle("pages.audio_lessons.deep_dives")}
              <div style={{ display: "grid", gap: 10 }}>
                {paginatedDeep.map((l, i) => renderLesson(l, false, i))}
              </div>
            </section>
          )}

          {paginatedCatalog.hasMore && (
            <button
              type="button"
              onClick={paginatedCatalog.loadMore}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 14,
                border: "1px solid rgba(139,92,246,0.35)",
                background: "rgba(139,92,246,0.12)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("pages.audio_lessons.load_more", {
                defaultValue: "Load more ({{shown}} of {{total}})",
                shown: paginatedCatalog.visible.length,
                total: paginatedCatalog.total,
              })}
            </button>
          )}

          {lessons.length === 0 && (
            <div style={{ textAlign: "center", color: "#a99fd9", padding: 30 }}>
              {t("pages.audio_lessons.coming_soon")}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
