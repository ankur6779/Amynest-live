import type { AgeGroup, Topic, TopicCategory, VideoStyle } from "../types/index.js";
import { TOPIC_DATABASE, TOPIC_COUNT } from "./database.js";

export { TOPIC_DATABASE, TOPIC_COUNT };

export function getAllTopics(): readonly Topic[] {
  return TOPIC_DATABASE;
}

export function getTopicById(id: string): Topic | undefined {
  return TOPIC_DATABASE.find((t) => t.id === id);
}

export function getTopicsByCategory(category: TopicCategory): Topic[] {
  return TOPIC_DATABASE.filter((t) => t.category === category);
}

export function getTopicsByAgeGroup(ageGroup: AgeGroup): Topic[] {
  return TOPIC_DATABASE.filter(
    (t) => t.ageGroup === ageGroup || t.ageGroup === "all",
  );
}

export function getTopicsByVideoStyle(videoStyle: VideoStyle): Topic[] {
  return TOPIC_DATABASE.filter((t) => t.videoStyle === videoStyle);
}

export function listCategoriesPresent(): TopicCategory[] {
  return [...new Set(TOPIC_DATABASE.map((t) => t.category))];
}
