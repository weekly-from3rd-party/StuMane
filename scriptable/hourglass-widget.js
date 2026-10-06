// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: hourglass-half;

/* ============================================================
   HOURGLASS ― iOS のタイマーと連動する砂時計（Scriptable 用）
   ------------------------------------------------------------
   ショートカット「砂時計」から、iOS の時計アプリのタイマーと同時に
   開始します。上の砂が減って下に積もり、横に残り時間が出ます。

   しくみ
     ショートカット → このスクリプト（開始・終了時刻を記録し、分を返す）
                  → 時計アプリの「タイマーを開始」（返した分で開始）
     ※ Scriptable は時計アプリのタイマーを読めないので、時計アプリ側で
        止めたり変えたりしてもウィジェットには伝わりません。止めるときは
        ショートカットで「停止」も選んでください。

   ショートカットに渡す値（Run Script の Parameter）
     6:00    … 次の 6:00 まで（「7:30」など、ほかの時刻でも可）
     25      … 25 分
     停止    … 記録を消す（時計アプリのタイマーは自分で止める）

   ショートカットの作り方は scriptable/HOURGLASS.md を見てください。

   対応サイズ
     ロック画面：長方形 / 円形 / インライン
     ホーム画面：小 / 中 / 大

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     左 / 右 … 砂時計と残り時間（30 分刻みのドット数字）を 90 度回す（長方形・小）
     dark    … ホーム画面で暗色
   ============================================================ */

// ---------- 設定 ----------
const CONFIG = {
  theme: "light",         // "light"（白基調・既定）/ "dark"（ホーム画面のときだけ）
  shortcut: "砂時計",      // タップで開くショートカットの名前
};
const DIR = "hourglass";   // 記録の保存先フォルダ（iCloud）

// ---------- パラメータ ----------
const PARAMS = String(args.widgetParameter || "")
  .split(/[,、]/).map(s => s.trim()).filter(Boolean);
const THEME = PARAMS.map(p => p.toLowerCase()).find(p => p === "dark" || p === "light") || CONFIG.theme;
const TURN = PARAMS.some(p => /^(右|right)$/i.test(p)) ? "right" : PARAMS.some(p => /^(左|left)$/i.test(p)) ? "left" : null;

// ---------- 色（Nothing デザインテンプレ：白基調） ----------
const PALETTES = {
  light: {
    bg: new Color("#ffffff"), ink: new Color("#0d0d0d"), dim: new Color("#5c5c59"),
    faint: new Color("#0d0d0d", 0.5), ghost: new Color("#0d0d0d", 0.08), accent: new Color("#ff3b30"),
  },
  dark: {
    bg: new Color("#0f0f0f"), ink: new Color("#f2f2f2"), dim: new Color("#a8a8a5"),
    faint: new Color("#f2f2f2", 0.5), ghost: new Color("#ffffff", 0.08), accent: new Color("#ff3b30"),
  },
};
const P = PALETTES[THEME] || PALETTES.light;
// 砂時計の色：枠・砂・落ちている砂粒・空き。ロック画面は iOS が単色で塗るので白の濃淡
const SAND = {
  home: { frame: P.dim, sand: P.ink, grain: P.accent, empty: P.ghost, text: P.ink },
  lock: { frame: new Color("#ffffff", 0.55), sand: Color.white(), grain: Color.white(), empty: new Color("#ffffff", 0.14), text: Color.white() },
};

// 砂時計：横 9 × 縦 15 ドット。各段の中の幅（砂が入るマス）。0 の段は枠
const HG_W = [0, 7, 7, 5, 5, 3, 1, 1, 1, 3, 5, 5, 7, 7, 0];
const HG_CAP = 28;   // 上（または下）に入る砂の数

// 5×7 ドットマトリクス（数字と小数点）
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
  ".": ["0", "0", "0", "0", "0", "0", "1"],
};

