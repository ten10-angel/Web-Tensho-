# Cloudflare Pagesでプレビューを公開する

対象リポジトリ: https://github.com/ten10-angel/Web-Tensho-

## 1. GitHubへサイトを保存する

リポジトリを開き、`src`、`public`、`package.json`、`astro.config.mjs` が同じ階層に表示されていれば、次の「Cloudflare Pagesで公開する」へ進めます。

まだ空の場合は、用意された `Web-Tensho-GitHub-upload` フォルダをFinderで開き、`⌘ + Shift + .` で隠しファイルも表示してから `⌘ + A` で**中身すべて**を選択します。GitHubの「uploading an existing file／既存のファイルをアップロード」画面へドラッグし、「Commit changes／変更をコミットする」を押してください。フォルダそのものをドラッグすると、リポジトリ内に一段余分なフォルダができるため、中身を選択します。ZIPは先に展開します。

アップロード用フォルダにはソースと公開用画像だけを含めています。`node_modules` や `dist`、参考画像、元のスクリーンショットは含めていません。サイトに必要な写真は `public/images/IMG_2179-photo.png` にあります。

## 2. Cloudflare Pagesで公開する

1. https://dash.cloudflare.com/ にサインインします。
2. 「Workers & Pages」→「Create application」→「Pages」→「Connect to Git／Import an existing Git repository」を選びます。Pagesの選択肢が別画面にある場合は「Looking to deploy Pages?」などのPagesへのリンクを開きます。
3. GitHubとの接続画面で、`ten10-angel/Web-Tensho-` へのアクセスを許可します。
4. リポジトリ `Web-Tensho-` を選択し、次の値を入力します。

| 設定 | 入力値 |
| --- | --- |
| Framework preset | Astro |
| Production branch | main |
| Build command | npm run build |
| Build output directory | dist |
| Root directory | 空欄（リポジトリ直下） |
| 環境変数 NODE_VERSION | 22 |

5. 「Save and Deploy」を押します。成功画面に表示される `https://…pages.dev` が、スマホからも見られるURLです。実際のURLは公開時に決まります。

GitHubへ更新を保存すると、Cloudflare Pagesが自動で再ビルド・再公開します。この構成は静的サイトなので、Cloudflare用のAstroアダプターやデプロイコマンドの追加は不要です。

## 3. 最初に確認するところ

トップの写真と氏名、各セクションへの移動、WORK・JOURNAL・ESSAYの詳細表示、スマホのメニューを確認してください。作品・記事には仮内容が含まれます。

## CMSについて

`/admin/` の画面とGitHubの接続先は準備済みです。**Cloudflare Pagesでサイトを公開するだけでは、Decap CMSのGitHubログインはまだ使えません。** GitHub OAuthを仲介する認証サービスの設定が必要です。現在の設定はDecap標準のNetlify OAuthを使用する構成です。

まずPagesのURLでデザインと動きを確認し、そのURLが決まった後に、Pages用のOAuthサービス（Cloudflare Worker等）かNetlifyの認証サービスを接続します。Client Secretは認証サービスの秘密情報として登録し、公開ソースには保存しません。

以前のNetlifyサイトをそのまま使用する選択肢もあります。既存NetlifyプロジェクトをこのGitHubリポジトリへ接続する方法は [CMS_SETUP.md](CMS_SETUP.md) を参照してください。

## 公式手順

- [Cloudflare PagesへのAstro公開](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Cloudflare PagesとGitHubの接続](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Decap CMSのGitHub認証](https://decapcms.org/docs/github-backend/)
- [Decap CMSの外部OAuthサービス](https://decapcms.org/docs/external-oauth-clients/)
