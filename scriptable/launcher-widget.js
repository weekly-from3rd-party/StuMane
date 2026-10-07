// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: th-large;

/* ============================================================
   LAUNCHER ― Nothing 白基調 アプリランチャーウィジェット
   ------------------------------------------------------------
   1 つのウィジェットに複数のアプリを並べ、タップした場所の
   アプリを開きます（Scriptable 用）。

   対応サイズ
     中：8 個 / 大：16 個 / 特大（iPad）：24 個
     小：iOS の仕様で 1 か所しかタップできないため、タップすると
         Scriptable が開き、一覧から選んで開きます（2 タップ）
     ロック画面：対応しません

   アプリの組み合わせ（セット）
     Scriptable で ▶ →「アプリを編集」で編集画面（一覧）が開きます。
       ・いちばん上の「セット：○○ ▾」… セットの切り替え・作成・名前変更・削除
       ・アプリの行 … タップで表示名・開く先・アイコン・色を変更、↑↓ で並べ替え、✕ で外す
       ・「＋ アプリを追加」… 種類ごとの一覧からタップで入れる・外す（✓ が入っている印）
       ・その中の「✎ 選択肢を編集」… 一覧に出すアプリ（選択肢）の追加・変更・並べ替え・外す・種類の作成
         （iCloud の launcher/catalog.json。初めて開いたときに、今セットに入っているアプリも「自分で追加」に入れる）
     名前付きのセット（例：勉強・生活）はいくつでも作れ、
     iCloud（launcher/sets.json）に保存して iPhone と iPad で共有します。
     ウィジェットの Parameter にセット名を入れると、そのセットが出ます。

   最初のセット「すべて」の中身（初期に戻したときもこれ）
     下の CONFIG.apps。書き換える場合の書き方：
       label … 表示名（英大文字 6 文字程度まで）
       icon  … SF Symbols の名前（「SF Symbols」アプリで探せます）
       url   … 開く URL（"calshow:" はカレンダーの今日）
       style … "invert"（黒地に白）/ "accent"（赤）/ 省略（白地に黒）
       image … 自分で選んだ画像（▶ →「アプリを編集」→ アイコン →「写真から選ぶ」で入る）
     URL で開けないアプリは、ショートカットアプリで「App を開く」だけの
     ショートカットを作り、url を "shortcuts://run-shortcut?name=名前" にします。

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     勉強  … そのセットを表示（入れなければ最初のセット）
     2     … 2 ページ目（中は 9〜16 個目、大は 17〜32 個目）を表示
     dark  … 暗色テーマ（文字が白。暗い壁紙向け）
     透明  … 背景を透明に（設定方法は TODAY / TOMORROW と同じ）
     例）勉強,2　／　透明,生活

   アプリ内で ▶ 実行すると、アプリを開く・サイズを選んでプレビューができます。
   ============================================================ */

// ---------- 設定 ----------
const CONFIG = {
  theme: "light",   // "light"（白基調・既定）/ "dark"
  apps: [
    { label: "CAL",    icon: "calendar",           url: "calshow:" },
    { label: "TODO",   icon: "checklist",          url: "x-apple-reminderkit://" },
    { label: "NOTION", icon: "doc.text",           url: "notion://", style: "invert" },
    { label: "CLAUDE", icon: "sparkle",            url: "claude://", style: "accent" },
    { label: "STUDY",  icon: "graduationcap",      url: "https://weekly-from3rd-party.github.io/StuMane/", style: "invert" },  // STUDYMANAGER（Web アプリ）
    { label: "NOTES",  icon: "pencil.and.outline", url: "goodnotes://" },
    { label: "MUSIC",  icon: "music.note",         url: "music://" },
    { label: "CLOCK",  icon: "clock",              url: "clock-alarm://" },
    { label: "PHOTO",  icon: "photo",              url: "photos-redirect://" },
    { label: "SET",    icon: "gearshape",          url: "App-prefs:" },
    { label: "MARU",   icon: "circle.circle",      url: "shortcuts://run-shortcut?name=" + encodeURIComponent("丸ポップ") },  // ショートカット「丸ポップ」を作る
    { label: "MAPS",   icon: "map",                url: "maps://" },
    { label: "WTHR",   icon: "cloud.sun",          url: "weather://" },
    { label: "MAIL",   icon: "envelope",           url: "message://" },
    { label: "HEALTH", icon: "heart",              url: "x-apple-health://" },
    { label: "STORE",  icon: "bag",                url: "itms-apps://" },
    { label: "FILES",  icon: "folder",             url: "shareddocuments://" },
    { label: "TRANS",  icon: "character.bubble",   url: "translate://" },
  ],
};
const DIR = "launcher";   // 透明背景の保存先フォルダ

// ---------- パラメータ ----------
const PARAMS = String(args.widgetParameter || "")
  .split(/[,、]/).map(s => s.trim()).filter(Boolean);
const THEME = PARAMS.map(p => p.toLowerCase()).find(p => p === "dark" || p === "light") || CONFIG.theme;
const CLEAR = PARAMS.some(p => /^(透明|clear)$/i.test(p));
const PAGE = Math.max(1, parseInt(PARAMS.find(p => /^\d+$/.test(p)) || "1", 10));
// 数字・dark・透明 以外はセット名
const SET_NAME = PARAMS.find(p => !/^\d+$/.test(p) && !/^(dark|light|透明|clear)$/i.test(p)) || "";

// ---------- 色（Nothing デザインテンプレ：白基調） ----------
const PALETTES = {
  light: {
    bg: new Color("#ffffff"), ink: new Color("#0d0d0d"), dim: new Color("#5c5c59"),
    faint: new Color("#0d0d0d", 0.5), rule: new Color("#0d0d0d", 0.16),
    ghost: new Color("#0d0d0d", 0.08), accent: new Color("#ff3b30"),
  },
  dark: {
    bg: new Color("#0f0f0f"), ink: new Color("#f2f2f2"), dim: new Color("#a8a8a5"),
    faint: new Color("#f2f2f2", 0.5), rule: new Color("#ffffff", 0.18),
    ghost: new Color("#ffffff", 0.08), accent: new Color("#ff3b30"),
  },
};
const P = PALETTES[THEME] || PALETTES.light;

const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// サイズ別の並び：列数・段数・アイコンの大きさ・タイルの幅・ラベル・段の間
const GRID = {
  small:      { cols: 2, rows: 2, icon: 40, tileW: 54, label: 9.5,  gap: 6 },
  medium:     { cols: 4, rows: 2, icon: 38, tileW: 64, label: 9.5,  gap: 8 },
  large:      { cols: 4, rows: 4, icon: 40, tileW: 70, label: 10,   gap: 8 },
  extraLarge: { cols: 8, rows: 3, icon: 48, tileW: 76, label: 10.5, gap: 12 },
};

