# データ形式

## 正本

`data/places/<slug>.yaml`（1件1ファイル）が唯一の正本です。Markdownファイルは作りません。

## スキーマ

```yaml
slug: swinging-bird-kitchen        # URLになる一意なID（英小文字・数字・ハイフン）
name: Swinging Bird Kitchen        # 表示名
kind: shop                         # 大ジャンル: shop | spot | event | stay | activity のいずれか1つ
tags: [カフェ, ベーカリー]           # 細分類はタグで自由に（大ジャンルは増やさない）
area:
  prefecture: 広島県               # 鳥取県 | 島根県 | 岡山県 | 広島県 | 山口県
  label: 広島市佐伯区・井口          # 表示用のエリア表記
summary: 焼き菓子とケーキが人気のカフェ。   # 自分の言葉での紹介文（投稿文のコピーはしない）
source:
  platform: instagram              # instagram | threads
  post_url: "https://www.instagram.com/p/xxxx/"
  author: "@example"
maps_url: "https://www.google.com/maps/search/?api=1&query=..."   # Googleマップ検索リンク
featured: false                    # true のとき一覧で強調表示（意味だけ持ち、装飾はCSS側）
status: active                     # active | needs_review | closed_suspected | removed
added_at: 2026-11-13               # 追加日 (YYYY-MM-DD)

# kind: event のときだけ追加
period: { start: 2026-11-15, end: 2027-01-03 }   # 開催期間。終了後は自動で「（終了）」表示になる
```

## 詳細ページ用の追加フィールド（任意）

詳細ページを厚くするための追加情報。無い項目はセクションごと表示されません。

```yaml
official:                          # 公式情報（公式アカウントが特定できた場合）
  instagram: "@example"
  instagram_url: "https://www.instagram.com/example/"
  website: "https://example.com/"
  website_label: 公式サイト          # 例: 公式通販（BASE）

highlights: [看板メニューA, 名物B]     # 関連投稿の内容から集計した「よく紹介されるもの」

related_posts:                     # 関連投稿の一覧（詳細ページにリンク一覧として表示）
  captured_at: 2026-11-13          # いいね数などの取得日（スナップショットであることを明示）
  found_count: 50                  # 検索で確認できた関連投稿の件数（下限でよい）
  items:                           # 反応の大きい順に最大10件程度
    - { post_url: "https://www.instagram.com/p/xxxx/", author: "@user", posted_at: 2026-10-23, likes: 600, note: "何が写っているかの一言要約（自分の言葉で）" }
```

- `note` は投稿文のコピーではなく、自分の言葉での一言要約にする。
- いいね数は揮発情報なので、必ず `captured_at` とセットで持ち、表示側でも取得日を明記する。

## ルール

- **重複防止**: `source.post_url` と「店舗同一性（名称＋エリア）」が既存と重なるものは追加しない。
- **まとめ投稿**（1投稿に複数スポット）は対象外。主役が1つに絞れる場合だけ、その1件として扱う。
- **対象の線引き**: Googleマップにピンがある場所のみ（自宅・通販・人物紹介は対象外）。
- **揮発情報は入れない**: いいね数・価格・営業時間は正本に書かない（マップ側が最新）。
- **照合用スナップショット**: 同名・別支店の照合に使った住所などは、必要なら `_verification` に内部情報として記録してよい（テンプレートには出さない）。

```yaml
_verification:                     # 任意・内部用（サイトには表示されない）
  map_match: matched
  closed_check: not_closed
  checked_at: 2026-11-13
```
