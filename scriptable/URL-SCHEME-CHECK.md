# ショートカット経由アプリの URL 調査

## 調べるリスト（29 個）

### 優先（iPhone・iPad のセットに入っているもの）
1. Nothing X
2. MUJI（無印良品）
3. setlog
4. 大学生協アプリ（univcoop）
5. 楽天ペイ

### Apple 標準
6. カメラ
7. FaceTime
8. 電話
9. パスワード
10. Image Playground
11. プレビュー
12. ゲーム（Apple Games）
13. リモコン（Apple TV Remote）
14. iCloud Drive（ファイル）
15. Apple Vision Pro

### 勉強・仕事
16. TOEIC公式教材（TOEIC Official App）
17. manabo
18. トルミル
19. Windows にリンク（Link to Windows）

### AI
20. Manus
21. Genspark

### エンタメ
22. Nintendo Switch App
23. Nintendo Store（My Nintendo Store）
24. CDレコ

### お金・生活
25. みずほ銀行（みずほダイレクト）
26. ゆうちょ通帳
27. My UQ mobile
28. Anker soundcore
29. アールシフト（R-Shift）

## Gemini に送る文

```
iPhone / iPad（iOS 26）で、下のアプリを「URL スキーム」で直接開きたいです。
各アプリの URL スキーム（例：notion://、spotify://）を調べてください。

条件：
- アプリのトップ画面が開くだけでよい（特定の画面への深いリンクは不要）
- 推測ではなく、根拠がある情報を優先してください（公式ドキュメント、アプリの Info.plist に書かれた CFBundleURLSchemes、開発者の発言、信頼できる URL スキーム一覧サイトなど）
- 見つからないものは無理に作らず「不明」と書いてください
- https のユニバーサルリンクでアプリが開く場合は、それも書いてください
- 候補が複数あるときは、すべて書いてください

出力は次の表の形でお願いします：
| No | アプリ名 | URL スキーム | 根拠（出典の URL など） | 確実度（高・中・低） |

アプリ一覧：
1. Nothing X
2. MUJI（無印良品の公式アプリ）
3. setlog
4. 大学生協アプリ（全国大学生活協同組合連合会）
5. 楽天ペイ
6. カメラ（Apple 標準）
7. FaceTime
8. 電話
9. パスワード（Apple 標準、iOS 18 以降）
10. Image Playground
11. プレビュー（Apple 標準、iOS 26）
12. ゲーム（Apple Games、iOS 26）
13. Apple TV Remote（リモコン）
14. iCloud Drive（ファイル App）
15. Apple Vision Pro アプリ
16. TOEIC 公式教材アプリ（TOEIC Official App）
17. manabo
18. トルミル
19. Windows にリンク（Link to Windows）
20. Manus
21. Genspark
22. Nintendo Switch App
23. My Nintendo Store
24. CDレコ（I-O DATA）
25. みずほダイレクト（みずほ銀行）
26. ゆうちょ通帳アプリ
27. My UQ mobile
28. Anker soundcore
29. アールシフト（R-Shift）
```

## 結果の確かめ方
Gemini の答えは外れていることもあるので、Safari のアドレス欄に入れて試します。
「"〇〇"で開きますか？」と出てアプリが開けば使えます。
