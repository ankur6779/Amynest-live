import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import {
  Camera, Share2, Trash2, ImagePlus, Sparkles, Wand2, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  costumePhotoKey,
  costumePreviewKey,
  loadCostumePhoto,
  removeCostumePhoto,
  saveCostumePhoto,
} from "@/lib/event-prep-local";
import { eventPrepPanelCard } from "@/lib/event-prep-zone-theme";
import { EventPrepMirrorOverlay } from "@/components/event-prep/event-prep-mirror-overlay";
import {
  EventPrepDraggableProps,
  EventPrepPropToolbar,
} from "@/components/event-prep/event-prep-draggable-props";
import {
  buildCostumeProps,
  cloneProps,
  type CostumeProp,
} from "@/lib/event-prep-costume-props";
import {
  captureVideoFrame,
  composeCostumePreview,
} from "@/lib/event-prep-costume-preview";

interface Props {
  eventId: string;
  childId: number;
  childName: string;
  childPhotoUrl?: string | null;
  characterId?: string;
  characterName?: string;
  costumeEmoji?: string;
  accent?: [string, string];
  costumeImageUrl?: string;
  materials?: string[];
  t: TFunction;
}

const MAX_DIM = 720;
const JPEG_QUALITY = 0.82;
const DEFAULT_ACCENT: [string, string] = ["#FFB800", "#FF6B35"];
const DEFAULT_EMOJI = "🎭";
const STICKER_ADDONS = ["✨", "⭐", "👑", "🦸", "🎤", "🪄", "🎉"] as const;

type Tab = "mirror" | "ready";

async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

async function dataUrlFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return compressImage(new File([blob], "photo.jpg", { type: blob.type }));
  } catch {
    return null;
  }
}

