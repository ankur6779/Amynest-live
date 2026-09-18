import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// React 19's production CJS build does not export `act`. This environment may
// start with NODE_ENV=production; RTL 16 then throws `React.act is not a function`
// when a file is run in isolation. Tests must use the development React build.
process.env.NODE_ENV = "test";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
    exclude: ["**/node_modules/**", "**/dist/**", "playwright/**"],
    pool: "forks",
    singleFork: true,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
    },
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@api-lib": path.resolve(import.meta.dirname, "../api-server/src/lib"),
    },
    dedupe: ["react", "react-dom"],
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
});
