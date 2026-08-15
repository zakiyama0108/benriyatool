---
name: run-benriyatool
description: べんりやつーるをローカルで起動し、headless Chromeで実際に操作・スクリーンショットを撮って動作確認するときに使う。「アプリを起動して」「実機で確認して」「スクリーンショットを撮って」「UIの変更が動くか見て」といった依頼、および/implementation-reviewでのUI変更の実機確認に対応する。
---

# べんりやつーるを起動して操作する

devサーバーをバックグラウンドで起動し、[driver.mjs](driver.mjs)(playwright-core+システムのGoogle Chromeをheadlessで使うREPL)にコマンドをheredocで流し込んで操作する。**パスはすべてリポジトリルート基準**。

## 単発の動作確認はエージェントに委譲する(メインスレッドの場合)

メインスレッドが確認観点の決まった単発の実機確認(「この変更が動くか見て」の依頼、実装後の動作確認など)を行う場合は、ui-checkerエージェント(`.claude/agents/ui-checker.md`)を起動して委譲する。スクリーンショット画像はメインスレッドのコンテキストを大量に消費するため、画像はエージェントが自分で見て、結果だけを文章で受け取る(役割分担の背景は[docs/adr/0002](../../../docs/adr/0002-skill-agent-separation.md)を参照)。

- エージェントには確認したいページ・操作手順・期待する見え方を伝えて起動し、報告をそのままユーザーに提示する
- ユーザーと対話しながら操作を試行錯誤する場合や、スクリーンショット自体を見せてほしいと言われた場合は、メインスレッドが直接以下の手順で操作する。ただしスクリーンショットはメインスレッドの会話履歴にbase64のまま蓄積し続け歯止めがないため、無制限には続けない:
  - **目安3〜4往復を超えて試行錯誤が続く場合**、残りの微調整はui-checkerエージェントに引き継ぐ(それまでのやり取りで固まった確認観点・期待する見え方をエージェントに渡し、以降のスクリーンショット確認を委譲する)
  - **確認が済んだ古いスクリーンショットは会話上「もう不要」と明示**し、区切りの良いところ(1つの調整が一段落したタイミングなど)で`/compact`を挟んで会話履歴から画像を落とすことを推奨する
- **エージェントとして本Skillを参照している場合**(/implementation-reviewの実機確認チェックを行うcode-reviewer、ui-checker自身): エージェントは入れ子で別のエージェントを起動できないため、委譲せず自分で以下の手順を直接実行する(スクリーンショットは自分の目で見て、報告には保存パスを記載する)

## 前提

- macOS + Google Chrome インストール済み(ブラウザのダウンロードは不要。playwright-coreが`channel: 'chrome'`でシステムのChromeを起動する)
- `.env.local` が存在すること(`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`。読む必要はない、無いとdevサーバーがエラーになるだけ)
- devサーバーのログ・PIDを`/tmp`に置くため、`.claude/settings.json`の`permissions.additionalDirectories`に`/tmp`を登録している(リポジトリを汚さないため。この設定を消すとログ・PIDの読み書きで確認を求められる)
- 初回のみ、ドライバの依存をインストールする:

```bash
cd .claude/skills/run-benriyatool && npm install && cd -
```

## 起動(エージェント用・主経路)

devサーバーを起動してポートをポーリングする(**macOSに`timeout`コマンドは無い**のでforループで待つ):

```bash
(npm run dev > /tmp/benriyatool-dev.log 2>&1 & echo $! > /tmp/benriyatool-dev.pid)
for i in {1..60}; do curl -sf http://localhost:3000 >/dev/null && { echo READY; break; }; sleep 1; done
```

ドライバにスクリプトを流す。以下は検証済みの代表フロー(トップページ表示→育休シミュレーターで計算→結果確認):

```bash
node .claude/skills/run-benriyatool/driver.mjs <<'EOF'
nav http://localhost:3000
wait-for text=べんりやつーる
screenshot home
nav http://localhost:3000/ikukyu
wait-for #monthlySalary
fill #monthlySalary 320000
fill #dueDate 2026-10-01
fill #leaveEndDate 2027-09-30
click button[type=submit]
wait-for text=受け取れる給付金の合計
screenshot ikukyu-result
eval new Promise(r=>setTimeout(r,3000))
errors
quit
EOF
```

スクリーンショットは `.claude/skills/run-benriyatool/screenshots/` に保存される(gitignore済み)。**撮ったら必ずReadツールで実際に見ること**。真っ白・エラー画面なら動作確認になっていない。

### ドライバのコマンド

