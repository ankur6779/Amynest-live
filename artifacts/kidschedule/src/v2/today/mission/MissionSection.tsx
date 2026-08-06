/**
 * Today's Mission — Living Room primary object.
 * One Soft Plate · one Bloom. No taxonomy eyebrow. No peer modules.
 */

import { Link } from "wouter";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  V2_CARD_SOFT,
  V2_CHIP,
  V2_CTA,
  V2_ICON,
  V2_ICON_STROKE,
  V2_HIERARCHY_WHISPER,
  V2_PRESS_PRIMARY,
  V2_SPACE,
  V2_TYPE,
  V2_WEIGHT_MISSION,
  v2LawRole,
} from "@/v2/craft";
import type { TodayHeroSource } from "@/v2/today/hero-activation";
import type { TodaySpeechMission } from "./types";

type MissionSectionProps = {
  mission: TodaySpeechMission;
  completed: boolean;
  sectionId: string;
  /**
   * Hero source gate (A9.4) — machine attribute only.
   * Does not change layout, CTA, or mission content.
   */
  heroSource?: TodayHeroSource;
};

export function MissionSection({
  mission,
  completed,
  sectionId,
  heroSource = "legacy",
}: MissionSectionProps) {
  return (
    <section
      id={sectionId}
      aria-labelledby="v2-today-mission-title"
      className={`${V2_CARD_SOFT} ${V2_WEIGHT_MISSION} ${V2_SPACE.stack2} ${V2_SPACE.platePad}`}
      data-testid="v2-today-mission"
      data-mission-id={mission.missionId}
      data-mission-domain={mission.domain}
      data-mission-duration={mission.duration}
      data-mission-difficulty={mission.difficulty}
      data-mission-estimated-minutes={String(mission.estimatedMinutes)}
      data-completed={completed ? "true" : "false"}
      data-hero-source={heroSource}
    >
      <div className={V2_SPACE.stack1}>
        <h2
          id="v2-today-mission-title"
          className={`${V2_TYPE.body}`}
        >
          {mission.title}
        </h2>
        <p
          className={`${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}
          data-testid="v2-today-mission-meta"
        >
          {mission.duration}
        </p>
      </div>
      <p className={V2_TYPE.bodyMuted}>{mission.summary}</p>

      {completed ? (
        <div
          className={`flex items-center ${V2_SPACE[1]} ${V2_CHIP} ${V2_SPACE.rowPad} ${V2_TYPE.caption} ${V2_HIERARCHY_WHISPER}`}
          role="status"
          data-testid="v2-today-mission-complete-badge"
        >
          <Check
            className={`${V2_ICON.sm} text-primary`}
            strokeWidth={V2_ICON_STROKE}
            aria-hidden
          />
          Completed today
        </div>
      ) : (
        <Button
          asChild
          className={`${V2_CTA} ${V2_PRESS_PRIMARY} ${V2_TYPE.cta}`}
        >
          <Link
            href="/today/mission"
            data-testid="v2-today-mission-start"
            aria-label={`Start mission: ${mission.title}`}
            {...v2LawRole("primary")}
          >
            {mission.ctaLabel}
          </Link>
        </Button>
      )}
    </section>
  );
}
