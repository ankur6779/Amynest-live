import type {
  DeadLetterRecord,
  PublishingErrorCode,
  RetryAttempt,
} from "../../types/published-video.js";
import {
  isPublishingError,
  toPublishingError,
} from "../youtube/errors.js";

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  deadLetterEnabled: boolean;
}

export interface RetryResult<T> {
  value?: T;
  attempts: RetryAttempt[];
  deadLetter?: DeadLetterRecord;
  failures: number;
}

export async function withRetries<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy,
  context: {
    idempotencyKey: string;
    renderPackageId: string;
    sleep?: (ms: number) => Promise<void>;
  },
): Promise<RetryResult<T>> {
  const attempts: RetryAttempt[] = [];
  const sleep = context.sleep ?? defaultSleep;
  let failures = 0;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      const value = await operation();
      return { value, attempts, failures };
    } catch (error) {
      failures += 1;
      const pubErr = toPublishingError(error);
      const delayMs = computeBackoff(attempt, policy.baseDelayMs, policy.maxDelayMs);
      attempts.push({
        attempt: attempt + 1,
        at: new Date().toISOString(),
        errorCode: pubErr.code,
        message: pubErr.message,
        delayMs,
      });

      const retryable = isPublishingError(error)
        ? error.retryable
        : pubErr.retryable;
      if (!retryable || attempt >= policy.maxRetries) {
        const deadLetter = policy.deadLetterEnabled
          ? buildDeadLetter({
              idempotencyKey: context.idempotencyKey,
              renderPackageId: context.renderPackageId,
              attempts,
              errorCode: pubErr.code,
              message: pubErr.message,
            })
          : undefined;
        return { attempts, deadLetter, failures };
      }
      await sleep(delayMs);
    }
  }

  return { attempts, failures };
}

export function computeBackoff(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(exp * 0.1)));
  return Math.min(maxDelayMs, exp + jitter);
}

function buildDeadLetter(input: {
  idempotencyKey: string;
  renderPackageId: string;
  attempts: RetryAttempt[];
  errorCode: PublishingErrorCode;
  message: string;
}): DeadLetterRecord {
  return {
    id: `dlq_${input.idempotencyKey.slice(0, 16)}`,
    idempotencyKey: input.idempotencyKey,
    renderPackageId: input.renderPackageId,
    failedAt: new Date().toISOString(),
    lastError: input.message,
    errorCode: input.errorCode,
    retryHistory: [...input.attempts],
  };
}

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
