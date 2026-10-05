// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: calendar-check;

/* ============================================================
   HABIT ― Nothing 白基調 習慣トラッカーウィジェット
   ------------------------------------------------------------
   筋トレ・読書・勉強などの「今日やったか」と連続日数を表示します
   （Scriptable 用）。記録は iCloud Drive の Scriptable フォルダ
   （habit/records.json）に保存し、iPhone と iPad で共有します。

   記録のつけ方
     ・ウィジェットの習慣をタップ → Scriptable が開いて今日の記録がつく
       （もう一度タップすると取り消すか聞かれます）
     ・Scriptable で ▶ →「今日の記録をつける」／「過去 7 日の記録を直す」
     ※ 記録してからウィジェットに反映されるまで、少しかかることがあります

   対応サイズ
     ホーム画面：小 / 中 / 大 / 特大（iPad）
     ロック画面：長方形 / 円形 / インライン

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     読書        … その習慣だけ表示（小サイズは 1 つ目を大きく表示）
     dark        … 暗色テーマ（文字が白。暗い壁紙向け）
     透明        … 背景を透明に（設定方法は TODAY / TOMORROW と同じ）
     例）透明,読書

   重要：このスクリプトの名前を変えたら、ウィジェットを置き直してください
   （タップで開く先にスクリプト名が入るため）。
   ============================================================ */

// ---------- 設定 ----------
const CONFIG = {
  theme: "light",                     // "light"（白基調・既定）/ "dark"
  habits: ["筋トレ", "読書", "勉強"],   // 習慣の名前（上から順に表示。名前が記録の鍵なので、変えると記録が分かれる）
};
const DIR = "habit";   // 透明背景・記録の保存先フォルダ

// ---------- パラメータ ----------
const PARAMS = String(args.widgetParameter || "")
  .split(/[,、]/).map(s => s.trim()).filter(Boolean);
const THEME = PARAMS.map(p => p.toLowerCase()).find(p => p === "dark" || p === "light") || CONFIG.theme;
const CLEAR = PARAMS.some(p => /^(透明|clear)$/i.test(p));
const HABITS = (() => {
  const names = PARAMS.filter(p => !/^(dark|light|透明|clear)$/i.test(p));
  const pick = CONFIG.habits.filter(h => names.includes(h));
  return pick.length ? pick : CONFIG.habits;
})();

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
const WEEK1 = ["S", "M", "T", "W", "T", "F", "S"];

const GAP = 5;        // 中サイズの行の間
const BLOCK_GAP = 9;  // 大サイズの習慣の間
const NOTE_H = 16;    // 「+N件」などの 1 行
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
  w.refreshAfterDate = nextRefresh(D);
  if (!D.habits.length) return emptyWidget(w, accessory);
  w.url = recordUrl(D.habits[0].name);

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

// ---------- 小：1 つの習慣を大きく（連続日数と直近 7 日） ----------
function buildSmall(w, D) {
  w.setPadding(13, 14, 12, 14);
  const h = D.habits[0];
  const top = hstack(w);
  top.centerAlignContent();
  addText(top, h.name, sys(14, "semibold"), P.ink).minimumScaleFactor = 0.8;
  top.addSpacer();
  addText(top, md(D.now), mono(10.5), P.dim);

  w.addSpacer(6);
  const big = hstack(w);
  big.centerAlignContent();
  addDots(big, String(h.streak), 24, h.streak ? P.ink : P.faint);
  big.addSpacer(6);
  const u = vstack(big);
  addText(u, h.streak === 1 ? "DAY" : "DAYS", mono(10.5, "semibold"), P.dim);
  addText(u, "STREAK", mono(10.5), P.dim);
  big.addSpacer();

  w.addSpacer(8);
  const pitch = 17;
  leftLine(w, r => addDotRow(r, dayStates(h, D.now, 7), pitch));
  w.addSpacer(3);
  leftLine(w, r => addWeekLetters(r, D.now, 7, pitch, 9));

  w.addSpacer();
  addRule(w);
  w.addSpacer(5);
  const bt = hstack(w);
  bt.centerAlignContent();
  addText(bt, "TODAY", mono(9, "semibold"), h.done ? P.dim : P.accent);
  bt.addSpacer();
  addText(bt, h.done ? "記録済み" : "タップで記録", sys(11, "medium"), h.done ? P.ink : P.dim);
}

