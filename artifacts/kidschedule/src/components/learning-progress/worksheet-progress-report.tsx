import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorksheetProgressReportProps {
  completed: number;
  percent: number;
  label: string;
  dailyRemaining: number;
  className?: string;
}

export function WorksheetProgressReport({
  completed,
  percent,
  label,
  dailyRemaining,
  className,
}: WorksheetProgressReportProps) {
  return (
    <Card className={className} data-testid="worksheet-progress-report">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Printable progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Progress value={percent} className="h-2" />
        <p className="text-xs text-muted-foreground">
          {dailyRemaining} download{dailyRemaining === 1 ? "" : "s"} left today
        </p>
      </CardContent>
    </Card>
  );
}