// ============================================================
// ウィジェット本体
// ============================================================
async function makeWidget(family) {
  const now = new Date();
  const S = stateAt(await loadState(), now);
  const w = new ListWidget();
  w.url = "shortcuts://run-shortcut?name=" + encodeURIComponent(CONFIG.shortcut);
  w.refreshAfterDate = nextRefresh(S, now);
  const lock = family.indexOf("accessory") === 0;
  if (!lock) w.backgroundColor = P.bg;

  if (family === "accessoryInline") {
    addText(w, S.mode === "run" ? "砂時計 " + hm(S.end) + " まで" : S.mode === "done" ? "砂時計 " + hm(S.end) + " 終了" : "砂時計 待機中", Font.mediumSystemFont(12));
    return w;
  }
  if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    centered(w, image(S, null, new Size(60, 60), 3.6, SAND.lock, false));
    return w;
  }
  if (family === "accessoryRectangular") {
    if (TURN) return tiltedWidget(w, S, new Size(150, 62), SAND.lock);
    const row = hstack(w);
    row.centerAlignContent();
    addImage(row, image(S, null, null, 4, SAND.lock));   // 高さ 60pt（小さい機種の枠 64pt に収める）
    row.addSpacer(10);
    const col = vstack(row);
    col.spacing = 1;
    textLines(col, S, now, { label: 12, time: 17, sub: 11 }, null);
    row.addSpacer();
    return w;
  }
  if (family === "small") {
    w.setPadding(13, 14, 12, 14);
    if (TURN) return tiltedWidget(w, S, new Size(120, 120), SAND.home);
    const top = hstack(w);
    top.centerAlignContent();
    addText(top, title(S), mono(10.5, "semibold"), P.ink);
    top.addSpacer();
    addText(top, S.mode === "idle" ? "" : "→ " + hm(S.end), mono(10.5), P.dim);
    w.addSpacer(6);
    centered(w, image(S, null, null, 5, SAND.home));
    w.addSpacer();
    const b = hstack(w);
    b.addSpacer();
    bigTime(b, S, mono(20, "semibold"), "center");
    b.addSpacer();
    return w;
  }
  // 中・大：左に大きな砂時計、右に文字
  const big = family === "large";
  w.setPadding(big ? 18 : 12, big ? 18 : 14, big ? 16 : 11, big ? 18 : 14);
  const row = hstack(w);
  row.topAlignContent();
  addImage(row, image(S, null, null, big ? 12 : 7.4, SAND.home));
  row.addSpacer(16);
  const col = vstack(row);
  textLines(col, S, now, { label: big ? 15 : 13, time: big ? 34 : 30, sub: big ? 12 : 11 }, P);
  col.addSpacer();
  const left = hstack(col);
  left.centerAlignContent();
  addText(left, "LEFT", mono(9, "semibold"), P.dim);
  left.addSpacer(6);
  addText(left, Math.round(S.frac * 100) + "%", mono(12.5, "semibold"), P.ink);
  row.addSpacer();
  if (big) w.addSpacer();
  return w;
}

// 見出し・残り時間・時刻の 3 行
function textLines(col, S, now, size, colors) {
  const c = colors || { ink: null, dim: null };
  addText(col, title(S), Font.semiboldSystemFont(size.label), c.ink);
  col.addSpacer(colors ? 4 : 0);
  const t = hstack(col);
  bigTime(t, S, mono(size.time, "semibold"), "left", c.ink);
  t.addSpacer();
  col.addSpacer(colors ? 4 : 0);
  const sub = S.mode === "run" ? (colors ? hm(S.start) + " → " + hm(S.end) : "→ " + hm(S.end))
    : S.mode === "done" ? hm(S.end) + " に終了" : "タップで開始";
  addText(col, sub, colors ? mono(size.sub) : mono(size.sub, "medium"), c.dim);
}

// 残り時間：動いている間は iOS のタイマー表示（秒まで自動で進む）
function bigTime(parent, S, font, align, color) {
  if (S.mode !== "run") {
    const t = addText(parent, S.mode === "done" ? "0:00:00" : "--:--:--", font, color || null);
    t.minimumScaleFactor = 0.6;
    return t;
  }
  const d = parent.addDate(S.end);
  d.applyTimerStyle();
  d.font = font;
  if (color) d.textColor = color;
  d.lineLimit = 1;
  d.minimumScaleFactor = 0.6;
  if (align === "center") d.centerAlignText();
  else d.leftAlignText();
  return d;
}

