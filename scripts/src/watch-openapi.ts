import { watch } from "fs";
import { execSync } from "child_process";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const specPath = resolve(root, "lib", "api-spec", "openapi.yaml");
const specDir = dirname(specPath);
const specFile = basename(specPath);

function runCodegen() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] openapi.yaml changed — running codegen…`);
  try {
    execSync("pnpm run codegen", {
      cwd: root,
      stdio: "inherit",
    });
    console.log(`[${new Date().toISOString()}] codegen complete.`);
  } catch {
    console.error(`[${new Date().toISOString()}] codegen failed — check output above.`);
  }
}

console.log(`Watching ${specPath} for changes…`);
console.log(`Root: ${root}`);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(specDir, (_event, filename) => {
  if (filename !== specFile) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(runCodegen, 300);
});

process.on("SIGINT", () => {
  console.log("\nWatcher stopped.");
  process.exit(0);
});
