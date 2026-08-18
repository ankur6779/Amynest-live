import type { RCPackage } from "@/lib/native-billing-ios";
import type { NativePackage } from "@/lib/native-billing";
import type { StorePurchaseMetadata } from "@/lib/subscription-purchase-coordinator";

function planToBillingPeriod(plan: string | undefined): string | undefined {
  if (plan === "monthly") return "monthly";
  if (plan === "yearly") return "annual";
  if (plan === "six_month") return "six_month";
  return undefined;
}

export function storeMetadataFromIosTransaction(
  transaction: unknown,
  pkg: RCPackage,
  plan?: string,
): StorePurchaseMetadata | null {
  const raw = transaction as Record<string, unknown> | null | undefined;
  const transactionId = String(
    raw?.transactionIdentifier ??
      raw?.transactionId ??
      raw?.storeTransactionIdentifier ??
      raw?.id ??
      "",
  ).trim();
  if (!transactionId) return null;

  return {
    transactionId,
    productId: pkg.product.identifier,
    currency: pkg.product.currencyCode,
    value: pkg.product.price,
    billingPeriod: planToBillingPeriod(plan),
  };
}

export function storeMetadataFromAndroidPurchase(
  purchase: {
    transactionId?: string;
    productId?: string;
    currency?: string;
    value?: number;
  } | null | undefined,
  plan?: string,
): StorePurchaseMetadata | null {
  if (!purchase?.transactionId?.trim()) return null;
  return {
    transactionId: purchase.transactionId.trim(),
    productId: purchase.productId?.trim() || "unknown",
    currency: purchase.currency?.trim() || "INR",
    value: typeof purchase.value === "number" && purchase.value > 0 ? purchase.value : 0,
    billingPeriod: planToBillingPeriod(plan),
  };
}

export function storeMetadataFromNativePackage(
  pkg: NativePackage,
  transactionId: string,
  plan?: string,
): StorePurchaseMetadata {
  const value =
    pkg.priceAmountMicros > 0 ? pkg.priceAmountMicros / 1_000_000 : 0;
  return {
    transactionId,
    productId: pkg.productId,
    currency: pkg.currencyCode,
    value,
    billingPeriod: planToBillingPeriod(plan),
  };
}
