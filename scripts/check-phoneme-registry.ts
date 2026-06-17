/**
 * Phase E certification gate — canonical phoneme registry.
 *
 * MUST pass before any ElevenLabs regeneration. FAILS (exit 1) on duplicate,
 * empty, forbidden, or colliding phoneme mappings (the P1/P2 defect class).
 *
 *   pnpm run check:phoneme-registry
 */
import {
  PHONEME_REGISTRY,
  getCurriculumPhonemes,
  validatePhonemeRegistry,
} from "@workspace/phonics-sounds";

const issues = validatePhonemeRegistry();

console.log("── Canonical phoneme registry certification ──");
console.log(`Total entries     : ${PHONEME_REGISTRY.length}`);
console.log(`In curriculum     : ${getCurriculumPhonemes().length}`);
console.log(`Scoped (future)   : ${PHONEME_REGISTRY.length - getCurriculumPhonemes().length}`);

if (issues.length > 0) {
  console.error(`\n✖ FAIL — ${issues.length} registry issue(s):`);
  for (const i of issues) console.error(`  • ${i.id}: ${i.problem}`);
  process.exit(1);
}

console.log("\n✔ PASS — no duplicate / colliding / forbidden phoneme mappings.");
console.log("P1 short-a≠short-o, P2 voiced≠unvoiced th, P3 w/j/v/z mapped, P4 y=/j/, P5 ck/qu units.");
