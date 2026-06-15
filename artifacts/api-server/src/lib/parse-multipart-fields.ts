import type { IncomingMessage } from "node:http";

const MAX_AUDIO_BYTES = 6 * 1024 * 1024;

export type ParsedMultipartFields = {
  files: Map<string, Buffer>;
  fields: Map<string, string>;
};

function readRequestBody(req: IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Minimal multipart/form-data parser for single-file STT uploads (no extra deps).
 */
export async function parseMultipartFields(
  req: IncomingMessage,
  maxBytes = MAX_AUDIO_BYTES,
): Promise<ParsedMultipartFields> {
  const contentType = req.headers["content-type"] ?? "";
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
  if (!boundaryMatch) throw new Error("multipart_missing_boundary");
  const boundary = `--${boundaryMatch[1] ?? boundaryMatch[2]}`;
  const body = await readRequestBody(req, maxBytes);

  const files = new Map<string, Buffer>();
  const fields = new Map<string, string>();
  const raw = body.toString("latin1");
  const parts = raw.split(boundary);

  for (const part of parts) {
    const trimmed = part.replace(/^\r\n/, "").replace(/\r\n--$/, "").trim();
    if (!trimmed || trimmed === "--") continue;

    const headerEnd = trimmed.indexOf("\r\n\r\n");
    if (headerEnd < 0) continue;

    const headerBlock = trimmed.slice(0, headerEnd);
    const content = trimmed.slice(headerEnd + 4).replace(/\r\n$/, "");
    const nameMatch = /name="([^"]+)"/i.exec(headerBlock);
    if (!nameMatch) continue;
    const name = nameMatch[1]!;
    const filenameMatch = /filename="/i.test(headerBlock);

    if (filenameMatch) {
      files.set(name, Buffer.from(content, "latin1"));
    } else {
      fields.set(name, content.trim());
    }
  }

  return { files, fields };
}

export function isMultipartFormData(req: IncomingMessage): boolean {
  const ct = req.headers["content-type"] ?? "";
  return ct.includes("multipart/form-data");
}
