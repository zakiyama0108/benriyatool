# 設計: ボードゲームの新規登録(写真からのルール生成)

DB/anonキー方針は[ADR-0001](../../../docs/adr/0001-user-input-database.md)にあるため重複させず、本specでは「写真+分類情報の依頼送信→保存→運営者への通知」という処理フローと、依頼の保存構造を書く。**LLM解析はこのWebアプリ(Cloudflare Workers)上では一切行わない**(方針転換の経緯: `/consult`で、匿名投稿からのライブLLM解析は費用が発生し続けるため撤廃し、運営者がローカルツールでまとめて登録する方式に変更した)。運営者による実際の登録処理は[admin/design.md](../admin/design.md)を参照。

## 処理フロー

```mermaid
sequenceDiagram
    actor poster as 投稿者(未ログイン可)
    participant screen as 登録依頼画面(ブラウザ)
    participant storage as Supabase Storage(非公開)
    participant db as Supabase(board_game_rules_game_requests)
    participant notify as ntfy(運営者への通知)

    poster ->> screen: ルールブックの写真を複数枚アップロード(必須)
    poster ->> screen: 分かる範囲の分類情報を入力(すべて任意)
    poster ->> screen: 送信
    screen ->> storage: 写真を非公開バケットに保存
    screen ->> db: 依頼(写真パス+分類情報)をINSERT(anon可)
    db -->> notify: INSERTをトリガーにWebhookで通知
    alt 成功
        db -->> screen: 完了
        screen ->> screen: 「受け付けました。運営者確認後に追加されます」の表示
    else 失敗
        db -->> screen: エラー
        screen ->> screen: 失敗表示(再送できる)
    end
```

