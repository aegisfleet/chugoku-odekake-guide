# ポちの中国地方おでかけガイド

広島を中心に、中国地方5県（鳥取・島根・岡山・広島・山口）のおでかけ情報を紹介するガイドサイトです。

公開URL: https://aegisfleet.github.io/chugoku-odekake-guide/

## このサイトについて

- 情報源は Instagram / Threads の投稿です。**写真は転載せず**、出典の投稿へのリンク（URL）で紹介します。
- 店舗・施設の詳細（住所・営業時間など）はサイト側に保持せず、**Googleマップへのリンク**に寄せています。
- 追加は **1日1件** ずつです。
- 情報の収集と記事の作成は **AIが行っていることを明示** しています。誤情報の検出は別の仕組みで扱います。
- 対象ジャンル（大分類）は次の5つで固定です。細かい分類はタグで扱い、大分類は増やしません。
  - `shop` お店 / `spot` 観光スポット / `event` イベント / `stay` 温泉・宿泊 / `activity` 体験・おでかけ

## データ形式（案D: YAML直接描画）

- 正本は `data/places/<slug>.yaml`（1件1ファイル）。詳しくは [docs/data-format.md](docs/data-format.md)。
- Markdownへの変換はしません。HugoのテンプレートがYAMLを直接読み、一覧・詳細ページを描画します。
  - 一覧: `layouts/index.html` が `hugo.Data.places` を描画
  - 詳細: `content/_content.gotmpl`（content adapter）がYAML 1件ごとに `/places/<slug>/` を生成
- 装飾はデータに書きません。構造は `layouts/`、見た目は `static/css/style.css`、ジャンル→色の対応表は `hugo.toml` の `[params]` が持ちます。
- トップページと同じ内容のJSONを `/index.json` でも配信します。

## 1件追加する手順

1. `data/places/<slug>.yaml` を新規作成する（スキーマは docs/data-format.md）。
2. 検証ゲートを通す: 投稿のエリア／住所ヒントとGoogleマップの店舗情報を照合し、同名・別支店でないこと、閉店でないことを確認する。
3. `hugo --minify` でビルドが通ることを確認してコミットする。GitHub Pagesへは自動デプロイされる。

## ローカルビルド

Hugo extended が必要です（検証済みバージョン: 0.167.0）。

```bash
hugo server   # 開発用サーバー
hugo --minify # 本番ビルド（public/ に出力）
```
