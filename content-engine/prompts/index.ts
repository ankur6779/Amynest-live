import type { PromptBlueprint } from "../types/index.js";
import { PROMPT_BLUEPRINTS } from "./blueprints.js";
import {
  getPromptTemplate,
  getPromptTemplatesByFamily,
  PROMPT_LIBRARY,
  resolvePromptFamily,
  type PromptFamily,
  type PromptTemplate,
} from "./library/templates.js";

export { PROMPT_BLUEPRINTS };
export {
  PROMPT_LIBRARY,
  getPromptTemplate,
  getPromptTemplatesByFamily,
  resolvePromptFamily,
  type PromptFamily,
  type PromptTemplate,
};

export function getPromptBlueprint(id: string): PromptBlueprint | undefined {
  return PROMPT_BLUEPRINTS.find((p) => p.id === id);
}

/** Render `{{variable}}` placeholders in prompt templates. */
export function renderPromptTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key] ?? "";
  });
}