// 5×7 ドットマトリクス（数字と記号）
const GLYPHS = {
  "0": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["0", "0", "1", "0", "1", "0", "0"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  "-": ["000", "000", "000", "111", "000", "000", "000"],
};

// ============================================================
// ウィジェット本体
// ============================================================
async function makeWidget(family, setName) {
  const w = new ListWidget();
  w.spacing = 0;
  if (family.indexOf("accessory") === 0) {
    addText(w, "LAUNCHER は中・大サイズで", sys(12, "medium"));
    return w;
  }
  if (CLEAR) {
    const bg = loadClearBg(family);
    if (!bg) return calibrationWidget(w);
    w.backgroundImage = bg;
  } else {
    w.backgroundColor = P.bg;
  }
  const now = new Date();
  w.refreshAfterDate = new Date(dayStart(now, 1).getTime() + 60 * 1000);   // 日付の見出しのため

  const set = pickSet(await loadSets(), setName);
  const g = GRID[family] || GRID.medium;
  const per = g.cols * g.rows;
  if (family === "small") return small(w, set, now);
  const apps = set.apps.slice((PAGE - 1) * per, PAGE * per);
  await loadIcons(apps);

  if (family === "large" || family === "extraLarge") {
    const pad = family === "large" ? [16, 16, 14, 16] : [18, 18, 16, 18];
    w.setPadding(...pad);
    header(w, now, family === "large" ? 26 : 24, set);
    w.addSpacer(12);
  } else {
    w.setPadding(12, 13, 11, 13);
  }
  grid(w, apps, g, now, true);
  w.addSpacer();
  return w;
}

// 小：1 か所しかタップできないので、アプリ 1 個を大きく出してそのまま開く（2026-10-06 ユーザー選択）。
// Parameter の数字でセットの何個目か（無ければ 1 個目）
async function small(w, set, now) {
  w.setPadding(12, 12, 12, 12);
  const app = set.apps[Math.min(PAGE, set.apps.length) - 1];
  if (!app) {
    addText(w, "アプリがありません（▶ →「アプリを編集」で追加）", sys(12), P.dim).lineLimit = 3;
    return w;
  }
  await loadIcons([app]);
  w.url = appUrl(app, now);
  w.addSpacer();
  addTile(w, app, { icon: 76, tileW: 120, label: 12 }, now, false);
  w.addSpacer();
  return w;
}

function header(w, now, dots, set) {
  const h = hstack(w);
  h.centerAlignContent();
  addDots(h, md(now), dots, P.ink);
  h.addSpacer(10);
  addText(h, WEEK[now.getDay()], mono(11, "semibold"), P.ink);
  h.addSpacer();
  const pages = Math.ceil(set.apps.length / (GRID.large.cols * GRID.large.rows));
  addText(h, pages > 1 ? "APPS " + PAGE + "/" + pages : "APPS", mono(10.5), P.faint);
}

// タイルを cols 列に並べる。tap = タイルごとに開く先を持たせる
function grid(parent, apps, g, now, tap) {
  const box = vstack(parent);
  box.spacing = g.gap;
  if (!apps.length) {
    addText(box, "アプリがありません（▶ →「アプリを編集」で追加）", sys(12), P.dim).lineLimit = 2;
    return;
  }
  for (let i = 0; i < apps.length; i += g.cols) {
    const row = hstack(box);
    row.topAlignContent();
    const line = apps.slice(i, i + g.cols);
    for (let k = 0; k < g.cols; k++) {
      if (k) row.addSpacer();
      if (line[k]) addTile(row, line[k], g, now, tap);
      else blank(row, g.tileW);         // 空き（最後の段の位置をそろえる）
    }
  }
}

// アイコン（角丸の地＋線画）とラベル
function addTile(parent, app, g, now, tap) {
  const t = vstack(parent);
  t.size = new Size(g.tileW, 0);
  if (tap) t.url = appUrl(app, now);
  const top = hstack(t);
  top.addSpacer();
  const tile = hstack(top);
  tile.size = new Size(g.icon, g.icon);
  tile.cornerRadius = Math.round(g.icon * 0.28);
  tile.centerAlignContent();
  const photo = app.image ? ICON_CACHE[app.image] : null;
  if (photo) {
    // 自分で選んだ画像：タイルいっぱいに角丸で
    const img = tile.addImage(photo);
    img.imageSize = new Size(g.icon, g.icon);
  } else {
    tile.backgroundColor = app.style === "invert" ? P.ink : P.ghost;
    tile.addSpacer();
    const img = tile.addImage(symbol(app.icon, g.icon));
    const s = Math.round(g.icon * 0.5);
    img.imageSize = new Size(s, s);
    img.tintColor = app.style === "invert" ? P.bg : app.style === "accent" ? P.accent : P.ink;
    tile.addSpacer();
  }
  top.addSpacer();
  t.addSpacer(4);
  const l = centerLine(t, String(app.label || ""), mono(g.label, "medium"));
  l.textColor = app.style === "accent" ? P.accent : P.dim;
  l.minimumScaleFactor = 0.7;
}

function blank(parent, width) {
  const b = parent.addStack();
  b.size = new Size(width, 0);
}

// SF Symbols の線画（名前が無ければ四角）
function symbol(name, size) {
  for (const n of [name, "square"]) {
    try {
      const s = SFSymbol.named(String(n));
      if (!s) continue;
      s.applyFont(Font.systemFont(Math.round(size * 0.5)));
      s.applyLightWeight();
      const img = s.image;
      if (img) return img;
    } catch (e) {
      // 次の候補へ
    }
  }
  const dc = new DrawContext();
  dc.size = new Size(1, 1);
  return dc.getImage();
}

function appUrl(app, now) {
  const u = String(app.url || "");
  return u === "calshow:" ? calshow(now) : u;
}

// 小サイズのタップ：このスクリプトを一覧つきで開く（どのセットかも渡す）
function menuUrl(setName) {
  const base = URLScheme.forRunningScript();
  return base + (base.indexOf("?") >= 0 ? "&" : "?") + "launch=menu&set=" + encodeURIComponent(setName);
}

// ▶ / 小サイズのタップから：一覧で選んで開く
async function appMenu(setName) {
  const set = pickSet(await loadSets(), setName);
  const apps = set.apps.filter(a => a.url);
  if (!apps.length) return notice("アプリがありません", "▶ →「アプリを編集」でセット「" + set.name + "」にアプリを追加してください。");
  const i = await sheet("アプリを開く（" + set.name + "）", apps.map(a => a.label));
  if (i >= 0) Safari.open(appUrl(apps[i], new Date()));
}

// ============================================================
// セット（iCloud の launcher/sets.json = [{ name, apps: [{ label, icon, url, style }] }]）
// ============================================================
const DEFAULT_SET = "すべて";

// 追加するときに選べるアプリ（選択肢）の初期値：種類ごとに [表示名, 日本語名] か、新しいアプリの定義。
// 実際の選択肢は ▶ →「アプリを編集」→「＋ アプリを追加」→「選択肢を編集」で変えられる（iCloud の launcher/catalog.json）
const BASE = Object.fromEntries(CONFIG.apps.map(a => [a.label, a]));
// u(表示名, アイコン, URL, 日本語名)／sc(表示名, アイコン, 日本語名, ショートカット名)＝URL が分からないアプリ。
// ショートカット（App を開く だけ）経由で開く。ショートカット名を省くと日本語名。ユーザーが作った名前（「アプリを開く 2」など）は 2026-10-06 にスクショから入れた
const shortcutUrl = name => "shortcuts://run-shortcut?name=" + encodeURIComponent(name);
const RENAMED = {};   // 前の開く先（日本語名のショートカット）→ 新しい開く先。保存済みの選択肢・セットを読むときに置き換える
const u = (label, icon, url, name) => ({ label, icon, url, name });
const sc = (label, icon, name, shortcut) => {
  if (shortcut && shortcut !== name) RENAMED[shortcutUrl(name)] = shortcutUrl(shortcut);
  return { label, icon, url: shortcutUrl(shortcut || name), name };
};
// moved(表示名, アイコン, URL, 日本語名, 前のショートカット名)＝前はショートカット経由で、URL で直接開くようにしたもの（2026-10-06・URL は推測で実機未確認）
const moved = (label, icon, url, name, was) => {
  [name, was].filter(Boolean).forEach(n => { RENAMED[shortcutUrl(n)] = url; });
  return u(label, icon, url, name);
};
// 開く先を新しいショートカット名・URL に置き換える。変えたら true
function renameUrls(apps) {
  let changed = false;
  apps.forEach(a => { if (RENAMED[a.url]) { a.url = RENAMED[a.url]; changed = true; } });
  return changed;
}
const DEFAULT_GROUPS = [
  ["Apple のアプリ", [["CAL", "カレンダー"], ["TODO", "リマインダー"], ["CLOCK", "時計"], ["PHOTO", "写真"], ["MUSIC", "ミュージック"],
    ["MAPS", "マップ"], ["WTHR", "天気"], ["MAIL", "メール"], ["HEALTH", "ヘルスケア"], ["FILES", "ファイル"], ["TRANS", "翻訳"],
    ["STORE", "App Store"], ["SET", "設定"],
    u("MSG", "message", "sms:", "メッセージ"),
    u("SHORT", "square.stack.3d.up", "shortcuts://", "ショートカット"),
    u("BOOKS", "book", "ibooks://", "ブック"),
    u("POD", "mic", "podcasts://", "ポッドキャスト"),
    u("MEMO", "note.text", "mobilenotes://", "メモ"),
    u("FIND", "location.circle", "findmy://", "探す"),
    u("VOICE", "waveform", "voicememos://", "ボイスメモ"),
    u("NEWS", "newspaper", "applenews://", "News"),
    u("TUNES", "star", "itms://", "iTunes Store"),
    u("ASTORE", "applelogo", "applestore://", "Apple Store"),
    u("SCRIPT", "curlybraces", "scriptable://", "Scriptable"),
    moved("SAFARI", "safari", "x-safari-https://www.google.com", "Safari", "アプリを開く 2"),
    sc("CAM", "camera", "カメラ", "アプリを開く 68"),
    sc("FT", "video", "FaceTime", "アプリを開く 32"),
    sc("PHONE", "phone", "電話", "アプリを開く 107"),
    moved("PEOPLE", "person.crop.circle", "contacts://", "連絡先"),
    moved("CALC", "plus.forwardslash.minus", "calc://", "計算機", "アプリを開く 103"),
    sc("PASS", "key", "パスワード", "アプリを開く 59"),
    moved("RULER", "ruler", "measure://", "計測"),
    moved("JRNL", "book.closed", "journal://", "ジャーナル", "アプリを開く 72"),
    sc("PLAY", "wand.and.stars", "Playground", "アプリを開く 43"),
    sc("PREV", "eye", "プレビュー", "アプリを開く 93"),
    moved("PAGES", "doc.richtext", "pages://", "Pages"),
    moved("MOVIE", "film", "imovie://", "iMovie"),
    moved("CLIPS", "video.badge.plus", "clips://", "Clips"),
    sc("GAMES", "gamecontroller", "ゲーム"),
    sc("REMOTE", "tv", "リモコン"),
    sc("ICLOUD", "icloud", "iCloud Drive"),
    sc("VISION", "visionpro", "Apple Vision Pro の設定")]],
  ["勉強・仕事", [["NOTION", "Notion"], ["CLAUDE", "Claude"], ["STUDY", "STUDYMANAGER"], ["NOTES", "GoodNotes"],
    u("GMAIL", "tray", "googlegmail://", "Gmail"),
    u("SLACK", "number", "slack://", "Slack"),
    u("CHROME", "globe", "googlechrome://", "Chrome"),
    u("GMAPS", "map.circle", "comgooglemaps://", "Google マップ"),
    u("WORD", "doc.text", "ms-word://", "Word"),
    u("EXCEL", "tablecells", "ms-excel://", "Excel"),
    u("PPT", "rectangle.on.rectangle", "ms-powerpoint://", "PowerPoint"),
    u("DRIVE", "externaldrive", "googledrive://", "ドライブ"),
    u("GCAL", "calendar.circle", "googlecalendar://", "Google カレンダー"),
    u("ZOOM", "video.circle", "zoomus://", "Zoom"),
    u("OBSDN", "diamond", "obsidian://", "Obsidian"),
    u("GITHUB", "chevron.left.forwardslash.chevron.right", "github://", "GitHub"),
    moved("STPLUS", "chart.bar", "studyplus://", "Studyplus", "アプリを開く 45"),
    moved("ABCEED", "character.book.closed", "abceed://", "abceed", "アプリを開く"),
    sc("TOEIC", "book.closed", "TOEIC公式教材", "アプリを開く 62"),
    sc("MANABO", "person.2", "manabo"),
    moved("GEOGB", "function", "geogebra://", "GeoGebra"),
    sc("TORUMI", "doc.viewfinder", "トルミル"),
    sc("WIN", "laptopcomputer", "Windows にリンク", "アプリを開く 65")]],
  ["AI", [
    u("GOOGLE", "magnifyingglass", "google://", "Google"),
    u("GPT", "bubble.left.and.bubble.right", "chatgpt://", "ChatGPT"),
    moved("GEMINI", "sparkles", "googlegemini://", "Gemini", "アプリを開く 17"),
    moved("COPLT", "wand.and.rays", "ms-copilot://", "Copilot"),
    sc("MANUS", "hand.raised", "Manus", "アプリを開く 38"),
    sc("SPARK", "bolt", "Genspark")]],
  ["SNS・連絡", [
    u("LINE", "bubble.left", "line://", "LINE"),
    u("INSTA", "camera", "instagram://", "Instagram"),
    u("X", "at", "twitter://", "X"),
    u("DISCRD", "person.3", "discord://", "Discord"),
    u("TWITCH", "tv", "twitch://", "Twitch"),
    Object.assign(sc("SETLOG", "list.bullet", "setlog", "アプリを開く 23"), { image: "builtin:setlog" })]],
  ["エンタメ", [
    u("YT", "play.rectangle", "youtube://", "YouTube"),
    u("SPOT", "headphones", "spotify://", "Spotify"),
    u("YTM", "music.note.list", "youtubemusic://", "YouTube Music"),
    moved("JUMP", "book.pages", "shonenjumpplus://", "ジャンプ+", "アプリを開く 89"),
    sc("SWITCH", "gamecontroller", "Nintendo Switch App"),
    sc("NSTORE", "bag", "Nintendo Store", "アプリを開く 40"),
    sc("CDREC", "opticaldisc", "CDレコ"),
    moved("IBIS", "paintbrush", "ibispaint://", "ibisPaint X")]],
  ["買い物・お金", [
    u("AMZN", "cart", "com.amazon.mobile.shopping://", "Amazon"),
    moved("RKTN", "bag", "rakutenichiba://", "楽天市場", "アプリを開く 102"),
    moved("ZOZO", "tshirt", "zozotown://", "ZOZOTOWN", "アプリを開く 56"),
    sc("MUJI", "house", "MUJI", "アプリを開く 39"),
    moved("HPB", "scissors", "hotpepperbeauty://", "ホットペッパー", "アプリを開く 95"),
    sc("MIZUHO", "building.columns", "みずほ銀行", "アプリを開く 82"),
    sc("YUCHO", "yensign.circle", "ゆうちょ通帳", "アプリを開く 83"),
    sc("UQ", "antenna.radiowaves.left.and.right", "My UQ mobile", "アプリを開く 5")]],
  ["生活・その他", [["MARU", "丸ポップ（ショートカット経由）"],
    moved("WNEWS", "cloud.sun", "weathernews://", "weathernews", "アプリを開く 55"),
    moved("ALEXA", "speaker.wave.2", "alexa://", "Amazon Alexa"),
    sc("SOUND", "earbuds", "Anker soundcore", "アプリを開く 10"),
    sc("NTHX", "headphones", "Nothing X", "アプリを開く 41"),
    sc("RSHIFT", "calendar.badge.clock", "アールシフト", "アプリを開く 67")]],
].map(([cat, items]) => [cat, items.map(x => Array.isArray(x) ? Object.assign({}, BASE[x[0]], { name: x[1] }) : x)]);
const MY_GROUP = "自分で追加";
// いまの選択肢：[{ cat, items: [{ name, label, icon, url, style, image }] }]（編集画面を開くと読み込む）
let CHOICES = DEFAULT_GROUPS.map(([cat, items]) => ({ cat, items }));

// アプリの日本語名（選択肢にあれば。無ければ開く先）
function appName(app) {
  const c = CHOICES.flatMap(g => g.items).find(x => x.url === app.url);
  return c ? c.name : app.url;
}

// アイコンの候補（SF Symbols の名前は自分で入力もできる）
const ICONS = ["square", "circle", "star", "heart", "book", "pencil", "doc.text", "folder", "calendar", "clock", "music.note",
  "camera", "photo", "map", "cart", "bag", "gamecontroller", "graduationcap", "dumbbell", "fork.knife", "house", "globe", "sparkle"];

function store() {
  try {
    return FileManager.iCloud();
  } catch (e) {
    return FileManager.local();
  }
}

function setsPath(fm) {
  return fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), "sets.json");
}

