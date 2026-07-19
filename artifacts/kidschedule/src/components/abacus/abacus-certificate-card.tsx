import {
  buildCertificate,
  certificatePrintHtml,
  type MasteryState,
} from "@workspace/abacus";
import { trackAbacusCertificateGenerated } from "@/lib/abacus-analytics";

export function AbacusCertificateCard({
  childId,
  childName,
  mastery,
  chapterTitle,
  ageYears,
}: {
  childId: number;
  childName: string;
  mastery: MasteryState;
  chapterTitle: string;
  ageYears?: number;
}) {
  const cert = buildCertificate({ childId, childName, mastery, chapterTitle });

  const print = () => {
    trackAbacusCertificateGenerated(
      { childId, age: ageYears ?? 0, level: 1 },
      cert.verifyCode,
    );
    const html = certificatePrintHtml(cert);
    const w = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    try {
      w.print();
    } catch {
      /* print may be blocked — HTML still shareable */
    }
  };

  return (
    <div
      className="rounded-2xl border border-teal-400/30 bg-card p-3 space-y-2"
      data-testid="abacus-certificate-card"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        Certificate
      </p>
      <p className="text-sm font-black">{childName}</p>
      <p className="text-xs text-muted-foreground">
        {chapterTitle} · {cert.masteryPct}% mastery · {cert.completionDate}
      </p>
      <p className="text-[10px] font-mono text-muted-foreground">Verify: {cert.verifyCode}</p>
      <button
        type="button"
        onClick={print}
        className="w-full rounded-xl bg-teal-600 text-white text-sm font-bold py-3 min-h-[44px]"
        data-testid="abacus-certificate-print"
      >
        Print / Share PDF
      </button>
    </div>
  );
}
