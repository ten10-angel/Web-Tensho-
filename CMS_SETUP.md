# 記事管理画面の接続手順

管理画面: https://web-tensho.pages.dev/admin/

公開サイトと認証処理をCloudflare Pagesに統一します。記事はGitHubの `ten10-angel/Web-Tensho-` に保存します。NetlifyのOAuth仲介は使いません。サイトのURL・デザイン・記事形式は変わりません。

## 初回だけ行う設定

### 1. 修正版をGitHubに保存

`functions/api/[[route]].js`、`public/_routes.json`、更新後の `public/admin/config.yml` を、フォルダ構成を保ったままリポジトリへ保存します。修正版の説明書・テストも合わせて保存してください。`functions` は `public` や `dist` の中ではなく、`package.json` と同じ階層です。

### 2. GitHub OAuth Appの認証先を変更

既存の [Tensho Website CMS](https://github.com/settings/applications/3936728) を開きます。新しいアプリの作成は不要です。

- Homepage URL: `https://web-tensho.pages.dev`
- Authorization callback URL: `https://web-tensho.pages.dev/api/callback`
- Wildcard matching: 無効のまま
- Device flow: 無効のまま

以前のCallback URL `https://api.netlify.com/auth/done` を新しいURLに置き換えて保存します。これ以降、このOAuth Appを使ったNetlify側のログインは使わなくなります。

### 3. Cloudflareに認証情報を登録

Cloudflareの **Workers & Pages → web-tensho → Settings → Variables and Secrets** を開き、**Production** 環境に次の2つを追加します。`NODE_VERSION=22` は変更しません。

| 名前 | 値 | 種類 |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | GitHub OAuth AppのClient ID | Text |
| `GITHUB_CLIENT_SECRET` | 同じOAuth AppのClient Secret | Secret（暗号化） |

**Client Secretはこのチャット・GitHub・設定ファイルに貼り付けず、ご自身でCloudflareのSecret欄へ直接入力してください。** 既存のSecretを安全に保管していれば再利用できます。保管していない場合は同じOAuth Appで新しいClient Secretを作成して入力します。既存のSecretを削除する必要はありません。

認証情報はProductionだけに設定し、未確認のプレビューブランチには渡さないでください。この実装は `https://web-tensho.pages.dev` 以外のホストで認証を拒否します。

### 4. 再デプロイして確認

環境変数・Secretを保存した後、**Deployments → 最新のProductionデプロイ → Retry deployment** で再デプロイします。保存だけでは以前のデプロイにSecretは反映されません。

成功後、古い認証ポップアップを閉じ、[管理画面](https://web-tensho.pages.dev/admin/)を再読み込みして「Login with GitHub」を押します。許可範囲は公開リポジトリのみです。ただしOAuthの `public_repo` はこのリポジトリだけに限定されず、そのGitHubアカウントで操作できる公開リポジトリに及びます。

記事一覧が表示されることを確認してから、本人が選んだ記事で下書き保存・公開を確認してください。公開すると実際のサイトが更新されます。認証テストだけでは記事の保存・公開までは確認できません。

## 日々の編集

- `固定ページ`でABOUTとHISTORYを編集します。HISTORYは行を追加・並べ替えできます。
- WORK、JOURNAL、ESSAYは「New」から作成し、既存記事を選んで編集・削除できます。URL用IDは半角小文字・数字・ハイフンで一意に付け、公開後は変更しないでください。
- WORKの「写真」は複数追加できます。先頭の写真が一覧のサムネイルになり、詳細ページにはすべて表示されます。
- JOURNALのタイトルは空欄でも構いません。その場合、一覧には「一覧に表示する短文」を表示し、詳細ページの見出しは日付になります。
- ESSAYの本文はMarkdownで書けます。見出しや画像も詳細ページに反映されます。
- 上部の「Save draft」は公開前の保存です。DecapのEditorial Workflowでは下書きごとにGitHubのPull Requestが作られ、「Publish」で公開ブランチに取り込まれます。公開後、Cloudflare Pagesがサイトを再ビルドし、一覧と詳細ページを更新します。さらに各記事の「公開表示」をオフにすると、公開ブランチ上でもサイトから非表示になり、詳細ページも生成されません。

管理画面はスマートフォンでも開ける設定です。写真を大量に一度にアップロードする場合は通信量に注意してください。

## 安全性と検証

- 認証は10分間有効な署名付きHttpOnly Cookie、OAuth state、PKCEで保護します。
- 認証結果は同じ本番ドメインの、ログインを開始した管理画面だけへ渡します。
- SecretやアクセストークンをURL・ログ・公開ファイルに保存しません。認証レスポンスはキャッシュ禁止です。
- AstroのローカルサーバーはPages Functionsを実行しません。`npm test` でダミー情報による認証ロジックのテスト、`npm run build` で静的サイトの生成を確認できます。実際のGitHubログインは上記の本番設定後に確認します。
- 公開GitHubリポジトリでは、CMSの下書きや非表示記事もブランチ・履歴から読めます。「下書き＝非公開の保管場所」ではありません。

## 公式資料

- [GitHubのOAuth認証とPKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [Cloudflare Pages FunctionsとSecret](https://developers.cloudflare.com/pages/functions/bindings/)
- [Decap CMSの外部OAuthサービス](https://decapcms.org/docs/external-oauth-clients/)
