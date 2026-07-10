import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlignCenter, AlignLeft, AlignRight, Bold, ChevronLeft, ClipboardPaste, Copy, FlipHorizontal,
  Group, ImagePlus, Layers, Lock,
  Redo2, RotateCw,
  Shapes, Trash2, Type, Undo2,
} from "lucide-react";
import { WS_TOOLBAR, WS_OUTLINE_BTN } from "./worksheet-studio-theme";
import { hapticWorksheetTap } from "./worksheet-haptics";

type Props = {
  onBack?: () => void;
  onText: () => void;
  onImage: () => void;
  onShape: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onGroup: () => void;
  onPreview: () => void;
  onExport: () => void;
  onBold: () => void;
  onAlign: (a: "left" | "center" | "right") => void;
  onLock: () => void;
  onLayer: (dir: "up" | "down") => void;
  onFlip: () => void;
  onRotate: () => void;
};

function ToolBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => { void hapticWorksheetTap(); onClick(); }}
      className="flex h-[3.25rem] w-[3.25rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-medium text-[#1e3a5f]/80 transition-colors active:bg-[#1e3a5f]/8 touch-manipulation min-h-12 min-w-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a5f]/40"
    >
      <span className="flex h-7 w-7 items-center justify-center">{children}</span>
      <span className="max-w-[3.25rem] truncate">{label}</span>
    </button>
  );
}

export function WorksheetToolbar(props: Props) {
  return (
    <div className={WS_TOOLBAR}>
      <div
        className="flex items-stretch gap-0.5 overflow-x-auto px-2 pt-2 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="toolbar"
        aria-label="Editor tools"
      >
        <ToolBtn label="Text" onClick={props.onText}><Type className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Image" onClick={props.onImage}><ImagePlus className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Shape" onClick={props.onShape}><Shapes className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Undo" onClick={props.onUndo}><Undo2 className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Redo" onClick={props.onRedo}><Redo2 className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Delete" onClick={props.onDelete}><Trash2 className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Copy" onClick={props.onCopy}><Copy className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Paste" onClick={props.onPaste}><ClipboardPaste className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Group" onClick={props.onGroup}><Group className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Bold" onClick={props.onBold}><Bold className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Left" onClick={() => props.onAlign("left")}><AlignLeft className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Center" onClick={() => props.onAlign("center")}><AlignCenter className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Right" onClick={() => props.onAlign("right")}><AlignRight className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Lock" onClick={props.onLock}><Lock className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Layer" onClick={() => props.onLayer("up")}><Layers className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Flip" onClick={props.onFlip}><FlipHorizontal className="h-5 w-5" /></ToolBtn>
        <ToolBtn label="Rotate" onClick={props.onRotate}><RotateCw className="h-5 w-5" /></ToolBtn>
      </div>
      <div className="flex gap-2 px-3 py-2.5">
        {props.onBack && (
          <Button
            variant="outline"
            className={cn(WS_OUTLINE_BTN, "h-12 shrink-0 gap-1 px-3 text-sm font-semibold touch-manipulation")}
            onClick={props.onBack}
            aria-label="Back to Worksheet Studio home"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Studio
          </Button>
        )}
        <Button
          variant="outline"
          className="h-12 flex-1 rounded-xl border-[#1e3a5f]/15 bg-white/80 text-sm font-semibold touch-manipulation"
          onClick={props.onPreview}
        >
          Preview
        </Button>
        <Button
          className={cn(
            "h-12 flex-1 rounded-xl text-sm font-semibold touch-manipulation",
            "bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8a] text-white shadow-md",
          )}
          onClick={props.onExport}
        >
          Export
        </Button>
      </div>
    </div>
  );
}
