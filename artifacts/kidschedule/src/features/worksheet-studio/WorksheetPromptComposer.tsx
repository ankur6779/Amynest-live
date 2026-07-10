import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  PROMPT_MAX_CHARS,
  PROMPT_PLACEHOLDERS,
  PROMPT_SUGGESTIONS,
  acceptReferenceMimeTypes,
  countReferenceImages,
  insertSuggestionIntoPrompt,
  validateReferenceBatch,
  type ReferenceImageMode,
  type WorksheetReferenceContext,
} from "@workspace/worksheet-studio";
import {
  Camera,
  Check,
  Clock,
  Eye,
  FileUp,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { WS_GLASS_CARD, WS_SECTION_LABEL, WS_OUTLINE_BTN, WS_MUTED_TEXT, WS_CAPTION, WS_TEXTAREA, WS_BTN_GRID, WS_TOUCH, WS_OVERLAY, WS_DIALOG } from "./worksheet-studio-theme";
import {
  compressPastedImage,
  filesFromClipboardEvent,
  processReferenceFiles,
  replaceReferenceFile,
} from "./reference-upload-service";
import { hapticWorksheetTap } from "./worksheet-haptics";
import { toast } from "sonner";
import { trackWorksheetEvent } from "./worksheet-studio-analytics";

const IMAGE_MODES: { id: ReferenceImageMode; label: string }[] = [
  { id: "same_style", label: "Use same style" },
  { id: "similar_style", label: "Similar style" },
  { id: "ignore_images", label: "Ignore images" },
  { id: "images_only", label: "Use images only" },
];

type Props = {
  prompt: string;
  onPromptChange: (v: string) => void;
  enhancedPrompt?: string;
  originalPrompt?: string;
  onEnhancedPromptChange: (v: string | undefined) => void;
  references: WorksheetReferenceContext[];
  onReferencesChange: (refs: WorksheetReferenceContext[]) => void;
  imageMode: ReferenceImageMode;
  onImageModeChange: (m: ReferenceImageMode) => void;
  onEnhance: () => void;
  enhancing: boolean;
  canEnhance?: boolean;
  onOpenHistory: () => void;
  showEnhancedEditor?: boolean;
};

function ReferenceCard({
  ref: item,
  onRemove,
  onReplace,
  onPreview,
}: {
  ref: WorksheetReferenceContext;
  onRemove: () => void;
  onReplace: (file: File) => void;
  onPreview: () => void;
}) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const thumb = item.thumbnailDataUrl ?? item.pageThumbnails?.[0];

  return (
    <div className="flex gap-3 rounded-xl border border-[#d4cfc4]/60 bg-white/90 p-2.5 animate-in fade-in duration-200">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f0ebe3]">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <FileUp className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[#1e3a5f]">{item.filename}</p>
        <p className={cn(WS_CAPTION, "mt-1")}>
          {item.kind.toUpperCase()}
          {item.pageCount ? ` · ${item.pageCount} pg` : ""}
          {item.imageCount ? ` · ${item.imageCount} img` : ""}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={onPreview}>
            <Eye className="mr-1 h-3 w-3" /> Preview
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs" onClick={() => replaceInputRef.current?.click()}>
            Replace
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 rounded-lg px-2 text-xs text-destructive" onClick={onRemove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <input
        ref={replaceInputRef}
        type="file"
        className="hidden"
        accept={acceptReferenceMimeTypes()}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onReplace(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function WorksheetPromptComposer({
  prompt,
  onPromptChange,
  enhancedPrompt,
  onEnhancedPromptChange,
  references,
  onReferencesChange,
  imageMode,
  onImageModeChange,
  onEnhance,
  enhancing,
  canEnhance = true,
  onOpenHistory,
  originalPrompt,
  showEnhancedEditor = true,
}: Props) {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewRef, setPreviewRef] = useState<WorksheetReferenceContext | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const placeholder = PROMPT_PLACEHOLDERS[placeholderIdx]!;
  const charCount = prompt.length;
  const hasImages = countReferenceImages(references) > 0;

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PROMPT_PLACEHOLDERS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [prompt, autoResize]);

  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    const check = validateReferenceBatch(
      references,
      files.map((f) => ({ sizeBytes: f.size, filename: f.name, mimeType: f.type })),
    );
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    setUploading(true);
    try {
      const processed = await processReferenceFiles(files);
      onReferencesChange([...references, ...processed]);
      trackWorksheetEvent("worksheet_reference_upload", { count: processed.length });
      toast.success(`${processed.length} reference${processed.length > 1 ? "s" : ""} added`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    await addFiles(Array.from(e.dataTransfer.files));
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const files = filesFromClipboardEvent(e.nativeEvent);
    if (!files.length) return;
    e.preventDefault();
    const prepared = await Promise.all(files.map((f) => compressPastedImage(f)));
    await addFiles(prepared);
  };

  const handleReplace = async (id: string, file: File) => {
    const existing = references.find((r) => r.id === id);
    if (!existing) return;
    setUploading(true);
    try {
      const next = await replaceReferenceFile(existing, file);
      onReferencesChange(references.map((r) => (r.id === id ? next : r)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Replace failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn(WS_GLASS_CARD, "w-full min-w-0 overflow-hidden p-0")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d4cfc4]/40 px-4 py-3">
        <p className={cn(WS_SECTION_LABEL, "min-w-0")}>AI Prompt Composer</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(WS_OUTLINE_BTN, WS_TOUCH, "h-12 shrink-0 rounded-xl px-4")}
          onClick={onOpenHistory}
          aria-label="Prompt history"
        >
          <Clock className="mr-1.5 h-4 w-4" /> History
        </Button>
      </div>

      <div
        className={cn(
          "relative w-full min-w-0 px-4 pt-4 pb-4 transition-colors duration-200",
          dragOver && "bg-[#1e3a5f]/5",
        )}
        onDragOver={(e) => { if (window.matchMedia("(min-width: 768px)").matches) { e.preventDefault(); setDragOver(true); } }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { if (window.matchMedia("(min-width: 768px)").matches) void handleDrop(e); }}
      >
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => {
            if (e.target.value.length <= PROMPT_MAX_CHARS) onPromptChange(e.target.value);
          }}
          onInput={autoResize}
          onPaste={(e) => void handlePaste(e)}
          placeholder={placeholder}
          rows={3}
          aria-label="Worksheet description"
          className={cn(WS_TEXTAREA, WS_TOUCH)}
        />

        <div className={cn(WS_BTN_GRID, "mt-3")}>
          <Button
            type="button"
            variant="outline"
            className={cn(WS_OUTLINE_BTN, WS_TOUCH, "h-12 w-full rounded-xl")}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload File
          </Button>
          <Button
            type="button"
            variant="outline"
            className={cn(WS_OUTLINE_BTN, WS_TOUCH, "h-12 w-full rounded-xl")}
            disabled={uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="mr-2 h-4 w-4" /> Camera
          </Button>
        </div>

        <div className={cn("mt-2 flex flex-wrap items-center justify-between gap-1", WS_CAPTION)}>
          <span className="min-w-0 break-words">
            <span className="md:hidden">Tap Upload or Camera · PDF · DOCX · PNG</span>
            <span className="hidden md:inline">{dragOver ? "Drop files here" : "Drag & drop · Upload · Paste · PDF · DOCX"}</span>
          </span>
          <span className={cn("shrink-0 tabular-nums", charCount > PROMPT_MAX_CHARS * 0.9 && "font-semibold text-amber-700")}>
            {charCount}/{PROMPT_MAX_CHARS}
          </span>
        </div>

        <Button
          type="button"
          className={cn(
            "mt-3 h-12 w-full rounded-2xl bg-gradient-to-r from-[#c9a227] to-[#e8c547] text-[#1e3a5f] font-semibold",
            WS_TOUCH,
          )}
          disabled={enhancing || !canEnhance}
          onClick={() => { void hapticWorksheetTap(); onEnhance(); }}
        >
          {enhancing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {enhancing ? "Enhancing…" : "Enhance Prompt"}
        </Button>

        {showEnhancedEditor && enhancedPrompt && (
          <div className="mt-3 animate-in slide-in-from-top-2 rounded-xl border border-[#c9a227]/40 bg-[#fffdf5] p-3 duration-200">
            <p className="text-xs font-bold uppercase tracking-wider text-[#c9a227]">Enhanced prompt</p>
            {originalPrompt && (
              <div className={cn("mt-2 rounded-lg bg-white/80 p-2 text-xs", WS_MUTED_TEXT)}>
                <span className="font-semibold text-[#1e3a5f]">Original: </span>
                {originalPrompt.slice(0, 120)}{originalPrompt.length > 120 ? "…" : ""}
              </div>
            )}
            <textarea
              value={enhancedPrompt}
              onChange={(e) => onEnhancedPromptChange(e.target.value)}
              rows={6}
              className={cn(WS_TEXTAREA, "mt-2 text-sm")}
              aria-label="Enhanced prompt"
            />
            <div className={cn(WS_BTN_GRID, "mt-2")}>
              <Button type="button" variant="outline" className={cn(WS_OUTLINE_BTN, "h-12 rounded-xl")} onClick={() => onEnhancedPromptChange(undefined)}>
                <X className="mr-1 h-3 w-3" /> Reject
              </Button>
              <Button type="button" className="h-12 rounded-xl bg-[#1e3a5f] text-white" onClick={() => onPromptChange(enhancedPrompt)}>
                <Check className="mr-1 h-3 w-3" /> Accept
              </Button>
              <Button type="button" variant="outline" className={cn(WS_OUTLINE_BTN, "col-span-2 h-12 rounded-xl sm:col-span-1")} disabled={enhancing} onClick={onEnhance}>
                <RefreshCw className="mr-1 h-3 w-3" /> Regenerate
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                void hapticWorksheetTap();
                onPromptChange(insertSuggestionIntoPrompt(prompt, s.insert));
              }}
              className={cn(
                "rounded-full border border-[#1e3a5f]/20 bg-white px-3 py-2.5 text-xs font-semibold text-[#1e3a5f]",
                WS_TOUCH, "active:scale-95",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {references.length > 0 && (
        <div className="space-y-2 border-t border-[#d4cfc4]/40 px-4 py-4">
          <p className={WS_SECTION_LABEL}>
            References ({references.length}/10)
            {hasImages && <ImageIcon className="ml-1 inline h-3.5 w-3.5" />}
          </p>
          {hasImages && (
            <div className="flex flex-wrap gap-2">
              {IMAGE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onImageModeChange(m.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium touch-manipulation",
                    imageMode === m.id
                      ? "bg-[#1e3a5f] text-white"
                      : "border border-[#d4cfc4]/60 bg-white text-[#1e3a5f]",
                  )}
                  aria-pressed={imageMode === m.id}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2">
            {references.map((r) => (
              <ReferenceCard
                key={r.id}
                ref={r}
                onRemove={() => onReferencesChange(references.filter((x) => x.id !== r.id))}
                onReplace={(f) => void handleReplace(r.id, f)}
                onPreview={() => setPreviewRef(r)}
              />
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptReferenceMimeTypes()}
        className="hidden"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {previewRef && (
        <div
          className={cn(WS_OVERLAY, "z-[70] items-center bg-black/60 backdrop-blur-sm")}
          role="dialog"
          aria-modal
          onClick={() => setPreviewRef(null)}
        >
          <div className={cn(WS_DIALOG, "bg-white")} onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-[#1e3a5f]">{previewRef.filename}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(previewRef.pageThumbnails ?? (previewRef.thumbnailDataUrl ? [previewRef.thumbnailDataUrl] : [])).map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`} className="rounded-lg border object-contain" />
              ))}
            </div>
            <Button className="mt-4 w-full" onClick={() => setPreviewRef(null)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
