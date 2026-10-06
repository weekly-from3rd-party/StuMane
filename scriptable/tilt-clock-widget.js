// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: clock;

/* ============================================================
   TILT ― 90 度回した時計（ロック画面用）
   ------------------------------------------------------------
   横向きに寝た姿勢から読めるよう、時刻を 90 度回して表示します
   （Scriptable 用）。表示は 30 分刻みです。
     23:10 → 23　／　23:40 → 23.5　／　7:40 → 7.5

   回した表示は画像なので、iOS が描き直したときにしか変わりません。
   毎時 00 分と 30 分に描き直すよう頼みますが、実際の時刻は iOS が
   決めるため、数分遅れて切り替わることがあります。

   対応サイズ
     ロック画面：長方形（おすすめ）/ 円形 / インライン（回せないので文字だけ）
     ホーム画面：小 / 中 / 大（白基調のカードに同じ表示）

   ウィジェット設定の「Parameter」（任意・カンマ区切り）
     右    … 右に 90 度回す（既定は左に 90 度）
     dark  … ホーム画面で暗色（ロック画面は iOS が色を決める）
   ============================================================ */

// ---------- 設定 ----------
const CONFIG = {
  theme: "light",   // "light"（白基調・既定）/ "dark"（ホーム画面のときだけ）
  turn: "left",     // "left"（左に 90 度）/ "right"（右に 90 度）
};

// ---------- パラメータ ----------
const PARAMS = String(args.widgetParameter || "")
  .split(/[,、]/).map(s => s.trim()).filter(Boolean);
const THEME = PARAMS.map(p => p.toLowerCase()).find(p => p === "dark" || p === "light") || CONFIG.theme;
const TURN = PARAMS.some(p => /^(右|right)$/i.test(p)) ? "right"
  : PARAMS.some(p => /^(左|left)$/i.test(p)) ? "left" : CONFIG.turn;

// ---------- 色（Nothing デザインテンプレ：白基調） ----------
const PALETTES = {
  light: { bg: new Color("#ffffff"), ink: new Color("#0d0d0d"), ghost: new Color("#0d0d0d", 0.08) },
  dark:  { bg: new Color("#0f0f0f"), ink: new Color("#f2f2f2"), ghost: new Color("#ffffff", 0.08) },
};
// ロック画面は iOS が単色に塗り直すので、白の濃淡で描く
const LOCK = { ink: Color.white(), ghost: new Color("#ffffff", 0.18) };
const P = PALETTES[THEME] || PALETTES.light;

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

// 描く枠（pt）。長方形・円形は小さい機種にも収まる大きさにしておく
const FRAME = {
  accessoryRectangular: new Size(150, 62),
  accessoryCircular: new Size(60, 60),
  small: new Size(120, 120),
  medium: new Size(300, 120),
  large: new Size(290, 290),
};

// ============================================================
// ウィジェット本体
// ============================================================
function makeWidget(family, now) {
  const w = new ListWidget();
  w.url = "clock-alarm://";
  w.refreshAfterDate = nextHalf(now);
  const label = hourLabel(now);

  if (family === "accessoryInline") {
    const t = w.addText(label + "時");
    t.font = Font.mediumSystemFont(12);
    t.lineLimit = 1;
    return w;
  }
  const lock = family.indexOf("accessory") === 0;
  if (lock) {
    w.addAccessoryWidgetBackground = family === "accessoryCircular";
  } else {
    w.backgroundColor = P.bg;
  }
  const frame = FRAME[family] || FRAME.small;
  const lines = family === "accessoryCircular" ? [label] : splitLabel(label);
  const row = w.addStack();
  row.layoutHorizontally();
  row.addSpacer();
  const img = row.addImage(tilted(lines, frame, lock ? LOCK : P));
  img.imageSize = frame;
  row.addSpacer();
  return w;
}

// 30 分刻みの時：23:10 → "23" / 23:40 → "23.5"
function hourLabel(now) {
  return String(now.getHours()) + (now.getMinutes() >= 30 ? ".5" : "");
}

