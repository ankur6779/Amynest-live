/**
 * Cloudflare Worker — proxy /api/* from www.amynest.in to Render backend.
 *
 * Deploy BEFORE enabling same-origin API in the web app (resolveProductionSameOriginApi).
 * Without this worker, /api/* on the static site returns 404 and all audio/API breaks.
 *
 * Deploy: see wrangler.toml and README in this directory.
 */
const DEFAULT_BACKEND = "https://amynest-backend-dykj.onrender.com";

/** @param {Request} request @param {Record<string, string>} env */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      return fetch(request);
    }

    const backend = (env.BACKEND_ORIGIN ?? DEFAULT_BACKEND).replace(/\/$/, "");
    const target = new URL(`${url.pathname}${url.search}`, backend);

    const headers = new Headers(request.headers);
    headers.delete("host");

    const init = {
      method: request.method,
      headers,
      redirect: "follow",
    };
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const response = await fetch(target.toString(), init);

    const out = new Headers(response.headers);
    out.set("Access-Control-Allow-Origin", url.origin);
    out.set("Access-Control-Allow-Credentials", "true");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: out,
    });
  },
};
