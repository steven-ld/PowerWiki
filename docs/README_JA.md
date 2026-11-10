# PowerWiki ドキュメント

<div align="center">

<img src="../assets/powerwiki-logo.svg" alt="PowerWiki" width="360" />
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node](https://img.shields.io/badge/Node.js->=14-339933?style=for-the-badge&logo=node.js&logoColor=white)

Git ベースのマークダウン Wiki システム。自動同期、構文ハイライト、Feishu スタイルの UI をサポート。

**🔗 オンラインデモ: [https://powerwiki.ga666666.cn](https://powerwiki.ga666666.cn)**

[English](README.md) • [中文](README_ZH.md) • [日本語](README_JA.md) • [한국어](docs/README_KO.md) • [Español](docs/README_ES.md) • [Français](docs/README_FR.md) • [Deutsch](docs/README_DE.md) • [Русский](docs/README_RU.md)

</div>

---

## 言語選択

その他の言語のドキュメント：

- [English](README.md)
- [中文](README_ZH.md)
- [日本語](README_JA.md)
- [한국어](README_KO.md)
- [Español](README_ES.md)
- [Français](README_FR.md)
- [Deutsch](README_DE.md)
- [Русский](README_RU.md)

## 特徴

- **自動同期** - Git リポジトリからドキュメントを自動取得・更新
- **コードハイライト** - 複数のプログラミング言語の構文ハイライトに対応
- **レスポンシブデザイン** - あらゆるデバイス画面に対応
- **自動目次** - 記事の目次を自動生成
- **モダンUI** - シンプルで直感的なインターフェース
- **PDF サポート** - PDF ファイルを高清に表示
- **アクセス統計** - 記事の閲覧数を自動統計
- **軽量** - データベース不要
- **SEO 最適化** - 検索エンジン可視性を全面的に最適化
- **Frontmatter サポート** - YAML メタ情報を解析
- **ローカル画像** - Markdown でのローカル画像引用に対応
- **HTML 記事** - リポジトリ内の HTML ファイルを記事として表示。完全なインタラクティブページはサンドボックスモードで
- **多言語** - 日本語と英語をサポート
- **Docker サポート** - 完全な Docker デプロイをサポート

## クイックスタート

### 前提条件

- Node.js >= 14.0.0
- Git

### Docker を使用（推奨）

```bash
# リポジトリをクローン
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# 設定ファイルを作成
cp config.example.json config.json
# config.json を編集して Git リポジトリ URL を設定

# Docker Compose で起動
docker-compose up -d
```

### Node.js を使用

```bash
# リポジトリをクローン
git clone https://github.com/steven-ld/PowerWiki.git
cd PowerWiki

# 依存関係をインストール
npm install

# 設定ファイルを作成
cp config.example.json config.json
# config.json を編集して Git リポジトリ URL を設定

# サーバーを起動
npm start
```

ブラウザで `http://localhost:3150` にアクセスしてください。

## 設定

`config.json` を編集：

```json
{
  "gitRepo": "https://github.com/your-username/your-wiki-repo.git",
  "repoBranch": "main",
  "port": 3150,
  "siteTitle": "My Wiki",
  "siteDescription": "Knowledge Base",
  "autoSyncInterval": 180000,
  "html": {
    "enabled": true,
    "sanitize": true
  },
  "pages": {
    "home": "README.md",
    "about": "ABOUT.md",
    "notFound": "404.html"
  }
}
```

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `gitRepo` | Git リポジトリ URL | - |
| `repoBranch` | ブランチ名 | `main` |
| `mdPath` | マークダウンファイルサブディレクトリ | `""` |
| `port` | サーバーポート | `3150` |
| `siteTitle` | サイトタイトル | `PowerWiki` |
| `siteDescription` | サイト説明 | `Wiki` |
| `autoSyncInterval` | 自動同期間隔（ミリ秒） | `180000` |
| `sortOrder` | ソート順序 (`modified` または `name`) | `modified` |
| `pages.home` | ホームページファイル | `""` |
| `pages.about` | About ページファイル | `""` |
| `pages.notFound` | カスタム 404 ページ（`.html` または `.md`） | 組み込みページ |
| `html.enabled` | HTML ファイルを記事として収録 | `true` |
| `html.sanitize` | 記事本文を許可リストでサニタイズ | `true` |

## Docker デプロイ

### Docker イメージ

**[@sayunchuan](https://github.com/sayunchuan)** が PowerWiki の Docker イメージを提供しています。

- **イメージ名**: `sayunchuan/powerwiki`
- **Docker Hub**: [sayunchuan/powerwiki](https://hub.docker.com/r/sayunchuan/powerwiki)
- **バージョンタグ**: `latest`, `1.4.5`, `20260207`

### クイックスタート

```bash
# 最も簡単な方法
docker run -d -p 3150:3150 sayunchuan/powerwiki

# カスタム設定を使用
docker run -d \
  --name powerwiki \
  -p 3150:3150 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v powerwiki_data:/app/data \
  -v powerwiki_cache:/app/cache \
  sayunchuan/powerwiki
```

### Docker Compose デプロイ

```yaml
version: '3.8'
services:
  powerwiki:
    image: sayunchuan/powerwiki:latest
    ports:
      - "3150:3150"
    environment:
      - NODE_ENV=production
      - LANG=ja
    volumes:
      - ./config.json:/app/config.json:ro
      - powerwiki_data:/app/data
      - powerwiki_cache:/app/cache
    restart: unless-stopped

volumes:
  powerwiki_data:
  powerwiki_cache:
```

```bash
# サービスを開始
docker-compose up -d

# ログを確認
docker-compose logs -f

# サービスを停止
docker-compose down
```

**謝辞**: [@sayunchuan](https://github.com/sayunchuan) 氏に感謝します。PowerWiki の Docker イメージを提供していただき、デプロイがより便利になりました。

## 記事の整理

PowerWiki は記事を整理するための階層的なフォルダー構造をサポート：

```
your-wiki-repo/
├── README.md              # ホームページ
├── ABOUT.md               # About ページ
├── images/                # グローバル画像（オプション）
├── Architecture/          # カテゴリーフォルダー
│   ├── images/            # カテゴリー画像
│   ├── IoT-Device-Standards.md
│   ├── TLS-Encryption.md
│   └── README.md          # カテゴリーインデックス
└── Projects/              # 別のカテゴリー
    ├── images/
    ├── URL-Shortener.md
    └── README.md
```

### 記事の Frontmatter

各記事には YAML frontmatter メタデータを含めることができます：

```yaml
---
title: 記事のタイトル
description: SEO 用の記事説明
author: 作者名
date: 2026-01-10
updated: 2026-01-10
keywords: キーワード1, キーワード2, キーワード3
tags: [タグ1, タグ2]
---
```

## HTML 記事

HTML ファイルは Markdown 記事と同じように扱われます。サイドバーに表示され、`/post/<リポジトリ内パス>` で配信され、目次・コピー・生表示・共有・SEO を備えた同じ読書ビューを使います。`/docs/page` や `/docs/page.html` などの旧アドレスは `/post/docs/page.html` へ 301 リダイレクトされます。レンダリングされるのは `<body>` のみで、`<title>` と `<meta name="description|keywords">` が記事のメタ情報になります。`pages.home` に `.html` ファイルを指定することもできます。

![HTML ファイルが目次と読書ツールを備えた PowerWiki 記事として表示される例](../assets/screenshots/html-article-plain.jpg)

本文は既定でサニタイズされます。`<script>`、`<style>`、`<iframe>`、フォーム、インラインイベントハンドラー、`style` 属性は削除され、`javascript:` URL は破棄されます。相対アドレスはサーバー側で書き換えられ、画像は `/api/image/...`、他の HTML/Markdown/PDF へのリンクは `/post/...`、その他のアセットはページのディレクトリ基準で解決されます。`html.sanitize: false` は完全に信頼できるコンテンツにのみ使用してください。

### 完全な HTML ページ（サンドボックスモード）

インタラクティブなページは `<head>` でサンドボックスモードを宣言します：

```html
<meta name="powerwiki-render" content="sandbox">
```

この場合、本文はサニタイズされず `iframe` に埋め込まれます。スクリプト、フォーム、ポップアップ、ダウンロード、ユーザー操作によるトップナビゲーションは許可されますが、`allow-same-origin` は付与されません。ページは不透明なオリジンで動作し、Wiki の Cookie、localStorage、同一オリジン API にはアクセスできません。元のページは `/full/<リポジトリ内パス>` でも `Content-Security-Policy: sandbox ...` 付きで配信され、このルートは HTML と静的アセットのみを返し、トラバーサル、隠しパス、シンボリックリンク、50 MB を超えるファイルを拒否します。

![インタラクティブな HTML ダッシュボードを PowerWiki の没入型リーディングで開いた例](../assets/screenshots/html-article.jpg)

### 没入型リーディング

サンドボックスページと HTML ホームページは最初から没入状態で開きます。読書領域がビューポート全体に広がり、`Esc` または右上のボタンで通常表示に戻ります。`iframe` は再読み込みされません。サーバーが最初のフレームから没入状態を出力するため、読み込み時に幅が跳ねることはありません。高さは通知された内容に追従し（240〜20000px）、没入していない場面で 2 本目のスクロールバーが出ないようになっています。サンドボックス宣言のない通常の HTML 記事は `iframe` を持たず、通常のページとしてスクロールし、**全画面** ボタンは `/full/...` を新しいタブで開きます。

記事シェルは、読み込み時とテーマ変更時にサンドボックスページへ `{ type: 'powerwiki:context', version: 1, theme, lang }` を送ります。ページ側は `parent.postMessage({ type: 'powerwiki:request-context' }, '*')` で要求できます。

## 技術スタック

- **バックエンド**: Express.js
- **フロントエンド**:  Vanilla JavaScript
- **Git**: simple-git
- **Markdown**: marked + highlight.js
- **PDF**: pdfjs-dist
- **コンテナ化**: Docker

## プロジェクト構造

```
PowerWiki/
├── src/                     # ソースコード
│   ├── index.js             # Express サーバーエントリポイント
│   ├── routes/              # ルーターモジュール
│   │   ├── api.js           # API ルーター
│   │   ├── feeds.js         # RSS/Sitemap ルーター
│   │   └── static.js        # 静的ファイルルーター
│   ├── config/              # 設定モジュール
│   │   ├── env.js           # 環境変数
│   │   └── i18n.js          # 国際化
│   └── utils/               # ユーティリティモジュール
│       ├── cacheManager.js  # キャッシュ管理
│       ├── gitManager.js    # Git 操作
│       └── markdownParser.js# Markdown パーサー
├── locales/                 # 翻訳ファイル
├── templates/               # HTML テンプレート
├── public/                  # 静的アセット
│   ├── index.html          # フロントエンド HTML
│   ├── app.js             # メインエントリ（モジュラー）
│   ├── js/                # JavaScript モジュール
│   │   ├── theme.js       # テーマ管理
│   │   ├── i18n.js        # 国際化
│   │   ├── cache.js       # クライアントキャッシュ
│   │   ├── utils.js       # ユーティリティ
│   │   ├── posts.js       # 投稿リストとツリー
│   │   ├── article.js     #記事レンダリング
│   │   ├── toc.js         # 目次生成
│   │   └── media.js       # コードコピー、画像ビューア、PDF
│   └── css/               # CSS モジュール
│       ├── base.css       # ベーススタイルと変数
│       ├── layout.css     # レイアウト
│       ├── sidebar.css    # ナビゲーションメニュー
│       ├── article.css    # 記事と Markdown
│       ├── toc.css        # 右側目次バー
│       ├── media.css      # レスポンシブ対応
│       └── components.css # UI コンポーネント
├── config.example.json      # 設定テンプレート
└── package.json             # 依存関係
```

## ライセンス

MIT License - [LICENSE](LICENSE) をご覧ください。

## 貢献者

- [@sayunchuan](https://github.com/sayunchuan) - 多言語、Mermaid サポート追加、さまざまな問題の修正

---

<div align="center">

**このプロジェクトが役に立ったら、⭐ Star を押してください！**

</div>
