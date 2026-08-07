/**
 * R6 Keep ritual — the emotional hero.
 * Presentational only. Does not touch auth.
 */
import type { KeepKeepsake } from "@/lib/first-experience/signup-keep";

type Props = {
  keepsake: KeepKeepsake;
  /** "protect" on signup, "return" on sign-in */
  tone?: "protect" | "return";
};

export function KeepKeepsakeCard({ keepsake, tone = "protect" }: Props) {
  return (
    <div
      data-testid="keep-keepsake"
      role="region"
      aria-label={
        tone === "return"
          ? `Continuing with ${keepsake.childName}`
          : `Protecting ${keepsake.childName}'s progress`
      }
      style={{
        marginBottom: 22,
        padding: "20px 18px 18px",
        borderRadius: 18,
        border: "1px solid rgba(212,175,120,0.28)",
        background:
          "linear-gradient(165deg, rgba(244,238,230,0.07) 0%, rgba(212,175,120,0.05) 45%, rgba(0,0,0,0.12) 100%)",
        boxShadow: "inset 0 1px 0 rgba(244,238,230,0.08), 0 12px 32px rgba(0,0,0,0.25)",
      }}
    >
      <p
        style={{
          margin: "0 0 10px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(232,212,176,0.55)",
        }}
      >
        {tone === "return" ? "Still with you" : "What you’re protecting"}
      </p>

      <p
        data-testid="keep-keepsake-child"
        style={{
          margin: "0 0 8px",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "-0.35px",
          color: "rgba(244,238,230,0.96)",
          lineHeight: 1.2,
        }}
      >
        {keepsake.childName}
      </p>

      <p
        data-testid="keep-keepsake-next"
        style={{
          margin: "0 0 14px",
          fontSize: 15,
          fontWeight: 500,
          color: "rgba(232,212,176,0.88)",
          lineHeight: 1.45,
        }}
      >
        {keepsake.nextThingTitle}
      </p>

      <div
        style={{
          display: "grid",
          gap: 6,
          paddingTop: 12,
          borderTop: "1px solid rgba(212,175,120,0.18)",
        }}
      >
        <p
          data-testid="keep-keepsake-completion"
          style={{ margin: 0, fontSize: 13, color: "rgba(244,238,230,0.62)", lineHeight: 1.4 }}
        >
          {keepsake.completionLine}
        </p>
        <p
          style={{ margin: 0, fontSize: 13, color: "rgba(244,238,230,0.5)", lineHeight: 1.4 }}
        >
          {keepsake.emotionalContext}
        </p>
        <p
          data-testid="keep-keepsake-safety"
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(232,212,176,0.72)",
            lineHeight: 1.4,
          }}
        >
          {keepsake.safetyLine}
        </p>
      </div>
    </div>
  );
}
