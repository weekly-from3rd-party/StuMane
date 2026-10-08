// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: hourglass-half;

/* ============================================================
   COUNTDOWN ― Nothing 白基調 残り日数ウィジェット
   ------------------------------------------------------------
   「今年あと○日」などの残り時間と、試験日・旅行・誕生日などの
   カウントダウンを表示します（Scriptable 用）。

   カウントダウンの登録
     ★ いちばん簡単：▶ →「カウントダウンを編集」（コードは触らない）
        カレンダーの予定・リマインダーを一覧からタップで選ぶ／名前と日付を自分で入れる
        （iCloud の countdown/items.json に保存。iPhone と iPad で同じ）
     ほかの方法
     1. 下の CONFIG.events に書く（「カウントダウンを編集」を一度開くと一覧に移り、以後は一覧が使われる）
        date は "YYYY-MM-DD"（その日）か "MM-DD"（毎年。誕生日など）
     2. iOS カレンダーに専用のカレンダー（例「カウントダウン」）を作り、
        その名前を CONFIG.calendars に書く → 1 年先までの予定が並ぶ
     3. リマインダーから読む（期限のあるもの）：▶ →「リマインダーから読む」で選ぶ
        ・優先度「高」のもの ・決めたリストのもの ・フラグ付きのもの（ショートカット経由。COUNTDOWN.md）

   対応サイズ
     ホーム画面：小 / 中 / 大 / 特大（iPad）
     ロック画面：長方形 / 円形 / インライン

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     年 / 月 / 週 … 小サイズで、今年・今月・今週の残りを表示
     期末試験     … 名前にこの語を含むカウントダウンだけ表示
     dark         … 暗色テーマ（文字が白。暗い壁紙向け）
     透明         … 背景を透明に（設定方法は TODAY / TOMORROW と同じ）
     例）透明,期末試験

   アプリ内で ▶ 実行すると、サイズを選んでプレビューできます。
   ============================================================ */

// ---------- 設定 ----------
const CONFIG = {
  theme: "light",   // "light"（白基調・既定）/ "dark"
  events: [         // カウントダウン（例。自由に書き換えてください）
    { title: "冬休み", date: "2026-12-24" },
    { title: "期末試験", date: "2027-01-25" },
    { title: "誕生日", date: "03-14" },
  ],
  calendars: [],    // この名前のカレンダーの予定もカウントダウンに加える（例: ["カウントダウン"]）
  // リマインダーから読む（期限のある未完了のもの）。▶ →「リマインダーから読む」で変えると、そちらが優先（iCloud の countdown/settings.json）
  reminders: { priority: false, lists: [], flagged: false },
};
const DIR = "countdown";   // 透明背景の保存先フォルダ

// ---------- パラメータ ----------
const PARAMS = String(args.widgetParameter || "")
  .split(/[,、]/).map(s => s.trim()).filter(Boolean);
const THEME = PARAMS.map(p => p.toLowerCase()).find(p => p === "dark" || p === "light") || CONFIG.theme;
const CLEAR = PARAMS.some(p => /^(透明|clear)$/i.test(p));
const MODES = { "年": "YEAR", year: "YEAR", "月": "MONTH", month: "MONTH", "週": "WEEK", week: "WEEK" };
const OTHER = PARAMS.filter(p => !/^(dark|light|透明|clear)$/i.test(p));
const MODE = OTHER.map(p => MODES[p.toLowerCase()]).find(Boolean) || null;
const TITLES = OTHER.filter(p => !MODES[p.toLowerCase()]);

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

// カウントダウン 1 件＝1 行：「● D-12  名前  01.25」
const ROWSTYLE = {
  medium: { mark: 6, gap: 5, dW: 40, dSize: 11.5, titleSize: 13,   dateSize: 11,   weekday: false },
  large:  { mark: 6, gap: 6, dW: 46, dSize: 12,   titleSize: 14.5, dateSize: 11.5, weekday: true  },
};
// 残り時間 1 行：「YEAR  ●●●●○○  あと 87日」
const BARSTYLE = {
  medium: { labelW: 44, labelSize: 10,   dots: 10, pitch: 8, textSize: 11 },
  large:  { labelW: 52, labelSize: 10.5, dots: 20, pitch: 7, textSize: 11.5 },
};
const GAP = 5;        // 行と行の間
const BAR_GAP = 6;    // 残り時間の行の間
const NOTE_H = 16;    // 「+N件」などの 1 行
const SEP_H = 14;     // 中サイズの「COUNTDOWN」見出し
const SEC_H = 27;     // 大サイズの見出し（ラベル＋罫線）
const SEC_GAP = 10;   // 大サイズの欄の間
const ROOMY = (() => {
  try {
    const z = Device.screenSize();
    return !Device.isPad() && Math.max(z.width, z.height) >= 812;
  } catch (e) {
    return false;
  }
})();

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

  const D = await loadData();
  w.url = calshow(D.items.length ? D.items[0].date : D.now);
  w.refreshAfterDate = nextRefresh(D);

  switch (family) {
    case "small": buildSmall(w, D); break;
    case "large": buildLarge(w, D); break;
    case "extraLarge": buildExtraLarge(w, D); break;
    case "accessoryRectangular": buildRect(w, D); break;
    case "accessoryCircular": buildCircular(w, D); break;
    case "accessoryInline": buildInline(w, D); break;
    default: buildMedium(w, D);
  }
  return w;
}

