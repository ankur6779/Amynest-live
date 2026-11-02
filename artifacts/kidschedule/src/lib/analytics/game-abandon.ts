export type GamePlaySession = {
  gameId: string;
  idempotencyKey: string;
  finished: boolean;
  abandonEmitted: boolean;
};

/**
 * One abandon per started, unfinished play. Intro-only visits have no session.
 * A completed session has finished set before cleanup, so it is not abandoned.
 * The flag blocks a second emit from rerender, leave, and unmount.
 */
export function claimGameAbandon(
  session: GamePlaySession | null,
): { gameId: string } | null {
  if (!session || session.finished || session.abandonEmitted) return null;
  const gameId = session.gameId.trim().slice(0, 64);
  if (!gameId) return null;
  session.abandonEmitted = true;
  return { gameId };
}
