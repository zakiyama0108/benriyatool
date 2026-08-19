# board-game-rules デザインシステム(Analog Hearth)

このファイルは board-game-rules(ボドゲのトリセツ)アプリの **per-app デザインシステムの唯一の真実の源**である。デザイントークン(配色・フォント・角丸・階層表現)と共通chromeのルールをここに一元管理する。各機能の `design.md` はトークン値を書き写さず、このファイルを参照する。

> 対象アプリ: `/board-game-rules` / 由来: Google Stitch プロジェクト「ボドゲのトリセツ 登録依頼フォーム」(project ID `10756296516233709248`、デザインシステム名 **Analog Hearth**)。方向性は「温かみのあるアナログ感」(MUJI風)。
> このファイルの位置づけ・運用ルールは [architecture.md](architecture.md) の機能マップ `design-system` 行、および [design-system/requirements.md](design-system/requirements.md) を参照。

## 1. デザイントークン(Analog Hearth)

### 配色
トークンの**実体**は [app/globals.css](../../app/globals.css) の `@theme`(`--color-bgr-*`)にある。Tailwind では `bgr-*` ユーティリティ(例: `bg-bgr-bg`, `text-bgr-heading`)として使う。下表はその実体を転記したものである(食い違ったときの扱いは「4. 真実の源の優先順位」を参照)。

| トークン(Tailwind) | 16進値 | 用途 |
|---|---|---|
| `bgr-bg` | `#F7F3EA` | 背景(生成り) |
| `bgr-card` | `#EFE7D6` | カード背景 |
| `bgr-line` | `#DCD0B4` | 縁線(1px罫線・境界) |
| `bgr-heading` | `#43392E` | 見出し・線(チャコールブラウン) |
| `bgr-subtext` | `#6B5F4F` | サブテキスト |
| `bgr-primary` | `#6E7C58` | アクセント1(モスグリーン/主要操作) |
| `bgr-primary-active` | `#556246` | アクセント1の押下・濃色 |
| `bgr-accent` | `#B96B3E` | アクセント2(テラコッタ/控えめな強調) |

### フォント
- 見出し: `font-heading`(実体 `--font-heading` = Plus Jakarta Sans、日本語は丸ゴシック(Hiragino Maru Gothic ProN 等)優先フォールバック)
- 本文: `font-body`(実体 `--font-body` = Work Sans、日本語は丸ゴシック優先フォールバック)
- フォント変数は `next/font/google` が各ページのラッパー要素に設定する。詳細は [app/globals.css](../../app/globals.css) を参照。

### 角丸
CSS変数ではなく Tailwind ユーティリティとして各画面で使う(現状 globals.css に角丸トークン変数はない。今後CSS変数化するかは別途判断)。
- 標準UI: 8px(`rounded-lg`)
- 大コンテナ: 16px(`rounded-2xl`)
- チップ: 4px(`rounded`)

### 階層表現(重要)
- **影を使わず、トーン差 + 1px罫線(`bgr-line`)で階層を表現する**(MUJI的な平面性)。
- **唯一の例外**: 登録依頼画面のアップロード写真サムネイル(ポラロイド風表現)にのみ、意図的に軽い影を用いる(「温かみのあるアナログ感」を強める狙い。[game-registration/design.md](game-registration/design.md) 参照)。

