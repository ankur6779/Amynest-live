import { getUncachableRevenueCatClient } from "./revenueCatClient";
import { listOfferings, listPackages, getProductsFromPackage } from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;
const APPLE_APP_ID = process.env.REVENUECAT_APPLE_APP_STORE_APP_ID!;
const GOOGLE_APP_ID = process.env.REVENUECAT_GOOGLE_PLAY_STORE_APP_ID!;

async function main() {
  const client = await getUncachableRevenueCatClient();

  const { data: offerings, error } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });

  if (error || !offerings) {
    console.error("Failed to list offerings:", error);
    return;
  }

  console.log(`Found ${offerings.items.length} offering(s)\n`);

  for (const offering of offerings.items) {
    console.log(`── Offering: ${offering.display_name} (id: ${offering.id}, lookup_key: ${offering.lookup_key})`);

    const { data: packages, error: pkgErr } = await listPackages({
      client,
      path: { project_id: PROJECT_ID, offering_id: offering.id },
      query: { limit: 20 },
    });

    if (pkgErr || !packages) {
      console.error("  Failed to list packages:", pkgErr);
      continue;
    }

    for (const pkg of packages.items) {
      console.log(`   Package: ${pkg.display_name} (id: ${pkg.id}, lookup_key: ${pkg.lookup_key})`);

      const { data: products, error: prodErr } = await getProductsFromPackage({
        client,
        path: { project_id: PROJECT_ID, offering_id: offering.id, package_id: pkg.id },
        query: { limit: 20 },
      });

      if (prodErr || !products) {
        console.error("    Failed to get products:", prodErr);
        continue;
      }

      for (const item of products.items) {
        const p = item.product;
        const appId = "app_id" in p ? p.app_id : "unknown";
        const store = appId === APPLE_APP_ID ? "iOS" : appId === GOOGLE_APP_ID ? "Android" : "Other";
        const storeId = "store_identifier" in p ? p.store_identifier : "n/a";
        const displayName = "display_name" in p ? p.display_name : "n/a";
        console.log(`    Product [${store}]: ${displayName} | store_id: ${storeId} | app_id: ${appId}`);
      }
    }
  }
}

main().catch(console.error);
