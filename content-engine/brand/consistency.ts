import { buildStrongerReferenceConditioning } from "./lock.js";
import { getBrandIdentityKit } from "./identity.js";
import type { BrandCharacterId, BrandQualityFinding } from "./types.js";

export type ConsistencyFailureClass =
  | "wrong-mascot"
  | "wrong-child"
  | "identity-drift"
  | "wrong-colors"
  | "logo-redesign"
  | "generic-ai-look"
  | "unknown";

export interface ConsistencyVerdict {
  ok: boolean;
  failureClass?: ConsistencyFailureClass;
  reason: string;
  retryPrompt?: string;
  shouldRetry: boolean;
  maxRetries: number;
}

const DRIFT_PATTERNS: Array<{
  class: ConsistencyFailureClass;
  pattern: RegExp;
}> = [
  {
    class: "logo-redesign",
    pattern: /recreated? (logo|icon)|new app icon|redesigned logo|invented logo/i,
  },
  {
    class: "wrong-mascot",
    pattern: /wrong mascot|random (robot|bird|mascot)|unofficial amy|new character design/i,
  },
  {
    class: "wrong-child",
    pattern: /wrong child|identity drift|different (hair|outfit|hoodie)|redesigned (girl|boy)/i,
  },
  {
    class: "wrong-colors",
    pattern: /wrong Colou?rs|off[- ]brand|not purple|teal primary|orange brand/i,
  },
  {
    class: "generic-ai-look",
    pattern: /generic ai|stock look|inconsistent style|identity drift/i,
  },
  {
    class: "identity-drift",
    pattern: /face changed|proportions wrong|material metallic|furry redesign/i,
  },
];

/**
 * Evaluate provider output metadata / notes for brand identity consistency.
 * On failure, return a stronger reference-conditioning retry prompt.
 */
export function evaluateProviderConsistency(input: {
  notes?: string;
  expectedCharacters?: BrandCharacterId[];
  usedCharacters?: BrandCharacterId[];
  findings?: BrandQualityFinding[];
  attempt?: number;
}): ConsistencyVerdict {
  const maxRetries = 2;
  const attempt = input.attempt ?? 0;
  const hay = [
    input.notes ?? "",
    ...(input.findings ?? []).map((f) => `${f.code} ${f.message}`),
  ].join("\n");

  for (const rule of DRIFT_PATTERNS) {
    if (rule.pattern.test(hay)) {
      return fail(rule.class, `Detected ${rule.class}: ${hay.slice(0, 180)}`, attempt, maxRetries);
    }
  }

  const expected = new Set(input.expectedCharacters ?? []);
  const used = input.usedCharacters ?? [];
  if (expected.size > 0 && used.length > 0) {
    const unexpected = used.filter((id) => !expected.has(id) && id !== "amy-ai");
    if (unexpected.length > 0) {
      return fail(
        "wrong-child",
        `Unexpected character cast: ${unexpected.join(", ")}`,
        attempt,
        maxRetries,
      );
    }
  }

  const kit = getBrandIdentityKit();
  for (const id of used) {
    if (!kit.characters[id]) {
      return fail("wrong-mascot", `Unknown character id ${id}`, attempt, maxRetries);
    }
  }

  return {
    ok: true,
    reason: "Brand consistency OK",
    shouldRetry: false,
    maxRetries,
  };
}

function fail(
  failureClass: ConsistencyFailureClass,
  reason: string,
  attempt: number,
  maxRetries: number,
): ConsistencyVerdict {
  const shouldRetry = attempt < maxRetries;
  return {
    ok: false,
    failureClass,
    reason,
    shouldRetry,
    maxRetries,
    retryPrompt: shouldRetry
      ? buildStrongerReferenceConditioning(`${failureClass}: ${reason}`)
      : undefined,
  };
}

/**
 * Wrap a generation attempt with automatic reject + stronger-conditioning retry.
 */
export async function withBrandConsistencyRetry<T>(options: {
  maxAttempts?: number;
  run: (attempt: number, conditioning?: string) => Promise<T>;
  assess: (result: T, attempt: number) => ConsistencyVerdict;
}): Promise<{ result: T; attempts: number; verdict: ConsistencyVerdict }> {
  const maxAttempts = options.maxAttempts ?? 3;
  let conditioning: string | undefined;
  let lastVerdict: ConsistencyVerdict = {
    ok: false,
    reason: "not started",
    shouldRetry: true,
    maxRetries: maxAttempts - 1,
  };
  let lastResult!: T;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastResult = await options.run(attempt, conditioning);
    lastVerdict = options.assess(lastResult, attempt);
    if (lastVerdict.ok) {
      return { result: lastResult, attempts: attempt + 1, verdict: lastVerdict };
    }
    if (!lastVerdict.shouldRetry) break;
    conditioning = lastVerdict.retryPrompt;
  }

  throw new Error(
    `Brand consistency rejected after retries: ${lastVerdict.failureClass ?? "unknown"} — ${lastVerdict.reason}`,
  );
}
