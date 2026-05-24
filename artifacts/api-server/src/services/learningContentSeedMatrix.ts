type AiContentNamespace =
  | "smart_study"
  | "smart_math_tricks"
  | "olympiad"
  | "spelling"
  | "phonics"
  | "life_skills";

function buildSeedLookupKey(
  namespace: AiContentNamespace,
  parts: Record<string, string | number | boolean>,
): string {
  const seg = Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(":");
  return `${namespace}:${seg}`;
}
import type { Level, SmartSubjectId } from "@workspace/study-zone";
import type { OlympiadAgeBand, OlympiadSubject } from "@workspace/olympiad";
import type { LifeSkillAgeBand } from "@workspace/life-skills";

export type SeedSectionJob = {
  section: AiContentNamespace;
  lookupKey: string;
  params: Record<string, unknown>;
  label: string;
};

/** Focused matrix — enough for ~1 week of load-more at 2 items/day per key. */
export function buildWeeklySeedMatrix(): SeedSectionJob[] {
  const jobs: SeedSectionJob[] = [];

  for (const age of ["4-6", "6-8"] as const) {
    jobs.push({
      section: "smart_math_tricks",
      lookupKey: buildSeedLookupKey("smart_math_tricks", { age }),
      params: { age },
      label: `math-tricks/${age}`,
    });
  }

  const spellingAges = ["2-4", "4-6", "6-8", "8-10+"] as const;
  const difficulties = ["easy", "medium", "hard"] as const;
  for (const age of spellingAges) {
    for (const difficulty of difficulties) {
      jobs.push({
        section: "spelling",
        lookupKey: buildSeedLookupKey("spelling", { age, difficulty }),
        params: { age, difficulty },
        label: `spelling/${age}/${difficulty}`,
      });
    }
  }

  const vowels = ["a", "e", "i", "o", "u"] as const;
  for (let level = 1; level <= 6; level += 1) {
    for (const vowel of vowels) {
      jobs.push({
        section: "phonics",
        lookupKey: buildSeedLookupKey("phonics", { level, vowel }),
        params: { level, vowelFocus: vowel },
        label: `phonics/L${level}/${vowel}`,
      });
    }
  }

  const lifeBands: LifeSkillAgeBand[] = ["toddler", "preschool", "kid", "teen"];
  for (const ageBand of lifeBands) {
    jobs.push({
      section: "life_skills",
      lookupKey: buildSeedLookupKey("life_skills", { ageBand }),
      params: { ageBand },
      label: `life-skills/${ageBand}`,
    });
  }

  const studyLevels = [1, 2, 3, 4] as Level[];
  const studySubjects: SmartSubjectId[] = [
    "addition",
    "subtraction",
    "word-problems",
  ];
  const countries = ["IN", "US"] as const;
  for (const level of studyLevels) {
    for (const subject of studySubjects) {
      for (const country of countries) {
        jobs.push({
          section: "smart_study",
          lookupKey: buildSeedLookupKey("smart_study", {
            level,
            subject,
            country,
          }),
          params: { level, subject, country },
          label: `study/L${level}/${subject}/${country}`,
        });
      }
    }
  }

  const olympiadBands: OlympiadAgeBand[] = ["tiny", "junior", "senior"];
  const olympiadSubjects: OlympiadSubject[] = ["math", "science"];
  for (const ageBand of olympiadBands) {
    for (const subject of olympiadSubjects) {
      for (const country of countries) {
        jobs.push({
          section: "olympiad",
          lookupKey: buildSeedLookupKey("olympiad", {
            ageBand,
            difficulty: "medium",
            subject,
            country,
          }),
          params: {
            ageBand,
            difficulty: "medium",
            subject,
            country,
          },
          label: `olympiad/${ageBand}/${subject}/${country}`,
        });
      }
    }
  }

  return jobs;
}

/** Extract speakable strings for server-side TTS warm (lazy playback on client). */
export function collectTtsTextsFromItems(
  section: AiContentNamespace,
  items: unknown[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const text = raw.trim();
    if (text.length < 2 || text.length > 4000 || seen.has(text)) return;
    seen.add(text);
    out.push(text);
  };

  for (const item of items) {
    if (section === "phonics") {
      if (typeof item === "string") push(item);
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;

    switch (section) {
      case "smart_math_tricks":
        push(row.audioText);
        break;
      case "spelling":
        push(row.word);
        break;
      case "smart_study":
      case "olympiad":
        push(row.q ?? row.question);
        break;
      case "life_skills": {
        const title = row.title as { en?: string } | undefined;
        const desc = row.description as { en?: string } | undefined;
        push(title?.en);
        if (desc?.en && desc.en !== title?.en) push(desc.en);
        break;
      }
      default:
        break;
    }
  }

  return out;
}
