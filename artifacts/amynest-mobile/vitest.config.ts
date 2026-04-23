import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test-setup.ts"],
    globals: true,
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "@api-lib": path.resolve(import.meta.dirname, "../api-server/src/lib"),
      "react-native": path.resolve(import.meta.dirname, "./__mocks__/react-native.tsx"),
      "@expo/vector-icons": path.resolve(import.meta.dirname, "./__mocks__/@expo/vector-icons.tsx"),
      "expo-linear-gradient": path.resolve(import.meta.dirname, "./__mocks__/expo-linear-gradient.tsx"),
      "react-native-reanimated": path.resolve(import.meta.dirname, "./__mocks__/react-native-reanimated.tsx"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
});
