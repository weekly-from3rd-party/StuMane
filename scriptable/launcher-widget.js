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
  const apps = set.apps.slice((PAGE - 1) * per, PAGE * per);
  await loadIcons(apps);

  if (family === "small") {
    w.setPadding(13, 14, 12, 14);
    w.url = menuUrl(set.name);          // 小は 1 か所しかタップできない → 一覧を開く
    grid(w, apps, g, now, false);
    return w;
  }
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
// 開く先を新しいショートカット名に置き換える。変えたら true
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
    sc("SAFARI", "safari", "Safari", "アプリを開く 2"),
    sc("CAM", "camera", "カメラ", "アプリを開く 68"),
    sc("FT", "video", "FaceTime", "アプリを開く 32"),
    sc("PHONE", "phone", "電話", "アプリを開く 107"),
    sc("PEOPLE", "person.crop.circle", "連絡先"),
    sc("CALC", "plus.forwardslash.minus", "計算機", "アプリを開く 103"),
    sc("PASS", "key", "パスワード", "アプリを開く 59"),
    sc("RULER", "ruler", "計測"),
    sc("JRNL", "book.closed", "ジャーナル", "アプリを開く 72"),
    sc("PLAY", "wand.and.stars", "Playground", "アプリを開く 43"),
    sc("PREV", "eye", "プレビュー", "アプリを開く 93"),
    sc("PAGES", "doc.richtext", "Pages"),
    sc("MOVIE", "film", "iMovie"),
    sc("CLIPS", "video.badge.plus", "Clips"),
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
    sc("STPLUS", "chart.bar", "Studyplus", "アプリを開く 45"),
    sc("ABCEED", "character.book.closed", "abceed", "アプリを開く"),
    sc("TOEIC", "book.closed", "TOEIC公式教材", "アプリを開く 62"),
    sc("MANABO", "person.2", "manabo"),
    sc("GEOGB", "function", "GeoGebra"),
    sc("TORUMI", "doc.viewfinder", "トルミル"),
    sc("WIN", "laptopcomputer", "Windows にリンク", "アプリを開く 65")]],
  ["AI", [
    u("GOOGLE", "magnifyingglass", "google://", "Google"),
    u("GPT", "bubble.left.and.bubble.right", "chatgpt://", "ChatGPT"),
    sc("GEMINI", "sparkles", "Gemini", "アプリを開く 17"),
    sc("COPLT", "wand.and.rays", "Copilot"),
    sc("MANUS", "hand.raised", "Manus", "アプリを開く 38"),
    sc("SPARK", "bolt", "Genspark")]],
  ["SNS・連絡", [
    u("LINE", "bubble.left", "line://", "LINE"),
    u("INSTA", "camera", "instagram://", "Instagram"),
    u("X", "at", "twitter://", "X"),
    u("DISCRD", "person.3", "discord://", "Discord"),
    u("TWITCH", "tv", "twitch://", "Twitch"),
    sc("SETLOG", "list.bullet", "setlog", "アプリを開く 23")]],
  ["エンタメ", [
    u("YT", "play.rectangle", "youtube://", "YouTube"),
    u("SPOT", "headphones", "spotify://", "Spotify"),
    u("YTM", "music.note.list", "youtubemusic://", "YouTube Music"),
    sc("JUMP", "book.pages", "ジャンプ+", "アプリを開く 89"),
    sc("SWITCH", "gamecontroller", "Nintendo Switch App"),
    sc("NSTORE", "bag", "Nintendo Store", "アプリを開く 40"),
    sc("CDREC", "opticaldisc", "CDレコ"),
    sc("IBIS", "paintbrush", "ibisPaint X")]],
  ["買い物・お金", [
    u("AMZN", "cart", "com.amazon.mobile.shopping://", "Amazon"),
    sc("RKTN", "bag", "楽天市場", "アプリを開く 102"),
    sc("ZOZO", "tshirt", "ZOZOTOWN", "アプリを開く 56"),
    sc("MUJI", "house", "MUJI", "アプリを開く 39"),
    sc("HPB", "scissors", "ホットペッパー", "アプリを開く 95"),
    sc("MIZUHO", "building.columns", "みずほ銀行", "アプリを開く 82"),
    sc("YUCHO", "yensign.circle", "ゆうちょ通帳", "アプリを開く 83"),
    sc("UQ", "antenna.radiowaves.left.and.right", "My UQ mobile", "アプリを開く 5")]],
  ["生活・その他", [["MARU", "丸ポップ（ショートカット経由）"],
    sc("WNEWS", "cloud.sun", "weathernews", "アプリを開く 55"),
    sc("ALEXA", "speaker.wave.2", "Amazon Alexa"),
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
    if (ok.map(x => renameUrls(x.apps)).some(Boolean)) saveSets(ok);
    return ok;
  } catch (e) {
    return defaultSets();
  }
}

// 自分で選んだ画像（iCloud の launcher/icons/）。ファイル名 → Image
const ICON_CACHE = {};

function iconPath(fm, name) {
  return fm.joinPath(fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), "icons"), name);
}

async function loadIcons(apps) {
  const fm = store();
  for (const a of apps) {
    if (!a.image || ICON_CACHE[a.image]) continue;
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
        const renamed = g.map(x => renameUrls(x.items)).some(Boolean);
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
    if (t) { app.icon = t; delete app.image; }
    return;
  }
  app.icon = ICONS[k - 3];
  delete app.image;
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
