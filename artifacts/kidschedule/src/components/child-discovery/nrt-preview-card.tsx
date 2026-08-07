/**
 * Live NRT preview — signature Child Discovery intelligence surface.
 * Never shows "Generating…". Quietly becomes smarter.
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
      data-testid="discovery-nrt-preview"
      role="status"
      aria-live="polite"
      style={{
        marginTop: 16,
        padding: "16px 16px 14px",
        borderRadius: 18,
        border: "1px solid rgba(212,175,120,0.28)",
        background:
          "linear-gradient(165deg, rgba(244,238,230,0.07) 0%, rgba(212,175,120,0.05) 50%, rgba(0,0,0,0.14) 100%)",
        boxShadow: "inset 0 1px 0 rgba(244,238,230,0.08), 0 10px 28px rgba(0,0,0,0.22)",
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(232,212,176,0.55)",
        }}
      >
        Today’s next right thing
      </p>

      {nrt ? (
        <>
          <p
            data-testid="discovery-nrt-title"
            style={{
              margin: "0 0 8px",
              fontSize: 17,
              fontWeight: 650,
              letterSpacing: "-0.3px",
              color: "rgba(244,238,230,0.96)",
              lineHeight: 1.35,
            }}
          >
            {nrt.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "rgba(244,238,230,0.58)",
              lineHeight: 1.45,
            }}
          >
            {nrt.detail}
          </p>
          {adaptationNote ? (
            <p
              data-testid="discovery-nrt-adaptation"
              style={{
                margin: "12px 0 0",
                fontSize: 12,
                fontWeight: 500,
                color: "rgba(232,212,176,0.72)",
                lineHeight: 1.4,
              }}
            >
              {adaptationNote}
            </p>
          ) : null}
        </>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: "rgba(244,238,230,0.55)",
            lineHeight: 1.45,
          }}
        >
          {childName && childName !== "your child"
            ? `As Amy understands ${childName}, today’s next step becomes clear.`
            : "As Amy understands your child, today’s next step becomes clear."}
        </p>
      )}
    </div>
  );
}
