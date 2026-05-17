import { getApps } from "firebase/app";
import { authDomain, currentHost, firebaseProjectId } from "@/lib/firebase";

const TAG = "[amynest:firebase]";

export type FirebaseBootStatus = {
  ok: boolean;
  missing: string[];
  appCount: number;
  projectId: string;
  authDomain: string;
  hostname: string;
};

export function getFirebaseBootStatus(
  config: {
    apiKey?: string;
    projectId?: string;
    appId?: string;
  },
): FirebaseBootStatus {
  const missing: string[] = [];
  if (!config.apiKey?.trim()) missing.push("apiKey");
  if (!config.projectId?.trim()) missing.push("projectId");
  if (!config.appId?.trim()) missing.push("appId");

  return {
    ok: missing.length === 0,
    missing,
    appCount: getApps().length,
    projectId: config.projectId ?? firebaseProjectId,
    authDomain,
    hostname: currentHost,
  };
}

export function logFirebaseBootStatus(
  config: {
    apiKey?: string;
    projectId?: string;
    appId?: string;
  },
): FirebaseBootStatus {
  const status = getFirebaseBootStatus(config);
  if (status.ok) {
    console.info(`${TAG} Init OK`, {
      projectId: status.projectId,
      authDomain: status.authDomain,
      hostname: status.hostname,
      appCount: status.appCount,
    });
  } else {
    console.error(`${TAG} Init config incomplete`, status);
  }
  return status;
}
