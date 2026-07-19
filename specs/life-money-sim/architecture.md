# アーキテクチャ: life-money-sim

## 1. 概要
毎月の収支から余剰資金を算出し、開始資産額に積み上げて将来の資産推移を月単位でシミュレーションするツール。貯蓄のみ/資産運用(複利)の切り替えができる。URL: `/life-money-sim`

## 2. アーキテクチャの目的
- 収支計算(monthly-balance)と資産推移計算(asset-projection)を分離し、それぞれ単体でテストしやすくする
- 保存・管理画面は`ikukyu`アプリで確立済みの構成(anonキーでのINSERT専用+管理者のみRLSでSELECT)をそのまま踏襲し、新たな認証・DB設計のレビューコストをかけない

## 3. 設計方針
- 収支(収入・個人支出・家計支出)の計算関数と、資産推移(月次積み上げ・複利計算)の計算関数を分離する([monthly-balance](monthly-balance/requirements.md), [asset-projection](asset-projection/requirements.md))
- 計算結果の保存は分析用途のベストエフォート処理とし、保存の成否が画面上の計算結果表示をブロックしないようにする(`ikukyu/save-result`と同じ方針)

## 4. システム構成図
```mermaid
flowchart TD
    user["一般ユーザーのブラウザ"]
    operator["運営者のブラウザ"]
    cf["Cloudflare Workers(静的配信)"]
    simulator["/life-money-sim<br>収支計算・資産推移シミュレーション・保存"]
    adminPage["/life-money-sim/admin<br>保存データの閲覧(要ログイン)"]
    db[("Supabase<br>life_money_sim_resultsテーブル")]
    auth["Supabase Auth<br>(Google OIDC)"]

    user -->|ページ取得| cf
    operator -->|ページ取得| cf
    cf --> simulator
    cf --> adminPage
    simulator -->|計算結果を保存 - anonキーでINSERTのみ| db
    adminPage -->|Googleでログイン| auth
    adminPage -->|許可された運営者のみ閲覧 - RLSでSELECT| db
```

この図の正となる文章は下記「[5. アーキテクチャ概要](#5-アーキテクチャ概要)」と各specの設計書。このアプリから見た構成のみを描いており、プロジェクト共通インフラの詳細は[docs/architecture/](../../docs/architecture/infrastructure.md)を参照。

## 5. アーキテクチャ概要
Next.jsの静的エクスポートをCloudflare Workersで配信しており、サーバー処理は持たない。収支計算・資産推移計算はブラウザ内で完結し、入力内容と計算結果はブラウザから直接Supabaseの`life_money_sim_results`テーブルにINSERTする。管理画面は`ikukyu/admin`と同じくGoogle OIDCでログインした運営者のみがRLS経由で閲覧できる。

## 6. 採用技術
| 技術 | 用途 |
|---|---|
| Next.js(静的エクスポート) | `/life-money-sim`画面の描画 |
| Supabase | 計算結果の保存(`life_money_sim_results`テーブル) |
| Tailwind CSS | スタイリング |

選定理由はプロジェクト横断のため[関連ADR](#11-関連adr)を参照。

## 7. 機能マップ
| spec | 役割 | 依存 |
|---|---|---|
| [monthly-balance](monthly-balance/requirements.md) | 収入・支出を入力し、月次余剰資金を計算する | - |
| [asset-projection](asset-projection/requirements.md) | 開始資産額と月次余剰資金を積み上げ、資産推移を月単位でシミュレーションする | monthly-balanceの月次余剰資金を受け取る([monthly-balance/requirements.md#余剰資金の計算-1](monthly-balance/requirements.md)) |
| [save-result](save-result/requirements.md) | 入力・計算結果をDBに保存する | monthly-balance・asset-projectionの入力/結果を受け取る([monthly-balance/requirements.md#余剰資金の計算-1](monthly-balance/requirements.md), [asset-projection/requirements.md#前提入力-1](asset-projection/requirements.md)) |
| [admin](admin/requirements.md) | 保存データを運営者本人だけがログインして一覧・集計で閲覧する管理画面 | save-resultが保存した内容を表示([save-result/requirements.md#機能要件-1](save-result/requirements.md)) |

## 8. コンポーネント図
```mermaid
flowchart LR
    balanceCalc["月次収支計算<br>(monthly-balance)"]
    projectionCalc["資産推移計算<br>(asset-projection)"]
    screen["シミュレーター画面<br>(monthly-balance, asset-projection)"]
    save["計算結果の保存処理<br>(save-result)"]
    adminScreen["管理画面<br>(admin)"]
    client["共通のSupabase接続<br>(app/lib)"]

    screen -->|収支計算を実行| balanceCalc
    screen -->|資産推移計算を実行| projectionCalc
    projectionCalc -->|月次余剰資金を利用| balanceCalc
    screen -->|保存を呼ぶ| save
    save -->|保存に利用| client
    adminScreen -->|取得・認証に利用| client
```

この図の正となる文章は「[7. 機能マップ](#7-機能マップ)」の依存列と、各specのrequirements.mdの依存関係。

## 9. ディレクトリ構成
CLAUDE.mdの一般規約(`components/`,`lib/`)通りで、逸脱なし。

## 10. 外部サービス
| サービス | 用途 |
|---|---|
| Supabase(`life_money_sim_results`テーブル) | 計算結果の保存・分析用データの蓄積 |
| Supabase Auth(Google OIDC) | 管理画面(admin)の運営者ログイン(`ikukyu/admin`と同じアカウントを使用) |

閲覧権限の判定に使う許可リスト(`admin_emails`)は新設せず、`ikukyu`アプリで作成済みのテーブルを共用する(このアプリのテーブルは`life_money_sim_results`の1つのみのため、アプリ単体のER図は作成しない。カラム定義は[save-result/design.md#データベース設計](save-result/design.md#データベース設計)を参照)。

## 11. 関連ADR
- [0001-user-input-database.md](../../docs/adr/0001-user-input-database.md) — 計算結果保存のDB選定(Supabase採用)
- [0006-admin-screen-oidc-rls.md](../../docs/adr/0006-admin-screen-oidc-rls.md) — 管理画面(admin)の認証(Google OIDC)とDB読み取り(RLS)方針

## 12. セキュリティ
入力される収入・支出額・資産額・家族の生年月などは機微な情報になり得るため、URLパラメータに含めずSupabaseへの直接POSTのみで扱う。`anon`キー(一般ユーザー)は`life_money_sim_results`へのINSERT専用で、SELECT/UPDATEはできない。閲覧は管理画面(admin)からのみ可能で、Supabase Authでログインした運営者本人だけが、RLSポリシーで許可されて`life_money_sim_results`をSELECTできる(認証・RLSの方針は[関連ADR](#11-関連adr)の0006)。

## 13. 技術的制約
特になし(法令・制度に基づく計算ルールはなく、汎用的な収支・資産計算のみを扱う)。

## 14. 用語集
| 用語 | 説明 |
|---|---|
| 差引後余剰 | 月次余剰資金(賞与抜き)に当月の賞与を加え、当月のイベント支出を差し引いた金額。資産推移の月次積み上げ額 |
| 貯蓄のみモード | 運用による増減を考慮せず、元本と余剰資金の積み上げのみで資産推移を計算する表示モード |
| 資産運用モード | 設定した想定利回り(年率)で複利運用した場合の資産推移を計算する表示モード |
