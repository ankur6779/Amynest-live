/**
 * Streaming chunkSequence buffer (Pack 6 Addendum A §3).
 * Duplicate → ignore; out-of-order → ignore once higher committed.
 */

export type ChunkBufferState = {
  committedSequence: number;
  text: string;
};

export function createChunkBuffer(): ChunkBufferState {
  return { committedSequence: 0, text: "" };
}

export function applyChunk(
  state: ChunkBufferState,
  chunkSequence: number,
  delta: string,
): ChunkBufferState {
  if (!Number.isFinite(chunkSequence) || chunkSequence <= 0) return state;
  if (chunkSequence <= state.committedSequence) return state; // duplicate / late
  if (chunkSequence !== state.committedSequence + 1) return state; // gap / out of order
  return {
    committedSequence: chunkSequence,
    text: state.text + delta,
  };
}
