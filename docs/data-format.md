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

```yaml
notices:                           # お知らせ（閉館・休館・移転など、訪問前に知るべき変化）
  - { date: "2026-11-13", text: "何がどう変わったか＋根拠（公式発表／複数投稿での言及）" }
```

- `notices` は詳細ページの「お知らせ」欄とカードの「お知らせあり」表示に出る。
- 掲示の条件: 公式発表、または独立した複数投稿での言及があること（エビデンスが無い疑いは書かない）。
- `date` は掲示日（確認した日）。文字列でクォートする。

## 日付の表示（鮮度の見せ方）

詳細ページでは区間（セクション）ごとに日付を明示する。

- 基本情報の確認日: `_verification.checked_at`（「基本情報は ○○ に確認しました」＋出典欄の「基本情報の最終確認」）
- 関連投稿の取得日: `related_posts.captured_at`（関連投稿セクション＋出典欄の「関連投稿の取得」）
- ページの追加日: `added_at`（出典欄）

## 出典投稿の埋め込み

詳細ページでは、`source.platform` が `instagram` の場合、出典投稿を公式の埋め込みコード
（`blockquote.instagram-media` ＋ `embed.js`）でそのまま表示します（テンプレート側で自動生成され、YAMLへの追加記述は不要）。
写真はInstagramのサーバーから表示されるため転載にはならず、埋め込みが失敗した場合も元投稿へのリンクが残ります。
関連投稿（`related_posts`）は重さの都合で埋め込まず、リンク一覧のままにします。

## ルール

- **重複防止**: `source.post_url` と「店舗同一性（名称＋エリア）」が既存と重なるものは追加しない。
- **まとめ投稿**（1投稿に複数スポット）は対象外。主役が1つに絞れる場合だけ、その1件として扱う。
- **対象の線引き**: Googleマップにピンがある場所のみ（自宅・通販・人物紹介は対象外）。
- **揮発情報は入れない**: いいね数・価格・営業時間は正本に書かない（マップ側が最新）。
- **featured**: トップの「今月のおすすめ」枠。月次ジョブがルールで自動選定して最大3件に付け替える（手動で付けても次回月次で再編される）。
- **照合用スナップショット**: 同名・別支店の照合に使った住所などは、必要なら `_verification` に内部情報として記録してよい（テンプレートには出さない）。

```yaml
_verification:                     # 任意・内部用（ただし checked_at のみ「基本情報の最終確認」として詳細ページに表示される）
  map_match: matched
  closed_check: not_closed
  checked_at: 2026-11-13
```

## 情報源アカウント（data/accounts/）

中国地方の情報を専門に発信する公開アカウントの一覧ページ（`/accounts/`）用のデータです。場所データとは別に、`data/accounts/<username>.yaml`（1件1ファイル）で管理します。

```yaml
username: hiroshima_nicegourme        # アカウント名（@なし）
name: "ナイスグルメ | 広島グルメ＆広島観光"  # 表示名
platform: instagram
url: https://www.instagram.com/hiroshima_nicegourme/
verified: true                          # 認証済みアカウントか
areas: [広島県]                          # 主な対象エリア
genres: [グルメ, 観光スポット]            # 得意ジャンル
note: "自分の言葉での一言紹介"
followers: 105129                       # 照合用スナップショット（揮発情報のため captured_at とセット）
posts: 773
captured_at: "2026-11-14"
```

- 掲載基準: 対象地域の情報を継続して発信している公開アカウントであること。追加時に実在と活動状況を確認する。
- フォロワー数・投稿数はスナップショットとして取得日つきで表示する。月次運用で更新する。
- 紹介文（note）はプロフィールの転載ではなく、自分の言葉で書く。

### アカウント専用ページと人気の投稿

各アカウントには専用ページ（`/accounts/<username>/`）があり、次を表示します。

- プロフィール: Instagram公式の埋め込み（プロフィールへのリンクがフォールバック）
- 人気の投稿: `popular_posts` に最大3件。公式埋め込みで表示し、いいね数と投稿日を併記する

```yaml
popular_posts:
  captured_at: "2026-11-14"
  items:
    - post_url: https://www.instagram.com/reel/De5MN8UzHNc/
      likes: 423
      posted_at: "2026-10-24"
      note: "自分の言葉での一言紹介"
```

- 選定方法: 投稿を取得し、いいね数が確認できたものの中から数の多い順に最大3件。多くのアカウントはいいね数を非公開にしているため、対象は一部の投稿に限られる旨をページに明記する。
- 月次運用でフォロワー数などとあわせて再選定する。
