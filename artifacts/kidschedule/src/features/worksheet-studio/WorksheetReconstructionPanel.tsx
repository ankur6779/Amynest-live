import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  acceptReconstructionMimeTypes,
  validateReferenceBatch,
  type ReconstructionStyle,
  type WorksheetClass,
  type WorksheetDifficulty,
  type WorksheetLanguage,
  type WorksheetReferenceContext,
  type WorksheetReconstructRequest,
  type WorksheetSubject,
} from "@workspace/worksheet-studio";
import { Camera, FileUp, Loader2, ScanLine, Trash2 } from "lucide-react";
import { processReferenceFiles } from "./reference-upload-service";
import { ReconstructionPreviewSheet } from "./ReconstructionPreviewSheet";
import { useWorksheetReconstruction } from "./use-worksheet-reconstruction";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { hapticWorksheetTap } from "./worksheet-haptics";
import { trackWorksheetEvent } from "./worksheet-studio-analytics";
import {
  WS_GLASS_CARD,
  WS_MUTED_TEXT,
  WS_OUTLINE_BTN,
  WS_PRIMARY_BTN,
  WS_SECTION_LABEL,
  WS_TOUCH,
  WS_CAPTION,
} from "./worksheet-studio-theme";

type Props = {
  classLevel: WorksheetClass;
  subject: WorksheetSubject;
  difficulty: WorksheetDifficulty;
  language: WorksheetLanguage;
  onReconstruct: (req: WorksheetReconstructRequest) => void;
  loading: boolean;
};

export function WorksheetReconstructionPanel({
  classLevel: defaultClass,
  subject: defaultSubject,
  difficulty,
  language,
  onReconstruct,
  loading,
}: Props) {
  const authFetch = useAuthFetch();
  const { analyze, analyzing, merged, setMerged, stage } = useWorksheetReconstruction(authFetch);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [sources, setSources] = useState<WorksheetReferenceContext[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [style, setStyle] = useState<ReconstructionStyle>("lps");
  const [classLevel, setClassLevel] = useState<WorksheetClass>(defaultClass);
  const [subject, setSubject] = useState<WorksheetSubject>(defaultSubject);
  const [topic, setTopic] = useState("");

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    const validation = validateReferenceBatch(sources, list.map((f) => ({
      filename: f.name,
      mimeType: f.type,
      sizeBytes: f.size,
    })));
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    try {
      const processed = await processReferenceFiles(list);
      setSources((prev) => [...prev, ...processed].slice(0, 10));
      trackWorksheetEvent("worksheet_reconstruct_upload", { count: processed.length });
      const result = await analyze([...sources, ...processed]);
      if (result) {
        if (result.classLevel) setClassLevel(result.classLevel);
        if (result.subject) setSubject(result.subject);
        if (result.topic) setTopic(result.topic);
        setMerged(result);
      }
    } catch {
      toast.error("Could not process file", { description: "Try a clearer photo or PDF." });
    }
  }, [sources, analyze, setMerged]);

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const openPreview = async () => {
    if (!sources.length) {
      toast.error("Upload a worksheet first", { description: "Photo, PDF, or scan required." });
      return;
    }
    void hapticWorksheetTap();
    if (!merged) await analyze(sources);
    setPreviewOpen(true);
  };

  const confirmReconstruct = () => {
    if (!sources.length) return;
    setPreviewOpen(false);
    const req: WorksheetReconstructRequest = {
      sources,
      style,
      classLevel,
      subject,
      difficulty,
      language,
      topic: topic || merged?.topic,
      pageCount: merged?.pageCount ?? 1,
      analysis: merged ?? undefined,
    };
    trackWorksheetEvent("worksheet_reconstruct_start", { style, confidence: merged?.confidence ?? 0 });
    onReconstruct(req);
  };

  return (
    <div className={cn(WS_GLASS_CARD, "w-full min-w-0 space-y-4 p-4")}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f]/10">
          <ScanLine className="h-5 w-5 text-[#1e3a5f]" aria-hidden />
        </div>
        <div>
          <h2 className="text-base font-bold text-[#1e3a5f]">Reconstruct from Photo or Scan</h2>
          <p className={cn("mt-1 text-sm", WS_MUTED_TEXT)}>
            Upload a notebook page, printed worksheet, PDF, or WhatsApp image — get an editable LPS worksheet.
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={acceptReconstructionMimeTypes()}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className={cn(WS_OUTLINE_BTN, WS_TOUCH, "h-12")}
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="mr-2 h-4 w-4" />
          Upload File
        </Button>
        <Button
          type="button"
          variant="outline"
          className={cn(WS_OUTLINE_BTN, WS_TOUCH, "h-12")}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="mr-2 h-4 w-4" />
          Camera
        </Button>
      </div>

      {sources.length > 0 && (
        <ul className="space-y-2">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
              {s.thumbnailDataUrl ? (
                <img src={s.thumbnailDataUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1e3a5f]/10 text-xs text-[#1e3a5f]">
                  {s.kind.toUpperCase()}
                </div>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-[#1e3a5f]">{s.filename}</span>
              <button
                type="button"
                aria-label={`Remove ${s.filename}`}
                className="rounded-lg p-2 text-[#1e3a5f]/60 hover:bg-[#1e3a5f]/10"
                onClick={() => removeSource(s.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {merged && sources.length > 0 && (
        <div className="rounded-xl border border-[#1e3a5f]/10 bg-[#1e3a5f]/5 px-3 py-2 text-xs text-[#1e3a5f]">
          <p className={WS_SECTION_LABEL}>Quick detection</p>
          <p className={cn("mt-1", WS_MUTED_TEXT)}>
            {merged.topic ?? "Worksheet"} · {merged.questions.length} questions · {merged.confidence}% confidence
          </p>
        </div>
      )}

      <Button
        className={cn(WS_PRIMARY_BTN, WS_TOUCH, "w-full")}
        disabled={loading || analyzing || !sources.length}
        onClick={() => void openPreview()}
      >
        {loading || analyzing ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <ScanLine className="mr-2 h-5 w-5" />
        )}
        {loading ? "Reconstructing…" : analyzing ? "Analyzing…" : "Reconstruct Worksheet"}
      </Button>

      <p className={cn("text-center", WS_CAPTION)}>
        Original layout inspires a new editable worksheet — never copied verbatim.
      </p>

      <ReconstructionPreviewSheet
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        analysis={merged}
        analyzing={analyzing}
        style={style}
        onStyleChange={setStyle}
        classLevel={classLevel}
        onClassChange={setClassLevel}
        subject={subject}
        onSubjectChange={setSubject}
        topic={topic}
        onTopicChange={setTopic}
        onConfirm={confirmReconstruct}
        loading={loading}
      />

      {stage && loading && null}
    </div>
  );
}
