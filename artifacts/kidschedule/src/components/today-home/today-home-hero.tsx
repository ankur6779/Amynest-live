/**
 * Today Home Hero — ONE hero only.
 * Hierarchy: NRT → Why today → living CTA → one supporting insight.
 * Structure frozen — Apple micro-craft only.
 */
import type { TodayNrtDecision } from "@/lib/today-home/resolve-today-nrt";
import type { SupportingInsight } from "@/lib/today-home/supporting-insight";

type Props = {
  decision: TodayNrtDecision;
  insight?: SupportingInsight | null;
  onBegin: () => void;
};

export function TodayHomeHero({ decision, insight, onBegin }: Props) {
  const restMode = decision.cta.kind === "rest";
  const whyId = "today-home-why-text";

  return (
    <section
      aria-label="Today’s next right thing"
      data-testid="today-home-hero"
      className="th-hero-card"
    >
      <div className="th-hero-body">
        <div className="min-w-0">
          <p className="th-hero-kicker" data-testid="today-home-kicker">
            Today’s next right thing
          </p>
          {decision.childName && decision.childName !== "your child" ? (
            <p className="th-hero-child" data-testid="today-home-child">
              For {decision.childName}
            </p>
          ) : null}
          <h1 className="th-hero-title" data-testid="today-home-title">
            {decision.title}
          </h1>
          <p id={whyId} className="th-hero-why" data-testid="today-home-why">
            <span className="th-hero-why-label">Why today · </span>
            {decision.why}
          </p>
          {decision.detail ? (
            <p className="th-hero-detail" data-testid="today-home-detail">
              {decision.detail}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onBegin}
          data-testid="today-home-begin"
          aria-describedby={whyId}
          className={restMode ? "th-hero-cta th-hero-cta--rest" : "th-hero-cta"}
        >
          {decision.cta.label}
        </button>

        {insight?.text ? (
          <p
            className="th-hero-insight"
            data-testid="today-home-insight"
            data-insight-kind={insight.kind}
          >
            {insight.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