function defaultSets() {
  return [{ name: DEFAULT_SET, apps: CONFIG.apps.map(a => Object.assign({}, a)) }];
}

async function loadSets() {
  const fm = store();
  const p = setsPath(fm);
  if (!fm.fileExists(p)) return defaultSets();
  try {
    await fm.downloadFileFromiCloud(p);
    const sets = JSON.parse(fm.readString(p));
    if (!Array.isArray(sets) || !sets.length) return defaultSets();
    const ok = sets.filter(x => x && x.name && Array.isArray(x.apps));
    if (ok.map(x => renameUrls(x.apps) | applyDefaultImages(x.apps)).some(Boolean)) saveSets(ok);
    return ok;
  } catch (e) {
    return defaultSets();
  }
}

// 自分で選んだ画像（iCloud の launcher/icons/）。ファイル名 → Image
const ICON_CACHE = {};
// スクリプトに入れてある画像（"builtin:名前"）。setlog は元のアイコンを白黒にしたもの（2026-10-07 ユーザー依頼・design/icon-setlog.png の 180px 版）
const BUILTIN_ICONS = {
  "builtin:setlog": "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",
};
// 初期の画像：この開く先のアプリに、まだ画像が無ければ入れる（自分で線画に戻したもの＝noBuiltin は除く）
const DEFAULT_IMAGES = { [shortcutUrl("アプリを開く 23")]: "builtin:setlog" };
function applyDefaultImages(apps) {
  let changed = false;
  apps.forEach(a => {
    const img = DEFAULT_IMAGES[a.url];
    if (img && !a.image && !a.noBuiltin) { a.image = img; changed = true; }
  });
  return changed;
}

function iconPath(fm, name) {
  return fm.joinPath(fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), "icons"), name);
}

async function loadIcons(apps) {
  const fm = store();
  for (const a of apps) {
    if (!a.image || ICON_CACHE[a.image]) continue;
    if (BUILTIN_ICONS[a.image]) {
      try {
        ICON_CACHE[a.image] = Image.fromData(Data.fromBase64String(BUILTIN_ICONS[a.image]));
      } catch (e) {
        // 読めなければ SF Symbols のアイコンで表示する
      }
      continue;
    }
    const p = iconPath(fm, a.image);
    if (!fm.fileExists(p)) continue;
    try {
      await fm.downloadFileFromiCloud(p);
      ICON_CACHE[a.image] = fm.readImage(p);
    } catch (e) {
      // 読めなければ SF Symbols のアイコンで表示する
    }
  }
}

// 写真から選ぶ → 真ん中を正方形に切り抜いて 180px に縮め、保存する。ファイル名を返す
async function pickIconImage() {
  const photo = await pickPhoto();
  if (!photo) return null;
  const side = Math.min(photo.size.width, photo.size.height), out = 180;
  const k = out / side;
  const dc = new DrawContext();
  dc.size = new Size(out, out);
  dc.respectScreenScale = false;
  dc.opaque = true;
  dc.drawImageInRect(photo, new Rect(-(photo.size.width - side) / 2 * k, -(photo.size.height - side) / 2 * k, photo.size.width * k, photo.size.height * k));
  const img = dc.getImage();
  const fm = store();
  const dir = fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), "icons");
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const name = "icon-" + Date.now().toString(36) + ".png";
  fm.writeImage(iconPath(fm, name), img);
  ICON_CACHE[name] = img;
  return name;
}

// 選択肢：初めて作るとき（と初期に戻すとき）は、初期の選択肢＋今どれかのセットに入っているアプリすべて
function catalogPath(fm) {
  return fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), "catalog.json");
}

