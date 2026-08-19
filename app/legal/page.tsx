import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '利用規約・プライバシーポリシー | 育休給付金シミュレーター',
  description:
    '育休給付金シミュレーターの利用規約、プライバシーポリシー、免責事項をご確認ください。',
}

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* スティッキーヘッダー */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4">
        <nav className="mx-auto flex max-w-3xl items-center gap-6">
          <Link href="/ikukyu" className="text-sm font-medium text-blue-500 hover:underline">
            ← シミュレーターへ
          </Link>
          <a href="#terms" className="text-sm font-medium text-blue-500 hover:underline">
            利用規約
          </a>
          <a href="#privacy" className="text-sm font-medium text-blue-500 hover:underline">
            プライバシーポリシー
          </a>
        </nav>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 pb-20 space-y-8">

        {/* 利用規約 */}
        <section id="terms" className="rounded-2xl border border-gray-200 bg-white p-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-500">
            Terms of Service
          </p>
          <h1 className="text-2xl font-bold text-gray-900">利用規約</h1>
          <p className="mt-1 mb-8 text-sm text-gray-400">最終更新日：2026年6月23日</p>

          <h2 className="section-heading">1. はじめに</h2>
          <p className="body-text">
            本ウェブサイト（以下「本サービス」）は、育休・育児給付金の受給予定額を試算するためのツールです。本サービスをご利用になる前に、本規約をよくお読みください。
          </p>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">2. 計算結果について</h2>
          <p className="body-text">
            本サービスが表示する育休給付金の試算額は、入力された情報をもとに一般的な計算式で算出した<strong>参考値</strong>です。以下の点をご了承ください。
          </p>
          <ul className="mt-2 mb-3 list-disc pl-5 space-y-1.5 text-sm text-gray-600">
            <li>実際の支給額は、雇用保険の加入状況・在職実績・ハローワークの審査等により異なる場合があります</li>
            <li>法改正や制度変更により、計算結果が最新の制度と異なる場合があります</li>
            <li>正確な支給額は、お近くのハローワークまたは会社の担当部署にご確認ください</li>
          </ul>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">3. 免責事項</h2>
          <p className="body-text">
            本サービスの試算結果を参考にした行動・判断によって生じた損害について、当サービスは一切の責任を負いません。本サービスは情報提供を目的としており、法的・財的アドバイスを提供するものではありません。
          </p>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">4. 知的財産</h2>
          <p className="body-text">
            本サービスのコンテンツ・デザイン・計算ロジックに関する知的財産権は、当サービス運営者に帰属します。
          </p>
          <p className="body-text mt-3">
            本サービスの一部機能(AI駆動開発ダイジェスト)では、第三者が公開した動画・記事等を独自の視点で解説する目的で、出典元へのリンクとともに要約(全文の翻訳・転載ではない)を掲載している。著作権者から掲載内容の修正・削除の要望があれば、問い合わせ先まで連絡があり次第、速やかに対応する。
          </p>
          <p className="body-text mt-3">
            本サービスの一部機能(ボードゲームのルール確認)では、利用者から寄せられた依頼をもとに、運営者が独自の言い回しで再構成したルール解説を掲載している(説明書原文の転載ではない)。また、ゲームを紹介する画像は、投稿者または運営者が実物を撮影したもの、もしくはそれを基にAIで加工したものを掲載しており、第三者の画像をそのまま転載するものではない。著作権者から掲載内容の修正・削除の要望があれば、問い合わせ先まで連絡があり次第、速やかに対応する。
          </p>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">5. 規約の変更</h2>
          <p className="body-text">
            本規約は予告なく変更されることがあります。変更後、本サービスを継続してご利用の場合、改訂後の規約に同意したものとみなします。
          </p>
        </section>

        {/* プライバシーポリシー */}
        <section id="privacy" className="rounded-2xl border border-gray-200 bg-white p-10">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-500">
            Privacy Policy
          </p>
          <h1 className="text-2xl font-bold text-gray-900">プライバシーポリシー</h1>
          <p className="mt-1 mb-8 text-sm text-gray-400">最終更新日：2026年6月23日</p>

          <h2 className="section-heading">1. 収集する情報</h2>
          <p className="body-text">本サービスでは、試算のために以下の情報を入力していただきます。</p>
          <ul className="mt-2 mb-3 list-disc pl-5 space-y-1.5 text-sm text-gray-600">
            <li>月給（金額）</li>
            <li>出産予定日</li>
            <li>育休終了予定日</li>
          </ul>
          <p className="body-text">
            これらの情報は氏名・住所・連絡先などと紐付けるものではなく、個人を特定することはできません。
          </p>
          <p className="body-text mt-3">
            資産推移シミュレーターでは、任意でGoogleアカウントによるログインを利用できます。ログインした場合、Googleアカウントのメールアドレスを取得し、利用者ご自身が「マイシナリオ」として保存を選択した入力内容（収入・支出の内訳、家族の生年月、開始資産額、賞与・イベントの登録内容など）を、ログインしたアカウントに紐付けて保存します。ログインは任意であり、ログインしない場合はこれらの情報を保存しません。
          </p>
          <p className="body-text mt-3">
            AI駆動開発ダイジェストでは、任意でGoogleアカウントによるログインを利用できます。ログインした場合、Googleアカウントのメールアドレスを取得し、利用者ご自身が「付箋」機能で入力したメモ内容を、対象のトピック・ログインしたアカウントに紐付けて保存します。ログインは任意であり、ログインしない場合はこれらの情報を保存しません。
          </p>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">2. 情報の利用目的</h2>
          <p className="body-text">入力された情報は、以下の目的で利用します。</p>
          <ul className="mt-2 mb-3 list-disc pl-5 space-y-1.5 text-sm text-gray-600">
            <li>育休給付金の試算額を表示するため</li>
            <li>月給帯・育休取得期間などの統計データを集計・分析してサービス改善に役立てるため</li>
            <li>資産推移シミュレーターのマイシナリオ機能で、ログインした利用者ご本人に対して保存内容を復元するため</li>
            <li>AI駆動開発ダイジェストの付箋機能で、ログインした利用者ご本人に対して保存内容を復元するため</li>
          </ul>
          <p className="body-text">統計データは匿名の集計値として扱い、個人の行動追跡には使用しません。マイシナリオ・付箋として保存された内容は、保存した本人のみが閲覧・編集・削除でき、他の利用者や運営者が閲覧することはありません。</p>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">3. 第三者への提供</h2>
          <p className="body-text">
            収集した情報を第三者に販売・提供・開示することはありません。ただし、法令に基づく開示が必要な場合を除きます。
          </p>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">4. Cookieおよびアクセス解析</h2>
          <p className="body-text">
            本サービスでは、アクセス解析のためにCookieを使用する場合があります。ブラウザの設定でCookieを無効にすることも可能です。
          </p>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">5. お問い合わせ</h2>
          <p className="body-text">
            本ポリシーに関するご質問は、
            <a href="mailto:support.ry@gmail.com" className="text-blue-500 hover:underline">
              support.ry@gmail.com
            </a>
            {' '}までお問い合わせください。
          </p>

          <hr className="my-7 border-gray-100" />

          <h2 className="section-heading">6. ポリシーの変更</h2>
          <p className="body-text">
            本ポリシーは予告なく変更されることがあります。重要な変更がある場合はサービス上でお知らせします。
          </p>
        </section>

      </div>
    </div>
  )
}
