# チャッピー — ローカル統合検証版

Minecraft 1.21.1 / NeoForge 21.1.244 / Java 21。Codex App ServerへChatGPTログインで接続。
現在のモデルはユーザー指定の `gpt-5.6-luna` / `max`。

## 使える機能

- `/chappy summon` でチャッピーを召喚。ワールド全体で既定1人、`maxGuides`で複数人に対応。
- 右クリック画面は入力欄・「送信」・「写真」。送信が受理されると自動で閉じる。
- 回答は質問者だけに `チャッピー: 文章` と表示。質問は全体チャットに流さない。
- 質問者だけに受付・調査中の粒子と進捗ネームプレートを表示。
- 必要に応じて質問者の送信時点の持ち物・手持ち・装備・個数を参照。
- 実際に読み込まれたアイテム・タグ・レシピ・Modのバージョンを検索。
- 導入JARと一致するPatchouli説明書、日本語tooltip、数値・真偽値設定を検索。
- 周辺4ブロックの読み込み済みブロックと視線先を参照。状態プロパティと対応設備の蓄電量を確認。
- 拠点名・計画・呼び方などの短い記憶を、ワールド内でUUIDごとに永続保存。最大20件、各300文字。
- `/chappy memory` で本人の記憶を確認。`/chappy forget` で本人の記憶と会話を全削除。
- ログインごとに短期会話は新規作成し、長期記憶だけを引き継ぐ。切断・削除後の古い応答は破棄。
- 「本にして」「本でまとめて」で会話を要約した署名済みの本を渡す。持ち物が満杯なら足元へ通常ドロップ。
- 「写真」で持ち物のExposure写真を選択して質問に添付。現像済みの単体写真に対応。写真は消費しない。

## 検証環境

| 用途 | Prism名 | 接続先 |
| --- | --- | --- |
| 最小構成（Minecraft・NeoForge・Chappy・Exposure） | Chappy ローカル開発 | `127.0.0.1:25575` |
| Reimaginedのコピー | Chappy Reimagined 統合検証 | `127.0.0.1:25578` |

コピーのインスタンスIDは `Chappy-Dev` と `Chappy-Dev-Reimagined`。
管理用Reimagined、packwiz、VPS本番は変更していない。
統合用サーバーは通常のNeoForge起動を使う。Sinytra ConnectorがGradle開発起動に対応しないため、
`start-integration.ps1`から起動する。既存SawmillサーバーパッチとMPI修正版を保持。
統合環境のPlasmo VoiceはループバックUDP 25587。

### 起動

このディレクトリでそれぞれ別のターミナルから実行する。

```powershell
.\scripts\start-gateway.ps1
.\scripts\build.ps1 -Task runServer
# Reimagined統合環境はこちら
.\scripts\start-integration.ps1
```

Minecraftサーバーを終了するにはコンソールで `stop`。GatewayはCtrl+C。
PrismクライアントはJAR更新後に再起動する。通信バージョンは3で、旧クライアントとの接続は拒否する。

### 一通りの操作

1. `/chappy summon` 後、右クリックしてアイテムの作り方を聞く。
2. 「この世界のExposureの設定を調べて」と聞き、出典とバージョンを確認。
3. 「拠点名は○○。覚えておいて」と話し、`/chappy memory`で確認。
4. 再ログインし「拠点名を覚えてる？」。`/chappy forget`後は記憶が消える。
5. 会話後に「本でまとめて」。持ち物が満杯なら足元へ落ちる。
6. Exposureで撮影・現像した単体写真を持ち、「写真」から持ち物の枠番号を選ぶ。
7. 「この施設の配置はどう？」と入力して送信。外観と近くの設備状態を区別して回答する。

写真一覧にない場合は未現像のフィルム・写真の束・アルバムではなく単体写真を持つ。
外部テクスチャ参照やファイルパス指定の写真には対応しない。

## 情報の範囲と制限

- レシピは現在のRecipeManagerの実オブジェクトをシリアライズする。起動・reloadごとの
  snapshot IDが一致する情報だけを参照し、他ワールドへフォールバックしない。
- 一部Modは種別IDを登録していないため、`typeUnavailable`を付けて本文を保持する。
  レシピの存在だけで実際に設備が動くことまで保証しない。
- 金床・醸造・取引・ドロップ・独自内部処理など、RecipeManager外の仕様は未対応。
- 説明書は導入版の基準仕様。変更済みレシピは実レシピを優先する。
- 設定は同じMod名のTOMLにある数値・真偽値だけ。秘密情報に関係するキー、文字列は除外。
  ディスク上の値であり、Modの実効値と一致するとは限らない。更新後はreloadまたは再起動で再収録。
