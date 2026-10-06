// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: clock;

/* ============================================================
   CLOCK ― Nothing 白基調 時計ウィジェット
   ------------------------------------------------------------
   時刻（秒まで）・日付・1 日の 24 時間・世界時計を表示します
   （Scriptable 用）。タップで iOS の時計アプリを開きます。

   時刻の進み方
     iOS で自動的に進むのは「タイマー表示」だけなので、午前 0 時からの
     経過時間を表示して時計にしています。そのため秒は常に表示されます。
     0 時台は「24:30:15」のように表示します。

   対応サイズ
     ホーム画面：小 / 中 / 大 / 特大（iPad）
     ロック画面：長方形（世界時計）/ 円形（2 都市目）/ インライン（時差）

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     ロンドン,パリ … 表示する都市（下の CITIES にある名前）
     dark          … 暗色テーマ（文字が白。暗い壁紙向け）
     透明          … 背景を透明に（設定方法は TODAY / TOMORROW と同じ）
     例）透明,ニューヨーク

   アプリ内で ▶ 実行すると、サイズを選んでプレビューできます。
   ============================================================ */

// ---------- 設定 ----------
const CONFIG = {
  theme: "light",                                     // "light"（白基調・既定）/ "dark"
  home: "TOKYO",                                      // この端末の時刻につける名前
  cities: ["ロンドン", "東京"],                        // 世界時計（CITIES の名前か { label, tz }）
  open: "alarm",                                      // タップで開く画面：alarm / worldclock / timer / stopwatch
};
const DIR = "clock";   // 透明背景の保存先フォルダ

// 都市名 → [表示名, タイムゾーン]
const CITIES = {
  "東京": ["TOKYO", "Asia/Tokyo"], "ソウル": ["SEOUL", "Asia/Seoul"], "上海": ["SHANGHAI", "Asia/Shanghai"],
  "台北": ["TAIPEI", "Asia/Taipei"], "香港": ["HONG KONG", "Asia/Hong_Kong"], "シンガポール": ["SINGAPORE", "Asia/Singapore"],
  "バンコク": ["BANGKOK", "Asia/Bangkok"], "デリー": ["DELHI", "Asia/Kolkata"], "ドバイ": ["DUBAI", "Asia/Dubai"],
  "ロンドン": ["LONDON", "Europe/London"], "パリ": ["PARIS", "Europe/Paris"], "ベルリン": ["BERLIN", "Europe/Berlin"],
  "ニューヨーク": ["NEW YORK", "America/New_York"], "シカゴ": ["CHICAGO", "America/Chicago"],
  "ロサンゼルス": ["LOS ANGELES", "America/Los_Angeles"], "ホノルル": ["HONOLULU", "Pacific/Honolulu"],
  "シドニー": ["SYDNEY", "Australia/Sydney"], "オークランド": ["AUCKLAND", "Pacific/Auckland"],
};

// ---------- パラメータ ----------
const PARAMS = String(args.widgetParameter || "")
  .split(/[,、]/).map(s => s.trim()).filter(Boolean);
const THEME = PARAMS.map(p => p.toLowerCase()).find(p => p === "dark" || p === "light") || CONFIG.theme;
const CLEAR = PARAMS.some(p => /^(透明|clear)$/i.test(p));
const ZONES = (() => {
  const pick = PARAMS.filter(p => CITIES[p]);
  return (pick.length ? pick : CONFIG.cities).map(c => {
    if (typeof c === "string") return CITIES[c] ? { label: CITIES[c][0], tz: CITIES[c][1] } : null;
    return c && c.tz ? { label: String(c.label || c.tz).toUpperCase(), tz: c.tz } : null;
  }).filter(z => z && validZone(z.tz));
})();
const OPEN = "clock-" + ({ alarm: 1, worldclock: 1, timer: 1, stopwatch: 1 }[CONFIG.open] ? CONFIG.open : "alarm") + "://";
// 中・大・特大は場所ごとに開く画面を分ける（小・ロック画面は OPEN だけ）
const TAP = { time: "clock-alarm://", hours: "clock-timer://", world: "clock-worldclock://" };

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
const SEC_H = 27;   // 大サイズの見出し（ラベル＋罫線）

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
  const accessory = family.indexOf("accessory") === 0;
  const w = new ListWidget();
  w.spacing = 0;
  if (!accessory) {
    if (CLEAR) {
      const bg = loadClearBg(family);
      if (!bg) return calibrationWidget(w);
      w.backgroundImage = bg;
    } else {
      w.backgroundColor = P.bg;
    }
  }

  const now = new Date();
  w.url = OPEN;
  w.refreshAfterDate = nextRefresh(now);

  switch (family) {
    case "small": buildSmall(w, now); break;
    case "large": buildLarge(w, now); break;
    case "extraLarge": buildExtraLarge(w, now); break;
    case "accessoryRectangular": buildRect(w, now); break;
    case "accessoryCircular": buildCircular(w, now); break;
    case "accessoryInline": buildInline(w, now); break;
    default: buildMedium(w, now);
  }
  return w;
}

