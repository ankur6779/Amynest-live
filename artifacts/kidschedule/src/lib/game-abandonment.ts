import { childAnalyticsRef } from "@workspace/analytics-taxonomy";

export type GameSurface = "games_hub" | "mini_game";
export type GameAuthState = "authenticated" | "guest" | "unknown";

export type GameAbandonmentEvent = {
  game_id: string;
  surface: GameSurface;
  session_key: string;
  auth_state: GameAuthState;
  child_ref?: string;
};

type Attempt = GameAbandonmentEvent & {
  started: boolean;
  completed: boolean;
  abandoned: boolean;
};

const attempts = new Map<string, Attempt>();
const pendingAbandon = new Map<string, ReturnType<typeof setTimeout>>();

export function resetGameAbandonmentForTests(): void {
  for (const timer of pendingAbandon.values()) clearTimeout(timer);
  pendingAbandon.clear();
  attempts.clear();
}

export function noteGameStarted(input: {
  sessionKey: string;
  gameId: string;
  surface: GameSurface;
  authState: GameAuthState;
  childId?: number | null;
}): void {
  const pending = pendingAbandon.get(input.sessionKey);
  if (pending) {
    clearTimeout(pending);
    pendingAbandon.delete(input.sessionKey);
  }
  const existing = attempts.get(input.sessionKey);
  if (existing?.started) return;
  const childRef =
    typeof input.childId === "number" && input.childId > 0
      ? childAnalyticsRef(input.childId)
      : undefined;
  attempts.set(input.sessionKey, {
    game_id: input.gameId,
    surface: input.surface,
    session_key: input.sessionKey,
    auth_state: input.authState,
    ...(childRef ? { child_ref: childRef } : {}),
    started: true,
    completed: false,
    abandoned: false,
  });
}

export function noteGameCompleted(sessionKey: string): void {
  const pending = pendingAbandon.get(sessionKey);
  if (pending) {
    clearTimeout(pending);
    pendingAbandon.delete(sessionKey);
  }
  const attempt = attempts.get(sessionKey);
  if (!attempt?.started) return;
  attempt.completed = true;
}

/** One abandonment per started, unfinished attempt. Later calls return null. */
export function takeGameAbandonment(sessionKey: string): GameAbandonmentEvent | null {
  const attempt = attempts.get(sessionKey);
  if (!attempt?.started || attempt.completed || attempt.abandoned) return null;
  attempt.abandoned = true;
  return {
    game_id: attempt.game_id,
    surface: attempt.surface,
    session_key: attempt.session_key,
    auth_state: attempt.auth_state,
    ...(attempt.child_ref ? { child_ref: attempt.child_ref } : {}),
  };
}

/**
 * Delay cleanup-triggered abandonment by a tick so a strict-mode remount
 * of the same session can cancel it. Explicit leave should call
 * takeGameAbandonment immediately.
 */
export function scheduleGameAbandonment(
  sessionKey: string,
  emit: (event: GameAbandonmentEvent) => void,
): void {
  const existing = pendingAbandon.get(sessionKey);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingAbandon.delete(sessionKey);
    const event = takeGameAbandonment(sessionKey);
    if (event) emit(event);
  }, 0);
  pendingAbandon.set(sessionKey, timer);
}
