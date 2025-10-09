import { chromium } from 'playwright';

const FRONTEND = process.argv[2] || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // This smoke is minimal: it ensures the app boots and a known page loads.
  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  console.log('Frontend reachable:', FRONTEND);
  await browser.close();
})();