// ---------- 小：曜日・日付／時刻／2 都市目／24 時間の点 ----------
function buildSmall(w, now) {
  w.setPadding(13, 14, 12, 14);
  const top = hstack(w);
  top.centerAlignContent();
  addText(top, WEEK[now.getDay()], mono(10.5, "semibold"), P.ink);
  top.addSpacer();
  addText(top, md(now), mono(10.5), P.dim);

  w.addSpacer(8);
  leftLine(w, r => addClock(r, now, null, mono(26, "semibold"), P.ink));
  const z = ZONES[0];
  if (z) {
    w.addSpacer(2);
    const c = hstack(w);
    c.centerAlignContent();
    addText(c, short(z.label), mono(10.5, "semibold"), P.dim);
    c.addSpacer(6);
    addClock(c, now, z.tz, mono(10.5), P.dim);
    c.addSpacer();
  }

  w.addSpacer();
  hourDots(w, now, 12, 10);
}

// ---------- 中：左に時刻と日付、右に世界時計と残り ----------
function buildMedium(w, now) {
  w.setPadding(12, 13, 11, 13);
  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 12;

  const left = vstack(main);
  left.size = new Size(150, 0);
  left.url = TAP.time;
  leftLine(left, r => addText(r, CONFIG.home, mono(10, "semibold"), P.ink));
  left.addSpacer(2);
  leftLine(left, r => addClock(r, now, null, mono(30, "semibold"), P.ink));
  left.addSpacer(6);
  hourDots(left, now, 24, 6);
  left.addSpacer();
  const d = hstack(left);
  d.centerAlignContent();
  addDots(d, md(now), 24, P.ink);
  d.addSpacer(8);
  addText(d, WEEK[now.getDay()], mono(10, "semibold"), P.dim);
  d.addSpacer();

  const rule = vstack(main);
  rule.size = new Size(1, 0);
  rule.backgroundColor = P.rule;
  rule.addSpacer();

  const right = vstack(main);
  right.spacing = 8;
  right.url = TAP.world;
  ZONES.slice(0, 2).forEach(z => {
    const b = vstack(right);
    b.spacing = 2;
    const l = hstack(b);
    l.centerAlignContent();
    addText(l, z.label, mono(10, "semibold"), P.dim).minimumScaleFactor = 0.7;
    l.addSpacer(6);
    addText(l, diffLabel(now, z.tz), mono(10), P.faint);
    l.addSpacer();
    leftLine(b, r => addClock(r, now, z.tz, mono(15, "semibold"), P.ink));
  });
  const rest = vstack(right);
  rest.spacing = 3;
  [["TODAY", dayRatio(now)], ["MONTH", monthRatio(now)]].forEach(([label, ratio]) => {
    const row = hstack(rest);
    row.centerAlignContent();
    const lb = hstack(row);
    lb.size = new Size(40, 0);
    addText(lb, label, mono(9, "semibold"), P.dim);
    lb.addSpacer();
    addDotRow(row, bar(ratio, 10), 6);
    row.addSpacer();
  });
}

// ---------- 大：日付／時刻／24 時間／世界時計 ----------
function buildLarge(w, now) {
  w.setPadding(16, 16, 14, 16);
  largeTop(w, now);
  w.addSpacer(12);
  hourSection(w, now, 11.5);
  w.addSpacer(12);
  worldSection(w, now, 3);
  w.addSpacer();
}

