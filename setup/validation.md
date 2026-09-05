# 構築・検証記録（2026-09-05 JST）

## 既定サーバー一覧追加（2026-09-06 02:18 JST）

- 管理用PrismにDesired Servers 1.6.0（CurseForge project 397292 / file 6013349）を追加した。公式配布JARと配置後JARのSHA-1は `4b669511628a866b147a4f32c972f0602352f1f2` で一致。NeoForge 21.0.143以上・Minecraft 1.21以上1.22未満の依存定義とクライアント初期化処理をJAR内で確認し、packwizと `distribution.toml` でclient専用に分類した。
- `config/desiredservers/desiredservers.json` で「Unko Chat サーバー」 / `133.18.166.158:25565` / リソースパック強制なしを設定。`servers.dat`は配布せず、既存のユーザー登録を保持する。管理用Prismの元の `servers.dat` と `servers.dat_old` は `codex-backups/20260906-021608-desired-servers` へ退避した。
- packwiz検証は有効Mod 269個、メタファイル287個、indexed files 2930個、raw local Mod 0個で成功。client専用メタファイルは70個。
- 公開コミット `563dbb6`、Pages実行 `33980609926` が成功。pack/index、Desired Servers設定、メタファイルの公開バイト列がローカルと同じSHA-256であることを確認した。
- クライアント専用のためVPSへのデプロイと再起動は実施していない。`reimagined.service` は同一PID 43091、02:06:06 JSTからactiveを維持。管理用PrismはMod追加後に未起動のため、初期化ログと実際の一覧表示は次回起動時に確認する。

## CNM安全化・MPIログ抑制・キーバインド同期（2026-09-06 02:08 JST）

- 公開コミット `6fb0210`。色違い・チェストの変換解除と木材増殖対策を含む `cnm-no-color-aliases.zip`、Clutter No More局所修正版、Multiplayer Isolationのデバッグ出力抑制版を配布・VPSへ反映した。パッチの範囲とハッシュは `scripts/local-mod-patches.md` に記録。
- キーバインドを `configureddefaults/options.txt` とPlasmo Voice設定へ同期した。Minecraftの画面・言語・音量など無関係な初期値は維持し、既存クライアントのoptions.txtを強制上書きする仕組みは追加していない。
- packwiz検証は有効Mod 268個、メタファイル286個、indexed files 2928個、raw local Mod 0個で成功。Pages実行 `33979824494` が成功し、pack/index、変更設定、データパック、両メタファイルと両JARの公開バイト列がローカルと同じSHA-256であることを確認。
- 217個の候補Modと保護設定を検証し、プレイヤー接続なしでライブコピー・正常停止後バックアップを実施。本番は02:07:33に `Done (28.830s)!`、PID 43091で稼働。新しいデータパックの自動ロードを起動ログで確認。
- 本番JARはCNM SHA-256 `6dd42a55d04965c3e37c93bb94ed1fa2ceaf63903bb61588b7ee15913c907394`、MPI `d75039cbdbae5e24f565822b200d44a43d785087c320cfea3b2c785e00e52149`。データパックは `a8c9880241da9b474950e2e274e132499b145274693f0b25159286ead2cd5d26` で配布物と一致。
- Sawmill SHA-256 `85eebbec566b9322a4a70223e3b9f53399d606f7a9b763ccced4f7d4a73844f8`、`sort_recipes=false`、TCP 25565・UDP 25566の待受を維持。
- 保持バックアップは `/opt/reimagined-backups/20260906-020547`。world/level.datのチェックサム検証が成功し、候補ディレクトリは正常に片付けられた。
- リモート操作先をSSH aliasに限定するAGENTS.mdに従い、`kagoya-minecraft` の一時SSH転送を介してローカルPCからMinecraft statusを検証した。1.21.1 / protocol 767 / 0 of 10 players / 正しいMOTDを確認。公開TCPポートへの直接疎通テストは今回は実施していない。
- 起動ログには既知のReliable Remover・Integrated API・サンプルdata map等のエラーが残る。今回の修正はこれらを対象にしていない。木材増殖の解消は管理用Prismでユーザー確認済みだが、配備後の実ログイン・クラフト・MPIのプレイヤー一覧操作は未検証。

## クライアント既定設定・チャットMod同期（23:29 JST）

- 管理用Prismの`options.txt`を`configureddefaults/options.txt`へ同期し、新規クライアントでは画面・音量・言語・キーバインド等の全設定を初期値として適用、既存クライアントでは未登録項目だけを追加する運用へ変更した。設定のみの同期用に`scripts/sync-from-prism.ps1 -OptionsOnly`を追加。
- Chat Bubbles 1.1.1をclient/server両用、Multiplayer Isolation 2.1をserver専用として追加。CurseForgeまたはModrinthの配布物とローカルJARのハッシュ一致、Minecraft 1.21.1対応、依存関係、sideを確認した。
- packwiz検証は有効Mod 268個、メタファイル286個、indexed files 2927個、raw local Mod 0個で成功。GitHub Pagesの`pack.toml`、index、設定、両メタファイルがローカルと同じSHA-256で公開されたことを確認。
- 初回配備は217個の候補検証と起動には成功したが、WindowsとLinuxの大小文字差によりMultiplayer Isolationが要求する`config/MPI.json`を読めず、`config/mpi.json`から既定値を生成していた。配布ファイル名を`MPI.json`へ修正して再公開・再配備し、旧小文字ファイルの削除、設定SHA-256 `6ce18798cc18d72a2b301883cca18c349c02de7b212510d2adcd0bbea0b31fbe`、起動ログに同エラーがないことを確認した。
- 本番は217個のサーバーModで23:29:43に`Done (29.900s)!`。Chat BubblesとMultiplayer Isolationの両JARおよびMod検出ログを確認。
- 最終保持バックアップは`/opt/reimagined-backups/20260905-232759`。バックアップ内`world/level.dat`のSHA-256検証に成功し、失敗候補ディレクトリは残っていない。
- SawmillパッチSHA-256 `85eebbec566b9322a4a70223e3b9f53399d606f7a9b763ccced4f7d4a73844f8`、`sort_recipes=false`、TCP 25565、UDP 25566を再確認。
- 外部PCからMinecraft status問い合わせに成功。1.21.1 / protocol 767 / 0 of 10 players / 正しいMOTDを確認。

## 管理用インスタンス同期（16:43 JST）

- 管理用Prismインスタンスとの差分からGliders 1.1.8をclient/server両用、Chunky 1.4.23をserver専用として追加し、Paragliders 21.1.5を削除。
- Modrinthの完全一致ハッシュとNeoForge 1.21.1対応、追加依存なしを確認。packwiz検証は有効Mod 266個、メタファイル284個、indexed files 2923個で成功。
- GitHub Pages公開後に新規メタファイルのHTTP 200と削除済みメタファイルのHTTP 404を確認。
- 初回試行で起動完了ログを`pipefail`と`grep -q`の組み合わせにより誤検知し、安全ロールバックが作動。完了判定を修正後に再デプロイした。
- 本番は214個のサーバーModで16:43:20に`Done (28.881s)!`。ChunkyとGlidersの存在、Paraglidersの不在を確認。
- 保持バックアップは`/opt/reimagined-backups/20260905-164144`、容量948MB。バックアップ内`world/level.dat`のSHA-256検証に成功。
- SawmillパッチのSHA-256、Plasmo Voice UDP 25566、`sort_recipes=false`を再確認。TCP 25565とUDP 25566が待受中。
- 外部PCからMinecraft status問い合わせに成功。1.21.1 / protocol 767 / 0 of 10 players / 正しいMOTDを確認。

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