// ---------- 小：いちばん近いカウントダウン（なければ今年の残り） ----------
function buildSmall(w, D) {
  w.setPadding(13, 14, 12, 14);
  const it = MODE ? null : D.items[0];
  if (!it) return smallPeriod(w, D, period(D, MODE || "YEAR"));

  const top = hstack(w);
  top.centerAlignContent();
  addText(top, it.days ? "NEXT" : "TODAY", mono(10.5, "semibold"), P.accent);
  top.addSpacer();
  addText(top, md(it.date) + " " + WEEK[it.date.getDay()], mono(10.5), P.dim);

  w.addSpacer(6);
  const big = hstack(w);
  big.centerAlignContent();
  addDots(big, String(it.days), 24, P.ink);
  big.addSpacer(6);
  addText(big, unit(it.days), mono(10.5, "semibold"), P.dim);
  big.addSpacer();

  w.addSpacer(5);
  const tl = hstack(w);
  const title = addText(tl, it.title, sys(14, "semibold"), P.ink);
  title.lineLimit = 2;
  title.minimumScaleFactor = 0.8;
  tl.addSpacer();

  w.addSpacer();
  addRule(w);
  w.addSpacer(5);
  const y = period(D, "YEAR");
  const bt = hstack(w);
  bt.centerAlignContent();
  addText(bt, String(D.now.getFullYear()), mono(9, "semibold"), P.dim);
  bt.addSpacer();
  addText(bt, leftText(y), mono(11, "semibold"), P.ink);
}

// 小：今年・今月・今週の残り
function smallPeriod(w, D, p) {
  const top = hstack(w);
  top.centerAlignContent();
  addText(top, p.label, mono(10.5, "semibold"), P.ink);
  top.addSpacer();
  addText(top, p.label === "YEAR" ? String(D.now.getFullYear()) : md(D.now) + " " + WEEK[D.now.getDay()], mono(10.5), P.dim);

  w.addSpacer(6);
  const big = hstack(w);
  big.centerAlignContent();
  addDots(big, String(p.left), 24, P.ink);
  big.addSpacer(6);
  const u = vstack(big);
  addText(u, p.left === 1 ? "DAY" : "DAYS", mono(10.5, "semibold"), P.dim);
  addText(u, "LEFT", mono(10.5), P.dim);
  big.addSpacer();

  w.addSpacer(8);
  leftLine(w, r => addDotRow(r, bar(p.ratio, 12), 9.5));
  w.addSpacer(5);
  leftLine(w, r => addText(r, pct(p.ratio), mono(12.5, "semibold"), P.ink));

  w.addSpacer();
  addRule(w);
  w.addSpacer(5);
  const bt = hstack(w);
  bt.centerAlignContent();
  const others = D.periods.filter(q => q.label !== p.label && q.label !== "TODAY");
  others.forEach((q, i) => {
    if (i) bt.addSpacer();
    addStat(bt, q.label, q.left);
  });
}

function addStat(parent, label, n) {
  addText(parent, label, mono(9, "semibold"), P.dim);
  parent.addSpacer(5);
  addText(parent, pad2(n), mono(12.5, "semibold"), P.ink);
}

