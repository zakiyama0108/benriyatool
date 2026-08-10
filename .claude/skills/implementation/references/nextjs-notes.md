# Next.js挙動差分メモ

AGENTS.mdの指示で`node_modules/next/dist/docs/`を調べて分かった、**コードを読むだけでは分からないNext.js固有の挙動差分**を記録する場所。

対象は「調べて初めて分かったこと」だけに限る。プロジェクトの規約やコードを読めば分かることはここに書かない(それらはコードを読めば十分で、記憶する価値がない)。目的は、同じ差分を別のセッション・別の実装で毎回ドキュメントから調べ直すコストを省くこと。

## 書き方

- 見出しはトピック単位で立てる(例: `## App Routerでのキャッシュ挙動`)
- 「学習データの知識と何が違うか」「正しい書き方・挙動」を簡潔に書く
- 参照した公式ドキュメントのパス(`node_modules/next/dist/docs/...`)を分かれば添える

## 記録済みの差分

## `output: 'export'`構成での`generateStaticParams()`の空配列扱い

通常のNext.js(サーバーあり構成)では、動的ルートの`generateStaticParams()`が空配列を返すことは「ビルド時には何も生成せず、実行時に全パスをオンデマンド生成する」正当な指定として文書化されている(`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`「All paths at runtime」参照)。

しかし`next.config.ts`で`output: 'export'`(静的エクスポート)を使う構成では、空配列を返すと**「generateStaticParams()自体が存在しない」扱いとなりビルドが失敗する**(`Error: Page "..." is missing "generateStaticParams()" so it cannot be used with "output: export" config.`)。実行時オンデマンド生成はサーバーがない静的エクスポートでは原理的に不可能なため、このケースを区別なくエラーにしている(`node_modules/next/dist/build/index.js`の`hasGenerateStaticParams = workerResult.prerenderedRoutes && workerResult.prerenderedRoutes.length > 0`判定を参照)。

対象データが0件になりうる動的ルート(例: 記事データが1件もない運用開始直後の`/ai-dev-digest/[date]`)では、空配列をそのまま返さず、公式ドキュメントが案内する「プレースホルダーparamを返し、ページ側で`notFound()`に倒す」パターンで対応する(該当ドキュメントの「With Cache Components」の項に同じ手法が載っているが、`output: 'export'`のこの挙動にもそのまま使える)。

## `next/font/google`はNext.jsのビルドパイプライン(webpack/SWC)専用でVitest上では動かない

`next/font/google`から読み込んだ関数(例: `Plus_Jakarta_Sans`)は、Next.jsのビルド時コンパイラがモジュール解決を差し替えることで実体を提供している。`node_modules/next/font/google/index.js`自体は空ファイルであり、Vitest(Vite)環境でそのままimportすると`TypeError: ... is not a function`になる(`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`にも`next/font`のモック方法は記載がなく、公式の想定は「フォント読み込みをテスト対象コンポーネントの外に出す」側の設計に見える)。

Vitestで直接レンダリングされるクライアントコンポーネント(`page.tsx`等)のモジュールスコープで`next/font/google`を呼ぶと、そのファイルをimportするテストが軒並み失敗する。フォント読み込みは同ルートの`layout.tsx`(サーバーコンポーネント)側に置き、CSS変数(`variable`オプション)経由でTailwindの`@theme`トークンに渡す構成にすると、テストは`page.tsx`を直接importするだけで`layout.tsx`を経由しないため影響を受けない(`app/**/layout.tsx`はvitest.config.mtsのcoverage excludeにも元々含まれており、layout.tsxを検証対象外とする既存方針とも整合する)。

## クライアントコンポーネントのpageでも`params`はPromise

Next.js 15以降、`params`(および`searchParams`)はサーバー・クライアント問わずPromiseとして渡される。クライアントコンポーネントのpage.tsxでは`await`できないため、Reactの`use()`で同期的に展開する(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`「In Client Components」参照)。ファイルシステムアクセス(`fs`)を伴うデータ取得は`'use client'`ファイルに書くとブラウザ向けバンドルに`fs`が含まれずビルドが壊れるため、`params`を使うデータ取得はサーバーコンポーネントのpage.tsx側で行い、取得済みデータをpropsとしてクライアントコンポーネントに渡す構成にする。
