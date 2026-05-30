import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileDown, Loader2 } from "lucide-react";
import { fetchDoctorReport } from "@/lib/infant-care-api";
import { trackDoctorReportGenerated, trackDoctorReportExported } from "@/lib/infant-hub-analytics";
import { Button } from "@/components/ui/button";

type DoctorVisitReportProps = {
  childId: number;
  childName: string;
  ageMonths: number;
};

function openPrintableReport(childName: string, data: Record<string, unknown>) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${childName} — Doctor Visit Summary</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;max-width:720px;margin:0 auto;color:#111}
h1{font-size:20px}h2{font-size:14px;margin-top:20px;color:#444}ul{padding-left:18px}p{font-size:13px;line-height:1.5}
.disclaimer{margin-top:24px;font-size:11px;color:#666;border-top:1px solid #ddd;padding-top:12px}</style></head><body>
<h1>Doctor Visit Summary — ${childName}</h1>
<p>Generated ${new Date().toLocaleString()}</p>
<h2>Sleep (7 days)</h2>
<pre>${JSON.stringify((data as any).sleep, null, 2)}</pre>
<h2>Feeding & care</h2>
<pre>${JSON.stringify((data as any).feeding, null, 2)}</pre>
<h2>Growth</h2>
<pre>${JSON.stringify((data as any).growth, null, 2)}</pre>
<h2>Vaccines</h2>
<pre>${JSON.stringify((data as any).vaccines, null, 2)}</pre>
<h2>Milestones</h2>
<pre>${JSON.stringify((data as any).milestones, null, 2)}</pre>
<p class="disclaimer">${(data as any).disclaimer ?? ""}</p>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export function DoctorVisitReport({ childId, childName, ageMonths }: DoctorVisitReportProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const data = await fetchDoctorReport(childId);
      trackDoctorReportGenerated(childId, ageMonths);
      openPrintableReport(childName, data);
      trackDoctorReportExported(childId, ageMonths, "print");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3" data-testid="doctor-visit-report" id="infant-doctor">
      <p className="text-sm text-muted-foreground">
        {t(
          "components.doctor_report.lead",
          "One-page summary of sleep, feeding, growth, vaccines, and milestones for your paediatrician.",
        )}
      </p>
      <Button
        type="button"
        disabled={busy}
        onClick={handleExport}
        className="w-full rounded-xl gap-2 font-bold"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
        {t("components.doctor_report.export", "Prepare Doctor Report")}
      </Button>
    </div>
  );
}
