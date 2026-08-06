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
import "./first-experience-material.css";

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
    alt: "Wide hallway in soft morning light — arrival",
    focalLength: "35mm",
    eyeLevel: "standing",
    light: "soft morning — daylight at the far end of the hall",
    changes: "distance",
    whyNext: "We arrive into the house. Wide. Quiet. Nothing asked yet.",
  },
  "discovery-name": {
    shot: "relationship",
    src: "/experience/r1/shot-02-relationship.png",
    alt: "Shoulders and backs in soft morning light — connection",
    focalLength: "85mm",
    eyeLevel: "shoulder",
    light: "same soft morning — inherited from the hall",
    changes: "distance",
    whyNext: "Cut closer. Same morning. We are with them — never faces.",
  },
  "discovery-age": {
    shot: "growing",
    src: "/experience/r1/shot-03-detail.png",
    alt: "Child shoe beside adult shoe — growth as memory",
    focalLength: "100mm",
    eyeLevel: "floor",
    light: "same soft morning — floor shadows from the same window family",
    changes: "height",
    whyNext: "Drop to the floor. Growth lives in objects, not portraits.",
  },
  "discovery-today": {
    shot: "transition",
    src: "/experience/r1/shot-04-transition.png",
    alt: "Doorway and morning light — today’s context",
    focalLength: "50mm",
    eyeLevel: "doorway",
    light: "same soft morning — brighter as we face the source",
    changes: "direction",
    whyNext: "Turn toward the day. The threshold holds today’s context.",
  },
  working: {
    shot: "reflection",
    src: "/experience/r1/shot-05-reflection.png",
    alt: "Water, book, quiet table in soft morning light — reflection",
    focalLength: "70mm",
    eyeLevel: "seated",
    light: "same soft morning — quieter still life near the window",
    changes: "emotion",
    whyNext: "Sit. Soften. Notice. Observation before the next right thing.",
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
  memory?: {
    src: string;
    alt: string;
    shot: FeShot;
    focalLength?: string;
    eyeLevel?: string;
    light?: string;
  };
  openingBeat?: boolean;
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
      className="fe-shell min-h-[100dvh] flex flex-col relative overflow-hidden"
    >
      {memory ? (
        <div className="fe-ambient" aria-hidden="true">
          <img src={memory.src} alt="" />
          <div className="fe-ambient-wash" />
        </div>
      ) : null}
      <div className="fe-breath fe-breath-a" aria-hidden="true" />
      <div className="fe-breath fe-breath-b" aria-hidden="true" />
      <div className="fe-stage">
        <div className="fe-column">
          {memory ? (
            <div className="fe-memory-mount" data-testid="fe-visual-memory" data-fe-shot={memory.shot}>
              <div className="fe-memory-spill" aria-hidden="true" />
              <div className="fe-memory">
                <img src={memory.src} alt={memory.alt} draggable={false} />
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
      <Shell room="welcome" memory={SHOTS.welcome} openingBeat>
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
      <Shell room="discovery-name" answered={Boolean(nameDraft.trim())} memory={SHOTS["discovery-name"]}>
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
      <Shell room="discovery-age" answered={Boolean(state.ageBand)} memory={SHOTS["discovery-age"]}>
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
      <Shell room="discovery-today" answered={Boolean(state.todayContext)} memory={SHOTS["discovery-today"]}>
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
      <Shell room="working" memory={SHOTS.working}>
        <div className="fe-copy fe-in">
          <p className="fe-kicker">Noticing</p>
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
