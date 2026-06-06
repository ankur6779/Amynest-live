import type { FailureChainGraph } from "./types.js";

const GRAPHS: FailureChainGraph[] = [
  {
    readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
    loopType: "render",
    nodes: [
      { id: "A", kind: "query", label: "React Query refetch (children/:id)" },
      { id: "B", kind: "effect", label: "ChildForm hydration useEffect" },
      { id: "C", kind: "mutation", label: "form.reset(nextValues)" },
      { id: "D", kind: "render", label: "RHF useWatch subscribers re-render" },
      { id: "E", kind: "state", label: "isInfant derived from watchDob" },
      { id: "F", kind: "effect", label: "infant-normalize useEffect" },
      { id: "G", kind: "mutation", label: 'setValue("educationStage")' },
      { id: "H", kind: "render", label: "Maximum update depth exceeded" },
    ],
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "D" },
      { from: "D", to: "E" },
      { from: "E", to: "F" },
      { from: "F", to: "G" },
      { from: "G", to: "D" },
      { from: "D", to: "F" },
      { from: "F", to: "H" },
    ],
    cycle: ["D", "E", "F", "G", "D"],
  },
  {
    readableFingerprint: "ChildForm|MaximumDepth|ChildForm",
    loopType: "reset",
    nodes: [
      { id: "A", kind: "query", label: "React Query background refetch" },
      { id: "B", kind: "effect", label: "hydration useEffect" },
      { id: "C", kind: "mutation", label: "form.reset" },
      { id: "D", kind: "render", label: "RHF field subscriptions" },
      { id: "E", kind: "effect", label: "child field effects" },
    ],
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "D" },
      { from: "D", to: "E" },
      { from: "E", to: "B" },
    ],
    cycle: ["B", "C", "D", "E", "B"],
  },
  {
    readableFingerprint: "Dashboard|ChunkLoad|LazyImport",
    loopType: "navigation",
    nodes: [
      { id: "A", kind: "navigation", label: "Navigate to /dashboard" },
      { id: "B", kind: "mutation", label: "React.lazy import" },
      { id: "C", kind: "retry", label: "ChunkLoadError" },
      { id: "D", kind: "mutation", label: "L6 controlled reload" },
    ],
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "D" },
      { from: "D", to: "A" },
    ],
    cycle: ["A", "B", "C", "D", "A"],
  },
  {
    readableFingerprint: "NotificationEngine|Network|NotificationEngine",
    loopType: "retry",
    nodes: [
      { id: "A", kind: "mutation", label: "Notification dispatch fetch" },
      { id: "B", kind: "retry", label: "Network timeout" },
      { id: "C", kind: "render", label: "Unhandled rejection → crash overlay" },
    ],
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
    ],
    cycle: [],
  },
];

export function getFailureChainGraph(
  readableFingerprint: string,
): FailureChainGraph | null {
  return GRAPHS.find((g) => g.readableFingerprint === readableFingerprint) ?? null;
}

export function serializeFailureChain(graph: FailureChainGraph): string {
  return JSON.stringify(graph, null, 2);
}
