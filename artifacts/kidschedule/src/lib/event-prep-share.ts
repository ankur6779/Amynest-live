/** Share / export helpers for Event Prep shopping lists. */

export async function shareTextList(opts: {
  title: string;
  lines: string[];
  fallbackCopied?: string;
}): Promise<"shared" | "copied" | "failed"> {
  const body = [opts.title, "", ...opts.lines.map((l, i) => `${i + 1}. ${l}`)].join("\n");

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: opts.title, text: body });
      return "shared";
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return "failed";
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(body);
      return "copied";
    } catch { /* fall through */ }
  }

  return "failed";
}

export function buildMaterialsList(
  eventName: string,
  childName: string,
  items: string[],
): { title: string; lines: string[] } {
  return {
    title: `Event Prep — ${eventName} (${childName})`,
    lines: items,
  };
}
