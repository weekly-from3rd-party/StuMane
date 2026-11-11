# 自作分割キーボード（1台目）— Claude への指示

このディレクトリは自作分割キーボード1台目の作業場所。リポジトリの他の部分（Scriptable など）とは無関係。

## プロジェクトの前提
- 設計は Auto-KDK（https://auto-kdk.pages.dev/）。基板・ケース・ファーム設定まで自動生成、配線も自動。
- コントローラは Auto-KDK 無線版（nRF52840、ZMK）を2枚。分割、右手親指トラックボール1個。
- 製造: 基板＋部品実装は JLCPCB、ケースは JLC3DP。
- **配列は提案B（roBa＋数字行、53キー：左28／右25）に決定。** Auto-KDK 用は `autokdk/proposal-b.autokdk.json`。
- レイヤー案は `layouts/keymap-proposal-b.*`（BASE / NUM テンキー / SYM / NAV / MOUSE）。
- スクロールは、まずボール（MOUSE レイヤー）。左手のツマミ（EC11）は組み立て後の改造として計画（`autokdk/README.md`）。
- 使う機器: iPhone、iPad、Windows（Bluetooth の接続先を切り替えて使う）。Windows は Dell ノートで **JIS 配列**（OS も日本語キーボード設定）。
- 記号は JIS 配列用のキーコードで実装する（`firmware/jp_keys.h`）。iPad/iPhone もハードウェアキーボードを JIS にそろえる（実機で要確認）。
- OS 切替: NAV の「iPad⇄Win」で IPAD レイヤーを切替（⌘ と Ctrl の位置を入れ替え）。NUM と重なると NUM_IPAD が自動で入る。
- 日本語入力の切替: 英数＝LANG2＋無変換、かな＝LANG1＋変換 を続けて送る。Windows は IME 設定で 無変換→IME-オフ、変換→IME-オン にする。
  iPadOS で LANG1/LANG2 が効くかは未確認。実機で試す（だめなら Ctrl+Space 等）。
- **スイッチは Choc V2（19mm ピッチ）に決定。** 理由: 基本は机だが持ち歩きもする。19mm なので MX 軸の薄型キーキャップが使える。
  **Choc V2 用ソケットは JLCPCB に送って実装してもらう**（ユーザー決定）。ダイオードも JLCPCB の自動実装。
- 3D モデル（分解図・概略寸法）: `model/index.html`、生成は `python3 model/build_model.py`。
- Claude の担当: ZMK ファームの拡張（スクロール、トラボ感度、レイヤー、日本語入力）、キーマップ設計、生成データの解説と検証。

## 作業の原則
1. **根拠を示す。** ピン配置・部品・設定は、製造データ・公式ドキュメント・参照リポジトリのファイル名と行を添えて答える。記憶だけで断定しない。
2. **別の方法で確かめる。** 数値や対応表は、計算や別資料で確かめてから出す（例: 予算の合計は式で出す）。
3. **未確認は未確認と書く。** 推測は推測と明記する（例: トラボ位置の「概略」）。
4. **踏んだ罠は下の「罠と対処」に追記する。** 対処法も一緒に書く。

## 守ること（安全・発注）
- Li-Po 電池は保護回路付き 1S、400mAh 以上、6×31×52mm 以内、PH 2ピン（2mm）。挿す前に＋−の向きを確認。組み立て中は電池と USB を外す。
- 発注前に「無線版コントローラを選んでいるか」を再確認する（参考記事で取り違えが起きた）。
- 無線版でトラボを置いた側は「行数＋列数」14本まで。
- ケースに入れる前に、基板単体で全キーとトラボを確認する。

## ツール（クラウド環境）
- 新しいコンテナでは最初に `bash tools/setup.sh` を実行する。
- 配列図: `python3 layouts/build_layouts.py`（keymap-drawer で SVG を出力）。
- Auto-KDK の画面確認: `node tools/autokdk_screenshot.js <出力.png>`。
- Auto-KDK に JSON を読み込んで干渉チェック: `node tools/autokdk_import.js <json> <接頭辞>`、自動配線: `node tools/autokdk_route.js <json> <接頭辞>`。
- レイヤー図: `python3 layouts/keymap_proposal_b.py`。
- ネットワーク許可済み: auto-kdk.pages.dev, zmk.dev, deepwiki.com, booth.pm, zenn.dev, qiita.com, note.com, ZaruBall の Notion ページ。GitHub の公開リポジトリは `git clone` で読める。

## 参照リポジトリ
- roBa: https://github.com/kumamuk-git/zmk-config-roBa
- ZaruBall: https://github.com/ImSota/zmk-config-ZaruBall （解説: ZaruBall v3 の Notion ページ）
- Auto-KDK: https://github.com/sekigon-gonnoc/auto-kdk （トラボは manual/TrackBall.md）

## 罠と対処
- roBa は「5列＋内側1列」で、外側（Tab/Shift）の列は無い。最初の配列図で外側の列があるものとして描き、roBa.keymap で確認して直した。→ 配列の話は dtsi と keymap を読んでから。
- ZaruBall の dtsi は左32位置（公称は左31キー＋エンコーダー）。差の1位置はエンコーダー押下と思われるが未確認。
- Auto-KDK（2026-11-08 版）の拡張モジュールは Trackball / Trackpad / Pointing Stick のみ。データ形式に `encoder` 欄はあるが、有効にして Import しても表示されない。
- Auto-KDK の JSON のモジュール座標 (x, y) は **中心**（左上ではない）。最初は左上と思って作り、トラボがキーに重なった。→ Import して Placement Editor の目盛りで確かめる。
- 親指キー L1-Spc の隙間がキーキャップで 0.4mm になり警告が出た → 0.04〜0.06U 離して解消。
- 右手にトラボを置くと右手が Central（親機）。ZMK Studio は右手を USB につなぐ。
- Choc V2 にしたら左手の ROW4 が自動配線できなかった。コントローラの位置を変えても、基板を広げても駄目で、左コントローラの向きを side-2→side-1（コネクタが左＝外側）にしたら通った。右手はコントローラを数字行の右端（"0"）の列に合わせると通った。
- スイッチ種類を変えるとケースの寸法（topHeight など）も変わる。値は Auto-KDK で切り替えて Export したものを使う（`tools/autokdk_export.js`）。
- Playwright のスクリプトをシェルの heredoc で書くと、安全チェックに止められることがある → ファイルに書いてから実行する。
- pip で keymap-drawer を入れると Debian の pyparsing と衝突する → `--ignore-installed pyparsing` を付ける。