// ---------- 中：左に今年の残り、右にカウントダウン ----------
function buildMedium(w, D) {
  w.setPadding(12, 13, 11, 13);
  const budget = ROOMY ? 130 : 122;
  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 10;

  const y = period(D, "YEAR");
  const dc = vstack(main);
  dc.size = new Size(64, 0);
  dc.url = calshow(D.now);              // 今年の残り → カレンダーの今日
  leftLine(dc, r => addText(r, String(D.now.getFullYear()), mono(10, "semibold"), P.ink));
  dc.addSpacer(4);
  leftLine(dc, r => addDots(r, String(y.left), 24, P.ink));
  dc.addSpacer(4);
  leftLine(dc, r => addText(r, "DAYS LEFT", mono(10), P.dim));
  dc.addSpacer();
  leftLine(dc, r => addDotRow(r, bar(y.ratio, 8), 8));
  dc.addSpacer(4);
  leftLine(dc, r => addText(r, pct(y.ratio), mono(10, "medium"), P.faint));

  const rule = vstack(main);
  rule.size = new Size(1, 0);
  rule.backgroundColor = P.rule;
  rule.addSpacer();

  const col = vstack(main);
  col.spacing = GAP;
  if (!D.items.length) {
    // カウントダウンがなければ今月・今週・今日の残り
    const box = vstack(col);
    box.spacing = BAR_GAP;
    D.periods.slice(1).forEach(p => addBarRow(box, p, BARSTYLE.medium));
    return;
  }
  const s = ROWSTYLE.medium;
  const hd = hstack(col);
  hd.centerAlignContent();
  addText(hd, "COUNTDOWN", mono(10, "semibold"), P.dim);
  hd.addSpacer();
  addText(hd, D.items.length + "件", mono(10), P.faint);
  const t = fitList(D.items, budget - SEP_H - GAP, s);
  t.shown.forEach(it => addCountRow(col, it, s));
  if (t.more) addNote(col, "+" + t.more + "件", s.mark + s.gap, mono(10, "medium"), P.faint);
}

// ---------- 大：残り時間 → カウントダウン ----------
function buildLarge(w, D) {
  w.setPadding(16, 16, 14, 16);
  const n = D.now;
  const h = hstack(w);
  h.centerAlignContent();
  addDots(h, md(n), 26, P.ink);
  h.addSpacer(10);
  addText(h, WEEK[n.getDay()], mono(11, "semibold"), P.ink);
  h.addSpacer();
  addText(h, "UPD " + hm(n), mono(9), P.faint);
  w.addSpacer(10);

  const budget = ROOMY ? 280 : 255;
  const used = addPeriodSection(w, D, BARSTYLE.large);
  w.addSpacer(SEC_GAP);
  addCountSection(w, D, budget - used - SEC_GAP, ROWSTYLE.large);
  w.addSpacer();
}

// ---------- 特大（iPad）：残り時間｜カウントダウン ----------
function buildExtraLarge(w, D) {
  w.setPadding(18, 18, 16, 18);
  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 14;

  const left = vstack(main);
  const h = hstack(left);
  h.centerAlignContent();
  addDots(h, md(D.now), 24, P.ink);
  h.addSpacer(8);
  addText(h, WEEK[D.now.getDay()], mono(11, "semibold"), P.ink);
  h.addSpacer();
  left.addSpacer(12);
  addPeriodSection(left, D, BARSTYLE.large);
  left.addSpacer();

  const rule = vstack(main);
  rule.size = new Size(1, 0);
  rule.backgroundColor = P.rule;
  rule.addSpacer();

  const right = vstack(main);
  const it = D.items[0];
  const rh = hstack(right);
  rh.centerAlignContent();
  addDots(rh, it ? String(it.days) : "-", 24, it ? P.ink : P.faint);
  rh.addSpacer(8);
  addText(rh, it ? unit(it.days) : "COUNTDOWN", mono(11, "semibold"), P.dim);
  rh.addSpacer();
  right.addSpacer(12);
  addCountSection(right, D, 262, ROWSTYLE.large);
  right.addSpacer();
}

// 見出し「REMAINING」＋残り時間 4 行。使った高さを返す
function addPeriodSection(parent, D, b) {
  const sec = vstack(parent);
  sec.url = calshow(D.now);             // 残り時間の欄 → カレンダーの今日
  sectionHead(sec, "REMAINING", "");
  const box = vstack(sec);
  box.spacing = BAR_GAP;
  D.periods.forEach(p => addBarRow(box, p, b));
  return SEC_H + D.periods.length * barRowHeight(b) + (D.periods.length - 1) * BAR_GAP;
}

function addCountSection(parent, D, budget, s) {
  const sec = vstack(parent);
  sectionHead(sec, "COUNTDOWN", D.items.length ? D.items.length + "件" : "");
  const box = vstack(sec);
  box.spacing = GAP;
  if (!D.items.length) {
    addNote(box, "カウントダウンはありません", s.mark + s.gap, sys(12), P.dim);
    return;
  }
  const t = fitList(D.items, budget - SEC_H, s);
  t.shown.forEach(it => addCountRow(box, it, s));
  if (t.more) addNote(box, "+" + t.more + "件", s.mark + s.gap, mono(10.5, "medium"), P.faint);
}

function sectionHead(sec, label, right) {
  const hd = hstack(sec);
  hd.centerAlignContent();
  addText(hd, label, mono(10.5, "semibold"), P.dim);
  hd.addSpacer();
  if (right) addText(hd, right, mono(10.5), P.faint);
  sec.addSpacer(5);
  addRule(sec);
  sec.addSpacer(7);
}

