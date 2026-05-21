/**
 * Create or update the App Store review login (email verified, no inbox needed).
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' FIREBASE_PROJECT_ID='amynest-836ff' \
 *     pnpm --filter @workspace/api-server exec tsx scripts/createAppleReviewAccount.ts
 *
 * Optional env:
 *   REVIEW_EMAIL   (default: apple.review@amynest.in)
 *   REVIEW_PASSWORD (default: AmyNestReview2025!)
 */
import { adminAuth } from "../src/lib/firebase-admin";

const DEFAULT_EMAIL = "apple.review@amynest.in";
const DEFAULT_PASSWORD = "AmyNestReview2025!";

async function main() {
  const email = (process.env.REVIEW_EMAIL ?? DEFAULT_EMAIL).toLowerCase().trim();
  const password = process.env.REVIEW_PASSWORD ?? DEFAULT_PASSWORD;

  if (!email.includes("@") || password.length < 8) {
    console.error("Invalid REVIEW_EMAIL or REVIEW_PASSWORD");
    process.exit(1);
  }

  const auth = adminAuth();

  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, {
      emailVerified: true,
      password,
      displayName: existing.displayName ?? "Apple Reviewer",
    });
    console.log(`✅ Updated existing review account`);
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   UID:      ${existing.uid}`);
    console.log(`   Verified: true`);
    return;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== "auth/user-not-found") throw err;
  }

  const created = await auth.createUser({
    email,
    password,
    emailVerified: true,
    displayName: "Apple Reviewer",
  });

  console.log(`✅ Created App Store review account`);
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   UID:      ${created.uid}`);
  console.log(`   Verified: true`);
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
