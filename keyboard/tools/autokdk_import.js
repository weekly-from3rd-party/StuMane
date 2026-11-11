// Auto-KDK に JSON を Import して、干渉チェックの結果と画面を保存する。
// 使い方: node tools/autokdk_import.js <読み込むJSON> <出力PNGの接頭辞>
// 出力: <接頭辞>-left.png, <接頭辞>-right.png（分割の場合）
const { chromium } = require('playwright');

async function report(page, label, out) {
  const text = await page.innerText('body');
  const found = [...text.matchAll(/Interference Check\s*\n([^\n]+)/g)].map((m) => m[1].trim());
  console.log(`[${label}] Interference Check (左, 右の順):`, found.length ? found.join(' | ') : '(not found)');
  await page.screenshot({ path: `${out}-${label}.png`, fullPage: true });
}

(async () => {
  const [file, out = 'autokdk-import'] = process.argv.slice(2);
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
  await report(page, 'left', out);
  const sideSelect = (await page.$$('select'))[0];
  const options = await sideSelect.$$eval('option', (o) => o.map((x) => x.text));
  console.log('side options:', options);
  if (options.length > 1) {
    await sideSelect.selectOption({ index: 1 });
    await page.waitForTimeout(3000);
    await report(page, 'right', out);
  }
  await browser.close();
})();
