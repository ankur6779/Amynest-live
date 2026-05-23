import type {
  CooperativeSessionState,
  CooperativeTurnRole,
  FamilyId,
} from "./types-family.js";

const sessions = new Map<string, CooperativeSessionState>();

function sessionKey(familyId: FamilyId, taskId: string): string {
  return `${familyId}:${taskId}`;
}

export function startCooperativeSession(params: {
  familyId: FamilyId;
  childA: string;
  childB: string;
  taskId?: string;
}): CooperativeSessionState {
  const taskId = params.taskId ?? `coop_${Date.now()}`;
  const state: CooperativeSessionState = {
    familyId: params.familyId,
    activeChildId: params.childA,
    partnerChildId: params.childB,
    turn: "answer",
    taskId,
    round: 1,
  };
  sessions.set(sessionKey(params.familyId, taskId), state);
  return state;
}

export type CooperativeTurnResult = {
  state: CooperativeSessionState;
  promptForChild: string;
  mode: "quiz" | "verify" | "collaborate";
  waitingFor: CooperativeTurnRole;
};

/**
 * Turn-based: Child A answers → Child B verifies.
 */
export function advanceCooperativeTurn(
  familyId: FamilyId,
  taskId: string,
  input: { childId: string; answer?: string; approved?: boolean },
): CooperativeTurnResult | null {
  const key = sessionKey(familyId, taskId);
  const state = sessions.get(key);
  if (!state) return null;

  if (state.turn === "answer" && input.childId === state.activeChildId) {
    const next: CooperativeSessionState = {
      ...state,
      turn: "verify",
      round: state.round,
    };
    sessions.set(key, next);
    return {
      state: next,
      mode: "verify",
      waitingFor: "verify",
      promptForChild: `Can you check your partner's answer? Say yes if it sounds right, or give a kind hint.`,
    };
  }

  if (state.turn === "verify" && input.childId === state.partnerChildId) {
    const approved = input.approved ?? (input.answer?.toLowerCase().includes("yes") ?? false);
    const next: CooperativeSessionState = {
      ...state,
      turn: "answer",
      activeChildId: state.partnerChildId,
      partnerChildId: state.activeChildId,
      round: state.round + 1,
    };
    sessions.set(key, next);
    return {
      state: next,
      mode: approved ? "collaborate" : "quiz",
      waitingFor: "answer",
      promptForChild: approved
        ? "Great teamwork! Your turn for the next question."
        : "Nice try together — here's a new question for you.",
    };
  }

  return null;
}

export function getCooperativeSession(
  familyId: FamilyId,
  taskId: string,
): CooperativeSessionState | undefined {
  return sessions.get(sessionKey(familyId, taskId));
}

export function clearCooperativeSessions(familyId?: FamilyId): void {
  if (!familyId) {
    sessions.clear();
    return;
  }
  for (const k of sessions.keys()) {
    if (k.startsWith(`${familyId}:`)) sessions.delete(k);
  }
}
