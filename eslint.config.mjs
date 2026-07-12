import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals, // Next.jsのCore Web Vitalsに関する推奨ルール(画像最適化・a11y等)
  ...nextTs, // Next.js向けTypeScript推奨ルール
  // 型情報を使った推奨ルール。Promiseのawait忘れやanyの伝播など、tscの型チェックだけでは検出できないバグを検出する
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        // tsconfig.jsonを自動検出して各ファイルの型情報を取得する
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 設定ファイル等、tsconfig.jsonの対象外にあるJSファイルは型情報を使うルールの対象から外す(型情報が取得できずエラーになるため)
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },
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
    // npm run test:coverage の生成物(vitest.config.mtsのcoverage設定参照)
    "coverage/**",
    // Skill用のエージェントツール(run-benriyatoolのドライバ等)。アプリのコード規約(no-console等)の対象外
    ".claude/**",
  ]),
]);

export default eslintConfig;
