/**
 * Score a generated script payload with Studio Quality AI.
 */

import type { GeneratedScriptPayload } from "../../types/content-package.js";
import type { StudioQualityGate, StudioQualityScores } from "../types.js";
import { evaluateStudioQualityGate, STUDIO_QUALITY_THRESHOLD } from "./engine.js";

export function scoreGeneratedPayload(input: {
  payload: GeneratedScriptPayload;
  topicTitle: string;
  category: string;
  featureTitle?: string;
}): StudioQualityScores {
  const { payload } = input;
  const text = [
    payload.hook,
    payload.openingQuestion,
    payload.story,
    payload.cta,
    ...payload.keyPoints,
    payload.voiceScript,
  ].join(" ");

  const hook = clamp(
    62 +
      (payload.hook.length > 18 ? 14 : 0) +
      (/\?|most parents|before your|one habit|changes everything|small change|what if/i.test(
        payload.hook + " " + payload.openingQuestion,
      )
        ? 16
        : 6),
  );

  const retention = clamp(
    74 +
      (payload.keyPoints.length >= 3 ? 10 : 0) +
      (payload.story.length > 40 && payload.story.length < 520 ? 8 : 0) +
      (payload.sceneScript.split("\n").filter(Boolean).length >= 3 ? 6 : 0),
  );

  const ctr = clamp(
    66 +
      (payload.titles.highCtr?.length ? 12 : 6) +
      (payload.hook.length > 12 && payload.hook.length < 110 ? 10 : 0),
  );

  const brand = clamp(
    58 +
      (/amynest/i.test(text) ? 22 : 0) +
      (input.featureTitle &&
      text.toLowerCase().includes(input.featureTitle.toLowerCase().slice(0, 10))
        ? 10
        : 0) +
      (/download|app store|google play|start free|try amynest/i.test(payload.cta)
        ? 10
        : 0),
  );

  const fearPenalty = /failing|shame|scared|ruin|damage your child|worst parent/i.test(text)
    ? 40
    : 0;
  const emotion = clamp(
    74 +
      (/proud|calm|curious|hope|together|joy|confident|gentle|kind/i.test(text)
        ? 14
        : 4) -
      fearPenalty,
  );

  const educationalValue = clamp(
    70 +
      (payload.keyPoints.length >= 3 ? 12 : 0) +
      (/learn|habit|practice|routine|speech|health|play|tip/i.test(text) ? 12 : 0),
  );

  const parentAppeal = clamp(
    72 + (/parent|family|home|tonight|habit|calm/i.test(text) ? 14 : 4),
  );
  const childAppeal = clamp(
    70 + (/child|kid|learner|play|proud|gentle/i.test(text) ? 14 : 4),
  );

  const overall = Math.round(
    hook * 0.18 +
      retention * 0.2 +
      ctr * 0.12 +
      brand * 0.15 +
      emotion * 0.1 +
      educationalValue * 0.1 +
      parentAppeal * 0.08 +
      childAppeal * 0.07,
  );

  return {
    hook: Math.round(hook),
    retention: Math.round(retention),
    ctr: Math.round(ctr),
    brand: Math.round(brand),
    emotion: Math.round(emotion),
    educationalValue: Math.round(educationalValue),
    parentAppeal: Math.round(parentAppeal),
    childAppeal: Math.round(childAppeal),
    overall,
  };
}

export function gateGeneratedPayload(input: {
  payload: GeneratedScriptPayload;
  topicTitle: string;
  category: string;
  featureTitle?: string;
  threshold?: number;
}): StudioQualityGate {
  const scores = scoreGeneratedPayload(input);
  return evaluateStudioQualityGate(scores, input.threshold ?? STUDIO_QUALITY_THRESHOLD);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}