function title(S) {
  return S.mode === "idle" ? "READY" : S.mode === "done" ? "DONE" : S.label;
}

// 90 度回した表示：砂時計の下に、残り時間を 30 分刻みのドット数字で
function tiltedWidget(w, S, frame, colors) {
  const left = Math.round(S.frac * S.hours * 2) / 2;
  const label = S.mode === "run" ? (left % 1 ? Math.floor(left) + ".5" : String(left)) : S.mode === "done" ? "0" : "";
  centered(w, image(S, label, frame, 0, colors, true));
  return w;
}

// ============================================================
// 砂時計を描く
// ============================================================
// label があれば、寝た姿勢から見て砂時計の下にドット数字を置き、全体を 90 度回す
function image(S, label, frame, pitch, colors, tilted) {
  const marks = [];   // 寝た姿勢の座標でのドット { x, y, d, color }
  let vw, vh, p;
  if (tilted) {
    vw = frame.height; vh = frame.width;
    const cols = label ? lineCols(label) : 0;
    p = Math.min(vw / 9, (vh * (label ? 0.62 : 0.95)) / 15);
    const q = label ? Math.min(vw / cols, (vh - 15 * p - p) / 7) : 0;
    const total = 15 * p + (label ? p + 7 * q : 0);
    const y0 = (vh - total) / 2;
    hourglassMarks(marks, (vw - 9 * p) / 2, y0, p, S.frac, S.mode === "run", colors);
    if (label) textMarks(marks, label, (vw - cols * q) / 2, y0 + 15 * p + p, q, colors);
  } else {
    p = pitch;
    vw = 9 * p; vh = 15 * p;
    hourglassMarks(marks, 0, 0, p, S.frac, S.mode === "run", colors);
  }
  const size = tilted ? frame : frame || new Size(vw, vh);
  const ox = tilted ? 0 : (size.width - vw) / 2, oy = tilted ? 0 : (size.height - vh) / 2;
  const dc = new DrawContext();
  dc.size = size;
  dc.opaque = false;
  dc.respectScreenScale = true;
  marks.forEach(m => {
    let x = m.x + ox, y = m.y + oy;
    if (tilted) {
      // 寝た姿勢の (u, v) → 左 90 度：(v, 高さ−u)／右 90 度：(幅−v, u)
      const u = m.x, v = m.y;
      x = TURN === "right" ? size.width - v : v;
      y = TURN === "right" ? u : size.height - u;
    }
    dc.setFillColor(m.color);
    dc.fillEllipse(new Rect(x - m.d / 2, y - m.d / 2, m.d, m.d));
  });
  return dc.getImage();
}

// 砂時計のドット。上の砂は くびれ側から、下の砂は 底から 中央寄りに詰める
function hourglassMarks(marks, x0, y0, p, frac, running, colors) {
  const up = Math.round(HG_CAP * frac), down = HG_CAP - up;
  const upSet = fillCells([6, 5, 4, 3, 2, 1], up), downSet = fillCells([13, 12, 11, 10, 9, 8], down);
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 9; c++) {
      const w = HG_W[r], off = Math.abs(c - 4);
      let color = null;
      if (r === 0 || r === 14) color = colors.frame;
      else if (r === 7 && c === 4) color = running && up > 0 ? colors.grain : colors.empty;   // 落ちている砂粒
      else if (w && off <= (w - 1) / 2) color = upSet.has(r + "," + c) || downSet.has(r + "," + c) ? colors.sand : colors.empty;
      else if (off === (w + 1) / 2) color = colors.frame;
      if (color) marks.push({ x: x0 + (c + 0.5) * p, y: y0 + (r + 0.5) * p, d: p * 0.8, color });
    }
  }
}