- JAR内のPatchouli説明書と日本語tooltipが対象。外部Wiki・任意のソースコード・独自説明書形式は未収録。
- 周辺情報は送信時点、近い順に最大128ブロック。写真の撮影場所や撮影時点とは別の場合がある。
  未読み込みチャンクを生成しない。内部在庫や他プレイヤーの情報は取得しない。
- 写真は本人が選択した持ち物からサーバーが取得。最大512×512のPNGをその質問だけの画像入力として送る。
- 写真・資料・記憶はデータとして扱い、記載された命令を実行しない。回答や本もリテラル文字列のみ。
- 記憶はワールドの`data/chappy_memory.dat`。Gatewayの一時更新は回答成功後にMinecraft側で保存する。
- 利用上限：同時2問、同一プレイヤーの多重送信禁止、質問1000文字、回答12000文字、1会話40ターン。
- 資料検索の件数指定は最大20件に制限し、50件などの指定でも検索を実行する。引数エラーはスキーマを返し、同じ失敗を再実行しない。
- 調査は原則6回以内。8回のツール実行・40秒経過・引数エラー2回のいずれかで追加調査を止め、確認済みの情報と不明点で回答するよう促す。全体の80秒制限は維持。
- ゲーム側では時間切れ・認証不備・混雑・接続失敗を別の案内文で表示する。
  AI接続障害では短期会話を作り直すが、保存済み長期記憶は残る。

## 再現とテスト

```powershell
.\scripts\build.ps1
node --test gateway/*.test.mjs
.\scripts\validate-runtime.ps1
# 初期構築。既存の管理用インスタンスは読み取りのみ。
.\scripts\prepare-local.ps1
# 統合コピーを初めて作るときだけ。既存コピーがあれば上書きを拒否する。
.\scripts\prepare-integration.ps1
.\scripts\configure-local-gateway.ps1
# 実AI検証（ログイン済みCodexの利用枠を使用）
node --env-file=runtime/gateway.env gateway/smoke-extensions.mjs
node --env-file=runtime/gateway.env gateway/smoke-integration.mjs
```

Exposure 1.9.18は`prepare-dependencies.ps1`が公式Modrinth配信のSHA512を検証。
Nodeは標準ライブラリのみ。追加npm依存なし。
初回ChatGPT認証は`login-chatgpt.ps1`。認証情報は`runtime/codex-home`に保存し、
デスクトップCodexのアカウント・履歴・ツールを共有しない。

Gatewayは`127.0.0.1:18765`、Bearer認証付き、ブラウザーOrigin拒否。
`CHAPPY_KNOWLEDGE_FILES_JSON`の最大4ファイルだけを検索し、AIからパスは指定できない。
Codexのシェル・ファイル編集・Web・外部アプリは無効。独自のMinecraftツールのみを提供する。
画像や記憶を公開用の知識ファイルに混ぜない。

### 検証結果（2026-09-07）

- ビルドと日本語・絵文字の本ページ分割チェック成功。
- Node 29テスト成功：認証、セッション分離、切断、上限、画像入力、記憶分離、資料の版一致、周辺情報制限、検索件数補正、再試行抑制、時間切れ分類。
- 隔離した実Minecraft+Exposureで、記憶save/load・他UUID分離・削除、本の交付・満杯時ドロップ、
  Exposure画像取得・PNG変換・不正ID拒否・周辺状態取得が成功。
  記録：`runtime/validation-server/selftest-passed.txt`。
- Luna/maxで画像の左が赤・右が青と認識。拠点名を保存し、新規セッションでの再参照が成功。
- Reimaginedコピーで通常サーバー起動に成功。約1.5万アイテム・1.1万レシピ・378資料・2.3万翻訳を収録。
- 実AIが統合サーバーのExposure 1.9.18と`print_time_color = 160`を、正しい出典付きで回答。
- 検索引数修正後、Luna/maxでGlobeの相談が約42秒、Exposure設定の相談が約41秒でHTTP 200。再現用：`gateway/smoke-timeout-regression.mjs`。
- 実クライアントでの写真選択画面と本のページ表示、複数実プレイヤーでの同時操作は手動確認が残る。
- Reimaginedの起動ログには既存のMod互換警告と一部レシピ読込エラーがある。サーバー起動成功と
  Chappyの情報取得を確認しており、パック全体の全レシピ正常動作を保証するものではない。

仕様参考：[Codex App Server](https://learn.chatgpt.com/docs/app-server)、
[Exposure 1.21.1 source](https://github.com/mortuusars/Exposure/tree/1.21.1)。
