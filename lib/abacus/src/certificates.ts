import type { AbacusSkillId } from "./mastery.js";
import { SKILL_LABELS, type MasteryState, masterySummary } from "./mastery.js";

export type CertificatePayload = {
  childName: string;
  skillsMastered: string[];
  completionDate: string;
  masteryPct: number;
  chapterTitle: string;
  /** Short verification code for QR / share (not a cryptographic secret). */
  verifyCode: string;
  amySignature: string;
};

/** Deterministic non-crypto verification code for printable certificates. */
export function buildVerifyCode(input: {
  childId: number;
  childName: string;
  completionDate: string;
  masteryPct: number;
}): string {
  const raw = `${input.childId}|${input.childName}|${input.completionDate}|${input.masteryPct}`;
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `AN-${(h >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export function buildCertificate(input: {
  childId: number;
  childName: string;
  mastery: MasteryState;
  chapterTitle: string;
  completionDate?: string;
}): CertificatePayload {
  const completionDate = input.completionDate ?? new Date().toISOString().slice(0, 10);
  const summary = masterySummary(input.mastery);
  const skillsMastered = (Object.keys(input.mastery) as AbacusSkillId[])
    .filter((s) => {
      const tier = input.mastery[s]?.tier;
      return tier === "strong" || tier === "master" || tier === "legend";
    })
    .map((s) => SKILL_LABELS[s]);

  return {
    childName: input.childName,
    skillsMastered: skillsMastered.length ? skillsMastered : ["Getting started"],
    completionDate,
    masteryPct: summary.averageScore,
    chapterTitle: input.chapterTitle,
    verifyCode: buildVerifyCode({
      childId: input.childId,
      childName: input.childName,
      completionDate,
      masteryPct: summary.averageScore,
    }),
    amySignature: "Amy ♥ Abacus PRO Zone",
  };
}

export function certificatePrintHtml(cert: CertificatePayload): string {
  const skills = cert.skillsMastered.map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Certificate — ${escapeHtml(cert.childName)}</title>
<style>
body{font-family:Georgia,serif;background:#f8fafc;color:#0f172a;padding:32px}
.card{max-width:720px;margin:0 auto;border:6px double #0d9488;padding:40px;background:white;text-align:center}
h1{font-size:28px;margin:0 0 8px}
.sub{color:#64748b;margin-bottom:24px}
.skills{text-align:left;display:inline-block;margin:16px auto}
.sig{margin-top:32px;font-style:italic}
.qr{margin-top:16px;font-family:monospace;font-size:12px;letter-spacing:1px}
</style></head><body><div class="card">
<p class="sub">AmyNest Abacus PRO Zone</p>
<h1>Certificate of Mastery</h1>
<p>This certifies that</p>
<h2>${escapeHtml(cert.childName)}</h2>
<p>has progressed through <strong>${escapeHtml(cert.chapterTitle)}</strong></p>
<p>Mastery score: <strong>${cert.masteryPct}%</strong></p>
<p>Date: ${escapeHtml(cert.completionDate)}</p>
<ul class="skills">${skills}</ul>
<p class="sig">${escapeHtml(cert.amySignature)}</p>
<p class="qr">Verify: ${escapeHtml(cert.verifyCode)}</p>
</div></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
