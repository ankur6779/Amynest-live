const SENSITIVE =
  /\b(speech problem|speech delay|health issue|health problem|diagnos|therap|behavioural problem|behavioral problem|behavior problem|disorder|medication|medical|autism|adhd)\b/i;

/**
 * Lock-screen copy must stay non-clinical. First names are allowed with
 * calm "plan / next step" wording; anything that could imply a problem
 * is replaced with a generic line.
 */
export function sanitizeLockScreenCopy(title: string, body: string): { title: string; body: string } {
  const combined = `${title} ${body}`;
  if (SENSITIVE.test(combined)) {
    return {
      title: "Amy has something ready for today",
      body: "Your next step is ready whenever you are.",
    };
  }
  return { title: title.trim(), body: body.trim() };
}

export function isSensitiveLockScreenCopy(title: string, body: string): boolean {
  return SENSITIVE.test(`${title} ${body}`);
}

export function safeChildFirstName(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").trim();
  if (trimmed.length < 1 || trimmed.length > 40) return null;
  if (SENSITIVE.test(trimmed)) return null;
  return trimmed;
}