function buildCatalog(sets) {
  const groups = DEFAULT_GROUPS.map(([cat, items]) => ({ cat, items: items.map(x => Object.assign({}, x)) }));
  const known = new Set(groups.flatMap(g => g.items.map(x => x.url)));
  const mine = { cat: MY_GROUP, items: [] };
  sets.forEach(set => set.apps.forEach(a => {
    if (!a.url || known.has(a.url)) return;
    known.add(a.url);
    mine.items.push(Object.assign({ name: a.label }, a));
  }));
  groups.push(mine);
  return groups;
}

// catalog.json は { groups, known }。known＝これまでに入れた初期の選択肢の URL。
// 開くたびに、初期の選択肢のうち known に無い（＝コードで新しく増えた）ものだけを足す。外した選択肢は戻さない
async function loadCatalog(sets) {
  const fm = store();
  const p = catalogPath(fm);
  if (fm.fileExists(p)) {
    try {
      await fm.downloadFileFromiCloud(p);
      const d = JSON.parse(fm.readString(p));
      const raw = Array.isArray(d) ? d : d && d.groups;   // 配列だけの古い形は known なし
      if (Array.isArray(raw)) {
        const g = raw.filter(x => x && x.cat && Array.isArray(x.items));
        const known = (Array.isArray(d) ? [] : d.known || []).map(x => RENAMED[x] || x);
        const renamed = g.map(x => renameUrls(x.items) | applyDefaultImages(x.items)).some(Boolean);
        if (mergeDefaults(g, known) || renamed) saveCatalog(g);
        return g;
      }
    } catch (e) {
      // 壊れていたら作り直す
    }
  }
  const g = buildCatalog(sets);
  saveCatalog(g);
  return g;
}

// 初期の選択肢で、まだ一覧に無く known にも無いものを、同じ名前の種類に足す（無ければ「自分で追加」の前に種類を作る）
function mergeDefaults(groups, known) {
  const seen = new Set(known);
  const have = new Set(groups.flatMap(g => g.items.map(x => x.url)));
  let added = false;
  DEFAULT_GROUPS.forEach(([cat, items]) => items.forEach(x => {
    if (seen.has(x.url) || have.has(x.url)) return;
    let g = groups.find(y => y.cat === cat);
    if (!g) {
      g = { cat, items: [] };
      const mi = groups.findIndex(y => y.cat === MY_GROUP);
      if (mi >= 0) groups.splice(mi, 0, g);
      else groups.push(g);
    }
    g.items.push(Object.assign({}, x));
    have.add(x.url);
    added = true;
  }));
  return added;
}

function saveCatalog(groups) {
  const fm = store();
  const dir = fm.joinPath(fm.documentsDirectory(), DIR);
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const known = DEFAULT_GROUPS.flatMap(([, items]) => items.map(x => x.url));
  fm.writeString(catalogPath(fm), JSON.stringify({ groups, known }));
}

// 選択肢の 1 件 → セットに入れるアプリ
function fromChoice(c) {
  const a = { label: c.label, icon: c.icon, url: c.url };
  if (c.style) a.style = c.style;
  if (c.image) a.image = c.image;
  return a;
}

function saveSets(sets) {
  const fm = store();
  const dir = fm.joinPath(fm.documentsDirectory(), DIR);
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  fm.writeString(setsPath(fm), JSON.stringify(sets));
}

// 名前のセット（無ければ最初のセット）
function pickSet(sets, name) {
  return sets.find(x => x.name === name) || sets[0] || defaultSets()[0];
}

// ============================================================
// ▶ →「アプリを編集」：一覧で見ながら編集する画面（UITable）
// ============================================================
const UI = { ink: new Color("#0d0d0d"), dim: new Color("#5c5c59"), faint: new Color("#0d0d0d", 0.45), accent: new Color("#ff3b30"), ground: new Color("#f2f1ee") };

async function editMenu() {
  const sets = await loadSets();
  CHOICES = await loadCatalog(sets);
  await loadIcons(sets.flatMap(x => x.apps).concat(CHOICES.flatMap(g => g.items)));
  const st = { sets, cur: Math.max(0, sets.findIndex(x => x.name === SET_NAME)) };
  const table = new UITable();
  table.showSeparators = true;
  st.redraw = () => drawEditor(table, st);
  st.redraw();
  await table.present(true);
}

function drawEditor(table, st) {
  table.removeAllRows();
  const set = st.sets[st.cur];

  // セットの見出し（タップで切り替え・作成・名前変更・削除）
  const head = new UITableRow();
  head.height = 64;
  head.dismissOnSelect = false;
  head.backgroundColor = UI.ground;
  const ht = head.addText("セット：" + set.name + "  ▾", "タップでセットの切り替え・作成・名前変更・削除（全 " + st.sets.length + " 個）");
  ht.titleFont = Font.boldSystemFont(20);
  ht.subtitleColor = UI.dim;
  head.onSelect = async () => { await setMenu(st); st.redraw(); };
  table.addRow(head);

  if (set.apps.length > 1) {
    const ro = new UITableRow();
    ro.height = 48;
    ro.dismissOnSelect = false;
    const rt = ro.addText("⇅ 並べ替え", "長押しで持ち上げて、ドラッグで動かす（閉じると保存）");
    rt.titleFont = Font.semiboldSystemFont(16);
    rt.subtitleColor = UI.dim;
    ro.onSelect = async () => { await reorderScreen(st); st.redraw(); };
    table.addRow(ro);
  }
  table.addRow(label("表示中のアプリ（" + set.apps.length + " 個）　行をタップで変更・↑↓ で並べ替え・✕ で外す"));
  if (!set.apps.length) table.addRow(label("まだアプリがありません。下の「＋ アプリを追加」から選んでください。"));
  set.apps.forEach((app, i) => {
    // ページの区切り：中は 8 個、大は 16 個ずつ
    if (i && i % 8 === 0) table.addRow(label("── ここから 中 " + (i / 8 + 1) + " ページ目" + (i % 16 === 0 ? "・大 " + (i / 16 + 1) + " ページ目" : "") + " ──", true));
    const row = new UITableRow();
    row.height = 54;
    row.dismissOnSelect = false;
    appCells(row, app, 58);
    const up = row.addButton("↑");
    up.widthWeight = 10;
    up.onTap = () => { move(st, i, -1); };
    const down = row.addButton("↓");
    down.widthWeight = 10;
    down.onTap = () => { move(st, i, 1); };
    const del = row.addButton("✕");
    del.widthWeight = 10;
    del.onTap = () => { set.apps.splice(i, 1); saveSets(st.sets); st.redraw(); };
    row.onSelect = async () => { if (await changeApp(app)) saveSets(st.sets); st.redraw(); };
    table.addRow(row);
  });

  const add = new UITableRow();
  add.height = 52;
  add.dismissOnSelect = false;
  const at = add.addText("＋ アプリを追加", "一覧から選ぶ・自分で入れる");
  at.titleFont = Font.semiboldSystemFont(17);
  at.subtitleColor = UI.dim;
  add.onSelect = async () => { await addScreen(st); st.redraw(); };
  table.addRow(add);
  table.reload();
}

// アイコン・表示名・日本語名（と色の説明）のセル
function appCells(row, app, textWeight) {
  const img = row.addImage(app.image && ICON_CACHE[app.image] ? ICON_CACHE[app.image] : symbol(app.icon, 44));
  img.widthWeight = 12;
  const note = app.image ? "・自分の画像" : app.style === "invert" ? "・黒地" : app.style === "accent" ? "・赤" : "";
  const t = row.addText(app.label, appName(app) + note);
  t.widthWeight = textWeight;
  t.titleFont = Font.semiboldMonospacedSystemFont(15);
  t.titleColor = app.style === "accent" ? UI.accent : UI.ink;
  t.subtitleColor = UI.dim;
  return t;
}

// 説明や区切りの 1 行
function label(text, small) {
  const row = new UITableRow();
  row.height = small ? 30 : 40;
  row.dismissOnSelect = false;
  const t = row.addText(text);
  t.titleFont = small ? Font.mediumMonospacedSystemFont(11) : Font.systemFont(13);
  t.titleColor = small ? UI.faint : UI.dim;
  return row;
}

function move(st, i, d) {
  const apps = st.sets[st.cur].apps, j = i + d;
  if (j < 0 || j >= apps.length) return;
  [apps[i], apps[j]] = [apps[j], apps[i]];
  saveSets(st.sets);
  st.redraw();
}

// 「⇅ 並べ替え」：UITable は長押しのドラッグができないので、Web ページ（WebView）で並べ替える（2026-10-07 ユーザー依頼）。
// ページの中でタイルを長押し → ドラッグ。並びは window.ORDER（元の番号の配列）に入り、閉じたときに読み出して保存する
async function reorderScreen(st) {
  const set = st.sets[st.cur];
  const wv = new WebView();
  await wv.loadHTML(reorderHtml(set.name, set.apps));
  await wv.present(true);
  let order = null;
  try {
    order = JSON.parse(await wv.evaluateJavaScript("completion(JSON.stringify(window.ORDER || null))", true));
  } catch (e) {
    return;   // 読み出せなければ何も変えない
  }
  const n = set.apps.length;
  const ok = Array.isArray(order) && order.length === n && order.every(i => Number.isInteger(i) && i >= 0 && i < n) && new Set(order).size === n;
  if (!ok || order.every((v, i) => v === i)) return;
  set.apps = order.map(i => set.apps[i]);
  saveSets(st.sets);
}

