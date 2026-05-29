import { getApiUrl } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";
import { setActiveIntentId } from "@/hooks/use-intent-interruption-tracker";

/** Create server-side intent when parent opens a notification — enables resume after interruption. */
export async function createNotificationIntent(
  href: string,
  payload: { category?: string; actionTarget?: string; entityId?: string; title?: string },
): Promise<void> {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    const r = await fetch(getApiUrl("/api/intent-recovery"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intentType: "NOTIFICATION_ACTION",
        intentSource: "notification",
        title: payload.title ?? "Continue from notification",
        actionTarget: payload.actionTarget ?? "parent_hub",
        entityId: payload.entityId ?? payload.category ?? null,
        href,
        progressPct: 0,
      }),
    });
    if (!r.ok) return;
    const data = (await r.json()) as { intentId?: string };
    if (data.intentId) setActiveIntentId(data.intentId);
  } catch {
    /* best-effort */
  }
}
