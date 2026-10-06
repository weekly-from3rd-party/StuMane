// COUNTDOWN / TODO / HABIT の検査：機種別の収まり（5 機種 × 全サイズ × ケース）と、計算・記録の回帰テスト
const { run, dump, FDate, FILES, reset, H, W, DEV, ascii } = require('./harness');
let fail = 0; const check = (n, ok, x = '') => { if (!ok) fail++; console.log((ok ? 'OK  ' : 'NG  ') + n + (x ? '  ' + x : '')); };
const T = (d, h, m = 0) => new FDate(2026, 9, 5 + d, h, m);   // 基準日 2026-10-05（月）

// ---------- TODO 用のリマインダー ----------
const rem = (title, due, timed = true, o = {}) => ({ title, dueDate: due, dueDateIncludesTime: timed, isCompleted: false, completionDate: null, priority: 0, calendar: { title: '仕事' }, ...o });
const REM = {
  A: [rem('レポート提出', T(-1, 0), false), rem('洗濯', T(0, 9)), rem('牛乳を買う', T(0, 0), false, { calendar: { title: '買い物' } }), rem('ゼミ資料を印刷', T(0, 15)),
      rem('メール返信', T(0, 18)), rem('ジム', T(1, 19)), rem('家賃', T(1, 0), false), rem('済み', T(0, 8), true, { isCompleted: true, completionDate: T(0, 8, 30) })],
  MANY: Array.from({ length: 12 }, (_, i) => rem('やること' + i, T(0, 9 + i))).concat([rem('明日の用事', T(1, 9))]),
  LONG: [rem('環境共生学演習のフィールド調査レポートを提出して先生にメールで連絡する', T(0, 13))],
  DONE: [rem('済み', T(0, 8), true, { isCompleted: true, completionDate: T(0, 8, 30) })],
};

// ---------- HABIT 用の記録 ----------
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const days = list => list.map(k => ymd(T(-k, 0)));
const seedHabit = (rec) => { reset(); if (rec) { FILES.set('/icloud/habit/records.json', JSON.stringify(rec)); } };
const HAB = {
  A: { '筋トレ': days([0, 1, 2, 3, 4, 6]), '読書': days([1, 2, 3]), '勉強': days([2, 5, 9]) },
  NONE: {},
};

const CASES = {
  'countdown-widget.js': [['通常', {}], ['年', { param: '年' }], ['絞り込み・該当なし', { param: 'ないもの' }], ['大晦日', { now: new FDate(2026, 11, 31, 23, 50) }],
                          ['透明未設定', { param: '透明' }]],
  'todo-widget.js': [['通常', { reminders: REM.A }], ['過多', { reminders: REM.MANY }], ['長文', { reminders: REM.LONG }], ['完了', { reminders: REM.DONE }],
                     ['空', { reminders: [] }], ['権限なし', { remFail: true }], ['透明未設定', { reminders: REM.A, param: '透明' }]],
  'clock-widget.js': [['通常', {}], ['0時台', { now: T(0, 0, 30) }], ['都市指定', { param: 'シドニー,オークランド,デリー' }], ['透明未設定', { param: '透明' }]],
  'launcher-widget.js': [['1 ページ目', {}], ['2 ページ目', { param: '2' }], ['空ページ', { param: '9' }], ['透明未設定', { param: '透明' }]],
  'tilt-clock-widget.js': [['ちょうど', { now: T(0, 23, 0) }], ['半', { now: T(0, 23, 40) }], ['1 桁', { now: T(0, 7, 40) }], ['右', { now: T(0, 23, 40), param: '右' }]],
  'habit-widget.js': [['通常', { hab: HAB.A }], ['記録なし', { hab: HAB.NONE }], ['1 つだけ', { hab: HAB.A, param: '読書' }], ['透明未設定', { hab: HAB.A, param: '透明' }]],
};

