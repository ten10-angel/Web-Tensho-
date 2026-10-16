# 記事管理画面の接続手順

この手順は既存のNetlifyサイトでCMSを運用する場合のものです。Cloudflare Pagesでの初期公開は [DEPLOY.md](DEPLOY.md) を参照してください。

サイトの管理画面は、公開後に `https://silly-mochi-3a18fb.netlify.app/admin/` から開きます。ただし、今のNetlify Dropによる公開は静的ファイルのスナップショットです。CMSで公開した記事を自動反映させるには、**このAstroプロジェクトをGitHubに置き、現在のNetlifyサイトをそのリポジトリに接続する**必要があります。

## 初回だけ行う設定

1. 作成済みのGitHubリポジトリ `ten10-angel/Web-Tensho-` に、このフォルダ `sites/tensho-nishida` の中身を**リポジトリ直下**に置きます。`node_modules`、`dist`、`assets`、`.openai` はアップロードしません。`public/images/IMG_2179-photo.png` はサイト表示に必要です。リポジトリの既定ブランチは `main` にします。
2. `public/admin/config.yml` の `repo` は `ten10-angel/Web-Tensho-` に設定済みです。**GitHubのトークンやClient Secretは、このファイルやリポジトリに書かないでください。**
3. Netlifyで既存の `silly-mochi-3a18fb` プロジェクトを開き、`Project configuration → Build & deploy → Continuous deployment → Repository → Link repository` からそのGitHubリポジトリを接続します。ビルドコマンドは `npm run build`、公開ディレクトリは `dist`、ベースディレクトリは空欄です。このフォルダより上の階層をリポジトリにする場合は、ベースディレクトリを `sites/tensho-nishida` に変更し、CMS設定の各 `file`/`folder`/`media_folder` パスにも同じ接頭辞を付けてください。推奨は、このフォルダ自体をリポジトリ直下にする構成です。
4. GitHubの `Settings → Developer settings → OAuth Apps → New OAuth App` でアプリを登録します。Homepage URLは `https://silly-mochi-3a18fb.netlify.app`、Authorization callback URLは `https://api.netlify.com/auth/done` にします。Client IDとClient Secretを控えます。
5. Netlifyの `Project configuration → Security → OAuth → Authentication providers → Install provider` でGitHubを選び、Client IDとClient Secretを**Netlifyの設定画面だけ**に入力します。CMSを使うGitHubアカウントには、対象リポジトリへの書き込み権限が必要です。
6. Netlifyの再ビルドが成功したら、スマホまたはPCで `https://silly-mochi-3a18fb.netlify.app/admin/` を開き、GitHubでログインします。初回ログインはGitHub側の認可画面が表示されます。

## 日々の編集

- `固定ページ`でABOUTとHISTORYを編集します。HISTORYは行を追加・並べ替えできます。
- WORK、JOURNAL、ESSAYは「New」から作成し、既存記事を選んで編集・削除できます。URL用IDは半角小文字・数字・ハイフンで一意に付け、公開後は変更しないでください。
- WORKの「写真」は複数追加できます。先頭の写真が一覧のサムネイルになり、詳細ページにはすべて表示されます。
- JOURNALのタイトルは空欄でも構いません。その場合、一覧には「一覧に表示する短文」を表示し、詳細ページの見出しは日付になります。
- ESSAYの本文はMarkdownで書けます。見出しや画像も詳細ページに反映されます。
- 上部の「Save draft」は公開前の保存です。DecapのEditorial Workflowでは下書きごとにGitHubのPull Requestが作られ、「Publish」で公開ブランチに取り込まれます。公開後、Netlifyがサイトを再ビルドし、一覧と詳細ページを更新します。さらに各記事の「公開表示」をオフにすると、公開ブランチ上でもサイトから非表示になり、詳細ページも生成されません。

管理画面はスマートフォンでも開ける設定です。写真を大量に一度にアップロードする場合は通信量に注意してください。

## 注意

現在のNetlify Drop版にビルド済みフォルダを再アップロードするだけでは、CMSからの更新は自動反映されません。GitHubとの接続が必須です。GitHubリポジトリは作成済みで、CMS画面と記事データの仕組みも実装済みですが、ホスティングへの接続・OAuth登録は未設定です。
