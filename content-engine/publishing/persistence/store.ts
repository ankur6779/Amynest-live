import type {
  DeadLetterRecord,
  PersistedPublishRecord,
} from "../../types/published-video.js";

export interface PublishPersistenceStore {
  save(record: PersistedPublishRecord): void;
  getByVideoId(videoId: string): PersistedPublishRecord | undefined;
  getByIdempotencyKey(key: string): PersistedPublishRecord | undefined;
  list(): PersistedPublishRecord[];
  saveDeadLetter(record: DeadLetterRecord): void;
  listDeadLetters(): DeadLetterRecord[];
  clear(): void;
}

/** In-memory persistence for published videos and dead-letter records. */
export class InMemoryPublishStore implements PublishPersistenceStore {
  private readonly byVideoId = new Map<string, PersistedPublishRecord>();
  private readonly byIdempotency = new Map<string, PersistedPublishRecord>();
  private readonly deadLetters: DeadLetterRecord[] = [];

  save(record: PersistedPublishRecord): void {
    const clone = structuredClone(record);
    this.byVideoId.set(clone.videoId, clone);
    this.byIdempotency.set(clone.idempotencyKey, clone);
  }

  getByVideoId(videoId: string): PersistedPublishRecord | undefined {
    const record = this.byVideoId.get(videoId);
    return record ? structuredClone(record) : undefined;
  }

  getByIdempotencyKey(key: string): PersistedPublishRecord | undefined {
    const record = this.byIdempotency.get(key);
    return record ? structuredClone(record) : undefined;
  }

  list(): PersistedPublishRecord[] {
    return [...this.byVideoId.values()].map((r) => structuredClone(r));
  }

  saveDeadLetter(record: DeadLetterRecord): void {
    this.deadLetters.push(structuredClone(record));
  }

  listDeadLetters(): DeadLetterRecord[] {
    return this.deadLetters.map((r) => structuredClone(r));
  }

  clear(): void {
    this.byVideoId.clear();
    this.byIdempotency.clear();
    this.deadLetters.length = 0;
  }
}
