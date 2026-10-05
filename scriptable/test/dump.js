// ウィジェットの中身をツリー表示する（デバッグ用）
// 使い方: node test/dump.js <サイズ> [データ=A] [時刻=11:15] [Parameter]
//   例:   node test/dump.js medium ONE 16:00
//         node test/dump.js large MANY 08:00 透明,dark
//   サイズ: small / medium / large / extraLarge / accessoryRectangular / accessoryCircular / accessoryInline
//   データ: A / ONE / MANY / LONG / EMPTY
const { run, dump } = require('./harness');
const D = require('./data');
const [family = 'medium', set = 'A', time = '11:15', param = ''] = process.argv.slice(2);
const [h, m] = time.split(':').map(Number);
(async () => {
  const r = await run({ family, now: D.T(0, h, m), events: set === 'EMPTY' ? [] : (D[set] || D.A), param, pad: family === 'extraLarge' });
  if (r.errs.length) console.log('NG\n' + r.errs.join('\n'));
  console.log(dump(r.w));
})().catch(e => { console.log('THROW', e.stack); process.exitCode = 1; });
