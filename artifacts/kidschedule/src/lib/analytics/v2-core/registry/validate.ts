/**
 * Registry lookup / structural validation against Event Registry.
 */

import type {
  V2AnalyticsLayer,
  V2RegistryEventDefinition,
  V2TrackRejectionReason,
} from "../types";
import { getRegistryEvent } from "./events";

export type RegistryLookupResult =
  | { ok: true; definition: V2RegistryEventDefinition }
  | {
      ok: false;
      reason: V2TrackRejectionReason;
      message: string;
    };

export function lookupRegistryEvent(eventName: string): RegistryLookupResult {
  const definition = getRegistryEvent(eventName);
  if (!definition) {
    return {
      ok: false,
      reason: "unknown_event",
      message: `Unknown analytics event "${eventName}" — not in ANALYTICS_EVENT_REGISTRY.`,
    };
  }
  if (definition.status === "forbidden") {
    return {
      ok: false,
      reason: "forbidden_event",
      message: `Event "${eventName}" is forbidden.`,
    };
  }
  if (definition.status === "reserved") {
    return {
      ok: false,
      reason: "reserved_event",
      message: `Event "${eventName}" is reserved and must not be emitted.`,
    };
  }
  // active | deprecated (deprecated allowed during grace)
  return { ok: true, definition };
}

export function validateRegistryIdentity(
  definition: V2RegistryEventDefinition,
  input: {
    eventVersion: number;
    layer: V2AnalyticsLayer;
    owner: string;
  },
): RegistryLookupResult {
  if (input.eventVersion !== definition.eventVersion) {
    return {
      ok: false,
      reason: "version_mismatch",
      message: `Event "${definition.eventName}" version ${input.eventVersion} != registry ${definition.eventVersion}.`,
    };
  }
  if (input.layer !== definition.layer) {
    return {
      ok: false,
      reason: "layer_mismatch",
      message: `Event "${definition.eventName}" layer "${input.layer}" != registry "${definition.layer}".`,
    };
  }
  if (input.owner !== definition.owner) {
    return {
      ok: false,
      reason: "owner_mismatch",
      message: `Event "${definition.eventName}" owner "${input.owner}" != registry "${definition.owner}".`,
    };
  }
  return { ok: true, definition };
}
