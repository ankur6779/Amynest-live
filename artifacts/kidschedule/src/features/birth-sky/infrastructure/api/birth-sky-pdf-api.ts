/**
 * Birth Sky premium PDF API client.
 */

import type { AuthFetchFn } from "./birth-sky-api";
import { getApiUrl } from "@/lib/api";

export type PdfCompleteness = {
  status: string;
  canRenderKundli: boolean;
  canExportPdf: boolean;
  reasons: string[];
  fallbackUsed: boolean;
  houseCount: number;
  grahaHouseCount: number;
};

export type PdfExportMeta = {
  exportId: string;
  profileId: string;
  snapshotId: string;
  snapshotVersion: string;
  engineVersion: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  chartDetailsVersion: string | null;
  createdAt: string;
  cached?: boolean;
};

export async function fetchPdfStatus(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<{
  premium: boolean;
  completeness: PdfCompleteness;
  snapshotId: string;
  snapshotVersion: string;
  engineVersion: string;
  mode: string;
}> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/pdf/status`),
  );
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      generationStatus?: string;
    };
    const err = new Error(body.error === "snapshot_stale" ? "snapshot_stale" : "pdf_status_conflict") as Error & {
      code: string;
      generationStatus?: string;
    };
    err.code = body.error === "snapshot_stale" ? "snapshot_stale" : "pdf_status_conflict";
    err.generationStatus = body.generationStatus;
    throw err;
  }
  if (!res.ok) throw new Error(`pdf_status_failed:${res.status}`);
  return res.json();
}

export async function listPdfExports(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<PdfExportMeta[]> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/pdf/exports`),
  );
  if (res.status === 402) {
    const err = new Error("premium_required") as Error & { code: string };
    err.code = "premium_required";
    throw err;
  }
  if (!res.ok) throw new Error(`pdf_list_failed:${res.status}`);
  const data = (await res.json()) as { exports: PdfExportMeta[] };
  return data.exports ?? [];
}

export async function generatePdfExport(
  authFetch: AuthFetchFn,
  profileId: string,
  opts?: { force?: boolean },
): Promise<PdfExportMeta> {
  const q = opts?.force ? "?force=1" : "";
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/pdf/generate${q}`),
    { method: "POST" },
  );
  if (res.status === 402) {
    const err = new Error("premium_required") as Error & { code: string };
    err.code = "premium_required";
    throw err;
  }
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      completeness?: PdfCompleteness;
      generationStatus?: string;
    };
    if (body.error === "snapshot_stale") {
      const err = new Error("snapshot_stale") as Error & {
        code: string;
        generationStatus?: string;
      };
      err.code = "snapshot_stale";
      err.generationStatus = body.generationStatus;
      throw err;
    }
    const err = new Error("chart_incomplete") as Error & {
      code: string;
      completeness?: PdfCompleteness;
    };
    err.code = "chart_incomplete";
    err.completeness = body.completeness;
    throw err;
  }
  if (!res.ok) throw new Error(`pdf_generate_failed:${res.status}`);
  return res.json();
}

export async function downloadPdfExport(
  authFetch: AuthFetchFn,
  profileId: string,
  exportId: string,
): Promise<{ blob: Blob; fileName: string }> {
  const res = await authFetch(
    getApiUrl(
      `/api/birth-sky/profiles/${profileId}/pdf/exports/${exportId}/download`,
    ),
  );
  if (res.status === 402) {
    const err = new Error("premium_required") as Error & { code: string };
    err.code = "premium_required";
    throw err;
  }
  if (!res.ok) throw new Error(`pdf_download_failed:${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  return { blob, fileName: match?.[1] ?? "AmyNest_BirthSky.pdf" };
}

export async function fetchPdfPreview(
  authFetch: AuthFetchFn,
  profileId: string,
): Promise<{
  completeness: PdfCompleteness;
  houseDetails: unknown[];
  planetDetails: unknown[];
  lagna: { sign: string | null } | null;
}> {
  const res = await authFetch(
    getApiUrl(`/api/birth-sky/profiles/${profileId}/pdf/preview`),
  );
  if (res.status === 402) {
    const err = new Error("premium_required") as Error & { code: string };
    err.code = "premium_required";
    throw err;
  }
  if (!res.ok) throw new Error(`pdf_preview_failed:${res.status}`);
  return res.json();
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function sharePdfBlob(
  blob: Blob,
  fileName: string,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], fileName, { type: "application/pdf" });
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: fileName,
        text: "AmyNest Birth Sky chart",
      });
      return "shared";
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }
  triggerBlobDownload(blob, fileName);
  return "downloaded";
}
