/**
 * Front Door V2 — Sprint 1 foundation only.
 * Breath → Age → Name? → Worry → foundation complete.
 * No Speech try, Today, soft-save, or premium (later sprints).
 */

import { useEffect, useId, useState } from "react";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ensureGuestSession,
  getGuestSession,
  setGuestAgeBand,
  setGuestChildName,
  setGuestWorry,
  type V2GuestSession,
} from "@/v2/guest";
import { shouldEnterFrontDoor } from "@/v2/entry/should-enter-front-door";
import { FRONT_DOOR_AGE_OPTIONS } from "./age-options";
import type { FrontDoorAgeBand, FrontDoorStepId, FrontDoorWorryId } from "./types";
import { FRONT_DOOR_STEP_ORDER } from "./types";
import { FRONT_DOOR_WORRY_OPTIONS } from "./worry-options";

function resumeStep(session: V2GuestSession | null): FrontDoorStepId {
  if (!session) return "breath";
  if (session.foundationComplete || session.worryId) return "foundation_complete";
  if (session.ageBand && session.frontDoorStep === "name") return "name";
  if (session.ageBand) return "name";
  if (session.frontDoorStep === "breath") return "age";
  return "breath";
}

export default function FrontDoorPage() {
  if (!shouldEnterFrontDoor()) {
    return <Redirect to="/" />;
  }

  return <FrontDoorFlow />;
}

