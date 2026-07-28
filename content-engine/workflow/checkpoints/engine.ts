import type {
  CheckpointName,
  WorkflowCheckpoint,
  WorkflowVideoArtifacts,
  WorkflowVideoUnit,
} from "../../types/workflow.js";

const CHECKPOINT_ORDER: CheckpointName[] = [
  "ContentGenerated",
  "StoryboardReady",
  "AssetsReady",
  "Rendered",
  "Published",
];

export function checkpointIndex(name: CheckpointName | null): number {
  if (!name) return -1;
  return CHECKPOINT_ORDER.indexOf(name);
}

export function nextPhaseAfterCheckpoint(
  checkpoint: CheckpointName | null,
): WorkflowVideoUnit["currentPhase"] {
  switch (checkpoint) {
    case "ContentGenerated":
      return "storyboard-planning";
    case "StoryboardReady":
      return "asset-resolution";
    case "AssetsReady":
      return "rendering";
    case "Rendered":
      return "publishing";
    case "Published":
      return "reporting";
    default:
      return "topic-selection";
  }
}

export function createCheckpoint(
  workflowId: string,
  videoUnitId: string,
  name: CheckpointName,
): WorkflowCheckpoint {
  return {
    name,
    at: new Date().toISOString(),
    videoUnitId,
    workflowId,
  };
}

/** Resume artifact presence determines skipped phases. */
export function artifactsForResume(
  unit: WorkflowVideoUnit,
): WorkflowVideoArtifacts {
  return {
    topic: unit.artifacts.topic,
    content: unit.artifacts.content,
    storyboard: unit.artifacts.storyboard,
    assets: unit.artifacts.assets,
    render: unit.artifacts.render,
    published: unit.artifacts.published,
  };
}

export function hasCheckpoint(
  unit: WorkflowVideoUnit,
  name: CheckpointName,
): boolean {
  return checkpointIndex(unit.latestCheckpoint) >= checkpointIndex(name);
}

export { CHECKPOINT_ORDER };
