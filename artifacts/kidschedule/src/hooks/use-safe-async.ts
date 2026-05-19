import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

/** Tracks mount state; false after the component unmounts. */
export function useMountedRef() {
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  return isMounted;
}

/**
 * Wraps an async function so its result is dropped (with a warning) if the
 * caller unmounted while the promise was in flight.
 */
export function useSafeAsync() {
  const isMounted = useMountedRef();

  const safeAsync = useCallback(
    <T extends (...args: never[]) => Promise<unknown>>(fn: T) => {
      return async (
        ...args: Parameters<T>
      ): Promise<Awaited<ReturnType<T>> | null> => {
        const result = await fn(...args);
        if (!isMounted.current) {
          console.warn("Skipped state update: component unmounted");
          return null;
        }
        return result as Awaited<ReturnType<T>>;
      };
    },
    [isMounted],
  );

  return { safeAsync, isMounted };
}

/** setState that no-ops after unmount. */
export function useSafeSetState<T>(initial: T | (() => T)) {
  const isMounted = useMountedRef();
  const [state, setState] = useState(initial);
  const safeSet = useCallback(
    (value: SetStateAction<T>) => {
      if (!isMounted.current) return;
      setState(value);
    },
    [isMounted],
  );
  return [state, safeSet] as const;
}

/** AbortController tied to the component lifetime. */
export function useAbortOnUnmount() {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  const getSignal = useCallback(() => {
    controllerRef.current?.abort();
    const next = new AbortController();
    controllerRef.current = next;
    return next.signal;
  }, []);

  const abort = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  return { getSignal, abort };
}

/** Prevents overlapping async handlers (double-tap / double-fetch). */
export function useInFlightGuard() {
  const inFlight = useRef(false);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      if (inFlight.current) return null;
      inFlight.current = true;
      try {
        return await fn();
      } finally {
        inFlight.current = false;
      }
    },
    [],
  );

  return { inFlight, run };
}

/** Guard an arbitrary setState dispatcher with a mounted ref. */
export function useGuardedSetter<T>(
  setState: Dispatch<SetStateAction<T>>,
  isMounted: RefObject<boolean>,
) {
  return useCallback(
    (value: SetStateAction<T>) => {
      if (!isMounted.current) return;
      setState(value);
    },
    [setState, isMounted],
  );
}
