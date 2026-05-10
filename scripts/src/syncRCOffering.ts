/**
 * Syncs App Store products to RC offering packages.
 * Run: pnpm --filter @workspace/scripts exec tsx src/syncRCOffering.ts
 */
import { createClient } from "@replit/revenuecat-sdk/client";
import {
  listOfferings,
  listPackages,
  getProductsFromPackage,
  attachProductsToPackage,
  listProducts,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID!;
const APPLE_APP_ID = process.env.REVENUECAT_APPLE_APP_STORE_APP_ID!;
const GOOGLE_APP_ID = process.env.REVENUECAT_GOOGLE_PLAY_STORE_APP_ID!;
const SECRET_KEY = process.env.REVENUECAT_SECRET_KEY!;

if (!SECRET_KEY) throw new Error("REVENUECAT_SECRET_KEY not set");
if (!PROJECT_ID) throw new Error("REVENUECAT_PROJECT_ID not set");

const client = createClient({
  baseUrl: "https://api.revenuecat.com/v2",
  headers: { Authorization: `Bearer ${SECRET_KEY}` },
});

// Map package lookup_key → { apple store_identifier, google store_identifier }
const PACKAGE_PRODUCT_MAP: Record<string, { apple: string; google: string }> = {
  "$rc_monthly":   { apple: "amynest_monthly",         google: "amynest_monthly:monthly" },
  "$rc_six_month": { apple: "amynest_6month",           google: "amynest_6month:six-month" },
  "$rc_annual":    { apple: "amynest_yearly",            google: "amynest_yearly:yearly" },
};

async function main() {
  // 1. Fetch all products keyed by store_identifier
  const { data: allProducts, error: prodErr } = await listProducts({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 50 },
  });
  if (prodErr || !allProducts) throw new Error(`listProducts failed: ${JSON.stringify(prodErr)}`);

  const byStoreId = new Map<string, string>(); // store_identifier → product_id
  for (const p of allProducts.items) {
    if (p.app_id === APPLE_APP_ID || p.app_id === GOOGLE_APP_ID) {
      const sid = (p as any).store_identifier as string | undefined;
      if (sid) byStoreId.set(sid, p.id);
    }
  }
  console.log("Production products found:", [...byStoreId.entries()].map(([k, v]) => `${k}=${v}`).join(", "));

  // 2. Fetch default offering
  const { data: offerings, error: offErr } = await listOfferings({
    client,
    path: { project_id: PROJECT_ID },
    query: { limit: 20 },
  });
  if (offErr || !offerings) throw new Error(`listOfferings failed: ${JSON.stringify(offErr)}`);

  const defaultOffering = offerings.items.find((o) => o.lookup_key === "default") ?? offerings.items[0];
  if (!defaultOffering) throw new Error("No default offering found");
  console.log(`Offering: ${defaultOffering.display_name} (${defaultOffering.id})`);

  // 3. Fetch packages
  const { data: packages, error: pkgErr } = await listPackages({
    client,
    path: { project_id: PROJECT_ID, offering_id: defaultOffering.id },
    query: { limit: 20 },
  });
  if (pkgErr || !packages) throw new Error(`listPackages failed: ${JSON.stringify(pkgErr)}`);

  // 4. For each package, check what's attached and attach missing products
  for (const pkg of packages.items) {
    const mapping = PACKAGE_PRODUCT_MAP[pkg.lookup_key];
    if (!mapping) {
      console.log(`  Skipping unknown package: ${pkg.lookup_key}`);
      continue;
    }

    // Collect desired product IDs
    const desiredIds: string[] = [];
    for (const storeId of [mapping.apple, mapping.google]) {
      const pid = byStoreId.get(storeId);
      if (pid) desiredIds.push(pid);
      else console.warn(`  ⚠️  Product not found for store_id: ${storeId}`);
    }

    if (desiredIds.length === 0) {
      console.log(`  ⏭  No products to attach for ${pkg.lookup_key}`);
      continue;
    }

    // Check already-attached products
    const { data: existing } = await getProductsFromPackage({
      client,
      path: { project_id: PROJECT_ID, offering_id: defaultOffering.id, package_id: pkg.id },
      query: { limit: 20 },
    });
    const existingIds = new Set((existing?.items ?? []).map((i) => i.product.id));
    const toAttach = desiredIds.filter((id) => !existingIds.has(id));

    if (toAttach.length === 0) {
      console.log(`  ✅  ${pkg.lookup_key} — already has all products attached`);
      continue;
    }

    console.log(`  📎  Attaching to ${pkg.lookup_key}: ${toAttach.join(", ")}`);
    const { error: attachErr } = await attachProductsToPackage({
      client,
      path: { project_id: PROJECT_ID, offering_id: defaultOffering.id, package_id: pkg.id },
      body: { products: toAttach.map((id) => ({ product_id: id })) } as any,
    });
    if (attachErr) {
      console.error(`  ❌  Attach failed for ${pkg.lookup_key}:`, JSON.stringify(attachErr));
    } else {
      console.log(`  ✅  Attached to ${pkg.lookup_key}`);
    }
  }

  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
