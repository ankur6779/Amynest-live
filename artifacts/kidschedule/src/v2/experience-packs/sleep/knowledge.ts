/**
 * Sleep Knowledge — optional Phase 2.0 reference implementation.
 * One KnowledgeDefinition for bedtime_resistance. IDs only.
 * Does not change Sleep Domain public APIs or Experience Definition.
 */

import {
  freezeKnowledge,
  type KnowledgeDefinition,
} from "@/v2/parenting-knowledge";
import { SLEEP_SUBDOMAIN_CONTRACTS } from "./domain";

const bedtime = SLEEP_SUBDOMAIN_CONTRACTS.bedtime_resistance;

/**
 * Reference Sleep knowledge entry — structured ids only.
 * Future Sleep knowledge entries follow this shape.
 */
export const SLEEP_KNOWLEDGE_BEDTIME_RESISTANCE: KnowledgeDefinition =
  freezeKnowledge({
    knowledgeId: "knowledge.sleep.bedtime_resistance.v1",
    problemId: bedtime.problemId,
    ageBands: ["age.1_2y", "age.2_3y", "age.3_5y"],
    difficulty: "difficulty.medium",
    rootCauses: [
      "cause.sleep.overstimulation",
      "cause.sleep.inconsistent_cues",
      "cause.sleep.late_bedtime",
    ],
    understanding: [
      "understand.sleep.protest_vs_need",
      "understand.sleep.cue_order",
    ],
    corePrinciples: [
      "principle.sleep.predictable_ritual",
      "principle.sleep.co_regulation",
      "principle.sleep.same_place_same_time",
    ],
    coachObjectives: [
      "objective.sleep.reduce_bedtime_resistance",
      "objective.sleep.establish_wind_down",
    ],
    recommendedActions: [
      "action.sleep.wind_down_20m",
      "action.sleep.same_cue_order",
      "action.sleep.dim_lights",
    ],
    mistakesToAvoid: [
      "mistake.sleep.screen_before_bed",
      "mistake.sleep.inconsistent_bedtime",
      "mistake.sleep.long_negotiations",
    ],
    microTasks: [
      "task.sleep.dim_lights",
      "task.sleep.one_story",
      "task.sleep.consistent_phrase",
    ],
    reflectionQuestions: [
      "reflect.sleep.what_worked_tonight",
      "reflect.sleep.energy_at_bedtime",
    ],
    successSignals: [
      "signal.sleep.shorter_protest",
      "signal.sleep.falls_asleep_faster",
      "signal.sleep.ritual_completed",
    ],
    relatedProblems: [
      SLEEP_SUBDOMAIN_CONTRACTS.routine_building.problemId,
      SLEEP_SUBDOMAIN_CONTRACTS.sleep_anxiety.problemId,
    ],
    contentIds: [...bedtime.contentIds],
    version: "v1",
  });
