// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: calendar-alt;

/* ============================================================
   TODAY / TOMORROW ― Nothing 白基調カレンダーウィジェット
   ------------------------------------------------------------
   iOS カレンダー（購読中の Google カレンダー等も含む）から
   今日・明日の予定を読み込んで表示します（Scriptable 用）。

   対応サイズ
     ホーム画面：小 / 中 / 大 / 特大（iPad）
     ロック画面：長方形 / 円形 / インライン

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     大学,バイト … そのカレンダーだけ表示
     dark        … 暗色テーマ（文字が白。暗い壁紙向け）
     透明        … 背景を透明に（下の「透明背景の設定」が必要）
     例）透明,大学

   アプリ内で ▶ 実行すると、サイズを選んでプレビューできます。

   透明背景の設定（端末ごと・各サイズ 1 つずつ）
     1. ウィジェットを置き、Parameter を「透明」にする → ピンク表示になる
     2. そのホーム画面のスクリーンショットを撮る
     3. ホーム画面を長押ししてアイコンが揺れる状態にし、
        いちばん右の空白ページでスクリーンショットを撮る
     4. Scriptable で ▶ →「透明背景を設定」→ 2 と 3 の画像を選ぶ
     ※ ウィジェットを動かしたら再設定。iPad は設定した画面の向きでのみ一致。
   ============================================================ */

// ---------- 設定 ----------
const CONFIG = {
  theme: "light",   // "light"（白基調・既定）/ "dark"
  calendars: [],    // 表示するカレンダー名。空 = すべて（例: ["大学", "バイト"]）
};

// ---------- パラメータ ----------
const PARAMS = String(args.widgetParameter || "")
  .split(/[,、]/).map(s => s.trim()).filter(Boolean);
