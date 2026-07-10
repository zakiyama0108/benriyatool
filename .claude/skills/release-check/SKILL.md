---
name: release-check
description: PRがmainにマージされた後のリリース確認に使う。Cloudflare Workersへのデプロイ完了確認、本番(benriyatool.com)のスモークチェック、マージ済みブランチの掃除を行う。
---

> ワークフロー上の位置: [/pr](../pr/SKILL.md)(実装PRのマージ後・毎回) → **/release-check(本Skill)** → 完了(問題があれば[/fix](../fix/SKILL.md))

# Step1 デプロイ完了の確認

mainへのpushで`deploy.yml`(GitHub Actions)がCloudflare Workersへ自動デプロイする。

```bash
gh run list --workflow=deploy.yml --limit 1   # 最新のデプロイ実行を確認
gh run watch <run-id>                          # 完了まで待つ
```

デプロイが失敗した場合は`gh run view <run-id> --log-failed`で原因を確認し、[/fix](../fix/SKILL.md)のフローで修正する(本番は前回デプロイのまま動き続けるので、慌てて直接pushしない)。

# Step2 本番のスモークチェック

今回の変更に関係するページを本番URLで確認する。

```bash
# ステータス確認(トップと変更対象ページ)
curl -s -o /dev/null -w '%{http_code}\n' https://benriyatool.com/
curl -s -o /dev/null -w '%{http_code}\n' https://benriyatool.com/<変更したアプリのパス>/

# 変更内容が反映されているかをHTMLで確認(追加した文言・要素をgrep)
curl -s https://benriyatool.com/<変更したアプリのパス>/ | grep '<今回追加した文言>'
```

- 確認する内容は「今回のPRで変わったこと」に合わせる(文言変更なら文言、計算変更なら画面を`npm run dev`ではなく本番で操作して確認するようユーザーに案内する)
- 静的エクスポートのため反映はデプロイ完了とほぼ同時。変わっていない場合はデプロイの成否とキャッシュを疑う

# Step3 ブランチの掃除

マージ済みのfeatureブランチを削除し、ローカルをmainに揃える。

```bash
git checkout main && git pull
git branch -d feature/<機能名>              # ローカル(マージ済みなら-dで安全に消える)
git push origin --delete feature/<機能名>   # リモート(GitHub側で自動削除済みならエラーになるだけなのでスキップ)
git fetch --prune                            # 削除済みリモートブランチの追跡情報を整理
```

`git branch -d`が「not fully merged」で失敗したら、マージされていないコミットが残っている合図なので削除せずユーザーに確認する(`-D`で強制削除しない)。

# 完了時の次ステップ案内

- 問題なし → 機能のリリース完了。次の機能は[/requirement](../requirement/SKILL.md)または[/fix](../fix/SKILL.md)から
- 本番で問題を発見 → [/fix](../fix/SKILL.md)で修正フローへ(再現テストから始める)