/**
 * Guidance Phase 2 — one calm guidance stream.
 * Merges Daily Tips · Articles · Amy Suggests · New Parent Tips.
 * Never a blog. Never a content catalogue.
 * Presentation only — tip/article engines reused as-is.
 */
import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ROOM_HEROES } from "@/lib/parent-hub/room-heroes";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { AppLink } from "@/components/app-link";
import type { AgeGroup } from "@/lib/age-groups";
import {
  guidanceLanesForContext,
  pickAmySuggestsSentence,
  pickGuidanceSacredSentence,
  recommendGuidanceAction,
  type GuidanceStreamLaneId,
} from "@/lib/guidance/living-room";
import "@/pages/first-experience-material.css";
import "./guidance-living-room.css";

const DailyTips = lazy(() =>
  import("@/components/daily-tips").then((m) => ({ default: m.DailyTips })),
);
const ParentingArticles = lazy(() =>
  import("@/components/parenting-articles").then((m) => ({
    default: m.ParentingArticles,
  })),
);
const NewParentTipsSection = lazy(() =>
  import("@/components/new-parent-tips").then((m) => ({
    default: m.NewParentTipsSection,
  })),
);

const UNDERSTAND_MEMORY = ROOM_HEROES.understand;

export type GuidanceLivingStreamProps = {
  childName: string;
  ageGroup: AgeGroup;
  childAgeMonths: number;
  isInfant: boolean;
  showNewParent: boolean;
  /** Optional locked wrappers from Hub (entitlements preserved) */
  wrapLane?: (laneId: GuidanceStreamLaneId, node: ReactNode) => ReactNode;
};

function LaneFallback() {
  return (
    <p className="gd-lane-purpose" role="status">
      Preparing a quiet thought…
    </p>
  );
}