// ---------- ロック画面：長方形（3 行） ----------
function buildRect(w, D) {
  w.addAccessoryWidgetBackground = false;
  const rows = D.items.slice(0, 3).map(it => ({ left: it.days ? "D-" + it.days : "TODAY", title: it.title }));
  if (rows.length < 3) {
    const y = period(D, "YEAR");
    rows.push({ left: String(D.now.getFullYear()), title: leftText(y) });
  }
  const box = vstack(w);
  box.spacing = 1;
  rows.forEach(r => {
    const s = hstack(box);
    s.centerAlignContent();
    s.spacing = 4;
    const d = hstack(s);
    d.size = new Size(44, 0);
    addText(d, r.left, mono(12, "medium")).minimumScaleFactor = 0.7;
    d.addSpacer();
    addText(s, r.title, sys(13, "medium"));
    s.addSpacer();
  });
}

// ---------- ロック画面：円形 ----------
function buildCircular(w, D) {
  w.addAccessoryWidgetBackground = true;
  const it = D.items[0];
  const y = period(D, "YEAR");
  const label = it ? it.title.slice(0, 4) : String(D.now.getFullYear());
  const value = it ? (it.days ? it.days + "日" : "今日") : y.left + "日";
  centerLine(w, label, sys(10, "semibold")).minimumScaleFactor = 0.7;
  w.addSpacer(1);
  centerLine(w, value, mono(16, "semibold")).minimumScaleFactor = 0.6;
}

// ---------- ロック画面：インライン ----------
function buildInline(w, D) {
  const it = D.items[0];
  let s = D.now.getFullYear() + "年 " + leftText(period(D, "YEAR"));
  if (it) s = it.days ? it.title + "まで あと" + it.days + "日" : "今日は " + it.title;
  addText(w, s, sys(12, "medium"));
}

// ============================================================
// 行
// ============================================================
// カウントダウン 1 行：「● D-12  名前  01.25」（いちばん近い 1 件だけ赤）
function addCountRow(parent, it, s) {
  const row = hstack(parent);
  row.centerAlignContent();
  row.spacing = s.gap;
  row.url = calshow(it.date);
  const mark = row.addStack();
  mark.size = new Size(s.mark, s.mark);
  mark.cornerRadius = s.mark / 2;
  mark.backgroundColor = it.hl ? P.accent : Color.clear();
  fixedText(row, it.days ? "D-" + it.days : "TODAY", mono(s.dSize, "semibold"), it.hl ? P.accent : P.ink, s.dW);
  addText(row, it.title, sys(s.titleSize, "medium"), P.ink);
  row.addSpacer();
  addText(row, md(it.date) + (s.weekday ? " " + WEEK[it.date.getDay()] : ""), mono(s.dateSize), P.dim);
}

function rowHeight(s) { return Math.max(s.titleSize, s.dSize) * 1.32; }

// 上から順に入るだけ取る。入りきらなければ「+N件」の行も確保する
function fitList(list, budget, s) {
  for (let k = list.length; k >= 0; k--) {
    const more = list.length - k;
    let h = k * rowHeight(s) + Math.max(0, k - 1) * GAP;
    if (more) h += (k ? GAP : 0) + NOTE_H;
    if (h <= budget) return { shown: list.slice(0, k), more, height: h };
  }
  return { shown: [], more: list.length, height: NOTE_H };
}

// 残り時間 1 行：「YEAR  ●●●●○○  あと 87日」
function addBarRow(parent, p, b) {
  const row = hstack(parent);
  row.centerAlignContent();
  row.spacing = 6;
  fixedText(row, p.label, mono(b.labelSize, "semibold"), P.dim, b.labelW);
  addDotRow(row, bar(p.ratio, b.dots), b.pitch);
  row.addSpacer();
  addText(row, leftText(p), mono(b.textSize, "medium"), P.ink);
}

function barRowHeight(b) { return Math.max(b.textSize * 1.32, b.pitch); }

