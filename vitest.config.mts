import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig.json の paths エイリアスを Vite ネイティブ機能で解決する
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['app/**/*.{ts,tsx}'],
      // page.tsx/layout.tsxはNext.jsのルーティング用ファイルでビルド確認が中心のため、
      // types.tsは型定義のみで実行コードを持たないため対象外にする
      exclude: ['app/**/page.tsx', 'app/**/layout.tsx', 'app/**/types.ts'],
      // 閾値は設定せず可視化のみ(CIを落とさない)。現状の実測値を見てから必要性を判断する
    },
  },
})