// ---------- 中：習慣ごとに 1 行（名前・直近 7 日・連続日数） ----------
function buildMedium(w, D) {
  w.setPadding(12, 13, 11, 13);
  const budget = ROOMY ? 130 : 122;
  const pitch = 13, streakW = 40, gap = 8;

  const hd = hstack(w);
  hd.centerAlignContent();
  addText(hd, "HABIT", mono(10, "semibold"), P.ink);
  hd.addSpacer(8);
  addText(hd, md(D.now) + " " + WEEK[D.now.getDay()], mono(10), P.dim);
  hd.addSpacer();
  addText(hd, D.doneCount + "/" + D.habits.length + " DONE", mono(10), P.faint);
  w.addSpacer(6);

  const lt = hstack(w);
  lt.addSpacer();
  addWeekLetters(lt, D.now, 7, pitch, 9);
  const pad = lt.addStack();   // 連続日数の列のぶん空ける
  pad.size = new Size(gap + streakW, 0);
  w.addSpacer(3);

  const head = 10 * 1.22 + 6 + 9 * 1.22 + 3;
  const rowH = 13 * 1.32;
  const fit = fitCount(D.habits.length, budget - head, rowH, GAP);
  const box = vstack(w);
  box.spacing = GAP;
  D.habits.slice(0, fit.shown).forEach(h => {
    const row = hstack(box);
    row.centerAlignContent();
    row.url = recordUrl(h.name);
    addText(row, h.name, sys(13, "medium"), P.ink);
    row.addSpacer();
    addDotRow(row, dayStates(h, D.now, 7), pitch);
    row.addSpacer(gap);
    addStreak(row, h, mono(11.5, "semibold"), streakW);
  });
  if (fit.more) addNote(box, "+" + fit.more + "件", 0, mono(10, "medium"), P.faint);
  w.addSpacer();
}

// ---------- 大：習慣ごとに 2 行（名前・連続日数／直近 28 日） ----------
function buildLarge(w, D) {
  w.setPadding(16, 16, 14, 16);
  largeHeader(w, D);
  w.addSpacer(10);
  const budget = ROOMY ? 280 : 255;
  habitBlocks(w, D, D.habits, budget);
  w.addSpacer();
}

// ---------- 特大（iPad）：2 列 ----------
function buildExtraLarge(w, D) {
  w.setPadding(18, 18, 16, 18);
  largeHeader(w, D);
  w.addSpacer(12);
  const half = Math.ceil(D.habits.length / 2);
  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 14;
  [D.habits.slice(0, half), D.habits.slice(half)].forEach((list, i) => {
    if (i) {
      const rule = vstack(main);
      rule.size = new Size(1, 0);
      rule.backgroundColor = P.rule;
      rule.addSpacer();
    }
    const col = vstack(main);
    habitBlocks(col, D, list, 250);
    col.addSpacer();
  });
  w.addSpacer();
}

function largeHeader(w, D) {
  const h = hstack(w);
  h.centerAlignContent();
  addDots(h, md(D.now), 26, P.ink);
  h.addSpacer(10);
  addText(h, WEEK[D.now.getDay()], mono(11, "semibold"), P.ink);
  h.addSpacer();
  addText(h, D.doneCount + "/" + D.habits.length + " DONE", mono(10.5), P.faint);
}

// 見出し「HABIT 28 DAYS」＋習慣ごとのブロック
function habitBlocks(parent, D, list, budget) {
  const sec = vstack(parent);
  const hd = hstack(sec);
  hd.centerAlignContent();
  addText(hd, "HABIT", mono(10.5, "semibold"), P.dim);
  hd.addSpacer();
  addText(hd, "LAST 28 DAYS", mono(10.5), P.faint);
  sec.addSpacer(5);
  addRule(sec);
  sec.addSpacer(7);

  const pitch = 10;
  const blockH = 14.5 * 1.32 + 3 + pitch;
  const fit = fitCount(list.length, budget - 27, blockH, BLOCK_GAP);
  const box = vstack(sec);
  box.spacing = BLOCK_GAP;
  list.slice(0, fit.shown).forEach(h => {
    const b = vstack(box);
    b.url = recordUrl(h.name);
    const l1 = hstack(b);
    l1.centerAlignContent();
    addText(l1, h.name, sys(14.5, "medium"), P.ink);
    l1.addSpacer();
    addText(l1, h.month + "/28", mono(11.5), P.faint);
    l1.addSpacer(10);
    addStreak(l1, h, mono(12, "semibold"), 44);
    b.addSpacer(3);
    leftLine(b, r => addDotRow(r, dayStates(h, D.now, 28), pitch));
  });
  if (fit.more) addNote(box, "+" + fit.more + "件", 0, mono(10.5, "medium"), P.faint);
}