// ============================================================
// データ
// ============================================================
async function loadData() {
  const now = new Date();
  const today = dayStart(now, 0);
  let items = [];
  const saved = await readJson("items.json", null);
  if (Array.isArray(saved)) (await resolveItems(saved, today)).forEach(it => items.push(it));
  else CONFIG.events.forEach(e => {
    const date = parseDate(String(e.date || ""), today);
    if (date) items.push({ title: clean(e.title), date });
  });
  if (CONFIG.calendars.length) {
    try {
      const evs = await CalendarEvent.between(today, dayStart(now, 366));
      evs.filter(e => e.calendar && CONFIG.calendars.includes(e.calendar.title) && e.startDate >= today)
        .forEach(e => items.push({ title: clean(e.title), date: dayStart(e.startDate, 0) }));
    } catch (e) {
      // カレンダーが読めなくても CONFIG の分は表示する
    }
  }
  (await reminderItems(today)).forEach(it => items.push(it));
  const seen = new Set();   // 同じ名前・同じ日は 1 つに
  items = items.filter(it => { const k = it.title + "|" + it.date.getTime(); if (seen.has(k)) return false; seen.add(k); return true; });
  if (TITLES.length) items = items.filter(it => TITLES.some(t => it.title.includes(t)));
  items.forEach(it => { it.days = daysBetween(today, it.date); it.hl = false; });
  items = items.filter(it => it.days >= 0);
  items.sort((a, b) => (a.days - b.days) || a.title.localeCompare(b.title));
  if (items.length) items[0].hl = true;
  return { now, today, items, periods: periods(now) };
}

// ---------- リマインダーから読む（2026-10-08 ユーザー依頼：優先度「高」・リスト・フラグを自分で選ぶ） ----------
// Scriptable はリマインダーのフラグを読めないので、フラグ付きはショートカットが名前の一覧を渡して保存しておく（flagged.json）
function store() {
  try {
    return FileManager.iCloud();
  } catch (e) {
    return FileManager.local();
  }
}

function dataPath(fm, name) {
  return fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), name);
}

async function readJson(name, fallback) {
  const fm = store();
  const p = dataPath(fm, name);
  if (!fm.fileExists(p)) return fallback;
  try {
    await fm.downloadFileFromiCloud(p);
    return JSON.parse(fm.readString(p));
  } catch (e) {
    return fallback;
  }
}

function writeJson(name, value) {
  const fm = store();
  const dir = fm.joinPath(fm.documentsDirectory(), DIR);
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  fm.writeString(dataPath(fm, name), JSON.stringify(value));
}

async function reminderSettings() {
  const d = CONFIG.reminders || {};
  const s = await readJson("settings.json", null);
  const r = s && s.reminders ? s.reminders : d;
  return { priority: !!r.priority, lists: Array.isArray(r.lists) ? r.lists.map(String) : [], flagged: !!r.flagged };
}

async function reminderItems(today) {
  const st = await reminderSettings();
  if (!st.priority && !st.lists.length && !st.flagged) return [];
  let flagged = [];
  if (st.flagged) {
    const f = await readJson("flagged.json", null);
    flagged = f && Array.isArray(f.titles) ? f.titles.map(t => clean(t)) : [];
  }
  let rems = [];
  try {
    rems = await Reminder.allIncomplete();
  } catch (e) {
    return [];   // リマインダーが読めなくても、ほかの分は表示する
  }
  return rems.filter(r => r.dueDate && dayStart(r.dueDate, 0) >= today).filter(r =>
    (st.priority && r.priority >= 1 && r.priority <= 4)   // iOS の優先度「高」は 1〜4
    || (st.lists.length && r.calendar && st.lists.includes(r.calendar.title))
    || (st.flagged && flagged.includes(clean(r.title))))
    .map(r => ({ title: clean(r.title), date: dayStart(r.dueDate, 0) }));
}

// ショートカットから：フラグ付きリマインダーの名前（一覧・改行区切り・リマインダーそのもの）を受け取って保存する
function saveFlagged(input) {
  const list = Array.isArray(input) ? input : String(input == null ? "" : input).split(/\r?\n/);
  const titles = list.map(x => (x && typeof x === "object" && x.title) ? x.title : x).map(x => String(x == null ? "" : x).trim()).filter(Boolean);
  writeJson("flagged.json", { titles, at: new Date().getTime() });
  return titles.length;
}

// ▶ →「リマインダーから読む」：3 つを自分でオン・オフ
async function editReminderSettings() {
  const st = await reminderSettings();
  for (;;) {
    const mark = on => (on ? "✓ " : "　 ");
    const k = await sheet("リマインダーから読む（期限のあるものだけ）", [
      mark(st.priority) + "優先度「高」のもの",
      mark(st.lists.length) + "リストのもの：" + (st.lists.length ? st.lists.join("・") : "なし"),
      mark(st.flagged) + "フラグ付きのもの（ショートカット経由）",
      "保存して閉じる",
    ]);
    if (k < 0) return;
    if (k === 3) break;
    if (k === 0) st.priority = !st.priority;
    if (k === 1) {
      const a = new Alert();
      a.title = "どのリストを読む？";
      a.message = "リマインダーのリスト名。複数なら読点（、）で区切る。空にするとオフ。";
      a.addTextField("例：カウントダウン", st.lists.join("、"));
      a.addAction("決定");
      a.addCancelAction("キャンセル");
      if ((await a.presentAlert()) === 0) st.lists = String(a.textFieldValue(0) || "").split(/[,、]/).map(x => x.trim()).filter(Boolean);
    }
    if (k === 2) {
      st.flagged = !st.flagged;
      if (st.flagged) await notice("ショートカットが必要です", "Scriptable はフラグを読めないので、ショートカット「カウントダウンのフラグ」が名前の一覧を渡します。作り方は COUNTDOWN.md にあります。");
    }
  }
  writeJson("settings.json", { reminders: st });
}

