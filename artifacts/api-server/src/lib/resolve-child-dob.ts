import { resolveChildDob as resolveFromEducationStages } from "@workspace/education-stages";

export type ChildDobInput = {
  dob?: string | null;
  age?: number | null;
  ageMonths?: number | null;
  selectedAgeBand?: string | null;
};

export function resolveChildDobForApi(child: ChildDobInput): string {
  return resolveFromEducationStages(child);
}
