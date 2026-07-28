import type {
  WorkflowNotificationKind,
  WorkflowNotificationPolicy,
} from "../../types/workflow.js";

export interface WorkflowNotification {
  kind: WorkflowNotificationKind;
  title: string;
  body: string;
  at: string;
  workflowId: string;
  channel: string;
  delivered: boolean;
}

export class WorkflowNotificationBus {
  private readonly sent: WorkflowNotification[] = [];

  async notify(
    policy: WorkflowNotificationPolicy,
    kind: WorkflowNotificationKind,
    details: { title: string; body: string; workflowId: string },
  ): Promise<WorkflowNotification[]> {
    if (!shouldNotify(policy, kind)) return [];
    const deliveries: WorkflowNotification[] = [];
    for (const channel of policy.channels) {
      const note: WorkflowNotification = {
        kind,
        title: details.title,
        body: details.body,
        at: new Date().toISOString(),
        workflowId: details.workflowId,
        channel,
        delivered: true,
      };
      this.sent.push(note);
      deliveries.push(note);
    }
    return deliveries;
  }

  list(): WorkflowNotification[] {
    return this.sent.map((n) => ({ ...n }));
  }

  clear(): void {
    this.sent.length = 0;
  }
}

function shouldNotify(
  policy: WorkflowNotificationPolicy,
  kind: WorkflowNotificationKind,
): boolean {
  switch (kind) {
    case "started":
      return policy.onStarted;
    case "progress":
      return policy.onProgress;
    case "completed":
      return policy.onCompleted;
    case "failed":
      return policy.onFailed;
    case "retry":
      return policy.onRetry;
    case "summary":
      return policy.onSummary;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
