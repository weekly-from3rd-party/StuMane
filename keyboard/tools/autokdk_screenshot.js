// Auto-KDK (https://auto-kdk.pages.dev/) を開いてスクリーンショットと画面のテキストを保存する。
// 使い方: node tools/autokdk_screenshot.js [出力PNG] [幅] [高さ]
// 例:     node tools/autokdk_screenshot.js /tmp/autokdk.png 1440 900
const { chromium } = require('playwright');
(async () => {
  const [out = 'autokdk.png', w = '1440', h = '900'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +w, height: +h } });
  await page.goto('https://auto-kdk.pages.dev/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  const ver = (await page.innerText('body')).match(/ver: [^\n]+/);
  console.log('Auto-KDK', ver ? ver[0] : '(version not found)');
  await page.screenshot({ path: out });
  console.log('saved', out);
  await browser.close();
})();
