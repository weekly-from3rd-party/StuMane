// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: check-circle;

/* ============================================================
   TODO ― Nothing 白基調 今日のやることウィジェット
   ------------------------------------------------------------
   iOS リマインダーから、今日が期限（期限切れを含む）の未完了の
   項目を表示します（Scriptable 用）。追加・完了はリマインダー
   アプリで行います。ウィジェットをタップするとリマインダーが開きます。

   対応サイズ
     ホーム画面：小 / 中 / 大 / 特大（iPad）
     ロック画面：長方形 / 円形 / インライン

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     仕事,買い物 … そのリストだけ表示
     dark        … 暗色テーマ（文字が白。暗い壁紙向け）
     透明        … 背景を透明に（設定方法は TODAY / TOMORROW と同じ）
     例）透明,仕事

   アプリ内で ▶ 実行すると、サイズを選んでプレビューできます。
   ============================================================ */

// ---------- 設定 ----------
const CONFIG = {
  theme: "light",   // "light"（白基調・既定）/ "dark"
  lists: [],        // 表示するリマインダーのリスト名。空 = すべて（例: ["仕事", "買い物"]）
  undated: false,   // true にすると、期限のない項目も「今日」の後ろに並べる
};
const DIR = "todo";   // 透明背景の保存先フォルダ
const OPEN = "x-apple-reminderkit://";   // タップで開くリマインダーアプリ

// ---------- パラメータ ----------
const PARAMS = String(args.widgetParameter || "")
  .split(/[,、]/).map(s => s.trim()).filter(Boolean);
