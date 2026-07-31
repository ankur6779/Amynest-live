/**
 * Keeps Learning Runtime snapshots warm from Global Child Profile + Skill Registry.
 * No UI. Mount once near GrowthBootstrap.
 */

import { useEffect } from "react";
import { useListChildren, getListChildrenQueryKey } from "@workspace/api-client-react";
import type { RuntimeSkillEntry } from "@workspace/learning-runtime";
import { useLearningProgress } from "@/hooks/use-learning-progress";
import {
  setLearningRuntimeProfileProvider,
  setLearningRuntimeSkillsProvider,
} from "@/lib/learning-runtime-bridge";

type ChildRow = {
  id: number;
  name?: string;
  age?: number;
  ageMonths?: number;
};

const profileCache = new Map<number, NonNullable<ReturnType<typeof buildProfile>>>();
const skillsCache = new Map<number, RuntimeSkillEntry[]>();

function buildProfile(child: ChildRow, isPremium?: boolean) {
  return {
    id: child.id,
    name: child.name,
    age: child.age,
    ageMonths: child.ageMonths,
    isPremium,
  };
}

function installProviders(): void {
  setLearningRuntimeProfileProvider((childId) => profileCache.get(childId) ?? null);
  setLearningRuntimeSkillsProvider((childId) => skillsCache.get(childId) ?? null);
}

function SnapshotChildSync({ child }: { child: ChildRow }) {
  const { phase3, isPremium, child: progressChild } = useLearningProgress(child.id);

  useEffect(() => {
    const age = progressChild?.age ?? child.age;
    const ageMonths = progressChild?.ageMonths ?? child.ageMonths;
    profileCache.set(
      child.id,
      buildProfile(
        {
          id: child.id,
          name: progressChild?.name ?? child.name,
          age,
          ageMonths,
        },
        isPremium,
      ),
    );

    const entries = phase3?.skillGraph ?? [];
    if (entries.length) {
      skillsCache.set(
        child.id,
        entries.map(
          (e): RuntimeSkillEntry => ({
            skillId: e.skillId,
            mastery: e.mastery,
            confidence: e.confidence,
            progressionStage: e.progressionStage,
            weakAreas: e.weakAreas,
          }),
        ),
      );
    }
    installProviders();
  }, [child.age, child.ageMonths, child.id, child.name, isPremium, phase3?.skillGraph, progressChild]);

  return null;
}

export function LearningPlatformSnapshotHost() {
  const { data: children = [] } = useListChildren({
    query: { queryKey: getListChildrenQueryKey() },
  });
  const list = children as ChildRow[];

  useEffect(() => {
    installProviders();
    return () => {
      setLearningRuntimeProfileProvider(null);
      setLearningRuntimeSkillsProvider(null);
    };
  }, []);

  // Warm first few children — covers active profile without mounting every row forever.
  return (
    <>
      {list.slice(0, 3).map((c) => (
        <SnapshotChildSync key={c.id} child={c} />
      ))}
    </>
  );
}
