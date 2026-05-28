import { FileDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WorksheetPick } from "@workspace/learning-progress-engine";

interface WorksheetDailyPathProps {
  picks: WorksheetPick[];
  difficulty: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function WorksheetDailyPath({
  picks,
  difficulty,
  onSelect,
  className,
}: WorksheetDailyPathProps) {
  if (picks.length === 0) return null;

  return (
    <Card className={className} data-testid="worksheet-daily-path">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-sky-500" />
          Today&apos;s worksheet path
          <Badge variant="outline" className="capitalize text-[10px]">
            {difficulty}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {picks.map((pick, i) => (
          <button
            key={pick.id}
            type="button"
            onClick={() => onSelect?.(pick.id)}
            className="flex w-full items-start gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{pick.name}</p>
              <p className="text-xs text-muted-foreground">{pick.reason}</p>
            </div>
            <FileDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