function reorderHtml(name, apps) {
  const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const tiles = apps.map((a, i) => {
    let pic = "";
    try {
      const img = a.image ? ICON_CACHE[a.image] : null;
      if (img) pic = '<img src="data:image/png;base64,' + Data.fromPNG(img).toBase64String() + '">';
    } catch (e) {
      pic = "";
    }
    const cls = a.style === "invert" ? " inv" : a.style === "accent" ? " acc" : "";
    return '<div class="t' + cls + '" data-i="' + i + '"><div class="ic">' + (pic || esc(String(a.label || "").slice(0, 2))) + '</div>'
      + '<div class="lb">' + esc(a.label || "") + '</div><div class="nm">' + esc(appName(a)) + '</div></div>';
  }).join("");
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
    + '<style>'
    + 'body{margin:0;background:#f2f1ee;color:#0d0d0d;font-family:-apple-system,sans-serif;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}'
    + 'header{position:sticky;top:0;background:#f2f1ee;padding:16px 16px 10px;z-index:2}'
    + 'h1{margin:0;font-size:20px}p{margin:4px 0 0;color:#5c5c59;font-size:13px}'
    + 'button{margin-top:10px;border:1px solid #0d0d0d29;background:#fff;border-radius:10px;padding:8px 14px;font-size:14px;color:#0d0d0d}'
    + '#g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px 10px;padding:14px 16px 60px}'
    + '.t{position:relative;min-width:0;display:flex;flex-direction:column;align-items:center;touch-action:pan-y}'
    + '.ic{width:58px;height:58px;border-radius:16px;background:#0d0d0d14;display:flex;align-items:center;justify-content:center;font:600 15px ui-monospace,monospace;overflow:hidden}'
    + '.ic img{width:100%;height:100%;object-fit:cover}'
    + '.inv .ic{background:#0d0d0d;color:#fff}.acc .ic{color:#ff3b30}.acc .lb{color:#ff3b30}'
    + '.lb{margin-top:5px;font:500 11px ui-monospace,monospace;color:#5c5c59}'
    + '.nm{font-size:10px;color:#0d0d0d73;width:100%;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}'
    + '.t.pg::before{content:attr(data-pg);position:absolute;top:-17px;left:0;font:500 10px ui-monospace,monospace;color:#0d0d0d73;white-space:nowrap}'
    + '.t.lift{opacity:.35}'
    + '#ghost{position:fixed;pointer-events:none;z-index:9;transform:scale(1.12);transition:transform .12s;filter:drop-shadow(0 8px 14px #0003)}'
    + '</style></head><body><header><h1>並べ替え：' + esc(name) + '</h1>'
    + '<p>アイコンを長押しして持ち上げ、ドラッグで動かします。この画面を閉じると保存されます。</p>'
    + '<button id="undo">元の並びに戻す</button></header><div id="g">' + tiles + '</div>'
    + '<script>(' + reorderScript.toString() + ')()</script></body></html>';
}

// 並べ替えページの中で動くスクリプト（文字列にしてページに入れる）
function reorderScript() {
  var g = document.getElementById("g"), first = Array.prototype.slice.call(g.children);
  var drag = null, ghost = null, timer = null, sx = 0, sy = 0, dx = 0, dy = 0;
  function mark() {
    var ts = Array.prototype.slice.call(g.children);
    window.ORDER = ts.map(function (t) { return +t.getAttribute("data-i"); });
    ts.forEach(function (t, k) {
      var on = k > 0 && k % 8 === 0;
      t.classList.toggle("pg", on);
      if (on) t.setAttribute("data-pg", "── 中 " + (k / 8 + 1) + " ページ目" + (k % 16 === 0 ? "・大 " + (k / 16 + 1) + " ページ目" : ""));
    });
  }
  function lift(t, x, y) {
    drag = t;
    var r = t.getBoundingClientRect();
    dx = x - r.left; dy = y - r.top;
    ghost = t.cloneNode(true);
    ghost.id = "ghost";
    ghost.style.width = r.width + "px";
    ghost.style.left = r.left + "px";
    ghost.style.top = r.top + "px";
    document.body.appendChild(ghost);
    t.classList.add("lift");
    if (navigator.vibrate) navigator.vibrate(10);
  }
  function moveTo(x, y) {
    ghost.style.left = (x - dx) + "px";
    ghost.style.top = (y - dy) + "px";
    var el = document.elementFromPoint(x, y);
    var over = el && el.closest ? el.closest(".t") : null;
    if (!over || over === drag || over.id === "ghost") return;
    var ts = Array.prototype.slice.call(g.children);
    if (ts.indexOf(over) > ts.indexOf(drag)) g.insertBefore(drag, over.nextSibling);
    else g.insertBefore(drag, over);
    mark();
    var h = window.innerHeight;   // 端に近づいたら自動でスクロール
    if (y > h - 60) window.scrollBy(0, 12);
    if (y < 120) window.scrollBy(0, -12);
  }
  function drop() {
    clearTimeout(timer);
    timer = null;
    if (!drag) return;
    drag.classList.remove("lift");
    if (ghost) ghost.remove();
    drag = null; ghost = null;
    mark();
  }
  g.addEventListener("touchstart", function (e) {
    var t = e.target.closest(".t");
    if (!t) return;
    var p = e.touches[0];
    sx = p.clientX; sy = p.clientY;
    timer = setTimeout(function () { lift(t, sx, sy); }, 350);
  }, { passive: true });
  document.addEventListener("touchmove", function (e) {
    var p = e.touches[0];
    if (drag) {
      e.preventDefault();
      moveTo(p.clientX, p.clientY);
    } else if (timer && (Math.abs(p.clientX - sx) > 8 || Math.abs(p.clientY - sy) > 8)) {
      clearTimeout(timer);   // 長押しの前に指が動いたらスクロール
      timer = null;
    }
  }, { passive: false });
  document.addEventListener("touchend", drop);
  document.addEventListener("touchcancel", drop);
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  document.getElementById("undo").addEventListener("click", function () {
    first.forEach(function (t) { g.appendChild(t); });
    mark();
  });
  mark();
}

// 「＋ アプリを追加」：種類ごとの一覧。タップで入れる・外す（✓ が入っている印）
async function addScreen(st) {
  const set = st.sets[st.cur];
  const table = new UITable();
  table.showSeparators = true;
  const draw = () => {
    table.removeAllRows();
    table.addRow(label("「" + set.name + "」に追加（いま " + set.apps.length + " 個）　タップで入れる・外す。終わったら閉じる"));
    const ed = new UITableRow();
    ed.height = 48;
    ed.dismissOnSelect = false;
    const et = ed.addText("✎ 選択肢を編集", "この一覧に出すアプリを追加・変更・並べ替え・外す");
    et.titleFont = Font.semiboldSystemFont(16);
    et.subtitleColor = UI.dim;
    ed.onSelect = async () => { await catalogEditor(); draw(); };
    table.addRow(ed);
    const own = new UITableRow();
    own.height = 52;
    own.dismissOnSelect = false;
    const ot = own.addText("＋ 自分で入れる", "URL・ショートカットで開くアプリ");
    ot.titleFont = Font.semiboldSystemFont(17);
    ot.subtitleColor = UI.dim;
    own.onSelect = async () => {
      const app = await customApp();
      if (app) {
        set.apps.push(app);
        saveSets(st.sets);
        addToMyGroup(app);   // ほかのセットでも選べるよう、選択肢の「自分で追加」にも入れる
      }
      draw();
    };
    table.addRow(own);
    CHOICES.forEach(({ cat, items }) => {
      if (!items.length) return;
      const h = new UITableRow();
      h.isHeader = true;
      h.height = 36;
      h.addText(cat).titleColor = UI.dim;
      table.addRow(h);
      items.forEach(c => {
        const row = new UITableRow();
        row.height = 52;
        row.dismissOnSelect = false;
        const has = set.apps.some(a => a.url === c.url);
        appCells(row, c, 70);
        const mark = row.addText(has ? "✓" : "");
        mark.widthWeight = 12;
        mark.rightAligned();
        mark.titleColor = UI.accent;
        mark.titleFont = Font.boldSystemFont(20);
        row.onSelect = () => {
          const k = set.apps.findIndex(a => a.url === c.url);
          if (k >= 0) set.apps.splice(k, 1);
          else set.apps.push(fromChoice(c));
          saveSets(st.sets);
          draw();
        };
        table.addRow(row);
      });
    });
    table.reload();
  };
  draw();
  await table.present(true);
}

function addToMyGroup(app) {
  if (CHOICES.some(g => g.items.some(x => x.url === app.url))) return;
  let g = CHOICES.find(x => x.cat === MY_GROUP);
  if (!g) { g = { cat: MY_GROUP, items: [] }; CHOICES.push(g); }
  g.items.push(Object.assign({ name: app.label }, app));
  saveCatalog(CHOICES);
}

