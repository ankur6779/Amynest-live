import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  buildWorkingSignals,
  decideFirstExperienceNextThing,
} from "@/lib/first-experience/decide-next";
import {
  loadFirstExperienceState,
  saveFirstExperienceState,
} from "@/lib/first-experience/storage";
import type {
  FirstExperienceAgeBand,
  FirstExperienceState,
  FirstExperienceTodayContext,
} from "@/lib/first-experience/types";
import { trackMarketingEvent } from "@/lib/marketing/ga4-analytics";

const AGE_OPTIONS: { id: FirstExperienceAgeBand; label: string }[] = [
  { id: "0-2", label: "0–2" },
  { id: "2-4", label: "2–4" },
  { id: "5-7", label: "5–7" },
  { id: "8-10", label: "8–10+" },
];

const TODAY_OPTIONS: { id: FirstExperienceTodayContext; label: string; hint: string }[] = [
  { id: "school", label: "School / care", hint: "They have somewhere to be" },
  { id: "home", label: "Home day", hint: "Mostly at home today" },
  { id: "unsure", label: "Not sure", hint: "Keep it flexible" },
];

function trackFtue(step: string, meta: Record<string, string | number | boolean | undefined> = {}) {
  trackMarketingEvent("first_experience_step" as never, { page: "first_experience", step, ...meta });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-testid="first-experience-root"
      className="min-h-[100dvh] text-white flex flex-col"
      style={{
        background:
          "radial-gradient(circle at 50% 30%, rgba(90,40,160,0.16) 0%, transparent 52%), linear-gradient(175deg, #05040c 0%, #0c0818 50%, #04020a 100%)",
      }}
    >
      <style>{`
        @keyframes feIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes feSignalIn {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .fe-in { animation: feIn 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .fe-signal { animation: feSignalIn 0.4s ease-out both; }
        .fe-btn {
          min-height: 52px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 16px;
          transition: transform .2s ease, background .2s ease, border-color .2s ease;
        }
        .fe-btn-primary {
          background: rgba(255,255,255,0.92);
          color: #12081f;
        }
        .fe-btn-primary:hover { transform: translateY(-1px); background: #fff; }
        .fe-btn-primary:disabled { opacity: 0.45; transform: none; }
        .fe-btn-quiet {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.92);
        }
        .fe-btn-quiet:hover { border-color: rgba(255,255,255,0.28); }
        .fe-choice {
          text-align: left;
          width: 100%;
          border-radius: 14px;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: #fff;
          min-height: 56px;
        }
        .fe-choice[data-active="true"] {
          border-color: rgba(255,255,255,0.55);
          background: rgba(255,255,255,0.1);
        }
        @media (prefers-reduced-motion: reduce) {
          .fe-in, .fe-signal { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
      <div className="flex-1 flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );
}

export default function FirstExperiencePage() {
  const [, setLocation] = useLocation();
  const [state, setState] = useState<FirstExperienceState>(() => loadFirstExperienceState());
  const [workingIndex, setWorkingIndex] = useState(0);
  const [nameDraft, setNameDraft] = useState(state.childName);
  const [keptLocalNote, setKeptLocalNote] = useState(false);

  useEffect(() => {
    saveFirstExperienceState(state);
  }, [state]);

  useEffect(() => {
    trackFtue(state.step);
  }, [state.step]);

  const patch = (partial: Partial<FirstExperienceState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  const workingSignals = useMemo(() => {
    if (!state.ageBand || !state.todayContext) return [];
    return buildWorkingSignals({
      childName: state.childName,
      ageBand: state.ageBand,
      todayContext: state.todayContext,
    });
  }, [state.ageBand, state.childName, state.todayContext]);

  useEffect(() => {
    if (state.step !== "working") return;
    if (!state.ageBand || !state.todayContext) return;

    setWorkingIndex(0);
    let i = 0;
    const total = workingSignals.length;
    const timer = window.setInterval(() => {
      i += 1;
      setWorkingIndex(i);
      if (i >= total) {
        window.clearInterval(timer);
        const nextThing = decideFirstExperienceNextThing({
          childName: state.childName,
          ageBand: state.ageBand!,
          todayContext: state.todayContext!,
        });
        window.setTimeout(() => {
          patch({ step: "next-thing", nextThing });
        }, 450);
      }
    }, 700);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  if (state.step === "welcome") {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center text-center">
          <p className="text-[11px] tracking-[0.22em] uppercase text-white/40 mb-6">AmyNest</p>
          <h1 className="text-[2rem] sm:text-[2.35rem] font-semibold leading-tight tracking-tight mb-4">
            Begin with today
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-10">
            We’ll use only what you share — and your local time — to form one next right thing for your child.
          </p>
          <button
            type="button"
            className="fe-btn fe-btn-primary w-full"
            data-testid="fe-welcome-continue"
            onClick={() => patch({ step: "discovery-name" })}
          >
            Continue
          </button>
        </div>
      </Shell>
    );
  }

  if (state.step === "discovery-name") {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">1 of 3</p>
          <h1 className="text-2xl font-semibold mb-2">Child’s first name</h1>
          <p className="text-white/55 text-sm mb-6">
            Used only to personalize today’s next step. Nothing else is assumed.
          </p>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="e.g. Aria"
            autoFocus
            data-testid="fe-child-name"
            className="w-full rounded-2xl px-4 py-3.5 bg-white/5 border border-white/15 text-white placeholder:text-white/30 outline-none focus:border-white/40 mb-6"
          />
          <button
            type="button"
            className="fe-btn fe-btn-primary w-full"
            disabled={!nameDraft.trim()}
            data-testid="fe-name-continue"
            onClick={() =>
              patch({ childName: nameDraft.trim(), step: "discovery-age" })
            }
          >
            Continue
          </button>
        </div>
      </Shell>
    );
  }

  if (state.step === "discovery-age") {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">2 of 3</p>
          <h1 className="text-2xl font-semibold mb-2">
            How old is {state.childName || "your child"}?
          </h1>
          <p className="text-white/55 text-sm mb-6">
            Age changes what “next right thing” can mean today.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="fe-choice"
                data-active={state.ageBand === opt.id}
                data-testid={`fe-age-${opt.id}`}
                onClick={() => patch({ ageBand: opt.id })}
              >
                <span className="font-semibold text-lg">{opt.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fe-btn fe-btn-primary w-full"
            disabled={!state.ageBand}
            data-testid="fe-age-continue"
            onClick={() => patch({ step: "discovery-today" })}
          >
            Continue
          </button>
        </div>
      </Shell>
    );
  }

  if (state.step === "discovery-today") {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">3 of 3</p>
          <h1 className="text-2xl font-semibold mb-2">What kind of day is today?</h1>
          <p className="text-white/55 text-sm mb-6">
            Only this — so today’s step fits the day you actually have.
          </p>
          <div className="space-y-3 mb-8">
            {TODAY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="fe-choice"
                data-active={state.todayContext === opt.id}
                data-testid={`fe-today-${opt.id}`}
                onClick={() => patch({ todayContext: opt.id })}
              >
                <div className="font-semibold">{opt.label}</div>
                <div className="text-sm text-white/50 mt-0.5">{opt.hint}</div>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fe-btn fe-btn-primary w-full"
            disabled={!state.todayContext}
            data-testid="fe-today-continue"
            onClick={() => patch({ step: "working" })}
          >
            Form today’s next step
          </button>
        </div>
      </Shell>
    );
  }

  if (state.step === "working") {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">Working</p>
          <h1 className="text-2xl font-semibold mb-6">Forming today’s next right thing</h1>
          <ul className="space-y-3">
            {workingSignals.map((line, idx) => {
              const visible = idx < workingIndex;
              return (
                <li
                  key={line}
                  className={`fe-signal rounded-xl px-4 py-3 border text-sm ${
                    visible
                      ? "border-white/20 bg-white/6 text-white/90"
                      : "border-transparent text-transparent"
                  }`}
                  style={{ animationDelay: visible ? `${idx * 40}ms` : undefined }}
                >
                  {visible ? line : "•"}
                </li>
              );
            })}
          </ul>
        </div>
      </Shell>
    );
  }

  if (state.step === "next-thing" && state.nextThing) {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">
            Today’s next right thing
          </p>
          <h1 className="text-[1.75rem] font-semibold leading-snug mb-3">{state.nextThing.title}</h1>
          <p className="text-white/65 text-base leading-relaxed mb-4">{state.nextThing.detail}</p>
          <p className="text-white/40 text-sm mb-8">About {state.nextThing.minutes} minutes</p>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-8">
            <p className="text-[11px] uppercase tracking-wider text-white/35 mb-2">Based only on</p>
            <ul className="space-y-1.5 text-sm text-white/55">
              {state.nextThing.basedOn.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            className="fe-btn fe-btn-primary w-full"
            data-testid="fe-start-action"
            onClick={() => patch({ step: "doing" })}
          >
            Do this now
          </button>
        </div>
      </Shell>
    );
  }

  if (state.step === "doing" && state.nextThing) {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">In progress</p>
          <h1 className="text-2xl font-semibold mb-3">{state.nextThing.title}</h1>
          <p className="text-white/60 mb-10">{state.nextThing.detail}</p>
          <button
            type="button"
            className="fe-btn fe-btn-primary w-full"
            data-testid="fe-mark-done"
            onClick={() =>
              patch({
                step: "done",
                completedAt: new Date().toISOString(),
                valueEarned: true,
              })
            }
          >
            Mark as done
          </button>
        </div>
      </Shell>
    );
  }

  if (state.step === "done") {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center text-center">
          <h1 className="text-2xl font-semibold mb-3">Done for this moment</h1>
          <p className="text-white/60 mb-10 leading-relaxed">
            You completed today’s next right thing for {state.childName || "your child"}.
          </p>
          <button
            type="button"
            className="fe-btn fe-btn-primary w-full"
            data-testid="fe-done-continue"
            onClick={() => patch({ step: "memory" })}
          >
            Continue
          </button>
        </div>
      </Shell>
    );
  }

  if (state.step === "memory") {
    return (
      <Shell>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">Memory</p>
          <h1 className="text-2xl font-semibold mb-3">Tomorrow can start from here</h1>
          <p className="text-white/60 leading-relaxed mb-10">
            AmyNest can remember today’s progress for {state.childName || "your child"} — so the next
            right thing gets sharper over time. Nothing is saved to an account until you choose to keep it.
          </p>
          <button
            type="button"
            className="fe-btn fe-btn-primary w-full"
            data-testid="fe-memory-continue"
            onClick={() => patch({ step: "keep" })}
          >
            Continue
          </button>
        </div>
      </Shell>
    );
  }

  // keep / identity
  return (
    <Shell>
      <div className="fe-in flex-1 flex flex-col justify-center">
        <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">Keep</p>
        <h1 className="text-2xl font-semibold mb-3">Keep today’s progress</h1>
        <p className="text-white/60 leading-relaxed mb-6">
          Create an account to keep today’s progress, tomorrow’s plan, and{" "}
          {state.childName || "your child"}’s growing understanding.
        </p>
        <p className="text-white/40 text-sm mb-8">
          Identity protects value. It does not unlock what you already did.
        </p>
        <button
          type="button"
          className="fe-btn fe-btn-primary w-full mb-3"
          data-testid="fe-keep-account"
          onClick={() => {
            trackFtue("keep_account");
            setLocation("/sign-up?from=first-experience");
          }}
        >
          Keep with an account
        </button>
        <button
          type="button"
          className="fe-btn fe-btn-quiet w-full"
          data-testid="fe-keep-later"
          onClick={() => {
            trackFtue("keep_later");
            setKeptLocalNote(true);
          }}
        >
          Not now
        </button>
        {keptLocalNote ? (
          <p className="text-sm text-white/50 mt-4 text-center" data-testid="fe-kept-local">
            Today’s progress stays on this device for this session. Account keeps it beyond that.
          </p>
        ) : null}
        <p className="text-center text-sm text-white/35 mt-6">
          Already have an account?{" "}
          <Link href="/sign-in?from=first-experience" className="text-white/70 underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </Shell>
  );
}