(async () => {
  // ---------- 収まり ----------
  for (const [file, cases] of Object.entries(CASES)) {
    let bad = 0; const worst = {};
    for (const [dev, cfg] of Object.entries(DEV)) {
      const fams = Object.keys(cfg).filter(k => k !== 'screen' && k !== 'pad').concat(['accessoryCircular', 'accessoryInline']);
      for (const fam of fams) for (const [name, c] of cases) {
        if (file === 'habit-widget.js') seedHabit(c.hab); else reset();
        const r = await run({ file, family: fam, now: c.now || T(0, 10, 30), screen: cfg.screen, pad: cfg.pad, ...c });
        if (!cfg[fam]) { if (r.errs.length) { bad++; console.log(`NG ${file} ${dev} ${fam} ${name} ${r.errs[0]}`); } continue; }
        const h = H(r.w), w = W(r.w), [lw, lh] = cfg[fam], ok = h <= lh && w <= lw && !r.errs.length;
        const key = dev + ' ' + fam; if (!worst[key] || lh - h < worst[key].m) worst[key] = { m: lh - h, h, lh, name };
        if (!ok) { bad++; console.log(`NG ${file} ${key} ${name} 高さ ${h.toFixed(0)}/${lh} 幅 ${w.toFixed(0)}/${lw} ${r.errs[0] || ''}`); }
      }
    }
    const tight = Object.entries(worst).sort((a, b) => a[1].m - b[1].m).slice(0, 3).map(([k, v]) => `${k}「${v.name}」余裕 ${v.m.toFixed(0)}pt`).join(' / ');
    check(`${file} 収まり（最も余裕が少ない: ${tight}）`, !bad);
  }

  // ---------- COUNTDOWN ----------
  let r = await run({ file: 'countdown-widget.js', family: 'medium', now: T(0, 10, 30) });
  let t = dump(r.w);
  check('COUNTDOWN 今年の残り（10/05 → あと 87 日・76%）', t.includes('"76%"') && (await run({ file: 'countdown-widget.js', family: 'accessoryInline', now: T(0, 10, 30), param: 'ないもの' })).w.children[0].text === '2026年 あと 87日');
  check('COUNTDOWN 近い順・最も近い 1 件だけ赤', /"D-80".*#ff3b30/.test(t) && !/"D-112".*#ff3b30/.test(t) && t.indexOf('冬休み') < t.indexOf('期末試験'));
  check('COUNTDOWN 毎年の日付（03-14 → 来年 3/14 で D-160）', t.includes('"D-160"') && t.includes('"03.14"'));
  r = await run({ file: 'countdown-widget.js', family: 'small', now: new FDate(2026, 11, 24, 9) });
  t = dump(r.w);
  check('COUNTDOWN 当日は TODAY / D-DAY', t.includes('"TODAY"') && t.includes('"D-DAY"'));
  r = await run({ file: 'countdown-widget.js', family: 'accessoryInline', now: new FDate(2026, 11, 25, 9) });
  check('COUNTDOWN 過ぎた日付は出さない', r.w.children[0].text === '期末試験まで あと31日', r.w.children[0].text);
  r = await run({ file: 'countdown-widget.js', family: 'accessoryInline', now: T(0, 10), param: '期末' });
  check('COUNTDOWN Parameter で名前を絞り込み', r.w.children[0].text === '期末試験まで あと112日', r.w.children[0].text);
  r = await run({ file: 'countdown-widget.js', family: 'large', now: T(0, 10, 30) });
  t = dump(r.w);
  check('COUNTDOWN 大：今月・今週・今日の残り', t.includes('"あと 26日"') && t.includes('"あと 6日"') && t.includes('"あと 13時間"'));

  // ---------- TODO ----------
  r = await run({ file: 'todo-widget.js', family: 'medium', now: T(0, 10, 30), reminders: REM.A });
  t = dump(r.w);
  const order = ['レポート提出', '洗濯', 'ゼミ資料を印刷', 'メール返信', '牛乳を買う'].map(s => t.indexOf(s));
  check('TODO 並び順：期限切れ → 時刻あり → 日付だけ', order.every((v, i) => v > 0 && (!i || v > order[i - 1])), order.join(','));
  check('TODO 期限切れは LATE・最も急ぐ 1 件だけ赤', (t.match(/#ff3b30/g) || []).length === 2 && /"LATE"  <mediumMono 11.5 #ff3b30>/.test(t));
  check('TODO 残り件数と完了（1/6）', t.includes('"1/6"'));
  r = await run({ file: 'todo-widget.js', family: 'medium', now: T(0, 10, 30), reminders: REM.A, param: '買い物' });
  t = dump(r.w);
  check('TODO Parameter でリストを絞り込み', t.includes('牛乳を買う') && !t.includes('洗濯'));
  r = await run({ file: 'todo-widget.js', family: 'large', now: T(0, 10, 30), reminders: REM.MANY });
  t = dump(r.w);
  check('TODO 大：入りきらない分は +N件、明日の欄も残る', /"\+\d+件"/.test(t) && t.includes('明日の用事'));
  r = await run({ file: 'todo-widget.js', family: 'small', now: T(0, 10, 30), reminders: REM.DONE });
  check('TODO 全部済んだら「完了」', dump(r.w).includes('今日のやることは完了'));
  check('TODO タップでリマインダーを開く', r.w.url === 'x-apple-reminderkit://');

  // ---------- HABIT ----------
  seedHabit(HAB.A);
  r = await run({ file: 'habit-widget.js', family: 'medium', now: T(0, 10, 30), scriptName: '習慣' });
  t = dump(r.w);
  check('HABIT 連続日数（今日済み 5 日 / 今日まだでも昨日まで 3 日 / 途切れ 0 日）', /筋トレ[\s\S]*?"5日"[\s\S]*?読書[\s\S]*?"3日"[\s\S]*?勉強[\s\S]*?"0日"/.test(t));
  check('HABIT 完了数 1/3', t.includes('"1/3 DONE"'));
  const rows = r.w.children.find(c => c.dir === 'v' && c.children.some(x => x.url));
  check('HABIT 行のタップで記録用の URL', rows && rows.children[1].url === 'scriptable:///run?scriptName=%E7%BF%92%E6%85%A3&habit=%E8%AA%AD%E6%9B%B8', rows && rows.children[1].url);
  // タップ → 記録 → 反映
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 21), query: { habit: '読書' } });
  check('HABIT タップで今日を記録（連続 4 日）', r.log.some(l => l.includes('✓ 読書') && l.includes('連続 4 日')), r.log.join(' | '));
  r = await run({ file: 'habit-widget.js', family: 'accessoryInline', now: T(0, 21, 30) });
  check('HABIT 記録が反映される', r.w.children[0].text === 'HABIT 2/3 ・ 次: 勉強', r.w.children[0].text);
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 22), query: { habit: '読書' }, alerts: [0, 0] });
  r = await run({ file: 'habit-widget.js', family: 'accessoryInline', now: T(0, 22, 30) });
  check('HABIT 済みをもう一度タップ → 取り消し', r.w.children[0].text === 'HABIT 1/3 ・ 次: 読書', r.w.children[0].text);
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 22), sheets: [1, 2, 3] });
  r = await run({ file: 'habit-widget.js', family: 'large', now: T(0, 22, 30) });
  check('HABIT 過去 7 日の記録を直す（勉強の 10/02 を付ける → 連続 0 のまま・28 日中 4）', dump(r.w).includes('"4/28"'));
  // 習慣の編集（▶ メニューの位置：記録 0 / 修正 1 / 編集 2）
  seedHabit(HAB.A);
  const names = async () => { const x = await run({ file: 'habit-widget.js', family: 'large', now: T(0, 12) }); return [...dump(x.w).matchAll(/"([^"]+)"  <medium 14.5/g)].map(m => m[1]); };
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 12), sheets: [2, 0], texts: ['ストレッチ, 朝'] });
  check('HABIT 編集：追加（カンマは空白に）', (await names()).join('/') === '筋トレ/読書/勉強/ストレッチ 朝', (await names()).join('/'));
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 12), sheets: [2, 1, 1], texts: ['読書30分'] });
  t = dump((await run({ file: 'habit-widget.js', family: 'large', now: T(0, 12) })).w);
  check('HABIT 編集：名前を変えても記録を引き継ぐ（読書30分 3日）', /読書30分[\s\S]*?"3日"/.test(t) && !t.includes('"読書"'));
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 12), sheets: [2, 2, 3, 0] });
  check('HABIT 編集：並べ替え（いちばん上へ）', (await names())[0] === 'ストレッチ 朝', (await names()).join('/'));
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 12), sheets: [2, 3, 1], alerts: [0, 0] });
  check('HABIT 編集：削除', (await names()).join('/') === 'ストレッチ 朝/読書30分/勉強', (await names()).join('/'));
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 12), sheets: [2, 0], texts: ['筋トレ'] });
  t = dump((await run({ file: 'habit-widget.js', family: 'large', now: T(0, 12) })).w);
  check('HABIT 編集：削除した名前で追加し直すと記録が戻る（筋トレ 5日）', /筋トレ[\s\S]*?"5日"/.test(t));
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 12), sheets: [2, 0], texts: ['勉強'] });
  check('HABIT 編集：同じ名前は追加しない', r.log.some(l => l.includes('同じ名前があります')) && (await names()).length === 4);
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 12), query: { habit: '筋トレ' }, alerts: [1] });
  check('HABIT 編集後の習慣もタップで記録できる', !r.log.some(l => l.includes('見つかりません')), r.log.join(' | '));
  r = await run({ file: 'habit-widget.js', app: true, now: T(0, 12), query: { habit: '読書' } });
  check('HABIT 一覧に無い名前のタップは案内を出す', r.log.some(l => l.includes('習慣が見つかりません')));

  seedHabit(null);
  r = await run({ file: 'habit-widget.js', family: 'small', now: T(0, 10) });
  t = dump(r.w);
  check('HABIT 記録ファイルなしでも表示', !r.errs.length && t.includes('タップで記録'));

  // ---------- CLOCK ----------（テスト環境の端末時刻は UTC）
  const dates = n => n.kind === 'date' ? [n] : (n.children || []).flatMap(dates);
  r = await run({ file: 'clock-widget.js', family: 'large', now: new FDate(2026, 9, 5, 10, 30, 15) });
  t = dump(r.w);
  check('CLOCK 時刻はタイマー表示で進む（10:30:15）', dates(r.w).every(d => d.style === 'timer') && t.includes('{10:30:15 semiboldMono 44'));
  check('CLOCK 世界時計と時差（初期値 LONDON 11:30:15 +1H / TOKYO 19:30:15 +9H）', t.includes('{11:30:15') && t.includes('"+1H"') && t.includes('"TOKYO"  <semiboldMono 11.5') && t.includes('{19:30:15') && t.includes('"+9H"'));
  check('CLOCK 次の正時に更新', r.w.refreshAfterDate.getTime() === new FDate(2026, 9, 5, 11, 0, 2).getTime());
  r = await run({ file: 'clock-widget.js', family: 'large', now: new FDate(2026, 9, 5, 0, 30, 15) });
  check('CLOCK 0 時台は 24:30:15', dump(r.w).includes('{24:30:15'));
  r = await run({ file: 'clock-widget.js', family: 'accessoryInline', now: new FDate(2026, 9, 5, 10), param: 'デリー,東京' });
  check('CLOCK 30 分単位の時差（+5.5H）と Parameter の都市', r.w.children[0].text === 'DELHI +5.5H ・ TOKYO +9H', r.w.children[0].text);
  r = await run({ file: 'clock-widget.js', family: 'small', now: new FDate(2026, 9, 5, 10), param: 'デリー' });
  check('CLOCK 時差が 30 分単位なら 30 分ごとに更新', r.w.refreshAfterDate.getTime() === new FDate(2026, 9, 5, 10, 30, 2).getTime());
  r = await run({ file: 'clock-widget.js', family: 'accessoryRectangular', now: new FDate(2026, 9, 5, 10), param: 'ロサンゼルス' });
  check('CLOCK ロック画面は略称（LA）', dump(r.w).includes('"LA"'));
  check('CLOCK タップで時計アプリ', (await run({ file: 'clock-widget.js', family: 'medium', now: new FDate(2026, 9, 5, 10) })).w.url === 'clock-alarm://');

  // ---------- LAUNCHER ----------
  const urls = n => (n.url && n.kind !== 'widget' ? [n.url] : []).concat((n.children || []).flatMap(urls));
  r = await run({ file: 'launcher-widget.js', family: 'medium', now: T(1, 10) });
  let u = urls(r.w);
  check('LAUNCHER 中：8 個それぞれ別のアプリを開く', u.length === 8 && new Set(u).size === 8 && u[2] === 'notion://' && u[3] === 'claude://', u.join(' '));
  t = dump(r.w);
  check('LAUNCHER Notion・STUDY は黒地、赤は Claude だけ', (t.match(/bg#0d0d0d\n/g) || []).length === 2 && (t.match(/#ff3b30/g) || []).length === 2 && /sparkle 19 #ff3b30/.test(t));
  check('LAUNCHER カレンダーは今日を開く', /^calshow:\d+$/.test(u[0]));
  r = await run({ file: 'launcher-widget.js', family: 'large', now: T(1, 10) });
  check('LAUNCHER 大：16 個', urls(r.w).length === 16 && dump(r.w).includes('"APPS 1/2"'));
  r = await run({ file: 'launcher-widget.js', family: 'large', now: T(1, 10), param: '2' });
  check('LAUNCHER Parameter 2 で 2 ページ目（残り 2 個）', urls(r.w).join(' ') === 'shareddocuments:// translate://');
  r = await run({ file: 'launcher-widget.js', family: 'extraLarge', pad: true, now: T(1, 10) });
  check('LAUNCHER 特大：18 個すべて', urls(r.w).length === 18);
  r = await run({ file: 'launcher-widget.js', family: 'small', now: T(1, 10), scriptName: 'ランチャー' });
  check('LAUNCHER 小：タップで一覧を開く', urls(r.w).length === 0 && r.w.url.endsWith('&launch=menu'), r.w.url);
  r = await run({ file: 'launcher-widget.js', app: true, now: T(1, 10), query: { launch: 'menu' }, sheets: [3] });
  check('LAUNCHER 一覧で選ぶとそのアプリを開く', r.log.includes('open claude://'), r.log.join(' | '));

  // ---------- TILT（90 度回した時計） ----------
  const tiltText = async (h, m) => (await run({ file: 'tilt-clock-widget.js', family: 'accessoryInline', now: T(0, h, m) })).w.children[0].text;
  check('TILT 30 分刻み（23:10→23 / 23:40→23.5 / 7:40→7.5 / 0:05→0）',
    [await tiltText(23, 10), await tiltText(23, 40), await tiltText(7, 40), await tiltText(0, 5)].join(' ') === '23時 23.5時 7.5時 0時');
  r = await run({ file: 'tilt-clock-widget.js', family: 'accessoryRectangular', now: T(0, 23, 10) });
  check('TILT 次の 30 分で描き直す（23:10→23:30）', r.w.refreshAfterDate.getTime() === new FDate(2026, 9, 5, 23, 30, 5).getTime());
  r = await run({ file: 'tilt-clock-widget.js', family: 'accessoryRectangular', now: T(0, 23, 40) });
  check('TILT 23:40 の次は翌日 0:00', r.w.refreshAfterDate.getTime() === new FDate(2026, 9, 6, 0, 0, 5).getTime());
  const tiltImg = x => x.w.children[0].children.find(c => c.kind === 'image').src;
  const left = tiltImg(r), right = tiltImg(await run({ file: 'tilt-clock-widget.js', family: 'accessoryRectangular', now: T(0, 23, 40), param: '右' }));
  // 左：(x, y) = (v, 62 − u)／右：(150 − v, u) なので、右のドットは左を 180 度回した位置にある
  const centers = (img, f) => img.ops.map(o => f(o.r.x + o.r.width / 2, o.r.y + o.r.height / 2).map(n => n.toFixed(2)).join(',') + (o.c.alpha > .5 ? '#' : '.')).sort().join(' ');
  check('TILT 左と右は 180 度反対向き', centers(left, (x, y) => [150 - x, 62 - y]) === centers(right, (x, y) => [x, y]) && ascii(left, 5) !== ascii(right, 5));
  const inside = img => img.ops.every(o => o.r.x >= -0.01 && o.r.y >= -0.01 && o.r.x + o.r.width <= img.size.width + 0.01 && o.r.y + o.r.height <= img.size.height + 0.01);
  let allIn = true;
  for (const [h, m] of [[0, 5], [7, 40], [11, 40], [19, 10], [23, 40]]) for (const fam of ['accessoryRectangular', 'accessoryCircular', 'small'])
    for (const param of ['', '右']) allIn = allIn && inside(tiltImg(await run({ file: 'tilt-clock-widget.js', family: fam, now: T(0, h, m), param })));
  check('TILT どの時刻・形・向きでもドットが枠の中に収まる', allIn && left.size.width === 150 && left.size.height === 62);

  // ---------- タップ領域の分割 ----------
  r = await run({ file: 'clock-widget.js', family: 'large', now: new FDate(2026, 9, 5, 10) });
  check('CLOCK 大：時刻→アラーム／24H→タイマー／世界時計→世界時計', urls(r.w).join(' ') === 'clock-alarm:// clock-timer:// clock-worldclock://', urls(r.w).join(' '));
  r = await run({ file: 'clock-widget.js', family: 'medium', now: new FDate(2026, 9, 5, 10) });
  check('CLOCK 中：左→アラーム／右→世界時計', urls(r.w).join(' ') === 'clock-alarm:// clock-worldclock://', urls(r.w).join(' '));
  r = await run({ file: 'todo-widget.js', family: 'large', now: T(0, 10, 30), reminders: REM.A });
  const cal1 = 'calshow:' + Math.floor(T(1, 0).getTime() / 1000 - 978307200);
  check('TODO 大：明日の欄はカレンダーの明日', urls(r.w).join(' ') === cal1 && r.w.url === 'x-apple-reminderkit://', urls(r.w).join(' '));
  r = await run({ file: 'todo-widget.js', family: 'medium', now: T(0, 10, 30), reminders: REM.A.slice(0, 2).concat(REM.A.slice(5)) });
  check('TODO 中：明日の区切りと行はカレンダーの明日', urls(r.w).length >= 2 && urls(r.w).every(x => x === cal1), urls(r.w).join(' '));
  r = await run({ file: 'countdown-widget.js', family: 'large', now: T(0, 10, 30) });
  check('COUNTDOWN 大：残り時間の欄はカレンダーの今日', urls(r.w)[0] === 'calshow:' + Math.floor(T(0, 10, 30).getTime() / 1000 - 978307200));

  console.log(fail ? `\n${fail} 件失敗` : '\n全ケース OK');
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('THROW', e.stack); process.exitCode = 1; });
