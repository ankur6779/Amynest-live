export interface YouTubeOAuthCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface YouTubeAccessTokenResult {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  scope?: string;
}

export interface ResolveYouTubeAccessTokenOptions {
  accessToken?: string;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  /** When true, write the refreshed token back to process.env.YOUTUBE_ACCESS_TOKEN. */
  persistToEnv?: boolean;
}

/** Exchange a refresh token for a short-lived YouTube access token. */
export async function refreshYouTubeAccessToken(
  credentials: YouTubeOAuthCredentials,
  fetchImpl: typeof fetch = fetch,
): Promise<YouTubeAccessTokenResult> {
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    refresh_token: credentials.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `YouTube OAuth refresh failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  if (!payload.access_token) {
    throw new Error("YouTube OAuth refresh response missing access_token");
  }

  return {
    accessToken: payload.access_token,
    expiresIn: payload.expires_in ?? 3600,
    tokenType: payload.token_type ?? "Bearer",
    scope: payload.scope,
  };
}

export function readYouTubeOAuthCredentials(
  env: NodeJS.ProcessEnv = process.env,
): YouTubeOAuthCredentials | undefined {
  const clientId = env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = env.YOUTUBE_CLIENT_SECRET?.trim();
  const refreshToken = env.YOUTUBE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) return undefined;
  return { clientId, clientSecret, refreshToken };
}

/**
 * Resolve a usable access token:
 * 1) explicit access token
 * 2) YOUTUBE_ACCESS_TOKEN env
 * 3) refresh via YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN
 */
export async function resolveYouTubeAccessToken(
  options: ResolveYouTubeAccessTokenOptions = {},
): Promise<string> {
  const env = options.env ?? process.env;
  const explicit = options.accessToken?.trim();
  if (explicit) return explicit;

  const fromEnv = env.YOUTUBE_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const oauth = readYouTubeOAuthCredentials(env);
  if (!oauth) return "";

  const refreshed = await refreshYouTubeAccessToken(oauth, options.fetchImpl);
  if (options.persistToEnv !== false) {
    env.YOUTUBE_ACCESS_TOKEN = refreshed.accessToken;
    if (env !== process.env) {
      process.env.YOUTUBE_ACCESS_TOKEN = refreshed.accessToken;
    }
  }
  return refreshed.accessToken;
}
