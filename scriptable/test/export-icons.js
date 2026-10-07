// アプリアイコンの PNG（1024px）を design/nothing-white-v3.html の線画から書き出す（Playwright が必要：PW=$(npm root -g)/playwright node test/export-icons.js）
const fs = require('fs');
const { chromium } = require(process.env.PW);
const html = fs.readFileSync('design/nothing-white-v3.html', 'utf8');
const re = /<div class="tile[^"]*"><div class="icon( inv| acc)?"><svg viewBox="0 0 24 24">([\s\S]*?)<\/svg><\/div>(?:<span class="label">([^<]*)<\/span>)?<\/div>/g;
const dockNames = ['phone', 'safari', 'messages', 'camera'];
const nameMap = { 'カレンダー': 'calendar', 'リマインダー': 'reminders', '写真': 'photos', '設定': 'settings', 'Notion': 'notion', 'GoodNotes': 'goodnotes', 'Claude': 'claude', '音楽': 'music', 'studymgr': 'studymanager', '丸ポップ': 'marupop', 'マップ': 'maps', '時計': 'clock', '天気': 'weather', 'メール': 'mail', 'ヘルスケア': 'health', 'App Store': 'appstore', 'ファイル': 'files', '翻訳': 'translate' };
const icons = []; let m, d = 0;
while ((m = re.exec(html))) icons.push({ style: (m[1] || '').trim(), body: m[2], name: m[3] ? nameMap[m[3]] : dockNames[d++], label: m[3] || '' });
(async () => {
  fs.mkdirSync('assets/icons', { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const ic of icons) {
    const bg = ic.style === 'inv' ? '#0d0d0d' : ic.style === 'acc' ? '#ff3b30' : '#ffffff';
    const fg = ic.style ? '#ffffff' : '#0d0d0d';
    // 線画は 1024 の 52%（モックと同じ比率）
    const s = 1024 * 0.52, o = (1024 - s) / 2;
    await p.setContent(`<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${bg}"/>
      <svg x="${o}" y="${o}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ic.body}</svg></svg></body>`);
    await p.screenshot({ path: `assets/icons/${ic.name}.png` });
  }
  // 一覧（確認用）
  const cells = icons.map(ic => `<div style="text-align:center;font:12px sans-serif;color:#5c5c59"><img src="file://${process.cwd()}/assets/icons/${ic.name}.png" style="width:120px;height:120px;border-radius:27px;box-shadow:0 0 0 1px #0d0d0d14"><div>${ic.name}</div></div>`).join('');
  await p.setViewportSize({ width: 900, height: 700 });
  await p.setContent(`<body style="margin:0;background:#f2f1ee;padding:24px;display:grid;grid-template-columns:repeat(6,1fr);gap:18px">${cells}</body>`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'assets/icons/_overview.png', fullPage: true });
  await b.close(); console.log(icons.length, icons.map(i => i.name).join(' '));
})();
