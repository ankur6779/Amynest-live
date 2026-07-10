import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { WorksheetDocument, WorksheetGenerateRequest } from "@workspace/worksheet-studio";
import {
  generateWeeklyPlan,
  generateHomeworkPackFromRequest,
  generateClassroomPack,
  generateBulkWorksheets,
  getSmartRecommendations,
  suggestNextTopics,
  topicPrompt,
  type WorksheetRecommendation,
} from "@workspace/worksheet-studio";
import {
  getAnalyticsDashboard,
  listLibrary,
  type AnalyticsDashboard,
  type LibraryEntry,
} from "@workspace/worksheet-studio/client";
import {
  BarChart3,
  Calendar,
  Layers,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { WS_SHEET } from "./worksheet-studio-theme";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildRequest: () => WorksheetGenerateRequest;
  onOpenDocument: (doc: WorksheetDocument) => void;
  onOpenPack?: (docs: WorksheetDocument[], label: string) => void;
  loading?: boolean;
};

export function WorksheetProductivityHub({
  open, onOpenChange, buildRequest, onOpenDocument, onOpenPack, loading,
}: Props) {
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [recs, setRecs] = useState<WorksheetRecommendation[]>([]);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [bulkCount, setBulkCount] = useState(5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void listLibrary({ filter: "recent" }).then(setLibrary);
    setAnalytics(getAnalyticsDashboard());
    void listLibrary().then((lib) => setRecs(getSmartRecommendations(lib)));
  }, [open]);

  const run = async (fn: () => WorksheetDocument | WorksheetDocument[]) => {
    setBusy(true);
    try {
      const result = fn();
      const docs = Array.isArray(result) ? result : [result];
      if (docs.length === 1) onOpenDocument(docs[0]!);
      else onOpenPack?.(docs, "Bulk worksheets");
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const req = buildRequest();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn(WS_SHEET, "rounded-t-3xl")}>
        <SheetHeader>
          <SheetTitle className="text-left text-lg font-bold text-[#1e3a5f]">Teacher Productivity</SheetTitle>
        </SheetHeader>

        {analytics && (
          <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-[#1e3a5f]/5 p-3">
            <Stat icon={BarChart3} label="Created" value={analytics.worksheetsCreated} />
            <Stat icon={TrendingUp} label="Topics" value={analytics.topicsCovered} />
            <Stat icon={Package} label="Exports" value={analytics.exports} />
          </div>
        )}

        <section className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">Quick generate</p>
          <div className="grid grid-cols-2 gap-2">
            <ActionBtn
              icon={Calendar}
              label="Weekly plan (Mon–Fri)"
              disabled={busy || loading}
              onClick={() => {
                const plan = generateWeeklyPlan(req);
                onOpenPack?.(plan.days.map((d) => d.document), "Weekly plan");
                onOpenChange(false);
              }}
            />
            <ActionBtn
              icon={Package}
              label="Homework pack"
              disabled={busy || loading}
              onClick={() => {
                const pack = generateHomeworkPackFromRequest(req);
                onOpenPack?.(
                  [pack.worksheet, pack.answerKey, pack.homework, pack.parent, pack.revision, pack.assessment],
                  "Homework pack",
                );
                onOpenChange(false);
              }}
            />
            <ActionBtn
              icon={Layers}
              label="Classroom pack"
              disabled={busy || loading}
              onClick={() => {
                const pack = generateClassroomPack(req);
                onOpenPack?.(pack.items.map((i) => i.document), "Classroom pack");
                onOpenChange(false);
              }}
            />
            <ActionBtn
              icon={Sparkles}
              label={`Bulk × ${bulkCount}`}
              disabled={busy || loading}
              onClick={() => void run(() => generateBulkWorksheets(req, bulkCount))}
            />
          </div>
          <div className="flex gap-2 pt-1">
            {[5, 10, 20].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setBulkCount(n)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium touch-manipulation",
                  bulkCount === n ? "bg-[#1e3a5f] text-white" : "bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {recs.length > 0 && (
          <section className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">Suggested for you</p>
            <div className="flex flex-wrap gap-2">
              {recs.slice(0, 4).map((r) => (
                <Button
                  key={r.label}
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-full touch-manipulation"
                  disabled={busy || loading}
                  onClick={() => {
                    if (r.request) {
                      onOpenDocument(
                        generateBulkWorksheets({ ...req, ...r.request, prompt: r.prompt }, 1)[0]!,
                      );
                      onOpenChange(false);
                    }
                  }}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">Curriculum next</p>
          <div className="flex flex-wrap gap-2">
            {suggestNextTopics(req.classLevel, 4).map((t) => (
              <Button
                key={t.id}
                size="sm"
                variant="secondary"
                className="h-10 rounded-full touch-manipulation"
                disabled={busy || loading}
                onClick={() => {
                  onOpenDocument(
                    generateBulkWorksheets({ ...req, prompt: topicPrompt(t, req.classLevel), subject: t.subject }, 1)[0]!,
                  );
                  onOpenChange(false);
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </section>

        {library.length > 0 && (
          <section className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]/60">Recent</p>
            <div className="mt-2 space-y-1">
              {library.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="block w-full truncate rounded-lg px-2 py-2 text-left text-sm hover:bg-muted touch-manipulation"
                  onClick={() => { onOpenDocument(e.document); onOpenChange(false); }}
                >
                  {e.title}
                </button>
              ))}
            </div>
          </section>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: number }) {
  return (
    <div className="text-center">
      <Icon className="mx-auto h-4 w-4 text-[#1e3a5f]" />
      <p className="mt-1 text-lg font-bold text-[#1e3a5f]">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ActionBtn({
  icon: Icon, label, onClick, disabled,
}: { icon: typeof Calendar; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="outline"
      className="h-auto min-h-[4.5rem] flex-col gap-1 rounded-xl py-3 text-xs font-semibold touch-manipulation"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-[#1e3a5f]" />
      {label}
    </Button>
  );
}
