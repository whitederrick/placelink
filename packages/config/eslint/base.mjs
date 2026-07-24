import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import typescriptPlugin from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export const baseConfig = defineConfig([
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: typescriptParser
    },
    plugins: {
      "@typescript-eslint": typescriptPlugin
    },
    rules: {
      ...typescriptPlugin.configs.recommended.rules,
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "no-console": "error",
      "no-warning-comments": ["error", { "terms": ["todo"], "location": "anywhere" }]
    }
  },
  globalIgnores([".next/**", "coverage/**", "node_modules/**", "next-env.d.ts"])
]);
