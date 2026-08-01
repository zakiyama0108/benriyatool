import { notFound } from 'next/navigation'
import { getAllArticles, getArticleByDate } from '../lib/articles'
import ArticleDetailView from '../components/ArticleDetailView'

// 記事詳細ページ(仕様: requirements.md#記事本文表示-1、design.md「関連するファイル」)。
// 静的エクスポートのため、ビルド時に全日付を列挙する(next.config.tsのoutput: 'export')。
//
// Next.js固有の挙動差分: output: 'export'構成では、動的ルートのgenerateStaticParams()が
// 空配列を返すと(通常のNext.jsなら「実行時に全パスを生成する」意味になるはずが)
// 「generateStaticParams()自体が存在しない」扱いとなりビルドが失敗する
// (node_modules/next/dist/build/index.js参照。E87エラー)。
// 運用開始直後で記事が1件も存在しない期間に備え、その場合だけダミーのパスを1件返し、
// ページ側でnotFound()に倒す(公式ドキュメントが案内する「プレースホルダーparamを返し
// notFound()で処理する」パターン)。article-listから実在しない日付へのリンクは張られないため、
// 実際に訪問者がこのURLに到達することはない
export function generateStaticParams() {
  const dates = getAllArticles().map((article) => ({ date: article.date }))
  return dates.length > 0 ? dates : [{ date: '__no-articles-yet__' }]
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const article = getArticleByDate(date)
  if (!article) notFound()

  return <ArticleDetailView article={article} />
}