// ---------- ロック画面：長方形（3 行） ----------
function buildRect(w, D) {
  w.addAccessoryWidgetBackground = false;
  const box = vstack(w);
  box.spacing = 1;
  D.habits.slice(0, 3).forEach(h => {
    const s = hstack(box);
    s.centerAlignContent();
    s.spacing = 4;
    const m = hstack(s);
    m.size = new Size(16, 0);
    addText(m, h.done ? "✓" : "○", sys(12, "bold"));
    m.addSpacer();
    const t = addText(s, h.name, sys(13, "medium"));
    if (h.done) t.textOpacity = 0.6;
    s.addSpacer();
    addText(s, h.streak + "日", mono(12, "medium"));
  });
}

// ---------- ロック画面：円形 ----------
function buildCircular(w, D) {
  w.addAccessoryWidgetBackground = true;
  centerLine(w, "HABIT", sys(10, "semibold"));
  w.addSpacer(1);
  centerLine(w, D.doneCount + "/" + D.habits.length, mono(17, "semibold")).minimumScaleFactor = 0.6;
}

// ---------- ロック画面：インライン ----------
function buildInline(w, D) {
  const next = D.habits.find(h => !h.done);
  const s = "HABIT " + D.doneCount + "/" + D.habits.length + " ・ " + (next ? "次: " + next.name : "すべて完了");
  addText(w, s, sys(12, "medium"));
}

function emptyWidget(w, accessory) {
  if (accessory) {
    addText(w, "習慣が未設定", sys(12, "semibold"));
    return w;
  }
  w.setPadding(14, 14, 14, 14);
  addText(w, "習慣が設定されていません", sys(14, "semibold"), P.ink).lineLimit = 2;
  w.addSpacer(5);
  addText(w, "スクリプト冒頭の CONFIG.habits に習慣の名前を書いてください。", sys(12), P.dim).lineLimit = 3;
  return w;
}

// ============================================================
// 行の部品
// ============================================================
// 点の状態：記録あり=1 / なし=0 / 今日まだ=輪（記録を促す 1 件だけ赤い輪）
function dayStates(h, now, n) {
  const out = [];
  for (let k = n - 1; k >= 0; k--) {
    const on = h.days.has(ymd(dayStart(now, -k)));
    out.push(on ? 1 : k ? 0 : h.hl ? "R" : "r");
  }
  return out;
}

// 点の下の曜日の頭文字
function addWeekLetters(parent, now, n, pitch, size) {
  const row = hstack(parent);
  for (let k = n - 1; k >= 0; k--) {
    const c = hstack(row);
    c.size = new Size(pitch, 0);
    c.addSpacer();
    addText(c, WEEK1[dayStart(now, -k).getDay()], mono(size, k ? "" : "semibold"), k ? P.faint : P.ink);
    c.addSpacer();
  }
  return row;
}

// 連続日数（右寄せ）
function addStreak(parent, h, font, width) {
  const box = hstack(parent);
  box.size = new Size(width, 0);
  box.addSpacer();
  addText(box, h.streak + "日", font, h.streak ? P.ink : P.faint).minimumScaleFactor = 0.7;
  return box;
}

// 高さの予算に入る件数。入りきらなければ「+N件」の行も確保する
function fitCount(n, budget, rowH, gap) {
  for (let k = n; k >= 0; k--) {
    const more = n - k;
    let h = k * rowH + Math.max(0, k - 1) * gap;
    if (more) h += (k ? gap : 0) + NOTE_H;
    if (h <= budget) return { shown: k, more };
  }
  return { shown: 0, more: n };
}

// タップで開く URL（Scriptable でこのスクリプトを開き、その習慣の今日を記録）
function recordUrl(name) {
  const base = URLScheme.forRunningScript();
  return base + (base.indexOf("?") >= 0 ? "&" : "?") + "habit=" + encodeURIComponent(name);
}

// ============================================================
// データ（記録 = { 習慣名: ["YYYY-MM-DD", ...] }）
// ============================================================
async function loadData() {
  const now = new Date();
  const rec = await loadRecords();
  const today = ymd(now);
  const habits = HABITS.map(name => {
    const days = new Set(rec[name] || []);
    let month = 0;
    for (let k = 0; k < 28; k++) if (days.has(ymd(dayStart(now, -k)))) month++;
    return { name, days, done: days.has(today), streak: streak(days, now), month, hl: false };
  });
  const next = habits.find(h => !h.done);
  if (next) next.hl = true;   // まだの習慣のうち、上の 1 つだけ赤
  return { now, habits, doneCount: habits.filter(h => h.done).length };
}

// 連続日数：今日が済んでいれば今日から、まだなら昨日から数える
function streak(days, now) {
  let k = days.has(ymd(now)) ? 0 : 1, n = 0;
  while (days.has(ymd(dayStart(now, -k)))) {
    n++;
    k++;
  }
  return n;
}

