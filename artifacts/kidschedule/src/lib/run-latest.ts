/** Latest-wins task runner — stale queued taps are discarded, not delayed. */
export type RunLatestExecutor = {
  runLatest<T>(fn: () => Promise<T>): Promise<T>;
  isRunning(): boolean;
  getPendingQueueWaitMs(): number;
};

export function createRunLatest(): RunLatestExecutor {
  type Slot<T> = {
    fn: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
    queuedAt: number;
  };

  let pending: Slot<unknown> | null = null;
  let isRunning = false;

  async function drain(): Promise<void> {
    if (isRunning) return;
    while (pending) {
      const slot = pending;
      pending = null;
      isRunning = true;
      try {
        const result = await slot.fn();
        slot.resolve(result);
      } catch (err) {
        slot.reject(err);
      } finally {
        isRunning = false;
      }
    }
  }

  return {
    runLatest<T>(fn: () => Promise<T>): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        if (pending) {
          pending.reject(
            Object.assign(new Error("superseded"), { code: "tts_superseded" }),
          );
        }
        pending = { fn, resolve, reject, queuedAt: Date.now() };
        void drain();
      });
    },
    isRunning(): boolean {
      return isRunning;
    },
    getPendingQueueWaitMs(): number {
      return pending ? Date.now() - pending.queuedAt : 0;
    },
  };
}