function fillCells(rows, n) {
  const set = new Set();
  for (const r of rows) {
    const w = HG_W[r];
    const cs = Array.from({ length: w }, (_, i) => 4 - (w - 1) / 2 + i).sort((a, b) => Math.abs(a - 4) - Math.abs(b - 4));
    for (const c of cs) {
      if (n-- <= 0) return set;
      set.add(r + "," + c);
    }
  }
  return set;
}

function textMarks(marks, text, x0, y0, q, colors) {
  let x = x0;
  text.split("").forEach((ch, i) => {
    const g = GLYPHS[ch] || GLYPHS["0"];
    if (i) {
      for (let r = 0; r < 7; r++) marks.push({ x: x + 0.5 * q, y: y0 + (r + 0.5) * q, d: q * 0.8, color: colors.empty });
      x += q;
    }
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < g[0].length; c++) {
        marks.push({ x: x + (c + 0.5) * q, y: y0 + (r + 0.5) * q, d: q * 0.8, color: g[r][c] === "1" ? colors.text : colors.empty });
      }
    }
    x += g[0].length * q;
  });
}

function lineCols(t) {
  return t.split("").reduce((n, c, i) => n + (GLYPHS[c] || GLYPHS["0"])[0].length + (i ? 1 : 0), 0);
}

// ============================================================
// 記録（iCloud の hourglass/state.json = { start, end, label }）
// ============================================================
function store() {
  try {
    return FileManager.iCloud();
  } catch (e) {
    return FileManager.local();
  }
}

function statePath(fm) {
  return fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), "state.json");
}

async function loadState() {
  const fm = store();
  const p = statePath(fm);
  if (!fm.fileExists(p)) return null;
  try {
    await fm.downloadFileFromiCloud(p);
    const s = JSON.parse(fm.readString(p));
    return s && s.start && s.end ? { start: new Date(s.start), end: new Date(s.end), label: String(s.label || "") } : null;
  } catch (e) {
    return null;
  }
}

function saveState(s) {
  const fm = store();
  const dir = fm.joinPath(fm.documentsDirectory(), DIR);
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  fm.writeString(statePath(fm), JSON.stringify(s ? { start: s.start.getTime(), end: s.end.getTime(), label: s.label } : {}));
}

// 今の状態：run（動いている）/ done（終わって 12 時間以内）/ idle
function stateAt(s, now) {
  if (!s || !(s.end > s.start)) return { mode: "idle", frac: 1, hours: 0, label: "" };
  const total = s.end - s.start;
  const frac = Math.min(1, Math.max(0, (s.end - now) / total));
  const mode = now < s.end ? "run" : now - s.end < 12 * 3600 * 1000 ? "done" : "idle";
  return { mode, frac: mode === "idle" ? 1 : frac, hours: total / 3600000, start: s.start, end: s.end, label: s.label };
}

// 砂 1 粒ぶんごと（最短 5 分）か終わる時刻に描き直す
function nextRefresh(S, now) {
  if (S.mode !== "run") return new Date(now.getTime() + 30 * 60 * 1000);
  const step = Math.max(5 * 60 * 1000, (S.end - S.start) / HG_CAP);
  return new Date(Math.min(S.end.getTime() + 5000, now.getTime() + step));
}

// ショートカットから：「6:00」→ 次の 6:00 まで ／「25」→ 25 分 ／「停止」→ 記録を消す。開始した分を返す
// 時刻は「6:30」「6時30分」「午後11:00」「2026/10/07 6:30」なども読める（最後に出てくる時刻を使う）
function startFrom(input, now) {
  const t = String(input || "").trim()
    .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/：/g, ":");
  if (/^(停止|stop|止める)$/i.test(t)) {
    saveState(null);
    return { minutes: 0, message: "砂時計を止めました。時計アプリのタイマーは、時計アプリで止めてください。" };
  }
  let end, label;
  const at = parseClock(t);
  if (at) {
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), at.h, at.m);
    if (end <= now) end = new Date(end.getTime() + 24 * 3600 * 1000);
    label = at.h + ":" + pad2(at.m) + " まで";
  } else if (/^\d+(\.\d+)?$/.test(t) && +t > 0 && +t <= 24 * 60) {
    end = new Date(now.getTime() + Math.round(+t * 60) * 1000);
    label = String(+t) + " 分";
  } else {
    return { minutes: 0, message: "「6:00」のような時刻か、「25」のような分を渡してください。" };
  }
  // 時計アプリのタイマーは分単位なので、終わる時刻を分にそろえる
  const minutes = Math.max(1, Math.round((end - now) / 60000));
  const start = new Date(now.getTime());
  saveState({ start, end: new Date(start.getTime() + minutes * 60000), label });
  return { minutes, message: label + "（" + minutes + " 分）で開始しました。" };
}