function store() {
  try {
    return FileManager.iCloud();
  } catch (e) {
    return FileManager.local();   // iCloud が使えない端末
  }
}

function recordPath(fm) {
  return fm.joinPath(fm.joinPath(fm.documentsDirectory(), DIR), "records.json");
}

async function loadRecords() {
  const fm = store();
  const p = recordPath(fm);
  if (!fm.fileExists(p)) return {};
  try {
    await fm.downloadFileFromiCloud(p);
    const rec = JSON.parse(fm.readString(p));
    return rec && typeof rec === "object" ? rec : {};
  } catch (e) {
    return {};
  }
}

function saveRecords(rec) {
  const fm = store();
  const dir = fm.joinPath(fm.documentsDirectory(), DIR);
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  fm.writeString(recordPath(fm), JSON.stringify(rec));
}

// その日の記録をつける / 外す。古い記録は 400 日分だけ残す
async function setRecord(name, date, on) {
  const rec = await loadRecords();
  const key = ymd(date);
  const list = (rec[name] || []).filter(d => d !== key);
  if (on) list.push(key);
  list.sort();
  rec[name] = list.slice(-400);
  saveRecords(rec);
}

function ymd(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }

// 日付の変わり目で更新（記録を反映するため最長 30 分）
function nextRefresh(D) {
  const now = D.now.getTime();
  return new Date(Math.max(now + 60 * 1000, Math.min(dayStart(D.now, 1).getTime() + 60 * 1000, now + 30 * 60 * 1000)));
}

// ============================================================
// 記録の操作（アプリ内）
// ============================================================
// ウィジェットのタップから：今日の記録をつける（済みなら取り消すか聞く）
async function recordToday(name) {
  if (!CONFIG.habits.includes(name)) {
    await notice("習慣が見つかりません", "「" + name + "」は CONFIG.habits にありません。");
    return;
  }
  const D = await loadData();
  const h = D.habits.find(x => x.name === name) || { done: false };
  if (h.done) {
    const a = new Alert();
    a.title = name;
    a.message = "今日はもう記録済みです。取り消しますか？";
    a.addDestructiveAction("取り消す");
    a.addCancelAction("そのまま");
    if ((await a.presentAlert()) !== 0) return;
    await setRecord(name, D.now, false);
    await notice(name, "今日の記録を取り消しました。");
    return;
  }
  await setRecord(name, D.now, true);
  const after = await loadData();
  const x = after.habits.find(v => v.name === name);
  await notice("✓ " + name, "今日の記録をつけました。連続 " + (x ? x.streak : 1) + " 日");
}

// ▶ メニューから：習慣を選んで今日を記録
async function recordMenu() {
  const D = await loadData();
  const all = CONFIG.habits.map(name => D.habits.find(h => h.name === name) || { name, done: false });
  const i = await sheet("今日の記録", all.map(h => (h.done ? "✓ " : "○ ") + h.name));
  if (i >= 0) await recordToday(all[i].name);
}

// ▶ メニューから：過去 7 日のどこかを付け外し
async function fixMenu() {
  const i = await sheet("記録を直す習慣", CONFIG.habits);
  if (i < 0) return;
  const name = CONFIG.habits[i];
  const D = await loadData();
  const days = new Set((await loadRecords())[name] || []);
  const opts = [];
  for (let k = 0; k < 7; k++) {
    const d = dayStart(D.now, -k);
    opts.push({ d, on: days.has(ymd(d)) });
  }
  const j = await sheet(name + "：付け外しする日", opts.map(o => (o.on ? "✓ " : "○ ") + md(o.d) + " " + WEEK[o.d.getDay()]));
  if (j < 0) return;
  await setRecord(name, opts[j].d, !opts[j].on);
  await notice(name, md(opts[j].d) + " の記録を" + (opts[j].on ? "外しました。" : "つけました。"));
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
  const opts = [["今日の記録をつける", "record"], ["過去 7 日の記録を直す", "fix"], ["小", "small"], ["中", "medium"], ["大", "large"]];
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
// ウィジェットのタップ（URL に habit=名前）なら、その習慣の今日を記録する
const LINK = (args.queryParameters || {}).habit;
const family = LINK ? null : config.widgetFamily || (config.runsInApp ? await chooseAction() : "medium");
if (LINK) {
  await recordToday(LINK);
} else if (family === "record") {
  await recordMenu();
} else if (family === "fix") {
  await fixMenu();
} else if (family === "setup-clear") {
  await setupClear();
} else if (family) {
  const widget = await makeWidget(family);
  if (config.runsInApp) await preview(widget, family);
  else Script.setWidget(widget);
}
Script.complete();