const THEME = PARAMS.map(p => p.toLowerCase()).find(p => p === "dark" || p === "light") || CONFIG.theme;
const CLEAR = PARAMS.some(p => /^(透明|clear)$/i.test(p));
const LISTS = (() => {
  const names = PARAMS.filter(p => !/^(dark|light|透明|clear)$/i.test(p));
  return names.length ? names : CONFIG.lists;
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

// 項目 1 件＝1 行：「○ 項目名 …… 14:00」
const ROWSTYLE = {
  small:  { ring: 9,  gap: 5, titleSize: 13,   timeSize: 11,   time: false },
  medium: { ring: 10, gap: 6, titleSize: 13,   timeSize: 11.5, time: true },
  large:  { ring: 11, gap: 7, titleSize: 14.5, timeSize: 12,   time: true },
};
const GAP = 5;        // 行と行の間
const NOTE_H = 16;    // 「+N件」「やることなし」などの 1 行
const SEP_H = 14;     // 中サイズの「TOMORROW」区切り行
const SEC_H = 27;     // 大サイズの見出し（ラベル＋罫線）
const SEC_GAP = 10;   // 大サイズの今日と明日の間
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

  let D;
  try {
    D = await loadData();
  } catch (err) {
    return errorWidget(w, accessory);
  }

  w.url = OPEN;
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

// ---------- 小：残り件数と上から 3 件 ----------
function buildSmall(w, D) {
  w.setPadding(13, 14, 12, 14);
  const top = hstack(w);
  top.centerAlignContent();
  addText(top, "TODO", mono(10.5, "semibold"), P.ink);
  top.addSpacer();
  addText(top, md(D.now) + " " + WEEK[D.now.getDay()], mono(10.5), P.dim);

  w.addSpacer(6);
  const big = hstack(w);
  big.centerAlignContent();
  addDots(big, count(D.today.length), 24, D.today.length ? P.ink : P.faint);
  big.addSpacer(6);
  const u = vstack(big);
  addText(u, "LEFT", mono(10.5, "semibold"), P.dim);
  if (D.total) addText(u, D.done + "/" + D.total + " DONE", mono(10.5), P.faint);
  big.addSpacer();

  w.addSpacer(6);
  const s = ROWSTYLE.small;
  const box = vstack(w);
  box.spacing = 4;
  if (!D.today.length) {
    const t = addText(box, emptyText(D), sys(12), P.dim);
    t.lineLimit = 2;
  } else {
    const k = D.today.length > 3 ? 2 : 3;
    D.today.slice(0, k).forEach(it => addTodoRow(box, it, s));
    if (D.today.length > k) addNote(box, "+" + (D.today.length - k) + "件", s.ring + s.gap, mono(10.5, "medium"), P.faint);
  }
  w.addSpacer();
}

// ---------- 中：左に残り件数、右に今日のやること（余白があれば明日） ----------
function buildMedium(w, D) {
  w.setPadding(12, 13, 11, 13);
  const s = ROWSTYLE.medium;
  const budget = ROOMY ? 130 : 122;

  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 10;

  const dc = vstack(main);
  dc.size = new Size(40, 0);
  leftLine(dc, r => addDots(r, count(D.today.length), 24, D.today.length ? P.ink : P.faint));
  dc.addSpacer(4);
  leftLine(dc, r => addText(r, "TODO", mono(10, "semibold"), P.accent));
  dc.addSpacer(1);
  leftLine(dc, r => addText(r, "LEFT", mono(10), P.dim));
  dc.addSpacer();
  if (D.total) {
    leftLine(dc, r => addText(r, "DONE", mono(10), P.dim));
    dc.addSpacer(1);
    leftLine(dc, r => addText(r, D.done + "/" + D.total, mono(10, "medium"), P.faint));
  }

  const rule = vstack(main);
  rule.size = new Size(1, 0);
  rule.backgroundColor = P.rule;
  rule.addSpacer();

  const col = vstack(main);
  col.spacing = GAP;
  let used = NOTE_H, more = 0;
  if (D.today.length) {
    const t = fitList(D.today, budget, s);
    t.shown.forEach(it => addTodoRow(col, it, s));
    if (t.more) addNote(col, "+" + t.more + "件", s.ring + s.gap, mono(10, "medium"), P.faint);
    used = t.height;
    more = t.more;
  } else {
    addNote(col, emptyText(D), 0, sys(12), P.dim);
  }
  const rest = budget - used - GAP;
  if (!more && D.tomorrow.length && rest >= SEP_H + GAP + rowHeight(s)) {
    const sep = hstack(col);
    sep.centerAlignContent();
    addText(sep, "TOMORROW", mono(10, "semibold"), P.dim);
    sep.addSpacer(6);
    addText(sep, md(D.tomorrowStart) + " " + WEEK[D.tomorrowStart.getDay()], mono(10), P.dim);
    sep.addSpacer();
    addText(sep, D.tomorrow.length + "件", mono(10), P.faint);
    fitList(D.tomorrow, rest - SEP_H - GAP, s, true).shown.forEach(it => addTodoRow(col, it, s));
  }
}

// ---------- 大：今日・明日を上下に ----------
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

  const s = ROWSTYLE.large;
  const budget = ROOMY ? 280 : 255;
  // 明日の見出し＋1 件ぶんを残して、今日を先に詰める
  const keep = SEC_GAP + SEC_H + (D.tomorrow.length ? rowHeight(s) : NOTE_H);
  const t = fitList(D.today, budget - keep - SEC_H, s);
  addSection(w, "TODAY", D.total ? D.done + "/" + D.total + " DONE" : "", D.today.length ? t : null, emptyText(D), s);
  const rest = budget - SEC_H - (D.today.length ? t.height : NOTE_H) - SEC_GAP - SEC_H;
  if (rest >= (D.tomorrow.length ? rowHeight(s) : NOTE_H)) {
    w.addSpacer(SEC_GAP);
    const m = fitList(D.tomorrow, rest, s);
    addSection(w, "TOMORROW", D.tomorrow.length ? D.tomorrow.length + "件" : "", D.tomorrow.length ? m : null, "やることなし", s,
      md(D.tomorrowStart) + " " + WEEK[D.tomorrowStart.getDay()]);
  }
  w.addSpacer();
}

// ---------- 特大（iPad）：今日｜明日 の 2 列 ----------
function buildExtraLarge(w, D) {
  w.setPadding(18, 18, 16, 18);
  const s = ROWSTYLE.large;
  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 14;
  const cols = [
    { label: "TODAY", day: D.now, list: D.today, right: D.total ? D.done + "/" + D.total + " DONE" : "", empty: emptyText(D) },
    { label: "TOMORROW", day: D.tomorrowStart, list: D.tomorrow, right: D.tomorrow.length ? D.tomorrow.length + "件" : "", empty: "やることなし" },
  ];
  cols.forEach((c, i) => {
    if (i) {
      const rule = vstack(main);
      rule.size = new Size(1, 0);
      rule.backgroundColor = P.rule;
      rule.addSpacer();
    }
    const col = vstack(main);
    const h = hstack(col);
    h.centerAlignContent();
    addDots(h, count(c.list.length), 24, c.list.length ? P.ink : P.faint);
    h.addSpacer(8);
    const lab = vstack(h);
    lab.spacing = 1;
    addText(lab, c.label, mono(11, "semibold"), i ? P.dim : P.accent);
    addText(lab, md(c.day) + " " + WEEK[c.day.getDay()], mono(11), P.dim);
    h.addSpacer();
    if (c.right) addText(h, c.right, mono(11), P.faint);
    col.addSpacer(12);
    renderList(col, c.list.length ? fitList(c.list, 262, s) : null, c.empty, s);
    col.addSpacer();
  });
}

function addSection(parent, label, right, fit, empty, s, sub) {
  const sec = vstack(parent);
  const hd = hstack(sec);
  hd.centerAlignContent();
  addText(hd, label, mono(10.5, "semibold"), label === "TODAY" ? P.accent : P.dim);
  if (sub) {
    hd.addSpacer(8);
    addText(hd, sub, mono(10.5), P.dim);
  }
  hd.addSpacer();
  if (right) addText(hd, right, mono(10.5), P.faint);
  sec.addSpacer(5);
  addRule(sec);
  sec.addSpacer(7);
  renderList(sec, fit, empty, s);
}

function renderList(parent, fit, empty, s) {
  const box = vstack(parent);
  box.spacing = GAP;
  if (!fit) {
    addNote(box, empty, s.ring + s.gap, sys(12), P.dim);
    return;
  }
  fit.shown.forEach(it => addTodoRow(box, it, s));
  if (fit.more) addNote(box, "+" + fit.more + "件", s.ring + s.gap, mono(10.5, "medium"), P.faint);
}

// ---------- ロック画面：長方形（3 行） ----------
function buildRect(w, D) {
  w.addAccessoryWidgetBackground = false;
  const rows = [];
  if (!D.today.length) rows.push({ day: "今日", time: "", title: "やることなし", dim: true });
  D.today.slice(0, D.tomorrow.length ? 2 : 3).forEach((it, i) => rows.push({ day: i ? "" : "今日", time: it.label, title: it.title }));
  const room = 3 - rows.length;
  if (room > 0 && D.tomorrow.length) {
    D.tomorrow.slice(0, room).forEach((it, i) => rows.push({ day: i ? "" : "明日", time: it.label, title: it.title }));
  }
  const box = vstack(w);
  box.spacing = 1;
  rows.forEach(r => {
    const s = hstack(box);
    s.centerAlignContent();
    s.spacing = 4;
    const d = hstack(s);
    d.size = new Size(27, 0);
    addText(d, r.day, sys(12, "bold"));
    d.addSpacer();
    const t = addText(s, r.title, sys(13, "medium"));
    if (r.dim) t.textOpacity = 0.6;
    s.addSpacer();
    if (r.time) addText(s, r.time, mono(12, "medium")).minimumScaleFactor = 0.7;
  });
}

// ---------- ロック画面：円形 ----------
function buildCircular(w, D) {
  w.addAccessoryWidgetBackground = true;
  centerLine(w, "TODO", sys(10, "semibold"));
  w.addSpacer(1);
  centerLine(w, String(D.today.length), mono(18, "semibold")).minimumScaleFactor = 0.6;
}

// ---------- ロック画面：インライン ----------
function buildInline(w, D) {
  const s = D.today.length ? "TODO " + D.today.length + " ・ " + D.today[0].title : "今日のやることはありません";
  addText(w, s, sys(12, "medium"));
}

// ---------- エラー ----------
function errorWidget(w, accessory) {
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  if (accessory) {
    addText(w, "リマインダー未許可", sys(12, "semibold"));
    return w;
  }
  w.setPadding(14, 14, 14, 14);
  addText(w, "リマインダーにアクセスできません", sys(14, "semibold"), P.ink).lineLimit = 2;
  w.addSpacer(5);
  addText(w, "Scriptable でこのスクリプトを一度実行し、アクセスを許可してください。", sys(12), P.dim).lineLimit = 3;
  return w;
}

// ============================================================
// 行
// ============================================================
// 1 件＝1 行：「○ 項目名 …… 14:00 / LATE」。いちばん急ぐ 1 件だけ赤
function addTodoRow(parent, it, s) {
  const row = hstack(parent);
  row.centerAlignContent();
  row.spacing = s.gap;
  addRing(row, s.ring, it.hl ? P.accent : P.dim);
  addText(row, it.title, sys(s.titleSize, "medium"), P.ink);
  row.addSpacer();
  if (s.time && it.label) addText(row, it.label, mono(s.timeSize, "medium"), it.hl ? P.accent : it.late ? P.ink : P.dim);
}

// チェック前の丸
function addRing(parent, size, color) {
  const dc = new DrawContext();
  dc.size = new Size(size, size);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const lw = 1.3;
  dc.setLineWidth(lw);
  dc.setStrokeColor(color);
  dc.strokeEllipse(new Rect(lw / 2, lw / 2, size - lw, size - lw));
  const img = parent.addImage(dc.getImage());
  img.imageSize = new Size(size, size);
  return img;
}

function rowHeight(s) { return Math.max(s.titleSize, s.timeSize, s.ring) * 1.32; }

// 上から順に入るだけ取る。入りきらなければ「+N件」の行も確保する（noMore = 確保しない）
function fitList(list, budget, s, noMore) {
  for (let k = list.length; k >= 0; k--) {
    const more = list.length - k;
    let h = k * rowHeight(s) + Math.max(0, k - 1) * GAP;
    if (more && !noMore) h += (k ? GAP : 0) + NOTE_H;
    if (h <= budget) return { shown: list.slice(0, k), more: noMore ? 0 : more, height: h };
  }
  return { shown: [], more: noMore ? 0 : list.length, height: noMore ? 0 : NOTE_H };
}

function emptyText(D) {
  return D.done ? "今日のやることは完了" : "今日のやることはありません";
}

function count(n) { return pad2(Math.min(n, 99)); }

// ============================================================
// データ
// ============================================================
async function loadData() {
  const now = new Date();
  const t0 = dayStart(now, 0), t1 = dayStart(now, 1), t2 = dayStart(now, 2);
  const cals = await listCalendars();
  const [due, tmr, done, all] = await Promise.all([
    cals ? Reminder.incompleteDueBetween(new Date(2000, 0, 1), t1, cals) : Reminder.incompleteDueBetween(new Date(2000, 0, 1), t1),
    cals ? Reminder.incompleteDueBetween(t1, t2, cals) : Reminder.incompleteDueBetween(t1, t2),
    cals ? Reminder.completedToday(cals) : Reminder.completedToday(),
    CONFIG.undated ? (cals ? Reminder.allIncomplete(cals) : Reminder.allIncomplete()) : Promise.resolve([]),
  ]);
  const today = due.map(r => toItem(r, now, t0)).sort(byUrgency)
    .concat(all.filter(r => !r.dueDate).map(r => toItem(r, now, t0)).sort(byUrgency));
  const tomorrow = tmr.map(r => toItem(r, now, t0)).sort(byUrgency);
  if (today.length) today[0].hl = true;   // いちばん急ぐ 1 件
  return { now, tomorrowStart: t1, today, tomorrow, done: done.length, total: done.length + today.length };
}

// Parameter / CONFIG のリスト名 → リマインダーのリスト。指定なしは null（すべて）
async function listCalendars() {
  if (!LISTS.length) return null;
  const found = [];
  for (const name of LISTS) {
    try {
      found.push(await Calendar.forRemindersByTitle(name));
    } catch (e) {
      // 見つからないリスト名は無視する
    }
  }
  return found;
}

function toItem(r, now, t0) {
  const due = r.dueDate || null;
  const timed = !!(due && r.dueDateIncludesTime);
  const late = !!due && (timed ? due < now : due < t0);
  return {
    title: clean(r.title),
    due, timed, late, hl: false,
    priority: r.priority || 0,
    label: late ? "LATE" : timed ? hm(due) : "",
  };
}

// 期限切れ → 時刻あり（早い順）→ 日付だけ。同じなら優先度の高い順
function byUrgency(a, b) {
  const rank = it => (it.late ? 0 : it.timed ? 1 : 2);
  const pr = it => (it.priority ? it.priority : 10);
  return (rank(a) - rank(b)) || ((a.due && b.due) ? a.due - b.due : 0) || (pr(a) - pr(b)) || a.title.localeCompare(b.title);
}

// 次の期限の時刻か日付の変わり目で更新（最短 1 分・最長 30 分）
function nextRefresh(D) {
  const now = D.now.getTime();
  const marks = [D.tomorrowStart.getTime() + 60 * 1000, now + 30 * 60 * 1000];
  D.today.concat(D.tomorrow).forEach(it => { if (it.timed && it.due.getTime() > now) marks.push(it.due.getTime()); });
  return new Date(Math.max(now + 60 * 1000, Math.min(...marks)));
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
