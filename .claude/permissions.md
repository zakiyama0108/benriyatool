# .claude/settings.json の許可コマンド一覧

`permissions.allow` はJSON標準のためコメントを書けない(`//`を入れるとファイル全体が静かにパース失敗しデフォルト設定にフォールバックすることを確認済み)。そのため、各許可ルールの意味をここに記録する。

## permissions.allow

| ルール | 説明 |
| --- | --- |
| `Bash(git commit -m ' *)` | git commit実行(メッセージ引数あり) |
| `Bash(gh pr create --title 'feat\(output\): 共通出力データ生成のRed/Green/Refactorフェーズ完了' --body ' *)` | 共通出力データ生成機能のPR作成(タイトル固定) |
| `Bash(xargs cat)` | xargs経由で複数ファイルの中身を表示 |
| `Bash(npm install *)` | npm依存パッケージのインストール |
| `Bash(gh pr create --title 'feat\(components\): コンポーネントのRed/Green/Refactorフェーズ完了' --body ' *)` | コンポーネント実装機能のPR作成(タイトル固定) |
| `Bash(gh run *)` | GitHub Actionsのワークフロー実行状況の確認 |
| `Bash(gh pr *)` | GitHub PRの一覧・詳細・チェック確認などPR操作全般 |
| `Bash(npx vercel *)` | Vercel CLIの操作(デプロイ確認など) |
| `Bash(git stash *)` | 作業中の変更の一時退避・復元 |
| `Bash(gh api *)` | GitHub APIの直接呼び出し |
| `Bash(vercel ls *)` | Vercelのデプロイ一覧表示 |
| `Bash(xargs sed -i '' "s|'../../app/components/|'../../app/ikukyu/components/|g")` | `app/components/`配下のimportパスを`app/ikukyu/components/`に一括置換(hub-site移行時のリファクタ用) |
| `Bash(xargs sed -i '' "s|'../../app/lib/|'../../app/ikukyu/lib/|g")` | `app/lib/`配下のimportパスを`app/ikukyu/lib/`に一括置換(同上) |
| `Bash(xargs sed -i '' "s|'../../app/ikukyu/|'../../../app/ikukyu/|g")` | `app/ikukyu/`配下のimportパスの相対階層をさらに1段深く修正(同上) |
| `Bash(git remote *)` | リモートリポジトリ情報の確認 |
| `Bash(git commit *)` | git commit全般の実行 |
| `Bash(bw login *)` | Bitwardenへのログイン(認証情報取得用) |
| `Bash(git merge *)` | ブランチのマージ |
| `Bash(git fetch *)` | リモートの最新情報の取得 |
| `Bash(echo "exit:$?")` | 直前のコマンドの終了コード確認用の出力 |
| `Bash(npx vitest *)` | Vitestによるテスト実行 |
| `Bash(gh workflow *)` | GitHub Actionsワークフローの一覧・詳細確認 |
| `Bash(echo "grep exit: $?")` | grepコマンドの終了コード確認用の出力 |
| `Bash(git mv *)` | ファイル・ディレクトリのgit管理下での移動 |
| `Bash(echo "exit: $?")` | 直前のコマンドの終了コード確認用の出力(スペース違いの別パターン) |

## ルール
`.claude/settings.json` の `permissions.allow` に新しいコマンドを追加する際は、必ずこの表に1行追記する(同じPR内で行う)。
