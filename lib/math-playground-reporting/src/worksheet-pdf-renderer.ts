import type { GeneratedWorksheet, TeacherReportSummary } from "@workspace/math-playground";

export interface WorksheetPdfLabels {
  title: string;
  level: string;
  difficulty: string;
  childName: string;
  date: string;
  progressSection: string;
  parentNotes: string;
  problemLabel: (index: number) => string;
  resolvePrompt: (problem: GeneratedWorksheet["problems"][0]) => string;
  objectEmoji: (kind: string) => string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderVisual(
  visual: GeneratedWorksheet["problems"][0]["visual"],
  emoji: (kind: string) => string,
): string {
  if (!visual) return "";
  const icon = emoji(visual.objectKind);
  const items = Array.from({ length: Math.min(visual.objectCount, 20) })
    .map(() => `<span class="obj">${icon}</span>`)
    .join("");
  const extra = visual.objectCount > 20 ? `<span class="obj-more">+${visual.objectCount - 20}</span>` : "";
  return `<div class="visual">${items}${extra}</div>`;
}

export function renderWorksheetHtml(
  worksheet: GeneratedWorksheet,
  labels: WorksheetPdfLabels,
): string {
  const problemsHtml = worksheet.problems
    .map((p, i) => {
      const prompt = escapeHtml(labels.resolvePrompt(p));
      const choices =
        p.choices && p.choices.length > 0
          ? `<div class="choices">${p.choices.map((c) => `<span class="choice">${c}</span>`).join("")}</div>`
          : `<div class="answer-line"></div>`;
      return `
        <section class="problem">
          <h3>${labels.problemLabel(i + 1)}</h3>
          <p class="prompt">${prompt}</p>
          ${renderVisual(p.visual, labels.objectEmoji)}
          ${choices}
        </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: system-ui, sans-serif; color: #111; max-width: 180mm; margin: 0 auto; }
    header { border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 16px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .meta { font-size: 11px; color: #444; display: flex; gap: 12px; flex-wrap: wrap; }
    .problem { break-inside: avoid; margin-bottom: 18px; padding: 10px; border: 1px solid #ccc; border-radius: 8px; }
    .problem h3 { font-size: 12px; margin: 0 0 6px; color: #555; }
    .prompt { font-size: 14px; font-weight: 600; margin: 0 0 8px; }
    .visual { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; font-size: 18px; }
    .choices { display: flex; gap: 10px; }
    .choice { border: 1px solid #333; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
    .answer-line { border-bottom: 1px solid #333; height: 24px; width: 60px; margin-top: 6px; }
    footer { margin-top: 20px; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 8px; }
    @media print { .problem { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(labels.title)}</h1>
    <div class="meta">
      <span>${escapeHtml(labels.childName)}</span>
      <span>${escapeHtml(labels.date)}</span>
      <span>${escapeHtml(labels.level)}</span>
      <span>${escapeHtml(labels.difficulty)}</span>
    </div>
  </header>
  ${problemsHtml}
  <footer>
    <strong>${escapeHtml(labels.progressSection)}</strong>
    <p>${escapeHtml(labels.parentNotes)}</p>
  </footer>
</body>
</html>`;
}

export function renderTeacherReportHtml(
  report: TeacherReportSummary,
  labels: {
    title: string;
    readiness: string;
    mastered: string;
    emerging: string;
    needsSupport: string;
    history: string;
    notes: string;
    skillName: (skill: string) => string;
  },
): string {
  const section = (
    title: string,
    rows: TeacherReportSummary["skillsMastered"],
  ) => {
    if (rows.length === 0) return "";
    const items = rows
      .map(
        (r) =>
          `<li>${escapeHtml(labels.skillName(r.skill))} — ${r.masteryScore}% (${r.trend})</li>`,
      )
      .join("");
    return `<section><h2>${escapeHtml(title)}</h2><ul>${items}</ul></section>`;
  };

  const history = report.assessmentHistory
    .map((h) => `<tr><td>${h.date}</td><td>${h.readinessScore}</td><td>${h.sessionCount}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.title)}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    body { font-family: system-ui, sans-serif; color: #111; max-width: 180mm; margin: 0 auto; font-size: 12px; }
    h1 { font-size: 18px; }
    h2 { font-size: 13px; margin-top: 16px; border-bottom: 1px solid #ccc; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td, th { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
  </style>
</head>
<body>
  <h1>${escapeHtml(labels.title)}</h1>
  <p><strong>${escapeHtml(report.childDisplayName)}</strong> · Age ${report.childAgeYears}</p>
  <p>${escapeHtml(labels.readiness)}: ${report.schoolReadinessScore}/100 (${report.schoolReadinessBand})</p>
  ${section(labels.mastered, report.skillsMastered)}
  ${section(labels.emerging, report.skillsEmerging)}
  ${section(labels.needsSupport, report.skillsNeedingSupport)}
  <section>
    <h2>${escapeHtml(labels.history)}</h2>
    <table>
      <thead><tr><th>Date</th><th>Readiness</th><th>Sessions</th></tr></thead>
      <tbody>${history}</tbody>
    </table>
  </section>
  <p><em>${escapeHtml(labels.notes)}</em></p>
</body>
</html>`;
}
