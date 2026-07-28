import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  readYouTubeOAuthCredentials,
  refreshYouTubeAccessToken,
  resolveYouTubeAccessToken,
} from "./oauth.js";

describe("YouTube OAuth refresh", () => {
  it("reads OAuth credentials from env", () => {
    const creds = readYouTubeOAuthCredentials({
      YOUTUBE_CLIENT_ID: "id",
      YOUTUBE_CLIENT_SECRET: "secret",
      YOUTUBE_REFRESH_TOKEN: "refresh",
    });
    assert.deepEqual(creds, {
      clientId: "id",
      clientSecret: "secret",
      refreshToken: "refresh",
    });
  });

  it("refreshes access tokens via OAuth token endpoint", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          access_token: "ya29.test-token",
          expires_in: 3600,
          token_type: "Bearer",
        }),
        { status: 200 },
      );

    const result = await refreshYouTubeAccessToken(
      {
        clientId: "id",
        clientSecret: "secret",
        refreshToken: "refresh",
      },
      fetchImpl as unknown as typeof fetch,
    );
    assert.equal(result.accessToken, "ya29.test-token");
    assert.equal(result.expiresIn, 3600);
  });

  it("resolves access token from refresh credentials when access token missing", async () => {
    const env: NodeJS.ProcessEnv = {
      YOUTUBE_CLIENT_ID: "id",
      YOUTUBE_CLIENT_SECRET: "secret",
      YOUTUBE_REFRESH_TOKEN: "refresh",
    };
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({ access_token: "ya29.from-refresh", expires_in: 1800 }),
        { status: 200 },
      );
    const token = await resolveYouTubeAccessToken({
      env,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      persistToEnv: true,
    });
    assert.equal(token, "ya29.from-refresh");
    assert.equal(env.YOUTUBE_ACCESS_TOKEN, "ya29.from-refresh");
  });
});
