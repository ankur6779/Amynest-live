import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Share2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  buildShareFilename,
  buildShareTextMilestone,
  buildShareTextWeekly,
  exportShareCard,
  renderMilestoneShareCard,
  renderWeeklyShareCard,
  type MilestoneShareCardData,
  type ShareCardExportMethod,
  type WeeklyShareCardData,
} from "@/lib/infant-share-cards";
import {
  trackMilestoneShareCardGenerated,
  trackMilestoneShareCardShared,
  trackWeeklyShareCardGenerated,
  trackWeeklyShareCardShared,
} from "@/lib/infant-hub-analytics";
import { InfantReferralPrompt } from "@/components/infant/infant-referral-prompt";

type InfantShareSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: "weekly" | "milestone";
  weeklyData?: WeeklyShareCardData;
  milestoneData?: MilestoneShareCardData;
  childId: number;
  ageMonths: number;
};

export function InfantShareSheet({
  open,
  onOpenChange,
  variant,
  weeklyData,
  milestoneData,
  childId,
  ageMonths,
}: InfantShareSheetProps) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<ShareCardExportMethod | null>(null);
  const [generated, setGenerated] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);

  const canvas = useMemo(() => {
    if (!open) return null;
    if (variant === "weekly" && weeklyData) return renderWeeklyShareCard(weeklyData);
    if (variant === "milestone" && milestoneData) return renderMilestoneShareCard(milestoneData);
    return null;
  }, [open, variant, weeklyData, milestoneData]);

  const shareMeta = useMemo(() => {
    if (variant === "weekly" && weeklyData) {
      return {
        filename: buildShareFilename("weekly", weeklyData.childFirstName),
        title: `${weeklyData.childFirstName}'s Week — AmyNest`,
        text: buildShareTextWeekly(weeklyData),
        milestoneCount: weeklyData.newMilestones.length,
      };
    }
    if (variant === "milestone" && milestoneData) {
      return {
        filename: buildShareFilename("milestone", milestoneData.childFirstName),
        title: `${milestoneData.childFirstName} — Milestone — AmyNest`,
        text: buildShareTextMilestone(milestoneData),
        milestoneCount: 1,
      };
    }
    return null;
  }, [variant, weeklyData, milestoneData]);

  useEffect(() => {
    if (!canvas) {
      setPreviewUrl(null);
      return;
    }
    void canvasToDataUrl(canvas).then(setPreviewUrl).catch(() => setPreviewUrl(null));
  }, [canvas]);

  useEffect(() => {
    if (!open || !shareMeta || generated) return;
    if (variant === "weekly") {
      trackWeeklyShareCardGenerated(childId, ageMonths, {
        milestoneCount: shareMeta.milestoneCount,
      });
    } else {
      trackMilestoneShareCardGenerated(childId, ageMonths);
    }
    setGenerated(true);
  }, [open, shareMeta, generated, variant, childId, ageMonths]);

  useEffect(() => {
    if (!open) setGenerated(false);
  }, [open]);

  const handleExport = useCallback(
    async (method: ShareCardExportMethod) => {
      if (!canvas || !shareMeta) return;
      setBusy(method);
      try {
        const ok = await exportShareCard(canvas, method, shareMeta);
        if (!ok) return;
        const shareMethod =
          method === "save_image"
            ? "image"
            : method === "whatsapp"
              ? "whatsapp"
              : method === "pdf"
                ? "pdf"
                : "system_share";
        if (variant === "weekly") {
          trackWeeklyShareCardShared(childId, ageMonths, shareMethod, {
            milestoneCount: shareMeta.milestoneCount,
          });
        } else {
          trackMilestoneShareCardShared(childId, ageMonths, shareMethod);
        }
        setReferralOpen(true);
      } finally {
        setBusy(null);
      }
    },
    [canvas, shareMeta, variant, childId, ageMonths],
  );

  const actions: Array<{
    method: ShareCardExportMethod;
    label: string;
    icon: typeof Download;
  }> = [
    {
      method: "save_image",
      label: t("components.infant_share.save_image", "Save Image"),
      icon: Download,
    },
    {
      method: "whatsapp",
      label: t("components.infant_share.whatsapp", "WhatsApp"),
      icon: MessageCircle,
    },
    {
      method: "system_share",
      label: t("components.infant_share.system_share", "Share"),
      icon: Share2,
    },
    {
      method: "pdf",
      label: t("components.infant_share.pdf", "PDF Export"),
      icon: FileText,
    },
  ];

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[92dvh] overflow-y-auto pb-8">
        <SheetHeader>
          <SheetTitle>
            {variant === "weekly"
              ? t("components.infant_share.weekly_title", "Share This Week")
              : t("components.infant_share.milestone_title", "Share with Family")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="mx-auto w-full max-w-[280px] aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-muted">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={shareMeta?.title ?? "Share card preview"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground px-2">
            {t(
              "components.infant_share.hint",
              "A keepsake card your family will love — save or share in one tap.",
            )}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {actions.map(({ method, label, icon: Icon }) => (
              <Button
                key={method}
                type="button"
                variant="outline"
                className="rounded-xl gap-2 h-12 text-xs font-semibold"
                disabled={!canvas || busy != null}
                onClick={() => void handleExport(method)}
              >
                {busy === method ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                {label}
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
    <InfantReferralPrompt
      open={referralOpen}
      onOpenChange={setReferralOpen}
      source={variant === "weekly" ? "weekly_share" : "milestone_share"}
    />
    </>
  );
}

async function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("blob_failed"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read_failed"));
        reader.readAsDataURL(blob);
      },
      "image/png",
      1,
    );
  });
}