// 「選択肢を編集」：種類ごとの一覧。行をタップで変更・↑↓ で並べ替え・✕ で外す（セットの中のアプリはそのまま）
async function catalogEditor() {
  const table = new UITable();
  table.showSeparators = true;
  const draw = () => {
    table.removeAllRows();
    table.addRow(label("選択肢の編集（全 " + CHOICES.reduce((n, g) => n + g.items.length, 0) + " 個）　外してもセットの中のアプリは消えません"));
    const add = new UITableRow();
    add.height = 52;
    add.dismissOnSelect = false;
    const at = add.addText("＋ 選択肢を追加", "日本語名・開く先・アイコン・種類を入れる");
    at.titleFont = Font.semiboldSystemFont(17);
    at.subtitleColor = UI.dim;
    add.onSelect = async () => { await newChoice(); draw(); };
    table.addRow(add);
    CHOICES.forEach((g, gi) => {
      const h = new UITableRow();
      h.height = 40;
      h.dismissOnSelect = false;
      h.backgroundColor = UI.ground;
      const ht = h.addText(g.cat + "（" + g.items.length + "）", "タップで種類の名前を変える・削除");
      ht.titleColor = UI.dim;
      ht.subtitleColor = UI.faint;
      h.onSelect = async () => { await groupMenu(gi); draw(); };
      table.addRow(h);
      g.items.forEach((c, i) => {
        const row = new UITableRow();
        row.height = 54;
        row.dismissOnSelect = false;
        appCells(row, c, 58);
        const up = row.addButton("↑");
        up.widthWeight = 10;
        up.onTap = () => { swap(g.items, i, i - 1); draw(); };
        const down = row.addButton("↓");
        down.widthWeight = 10;
        down.onTap = () => { swap(g.items, i, i + 1); draw(); };
        const del = row.addButton("✕");
        del.widthWeight = 10;
        del.onTap = () => { g.items.splice(i, 1); saveCatalog(CHOICES); draw(); };
        row.onSelect = async () => { await changeChoice(c, gi); draw(); };
        table.addRow(row);
      });
    });
    const reset = new UITableRow();
    reset.height = 48;
    reset.dismissOnSelect = false;
    reset.addText("初期の選択肢に戻す", "今どれかのセットに入っているアプリも入れて作り直す").subtitleColor = UI.dim;
    reset.onSelect = async () => {
      const a = new Alert();
      a.title = "選択肢を初期に戻しますか？";
      a.message = "自分で変えた選択肢は元に戻ります。セットの中のアプリはそのままです。";
      a.addDestructiveAction("初期に戻す");
      a.addCancelAction("キャンセル");
      if ((await a.presentAlert()) === 0) {
        CHOICES = buildCatalog(await loadSets());
        saveCatalog(CHOICES);
      }
      draw();
    };
    table.addRow(reset);
    table.reload();
  };
  draw();
  await table.present(true);
}

function swap(list, i, j) {
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  saveCatalog(CHOICES);
}

// 種類を選ぶ（新しい種類も作れる）。種類の番号を返す
async function pickGroup(title) {
  const k = await sheet(title, CHOICES.map(g => g.cat).concat(["＋ 新しい種類を作る"]));
  if (k < 0) return -1;
  if (k < CHOICES.length) return k;
  const name = await askText("新しい種類", "例：ゲーム、買い物", "", "種類の名前");
  if (!name) return -1;
  const found = CHOICES.findIndex(g => g.cat === name);
  if (found >= 0) return found;
  CHOICES.push({ cat: name, items: [] });
  return CHOICES.length - 1;
}

async function groupMenu(gi) {
  const g = CHOICES[gi];
  const k = await sheet("種類「" + g.cat + "」", ["名前を変える", "この種類を削除（中の選択肢も外す）"]);
  if (k === 0) {
    const name = await askText("種類の名前", "", g.cat, "種類の名前");
    if (name) { g.cat = name; saveCatalog(CHOICES); }
  } else if (k === 1) {
    const a = new Alert();
    a.title = "「" + g.cat + "」を削除しますか？";
    a.message = "中の選択肢 " + g.items.length + " 個も一覧から外れます。セットの中のアプリはそのままです。";
    a.addDestructiveAction("削除する");
    a.addCancelAction("キャンセル");
    if ((await a.presentAlert()) === 0) { CHOICES.splice(gi, 1); saveCatalog(CHOICES); }
  }
}

// 選択肢を追加：開く先 → 日本語名 → 表示名 → アイコン → 色 → 種類
async function newChoice() {
  const app = await customApp(true);
  if (!app) return;
  const gi = await pickGroup("どの種類に入れる？");
  if (gi < 0) return;
  CHOICES[gi].items.push(app);
  saveCatalog(CHOICES);
  await notice("選択肢に追加しました", "「" + app.name + "」を「" + CHOICES[gi].cat + "」に入れました。");
}

// 選択肢を変更：日本語名・表示名・開く先・アイコン・色・種類
async function changeChoice(c, gi) {
  const i = await sheet("「" + c.name + "」を変更", ["日本語名", "表示名", "開く先（URL）", "アイコン", "色", "種類を移す"]);
  if (i < 0) return;
  if (i === 0) {
    const t = await askText("日本語名", "一覧に出る名前です。", c.name, "日本語名");
    if (t) c.name = t;
  } else if (i === 1) {
    const t = await askText("表示名", "ウィジェットに出る名前です。英大文字 6 文字くらいまで。", c.label, "表示名");
    if (t) c.label = t.toUpperCase();
  } else if (i === 2) {
    const t = await askText("開く URL", "ショートカットなら shortcuts://run-shortcut?name=名前", c.url, "URL");
    if (t) c.url = t;
  } else if (i === 3) {
    await askIcon(c);
  } else if (i === 4) {
    c.style = await askStyle(c.style);
  } else {
    const to = await pickGroup("どの種類に移す？");
    if (to < 0 || to === gi) return;
    const from = CHOICES[gi].items;
    from.splice(from.indexOf(c), 1);
    CHOICES[to].items.push(c);
  }
  saveCatalog(CHOICES);
}

// セットの切り替え・作成・名前変更・削除・初期化
async function setMenu(st) {
  const others = st.sets.map((x, i) => i).filter(i => i !== st.cur);
  const opts = others.map(i => "切り替え：" + st.sets[i].name + "（" + st.sets[i].apps.length + " 個）")
    .concat(["＋ セットを作る", "このセットの名前を変える", "このセットを削除する", "初期に戻す"]);
  const k = await sheet("セット（いま：" + st.sets[st.cur].name + "）", opts);
  if (k < 0) return;
  if (k < others.length) { st.cur = others[k]; return; }
  const op = k - others.length;
  if (op === 0) {
    const name = await askSetName("セットを作る", "", st.sets);
    if (!name) return;
    const c = await sheet("中身", ["空のまま", "「" + st.sets[st.cur].name + "」を複製"]);
    if (c < 0) return;
    st.sets.push({ name, apps: c === 0 ? [] : st.sets[st.cur].apps.map(a => Object.assign({}, a)) });
    st.cur = st.sets.length - 1;
    saveSets(st.sets);
    await notice("セットを作りました", "ウィジェットの Parameter に「" + name + "」と入れると表示されます。");
  } else if (op === 1) {
    const old = st.sets[st.cur].name;
    const name = await askSetName("セットの名前を変える", old, st.sets);
    if (!name || name === old) return;
    st.sets[st.cur].name = name;
    saveSets(st.sets);
    await notice("名前を変えました", "このセットを出しているウィジェットの Parameter も「" + name + "」に直してください。");
  } else if (op === 2) {
    if (st.sets.length === 1) return notice("削除できません", "セットが 1 つしかありません。中身を変えるか、「初期に戻す」を使ってください。");
    const a = new Alert();
    a.title = "「" + st.sets[st.cur].name + "」を削除しますか？";
    a.message = "このセットを出しているウィジェットは、最初のセットの表示になります。";
    a.addDestructiveAction("削除する");
    a.addCancelAction("キャンセル");
    if ((await a.presentAlert()) !== 0) return;
    st.sets.splice(st.cur, 1);
    st.cur = 0;
    saveSets(st.sets);
  } else {
    const a = new Alert();
    a.title = "初期に戻しますか？";
    a.message = "作ったセットはすべて消え、18 個が入った「" + DEFAULT_SET + "」だけになります。";
    a.addDestructiveAction("初期に戻す");
    a.addCancelAction("キャンセル");
    if ((await a.presentAlert()) !== 0) return;
    st.sets.splice(0, st.sets.length, ...defaultSets());
    st.cur = 0;
    saveSets(st.sets);
  }
}

// 名前の入力（カンマは Parameter の区切り、数字・dark・透明 は別の意味があるので使えない）
async function askText(title, message, text, placeholder) {
  const a = new Alert();
  a.title = title;
  a.message = message;
  a.addTextField(placeholder || "", text || "");
  a.addAction("決定");
  a.addCancelAction("キャンセル");
  if ((await a.presentAlert()) !== 0) return null;
  return String(a.textFieldValue(0) || "").trim();
}

