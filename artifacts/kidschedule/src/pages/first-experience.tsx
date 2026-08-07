import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  buildWorkingSignals,
  decideFirstExperienceNextThing,
} from "@/lib/first-experience/decide-next";
import {
  buildContinuityFromState,
  saveFirstExperienceContinuity,
} from "@/lib/first-experience/continuity";
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
import "./first-experience-material.css";

const AGE_OPTIONS: { id: FirstExperienceAgeBand; label: string }[] = [
  { id: "0-2", label: "0–2" },
  { id: "2-4", label: "2–4" },
  { id: "5-7", label: "5–7" },
  { id: "8-10", label: "8–10+" },
];

const TODAY_OPTIONS: { id: FirstExperienceTodayContext; label: string }[] = [
  { id: "school", label: "School / care" },
  { id: "home", label: "Home day" },
  { id: "unsure", label: "Not sure" },
];

type FePresence = "idle" | "acknowledge" | "grow" | "settle" | "exhale";

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

type FeShot = "arrival" | "relationship" | "growing" | "transition" | "reflection";

/**
 * One soft-morning home. One continuous day.
 * Never repeat focal length. Never repeat eye level.
 * One visual variable changes per cut.
 */
const SHOTS: Record<
  "welcome" | "discovery-name" | "discovery-age" | "discovery-today" | "working",
  {
    src: string;
    alt: string;
    shot: FeShot;
    focalLength: string;
    eyeLevel: string;
    light: string;
    changes: string;
    whyNext: string;
  }
> = {
  welcome: {
    shot: "arrival",
    src: "/experience/r1/shot-01-arrival.png",
    alt: "Hallway — arrive into one soft morning home",
    focalLength: "35mm",
    eyeLevel: "standing",
    light: "soft morning — light at the far living-room doorway",
    changes: "distance",
    whyNext: "Arrive in the hallway. Same house begins.",
  },
  "discovery-name": {
    shot: "relationship",
    src: "/experience/r1/shot-02-relationship.png",
    alt: "Living room — move closer to parent and child, never faces",
    focalLength: "85mm",
    eyeLevel: "shoulder",
    light: "soft morning — same window light from the living room",
    changes: "distance",
    whyNext: "Walk forward into the living room. Closer. Connection.",
  },
  "discovery-age": {
    shot: "growing",
    src: "/experience/r1/shot-03-detail.png",
    alt: "Child corner — look down at shoes on the same oak floor",
    focalLength: "100mm",
    eyeLevel: "floor",
    light: "soft morning — same oak floor, same window family",
    changes: "height",
    whyNext: "Look down in the child corner. Growth as objects.",
  },
  "discovery-today": {
    shot: "transition",
    src: "/experience/r1/shot-04-transition.png",
    alt: "Doorway — turn toward the day’s light",
    focalLength: "50mm",
    eyeLevel: "doorway",
    light: "soft morning — facing the same bright window source",
    changes: "direction",
    whyNext: "Stand and turn toward the day through the doorway.",
  },
  working: {
    shot: "reflection",
    src: "/experience/r1/shot-05-reflection.png",
    alt: "Reading table — sit and notice water, book, morning light",
    focalLength: "70mm",
    eyeLevel: "seated",
    light: "soft morning — same window light, quieter still life",
    changes: "emotion",
    whyNext: "Sit at the reading table. Notice. Then the next right thing.",
  },
};

const SHOT_FLOW = ["welcome", "discovery-name", "discovery-age", "discovery-today", "working"] as const;

function preloadShotSrc(src: string) {
  if (typeof window === "undefined") return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
}

