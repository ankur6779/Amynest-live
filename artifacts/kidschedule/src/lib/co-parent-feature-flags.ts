function envFlag(key: string, defaultValue = false): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "1" || raw === "true";
}

/** Co-parent invite/accept UI. Default off for Phase 1 retirement; set VITE_FF_CO_PARENT=1 to restore. */
export const FF_CO_PARENT = envFlag("VITE_FF_CO_PARENT", false);