// ---------- ▶ →「カウントダウンを編集」：コードを触らずに、一覧から選ぶ（2026-10-08 ユーザー依頼） ----------
// items.json：[{ title, src: "cal" | "rem" | "manual", id, date }]。cal・rem は id で元の予定を探し直し、日付は元に合わせる
// （元の予定を消した・リマインダーを完了にした → 出さない）。manual の date は "YYYY-MM-DD" か毎年の "MM-DD"
function idOf(e) {
  return String(e.identifier || (e.title + "@" + new Date(e.startDate || e.dueDate).getTime()));
}

function ymd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

async function calendarEvents(today) {
  try {
    return await CalendarEvent.between(today, dayStart(today, 366));
  } catch (e) {
    return [];
  }
}

async function dueReminders() {
  try {
    return (await Reminder.allIncomplete()).filter(r => r.dueDate);
  } catch (e) {
    return [];
  }
}

async function resolveItems(saved, today) {
  const out = [];
  const needCal = saved.some(x => x.src === "cal"), needRem = saved.some(x => x.src === "rem");
  const evs = needCal ? await calendarEvents(today) : [];
  const rems = needRem ? await dueReminders() : [];
  saved.forEach(x => {
    if (x.src === "cal") {
      // 同じ予定（繰り返しなら同じ id が並ぶ）のうち、登録した日にいちばん近いもの
      const same = evs.filter(e => idOf(e) === x.id && e.startDate >= today);
      if (!same.length) return;
      const want = new Date(x.date + "T00:00:00").getTime();
      const e = same.reduce((a, b) => (Math.abs(b.startDate - want) < Math.abs(a.startDate - want) ? b : a));
      out.push({ title: clean(x.title), date: dayStart(e.startDate, 0) });
    } else if (x.src === "rem") {
      const r = rems.find(v => idOf(v) === x.id);
      if (r) out.push({ title: clean(x.title), date: dayStart(r.dueDate, 0) });
    } else {
      const date = parseDate(String(x.date || ""), today);
      if (date) out.push({ title: clean(x.title), date });
    }
  });
  return out;
}

const UI = { dim: new Color("#5c5c59"), faint: new Color("#0d0d0d", 0.45), accent: new Color("#ff3b30"), ground: new Color("#f2f1ee") };
const SRC_NAME = { cal: "カレンダー", rem: "リマインダー", manual: "自分で入力" };
const WEEK_JA = ["日", "月", "火", "水", "木", "金", "土"];

function uiLabel(text) {
  const row = new UITableRow();
  row.height = 40;
  const t = row.addText(text);
  t.titleFont = Font.systemFont(13);
  t.titleColor = UI.dim;
  return row;
}

function uiAction(title, sub, fn) {
  const row = new UITableRow();
  row.height = 52;
  row.dismissOnSelect = false;
  const t = row.addText(title, sub);
  t.titleFont = Font.semiboldSystemFont(17);
  t.subtitleColor = UI.dim;
  row.onSelect = fn;
  return row;
}

function shortDate(x) {
  const m = String(x.date || "").match(/^(?:(\d{4})-)?(\d{2})-(\d{2})$/);
  if (!m) return "";
  return m[2] + "." + m[3] + (m[1] ? "" : "（毎年）");
}

async function loadItemsForEdit() {
  const saved = await readJson("items.json", null);
  if (Array.isArray(saved)) return saved;
  // 初めて：CONFIG.events を一覧に移す
  return CONFIG.events.map(e => ({ title: clean(e.title), src: "manual", date: String(e.date || "") })).filter(x => x.date);
}

