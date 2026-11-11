// Auto-KDK に JSON を Import し、Switch Type を変えてから Export した JSON を保存する。
// 使い方: node tools/autokdk_export.js <読み込むJSON> <Switch Typeの表示名> <出力JSON>
// 例:     node tools/autokdk_export.js in.json "Choc V2(19mm)" out.json
const { chromium } = require('playwright');

(async () => {
  const [file, switchLabel, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.on('dialog', (d) => d.accept());
  await page.goto('https://auto-kdk.pages.dev/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 10000 }),
    page.getByText('Import', { exact: true }).click(),
  ]);
  await chooser.setFiles(file);
  await page.waitForTimeout(3000);
  // Switch Type の select（選択肢に "Cherry MX" を含むもの）を探す
  for (const sel of await page.$$('select')) {
    const labels = await sel.$$eval('option', (o) => o.map((x) => x.text));
    if (labels.includes('Cherry MX')) {
      console.log('switch options:', labels.join(' | '));
      await sel.selectOption({ label: switchLabel });
      break;
    }
  }
  await page.waitForTimeout(3000);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByText('Export', { exact: true }).click(),
  ]);
  await download.saveAs(out);
  console.log('saved', out);
  await browser.close();
})();
