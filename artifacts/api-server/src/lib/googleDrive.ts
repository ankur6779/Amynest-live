/**
 * Shared Google Drive API v3 helpers for server-side listing (API key).
 *
 * Requirements:
 * - Enable "Google Drive API" in Google Cloud Console for the key's project.
 * - Folders/files must be reachable with the key (typically "Anyone with the link"
 *   can view).
 * - API key restrictions on Render: use "None" or "IP addresses" — NOT "HTTP referrers"
 *   (Node has no browser referrer).
 *
 * Env (first non-empty wins): GOOGLE_API_KEY, GOOGLE_DRIVE_API_KEY, GOOGLE_DRIVE_KEY
 */
import { logger } from "./logger";
import { getDriveApiKey, getDriveKeyDiagnostics } from "./env";

export { getDriveApiKey, getDriveKeyDiagnostics };

const DRIVE_V3_FILES = "https://www.googleapis.com/drive/v3/files";

export interface DriveListFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  videoMediaMetadata?: { durationMillis?: string };
}

export async function driveFilesList(params: {
  apiKey: string;
  q: string;
  fields: string;
  pageSize?: number;
  pageToken?: string;
}): Promise<{ files: DriveListFile[]; nextPageToken?: string }> {
  const sp = new URLSearchParams({
    q: params.q,
    fields: params.fields,
    key: params.apiKey,
    pageSize: String(params.pageSize ?? 1000),
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  if (params.pageToken) sp.set("pageToken", params.pageToken);

  const url = `${DRIVE_V3_FILES}?${sp.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "AmyNest-API-Server/1.0",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { evt: "drive.fetch_failed", message, q: params.q },
      "Google Drive API network error",
    );
    throw new Error(`Google Drive API network error: ${message}`);
  }

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 800);
    let reason: string | undefined;
    try {
      const j = JSON.parse(text) as {
        error?: { message?: string; status?: string; errors?: Array<{ reason?: string }> };
      };
      if (j?.error?.message) {
        detail = `${j.error.status ?? String(res.status)}: ${j.error.message}`;
        reason = j.error.errors?.[0]?.reason;
      }
    } catch {
      /* keep truncated body */
    }
    logger.error(
      {
        evt: "drive.api_error",
        status: res.status,
        reason,
        detail: detail.slice(0, 400),
        q: params.q,
      },
      "Google Drive API request failed",
    );
    if (res.status === 403) {
      throw new Error(
        `Google Drive API 403: ${detail}. Check: Drive API enabled, key restrictions (not HTTP-referrer-only), folder shared as "Anyone with the link".`,
      );
    }
    throw new Error(`Google Drive API ${res.status}: ${detail}`);
  }

  const data = JSON.parse(text) as {
    files?: DriveListFile[];
    nextPageToken?: string;
  };
  return {
    files: data.files ?? [],
    nextPageToken: data.nextPageToken,
  };
}

/** Paginates until all pages are fetched. */
export async function driveFilesListAll(
  apiKey: string,
  q: string,
  fields: string,
  pageSize?: number,
): Promise<DriveListFile[]> {
  const all: DriveListFile[] = [];
  let pageToken: string | undefined;
  do {
    const page = await driveFilesList({
      apiKey,
      q,
      fields,
      pageSize,
      pageToken,
    });
    all.push(...page.files);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return all;
}

/**
 * Stream a Drive file through the API (supports Range). Works when the file
 * is visible to the API key (typically "Anyone with the link" can view).
 */
export async function fetchDriveMediaViaApi(
  fileId: string,
  rangeHeader?: string,
): Promise<Response> {
  const apiKey = getDriveApiKey();
  if (!apiKey) {
    return new Response("Drive API key not configured", { status: 503 });
  }

  const url = `${DRIVE_V3_FILES}/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`;
  const headers: Record<string, string> = {
    Accept: "*/*",
    "User-Agent": "AmyNest-API-Server/1.0",
  };
  if (rangeHeader) headers["Range"] = rangeHeader;

  return fetch(url, { headers });
}

/**
 * Fallback: Google Drive web CDN download URL (virus-scan confirm flow).
 */
export async function fetchDriveMediaViaWebDownload(
  fileId: string,
  rangeHeader?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; VideoProxy/1.0)",
  };
  if (rangeHeader) headers["Range"] = rangeHeader;

  const url = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t`;
  const res = await fetch(url, { headers });

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return res;

  const html = await res.text();

  const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/);
  if (uuidMatch) {
    const confirmUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&authuser=0&confirm=t&uuid=${uuidMatch[1]}`;
    return fetch(confirmUrl, { headers });
  }

  const confirmMatch = html.match(/confirm=([^&"]+)/);
  if (confirmMatch) {
    const confirmUrl = `https://drive.google.com/uc?id=${fileId}&export=download&confirm=${confirmMatch[1]}`;
    return fetch(confirmUrl, { headers });
  }

  return new Response("Confirmation required", { status: 403 });
}

/** Prefer Drive API media; fall back to web download CDN. */
export async function fetchDriveStream(
  fileId: string,
  rangeHeader?: string,
): Promise<Response> {
  const viaApi = await fetchDriveMediaViaApi(fileId, rangeHeader);
  if (viaApi.ok || viaApi.status === 206) return viaApi;

  logger.warn(
    { evt: "drive.media_api_fallback", fileId, status: viaApi.status },
    "Drive alt=media failed, trying web download URL",
  );

  const viaWeb = await fetchDriveMediaViaWebDownload(fileId, rangeHeader);
  if (viaWeb.ok || viaWeb.status === 206) return viaWeb;

  return viaApi.status !== 503 ? viaApi : viaWeb;
}

/** Relative URL for streaming/downloading through the API proxy. */
export function driveProxyDownloadPath(fileId: string, fileName?: string): string {
  const base = `/api/drive/download/${fileId}`;
  const name = fileName?.trim();
  if (!name) return base;
  return `${base}?name=${encodeURIComponent(name)}`;
}