export function GuidanceLivingStream({
  childName,
  ageGroup,
  childAgeMonths,
  isInfant,
  showNewParent,
  wrapLane,
}: GuidanceLivingStreamProps) {
  const { t } = useTranslation();
  const [activeLane, setActiveLane] = useState<GuidanceStreamLaneId | null>(
    null,
  );
  useEffect(() => {
    setActiveLane(null);
  }, [childName, ageGroup, childAgeMonths]);
  const recommend = useMemo(() => recommendGuidanceAction(), []);
  const sacred = useMemo(
    () => pickGuidanceSacredSentence(ageGroup),
    [ageGroup],
  );
  const amySuggests = useMemo(
    () => pickAmySuggestsSentence(ageGroup),
    [ageGroup],
  );
  const lanes = useMemo(
    () => guidanceLanesForContext({ isInfant, showNewParent }),
    [isInfant, showNewParent],
  );
  const tipsAgeGroup: AgeGroup = showNewParent
    ? isInfant
      ? ageGroup
      : "infant"
    : ageGroup;

  const deepen = (laneId: GuidanceStreamLaneId) => {
    setActiveLane((prev) => (prev === laneId ? null : laneId));
  };

  const renderLaneBody = (id: GuidanceStreamLaneId): ReactNode => {
    switch (id) {
      case "daily-tips":
        return (
          <Suspense fallback={<LaneFallback />}>
            <DailyTips
              ageGroup={ageGroup}
              childName={childName}
              presentation="stream"
            />
          </Suspense>
        );
      case "new-parent-tips":
        return (
          <Suspense fallback={<LaneFallback />}>
            <NewParentTipsSection ageGroup={tipsAgeGroup} />
          </Suspense>
        );
      case "amy-suggests":
        return (
          <div data-testid="guidance-amy-suggests">
            <p className="gd-suggest-text">{amySuggests.en}</p>
            {isInfant ? (
              <AppLink
                href="/parenting-hub?tile=infant-hub&section=infant-amy-suggests"
                source="guidance-amy-suggests-deepen"
              >
                <button type="button" className="gd-suggest-deepen">
                  {t("guidance.living.amy_suggests_deepen", {
                    defaultValue: "More in Infant Care",
                  })}
                </button>
              </AppLink>
            ) : null}
          </div>
        );
      case "articles":
        return (
          <Suspense fallback={<LaneFallback />}>
            <ParentingArticles childAgeMonths={childAgeMonths} compact />
          </Suspense>
        );
      default:
        return null;
    }
  };

  const activeMeta = lanes.find((l) => l.id === activeLane) ?? null;
  const deepenBody =
    activeLane && activeMeta
      ? (() => {
          const body = (
            <section
              className="gd-lane gd-deepen-lane"
              data-testid={`guidance-lane-${activeLane}`}
              data-section-id={activeLane}
              id={`guidance-lane-${activeLane}`}
            >
              <div className="gd-lane-head">
                <span className="gd-lane-title">{activeMeta.title}</span>
                <span className="gd-lane-purpose">{activeMeta.purpose}</span>
              </div>
              <div className="gd-lane-body">{renderLaneBody(activeLane)}</div>
            </section>
          );
          return wrapLane ? wrapLane(activeLane, body) : body;
        })()
      : null;

  return (
    <div
      className="gd-living-surface"
      data-testid="guidance-living-stream"
      data-gd-living="1"
      data-gd-hierarchy="deepen"
    >
      <header className="gd-today-hero" data-testid="guidance-today-hero">
        <div
          className="fe-memory-mount gd-today-memory"
          data-testid="guidance-visual-memory"
          data-fe-shot={UNDERSTAND_MEMORY.shot}
        >
          <div className="fe-memory-spill" aria-hidden="true" />
          <div className="fe-memory">
            <img
              src={UNDERSTAND_MEMORY.src}
              alt={UNDERSTAND_MEMORY.alt}
              draggable={false}
              decoding="async"
              fetchPriority="high"
            />
            <div className="fe-memory-veil" aria-hidden="true" />
            <div className="fe-memory-glass" aria-hidden="true" />
            <div className="fe-memory-grain" aria-hidden="true" />
            <div className="gd-today-readability" aria-hidden="true" />
            <div className="gd-today-copy">
              <p className="gd-today-eyebrow">
                {t("guidance.living.eyebrow", {
                  defaultValue: "Today's Guidance",
                })}
              </p>
              <h1 className="gd-today-title">
                {t("guidance.living.title", {
                  name: childName,
                  defaultValue: `I'm here with you and ${childName}.`,
                })}
              </h1>
              <p className="gd-today-purpose">
                {t("guidance.living.purpose", {
                  defaultValue:
                    "One calm guidance stream — never a blog or content catalogue.",
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <button
        type="button"
        className="gd-sacred"
        data-testid="guidance-sacred-sentence"
        onClick={() => deepen("daily-tips")}
      >
        <span className="gd-sacred-cue">{recommend.label}</span>
        <span className="gd-sacred-title">{recommend.title}</span>
        <p className="gd-sacred-text">{sacred.en}</p>
      </button>

      <div className="gd-stream" data-testid="guidance-stream-lanes">
        <p className="gd-stream-label">
          {t("guidance.living.stream_label", {
            defaultValue: "Continue gently",
          })}
        </p>

        <div className="gd-quiet-list" data-testid="guidance-quiet-paths">
          {lanes.map((lane) => (
            <button
              key={lane.id}
              type="button"
              className="gd-quiet-path"
              data-testid={`guidance-quiet-${lane.id}`}
              data-active={activeLane === lane.id ? "true" : "false"}
              aria-current={activeLane === lane.id ? "true" : undefined}
              onClick={() => deepen(lane.id)}
            >
              <span className="gd-quiet-path-title">{lane.title}</span>
              <span className="gd-quiet-path-purpose">{lane.purpose}</span>
            </button>
          ))}
        </div>
      </div>

      {deepenBody ? (
        <div className="gd-deepen" data-testid="guidance-deepen">
          {deepenBody}
        </div>
      ) : null}

      <p className="gd-support-note">
        {t("guidance.living.continuity", {
          defaultValue: "We'll continue helping as your child grows.",
        })}
      </p>
      <p className="gd-support-note gd-support-invite">{PREMIUM_VOICE.invitation}</p>
      <p className="gd-support-note gd-support-continue">
        {t("guidance.living.continue_support", {
          defaultValue: PREMIUM_VOICE.continueCta,
        })}
      </p>
    </div>
  );
}
