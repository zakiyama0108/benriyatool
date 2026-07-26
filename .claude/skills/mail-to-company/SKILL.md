---
name: mail-to-company
description: 個人PCで用意したファイル・テキストを会社メールアドレスへ送信するときに使う(Gmail SMTP、送信元・宛先固定)。取り消せない外部送信のため自律起動しない。
disable-model-invocation: true
---

> ワークフロー上の位置: ユーティリティSkill(開発フローから独立)。「会社PCに送って」「メールで送れるようにして」の依頼時にユーザーが明示起動する

# 前提

- 送信先は `ryosuke.yamazaki@tohmatsu.co.jp` に固定(`send.mjs`にハードコード。CLI引数で変更できない設計にして誤送信の余地を減らしている)
- 送信元Gmailアカウントの認証情報は `.claude/skills/mail-to-company/.env`(gitignore対象、コミットしない)に保管する
- 初回のみ `.claude/skills/mail-to-company/` で `npm install` が必要

## 初回セットアップ(.envが未作成の場合)

1. `cp .claude/skills/mail-to-company/env.sample .claude/skills/mail-to-company/.env`
2. `.env` を編集し、送信元Gmailアカウントのメールアドレスと[アプリパスワード](https://myaccount.google.com/apppasswords)(2段階認証が必要)を設定する
   - `GMAIL_USER=送信元アドレス`
   - `GMAIL_APP_PASSWORD=アプリパスワード(16桁)`
3. `.env`が存在しない場合は、ここでユーザーに上記を案内して作成してもらってから次のStepに進む(Claudeが認証情報の値を代わりに考えたり推測したりしない)

# Step1 送信内容を確認する

ユーザーの依頼から送信するファイル・テキストを特定し、以下を組み立てる。

- 件名(`--subject`): 依頼内容から簡潔に。指定がなければユーザーに確認する
- 本文(`--body` または `--body-file`): 送るテキストそのもの、または補足説明
- 添付ファイル(`--attach`、複数可): 個人PC上の実ファイルパス

# Step2 送信前に必ず最終確認する(誤送信防止)

**このSkillの中核はここ。** `disable-model-invocation: true` は「会話の流れで勝手に起動しない」ためのゲートであり、Skillが起動した後の誤送信は別問題として防ぐ必要がある。node_modules配下のsend.mjsを直接実行する前に、必ず以下をそのままユーザーに提示し、明示的な「OK」「送って」等の肯定応答を得てから実行する。

```
以下の内容でメールを送信します。よろしいですか?
宛先: ryosuke.yamazaki@tohmatsu.co.jp
件名: <件名>
本文: <本文 or「なし」>
添付: <ファイル一覧 or「なし」>
```

- 曖昧な返答(既読無視・話題転換など)は肯定応答として扱わない
- ファイル内容に個人情報・機密情報が含まれていそうな場合は、確認メッセージ内でその旨も一言添える

# Step3 送信する

確認が取れたら実行する。

```bash
node .claude/skills/mail-to-company/send.mjs --subject "件名" --body "本文" --attach "/path/to/file"
```

- `.env`未設定・添付ファイルが存在しない場合はスクリプトがエラーで終了する(エラーメッセージをそのままユーザーに伝える)
- 送信成功時はターミナルに `送信しました: ryosuke.yamazaki@tohmatsu.co.jp (messageId: ...)` と出力される。これをユーザーに報告する

# 完了時の次ステップ案内

送信結果(成功/失敗)をユーザーに報告して完了。後続の工程Skillには接続しない(単発のユーティリティ操作のため)。
