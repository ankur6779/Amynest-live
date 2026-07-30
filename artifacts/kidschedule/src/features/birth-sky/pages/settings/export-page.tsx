/**
 * Birth Sky Export screen — premium PDF generate / download / share / history.
 * Free users can view Birth Sky + kundli; PDF actions open the paywall.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useSubscription } from "@/hooks/use-subscription";
import { usePaywall } from "@/contexts/paywall-context";
import type { BirthProfile, SkySnapshot } from "../../domain/models/birth-profile";
import {
  downloadPdfExport,
  fetchPdfPreview,
  fetchPdfStatus,
  generatePdfExport,
  listPdfExports,
  sharePdfBlob,
  triggerBlobDownload,
  type PdfCompleteness,
  type PdfExportMeta,
} from "../../infrastructure/api/birth-sky-pdf-api";
import { canRenderKundliFromAstronomy } from "../../lib/build-kundli-bodies";
import { AmyAstroNorthIndianKundli } from "../../components/north-indian-kundli";
import { buildKundliBodies } from "../../lib/build-kundli-bodies";
import { regenerateBirthSky } from "../../infrastructure/api/birth-sky-lifecycle-api";

type Props = {
  profile: BirthProfile;
  snapshot: SkySnapshot;
  childName: string;
  onToast: (msg: string) => void;
  onSnapshotRefreshed?: (snapshot: SkySnapshot) => void;
};

type Progress = "idle" | "loading-status" | "generating" | "downloading" | "sharing";

export function BirthSkyExportPage({
  profile,
  snapshot,
  childName,
  onToast,
  onSnapshotRefreshed,
}: Props) {
  const authFetch = useAuthFetch();
  const { isPremium } = useSubscription();
  const { openPaywall } = usePaywall();
  const [progress, setProgress] = useState<Progress>("idle");
  const [completeness, setCompleteness] = useState<PdfCompleteness | null>(null);
  const [history, setHistory] = useState<PdfExportMeta[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHouses, setPreviewHouses] = useState<
    Array<{ house: number; name: string; sign: string; lord: string; planets: string[] }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const kundliGate = canRenderKundliFromAstronomy(snapshot.astronomy);

  const requirePremium = useCallback(() => {
    openPaywall("premium_insight", { module: "birth_sky", source: "pdf_export" });
  }, [openPaywall]);

  const refresh = useCallback(async () => {
    setProgress("loading-status");
    setError(null);
    try {
      const status = await fetchPdfStatus(authFetch, profile.profileId);
      setCompleteness(status.completeness);
      if (status.premium || isPremium) {
        try {
          const exports = await listPdfExports(authFetch, profile.profileId);
          setHistory(exports);
        } catch (err) {
          if (err instanceof Error && (err as { code?: string }).code === "premium_required") {
            /* ignore — free user */
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load export status");
    } finally {
      setProgress("idle");
    }
  }, [authFetch, profile.profileId, isPremium]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ensurePremium = () => {
    if (!isPremium) {
      requirePremium();
      return false;
    }
    return true;
  };

  const onGenerate = async (force: boolean) => {
    if (!ensurePremium()) return;
    setProgress("generating");
    setError(null);
    try {
      const meta = await generatePdfExport(authFetch, profile.profileId, { force });
      onToast(
        meta.cached
          ? "Opened previous PDF for this sky (no regenerate)."
          : "PDF ready — download or share anytime.",
      );
      await refresh();
      const { blob, fileName } = await downloadPdfExport(
        authFetch,
        profile.profileId,
        meta.exportId,
      );
      triggerBlobDownload(blob, fileName);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "premium_required") requirePremium();
      else if (code === "chart_incomplete") {
        setError(
          "Chart is incomplete for PDF (need full houses from birth time + place, no lite fallback).",
        );
      } else {
        setError(err instanceof Error ? err.message : "PDF generation failed");
      }
    } finally {
      setProgress("idle");
    }
  };

  const onDownloadHistory = async (exportId: string) => {
    if (!ensurePremium()) return;
    setProgress("downloading");
    try {
      const { blob, fileName } = await downloadPdfExport(
        authFetch,
        profile.profileId,
        exportId,
      );
      triggerBlobDownload(blob, fileName);
      onToast("PDF downloaded.");
    } catch (err) {
      if ((err as { code?: string }).code === "premium_required") requirePremium();
      else setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setProgress("idle");
    }
  };

  const onShare = async (exportId: string) => {
    if (!ensurePremium()) return;
    setProgress("sharing");
    try {
      const { blob, fileName } = await downloadPdfExport(
        authFetch,
        profile.profileId,
        exportId,
      );
      const result = await sharePdfBlob(blob, fileName);
      if (result === "shared") onToast("Shared.");
      else if (result === "downloaded") onToast("Share unavailable — PDF downloaded instead.");
    } catch (err) {
      if ((err as { code?: string }).code === "premium_required") requirePremium();
      else setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setProgress("idle");
    }
  };

  const onPreview = async () => {
    if (!ensurePremium()) return;
    setProgress("loading-status");
    try {
      const preview = await fetchPdfPreview(authFetch, profile.profileId);
      setPreviewHouses(
        (preview.houseDetails as Array<{
          house: number;
          name: string;
          sign: string;
          lord: string;
          planets: string[];
        }>) ?? [],
      );
      setPreviewOpen(true);
    } catch (err) {
      if ((err as { code?: string }).code === "premium_required") requirePremium();
      else setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setProgress("idle");
    }
  };

  const onRegenerateSky = async () => {
    setProgress("generating");
    setError(null);
    try {
      const result = await regenerateBirthSky(authFetch, profile.profileId);
      if (result.snapshot && onSnapshotRefreshed) {
        onSnapshotRefreshed(result.snapshot);
      }
      onToast("Sky regenerated. Generate a new PDF to capture the update.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setProgress("idle");
    }
  };

  const busy = progress !== "idle";
  const canPdf = completeness?.canExportPdf ?? false;
  const latest = history[0] ?? null;

  return (
    <div className="space-y-4" data-testid="birth-sky-export-screen">
      <p className="text-sm leading-relaxed text-[hsl(40_20%_96%/0.72)]">
        Download a professional AmyNest Birth Sky PDF with kundli, planet table, and house
        insights. PDF export is a Premium feature — viewing Birth Sky and kundli stays free.
      </p>

      {!isPremium ? (
        <div
          className="rounded-xl border border-[hsl(42_50%_55%/0.35)] bg-[hsl(275_30%_14%/0.55)] px-3 py-3"
          data-testid="birth-sky-pdf-paywall-hint"
        >
          <p className="text-sm text-[hsl(40_20%_96%/0.88)]">
            Premium unlocks unlimited PDF export, download, and history. AI insight quota is
            unchanged.
          </p>
          <Button
            type="button"
            className="mt-3 min-h-11 w-full rounded-xl"
            onClick={requirePremium}
            data-testid="birth-sky-pdf-upgrade"
          >
            Unlock Premium PDF
          </Button>
        </div>
      ) : null}

      {completeness ? (
        <div
          className="rounded-xl border border-[hsl(42_50%_60%/0.2)] bg-black/25 px-3 py-2 text-xs text-[hsl(40_20%_96%/0.7)]"
          data-testid="birth-sky-pdf-completeness"
        >
          Chart status: {completeness.status}
          {completeness.canExportPdf ? " · ready for PDF" : " · PDF blocked"}
          {completeness.fallbackUsed ? " · lite fallback (no PDF)" : ""}
          {" · "}
          {completeness.houseCount}/12 houses · {completeness.grahaHouseCount}/9 grahas mapped
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-300" role="alert" data-testid="birth-sky-export-error">
          {error}
        </p>
      ) : null}

      {busy ? (
        <p
          className="text-sm text-[hsl(42_60%_75%)]"
          role="status"
          data-testid="birth-sky-export-progress"
        >
          {progress === "generating"
            ? "Generating PDF…"
            : progress === "downloading"
              ? "Downloading…"
              : progress === "sharing"
                ? "Preparing share…"
                : "Loading…"}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Button
          type="button"
          className="min-h-12 w-full rounded-xl bg-gradient-to-r from-[hsl(275_50%_38%)] to-[hsl(42_55%_38%)] font-semibold"
          disabled={busy || (isPremium && !canPdf)}
          onClick={() => void onGenerate(false)}
          data-testid="birth-sky-pdf-download"
        >
          Download PDF
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="amy-astro-btn-secondary min-h-12 w-full rounded-xl"
          disabled={busy || !latest}
          onClick={() => (latest ? void onShare(latest.exportId) : void onGenerate(false))}
          data-testid="birth-sky-pdf-share"
        >
          Share PDF
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="amy-astro-btn-secondary min-h-12 w-full rounded-xl"
          disabled={busy || (isPremium && !canPdf)}
          onClick={() => void onGenerate(true)}
          data-testid="birth-sky-pdf-regenerate"
        >
          Regenerate PDF
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="amy-astro-btn-secondary min-h-12 w-full rounded-xl"
          disabled={busy}
          onClick={() => void onPreview()}
          data-testid="birth-sky-pdf-preview"
        >
          Preview chart data
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="amy-astro-btn-secondary min-h-12 w-full rounded-xl"
          disabled={busy}
          onClick={() => void onRegenerateSky()}
          data-testid="birth-sky-pdf-regen-sky"
        >
          Regenerate sky snapshot
        </Button>
      </div>

      <AmyAstroNorthIndianKundli
        bodies={buildKundliBodies(snapshot.astronomy, { childName })}
        canRenderKundli={kundliGate.canRender}
        disabledReason={kundliGate.reason}
        lagnaSign={snapshot.astronomy.lagna?.sign ?? snapshot.astronomy.risingSign}
        childName={childName}
        moonPhaseLabel={snapshot.astronomy.moonPhaseLabel}
      />

      <div data-testid="birth-sky-pdf-history">
        <h3 className="amy-astro-display text-base text-[hsl(42_70%_78%)]">Export history</h3>
        {!isPremium ? (
          <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.65)]">
            Premium members can reopen previous PDFs without regenerating.
          </p>
        ) : history.length === 0 ? (
          <p className="mt-2 text-sm text-[hsl(40_20%_96%/0.65)]">No PDFs yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.map((item) => (
              <li
                key={item.exportId}
                className="flex items-center justify-between gap-2 rounded-xl border border-[hsl(42_50%_60%/0.15)] bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[hsl(40_20%_96%/0.9)]">
                    {item.fileName}
                  </p>
                  <p className="text-[10px] text-[hsl(40_20%_96%/0.5)]">
                    {new Date(item.createdAt).toLocaleString()} ·{" "}
                    {Math.round(item.byteSize / 1024)} KB
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-lg"
                    onClick={() => void onDownloadHistory(item.exportId)}
                    data-testid={`birth-sky-pdf-reopen-${item.exportId}`}
                  >
                    Open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {previewOpen ? (
        <div
          className="rounded-xl border border-[hsl(42_50%_60%/0.25)] bg-black/40 p-3"
          data-testid="birth-sky-pdf-preview-panel"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[hsl(42_70%_78%)]">House preview</h3>
            <button
              type="button"
              className="text-xs text-[hsl(42_60%_75%)]"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </button>
          </div>
          <ul className="max-h-64 space-y-1 overflow-y-auto text-xs text-[hsl(40_20%_96%/0.8)]">
            {previewHouses.map((h) => (
              <li key={h.house}>
                H{h.house} {h.name} · {h.sign} (lord {h.lord}) ·{" "}
                {h.planets?.length ? h.planets.join(", ") : "empty"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