### 依頼を送信する処理
- 対象: 登録依頼画面で入力された写真・分類情報
- 手順:
  1. 投稿者が写真を複数枚(表紙・目次・各ページなど)選択する。最低1枚は必須(requirements.md#写真のアップロード-1)
  2. 分類情報(ゲーム名・対応人数・プレイ時間・ジャンル・対象年齢・難易度・メーカー・作者・言語依存度・受賞歴・発売年)を任意で入力する。ジャンルは固定の選択肢(下記「ジャンルの選択肢」)から複数選べる(requirements.md#分類情報の任意入力-4)
  3. 送信操作で、まず写真を非公開Storageバケットへ保存し、パスを控える(既存の[admin/design.md#元写真の非公開Storage](../admin/design.md)のバケットをそのまま使う)
  4. 続けて、写真パス+入力済み分類情報を`board_game_rules_game_requests`にINSERTする(未ログインでも送信できる。requirements.md#依頼の送信-5)
  5. 保存が成功したら、完了表示に切り替える(requirements.md#依頼の送信-6)。この時点ではゲームは一覧・検索の対象にならない(公開は運営者の登録作業を経てから。requirements.md#公開ポリシー-5)
  6. 写真保存またはDB保存に失敗した場合は、入力内容を保持したまま失敗表示をし、再送できるようにする(requirements.md#依頼の送信-7)
- 関連するビジネスルール: requirements.md#写真のアップロード、requirements.md#分類情報の任意入力、requirements.md#依頼の送信

### 運営者へ通知する処理
- 対象: `board_game_rules_game_requests`への新規INSERT
- 手順: Supabase Database WebhooksでINSERTイベントを購読し、ntfyの**Message Templating機能**(インラインテンプレート`?tpl=yes`)を使って、届いた行のJSONペイロードからタイトル・本文・クリックURLを組み立ててHTTP POSTする(既存のClaude Codeセッション通知と同じntfy運用を流用。requirements.md#運営者への通知-8)
- 補足(通知の中身): タイトルは「新しい登録依頼」、本文はゲーム名(入力があれば)と写真枚数、クリックURLは管理画面(`/board-game-rules/admin`)への直リンクとする。中継サーバーは新設せず、Supabase Database Webhooksの送信先URLにntfyのテンプレート構文(Goテンプレート、`{{.record.xxx}}`でペイロードのフィールドを参照)を組み込むだけで実現する(ntfy公式のテンプレート機能。詳細は[tasks.md](tasks.md)の手動設定手順で確定する)
- 補足(トピック名の秘匿): ntfyのトピック名は非公開情報として扱い、マイグレーションSQLに平文で残さない(下記セキュリティ参照)
- 関連するビジネスルール: requirements.md#運営者への通知-8

## ジャンルの選択肢
一覧の絞り込み([game-list/design.md](../game-list/design.md))で選択肢を安定させるため、ジャンルは自由記述ではなく固定リストとし、**1ゲームにつき複数選択できる**(requirements.md#分類情報の任意入力-4)。選択画面(依頼フォーム・admin編集フォーム)では、各選択肢の横に説明を表示する。

投稿者が依頼フォームで選ぶジャンルはあくまで参考情報であり、最終的な値は運営者のローカル登録ツール(下記「登録依頼からゲームを登録するローカルツール」、[admin/design.md](../admin/design.md))が写真・ルール内容を踏まえてAI自身で判断し、投稿者の選択を鵜呑みにせず当てはまるジャンルを追加・修正できる。そのため選択肢数を絞る必要がなく、認知度の高いジャンルを広めに用意する(2026-08、ユーザーとの議論での判断。「選択肢が多いと投稿者が悩んで正確に選べない」という懸念は、AIが最終判断を担うことで実害にならないと整理した)。

| ジャンル | 説明 |
|---|---|
| 協力 | プレイヤー全員がチームとなり、共通の目標達成を目指す |
| 対戦 | プレイヤー同士が競い合い、勝敗を決める |
| 正体隠匿 | 自分の役職・陣営を隠しながら、味方を探したり相手を見破ったりする(人狼系) |
| 戦略 | 運要素が少なく、長期的な計画・判断力が問われる重量級のゲーム |
| パーティー | 大人数でわいわい盛り上がる、ルールが簡単なゲーム |
| ファミリー | 子供から大人まで気軽に遊べる、軽いルールのゲーム |
| カードゲーム | カードを中心に進行するゲーム |
| すごろく系 | サイコロを振ってマスを進み、指示に従って進行する(人生ゲーム的) |
| ワーカープレイスメント | 手持ちのコマをマスに配置してアクションを実行する |
| デッキ構築 | プレイしながら自分のカード山を強化していく |
| 推理・デダクション | 手がかりから答えを論理的に導き出す |
| 拡大再生産 | 資源を投資して資産をどんどん増やしていく |
| 陣取り・エリアマジョリティ | ボード上のエリアを取り合う |
| タイル配置 | タイルを場に並べて盤面を作っていく |
| ドラフト | 手元に回ってきたカードやタイルから選び取る |
| セットコレクション | 特定の組み合わせを集めて得点する |
| ハンドマネージメント | 手札をやりくりして最適なプレイを選ぶ |
| 競り・オークション | 品物を巡って入札し合う |
| ベッティング・予想 | 結果を予想して賭ける |
| トリックテイキング | 手札を出し合って勝敗を競うカード技法 |
| ダイスロール | サイコロの出目でゲームが進行する |
| ブラフ・心理戦 | 嘘や駆け引きで相手を欺く |
| アブストラクト | 運要素なしの純粋な実力勝負 |
| アクション | バランス・スピードなど身体動作を伴う |
| 表現・言葉遊び | お題を言葉や絵で伝える(ジェスチャー・お絵描き系) |
| レガシー | キャンペーン形式でシナリオが進行・変化していく |
| ウォーゲーム | 戦争・軍事をテーマにした重量級ゲーム |
| その他 | 上記に当てはまらないゲーム |

この一覧(値+説明)は`app/board-game-rules/lib/genres.ts`(新規)に定義し、依頼フォーム・game-list絞り込み・admin編集フォームで共有する。DB側もCHECK制約でこの一覧の値のみで構成されることを担保する(下記データベース設計)。

## バリデーション
- 写真: 最低1枚必須(requirements.md#写真のアップロード-1)、上限20枚(匿名アップロードの量的制約。[admin/design.md#元写真の非公開Storage](../admin/design.md)参照)
- 対応人数・プレイ時間: 入力する場合、下限≤上限であること(下限>上限は送信不可。requirements.md#入力値の制約-9)。DB側でもCHECK制約で担保する(ただしどちらも未入力の場合はCHECKをスキップする。片方のみ入力は許容しない=両方揃うか両方空欄かのどちらか)
- ジャンル: 選択する場合、上記固定リストの値のみで構成されること(0個・複数選択のいずれも可)

## 元写真のStorage
依頼の写真は[admin/design.md#元写真の非公開Storage](../admin/design.md)で定義済みの非公開バケット(`board-game-rules-photos`)にそのまま保存する。運営者が登録時に使う元写真もこのバケットを共有する(依頼時の写真パスをそのまま`board_game_rules_games.photo_paths`へ引き継ぐ想定。運営者側の登録処理で別の写真に差し替えることもできる)。

## エラーハンドリング
- 依頼送信(写真保存・DB保存)の失敗は、投稿者が明示的に指示した操作の失敗のため、画面に失敗が分かる定型表示をする。入力内容は保持し、やり直せるようにする
- 送信中は送信操作を無効化し、二重送信を防ぐ

## 画面設計(登録依頼フォームのUI)

登録依頼画面(`/board-game-rules/register`)の見た目・操作を、Step0で確定したビジュアルデザインに沿って定める。上記の処理フロー・ロジックは変えず、レイアウト・配色・ジャンル選択のインタラクションを刷新する(実装済みの素朴版UIからの作り替え。PR #181でStep0が抜けていた分の後追い)。

**確定デザインの出所**: Google Stitchプロジェクト「ボドゲのトリセツ 登録依頼フォーム」(project ID `10756296516233709248`、デザインシステム「Analog Hearth」)。ナビゲーションは同プロジェクトの画面「登録依頼フォーム (共通ナビ適用)」を参照デザインとする。生成HTML(Tailwind)を実装の参照素材とする。方向性は「温かみのあるアナログ感」(MUJI風)、サービス名は「ボドゲのトリセツ」。この配色・雰囲気はboard-game-rulesアプリの視覚言語として他画面にも展開する(まずは本画面で確定し、[favorite/design.md](../favorite/design.md)の左サイドバー共通ナビと揃える)。

### デザイントークン(Analog Hearth)
| 用途 | 色 |
|---|---|
| 背景(生成り) | #F7F3EA |
| カード背景 | #EFE7D6 |
| 縁線 | #DCD0B4 |
| 見出し・線(チャコールブラウン) | #43392E |
| サブテキスト | #6B5F4F |
| アクセント1(モスグリーン/主要操作) | #6E7C58(押下・濃 #556246) |
| アクセント2(テラコッタ/控えめな強調) | #B96B3E |

- フォント: 見出し Plus Jakarta Sans / 本文 Work Sans、日本語は丸ゴシック(Hiragino Maru Gothic ProN 等)優先フォールバック
- 角丸: 標準UI 8px / 大コンテナ 16px / チップ 4px
- 影は使わず、トーン差 + 1px罫線(#DCD0B4)で階層を表現(MUJI的な平面性)。ただしアップロード写真のサムネイルのみ、後述のポラロイド風表現のため意図的に軽い影を用いる例外とする(「温かみのあるアナログ感」を強める狙い)
- アクセシビリティ: 文字と背景のコントラストはWCAG AA。淡色背景上のテキスト・罫線はチャコールブラウン(#43392E)・濃モスグリーン(#556246)を用いる

### ナビゲーション(左サイドバー共通ナビ)
board-game-rulesアプリ全体で共有する左サイドバー(`components/BoardGameNav.tsx`)を本画面にも適用する([favorite/design.md](../favorite/design.md)「お気に入り一覧画面」で確定した共通ナビと同一)。
- **ブランディングブロック**: 上部にサービスの抽象ロゴ+「ボドゲのトリセツ」+サブテキスト「アナログゲームガイド」。ロゴはボードゲームの汎用モチーフ(駒/ミープルのシルエット)で、囲碁・将棋等の特定ゲームを連想させない
- **ナビゲーションリンク**: Stitch参照デザインではHome/Search/Add Game/お気に入り/Profileの5項目だが、遷移先画面が実装済みなのは「登録依頼(Add Game)」と「お気に入り」の2つのみ(game-list/game-detail/Profile等はまだ仕様のみで未実装)。存在しないURLへのリンクは404になるため、実装済みの2項目のみをリンクとして並べ、本画面(登録依頼)を選択中(`aria-current="page"`)でハイライトする。残りの項目は対応画面の実装時に追加する
- **モバイル(md未満)**: サイドバーは隠し、本文を優先する(favoriteと同方針)
- **パンくず**: 本文上部に「べんりやつーる › ボドゲのトリセツ › 登録依頼」を置く(ボドゲのトリセツのトップはgame-list未実装のため非リンク)
- **任意ログインの状態表示**: 既存の`LoginStatus`を本文エリア上部(右寄せ)に置く。共通ナビ自体はログイン状態に依存しない実装済み画面リンクのみで構成し、ログイン導線は各画面本文が持つ既存方針を踏襲する

### 表示項目・操作(上から)
- **写真アップロード(主役)**: 画面最上部に大きく配置。ドラッグ&ドロップ+クリック選択、「ルールブックの全ページを推奨」の補足、選択枚数(例 3/20枚)とサムネイル一覧・削除。必須(1枚以上)。選択済みサムネイルは**ポラロイド写真風**(白フチ・下側を厚めに・軽い影・1枚ずつわずかに傾ける)で見せ、アナログ感を演出する(ホバーで傾きを戻す)
- **基本情報**: ゲーム名 / 対応人数(下限〜上限)/ プレイ時間(分、下限〜上限)。下限>上限のときインラインでエラー表示
- **ジャンル・メカニクス(アコーディオン折りたたみ)**: 既定は閉じた1行。開くと固定リスト(28種、`lib/genres.ts`)をチップで複数選択できる。**各ジャンルの説明文は、選択したチップの直下にだけ表示する**(全項目に常時表示しない=情報過多を避ける)
- **詳細情報(軽い区切り)**: 対象年齢 / 難易度 / メーカー・出版社 / 作者 / 言語依存度(わからない・日本語ルールあり・なし)/ 受賞歴 / 発売年。いずれも任意で、セクション見出しと淡い区切りのみでまとめる
- **送信ボタン**: モスグリーンの主要ボタン。写真未選択・範囲エラー・送信中は無効化(二重送信防止)
- **完了状態**: 送信成功で「受け付けました。運営者確認後に追加されます」の完了表示へ画面全体を切り替える(チェックのアイコン+ねぎらいの一文)
- **失敗状態**: 送信失敗時は入力を保持したまま失敗表示、再送できる

### 状態遷移図
```mermaid
stateDiagram-v2
    [*] --> 入力中
    入力中 --> 送信中: 送信(写真あり・範囲エラーなし)
    送信中 --> 完了: 写真保存+INSERT成功
    送信中 --> 失敗: いずれか失敗
    失敗 --> 送信中: 再送
    完了 --> [*]
```
図は俯瞰用の補助で、正は上記「表示項目・操作」の記述(状態管理は既存の`status`: idle/submitting/success/error を流用)。

### レスポンシブ
- モバイル(1カラム)を基本に、デスクトップは読みやすい単一カラム幅(最大720px前後)で中央寄せ。基本情報の下限〜上限は横並び、狭幅では折り返す

現行の素朴版UI(灰色ベース・ジャンル常時表示・説明常時表示)からの差分が今回の作り替え対象。ロジック(`createGameRequest`・バリデーション・状態遷移)は既存のまま流用する。

## 関連するファイル(抜粋)
```
app/board-game-rules/register/page.tsx (変更: 写真アップロード+分類情報の任意入力+送信のみのシンプルな画面に縮小。解析・プレビュー・確定の一連は撤廃。ナビゲーションは左サイドバー共通ナビに作り替え)
app/board-game-rules/components/BoardGameNav.tsx (新規: アプリ共通の左サイドバーナビ。register/favoritesで共有。実装済み画面のリンクのみをactiveハイライト付きで並べる)
app/board-game-rules/lib/gameRequests.ts (新規: createGameRequest。写真Storage保存+INSERT)
app/board-game-rules/lib/genres.ts (新規: ジャンルの固定選択肢定義。game-list/adminと共有)
app/board-game-rules/components/PhotoUploader.tsx (新規: 複数枚の写真選択・プレビュー)
app/lib/supabaseClient.ts (既存の共通クライアントを利用)
app/legal/page.tsx (既存: 利用規約に知的財産の条項を追記)
```

### 撤廃したもの(旧設計からの変更点)
- `worker/`配下のCloudflare Workers関数(解析関数・プロンプト定義)。写真解析用のランタイムサーバー機能は本アプリで不要になった(`wrangler.toml`の`main`/`[assets] binding`追加も不要)
- Cloudflare Turnstile(ボット対策)。依頼送信自体がLLM呼び出しを伴わないため、コスト攻撃の対象がなくなった
- `GamePreviewForm`(解析結果の確認・修正フォーム)。解析結果自体が存在しないため撤廃
- Anthropic APIキー・Wrangler Secretsの管理

## データベース設計

`board_game_rules_games`はスキーマを変更する(`is_official`列の撤廃、`release_year`列の追加、`genre`(単一)から`genres`(複数、text[])への変更)。新規に`board_game_rules_game_requests`を追加する。

### board_game_rules_game_requests(新規)
| カラム | 型 | 補足 |
|---|---|---|
| id | uuid, primary key, default gen_random_uuid() | 依頼ID |
| photo_paths | text[], not null | 非公開Storageに保存した写真のパス(1枚以上) |
| name | text, nullable | ゲーム名(任意) |
| min_players | int, nullable | 対応人数の下限(任意) |
| max_players | int, nullable | 対応人数の上限(任意) |
| min_minutes | int, nullable | プレイ時間の下限(分、任意) |
| max_minutes | int, nullable | プレイ時間の上限(分、任意) |
| genres | text[], not null, default '{}' | ジャンル(複数選択可、任意。固定リストの値のみで構成) |
| min_age | int, nullable | 対象年齢(任意) |
| difficulty | text, nullable | 難易度(任意) |
| publisher | text, nullable | メーカー/出版社(任意) |
| author | text, nullable | 作者(任意) |
| has_japanese_rules | boolean, nullable | 言語依存度(任意) |
| awards | text, nullable | 受賞歴(任意) |
| release_year | int, nullable | 発売年(任意) |
| created_at | timestamptz, not null, default now() | 依頼日時 |
| processed_at | timestamptz, nullable | 運営者が登録処理を終えた日時。NULLは未処理([admin/design.md](../admin/design.md)の一覧で区別) |

- 匿名投稿のため`auth.users`とのリレーションは持たない(reportsと同様)

### board_game_rules_games(変更)
- `is_official`列を撤廃する(全ゲームが運営者経由でのみ登録される前提になり、区別の意味がなくなったため)
- `release_year int`列を追加する(発売年、任意)
- `genre text`(単一)を`genres text[]`(複数)に変更し、CHECK制約で固定リストの値のみで構成されることを担保する
- INSERTポリシーを撤廃し、運営者のローカル登録ツール(service_role相当の権限)のみが書き込める形にする(下記マイグレーション参照。Web側からの直接INSERT経路はなくなった)

### マイグレーション(実装より先に単独PRで適用)
```sql
-- board_game_rules_games テーブルの新設(is_officialを持たず、release_yearを持ち、
-- genresは複数選択可能な固定リスト(text[])に限定する)
create table board_game_rules_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_players int not null,
  max_players int not null,
  min_minutes int not null,
  max_minutes int not null,
  genres text[] not null default '{}' check (genres <@ array[
    '協力', '対戦', '正体隠匿', '戦略', 'パーティー', 'ファミリー', 'カードゲーム', 'すごろく系',
    'ワーカープレイスメント', 'デッキ構築', '推理・デダクション', '拡大再生産', '陣取り・エリアマジョリティ',
    'タイル配置', 'ドラフト', 'セットコレクション', 'ハンドマネージメント', '競り・オークション',
    'ベッティング・予想', 'トリックテイキング', 'ダイスロール', 'ブラフ・心理戦', 'アブストラクト',
    'アクション', '表現・言葉遊び', 'レガシー', 'ウォーゲーム', 'その他'
  ]::text[]), -- <@ は「左辺の全要素が右辺の配列に含まれる」演算子。固定リスト外の値を1つでも含むと拒否される
  min_age int,
  difficulty text,
  publisher text,
  author text,
  has_japanese_rules boolean,
  awards text,
  release_year int,
  rules_simple text not null,
  rules_detailed jsonb not null,
  photo_paths text[] not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (min_players <= max_players),
  check (min_minutes <= max_minutes),
  -- ルール本文の防御上限(巨大データ投入対策)
  check (char_length(rules_simple) <= 4000),
  check (char_length(rules_detailed::text) <= 40000) -- jsonbは::text化した全体長で担保
);
alter table board_game_rules_games enable row level security;

-- 閲覧: 公開中(削除されていない)の行は誰でもSELECTできる。photo_pathsは列単位のSELECT権限から除外する
grant select (
  id, name, min_players, max_players, min_minutes, max_minutes,
  genres, min_age, difficulty, publisher, author, has_japanese_rules,
  awards, release_year, rules_simple, rules_detailed, created_at, deleted_at
) on board_game_rules_games to anon;
grant select on board_game_rules_games to authenticated;
create policy "anyone can select published games" on board_game_rules_games
  for select to anon, authenticated using (deleted_at is null);

-- 登録: anon/authenticatedからのINSERTは許可しない(利用者は依頼のみ送信でき、直接ゲームを登録できない)。
-- 書き込みは運営者のローカル登録ツール(service_role相当の権限。RLSをバイパスする)のみが行う
-- (admin/design.md「登録依頼からゲームを登録するローカルツール」参照)。INSERTポリシーは設けない

-- 管理: 運営者本人は全行SELECT(削除済み含む)・UPDATE(編集・論理削除)ができる(admin/design.md)
create policy "admin can select all games" on board_game_rules_games
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));
grant update on board_game_rules_games to authenticated;
create policy "admin can update games" on board_game_rules_games
  for update to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails))
  with check ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- benriyatool_readonly はSELECTのみ(docs/adr/0004)
grant select on board_game_rules_games to benriyatool_readonly;
create policy "benriyatool_readonly can select games" on board_game_rules_games
  for select to benriyatool_readonly using (true);

-- board_game_rules_game_requests テーブルの新設
create table board_game_rules_game_requests (
  id uuid primary key default gen_random_uuid(),
  photo_paths text[] not null,
  name text,
  min_players int,
  max_players int,
  min_minutes int,
  max_minutes int,
  genres text[] not null default '{}' check (genres <@ array[
    '協力', '対戦', '正体隠匿', '戦略', 'パーティー', 'ファミリー', 'カードゲーム', 'すごろく系',
    'ワーカープレイスメント', 'デッキ構築', '推理・デダクション', '拡大再生産', '陣取り・エリアマジョリティ',
    'タイル配置', 'ドラフト', 'セットコレクション', 'ハンドマネージメント', '競り・オークション',
    'ベッティング・予想', 'トリックテイキング', 'ダイスロール', 'ブラフ・心理戦', 'アブストラクト',
    'アクション', '表現・言葉遊び', 'レガシー', 'ウォーゲーム', 'その他'
  ]::text[]),
  min_age int,
  difficulty text,
  publisher text,
  author text,
  has_japanese_rules boolean,
  awards text,
  release_year int,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  check (min_players is null or max_players is null or min_players <= max_players),
  check (min_minutes is null or max_minutes is null or min_minutes <= max_minutes)
);
alter table board_game_rules_game_requests enable row level security;

-- 送信: 誰でも(anon含む)INSERTできる
grant insert on board_game_rules_game_requests to anon, authenticated;
create policy "anyone can insert game request" on board_game_rules_game_requests
  for insert to anon, authenticated with check (true);

-- 確認・処理済みマーク・削除: 運営者本人のみ
grant select, update, delete on board_game_rules_game_requests to authenticated;
create policy "admin can select game requests" on board_game_rules_game_requests
  for select to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));
create policy "admin can update game requests" on board_game_rules_game_requests
  for update to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails))
  with check ((auth.jwt() ->> 'email') in (select email from admin_emails));
create policy "admin can delete game requests" on board_game_rules_game_requests
  for delete to authenticated
  using ((auth.jwt() ->> 'email') in (select email from admin_emails));

-- benriyatool_readonly はSELECTのみ(docs/adr/0004)
grant select on board_game_rules_game_requests to benriyatool_readonly;
create policy "benriyatool_readonly can select game requests" on board_game_rules_game_requests
  for select to benriyatool_readonly using (true);
```

T0(マイグレーション適用)の実機確認:
- 未ログイン(anon)で依頼をINSERTできること(ジャンル複数選択・未選択どちらも成功すること)
- anon・運営者以外のログインでは依頼をSELECT/UPDATE/DELETEできないこと。運営者本人はSELECT/UPDATE/DELETEできること
- 下限>上限の依頼がCHECK制約で拒否されること(片方のみ入力・両方未入力は許容されること)
- 固定リスト外の値を含むジャンル配列がCHECK制約で拒否されること。固定リスト内の値を複数含む配列は成功すること
- anon/authenticated(運営者以外)から`board_game_rules_games`へのINSERTがすべて拒否されること(INSERTポリシーが存在しないため)。service_roleキーを使ったINSERT(ローカル登録ツール相当)は成功すること
- anon/authenticatedで`deleted_at is null`のゲームがSELECTでき、`anon`が`select photo_paths from board_game_rules_games`を発行すると権限エラーで拒否されること(列単位の秘匿)
- 固定リスト外の値を含むジャンル配列・下限>上限・簡単版4000字超/詳しい版40000字超のINSERT(service_role経由)がCHECK制約で拒否されること
- 運営者本人で全行(削除済み含む)がSELECTでき、UPDATEができること

### 運営者への通知(Supabase Database Webhooks + ntfy Message Templating)
`board_game_rules_game_requests`へのINSERTをSupabase Database Webhooks機能(ダッシュボードから設定、pg_net拡張ベース)で購読し、ntfyへHTTP POSTする。送信先URLに、ntfy公式の**インラインMessage Templating**(`?tpl=yes`、Goテンプレート構文)を組み込むことで、中継サーバーを新設せずに次を実現する:
- **タイトル**: 「新しい登録依頼」
- **本文**: ゲーム名(`{{.record.name}}`。未入力なら空欄のまま)+写真枚数(`{{len .record.photo_paths}}`)
- **クリックURL**: 管理画面(`https://benriyatool.com/board-game-rules/admin`)。通知をタップするとその場で依頼を確認できる

参考: `https://ntfy.sh/<トピック>?tpl=yes&t=<タイトル>&m=<本文テンプレート>&click=<クリックURL>`(正確なクエリパラメータ名・URLエンコードは実装時に[ntfy公式ドキュメント](https://docs.ntfy.sh/publish/)で確認する)。通知先URL(ntfyトピック)は非公開情報のため、マイグレーションSQLに平文で残さずSupabaseダッシュボードのWebhook設定画面で直接入力する(TDD対象外・手動設定。[tasks.md](tasks.md)参照)。

## セキュリティ
- **課金の発生しない設計**: このWebアプリ(Cloudflare Workers・Supabase)からはAnthropic APIを一切呼び出さない。写真解析・ルール生成は運営者のローカル環境で行う([admin/design.md](../admin/design.md))。匿名投稿による費用の無制限消費というリスク自体が構造的になくなる
- **元写真の非公開**: 依頼写真は一般公開しない。既存の非公開Storageバケットのアクセスポリシー(運営者のみSELECT、サイズ・MIME上限)をそのまま適用する([admin/design.md](../admin/design.md))
- **Storage濫用への量的制約**: 依頼送信はログイン不要なため、匿名の大量送信を防ぐボット対策(Turnstile)は設けない。量的な歯止めは既存のバケットポリシー(ファイルサイズ上限・許可MIME)に委ねる(残余リスクとして許容。急増した場合は[admin](../admin/requirements.md)で運営者が気付いて対応する)
- **games直接INSERTの禁止**: `board_game_rules_games`へのINSERTポリシーはWeb側(anon/authenticated)に一切与えない。運営者のローカル登録ツールのみがservice_role相当の権限で書き込む([admin/design.md](../admin/design.md)参照)。これにより匿名からのスパムゲーム直接登録という残余リスク(旧設計で許容していたもの)自体がなくなる
- **ntfy通知先の非公開**: 通知先URL(トピック名)はリポジトリに含めず、Supabaseダッシュボードの設定として保持する

## ログ
- 依頼送信の失敗は、原因究明のためコンソールにエラーを出す(画面には定型表示のみ)。成功時はログを出さない(通常操作のため)

## 依存関係
- 依頼を基にした登録・公開処理は[admin/design.md](../admin/design.md)(まとめて登録する処理)に委ねる
- 元写真の非公開Storageは[admin/design.md](../admin/design.md)で定義済みのものを使う
- ジャンルの固定リストは[game-list/design.md](../game-list/design.md)の絞り込みと共有する
- 登録されたゲームは[game-list](../game-list/design.md)・[game-detail](../game-detail/design.md)の対象になる
