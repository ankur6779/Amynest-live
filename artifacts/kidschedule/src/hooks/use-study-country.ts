import { parseApiJson } from "@/lib/safe-json-response";
import { useEffect, useState } from "react";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { normalizeStudyCountry } from "@workspace/study-zone";

/** Parent profile country for Smart Study Zone localization. */
export function useStudyCountry(): { country: string; loading: boolean } {
  const authFetch = useAuthFetch();
  const [country, setCountry] = useState("US");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/parent-profile")
      .then(async (r) => {
        if (!r.ok) return null;
        return parseApiJson<{ country?: string }>(r);
      })
      .catch(() => null)
      .then((profile) => {
        if (cancelled) return;
        if (profile?.country) {
          setCountry(normalizeStudyCountry(String(profile.country)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { country, loading };
}
