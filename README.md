# Tensho Nishida — Personal Archive

Astroで制作した個人Webサイトの初期プロトタイプです。オフホワイト・黒・深緑のエディトリアルデザインに、ABOUT、HISTORY、WORK、JOURNAL、ESSAYをまとめています。

## 表示と操作

- HOMEの写真は提供画像の写真部分を使用。顔や写真内容の生成・加工はしていません。
- ナビゲーション、スクロール時の表示アニメーション、スマホ用メニューを実装。
- WORK・JOURNAL・ESSAYのカードから個別の詳細ページを開けます。
- 初期コンテンツには仮内容が含まれます。HISTORYの小学校時代の項目は自分史に基づく仮要約です。

## サイトのアイコン

提供写真の人物部分を正方形で切り抜き、タブ用のファビコンとスマホのホーム画面用アイコンを設定しています。顔や写真の生成・補正は行っていません。HOMEの元画像は変更していません。

アイコン画像は `public/favicon.ico`、`public/apple-touch-icon.png`、`public/icons/`、スマホ向け設定は `public/site.webmanifest` にあります。共通の指定は `src/components/SiteIcons.astro`（HOME・記事ページ）と `public/admin/index.html`（管理画面）です。`node scripts/generate-site-icons.mjs` で既存の写真から再作成できます。生成済み画像を保存しているため、通常のビルドでは再生成不要です。

変更後はGitHubに保存してCloudflareの公開完了を待ちます。古いアイコンが残る場合はタブを閉じて開き直してください。ホーム画面に追加済みの場合は、そのショートカットを削除して追加し直す必要がある場合があります。

## ローカルで表示する

Node.js 22を使用します。

```sh
npm install
npm run dev
```

表示されたLocal URLをブラウザで開きます。配信用ファイルの生成と確認は以下です。

```sh
npm run build
npm run preview
```

## 公開

GitHubリポジトリは `ten10-angel/Web-Tensho-` です。Cloudflare Pagesではこのフォルダをリポジトリ直下に置き、ブランチ `main`、ビルドコマンド `npm run build`、出力先 `dist` を指定します。詳しい手順は [DEPLOY.md](DEPLOY.md) を参照してください。

## 記事管理

`/admin/` にDecap CMSを用意しています。接続先リポジトリは設定済みですが、GitHub OAuthによる認証は別途設定が必要です。サイトの表示確認や公開は、CMS認証の設定前でも行えます。

- ABOUT・HISTORY: `src/content/site/` のJSON
- WORK・JOURNAL・ESSAY: `src/content/` 内のMarkdown
- アップロード画像: `public/uploads/`
- 公開表示をオフにした記事は一覧・詳細ページの両方から除外
- WORKは複数写真、JOURNALはタイトル省略、ESSAYはMarkdownの長文に対応

[CMS_SETUP.md](CMS_SETUP.md) に編集方法とCloudflare Pagesでの認証手順をまとめています。認証処理は `functions/api/[[route]].js` で実行し、SecretはCloudflareの暗号化設定に保存します。`npm test` で認証ロジックのテストを実行できます。