| コマンド | 動作 |
|---|---|
| `block <文字列>` | URLにその文字列を含むリクエストを遮断。`is_test`未対応のアプリを操作する場合など、Supabaseへの書き込みを避けたいときに`block supabase`として使う(Gotchas参照) |
| `nav <URL>` | ページ遷移 |
| `wait-for <セレクタ>` | 要素の出現を待つ(15秒)。`text=○○`形式も可 |
| `click <セレクタ>` | クリック |
| `fill <セレクタ> <値>` | 入力(React制御コンポーネント対応)。第1トークンがセレクタ、残りが値 |
| `press <キー>` | キー入力(`Enter`等) |
| `screenshot [名前]` | フルページ撮影して保存パスを表示 |
| `screenshot-el <セレクタ> [名前]` | 要素単位でクローズアップ撮影(ビフォーアフター比較などフルページだと差分が分かりにくい場合に使う) |
| `text <セレクタ>` | 要素のテキストを表示(結果の数値検証に使う) |
| `eval <JS式>` | ページ内でJS評価 |
| `errors` | ここまでのconsoleエラー・未捕捉例外を表示 |
| `quit` | 終了 |

### 停止

```bash
kill $(cat /tmp/benriyatool-dev.pid) 2>/dev/null; pkill -f 'next dev'
```

## スタイルガイドのキャプチャ(styleguide.png)

アプリの共通部品を並べた`app/<アプリ名>/_styleguide/page.tsx`は、`npm run dev`なしでも見た目を確認できるよう、同ディレクトリに`styleguide.png`をコミットして同居させる(運用ルールは[/implementation](../implementation/SKILL.md)の「共通部品(chrome)を変更したときのstyleguide.png撮り直し」を参照)。

driverの`screenshot`は`.claude/skills/run-benriyatool/screenshots/`(gitignore済み)に保存するため、撮影後にコミット対象パスへコピーする。`<アプリ名>`は実際のアプリ名に置き換える:

```bash
node .claude/skills/run-benriyatool/driver.mjs <<'EOF'
nav http://localhost:3000/<アプリ名>/_styleguide
wait-for text=styleguide
screenshot styleguide
quit
EOF
cp .claude/skills/run-benriyatool/screenshots/styleguide.png app/<アプリ名>/_styleguide/styleguide.png
```

撮ったら必ずReadツールで実際に見て、真っ白・エラーでないことを確認してからコミットする。

## 起動(人間向け)

`npm run dev` → http://localhost:3000 をブラウザで開く → Ctrl-Cで停止。

## テスト

```bash
npm test
```

11ファイル・66件が全部通るのが正常(2026-07時点)。

## Gotchas

- **「計算する」を押すと本番Supabaseの`ikukyu_results`テーブルに書き込まれる**(`app/ikukyu/lib/saveResult.ts`。devサーバーでも本番と同じ接続先)。ただしdevサーバー(`NODE_ENV=development`)からの保存は`is_test=true`で保存される(仕様: `specs/ikukyu/save-result/requirements.md#テストデータの判定-1`)ため、`/data-check`の集計(`is_test = false`で絞り込み)には混ざらない。以前はここで`block supabase`を実行しリクエスト自体を遮断していたが、is_test導入後は不要になったため外している
- 他アプリを追加してこのSkillのフローを流用する場合、そのアプリの保存処理がまだ`is_test`を実装していなければ、実データに混ざらないよう`block supabase`を先頭に入れること(コマンドはドライバに残っている)
- **`saveResult`はfire-and-forgetの非同期処理**で、UIの結果表示(`wait-for text=受け取れる給付金の合計`)はSupabaseへの保存完了を待たずに先に成立する。保存確認まで含めたいスモークフローでは、`click`後すぐに`quit`せず`eval new Promise(r=>setTimeout(r,3000))`のような数秒の待機を挟むこと。待機なしで`quit`すると保存リクエストが完了前に中断され、`errors`は`no errors`と表示されるのに実際はDBに何も保存されていない、ということが起きる(`errors`は「リクエストが拒否されなかったか」しか見ておらず「保存が完了したか」は見ていない)
- **トップページの見出しは「べんりやつーる」(ひらがな)**。「便利屋」でwait-forするとタイムアウトする
- **`trailingSlash: true`のため`/ikukyu`は`/ikukyu/`にリダイレクトされる**。navは追従するので問題ないが、URL比較をするときは末尾スラッシュに注意
- **入力はReact制御コンポーネント**。`eval`でvalue代入してもonChangeが発火しない。必ず`fill`を使う
- **`<main>`要素は無い**。`text main`は30秒タイムアウトする。`text`にはid等の実在セレクタを渡す
- **`block supabase`はURL文字列一致のため、devのJSチャンクファイル名に`supabase`という文字列が含まれるとそのチャンクごと遮断してしまうことがある**(ハイドレーションが壊れ、クリック等の操作が一切効かなくなる)。書き込みを避けたいアプリでこの症状が出たら、`block`の対象文字列をAPIパス等より限定的なもの(例: 実際のリクエスト先ドメイン)に絞る

## Troubleshooting

- **`npm error Missing script: "dev"`**: cwdが`.claude/skills/run-benriyatool/`のまま。リポジトリルートで実行する
- **`EADDRINUSE` / ポート3000が塞がっている**: 前回のdevサーバーが残っている。`pkill -f 'next dev'`してから再起動
- **`timeout: command not found`**: macOSにはGNU coreutilsの`timeout`が無い。上記のforループ形式を使う
