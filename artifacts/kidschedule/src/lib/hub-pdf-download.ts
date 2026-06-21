/** Parent Hub PDF save — blob + anchor (works in Capacitor / Android WebView). */

export type HubDownloadQuota = {
  limit: number | null;
  used: number;
  remaining: number | null;
};

export type HubDownloadQuotaPair = {
  dailyQuota?: HubDownloadQuota;
  lifetimeQuota?: HubDownloadQuota;
  downloadWallet?: HubDownloadWallet;
};

export type HubDownloadWallet = {
  enabled: boolean;
  availableToday: number;
  dailyAllocation: number;
  dailyRefresh: number;
  dailyUsed: number;
  dailyRemaining: number;
  bankedDownloads: number;
  maxBank: number;
  maxAvailable: number;
  lastRefreshAt: string | null;
};

function parseIntHeader(res: Response, name: string): number | null {
  const raw = res.headers.get(name);
  if (raw == null || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/** Parse quota headers set by coloring / funsheets download endpoints. */
export function parseHubQuotaHeaders(res: Response): HubDownloadQuotaPair {
  const dailyLimit = parseIntHeader(res, "X-Hub-Daily-Limit");
  const dailyUsed = parseIntHeader(res, "X-Hub-Daily-Used");
  const dailyRemaining = parseIntHeader(res, "X-Hub-Daily-Remaining");
  const lifetimeLimit = parseIntHeader(res, "X-Hub-Lifetime-Limit");
  const lifetimeUsed = parseIntHeader(res, "X-Hub-Lifetime-Used");
  const lifetimeRemaining = parseIntHeader(res, "X-Hub-Lifetime-Remaining");
  const walletEnabled = res.headers.get("X-Hub-Download-Wallet-Enabled") === "1";

  const out: HubDownloadQuotaPair = {};

  if (dailyLimit != null && dailyUsed != null && dailyRemaining != null) {
    out.dailyQuota = { limit: dailyLimit, used: dailyUsed, remaining: dailyRemaining };
  }

  if (lifetimeLimit != null && lifetimeUsed != null && lifetimeRemaining != null) {
    out.lifetimeQuota = {
      limit: lifetimeLimit,
      used: lifetimeUsed,
      remaining: lifetimeRemaining,
    };
  } else if (res.headers.get("X-Hub-Lifetime-Limit") === "") {
    out.lifetimeQuota = {
      limit: null,
      used: lifetimeUsed ?? 0,
      remaining: null,
    };
  }

  if (walletEnabled) {
    out.downloadWallet = {
      enabled: true,
      availableToday: parseIntHeader(res, "X-Hub-Download-Wallet-Available") ?? 0,
      dailyAllocation: parseIntHeader(res, "X-Hub-Download-Wallet-Daily-Allocation") ?? 5,
      dailyRefresh: parseIntHeader(res, "X-Hub-Download-Wallet-Daily-Refresh") ?? 5,
      dailyUsed: parseIntHeader(res, "X-Hub-Download-Wallet-Daily-Used") ?? 0,
      dailyRemaining: parseIntHeader(res, "X-Hub-Download-Wallet-Daily-Remaining") ?? 0,
      bankedDownloads: parseIntHeader(res, "X-Hub-Download-Wallet-Banked") ?? 0,
      maxBank: parseIntHeader(res, "X-Hub-Download-Wallet-Max-Bank") ?? 25,
      maxAvailable: parseIntHeader(res, "X-Hub-Download-Wallet-Max-Available") ?? 30,
      lastRefreshAt: res.headers.get("X-Hub-Download-Wallet-Last-Refresh-At") || null,
    };
  }

  return out;
}

function fileNameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  if (plain?.[1]) return plain[1].trim();
  return fallback;
}

export function savePdfBlob(fileName: string, blob: Blob): void {
  const safeName = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** Save PDF from a fetch Response (application/pdf body). Returns false on empty/failed body. */
export async function savePdfFromResponse(
  res: Response,
  fallbackFileName: string,
): Promise<boolean> {
  if (!res.ok) return false;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) return false;

  const blob = await res.blob();
  if (blob.size === 0) return false;

  const name = fileNameFromDisposition(
    res.headers.get("content-disposition"),
    fallbackFileName,
  );
  savePdfBlob(name, blob);
  return true;
}

/** Fetch a hub PDF URL and trigger a device save. */
export async function downloadPdfFromUrl(
  url: string,
  fileName: string,
  init?: RequestInit,
): Promise<boolean> {
  const res = await fetch(url, init);
  return savePdfFromResponse(res, fileName);
}

/** Asia/Kolkata calendar date — matches server-side hub download quotas. */
export function hubTodayIst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}
