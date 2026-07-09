/** Selection style model — shared between fabric bridge and property inspector. */

export type SelectionObjectType = "text" | "shape" | "image" | "group" | "unknown";

export interface SelectionStyle {
  objectType: SelectionObjectType;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  underline?: boolean;
  fill?: string;
  backgroundColor?: string;
  lineHeight?: number;
  charSpacing?: number;
  textAlign?: string;
  stroke?: string;
  strokeWidth?: number;
  rx?: number;
  opacity?: number;
  angle?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  flipX?: boolean;
  flipY?: boolean;
  locked?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
}

export const FONT_FAMILIES = [
  "Arial",
  "Georgia",
  "Times New Roman",
  "Comic Sans MS",
  "Verdana",
] as const;

export function detectObjectType(obj: import("fabric").FabricObject): SelectionObjectType {
  const data = (obj as { data?: { elementType?: string } }).data;
  if (data?.elementType === "text") return "text";
  if (data?.elementType === "shape") return "shape";
  if (data?.elementType === "image") return "image";
  if (obj.type === "textbox" || obj.type === "i-text" || obj.type === "text") return "text";
  if (obj.type === "image") return "image";
  if (obj.type === "group") return "group";
  if (obj.type === "rect" || obj.type === "circle" || obj.type === "triangle" || obj.type === "line") return "shape";
  return "unknown";
}

export function extractSelectionStyle(
  obj: import("fabric").FabricObject,
  scale: number,
): SelectionStyle {
  const objectType = detectObjectType(obj);
  const bound = obj.getBoundingRect();
  const style: SelectionStyle = {
    objectType,
    opacity: obj.opacity ?? 1,
    angle: obj.angle ?? 0,
    left: Math.round((obj.left ?? 0) / scale),
    top: Math.round((obj.top ?? 0) / scale),
    width: Math.round(bound.width / scale),
    height: Math.round(bound.height / scale),
    flipX: !!obj.flipX,
    flipY: !!obj.flipY,
    locked: !!obj.lockMovementX,
  };

  if ("fontSize" in obj && obj.fontSize != null) style.fontSize = Math.round((obj.fontSize as number) / scale);
  if ("fontFamily" in obj && obj.fontFamily) style.fontFamily = String(obj.fontFamily);
  if ("fontWeight" in obj) style.fontWeight = String(obj.fontWeight ?? "normal");
  if ("fontStyle" in obj) style.fontStyle = String(obj.fontStyle ?? "normal");
  if ("underline" in obj) style.underline = !!obj.underline;
  if ("fill" in obj && obj.fill) style.fill = String(obj.fill);
  if ("textBackgroundColor" in obj && obj.textBackgroundColor) style.backgroundColor = String(obj.textBackgroundColor);
  if ("lineHeight" in obj && obj.lineHeight != null) style.lineHeight = obj.lineHeight as number;
  if ("charSpacing" in obj && obj.charSpacing != null) style.charSpacing = (obj.charSpacing as number) / scale;
  if ("textAlign" in obj) style.textAlign = String(obj.textAlign ?? "left");
  if ("stroke" in obj && obj.stroke) style.stroke = String(obj.stroke);
  if ("strokeWidth" in obj && obj.strokeWidth != null) style.strokeWidth = (obj.strokeWidth as number) / scale;
  if ("rx" in obj && obj.rx != null) style.rx = (obj.rx as number) / scale;

  const filters = (obj as { filters?: Array<{ type?: string; brightness?: number; contrast?: number; saturation?: number }> }).filters;
  if (filters?.length) {
    for (const f of filters) {
      if (f.type === "Brightness") style.brightness = f.brightness ?? 0;
      if (f.type === "Contrast") style.contrast = f.contrast ?? 0;
      if (f.type === "Saturation") style.saturation = f.saturation ?? 0;
    }
  }

  return style;
}
