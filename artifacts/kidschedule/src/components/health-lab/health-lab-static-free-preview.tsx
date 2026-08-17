/**
 * Static Health Lab door for free users.
 * Never mounts HealthLabZone, never fetches /api/health-lab.
 */
import { Heart } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { AmyNestLeaveContinuity } from "@/components/amy-nest-leave-continuity";
import { PREMIUM_VOICE } from "@/lib/amynest-philosophy";
import { openSubscriptionGate } from "@/lib/subscription-gate";
import {
  HEALTH_LAB_QUIET_PATHS,
  healthLabLivingOpen,
  isHealthLabLivingV1Enabled,
} from "@/lib/health-lab/living-room";

export function HealthLabStaticFreePreview() {
  const living = isHealthLabLivingV1Enabled();
  const open = healthLabLivingOpen("your child");
  const practices = HEALTH_LAB_QUIET_PATHS.slice(0, 3);

  return (
    <main
      className="mx-auto flex min-h-[70vh] max-w-2xl flex-col px-6 py-10"
      data-testid="health-lab-static-free-preview"
    >
      <div
        className={
          living
            ? "rounded-[1.35rem] border border-[rgba(232,212,184,0.18)] bg-[rgba(8,6,12,0.55)] p-6 shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
            : "rounded-[28px] border border-violet-500/20 bg-white/[0.04] p-6"
        }
      >
        <p
          className={
            living
              ? "text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[rgba(251,191,36,0.92)]"
              : "text-xs font-bold uppercase tracking-[0.22em] text-violet-300"
          }
        >
          {living ? open.eyebrow : "Care wellness"}
        </p>
        <div className="mt-3 flex items-start gap-3">
          {living ? <Heart className="mt-1 h-5 w-5 shrink-0 text-[rgba(251,191,36,0.9)]" /> : null}
          <h1
            className={
              living
                ? "font-quicksand text-2xl font-bold text-[rgba(255,252,248,0.98)]"
                : "text-2xl font-black text-foreground"
            }
          >
            {living ? "A calm wellness room for your child" : "Preview Care wellness"}
          </h1>
        </div>
        <p
          className={
            living
              ? "mt-3 text-sm leading-relaxed text-[rgba(244,238,230,0.86)]"
              : "mt-3 text-sm leading-relaxed text-muted-foreground"
          }
        >
          {living
            ? `${open.companionship} Breath, balance, and quiet attention — one gentle practice at a time.`
            : "A quiet place to practice breath, balance, and attention with your child."}
        </p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {practices.map((practice) => (
            <li
              key={practice.gameId}
              className={
                living
                  ? "rounded-[1.05rem] border border-[rgba(232,212,184,0.16)] bg-[rgba(8,6,12,0.55)] p-4 text-sm font-semibold text-[rgba(255,252,248,0.96)]"
                  : "rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground"
              }
            >
              <p>{practice.title}</p>
              <p
                className={
                  living
                    ? "mt-1 text-xs font-normal text-[rgba(232,212,184,0.78)]"
                    : "mt-1 text-xs font-normal text-muted-foreground"
                }
              >
                {practice.purpose}
              </p>
            </li>
          ))}
        </ul>

        <p
          className={
            living
              ? "mt-5 text-sm leading-relaxed text-[rgba(244,238,230,0.8)]"
              : "mt-5 text-sm leading-relaxed text-muted-foreground"
          }
        >
          Premium continues the full Care room — personalized practice and guidance as your child grows.
        </p>

        <button
          type="button"
          className={
            living
              ? "mt-6 min-h-11 w-full rounded-2xl bg-[rgba(232,212,184,0.92)] px-5 py-3 text-sm font-bold text-[#1a1410]"
              : "mt-6 min-h-11 w-full rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white"
          }
          onClick={() =>
            openSubscriptionGate({ reason: "feature", source: "health_lab_static_preview" })
          }
        >
          {PREMIUM_VOICE.continueCta}
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Cancel anytime · Secure purchase · Restore purchases anytime
        </p>
      </div>

      <div className="mt-6 flex flex-col items-center gap-3">
        <AppLink href="/parenting-hub" source="health-lab-static-preview-leave">
          <span className="text-sm font-semibold text-primary">
            {living ? "Back to Parent Hub" : "Leave for now"}
          </span>
        </AppLink>
        {living ? (
          <AmyNestLeaveContinuity continueHref="/dashboard" continueLabel="Back to Today Home" />
        ) : null}
      </div>
    </main>
  );
}
