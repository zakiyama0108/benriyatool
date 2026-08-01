'use client'

type Props = {
  onLoginClick: () => void
}

// 未ログイン時に「この試算を保存する」ボタンの近くへ表示するマイシナリオへのログイン誘導案内。
// save-resultは匿名分析用のため個人情報を含む項目を保存しない設計だが、その制約に気づかず
// 「保存したのに内容が復元できない」と感じる利用者向けに、ログインすれば賞与・イベントの名目や
// 生年月なども含めて保存・復元できる旨を案内する(仕様: requirements.md#マイシナリオの表示-2、
// design.md#マイシナリオ操作の表示を出し分ける処理)
export default function ScenarioLoginPrompt({ onLoginClick }: Props) {
  return (
    <div className="space-y-2 rounded-[35px] border border-lms-line-strong bg-lms-card p-5 text-sm text-lms-ink/70">
      <p>
        ログインすると、賞与・イベントの名目や生年月も含めた入力項目一式を「マイシナリオ」として保存・復元できます(この試算を保存するでは匿名分析のため個人情報は保存されません)。
      </p>
      <button
        onClick={onLoginClick}
        className="rounded-full bg-lms-teal px-4 py-2 text-sm font-medium text-white"
      >
        Googleでログイン
      </button>
    </div>
  )
}
