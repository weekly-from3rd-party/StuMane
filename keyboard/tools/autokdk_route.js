// Auto-KDK に JSON を Import し、左右の「Start Routing」で自動配線が通るか確かめる。
// 使い方: node tools/autokdk_route.js <読み込むJSON> <出力PNGの接頭辞>
const { chromium } = require('playwright');

(async () => {
  const [file, out = 'autokdk-route'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('dialog', (d) => { console.log('DIALOG', d.message()); d.accept(); });
  await page.goto('https://auto-kdk.pages.dev/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.getByText('Import', { exact: true }).click(),
  ]);
  await chooser.setFiles(file);
  await page.waitForTimeout(4000);
  const buttons = page.getByRole('button', { name: 'Start Routing' });
  const n = await buttons.count();
  console.log('Start Routing buttons:', n);
  for (let i = 0; i < n; i++) {
    await buttons.nth(i).click();
  }
  // 「Not routed」が消えるまで最大 5 分待つ
  const deadline = Date.now() + 300000;
  let status = [];
  while (Date.now() < deadline) {
    await page.waitForTimeout(5000);
    const text = await page.innerText('body');
    status = text.split('\n').filter((l) => /rout/i.test(l) && !/Start Routing/.test(l));
    if (!status.some((l) => /Not routed|Routing\.\.\.|in progress/i.test(l))) break;
  }
  console.log('status:', JSON.stringify(status));
  await page.screenshot({ path: `${out}.png`, fullPage: true });
  await browser.close();
})();
