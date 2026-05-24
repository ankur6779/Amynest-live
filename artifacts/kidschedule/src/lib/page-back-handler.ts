/**
 * Lets active pages override the global app-header back button for in-page
 * navigation (wizard steps, nested views) before falling back to route back.
 */
export type PageBackHandler = () => boolean;

let activeHandler: PageBackHandler | null = null;

export function registerPageBackHandler(handler: PageBackHandler | null): void {
  activeHandler = handler;
}

export function invokePageBackHandler(): boolean {
  if (!activeHandler) return false;
  try {
    return activeHandler();
  } catch {
    return false;
  }
}

/** Test-only reset */
export function resetPageBackHandlerForTests(): void {
  activeHandler = null;
}
