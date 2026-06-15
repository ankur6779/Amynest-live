import { getApiUrl } from "@/lib/api";

export type TranscribeProvider = "whisper" | "elevenlabs";

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("aac")) return "speech.mp4";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "speech.mp3";
  return "speech.webm";
}

/**
 * POST /api/speech/transcribe — prefers multipart/form-data; falls back to legacy base64 JSON.
 */
export async function uploadSpeechTranscribe(opts: {
  blob: Blob;
  mimeType: string;
  provider?: TranscribeProvider;
  getAuthToken?: () => Promise<string | null>;
}): Promise<Response> {
  const headers: Record<string, string> = {};
  try {
    const tok = await opts.getAuthToken?.();
    if (tok) headers.Authorization = `Bearer ${tok}`;
  } catch {
    /* cookie auth may still work on web */
  }

  try {
    const form = new FormData();
    form.append("audio", opts.blob, extensionForMime(opts.mimeType));
    form.append("mimeType", opts.mimeType);
    if (opts.provider) form.append("provider", opts.provider);
    const res = await fetch(getApiUrl("/api/speech/transcribe"), {
      method: "POST",
      headers,
      credentials: "include",
      body: form,
    });
    if (res.ok || res.status === 202 || res.status === 401 || res.status === 402 || res.status === 429) {
      return res;
    }
  } catch {
    /* fall through to base64 */
  }

  const arrayBuffer = await opts.blob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const payload: Record<string, string> = {
    audioBase64: base64,
    mimeType: opts.mimeType,
  };
  if (opts.provider) payload.provider = opts.provider;

  return fetch(getApiUrl("/api/speech/transcribe"), {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