async function editItems() {
  const items = await loadItemsForEdit();
  const save = () => writeJson("items.json", items);
  save();
  const table = new UITable();
  table.showSeparators = true;
  const draw = () => {
    table.removeAllRows();
    table.addRow(uiLabel("登録中のカウントダウン（" + items.length + " 件）　行をタップで名前を変える・✕ で外す"));
    if (!items.length) table.addRow(uiLabel("まだありません。下から選んでください。"));
    items.forEach((x, i) => {
      const row = new UITableRow();
      row.height = 54;
      row.dismissOnSelect = false;
      const t = row.addText(x.title, shortDate(x) + "　" + (SRC_NAME[x.src] || ""));
      t.widthWeight = 85;
      t.titleFont = Font.mediumSystemFont(16);
      t.subtitleColor = UI.dim;
      const del = row.addButton("✕");
      del.widthWeight = 15;
      del.onTap = () => { items.splice(i, 1); save(); draw(); };
      row.onSelect = async () => {
        const name = await askText("名前を変える", "ウィジェットに出る名前です。", x.title);
        if (name) { x.title = name; save(); }
        draw();
      };
      table.addRow(row);
    });
    table.addRow(uiAction("＋ カレンダーの予定から選ぶ", "1 年先までの予定。タップで入れる・外す", async () => { await pickFrom("cal", items, save); draw(); }));
    table.addRow(uiAction("＋ リマインダーから選ぶ", "期限のある未完了のもの。タップで入れる・外す", async () => { await pickFrom("rem", items, save); draw(); }));
    table.addRow(uiAction("＋ 自分で入れる", "名前と日付（毎年くり返す日も）", async () => { await addManual(items, save); draw(); }));
    table.reload();
  };
  draw();
  await table.present(true);
}

// カレンダー・リマインダーの一覧（月ごとの見出し）。タップで入れる・外す（✓）
async function pickFrom(src, items, save) {
  const today = dayStart(new Date(), 0);
  let list;
  if (src === "cal") {
    list = (await calendarEvents(today)).filter(e => e.startDate >= today)
      .sort((a, b) => a.startDate - b.startDate)
      .map(e => ({ id: idOf(e), title: clean(e.title), date: dayStart(e.startDate, 0), sub: e.isAllDay ? "終日" : hm(e.startDate), cal: e.calendar ? e.calendar.title : "" }));
  } else {
    list = (await dueReminders()).sort((a, b) => a.dueDate - b.dueDate)
      .map(r => ({ id: idOf(r), title: clean(r.title), date: dayStart(r.dueDate, 0), sub: dayStart(r.dueDate, 0) < today ? "期限切れ" : "", cal: r.calendar ? r.calendar.title : "" }));
  }
  const table = new UITable();
  table.showSeparators = true;
  const has = it => items.some(x => x.src === src && x.id === it.id && (src === "rem" || x.date === ymd(it.date)));
  const draw = () => {
    table.removeAllRows();
    table.addRow(uiLabel((src === "cal" ? "カレンダーの予定" : "リマインダー") + "　タップで入れる・外す。終わったら閉じる"));
    if (!list.length) table.addRow(uiLabel(src === "cal" ? "1 年先までの予定がありません（またはカレンダーへのアクセスが許可されていません）" : "期限のある未完了のリマインダーがありません"));
    let month = "";
    list.forEach(it => {
      const m = it.date.getFullYear() + "年" + (it.date.getMonth() + 1) + "月";
      if (m !== month) {
        month = m;
        const h = new UITableRow();
        h.isHeader = true;
        h.height = 34;
        h.addText(m).titleColor = UI.dim;
        table.addRow(h);
      }
      const row = new UITableRow();
      row.height = 52;
      row.dismissOnSelect = false;
      const d = row.addText(md(it.date), WEEK_JA[it.date.getDay()]);
      d.widthWeight = 16;
      d.titleFont = Font.mediumMonospacedSystemFont(14);
      d.subtitleColor = UI.dim;
      const t = row.addText(it.title, [it.sub, it.cal].filter(Boolean).join("・"));
      t.widthWeight = 72;
      t.subtitleColor = UI.dim;
      const mark = row.addText(has(it) ? "✓" : "");
      mark.widthWeight = 12;
      mark.rightAligned();
      mark.titleColor = UI.accent;
      mark.titleFont = Font.boldSystemFont(20);
      row.onSelect = () => {
        const k = items.findIndex(x => x.src === src && x.id === it.id && (src === "rem" || x.date === ymd(it.date)));
        if (k >= 0) items.splice(k, 1);
        else items.push({ title: it.title, src, id: it.id, date: ymd(it.date) });
        save();
        draw();
      };
      table.addRow(row);
    });
    table.reload();
  };
  draw();
  await table.present(true);
}

async function addManual(items, save) {
  const title = await askText("名前", "例：期末試験、旅行、誕生日", "");
  if (!title) return;
  const k = await sheet("くり返し", ["この日だけ", "毎年（誕生日など）"]);
  if (k < 0) return;
  const raw = await askText("日付", k === 0 ? "例：2026-12-24（2026/12/24 や 12/24 でも可。年がなければ次に来るその日）" : "例：03-14（3/14 でも可）", "");
  if (!raw) return;
  const date = normalizeDate(raw, k === 1);
  if (!date) {
    await notice("日付が読めません", "「2026-12-24」や「12/24」の形で入れてください。");
    return;
  }
  items.push({ title, src: "manual", date });
  save();
}

