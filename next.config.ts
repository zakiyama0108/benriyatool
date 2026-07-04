import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Workersへ静的ファイルとして配信するため、SSRサーバーを使わない静的エクスポートにする
  output: "export",
  // 静的ホスティングで各ページを`/path/index.html`として解決できるようにする
  trailingSlash: true,
  // 静的エクスポートではNext.jsの画像最適化API(サーバー機能)が使えないため無効化する
  images: { unoptimized: true },
};

export default nextConfig;
