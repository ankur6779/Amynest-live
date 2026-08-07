/**
 * Live NRT preview — signature Child Discovery intelligence surface.
 * Never shows "Generating…". Quietly becomes smarter.
 * Phase 3: seated in Welcome material family (cd-nrt).
 */
import type { FirstExperienceNextThing } from "@/lib/first-experience/types";

type Props = {
  nrt: FirstExperienceNextThing | null;
  childName: string;
  /** Short line explaining what just changed this preview */
  adaptationNote?: string | null;
};

export function DiscoveryNrtPreviewCard({ nrt, childName, adaptationNote }: Props) {
  return (
    <div
      className="cd-nrt"
      data-testid="discovery-nrt-preview"
      role="status"
      aria-live="polite"
    >
      <p className="cd-nrt-kicker">Today’s next right thing</p>

      {nrt ? (
        <>
          <p className="cd-nrt-title" data-testid="discovery-nrt-title">
            {nrt.title}
          </p>
          <p className="cd-nrt-body">{nrt.detail}</p>
          {adaptationNote ? (
            <p className="cd-nrt-note" data-testid="discovery-nrt-adaptation">
              {adaptationNote}
            </p>
          ) : null}
        </>
      ) : (
        <p className="cd-nrt-body">
          {childName && childName !== "your child"
            ? `As Amy understands ${childName}, today’s next step becomes clear.`
            : "As Amy understands your child, today’s next step becomes clear."}
        </p>
      )}
    </div>
  );
}