// 長方形・ホーム画面は 2 行に分けて数字を大きく（"23.5" → "23" と ".5"）
function splitLabel(label) {
  const i = label.indexOf(".");
  return i < 0 ? [label] : [label.slice(0, i), label.slice(i)];
}

// 次の 00 分か 30 分（の 5 秒後）
function nextHalf(now) {
  const t = new Date(now.getTime());
  t.setSeconds(5, 0);
  t.setMinutes(now.getMinutes() < 30 ? 30 : 60);
  return t;
}

// ============================================================
// 90 度回したドット文字
// ============================================================
// 寝た姿勢から見た枠（縦長）で文字を並べ、それを 90 度回して frame に描く
function tilted(lines, frame, colors) {
  const vw = frame.height, vh = frame.width;           // 寝た姿勢から見た幅・高さ
  const cols = lines.map(lineCols);
  const widest = Math.max(...cols);
  const gap = lines.length > 1 ? 1.5 : 0;               // 行の間（ドット何個ぶん）
  const p = Math.min(vw / widest, vh / (7 * lines.length + gap * (lines.length - 1)));
  const blockH = p * (7 * lines.length + gap * (lines.length - 1));

  const dc = new DrawContext();
  dc.size = frame;
  dc.opaque = false;
  dc.respectScreenScale = true;
  const d = p * 0.8;
  const dot = (u, v, color) => {
    // 寝た姿勢の座標 (u, v) → 画面の座標。左に 90 度：上が左へ／右に 90 度：上が右へ
    const x = TURN === "right" ? frame.width - v : v;
    const y = TURN === "right" ? u : frame.height - u;
    dc.setFillColor(color);
    dc.fillEllipse(new Rect(x - d / 2, y - d / 2, d, d));
  };

  let top = (vh - blockH) / 2;
  lines.forEach((line, li) => {
    // 1 行目は中央、2 行目（.5）は右寄せ
    let left = li === 0 ? (vw - cols[li] * p) / 2 : (vw + cols[0] * p) / 2 - cols[li] * p;
    left = Math.max(0, Math.min(vw - cols[li] * p, left));   // 枠からはみ出さない
    const glyphs = line.split("").map(c => GLYPHS[c] || GLYPHS["0"]);
    glyphs.forEach((g, gi) => {
      const gw = g[0].length;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < gw; c++) {
          dot(left + (c + 0.5) * p, top + (r + 0.5) * p, g[r][c] === "1" ? colors.ink : colors.ghost);
        }
      }
      left += gw * p;
      if (gi < glyphs.length - 1) {
        for (let r = 0; r < 7; r++) dot(left + 0.5 * p, top + (r + 0.5) * p, colors.ghost);
        left += p;
      }
    });
    top += p * (7 + gap);
  });
  return dc.getImage();
}

function lineCols(line) {
  return line.split("").reduce((n, c, i) => n + (GLYPHS[c] || GLYPHS["0"])[0].length + (i ? 1 : 0), 0);
}

// ============================================================
// 実行（ファイルの最後に置くこと）
// ============================================================
async function preview(w, family) {
  const fn = {
    small: "presentSmall", medium: "presentMedium", large: "presentLarge",
    accessoryRectangular: "presentAccessoryRectangular",
    accessoryCircular: "presentAccessoryCircular",
  }[family];
  if (fn && typeof w[fn] === "function") await w[fn]();
  else await w.presentSmall();
}

async function chooseFamily() {
  const opts = [["ロック画面（長方形）", "accessoryRectangular"], ["ロック画面（円形）", "accessoryCircular"], ["小", "small"], ["中", "medium"]];
  const a = new Alert();
  a.title = "プレビュー";
  opts.forEach(o => a.addAction(o[0]));
  a.addCancelAction("キャンセル");
  const i = await a.presentSheet();
  return i >= 0 ? opts[i][1] : null;
}

const family = config.widgetFamily || (config.runsInApp ? await chooseFamily() : "accessoryRectangular");
if (family) {
  const widget = makeWidget(family, new Date());
  if (config.runsInApp) await preview(widget, family);
  else Script.setWidget(widget);
}
Script.complete();
