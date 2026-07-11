import type { EvidenceStatus } from "./types.js";

export const MIN_USERS = 15;
export const MIN_CHANGE_PCT = 10;
export const MIN_EXPERIMENT_PER_ARM = 30;
export const MIN_DAYS_FOR_PREDICTION = 14;
export const MIN_CONFIDENCE_FOR_ACTION = 60;

const EFFORT_WEIGHT = { S: 1, M: 1.5, L: 2.5 } as const;

export type FounderActionOwner = "founder" | "engineering" | "growth" | "product";

export function effortWeight(effort: "S" | "M" | "L"): number {
  return EFFORT_WEIGHT[effort];
}

export function confidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

export function isMeaningfulChange(changePct: number | null, users: number): boolean {
  if (changePct == null) return false;
  if (Math.abs(changePct) < MIN_CHANGE_PCT) return false;
  return users >= MIN_USERS;
}

export function pctChange(current: number | null, baseline: number | null): number | null {
  if (current == null || baseline == null) return null;
  if (baseline === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - baseline) / baseline) * 1000) / 10;
}

export function directionFromChange(changePct: number | null): "up" | "down" | "flat" {
  if (changePct == null || Math.abs(changePct) < 1) return "flat";
  return changePct > 0 ? "up" : "down";
}

export function validateEvidence(input: {
  verified: boolean;
  users: number;
  confidence: number;
  minUsers?: number;
  minConfidence?: number;
}): EvidenceStatus {
  const minUsers = input.minUsers ?? MIN_USERS;
  const minConf = input.minConfidence ?? MIN_CONFIDENCE_FOR_ACTION;
  if (!input.verified) return "not_verified";
  if (input.users < minUsers) return "not_enough_evidence";
  if (input.confidence < minConf) return "not_enough_evidence";
  return "verified";
}

export function actionAllowed(status: EvidenceStatus): boolean {
  return status === "verified";
}

export function priorityLabelFromScore(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function computePriorityScore(input: {
  businessImpact: number;
  confidence: number;
  effort: "S" | "M" | "L";
  revenueImpact: number;
  retentionImpact: number;
  activationImpact: number;
  technicalRisk: number;
  affectedUsers: number;
}): number {
  const userNorm = Math.min(100, (input.affectedUsers / 100) * 100);
  const raw =
    input.businessImpact * 0.2 +
    input.confidence * 0.2 +
    input.revenueImpact * 0.15 +
    input.retentionImpact * 0.15 +
    input.activationImpact * 0.15 +
    input.technicalRisk * 0.05 +
    userNorm * 0.1;
  return Math.round((raw / effortWeight(input.effort)) * 10) / 10;
}

export function estimateHours(effort: "S" | "M" | "L"): string {
  if (effort === "S") return "2–8h";
  if (effort === "M") return "1–3d";
  return "3–7d";
}

export function recommendOwner(category: string): FounderActionOwner {
  if (category === "technical" || category.includes("crash") || category.includes("startup")) {
    return "engineering";
  }
  if (category.includes("experiment") || category.includes("trial") || category.includes("revenue")) {
    return "product";
  }
  if (category.includes("retention") || category.includes("activation") || category.includes("routine")) {
    return "growth";
  }
  return "founder";
}
