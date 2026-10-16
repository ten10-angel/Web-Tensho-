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

5. 「Save and Deploy」を押します。現在の公開URLは https://web-tensho.pages.dev/ です。スマホからも閲覧できます。

GitHubへ更新を保存すると、Cloudflare Pagesが自動で再ビルド・再公開します。表示部分は静的サイトのままです。認証用の `functions/` はCloudflareが別途処理するため、Cloudflare用のAstroアダプターや追加のデプロイコマンドは不要です。

## 3. 最初に確認するところ

トップの写真と氏名、各セクションへの移動、WORK・JOURNAL・ESSAYの詳細表示、スマホのメニューを確認してください。作品・記事には仮内容が含まれます。

## CMSについて

`/admin/` の認証はCloudflare Pages Functionsの `/api/auth` と `/api/callback` を使用します。Netlifyを経由しません。`public/_routes.json` により認証URLだけをFunctionsの対象とし、通常ページは静的配信のままです。

GitHub OAuth AppのCallback URL変更と、CloudflareのProduction環境への `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` 登録が必要です。Secretは必ず暗号化設定へ保存し、設定後に再デプロイします。詳しい手順は [CMS_SETUP.md](CMS_SETUP.md) を参照してください。

## 公式手順

- [Cloudflare PagesへのAstro公開](https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/)
- [Cloudflare PagesとGitHubの接続](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Decap CMSのGitHub認証](https://decapcms.org/docs/github-backend/)
- [Decap CMSの外部OAuthサービス](https://decapcms.org/docs/external-oauth-clients/)
