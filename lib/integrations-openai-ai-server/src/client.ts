import OpenAI from "openai";

function createOpenAIClient(): OpenAI {
  const userKey = process.env.OPENAI_API_KEY;
  const replitKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const replitBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!userKey && !(replitKey && replitBaseUrl)) {
    throw new Error(
      "No OpenAI credentials found. Set OPENAI_API_KEY or provision the Replit OpenAI AI integration.",
    );
  }

  return userKey
    ? new OpenAI({ apiKey: userKey })
    : new OpenAI({ apiKey: replitKey!, baseURL: replitBaseUrl });
}

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = createOpenAIClient();
  }
  return client;
}

/** Lazily initialized — does not throw until first use. */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const instance = getClient();
    const value = Reflect.get(instance, prop, instance);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