// 文字の中の時刻（最後のもの）→ { h, m }。午前・午後 / AM・PM に対応
function parseClock(t) {
  const all = Array.from(t.matchAll(/(\d{1,2})\s*(?::|時)\s*(\d{1,2})?\s*分?/g));
  if (!all.length) return null;
  const x = all[all.length - 1];
  let h = +x[1], m = x[2] === undefined ? 0 : +x[2];
  const pm = /午後|PM/i.test(t), am = /午前|AM/i.test(t);
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  return h < 24 && m < 60 ? { h, m } : null;
}

// ============================================================
// 小道具
// ============================================================
function addText(parent, str, font, color) {
  const t = parent.addText(String(str));
  t.font = font;
  if (color) t.textColor = color;
  t.lineLimit = 1;
  return t;
}

function addImage(parent, img) {
  const i = parent.addImage(img);
  i.imageSize = img.size;
  return i;
}

function centered(parent, img) {
  const r = hstack(parent);
  r.addSpacer();
  addImage(r, img);
  r.addSpacer();
  return r;
}

function hstack(parent) { const s = parent.addStack(); s.layoutHorizontally(); return s; }
function vstack(parent) { const s = parent.addStack(); s.layoutVertically(); return s; }

function mono(size, weight) {
  const name = { medium: "mediumMonospacedSystemFont", semibold: "semiboldMonospacedSystemFont" }[weight]
    || "regularMonospacedSystemFont";
  return Font[name](size);
}

function pad2(n) { return String(n).padStart(2, "0"); }
function hm(d) { return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }

async function preview(w, family) {
  const fn = {
    small: "presentSmall", medium: "presentMedium", large: "presentLarge",
    accessoryRectangular: "presentAccessoryRectangular",
    accessoryCircular: "presentAccessoryCircular",
    accessoryInline: "presentAccessoryInline",
  }[family];
  if (fn && typeof w[fn] === "function") await w[fn]();
  else await w.presentSmall();
}

async function chooseAction() {
  const opts = [["ショートカットで開始", "run"], ["ロック画面（長方形）", "accessoryRectangular"], ["ロック画面（円形）", "accessoryCircular"],
    ["小", "small"], ["中", "medium"], ["止める", "stop"]];
  const a = new Alert();
  a.title = "砂時計";
  opts.forEach(o => a.addAction(o[0]));
  a.addCancelAction("キャンセル");
  const i = await a.presentSheet();
  return i >= 0 ? opts[i][1] : null;
}

// ============================================================
// 実行（ファイルの最後に置くこと）
// ============================================================
if (args.shortcutParameter !== undefined && args.shortcutParameter !== null && !config.runsInWidget) {
  // ショートカットから呼ばれた：記録して、タイマーに渡す分を返す
  const r = startFrom(args.shortcutParameter, new Date());
  Script.setShortcutOutput(r.minutes);
} else {
  const family = config.widgetFamily || (config.runsInApp ? await chooseAction() : "accessoryRectangular");
  if (family === "run") {
    Safari.open("shortcuts://run-shortcut?name=" + encodeURIComponent(CONFIG.shortcut));
  } else if (family === "stop") {
    startFrom("停止", new Date());
    const a = new Alert();
    a.title = "砂時計を止めました";
    a.message = "時計アプリのタイマーは、時計アプリで止めてください。";
    a.addAction("OK");
    await a.presentAlert();
  } else if (family) {
    const widget = await makeWidget(family);
    if (config.runsInApp) await preview(widget, family);
    else Script.setWidget(widget);
  }
}
Script.complete();
