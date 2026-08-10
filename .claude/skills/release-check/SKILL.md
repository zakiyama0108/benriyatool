---
name: release-check
description: PRがmainにマージされた後のリリース確認に使う。Cloudflare Workersへのデプロイ完了確認、本番(benriyatool.com)のスモークチェック、マージ済みブランチの掃除を行う。
---

> ワークフロー上の位置: [/pr](../pr/SKILL.md)(実装PRのマージ後・毎回) → **/release-check(本Skill)** → 完了(問題があれば[/fix](../fix/SKILL.md))

> **次フェーズのモデル:** 本Skillはデプロイ確認・本番スモークチェックが主であり、エージェント実行時も **Sonnet** で十分。問題発見時は[/fix](../fix/SKILL.md)で改めてモデル選定

# 前提条件

- 対象の実装PRがmainにマージ済みであること。未マージならマージ待ち([/pr](../pr/SKILL.md))の状態なので本Skillはまだ実行しない

# 実施方法

本Skillの手順はrelease-checkerエージェント(`.claude/agents/release-checker.md`)を起動して行う(役割分担の背景は[docs/adr/0002](../../../docs/adr/0002-skill-agent-separation.md)を参照)。

- エージェントには今回マージされたPR番号・featureブランチ名・変更対象アプリのパス・スモークチェックで確認すべき変更点を伝えて起動する
- エージェントの報告をそのままユーザーに提示し、問題があれば次のステップ(/fix)を案内する
- エージェントはRead/Grep/Glob/Bashのみを持ち、ファイル編集権限を持たない。Step4(進捗状況の更新)はエージェントの報告を受け取った**メインスレッドが**行う

以下のStep1〜3はエージェントが従う内容。エージェントを使えない状況ではメインスレッドが直接実行する。Step4はエージェントの有無によらず常にメインスレッドが行う。

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
- **目視の確認項目がある場合のみ**、報告の最後に確認した本番URL(装飾なしの単独行。トップではなく変更が反映された対象ページのURL)を明記し、実際の画面をユーザー自身の目でも確認するよう案内する(自動チェックはHTTPステータス・HTML文言の機械的な確認に留まり、見た目・操作感まではカバーできないため)
  - 目視の確認項目があるか: フロントの見た目・挙動が変わる変更、またはバックエンドの修正でもUI経由で結果を確認できる場合は「確認項目あり」なのでURLを提示する。UIに見える変更が一切ない場合(CI・ビルド設定・依存更新・ドキュメントのみ等)は確認項目がないためURL提示は不要(スモークチェックはトップの200確認までで足りる)

# Step3 ブランチの掃除

マージ済みのfeatureブランチを削除し、ローカルをmainに揃える。

```bash
git checkout main && git pull
git branch -d feature/<機能名>              # ローカル(マージ済みなら-dで安全に消える)
git push origin --delete feature/<機能名>   # リモート(GitHub側で自動削除済みならエラーになるだけなのでスキップ)
git fetch --prune                            # 削除済みリモートブランチの追跡情報を整理
```

`git branch -d`が「not fully merged」で失敗したら、マージされていないコミットが残っている合図なので削除せずユーザーに確認する(`-D`で強制削除しない)。

並行作業([parallel-work](../parallel-work/SKILL.md))でworktreeを使っていた場合は、ブランチ削除の前にworktree自体を片付ける:

```bash
git worktree remove ../benriyatool-<機能名>   # マージ済みworktreeの削除
git worktree list                              # 残っているworktreeの確認
```

また、他のworktreeで作業が続いている場合は、そちらで`git fetch origin && git rebase origin/main`を実行して今回のマージ内容を取り込むよう案内する。

# Step4 進捗状況の更新(メインスレッドが行う。architecture.mdを持つアプリのみ)

対象アプリが`specs/<アプリ名>/architecture.md`を持つ場合、Step2のスモークチェックで問題なしと確認できた時点で、メインスレッドが機能マップの該当spec行の状態を「リリース済み」に更新する。Step3で既にmainへ戻っておりmainへの直接pushはできないため、この更新だけのために小さなfeatureブランチ([/pr](../pr/SKILL.md)の手順に準拠、例: `feature/<アプリ名>-progress-update`)を切ってコミット・push・PR作成まで行う(内容が機械的な状態更新のみのため、PR本文は簡潔でよい)。

更新後の機能マップ全体(表)は、PRのマージを待たずにこの完了報告にそのまま貼って提示する(そのアプリの他specの状態も含め、1画面で全体進捗が分かるようにする)。あわせてPRのURLを明記し、ユーザーのマージ待ちであることを案内する(このPR自体は/release-checkの対象ではないため、マージ後に改めて/release-checkを行う必要はない)。architecture.mdを持たないアプリ(単一spec)ではこのStepは不要。

# 完了時の次ステップ案内

- 問題なし+今回のリリースがDB保存に関わる変更(Supabaseへの書き込み処理・テーブル/カラムの追加や変更) → 続けて[/data-check](../data-check/SKILL.md)を実施し、初回データが正しく入っているかを確認する
- 問題なし(DB保存に関わらない変更) → 機能のリリース完了。次の機能は[/requirement](../requirement/SKILL.md)または[/fix](../fix/SKILL.md)から
- 本番で問題を発見 → [/fix](../fix/SKILL.md)で修正フローへ(再現テストから始める)

いずれの場合も、この機能に関する一連の作業は完了している(mainにマージ・ブランチも掃除済み)ため、ここでcompactや新しいセッションへの切り替えを行っても支障はない。/data-checkに続ける場合は、新しいセッションの名称と次のセッションにそのまま貼り付けられるプロンプトを、1行目=名称・2行目=プロンプトの単一のコードブロックとして毎回提示してから終える(名称とプロンプトを分けて提示しない。「セッションを閉じても大丈夫」とだけ述べて済ませない。名称は前のセッションと同じ<アプリ名>に次工程名を()で添えた形。1行目の例: `<アプリ名>(データ確認)` / 2行目の例: `/data-check を実行してください。対象は <アプリ名>の<テーブル名>です。`)。