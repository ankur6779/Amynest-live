/**
 * Shared Google Drive API v3 helpers for server-side listing (API key).
 *
 * Requirements:
 * - Enable "Google Drive API" in Google Cloud Console for the key's project.
 * - Folders/files must be reachable with the key (typically "Anyone with the link"
 *   can view, or content on a Shared drive with correct visibility).
 * - API key restrictions: do NOT use "HTTP referrers" only for this server —
 *   Node has no browser referrer; use "None" or IP restriction if needed.
 *
 * Set `GOOGLE_API_KEY` or alias `GOOGLE_DRIVE_API_KEY`.
 */

const DRIVE_V3_FILES = "https://www.googleapis.com/drive/v3/files";

export function getDriveApiKey(): string | undefined {
  const k =
    process.env["GOOGLE_API_KEY"]?.trim() ||
    process.env["GOOGLE_DRIVE_API_KEY"]?.trim();
  return k || undefined;
}

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

  const res = await fetch(`${DRIVE_V3_FILES}?${sp.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AmyNest-API-Server/1.0",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    let detail = text.slice(0, 800);
    try {
      const j = JSON.parse(text) as {
        error?: { message?: string; status?: string };
      };
      if (j?.error?.message) {
        detail = `${j.error.status ?? String(res.status)}: ${j.error.message}`;
      }
    } catch {
      /* keep truncated body */
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
 * Used when the v3 media endpoint is unavailable for a given file.
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

  const viaWeb = await fetchDriveMediaViaWebDownload(fileId, rangeHeader);
  if (viaWeb.ok || viaWeb.status === 206) return viaWeb;

  return viaApi.status !== 503 ? viaApi : viaWeb;
}

/**
 * Relative URL for streaming/downloading a Drive file through the API proxy.
 * Clients on Render static hosting must prefix with the API origin (see
 * `resolveApiMediaUrl` on web, `API_BASE_URL` on mobile).
 */
export function driveProxyDownloadPath(fileId: string, fileName?: string): string {
  const base = `/api/drive/download/${fileId}`;
  const name = fileName?.trim();
  if (!name) return base;
  return `${base}?name=${encodeURIComponent(name)}`;
}
