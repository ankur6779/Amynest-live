import { useRef } from "react";
import { Camera, ImagePlus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { acceptImageTypes, readFileAsDataUrl } from "./image-service";
import { hapticWorksheetTap } from "./worksheet-haptics";

type Props = {
  onImage: (dataUrl: string) => void;
  onClose?: () => void;
  className?: string;
};

export function WorksheetImagePicker({ onImage, className }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void hapticWorksheetTap();
    try {
      const url = await readFileAsDataUrl(file);
      onImage(url);
    } catch {
      const { toast } = await import("sonner");
      toast.error("Could not load image", { description: "Try a smaller JPG or PNG file." });
    }
  };

  return (
    <div className={cn("flex gap-2", className)} role="group" aria-label="Add image">
      <input ref={galleryRef} type="file" accept={acceptImageTypes()} className="sr-only" onChange={(e) => void handleFiles(e.target.files)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => void handleFiles(e.target.files)} />
      <button type="button" aria-label="Choose from gallery" onClick={() => galleryRef.current?.click()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border bg-white text-sm font-medium touch-manipulation">
        <ImagePlus className="h-4 w-4" /> Gallery
      </button>
      <button type="button" aria-label="Take photo" onClick={() => cameraRef.current?.click()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border bg-white text-sm font-medium touch-manipulation">
        <Camera className="h-4 w-4" /> Camera
      </button>
      <label className="flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-white text-sm font-medium touch-manipulation">
        <Upload className="h-4 w-4" /> Drop
        <input type="file" accept={acceptImageTypes()} className="sr-only" onChange={(e) => void handleFiles(e.target.files)} />
      </label>
    </div>
  );
}

/** Paste image from clipboard */
export async function pasteImageFromClipboard(onImage: (url: string) => void): Promise<boolean> {
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (type) {
        const blob = await item.getType(type);
        const url = await readFileAsDataUrl(new File([blob], "paste.png", { type }));
        onImage(url);
        return true;
      }
    }
  } catch { /* clipboard denied */ }
  return false;
}