export function EventPrepPhotoMoment({
  eventId,
  childId,
  childName,
  childPhotoUrl,
  characterId,
  characterName,
  costumeEmoji = DEFAULT_EMOJI,
  accent = DEFAULT_ACCENT,
  costumeImageUrl,
  materials = [],
  t,
}: Props) {
  const previewStorageKey = costumePreviewKey(eventId, childId, characterId);
  const readyStorageKey = costumePhotoKey(eventId, childId, characterId);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const costumeLabel = characterName ?? childName;
  const defaultProps = useMemo(
    () => buildCostumeProps(costumeEmoji, costumeLabel, materials),
    [costumeEmoji, costumeLabel, materials],
  );

  const [tab, setTab] = useState<Tab>("mirror");
  const [sourcePhoto, setSourcePhoto] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(() =>
    loadCostumePhoto(previewStorageKey),
  );
  const [readyPhoto, setReadyPhoto] = useState<string | null>(() =>
    loadCostumePhoto(readyStorageKey),
  );
  const [props, setProps] = useState<CostumeProp[]>(() => cloneProps(defaultProps));
  const [selectedPropId, setSelectedPropId] = useState<string | null>("main");
  const [showCostume, setShowCostume] = useState(true);
  const [cameraOn, setCameraOn] = useState(false);
  const [composing, setComposing] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    setProps(cloneProps(defaultProps));
    setSelectedPropId("main");
  }, [defaultProps]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (sourcePhoto || !childPhotoUrl) return;
    void dataUrlFromUrl(childPhotoUrl).then((url) => {
      setSourcePhoto(url ?? childPhotoUrl);
    });
  }, [childPhotoUrl, sourcePhoto]);

  const selectedProp = props.find((p) => p.id === selectedPropId) ?? null;

  const addSticker = (emoji: string) => {
    const id = `addon-${Date.now()}`;
    setProps((prev) => [
      ...prev,
      {
        id,
        emoji,
        label: "Sticker",
        kind: "accessory",
        x: 0.5 + (Math.random() - 0.5) * 0.12,
        y: 0.35 + (Math.random() - 0.5) * 0.1,
        scale: 0.7,
        rotation: (Math.random() - 0.5) * 20,
      },
    ]);
    setSelectedPropId(id);
  };

  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 900 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      fileRef.current?.click();
    }
  };

  const onPickFile = async (file: File) => {
    try {
      const dataUrl = await compressImage(file);
      setSourcePhoto(dataUrl);
      stopCamera();
    } catch { /* ignore */ }
  };

  const saveComposedPreview = async (basePhoto: string) => {
    setComposing(true);
    try {
      const composed = await composeCostumePreview({
        childPhotoDataUrl: basePhoto,
        childName,
        costumeLabel,
        emoji: costumeEmoji,
        accent,
        costumeImageUrl,
        props: showCostume ? props : [],
      });
      saveCostumePhoto(previewStorageKey, composed);
      setPreviewPhoto(composed);
      setSourcePhoto(basePhoto);
      stopCamera();
    } catch { /* ignore */ } finally {
      setComposing(false);
    }
  };

  const captureFromMirror = async () => {
    if (cameraOn && videoRef.current) {
      const frame = captureVideoFrame(videoRef.current);
      await saveComposedPreview(frame);
      return;
    }
    if (sourcePhoto) {
      await saveComposedPreview(sourcePhoto);
    }
  };

  const onShare = async (photo: string) => {
    setSharing(true);
    try {
      if (typeof navigator.share === "function" && navigator.canShare) {
        const res = await fetch(photo);
        const blob = await res.blob();
        const file = new File([blob], "costume-preview.jpg", { type: "image/jpeg" });
        const payload = {
          title: t("screens.event_prep.photo_share_title", { name: childName }),
          text: t("screens.event_prep.mirror_share_text", {
            name: childName,
            costume: costumeLabel,
          }),
          files: [file],
        };
        if (navigator.canShare(payload)) {
          await navigator.share(payload);
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({
          title: t("screens.event_prep.photo_share_title", { name: childName }),
          text: t("screens.event_prep.mirror_share_text", {
            name: childName,
            costume: costumeLabel,
          }),
        });
      }
    } catch { /* cancelled */ } finally {
      setSharing(false);
    }
  };

  const mirrorBase = cameraOn ? null : sourcePhoto;
  const mirrorActive = (cameraOn || mirrorBase) && !previewPhoto;

  return (
    <div className={cn(eventPrepPanelCard(), "p-4 space-y-3")}>
      <div className="flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-amber-300 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-quicksand font-bold text-sm text-foreground">
            {t("screens.event_prep.mirror_title")}
          </h3>
          <p className="text-xs text-muted-foreground/85 mt-0.5">
            {t("screens.event_prep.mirror_sub", { name: childName, costume: costumeLabel })}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("mirror")}
          className={cn(
            "flex-1 rounded-full px-3 py-2 text-xs font-bold transition",
            tab === "mirror"
              ? "bg-amber-400/20 text-amber-100 border border-amber-400/40"
              : "border border-white/10 text-muted-foreground",
          )}
        >
          <Wand2 className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
          {t("screens.event_prep.mirror_tab_preview")}
        </button>
        <button
          type="button"
          onClick={() => setTab("ready")}
          className={cn(
            "flex-1 rounded-full px-3 py-2 text-xs font-bold transition",
            tab === "ready"
              ? "bg-amber-400/20 text-amber-100 border border-amber-400/40"
              : "border border-white/10 text-muted-foreground",
          )}
        >
          <Camera className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
          {t("screens.event_prep.mirror_tab_ready")}
        </button>
      </div>

      {tab === "mirror" ? (
        <div className="space-y-3">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-white/15 bg-black/30">
            {cameraOn ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover scale-x-[-1]"
              />
            ) : previewPhoto ? (
              <img src={previewPhoto} alt="" className="h-full w-full object-cover" />
            ) : mirrorBase ? (
              <img src={mirrorBase} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <div className="text-5xl" aria-hidden>{costumeEmoji}</div>
                <p className="text-sm text-muted-foreground">
                  {t("screens.event_prep.mirror_empty_hint")}
                </p>
              </div>
            )}

            {mirrorActive && (
              <>
                <EventPrepMirrorOverlay
                  childName={childName}
                  costumeLabel={costumeLabel}
                  accent={accent}
                  costumeImageUrl={costumeImageUrl}
                  showCostume={showCostume}
                />
                <EventPrepDraggableProps
                  props={props}
                  onChange={setProps}
                  showCostume={showCostume}
                  selectedId={selectedPropId}
                  onSelect={setSelectedPropId}
                />
              </>
            )}
          </div>

          {mirrorActive && (
            <>
              <p className="text-[11px] text-center text-amber-200/80 font-medium">
                {t("screens.event_prep.mirror_drag_hint")}
              </p>

              <EventPrepPropToolbar
                selected={selectedProp}
                onScale={(delta) => {
                  if (!selectedPropId) return;
                  setProps((prev) =>
                    prev.map((p) =>
                      p.id === selectedPropId
                        ? { ...p, scale: Math.min(2, Math.max(0.4, p.scale + delta)) }
                        : p,
                    ),
                  );
                }}
                onRotate={(delta) => {
                  if (!selectedPropId) return;
                  setProps((prev) =>
                    prev.map((p) =>
                      p.id === selectedPropId ? { ...p, rotation: p.rotation + delta } : p,
                    ),
                  );
                }}
                onReset={() => {
                  setProps(cloneProps(defaultProps));
                  setSelectedPropId("main");
                }}
                resetLabel={t("screens.event_prep.mirror_reset_props")}
                scaleLabel={t("screens.event_prep.mirror_scale_prop")}
                rotateLabel={t("screens.event_prep.mirror_rotate_prop")}
              />

              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {STICKER_ADDONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addSticker(emoji)}
                    className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-xl transition hover:border-amber-400/40 hover:bg-amber-400/10 active:scale-95"
                    aria-label={t("screens.event_prep.mirror_add_sticker")}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full rounded-full border-white/15"
                onClick={() => setShowCostume((v) => !v)}
              >
                {showCostume ? <EyeOff className="h-3.5 w-3.5 mr-1.5" /> : <Eye className="h-3.5 w-3.5 mr-1.5" />}
                {showCostume
                  ? t("screens.event_prep.mirror_hide_costume")
                  : t("screens.event_prep.mirror_show_costume")}
              </Button>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {!previewPhoto && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/15"
                  onClick={() => void startCamera()}
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  {t("screens.event_prep.mirror_selfie")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full border-white/15"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                  {t("screens.event_prep.mirror_pick_photo")}
                </Button>
              </>
            )}
            {(cameraOn || sourcePhoto) && !previewPhoto && (
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                disabled={composing}
                onClick={() => void captureFromMirror()}
              >
                <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                {composing
                  ? t("screens.event_prep.mirror_saving")
                  : t("screens.event_prep.mirror_save_look")}
              </Button>
            )}
          </div>

          {previewPhoto && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="flex-1 rounded-full"
                disabled={sharing}
                onClick={() => void onShare(previewPhoto)}
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                {t("screens.event_prep.mirror_share_look")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-white/15"
                onClick={() => {
                  removeCostumePhoto(previewStorageKey);
                  setPreviewPhoto(null);
                  setSourcePhoto(null);
                  setProps(cloneProps(defaultProps));
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground/85">
            {t("screens.event_prep.photo_moment_sub")}
          </p>
          {readyPhoto ? (
            <div className="relative rounded-xl overflow-hidden border border-white/10">
              <img src={readyPhoto} alt="" className="w-full max-h-56 object-cover" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full h-8"
                  disabled={sharing}
                  onClick={() => void onShare(readyPhoto)}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full h-8"
                  onClick={() => {
                    removeCostumePhoto(readyStorageKey);
                    setReadyPhoto(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-amber-400/30",
                "bg-amber-400/5 px-4 py-8 transition hover:border-amber-400/50 hover:bg-amber-400/10",
              )}
            >
              <ImagePlus className="h-8 w-8 text-amber-300/80" />
              <span className="text-sm font-semibold text-foreground/90">
                {t("screens.event_prep.photo_add_cta")}
              </span>
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture={tab === "ready" ? "environment" : "user"}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (tab === "ready") {
            void compressImage(f).then((url) => {
              saveCostumePhoto(readyStorageKey, url);
              setReadyPhoto(url);
            });
          } else {
            void onPickFile(f);
          }
          e.target.value = "";
        }}
      />
    </div>
  );
}
