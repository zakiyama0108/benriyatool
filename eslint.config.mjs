import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals, // Next.jsのCore Web Vitalsに関する推奨ルール(画像最適化・a11y等)
  ...nextTs, // Next.js向けTypeScript推奨ルール
  {
    rules: {
      // console.logの消し忘れを検知する(CLAUDE.mdの「console.logは残さない」を強制する)
      "no-console": "warn",
    },
  },
  {
    // scripts/配下はCLI実行が前提のNodeスクリプトのため、console出力を許可する
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
