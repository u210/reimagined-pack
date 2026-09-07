# 構築・検証記録（2026-09-05 JST）

## 2026-09-07 Unloaded Activity and checkout reconciliation

- Reconciled the main checkout with published commits `9e5d39e` / `1c7d28d`.
  Chappy and Exposure were already deployed and published; the missing local
  metadata was caused by the older checkout. Previously untracked duplicate
  source files matched the published blobs. Original local state is retained
  in the named reconciliation Git stash.
- Published `16eb635` (Pages run `34130447983`, success), then `e926bf9`
  (Pages run `34131088367`, success). Public pack, index, final mod metadata,
  and patched artifact hashes match the local files. Pack validation covers
  271 active Prism mods, 290 metafiles, 2,935 index entries, no raw pack JARs.
  Sides: both 219, client 68, server 3; server Mod count is 222.
- Official Unloaded Activity 0.7.2 started successfully but its NeoForge
  mixin list selected three Fabric classes. Corrected only those references
  to the existing `_neoforge` implementations; all other JAR entries are
  byte-identical. Reproduction produces the same SHA-256. Details and
  reproducible script are in `setup/unloaded-activity.md`.
- Final guarded deployment through `kagoya-minecraft` completed at 23:09:52
  JST with current-startup `Done (35.260s)`, PID 225820. No forced player
  disconnects. The three missing-target warnings are absent after correction.
  Observed 20 TPS; actual crop/furnace/animal catch-up behavior still needs
  in-game acceptance testing. Mod-specific blocks outside upstream support
  are not guaranteed to simulate.
- Final backup: `/opt/reimagined-backups/20260907-230709`; stopped-world
  `level.dat` checksum verified. Initial unpatched deployment backup
  `/opt/reimagined-backups/20260907-230012` is also retained. No candidate
  directories remain. Deployment now rechecks players after the live-world
  copy and compares stopped production/backup `level.dat` bytes before use.
- All 221 existing Mod JARs stayed byte-identical, including Chappy, Exposure,
  MPI reimagined-2 and patched Sawmill. Only Unloaded Activity was added,
  final SHA-256 `46a55e01fa9ea8e221955c6a5830facb44d20e80e89c585efe66993d98e04120`.
  JVM args, DistantHorizons, MPI, Chappy and Xaero settings are byte-identical
  to preflight. Sawmill `sort_recipes=false` and voice UDP 25566 are preserved.
- Minecraft status from the administrator machine through an SSH-alias tunnel
  returned Minecraft 1.21.1, protocol 767, 0/10 players and expected MOTD.
  Minecraft, Chunky idle control, Chappy gateway and memory timer are active.
  Operational controller sources match deployed hashes; five idle-policy
  tests pass and the updated deploy script passes `bash -n`.
- Prism remains unchanged; Unloaded Activity is server-only and does not
  require a client update. Historical MPI/Xaero publication notes are updated
  to reflect the already-published fixes.

## DH生成負荷の抑制試験（2026-09-06 03:34 JST）

- 1人プレイ中に6 vCPUがほぼ100%、DH-World GenスレッドがCPU上位、2〜9秒のCan't keep upと移動速度警告を確認。Chunkyは停止中。
- `/opt/reimagined-backups/dh-threads-20260906-033412` に大小文字両方のDH設定を退避し、RCON `dh config threading.numberOfThreads 2` で12→2へ変更。再起動なしで反映され、実際に使用される `config/DistantHorizons.toml` に2が保存された。小文字の配布用 `distanthorizons.toml` は12のままで、今回はPrism・packwizを変更していない。
- 変更直後のCPUは全体約40〜70%、Javaの短時間平均約298%（6コア合計600%基準）に低下。全体MSPTは最初の再測定で12.454、20 TPS。プレイ内容による差もあるため継続的な体感確認は必要。
- 元へ戻す場合はRCON `dh config threading.numberOfThreads 12`。当面VPSでは2を維持する。今後DH設定を配布・再構築するときは管理用PCの12スレッド設定をVPSへ無条件に適用しないこと。

## 指定seedで新ワールド開始（2026-09-06 03:12 JST）

