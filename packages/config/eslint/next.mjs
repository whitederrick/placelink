import { defineConfig } from "eslint/config";
import nextTypeScript from "eslint-config-next/typescript";
import nextVitals from "eslint-config-next/core-web-vitals";
import { baseConfig } from "./base.mjs";

export const nextConfig = defineConfig([
  ...baseConfig,
  ...nextVitals,
  ...nextTypeScript
]);