function FrontDoorFlow() {
  const [session, setSession] = useState<V2GuestSession | null>(null);
  const [step, setStep] = useState<FrontDoorStepId>("breath");
  const [nameDraft, setNameDraft] = useState("");
  const titleId = useId();

  useEffect(() => {
    const ensured = ensureGuestSession();
    setSession(ensured);
    setStep(resumeStep(ensured));
    setNameDraft(ensured?.childName ?? "");
  }, []);

  const stepIndex = FRONT_DOOR_STEP_ORDER.indexOf(step);

  return (
    <main
      className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-amber-50 via-stone-50 to-sky-50 text-stone-900"
      aria-labelledby={titleId}
    >
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <p className="text-sm font-medium tracking-wide text-stone-500">AmyNest</p>
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-200"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={FRONT_DOOR_STEP_ORDER.length - 1}
          aria-valuenow={Math.max(0, stepIndex)}
          aria-label="Front Door progress"
        >
          <div
            className="h-full rounded-full bg-teal-700 transition-[width] duration-300"
            style={{
              width: `${((Math.max(0, stepIndex) + 1) / FRONT_DOOR_STEP_ORDER.length) * 100}%`,
            }}
          />
        </div>

        <div className="mt-8 flex flex-1 flex-col">
          {step === "breath" && (
            <BreathStep
              titleId={titleId}
              onContinue={() => {
                const next = getGuestSession() ?? ensureGuestSession();
                setSession(next);
                setStep("age");
              }}
            />
          )}
          {step === "age" && (
            <AgeStep
              titleId={titleId}
              selected={session?.ageBand ?? null}
              onSelect={(ageBand) => {
                const next = setGuestAgeBand(ageBand);
                setSession(next);
                setStep("name");
              }}
            />
          )}
          {step === "name" && (
            <NameStep
              titleId={titleId}
              value={nameDraft}
              onChange={setNameDraft}
              onSkip={() => {
                const next = setGuestChildName(null);
                setSession(next);
                setStep("worry");
              }}
              onContinue={() => {
                const next = setGuestChildName(nameDraft);
                setSession(next);
                setStep("worry");
              }}
            />
          )}
          {step === "worry" && (
            <WorryStep
              titleId={titleId}
              childName={session?.childName}
              onSelect={(worryId) => {
                const next = setGuestWorry(worryId);
                setSession(next);
                setStep("foundation_complete");
              }}
            />
          )}
          {step === "foundation_complete" && (
            <FoundationCompleteStep
              titleId={titleId}
              session={session}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function BreathStep({
  titleId,
  onContinue,
}: {
  titleId: string;
  onContinue: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col justify-between gap-8">
      <div className="space-y-4">
        <h1 id={titleId} className="text-3xl font-semibold tracking-tight text-stone-900">
          Take a breath.
        </h1>
        <p className="text-lg leading-relaxed text-stone-600">
          Amy is here with you — no forms, no rush. Just a quiet start for your child.
        </p>
      </div>
      <Button
        type="button"
        size="lg"
        className="h-12 w-full rounded-xl bg-teal-800 text-base text-white hover:bg-teal-900"
        onClick={onContinue}
      >
        I&apos;m ready
      </Button>
    </section>
  );
}

function AgeStep({
  titleId,
  selected,
  onSelect,
}: {
  titleId: string;
  selected: FrontDoorAgeBand | null;
  onSelect: (id: FrontDoorAgeBand) => void;
}) {
  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <h1 id={titleId} className="text-3xl font-semibold tracking-tight">
          How old is your child?
        </h1>
        <p className="text-stone-600">Point at the age that feels right — like choosing a photo.</p>
      </div>
      <ul className="flex flex-col gap-2" role="list">
        {FRONT_DOOR_AGE_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-teal-800 bg-teal-50"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
                onClick={() => onSelect(option.id)}
              >
                <span className="block text-base font-medium text-stone-900">{option.label}</span>
                <span className="block text-sm text-stone-500">{option.hint}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NameStep({
  titleId,
  value,
  onChange,
  onSkip,
  onContinue,
}: {
  titleId: string;
  value: string;
  onChange: (v: string) => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  const inputId = useId();
  return (
    <section className="flex flex-1 flex-col justify-between gap-8">
      <div className="space-y-4">
        <h1 id={titleId} className="text-3xl font-semibold tracking-tight">
          What do you call them?
        </h1>
        <p className="text-stone-600">Optional — a name is a gift if you want to share it.</p>
        <label htmlFor={inputId} className="sr-only">
          Child&apos;s name
        </label>
        <input
          id={inputId}
          type="text"
          autoComplete="nickname"
          maxLength={40}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Child's name"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none ring-teal-800 focus:ring-2"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          className="h-12 w-full rounded-xl bg-teal-800 text-base text-white hover:bg-teal-900"
          onClick={onContinue}
        >
          Continue
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-full text-stone-600"
          onClick={onSkip}
        >
          Skip for now
        </Button>
      </div>
    </section>
  );
}

function WorryStep({
  titleId,
  childName,
  onSelect,
}: {
  titleId: string;
  childName: string | null | undefined;
  onSelect: (id: FrontDoorWorryId) => void;
}) {
  const who = childName?.trim() ? childName.trim() : "your child";
  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <h1 id={titleId} className="text-3xl font-semibold tracking-tight">
          What&apos;s on your mind for {who}?
        </h1>
        <p className="text-stone-600">Choose one true worry — just a chip of truth.</p>
      </div>
      <ul className="flex flex-col gap-2" role="list">
        {FRONT_DOOR_WORRY_OPTIONS.map((option) => (
          <li key={option.id}>
            <button
              type="button"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-left text-base font-medium text-stone-900 hover:border-stone-300"
              onClick={() => onSelect(option.id)}
            >
              {option.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FoundationCompleteStep({
  titleId,
  session,
}: {
  titleId: string;
  session: V2GuestSession | null;
}) {
  const who = session?.childName?.trim() || "your child";
  return (
    <section className="flex flex-1 flex-col justify-between gap-8">
      <div className="space-y-4">
        <h1 id={titleId} className="text-3xl font-semibold tracking-tight">
          Amy heard you.
        </h1>
        <p className="text-lg leading-relaxed text-stone-600">
          You shared what matters for {who}. The next moment — Amy&apos;s first truth and a gentle try —
          arrives in a later release. Nothing here changed your existing AmyNest account or premium.
        </p>
        <p className="text-sm text-stone-500">
          Sprint 1 foundation complete. Turn flags off anytime to return to the classic entry.
        </p>
      </div>
    </section>
  );
}
