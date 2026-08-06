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

const MEMORY: Record<
  "welcome" | "discovery-name" | "discovery-age" | "discovery-today" | "working",
  { src: string; alt: string }
> = {
  welcome: {
    src: "/experience/r1/opening.png",
    alt: "Warm living light presence in a quiet night room",
  },
  "discovery-name": {
    src: "/experience/r1/discovery-name.png",
    alt: "Adult hand holding a child’s hand in soft morning light",
  },
  "discovery-age": {
    src: "/experience/r1/discovery-age.png",
    alt: "Child’s shoe beside an adult shoe in quiet morning light",
  },
  "discovery-today": {
    src: "/experience/r1/discovery-today.png",
    alt: "Soft daylight threshold suggesting the kind of day ahead",
  },
  working: {
    src: "/experience/r1/working.png",
    alt: "Quiet room light as today’s decision begins to assemble",
  },
};

function Shell({
  children,
  room,
  answered,
  memory,
  openingBeat,
}: {
  children: ReactNode;
  room: FeRoom;
  answered?: boolean;
  memory?: { src: string; alt: string };
  openingBeat?: boolean;
}) {
  return (
    <div
      data-testid="first-experience-root"
      data-fe-room={room}
      data-fe-answered={answered ? "true" : "false"}
      data-fe-opening={openingBeat ? "true" : "false"}
      className="fe-shell min-h-[100dvh] flex flex-col relative overflow-hidden"
    >
      <style>{`
        .fe-shell {
          color: var(--atmosphere-night-ink);
          background:
            radial-gradient(ellipse 70% 55% at 50% 18%, rgba(184,166,212,0.14) 0%, transparent 58%),
            linear-gradient(175deg, var(--atmosphere-night-bg) 0%, var(--atmosphere-night-bg-mid) 48%, #04020a 100%);
          transition: background var(--dur-room) var(--ease-settle);
        }
        .fe-breath {
          position: absolute;
          inset: -18%;
          pointer-events: none;
          z-index: 0;
          transition: opacity var(--dur-room) ease, background var(--dur-room) ease, filter var(--dur-room) ease;
        }
        .fe-breath-a {
          background: radial-gradient(ellipse 52% 42% at 50% 30%, rgba(184,166,212,0.18) 0%, transparent 64%);
          animation: feBreatheA 14s ease-in-out infinite;
        }
        .fe-breath-b {
          background: radial-gradient(ellipse 72% 50% at 50% 78%, rgba(42,31,51,0.55) 0%, transparent 70%);
          animation: feBreatheB 18s ease-in-out infinite;
        }
        @keyframes feBreatheA {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.88; transform: scale(1.035) translate3d(0,-1%,0); }
        }
        @keyframes feBreatheB {
          0%, 100% { opacity: 0.5; transform: scale(1.02); }
          50% { opacity: 0.72; transform: scale(1); }
        }

        .fe-shell[data-fe-room="welcome"] .fe-breath-a {
          background: radial-gradient(ellipse 48% 40% at 50% 36%, rgba(232,212,184,0.2) 0%, transparent 62%);
        }
        .fe-shell[data-fe-room="discovery-name"] {
          background:
            radial-gradient(ellipse 70% 50% at 46% 20%, rgba(232,212,184,0.14) 0%, transparent 60%),
            linear-gradient(175deg, #0a0810 0%, #141018 50%, #05040c 100%);
        }
        .fe-shell[data-fe-room="discovery-name"] .fe-breath-a {
          background: radial-gradient(ellipse 50% 42% at 44% 28%, rgba(232,212,184,0.18) 0%, transparent 64%);
        }
        .fe-shell[data-fe-room="discovery-age"] {
          background:
            radial-gradient(ellipse 68% 48% at 56% 22%, rgba(196,138,90,0.12) 0%, transparent 60%),
            linear-gradient(175deg, #0b0912 0%, #16121c 50%, #05040c 100%);
        }
        .fe-shell[data-fe-room="discovery-age"] .fe-breath-a {
          background: radial-gradient(ellipse 52% 44% at 58% 30%, rgba(212,160,144,0.16) 0%, transparent 63%);
        }
        .fe-shell[data-fe-room="discovery-today"] {
          background:
            radial-gradient(ellipse 70% 50% at 50% 18%, rgba(107,132,148,0.14) 0%, transparent 58%),
            linear-gradient(175deg, #090c12 0%, #121820 50%, #05040c 100%);
        }
        .fe-shell[data-fe-room="discovery-today"] .fe-breath-a {
          background: radial-gradient(ellipse 54% 46% at 50% 28%, rgba(196,181,216,0.14) 0%, transparent 62%);
        }
        .fe-shell[data-fe-room="working"] .fe-breath-a {
          background: radial-gradient(ellipse 46% 38% at 50% 34%, rgba(196,181,216,0.2) 0%, transparent 60%);
          animation-duration: 10s;
        }
        .fe-shell[data-fe-answered="true"] .fe-breath-a {
          filter: saturate(1.06) brightness(1.05);
        }
        .fe-shell[data-fe-room="reveal"] .fe-breath-a {
          background: radial-gradient(ellipse 52% 44% at 50% 30%, rgba(232,212,184,0.18) 0%, transparent 62%);
        }
        .fe-shell[data-fe-room="done"] .fe-breath-a,
        .fe-shell[data-fe-room="done"] .fe-breath-b {
          opacity: 0.28 !important;
          filter: saturate(0.75) brightness(0.9);
          animation-duration: 22s;
        }

        .fe-stage {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 100dvh;
          padding:
            max(var(--space-5), env(safe-area-inset-top))
            var(--space-5)
            max(var(--space-6), env(safe-area-inset-bottom));
        }
        .fe-column {
          width: 100%;
          max-width: 28rem;
          margin: 0 auto;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .fe-memory {
          position: relative;
          width: 100%;
          flex: 0 0 auto;
          aspect-ratio: 16 / 11;
          max-height: min(34dvh, 280px);
          border-radius: var(--radius-3xl);
          overflow: hidden;
          isolation: isolate;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.08) inset,
            0 24px 64px rgba(0,0,0,0.45);
          animation: feMemoryIn 0.7s var(--ease-settle) both;
        }
        .fe-shell[data-fe-opening="true"] .fe-memory {
          aspect-ratio: 3 / 4;
          max-height: min(52dvh, 440px);
          margin-top: var(--space-4);
        }
        .fe-shell[data-fe-room="working"] .fe-memory {
          aspect-ratio: 16 / 10;
          max-height: min(30dvh, 240px);
        }
        .fe-memory img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 42%;
          display: block;
          transform: scale(1.02);
          filter: saturate(0.96) contrast(1.02);
        }
        .fe-memory-veil {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(5,4,12,0.05) 0%, rgba(5,4,12,0.12) 45%, rgba(5,4,12,0.55) 100%),
            radial-gradient(ellipse 80% 60% at 50% 35%, transparent 30%, rgba(5,4,12,0.28) 100%);
        }
        .fe-memory-glass {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          box-shadow:
            0 1px 0 rgba(255,255,255,0.14) inset,
            0 0 0 1px rgba(255,255,255,0.06) inset;
          background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 42%);
        }
        .fe-memory-edge {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          border: 1px solid var(--glass-stroke);
        }

        @keyframes feMemoryIn {
          from { opacity: 0; filter: blur(8px); transform: translate3d(0, 12px, 0) scale(0.985); }
          to { opacity: 1; filter: blur(0); transform: translate3d(0, 0, 0) scale(1); }
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
          55% { opacity: 1; filter: blur(0); transform: translate3d(0, 0, 0) scale(1.004); }
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

        .fe-copy {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
          padding-top: var(--space-5);
        }
        .fe-choice-grid, .fe-choice-stack, .fe-signal-list {
          flex: 0 0 auto;
        }
        .fe-shell[data-fe-opening="true"] .fe-copy {
          text-align: center;
          justify-content: flex-end;
          padding-top: var(--space-5);
        }
        .fe-shell[data-fe-opening="true"] .fe-kicker {
          animation-delay: 0.28s;
        }
        .fe-shell[data-fe-opening="true"] .fe-title {
          animation-delay: 0.38s;
        }
        .fe-shell[data-fe-opening="true"] .fe-body {
          animation-delay: 0.5s;
        }
        .fe-shell[data-fe-opening="true"] .fe-actions {
          animation: feSoftIn 0.48s 0.68s var(--ease-settle) both;
        }

        .fe-kicker {
          margin: 0 0 var(--space-3);
          font-size: var(--type-micro);
          font-weight: var(--font-semibold);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--atmosphere-night-ink-soft);
          animation: feSoftIn 0.38s 0.04s var(--ease-settle) both;
        }
        .fe-title {
          margin: 0 0 var(--space-4);
          font-size: clamp(1.75rem, 5vw, var(--type-hero));
          font-weight: var(--font-semibold);
          line-height: 1.15;
          letter-spacing: -0.02em;
          color: var(--atmosphere-night-ink);
          animation: feSettle var(--dur-title) var(--ease-settle) both;
        }
        .fe-title-section {
          font-size: clamp(1.35rem, 4vw, var(--type-section));
          letter-spacing: -0.015em;
        }
        .fe-body {
          margin: 0 0 var(--space-6);
          font-size: var(--type-body);
          font-weight: var(--font-regular);
          line-height: 1.5;
          color: rgba(244,238,230,0.68);
          animation: feSoftIn var(--dur-body) 0.08s var(--ease-settle) both;
        }
        .fe-body-sm {
          font-size: var(--type-body-sm);
          color: rgba(244,238,230,0.58);
        }
        .fe-actions {
          margin-top: auto;
          padding-top: var(--space-4);
        }

        .fe-reveal { animation: feRevealEarned var(--dur-reveal) var(--ease-settle) both; }
        .fe-reveal-delay { animation: feRevealEarned 0.78s 0.12s var(--ease-settle) both; }
        .fe-exhale { animation: feExhale 0.7s var(--ease-settle) both; }
        .fe-in { animation: feSoftIn 0.45s var(--ease-settle) both; }

        .fe-signal {
          animation: feSignalAssemble 0.55s var(--ease-settle) both;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: linear-gradient(180deg, var(--glass-fill-strong), var(--glass-fill-bottom));
          border: 1px solid var(--glass-stroke-strong);
          border-radius: var(--radius-lg);
          box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 10px 28px rgba(0,0,0,0.22);
          color: rgba(244,238,230,0.92);
          font-size: var(--type-body-sm);
          padding: var(--space-3) var(--space-4);
        }
        .fe-signal-slot {
          border-radius: var(--radius-lg);
          border: 1px solid transparent;
          padding: var(--space-3) var(--space-4);
          font-size: var(--type-body-sm);
          color: transparent;
          min-height: 48px;
        }

        .fe-surface {
          width: 100%;
          border-radius: var(--radius-lg);
          border: 1px solid var(--glass-stroke);
          background: linear-gradient(180deg, var(--glass-fill-top), var(--glass-fill-bottom));
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 10px 30px rgba(0,0,0,0.2);
          animation: feSurfaceIdle 7.5s ease-in-out infinite;
          color: var(--atmosphere-night-ink);
          font-size: var(--type-body);
          padding: 14px var(--space-4);
          outline: none;
          transition: border-color 0.35s ease, box-shadow 0.35s ease;
        }
        .fe-surface::placeholder { color: rgba(244,238,230,0.3); }
        .fe-surface:focus {
          border-color: var(--glass-stroke-strong);
          box-shadow: 0 1px 0 rgba(255,255,255,0.07) inset, 0 14px 36px rgba(0,0,0,0.28);
        }

        .fe-btn {
          min-height: 52px;
          width: 100%;
          border-radius: var(--radius-lg);
          font-weight: var(--font-bold);
          font-size: var(--type-button);
          position: relative;
          transition:
            transform 0.16s var(--ease-settle),
            box-shadow 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease,
            opacity 0.2s ease;
        }
        .fe-btn:active:not(:disabled) {
          transform: scale(0.975) translateY(1px);
        }
        .fe-btn-primary {
          background: linear-gradient(180deg, #ffffff 0%, var(--color-primary) 100%);
          color: var(--color-primary-ink);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.85) inset,
            0 10px 28px rgba(0,0,0,0.35),
            0 2px 0 rgba(255,255,255,0.08);
        }
        .fe-btn-primary:hover:not(:disabled) {
          box-shadow:
            0 1px 0 rgba(255,255,255,0.95) inset,
            0 14px 34px rgba(0,0,0,0.38);
        }
        .fe-btn-primary:active:not(:disabled) {
          box-shadow: 0 1px 0 rgba(255,255,255,0.55) inset, 0 4px 14px rgba(0,0,0,0.32);
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
          border-radius: var(--radius-md);
          padding: 14px var(--space-4);
          border: 1px solid var(--glass-stroke);
          background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
          color: var(--atmosphere-night-ink);
          min-height: 56px;
          box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 22px rgba(0,0,0,0.16);
          transition:
            transform 0.18s var(--ease-settle),
            border-color 0.3s ease,
            background 0.3s ease,
            box-shadow 0.3s ease;
        }
        .fe-choice:hover {
          border-color: rgba(255,255,255,0.22);
          transform: translateY(-1px);
        }
        .fe-choice:active { transform: scale(0.985) translateY(0); }
        .fe-choice[data-active="true"] {
          border-color: rgba(255,255,255,0.5);
          background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.1) inset,
            0 0 0 1px rgba(255,255,255,0.06),
            0 14px 32px rgba(0,0,0,0.28);
        }

        .fe-panel {
          border-radius: var(--radius-xl);
          border: 1px solid var(--glass-stroke);
          background: linear-gradient(180deg, var(--glass-fill-top), var(--glass-fill-bottom));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 36px rgba(0,0,0,0.22);
          animation: feSurfaceIdle 8s ease-in-out infinite;
          padding: var(--space-4);
        }

        .fe-choice-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
          margin-bottom: var(--space-8);
        }
        .fe-choice-stack {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          margin-bottom: var(--space-8);
        }
        .fe-signal-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        @media (prefers-reduced-motion: reduce) {
          .fe-breath-a, .fe-breath-b, .fe-surface, .fe-panel { animation: none !important; }
          .fe-memory, .fe-kicker, .fe-title, .fe-body, .fe-signal, .fe-reveal, .fe-reveal-delay, .fe-exhale, .fe-in, .fe-actions {
            animation: none !important;
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
          }
          .fe-btn:active:not(:disabled), .fe-choice:active, .fe-choice:hover { transform: none !important; }
        }
      `}</style>
      <div className="fe-breath fe-breath-a" aria-hidden="true" />
      <div className="fe-breath fe-breath-b" aria-hidden="true" />
      <div className="fe-stage">
        <div className="fe-column">
          {memory ? (
            <div className="fe-memory" data-testid="fe-visual-memory">
              <img src={memory.src} alt={memory.alt} draggable={false} />
              <div className="fe-memory-veil" aria-hidden="true" />
              <div className="fe-memory-glass" aria-hidden="true" />
              <div className="fe-memory-edge" aria-hidden="true" />
            </div>
          ) : null}
          {children}
        </div>
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
      <Shell room="welcome" memory={MEMORY.welcome} openingBeat>
        <div className="fe-copy">
          <p className="fe-kicker">AmyNest</p>
          <h1 className="fe-title">Begin with today</h1>
          <p className="fe-body">
            We’ll use only what you share — and your local time — to form one next right thing for your child.
          </p>
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              data-testid="fe-welcome-continue"
              onClick={() => patch({ step: "discovery-name" })}
            >
              Continue
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "discovery-name") {
    return (
      <Shell room="discovery-name" answered={Boolean(nameDraft.trim())} memory={MEMORY["discovery-name"]}>
        <div className="fe-copy fe-in">
          <p className="fe-kicker">1 of 3</p>
          <h1 className="fe-title fe-title-section">Child’s first name</h1>
          <p className="fe-body fe-body-sm">
            Used only to personalize today’s next step. Nothing else is assumed.
          </p>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="e.g. Aria"
            autoFocus
            data-testid="fe-child-name"
            className="fe-surface"
            style={{ marginBottom: "var(--space-6)" }}
          />
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              disabled={!nameDraft.trim()}
              data-testid="fe-name-continue"
              onClick={() => patch({ childName: nameDraft.trim(), step: "discovery-age" })}
            >
              Continue
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "discovery-age") {
    return (
      <Shell room="discovery-age" answered={Boolean(state.ageBand)} memory={MEMORY["discovery-age"]}>
        <div className="fe-copy fe-in">
          <p className="fe-kicker">2 of 3</p>
          <h1 className="fe-title fe-title-section">
            How old is {state.childName || "your child"}?
          </h1>
          <p className="fe-body fe-body-sm">
            Age changes what “next right thing” can mean today.
          </p>
          <div className="fe-choice-grid">
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="fe-choice"
                data-active={state.ageBand === opt.id}
                data-testid={`fe-age-${opt.id}`}
                onClick={() => patch({ ageBand: opt.id })}
              >
                <span style={{ fontWeight: 600, fontSize: "var(--type-body)" }}>{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              disabled={!state.ageBand}
              data-testid="fe-age-continue"
              onClick={() => patch({ step: "discovery-today" })}
            >
              Continue
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "discovery-today") {
    return (
      <Shell room="discovery-today" answered={Boolean(state.todayContext)} memory={MEMORY["discovery-today"]}>
        <div className="fe-copy fe-in">
          <p className="fe-kicker">3 of 3</p>
          <h1 className="fe-title fe-title-section">What kind of day is today?</h1>
          <p className="fe-body fe-body-sm">
            Only this — so today’s step fits the day you actually have.
          </p>
          <div className="fe-choice-stack">
            {TODAY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="fe-choice"
                data-active={state.todayContext === opt.id}
                data-testid={`fe-today-${opt.id}`}
                onClick={() => patch({ todayContext: opt.id })}
              >
                <div style={{ fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: "var(--type-body-sm)", color: "rgba(244,238,230,0.5)", marginTop: 2 }}>
                  {opt.hint}
                </div>
              </button>
            ))}
          </div>
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              disabled={!state.todayContext}
              data-testid="fe-today-continue"
              onClick={() => patch({ step: "working" })}
            >
              Form today’s next step
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "working") {
    return (
      <Shell room="working" memory={MEMORY.working}>
        <div className="fe-copy fe-in">
          <p className="fe-kicker">Working</p>
          <h1 className="fe-title fe-title-section">Forming today’s next right thing</h1>
          <ul className="fe-signal-list">
            {workingSignals.map((line, idx) => {
              const visible = idx < workingIndex;
              return (
                <li
                  key={line}
                  className={visible ? "fe-signal" : "fe-signal-slot"}
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
        <div className="fe-copy fe-in" style={{ justifyContent: "center" }}>
          <p className="fe-kicker">Today’s next right thing</p>
          <h1 className="fe-title fe-reveal">{state.nextThing.title}</h1>
          <p className="fe-body fe-reveal-delay">{state.nextThing.detail}</p>
          <p className="fe-body fe-body-sm" style={{ marginBottom: "var(--space-8)" }}>
            About {state.nextThing.minutes} minutes
          </p>
          <div className="fe-panel" style={{ marginBottom: "var(--space-8)" }}>
            <p className="fe-kicker" style={{ marginBottom: "var(--space-2)" }}>Based only on</p>
            <ul style={{ display: "grid", gap: "var(--space-2)", fontSize: "var(--type-body-sm)", color: "rgba(244,238,230,0.55)" }}>
              {state.nextThing.basedOn.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              data-testid="fe-start-action"
              onClick={() => patch({ step: "doing" })}
            >
              Do this now
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "doing" && state.nextThing) {
    return (
      <Shell room="doing">
        <div className="fe-copy fe-in" style={{ justifyContent: "center" }}>
          <p className="fe-kicker">In progress</p>
          <h1 className="fe-title fe-title-section">{state.nextThing.title}</h1>
          <p className="fe-body">{state.nextThing.detail}</p>
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
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
        </div>
      </Shell>
    );
  }

  if (state.step === "done") {
    return (
      <Shell room="done">
        <div className="fe-copy fe-exhale" style={{ justifyContent: "center", textAlign: "center" }}>
          <h1 className="fe-title fe-title-section">Done for this moment</h1>
          <p className="fe-body">
            You completed today’s next right thing for {state.childName || "your child"}.
          </p>
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              data-testid="fe-done-continue"
              onClick={() => patch({ step: "memory" })}
            >
              Continue
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "memory") {
    return (
      <Shell room="memory">
        <div className="fe-copy fe-in" style={{ justifyContent: "center" }}>
          <p className="fe-kicker">Memory</p>
          <h1 className="fe-title fe-title-section">Tomorrow can start from here</h1>
          <p className="fe-body">
            AmyNest can remember today’s progress for {state.childName || "your child"} — so the next
            right thing gets sharper over time. Nothing is saved to an account until you choose to keep it.
          </p>
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              data-testid="fe-memory-continue"
              onClick={() => patch({ step: "keep" })}
            >
              Continue
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell room="keep">
      <div className="fe-copy fe-in" style={{ justifyContent: "center" }}>
        <p className="fe-kicker">Keep</p>
        <h1 className="fe-title fe-title-section">Keep today’s progress</h1>
        <p className="fe-body">
          Create an account to keep today’s progress, tomorrow’s plan, and{" "}
          {state.childName || "your child"}’s growing understanding.
        </p>
        <p className="fe-body fe-body-sm" style={{ marginBottom: "var(--space-8)" }}>
          Identity protects value. It does not unlock what you already did.
        </p>
        <div className="fe-actions">
          <button
            type="button"
            className="fe-btn fe-btn-primary"
            style={{ marginBottom: "var(--space-3)" }}
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
            className="fe-btn fe-btn-quiet"
            data-testid="fe-keep-later"
            onClick={() => {
              trackFtue("keep_later");
              setKeptLocalNote(true);
            }}
          >
            Not now
          </button>
          {keptLocalNote ? (
            <p
              className="fe-body-sm"
              style={{ marginTop: "var(--space-4)", textAlign: "center", color: "rgba(244,238,230,0.5)" }}
              data-testid="fe-kept-local"
            >
              Today’s progress stays on this device for this session. Account keeps it beyond that.
            </p>
          ) : null}
          <p
            className="fe-body-sm"
            style={{ marginTop: "var(--space-6)", textAlign: "center", color: "rgba(244,238,230,0.35)" }}
          >
            Already have an account?{" "}
            <Link href="/sign-in?from=first-experience" className="underline-offset-2 hover:underline" style={{ color: "rgba(244,238,230,0.7)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </Shell>
  );
}
