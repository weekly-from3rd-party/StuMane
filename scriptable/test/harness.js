// Scriptable API の模擬環境。未知のプロパティ名・型違いを検出する。新しい API を使ったらここにも追加する
const fs = require('fs'), vm = require('vm');
// 本体は scriptable/ 直下。run({ file }) で対象を選ぶ（既定は today-tomorrow-widget.js）
const SRC = f => fs.readFileSync(require('path').join(__dirname, '..', f || 'today-tomorrow-widget.js'), 'utf8');
let FIXED = 0;
class FDate extends Date { constructor(...a) { if (a.length) super(...a); else super(FIXED); } static now() { return FIXED; } }
const num = v => typeof v === 'number' && !isNaN(v);
class Color { constructor(hex, a = 1) { if (typeof hex !== 'string' || !/^#?[0-9a-f]{6}$/i.test(hex)) throw new TypeError('hex ' + hex); this.hex = hex; this.alpha = a; }
  static clear() { return new Color('#000000', 0); } static white() { return new Color('#ffffff'); } toString() { return this.hex + (this.alpha !== 1 ? '@' + this.alpha : ''); } }
class Size { constructor(w, h) { if (!num(w) || !num(h)) throw new TypeError('Size'); this.width = w; this.height = h; } }
class Rect { constructor(x, y, w, h) { if (![x, y, w, h].every(num)) throw new TypeError('Rect'); Object.assign(this, { x, y, width: w, height: h }); } }
class Point { constructor(x, y) { if (!num(x) || !num(y)) throw new TypeError('Point'); this.x = x; this.y = y; } }
class Font { constructor(n, s) { this.name = n; this.size = s; } }
for (const n of ['systemFont', 'mediumSystemFont', 'semiboldSystemFont', 'boldSystemFont', 'regularMonospacedSystemFont', 'mediumMonospacedSystemFont', 'semiboldMonospacedSystemFont'])
  Font[n] = s => { if (!num(s)) throw new TypeError(n); return new Font(n, s); };
class DrawContext {
  setFillColor(c) { if (!(c instanceof Color)) throw new TypeError('fill'); this.fill = c; }
  fillEllipse(r) { if (!(r instanceof Rect)) throw new TypeError('ellipse'); (this.ops = this.ops || []).push({ r, c: this.fill }); }
  strokeEllipse(r) { if (!(r instanceof Rect)) throw new TypeError('strokeEllipse'); }
  setStrokeColor(c) { if (!(c instanceof Color)) throw new TypeError('stroke'); }
  setLineWidth(n) { if (!num(n)) throw new TypeError('lineWidth'); }
  drawImageInRect(img, r) { if (!img || !img.__img || !(r instanceof Rect)) throw new TypeError('drawImageInRect'); this.drawn = { img, pt: new Point(r.x, r.y) }; }
  drawImageAtPoint(img, pt) { if (!img || !img.__img || !(pt instanceof Point)) throw new TypeError('drawImage'); this.drawn = { img, pt }; }
  getImage() { if (!(this.size instanceof Size)) throw new TypeError('dc.size');
    return { __img: true, size: this.size, ops: this.ops || [], crop: this.drawn ? { src: this.drawn.img.name, x: -this.drawn.pt.x, y: -this.drawn.pt.y, w: this.size.width, h: this.size.height } : null }; }
}
class WidgetText { constructor(t) { if (typeof t !== 'string') throw new TypeError('addText(' + typeof t + ')'); this.kind = 'text'; this.text = t; } }
class WidgetDate { constructor(d) { if (!(d instanceof Date)) throw new TypeError('addDate'); this.kind = 'date'; this.date = d; }
  applyTimerStyle() { this.style = 'timer'; } applyTimeStyle() { this.style = 'time'; } applyDateStyle() { this.style = 'date'; }
  applyRelativeStyle() { this.style = 'relative'; } applyOffsetStyle() { this.style = 'offset'; } leftAlignText() { this.align = 'left'; } centerAlignText() { this.align = 'center'; } rightAlignText() { this.align = 'right'; } }
class WidgetImage { constructor(i) { if (!i || !i.__img) throw new TypeError('addImage'); this.kind = 'image'; if (i.symbol) this.symbol = i.symbol; Object.defineProperty(this, 'src', { value: i }); }
  leftAlignImage() {} centerAlignImage() {} rightAlignImage() {} }
const SF_WEIGHTS = ['UltraLight', 'Thin', 'Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Heavy', 'Black'];
class SFSymbol { static named(n) { if (typeof n !== 'string' || !n) throw new TypeError('SFSymbol'); const s = new SFSymbol(); s.name = n; return s; }
  get image() { return { __img: true, size: new Size(24, 24), symbol: this.name }; } applyFont(f) { if (!(f instanceof Font)) throw new TypeError('applyFont'); } }
SF_WEIGHTS.forEach(w => { SFSymbol.prototype['apply' + w + 'Weight'] = function () {}; });
class WidgetStack {
  constructor() { this.kind = 'stack'; this.dir = 'h'; this.children = []; }
  layoutHorizontally() { this.dir = 'h'; } layoutVertically() { this.dir = 'v'; } topAlignContent() {} centerAlignContent() {}
  setPadding(...a) { if (a.length !== 4 || !a.every(num)) throw new TypeError('setPadding'); this.padding = a; }
  addText(t) { const x = new WidgetText(t); this.children.push(x); return x; }
  addImage(i) { const x = new WidgetImage(i); this.children.push(x); return x; }
  addDate(d) { const x = new WidgetDate(d); this.children.push(x); return x; }
  addStack() { const s = new WidgetStack(); this.children.push(s); return s; }
  addSpacer(n) { if (n !== undefined && !num(n)) throw new TypeError('spacer'); const s = { kind: 'spacer', length: n }; this.children.push(s); return s; }
}
// 一覧画面（UITable）。present() のたびに o.ui の操作を 1 つずつ実行する
class UITableCell {
  constructor(type, title, subtitle) { if (title !== undefined && typeof title !== 'string') throw new TypeError('cell title'); Object.assign(this, { type, title, subtitle, widthWeight: 1 }); }
  static text(t, s) { return new UITableCell('text', t, s); } static button(t) { return new UITableCell('button', t); }
  static image(i) { if (!i || !i.__img) throw new TypeError('cell image'); const c = new UITableCell('image'); c.image = i; return c; }
  leftAligned() {} centerAligned() {} rightAligned() {}
}
class UITableRow {
  constructor() { this.cells = []; this.height = 44; this.isHeader = false; this.dismissOnSelect = true; }
  addCell(c) { if (!(c instanceof UITableCell)) throw new TypeError('addCell'); this.cells.push(c); return c; }
  addText(t, s) { return this.addCell(UITableCell.text(t, s)); } addButton(t) { return this.addCell(UITableCell.button(t)); }
  addImage(i) { return this.addCell(UITableCell.image(i)); }
  get texts() { return this.cells.filter(c => c.type === 'text').map(c => c.title).join(' '); }
}
const FILES = new Map(), DIRS = new Set();
const fmOf = root => ({ documentsDirectory: () => root, joinPath: (a, b) => a.replace(/\/$/, '') + '/' + b,
  fileExists: p => FILES.has(p) || DIRS.has(p), createDirectory: (p, i) => { if (i !== true) throw new TypeError('mkdir'); DIRS.add(p); },
  readImage: p => FILES.get(p), writeImage: (p, img) => { if (!img || !img.__img) throw new TypeError('writeImage'); if (!DIRS.has(p.slice(0, p.lastIndexOf('/')))) throw new Error('no dir'); FILES.set(p, img); },
  readString: p => { const v = FILES.get(p); if (typeof v !== 'string') throw new Error('readString ' + p); return v; },
  writeString: (p, v) => { if (typeof v !== 'string') throw new TypeError('writeString'); if (!DIRS.has(p.slice(0, p.lastIndexOf('/')))) throw new Error('no dir'); FILES.set(p, v); },
  downloadFileFromiCloud: p => { if (typeof p !== 'string') throw new TypeError('download'); return Promise.resolve(); } });
const FileManager = { local: () => fmOf('/docs'), iCloud: () => fmOf('/icloud') };
const reset = () => { FILES.clear(); DIRS.clear(); };
const REG = new Map(); let RID = 0;
const Data = { fromPNG: img => { if (!img || !img.__img) throw new TypeError('fromPNG'); const id = 'SYN' + (++RID); REG.set(id, img); return { toBase64String: () => id }; } };
class WebView {
  loadHTML(h) { if (typeof h !== 'string') throw new TypeError('loadHTML'); this.ok = true; return Promise.resolve(); }
  evaluateJavaScript(js, cb) {
    if (!this.ok || cb !== true) throw new Error('webview misuse');
    return new Promise((resolve, reject) => {
      class FakeImage { set src(v) { const img = REG.get(v.split('base64,')[1]); setTimeout(() => { if (!img) return this.onerror(); this.width = img.size.width; this.height = img.size.height; this.__img = img; this.onload(); }, 0); } }
      const canvas = { getContext: () => ({ drawImage(im) { this.im = im; }, getImageData() { return { data: this.im.__img.rgba }; } }) };
      try { vm.runInContext(js, vm.createContext({ Image: FakeImage, document: { getElementById: () => canvas }, completion: resolve, setTimeout })); } catch (e) { reject(e); }
    });
  }
}
const ALLOW = { text: ['kind', 'text', 'font', 'textColor', 'textOpacity', 'lineLimit', 'minimumScaleFactor', 'url'],
  date: ['kind', 'date', 'style', 'align', 'font', 'textColor', 'textOpacity', 'lineLimit', 'minimumScaleFactor', 'url'], image: ['kind', 'imageSize', 'symbol', 'tintColor', 'imageOpacity', 'url'], spacer: ['kind', 'length'],
  stack: ['kind', 'dir', 'children', 'padding', 'size', 'backgroundColor', 'spacing', 'url', 'cornerRadius'],
  widget: ['kind', 'dir', 'children', 'padding', 'backgroundColor', 'backgroundImage', 'spacing', 'url', 'refreshAfterDate', 'addAccessoryWidgetBackground'] };
// URL：calshow は秒数、scriptable は run?scriptName=…&k=v、それ以外は「スキーム:」で始まり空白を含まない
const okUrl = u => typeof u === 'string' && (/^calshow:\d+$/.test(u) || /^scriptable:\/\/\/run\?scriptName=[^&\s]+(&\w+=[^&\s]+)*$/.test(u)
  || (/^(?!calshow:|scriptable:)[a-z][a-z0-9+.-]*:\S*$/i.test(u)));
function validate(n, p = 'W') {
  const e = [], bad = m => e.push(p + ': ' + m);
  Object.keys(n).forEach(k => { if (!ALLOW[n.kind].includes(k)) bad('unknown prop ' + k); });
  if (n.kind === 'date') { if (!(n.font instanceof Font)) bad('font'); if (!n.style) bad('date style'); if (!n.align) bad('date align'); if (n.textColor !== undefined && !(n.textColor instanceof Color)) bad('color'); }
  if (n.kind === 'text') { if (!(n.font instanceof Font)) bad('font'); if (n.textColor !== undefined && !(n.textColor instanceof Color)) bad('color'); if (!Number.isInteger(n.lineLimit)) bad('lineLimit'); }
  if (n.kind === 'image' && !(n.imageSize instanceof Size)) bad('imageSize');
  if (n.kind === 'image' && n.tintColor !== undefined && !(n.tintColor instanceof Color)) bad('tint');
  if (n.kind !== 'stack' && n.kind !== 'widget' && n.url !== undefined && !okUrl(n.url)) bad('url ' + n.url);
  if (n.children) { if (n.size !== undefined && !(n.size instanceof Size)) bad('size'); if (n.backgroundColor !== undefined && !(n.backgroundColor instanceof Color)) bad('bg');
    if (n.url !== undefined && !okUrl(n.url)) bad('url ' + n.url); if (n.refreshAfterDate !== undefined && !(n.refreshAfterDate instanceof Date)) bad('refresh');
    n.children.forEach((c, i) => e.push(...validate(c, p + '/' + i))); }
  return e;
}
const timerText = n => { const t = Math.abs(Math.floor((FIXED - n.date.getTime()) / 1000)), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, sec = t % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(sec).padStart(2, '0'); };
function dump(n, ind = '') {
  if (n.kind === 'date') return ind + `{${n.style === 'timer' ? timerText(n) : n.style} ${n.font.name.replace('SystemFont', '').replace('Monospaced', 'Mono')} ${n.font.size}${n.textColor ? ' ' + n.textColor : ''}}\n`;
  if (n.kind === 'text') return n.text === '' ? '' : ind + `"${n.text}"  <${n.font.name.replace('SystemFont', '').replace('Monospaced', 'Mono')} ${n.font.size}${n.textColor ? ' ' + n.textColor : ''}>\n`;
  if (n.kind === 'image') return ind + (n.symbol ? `[SF ${n.symbol} ${n.imageSize.width}${n.tintColor ? ' ' + n.tintColor : ''}${n.url ? ' → ' + n.url : ''}]\n` : `[DOT ${n.imageSize.width.toFixed(1)}x${n.imageSize.height}]\n`);
  if (n.kind === 'spacer') return '';
  if (n.size && n.size.width === 6 && n.size.height === 6) return ind + `(${n.backgroundColor.alpha ? '●RED' : '·'})\n`;
  let s = ind + (n.kind === 'widget' ? 'WIDGET' : n.dir === 'h' ? 'H' : 'V') + (n.size ? ` ${n.size.width}x${n.size.height}` : '') + (n.backgroundColor && n.kind !== 'widget' && n.cornerRadius ? ' bg' + n.backgroundColor : '') + (n.url ? ' → ' + n.url : '') + '\n';
  n.children.forEach(c => s += dump(c, ind + '  ')); return s;
}
async function run(o) {
  FIXED = o.now.getTime(); let setW = null, made = null; const log = [];
  const sheets = (o.sheets || []).slice(), alerts = (o.alerts || []).slice(), photos = (o.photos || []).slice();
  class ListWidget extends WidgetStack { constructor() { super(); this.kind = 'widget'; this.dir = 'v'; made = this; }
    presentSmall() { log.push('presentSmall'); return Promise.resolve(); } presentMedium() { log.push('presentMedium'); return Promise.resolve(); }
    presentLarge() { log.push('presentLarge'); return Promise.resolve(); } presentExtraLarge() { log.push('presentExtraLarge'); return Promise.resolve(); } presentAccessoryRectangular() { log.push('presentRect'); return Promise.resolve(); } }
  const texts = (o.texts || []).slice(), ui = (o.ui || []).slice();
  class UITable { constructor() { this.rows = []; this.showSeparators = false; }
    addRow(r) { if (!(r instanceof UITableRow)) throw new TypeError('addRow'); this.rows.push(r); } removeAllRows() { this.rows = []; } reload() {}
    // テストから：表示中の行の文字（行ごと）、文字で行を探す
    lines() { return this.rows.map(r => r.texts); } find(text) { const r = this.rows.find(x => x.cells.some(c => c.title === text || c.subtitle === text)) || this.rows.find(x => x.texts.startsWith(text)); if (!r) throw new Error('row not found: ' + text); return r; }
    async present() { log.push('table「' + (this.rows[0] ? this.rows[0].texts : '') + '」'); const f = ui.shift(); if (f) await f(this); } }
  class Alert { constructor() { this.actions = []; this.fields = []; }
    addTextField(ph, t) { if (ph !== undefined && typeof ph !== 'string') throw new TypeError('addTextField'); this.fields.push(t === undefined ? '' : String(t)); return {}; }
    textFieldValue(i) { if (!Number.isInteger(i) || i >= this.fields.length) throw new TypeError('textFieldValue'); return texts.length ? texts.shift() : this.fields[i]; } addAction(a) { if (typeof a !== 'string') throw new TypeError('addAction'); this.actions.push(a); } addDestructiveAction(a) { this.addAction(a); } addCancelAction() {}
    presentSheet() { log.push('sheet「' + this.title + '」' + this.actions.join('|')); return Promise.resolve(sheets.length ? sheets.shift() : -1); }
    presentAlert() { log.push('alert「' + this.title + '」' + (this.message || '')); return Promise.resolve(alerts.length ? alerts.shift() : 0); } }
  // リマインダー：o.reminders = [{ title, dueDate, dueDateIncludesTime, isCompleted, completionDate, priority, calendar: { title } }]
  const rems = () => { if (o.remFail) throw new Error('denied'); return o.reminders || []; };
  const inCals = (r, cals) => { if (cals === undefined) return true; if (!Array.isArray(cals)) throw new TypeError('calendars'); return cals.some(c => c.title === r.calendar.title); };
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const Reminder = {
    incompleteDueBetween: async (s, e, c) => { if (!(s instanceof Date) || !(e instanceof Date)) throw new TypeError('dueBetween'); return rems().filter(r => !r.isCompleted && r.dueDate && r.dueDate >= s && r.dueDate < e && inCals(r, c)); },
    completedToday: async c => rems().filter(r => r.isCompleted && r.completionDate && sameDay(r.completionDate, new FDate()) && inCals(r, c)),
    allIncomplete: async c => rems().filter(r => !r.isCompleted && inCals(r, c)) };
  const Calendar = { forRemindersByTitle: async t => { if (rems().some(r => r.calendar.title === t)) return { title: t }; throw new Error('no list ' + t); } };
  const scr = o.pad ? [834, 1194] : (o.screen || [393, 852]);
  const ctx = vm.createContext({ Date: FDate, Color, Size, Rect, Point, Font, DrawContext, ListWidget, Alert, FileManager, Data, WebView, console, Reminder, Calendar, SFSymbol,
    UITable, UITableRow, UITableCell,
    Safari: { open: u => { if (!okUrl(u)) throw new TypeError('Safari.open ' + u); log.push('open ' + u); } },
    URLScheme: { forRunningScript: () => 'scriptable:///run?scriptName=' + encodeURIComponent(o.scriptName || 'Widget') },
    Photos: { fromLibrary: () => photos.length ? Promise.resolve(photos.shift()) : Promise.reject(new Error('cancel')) },
    CalendarEvent: { between: async (s, e) => { if (o.fail) throw new Error('denied'); return (o.events || []).filter(v => v.endDate > s && v.startDate < e); } },
    Script: { setWidget(w) { setW = w; }, complete() { log.push('complete'); }, setShortcutOutput(v) { log.push('output ' + JSON.stringify(v)); } },
    config: { runsInApp: !!o.app, runsInWidget: !o.app && o.shortcut === undefined, runsWithSiri: false, widgetFamily: o.app || o.shortcut !== undefined ? null : o.family },
    args: { widgetParameter: o.param || null, queryParameters: o.query || {}, shortcutParameter: o.shortcut === undefined ? null : o.shortcut },
    Device: { isPad: () => !!o.pad, screenSize: () => new Size(scr[0], scr[1]) } });
  await vm.runInContext('(async () => {\n' + SRC(o.file) + '\n})()', ctx, { filename: o.file || 'widget.js' });
  const w = setW || (o.app || o.shortcut !== undefined ? null : made);
  return { w, log, errs: w ? validate(w) : [] };
}
function shot(W, H, rects, rgb, name, icons = []) {
  const d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { const n = (i * 2654435761 >>> 28) & 3; d[i * 4] = 240 + n; d[i * 4 + 1] = 239 + n; d[i * 4 + 2] = 236 + n; d[i * 4 + 3] = 255; }
  const put = (x, y, c) => { const i = (y * W + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; };
  const round = (r, c) => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
    const cx = Math.max(r.x + r.rad, Math.min(x + .5, r.x + r.w - r.rad)), cy = Math.max(r.y + r.rad, Math.min(y + .5, r.y + r.h - r.rad));
    if ((x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= r.rad ** 2) put(x, y, c); } };
  icons.forEach(ic => round(ic, ic.c));
  rects.forEach(r => { round(r, rgb); for (let y = r.y + (r.h * .42 | 0); y < r.y + (r.h * .42 | 0) + 34; y++) for (let x = r.x + (r.w * .2 | 0); x < r.x + (r.w * .8 | 0); x++) if (x % 7 < 4) put(x, y, [255, 255, 255]); });
  return { __img: true, size: new Size(W, H), rgba: d, name };
}
// 収まりの見積もり：和文を含む行は×1.32、英数字だけの行は×1.22
const cjk = ch => /[\u3000-\u9fff\uff00-\uffef]/.test(ch);
const H = n => n.kind === 'date' ? n.font.size * 1.22 : n.kind === 'text' ? n.font.size * ([...n.text].some(cjk) ? 1.32 : 1.22) * (n.lineLimit || 1)
  : n.kind === 'image' ? n.imageSize.height : n.kind === 'spacer' ? (n.length || 0) : (n.size && n.size.height > 0) ? n.size.height
  : n.dir === 'h' ? Math.max(0, ...n.children.map(H))
  : n.children.map(H).reduce((a, b) => a + b, 0) + (n.spacing || 0) * Math.max(0, n.children.length - 1) + (n.padding ? n.padding[0] + n.padding[2] : 0);
const W = n => { if (n.kind === 'date') return n.font.size * 0.6 * 8 * (n.minimumScaleFactor || 1);
  if (n.kind === 'text') { const m = n.font.name.includes('Mono'), f = n.minimumScaleFactor || 1;
    return m ? [...n.text].reduce((a, c) => a + (cjk(c) ? n.font.size : n.font.size * .6), 0) * f : Math.min([...n.text].length, 2) * n.font.size; }
  if (n.kind === 'image') return n.imageSize.width; if (n.kind === 'spacer') return n.length || 0; if (n.size && n.size.width > 0) return n.size.width;
  const ws = n.children.map(W); return n.dir === 'v' ? Math.max(0, ...ws) + (n.padding ? n.padding[1] + n.padding[3] : 0) : ws.reduce((a, b) => a + b, 0) + (n.spacing || 0) * Math.max(0, n.children.length - 1); };
// 機種別の枠（pt・縦向き）
const DEV = {
  'SE':      { screen: [375, 667], small: [148, 148], medium: [321, 148], large: [321, 324], accessoryRectangular: [157, 64] },
  'mini':    { screen: [375, 812], small: [155, 155], medium: [329, 155], large: [329, 345] },
  '標準':    { screen: [393, 852], small: [158, 158], medium: [338, 158], large: [338, 354], accessoryRectangular: [160, 72] },
  'ProMax':  { screen: [430, 932], small: [170, 170], medium: [364, 170], large: [364, 382] },
  'iPad11':  { pad: true, small: [155, 155], medium: [342, 155], large: [342, 342], extraLarge: [715, 342] },
};
function ascii(img, cell) {
  const W = Math.ceil(img.size.width / cell), Hh = Math.ceil(img.size.height / cell), g = Array.from({ length: Hh }, () => Array(W).fill(' '));
  img.ops.forEach(({ r, c }) => { const x = Math.floor((r.x + r.width / 2) / cell), y = Math.floor((r.y + r.height / 2) / cell);
    if (g[y] && x < W && x >= 0) g[y][x] = c.alpha > 0.5 ? '#' : (g[y][x] === '#' ? '#' : '.'); });
  return g.map(row => row.join('')).join('\n');
}
module.exports = { ascii, run, dump, FDate, shot, FILES, reset, H, W, DEV, timerText };
