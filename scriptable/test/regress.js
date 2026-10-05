// 回帰テスト：透明背景の検出と切り抜き、カレンダー絞り込み、時刻表記（前日/翌/24:00）、アプリ内プレビュー
const { run, dump, shot, FILES } = require('./harness'); const D = require('./data');
let fail = 0; const check = (n, ok, x = '') => { if (!ok) fail++; console.log((ok ? 'OK  ' : 'NG  ') + n + (x ? '  ' + x : '')); };
(async () => {
  // 透明背景：位置合わせ → 検出 → 切り抜き → 反映
  const MED = { x: 99, y: 282, w: 1092, h: 510, rad: 66 }, SML = { x: 681, y: 918, w: 510, h: 510, rad: 66 };
  const icons = [{ x: 99, y: 1560, w: 180, h: 180, rad: 40, c: [153, 51, 204] }, { x: 560, y: 1560, w: 216, h: 216, rad: 48, c: [230, 40, 235] }];
  let r = await run({ family: 'medium', now: D.T(0, 11), events: D.A, param: '透明' });
  check('透明・未設定はピンク表示', r.w.backgroundColor && r.w.backgroundColor.hex === '#ff00ff');
  r = await run({ app: true, now: D.T(0, 11), sheets: [4, 1], photos: [shot(1290, 2796, [MED, SML], [234, 51, 245], 'pink', icons), shot(1290, 2796, [], [0, 0, 0], 'empty')] });
  const c = FILES.get('/docs/today-tomorrow/clear-medium.png'); 
  check('透明・中の位置をピクセル単位で検出', c && c.crop.x === 99 && c.crop.y === 282 && c.crop.w === 1092 && c.crop.h === 510, JSON.stringify(c && c.crop));
  r = await run({ family: 'medium', now: D.T(0, 11), events: D.A, param: '透明' });
  check('透明・設定後は背景画像で表示', !!r.w.backgroundImage && !r.w.backgroundColor && !r.errs.length);
  // アプリ内プレビュー・各サイズ
  r = await run({ app: true, now: D.T(0, 11), events: D.A, sheets: [1] });
  check('アプリ内プレビュー（中）', r.log.includes('presentMedium'));
  for (const fam of ['small', 'medium', 'large', 'extraLarge', 'accessoryRectangular', 'accessoryCircular', 'accessoryInline']) {
    r = await run({ family: fam, now: D.T(0, 11, 15), events: D.A, param: '大学,バイト,日本の祝日' });
    check('絞り込み・' + fam, !r.errs.length && !!r.w.refreshAfterDate, r.errs[0]);
  }
  // 時刻ラベル：前日〜／翌日まで／24:00／終日
  r = await run({ family: 'large', now: D.T(0, 0, 30), events: [D.ev('夜間観察', D.T(-1, 22), D.T(0, 1), '野外'), D.ev('徹夜', D.T(0, 20), D.T(1, 0), ''),
                  D.ev('夜行バス', D.T(0, 23), D.T(1, 2), '札幌駅')] });
  const txt = dump(r.w);
  check('前日から続く予定は「前日」', txt.includes('"前日"'));
  check('24時ちょうどは「24:00」', txt.includes('"24:00"'));
  check('翌日にまたぐ終了は「翌02:00」', txt.includes('"翌02:00"'));
  console.log(fail ? `\n${fail} 件失敗` : '\n全ケース OK');
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.log('THROW', e.stack); process.exitCode = 1; });
