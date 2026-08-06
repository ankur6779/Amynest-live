/**
 * Amy Coach on Today — Living Room whisper.
 * Capability + route kept. Soft Plate / peer CTA deleted from composition.
 */

import { Link } from "wouter";
import {
  V2_HIERARCHY_WHISPER,
  V2_SPACE,
  V2_TYPE,
  v2LawRole,
} from "@/v2/craft";
import type { CoachCardPresentation } from "./coach-card-state";
import type { CoachDiscoveryOffer } from "./worry-map";

export const TODAY_COACH_SECTION_ID = "v2-today-coach";

type CoachDiscoveryCardProps = {
  offer: CoachDiscoveryOffer;
  presentation: CoachCardPresentation;
};

export function CoachDiscoveryCard({
  offer,
  presentation,
}: CoachDiscoveryCardProps) {
  return (
    <section
      id={TODAY_COACH_SECTION_ID}
      aria-label={presentation.headline}
      className={`${V2_SPACE.pt3} ${V2_HIERARCHY_WHISPER}`}
      data-testid="v2-today-coach"
      data-coach-goal={offer.goalId}
      data-coach-worry={offer.worryId}
      data-coach-mode={presentation.mode}
      data-resumable={presentation.resumable ? "true" : "false"}
      {...v2LawRole("recede")}
    >
      <Link
        href={presentation.href}
        data-testid="v2-today-coach-cta"
        aria-label={presentation.ctaLabel}
        className={`${V2_TYPE.caption} text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline`}
      >
        {presentation.ctaLabel}
      </Link>
    </section>
  );
}
