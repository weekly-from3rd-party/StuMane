# 提案Bの3Dモデル（分解図）

`index.html` をブラウザで開くと、提案B（Choc V2 19mm・右手34mmトラボ）が「組み立て → 分解 → 組み立て」を繰り返す。ドラッグで回転、ホイール/ピンチで拡大。
`fetch('scene.js')` を使うので、ファイルを直接開かずにローカルサーバー経由で開く（例: `python3 -m http.server` をこのフォルダで実行して http://localhost:8000/ ）。

- キーの位置・角度、コントローラとトラボの位置は Auto-KDK に渡している `../autokdk/build_autokdk.py` と同じ。
- 部品の寸法は概略。ケースはキー外周の凸包で近似しているので、Auto-KDK が出すケース（STL）とは形が違う。実物の形は Auto-KDK の CASE 画面か、Generate で出る STL を見る。
- 再生成: `python3 build_model.py`（`scene_template.js` と `index_template.html` から `scene.js` と `index.html` を作る）
- スクリーンショット: `node ../tools/model_screenshot.js . <node_modules/three> <出力接頭辞>`
