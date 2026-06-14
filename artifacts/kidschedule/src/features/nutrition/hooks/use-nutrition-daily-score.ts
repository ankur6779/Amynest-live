import { useCallback, useEffect, useState } from "react";
import { computeNutritionScore } from "@/features/nutrition/lib/nutrition-score";
import {
  persistTodayChecklist,
  readTodayChecklist,
  subscribeNutritionScore,
  toggleChecklistItem,
} from "@/features/nutrition/lib/nutrition-score-storage";
import { enqueueNutritionSync } from "@/features/nutrition/lib/nutrition-sync";
import type { ScoreChecklistId } from "@/features/nutrition/lib/nutrition-score";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";

export interface DailyScoreState {
  ownerChildId: number;
  checkList: Record<string, boolean>;
}

/** Guard: only persist when in-memory checklist belongs to the active child. */
export function shouldPersistDailyScore(
  activeChildId: number | null,
  ownerChildId: number,
): boolean {
  return activeChildId != null && activeChildId === ownerChildId;
}

export function createDailyScoreState(childId: number): DailyScoreState {
  return {
    ownerChildId: childId,
    checkList: readTodayChecklist(childId),
  };
}

export function useNutritionDailyScore() {
  const { childId } = useNutritionContext();
  const resolvedChildId = childId ?? 0;

  const [scoreState, setScoreState] = useState<DailyScoreState>(() =>
    childId ? createDailyScoreState(childId) : { ownerChildId: 0, checkList: {} },
  );

  useEffect(() => {
    if (!childId) {
      setScoreState({ ownerChildId: 0, checkList: {} });
      return;
    }
    setScoreState(createDailyScoreState(childId));
    return subscribeNutritionScore(() => {
      setScoreState((prev) =>
        prev.ownerChildId === childId
          ? { ownerChildId: childId, checkList: readTodayChecklist(childId) }
          : prev,
      );
    });
  }, [childId]);

  useEffect(() => {
    if (!shouldPersistDailyScore(childId, scoreState.ownerChildId)) return;
    persistTodayChecklist(childId!, scoreState.checkList);
    enqueueNutritionSync(childId!);
  }, [childId, scoreState]);

  const toggle = useCallback(
    (id: ScoreChecklistId) => {
      setScoreState((prev) => ({
        ...prev,
        checkList: toggleChecklistItem(prev.checkList, id),
      }));
    },
    [],
  );

  const { score, checked, total } = computeNutritionScore(scoreState.checkList);

  return { checkList: scoreState.checkList, toggle, score, checked, total, childId: resolvedChildId };
}
