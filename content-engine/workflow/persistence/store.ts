import type { PersistedWorkflowState } from "../../types/workflow.js";

export interface WorkflowPersistenceStore {
  save(state: PersistedWorkflowState): void;
  get(workflowId: string): PersistedWorkflowState | undefined;
  list(): PersistedWorkflowState[];
  delete(workflowId: string): boolean;
  clear(): void;
}

export class InMemoryWorkflowStore implements WorkflowPersistenceStore {
  private readonly map = new Map<string, PersistedWorkflowState>();

  save(state: PersistedWorkflowState): void {
    this.map.set(state.workflowId, structuredClone(state));
  }

  get(workflowId: string): PersistedWorkflowState | undefined {
    const state = this.map.get(workflowId);
    return state ? structuredClone(state) : undefined;
  }

  list(): PersistedWorkflowState[] {
    return [...this.map.values()].map((s) => structuredClone(s));
  }

  delete(workflowId: string): boolean {
    return this.map.delete(workflowId);
  }

  clear(): void {
    this.map.clear();
  }
}
