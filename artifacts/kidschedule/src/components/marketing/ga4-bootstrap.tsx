import { useEffect } from "react";
import { initGa4 } from "@/lib/marketing/ga4-analytics";

/** Loads GA4 gtag when VITE_GA4_MEASUREMENT_ID is configured. */
export function Ga4Bootstrap() {
  useEffect(() => {
    initGa4();
  }, []);
  return null;
}
