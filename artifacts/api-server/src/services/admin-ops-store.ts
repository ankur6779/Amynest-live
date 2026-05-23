/**
 * Admin quick-action overrides — in-memory ops flags for live incident response.
 */

export type AdminOpsState = {
  disableStreaming: boolean;
  disableApi: boolean;
  forceEmergencyMode: boolean;
  cacheClearedAt: number | null;
  updatedAt: number;
  updatedBy: string | null;
};

let state: AdminOpsState = {
  disableStreaming: false,
  disableApi: false,
  forceEmergencyMode: false,
  cacheClearedAt: null,
  updatedAt: Date.now(),
  updatedBy: null,
};

export type AdminOpsAction =
  | "disable_streaming"
  | "enable_streaming"
  | "disable_api"
  | "enable_api"
  | "clear_cache"
  | "force_emergency"
  | "reset_emergency"
  | "reset_all";

export function getAdminOpsState(): AdminOpsState {
  return { ...state };
}

export function applyAdminOpsAction(
  action: AdminOpsAction,
  adminUserId: string,
): AdminOpsState {
  const now = Date.now();
  switch (action) {
    case "disable_streaming":
      state.disableStreaming = true;
      break;
    case "enable_streaming":
      state.disableStreaming = false;
      break;
    case "disable_api":
      state.disableApi = true;
      break;
    case "enable_api":
      state.disableApi = false;
      break;
    case "clear_cache":
      state.cacheClearedAt = now;
      break;
    case "force_emergency":
      state.forceEmergencyMode = true;
      break;
    case "reset_emergency":
      state.forceEmergencyMode = false;
      break;
    case "reset_all":
      state = {
        disableStreaming: false,
        disableApi: false,
        forceEmergencyMode: false,
        cacheClearedAt: state.cacheClearedAt,
        updatedAt: now,
        updatedBy: adminUserId,
      };
      return getAdminOpsState();
  }
  state.updatedAt = now;
  state.updatedBy = adminUserId;
  return getAdminOpsState();
}

/** Test-only reset. */
export function resetAdminOpsStoreForTests(): void {
  state = {
    disableStreaming: false,
    disableApi: false,
    forceEmergencyMode: false,
    cacheClearedAt: null,
    updatedAt: Date.now(),
    updatedBy: null,
  };
}
