# Auto-KDK 用データ（提案B）

| ファイル | 内容 |
|---|---|
| `proposal-b.autokdk.json` | **これを使う。** Auto-KDK の「Import」で読み込む提案B（53キー、無線分割、右手34mmトラボ） |
| `proposal-b-encoder.autokdk.json` | 左手に encoder モジュールを有効化した実験版。Auto-KDK は読み込んでも表示しない（下記） |
| `build_autokdk.py` | 上の JSON を `../layouts/build_layouts.py` の座標から生成する |

```
python3 build_autokdk.py > proposal-b.autokdk.json
node ../tools/autokdk_import.js proposal-b.autokdk.json /tmp/check   # 干渉チェックと画面
node ../tools/autokdk_route.js  proposal-b.autokdk.json /tmp/route   # 自動配線
```

## 確認済み（Auto-KDK ver 2026-11-08）
- Import すると左右とも提案Bの形で読み込まれる。干渉チェックは左右とも **0 errors · 0 warnings**。
- 自動配線（Start Routing）は左右とも **Success to route**。
- ピン: 左 5行＋6列＝11本（上限18）、右 11本（トラボありの上限14）。
- 右手にトラボを置くので、**右手が Central（親機）**。ZMK Studio で設定するときは右手を USB につなぐ（Auto-KDK README 4.14）。

## 決めずに残していること
- スイッチ: JSON は `mx-19`（Cherry MX）。Choc V2 / Gateron LP 3.0 にするなら Auto-KDK の Switch Type で変える。
- ケース: チルト5°、テント0°、インテグレーテッドマウント。手に合わせて Case Editor で調整する。
- 名前: `propB`（英数字15文字まで）。

## ツマミ（ロータリーエンコーダー）でスクロールする案
Auto-KDK はエンコーダーを配置できない。拡張モジュールの選択肢は Trackball / Trackpad / Pointing Stick のみ。
データ形式には `encoder` の欄があるが、有効にして Import しても画面にも基板にも出ない（2026-11-08 に確認）。

そのため、ツマミは **Auto-KDK で作った後に足す改造** になる。見込みは次のとおり。
1. **ピンは空いている。** 左手は18本中11本しか使わず、トラボ用の拡張ポート（FFC 6ピン、IO 4本は共用）も左手側は未使用。EC11 は A・B・GND の3本（押し込みスイッチを使うならもう1本）で足りる。
2. **ファームは対応できる。** ZMK は分割の子機（左手）のセンサーのイベントも親機に送る（ZMK Docs: Split Keyboards）。左手の overlay に `alps,ec11` を足し、keymap の `sensor-bindings` にスクロールを割り当てる。ZaruBall も左手の EC11 で同じことをしている。
3. **未確認で、作業が要るところ**
   - 拡張ポートのどのピンが IO か: Auto-KDK が生成するファームの右手の設定（トラボの SPI ピン）から読む。
   - 配線: FFC の変換基板から EC11 へ手配線する。
   - 取り付け: ケースにツマミの穴と固定部が要る。STL を加工するか、別パーツを 3D プリントする。

**進め方の提案:** 1台目はまず「ボールでスクロール（MOUSE レイヤーで Scroll を押す間）」で組み立てて動かす。全キーとトラボが動くことを確認したら、左手にツマミを足す。その時点では生成ファームが手元にあるので、ピンを根拠つきで決められる。
