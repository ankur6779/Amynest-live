import type { StudyTopic, StudyTopicDraft, SubjectPack } from "../types";
import { AMY_SPEAK_LINES } from "./amy-speak-lines";

export function amySpeakKey(subjectId: string, topicId: string): string {
  return `${subjectId}:${topicId}`;
}

/** Attach kid-friendly `amySpeak` from the global catalog. */
export function enrichTopic(subjectId: string, topic: StudyTopicDraft): StudyTopic {
  const line = AMY_SPEAK_LINES[amySpeakKey(subjectId, topic.id)];
  if (!line?.trim()) {
    throw new Error(`[study-zone] Missing amySpeak for ${subjectId}:${topic.id}`);
  }
  return { ...topic, amySpeak: line };
}

type SubjectPackDraft<TId extends string = string> = Omit<SubjectPack<TId>, "topics"> & {
  topics: StudyTopicDraft[];
};

export function enrichSubjectPack<TId extends string>(pack: SubjectPackDraft<TId>): SubjectPack<TId> {
  return {
    ...pack,
    topics: pack.topics.map((t) => enrichTopic(pack.id, t)),
  };
}

export function enrichSubjectPacks<TId extends string>(packs: SubjectPackDraft<TId>[]): SubjectPack<TId>[] {
  return packs.map(enrichSubjectPack);
}
