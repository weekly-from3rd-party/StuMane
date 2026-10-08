// COUNTDOWN / TODO / HABIT の検査：機種別の収まり（5 機種 × 全サイズ × ケース）と、計算・記録の回帰テスト
const { run, dump, FDate, FILES, reset, H, W, DEV, ascii, shot } = require('./harness');
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
// 砂時計の記録（開始・終了・見出し）を置く
const seedHourglass = (start, end, label = '6:00 まで') => { reset(); if (start) { FILES.set('/icloud/hourglass/state.json', JSON.stringify({ start: start.getTime(), end: end.getTime(), label })); } };
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
  'tilt-clock-widget.js': [['ちょうど', { now: T(0, 23, 0) }], ['半', { now: T(0, 23, 40) }], ['1 桁', { now: T(0, 7, 40) }], ['右', { now: T(0, 23, 40), param: '右' }],
                           ['時刻', { now: T(0, 23, 40), param: '時刻' }], ['半の印', { now: T(0, 7, 40), param: '半' }]],
  'hourglass-widget.js': [['動いている', { now: T(1, 2, 0), hg: [T(1, 0), T(1, 6)] }], ['終わった', { now: T(1, 7, 0), hg: [T(1, 0), T(1, 6)] }],
                          ['待機', { now: T(1, 2, 0), hg: null }], ['左', { now: T(1, 2, 0), hg: [T(1, 0), T(1, 6)], param: '左' }],
                          ['だけ', { now: T(1, 2, 0), hg: [T(1, 0), T(1, 6)], param: 'だけ,右' }]],
  'habit-widget.js': [['通常', { hab: HAB.A }], ['記録なし', { hab: HAB.NONE }], ['1 つだけ', { hab: HAB.A, param: '読書' }], ['透明未設定', { hab: HAB.A, param: '透明' }]],
};

