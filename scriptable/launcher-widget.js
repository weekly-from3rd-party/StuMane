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

   アプリの追加・並べ替え
     下の CONFIG.apps を書き換えます。
       label … 表示名（英大文字 6 文字程度まで）
       icon  … SF Symbols の名前（「SF Symbols」アプリで探せます）
       url   … 開く URL（"calshow:" はカレンダーの今日）
       style … "invert"（黒地に白）/ "accent"（赤）/ 省略（白地に黒）
     URL で開けないアプリは、ショートカットアプリで「App を開く」だけの
     ショートカットを作り、url を "shortcuts://run-shortcut?name=名前" にします。

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     2     … 2 ページ目（中は 9〜16 個目、大は 17〜32 個目）を表示
     dark  … 暗色テーマ（文字が白。暗い壁紙向け）
     透明  … 背景を透明に（設定方法は TODAY / TOMORROW と同じ）
     例）透明,2

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
async function makeWidget(family) {
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

  const g = GRID[family] || GRID.medium;
  const per = g.cols * g.rows;
  const apps = CONFIG.apps.slice((PAGE - 1) * per, PAGE * per);

  if (family === "small") {
    w.setPadding(13, 14, 12, 14);
    w.url = menuUrl();                  // 小は 1 か所しかタップできない → 一覧を開く
    grid(w, apps, g, now, false);
    return w;
  }
  if (family === "large" || family === "extraLarge") {
    const pad = family === "large" ? [16, 16, 14, 16] : [18, 18, 16, 18];
    w.setPadding(...pad);
    header(w, now, family === "large" ? 26 : 24);
    w.addSpacer(12);
  } else {
    w.setPadding(12, 13, 11, 13);
  }
  grid(w, apps, g, now, true);
  w.addSpacer();
  return w;
}

function header(w, now, dots) {
  const h = hstack(w);
  h.centerAlignContent();
  addDots(h, md(now), dots, P.ink);
  h.addSpacer(10);
  addText(h, WEEK[now.getDay()], mono(11, "semibold"), P.ink);
  h.addSpacer();
  const pages = Math.ceil(CONFIG.apps.length / (GRID.large.cols * GRID.large.rows));
  addText(h, pages > 1 ? "APPS " + PAGE + "/" + pages : "APPS", mono(10.5), P.faint);
}

// タイルを cols 列に並べる。tap = タイルごとに開く先を持たせる
function grid(parent, apps, g, now, tap) {
  const box = vstack(parent);
  box.spacing = g.gap;
  if (!apps.length) {
    addText(box, "このページにアプリはありません", sys(12), P.dim);
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
  tile.backgroundColor = app.style === "invert" ? P.ink : P.ghost;
  tile.addSpacer();
  const img = tile.addImage(symbol(app.icon, g.icon));
  const s = Math.round(g.icon * 0.5);
  img.imageSize = new Size(s, s);
  img.tintColor = app.style === "invert" ? P.bg : app.style === "accent" ? P.accent : P.ink;
  tile.addSpacer();
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

// 小サイズのタップ：このスクリプトを一覧つきで開く
function menuUrl() {
  const base = URLScheme.forRunningScript();
  return base + (base.indexOf("?") >= 0 ? "&" : "?") + "launch=menu";
}

// ▶ / 小サイズのタップから：一覧で選んで開く
async function appMenu() {
  const apps = CONFIG.apps.filter(a => a.url);
  const i = await sheet("アプリを開く", apps.map(a => a.label));
  if (i >= 0) Safari.open(appUrl(apps[i], new Date()));
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
  const opts = [["アプリを開く", "menu"], ["小", "small"], ["中", "medium"], ["大", "large"]];
  if (Device.isPad()) opts.push(["特大", "extraLarge"]);
  opts.push(["透明背景を設定", "setup-clear"]);
  const i = await sheet("プレビュー・設定", opts.map(o => o[0]));
  return i >= 0 ? opts[i][1] : null;
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
// 小サイズのタップ（URL に launch=menu）なら一覧を出す
const MENU = (args.queryParameters || {}).launch === "menu";
const family = MENU ? "menu" : config.widgetFamily || (config.runsInApp ? await chooseAction() : "medium");
if (family === "menu") {
  await appMenu();
} else if (family === "setup-clear") {
  await setupClear();
} else if (family) {
  const widget = await makeWidget(family);
  if (config.runsInApp) await preview(widget, family);
  else Script.setWidget(widget);
}
Script.complete();
