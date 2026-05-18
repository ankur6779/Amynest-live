import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

const MAX_JSON_BYTES = Number(process.env.API_MAX_JSON_RESPONSE_BYTES ?? String(1024 * 1024));

/**
 * Reject oversized JSON bodies before they are sent (protects mobile clients + memory).
 */
export function limitJsonResponse(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalJson = res.json.bind(res);

  res.json = function limitJsonBody(body: unknown) {
    try {
      const serialized = JSON.stringify(body);
      if (serialized.length > MAX_JSON_BYTES) {
        logger.warn(
          {
            evt: "response.too_large",
            bytes: serialized.length,
            maxBytes: MAX_JSON_BYTES,
            path: res.req?.originalUrl?.split("?")[0],
          },
          "JSON response exceeded size limit",
        );
        return originalJson({
          error: "response_too_large",
          fallback: true,
        });
      }
    } catch (err) {
      logger.error({ err }, "Failed to serialize JSON response");
      return originalJson({ error: "response_serialize_failed", fallback: true });
    }
    return originalJson(body);
  };

  next();
}
