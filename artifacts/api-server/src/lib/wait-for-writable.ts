import type { Response as ExpressResponse } from "express";

export class ResponseClosedError extends Error {
  constructor(message = "response_closed") {
    super(message);
    this.name = "ResponseClosedError";
  }
}

type DrainableResponse = Pick<
  ExpressResponse,
  "once" | "off" | "writableEnded" | "destroyed"
>;

/**
 * Wait until `res` can accept more writes after backpressure (`write` returned false).
 *
 * Must race `drain` with `close`/`error`: after a client abort, Node may leave
 * `res.destroyed === true` and make subsequent `write()` return false without ever
 * emitting `drain`. A drain-only waiter hangs forever and can poison shared TTS
 * inflight maps keyed by cacheKey.
 */
export function waitForWritableDrain(res: DrainableResponse): Promise<void> {
  if (res.writableEnded || res.destroyed) {
    return Promise.reject(new ResponseClosedError());
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      res.off("drain", onDrain);
      res.off("close", onClose);
      res.off("error", onError);
    };

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onDrain = () => settle(() => resolve());
    const onClose = () => settle(() => reject(new ResponseClosedError()));
    const onError = () => settle(() => reject(new ResponseClosedError("response_error")));

    res.once("drain", onDrain);
    res.once("close", onClose);
    res.once("error", onError);

    // Close may have raced between the pre-check and listener registration.
    if (res.writableEnded || res.destroyed) {
      settle(() => reject(new ResponseClosedError()));
    }
  });
}
