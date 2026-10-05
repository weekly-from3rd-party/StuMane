// 機種別の収まり検査：5機種 × 全サイズ × 8ケースで、高さと省略できない幅が枠に収まるかを見積もる
const { run, H, W, DEV } = require('./harness'); const D = require('./data');
const CASES = [['通常', D.A, D.T(0, 11, 15)], ['今日1件', D.ONE, D.T(0, 16)], ['夜', D.A, D.T(0, 23, 30)], ['過多', D.MANY, D.T(0, 8)],
               ['長文', D.LONG, D.T(0, 11)], ['空', [], D.T(0, 11)], ['権限なし', null, D.T(0, 11)], ['透明未設定', D.A, D.T(0, 11), '透明']];
(async () => {
  let bad = 0, worst = {};
  for (const [dev, cfg] of Object.entries(DEV)) for (const fam of Object.keys(cfg).filter(k => k !== 'screen' && k !== 'pad')) for (const [name, ev, now, param] of CASES) {
    const r = await run({ family: fam, now, events: ev || [], fail: ev === null, param, screen: cfg.screen, pad: cfg.pad });
    const h = H(r.w), w = W(r.w), [lw, lh] = cfg[fam], ok = h <= lh && w <= lw && !r.errs.length;
    const key = dev + ' ' + fam; if (!worst[key] || lh - h < worst[key].m) worst[key] = { m: lh - h, h, lh, name };
    if (!ok) { bad++; console.log(`NG ${key} ${name} 高さ ${h.toFixed(0)}/${lh} 幅 ${w.toFixed(0)}/${lw} ${r.errs[0] || ''}`); }
  }
  for (const [k, v] of Object.entries(worst)) console.log(`${k.padEnd(28)} 最も高いケース「${v.name}」 ${v.h.toFixed(0)}/${v.lh}pt（余裕 ${v.m.toFixed(0)}）`);
  console.log(bad ? `\n${bad} 件はみ出し` : '\n全機種・全サイズ・全ケースで枠内');
  process.exitCode = bad ? 1 : 0;
})().catch(e => { console.log('THROW', e.stack); process.exitCode = 1; });
