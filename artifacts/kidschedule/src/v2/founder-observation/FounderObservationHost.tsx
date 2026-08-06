/**
 * Invisible DEV host — no parent UI.
 * Tracks wouter location into the founder observation store.
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  isFounderObservationBuildEnabled,
  isFounderObservationEnabled,
} from "./enabled";
import {
  founderObservationOnPathChange,
  installFounderObservation,
} from "./install";

export function FounderObservationHost() {
  const [location] = useLocation();

  useEffect(() => {
    if (!isFounderObservationBuildEnabled()) return;
    if (!isFounderObservationEnabled()) return;
    installFounderObservation();
  }, []);

  useEffect(() => {
    if (!isFounderObservationBuildEnabled()) return;
    if (!isFounderObservationEnabled()) return;
    founderObservationOnPathChange(location);
  }, [location]);

  return null;
}