// ---------- 特大（iPad）：時刻と 24 時間｜世界時計 ----------
function buildExtraLarge(w, now) {
  w.setPadding(18, 18, 16, 18);
  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 14;
  const left = vstack(main);
  largeTop(left, now);
  left.addSpacer(12);
  hourSection(left, now, 12.5);
  left.addSpacer();
  const rule = vstack(main);
  rule.size = new Size(1, 0);
  rule.backgroundColor = P.rule;
  rule.addSpacer();
  const right = vstack(main);
  worldSection(right, now, 6);
  right.addSpacer();
}

function largeTop(parent0, now) {
  const parent = vstack(parent0);
  parent.url = TAP.time;
  const h = hstack(parent);
  h.centerAlignContent();
  addDots(h, md(now), 26, P.ink);
  h.addSpacer(10);
  addText(h, WEEK[now.getDay()], mono(11, "semibold"), P.ink);
  h.addSpacer();
  addText(h, CONFIG.home, mono(10.5), P.faint);
  parent.addSpacer(10);
  leftLine(parent, r => addClock(r, now, null, mono(44, "semibold"), P.ink));
}

// 見出し「24H」＋24 個の点（今の時間だけ赤）と 0/6/12/18 の目盛り
function hourSection(parent0, now, pitch) {
  const parent = vstack(parent0);
  parent.url = TAP.hours;
  sectionHead(parent, "24H", pad2(now.getHours()) + ":00–");
  leftLine(parent, r => addDotRow(r, hourStates(now), pitch));
  parent.addSpacer(3);
  const marks = hstack(parent);
  [0, 6, 12, 18].forEach(hh => {
    const c = hstack(marks);
    c.size = new Size(pitch * 6, 0);
    addText(c, String(hh), mono(9), P.faint);
    c.addSpacer();
  });
  marks.addSpacer();
}

// 見出し「WORLD」＋都市ごとに「名前 時差 …… 時刻」
function worldSection(parent0, now, max) {
  const parent = vstack(parent0);
  parent.url = TAP.world;
  sectionHead(parent, "WORLD", "");
  const box = vstack(parent);
  box.spacing = 6;
  if (!ZONES.length) {
    addText(box, "都市が設定されていません", sys(12), P.dim);
    return;
  }
  ZONES.slice(0, max).forEach(z => {
    const row = hstack(box);
    row.centerAlignContent();
    addText(row, z.label, mono(11.5, "semibold"), P.ink).minimumScaleFactor = 0.7;
    row.addSpacer(8);
    addText(row, diffLabel(now, z.tz), mono(11), P.faint);
    row.addSpacer();
    addClock(row, now, z.tz, mono(16, "semibold"), P.ink, "right");
  });
}

function sectionHead(parent, label, right) {
  const hd = hstack(parent);
  hd.centerAlignContent();
  addText(hd, label, mono(10.5, "semibold"), P.dim);
  hd.addSpacer();
  if (right) addText(hd, right, mono(10.5), P.faint);
  parent.addSpacer(5);
  addRule(parent);
  parent.addSpacer(7);
}

// ---------- ロック画面：長方形（世界時計 3 行） ----------
function buildRect(w, now) {
  w.addAccessoryWidgetBackground = false;
  const box = vstack(w);
  box.spacing = 1;
  const rows = ZONES.slice(0, 3);
  if (!rows.length) {
    addText(box, "都市が未設定", sys(13, "medium"));
    return;
  }
  rows.forEach(z => {
    const s = hstack(box);
    s.centerAlignContent();
    s.spacing = 4;
    const n = hstack(s);
    n.size = new Size(66, 0);
    addText(n, short(z.label), mono(12, "semibold")).minimumScaleFactor = 0.7;
    n.addSpacer();
    addClock(s, now, z.tz, mono(13, "medium"), null);
    s.addSpacer();
  });
}

// ---------- ロック画面：円形（2 都市目の時刻） ----------
function buildCircular(w, now) {
  w.addAccessoryWidgetBackground = true;
  const z = ZONES[0];
  centerLine(w, z ? short(z.label) : CONFIG.home, sys(10, "semibold")).minimumScaleFactor = 0.7;
  w.addSpacer(1);
  const s = hstack(w);
  s.addSpacer();
  addClock(s, now, z ? z.tz : null, mono(13, "semibold"), null, "center").minimumScaleFactor = 0.5;
  s.addSpacer();
}

// ---------- ロック画面：インライン（時差。時刻は進まないため出さない） ----------
function buildInline(w, now) {
  const s = ZONES.slice(0, 2).map(z => z.label + " " + diffLabel(now, z.tz)).join(" ・ ") || CONFIG.home;
  addText(w, s, sys(12, "medium"));
}

