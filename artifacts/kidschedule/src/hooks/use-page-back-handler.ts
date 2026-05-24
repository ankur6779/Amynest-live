import { useEffect, useRef } from "react";
import { registerPageBackHandler } from "@/lib/page-back-handler";

/**
 * Register page-local back behavior for the global app header back button.
 * Return true when the handler consumed the back action.
 */
export function usePageBackHandler(
  handler: () => boolean,
  deps: readonly unknown[],
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    registerPageBackHandler(() => handlerRef.current());
    return () => registerPageBackHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies reactive deps
  }, deps);
}
