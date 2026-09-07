# 無人時のChunky生成

2026-09-06導入。VPS上の `chunky-idle.service` がlocalhostのRCONで人数・TPSを取得し、既存のオーバーワールド生成タスクだけを制御する。クライアント変更は不要。

## 動作

- 0人が300秒続くと `chunky continue minecraft:overworld`。
- 約1秒ごとに人数を確認し、1人以上ならpause。RCON応答待ちやサーバー負荷によって遅延する。ログインイベントへの即時反応を保証する方式ではない。
- 120秒生成、60秒休止。休止時にChunkyが進捗を保存する。
- 10秒ごとに負荷を確認。全体TPSが18.5未満、MSPTが45以上、MemAvailableが768MiB未満、空きディスクが100GiB未満なら停止。回復後も無人300秒を待つ。
- これは間欠運転でありCPU使用率の厳密な上限ではない。生成中のピークは発生する。
- RCON取得・解析失敗時はpauseを試行し、再開判断をリセットする。RCON自体が応答しない間は停止確認もできない。
- サービス起動・終了時はpause。Minecraft再起動後も無人待機からやり直す。Chunkyの `continueOnRestart=false` を維持する。
- 対象は円形半径10000、中心(0,0)。2026-09-06にseed `5768409083084640829` の新ワールドへ切り替え、その後ユーザー依頼で半径4096から10000へ拡大した。既存チャンクを保持したまま新範囲のタスクを作成し、無人時の自動運転へ戻した。変更前のChunky設定・タスクは `/opt/reimagined-backups/chunky-radius-20260906-155048/chunky` に保存。新規タスク開始や範囲拡大は自動では行わない。

## 運用

SSH先は必ず `kagoya-minecraft`。

```powershell
# 現在の人数、Chunkyの進捗、監視状態
ssh kagoya-minecraft 'python3 /usr/local/lib/reimagined/chunky-idle.py status'

# 自動再開を禁止し、生成を停止（再起動後も保持）
ssh kagoya-minecraft 'python3 /usr/local/lib/reimagined/chunky-idle.py hold'

# 無人時の自動運転へ戻す
ssh kagoya-minecraft 'python3 /usr/local/lib/reimagined/chunky-idle.py resume'

# ログ
ssh kagoya-minecraft 'journalctl -u chunky-idle.service -n 40 --no-pager'

# 自動制御を無効化。終了処理で生成もpauseする
ssh kagoya-minecraft 'systemctl disable --now chunky-idle.service'
```

手動で長期間止めるときは単独の `/chunky pause` ではなく `hold` を使う。単独のpauseは次の自動再開対象になる。人数がいるときの手動start/continueとは併用しない。

プログラムは `infra/chunky-idle.py`、サービス定義は `infra/chunky-idle.service`。Python標準ライブラリのみ使用。監視はminecraftユーザーで動き、RCONパスワードは既存server.propertiesから読み、ログやリポジトリには保存しない。

## デプロイとの連携

`infra/deploy-vps.sh` と監視は `/opt/reimagined/.maintenance.lock` を共有する。デプロイ中は監視を停止して生成をpauseし、終了時に監視を戻す。holdは解除しない。

配備・ロールバックのrsyncでは `config/chunky/` を保護する。候補作成後の進捗が古いコピーに戻るのを防ぐ。ワールド自体を過去へ復元する場合は対応するChunky進捗も別途整合させること。

## 検証・バックアップ

- 導入前バックアップ：`/opt/reimagined-backups/chunky-idle-20260906-024555`。
- `save-off` → `save-all flush` → world.tar作成 → level.datのSHA-256照合 → `save-on`。既存Chunky設定と旧デプロイスクリプトも保存。
- Minecraft本体の停止・再起動、Modpack公開は行っていない。
- `infra/test-chunky-idle.py` は待機・人数増加・健康条件・手動保留・間欠運転を検証。
- `infra/test-chunky-live.py` は明示的な運用テスト用。実際の生成を行うため通常の自動テストに組み込まない。監視サービス停止中かつ無人時のみ実行。テスト内で待機時間を短縮し、人数1を模擬入力して停止を確認する。
- 実テストで保存済み処理数37,353から37,754へ進行し、休止・再開・模擬人数増加時のpauseを確認。実プレイヤーの入退室を使った試験は未実施。

初回導入用 `infra/install-chunky-idle.py` はアップロード済み候補を配置するためのもの。稼働中の監視の更新には、先に監視を停止してからファイルを配置すること。
