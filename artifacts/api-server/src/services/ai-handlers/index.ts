import type { ScheduleItem } from "../../lib/routine-templates.js";
import { unwrapJobPayload } from "../../queue/ai-job-payload.js";
import { handleMealsJob } from "./meals.js";

/** Domain AI jobs (worker only — not openai.chat / tts). */
export async function dispatchAiJob(type: string, payload: unknown): Promise<unknown> {
  const { routeName, input } = unwrapJobPayload(payload);
  console.log("Processing:", routeName);

  if (
    type === "meals.generate" ||
    type === "meals.ai_generate" ||
    type === "meals.week_plan" ||
    type === "meals.family_portions"
  ) {
    return handleMealsJob(type, { routeName, input });
  }

  switch (type) {
    case "routines.generate": {
      const { generateAiRoutine } = await import("../../routes/routines.js");
      return generateAiRoutine(input as Parameters<typeof generateAiRoutine>[0]);
    }
    case "routines.enrich_meals": {
      const { enrichMealOptionsWithAi } = await import("../../routes/routines.js");
      const { getOpenAiClient } = await import("../ai-runtime.js");
      const { db, routinesTable } = await import("@workspace/db");
      const { eq } = await import("drizzle-orm");
      const p = input as {
        routineId: number;
        items: ScheduleItem[];
        ctx: import("../../routes/routines.js").EnrichCtx;
      };
      const openai = await getOpenAiClient();
      const enriched = await enrichMealOptionsWithAi(p.items, p.ctx, openai);
      const changed = enriched.some((it, i) => it.notes !== (p.items[i] as { notes?: string })?.notes);
      if (changed) {
        await db.update(routinesTable).set({ items: enriched }).where(eq(routinesTable.id, p.routineId));
      }
      return { routineId: p.routineId, changed };
    }

    case "spelling.ai_generate": {
      const { runSpellingAiGenerate } = await import("../domain-ai/spelling-runners.js");
      return runSpellingAiGenerate(input as Parameters<typeof runSpellingAiGenerate>[0]);
    }
    case "spelling.tts_prewarm": {
      const { runSpellingTtsPrewarm } = await import("../domain-ai/spelling-runners.js");
      return runSpellingTtsPrewarm(input as Parameters<typeof runSpellingTtsPrewarm>[0]);
    }

    case "smart-study.next_questions": {
      const { runSmartStudyNextQuestions } = await import("../domain-ai/smart-study-runners.js");
      return runSmartStudyNextQuestions(
        input as Parameters<typeof runSmartStudyNextQuestions>[0],
      );
    }

    case "abacus.tutor": {
      const { runAbacusTutor } = await import("../domain-ai/abacus-runners.js");
      return runAbacusTutor(input as Parameters<typeof runAbacusTutor>[0]);
    }

    case "phonics.sound": {
      const { runPhonicsSound } = await import("../domain-ai/phonics-runners.js");
      return runPhonicsSound(input as Parameters<typeof runPhonicsSound>[0]);
    }
    case "phonics.weekly_insight": {
      const { runPhonicsWeeklyInsight } = await import("../domain-ai/phonics-runners.js");
      return runPhonicsWeeklyInsight(
        input as Parameters<typeof runPhonicsWeeklyInsight>[0],
      );
    }

    case "audio-lessons.pregenerate": {
      const { runAudioLessonsPregenerate } = await import("../domain-ai/audio-lessons-runners.js");
      return runAudioLessonsPregenerate(
        input as Parameters<typeof runAudioLessonsPregenerate>[0],
      );
    }

    case "ai-coach.extend": {
      const { runCoachExtend } = await import("../domain-ai/coach-runners.js");
      return runCoachExtend(input as Parameters<typeof runCoachExtend>[0]);
    }
    case "ai-coach.stream_plan": {
      const { runCoachStreamPlan } = await import("../domain-ai/coach-runners.js");
      return runCoachStreamPlan(input as Parameters<typeof runCoachStreamPlan>[0]);
    }
    case "ai-coach.initial_wins": {
      const { runCoachInitialWins } = await import("../domain-ai/coach-runners.js");
      return runCoachInitialWins(input as Parameters<typeof runCoachInitialWins>[0]);
    }
    case "ai-coach.remaining_wins": {
      const { runCoachRemainingWins } = await import("../domain-ai/coach-runners.js");
      return runCoachRemainingWins(
        input as Parameters<typeof runCoachRemainingWins>[0],
      );
    }

    case "explain.narrative": {
      const { runExplainNarrative } = await import("../domain-ai/explain-runners.js");
      return runExplainNarrative(input as Parameters<typeof runExplainNarrative>[0]);
    }

    case "speech.transcribe": {
      const { runSpeechTranscribe } = await import("../domain-ai/speech-runners.js");
      return runSpeechTranscribe(input as Parameters<typeof runSpeechTranscribe>[0]);
    }

    default:
      throw new Error(`unknown_job_type:${type}`);
  }
}
