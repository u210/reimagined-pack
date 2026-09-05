# Sawmillログイン時エラーの回避修正

2026-09-05の13:46のログイン失敗では、Sawmill 1.21-1.7.7のデータ同期がクリエイティブタブの構築を呼び出し、Caverns & Chasms 3.0.0のCCCreativeTabsが未ロードの設定を参照してIllegalStateExceptionになりました。MinecraftはこれをInvalid player dataとして表示しました。

元JARのjavap結果で、RecipeSorter.sendOrderToClientがSORT_RECIPESの設定を確認せずrefreshIfNeededを呼び出すことを確認しています。設定のみの変更では回避できません。

修正はRecipeSorter.refreshIfNeededの先頭にSORT_RECIPESがfalseならreturnする分岐を挿入し、サーバーのconfig/sawmill-common.tomlでsort_recipes=falseを指定するものです。
Sawmillのクリエイティブタブ順への並べ替えを無効化します。レシピやブロックは削除せず、ネットワークの型・バージョンは変更しません。

生成ソースはsetup/PatchSawmill.java。ローカルJDK17のjavacと既存NeoForgeライブラリのASM 9.10.1で生成します。元JARと元設定はsetup/sawmill-fixにバックアップしています。
ZIP内の全エントリを比較し、RecipeSorter.classの1ファイルだけが変わり、その他のエントリの内容と数が一致することを確認済みです。

この修正はサーバー専用です。元のPrismLauncherのJARは変更しません。今後Sawmillを更新するときは、上流で修正済みか確認してからこの回避修正を見直してください。

ユーザーによる停止後、2026-09-05 13:53 JSTに修正JARと設定を反映しました。適用時のハッシュは `setup/sawmill-fix/installed.json` に記録しています。

13:55:30に修正版で起動完了し、Minecraft status応答とPlasmo Voice UDP 25566の起動を確認しました。
13:55:59にJellyfish14の `joined the game`、13:56:11にPlasmo Voice接続を確認。status応答もオンライン1人になり、今回の未ロード設定例外は再発していません。サーバーは稼働を継続しています。

参考となる上流コード: https://github.com/MehVahdJukaar/sawmill/blob/1.21/common/src/main/java/net/mehvahdjukaar/sawmill/RecipeSorter.java