// 「2026/12/24」「12/24」「１２月２４日」→ "2026-12-24" / 毎年なら "12-24"
function normalizeDate(raw, yearly) {
  const t = String(raw).replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[年月\/.]/g, "-").replace(/日/g, "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let y = null, mo, d;
  if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = t.match(/^(\d{1,2})-(\d{1,2})$/))) { mo = +m[1]; d = +m[2]; }
  else return null;
  if (!validDate(y || 2028, mo, d)) return null;
  if (yearly) return pad2(mo) + "-" + pad2(d);
  if (y === null) {
    const now = dayStart(new Date(), 0);
    y = now.getFullYear();
    if (new Date(y, mo - 1, d) < now) y++;
  }
  return y + "-" + pad2(mo) + "-" + pad2(d);
}

async function askText(title, message, value) {
  const a = new Alert();
  a.title = title;
  a.message = message;
  a.addTextField("", value || "");
  a.addAction("決定");
  a.addCancelAction("キャンセル");
  if ((await a.presentAlert()) !== 0) return null;
  return String(a.textFieldValue(0) || "").trim() || null;
}

// "YYYY-MM-DD"（その日）/ "MM-DD"（毎年。過ぎていれば来年）
function parseDate(str, today) {
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = str.match(/^(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = today.getFullYear();
  const d = validDate(y, +m[1], +m[2]);
  if (!d) return null;
  return d < today ? validDate(y + 1, +m[1], +m[2]) || new Date(y + 1, +m[1] - 1, +m[2]) : d;
}

function validDate(y, mo, d) {
  const x = new Date(y, mo - 1, d);
  return x.getMonth() === mo - 1 && x.getDate() === d ? x : null;
}

// 今年・今月・今週（月曜はじまり）・今日の経過率と残り
function periods(now) {
  const y = now.getFullYear(), m = now.getMonth();
  const today = dayStart(now, 0);
  const mon = (now.getDay() + 6) % 7;
  return [
    ["YEAR", new Date(y, 0, 1), new Date(y + 1, 0, 1)],
    ["MONTH", new Date(y, m, 1), new Date(y, m + 1, 1)],
    ["WEEK", dayStart(now, -mon), dayStart(now, 7 - mon)],
    ["TODAY", today, dayStart(now, 1)],
  ].map(([label, s, e]) => ({
    label,
    ratio: Math.min(1, Math.max(0, (now - s) / (e - s))),
    left: daysBetween(today, e) - 1,          // 今日を除いた残り日数
    minutes: Math.max(0, Math.floor((e - now) / 60000)),
  }));
}

function period(D, label) { return D.periods.find(p => p.label === label) || D.periods[0]; }

function leftText(p) {
  if (p.label !== "TODAY") return "あと " + p.left + "日";
  return p.minutes >= 60 ? "あと " + Math.floor(p.minutes / 60) + "時間" : "あと " + p.minutes + "分";
}

function unit(days) { return days === 0 ? "D-DAY" : days === 1 ? "DAY" : "DAYS"; }

function bar(ratio, n) {
  const k = Math.round(ratio * n);
  return Array.from({ length: n }, (_, i) => (i < k ? 1 : 0));
}

function pct(ratio) { return Math.floor(ratio * 100) + "%"; }

function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

// 日付の変わり目で更新（大・特大の「今日の残り」のため最長 30 分）
function nextRefresh(D) {
  const now = D.now.getTime();
  return new Date(Math.max(now + 60 * 1000, Math.min(dayStart(D.now, 1).getTime() + 60 * 1000, now + 30 * 60 * 1000)));
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
  const opts = [["カウントダウンを編集", "edit"], ["小", "small"], ["中", "medium"], ["大", "large"]];
  if (Device.isPad()) opts.push(["特大", "extraLarge"]);
  opts.push(["ロック画面（長方形）", "accessoryRectangular"], ["リマインダーから読む", "reminders"], ["透明背景を設定", "setup-clear"]);
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
const FROM_SHORTCUT = args.shortcutParameter !== null && args.shortcutParameter !== undefined;
const family = FROM_SHORTCUT ? "flagged" : config.widgetFamily || (config.runsInApp ? await chooseAction() : "medium");
if (family === "flagged") {
  Script.setShortcutOutput("フラグ付き " + saveFlagged(args.shortcutParameter) + " 件を保存しました");
} else if (family === "edit") {
  await editItems();
} else if (family === "reminders") {
  await editReminderSettings();
} else if (family === "setup-clear") {
  await setupClear();
} else if (family) {
  const widget = await makeWidget(family);
  if (config.runsInApp) await preview(widget, family);
  else Script.setWidget(widget);
}
Script.complete();