### アクセシビリティ
- 文字と背景のコントラストは WCAG AA。淡色背景上のテキスト・罫線は `bgr-heading`(#43392E)・濃モスグリーン `bgr-primary-active`(#556246)を用いる。

## 2. 共通chromeルール

「chrome」= 全画面共通の枠(ナビ等)。次のとおり、**chromeはコード側の共通コンポーネントを真実の源**とし、Stitch生成のたびに描き直さない([PR #207](https://github.com/zakiyama0108/benriyatool/pull/207)の運用ルール)。

- **左サイドバー共通ナビ**が chrome の中心。コード側 [app/board-game-rules/components/BoardGameNav.tsx](../../app/board-game-rules/components/BoardGameNav.tsx) が真実の源で、全画面で再利用する。Stitch の chrome は見た目を決めるための参考であって、ピクセル一致は目指さない。
- ナビはロゴ(汎用モチーフのミープルマーク)+ サービス名「ボドゲのトリセツ」+ 実装済み画面へのリンク(一覧・登録依頼・お気に入り)+ 運営者ログイン時のみ表示する管理画面リンク(`components/AdminNavLink.tsx`。[admin/design.md](admin/design.md)「共通ナビに管理画面への導線を表示する処理」)。モバイル(md未満)では隠す。
- **トークンはアプリ単位で1デザインシステム**(この Analog Hearth)。サイト共通で1つにはしない(アプリごとに chrome・配色が異なるため)。Stitch での画面生成時は board-game-rules のデザインシステム id を毎回渡す(「5. Stitch連携」参照)。
- 共通部品の見た目は [app/board-game-rules/styleguide/](../../app/board-game-rules/styleguide/) の styleguide ページ(+ 同居 `styleguide.png`)で一覧確認する。共通部品を変更したら同じコミットで `styleguide.png` を撮り直す。

## 3. 共通部品(コード側が真実の源)

| 部品 | 実体 | 備考 |
|---|---|---|
| 共通ナビ | [components/BoardGameNav.tsx](../../app/board-game-rules/components/BoardGameNav.tsx) | 左サイドバー。`active` で現在地をハイライト。運営者ログイン時のみ末尾に管理画面リンク(`AdminNavLink`)を出す |
| 管理画面導線 | [components/AdminNavLink.tsx](../../app/board-game-rules/components/AdminNavLink.tsx) | 共通ナビ内の運営者専用リンク。未ログイン・非運営者では非表示(null) |
| お気に入りトグル | [components/FavoriteButton.tsx](../../app/board-game-rules/components/FavoriteButton.tsx) | 未ログインでは非表示(null) |
| ログイン導線 | [components/LoginStatus.tsx](../../app/board-game-rules/components/LoginStatus.tsx) | 「5. 既知の不整合」を参照 |
| 写真アップロード | [components/PhotoUploader.tsx](../../app/board-game-rules/components/PhotoUploader.tsx) | ポラロイド風サムネイル(影の例外) |

ボタン・カード・パンくずは独立コンポーネントを持たず、各画面で `bgr-*` トークン + 上記角丸/階層ルールを適用したマークアップとして表現する(styleguide ページに代表見本を載せる)。

## 4. 真実の源の優先順位
- トークンの値が本ファイルとコード([app/globals.css](../../app/globals.css))で食い違った場合、**コードの実装値を正**とし、本ファイルを実装に合わせて直す(利用者に実際に届くのはコードの値であるため)。
- ただし両者は常に一致させる運用を前提とする。トークンを変える場合は globals.css と本ファイルを同じコミットで更新する。

## 5. 既知の不整合(別途対応)
- **`LoginStatus.tsx` が Analog Hearth トークン(`bgr-*`)を使わず、Tailwind の `gray-*`/`emerald-*` を直書きしている**(register 画面で使用中)。デザインシステムの本旨からはトークン化すべきだが、design-system 立ち上げ(基盤整備)のスコープ「既存画面の見た目を変えない」を優先し、**今回は変更しない**(2026-08-16 に別途対応で合意、PR #211)。将来、別の fix / spec で `bgr-*` に揃える。

## 6. Stitch連携(DESIGN.md一元管理の検証)
本ファイルの内容を Stitch にも反映し、リポジトリと Stitch 側を同内容(Analog Hearth)で同居させる運用を検証する(A工程=全アプリ恒久化の判断材料)。手順は [design-system/design.md](design-system/design.md)「DESIGN.mdをStitchに反映する手順(検証)」を参照。

### 検証結果(2026-08-16 実施 — A工程の判断材料)
Stitch の board-game-rules プロジェクト(`10756296516233709248`)を `list_design_systems` で確認したところ、以下が判明した。

- **Stitch には既に「Analog Hearth」デザインシステムが存在**し、内部に Stitch 独自フォーマットの `designMd` を保持している。asset 名は `assets/4c563e385f3f480d813033cba0bd22b7`(以後の画面生成で `designSystem` として渡せばトークンが揃う)。
- **フォーマットが本ファイルと別物**: Stitch の `designMd` は **YAML frontmatter**(`colors` が Material Design 風トークン `surface`/`primary`/`on-primary`/`primary-container`… 、`typography` スケール、`rounded`、`spacing`)+ 英語の散文で構成される。本ファイルは人間可読の解説で、トークンは Tailwind の `bgr-*` 名。**同じ1ファイルを素のまま両方で使う「同居」はこの表現差により成立しない。**
- **利点**: 見た目(配色・フォント・角丸・階層方針=影なし+1px罫線)は Stitch 側 Analog Hearth と本ファイルで一致しており、画面生成時に上記 asset を渡せばトークンはぶれない。chrome はコード側([BoardGameNav.tsx](../../app/board-game-rules/components/BoardGameNav.tsx))が真実の源のまま。
- **難点(A工程への提言)**: 「DESIGN.md 一元管理」を *1ファイルで Stitch・リポジトリ両対応* とするのはフォーマット差により難しい。現実的には「リポジトリ DESIGN.md(人間・実装向け)」と「Stitch `designMd`(生成エンジン向け Material トークン YAML)」の**2表現を、トークン値を一致させて維持**する運用になる。素の `upload_design_md` による一元化を全アプリ恒久ルールにするのは推奨しない(変換ステップor二重維持が前提になる)。
- 今回、既に確定済みの Stitch デザインシステムを壊さないため、`upload_design_md`→`create_design_system_from_design_md` による実験的デザインシステムの**追加生成は行っていない**(必要なら別途、Stitch フォーマットへ変換した内容で試行可能)。
