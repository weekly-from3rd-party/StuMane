// keyboard/model/index.html をヘッドレスで開き、組み立て状態と分解状態のスクリーンショットを撮る。
// three.js は CDN の代わりにローカルの node_modules から返す（クラウド環境では CDN に出られないため）。
// 使い方: node tools/model_screenshot.js <modelディレクトリ> <node_modules/three のパス> <出力接頭辞>
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const [dirArg, threeDir, out = 'model'] = process.argv.slice(2);
  const modelDir = path.resolve(dirArg);
  const server = http.createServer((req, res) => {
    const f = path.join(modelDir, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!f.startsWith(path.resolve(modelDir)) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8');
    res.end(fs.readFileSync(f));
  }).listen(0);
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.on('console', (m) => { if (m.type() === 'error') console.log('console error:', m.text()); });
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.route('https://cdn.jsdelivr.net/npm/three@0.169.0/**', (route) => {
    const rel = route.request().url().split('/three@0.169.0/')[1];
    route.fulfill({ path: path.join(threeDir, rel), contentType: 'text/javascript' });
  });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}-assembled.png` });
  await page.waitForTimeout(4300);  // 分解しきった状態（アニメーション 4〜7 秒）
  await page.screenshot({ path: `${out}-exploded.png` });
  await browser.close();
  server.close();
})();
