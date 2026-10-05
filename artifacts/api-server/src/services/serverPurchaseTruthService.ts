import { ingestAnalyticsEvents } from "./analyticsIngestService";
import {
  lookupAcquisitionAttribution,
  recordPreparedAdsConversion,
} from "./acquisitionAttributionService";
import { buildServerPurchaseSuccessProps } from "./acquisitionAttributionLogic";
import { logger } from "../lib/logger";

export async function recordServerPurchaseTruth(input: {
  canonicalUserId: string;
  transactionId: string;
  productId?: string;
  store?: string;
  providerEventId?: string;
  deviceId?: string | null;
  conversionAt?: Date;
}): Promise<void> {
  if (!input.transactionId.trim() || input.canonicalUserId.startsWith("$RCAnonymousID:")) {
    return;
  }
  try {
    const attribution = await lookupAcquisitionAttribution({
      canonicalUserId: input.canonicalUserId,
      deviceId: input.deviceId,
    });
    const props = buildServerPurchaseSuccessProps({
      transactionId: input.transactionId,
      productId: input.productId,
      store: input.store,
      providerEventId: input.providerEventId,
      attribution,
    });
    await ingestAnalyticsEvents(
      [
        {
          name: "purchase_success",
          props: {
            source: "server",
            platform: "server",
            transaction_id: input.transactionId,
            ...(attribution?.gclid ? { gclid: attribution.gclid } : {}),
            ...(attribution?.gbraid ? { gbraid: attribution.gbraid } : {}),
            ...(attribution?.wbraid ? { wbraid: attribution.wbraid } : {}),
            ...(props.campaign_id ? { campaign_id: props.campaign_id } : {}),
            ...(attribution?.installSource ? { install_source: attribution.installSource } : {}),
          },
        },
        { name: "subscription_funnel_event", props },
        {
          name: "upgrade_completed",
          props: {
            source: "server",
            action: "purchase_success",
            entitlement_state: "premium",
            transaction_id: input.transactionId,
            ...(props.gclid ? { gclid: props.gclid } : {}),
            ...(props.campaign_id ? { campaign_id: props.campaign_id } : {}),
          },
        },
      ],
      { userId: input.canonicalUserId, platform: "server" },
    );
    await recordPreparedAdsConversion({
      transactionId: input.transactionId,
      conversionAt: input.conversionAt ?? new Date(),
      attribution,
      canonicalUserId: input.canonicalUserId,
      eventName: "purchase",
    });
  } catch (err) {
    logger.warn({ err, evt: "purchase_truth.record_failed" }, "server purchase truth skipped");
  }
}
