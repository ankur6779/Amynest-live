import { useEffect, useMemo, useState, type ReactNode } from "react";
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

type FeRoom =
  | "welcome"
  | "discovery-name"
  | "discovery-age"
  | "discovery-today"
  | "working"
  | "reveal"
  | "doing"
  | "done"
  | "memory"
  | "keep";

function Shell({
  children,
  room,
  answered,
}: {
  children: ReactNode;
  room: FeRoom;
  answered?: boolean;
}) {
  return (
    <div
      data-testid="first-experience-root"
      data-fe-room={room}
      data-fe-answered={answered ? "true" : "false"}
      className="fe-shell min-h-[100dvh] text-white flex flex-col relative overflow-hidden"
    >
      <style>{`
        .fe-shell {
          background: linear-gradient(175deg, #05040c 0%, #0c0818 50%, #04020a 100%);
        }
        .fe-light {
          position: absolute;
          inset: -20%;
          pointer-events: none;
          z-index: 0;
          transition: opacity 1.1s ease, transform 1.4s cubic-bezier(0.22,1,0.36,1), filter 1.1s ease, background 1.2s ease;
        }
        .fe-light-a {
          background: radial-gradient(ellipse 55% 45% at 50% 28%, rgba(120,70,200,0.18) 0%, transparent 62%);
          animation: feBreatheA 14s ease-in-out infinite;
        }
        .fe-light-b {
          background: radial-gradient(ellipse 70% 50% at 50% 70%, rgba(40,20,80,0.22) 0%, transparent 68%);
          animation: feBreatheB 18s ease-in-out infinite;
        }
        @keyframes feBreatheA {
          0%, 100% { opacity: 0.55; transform: scale(1) translate3d(0,0,0); }
          50% { opacity: 0.85; transform: scale(1.04) translate3d(0,-1.2%,0); }
        }
        @keyframes feBreatheB {
          0%, 100% { opacity: 0.45; transform: scale(1.02) translate3d(0,0,0); }
          50% { opacity: 0.7; transform: scale(1) translate3d(0,1%,0); }
        }
        /* Room light shifts — conversational discovery, quieter completion */
        .fe-shell[data-fe-room="welcome"] .fe-light-a { opacity: 0.7; filter: saturate(1); }
        .fe-shell[data-fe-room="discovery-name"] .fe-light-a {
          background: radial-gradient(ellipse 50% 42% at 46% 26%, rgba(150,90,210,0.19) 0%, transparent 64%);
        }
        .fe-shell[data-fe-room="discovery-age"] .fe-light-a {
          background: radial-gradient(ellipse 52% 44% at 54% 28%, rgba(140,95,215,0.21) 0%, transparent 63%);
        }
        .fe-shell[data-fe-room="discovery-today"] .fe-light-a {
          background: radial-gradient(ellipse 54% 46% at 50% 30%, rgba(160,100,220,0.22) 0%, transparent 62%);
        }
        .fe-shell[data-fe-answered="true"] .fe-light-a {
          filter: saturate(1.06) brightness(1.04);
        }
        .fe-shell[data-fe-answered="true"] .fe-light-b {
          opacity: 0.58;
        }
        .fe-shell[data-fe-room="working"] .fe-light-a {
          background: radial-gradient(ellipse 48% 40% at 50% 32%, rgba(100,80,190,0.22) 0%, transparent 60%);
          animation-duration: 10s;
        }
        .fe-shell[data-fe-room="reveal"] .fe-light-a {
          background: radial-gradient(ellipse 52% 44% at 50% 30%, rgba(180,110,220,0.24) 0%, transparent 62%);
          filter: saturate(1.08);
        }
        .fe-shell[data-fe-room="doing"] .fe-light-a { opacity: 0.5; filter: saturate(0.92); }
        .fe-shell[data-fe-room="done"] .fe-light-a,
        .fe-shell[data-fe-room="done"] .fe-light-b {
          opacity: 0.28 !important;
          filter: saturate(0.75) brightness(0.9);
          animation-duration: 22s;
        }
        .fe-shell[data-fe-room="memory"] .fe-light-a {
          background: radial-gradient(ellipse 55% 45% at 50% 34%, rgba(110,80,170,0.16) 0%, transparent 64%);
        }
        .fe-shell[data-fe-room="keep"] .fe-light-a {
          background: radial-gradient(ellipse 50% 42% at 50% 30%, rgba(130,90,190,0.17) 0%, transparent 62%);
        }

        @keyframes feSettle {
          from { opacity: 0; filter: blur(6px); transform: translate3d(0, 10px, 0); }
          to { opacity: 1; filter: blur(0); transform: translate3d(0, 0, 0); }
        }
        @keyframes feSoftIn {
          from { opacity: 0; transform: translate3d(0, 6px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        @keyframes feSignalAssemble {
          from { opacity: 0; filter: blur(4px); transform: translate3d(0, 8px, 0) scale(0.985); }
          to { opacity: 1; filter: blur(0); transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes feRevealEarned {
          0% { opacity: 0; filter: blur(8px); transform: translate3d(0, 14px, 0) scale(0.98); }
          55% { opacity: 1; filter: blur(0); transform: translate3d(0, 0, 0) scale(1.005); }
          100% { opacity: 1; filter: blur(0); transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes feSurfaceIdle {
          0%, 100% { box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 28px rgba(0,0,0,0.18); }
          50% { box-shadow: 0 1px 0 rgba(255,255,255,0.055) inset, 0 12px 34px rgba(0,0,0,0.22); }
        }
        @keyframes feExhale {
          from { opacity: 0; filter: blur(4px); transform: translate3d(0, 6px, 0); }
          to { opacity: 1; filter: blur(0); transform: translate3d(0, 0, 0); }
        }

        .fe-in { animation: feSoftIn 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .fe-title {
          animation: feSettle 0.42s cubic-bezier(0.22,1,0.36,1) both;
          will-change: opacity, transform, filter;
        }
        .fe-kicker {
          animation: feSoftIn 0.38s 0.04s cubic-bezier(0.22,1,0.36,1) both;
        }
        .fe-body {
          animation: feSoftIn 0.42s 0.08s cubic-bezier(0.22,1,0.36,1) both;
        }
        .fe-reveal {
          animation: feRevealEarned 0.72s cubic-bezier(0.22,1,0.36,1) both;
        }
        .fe-reveal-delay {
          animation: feRevealEarned 0.78s 0.12s cubic-bezier(0.22,1,0.36,1) both;
        }
        .fe-exhale {
          animation: feExhale 0.7s cubic-bezier(0.22,1,0.36,1) both;
        }
        .fe-signal {
          animation: feSignalAssemble 0.55s cubic-bezier(0.22,1,0.36,1) both;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 28px rgba(0,0,0,0.2);
        }

        .fe-surface {
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.025) 100%);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px rgba(0,0,0,0.2);
          animation: feSurfaceIdle 7.5s ease-in-out infinite;
          transition: border-color 0.35s ease, background 0.35s ease, box-shadow 0.35s ease, transform 0.25s ease;
        }
        .fe-surface:focus-within {
          border-color: rgba(255,255,255,0.28);
          box-shadow: 0 1px 0 rgba(255,255,255,0.07) inset, 0 14px 36px rgba(0,0,0,0.28);
        }

        .fe-btn {
          min-height: 52px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 16px;
          position: relative;
          transition:
            transform 0.16s cubic-bezier(0.22,1,0.36,1),
            box-shadow 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            opacity 0.2s ease;
          will-change: transform;
        }
        .fe-btn:active:not(:disabled) {
          transform: scale(0.975) translateY(1px);
        }
        .fe-btn-primary {
          background: linear-gradient(180deg, #ffffff 0%, #f0eaf8 100%);
          color: #12081f;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.85) inset,
            0 10px 28px rgba(0,0,0,0.35),
            0 2px 0 rgba(255,255,255,0.08);
        }
        .fe-btn-primary:hover:not(:disabled) {
          background: linear-gradient(180deg, #ffffff 0%, #f7f3fc 100%);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.95) inset,
            0 14px 34px rgba(0,0,0,0.38),
            0 2px 0 rgba(255,255,255,0.1);
        }
        .fe-btn-primary:active:not(:disabled) {
          box-shadow:
            0 1px 0 rgba(255,255,255,0.55) inset,
            0 4px 14px rgba(0,0,0,0.32);
        }
        .fe-btn-primary:disabled {
          opacity: 0.42;
          box-shadow: none;
          transform: none;
        }
        .fe-btn-quiet {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.14);
          color: rgba(255,255,255,0.92);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 22px rgba(0,0,0,0.18);
        }
        .fe-btn-quiet:hover {
          border-color: rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.07);
        }
        .fe-btn-quiet:active {
          box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 3px 12px rgba(0,0,0,0.22);
        }

        .fe-choice {
          text-align: left;
          width: 100%;
          border-radius: 14px;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.11);
          background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          color: #fff;
          min-height: 56px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 22px rgba(0,0,0,0.16);
          transition:
            transform 0.18s cubic-bezier(0.22,1,0.36,1),
            border-color 0.3s ease,
            background 0.3s ease,
            box-shadow 0.3s ease;
        }
        .fe-choice:hover {
          border-color: rgba(255,255,255,0.22);
          transform: translateY(-1px);
        }
        .fe-choice:active {
          transform: scale(0.985) translateY(0);
        }
        .fe-choice[data-active="true"] {
          border-color: rgba(255,255,255,0.5);
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.1) inset,
            0 0 0 1px rgba(255,255,255,0.06),
            0 14px 32px rgba(0,0,0,0.28);
        }

        .fe-panel {
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.1);
          background: linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.02) 100%);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 36px rgba(0,0,0,0.22);
          animation: feSurfaceIdle 8s ease-in-out infinite;
        }

        .fe-content { position: relative; z-index: 1; }

        @media (prefers-reduced-motion: reduce) {
          .fe-light-a, .fe-light-b, .fe-surface, .fe-panel { animation: none !important; }
          .fe-in, .fe-title, .fe-kicker, .fe-body, .fe-signal, .fe-reveal, .fe-reveal-delay, .fe-exhale {
            animation: none !important;
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
          }
          .fe-btn:active:not(:disabled), .fe-choice:active, .fe-choice:hover { transform: none !important; }
        }
      `}</style>
      <div className="fe-light fe-light-a" aria-hidden="true" />
      <div className="fe-light fe-light-b" aria-hidden="true" />
      <div className="fe-content flex-1 flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
        }, 620);
      }
    }, 980);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  if (state.step === "welcome") {
    return (
      <Shell room="welcome">
        <div className="fe-in flex-1 flex flex-col justify-center text-center">
          <p className="fe-kicker text-[11px] tracking-[0.22em] uppercase text-white/40 mb-6">AmyNest</p>
          <h1 className="fe-title text-[2rem] sm:text-[2.35rem] font-semibold leading-tight tracking-tight mb-4">
            Begin with today
          </h1>
          <p className="fe-body text-white/60 text-base leading-relaxed mb-10">
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
      <Shell room="discovery-name" answered={Boolean(nameDraft.trim())}>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="fe-kicker text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">1 of 3</p>
          <h1 className="fe-title text-2xl font-semibold mb-2">Child’s first name</h1>
          <p className="fe-body text-white/55 text-sm mb-6">
            Used only to personalize today’s next step. Nothing else is assumed.
          </p>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="e.g. Aria"
            autoFocus
            data-testid="fe-child-name"
            className="fe-surface w-full rounded-2xl px-4 py-3.5 bg-transparent border-white/15 text-white placeholder:text-white/30 outline-none mb-6"
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
      <Shell room="discovery-age" answered={Boolean(state.ageBand)}>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="fe-kicker text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">2 of 3</p>
          <h1 className="fe-title text-2xl font-semibold mb-2">
            How old is {state.childName || "your child"}?
          </h1>
          <p className="fe-body text-white/55 text-sm mb-6">
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
      <Shell room="discovery-today" answered={Boolean(state.todayContext)}>
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="fe-kicker text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">3 of 3</p>
          <h1 className="fe-title text-2xl font-semibold mb-2">What kind of day is today?</h1>
          <p className="fe-body text-white/55 text-sm mb-6">
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
      <Shell room="working">
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="fe-kicker text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">Working</p>
          <h1 className="fe-title text-2xl font-semibold mb-6">Forming today’s next right thing</h1>
          <ul className="space-y-3">
            {workingSignals.map((line, idx) => {
              const visible = idx < workingIndex;
              return (
                <li
                  key={line}
                  className={`rounded-xl px-4 py-3 border text-sm ${
                    visible
                      ? "fe-signal border-white/20 bg-white/6 text-white/90"
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
      <Shell room="reveal">
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="fe-kicker text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">
            Today’s next right thing
          </p>
          <h1 className="fe-reveal text-[1.75rem] font-semibold leading-snug mb-3">{state.nextThing.title}</h1>
          <p className="fe-reveal-delay text-white/65 text-base leading-relaxed mb-4">{state.nextThing.detail}</p>
          <p className="fe-body text-white/40 text-sm mb-8">About {state.nextThing.minutes} minutes</p>
          <div className="fe-panel rounded-2xl p-4 mb-8">
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
      <Shell room="doing">
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="fe-kicker text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">In progress</p>
          <h1 className="fe-title text-2xl font-semibold mb-3">{state.nextThing.title}</h1>
          <p className="fe-body text-white/60 mb-10">{state.nextThing.detail}</p>
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
      <Shell room="done">
        <div className="fe-exhale flex-1 flex flex-col justify-center text-center">
          <h1 className="fe-title text-2xl font-semibold mb-3">Done for this moment</h1>
          <p className="fe-body text-white/60 mb-10 leading-relaxed">
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
      <Shell room="memory">
        <div className="fe-in flex-1 flex flex-col justify-center">
          <p className="fe-kicker text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">Memory</p>
          <h1 className="fe-title text-2xl font-semibold mb-3">Tomorrow can start from here</h1>
          <p className="fe-body text-white/60 leading-relaxed mb-10">
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
    <Shell room="keep">
      <div className="fe-in flex-1 flex flex-col justify-center">
        <p className="fe-kicker text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">Keep</p>
        <h1 className="fe-title text-2xl font-semibold mb-3">Keep today’s progress</h1>
        <p className="fe-body text-white/60 leading-relaxed mb-6">
          Create an account to keep today’s progress, tomorrow’s plan, and{" "}
          {state.childName || "your child"}’s growing understanding.
        </p>
        <p className="fe-body text-white/40 text-sm mb-8">
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