async function askSetName(title, text, sets) {
  const raw = await askText(title, "例：勉強、生活、朝。ウィジェットの Parameter にこの名前を入れて使います。", text, "セットの名前");
  if (raw === null) return null;
  const name = raw.replace(/[,、]/g, " ").replace(/\s+/g, " ").trim();
  if (!name || /^\d+$/.test(name) || /^(dark|light|透明|clear)$/i.test(name)) {
    await notice("使えない名前です", "空・数字だけ・dark・light・透明 は使えません。");
    return null;
  }
  if (sets.some(x => x.name === name) && name !== text) {
    await notice("同じ名前があります", "「" + name + "」はもうあります。");
    return null;
  }
  return name;
}

// 一覧に無いアプリ：URL かショートカット名 →（選択肢なら日本語名）→ 表示名 → アイコン → 色
async function customApp(withName) {
  const app = { label: "APP", icon: "square", url: "" };
  const how = await sheet("開く先", ["URL を入力する", "ショートカットを開く（名前を入力）"]);
  if (how < 0) return null;
  if (how === 0) {
    const url = await askText("開く URL", "例：notion:// 、https://… 。アプリの URL は「アプリ名 URL スキーム」で検索すると見つかります。", "", "URL");
    if (!url) return null;
    app.url = url;
  } else {
    const name = await askText("ショートカットの名前", "ショートカットアプリで「App を開く」だけのショートカットを作り、その名前を入れます。", "", "ショートカット名");
    if (!name) return null;
    app.url = "shortcuts://run-shortcut?name=" + encodeURIComponent(name);
  }
  if (withName) {
    const name = await askText("日本語名", "一覧に出る名前です。例：ゲーム", "", "日本語名");
    if (!name) return null;
    app.name = name;
  }
  const label = await askText("表示名", "英大文字 6 文字くらいまでが収まります。", "", "例：NOTES");
  if (label === null) return null;
  app.label = (label || "APP").toUpperCase();
  if (!app.name) app.name = app.label;
  await askIcon(app);
  if (!app.image) app.style = await askStyle(app.style);   // 自分の画像なら色はいらない
  return app;
}

// 変更：表示名・開く先・アイコン・色
async function changeApp(app) {
  const i = await sheet("「" + app.label + "」を変更", ["表示名", "開く先（URL）", "アイコン", "色"]);
  if (i < 0) return false;
  if (i === 0) {
    const t = await askText("表示名", "英大文字 6 文字くらいまでが収まります。", app.label, "表示名");
    if (!t) return false;
    app.label = t.toUpperCase();
  } else if (i === 1) {
    const t = await askText("開く URL", "ショートカットなら shortcuts://run-shortcut?name=名前", app.url, "URL");
    if (!t) return false;
    app.url = t;
  } else if (i === 2) {
    await askIcon(app);
  } else {
    app.style = await askStyle(app.style);
  }
  await notice("変更しました", app.label + "　" + app.url);
  return true;
}

// アイコン：写真から選ぶ（自分の画像）か、SF Symbols の線画。app を直接書き換える
async function askIcon(app) {
  const now = app.image ? "自分の画像" : app.icon;
  const k = await sheet("アイコン（いま：" + now + "）", ["そのまま", "写真から選ぶ（自分の画像）", "SF Symbols の名前を入力"].concat(ICONS));
  if (k <= 0) return;
  if (k === 1) {
    const name = await pickIconImage();
    if (name) app.image = name;
    return;
  }
  if (k === 2) {
    const t = await askText("SF Symbols の名前", "「SF Symbols」アプリで探せます。例：book.closed", app.icon, "名前");
    if (t) { app.icon = t; delete app.image; app.noBuiltin = true; }
    return;
  }
  app.icon = ICONS[k - 3];
  delete app.image;
  app.noBuiltin = true;   // 初期の画像を入れ直さない
}

async function askStyle(current) {
  const k = await sheet("色", ["白地に黒（ふつう）", "黒地に白", "赤（強調は 1 つだけがおすすめ）"]);
  if (k < 0) return current;
  return [undefined, "invert", "accent"][k];
}

// ============================================================
// 描画・小道具
// ============================================================
function dotMatrix(text, height, color, ghost) {
  const glyphs = String(text).split("").map(c => GLYPHS[c] || GLYPHS["-"]);
  const pitch = height / 7;
  const cols = glyphs.reduce((n, g) => n + g[0].length, 0) + glyphs.length - 1;
  const size = new Size(cols * pitch, height);
  const dc = new DrawContext();
  dc.size = size;
  dc.opaque = false;
  dc.respectScreenScale = true;
  const d = pitch * 0.8, off = (pitch - d) / 2;
  const dot = (c, r, col) => {
    dc.setFillColor(col);
    dc.fillEllipse(new Rect(c * pitch + off, r * pitch + off, d, d));
  };
  let x = 0;
  glyphs.forEach((g, gi) => {
    const gw = g[0].length;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < gw; c++) {
        if (g[r][c] === "1") dot(x + c, r, color);
        else if (ghost) dot(x + c, r, ghost);
      }
    }
    x += gw;
    if (gi < glyphs.length - 1) {
      if (ghost) for (let r = 0; r < 7; r++) dot(x, r, ghost);
      x += 1;
    }
  });
  return { image: dc.getImage(), size };
}

function addDots(parent, text, height, color) {
  const d = dotMatrix(text, height, color, P.ghost);
  const img = parent.addImage(d.image);
  img.imageSize = d.size;
  return img;
}

// 点の列：1=点灯 / 0=消灯 / "a"=赤 / "r"=輪 / "R"=赤い輪
function addDotRow(parent, states, pitch) {
  const size = new Size(states.length * pitch, pitch);
  const dc = new DrawContext();
  dc.size = size;
  dc.opaque = false;
  dc.respectScreenScale = true;
  const d = pitch * 0.72, off = (pitch - d) / 2, lw = Math.max(1, pitch * 0.12);
  dc.setLineWidth(lw);
  states.forEach((s, i) => {
    if (s === "r" || s === "R") {
      dc.setStrokeColor(s === "R" ? P.accent : P.ink);
      dc.strokeEllipse(new Rect(i * pitch + off + lw / 2, off + lw / 2, d - lw, d - lw));
    } else {
      dc.setFillColor(s === 1 ? P.ink : s === "a" ? P.accent : P.ghost);
      dc.fillEllipse(new Rect(i * pitch + off, off, d, d));
    }
  });
  const img = parent.addImage(dc.getImage());
  img.imageSize = size;
  return img;
}

function addText(parent, str, font, color) {
  const t = parent.addText(String(str));
  t.font = font;
  if (color) t.textColor = color;
  t.lineLimit = 1;
  return t;
}

function fixedText(parent, str, font, color, width) {
  const box = hstack(parent);
  box.size = new Size(width, 0);
  const t = addText(box, str, font, color);
  t.minimumScaleFactor = 0.7;
  box.addSpacer();
  return t;
}

function addNote(parent, text, indent, font, color) {
  const s = hstack(parent);
  if (indent) s.addSpacer(indent);
  addText(s, text, font, color);
  s.addSpacer();
}

function addRule(parent) {
  const r = hstack(parent);
  r.size = new Size(0, 1);
  r.backgroundColor = P.rule;
  r.addSpacer();
}

function leftLine(parent, add) {
  const r = hstack(parent);
  const x = add(r);
  r.addSpacer();
  return x;
}

function centerLine(parent, str, font) {
  const s = hstack(parent);
  s.addSpacer();
  const t = addText(s, str, font);
  s.addSpacer();
  return t;
}

function hstack(parent) { const s = parent.addStack(); s.layoutHorizontally(); return s; }
function vstack(parent) { const s = parent.addStack(); s.layoutVertically(); return s; }

function mono(size, weight) {
  const name = { medium: "mediumMonospacedSystemFont", semibold: "semiboldMonospacedSystemFont" }[weight]
    || "regularMonospacedSystemFont";
  return Font[name](size);
}
function sys(size, weight) {
  const name = { medium: "mediumSystemFont", semibold: "semiboldSystemFont", bold: "boldSystemFont" }[weight]
    || "systemFont";
  return Font[name](size);
}

function clean(s) { return String(s || "").replace(/\s+/g, " ").trim() || "（無題）"; }
function dayStart(d, offset) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset); }
function pad2(n) { return String(n).padStart(2, "0"); }
function hm(d) { return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
function md(d) { return pad2(d.getMonth() + 1) + "." + pad2(d.getDate()); }
function calshow(d) { return "calshow:" + Math.floor(d.getTime() / 1000 - 978307200); }

// ============================================================
// 透明背景（壁紙の該当部分を切り抜いて背景に敷く）
// ============================================================
function clearBgPath(family) {
  const fm = FileManager.local();
  return fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), "clear-" + family + ".png");
}

function loadClearBg(family) {
  const fm = FileManager.local();
  const p = clearBgPath(family);
  return fm.fileExists(p) ? fm.readImage(p) : null;
}

function saveClearBg(family, img) {
  const fm = FileManager.local();
  const dir = fm.joinPath(fm.documentsDirectory(), DIR);
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  fm.writeImage(clearBgPath(family), img);
}

