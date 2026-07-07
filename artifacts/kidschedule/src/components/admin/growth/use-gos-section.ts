import { parseApiJson } from "@/lib/safe-json-response";
import { useQuery } from "@tanstack/react-query";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import type { GrowthTimePreset } from "./types";
import { buildGosQuery, type GosSectionResponse } from "./gos-types";

export function useGosSection<T>(
  section: string,
  preset: GrowthTimePreset,
  customStart: string,
  customEnd: string,
  extra?: Record<string, string | undefined>,
  enabled = true,
) {
  const authFetch = useAuthFetch();
  const url = buildGosQuery(section, preset, customStart, customEnd, extra);

  return useQuery({
    queryKey: ["gos", section, preset, customStart, customEnd, extra],
    queryFn: async (): Promise<GosSectionResponse<T>> => {
      const res = await authFetch(url);
      if (res.status === 403) throw new Error("not_admin");
      if (!res.ok) throw new Error(`http_${res.status}`);
      return parseApiJson<GosSectionResponse<T>>(res);
    },
    enabled,
    refetchInterval: 60_000,
  });
}
