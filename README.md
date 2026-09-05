# Reimagined サーバー

このフォルダに Minecraft 1.21.1 / NeoForge 21.1.244 の専用サーバーを構築しています。
元の構成は PrismLauncher の `Reimagined`（パック 1.21.50）で、追加Modも含めた2026-09-05時点のコピーです。

## 起動と接続

1. `start-server.bat` をダブルクリックします（`run.bat` からも起動できます）。
2. コンソールに `Done (...)!` と表示されるまで待ちます。
3. PrismLauncher の元の Reimagined を起動し、「マルチプレイ」で `localhost:25565` に接続します。
4. 終了時はサーバーのコンソールに `stop` を入力し、保存と終了を待ちます。

LAN内の別PCからは、このPCのLAN IPアドレスと `:25565` を指定します。
ファイアウォールやルーターの設定は変更していません。インターネット経由の接続は別途ネットワーク設定が必要です。

Linuxサーバーへの配置では `start-server.sh` を使用します。systemdユニットの原本は `setup/reimagined.service` です。

## packwiz管理

管理用Prismインスタンスは `C:\Users\emb20\AppData\Roaming\PrismLauncher\instances\Reimagined`、packwizの正本はこのリポジトリの`pack`です。
Prism側を直接の配布元にはせず、Modや共有設定を変更した後に次を実行します。

```powershell
.\scripts\sync-from-prism.ps1
.\scripts\test-pack.ps1
```

初回変換では元CurseForge manifestの261件を取り込み、管理用インスタンスで後から追加されたModも照合しました。
現在の有効Mod 265個は、配布元を持つ`.pw.toml` 264個と自作のLocal Mod Translator JAR 1個で構成されています。
無効化されている`.jar.disabled`は取り込みません。

`distribution.toml`がclient/server/both分類の監査用レジストリです。packwizメタファイル自身にも同じ`side`を設定しています。
現在の分類は、稼働確認済みサーバーを作成した際の`setup/mod-manifest.csv`を基準にしています。

GitHub Pagesのpack URLは `https://u210.github.io/reimagined-pack/pack.toml` です。
Prismの起動前コマンドは次を使用します。

```text
"$INST_JAVA" -jar packwiz-installer-bootstrap.jar https://u210.github.io/reimagined-pack/pack.toml
```

VPS自動デプロイはまだ未設定です。管理用Prismインスタンスへの起動前コマンド設定は、初回配布テスト後に行います。

`.github/workflows/pages.yml`は、`main`へpushされた`pack`ディレクトリだけをGitHub Pagesへ公開します。
リポジトリ作成後、GitHubの`Settings` → `Pages` → `Build and deployment`でSourceを`GitHub Actions`に設定します。

配布用Prism ZIPは次で再生成できます。

```powershell
.\scripts\build-client-bootstrap.ps1
```

生成物は`dist/Reimagined-Packwiz.zip`、公開URLは `https://u210.github.io/reimagined-pack/downloads/Reimagined-Packwiz.zip` です。
このZIPは管理用インスタンスとは独立しており、初回起動時にpackwizからclient/bothファイルを取得します。

## KAGOYAへのデプロイ

`ssh kagoya-minecraft` の `/opt/reimagined` に配置し、systemdの `reimagined.service` として稼働します。
接続先は `133.18.166.158:25565` です。SableはUDP 25565、Plasmo VoiceはUDP 25566を使用します。

管理コマンド:

```bash
ssh kagoya-minecraft 'systemctl status reimagined'
ssh kagoya-minecraft 'journalctl -u reimagined -f'
ssh kagoya-minecraft 'systemctl restart reimagined'
ssh kagoya-minecraft 'systemctl stop reimagined'
ssh kagoya-minecraft 'systemctl start reimagined'
```

OS起動時の自動起動は有効です。Java 21を使用し、サーバーファイルは専用の`minecraft`ユーザーが所有します。
UbuntuのUFWは無効で、外部からTCP 25565のMinecraft status応答を確認済みです。
`white-list=false`のため、アドレスを知っている正規アカウントは参加できます。

## 設定

- Java: `C:\Users\emb20\AppData\Roaming\PrismLauncher\java\java-runtime-delta\bin\java.exe`（21.0.7）。移動・削除した場合は `start-server.bat` を修正してください。
- メモリ: 初期2GB / 上限6GB。`user_jvm_args.txt` で変更できます。
- ゲーム接続: TCP 25565。Sableの通信にはUDP 25565も使用します。オンライン認証有効、最大10人、描画距離8、シミュレーション距離6。
- 新規ワールド: `world`。元インスタンスのセーブデータは移行していません。
- EULA: ユーザーの同意を受けて `eula=true` に設定済みです。
- Plasmo Voice: UDP 25566。SableのUDP 25565と競合したため変更しています。設定ファイルは `config/plasmovoice/server/config.toml` です。実クライアント間の音声通信は未検証です。

## コピーした内容

有効なMod JARからクライアント専用52個を除外し、213個を導入しました。無効化されていた11個は除外しています。
ファイル別の採否と元ファイルのSHA256は `setup/mod-manifest.csv` に記録しています。
共有ライブラリやサーバー連携機能を持つModは残しています。

`config`、`defaultconfigs`、`kubejs`、`datapacks`、`moonlight-global-datapacks`、`coremods`、`tlm_custom_pack` をコピーしました。
Paxi設定により、ルートの `datapacks` 内のデータパックも読み込みます。
元インスタンスのファイルは変更していません。以後クライアントにModを追加・更新した場合は、サーバー側も対応する更新が必要です。

`setup/prepare.ps1` は初回コピーの記録用です。既存サーバーへの同期用ではありません。
ワールド・設定・Modなどをバックアップしてから更新してください。

導入手順の参照: [NeoForge公式サーバー導入ガイド](https://docs.neoforged.net/user/docs/server/)。

## 確認範囲と注意点

ログイン時の「無効なプレイヤーデータ」対策として、サーバーのSawmill JARに局所修正を適用し、`config/sawmill-common.toml` の `sort_recipes=false` を設定しています。クリエイティブタブ順へのレシピ並べ替えを無効化する修正です。詳細と元ファイルのバックアップは `setup/sawmill-fix.md` および `setup/sawmill-fix` にあります。このJARだけは元クライアントのハッシュと異なります。

確認記録は `setup/validation.md` を参照してください。ゲームクライアントでのログインや実プレイ、外部ネットワーク接続は未検証です。
元パック由来のReliable Remover設定解析エラー、Curiosのspellbookスロット警告、未導入Modのアイテムを参照する一部ルートテーブルなどのエラーが残っています。
サーバーの起動を妨げてはいませんが、該当コンテンツに影響する可能性があります。クライアントとの構成を維持するため、Mod追加やゲーム内容の変更は行っていません。