// ============================================================
// 時刻
// ============================================================
// 自動で進む時刻：その場所の午前 0 時からの経過時間をタイマー表示する（0 時台は「24:」）
// タイマー表示は横幅いっぱいに広がるので、揃え（left / center / right）を必ず指定する
function addClock(parent, now, tz, font, color, align) {
  const t = wall(now, tz);
  let ms = ((t.h * 60 + t.m) * 60 + t.s) * 1000 + now.getMilliseconds();
  if (t.h === 0) ms += 24 * 3600 * 1000;
  const d = parent.addDate(new Date(now.getTime() - ms));
  d.applyTimerStyle();
  d.font = font;
  if (color) d.textColor = color;
  d.lineLimit = 1;
  d.minimumScaleFactor = 0.7;
  if (align === "right") d.rightAlignText();
  else if (align === "center") d.centerAlignText();
  else d.leftAlignText();
  return d;
}

// その場所の年月日・時分秒（tz なし = この端末）
function wall(now, tz) {
  if (!tz) {
    return { y: now.getFullYear(), mo: now.getMonth() + 1, d: now.getDate(), h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() };
  }
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
  });
  const v = {};
  f.formatToParts(now).forEach(p => { v[p.type] = +p.value; });
  return { y: v.year, mo: v.month, d: v.day, h: v.hour % 24, m: v.minute, s: v.second };
}

function validZone(tz) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

// この端末との時差（例 -8H / +5.5H / ±0H）
function diffLabel(now, tz) {
  const a = wall(now, tz), b = wall(now, null);
  const diff = (Date.UTC(a.y, a.mo - 1, a.d, a.h, a.m) - Date.UTC(b.y, b.mo - 1, b.d, b.h, b.m)) / 3600000;
  const n = Math.round(diff * 4) / 4;
  return (n > 0 ? "+" : n < 0 ? "-" : "±") + Math.abs(n) + "H";
}

// 狭い場所用の略称
const SHORT = { "LOS ANGELES": "LA", "NEW YORK": "NYC", "HONG KONG": "HKG", "SINGAPORE": "SIN", "SHANGHAI": "SHA", "HONOLULU": "HNL", "AUCKLAND": "AKL" };
function short(label) { return label.length > 8 ? SHORT[label] || label.slice(0, 3) : label; }

// 24 個の点：過ぎた時間=点灯 / 今の時間=赤 / これから=消灯
function hourStates(now) {
  const h = now.getHours();
  return Array.from({ length: 24 }, (_, i) => (i < h ? 1 : i === h ? "a" : 0));
}

// 24 時間の点を perRow 個ずつ並べる
function hourDots(parent, now, perRow, pitch) {
  const st = hourStates(now);
  for (let i = 0; i < 24; i += perRow) {
    if (i) parent.addSpacer(2);
    leftLine(parent, r => addDotRow(r, st.slice(i, i + perRow), pitch));
  }
}

function dayRatio(now) { return (now - dayStart(now, 0)) / 86400000; }
function monthRatio(now) {
  const s = new Date(now.getFullYear(), now.getMonth(), 1), e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return (now - s) / (e - s);
}

function bar(ratio, n) {
  const k = Math.round(ratio * n);
  return Array.from({ length: n }, (_, i) => (i < k ? 1 : 0));
}

// 1 時間ごとに更新（赤い点と日付のため。時差が 30 分単位の都市があれば 30 分ごと）
function nextRefresh(now) {
  const half = ZONES.some(z => wall(now, z.tz).m !== now.getMinutes());
  const step = (half ? 30 : 60) * 60 * 1000;
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
  let t = base;
  while (t <= now.getTime()) t += step;
  return new Date(t + 2000);
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
  const opts = [["小", "small"], ["中", "medium"], ["大", "large"]];
  if (Device.isPad()) opts.push(["特大", "extraLarge"]);
  opts.push(["ロック画面（長方形）", "accessoryRectangular"], ["透明背景を設定", "setup-clear"]);
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
const family = config.widgetFamily || (config.runsInApp ? await chooseAction() : "medium");
if (family === "setup-clear") {
  await setupClear();
} else if (family) {
  const widget = await makeWidget(family);
  if (config.runsInApp) await preview(widget, family);
  else Script.setWidget(widget);
}
Script.complete();