function calibrationWidget(w) {
  w.backgroundColor = new Color("#ff00ff");
  w.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
  const a = centerLine(w, "透明化の位置合わせ中", sys(13, "semibold"));
  a.textColor = Color.white();
  a.minimumScaleFactor = 0.7;
  w.addSpacer(3);
  const b = centerLine(w, "スクショ → Scriptable で設定", sys(10.5, "medium"));
  b.textColor = Color.white();
  b.minimumScaleFactor = 0.6;
  return w;
}

async function setupClear() {
  const sizes = [["小", "small"], ["中", "medium"], ["大", "large"]];
  if (Device.isPad()) sizes.push(["特大", "extraLarge"]);
  const i = await sheet("透明にするウィジェットのサイズ", sizes.map(s => s[0]));
  if (i < 0) return;
  const fam = sizes[i][1];

  if (!(await confirm("① 位置合わせ用のスクショ",
    "Parameter を「透明」にしてピンク表示になったウィジェットが写っている、ホーム画面のスクリーンショットを選んでください。"))) return;
  const shot = await pickPhoto();
  if (!shot) return;
  const rects = await findPink(shot);
  if (!rects.length) {
    await notice("ピンクの領域が見つかりません",
      "ピンク表示のウィジェットが写ったスクリーンショットを選んでください。ホーム画面のアイコン表示は「デフォルト」にしてください。");
    return;
  }
  const rect = chooseRect(rects, fam);

  if (!(await confirm("② 背景用のスクショ",
    "ホーム画面を長押ししてアイコンが揺れる状態にし、いちばん右の空白ページで撮ったスクリーンショットを選んでください。"))) return;
  const bg = await pickPhoto();
  if (!bg) return;
  if (bg.size.width !== shot.size.width || bg.size.height !== shot.size.height) {
    await notice("画像のサイズが一致しません", "2 枚とも同じ端末・同じ画面の向きで撮影してください。");
    return;
  }
  saveClearBg(fam, cropImage(bg, rect));
  await notice("透明背景を設定しました",
    "反映まで少し時間がかかることがあります。ウィジェットを動かしたときは、もう一度設定してください。");
}

async function findPink(img) {
  const wv = new WebView();
  await wv.loadHTML("<canvas id='c'></canvas>");
  const b64 = Data.fromPNG(img).toBase64String();
  const minRatio = Device.isPad() ? 0.15 : 0.25;
  const js = scanPink.toString() + `
    const im = new Image();
    im.onload = () => {
      const c = document.getElementById("c");
      c.width = im.width;
      c.height = im.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(im, 0, 0);
      const data = ctx.getImageData(0, 0, im.width, im.height).data;
      completion(JSON.stringify(scanPink(data, im.width, im.height, ${minRatio})));
    };
    im.onerror = () => completion("[]");
    im.src = "data:image/png;base64,${b64}";`;
  try {
    return JSON.parse(await wv.evaluateJavaScript(js, true));
  } catch (e) {
    return [];
  }
}

// RGBA 配列からピンクの長方形（ウィジェット）の位置を返す。WebView 内で実行
function scanPink(d, W, H, minRatio) {
  const pink = (x, y) => {
    const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
    return r > 200 && b > 200 && g < 120 && Math.abs(r - b) < 50;
  };
  const S = 4, gw = Math.ceil(W / S), gh = Math.ceil(H / S);
  const mask = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      if (pink(Math.min(gx * S, W - 1), Math.min(gy * S, H - 1))) mask[gy * gw + gx] = 1;
    }
  }
  const first = (from, to, test) => {
    const step = from <= to ? 1 : -1;
    for (let v = from; v !== to + step; v += step) if (test(v)) return v;
    return null;
  };
  const median = a => a.slice().sort((p, q) => p - q)[a.length >> 1];
  const out = [], stack = [];
  const take = k => { if (mask[k] === 1) { mask[k] = 2; stack.push(k); } };
  for (let p = 0; p < mask.length; p++) {
    if (mask[p] !== 1) continue;
    let x0 = gw, y0 = gh, x1 = -1, y1 = -1, n = 0;
    take(p);
    while (stack.length) {
      const q = stack.pop(), qx = q % gw, qy = (q - qx) / gw;
      n++;
      if (qx < x0) x0 = qx;
      if (qx > x1) x1 = qx;
      if (qy < y0) y0 = qy;
      if (qy > y1) y1 = qy;
      if (qx > 0) take(q - 1);
      if (qx < gw - 1) take(q + 1);
      if (qy > 0) take(q - gw);
      if (qy < gh - 1) take(q + gw);
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const minSide = Math.min(W, H) * minRatio;
    if (bw * S < minSide || bh * S < minSide || n < bw * bh * 0.8) continue;
    const lo = v => Math.max(0, v), hx = v => Math.min(W - 1, v), hy = v => Math.min(H - 1, v);
    const ys = [0.3, 0.5, 0.7].map(t => hy(Math.round((y0 + t * bh) * S)));
    const xs = [0.3, 0.5, 0.7].map(t => hx(Math.round((x0 + t * bw) * S)));
    const edge = (lines, from, to, fallback, test) => median(lines.map(l => {
      const v = first(from, to, u => test(u, l));
      return v === null ? fallback : v;
    }));
    const L = edge(ys, lo(x0 * S - S), hx(x0 * S + S), x0 * S, (x, y) => pink(x, y));
    const R = edge(ys, hx(x1 * S + S), lo(x1 * S - S), hx(x1 * S), (x, y) => pink(x, y)) + 1;
    const T = edge(xs, lo(y0 * S - S), hy(y0 * S + S), y0 * S, (y, x) => pink(x, y));
    const B = edge(xs, hy(y1 * S + S), lo(y1 * S - S), hy(y1 * S), (y, x) => pink(x, y)) + 1;
    out.push({ x: L, y: T, w: R - L, h: B - T });
  }
  return out;
}

function chooseRect(rects, family) {
  const wide = family === "medium" || family === "extraLarge";
  let c = rects.filter(r => (r.w / r.h > 1.5) === wide);
  if (!c.length) c = rects;
  c.sort((a, b) => a.w * a.h - b.w * b.h);
  return family === "large" || family === "extraLarge" ? c[c.length - 1] : c[0];
}

function cropImage(img, r) {
  const dc = new DrawContext();
  dc.size = new Size(r.w, r.h);
  dc.respectScreenScale = false;
  dc.opaque = true;
  dc.drawImageAtPoint(img, new Point(-r.x, -r.y));
  return dc.getImage();
}

async function sheet(title, labels) {
  const a = new Alert();
  a.title = title;
  labels.forEach(l => a.addAction(l));
  a.addCancelAction("キャンセル");
  return a.presentSheet();
}

async function confirm(title, message) {
  const a = new Alert();
  a.title = title;
  a.message = message;
  a.addAction("写真を選ぶ");
  a.addCancelAction("キャンセル");
  return (await a.presentAlert()) === 0;
}

async function notice(title, message) {
  const a = new Alert();
  a.title = title;
  a.message = message;
  a.addAction("OK");
  await a.presentAlert();
}

async function pickPhoto() {
  try {
    return await Photos.fromLibrary();
  } catch (e) {
    return null;
  }
}

// ============================================================
// アプリ内プレビュー
// ============================================================
async function chooseAction() {
  const opts = [["アプリを開く", "menu"], ["アプリを編集", "edit"], ["小", "small"], ["中", "medium"], ["大", "large"]];
  if (Device.isPad()) opts.push(["特大", "extraLarge"]);
  opts.push(["透明背景を設定", "setup-clear"]);
  const i = await sheet("プレビュー・設定", opts.map(o => o[0]));
  return i >= 0 ? opts[i][1] : null;
}

async function previewSetName() {
  const sets = await loadSets();
  if (sets.length === 1) return sets[0].name;
  const i = await sheet("どのセット？", sets.map(x => x.name));
  return i >= 0 ? sets[i].name : sets[0].name;
}

async function preview(w, family) {
  const fn = {
    small: "presentSmall", medium: "presentMedium", large: "presentLarge",
    extraLarge: "presentExtraLarge",
    accessoryRectangular: "presentAccessoryRectangular",
    accessoryCircular: "presentAccessoryCircular",
    accessoryInline: "presentAccessoryInline",
  }[family];
  if (fn && typeof w[fn] === "function") await w[fn]();
  else await w.presentMedium();
}

// ============================================================
// 実行（ファイルの最後に置くこと）
// ============================================================
// 小サイズのタップ（URL に launch=menu&set=セット名）なら一覧を出す
const QUERY = args.queryParameters || {};
const MENU = QUERY.launch === "menu";
const family = MENU ? "menu" : config.widgetFamily || (config.runsInApp ? await chooseAction() : "medium");
if (family === "menu") {
  await appMenu(MENU ? QUERY.set || "" : await previewSetName());
} else if (family === "edit") {
  await editMenu();
} else if (family === "setup-clear") {
  await setupClear();
} else if (family) {
  // ▶ のプレビューには Parameter が渡らないので、セットが複数あれば選ぶ
  const widget = await makeWidget(family, config.runsInApp ? await previewSetName() : SET_NAME);
  if (config.runsInApp) await preview(widget, family);
  else Script.setWidget(widget);
}
Script.complete();
