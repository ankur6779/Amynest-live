import type { ContentEngineConfig } from "../../types/index.js";
import type {
  RuntimeEnvironment,
  SecretDiagnostic,
  SecretName,
  SecretsReport,
} from "../../types/operations.js";

const SECRET_ENV_KEYS: SecretName[] = [
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "YOUTUBE_CLIENT_ID",
  "YOUTUBE_CLIENT_SECRET",
  "YOUTUBE_REFRESH_TOKEN",
  "YOUTUBE_ACCESS_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "SMTP_URL",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "WEBHOOK_URL",
  "SLACK_WEBHOOK_URL",
  "DISCORD_WEBHOOK_URL",
  "ANALYTICS_ACCESS_TOKEN",
  "GOOGLE_TRENDS_API_KEY",
];

export interface SecretsValidationOptions {
  config: ContentEngineConfig;
  env?: NodeJS.ProcessEnv;
  environment: RuntimeEnvironment;
  mode: "strict" | "permissive";
  now?: () => Date;
}

/** Validate required secrets without ever logging raw values. */
export function validateSecrets(options: SecretsValidationOptions): SecretsReport {
  const env = options.env ?? process.env;
  const required = resolveRequiredSecrets(
    options.config,
    options.environment,
    options.mode,
    env,
  );
  const diagnostics: SecretDiagnostic[] = SECRET_ENV_KEYS.map((name) => {
    const raw = env[name];
    const present = typeof raw === "string" && raw.trim().length > 0;
    const isRequired = required.has(name);
    return {
      name,
      present,
      required: isRequired,
      maskedValue: present ? maskSecret(raw!) : undefined,
      message: present
        ? isRequired
          ? "Present (required)"
          : "Present (optional)"
        : isRequired
          ? `Missing required secret ${name}`
          : `Optional secret ${name} not set`,
    };
  });

  const missingRequired = diagnostics
    .filter((d) => d.required && !d.present)
    .map((d) => d.name);

  return {
    ok: missingRequired.length === 0,
    environment: options.environment,
    diagnostics,
    missingRequired,
    checkedAt: (options.now ?? (() => new Date()))().toISOString(),
  };
}

export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 2)}${"*".repeat(Math.min(12, trimmed.length - 4))}${trimmed.slice(-2)}`;
}

export function redactSecretsFromText(text: string, env: NodeJS.ProcessEnv = process.env): string {
  let output = text;
  for (const name of SECRET_ENV_KEYS) {
    const value = env[name];
    if (!value || value.length < 4) continue;
    output = output.split(value).join(maskSecret(value));
  }
  return output;
}

function resolveRequiredSecrets(
  config: ContentEngineConfig,
  environment: RuntimeEnvironment,
  mode: "strict" | "permissive",
  env: NodeJS.ProcessEnv,
): Set<SecretName> {
  const required = new Set<SecretName>();
  if (mode === "permissive" && (environment === "local" || environment === "development")) {
    return required;
  }

  if (config.scriptProvider === "openai" || config.fallbackProvider === "openai") {
    if (!env.OPENAI_API_KEY?.trim() && !env.AI_INTEGRATIONS_OPENAI_API_KEY?.trim()) {
      required.add("OPENAI_API_KEY");
    }
  }
  const prefersVeo = (config.preferredProviders ?? []).includes("google-veo");
  const veoEnabled = config.geminiVideo?.enabled !== false;
  if (prefersVeo && veoEnabled) {
    const keyEnv = config.geminiVideo?.apiKeyEnv ?? "GEMINI_API_KEY";
    if (!env[keyEnv]?.trim() && !env.GEMINI_API_KEY?.trim() && !env.GOOGLE_AI_API_KEY?.trim()) {
      required.add("GEMINI_API_KEY");
    }
  }
  if (config.publishingProvider === "youtube") {
    const hasAccess = Boolean(env.YOUTUBE_ACCESS_TOKEN?.trim());
    const hasRefresh =
      Boolean(env.YOUTUBE_CLIENT_ID?.trim()) &&
      Boolean(env.YOUTUBE_CLIENT_SECRET?.trim()) &&
      Boolean(env.YOUTUBE_REFRESH_TOKEN?.trim());
    if (!hasAccess && !hasRefresh) {
      required.add("YOUTUBE_CLIENT_ID");
      required.add("YOUTUBE_CLIENT_SECRET");
      required.add("YOUTUBE_REFRESH_TOKEN");
    }
  }
  if (config.analyticsProvider === "youtube") {
    const hasAnalytics =
      Boolean(env.ANALYTICS_ACCESS_TOKEN?.trim()) ||
      Boolean(env.YOUTUBE_ACCESS_TOKEN?.trim()) ||
      (Boolean(env.YOUTUBE_CLIENT_ID?.trim()) &&
        Boolean(env.YOUTUBE_CLIENT_SECRET?.trim()) &&
        Boolean(env.YOUTUBE_REFRESH_TOKEN?.trim()));
    if (!hasAnalytics) {
      required.add("ANALYTICS_ACCESS_TOKEN");
      required.add("YOUTUBE_REFRESH_TOKEN");
    }
  }
  if (config.trendProvider === "google-trends") {
    required.add("GOOGLE_TRENDS_API_KEY");
  }

  const channels = [
    ...(config.opsNotificationChannels ?? config.notificationChannels ?? []),
  ];
  if (channels.includes("telegram")) required.add("TELEGRAM_BOT_TOKEN");
  if (channels.includes("email")) {
    if (!env.SMTP_URL) {
      required.add("SMTP_HOST");
      required.add("SMTP_USER");
      required.add("SMTP_PASS");
    } else {
      required.add("SMTP_URL");
    }
  }
  if (channels.includes("webhook")) required.add("WEBHOOK_URL");
  if (channels.includes("slack")) required.add("SLACK_WEBHOOK_URL");
  if (channels.includes("discord")) required.add("DISCORD_WEBHOOK_URL");

  if (environment === "production" && mode === "strict") {
    // Production strict mode always requires webhook or telegram for ops alerts.
    if (!channels.includes("telegram") && !channels.includes("webhook")) {
      required.add("WEBHOOK_URL");
    }
  }

  return required;
}