function Shell({
  children,
  room,
  answered,
  memory,
  openingBeat,
  presence = "idle",
  rhythm,
}: {
  children: ReactNode;
  room: FeRoom;
  answered?: boolean;
  memory?: {
    src: string;
    alt: string;
    shot: FeShot;
    focalLength?: string;
    eyeLevel?: string;
    light?: string;
  };
  openingBeat?: boolean;
  /** Emotional micro-moment — room acknowledges without celebration */
  presence?: FePresence;
  rhythm?: FirstExperienceTodayContext;
}) {
  return (
    <div
      data-testid="first-experience-root"
      data-fe-room={room}
      data-fe-shot={memory?.shot ?? "none"}
      data-fe-focal={memory?.focalLength ?? ""}
      data-fe-eye={memory?.eyeLevel ?? ""}
      data-fe-answered={answered ? "true" : "false"}
      data-fe-opening={openingBeat ? "true" : "false"}
      data-fe-presence={presence}
      data-fe-rhythm={rhythm ?? ""}
      className="fe-shell min-h-[100dvh] flex flex-col relative overflow-hidden"
    >
      {memory ? (
        <div className="fe-ambient" aria-hidden="true">
          <img src={memory.src} alt="" decoding="async" fetchPriority="low" />
          <div className="fe-ambient-wash" />
        </div>
      ) : null}
      <div className="fe-breath fe-breath-a" aria-hidden="true" />
      <div className="fe-breath fe-breath-b" aria-hidden="true" />
      <div className="fe-living-shade" aria-hidden="true" />
      <div className="fe-stage">
        <div className="fe-column">
          {memory ? (
            <div className="fe-memory-mount" data-testid="fe-visual-memory" data-fe-shot={memory.shot}>
              <div className="fe-memory-spill" aria-hidden="true" />
              <div className="fe-memory">
                <img
                  src={memory.src}
                  alt={memory.alt}
                  draggable={false}
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="fe-memory-veil" aria-hidden="true" />
                <div className="fe-memory-glass" aria-hidden="true" />
                <div className="fe-memory-grain" aria-hidden="true" />
              </div>
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
    if (state.valueEarned && state.nextThing) {
      const continuity = buildContinuityFromState(state);
      if (continuity) saveFirstExperienceContinuity(continuity);
    }
  }, [state]);

  useEffect(() => {
    trackFtue(state.step);
  }, [state.step]);

  /* Invisible engineering — decode ahead so cuts never wait */
  useEffect(() => {
    const idx = SHOT_FLOW.indexOf(state.step as (typeof SHOT_FLOW)[number]);
    const keys =
      idx < 0
        ? SHOT_FLOW
        : SHOT_FLOW.slice(Math.max(0, idx), Math.min(SHOT_FLOW.length, idx + 3));
    keys.forEach((key) => preloadShotSrc(SHOTS[key].src));
    if (state.step === "welcome") {
      SHOT_FLOW.forEach((key) => preloadShotSrc(SHOTS[key].src));
    }
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
        }, 380);
      }
    }, 720);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step]);

  if (state.step === "welcome") {
    return (
      <Shell room="welcome" memory={SHOTS.welcome} openingBeat presence="idle">
        <div className="fe-copy">
          <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
            ·
          </p>
          <h1 className="fe-title">Begin with today</h1>
          <p className="fe-body">One next right thing — formed only from what you share.</p>
          <div className="fe-actions">
            <button
              type="button"
              className="fe-btn fe-btn-primary"
              data-testid="fe-welcome-continue"
              onClick={() => patch({ step: "discovery-name" })}
            >
              Continue
            </button>
            <button
              type="button"
              className="fe-btn fe-btn-quiet"
              style={{ marginTop: "var(--space-3)" }}
              data-testid="fe-welcome-later"
              onClick={() => setLocation("/welcome")}
            >
              Not now
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "discovery-name") {
    return (
      <Shell
        room="discovery-name"
        answered={Boolean(nameDraft.trim())}
        memory={SHOTS["discovery-name"]}
        presence={nameDraft.trim() ? "acknowledge" : "idle"}
      >
        <div className="fe-copy fe-in">
          <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
            ·
          </p>
          <h1 className="fe-title fe-title-section">Child’s first name</h1>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="e.g. Aria"
            autoFocus
            autoComplete="given-name"
            enterKeyHint="done"
            aria-label="Child’s first name"
            data-testid="fe-child-name"
            className="fe-surface"
            style={{ marginTop: "var(--space-2)", marginBottom: "var(--space-8)" }}
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
      <Shell
        room="discovery-age"
        answered={Boolean(state.ageBand)}
        memory={SHOTS["discovery-age"]}
        presence={state.ageBand ? "grow" : "idle"}
      >
        <div className="fe-copy fe-in">
          <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
            · ·
          </p>
          <h1 className="fe-title fe-title-section">
            How old is {state.childName || "your child"}?
          </h1>
          <div className="fe-choice-grid" style={{ marginTop: "var(--space-2)" }}>
            {AGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="fe-choice"
                data-active={state.ageBand === opt.id}
                data-testid={`fe-age-${opt.id}`}
                onClick={() => patch({ ageBand: opt.id })}
              >
                <span style={{ fontWeight: 500, fontSize: "var(--type-body)" }}>{opt.label}</span>
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
      <Shell
        room="discovery-today"
        answered={Boolean(state.todayContext)}
        memory={SHOTS["discovery-today"]}
        presence={state.todayContext ? "settle" : "idle"}
        rhythm={state.todayContext ?? undefined}
      >
        <div className="fe-copy fe-in">
          <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
            · · ·
          </p>
          <h1 className="fe-title fe-title-section">What kind of day is today?</h1>
          <div className="fe-choice-stack" style={{ marginTop: "var(--space-2)" }}>
            {TODAY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="fe-choice"
                data-active={state.todayContext === opt.id}
                data-testid={`fe-today-${opt.id}`}
                onClick={() => patch({ todayContext: opt.id })}
              >
                <div style={{ fontWeight: 500 }}>{opt.label}</div>
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
              See today’s next step
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "working") {
    return (
      <Shell room="working" memory={SHOTS.working} presence="exhale">
        <div className="fe-copy fe-in">
          <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
            ·
          </p>
          <h1 className="fe-title fe-title-section">Noticing today’s next right thing</h1>
          <ul className="fe-signal-list">
            {workingSignals.map((line, idx) => {
              if (idx >= workingIndex) return null;
              return (
                <li
                  key={line}
                  className="fe-signal"
                  style={{ animationDelay: `${Math.min(idx, 2) * 60}ms` }}
                >
                  {line}
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
          <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
            ·
          </p>
          <h1 className="fe-title fe-reveal">{state.nextThing.title}</h1>
          <p className="fe-body fe-reveal-delay">{state.nextThing.detail}</p>
          <p className="fe-body fe-body-sm" style={{ marginBottom: "var(--space-8)" }}>
            About {state.nextThing.minutes} minutes
          </p>
          <div className="fe-panel" style={{ marginBottom: "var(--space-8)" }}>
            <p className="fe-kicker fe-kicker-whisper" style={{ marginBottom: "var(--space-2)" }} aria-hidden="true">
              ·
            </p>
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
            <button
              type="button"
              className="fe-btn fe-btn-quiet"
              style={{ marginTop: "var(--space-3)" }}
              data-testid="fe-reveal-later"
              onClick={() =>
                patch({
                  step: "memory",
                  valueEarned: true,
                  completionKind: "later",
                  completedAt: null,
                })
              }
            >
              Later
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
          <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
            ·
          </p>
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
                  completionKind: "done",
                })
              }
            >
              Mark as done
            </button>
            <button
              type="button"
              className="fe-btn fe-btn-quiet"
              style={{ marginTop: "var(--space-3)" }}
              data-testid="fe-did-similar"
              onClick={() =>
                patch({
                  step: "done",
                  completedAt: new Date().toISOString(),
                  valueEarned: true,
                  completionKind: "similar",
                })
              }
            >
              I already did something similar
            </button>
            <button
              type="button"
              className="fe-btn fe-btn-quiet"
              style={{ marginTop: "var(--space-3)" }}
              data-testid="fe-doing-later"
              onClick={() =>
                patch({
                  step: "memory",
                  valueEarned: true,
                  completionKind: "later",
                  completedAt: null,
                })
              }
            >
              Not now
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.step === "done") {
    const doneBody =
      state.completionKind === "similar"
        ? `That counts. AmyNest will remember this moment for ${state.childName || "your child"}.`
        : `You completed today’s next right thing for ${state.childName || "your child"}.`;
    return (
      <Shell room="done">
        <div className="fe-copy fe-exhale" style={{ justifyContent: "center", textAlign: "center" }}>
          <h1 className="fe-title fe-title-section">Done for this moment</h1>
          <p className="fe-body">{doneBody}</p>
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
          <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
            ·
          </p>
          <h1 className="fe-title fe-title-section">Tomorrow can start from here</h1>
          <p className="fe-body">
            Today stays with {state.childName || "your child"} on this device. An account keeps the story
            with you — so tomorrow continues naturally, never restarts.
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
        <p className="fe-kicker fe-kicker-whisper" aria-hidden="true">
          ·
        </p>
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
              Today stays on this device.{" "}
              <Link
                href="/welcome"
                className="underline-offset-2 hover:underline"
                style={{ color: "rgba(244,238,230,0.7)" }}
                data-testid="fe-keep-leave"
              >
                Continue without an account
              </Link>
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