(async () => {
  // ---------- 収まり ----------
  for (const [file, cases] of Object.entries(CASES)) {
    let bad = 0; const worst = {};
    for (const [dev, cfg] of Object.entries(DEV)) {
      const fams = Object.keys(cfg).filter(k => k !== 'screen' && k !== 'pad').concat(['accessoryCircular', 'accessoryInline']);
      for (const fam of fams) for (const [name, c] of cases) {
        if (file === 'habit-widget.js') seedHabit(c.hab); else if (file === 'hourglass-widget.js') seedHourglass(...(c.hg || [])); else reset();
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
  // リマインダーから読む：優先度「高」・リスト・フラグ（ショートカットが名前を渡す）を自分で選ぶ
  const C = 'countdown-widget.js';
  const rem = (title, d, extra = {}) => Object.assign({ title, dueDate: T(d, 9), dueDateIncludesTime: false, isCompleted: false, priority: 0, calendar: { title: 'リマインダー' } }, extra);
  const REMS = [rem('レポート提出', 3, { priority: 1 }), rem('英検', 20, { calendar: { title: 'カウントダウン' } }), rem('ライブ', 40), rem('期限なし', 0, { dueDate: null }), rem('ふつうの用事', 5)];
  const cdTexts = async () => dump((await run({ file: C, family: 'large', now: T(0, 10, 30), reminders: REMS })).w);
  reset();
  check('COUNTDOWN リマインダー：初期はどれも読まない', !(await cdTexts()).includes('レポート提出'));
  await run({ file: C, app: true, now: T(0, 10, 30), reminders: REMS, sheets: [4, 0, 1, 3], texts: ['カウントダウン'] });
  let ct = await cdTexts();
  check('COUNTDOWN リマインダー：優先度「高」とリストを選ぶと出る（期限の日まで）', ct.includes('"レポート提出"') && ct.includes('"英検"') && ct.includes('"D-3"') && !ct.includes('ライブ') && !ct.includes('ふつうの用事'), JSON.stringify(FILES.get('/icloud/countdown/settings.json')));
  r = await run({ file: C, now: T(0, 10, 30), shortcut: ['ライブ', '期限なし'] });
  check('COUNTDOWN フラグ：ショートカットから名前を受け取って保存', r.log.includes('output ' + JSON.stringify('フラグ付き 2 件を保存しました')), r.log.join(' | '));
  ct = await cdTexts();
  check('COUNTDOWN フラグ：オフのうちは出さない', !ct.includes('"ライブ"'));
  await run({ file: C, app: true, now: T(0, 10, 30), reminders: REMS, sheets: [4, 0, 2, 3] });
  ct = await cdTexts();
  check('COUNTDOWN フラグ：オンにすると出る（優先度はオフに戻した）', ct.includes('"ライブ"') && ct.includes('"英検"') && !ct.includes('"レポート提出"') && !ct.includes('期限なし'));
  reset();

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
  check('LAUNCHER 小：1 個目を大きく出し、タップでそのまま開く（メニューを挟まない）', urls(r.w).length === 0 && /^calshow:\d+$/.test(r.w.url) && dump(r.w).includes('"CAL"'), r.w.url);
  r = await run({ file: 'launcher-widget.js', family: 'small', now: T(1, 10), param: '4' });
  check('LAUNCHER 小：Parameter の数字でセットの何個目か', r.w.url === 'claude://' && dump(r.w).includes('"CLAUDE"'), r.w.url);
  r = await run({ file: 'launcher-widget.js', family: 'small', now: T(1, 10), param: '99' });
  check('LAUNCHER 小：数字が多すぎれば最後の 1 個', r.w.url === 'translate://', r.w.url);
  r = await run({ file: 'launcher-widget.js', app: true, now: T(1, 10), query: { launch: 'menu' }, sheets: [3] });
  check('LAUNCHER 一覧で選ぶとそのアプリを開く', r.log.includes('open claude://'), r.log.join(' | '));

  // ---------- TILT（90 度回した時計） ----------
  const tiltImg = x => x.w.children[0].children.find(c => c.kind === 'image').src;
  const tiltText = async (h, m, param) => (await run({ file: 'tilt-clock-widget.js', family: 'accessoryInline', now: T(0, h, m), param })).w.children[0].text;
  check('TILT 小数（既定）：23:10→23 / 23:40→23.5 / 7:40→7.5 / 0:05→0',
    [await tiltText(23, 10), await tiltText(23, 40), await tiltText(7, 40), await tiltText(0, 5)].join(' ') === '23時 23.5時 7.5時 0時');
  check('TILT 時刻：23:10→23:00 / 23:40→23:30', [await tiltText(23, 10, '時刻'), await tiltText(23, 40, '時刻,右')].join(' ') === '23:00 23:30');
  check('TILT 半：23:10→23時 / 23:40→23時半', [await tiltText(23, 10, '半'), await tiltText(23, 40, '半')].join(' ') === '23時 23時半');
  // 半の印：30 分前は消えたドット 1 つ、30 分過ぎは点いたドット 1 つ（点灯ドット数の差が 1）
  const litCount = async (m, param) => tiltImg(await run({ file: 'tilt-clock-widget.js', family: 'accessoryRectangular', now: T(0, 23, m), param })).ops.filter(o => o.c.alpha > .5).length;
  check('TILT 半の印は 30 分を過ぎると 1 つ点く', (await litCount(40, '半')) - (await litCount(10, '半')) === 1);
  r = await run({ file: 'tilt-clock-widget.js', family: 'accessoryRectangular', now: T(0, 23, 10) });
  check('TILT 次の 30 分で描き直す（23:10→23:30）', r.w.refreshAfterDate.getTime() === new FDate(2026, 9, 5, 23, 30, 5).getTime());
  r = await run({ file: 'tilt-clock-widget.js', family: 'accessoryRectangular', now: T(0, 23, 40) });
  check('TILT 23:40 の次は翌日 0:00', r.w.refreshAfterDate.getTime() === new FDate(2026, 9, 6, 0, 0, 5).getTime());
  const left = tiltImg(r), right = tiltImg(await run({ file: 'tilt-clock-widget.js', family: 'accessoryRectangular', now: T(0, 23, 40), param: '右' }));
  // 左：(x, y) = (v, 62 − u)／右：(150 − v, u) なので、右のドットは左を 180 度回した位置にある
  const centers = (img, f) => img.ops.map(o => f(o.r.x + o.r.width / 2, o.r.y + o.r.height / 2).map(n => n.toFixed(2)).join(',') + (o.c.alpha > .5 ? '#' : '.')).sort().join(' ');
  check('TILT 左と右は 180 度反対向き', centers(left, (x, y) => [150 - x, 62 - y]) === centers(right, (x, y) => [x, y]) && ascii(left, 5) !== ascii(right, 5));
  const inside = img => img.ops.every(o => o.r.x >= -0.01 && o.r.y >= -0.01 && o.r.x + o.r.width <= img.size.width + 0.01 && o.r.y + o.r.height <= img.size.height + 0.01);
  let allIn = true;
  for (const [h, m] of [[0, 5], [7, 40], [11, 40], [19, 10], [23, 40]]) for (const fam of ['accessoryRectangular', 'accessoryCircular', 'small'])
    for (const param of ['', '右', '時刻', '半,右']) allIn = allIn && inside(tiltImg(await run({ file: 'tilt-clock-widget.js', family: fam, now: T(0, h, m), param })));
  check('TILT どの時刻・形・向きでもドットが枠の中に収まる', allIn && left.size.width === 150 && left.size.height === 62);

  // ---------- HOURGLASS（砂時計） ----------
  const HG = 'hourglass-widget.js';
  const hgOut = async (input, now) => { const x = await run({ file: HG, shortcut: input, now }); return x.log.find(l => l.startsWith('output ')) || 'output なし'; };
  reset();
  check('HOURGLASS ショートカット「6:00」を 0:00 に → 360 分で開始', (await hgOut('6:00', T(1, 0, 0))) === 'output 360');
  r = await run({ file: HG, family: 'medium', now: T(1, 2, 0) });
  t = dump(r.w);
  check('HOURGLASS 2:00 時点：残り 4:00:00・67%・00:00 → 06:00', t.includes('{4:00:00') && t.includes('"67%"') && t.includes('"00:00 → 06:00"') && t.includes('"6:00 まで"'), t);
  check('HOURGLASS 砂 1 粒ぶん（約 13 分）で描き直す', Math.abs(r.w.refreshAfterDate - T(1, 2, 0) - 6 * 3600000 / 28) < 1000);
  check('HOURGLASS タップでショートカット「砂時計」を開く', r.w.url === 'shortcuts://run-shortcut?name=' + encodeURIComponent('砂時計'));
  const sandLit = img => img.ops.filter(o => o.c.hex === '#0d0d0d' && o.c.alpha === 1).length;
  const hgImg = x => x.w.children[0].children.find(c => c.kind === 'image').src;
  const lit2 = sandLit(hgImg(await run({ file: HG, family: 'medium', now: T(1, 2, 0) })));
  const lit5 = sandLit(hgImg(await run({ file: HG, family: 'medium', now: T(1, 5, 0) })));
  check('HOURGLASS 砂の数は上下合わせて 28 のまま', lit2 === 28 && lit5 === 28, lit2 + ' / ' + lit5);
  check('HOURGLASS 落ちている砂粒だけ赤', hgImg(r).ops.filter(o => o.c.hex === '#ff3b30').length === 1);
  r = await run({ file: HG, family: 'accessoryInline', now: T(1, 7, 0) });
  check('HOURGLASS 終わったら DONE（インラインは「終了」）', r.w.children[0].text === '砂時計 06:00 終了', r.w.children[0].text);
  r = await run({ file: HG, family: 'accessoryInline', now: T(1, 19, 0) });
  check('HOURGLASS 終わって 12 時間を過ぎたら待機', r.w.children[0].text === '砂時計 待機中');
  check('HOURGLASS「25」→ 25 分', (await hgOut('25', T(1, 9, 0))) === 'output 25');
  check('HOURGLASS「7:30」を 8:00 に → 翌日 7:30 まで（1410 分）', (await hgOut('７:30'.replace('７', '7'), T(1, 8, 0))) === 'output 1410');
  check('HOURGLASS 時刻のいろいろな書き方（23:00 に → 6:30 まで 450 分）',
    (await hgOut('6時30分', T(1, 23, 0))) === 'output 450' && (await hgOut('午前6:30', T(1, 23, 0))) === 'output 450'
    && (await hgOut('2026/10/07 6:30', T(1, 23, 0))) === 'output 450' && (await hgOut('６：３０', T(1, 23, 0))) === 'output 450');
  check('HOURGLASS 午後の時刻（9:00 に「午後11:15」→ 855 分）', (await hgOut('午後11:15', T(1, 9, 0))) === 'output 855');
  check('HOURGLASS「7時」→ 7:00 まで（6:00 に → 60 分）', (await hgOut('7時', T(1, 6, 0))) === 'output 60');
  check('HOURGLASS 長さの書き方（25分→25／1時間→60／1.5時間→90／1時間30分→90）',
    [await hgOut('25分', T(1, 9, 0)), await hgOut('1時間', T(1, 9, 0)), await hgOut('1.5時間', T(1, 9, 0)), await hgOut('1時間30分', T(1, 9, 0))].join(' ')
      === 'output 25 output 60 output 90 output 90');
  check('HOURGLASS 読めない値は開始しない（何も返さない）', (await hgOut('あとで', T(1, 8, 0))) === 'output なし');
  check('HOURGLASS「停止」で記録を消す（何も返さない）', (await hgOut('停止', T(1, 8, 10))) === 'output なし'
    && (await run({ file: HG, family: 'accessoryInline', now: T(1, 8, 20) })).w.children[0].text === '砂時計 待機中');
  seedHourglass(T(1, 0), T(1, 6));
  const tl = hgImg(await run({ file: HG, family: 'accessoryRectangular', now: T(1, 2, 0), param: '左' }));
  const tr = hgImg(await run({ file: HG, family: 'accessoryRectangular', now: T(1, 2, 0), param: '右' }));
  const ctr = (img, f) => img.ops.map(o => f(o.r.x + o.r.width / 2, o.r.y + o.r.height / 2).map(n => n.toFixed(2)).join(',') + o.c.alpha).sort().join(' ');
  check('HOURGLASS 左・右に回すと 180 度反対向き', ctr(tl, (x, y) => [150 - x, 62 - y]) === ctr(tr, (x, y) => [x, y]));
  const only = hgImg(await run({ file: HG, family: 'accessoryRectangular', now: T(1, 2, 0), param: 'だけ' }));
  const onlyR = hgImg(await run({ file: HG, family: 'accessoryRectangular', now: T(1, 2, 0), param: 'だけ,右' }));
  const onlyHome = hgImg(await run({ file: HG, family: 'small', now: T(1, 2, 0), param: 'だけ' }));
  const xs = only.ops.map(o => o.r.x + o.r.width / 2);
  check('HOURGLASS「だけ」：縦長の砂時計（9×21）を長方形いっぱいに横倒しで描く', Math.max(...xs) - Math.min(...xs) > 130 && only.ops.length === onlyR.ops.length,
    (Math.max(...xs) - Math.min(...xs)).toFixed(0) + 'pt');
  check('HOURGLASS「だけ」：砂は上下合わせて 39 粒・落ちている砂粒だけ赤', sandLit(onlyHome) === 39 && onlyHome.ops.filter(o => o.c.hex === '#ff3b30').length === 1, String(sandLit(onlyHome)));
  check('HOURGLASS「だけ」：左と右は 180 度反対向き', ctr(only, (x, y) => [150 - x, 62 - y]) === ctr(onlyR, (x, y) => [x, y]));
  check('HOURGLASS 回した表示は枠の中に収まる', [only, onlyR].every(img => img.ops.every(o => o.r.x >= -0.01 && o.r.y >= -0.01 && o.r.x + o.r.width <= 150.01 && o.r.y + o.r.height <= 62.01)) && [tl, tr].every(img => img.ops.every(o => o.r.x >= -0.01 && o.r.y >= -0.01 && o.r.x + o.r.width <= 150.01 && o.r.y + o.r.height <= 62.01)));

  // ---------- LAUNCHER の編集画面（▶ メニュー：0 アプリを開く / 1 アプリを編集 / 2 小 …）----------
  const L = 'launcher-widget.js';
  const lUrls = async (param, fam = 'medium') => urls((await run({ file: L, family: fam, now: T(1, 10), param })).w);
  // ui：開いた一覧画面ごとの操作。tap(table, 文字) で行を選ぶ、btn(table, 文字, ボタン) で行のボタンを押す
  const tap = (tb, text) => { const r = tb.find(text); return r.onSelect(tb.rows.indexOf(r)); };
  const btn = (tb, text, b) => tb.find(text).cells.find(c => c.type === 'button' && c.title === b).onTap();
  const edit = (ui, opt = {}) => run({ file: L, app: true, now: T(1, 10), sheets: [1].concat(opt.sheets || []), texts: opt.texts, alerts: opt.alerts, photos: opt.photos, web: opt.web, ui });
  reset();
  let seen = [];
  await edit([async tb => { seen = tb.lines(); }]);
  check('LAUNCHER 編集画面：セット名・アプリの行（アイコン・表示名・日本語名）・ページの区切り・追加',
    seen[0].startsWith('セット：すべて') && seen.some(l => l === 'NOTION') && seen.filter(l => l.startsWith('── ここから')).length === 2 && seen[seen.length - 1] === '＋ アプリを追加', seen.slice(0, 4).join(' / '));
  // セットを作る（空）→ 追加画面で 2 つ入れて 1 つ外す
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, 'NOTION'); await tap(tb, 'YT'); await tap(tb, 'LINE'); await tap(tb, 'LINE'); seen = tb.lines(); }],
    { sheets: [0, 0], texts: ['勉強'] });
  check('LAUNCHER セットを作る → 追加画面でタップして入れる・外す（✓）', (await lUrls('勉強')).join(' ') === 'notion:// youtube://' && seen.some(l => l.includes('YT') && l.endsWith('✓')) && seen.some(l => l.startsWith('LINE') && !l.endsWith('✓')),
    (await lUrls('勉強')).join(' '));
  check('LAUNCHER 追加画面は種類ごと（Apple のアプリ／勉強・仕事／AI／SNS・連絡／エンタメ／買い物・お金／生活・その他）', ['Apple のアプリ', '勉強・仕事', 'AI', 'SNS・連絡', 'エンタメ', '買い物・お金', '生活・その他'].every(c => seen.includes(c)));
  // ⇅ 並べ替え（WebView）：ページでの並びを閉じたときに読み出して保存。ページの中身も確かめる
  let page = '';
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, '⇅ 並べ替え'); }], { sheets: [0], web: html => { page = html; return { ORDER: [1, 0] }; } });
  const js = (page.match(/<script>([\s\S]*)<\/script>/) || [])[1] || '';
  let parsed = true; try { new Function(js); } catch (e) { parsed = false; }
  check('LAUNCHER 並べ替え：長押しドラッグのページ（タイル・日本語名・元に戻す）を開き、閉じたら並びを保存', (await lUrls('勉強')).join(' ') === 'youtube:// notion://'
    && (page.match(/class="t[^"]*" data-i=/g) || []).length === 2 && page.includes('YouTube') && page.includes('元の並びに戻す') && parsed && js.includes('touchstart'), (await lUrls('勉強')).join(' '));
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, '⇅ 並べ替え'); }], { sheets: [0], web: () => ({ ORDER: [0, 0] }) });
  check('LAUNCHER 並べ替え：おかしな並びは保存しない', (await lUrls('勉強')).join(' ') === 'youtube:// notion://');
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, '⇅ 並べ替え'); }], { sheets: [0], web: () => ({ ORDER: [1, 0] }) });
  // ↑ で並べ替え、✕ で外す、行のタップで表示名を変える
  await edit([async tb => { await tap(tb, 'セット：すべて'); btn(tb, 'YT', '↑'); }], { sheets: [0] });
  check('LAUNCHER ↑ で並べ替え', (await lUrls('勉強')).join(' ') === 'youtube:// notion://');
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, 'YT'); }], { sheets: [0, 0], texts: ['tube'] });
  check('LAUNCHER 行をタップして表示名を変える（大文字に）', dump((await run({ file: L, family: 'medium', now: T(1, 10), param: '勉強' })).w).includes('"TUBE"'));
  await edit([async tb => { await tap(tb, 'セット：すべて'); btn(tb, 'TUBE', '✕'); }], { sheets: [0] });
  check('LAUNCHER ✕ で外す', (await lUrls('勉強')).join(' ') === 'notion://');
  // 自分で入れる（URL）
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '＋ 自分で入れる'); }],
    { sheets: [0, 0, 5, 1], texts: ['myapp://', 'my'] });
  r = await run({ file: L, family: 'medium', now: T(1, 10), param: '勉強' });
  check('LAUNCHER 自分で入れる（URL・表示名・アイコン・色）', urls(r.w).join(' ') === 'notion:// myapp://' && dump(r.w).includes('[SF star 19 #ffffff'), urls(r.w).join(' '));
  // アイコンを写真から選ぶ（自分で入れるとき・変更するとき）
  const pic = shot(1200, 800, [], [0, 0, 0], 'myphoto');
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '＋ 自分で入れる'); }],
    { sheets: [0, 1, 1], texts: ['ゲーム', 'game'], photos: [pic] });
  const sets = JSON.parse(FILES.get('/icloud/launcher/sets.json')), mine = sets.find(x => x.name === '勉強').apps.find(a => a.label === 'GAME');
  const saved = mine && FILES.get('/icloud/launcher/icons/' + mine.image);
  check('LAUNCHER 自分で入れる：ショートカット＋写真から選んだ画像（正方形 180px に切り抜いて保存）', !!saved && saved.size.width === 180 && saved.size.height === 180
    && mine.url === 'shortcuts://run-shortcut?name=' + encodeURIComponent('ゲーム') && !mine.style, JSON.stringify(mine));
  r = await run({ file: L, family: 'medium', now: T(1, 10), param: '勉強' });
  const tiles = n => (n.children || []).flatMap(c => (c.kind === 'image' ? [c] : tiles(c)));
  check('LAUNCHER 自分の画像はタイルいっぱいに表示（線画・地の色なし）', tiles(r.w).some(i => !i.symbol && i.imageSize.width === 38), dump(r.w).split('\n').filter(l => l.includes('[')).slice(-3).join(' / '));
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, 'GAME'); }], { sheets: [0, 2, 5] });
  check('LAUNCHER アイコンを線画に戻すと画像は外れる', !JSON.parse(FILES.get('/icloud/launcher/sets.json')).find(x => x.name === '勉強').apps.find(a => a.label === 'GAME').image);
  await edit([async tb => { await tap(tb, 'セット：すべて'); btn(tb, 'GAME', '✕'); }], { sheets: [0] });

  // 名前変更・使えない名前・削除・初期化
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, 'セット：勉強'); }], { sheets: [0, 2], texts: ['学校'] });
  check('LAUNCHER セットの名前を変える（古い名前は最初のセットになる）', (await lUrls('学校')).length === 2 && (await lUrls('勉強')).length === 8);
  r = await edit([async tb => { await tap(tb, 'セット：すべて'); }], { sheets: [1], texts: ['2'] });
  check('LAUNCHER 数字・dark・透明 はセット名に使えない', r.log.some(l => l.includes('使えない名前です')));
  await edit([async tb => { await tap(tb, 'セット：すべて'); await tap(tb, 'セット：学校'); }], { sheets: [0, 3], alerts: [0] });
  check('LAUNCHER セットを削除', (await lUrls('学校')).length === 8 && JSON.parse(FILES.get('/icloud/launcher/sets.json')).length === 1);
  await edit([async tb => { btn(tb, 'CAL', '✕'); await tap(tb, 'セット：すべて'); }], { sheets: [3], alerts: [0] });
  check('LAUNCHER 初期に戻す', (await lUrls('', 'extraLarge')).length === 18);
  await edit([async tb => { await tap(tb, 'セット：すべて'); }], { sheets: [0, 1], texts: ['朝'] });
  r = await run({ file: L, family: 'small', now: T(1, 10), param: '朝', scriptName: 'L' });
  check('LAUNCHER 小：セット名の Parameter でそのセットの 1 個目（複製したセット「朝」）', /^calshow:\d+$/.test(r.w.url), r.w.url);

  // 選択肢（追加画面の一覧）の編集。初めて作るときは今セットに入っているアプリも入れる
  reset();
  FILES.set('/icloud/launcher/sets.json', JSON.stringify([{ name: '朝', apps: [{ label: 'NOTION', icon: 'doc.text', url: 'notion://' }, { label: 'FOO', icon: 'star', url: 'foo://' }] }]));
  const cat = () => JSON.parse(FILES.get('/icloud/launcher/catalog.json')).groups;
  const inCat = url => cat().find(g => g.items.some(x => x.url === url));
  const setUrls = () => JSON.parse(FILES.get('/icloud/launcher/sets.json'))[0].apps.map(a => a.url).join(' ');
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { seen = tb.lines(); }]);
  check('LAUNCHER 選択肢：初めて作るとき、セットの中の一覧に無いアプリを「自分で追加」に入れる', (inCat('foo://') || {}).cat === '自分で追加' && inCat('notion://').cat !== '自分で追加'
    && seen.includes('自分で追加') && seen.some(l => l.startsWith('FOO')) && seen.includes('✎ 選択肢を編集'), JSON.stringify(cat().map(g => g.cat)));
  // 選択肢を追加（新しい種類「ゲーム」）→ 追加画面に出て、タップでセットに入る
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '✎ 選択肢を編集'); await tap(tb, 'BAR'); }, async tb => { await tap(tb, '＋ 選択肢を追加'); seen = tb.lines(); }],
    { sheets: [0, 0, 0, 8], texts: ['bar://', 'バー', 'bar', 'ゲーム'], alerts: [0] });
  const bar = (inCat('bar://') || { items: [] }).items.find(x => x.url === 'bar://');
  check('LAUNCHER 選択肢を追加（日本語名・表示名・新しい種類）→ 追加画面でセットに入れる', !!bar && inCat('bar://').cat === 'ゲーム' && bar.name === 'バー' && bar.label === 'BAR'
    && setUrls() === 'notion:// foo:// bar://' && seen.some(l => l.startsWith('ゲーム（1）')), JSON.stringify(bar) + ' / ' + setUrls());
  // 選択肢の変更・並べ替え・外す（セットの中はそのまま）
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '✎ 選択肢を編集'); }, async tb => { await tap(tb, 'BAR'); }], { sheets: [0], texts: ['バー２'] });
  check('LAUNCHER 選択肢の日本語名を変える', inCat('bar://').items[0].name === 'バー２');
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '✎ 選択肢を編集'); }, async tb => { btn(tb, 'TODO', '↑'); }]);
  check('LAUNCHER 選択肢を ↑ で並べ替え', cat()[0].items.slice(0, 2).map(x => x.label).join(' ') === 'TODO CAL', cat()[0].items.slice(0, 3).map(x => x.label).join(' '));
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '✎ 選択肢を編集'); }, async tb => { btn(tb, 'BAR', '✕'); }]);
  check('LAUNCHER 選択肢を ✕ で外す（セットの中には残る）', !inCat('bar://') && setUrls() === 'notion:// foo:// bar://');
  // 保存済みの選択肢（古い配列の形）に、コードで増えた初期の選択肢を足す。外したものは戻さない
  FILES.set('/icloud/launcher/catalog.json', JSON.stringify([{ cat: 'Apple のアプリ', items: [{ name: 'カレンダー', label: 'CAL', icon: 'calendar', url: 'calshow:' }] }]));
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { seen = tb.lines(); }]);
  check('LAUNCHER 古い選択肢に、増えた初期の選択肢（iPad のアプリ）を足す', ['obsidian://', 'ibooks://', 'discord://'].every(u => inCat(u)) && cat().length === 7
    && seen.includes('AI') && seen.some(l => l.startsWith('OBSDN')), JSON.stringify(cat().map(g => g.cat + g.items.length)));
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '✎ 選択肢を編集'); }, async tb => { btn(tb, 'OBSDN', '✕'); }]);
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }]);
  check('LAUNCHER 外した初期の選択肢は、開き直しても戻らない', !inCat('obsidian://'));
  // 自分で入れたアプリは「自分で追加」にも入る
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '＋ 自分で入れる'); }], { sheets: [0, 0, 0], texts: ['baz://', 'baz'] });
  check('LAUNCHER 自分で入れたアプリは選択肢の「自分で追加」にも入る', (inCat('baz://') || {}).cat === '自分で追加');
  // 初期の選択肢に戻す：今セットに入っているアプリ（外した BAR も）を入れて作り直す
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }, async tb => { await tap(tb, '✎ 選択肢を編集'); }, async tb => { await tap(tb, '初期の選択肢に戻す'); }], { alerts: [0] });
  check('LAUNCHER 初期の選択肢に戻す（セットの中のアプリも入れる）', !cat().some(x => x.cat === 'ゲーム') && ['foo://', 'bar://', 'baz://'].every(u => (inCat(u) || {}).cat === '自分で追加'),
    JSON.stringify(cat().map(g => g.cat + g.items.length)));
  // ショートカット名の置き換え（日本語名 → ユーザーが作った「アプリを開く N」）。保存済みのセット・選択肢も読むときに直す
  const oldSafari = 'shortcuts://run-shortcut?name=MUJI', newSafari = 'shortcuts://run-shortcut?name=' + encodeURIComponent('アプリを開く 39');
  FILES.set('/icloud/launcher/sets.json', JSON.stringify([{ name: '朝', apps: [{ label: 'MUJI', icon: 'house', url: oldSafari }, { label: 'SAFARI', icon: 'safari', url: 'shortcuts://run-shortcut?name=' + encodeURIComponent('アプリを開く 2') }, { label: 'CALC', icon: 'x', url: 'shortcuts://run-shortcut?name=' + encodeURIComponent('計算機') }] }]));
  FILES.set('/icloud/launcher/catalog.json', JSON.stringify({ groups: [{ cat: 'Apple のアプリ', items: [{ name: 'MUJI', label: 'MUJI', icon: 'house', url: oldSafari }] }], known: [oldSafari] }));
  r = await run({ file: L, family: 'medium', now: T(1, 10), param: '朝' });
  check('LAUNCHER 保存済みのセットの開く先を、作ったショートカットの名前・直接開く URL に置き換える', urls(r.w).join(' ') === [newSafari, 'x-safari-https://www.google.com', 'calc://'].join(' ') && setUrls() === urls(r.w).join(' '), urls(r.w).join(' '));
  await edit([async tb => { await tap(tb, '＋ アプリを追加'); }]);
  check('LAUNCHER 保存済みの選択肢も置き換え、二重にならない', cat().flatMap(g => g.items).filter(x => x.url === newSafari).length === 1 && !JSON.stringify(cat()).includes(oldSafari)
    && (inCat('abceed://') || {}).cat === '勉強・仕事' && !inCat('shortcuts://run-shortcut?name=' + encodeURIComponent('アプリを開く 2')));
  // setlog：スクリプトに入れた白黒の画像を初期のアイコンに。保存済みのセットにも入れ、線画に戻したら入れ直さない
  const SETLOG = 'shortcuts://run-shortcut?name=' + encodeURIComponent('アプリを開く 23');
  FILES.set('/icloud/launcher/sets.json', JSON.stringify([{ name: '朝', apps: [{ label: 'SETLOG', icon: 'list.bullet', url: SETLOG }, { label: 'NOTION', icon: 'doc.text', url: 'notion://' }] }]));
  r = await run({ file: L, family: 'medium', now: T(1, 10), param: '朝' });
  check('LAUNCHER setlog は白黒の画像アイコン（保存済みのセットにも入れる）', tiles(r.w).filter(i => !i.symbol).length === 1 && JSON.parse(FILES.get('/icloud/launcher/sets.json'))[0].apps[0].image === 'builtin:setlog', dump(r.w).split('\n').filter(l => l.includes('[')).slice(0, 2).join(' / '));
  await edit([async tb => { await tap(tb, 'SETLOG'); }], { sheets: [2, 5] });
  r = await run({ file: L, family: 'medium', now: T(1, 10), param: '朝' });
  check('LAUNCHER setlog を線画に戻したら、画像を入れ直さない', tiles(r.w).every(i => i.symbol) && !JSON.parse(FILES.get('/icloud/launcher/sets.json'))[0].apps[0].image);
  reset();

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
