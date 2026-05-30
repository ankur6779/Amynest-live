/**
 * Persists infant product analytics events from client logs.
 */
import { db, infantProductAnalyticsEventsTable } from "@workspace/db";

export type InfantAnalyticsIngestPayload = {
  userId: string;
  event: string;
  childId?: number;
  childAgeMonths?: number;
  infantAgeBand?: string;
  properties?: Record<string, unknown>;
};

export async function persistInfantProductAnalyticsEvent(
  payload: InfantAnalyticsIngestPayload,
): Promise<void> {
  const childId =
    payload.childId ??
    (typeof payload.properties?.childId === "number"
      ? payload.properties.childId
      : undefined);
  const childAgeMonths =
    payload.childAgeMonths ??
    (typeof payload.properties?.childAgeMonths === "number"
      ? payload.properties.childAgeMonths
      : undefined);
  const infantAgeBand =
    payload.infantAgeBand ??
    (typeof payload.properties?.infantAgeBand === "string"
      ? payload.properties.infantAgeBand
      : undefined);

  await db.insert(infantProductAnalyticsEventsTable).values({
    userId: payload.userId,
    childId: childId ?? null,
    event: payload.event.slice(0, 128),
    childAgeMonths: childAgeMonths ?? null,
    infantAgeBand: infantAgeBand?.slice(0, 16) ?? null,
    properties: payload.properties ?? {},
  });
}
