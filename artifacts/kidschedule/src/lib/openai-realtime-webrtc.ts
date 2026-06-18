/**
 * OpenAI Realtime WebRTC (GA) — browser SDP exchange.
 * @see https://platform.openai.com/docs/guides/realtime-webrtc
 *
 * Ephemeral-token flow: POST offer SDP to https://api.openai.com/v1/realtime/calls
 * with Authorization: Bearer ek_… and Content-Type: application/sdp.
 * Do NOT append ?model= — model is bound at client_secret mint time.
 */

/** Public endpoint for browser WebRTC SDP exchange (never a server-side proxy base URL). */
export const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export type RealtimeSdpExchangeDiagnostics = {
  url: string;
  authType: "ephemeral" | "api_key" | "missing" | "unknown";
  authPrefix: string;
  contentType: string;
  sdpLength: number;
  sdpPreview: string;
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  responseBody: string;
  ok: boolean;
};

function classifyAuthToken(token: string): RealtimeSdpExchangeDiagnostics["authType"] {
  if (!token) return "missing";
  if (token.startsWith("ek_")) return "ephemeral";
  if (token.startsWith("sk-")) return "api_key";
  return "unknown";
}

/** Resolve calls URL — ignore server proxy bases; browser must hit OpenAI directly. */
export function resolveOpenAiRealtimeCallsUrl(serverCallsUrl?: string | null): string {
  const fromServer = (serverCallsUrl ?? "").trim();
  if (fromServer.startsWith("https://api.openai.com/v1/realtime/calls")) {
    return OPENAI_REALTIME_CALLS_URL;
  }
  // Legacy / proxy URLs from server are not valid in the browser for WebRTC.
  return OPENAI_REALTIME_CALLS_URL;
}

export async function exchangeRealtimeSdpOffer(input: {
  clientSecret: string;
  offerSdp: string;
  callsUrl?: string | null;
}): Promise<{ answerSdp: string; diagnostics: RealtimeSdpExchangeDiagnostics }> {
  const url = resolveOpenAiRealtimeCallsUrl(input.callsUrl);
  const token = input.clientSecret.trim();
  const sdp = input.offerSdp ?? "";
  const authType = classifyAuthToken(token);

  if (!token || authType === "missing") {
    throw new Error("Realtime client secret missing or empty");
  }
  if (authType === "api_key") {
    throw new Error(
      "Realtime SDP exchange requires an ephemeral client secret (ek_…), not an API key",
    );
  }

  const diagnostics: RealtimeSdpExchangeDiagnostics = {
    url,
    authType,
    authPrefix: token.slice(0, 8),
    contentType: "application/sdp",
    sdpLength: sdp.length,
    sdpPreview: sdp.slice(0, 200),
    status: 0,
    statusText: "",
    responseHeaders: {},
    responseBody: "",
    ok: false,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/sdp",
    },
    body: sdp,
  });

  diagnostics.status = response.status;
  diagnostics.statusText = response.statusText;
  diagnostics.responseHeaders = Object.fromEntries(response.headers.entries());
  diagnostics.responseBody = await response.text();
  diagnostics.ok = response.ok;

  if (!response.ok) {
    const err = new Error(
      `Realtime SDP exchange failed: ${response.status} ${response.statusText} — ${diagnostics.responseBody.slice(0, 500)}`,
    ) as Error & { diagnostics: RealtimeSdpExchangeDiagnostics };
    err.diagnostics = diagnostics;
    throw err;
  }

  return { answerSdp: diagnostics.responseBody, diagnostics };
}
