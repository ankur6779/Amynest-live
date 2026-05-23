import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test-setup.ts"],
    globals: true,
    pool: "forks",
    fileParallelism: false,
    maxWorkers: 1,
    env: {
      EXPO_PUBLIC_DOMAIN: "test.amynest.local",
    },
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
      "expo-audio": path.resolve(import.meta.dirname, "./__mocks__/expo-audio.tsx"),
      "expo-file-system": path.resolve(import.meta.dirname, "./__mocks__/expo-file-system.tsx"),
      "@react-native-community/slider": path.resolve(import.meta.dirname, "./__mocks__/@react-native-community/slider.tsx"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
});