- ユーザー指定seed `5768409083084640829` をserver.propertiesへ設定し、新しいworldを生成。level.dat内WorldGenSettings.seedとRCON seedの双方で一致を確認。
- 旧ワールド・旧Chunkyタスク・旧server.propertiesは `/opt/reimagined-backups/seed-reset-20260906-031019` に退避。旧level.datのSHA-256一致を確認し、退避データは保持。
- 現起動のDoneを03:11:57に確認。RCON応答、TCP25565待受、20 TPS / 全体4.211 ms/tickを確認。save-all flush後のスポーンは(0,135,0)。
- Chunkyを中心(0,0)、円形半径4096、処理数0の新しい保存タスクへ置き換え、reload tasksを実行。監視サービスをenable/startしてholdを解除し、0人・healthy・通常300秒待機を確認。

## ワールド厳選のため停止（2026-09-06 03:05 JST）

- ユーザー依頼でChunkyをholdし、`chunky-idle.service`をdisable/stop、続いて`reimagined.service`を正常停止。両方inactive、Minecraft MainPID=0を確認。
- ユーザーはシングルでワールドを厳選し、後でseedを指定して新ワールドで再開する予定。現ワールドは削除予定だが、今回は削除せず保持した。
- 次回の新ワールド作成時には旧 `config/chunky/tasks/` の進捗と中心座標も引き継がず、新ワールドに合わせて初期化・再設定する。Chunky自動制御は現在無効かつhold中。

## 無人時Chunky自動生成（2026-09-06 JST）

- `chunky-idle.service` をVPSに導入し、自動起動を有効化。Minecraft本体は再起動せず、NeoForge 21.1.244 / Chunky 1.4.23と既存のlocalhost RCONを使用。
- 0人300秒で既存のオーバーワールド円形半径4096（中心-144,-320）タスクを再開、約1秒ごとに人数確認。120秒生成・60秒休止、TPS/MSPT・メモリ・ディスク条件で停止。手動holdを永続化。
- 導入前に `/opt/reimagined-backups/chunky-idle-20260906-024555` へworld.tarと設定・旧デプロイスクリプトを保存。save-off/save-all flush後に退避し、level.datのSHA-256を照合してsave-on復帰を確認。
- 方針テスト4件成功。短時間の実機生成では37353→37754チャンク、休止・再開・模擬人数1で停止を確認。実プレイヤー入退室試験は未実施。終了後は20 TPS、全体1.929 ms/tick。
- デプロイとの排他ロック、手動hold/resume、rsyncによるChunky進捗保護を検証。configコピー後に進んだタスクを古い候補で上書きしないようにした。
- 通常の300秒待機設定へ戻してサービスactive/enabledを確認。Modpackの同期・公開・Git pushは実施していない。運用は `setup/chunky-idle.md` を参照。

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

## VPSヒープ上限5GiBの試行（2026-09-06 08:54 JST）

- ユーザー依頼で、無人確認後にVPSの `/opt/reimagined/user_jvm_args.txt` を `-Xms2G -Xmx6G` から `-Xms2G -Xmx5G` へ変更して再起動。
- バックアップ：`/opt/reimagined-backups/heap5g-20260906-084938`。旧JVM引数と、save-off / save-all flush中に取得したworld.tarを保存。tar一覧を検証し、save-onを復旧。
- 比較前：OS MemAvailable約430MiB、Java RSS約6.53GiB、Javaスワップ約916MiB。ヒープ確保6GiBに対し使用約2.70GiB。無人20 TPS・1.247ms/tickで、Chunkyはメモリ条件により停止していた。
- 5GiB起動後、監視の人数・負荷ガードを維持し、試験プロセス内だけWAIT=2に短縮して120秒生成。観測は140秒。MemAvailableは2937→2515MiB、ヒープ使用2331〜3226MiB。生成中20 TPS、全体9.8〜12.5ms/tick。観測中フルGC 0回、young GC累積時間増分約1.51秒。システムswap使用556MiBで観測中増加なし。
- Chunky処理数164465→168251（+3786）。通常のchunky-idle.serviceへ復旧し、無人300秒待機・120秒生成/60秒休止を維持。holdなし、healthy=true。
- 新起動のDoneログ、Minecraft status（TCP 25565）、Minecraft本体と監視サービスactiveを確認。
- 今回は短時間比較であり、長時間生成でのメモリ再圧迫・通常プレイの余裕は未確認。再起動効果も含まれるため、改善をヒープ上限変更だけの効果とは断定しない。Prism・配布パック・ローカルサーバーのJVM引数は変更していない。

