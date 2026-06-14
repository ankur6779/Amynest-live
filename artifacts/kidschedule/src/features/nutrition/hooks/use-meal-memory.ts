import { useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useNutritionContext } from "@/features/nutrition/context/nutrition-context";
import {
  hydrateMealMemory,
  loadMealMemoryEntries,
  subscribeMealMemory,
} from "@/features/nutrition/lib/nutrition-memory-sync";
import type { MealMemoryEntry } from "@/features/nutrition/lib/nutrition-memory";

export function useMealMemory() {
  const { childId } = useNutritionContext();
  const authFetch = useAuthFetch();
  const [entries, setEntries] = useState<MealMemoryEntry[]>(() =>
    childId ? loadMealMemoryEntries(childId) : [],
  );

  useEffect(() => {
    if (!childId) {
      setEntries([]);
      return;
    }
    setEntries(loadMealMemoryEntries(childId));
    return subscribeMealMemory(() => setEntries(loadMealMemoryEntries(childId)));
  }, [childId]);

  useEffect(() => {
    if (!childId) return;
    void hydrateMealMemory(childId, authFetch).then(setEntries);
  }, [childId, authFetch]);

  return { entries, childId };
}
