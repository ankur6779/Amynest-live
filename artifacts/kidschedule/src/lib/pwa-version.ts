export {
  DEPLOY_VERSION_SESSION_KEY,
  LEGACY_DEPLOY_VERSION_LS_KEY,
  checkDeployVersionMismatch,
  getDeployVersion,
  migrateLegacyDeployVersionStorage,
  readStoredDeployVersion,
  writeStoredDeployVersion,
} from "@/lib/deploy-version";

import { getDeployVersion } from "@/lib/deploy-version";

/** Cache-bust service worker URL so browsers fetch the latest sw.js after deploy. */
export function serviceWorkerScriptUrl(basePath: string): string {
  const base = basePath.replace(/\/$/, "");
  const version = getDeployVersion();
  if (!version) return `${base}/sw.js`;
  return `${base}/sw.js?v=${encodeURIComponent(version)}`;
}