## 2026-09-06 ガラス精錬のCNM修正

- `d00b3e1`で `kubejs/data/reimagined/shape_map/glass_validation.json` を公開。通常ガラスをCNMの形変換グループから外し、Create枠付きガラスの派生扱いによる精錬レシピ削除を回避。
- ローカル候補で砂からガラスの実生成を検証。本番は全Modのハッシュが検証構成と一致することを確認し、ガラス定義だけを追加する限定反映を実施。未公開のMPI/Xaero等の変更を上書きしていない。
- ワールドを稼働中・停止後の2段階でバックアップし、停止後のlevel.datハッシュを照合。成功バックアップ: `/opt/reimagined-backups/glass-fix-20260906-131958`。
- 初回はserver.propertiesの起動日時コメント更新がバイト照合に引っかかり自動復旧。変更が日時コメントだけであることを元ハッシュ再現で確認し、設定値を厳密比較する方式で再反映。
- 13:21:43の新起動でガラスの親がminecraft:glass、通常ガラスレシピあり、砂・赤い砂ともにminecraft:glassへ一致。診断用の一時スクリプトは削除済み。
- Minecraft 1.21.1 / protocol 767の応答をSSH alias経由の一時トンネルから確認。PID 24096、音声UDP25566・Sable UDP25565、全Modハッシュ、Sawmill sort_recipes=false、MPI設定、server.propertiesの設定値を維持。chunky-idleも再開済み。
- Prism原本は未変更。今後の同期で修正が削除されないよう、同期スクリプトで今回のリポジトリ管理ファイルを保護。
## 2026-09-07 Chappy production deployment

- Published commit `9e5d39e623718e0ca0fa0924e481b701fd2bc458`; Pages run `34121488478` succeeded. Public pack, index, Chappy/Exposure metadata and both versioned local artifacts matched their local SHA-256 bytes.
- Guarded deployment used SSH alias `kagoya-minecraft`, no force option, candidate count 221 (previously 219). Retained backup: `/opt/reimagined-backups/20260907-212302`; stopped `world/level.dat` checksum verified. Candidate directory was cleaned after success.
- Current startup reached `Done (` at 21:25:46 JST. A Minecraft status query from the administrator machine through the SSH alias returned Minecraft 1.21.1, protocol 767, 0/10 players and the expected MOTD.
- Chappy SHA-256: `a95c36b7456cbbb74c3825ca1b4704164c171a1d8e9b369753c33124900757ef`. Exposure: NeoForge 1.21.1, version 1.9.18, exact Modrinth SHA-512 verified. Both are classified `both`.
- Preserved deployed MPI reimagined-2 (`c38eef229818c7be589c7e02781605967865c29188790d3bc17095d486467a8e`), Sawmill (`85eebbec566b9322a4a70223e3b9f53399d606f7a9b763ccced4f7d4a73844f8`), `sort_recipes=false`, Xaero restrictions, UDP 25566, and Chunky config/state. Chunky idle service resumed.
- Gateway is a supervised service under Unix user `chappy`, loopback 18765. ChatGPT device login completed on the VPS, model `gpt-5.6-luna`, effort `max`; Node 24.13.1 and Codex 0.144.1 are pinned. Credentials remain private on the VPS; no test world/player memory was copied.
- Production knowledge export: 14,755 items, 11,090 recipes, 0 unreadable recipes. Real AI inventory/Globe query returned successfully in 71.4 seconds using this snapshot. Some recipe/tag warnings predate this release.
- Administrator Reimagined received only the two new Mod JARs, with prior absence/backups recorded locally. Pack validation covers 271 active mods; no raw JARs in pack/mods. Clients must restart Minecraft after updating.
- Game UI/photo/book/memory behaviors were verified in local integration before rollout; production in-game interaction remains a player acceptance check.
- Real AI recipe query also succeeded in 20.9 seconds and returned the production `minecraft:crafting_table` recipe, four planks in a 2x2 layout. Gateway remained active without automatic restarts; measured memory was about 404 MiB during the smoke test.
