import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "node_modules/**",
      "static-build/**",
      "android/**",
      "ios/**",
      ".expo/**",
      "scripts/**",
      "__mocks__/**",
      "__tests__/**",
      "server/**",
      "expo-env.d.ts",
      "**/*.d.ts",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
    },
  },
];
