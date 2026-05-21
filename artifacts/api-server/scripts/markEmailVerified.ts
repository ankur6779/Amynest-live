/**
 * Mark a Firebase Auth user's email as verified (for review/demo inboxes).
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_JSON='...' FIREBASE_PROJECT_ID='...' \
 *     pnpm --filter @workspace/api-server exec tsx scripts/markEmailVerified.ts amynestreview@amynest.in
 */
import { adminAuth } from "../src/lib/firebase-admin";

async function main() {
  const rawEmail = process.argv[2];
  if (!rawEmail?.includes("@")) {
    console.error("Usage: tsx scripts/markEmailVerified.ts <email>");
    process.exit(1);
  }

  const email = rawEmail.toLowerCase().trim();
  const auth = adminAuth();
  const user = await auth.getUserByEmail(email);

  if (user.emailVerified) {
    console.log(`✓ ${email} is already verified (uid: ${user.uid})`);
    return;
  }

  await auth.updateUser(user.uid, { emailVerified: true });
  console.log(`✅ Marked ${email} as emailVerified (uid: ${user.uid})`);
}

main().catch((err) => {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
