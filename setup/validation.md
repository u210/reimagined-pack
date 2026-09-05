# 構築・検証記録（2026-09-05 JST）

## packwiz自動デプロイ確認（15:42 JST）

- `scripts/deploy-vps.ps1`からVPSの`/usr/local/sbin/reimagined-deploy`を実行する更新経路を構築。
- 本番稼働中に別候補環境へserver/bothを同期し、213個のMod、既知のSawmill上流ハッシュ、サーバー専用パッチ、Plasmo Voice UDP 25566、`sort_recipes=false`を検証。
- Local Mod Translatorは生JARではsideフィルタが効かなかったため、client専用の直接ダウンロードメタファイルへ変更。VPSへ入っていないことを確認。
- 接続中プレイヤーがいる場合は停止前に中断するガードを追加。
- 停止前のライブワールド退避と、正常停止後の整合バックアップを実施。保持先は`/opt/reimagined-backups/20260905-153956`、容量917MB。バックアップ内`world/level.dat`のSHA-256検証に成功。
- 15:40:36に新構成を起動し、15:42:03に`Done (28.575s)!`を確認。systemdの再起動回数は0。
- Modは213個、Sawmill SHA-256は`85eebbec566b9322a4a70223e3b9f53399d606f7a9b763ccced4f7d4a73844f8`、TCP/UDP 25565とUDP 25566の待受を確認。
- 外部PCからMinecraft status問い合わせに成功。1.21.1 / protocol 767 / 0 of 10 players / 正しいMOTDを確認。
- 起動ログのERRORは既知のCurios、Integrated API、Reliable Remover、存在しないサンプルdata mapのみで、新しい致命エラーやSawmillのログイン時例外はなし。

## 最新の接続確認

Sawmillのログイン時例外を回避する局所修正を適用後、13:55:59にJellyfish14がワールドへ参加し、13:56:11に音声Modの接続も確認しました。status応答はオンライン1人です。修正の詳細は `setup/sawmill-fix.md` を参照してください。以下の未検証・停止状態の記載は初回構築時の履歴です。

## KAGOYAデプロイ（2026-09-05）

- SSHホスト: `kagoya-minecraft`、配置先: `/opt/reimagined`、サービス: `reimagined.service`。
- Ubuntu 24.04へOpenJDK 21.0.12 headlessを導入。
- 専用systemユーザー`minecraft`を作成し、配置先の所有権を設定。
- 修正版Sawmill、最新の保存済みワールド、213個のModと設定を転送。
- Sawmill JAR、level.dat、NeoForge unix_args、Sawmill設定、Plasmo Voice設定のSHA-256が転送元と一致。
- systemdサービスの自動起動を有効化し、active/runningを確認。
- 14:18:26に`Done (29.255s)!`、14:18:36にPlasmo Voice UDP 25566の起動を確認。
- TCP/UDP 25565とUDP 25566の待ち受けを確認。
- 外部のローカルPCから`133.18.166.158:25565`へMinecraft status問い合わせが成功。1.21.1 / protocol 767 / max 10 / 正しいMOTDを確認。

## 接続エラーを受けた修正

13:36のクライアント接続ログから、`clutternomore:shapes`、`clutternomore:player_change_stack`、`realisticnametag:presence_check` の3チャンネル不足を確認。
Clutter No More 2.0.6とRealistic Nametag 1.3.1はサーバー側も必要だったため、誤ったクライアント専用分類を訂正して元インスタンスから追加しました。
追加2ファイルのSHA256一致を確認。現在の導入数は213個、クライアント用除外は52個です。初回準備スクリプトと採否記録も修正済みです。
修正時点ではユーザー起動のサーバーが稼働中のため、稼働中プロセスには未反映です。サーバーの再起動とクライアントからの再接続が必要です。
以下は修正前の211個構成に対する検証履歴であり、213個構成の起動・ログイン確認を示すものではありません。

## 初回構築時の検証履歴

- Minecraft 1.21.1、NeoForge 21.1.244、Java 21.0.7。
- NeoForge公式Mavenのinstallerを実行し、`The server installed successfully` を確認。導入ログ: `setup/install.log`。
- 元インスタンスの有効JAR 265個のうち54個をクライアント用として除外。導入211個すべてのSHA256が元ファイルと一致。無効化された11個はコピーせず。
- 初回起動: 13:14:59 `Done (31.061s)!`。Mod読み込みを含む全体は約115秒。
- 初回終了: コンソールの `stop` で保存後にJavaプロセスの終了コード0を確認。
- 初回はSableとPlasmo Voiceが同じUDP 25565を使用してbindエラー。音声設定をUDP 25566に変更。
- 2回目起動: 13:17:30 `Done (17.463s)!`。Mod読み込みを含む全体は約88秒。
- 13:17:37 Plasmo Voiceの `UDP server is started ... :25566` を確認。
- 同一サーバープロセスによるUDP 25565（Sable）、25566（音声）の待ち受けを確認。
- Minecraft statusプロトコルで `localhost:25565` に問い合わせ、version 1.21.1 / protocol 767 / max players 10 / 正しいMOTDを取得。結果: `setup/status-check.json`。
- `list` コマンドに対して0/10人の応答を確認。
- 最終テスト後も `stop` でワールドを保存し、Javaプロセスの終了コード0を確認。納品時は停止状態。
- KubeJS: startup 1/1、server 2/2スクリプトを0 errors / 0 warningsで読み込み。レシピ追加61・削除39・変更43、失敗0。
- Paxi経由で `cnmtweaks.zip` と `true-ending-v1.1.2d.zip` のロードを確認。
- 新規ワールドを生成。クライアントの既存セーブは未移行。

## 残っているログと検証範囲

Reliable Removerのrules.json解析エラー、Curios spellbookスロットエラー、Integrated APIの地図装飾ID関連エラーは元クライアントの最新ログにも存在しました。
未導入のIron's Spellbooks・Ice and Fire等を参照する一部ルートテーブルやスポナーのデータエラー、Mod間Mixin警告等も記録されています。起動は完了しましたが、一部コンテンツへの影響を実プレイで検証してはいません。
クライアントとサーバーのゲーム内容を変えるような追加Mod導入や設定修正は行わず、元構成を維持しました。

ゲームクライアントによるログイン、Modネットワークの同期、複数人プレイ、実音声、LANやインターネット経由の接続は未検証です。
ファイアウォール・ルーター設定は変更していません。

初回ログ: `setup/first-start.log`。最終検証ログ: `setup/verified-start-stop.log`。