const THEME = PARAMS.map(p => p.toLowerCase()).find(p => p === "dark" || p === "light") || CONFIG.theme;
const CLEAR = PARAMS.some(p => /^(透明|clear)$/i.test(p));
const CAL_NAMES = (() => {
  const names = PARAMS.filter(p => !/^(dark|light|透明|clear)$/i.test(p));
  return names.length ? names : CONFIG.calendars;
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

// 予定 1 件＝2 行：「● 開始  予定名」／「  終了  場所」
const ROWSTYLE = {
  medium: { mark: 6, gap: 5, timeW: 37, startSize: 11.5, endSize: 11,   titleSize: 13,   locSize: 11,   lineGap: 1, tag: false },
  large:  { mark: 6, gap: 6, timeW: 42, startSize: 12,   endSize: 11.5, titleSize: 14.5, locSize: 11.5, lineGap: 1, tag: true  },
};
const GAP = 5;        // 予定と予定の間
const NOTE_H = 16;    // 「予定なし」「+N件」などの 1 行
const SEP_H = 14;     // 中サイズの「TOMORROW」区切り行
const SEC_H = 27;     // 大サイズの見出し（ラベル＋罫線）
const SEC_GAP = 10;   // 大サイズの今日と明日の間
// 画面の大きい iPhone は縦に少し余裕がある（SE 級・iPad は控えめに詰める）
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
      if (!bg) return calibrationWidget(w);   // 未設定：位置合わせ用のピンク表示
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

  w.url = calshow(D.now);               // タップでカレンダーを開く
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

// ---------- 中：左に日付、右に予定。余白があれば明日も ----------
function buildMedium(w, D) {
  w.setPadding(12, 13, 11, 13);
  const s = ROWSTYLE.medium;
  const budget = ROOMY ? 130 : 122;
  const live = D.today.events.filter(e => !e.past);
  const t = fitRows(live, budget, s);

  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 10;

  // 左：日付（今日が入りきらないときは下に「+N件」）
  const dc = vstack(main);
  dc.size = new Size(40, 0);
  dc.url = calshow(D.now);
  leftLine(dc, r => addDots(r, pad2(D.now.getDate()), 24, P.ink));
  dc.addSpacer(4);
  leftLine(dc, r => addText(r, "TODAY", mono(10, "semibold"), P.accent));
  dc.addSpacer(1);
  leftLine(dc, r => addText(r, WEEK[D.now.getDay()], mono(10), P.dim));
  dc.addSpacer();
  if (t.more) leftLine(dc, r => addText(r, "+" + t.more + "件", mono(10, "medium"), P.faint));

  const rule = vstack(main);            // 縦の区切り線
  rule.size = new Size(1, 0);
  rule.backgroundColor = P.rule;
  rule.addSpacer();

  // 右：今日の予定 → 余った高さに明日
  const col = vstack(main);
  col.spacing = GAP;
  col.url = calshow(D.now);
  let used = NOTE_H;
  if (live.length) {
    t.shown.forEach(e => addEventRow(col, e, s));
    used = t.height;
  } else {
    addNote(col, todayEmptyText(D.today), 0, sys(12), P.dim);
  }
  const rest = budget - used - GAP;
  if (!t.more && rest >= SEP_H) {
    const tm = D.tomorrow;
    const url = calshow(tm.start);
    const sep = hstack(col);
    sep.centerAlignContent();
    sep.url = url;
    addText(sep, "TOMORROW", mono(10, "semibold"), P.dim);
    sep.addSpacer(6);
    addText(sep, md(tm.start) + " " + WEEK[tm.start.getDay()], mono(10), P.dim);
    sep.addSpacer();
    addText(sep, tm.events.length ? tm.events.length + "件" : "予定なし", mono(10), P.faint);
    fitRows(tm.events, rest - SEP_H - GAP, s).shown.forEach(e => addEventRow(col, e, s, url));
  }
}

// ---------- 特大（iPad）：今日｜明日 の 2 列 ----------
function buildExtraLarge(w, D) {
  w.setPadding(18, 18, 16, 18);
  const main = hstack(w);
  main.topAlignContent();
  main.spacing = 14;
  xlColumn(main, D.today, D);
  const rule = vstack(main);
  rule.size = new Size(1, 0);
  rule.backgroundColor = P.rule;
  rule.addSpacer();
  xlColumn(main, D.tomorrow, D);
}

function xlColumn(parent, day, D) {
  const s = ROWSTYLE.large;
  const col = vstack(parent);
  col.url = calshow(day.isToday ? D.now : day.start);
  const h = hstack(col);
  h.centerAlignContent();
  addDots(h, pad2(day.start.getDate()), 24, P.ink);
  h.addSpacer(8);
  const lab = vstack(h);
  lab.spacing = 1;
  addText(lab, day.isToday ? "TODAY" : "TOMORROW", mono(11, "semibold"), day.isToday ? P.accent : P.dim);
  addText(lab, WEEK[day.start.getDay()], mono(11), P.dim);
  h.addSpacer();
  col.addSpacer(12);
  const list = day.isToday ? day.events.filter(e => !e.past) : day.events;
  renderList(col, day, fitSection(list, 262, s, 0), s);
  col.addSpacer();
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
  const live = D.today.events.filter(e => !e.past);
  const tmr = D.tomorrow.events;
  // 明日の見出し＋1 件ぶんを残して、今日を先に詰める
  const keep = SEC_GAP + SEC_H + (tmr.length ? rowHeight(tmr[0], s) : NOTE_H);
  const t = fitSection(live, budget - keep, s) || fitSection(live, budget, s);
  addSection(w, D.today, D, t, s);
  const m = fitSection(tmr, budget - t.height - SEC_GAP, s);
  if (m) {
    w.addSpacer(SEC_GAP);
    addSection(w, D.tomorrow, D, m, s);
  }
  w.addSpacer();
}

function addSection(parent, day, D, fit, s) {
  const sec = vstack(parent);
  sec.url = calshow(day.isToday ? D.now : day.start);
  const hd = hstack(sec);
  hd.centerAlignContent();
  addText(hd, day.isToday ? "TODAY" : "TOMORROW", mono(10.5, "semibold"), day.isToday ? P.accent : P.dim);
  if (!day.isToday) {
    hd.addSpacer(8);
    addText(hd, md(day.start) + " " + WEEK[day.start.getDay()], mono(10.5), P.dim);
  }
  hd.addSpacer();
  const total = fit.shown.length + fit.more;
  if (total) addText(hd, total + "件", mono(10.5), P.faint);
  sec.addSpacer(5);
  addRule(sec);
  sec.addSpacer(7);
  renderList(sec, day, fit, s);
}

// ---------- 小：次の予定を大きく ----------
function buildSmall(w, D) {
  w.setPadding(13, 14, 12, 14);
  const hit = D.today.events.find(e => e.hl) || null;
  const target = hit || D.tomorrow.events.find(e => !e.allDay) || null;
  const onTomorrow = !hit && !!target;
  const ref = onTomorrow ? D.tomorrow.start : D.now;

  const top = hstack(w);
  top.centerAlignContent();
  const label = hit ? (hit.current ? "NOW" : "NEXT") : onTomorrow ? "TMRW" : "TODAY";
  addText(top, label, mono(10.5, "semibold"), hit ? P.accent : P.dim);
  top.addSpacer();
  addText(top, md(ref) + " " + WEEK[ref.getDay()], mono(10.5), P.dim);

  w.addSpacer(5);
  const big = hstack(w);
  if (target) addDots(big, bigTime(target, onTomorrow ? D.tomorrow.start : D.today.start), 24, P.ink);
  else addDots(big, "--:--", 24, P.faint);
  big.addSpacer();

  w.addSpacer(4);
  const tl = hstack(w);
  const title = addText(tl, target ? target.title : "予定なし", sys(14, "semibold"), target ? P.ink : P.dim);
  title.lineLimit = 2;
  title.minimumScaleFactor = 0.8;
  tl.addSpacer();

  if (target) {
    w.addSpacer(2);
    const rg = hstack(w);
    addText(rg, target.range, mono(10.5), P.dim);
    rg.addSpacer();
  }

  w.addSpacer();
  addRule(w);
  w.addSpacer(5);
  const bt = hstack(w);
  bt.centerAlignContent();
  addStat(bt, "TODAY", D.today.events.filter(e => !e.allDay && !e.past).length);  // 時刻のある予定の残り
  bt.addSpacer();
  addStat(bt, "TMRW", D.tomorrow.events.filter(e => !e.allDay).length);
}

function addStat(parent, label, n) {
  addText(parent, label, mono(9, "semibold"), P.dim);
  parent.addSpacer(5);
  addText(parent, pad2(n), mono(12.5, "semibold"), P.ink);
}

// ---------- ロック画面：長方形（3 行） ----------
function buildRect(w, D) {
  w.addAccessoryWidgetBackground = false;
  const byTimed = list => list.filter(e => !e.allDay).concat(list.filter(e => e.allDay));
  const live = byTimed(D.today.events.filter(e => !e.past));
  const tmr = byTimed(D.tomorrow.events);
  const rows = [];
  if (!live.length) rows.push({ day: "今日", time: "", title: "予定なし", dim: true });
  live.slice(0, tmr.length ? 2 : 3).forEach((e, i) => rows.push({ day: i ? "" : "今日", time: e.time, title: e.title }));
  const room = 3 - rows.length;
  if (room > 0) {
    if (!tmr.length) rows.push({ day: "明日", time: "", title: "予定なし", dim: true });
    tmr.slice(0, room).forEach((e, i) => rows.push({ day: i ? "" : "明日", time: e.time, title: e.title }));
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
    if (r.time) {
      const tw = hstack(s);
      tw.size = new Size(38, 0);
      addText(tw, r.time, mono(12, "medium")).minimumScaleFactor = 0.7;
      tw.addSpacer();
    }
    const t = addText(s, r.title, sys(13, "medium"));
    if (r.dim) t.textOpacity = 0.6;
    s.addSpacer();
  });
}

// ---------- ロック画面：円形 ----------
function buildCircular(w, D) {
  w.addAccessoryWidgetBackground = true;
  const t = D.today.events.find(e => e.hl);
  const m = D.tomorrow.events.find(e => !e.allDay);
  const label = t ? (t.current ? "NOW" : "NEXT") : m ? "明日" : "今日";
  const time = t ? bigTime(t, D.today.start) : m ? bigTime(m, D.tomorrow.start) : "--:--";
  centerLine(w, label, sys(10, "semibold"));
  w.addSpacer(1);
  centerLine(w, time, mono(17, "semibold")).minimumScaleFactor = 0.6;
}

// ---------- ロック画面：インライン（時計の上の 1 行） ----------
function buildInline(w, D) {
  const t = D.today.events.find(e => e.hl);
  const m = D.tomorrow.events.find(e => !e.allDay) || D.tomorrow.events[0];
  let s = "今日・明日の予定なし";
  if (t) s = t.time + " " + t.title;
  else if (m) s = "明日 " + m.time + " " + m.title;
  addText(w, s, sys(12, "medium"));
}

// ---------- エラー ----------
function errorWidget(w, accessory) {
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  if (accessory) {
    addText(w, "カレンダー未許可", sys(12, "semibold"));
    return w;
  }
  w.setPadding(14, 14, 14, 14);
  addText(w, "カレンダーにアクセスできません", sys(14, "semibold"), P.ink).lineLimit = 2;
  w.addSpacer(5);
  addText(w, "Scriptable でこのスクリプトを一度実行し、アクセスを許可してください。", sys(12), P.dim).lineLimit = 3;
  return w;
}

// ============================================================
// 予定の一覧・行
// ============================================================
// 1 件 = 2 行：「● 開始  予定名」／「  終了  場所」
function addEventRow(parent, e, s, url) {
  const row = vstack(parent);
  row.spacing = s.lineGap;
  if (url) row.url = url;

  const l1 = hstack(row);
  l1.centerAlignContent();
  l1.spacing = s.gap;
  const mark = l1.addStack();           // 進行中 / 次の予定だけ赤い点
  mark.size = new Size(s.mark, s.mark);
  mark.cornerRadius = s.mark / 2;
  mark.backgroundColor = e.hl ? P.accent : Color.clear();
  fixedText(l1, e.startLabel, mono(s.startSize, "medium"), e.hl ? P.accent : P.ink, s.timeW);
  addText(l1, e.title, sys(s.titleSize, "medium"), P.ink);
  l1.addSpacer();
  if (s.tag && e.hl) addText(l1, e.current ? "NOW" : "NEXT", mono(9, "semibold"), P.accent);

  if (!hasLine2(e)) return;
  const l2 = hstack(row);
  l2.centerAlignContent();
  l2.spacing = s.gap;
  const pad = l2.addStack();            // マーカーの下は空ける
  pad.size = new Size(s.mark, 0);
  fixedText(l2, e.endLabel, mono(s.endSize), P.dim, s.timeW);
  if (e.loc) addText(l2, e.loc, sys(s.locSize), P.dim);
  l2.addSpacer();
}

function hasLine2(e) { return !!(e.endLabel || e.loc); }

// 行の高さの見積もり（小さい機種でもはみ出さないよう控えめに見積もる）
function rowHeight(e, s) {
  const l1 = Math.max(s.titleSize, s.startSize) * 1.32;
  if (!hasLine2(e)) return l1;
  return l1 + s.lineGap + Math.max(e.loc ? s.locSize : 0, e.endLabel ? s.endSize : 0) * 1.32;
}

function rowsHeight(list, s) {
  return list.reduce((h, e, i) => h + (i ? GAP : 0) + rowHeight(e, s), 0);
}

// 上から順に、高さの予算に収まる件数だけ取る
function fitRows(list, budget, s) {
  let h = 0, k = 0;
  for (const e of list) {
    const add = (k ? GAP : 0) + rowHeight(e, s);
    if (h + add > budget) break;
    h += add;
    k++;
  }
  return { shown: list.slice(0, k), more: list.length - k, height: h };
}

// 見出し付きの一覧。入りきらない分は「+N件」（1 件も入らなければ見出しの件数だけ）
function fitSection(list, budget, s, head) {
  const top = head === undefined ? SEC_H : head;
  if (!list.length) return top + NOTE_H <= budget ? { shown: [], more: 0, height: top + NOTE_H } : null;
  for (let k = list.length; k >= 0; k--) {
    const shown = list.slice(0, k), more = list.length - k;
    let h = top + rowsHeight(shown, s);
    if (k && more) h += GAP + NOTE_H;
    if (h <= budget) return { shown, more, height: h };
  }
  return null;
}

function renderList(parent, day, fit, s) {
  const box = vstack(parent);
  box.spacing = GAP;
  const indent = s.mark + s.gap;
  if (!fit.shown.length && !fit.more) {
    addNote(box, day.isToday ? todayEmptyText(day) : "予定なし", indent, sys(12), P.dim);
  }
  fit.shown.forEach(e => addEventRow(box, e, s));
  if (fit.shown.length && fit.more) addNote(box, "+" + fit.more + "件", indent, mono(10.5, "medium"), P.faint);
}

function todayEmptyText(day) {
  return day.events.length ? "今日の予定は終了しました" : "今日の予定はありません";
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

function leftLine(parent, add) {
  const r = hstack(parent);
  const x = add(r);
  r.addSpacer();
  return x;
}

// ============================================================
// データ
// ============================================================
async function loadData() {
  const now = new Date();
  const [today, tomorrow] = await Promise.all([loadDay(now, 0), loadDay(now, 1)]);
  return { now, today, tomorrow };
}

async function loadDay(now, offset) {
  const start = dayStart(now, offset);
  const end = dayStart(now, offset + 1);
  const isToday = offset === 0;

  let raw = await CalendarEvent.between(start, end);
  raw = raw.filter(e => e.endDate > start && e.startDate < end);
  if (CAL_NAMES.length) raw = raw.filter(e => e.calendar && CAL_NAMES.includes(e.calendar.title));

  let events = raw.map(e => {
    const allDay = e.isAllDay || (e.startDate <= start && e.endDate >= end);
    return {
      title: String(e.title || "").replace(/\s+/g, " ").trim() || "（無題）",
      start: e.startDate,
      end: e.endDate,
      allDay,
      past: isToday && !allDay && e.endDate <= now,
      current: isToday && !allDay && e.startDate <= now && now < e.endDate,
      hl: false,
      time: timeLabel(e, allDay, start, end, false),
      range: timeLabel(e, allDay, start, end, true),
      loc: String(e.location || "").split(/\r?\n/)[0].trim(),
      startLabel: allDay ? "終日" : e.startDate < start ? "前日" : hm(e.startDate),
      endLabel: endLabel(e, allDay, end),
    };
  });
  events.sort((a, b) => (b.allDay - a.allDay) || (a.start - b.start) || (a.end - b.end));

  // 進行中 → なければ次の予定を 1 件だけ強調
  if (isToday) {
    const hit = events.find(e => e.current) || events.find(e => !e.allDay && e.start > now);
    if (hit) hit.hl = true;
  }
  return { start, end, isToday, events };
}

function endLabel(e, allDay, end) {
  if (allDay || e.endDate <= e.startDate) return "";
  if (e.endDate > end) return "翌" + hm(e.endDate);
  if (e.endDate.getTime() === end.getTime()) return "24:00";
  return hm(e.endDate);
}

function timeLabel(e, allDay, start, end, range) {
  if (allDay) return "終日";
  if (e.startDate < start) return "〜" + hm(e.endDate);
  if (!range) return hm(e.startDate);
  return e.endDate > end ? hm(e.startDate) + "〜" : hm(e.startDate) + "–" + hm(e.endDate);
}

// 次の開始・終了時刻か日付の変わり目で更新（最短 1 分・最長 30 分）
function nextRefresh(D) {
  const now = D.now.getTime();
  const marks = [D.tomorrow.start.getTime() + 60 * 1000, now + 30 * 60 * 1000];
  [D.today, D.tomorrow].forEach(day => day.events.forEach(e => {
    if (e.allDay) return;
    [e.start, e.end].forEach(d => { if (d.getTime() > now) marks.push(d.getTime()); });
  }));
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
        else if (ghost) dot(x + c, r, ghost);   // 消灯ドットもうっすら描く
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

function addText(parent, str, font, color) {
  const t = parent.addText(String(str));
  t.font = font;
  if (color) t.textColor = color;
  t.lineLimit = 1;
  return t;
}

function addRule(parent) {
  const r = hstack(parent);
  r.size = new Size(0, 1);
  r.backgroundColor = P.rule;
  r.addSpacer();
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

function dayStart(d, offset) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset); }
function pad2(n) { return String(n).padStart(2, "0"); }
function hm(d) { return pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
function md(d) { return pad2(d.getMonth() + 1) + "." + pad2(d.getDate()); }
function bigTime(e, start) { return hm(e.start < start ? e.end : e.start); }
function calshow(d) { return "calshow:" + Math.floor(d.getTime() / 1000 - 978307200); }

// ============================================================
// 透明背景（壁紙の該当部分を切り抜いて背景に敷く）
// ============================================================
function clearBgPath(family) {
  const fm = FileManager.local();
  return fm.joinPath(fm.joinPath(fm.documentsDirectory(), "today-tomorrow"), "clear-" + family + ".png");
}

function loadClearBg(family) {
  const fm = FileManager.local();
  const p = clearBgPath(family);
  return fm.fileExists(p) ? fm.readImage(p) : null;
}

function saveClearBg(family, img) {
  const fm = FileManager.local();
  const dir = fm.joinPath(fm.documentsDirectory(), "today-tomorrow");
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  fm.writeImage(clearBgPath(family), img);
}

// 未設定時の表示。この色をスクショから探して位置を割り出す
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

// スクショを WebView のキャンバスに読み込み、ピンクの長方形を探す
async function findPink(img) {
  const wv = new WebView();
  await wv.loadHTML("<canvas id='c'></canvas>");
  const b64 = Data.fromPNG(img).toBase64String();
  const minRatio = Device.isPad() ? 0.15 : 0.25;   // アイコンより大きい領域だけ（画面短辺比）
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
    return r > 200 && b > 200 && g < 120 && Math.abs(r - b) < 50;   // 紫系アイコンは除外
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
    // 粗い枠を実寸で詰める（角丸を避け、高さ・幅の 30/50/70% の線で測る）
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

// 検出した長方形から、選んだサイズに合うものを選ぶ
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
    return null;              // 選択をキャンセルした
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
