import { createHash } from "node:crypto";
import type {
  AuditAction,
  AuditLogEntry,
  PublishingProviderId,
} from "../../types/published-video.js";

export class AuditLog {
  private readonly entries: AuditLogEntry[] = [];

  record(
    action: AuditAction,
    provider: PublishingProviderId,
    details: Record<string, string | number | boolean | null> = {},
    videoId?: string,
  ): AuditLogEntry {
    const at = new Date().toISOString();
    const id = `audit_${createHash("sha256")
      .update(`${action}|${provider}|${videoId ?? ""}|${at}|${this.entries.length}`)
      .digest("hex")
      .slice(0, 12)}`;
    const entry: AuditLogEntry = {
      id,
      action,
      at,
      provider,
      videoId,
      details: { ...details },
    };
    this.entries.push(entry);
    return entry;
  }

  list(): AuditLogEntry[] {
    return this.entries.map((e) => ({
      ...e,
      details: { ...e.details },
    }));
  }

  clear(): void {
    this.entries.length = 0;
  }
}
