import type {
  AmyMemoryMutable,
  AmyMemorySectionId,
  AmyMemorySectionMetaMutable,
} from "./types";

export function createSectionMeta(
  source: string,
  at: string,
  version = 1,
): AmyMemorySectionMetaMutable {
  return { source, updatedAt: at, version };
}

export function stampSectionMeta(
  doc: AmyMemoryMutable,
  section: AmyMemorySectionId,
  source: string,
  at: string,
): void {
  const current = doc[section].meta;
  doc[section].meta = {
    source,
    updatedAt: at,
    version: (current?.version ?? 0) + 1,
  };
}
